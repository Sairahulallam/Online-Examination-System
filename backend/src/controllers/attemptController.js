import pool from "../config/db.js";

/* =========================
   START EXAM ATTEMPT
========================= */
export const startAttempt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { exam_id } = req.body;

    // ================= VALIDATE EXAM ID =================
    if (!exam_id) {
      return res.status(400).json({
        message: "Exam ID is required",
      });
    }

    // ================= GET EXAM =================
    const examResult = await pool.query(
      `SELECT
          id,
          title,
          duration
       FROM exams
       WHERE id=$1`,
      [exam_id]
    );

    if (examResult.rows.length === 0) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    const exam = examResult.rows[0];

    const duration = Number(exam.duration);

    if (!Number.isFinite(duration) || duration <= 0) {
      return res.status(400).json({
        message: "Invalid exam duration",
      });
    }

    // ================= CHECK ACTIVE ATTEMPT =================
    const activeAttempt = await pool.query(
      `SELECT
          id,
          exam_id,
          attempt_number,
          status,
          started_at,
          expires_at
       FROM attempts
       WHERE user_id=$1
         AND exam_id=$2
         AND status='in_progress'
       LIMIT 1`,
      [userId, exam_id]
    );

    if (activeAttempt.rows.length > 0) {
      const attempt = activeAttempt.rows[0];

      // If the active attempt has already expired,
      // finalize it as expired before allowing a new one.
      if (new Date(attempt.expires_at) <= new Date()) {
        await pool.query(
          `UPDATE attempts
           SET
             status='expired',
             submission_type='expired',
             submitted_at=NOW()
           WHERE id=$1
             AND status='in_progress'`,
          [attempt.id]
        );
      } else {
        // Resume existing attempt
        return res.json({
          message: "Existing exam attempt resumed",
          attempt: {
            id: attempt.id,
            exam_id: attempt.exam_id,
            attempt_number: attempt.attempt_number,
            status: attempt.status,
            started_at: attempt.started_at,
            expires_at: attempt.expires_at,
          },
        });
      }
    }

    // ================= GET NEXT ATTEMPT NUMBER =================
    const attemptNumberResult = await pool.query(
      `SELECT COALESCE(MAX(attempt_number), 0) + 1 AS attempt_number
       FROM attempts
       WHERE user_id=$1
         AND exam_id=$2`,
      [userId, exam_id]
    );

    const attemptNumber = Number(
      attemptNumberResult.rows[0].attempt_number
    );

    // ================= CREATE ATTEMPT =================
    const attemptResult = await pool.query(
      `INSERT INTO attempts (
          user_id,
          exam_id,
          attempt_number,
          status,
          started_at,
          expires_at,
          last_saved_at
       )
       VALUES (
          $1,
          $2,
          $3,
          'in_progress',
          NOW(),
          NOW() + ($4 * INTERVAL '1 minute'),
          NOW()
       )
       RETURNING
          id,
          exam_id,
          attempt_number,
          status,
          started_at,
          expires_at`,
      [
        userId,
        exam_id,
        attemptNumber,
        duration,
      ]
    );

    const attempt = attemptResult.rows[0];

    return res.status(201).json({
      message: "Exam attempt started successfully",

      attempt: {
        id: attempt.id,
        exam_id: attempt.exam_id,
        attempt_number: attempt.attempt_number,
        status: attempt.status,
        started_at: attempt.started_at,
        expires_at: attempt.expires_at,
      },
    });
  } catch (error) {
    console.error("Start attempt error:", error);

    // Handle race condition against the partial unique index
    if (error.code === "23505") {
      return res.status(409).json({
        message: "An active attempt already exists for this exam",
      });
    }

    return res.status(500).json({
      message: "Server error while starting exam",
    });
  }
};


