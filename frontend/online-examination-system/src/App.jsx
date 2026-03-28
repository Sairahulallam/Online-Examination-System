import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import AdminResults from "./pages/AdminResults";
import StudentDashboard from "./pages/StudentDashboard";
import ActiveExams from "./pages/ActiveExams";
import AttemptedExams from "./pages/AttemptedExams";
import StudentAnalysis from "./pages/StudentAnalysis";
import StudentProfile from "./pages/StudentProfile";
import ExamPage from "./pages/ExamPage";
import ResultPage from "./pages/ResultPage";

function App() {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null
  );

  if (!user) {
    return <Auth setUser={setUser} />;
  }

  return (
    <>
      <Toaster position="top-right" />

      <BrowserRouter>
        <Routes>
          {user.role === "admin" ? (
            <>
              <Route path="/" element={<AdminDashboard setUser={setUser} />} />
              <Route path="/results" element={<AdminResults setUser={setUser} />} />
            </>
          ) : (
            <>
              <Route path="/" element={<StudentDashboard setUser={setUser} />} />
              <Route path="/active" element={<ActiveExams setUser={setUser} />} />
              <Route path="/attempted" element={<AttemptedExams setUser={setUser} />} />
              <Route path="/analysis/:examId" element={<StudentAnalysis />} />
              <Route path="/profile" element={<StudentProfile setUser={setUser} />} />
              <Route path="/exam/:examId" element={<ExamPage />} />
              <Route path="/result" element={<ResultPage />} />
            </>
          )}
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;