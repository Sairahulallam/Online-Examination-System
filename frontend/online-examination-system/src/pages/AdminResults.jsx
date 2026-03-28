import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import API from "../services/api";
import { motion } from "framer-motion";

const AdminResults = ({ setUser }) => {
  const [results, setResults] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    API.get("/results/all").then((res) => setResults(res.data));
  }, []);

  return (
    <>
      <Navbar role="admin" setUser={setUser} />

      <motion.div
        className="container mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h2 className="mb-4">Student Attempted Results</h2>

        {results.length === 0 ? (
          <p>No attempts yet.</p>
        ) : (
          results.map((r) => (
            <div key={r.id} className="card p-3 mb-3 shadow">
              <div className="d-flex justify-content-between">
                <div>
                  <h5>{r.student_name}</h5>
                  <p className="mb-1"><strong>Exam:</strong> {r.exam_title}</p>
                  <p className="mb-1"><strong>Score:</strong> {r.score}</p>
                  <p className="mb-1">
                    <strong>Submitted:</strong>{" "}
                    {new Date(r.submitted_at).toLocaleString()}
                  </p>
                </div>

                <button
                  className="btn btn-outline-primary"
                  onClick={() =>
                    setExpanded(expanded === r.id ? null : r.id)
                  }
                >
                  {expanded === r.id ? "Hide Answers" : "View Answers"}
                </button>
              </div>

              {expanded === r.id && (
                <div className="mt-3 bg-light p-3 rounded">
                  <h6>Attempted Answers:</h6>
                  {r.answers &&
                    Object.entries(r.answers).map(([qid, ans]) => (
                      <div key={qid}>
                        <strong>Question ID {qid}:</strong> {ans}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))
        )}
      </motion.div>
    </>
  );
};

export default AdminResults;