import express from "express";

import {
  getMyResults,
  getAllResults,
  getPendingQA,
  evaluateQA,
} from "../controllers/resultController.js";

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/my", protect, getMyResults);

router.get("/all", protect, getAllResults);

router.get("/qa", protect, getPendingQA);

router.put("/evaluate/:id", protect, evaluateQA);

export default router;