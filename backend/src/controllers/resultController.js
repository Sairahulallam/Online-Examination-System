import pool from "../config/db.js";



/* =========================
   GET STUDENT RESULTS
========================= */
export const getMyResults = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          results.id AS result_id,
          results.attempt_id,

          exams.id AS exam_id,
          exams.title,

          results.score,
          results.qa_score,
          results.negative_score,
          results.total_score,

          results.total_possible_marks,

          results.correct_count,
          results.wrong_count,
          results.unanswered_count,

          results.percentage,
          results.result_status,

          results.pending_qa,
          results.evaluated,

          results.time_taken_seconds,
          results.submitted_at,

          attempts.attempt_number,
          attempts.submission_type

       FROM results

       JOIN exams
         ON exams.id = results.exam_id

       LEFT JOIN attempts
         ON attempts.id = results.attempt_id

       WHERE results.user_id=$1

       ORDER BY results.submitted_at DESC`,
      [req.user.id]
    );

    return res.json(result.rows);

  } catch (error) {
    console.error("Get my results error:", error);

    return res.status(500).json({
      message: "Server error fetching results",
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

    const result = await pool.query(
      `SELECT
          results.id AS result_id,
          results.attempt_id,

          users.name AS student_name,

          exams.id AS exam_id,
          exams.title AS exam_title,

          results.score,
          results.qa_score,
          results.negative_score,
          results.total_score,

          results.total_possible_marks,

          results.correct_count,
          results.wrong_count,
          results.unanswered_count,

          results.percentage,
          results.result_status,

          results.pending_qa,
          results.evaluated,

          results.time_taken_seconds,

          attempts.attempt_number,
          attempts.submission_type,

          results.submitted_at

       FROM results

       JOIN users
         ON results.user_id = users.id

       JOIN exams
         ON results.exam_id = exams.id

       LEFT JOIN attempts
         ON attempts.id = results.attempt_id

       ORDER BY results.submitted_at DESC`
    );

    return res.json(result.rows);

  } catch (error) {
    console.error("Get all results error:", error);

    return res.status(500).json({
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

    const result = await pool.query(
      `SELECT
          qa_answers.id,
          qa_answers.result_id,
          qa_answers.question_id,

          qa_answers.answer,
          qa_answers.marks,

          users.name AS student_name,

          exams.title AS exam_title,

          questions.question,
          questions.marks AS max_marks

       FROM qa_answers

       JOIN results
         ON qa_answers.result_id = results.id

       JOIN users
         ON results.user_id = users.id

       JOIN exams
         ON results.exam_id = exams.id

       JOIN questions
         ON qa_answers.question_id = questions.id

       WHERE qa_answers.marks IS NULL

       ORDER BY qa_answers.id DESC`
    );

    return res.json(result.rows);

  } catch (error) {
    console.error("Get pending QA error:", error);

    return res.status(500).json({
      message: "Server error fetching QA answers",
    });
  }
};
/* =========================
   EVALUATE QA
========================= */
export const evaluateQA = async (req, res) => {
  const client = await pool.connect();

  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only",
      });
    }

    const qaId = Number(req.params.id);
    const marks = Number(req.body.marks);

    if (!Number.isInteger(qaId)) {
      return res.status(400).json({
        message: "Invalid QA answer ID",
      });
    }

    if (!Number.isFinite(marks) || marks < 0) {
      return res.status(400).json({
        message: "Marks must be a valid non-negative number",
      });
    }

    await client.query("BEGIN");

    // ================= GET QA =================
    const qaResult = await client.query(
      `SELECT
          qa_answers.id,
          qa_answers.result_id,
          qa_answers.question_id,
          questions.marks AS max_marks

       FROM qa_answers

       JOIN questions
         ON questions.id = qa_answers.question_id

       WHERE qa_answers.id=$1

       FOR UPDATE`,
      [qaId]
    );

    if (qaResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "QA answer not found",
      });
    }

    const qa = qaResult.rows[0];

    // ================= VALIDATE MAX MARKS =================
    const maxMarks = Number(qa.max_marks);

    if (marks > maxMarks) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: `Marks cannot exceed ${maxMarks}`,
      });
    }

    // ================= UPDATE QA MARKS =================
    await client.query(
      `UPDATE qa_answers
       SET marks=$1
       WHERE id=$2`,
      [marks, qaId]
    );

    // ================= GET RESULT =================
    const resultData = await client.query(
      `SELECT
          id,
          exam_id,
          score,
          negative_score,
          total_possible_marks
       FROM results
       WHERE id=$1
       FOR UPDATE`,
      [qa.result_id]
    );

    if (resultData.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Result not found",
      });
    }

    const result = resultData.rows[0];

    // ================= CALCULATE QA TOTAL =================
    const qaTotalResult = await client.query(
      `SELECT
          COALESCE(SUM(marks), 0) AS total,
          COUNT(*) AS total_questions,
          COUNT(marks) AS evaluated_questions
       FROM qa_answers
       WHERE result_id=$1`,
      [qa.result_id]
    );

    const qaScore =
      Number(qaTotalResult.rows[0].total);

    const totalQaQuestions =
      Number(qaTotalResult.rows[0].total_questions);

    const evaluatedQaQuestions =
      Number(qaTotalResult.rows[0].evaluated_questions);

    const pendingQa =
      totalQaQuestions - evaluatedQaQuestions;

    // ================= MCQ SCORE =================
    const mcqScore =
      Number(result.score);

    // ================= FINAL SCORE =================
    const finalScore =
      mcqScore + qaScore;

    // ================= RESULT STATUS =================
    let percentage = null;
    let resultStatus = "pending";
    let evaluated = false;

    if (pendingQa === 0) {
      const totalPossibleMarks =
        Number(result.total_possible_marks);

      percentage =
        totalPossibleMarks > 0
          ? Number(
              (
                (finalScore / totalPossibleMarks) *
                100
              ).toFixed(2)
            )
          : 0;

      // ================= GET PASSING MARKS =================
      const examResult = await client.query(
        `SELECT passing_marks
         FROM exams
         WHERE id=$1`,
        [result.exam_id]
      );

      const passingMarks =
        Number(
          examResult.rows[0]?.passing_marks ?? 0
        );

      resultStatus =
        finalScore >= passingMarks
          ? "passed"
          : "failed";

      evaluated = true;
    }

    // ================= UPDATE RESULT =================
    await client.query(
      `UPDATE results
       SET
         qa_score=$1,
         total_score=$2,
         pending_qa=$3,
         percentage=$4,
         result_status=$5,
         evaluated=$6
       WHERE id=$7`,
      [
        qaScore,
        finalScore,
        pendingQa,
        percentage,
        resultStatus,
        evaluated,
        qa.result_id,
      ]
    );

    await client.query("COMMIT");

    return res.json({
      message: "QA evaluated successfully",

      result: {
        result_id: qa.result_id,
        qa_score: qaScore,
        total_score: finalScore,
        pending_qa: pendingQa,
        percentage,
        result_status: resultStatus,
        evaluated,
      },
    });

  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Evaluate QA error:",
      error
    );

    return res.status(500).json({
      message: "Server error while evaluating QA",
    });
  } finally {
    client.release();
  }
};