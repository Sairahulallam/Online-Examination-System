import { useEffect, useState } from "react";
import API from "../services/api";
import Navbar from "../components/Navbar";

const StudentHistory = () => {
  const [results, setResults] = useState([]);

  useEffect(() => {
    API.get("/results/student").then((res) => setResults(res.data));
  }, []);

  return (
    <>
      <Navbar role="student" />
      <div className="container mt-4">
        <h3>My Exam History</h3>

        {results.length === 0 ? (
          <p>No results found.</p>
        ) : (
          results.map((r) => (
            <div key={r.id} className="card p-3 mb-3">
              <h5>{r.exam_title}</h5>
              <p>Score: {r.score}</p>
              <p>Date: {new Date(r.created_at).toLocaleDateString()}</p>
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default StudentHistory;
