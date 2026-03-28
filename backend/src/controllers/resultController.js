import pool from "../config/db.js";

/* =========================
   SUBMIT EXAM
========================= */
export const submitExam = async (req, res) => {
  try {
    const { exam_id, answers, started_at } = req.body;
    const userId = req.user.id;

    // Prevent reattempt
    const attemptCheck = await pool.query(
      "SELECT * FROM results WHERE user_id=$1 AND exam_id=$2",
      [userId, exam_id]
    );

    if (attemptCheck.rows.length > 0) {
      return res.status(400).json({ message: "Exam already attempted" });
    }

    // Validate duration
    const exam = await pool.query(
      "SELECT duration FROM exams WHERE id=$1",
      [exam_id]
    );

    if (exam.rows.length === 0) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const duration = exam.rows[0].duration;

    const startTime = new Date(started_at);
    const currentTime = new Date();

    const diffMinutes = (currentTime - startTime) / (1000 * 60);

    if (diffMinutes > duration) {
      return res.status(400).json({ message: "Exam time exceeded" });
    }

    // Get questions with type
    const questions = await pool.query(
      "SELECT id, correct_option, type FROM questions WHERE exam_id=$1",
      [exam_id]
    );

    let score = 0;

    questions.rows.forEach((q) => {
      if (q.type === "mcq") {
        if (answers[q.id] === q.correct_option) {
          score++;
        }
      }
    });

    // Insert result WITH answers
    await pool.query(
      "INSERT INTO results (user_id, exam_id, score, answers) VALUES ($1,$2,$3,$4)",
      [userId, exam_id, score, answers]
    );

    res.json({
      message: "Exam submitted successfully",
      score,
      total: questions.rows.length,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while submitting exam" });
  }
};


/* =========================
   GET STUDENT RESULTS
========================= */
export const getMyResults = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
          exams.id AS exam_id,
          exams.title,
          results.score,
          results.submitted_at
       FROM results
       JOIN exams ON results.exam_id = exams.id
       WHERE results.user_id = $1
       ORDER BY results.submitted_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching results" });
  }
};


/* =========================
   GET ALL RESULTS (ADMIN)
========================= */
export const getAllResults = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const result = await pool.query(`
      SELECT 
        results.id,
        users.name AS student_name,
        exams.title AS exam_title,
        results.score,
        results.answers,
        results.submitted_at
      FROM results
      JOIN users ON results.user_id = users.id
      JOIN exams ON results.exam_id = exams.id
      ORDER BY results.submitted_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};