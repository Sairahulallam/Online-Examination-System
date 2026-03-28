import { useNavigate } from "react-router-dom";

const Sidebar = ({ role }) => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        width: "220px",
        height: "100vh",
        background: "#343a40",
        color: "white",
        padding: "20px",
        position: "fixed",
      }}
    >
      <h5 className="mb-4">Menu</h5>

      {role === "student" && (
        <>
          <div onClick={() => navigate("/active")} style={{ cursor: "pointer", marginBottom: "15px" }}>
            Active Exams
          </div>
          <div onClick={() => navigate("/attempted")} style={{ cursor: "pointer", marginBottom: "15px" }}>
            Attempted
          </div>
          <div onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>
            Profile
          </div>
        </>
      )}

      {role === "admin" && (
        <>
          <div onClick={() => navigate("/")} style={{ cursor: "pointer", marginBottom: "15px" }}>
            Dashboard
          </div>
          <div onClick={() => navigate("/results")} style={{ cursor: "pointer" }}>
            Results
          </div>
        </>
      )}
    </div>
  );
};

export default Sidebar;
