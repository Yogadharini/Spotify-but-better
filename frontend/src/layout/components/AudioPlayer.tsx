import { usePlayerStore } from "@/stores/usePlayerStore";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useEffect, useRef, useCallback, useState } from "react";
import axios from "axios";

const AudioPlayer = () => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const prevSongRef = useRef<string | null>(null);

    const { currentSong, isPlaying, playNext } = usePlayerStore();
    const { user } = useUser();
    const { getToken } = useAuth();
    const [databaseUserId, setDatabaseUserId] = useState<string | null>(null);

    // Fetch the database User ID based on the Clerk ID
    useEffect(() => {
        const fetchDatabaseUserId = async () => {
            try {
                const token = await getToken();
                const response = await axios.get(
                    `http://localhost:5000/api/users/clerk/${user?.id}`, // Backend route to fetch user by Clerk ID
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                setDatabaseUserId(response.data._id); // Store the database User ID
                console.log("Fetched database User ID:", response.data._id);
            } catch (error) {
                console.error("Error fetching database User ID:", error);
            }
        };

        if (user) {
            fetchDatabaseUserId();
        }
    }, [user, getToken]);

    // Function to update the current song in the database
    const updateCurrentSongInDatabase = useCallback(async () => {
        try {
            if (isPlaying && databaseUserId && currentSong) {
                const token = await getToken();
                console.log("Database User ID being sent to the backend:", databaseUserId);
                console.log("Song ID being sent to the backend:", currentSong._id);
                await axios.post(
                    `http://localhost:5000/api/users/user/${databaseUserId}/update-current-song`,
                    { songId: currentSong._id },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                console.log("Updated current song in the database:", currentSong._id);
            }
        } catch (error) {
            console.error("Error updating current song in the database:", error);
        }
    }, [isPlaying, databaseUserId, currentSong, getToken]);

    // Handle play/pause logic
    useEffect(() => {
        if (isPlaying) {
            audioRef.current?.play();
            updateCurrentSongInDatabase(); // Update the database when the song starts playing
        } else {
            audioRef.current?.pause();
        }
    }, [isPlaying, updateCurrentSongInDatabase]);

    // Handle song changes
    useEffect(() => {
        if (!audioRef.current || !currentSong) return;

        const audio = audioRef.current;

        // Check if this is a new song
        const isSongChange = prevSongRef.current !== currentSong?.audioUrl;
        if (isSongChange) {
            audio.src = currentSong.audioUrl;
            audio.currentTime = 0; // Reset playback position
            prevSongRef.current = currentSong.audioUrl;

            if (isPlaying) {
                audio.play();
                updateCurrentSongInDatabase(); // Call the function when the song changes
            }
        }
    }, [currentSong, isPlaying, updateCurrentSongInDatabase]);

    // Handle song end
    useEffect(() => {
        const audio = audioRef.current;

        const handleEnded = () => {
            playNext(); // Play the next song when the current one ends
        };

        audio?.addEventListener("ended", handleEnded);

        return () => audio?.removeEventListener("ended", handleEnded);
    }, [playNext]);

    return (
        <div>
            <audio ref={audioRef} />
            {currentSong ? (
                <div className="current-song">
                    <p></p>
                </div>
            ) : (
                <p></p>
            )
}
        </div>
    );
 };

export default AudioPlayer;