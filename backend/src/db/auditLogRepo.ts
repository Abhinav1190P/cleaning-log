import { PoolClient } from "pg";
import { pool } from "./pool";
import { AuditLog, AuditAction } from "./types";
import { FieldChange } from "../services/audit";

const SELECT_COLUMNS = `
  id, cleaning_record_id AS "cleaningRecordId", action,
  changed_by AS "changedBy", changed_at AS "changedAt", changes
`;

export async function createAuditLog(
  client: PoolClient,
  params: {
    cleaningRecordId: string;
    action: AuditAction;
    changedBy: string;
    changes: FieldChange[];
  }
): Promise<void> {
  await client.query(
    `INSERT INTO audit_logs (cleaning_record_id, action, changed_by, changes)
     VALUES ($1, $2, $3, $4)`,
    [params.cleaningRecordId, params.action, params.changedBy, JSON.stringify(params.changes)]
  );
}

export async function listAuditLogsForRecord(cleaningRecordId: string): Promise<AuditLog[]> {
  const { rows } = await pool.query<AuditLog>(
    `SELECT ${SELECT_COLUMNS} FROM audit_logs
     WHERE cleaning_record_id = $1
     ORDER BY changed_at DESC`,
    [cleaningRecordId]
  );
  return rows;
}
