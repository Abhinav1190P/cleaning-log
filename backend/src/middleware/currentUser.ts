import { Request, Response, NextFunction } from "express";

// There's no real auth in this assignment. We stand in a "current user"
// from a header so cleanedBy / audit "who" have a real value to attach to,
// same shape as if this were pulled off a session/JWT later.
export interface AuthedRequest extends Request {
  currentUser: string;
}

export function currentUser(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("x-current-user");
  (req as AuthedRequest).currentUser = header && header.trim() ? header.trim() : "system";
  next();
}
