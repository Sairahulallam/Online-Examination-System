const StatCard = ({ title, value, icon }) => {
  return (
    <div className="card shadow-sm border-0 rounded-4 p-3">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <small className="text-muted">{title}</small>
          <h3 className="fw-bold">{value}</h3>
        </div>
        <div style={{ fontSize: "2rem" }}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;