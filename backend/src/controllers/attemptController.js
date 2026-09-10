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