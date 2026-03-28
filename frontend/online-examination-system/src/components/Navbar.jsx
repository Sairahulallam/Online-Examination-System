import { useNavigate } from "react-router-dom";

const Navbar = ({ role, setUser }) => {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <div className="d-flex justify-content-between align-items-center px-4 py-3 bg-white shadow-sm">
      <h5 style={{ margin: 0 }}>
        🎓 Exam System
      </h5>

      <div>

        <button className="btn btn-outline-danger" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Navbar;