/* =========================
   GET CURRENT ATTEMPT
========================= */
export const getCurrentAttempt = async (req, res) => {
  try {
    const userId = req.user.id;
    const examId = Number(req.params.examId);

    if (!Number.isInteger(examId)) {
      return res.status(400).json({
        message: "Invalid exam ID",
      });
    }

    const result = await pool.query(
      `SELECT
          id,
          exam_id,
          attempt_number,
          status,
          started_at,
          expires_at,
          submitted_at,
          submission_type,
          last_saved_at
       FROM attempts
       WHERE user_id=$1
         AND exam_id=$2
         AND status='in_progress'
       ORDER BY started_at DESC
       LIMIT 1`,
      [userId, examId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "No active attempt found",
      });
    }

    const attempt = result.rows[0];

    // Server-side expiry check
    if (new Date(attempt.expires_at) <= new Date()) {
      const expired = await pool.query(
        `UPDATE attempts
         SET
           status='expired',
           submission_type='expired',
           submitted_at=NOW()
         WHERE id=$1
           AND status='in_progress'
         RETURNING
           id,
           exam_id,
           attempt_number,
           status,
           started_at,
           expires_at,
           submitted_at`,
        [attempt.id]
      );

      return res.status(410).json({
        message: "Exam attempt has expired",
        attempt: expired.rows[0],
      });
    }

    return res.json({
      attempt,
    });
  } catch (error) {
    console.error("Get current attempt error:", error);

    return res.status(500).json({
      message: "Server error while fetching attempt",
    });
  }
};
/* =========================
   SAVE ANSWER
========================= */
export const saveAnswer = async (req, res) => {
  try {
    const userId = req.user.id;
    const attemptId = Number(req.params.attemptId);
    const questionId = Number(req.params.questionId);

    const { answer } = req.body;

    if (!Number.isInteger(attemptId) || !Number.isInteger(questionId)) {
      return res.status(400).json({
        message: "Invalid attempt or question ID",
      });
    }

    // ================= GET ATTEMPT =================
    const attemptResult = await pool.query(
      `SELECT
          id,
          exam_id,
          status,
          expires_at
       FROM attempts
       WHERE id=$1
         AND user_id=$2`,
      [attemptId, userId]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({
        message: "Attempt not found",
      });
    }

    const attempt = attemptResult.rows[0];

    // ================= CHECK STATUS =================
    if (attempt.status !== "in_progress") {
      return res.status(400).json({
        message: "This exam attempt is no longer active",
      });
    }

    // ================= CHECK EXPIRY =================
    if (new Date(attempt.expires_at) <= new Date()) {
      await pool.query(
        `UPDATE attempts
         SET
           status='expired',
           submission_type='expired',
           submitted_at=NOW()
         WHERE id=$1
           AND status='in_progress'`,
        [attemptId]
      );

      return res.status(410).json({
        message: "Exam time has expired",
      });
    }

    // ================= VERIFY QUESTION =================
    const questionResult = await pool.query(
      `SELECT id
       FROM questions
       WHERE id=$1
         AND exam_id=$2`,
      [questionId, attempt.exam_id]
    );

    if (questionResult.rows.length === 0) {
      return res.status(400).json({
        message: "Question does not belong to this exam",
      });
    }

    // ================= SAVE / UPDATE ANSWER =================
    await pool.query(
      `INSERT INTO attempt_answers (
          attempt_id,
          question_id,
          answer,
          saved_at
       )
       VALUES ($1,$2,$3,NOW())

       ON CONFLICT (attempt_id, question_id)
       DO UPDATE SET
          answer=EXCLUDED.answer,
          saved_at=NOW()`,
      [
        attemptId,
        questionId,
        answer ?? "",
      ]
    );

    // ================= UPDATE LAST SAVED =================
    await pool.query(
      `UPDATE attempts
       SET last_saved_at=NOW()
       WHERE id=$1`,
      [attemptId]
    );

    return res.json({
      message: "Answer saved successfully",
    });
  } catch (error) {
    console.error("Save answer error:", error);

    return res.status(500).json({
      message: "Server error while saving answer",
    });
  }
};


