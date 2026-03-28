import express from "express";
import { createExam, getExams } from "../controllers/examController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createExam);
router.get("/", protect, getExams);

export default router;
