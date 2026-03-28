import pool from "../config/db.js";

export const addQuestion = async (req, res) => {
  const {
    question,
    option_a,
    option_b,
    option_c,
    option_d,
    correct_option,
    type
  } = req.body;

  const { examId } = req.params;

 await pool.query(
  `INSERT INTO questions 
  (exam_id, question, option_a, option_b, option_c, option_d, correct_option, type)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
  [
    examId,
    question,
    option_a,
    option_b,
    option_c,
    option_d,
    correct_option,
    type
  ]
);

  res.json({ message: "Question added" });
};

export const getQuestions = async (req, res) => {
  const { examId } = req.params;

  const result = await pool.query(
    "SELECT * FROM questions WHERE exam_id = $1",
    [examId]
  );

  res.json(result.rows);
};
