import { Request, Response, NextFunction, RequestHandler } from "express";

// Express doesn't forward rejected promises to the error handler on its own.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
