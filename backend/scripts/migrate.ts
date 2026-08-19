import fs from "fs";
import path from "path";
import { Pool } from "pg";

async function migrate() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // resolved from the working directory (backend/) rather than __dirname so this
  // works the same whether it's run via tsx in dev or as compiled JS in dist/
  const schemaPath = path.join(process.cwd(), "db/schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");

  try {
    await pool.query(sql);
    console.log("Schema applied successfully.");
  } finally {
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
