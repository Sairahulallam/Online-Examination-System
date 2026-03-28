import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import Navbar from "../components/Navbar";

const AttemptedExams = ({ setUser }) => {
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    API.get("/results/my").then((res) => setResults(res.data));
  }, []);

  return (
    <>
      <Navbar role="student" setUser={setUser} />

      <div className="container mt-4">
        <h3>Attempted Exams</h3>

        {results.length === 0 ? (
          <p>No exams attempted yet.</p>
        ) : (
          results.map((r, index) => (
            <div key={index} className="card p-3 mb-3">
              <h5>{r.title}</h5>
              <p>Score: {r.score}</p>

              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/analysis/${r.exam_id}`)}
              >
                View Analysis
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default AttemptedExams;
