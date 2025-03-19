import { axiosInstance } from "@/lib/axios";
import { Message, User } from "@/types";
import { create } from "zustand";
import { io } from "socket.io-client";

interface ChatStore {
	users: User[];
	isLoading: boolean;
	error: string | null;
	socket: any;
	isConnected: boolean;
	onlineUsers: string[]; // Changed from Set to Array
	userActivities: Map<string, string>;
	messages: Message[];
	selectedUser: User | null;
	activeUsers: string[];

	fetchUsers: () => Promise<void>;
	initSocket: (userId: string) => void;
	disconnectSocket: () => void;
	sendMessage: (receiverId: string, senderId: string, content: string) => void;
	fetchMessages: (userId: string) => Promise<void>;
	setSelectedUser: (user: User | null) => void;
	setActiveUsers: (users: string[]) => void;
}

const baseURL = import.meta.env.MODE === "development" ? "http://localhost:5000" : "/";

const socket = io(baseURL, {
	autoConnect: false, // Only connect if user is authenticated
	withCredentials: true,
});

export const useChatStore = create<ChatStore>((set, get) => ({
	users: [],
	isLoading: false,
	error: null,
	socket: socket,
	isConnected: false,
	onlineUsers: [],
	userActivities: new Map(),
	messages: [],
	selectedUser: null,
	activeUsers: [],

	setSelectedUser: (user) => set({ selectedUser: user }),

	fetchUsers: async () => {
		set({ isLoading: true, error: null });
		try {
			const response = await axiosInstance.get("/users");
			set({ users: response.data });
		} catch (error: any) {
			set({ error: error.response?.data?.message || "Failed to fetch users" });
		} finally {
			set({ isLoading: false });
		}
	},

	initSocket: (userId) => {
		if (!get().isConnected) {
			socket.auth = { userId };
			socket.connect();

			socket.emit("register_user", userId);
			console.log("Socket initialized and user registered:", userId);

			// Handling online users
			socket.on("users_online", (users: string[]) => {
				console.log("Received online users:", users);
				set({ onlineUsers: users }); // Store as an array for better rendering
			});

			// Handling user activities
			socket.on("activities", (activities: [string, string][]) => {
				console.log("Received activities:", activities);
				set({ userActivities: new Map(activities) });
			});

			// Handling user connections
			socket.on("user_connected", (userId: string) => {
				console.log("User connected:", userId);
				set((state) => ({
					onlineUsers: [...new Set([...state.onlineUsers, userId])], // Ensure uniqueness
				}));
			});

			// Handling user disconnections
			socket.on("user_disconnected", (userId: string) => {
				console.log("User disconnected:", userId);
				set((state) => ({
					onlineUsers: state.onlineUsers.filter((id) => id !== userId),
				}));
			});

			set({ isConnected: true });
		}
	},

	disconnectSocket: () => {
		if (get().isConnected) {
			socket.disconnect();
			console.log("Socket disconnected");
			set({ isConnected: false, onlineUsers: [] });
		}
	},

	sendMessage: async (receiverId, senderId, content) => {
		const socket = get().socket;
		if (!socket) return;

		console.log(`Sending message from ${senderId} to ${receiverId}: ${content}`);
		socket.emit("send_message", { receiverId, senderId, content });
	},

	fetchMessages: async (userId: string) => {
		set({ isLoading: true, error: null });
		try {
			const response = await axiosInstance.get(`/users/messages/${userId}`);
			console.log("Fetched messages:", response.data);
			set({ messages: response.data });
		} catch (error: any) {
			set({ error: error.response?.data?.message || "Failed to fetch messages" });
		} finally {
			set({ isLoading: false });
		}
	},
	updateOnlineUsers: (users: string[]) => set({ onlineUsers: users }),

	setActiveUsers: (users) => {
		console.log("Active users updated:", users);
		set({ activeUsers: users });
	},
}));
