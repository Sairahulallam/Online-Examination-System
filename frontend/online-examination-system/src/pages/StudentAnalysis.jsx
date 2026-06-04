import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../services/api";
import Navbar from "../components/Navbar";

import {
  Pie,
  Bar
} from "react-chartjs-2";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

const StudentAnalysis = () => {
  const { examId } = useParams();

  const [result, setResult] = useState(null);

  useEffect(() => {
    API.get(`/results/my`)
      .then((res) => {
        const examResult = res.data.find(
          (r) => r.exam_id == examId
        );

        setResult(examResult);
      });
  }, [examId]);

  if (!result) {
    return (
      <div className="container mt-5">
        Loading analysis...
      </div>
    );
  }

  const total = result.total_questions || 10;
  const correct = result.evaluated
  ? result.total_score
  : result.score;
  const pendingQa = result.pending_qa || 0;

const wrong = result.evaluated
  ? total - result.total_score
  : total - result.score - pendingQa;
  const percentage = ((correct / total) * 100).toFixed(1);

  return (
    <>
      <Navbar role="student" />

      <div className="container mt-4">

        <div className="card shadow p-4 mb-4">
          <h2>{result.title}</h2>

          <div className="row mt-4">

            <div className="col-md-3">
              <div className="card p-3 text-center">
               <h5>
  {result.evaluated
    ? "Final Score"
    : "MCQ Score"}
</h5>
                <h3>{correct} / {total}</h3>
              </div>
            </div>
            {result.has_qa && (
  <div className="col-md-3">
    <div className="card p-3 text-center">
      <h5>QA Score</h5>

      <h3>
        {result.evaluated
          ? result.qa_score
          : "Pending"}
      </h3>
    </div>
  </div>
)}

            <div className="col-md-3">
              <div className="card p-3 text-center">
                <h5>Percentage</h5>
                <h3>{percentage}%</h3>
              </div>
            </div>

{result.has_qa && (
  <div className="col-md-3">
    <div className="card p-3 text-center">
      <h5>QA Review</h5>

      <h6 className="text-warning">
        {result.evaluated
  ? "Evaluated"
  : "Pending Evaluation"}
      </h6>
    </div>
  </div>
)}

          </div>
        </div>

        <div className="row">

          <div className="col-md-6">
            <div className="card p-4 shadow">

              <h5 className="mb-3">
                Performance Breakdown
              </h5>

              <Pie
                data={{
                  labels: [
                    "Correct",
                    "Wrong"
                  ],
                  datasets: [
                    {
                      data: [correct, wrong],
                      backgroundColor: [
                        "#28a745",
                        "#dc3545"
                      ],
                    },
                  ],
                }}
              />

            </div>
          </div>

          <div className="col-md-6">
            <div className="card p-4 shadow">

              <h5 className="mb-3">
                Score Analysis
              </h5>

              <Bar
                data={{
                  labels: ["Correct", "Wrong"],
                  datasets: [
                    {
                      label: "Questions",
                      data: [correct, wrong],
                      backgroundColor: [
                        "#007bff",
                        "#dc3545"
                      ],
                    },
                  ],
                }}
              />

            </div>
          </div>

        </div>

        <div className="card p-4 shadow mt-4">
          <h5>Submission Details</h5>

          <p>
            <strong>Submitted At:</strong>{" "}
            {new Date(
              result.submitted_at
            ).toLocaleString()}
          </p>

          <p>
            <strong>Accuracy:</strong>{" "}
            {percentage}%
          </p>

        </div>

      </div>
    </>
  );
};

export default StudentAnalysis;