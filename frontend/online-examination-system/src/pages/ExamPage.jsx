import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

const ExamPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [totalTime, setTotalTime] = useState(null);
  const [startedAt] = useState(new Date().toISOString());
  const [showConfirm, setShowConfirm] = useState(false);

  const timerRef = useRef(null);

  // ================= LOAD EXAM =================
  useEffect(() => {
    const loadExam = async () => {
      const qRes = await API.get(`/questions/${examId}`);
      setQuestions(qRes.data);

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
      submitExam();
      return;
    }

    timerRef.current = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timerRef.current);
  }, [timeLeft]);

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
      await API.post("/results/submit", {
        exam_id: examId,
        started_at: startedAt,
        answers,
      });

      toast.success("Exam Submitted Successfully!");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Submission failed");
      navigate("/");
    }
  };

  if (timeLeft === null) {
    return (
      <div className="container mt-5 text-center">
        <h5>Loading Exam...</h5>
      </div>
    );
  }

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
          style={{ width: `${(timeLeft / totalTime) * 100}%` }}
        ></div>
      </div>

      {/* QUESTIONS */}
      {questions.map((q, index) => (
        <div key={q.id} className="card p-4 mb-3">
          <h5>Question {index + 1}</h5>
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
              rows="4"
              placeholder="Write your answer..."
              value={answers[q.id] || ""}
              onChange={(e) =>
                setAnswers({ ...answers, [q.id]: e.target.value })
              }
            />
          )}
        </div>
      ))}

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
            <h5>Are you sure you want to submit?</h5>
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