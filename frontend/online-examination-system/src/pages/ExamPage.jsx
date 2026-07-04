import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

const ExamPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [reviewQuestions, setReviewQuestions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [totalTime, setTotalTime] = useState(null);
  const [startedAt, setStartedAt] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const timerRef = useRef(null);

  // ================= LOAD EXAM =================
  useEffect(() => {
    const loadExam = async () => {
      const qRes = await API.get(`/questions/${examId}`);
      setQuestions(qRes.data);
      setStartedAt(new Date().toISOString());
      const eRes = await API.get("/exams");
      const exam = eRes.data.find(e => e.id == examId);

      const seconds = exam.duration * 60;
      setTimeLeft(seconds);
      setTotalTime(seconds);

      // Load saved answers
      const saved = localStorage.getItem(`exam_${examId}`);
      if (saved) {
        setAnswers(JSON.parse(saved));
      }
    };

    loadExam();
  }, [examId]);

  // ================= TIMER =================
  useEffect(() => {
  if (timeLeft === null) return;

  if (timeLeft === 60) {
    toast("⚠ Only 1 minute remaining!");
  }

  if (timeLeft <= 0) {
    clearTimeout(timerRef.current);

    if (!isSubmitting) {
    setIsSubmitting(true);
    submitExam();
  }


    return;
  }

  timerRef.current = setTimeout(() => {
    setTimeLeft((prev) => prev - 1);
  }, 1000);

  return () => clearTimeout(timerRef.current);
}, [timeLeft, isSubmitting]);
  // ================= AUTO SAVE =================
  useEffect(() => {
    localStorage.setItem(`exam_${examId}`, JSON.stringify(answers));
  }, [answers, examId]);

  // ================= PREVENT REFRESH =================
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Exam in progress!";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () =>
      window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // ================= DISABLE BACK BUTTON =================
  useEffect(() => {
    window.history.pushState(null, null, window.location.href);

    const handleBack = () => {
      window.history.pushState(null, null, window.location.href);
      toast.error("Back navigation disabled during exam");
    };

    window.addEventListener("popstate", handleBack);

    return () => window.removeEventListener("popstate", handleBack);
  }, []);

  // ================= SUBMIT =================
  const submitExam = async () => {

  clearTimeout(timerRef.current);
  localStorage.removeItem(`exam_${examId}`);

  try {
    console.log("Submitting Exam...");
    await API.post("/results/submit", {
      exam_id: Number(examId),
      started_at: startedAt,
      answers,
    })
    console.log("Submission Success");

   toast.success("Exam Submitted Successfully!");

setTimeout(() => {
  navigate("/");
}, 800);
  } catch (err) {
    console.log(err.response?.data);
    console.error(err);

    toast.error(
      err.response?.data?.message || "Submission failed"
    );

    setIsSubmitting(false);
  }
};

  if (timeLeft === null) {
    return (
      <div className="container mt-5 text-center">
        <h5>Loading Exam...</h5>
      </div>
    );
  }

  const q = questions[currentQuestion];

  const toggleReview = () => {
    if (!q) return;
    if (reviewQuestions.includes(q.id)) {
      setReviewQuestions(reviewQuestions.filter(id => id !== q.id));
    } else {
      setReviewQuestions([...reviewQuestions, q.id]);
    }
  };

  return (
    <div className="container mt-4">

      {/* FULLSCREEN */}
      <div className="d-flex justify-content-between mb-3">
        <button
          className="btn btn-dark"
          onClick={() => document.documentElement.requestFullscreen()}
        >
          Enter Fullscreen
        </button>

        <h5 style={{ color: "red" }}>
          ⏳ {Math.floor(timeLeft / 60)}:
          {String(timeLeft % 60).padStart(2, "0")}
        </h5>
      </div>

      {/* PROGRESS BAR */}
      <div className="progress mb-4">
        <div
          className="progress-bar bg-success"
          style={{
            width: `${(timeLeft / totalTime) * 100}%`,
            transition: "width 1s linear",
          }}
        ></div>
      </div>

      {/* EXAM HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Online Examination</h5>

        <span className="badge bg-primary fs-6">
          Attempted: {Object.keys(answers).length}/{questions.length}
        </span>
      </div>

      {/* LEGEND */}
      <div className="mb-3">
        <span className="badge bg-success me-2">Answered</span>
        <span className="badge bg-warning me-2">Review</span>
        <span className="badge bg-secondary">Not Answered</span>
      </div>

      {/* QUESTION NAVIGATOR */}
      <div className="card p-3 mb-3">
        <h5>Question Navigator</h5>
        <div className="d-flex flex-wrap gap-2">
          {questions.map((question, index) => (
            <button
              key={question.id}
              className={`btn ${
                reviewQuestions.includes(question.id)
                  ? "btn-warning"
                  : answers[question.id]
                  ? "btn-success"
                  : "btn-outline-secondary"
              }`}
              onClick={() => setCurrentQuestion(index)}
            >
              {index + 1}
              {currentQuestion === index && " ★"}
            </button>
          ))}
        </div>
      </div>

      {/* CURRENT QUESTION */}
      {q && (
        <div className="card p-4">
          <h5>
            Question {currentQuestion + 1} of {questions.length}
          </h5>

          <div className="mb-3">
            {reviewQuestions.includes(q.id) ? (
              <span className="badge bg-warning text-dark">
                Marked for Review
              </span>
            ) : answers[q.id] ? (
              <span className="badge bg-success">Answered</span>
            ) : (
              <span className="badge bg-secondary">Not Answered</span>
            )}
          </div>

          <p>{q.question}</p>

          {q.type === "mcq" ? (
            ["A", "B", "C", "D"].map(opt => (
              <div key={opt} className="form-check">
                <input
                  type="radio"
                  className="form-check-input"
                  name={q.id}
                  checked={answers[q.id] === opt}
                  onChange={() =>
                    setAnswers({ ...answers, [q.id]: opt })
                  }
                />
                <label className="form-check-label">
                  {q[`option_${opt.toLowerCase()}`]}
                </label>
              </div>
            ))
          ) : (
            <textarea
              className="form-control"
              rows="5"
              placeholder="Write your answer..."
              value={answers[q.id] || ""}
              onChange={(e) =>
                setAnswers({ ...answers, [q.id]: e.target.value })
              }
            />
          )}

          <button
            className="btn btn-outline-danger mt-3"
            onClick={() => {
              const updated = { ...answers };
              delete updated[q.id];
              setAnswers(updated);
            }}
          >
            Clear Response
          </button>
        </div>
      )}

      {/* PREV / REVIEW / NEXT */}
      <div className="d-flex justify-content-between mt-4">
        <button
          className="btn btn-secondary"
          disabled={currentQuestion === 0}
          onClick={() => setCurrentQuestion(currentQuestion - 1)}
        >
          Previous
        </button>

        <button
          className="btn btn-warning"
          onClick={toggleReview}
        >
          {q && reviewQuestions.includes(q.id)
            ? "Remove Review"
            : "Mark Review"}
        </button>

        <button
          className="btn btn-primary"
          disabled={currentQuestion === questions.length - 1}
          onClick={() => setCurrentQuestion(currentQuestion + 1)}
        >
          Next
        </button>
      </div>

      {/* SUMMARY */}
      <div className="alert alert-info mt-4">
        Answered :
        <strong> {Object.keys(answers).length}</strong>
        <br />
        Remaining :
        <strong>
          {" "}{questions.length - Object.keys(answers).length}
        </strong>
      </div>

      {/* SUBMIT */}
      <button
        className="btn btn-success w-100 mt-3"
        onClick={() => setShowConfirm(true)}
      >
        Submit Exam
      </button>

      {/* CONFIRM MODAL */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h5>Submit Exam?</h5>
            <p>
              Answered :
              <strong> {Object.keys(answers).length}</strong>
              <br />
              Remaining :
              <strong>
                {" "}{questions.length - Object.keys(answers).length}
              </strong>
            </p>
            <button
              className="btn btn-danger me-2"
              onClick={submitExam}
            >
              Yes Submit
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamPage;