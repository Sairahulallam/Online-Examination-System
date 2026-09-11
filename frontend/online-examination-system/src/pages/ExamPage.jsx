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

  const [attemptId, setAttemptId] = useState(null);
  const [expiresAt, setExpiresAt] = useState("");

  const [showConfirm, setShowConfirm] = useState(false);

  const timerRef = useRef(null);
  const hasSubmittedRef = useRef(false);

  // ================= LOAD EXAM =================
  useEffect(() => {
    const loadExam = async () => {
      try {
        // ================= GET QUESTIONS =================
        const qRes = await API.get(`/questions/${examId}`);

        setQuestions(qRes.data);

        // ================= START / RESUME ATTEMPT =================
        const attemptRes = await API.post(
          "/attempts/start",
          {
            exam_id: Number(examId),
          }
        );

        const attempt = attemptRes.data.attempt;

        setAttemptId(attempt.id);
        setExpiresAt(attempt.expires_at);

        // ================= SERVER TIMER =================
        const expires = new Date(attempt.expires_at);
        const now = new Date();

        const remainingSeconds = Math.max(
          0,
          Math.floor((expires - now) / 1000)
        );

        setTimeLeft(remainingSeconds);

        // ================= GET EXAM =================
        const eRes = await API.get("/exams");

        const exam = eRes.data.find(
          (e) => e.id == examId
        );

        if (!exam) {
          toast.error("Exam not found");
          return;
        }

        const totalSeconds =
          Number(exam.duration) * 60;

        setTotalTime(totalSeconds);

        // ================= GET SERVER ANSWERS =================
        try {
          const answerRes = await API.get(
            `/attempts/${attempt.id}/answers`
          );

          setAnswers(
            answerRes.data.answers || {}
          );
        } catch (error) {
          console.error(
            "Could not load server answers:",
            error
          );

          // ================= LOCAL STORAGE FALLBACK =================
          const saved = localStorage.getItem(
            `exam_${examId}`
          );

          if (saved) {
            try {
              setAnswers(JSON.parse(saved));
            } catch (parseError) {
              console.error(
                "Invalid local answers:",
                parseError
              );
            }
          }
        }
      } catch (error) {
        console.error(
          "Error loading exam:",
          error
        );

        toast.error(
          error.response?.data?.message ||
            "Unable to load exam"
        );
      }
    };

    loadExam();
  }, [examId]);

  // ================= SERVER BASED TIMER =================
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(expiresAt);

      const remaining = Math.max(
        0,
        Math.floor((expires - now) / 1000)
      );

      setTimeLeft(remaining);
    };

    updateTimer();

    timerRef.current = setInterval(
      updateTimer,
      1000
    );

    return () => {
      clearInterval(timerRef.current);
    };
  }, [expiresAt]);

  // ================= ONE MINUTE WARNING =================
  useEffect(() => {
    if (timeLeft === 60) {
      toast("⚠ Only 1 minute remaining!");
    }
  }, [timeLeft]);

  // ================= AUTO SUBMIT =================
  useEffect(() => {
    if (
      timeLeft === null ||
      timeLeft > 0 ||
      !attemptId ||
      isSubmitting ||
      hasSubmittedRef.current
    ) {
      return;
    }

    submitExam("auto");
  }, [timeLeft, attemptId, isSubmitting]);

  // ================= LOCAL STORAGE BACKUP =================
  useEffect(() => {
    if (
      attemptId &&
      !hasSubmittedRef.current
    ) {
      localStorage.setItem(
        `exam_${examId}`,
        JSON.stringify(answers)
      );
    }
  }, [answers, examId, attemptId]);

  // ================= PREVENT REFRESH =================
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (
        !hasSubmittedRef.current &&
        attemptId
      ) {
        e.preventDefault();
        e.returnValue =
          "Exam in progress!";
      }
    };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    return () =>
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
  }, [attemptId]);

  // ================= DISABLE BACK BUTTON =================
  useEffect(() => {
    if (!attemptId) return;

    window.history.pushState(
      null,
      null,
      window.location.href
    );

    const handleBack = () => {
      window.history.pushState(
        null,
        null,
        window.location.href
      );

      toast.error(
        "Back navigation disabled during exam"
      );
    };

    window.addEventListener(
      "popstate",
      handleBack
    );

    return () =>
      window.removeEventListener(
        "popstate",
        handleBack
      );
  }, [attemptId]);

  // ================= SUBMIT EXAM =================
  const submitExam = async (
    submissionType = "manual"
  ) => {
    if (
      isSubmitting ||
      hasSubmittedRef.current ||
      !attemptId
    ) {
      return;
    }

    setIsSubmitting(true);
    hasSubmittedRef.current = true;

    clearInterval(timerRef.current);

    try {
      console.log(
        `Submitting exam: ${submissionType}`
      );

      const response = await API.post(
        `/attempts/${attemptId}/submit`,
        {
          submission_type:
            submissionType,
        }
      );

      console.log(
        "Submission success:",
        response.data
      );

      // ================= REMOVE BACKUP ONLY AFTER SUCCESS =================
      localStorage.removeItem(
        `exam_${examId}`
      );

      if (submissionType === "auto") {
        toast.success(
          "Time's up! Exam submitted automatically."
        );
      } else {
        toast.success(
          "Exam submitted successfully!"
        );
      }

      setShowConfirm(false);

      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (error) {
      console.error(
        "Submission failed:",
        error
      );

      // Allow retry if submission failed
      hasSubmittedRef.current = false;

      setIsSubmitting(false);

      toast.error(
        error.response?.data?.message ||
          "Submission failed. Please try again."
      );
    }
  };

  // ================= LOADING =================
  if (
    timeLeft === null ||
    !attemptId
  ) {
    return (
      <div className="container mt-5 text-center">
        <h5>Loading Exam...</h5>
      </div>
    );
  }

  const q = questions[currentQuestion];

  // ================= REVIEW =================
  const toggleReview = () => {
    if (!q) return;

    if (reviewQuestions.includes(q.id)) {
      setReviewQuestions(
        reviewQuestions.filter(
          (id) => id !== q.id
        )
      );
    } else {
      setReviewQuestions([
        ...reviewQuestions,
        q.id,
      ]);
    }
  };

  // ================= ANSWER COUNT =================
  const answeredCount = Object.keys(
    answers
  ).filter(
    (key) =>
      answers[key] !== "" &&
      answers[key] !== null &&
      answers[key] !== undefined
  ).length;

  const remainingCount =
    questions.length - answeredCount;

  // ================= UI =================
  return (
    <div className="container mt-4">

      {/* FULLSCREEN + TIMER */}
      <div className="d-flex justify-content-between mb-3">

        <button
          className="btn btn-dark"
          onClick={() => {
            if (
              document.documentElement.requestFullscreen
            ) {
              document.documentElement.requestFullscreen();
            }
          }}
        >
          Enter Fullscreen
        </button>

        <h5
          style={{
            color:
              timeLeft <= 60
                ? "red"
                : "inherit",
          }}
        >
          ⏳{" "}
          {Math.floor(timeLeft / 60)}:
          {String(
            timeLeft % 60
          ).padStart(2, "0")}
        </h5>
      </div>

      {/* PROGRESS BAR */}
      <div className="progress mb-4">
        <div
          className="progress-bar bg-success"
          style={{
            width: `${
              totalTime
                ? Math.max(
                    0,
                    Math.min(
                      100,
                      (timeLeft /
                        totalTime) *
                        100
                    )
                  )
                : 0
            }%`,
            transition:
              "width 1s linear",
          }}
        />
      </div>

      {/* EXAM HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>
          Online Examination
        </h5>

        <span className="badge bg-primary fs-6">
          Answered:{" "}
          {answeredCount}/
          {questions.length}
        </span>
      </div>

      {/* LEGEND */}
      <div className="mb-3">
        <span className="badge bg-success me-2">
          Answered
        </span>

        <span className="badge bg-warning me-2">
          Review
        </span>

        <span className="badge bg-secondary">
          Not Answered
        </span>
      </div>

      {/* QUESTION NAVIGATOR */}
      <div className="card p-3 mb-3">
        <h5>
          Question Navigator
        </h5>

        <div className="d-flex flex-wrap gap-2">

          {questions.map(
            (question, index) => (
              <button
                key={question.id}
                className={`btn ${
                  reviewQuestions.includes(
                    question.id
                  )
                    ? "btn-warning"
                    : answers[
                        question.id
                      ]
                    ? "btn-success"
                    : "btn-outline-secondary"
                }`}
                onClick={() =>
                  setCurrentQuestion(index)
                }
              >
                {index + 1}

                {currentQuestion ===
                  index && " ★"}
              </button>
            )
          )}

        </div>
      </div>

      {/* CURRENT QUESTION */}
      {q && (
        <div className="card p-4">

          <h5>
            Question{" "}
            {currentQuestion + 1} of{" "}
            {questions.length}
          </h5>

          <div className="mb-3">

            {reviewQuestions.includes(
              q.id
            ) ? (
              <span className="badge bg-warning text-dark">
                Marked for Review
              </span>
            ) : answers[q.id] ? (
              <span className="badge bg-success">
                Answered
              </span>
            ) : (
              <span className="badge bg-secondary">
                Not Answered
              </span>
            )}

          </div>

          <p>{q.question}</p>

          {/* MCQ */}
          {q.type === "mcq" ? (
            ["A", "B", "C", "D"].map(
              (opt) => (
                <div
                  key={opt}
                  className="form-check"
                >
                  <input
                    type="radio"
                    className="form-check-input"
                    name={q.id}
                    checked={
                      answers[q.id] ===
                      opt
                    }
                    onChange={async () => {

                      const updatedAnswers =
                        {
                          ...answers,
                          [q.id]: opt,
                        };

                      setAnswers(
                        updatedAnswers
                      );

                      if (attemptId) {
                        try {
                          await API.put(
                            `/attempts/${attemptId}/answers/${q.id}`,
                            {
                              answer:
                                opt,
                            }
                          );
                        } catch (error) {
                          console.error(
                            "Failed to save answer:",
                            error
                          );

                          toast.error(
                            "Answer could not be saved"
                          );
                        }
                      }
                    }}
                  />

                  <label className="form-check-label">
                    {
                      q[
                        `option_${opt.toLowerCase()}`
                      ]
                    }
                  </label>
                </div>
              )
            )
          ) : (
            /* QA */
            <textarea
              className="form-control"
              rows="5"
              placeholder="Write your answer..."
              value={
                answers[q.id] || ""
              }
              onChange={async (e) => {

                const value =
                  e.target.value;

                const updatedAnswers =
                  {
                    ...answers,
                    [q.id]: value,
                  };

                setAnswers(
                  updatedAnswers
                );

                if (attemptId) {
                  try {
                    await API.put(
                      `/attempts/${attemptId}/answers/${q.id}`,
                      {
                        answer:
                          value,
                      }
                    );
                  } catch (error) {
                    console.error(
                      "Failed to save answer:",
                      error
                    );
                  }
                }
              }}
            />
          )}

          {/* CLEAR */}
          <button
            className="btn btn-outline-danger mt-3"
            onClick={async () => {

              const updated = {
                ...answers,
              };

              delete updated[q.id];

              setAnswers(updated);

              if (attemptId) {
                try {
                  await API.put(
                    `/attempts/${attemptId}/answers/${q.id}`,
                    {
                      answer: "",
                    }
                  );
                } catch (error) {
                  console.error(
                    "Failed to clear answer:",
                    error
                  );
                }
              }
            }}
          >
            Clear Response
          </button>

        </div>
      )}

      {/* PREVIOUS / REVIEW / NEXT */}
      <div className="d-flex justify-content-between mt-4">

        <button
          className="btn btn-secondary"
          disabled={
            currentQuestion === 0
          }
          onClick={() =>
            setCurrentQuestion(
              currentQuestion - 1
            )
          }
        >
          Previous
        </button>

        <button
          className="btn btn-warning"
          onClick={toggleReview}
        >
          {q &&
          reviewQuestions.includes(
            q.id
          )
            ? "Remove Review"
            : "Mark Review"}
        </button>

        <button
          className="btn btn-primary"
          disabled={
            currentQuestion ===
            questions.length - 1
          }
          onClick={() =>
            setCurrentQuestion(
              currentQuestion + 1
            )
          }
        >
          Next
        </button>

      </div>

      {/* SUMMARY */}
      <div className="alert alert-info mt-4">

        Answered:
        <strong>
          {" "}
          {answeredCount}
        </strong>

        <br />

        Remaining:
        <strong>
          {" "}
          {remainingCount}
        </strong>

      </div>

      {/* SUBMIT */}
      <button
        className="btn btn-success w-100 mt-3"
        disabled={isSubmitting}
        onClick={() =>
          setShowConfirm(true)
        }
      >
        {isSubmitting
          ? "Submitting..."
          : "Submit Exam"}
      </button>

      {/* CONFIRM MODAL */}
      {showConfirm && (
        <div className="modal-overlay">

          <div className="modal-box">

            <h5>
              Submit Exam?
            </h5>

            <p>
              Answered:
              <strong>
                {" "}
                {answeredCount}
              </strong>

              <br />

              Remaining:
              <strong>
                {" "}
                {remainingCount}
              </strong>
            </p>

            <button
              className="btn btn-danger me-2"
              disabled={
                isSubmitting
              }
              onClick={() =>
                submitExam("manual")
              }
            >
              {isSubmitting
                ? "Submitting..."
                : "Yes Submit"}
            </button>

            <button
              className="btn btn-secondary"
              disabled={
                isSubmitting
              }
              onClick={() =>
                setShowConfirm(false)
              }
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