import { Server } from "socket.io";
import { Message } from "../models/message.model.js";

const userSockets = new Map(); // Maps clerkId -> socketId
const userActivities = new Map(); // Maps clerkId -> Activity (Idle, Listening, etc.)

export const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "http://localhost:3000",
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.id}`);

        socket.on("user_connected", (clerkId) => {
            console.log("User Connected with clerkId:", clerkId);
            userSockets.set(clerkId, socket.id);
            userActivities.set(clerkId, "Idle");

            console.log("Current userActivities:", Array.from(userActivities.entries())); // Debug
            io.emit("activities", Array.from(userActivities.entries()));
        });

        socket.on("update_activity", ({ clerkId, activity }) => {
            console.log("Activity update received:", clerkId, activity);
            userActivities.set(clerkId, activity);

            console.log("Updated Activities:", Array.from(userActivities.entries())); // Debug
            io.emit("activity_updated", { clerkId, activity });
        });

        socket.on("sync_song", ({ userId, songId, currentTime, isPlaying }) => {
            console.log(`Sync song event received - userId: ${userId}, songId: ${songId}, time: ${currentTime}, playing: ${isPlaying}`);
            socket.broadcast.emit("sync_song", { userId, songId, currentTime, isPlaying });
        });

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`);
            let disconnectedUserId;
            for (const [clerkId, socketId] of userSockets.entries()) {
                if (socketId === socket.id) {
                    disconnectedUserId = clerkId;
                    userSockets.delete(clerkId);
                    userActivities.delete(clerkId);
                    break;
                }
            }
            if (disconnectedUserId) {
                io.emit("user_disconnected", disconnectedUserId);
            }
        });
    });
};
