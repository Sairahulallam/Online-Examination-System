import express from "express";
import {
  addQuestion,
  getQuestions,
} from "../controllers/questionController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/:examId", protect, addQuestion);
router.get("/:examId", protect, getQuestions);

export default router;
