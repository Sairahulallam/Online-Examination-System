import pool from "../config/db.js";

/* =========================
   SUBMIT EXAM
========================= */
export const submitExam = async (req, res) => {
  try {
    const { exam_id, answers, started_at } = req.body;

    const userId = req.user.id;

    // ================= PREVENT REATTEMPT =================
    const attemptCheck = await pool.query(
      "SELECT * FROM results WHERE user_id=$1 AND exam_id=$2",
      [userId, exam_id]
    );

    if (attemptCheck.rows.length > 0) {
      return res.status(400).json({
        message: "Exam already attempted",
      });
    }

    // ================= VALIDATE EXAM =================
    const exam = await pool.query(
      "SELECT duration FROM exams WHERE id=$1",
      [exam_id]
    );

    if (exam.rows.length === 0) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    const duration = Number(exam.rows[0].duration);

const startTime = new Date(started_at);
const currentTime = new Date();

const diffMinutes =
  (currentTime - startTime) / (1000 * 60);

return res.json({
    duration,
    diffMinutes,
    comparison: diffMinutes > duration
});

    // ================= GET QUESTIONS =================
    const questions = await pool.query(
      `SELECT 
          id,
          type,
          correct_option
       FROM questions
       WHERE exam_id=$1`,
      [exam_id]
    );

    // ================= MCQ EVALUATION =================
    let correctMcq = 0;
    let pendingQa = 0;

    questions.rows.forEach((q) => {

      // MCQ auto evaluation
      if (q.type === "mcq") {

        if (
          answers[q.id] === q.correct_option
        ) {
          correctMcq++;
        }
      }

      // QA pending evaluation
      if (q.type === "qa") {
        pendingQa++;
      }
    });

    // ================= INSERT RESULT =================
    const resultInsert = await pool.query(
      `INSERT INTO results (
          user_id,
          exam_id,
          score,
          pending_qa,
          total_score
       )
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id`,

      [
        userId,
        exam_id,
        correctMcq,
        pendingQa,
        correctMcq,
      ]
    );

    const resultId =
      resultInsert.rows[0].id;

    // ================= STORE QA ANSWERS =================
    for (const q of questions.rows) {

      if (q.type === "qa") {

        await pool.query(
          `INSERT INTO qa_answers (
              result_id,
              question_id,
              answer
           )
           VALUES ($1,$2,$3)`,

          [
            resultId,
            q.id,
            answers[q.id] || "",
          ]
        );
      }
    }

    // ================= RESPONSE =================
    res.json({
      message: "Exam submitted successfully",
      score: correctMcq,
      total: questions.rows.length,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message:
        "Server error while submitting exam",
    });
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
      results.qa_score,
      results.total_score,
      results.evaluated,
      results.pending_qa,
      results.submitted_at,

      (
        SELECT COUNT(*)
        FROM questions
        WHERE questions.exam_id = exams.id
      ) AS total_questions,

      ROUND(
        (
          results.total_score::numeric /
          NULLIF(
            (
              SELECT COUNT(*)
              FROM questions
              WHERE questions.exam_id = exams.id
            ),
            0
          )
        ) * 100,
        2
      ) AS percentage,

      EXISTS (
        SELECT 1
        FROM questions
        WHERE questions.exam_id = exams.id
        AND questions.type='qa'
      ) AS has_qa

   FROM results

   JOIN exams
   ON exams.id = results.exam_id

   WHERE results.user_id=$1

   ORDER BY results.submitted_at DESC`,
  [req.user.id]
);

    res.json(result.rows);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message:
        "Server error fetching results",
    });
  }
};


/* =========================
   GET ALL RESULTS (ADMIN)
========================= */
export const getAllResults = async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only",
      });
    }

    const result = await pool.query(`
      SELECT 
        results.id,

        users.name AS student_name,

        exams.title AS exam_title,

        results.score,
        results.qa_score,
        results.total_score,
        results.evaluated,

        results.submitted_at

      FROM results

      JOIN users
      ON results.user_id = users.id

      JOIN exams
      ON results.exam_id = exams.id

      ORDER BY results.submitted_at DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server error",
    });
  }
};


/* =========================
   GET PENDING QA
========================= */
export const getPendingQA = async (req, res) => {

  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only",
      });
    }

    const result = await pool.query(`
      SELECT
        qa_answers.id,

        qa_answers.answer,
        qa_answers.marks,

        users.name AS student_name,

        exams.title AS exam_title,

        questions.question

      FROM qa_answers

      JOIN results
      ON qa_answers.result_id = results.id

      JOIN users
      ON results.user_id = users.id

      JOIN exams
      ON results.exam_id = exams.id

      JOIN questions
      ON qa_answers.question_id = questions.id

      ORDER BY qa_answers.id DESC
    `);

    res.json(result.rows);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message:
        "Server error fetching QA answers",
    });
  }
};


/* =========================
   EVALUATE QA
========================= */
export const evaluateQA = async (req, res) => {

  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only",
      });
    }

    const { marks } = req.body;

    const qaId = req.params.id;

    // ================= UPDATE QA MARKS =================
    await pool.query(
      `UPDATE qa_answers
       SET marks=$1
       WHERE id=$2`,

      [marks, qaId]
    );

    // ================= GET RESULT ID =================
    const qa = await pool.query(
      `SELECT result_id
       FROM qa_answers
       WHERE id=$1`,

      [qaId]
    );

    const resultId =
      qa.rows[0].result_id;

    // ================= CALCULATE QA TOTAL =================
    const qaTotal = await pool.query(
      `SELECT 
          COALESCE(SUM(marks),0)
          AS total

       FROM qa_answers

       WHERE result_id=$1`,

      [resultId]
    );

    // ================= GET MCQ SCORE =================
    const result = await pool.query(
      `SELECT score
       FROM results
       WHERE id=$1`,

      [resultId]
    );

    const mcqScore =
      result.rows[0].score;

    const qaScore =
      Number(qaTotal.rows[0].total);

    const finalScore =
      mcqScore + qaScore;

    // ================= UPDATE FINAL RESULT =================
    await pool.query(
      `UPDATE results
       SET
         qa_score=$1,
         total_score=$2,
         evaluated=true
       WHERE id=$3`,

      [
        qaScore,
        finalScore,
        resultId,
      ]
    );

    res.json({
      message: "QA Evaluated Successfully",
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message:
        "Server error while evaluating QA",
    });
  }
};