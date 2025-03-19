import User from "../models/user.model.js";
//import { Message } from "../models/message.model.js";

export const getAllUsers = async (req, res, next) => {
    try {
        const currentUserId = req.auth.userId;
        const users = await User.find({ clerkId: { $ne: currentUserId } });
        res.status(200).json(users);
    } catch (error) {
        next(error);
    }
};

export const getMessages = async (req, res, next) => {
    try {
        const myId = req.auth.userId;
        const { userId } = req.params;
        // Your existing code...
    } catch (error) {
        next(error);
    }
};

// Fetch the current song for a user
export const getCurrentSong = async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ songId: user.currentSongId || null });
    } catch (error) {
        console.error(`Error fetching current song for user ${userId}:`, error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Update the current song for a user
export const updateCurrentSong = async (req, res) => {
    const { userId } = req.params;
    const { songId } = req.body;

    console.log("Received userId:", userId);
    console.log("Received songId:", songId);

    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { currentSongId: songId },
            { new: true }
        );

        if (!user) {
            console.error("User not found:", userId);
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "Current song updated successfully", user });
    } catch (error) {
        console.error(`Error updating current song for user ${userId}:`, error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getUserByClerkId = async (req, res) => {
    const { clerkId } = req.params;

    try {
        const user = await User.findOne({ clerkId }); // Find user by Clerk ID
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(user); // Return the user document, including the database User ID
    } catch (error) {
        console.error(`Error fetching user by Clerk ID (${clerkId}):`, error);
        res.status(500).json({ error: "Internal server error" });
    }
};
