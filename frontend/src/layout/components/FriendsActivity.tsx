import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatStore } from "@/stores/useChatStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useUser, useAuth } from "@clerk/clerk-react";
import { Users, Music } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

interface User {
    _id: string;
    fullName: string;
    imageUrl: string;
    clerkId: string;
}

const FriendsActivity = () => {
    const { onlineUsers, userActivities, socket } = useChatStore();
    const { setCurrentSong, syncTime, setPlayingState } = usePlayerStore();
    const { user } = useUser();
    const { getToken } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [syncedUsers, setSyncedUsers] = useState<Set<string>>(new Set());

    const fetchUsers = async () => {
        try {
            const token = await getToken();
            const response = await axios.get('http://localhost:5000/api/users', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUsers(response.data);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    useEffect(() => {
        if (user) fetchUsers();
    }, [user]);

    const handleSyncRequest = async (targetUserId: string) => {
        if (!socket) {
            console.log("Socket is not connected");
            return;
        }

        try {
            const token = await getToken();
            const response = await axios.get(`http://localhost:5000/api/users/user/${targetUserId}/current-song`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const songId = response.data?.songId;
            if (songId) {
                socket.emit("request_sync", { targetUserId, songId });
                console.log(`Sync request sent for user ${targetUserId} with songId ${songId}`);
            } else {
                console.log(`No song ID found for user ${targetUserId}`);
            }
        } catch (error) {
            console.error(`Error handling sync request for user ${targetUserId}:`, error);
        }
    };

    useEffect(() => {
        if (!socket) return;

        const handleOnlineUsersUpdate = (updatedOnlineUsers: string[]) => {
            console.log("Updated online users:", updatedOnlineUsers);
            useChatStore.setState({ onlineUsers: updatedOnlineUsers });
        };

        socket.on("online_users", handleOnlineUsersUpdate);

        return () => {
            socket.off("online_users", handleOnlineUsersUpdate);
        };
    }, [socket]);

    useEffect(() => {
        if (!socket) return;

        const handleSyncAccepted = async ({ songId, currentTime, isPlaying }: { songId: string; currentTime: number; isPlaying: boolean }) => {
            console.log("Sync accepted event received:", { songId, currentTime, isPlaying });
            try {
                const token = await getToken();
                const response = await axios.get(`http://localhost:5000/api/songs/${songId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const song = response.data;
                if (song) {
                    setCurrentSong(song);
                    syncTime(currentTime);
                    setPlayingState(isPlaying);
                    setSyncedUsers((prev) => new Set([...prev, socket.id]));
                }
            } catch (error) {
                console.error("Error handling sync accepted event:", error);
            }
        };

        socket.on("sync_accepted", handleSyncAccepted);

        return () => {
            socket.off("sync_accepted", handleSyncAccepted);
        };
    }, [socket, setCurrentSong, syncTime, setPlayingState]);

    return (
        <div className='h-full bg-zinc-900 rounded-lg flex flex-col'>
            <div className='p-4 flex justify-between items-center border-b border-zinc-800'>
                <div className='flex items-center gap-2'>
                    <Users className='size-5 shrink-0' />
                    <h2 className='font-semibold'>What they're listening to</h2>
                </div>
            </div>

            {!user && <LoginPrompt />}

            <ScrollArea className='flex-1'>
                <div className='p-4 space-y-4'>
                    {users.map((user) => {
                        const activity = userActivities.get(user.clerkId);
                        const isPlaying = activity && activity !== "Idle";
                        const isSynced = syncedUsers.has(user.clerkId);
                        const isOnline = onlineUsers.includes(user.clerkId);

                        return (
                            <div
                                key={user._id}
                                className='cursor-pointer hover:bg-zinc-800/50 p-3 rounded-md transition-colors group'
                            >
                                <div className='flex items-start gap-3'>
                                    <div className='relative'>
                                        <Avatar className='size-10 border border-zinc-800'>
                                            <AvatarImage src={user.imageUrl} alt={user.fullName} />
                                            <AvatarFallback>{user.fullName[0]}</AvatarFallback>
                                        </Avatar>
                                        <div
                                            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-zinc-900 
                                                ${isOnline ? "bg-green-500" : "bg-zinc-500"}`}
                                            aria-hidden='true'
                                        />
                                    </div>

                                    <div className='flex-1 min-w-0'>
                                        <div className='flex items-center gap-2'>
                                            <span className='font-medium text-sm text-white'>{user.fullName}</span>
                                            {isPlaying && <Music className='size-3.5 text-emerald-400 shrink-0' />}
                                        </div>

                                        {isPlaying ? (
                                            <div className='mt-1'>
                                                <div className='mt-1 text-sm text-white font-medium truncate'>
                                                    {activity.replace("Playing ", "").split(" by ")[0]}
                                                </div>
                                                <div className='text-xs text-zinc-400 truncate'>
                                                    {activity.split(" by ")[1]}
                                                </div>
                                                <button
                                                    className={`mt-2 px-3 py-1 text-sm font-medium text-white rounded-md transition-transform transform hover:scale-105 ${
                                                        isSynced ? "bg-gray-500" : "bg-emerald-500 hover:bg-emerald-600"
                                                    }`}
                                                    onClick={() => handleSyncRequest(user._id)}
                                                    disabled={isSynced}
                                                >
                                                    {isSynced ? "Synced" : "Sync"}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className='mt-1 text-xs text-zinc-400'>Idle</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
};

export default FriendsActivity;

const LoginPrompt = () => (
    <div className='h-full flex flex-col items-center justify-center p-6 text-center space-y-4'>
        <h3 className='text-lg font-semibold text-white'>See What Friends Are Playing</h3>
        <p className='text-sm text-zinc-400'>Login to discover what music your friends are enjoying right now</p>
    </div>
);