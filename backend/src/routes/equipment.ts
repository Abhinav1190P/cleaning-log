import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { createEquipmentSchema, updateEquipmentSchema } from "../validation";
import { HttpError } from "../middleware/errorHandler";
import * as equipmentRepo from "../db/equipmentRepo";

export const equipmentRouter = Router();

equipmentRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status;
    const filter = status === "active" || status === "retired" ? status : undefined;
    const equipment = await equipmentRepo.listEquipment(filter);
    res.json({ data: equipment });
  })
);

equipmentRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const equipment = await equipmentRepo.getEquipmentById(req.params.id);
    if (!equipment) throw new HttpError(404, "Equipment not found");
    res.json({ data: equipment });
  })
);

equipmentRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createEquipmentSchema.parse(req.body);
    const equipment = await equipmentRepo.createEquipment(input);
    res.status(201).json({ data: equipment });
  })
);

equipmentRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateEquipmentSchema.parse(req.body);
    const equipment = await equipmentRepo.updateEquipment(req.params.id, input);
    if (!equipment) throw new HttpError(404, "Equipment not found");
    res.json({ data: equipment });
  })
);

equipmentRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const deleted = await equipmentRepo.deleteEquipment(req.params.id);
    if (!deleted) throw new HttpError(404, "Equipment not found");
    res.status(204).send();
  })
);
