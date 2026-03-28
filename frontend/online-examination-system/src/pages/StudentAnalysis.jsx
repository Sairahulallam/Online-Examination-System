import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const StudentAnalysis = () => {

  const correct = 8;
  const wrong = 2;

  const data = {
    labels: ["Correct", "Wrong"],
    datasets: [
      {
        data: [correct, wrong],
        backgroundColor: ["#28a745", "#dc3545"],
      },
    ],
  };

  return (
    <div className="container mt-4">
      <div className="card p-4 shadow">
        <h5>Performance Analysis</h5>
        <Pie data={data} />
      </div>
    </div>
  );
};

export default StudentAnalysis;