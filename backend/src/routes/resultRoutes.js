import express from "express";
import {
  submitExam,
  getMyResults,
  getAllResults,
} from "../controllers/resultController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/submit", protect, submitExam);
router.get("/my", protect, getMyResults);
router.get("/all", protect, getAllResults);

export default router;
