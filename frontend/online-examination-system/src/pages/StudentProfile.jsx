import Navbar from "../components/Navbar";

const StudentProfile = () => {
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <>
      <Navbar role="student" />

      <div className="container mt-4">
        <h3>Profile Overview</h3>

        <div className="card p-4">
          <p><strong>Name:</strong> {user?.name}</p>
          <p><strong>Role:</strong> {user?.role}</p>
        </div>
      </div>
    </>
  );
};

export default StudentProfile;
