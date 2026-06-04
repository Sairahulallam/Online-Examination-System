import pkg from "pg";

const { Pool } = pkg;

const pool = new Pool({
  user: "neondb_owner",
  password: "npg_SUko0Gxt6TuL",
  host: "ep-damp-scene-aoubm8g2.c-2.ap-southeast-1.aws.neon.tech",
  database: "neondb",
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default pool;