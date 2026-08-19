import { pool } from "./pool";
import { CleaningRecord, CleaningRecordStatus } from "./types";
import { PoolClient } from "pg";

const SELECT_COLUMNS = `
  id, equipment_id AS "equipmentId", cleaned_by AS "cleanedBy",
  cleaned_at AS "cleanedAt", method, notes, status,
  created_at AS "createdAt", updated_at AS "updatedAt"
`;

export interface ListParams {
  equipmentId: string;
  page: number;
  pageSize: number;
  status?: CleaningRecordStatus;
}

export async function listCleaningRecords(
  params: ListParams
): Promise<{ records: CleaningRecord[]; total: number }> {
  const { equipmentId, page, pageSize, status } = params;
  const offset = (page - 1) * pageSize;

  const whereClauses = ["equipment_id = $1"];
  const values: unknown[] = [equipmentId];

  if (status) {
    values.push(status);
    whereClauses.push(`status = $${values.length}`);
  }

  const whereSql = whereClauses.join(" AND ");

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) FROM cleaning_records WHERE ${whereSql}`,
    values
  );
  const total = Number(countResult.rows[0].count);

  values.push(pageSize, offset);
  const { rows } = await pool.query<CleaningRecord>(
    `SELECT ${SELECT_COLUMNS} FROM cleaning_records
     WHERE ${whereSql}
     ORDER BY cleaned_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return { records: rows, total };
}

export async function getCleaningRecordById(
  id: string,
  client: PoolClient | typeof pool = pool
): Promise<CleaningRecord | null> {
  const { rows } = await client.query<CleaningRecord>(
    `SELECT ${SELECT_COLUMNS} FROM cleaning_records WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function createCleaningRecord(
  client: PoolClient,
  equipmentId: string,
  input: {
    cleanedBy: string;
    cleanedAt: Date;
    method: string;
    notes?: string | null;
    status?: CleaningRecordStatus;
  }
): Promise<CleaningRecord> {
  const { rows } = await client.query<CleaningRecord>(
    `INSERT INTO cleaning_records (equipment_id, cleaned_by, cleaned_at, method, notes, status)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::cleaning_record_status, 'pending'))
     RETURNING ${SELECT_COLUMNS}`,
    [equipmentId, input.cleanedBy, input.cleanedAt, input.method, input.notes ?? null, input.status ?? null]
  );
  return rows[0];
}

export async function updateCleaningRecord(
  client: PoolClient,
  id: string,
  input: Partial<{
    cleanedBy: string;
    cleanedAt: Date;
    method: string;
    notes: string | null;
    status: CleaningRecordStatus;
  }>
): Promise<CleaningRecord | null> {
  const { rows } = await client.query<CleaningRecord>(
    `UPDATE cleaning_records
     SET cleaned_by = COALESCE($2, cleaned_by),
         cleaned_at = COALESCE($3, cleaned_at),
         method = COALESCE($4, method),
         notes = CASE WHEN $5::boolean THEN $6 ELSE notes END,
         status = COALESCE($7::cleaning_record_status, status)
     WHERE id = $1
     RETURNING ${SELECT_COLUMNS}`,
    [
      id,
      input.cleanedBy ?? null,
      input.cleanedAt ?? null,
      input.method ?? null,
      Object.prototype.hasOwnProperty.call(input, "notes"),
      input.notes ?? null,
      input.status ?? null,
    ]
  );
  return rows[0] ?? null;
}
