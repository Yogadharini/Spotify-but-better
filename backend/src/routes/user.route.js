import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getAllUsers, getMessages, getCurrentSong, updateCurrentSong, getUserByClerkId } from "../controller/user.controller.js";
import User from "../models/user.model.js";
const router = Router();

router.get("/", protectRoute, getAllUsers);
router.get("/messages/:userId", protectRoute, getMessages);

// Route to fetch the current song for a user
router.get('/user/:userId/current-song', protectRoute, getCurrentSong);

// Route to update the current song for a user
router.post('/user/:userId/update-current-song', protectRoute, updateCurrentSong);

router.post('/user/:userId/update-current-song', protectRoute, async (req, res) => {
    const { userId } = req.params;
    const { songId } = req.body;

    if (!userId || !songId) {
        return res.status(400).json({ error: "Missing userId or songId" });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        user.currentSong = songId; // Update the current song
        await user.save();

        res.status(200).json({ message: "Current song updated successfully" });
    } catch (error) {
        console.error("Error updating current song:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Add the route to fetch user by Clerk ID
router.get('/clerk/:clerkId', protectRoute, getUserByClerkId);

export default router;
