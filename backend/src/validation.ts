import { z } from "zod";

export const equipmentStatusEnum = z.enum(["active", "retired"]);
export const cleaningRecordStatusEnum = z.enum(["pending", "verified"]);

export const createEquipmentSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(200),
  code: z.string().trim().min(1, "code is required").max(50),
  status: equipmentStatusEnum.optional(),
});

export const updateEquipmentSchema = createEquipmentSchema.partial();

export const createCleaningRecordSchema = z.object({
  cleanedBy: z.string().trim().min(1, "cleanedBy is required").max(200),
  cleanedAt: z.coerce.date(),
  method: z.string().trim().min(1, "method is required").max(200),
  notes: z.string().trim().max(2000).optional().nullable(),
  status: cleaningRecordStatusEnum.optional(),
});

export const updateCleaningRecordSchema = createCleaningRecordSchema.partial();

export const listCleaningRecordsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: cleaningRecordStatusEnum.optional(),
});
