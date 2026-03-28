const AdminStats = ({ totalExams }) => {
  return (
    <div className="row mb-4">
      <div className="col-md-4">
        <div className="card bg-primary text-white p-3">
          <h5>Total Exams</h5>
          <h3>{totalExams}</h3>
        </div>
      </div>
    </div>
  );
};

export default AdminStats;
