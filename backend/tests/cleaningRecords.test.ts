import request from "supertest";
import { createApp } from "../src/app";
import { pool } from "../src/db/pool";

const app = createApp();

async function createEquipment() {
  const res = await request(app)
    .post("/api/equipment")
    .send({ name: "Test Reactor", code: `TR-${Date.now()}-${Math.random()}` });
  return res.body.data;
}

beforeAll(async () => {
  await pool.query("DELETE FROM audit_logs");
  await pool.query("DELETE FROM cleaning_records");
  await pool.query("DELETE FROM equipment");
});

afterAll(async () => {
  await pool.end();
});

describe("cleaning record pagination", () => {
  it("paginates results and reports correct totals", async () => {
    const equipment = await createEquipment();

    for (let i = 0; i < 15; i++) {
      await request(app)
        .post(`/api/equipment/${equipment.id}/cleaning-records`)
        .send({
          cleanedBy: `Operator ${i}`,
          cleanedAt: new Date(2026, 0, i + 1).toISOString(),
          method: "Manual wipe-down",
        });
    }

    const page1 = await request(app).get(
      `/api/equipment/${equipment.id}/cleaning-records?page=1&pageSize=10`
    );
    expect(page1.status).toBe(200);
    expect(page1.body.data).toHaveLength(10);
    expect(page1.body.pagination).toEqual({
      page: 1,
      pageSize: 10,
      total: 15,
      totalPages: 2,
    });

    const page2 = await request(app).get(
      `/api/equipment/${equipment.id}/cleaning-records?page=2&pageSize=10`
    );
    expect(page2.body.data).toHaveLength(5);
    expect(page2.body.pagination.totalPages).toBe(2);

    // no overlap between pages
    const page1Ids = page1.body.data.map((r: { id: string }) => r.id);
    const page2Ids = page2.body.data.map((r: { id: string }) => r.id);
    expect(page1Ids.some((id: string) => page2Ids.includes(id))).toBe(false);
  });

  it("filters by status", async () => {
    const equipment = await createEquipment();

    const pending = await request(app)
      .post(`/api/equipment/${equipment.id}/cleaning-records`)
      .send({ cleanedBy: "Operator", cleanedAt: new Date().toISOString(), method: "Rinse" });

    const toVerify = await request(app)
      .post(`/api/equipment/${equipment.id}/cleaning-records`)
      .send({ cleanedBy: "Operator", cleanedAt: new Date().toISOString(), method: "Rinse" });

    await request(app)
      .patch(`/api/cleaning-records/${toVerify.body.data.id}`)
      .send({ status: "verified" });

    const res = await request(app).get(
      `/api/equipment/${equipment.id}/cleaning-records?status=verified`
    );

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(toVerify.body.data.id);
    expect(res.body.data.find((r: { id: string }) => r.id === pending.body.data.id)).toBeUndefined();
  });

  it("rejects a page size above the max", async () => {
    const equipment = await createEquipment();
    const res = await request(app).get(
      `/api/equipment/${equipment.id}/cleaning-records?pageSize=500`
    );
    expect(res.status).toBe(400);
  });
});

describe("audit trail", () => {
  it("captures field-level old -> new changes on create and update", async () => {
    const equipment = await createEquipment();

    const createRes = await request(app)
      .post(`/api/equipment/${equipment.id}/cleaning-records`)
      .set("x-current-user", "alice")
      .send({
        cleanedBy: "Alice",
        cleanedAt: "2026-08-10T09:00:00.000Z",
        method: "CIP rinse",
        status: "pending",
      });
    const recordId = createRes.body.data.id;

    await request(app)
      .patch(`/api/cleaning-records/${recordId}`)
      .set("x-current-user", "qa-bob")
      .send({ status: "verified", notes: "Looks good" });

    const auditRes = await request(app).get(`/api/cleaning-records/${recordId}/audit-log`);
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data).toHaveLength(2);

    // most recent first
    const [updateEntry, createEntry] = auditRes.body.data;

    expect(createEntry.action).toBe("create");
    expect(createEntry.changedBy).toBe("alice");
    expect(createEntry.changes).toEqual(
      expect.arrayContaining([{ field: "cleanedBy", oldValue: null, newValue: "Alice" }])
    );

    expect(updateEntry.action).toBe("update");
    expect(updateEntry.changedBy).toBe("qa-bob");
    expect(updateEntry.changes).toEqual(
      expect.arrayContaining([
        { field: "status", oldValue: "pending", newValue: "verified" },
        { field: "notes", oldValue: null, newValue: "Looks good" },
      ])
    );
    // fields that weren't touched shouldn't be in the diff
    expect(updateEntry.changes.find((c: { field: string }) => c.field === "cleanedBy")).toBeUndefined();
  });

  it("does not write an audit entry when an update changes nothing", async () => {
    const equipment = await createEquipment();
    const createRes = await request(app)
      .post(`/api/equipment/${equipment.id}/cleaning-records`)
      .send({ cleanedBy: "Alice", cleanedAt: new Date().toISOString(), method: "Rinse" });
    const recordId = createRes.body.data.id;

    await request(app).patch(`/api/cleaning-records/${recordId}`).send({ cleanedBy: "Alice" });

    const auditRes = await request(app).get(`/api/cleaning-records/${recordId}/audit-log`);
    expect(auditRes.body.data).toHaveLength(1); // only the create entry
  });
});
