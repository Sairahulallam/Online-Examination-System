import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import API from "../services/api";

const ResultPage = ({ setUser }) => {
  const [results, setResults] = useState([]);

  useEffect(() => {
    API.get("/results/my").then((res) => {
      setResults(res.data);
    });
  }, []);

  return (
    <>
      <Navbar role="student" setUser={setUser} />

      <div className="container mt-4">

        <h2 className="mb-4 fw-bold">
          📊 My Performance
        </h2>

        {results.length === 0 ? (
          <div className="alert alert-info">
            No exams attempted yet.
          </div>
        ) : (
          results.map((r) => (
            <div
              key={r.exam_id}
              className="card shadow border-0 rounded-4 p-4 mb-4"
            >

              <div className="d-flex justify-content-between align-items-center">

                <h4>{r.title}</h4>

                <span className="badge bg-primary">
                  {r.percentage}%
                </span>

              </div>

              <hr />

              <div className="row text-center">

                <div className="col-md-3">
                  <h6>MCQ Score</h6>
                  <h3 className="text-primary">
                    {r.score}
                  </h3>
                </div>

                {r.has_qa && (
                  <div className="col-md-3">
                    <h6>QA Score</h6>

                    <h3 className="text-warning">

                      {r.evaluated
                        ? r.qa_score
                        : "Pending"}

                    </h3>
                  </div>
                )}

                <div className="col-md-3">
                  <h6>Total Score</h6>

                  <h3 className="text-success">
                    {r.total_score}
                  </h3>
                </div>

                <div className="col-md-3">
                  <h6>Percentage</h6>

                  <h3 className="text-danger">
                    {r.percentage}%
                  </h3>
                </div>

              </div>

              <div className="mt-4">

                <label className="mb-2 fw-semibold">
                  Overall Performance
                </label>

                <div className="progress" style={{ height: "24px" }}>

                  <div
                    className={`progress-bar ${
                      r.percentage >= 75
                        ? "bg-success"
                        : r.percentage >= 40
                        ? "bg-warning"
                        : "bg-danger"
                    }`}
                    style={{
                      width: `${r.percentage}%`,
                    }}
                  >
                    {r.percentage}%
                  </div>

                </div>

              </div>

              <div className="mt-4 text-muted">

                <strong>Submitted On</strong>

                <br />

                {new Date(
                  r.submitted_at
                ).toLocaleString()}

              </div>

            </div>
          ))
        )}

      </div>
    </>
  );
};

export default ResultPage;