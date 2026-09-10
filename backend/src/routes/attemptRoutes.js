import express from "express";

import {
  startAttempt,
  getCurrentAttempt,
} from "../controllers/attemptController.js";

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/start", protect, startAttempt);

router.get(
  "/current/:examId",
  protect,
  getCurrentAttempt
);

export default router;