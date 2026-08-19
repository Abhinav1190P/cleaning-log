import { pool } from "./pool";
import { Equipment, EquipmentStatus } from "./types";

const SELECT_COLUMNS = `
  id, name, code, status,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

export async function listEquipment(status?: EquipmentStatus): Promise<Equipment[]> {
  if (status) {
    const { rows } = await pool.query<Equipment>(
      `SELECT ${SELECT_COLUMNS} FROM equipment WHERE status = $1 ORDER BY name ASC`,
      [status]
    );
    return rows;
  }

  const { rows } = await pool.query<Equipment>(
    `SELECT ${SELECT_COLUMNS} FROM equipment ORDER BY name ASC`
  );
  return rows;
}

export async function getEquipmentById(id: string): Promise<Equipment | null> {
  const { rows } = await pool.query<Equipment>(
    `SELECT ${SELECT_COLUMNS} FROM equipment WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function createEquipment(input: {
  name: string;
  code: string;
  status?: EquipmentStatus;
}): Promise<Equipment> {
  const { rows } = await pool.query<Equipment>(
    `INSERT INTO equipment (name, code, status)
     VALUES ($1, $2, COALESCE($3::equipment_status, 'active'))
     RETURNING ${SELECT_COLUMNS}`,
    [input.name, input.code, input.status ?? null]
  );
  return rows[0];
}

export async function updateEquipment(
  id: string,
  input: Partial<{ name: string; code: string; status: EquipmentStatus }>
): Promise<Equipment | null> {
  const { rows } = await pool.query<Equipment>(
    `UPDATE equipment
     SET name = COALESCE($2, name),
         code = COALESCE($3, code),
         status = COALESCE($4::equipment_status, status)
     WHERE id = $1
     RETURNING ${SELECT_COLUMNS}`,
    [id, input.name ?? null, input.code ?? null, input.status ?? null]
  );
  return rows[0] ?? null;
}

export async function deleteEquipment(id: string): Promise<boolean> {
  const result = await pool.query(`DELETE FROM equipment WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
