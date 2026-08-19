import { useEffect, useState } from "react";
import { Equipment, EquipmentStatus } from "../types";
import * as api from "../api/client";

interface Props {
  selectedId: string | null;
  onSelect: (equipment: Equipment) => void;
}

export function EquipmentList({ selectedId, onSelect }: Props) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listEquipment(statusFilter || undefined);
      setEquipment(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load equipment");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Equipment</h2>
        <button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "+ Add"}</button>
      </div>

      {showForm && (
        <NewEquipmentForm
          onCreated={(created) => {
            setShowForm(false);
            refresh();
            onSelect(created);
          }}
        />
      )}

      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as EquipmentStatus | "")}>
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="retired">Retired</option>
      </select>

      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error">{error}</p>}

      <ul className="list">
        {equipment.map((e) => (
          <li
            key={e.id}
            className={e.id === selectedId ? "list-item selected" : "list-item"}
            onClick={() => onSelect(e)}
          >
            <div className="list-item-title">{e.name}</div>
            <div className="list-item-meta">
              {e.code} · <span className={`badge badge-${e.status}`}>{e.status}</span>
            </div>
          </li>
        ))}
        {!loading && equipment.length === 0 && <li className="muted">No equipment yet.</li>}
      </ul>
    </div>
  );
}

function NewEquipmentForm({ onCreated }: { onCreated: (e: Equipment) => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createEquipment({ name, code });
      onCreated(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create equipment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} required />
      <button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : "Save"}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
