import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [exams, setExams] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    API.get("/exams")
      .then((res) => setExams(res.data))
      .catch(() => alert("Failed to load exams"));
  }, []);

  return (
    <div className="container mt-5">
      <button
        className="btn btn-danger mb-3"
        onClick={() => {
          localStorage.removeItem("token");
          window.location.reload();
        }}
      >
        Logout
      </button>

      <h2 className="mb-4">Student Dashboard</h2>

      {exams.length === 0 ? (
        <p>No exams available yet.</p>
      ) : (
        exams.map((exam) => (
          <div key={exam.id} className="card p-3 mb-3">
            <h5>{exam.title}</h5>
            <p>Duration: {exam.duration} minutes</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/exam/${exam.id}`)}
            >
              Start Exam
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default Dashboard;
