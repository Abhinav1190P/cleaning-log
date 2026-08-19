export type EquipmentStatus = "active" | "retired";
export type CleaningRecordStatus = "pending" | "verified";
export type AuditAction = "create" | "update";

export interface Equipment {
  id: string;
  name: string;
  code: string;
  status: EquipmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CleaningRecord {
  id: string;
  equipmentId: string;
  cleanedBy: string;
  cleanedAt: string;
  method: string;
  notes: string | null;
  status: CleaningRecordStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  cleaningRecordId: string;
  action: AuditAction;
  changedBy: string;
  changedAt: string;
  changes: { field: string; oldValue: unknown; newValue: unknown }[];
}
