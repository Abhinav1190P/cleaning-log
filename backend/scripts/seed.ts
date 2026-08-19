import { Pool } from "pg";

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await pool.query("DELETE FROM audit_logs");
    await pool.query("DELETE FROM cleaning_records");
    await pool.query("DELETE FROM equipment");

    const { rows: equipmentRows } = await pool.query(
      `INSERT INTO equipment (name, code, status) VALUES
        ('Reactor Vessel A1', 'RV-A1', 'active'),
        ('Tablet Press TP-3', 'TP-3', 'active'),
        ('Legacy Mixer M-9', 'M-9', 'retired')
       RETURNING id, code`
    );

    const reactor = equipmentRows.find((r) => r.code === "RV-A1");
    const tabletPress = equipmentRows.find((r) => r.code === "TP-3");

    const { rows: recordRows } = await pool.query(
      `INSERT INTO cleaning_records (equipment_id, cleaned_by, cleaned_at, method, notes, status)
       VALUES ($1, 'Asha Rao', '2026-08-10T09:30:00Z', 'CIP (Clean-in-place) rinse', 'Standard rinse cycle, no residue observed.', 'verified')
       RETURNING id`,
      [reactor.id]
    );
    const record1Id = recordRows[0].id;

    await pool.query(
      `INSERT INTO audit_logs (cleaning_record_id, action, changed_by, changes)
       VALUES ($1, 'create', 'Asha Rao', $2)`,
      [
        record1Id,
        JSON.stringify([
          { field: "cleanedBy", oldValue: null, newValue: "Asha Rao" },
          { field: "method", oldValue: null, newValue: "CIP (Clean-in-place) rinse" },
          { field: "status", oldValue: null, newValue: "pending" },
        ]),
      ]
    );

    await pool.query(
      `INSERT INTO audit_logs (cleaning_record_id, action, changed_by, changes)
       VALUES ($1, 'update', 'QA Supervisor', $2)`,
      [
        record1Id,
        JSON.stringify([{ field: "status", oldValue: "pending", newValue: "verified" }]),
      ]
    );

    await pool.query(
      `INSERT INTO cleaning_records (equipment_id, cleaned_by, cleaned_at, method, status)
       VALUES ($1, 'Ibrahim Khan', '2026-08-15T14:00:00Z', 'Manual wipe-down', 'pending')`,
      [tabletPress.id]
    );

    console.log("Seed complete.");
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
