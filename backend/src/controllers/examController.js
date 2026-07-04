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
export const getDashboardStats = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only",
      });
    }

    const students = await pool.query(
      "SELECT COUNT(*) FROM users WHERE role='student'"
    );

    const exams = await pool.query(
      "SELECT COUNT(*) FROM exams"
    );

    const attempts = await pool.query(
      "SELECT COUNT(*) FROM results"
    );

    const avgScore = await pool.query(
      `SELECT COALESCE(AVG(total_score),0) AS avg
       FROM results`
    );

    res.json({
      students: Number(students.rows[0].count),
      exams: Number(exams.rows[0].count),
      attempts: Number(attempts.rows[0].count),
      avgScore: Number(avgScore.rows[0].avg).toFixed(1),
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Dashboard error",
    });
  }
};