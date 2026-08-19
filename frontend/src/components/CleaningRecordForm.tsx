import { useState } from "react";
import { CleaningRecord, CleaningRecordStatus } from "../types";
import * as api from "../api/client";

interface Props {
  equipmentId: string;
  currentUser: string;
  existingRecord: CleaningRecord | null;
  onSaved: (record: CleaningRecord) => void;
  onCancel: () => void;
}

function toDatetimeLocal(isoString: string): string {
  const date = new Date(isoString);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function CleaningRecordForm({ equipmentId, currentUser, existingRecord, onSaved, onCancel }: Props) {
  const [cleanedBy, setCleanedBy] = useState(existingRecord?.cleanedBy ?? "");
  const [cleanedAt, setCleanedAt] = useState(
    existingRecord ? toDatetimeLocal(existingRecord.cleanedAt) : toDatetimeLocal(new Date().toISOString())
  );
  const [method, setMethod] = useState(existingRecord?.method ?? "");
  const [notes, setNotes] = useState(existingRecord?.notes ?? "");
  const [status, setStatus] = useState<CleaningRecordStatus>(existingRecord?.status ?? "pending");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      cleanedBy,
      cleanedAt: new Date(cleanedAt).toISOString(),
      method,
      notes: notes || null,
      status,
    };

    try {
      const res = existingRecord
        ? await api.updateCleaningRecord(existingRecord.id, payload, currentUser)
        : await api.createCleaningRecord(equipmentId, payload, currentUser);
      onSaved(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save cleaning record");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="record-form" onSubmit={handleSubmit}>
      <h3>{existingRecord ? "Edit cleaning record" : "New cleaning record"}</h3>

      <label>
        Cleaned by
        <input value={cleanedBy} onChange={(e) => setCleanedBy(e.target.value)} required />
      </label>

      <label>
        Cleaned at
        <input
          type="datetime-local"
          value={cleanedAt}
          onChange={(e) => setCleanedAt(e.target.value)}
          required
        />
      </label>

      <label>
        Method
        <input value={method} onChange={(e) => setMethod(e.target.value)} required />
      </label>

      <label>
        Notes
        <textarea value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </label>

      <label>
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value as CleaningRecordStatus)}>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
        </select>
      </label>

      {error && <p className="error">{error}</p>}

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
