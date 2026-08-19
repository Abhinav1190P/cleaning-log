import express from "express";
import cors from "cors";
import { currentUser } from "./middleware/currentUser";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { equipmentRouter } from "./routes/equipment";
import { equipmentCleaningRecordsRouter, cleaningRecordsRouter } from "./routes/cleaningRecords";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(currentUser);

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/equipment/:equipmentId/cleaning-records", equipmentCleaningRecordsRouter);
  app.use("/api/equipment", equipmentRouter);
  app.use("/api/cleaning-records", cleaningRecordsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
