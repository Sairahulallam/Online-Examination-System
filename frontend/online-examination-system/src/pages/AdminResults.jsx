import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import API from "../services/api";
import { motion } from "framer-motion";

const AdminResults = ({ setUser }) => {
  const [results, setResults] = useState([]);

  useEffect(() => {
    API.get("/results/all").then((res) =>
      setResults(res.data)
    );
  }, []);

  return (
    <>
      <Navbar role="admin" setUser={setUser} />

      <motion.div
        className="container mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h2 className="mb-4">
          Student Attempted Results
        </h2>

        {results.length === 0 ? (
          <p>No attempts yet.</p>
        ) : (
          results.map((r) => (
            <div
              key={r.id}
              className="card p-4 mb-3 shadow"
            >
              <h5 className="mb-3">
                {r.student_name}
              </h5>

              <div className="row">

                <div className="col-md-3">
                  <p>
                    <strong>Exam:</strong>
                  </p>
                  <p>{r.exam_title}</p>
                </div>

                <div className="col-md-2">
                  <p>
                    <strong>MCQ Score:</strong>
                  </p>
                  <p>{r.score}</p>
                </div>

                <div className="col-md-2">
                  <p>
                    <strong>QA Score:</strong>
                  </p>

                  <p>
                    {r.evaluated
                      ? r.qa_score
                      : "Pending"}
                  </p>
                </div>

                <div className="col-md-2">
                  <p>
                    <strong>Total:</strong>
                  </p>

                  <p>
                    {r.evaluated
                      ? r.total_score
                      : r.score}
                  </p>
                </div>

                <div className="col-md-3">
                  <p>
                    <strong>Submitted:</strong>
                  </p>

                  <p>
                    {new Date(
                      r.submitted_at
                    ).toLocaleString()}
                  </p>
                </div>

              </div>

              <div className="mt-2">
                <span
                  className={`badge ${
                    r.evaluated
                      ? "bg-success"
                      : "bg-warning"
                  }`}
                >
                  {r.evaluated
                    ? "Evaluated"
                    : "Pending QA Evaluation"}
                </span>
              </div>

            </div>
          ))
        )}
      </motion.div>
    </>
  );
};

export default AdminResults;