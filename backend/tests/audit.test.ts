import { diffRecords } from "../src/services/audit";

describe("diffRecords", () => {
  it("records every populated field as an old->new change on creation", () => {
    const changes = diffRecords(null, {
      cleanedBy: "Asha Rao",
      method: "CIP rinse",
      notes: null,
      status: "pending",
    });

    expect(changes).toEqual(
      expect.arrayContaining([
        { field: "cleanedBy", oldValue: null, newValue: "Asha Rao" },
        { field: "method", oldValue: null, newValue: "CIP rinse" },
        { field: "status", oldValue: null, newValue: "pending" },
      ])
    );
    // null/undefined fields shouldn't show up as noise on create
    expect(changes.find((c) => c.field === "notes")).toBeUndefined();
  });

  it("only reports fields that actually changed on update", () => {
    const before = {
      cleanedBy: "Asha Rao",
      method: "CIP rinse",
      notes: "clean",
      status: "pending",
    };
    const after = {
      cleanedBy: "Asha Rao",
      method: "CIP rinse",
      notes: "clean",
      status: "verified",
    };

    const changes = diffRecords(before, after);

    expect(changes).toEqual([{ field: "status", oldValue: "pending", newValue: "verified" }]);
  });

  it("returns no changes when nothing differs", () => {
    const record = { cleanedBy: "Asha Rao", status: "pending" };
    expect(diffRecords(record, record)).toEqual([]);
  });

  it("normalizes Date values so identical timestamps don't register as changes", () => {
    const cleanedAt = new Date("2026-08-10T09:30:00.000Z");
    const before = { cleanedAt };
    const after = { cleanedAt: new Date(cleanedAt.getTime()) };

    expect(diffRecords(before, after)).toEqual([]);
  });

  it("detects an actual Date change and serializes both sides to ISO strings", () => {
    const before = { cleanedAt: new Date("2026-08-10T09:30:00.000Z") };
    const after = { cleanedAt: new Date("2026-08-11T09:30:00.000Z") };

    expect(diffRecords(before, after)).toEqual([
      {
        field: "cleanedAt",
        oldValue: "2026-08-10T09:30:00.000Z",
        newValue: "2026-08-11T09:30:00.000Z",
      },
    ]);
  });

  it("ignores bookkeeping fields like id, equipmentId, timestamps", () => {
    const before = { id: "a", equipmentId: "eq-1", updatedAt: new Date(), status: "pending" };
    const after = { id: "a", equipmentId: "eq-2", updatedAt: new Date(Date.now() + 1000), status: "pending" };

    expect(diffRecords(before, after)).toEqual([]);
  });
});
