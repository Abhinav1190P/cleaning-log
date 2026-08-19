import { Router } from "express";
import { pool } from "../db/pool";
import { asyncHandler } from "../lib/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { AuthedRequest } from "../middleware/currentUser";
import * as equipmentRepo from "../db/equipmentRepo";
import * as cleaningRecordRepo from "../db/cleaningRecordRepo";
import * as auditLogRepo from "../db/auditLogRepo";
import {
  createCleaningRecordSchema,
  updateCleaningRecordSchema,
  listCleaningRecordsQuerySchema,
} from "../validation";
import { diffRecords } from "../services/audit";

// Mounted at /api/equipment/:equipmentId/cleaning-records
export const equipmentCleaningRecordsRouter = Router({ mergeParams: true });

// Mounted at /api/cleaning-records
export const cleaningRecordsRouter = Router();

equipmentCleaningRecordsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { equipmentId } = req.params;
    const query = listCleaningRecordsQuerySchema.parse(req.query);

    const equipment = await equipmentRepo.getEquipmentById(equipmentId);
    if (!equipment) throw new HttpError(404, "Equipment not found");

    const { records, total } = await cleaningRecordRepo.listCleaningRecords({
      equipmentId,
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
    });

    res.json({
      data: records,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize) || 1,
      },
    });
  })
);

equipmentCleaningRecordsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { equipmentId } = req.params;
    const input = createCleaningRecordSchema.parse(req.body);
    const currentUser = (req as AuthedRequest).currentUser;

    const equipment = await equipmentRepo.getEquipmentById(equipmentId);
    if (!equipment) throw new HttpError(404, "Equipment not found");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const created = await cleaningRecordRepo.createCleaningRecord(client, equipmentId, input);
      const changes = diffRecords(null, created as unknown as Record<string, unknown>);

      await auditLogRepo.createAuditLog(client, {
        cleaningRecordId: created.id,
        action: "create",
        changedBy: currentUser,
        changes,
      });

      await client.query("COMMIT");
      res.status(201).json({ data: created });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  })
);

cleaningRecordsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const record = await cleaningRecordRepo.getCleaningRecordById(req.params.id);
    if (!record) throw new HttpError(404, "Cleaning record not found");
    res.json({ data: record });
  })
);

cleaningRecordsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateCleaningRecordSchema.parse(req.body);
    const currentUser = (req as AuthedRequest).currentUser;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const existing = await cleaningRecordRepo.getCleaningRecordById(req.params.id, client);
      if (!existing) {
        throw new HttpError(404, "Cleaning record not found");
      }

      const updated = await cleaningRecordRepo.updateCleaningRecord(client, req.params.id, input);
      if (!updated) {
        throw new HttpError(404, "Cleaning record not found");
      }

      const changes = diffRecords(
        existing as unknown as Record<string, unknown>,
        updated as unknown as Record<string, unknown>
      );

      if (changes.length > 0) {
        await auditLogRepo.createAuditLog(client, {
          cleaningRecordId: updated.id,
          action: "update",
          changedBy: currentUser,
          changes,
        });
      }

      await client.query("COMMIT");
      res.json({ data: updated });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  })
);

cleaningRecordsRouter.get(
  "/:id/audit-log",
  asyncHandler(async (req, res) => {
    const record = await cleaningRecordRepo.getCleaningRecordById(req.params.id);
    if (!record) throw new HttpError(404, "Cleaning record not found");

    const auditLogs = await auditLogRepo.listAuditLogsForRecord(req.params.id);
    res.json({ data: auditLogs });
  })
);
