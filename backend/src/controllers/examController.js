import pool from "../config/db.js";

export const createExam = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }

 const { title, duration, type } = req.body;

 const result = await pool.query(
  "INSERT INTO exams (title, duration, type) VALUES ($1,$2,$3) RETURNING *",
  [title, duration, type]
);

  res.status(201).json(result.rows[0]);
};

export const getExams = async (req, res) => {
  const result = await pool.query("SELECT * FROM exams");
  res.json(result.rows);
};
