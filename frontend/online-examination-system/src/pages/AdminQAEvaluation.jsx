import { useEffect, useState } from "react";
import API from "../services/api";
import Navbar from "../components/Navbar";
import toast from "react-hot-toast";

const AdminQAEvaluation = ({ setUser }) => {

  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    fetchAnswers();
  }, []);

  const fetchAnswers = async () => {
    const res = await API.get("/results/qa");

    setAnswers(res.data);
  };

  const evaluate = async (id, marks) => {

    await API.put(`/results/evaluate/${id}`, {
      marks
    });

    toast.success("Marks Added");

    fetchAnswers();
  };

  return (
    <>
      <Navbar role="admin" setUser={setUser} />

      <div className="container mt-4">

        <h2 className="mb-4">
          QA Evaluation
        </h2>

        {answers.map((a) => (

          <div
            key={a.id}
            className="card p-4 mb-3"
          >

            <h5>
              {a.student_name}
            </h5>

            <p>
              <strong>Exam:</strong>{" "}
              {a.exam_title}
            </p>

            <p>
              <strong>Question:</strong>{" "}
              {a.question}
            </p>

            <div className="bg-light p-3 rounded mb-3">
              {a.answer}
            </div>

            <input
              type="number"
              className="form-control mb-2"
              placeholder="Enter Marks"
              onChange={(e) =>
                a.marks = e.target.value
              }
            />

            <button
              className="btn btn-success"
              onClick={() =>
                evaluate(a.id, a.marks)
              }
            >
              Save Marks
            </button>

          </div>
        ))}

      </div>
    </>
  );
};

export default AdminQAEvaluation;