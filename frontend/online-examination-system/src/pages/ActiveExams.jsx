import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../services/api";

const ActiveExams = ({ setUser }) => {
  const [exams, setExams] = useState([]);
  const [attempted, setAttempted] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    API.get("/exams").then((res) => setExams(res.data));
    API.get("/results/my").then((res) =>
      setAttempted(res.data.map((r) => r.exam_id))
    );
  }, []);

  return (
    <>
      <Navbar role="student" setUser={setUser} />

      <div className="container mt-4">
        <h3>Active Exams</h3>

        {exams.map((exam) => (
          <div key={exam.id} className="card p-3 mb-3">
            <h5>{exam.title}</h5>

            <button
              className="btn btn-primary"
              disabled={attempted.includes(exam.id)}
              onClick={() => navigate(`/exam/${exam.id}`)}
            >
              {attempted.includes(exam.id)
                ? "Already Attempted"
                : "Take Test"}
            </button>
          </div>
        ))}
      </div>
    </>
  );
};

export default ActiveExams;