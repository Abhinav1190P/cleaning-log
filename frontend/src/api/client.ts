import {
  Equipment,
  EquipmentStatus,
  CleaningRecord,
  CleaningRecordStatus,
  AuditLog,
  Pagination,
} from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { currentUser?: string } = {}
): Promise<T> {
  const { currentUser, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(currentUser ? { "x-current-user": currentUser } : {}),
      ...headers,
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? "Request failed", body?.details);
  }

  return body as T;
}

export { ApiError };

export function listEquipment(status?: EquipmentStatus): Promise<{ data: Equipment[] }> {
  const query = status ? `?status=${status}` : "";
  return request(`/equipment${query}`);
}

export function createEquipment(input: {
  name: string;
  code: string;
  status?: EquipmentStatus;
}): Promise<{ data: Equipment }> {
  return request("/equipment", { method: "POST", body: JSON.stringify(input) });
}

export function listCleaningRecords(
  equipmentId: string,
  params: { page: number; pageSize: number; status?: CleaningRecordStatus }
): Promise<{ data: CleaningRecord[]; pagination: Pagination }> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.status) search.set("status", params.status);

  return request(`/equipment/${equipmentId}/cleaning-records?${search.toString()}`);
}

export function createCleaningRecord(
  equipmentId: string,
  input: {
    cleanedBy: string;
    cleanedAt: string;
    method: string;
    notes?: string | null;
    status?: CleaningRecordStatus;
  },
  currentUser: string
): Promise<{ data: CleaningRecord }> {
  return request(`/equipment/${equipmentId}/cleaning-records`, {
    method: "POST",
    body: JSON.stringify(input),
    currentUser,
  });
}

export function updateCleaningRecord(
  recordId: string,
  input: Partial<{
    cleanedBy: string;
    cleanedAt: string;
    method: string;
    notes: string | null;
    status: CleaningRecordStatus;
  }>,
  currentUser: string
): Promise<{ data: CleaningRecord }> {
  return request(`/cleaning-records/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
    currentUser,
  });
}

export function getAuditLog(recordId: string): Promise<{ data: AuditLog[] }> {
  return request(`/cleaning-records/${recordId}/audit-log`);
}
