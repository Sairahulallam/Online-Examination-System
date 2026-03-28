import { useEffect, useState } from "react";
import API from "../services/api";

const ResultPage = () => {
  const [results, setResults] = useState([]);

  useEffect(() => {
    API.get("/results/my").then(res => setResults(res.data));
  }, []);

  return (
    <div>
      <h2>My Results</h2>
      {results.map((r, i) => (
        <p key={i}>
          {r.title} – Score: {r.score}
        </p>
      ))}
    </div>
  );
};

export default ResultPage;
