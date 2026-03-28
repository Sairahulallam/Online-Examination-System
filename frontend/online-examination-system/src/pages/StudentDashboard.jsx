import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { motion } from "framer-motion";

const StudentDashboard = ({ setUser }) => {
  const navigate = useNavigate();

  return (
    <>
      <Navbar role="student" setUser={setUser} />

      <motion.div
        className="container mt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="mb-4">Student Dashboard</h2>

        <div className="row">
  {[
    { title: "Active Exams", path: "/active", icon: "📝" },
    { title: "Attempted Exams", path: "/attempted", icon: "📊" },
    { title: "Profile", path: "/profile", icon: "👤" }
  ].map((item, i) => (
    <div key={i} className="col-md-4 mb-4">
      <div
        className="card p-4 text-center h-100"
        style={{ cursor: "pointer", transition: "0.3s" }}
        onClick={() => navigate(item.path)}
        onMouseEnter={(e) =>
          (e.currentTarget.style.transform = "translateY(-5px)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.transform = "translateY(0px)")
        }
      >
        <h1>{item.icon}</h1>
        <h5>{item.title}</h5>
      </div>
    </div>
  ))}
</div>
      </motion.div>
    </>
  );
};

export default StudentDashboard;