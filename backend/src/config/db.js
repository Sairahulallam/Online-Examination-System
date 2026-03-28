import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "examdb",
  password: "rahul13",
  port: 5432,
});

export default pool;
