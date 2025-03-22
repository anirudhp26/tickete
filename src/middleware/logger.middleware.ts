
import { Request, Response, NextFunction } from 'express';

export function logger(req: Request, res: Response, next: NextFunction) {
  console.log(`Request URL: ${req.originalUrl} - Method: ${req.method} - Time: ${new Date()}`);
  next();
};
