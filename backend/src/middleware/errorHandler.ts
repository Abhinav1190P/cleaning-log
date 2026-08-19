import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { DatabaseError } from "pg";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  if (err instanceof DatabaseError) {
    if (err.code === "23505") {
      res.status(409).json({ error: "A record with that value already exists" });
      return;
    }
    if (err.code === "23503") {
      res.status(400).json({ error: "Referenced record does not exist" });
      return;
    }
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
