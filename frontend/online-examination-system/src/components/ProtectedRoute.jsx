import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ user, children, role }) => {
  if (!user) return <Navigate to="/" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
};

export default ProtectedRoute;
