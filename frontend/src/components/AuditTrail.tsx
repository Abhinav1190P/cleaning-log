import { useEffect, useState } from "react";
import { AuditLog } from "../types";
import * as api from "../api/client";

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  return String(value);
}

export function AuditTrail({ recordId }: { recordId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getAuditLog(recordId)
      .then((res) => {
        if (!cancelled) setLogs(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load audit trail");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [recordId]);

  if (loading) return <p className="muted">Loading audit trail…</p>;
  if (error) return <p className="error">{error}</p>;
  if (logs.length === 0) return <p className="muted">No audit history yet.</p>;

  return (
    <div className="audit-trail">
      {logs.map((log) => (
        <div key={log.id} className="audit-entry">
          <div className="audit-entry-header">
            <span className={`badge badge-audit-${log.action}`}>{log.action}</span>
            <span>{log.changedBy}</span>
            <span className="muted">{new Date(log.changedAt).toLocaleString()}</span>
          </div>
          <table className="audit-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Old value</th>
                <th>New value</th>
              </tr>
            </thead>
            <tbody>
              {log.changes.map((change, i) => (
                <tr key={i}>
                  <td>{change.field}</td>
                  <td>{formatValue(change.oldValue)}</td>
                  <td>{formatValue(change.newValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
