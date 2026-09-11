import express from "express";

import {
  startAttempt,
  getCurrentAttempt,
  saveAnswer,
  getAttemptAnswers,
  submitAttempt,
} from "../controllers/attemptController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/start", protect, startAttempt);

router.get(
  "/current/:examId",
  protect,
  getCurrentAttempt
);

router.put(
  "/:attemptId/answers/:questionId",
  protect,
  saveAnswer
);

router.get(
  "/:attemptId/answers",
  protect,
  getAttemptAnswers
);
router.post(
  "/:attemptId/submit",
  protect,
  submitAttempt
);

export default router;