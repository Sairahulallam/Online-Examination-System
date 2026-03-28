import { useState } from "react";
import API from "../services/api";

const Auth = ({ setUser }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    try {
      setError("");

      let res;

      if (isLogin) {
        res = await API.post("/auth/login", { email, password });
      } else {
        res = await API.post("/auth/register", {
          name,
          email,
          password,
          role,
        });
      }

      // 🔥 IMPORTANT: Store both token and user
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data));

      setUser(res.data);

    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed");
    }
  };

  return (
    <div className="container mt-5">
      <div className="card p-4 mx-auto shadow" style={{ maxWidth: "400px" }}>
        <h3 className="text-center mb-3">
          {isLogin ? "Login" : "Register"}
        </h3>

        {error && (
          <div className="alert alert-danger py-2">
            {error}
          </div>
        )}

        {!isLogin && (
          <>
            <input
              className="form-control mb-2"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <select
              className="form-control mb-2"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </>
        )}

        <input
          className="form-control mb-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="form-control mb-3"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="btn btn-primary w-100 mb-2"
          onClick={handleSubmit}
        >
          {isLogin ? "Login" : "Register"}
        </button>

        <p className="text-center mb-0">
          {isLogin ? "New user?" : "Already have an account?"}{" "}
          <span
            style={{ color: "blue", cursor: "pointer" }}
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Register" : "Login"}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Auth;
