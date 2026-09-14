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
      duration,
      max_attempts,
      status,
      starts_at,
      ends_at
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
    
  if (exam.status !== "published") {
  return res.status(403).json({
    message: "This exam is not currently available",
  });
}
const now = new Date();

if (
  exam.starts_at &&
  new Date(exam.starts_at) > now
) {
  return res.status(403).json({
    message: "This exam has not started yet",
  });
}

if (
  exam.ends_at &&
  new Date(exam.ends_at) <= now
) {
  return res.status(403).json({
    message: "This exam is closed",
  });
}
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
    const attemptCountResult = await pool.query(
  `SELECT COUNT(*) AS count
   FROM attempts
   WHERE user_id=$1
     AND exam_id=$2
     AND status IN (
       'submitted',
       'auto_submitted'
     )`,
  [userId, exam_id]
);

const completedAttempts =
  Number(attemptCountResult.rows[0].count);

if (completedAttempts >= Number(exam.max_attempts)) {
  return res.status(403).json({
    message: "Maximum attempts reached for this exam",
  });
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

    // ================= GET EXAM CONFIG =================
    const examResult = await client.query(
      `SELECT
          id,
          title,
          duration,
          passing_marks,
          show_result_immediately
       FROM exams
       WHERE id=$1`,
      [attempt.exam_id]
    );

    if (examResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Exam not found",
      });
    }

    const exam = examResult.rows[0];

    // ================= DETERMINE EXPIRY =================
    const now = new Date();

    const examExpired =
      new Date(attempt.expires_at) <= now;

    /*
      If the server determines that the exam has expired,
      submission is always treated as automatic.
    */
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

    // ================= SCORE VARIABLES =================

    let mcqScore = 0;
    let negativeScore = 0;

    let pendingQa = 0;

    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    let totalPossibleMarks = 0;

    // ================= EVALUATE QUESTIONS =================

    questions.forEach((question) => {
      const marks = Number(question.marks) || 0;
      const negativeMarks =
        Number(question.negative_marks) || 0;

      // Every question contributes its marks
      // to the maximum possible score.
      totalPossibleMarks += marks;

      const answer = answers[question.id];

      const isUnanswered =
        answer === undefined ||
        answer === null ||
        String(answer).trim() === "";

      // ================= UNANSWERED =================

      if (isUnanswered) {
        unansweredCount++;

        // QA unanswered questions are still pending
        // because they need to be evaluated.
        if (question.type === "qa") {
          pendingQa++;
        }

        return;
      }

      // ================= MCQ =================

      if (question.type === "mcq") {
        // Correct
        if (
          String(answer).trim() ===
          String(question.correct_option).trim()
        ) {
          mcqScore += marks;
          correctCount++;
        }

        // Wrong
        else {
          negativeScore += negativeMarks;
          wrongCount++;
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

    // ================= TIME TAKEN =================

    const startedAt = new Date(attempt.started_at);

    const elapsedSeconds = Math.max(
      0,
      Math.floor(
        (now.getTime() - startedAt.getTime()) / 1000
      )
    );

    const examDurationSeconds =
      Number(exam.duration) * 60;

    const timeTakenSeconds = Math.min(
      elapsedSeconds,
      examDurationSeconds
    );

    // ================= INITIAL RESULT STATUS =================

    let resultStatus = "pending";

    let evaluated = false;

    let percentage = null;

    /*
      If there are NO QA questions,
      the result can be completely evaluated
      immediately.
    */
    if (pendingQa === 0) {
      evaluated = true;

      if (totalPossibleMarks > 0) {
        percentage =
          (finalMcqScore / totalPossibleMarks) * 100;
      }

      if (exam.passing_marks !== null) {
        resultStatus =
          finalMcqScore >= Number(exam.passing_marks)
            ? "passed"
            : "failed";
      }
    }

    // ================= INSERT RESULT =================

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
          total_possible_marks,
          correct_count,
          wrong_count,
          unanswered_count,
          percentage,
          result_status,
          time_taken_seconds,
          evaluated,
          submitted_at
       )
       VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15,
          $16,
          NOW()
       )
       RETURNING id`,
      [
        userId,
        attempt.exam_id,
        attemptId,

        // MCQ score after negative marking
        finalMcqScore,

        // QA still pending?
        pendingQa,

        // QA score starts at 0
        0,

        // Initial total = MCQ score
        finalMcqScore,

        // Negative marks
        negativeScore,

        // Maximum possible marks
        totalPossibleMarks,

        correctCount,
        wrongCount,
        unansweredCount,

        percentage,
        resultStatus,
        timeTakenSeconds,
        evaluated,
      ]
    );

    const resultId = resultInsert.rows[0].id;

    // ================= STORE QA ANSWERS =================

    for (const question of questions) {
      if (question.type !== "qa") {
        continue;
      }

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

    // ================= RESPONSE =================

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

        qa_score: 0,

        total_score: finalMcqScore,

        total_possible_marks:
          totalPossibleMarks,

        correct_count: correctCount,

        wrong_count: wrongCount,

        unanswered_count:
          unansweredCount,

        pending_qa: pendingQa,

        percentage,

        result_status: resultStatus,

        evaluated,

        time_taken_seconds:
          timeTakenSeconds,
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

    // Duplicate attempt_id protection
    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "This exam attempt has already been submitted",
      });
    }

    return res.status(500).json({
      message:
        "Server error while submitting exam",
    });
  } finally {
    client.release();
  }
};