/* =========================
   GET ATTEMPT ANSWERS
========================= */
export const getAttemptAnswers = async (req, res) => {
  try {
    const userId = req.user.id;
    const attemptId = Number(req.params.attemptId);

    if (!Number.isInteger(attemptId)) {
      return res.status(400).json({
        message: "Invalid attempt ID",
      });
    }

    // ================= VERIFY ATTEMPT =================
    const attemptResult = await pool.query(
      `SELECT id
       FROM attempts
       WHERE id=$1
         AND user_id=$2`,
      [attemptId, userId]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({
        message: "Attempt not found",
      });
    }

    // ================= GET ANSWERS =================
    const result = await pool.query(
      `SELECT
          question_id,
          answer,
          saved_at
       FROM attempt_answers
       WHERE attempt_id=$1
       ORDER BY question_id`,
      [attemptId]
    );

    const answers = {};

    result.rows.forEach((row) => {
      answers[row.question_id] = row.answer;
    });

    return res.json({
      answers,
    });
  } catch (error) {
    console.error("Get attempt answers error:", error);

    return res.status(500).json({
      message: "Server error while fetching answers",
    });
  }
};
/* =========================
   SUBMIT EXAM ATTEMPT
========================= */
export const submitAttempt = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const attemptId = Number(req.params.attemptId);

    const requestedSubmissionType =
      req.body.submission_type === "auto"
        ? "auto"
        : "manual";

    if (!Number.isInteger(attemptId)) {
      return res.status(400).json({
        message: "Invalid attempt ID",
      });
    }

    await client.query("BEGIN");

    // ================= GET + LOCK ATTEMPT =================
    const attemptResult = await client.query(
      `SELECT
          id,
          user_id,
          exam_id,
          attempt_number,
          status,
          started_at,
          expires_at,
          submitted_at
       FROM attempts
       WHERE id=$1
         AND user_id=$2
       FOR UPDATE`,
      [attemptId, userId]
    );

    if (attemptResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Exam attempt not found",
      });
    }

    const attempt = attemptResult.rows[0];

    // ================= ALREADY SUBMITTED =================
    if (
      attempt.status === "submitted" ||
      attempt.status === "auto_submitted"
    ) {
      await client.query("ROLLBACK");

      return res.status(200).json({
        message: "Exam already submitted",
        alreadySubmitted: true,
      });
    }

    // ================= DETERMINE SUBMISSION TYPE =================
    const examExpired =
      new Date(attempt.expires_at) <= new Date();

    const submissionType =
      examExpired || attempt.status === "expired"
        ? "auto"
        : requestedSubmissionType;

    // ================= GET QUESTIONS =================
    const questionsResult = await client.query(
      `SELECT
          id,
          type,
          correct_option,
          marks,
          negative_marks
       FROM questions
       WHERE exam_id=$1
       ORDER BY id`,
      [attempt.exam_id]
    );

    const questions = questionsResult.rows;

    // ================= GET SAVED ANSWERS =================
    const answersResult = await client.query(
      `SELECT
          question_id,
          answer
       FROM attempt_answers
       WHERE attempt_id=$1`,
      [attemptId]
    );

    const answers = {};

    answersResult.rows.forEach((row) => {
      answers[row.question_id] = row.answer;
    });

    // ================= MCQ EVALUATION =================
    let mcqScore = 0;
    let negativeScore = 0;
    let pendingQa = 0;

    let correctMcq = 0;
    let wrongMcq = 0;
    let unansweredMcq = 0;

    questions.forEach((question) => {
      // ================= MCQ =================
      if (question.type === "mcq") {
        const answer = answers[question.id];

        const isUnanswered =
          answer === undefined ||
          answer === null ||
          String(answer).trim() === "";

        // Unanswered = 0
        if (isUnanswered) {
          unansweredMcq++;
          return;
        }

        // Correct answer
        if (answer === question.correct_option) {
          mcqScore += Number(question.marks);
          correctMcq++;
        }

        // Wrong answer
        else {
          negativeScore += Number(question.negative_marks);
          wrongMcq++;
        }
      }

      // ================= QA =================
      if (question.type === "qa") {
        pendingQa++;
      }
    });

    // ================= FINAL MCQ SCORE =================
    const finalMcqScore =
      mcqScore - negativeScore;

    // ================= CREATE RESULT =================
    const resultInsert = await client.query(
      `INSERT INTO results (
          user_id,
          exam_id,
          attempt_id,
          score,
          pending_qa,
          qa_score,
          total_score,
          negative_score,
          evaluated,
          submitted_at
       )
       VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          0,
          $4,
          $6,
          $7,
          NOW()
       )
       RETURNING id`,
      [
        userId,
        attempt.exam_id,
        attemptId,
        finalMcqScore,
        pendingQa,
        negativeScore,
        pendingQa === 0,
      ]
    );

    const resultId = resultInsert.rows[0].id;

    // ================= STORE QA ANSWERS =================
    for (const question of questions) {
      if (question.type === "qa") {
        await client.query(
          `INSERT INTO qa_answers (
              result_id,
              question_id,
              answer
           )
           VALUES ($1,$2,$3)`,
          [
            resultId,
            question.id,
            answers[question.id] || "",
          ]
        );
      }
    }

    // ================= UPDATE ATTEMPT =================
    const finalStatus =
      submissionType === "auto"
        ? "auto_submitted"
        : "submitted";

    await client.query(
      `UPDATE attempts
       SET
         status=$1,
         submission_type=$2,
         submitted_at=NOW(),
         last_saved_at=COALESCE(last_saved_at, NOW())
       WHERE id=$3`,
      [
        finalStatus,
        submissionType,
        attemptId,
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message:
        submissionType === "auto"
          ? "Exam auto-submitted successfully"
          : "Exam submitted successfully",

      result: {
        id: resultId,
        score: finalMcqScore,
        mcq_score: mcqScore,
        negative_score: negativeScore,
        pending_qa: pendingQa,
        total_score: finalMcqScore,
        correct_mcq: correctMcq,
        wrong_mcq: wrongMcq,
        unanswered_mcq: unansweredMcq,
      },

      attempt: {
        id: attemptId,
        status: finalStatus,
        submission_type: submissionType,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "Submit attempt error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error while submitting exam",
    });
  } finally {
    client.release();
  }
};