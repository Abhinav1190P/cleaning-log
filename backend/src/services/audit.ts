export type FieldChange = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

// Fields we don't want polluting the audit trail even if they technically change.
const IGNORED_FIELDS = new Set(["updatedAt", "createdAt", "id", "equipmentId"]);

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value ?? null;
}

/**
 * Compares two flat records field by field and returns only the fields
 * that actually changed, with their old and new values.
 */
export function diffRecords(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>
): FieldChange[] {
  const changes: FieldChange[] = [];
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after),
  ]);

  for (const key of keys) {
    if (IGNORED_FIELDS.has(key)) continue;

    const oldValue = normalize(before ? before[key] : undefined);
    const newValue = normalize(after[key]);

    if (before === null) {
      // creation: record every field that has a value
      if (newValue !== null) {
        changes.push({ field: key, oldValue: null, newValue });
      }
      continue;
    }

    if (oldValue !== newValue) {
      changes.push({ field: key, oldValue, newValue });
    }
  }

  return changes;
}
