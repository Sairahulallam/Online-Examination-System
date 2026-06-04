import app from "./app.js";
import pool from "./config/db.js";

const PORT = process.env.PORT || 5000;

pool.query("SELECT NOW()")
  .then(() => console.log("✅ Database Connected"))
  .catch((err) => console.error("❌ Database Error:", err));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
