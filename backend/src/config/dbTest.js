import dotenv from "dotenv";
import pool from "./db.js";

dotenv.config();

const testDB = async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("DB Connected:", res.rows[0]);
    process.exit();
  } catch (err) {
    console.error("DB Error:", err.message);
  }
};

testDB();
