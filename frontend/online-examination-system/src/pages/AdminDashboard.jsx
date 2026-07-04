// AdminDashboard.jsx
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import API from "../services/api";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { useNavigate } from "react-router-dom";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AdminDashboard = ({ setUser }) => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");
const [stats, setStats] = useState({
  students: 0,
  exams: 0,
  attempts: 0,
  avgScore: 0,
});
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [examType, setExamType] = useState("mcq");

  const [questionType, setQuestionType] = useState("mcq");
  const [question, setQuestion] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correct, setCorrect] = useState("A");

  const fetchExams = () => {
    API.get("/exams").then((res) => setExams(res.data));
  };

  useEffect(() => {
  fetchExams();

  API.get("/exams/dashboard")
    .then((res) => setStats(res.data))
    .catch(console.error);

}, []);
  const createExam = async () => {
    if (!title || !duration) return toast.error("Fill all fields");

    await API.post("/exams", {
      title,
      duration: Number(duration),
      type: examType
    });

    toast.success("Exam Created!");
    setTitle("");
    setDuration("");
    setExamType("mcq");
    fetchExams();
  };

  const addQuestion = async () => {
    if (!examId) return toast.error("Select exam");
    if (!question) return toast.error("Enter question");

    await API.post(`/questions/${examId}`, {
      question,
      type: questionType,
      option_a: questionType === "mcq" ? optionA : null,
      option_b: questionType === "mcq" ? optionB : null,
      option_c: questionType === "mcq" ? optionC : null,
      option_d: questionType === "mcq" ? optionD : null,
      correct_option: questionType === "mcq" ? correct : null,
    });

    toast.success("Question Added!");

    setQuestion("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setCorrect("A");
  };

  return (
    <>
      <Navbar role="admin" setUser={setUser} />

      <motion.div className="container mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>📊 Admin Dashboard</h2>
          <div className="row mb-4">

  <div className="col-md-3">
    <div className="card shadow p-3 text-center">
      <h6>Total Students</h6>
      <h3>{stats.students}</h3>
    </div>
  </div>

  <div className="col-md-3">
    <div className="card shadow p-3 text-center">
      <h6>Total Exams</h6>
      <h3>{stats.exams}</h3>
    </div>
  </div>

  <div className="col-md-3">
    <div className="card shadow p-3 text-center">
      <h6>Total Attempts</h6>
      <h3>{stats.attempts}</h3>
    </div>
  </div>

  <div className="col-md-3">
    <div className="card shadow p-3 text-center">
      <h6>Average Score</h6>
      <h3>{stats.avgScore}</h3>
    </div>
  </div>

</div>
          <button className="btn btn-dark" onClick={() => navigate("/results")}>
            View Results
          </button>
        </div>

        {/* CREATE EXAM */}
        <div className="card p-4 mb-4">
          <h5 className="mb-3">📚 Create Exam</h5>

          <input className="form-control mb-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input type="number" className="form-control mb-2" placeholder="Duration" value={duration} onChange={(e) => setDuration(e.target.value)} />

          <select className="form-control mb-3" value={examType} onChange={(e) => setExamType(e.target.value)}>
            <option value="mcq">MCQ</option>
            <option value="qa">Q&A</option>
            <option value="both">Mixed</option>
          </select>

          <button className="btn btn-success w-100" onClick={createExam}>
            Create Exam
          </button>
        </div>

        {/* CHART */}
        <div className="card p-4 mb-4">
          <h5>📈 Exams Overview</h5>
          <Bar
            data={{
              labels: exams.map(e => e.title),
              datasets: [{ label: "Exams", data: exams.map(() => 1) }]
            }}
          />
        </div>

        {/* SELECT EXAM */}
        <div className="card p-4 mb-4">
          <h5>📝 Select Exam</h5>
          <select className="form-control" value={examId} onChange={(e) => setExamId(e.target.value)}>
            <option value="">-- Select --</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>
        <button
  className="btn btn-warning"
  onClick={() =>
    navigate("/qa-evaluation")
  }
>
  QA Evaluation
</button>
        {/* ADD QUESTION */}
        {examId && (
          <div className="card p-4">
            <h5>➕ Add Question</h5>

            <select className="form-control mb-3" value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
              <option value="mcq">MCQ</option>
              <option value="qa">Q&A</option>
            </select>

            <input className="form-control mb-2" placeholder="Question" value={question} onChange={(e) => setQuestion(e.target.value)} />

            {questionType === "mcq" && (
              <>
                <input className="form-control mb-2" placeholder="Option A" value={optionA} onChange={(e) => setOptionA(e.target.value)} />
                <input className="form-control mb-2" placeholder="Option B" value={optionB} onChange={(e) => setOptionB(e.target.value)} />
                <input className="form-control mb-2" placeholder="Option C" value={optionC} onChange={(e) => setOptionC(e.target.value)} />
                <input className="form-control mb-2" placeholder="Option D" value={optionD} onChange={(e) => setOptionD(e.target.value)} />

                <select className="form-control mb-3" value={correct} onChange={(e) => setCorrect(e.target.value)}>
                  <option value="A">Correct A</option>
                  <option value="B">Correct B</option>
                  <option value="C">Correct C</option>
                  <option value="D">Correct D</option>
                </select>
              </>
            )}

            <button className="btn btn-primary w-100" onClick={addQuestion}>
              Add Question
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
};

export default AdminDashboard;