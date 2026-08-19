import { useEffect, useState } from "react";
import { Equipment, CleaningRecord, CleaningRecordStatus } from "../types";
import * as api from "../api/client";
import { CleaningRecordForm } from "./CleaningRecordForm";
import { AuditTrail } from "./AuditTrail";

const PAGE_SIZE = 5;

interface Props {
  equipment: Equipment;
  currentUser: string;
}

export function CleaningRecordsPanel({ equipment, currentUser }: Props) {
  const [records, setRecords] = useState<CleaningRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<CleaningRecordStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<"none" | "create" | "edit">("none");
  const [selectedRecord, setSelectedRecord] = useState<CleaningRecord | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listCleaningRecords(equipment.id, {
        page,
        pageSize: PAGE_SIZE,
        status: statusFilter || undefined,
      });
      setRecords(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cleaning records");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [equipment.id, statusFilter]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipment.id, page, statusFilter]);

  function handleSaved(record: CleaningRecord) {
    setFormMode("none");
    setSelectedRecord(record);
    refresh();
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{equipment.name} — cleaning records</h2>
        <button
          onClick={() => {
            setSelectedRecord(null);
            setFormMode("create");
          }}
        >
          + Add record
        </button>
      </div>

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as CleaningRecordStatus | "")}
      >
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="verified">Verified</option>
      </select>

      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error">{error}</p>}

      <table className="records-table">
        <thead>
          <tr>
            <th>Cleaned at</th>
            <th>Cleaned by</th>
            <th>Method</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.cleanedAt).toLocaleString()}</td>
              <td>{r.cleanedBy}</td>
              <td>{r.method}</td>
              <td>
                <span className={`badge badge-${r.status}`}>{r.status}</span>
              </td>
              <td>
                <button
                  onClick={() => {
                    setSelectedRecord(r);
                    setFormMode("none");
                  }}
                >
                  View
                </button>
                <button
                  onClick={() => {
                    setSelectedRecord(r);
                    setFormMode("edit");
                  }}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
          {!loading && records.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No cleaning records for this equipment yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>

      {formMode !== "none" && (
        <CleaningRecordForm
          equipmentId={equipment.id}
          currentUser={currentUser}
          existingRecord={formMode === "edit" ? selectedRecord : null}
          onSaved={handleSaved}
          onCancel={() => setFormMode("none")}
        />
      )}

      {formMode === "none" && selectedRecord && (
        <div className="record-detail">
          <h3>Audit trail — {selectedRecord.cleanedBy}, {new Date(selectedRecord.cleanedAt).toLocaleString()}</h3>
          <AuditTrail recordId={selectedRecord.id} />
        </div>
      )}
    </div>
  );
}
