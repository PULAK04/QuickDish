import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  image: string;
  role: string | null;
  restaurantId?: string;
}
export interface AuthenticatedRequest extends Request { user?: AuthUser | null; }

export const isAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return void res.status(401).json({ message: "Please login" });
    const secret = process.env.JWT_SEC;
    if (!secret) return void res.status(500).json({ message: "JWT secret is not configured" });
    const token = header.slice(7).trim();
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
    if (!decoded?.user) return void res.status(401).json({ message: "Invalid authentication token" });
    req.user = decoded.user as AuthUser;
    next();
  } catch {
    res.status(401).json({ message: "Session expired or token is invalid" });
  }
};

export const isSeller = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== "seller") return void res.status(403).json({ message: "Seller access required" });
  next();
};

export const isAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== "admin") return void res.status(403).json({ message: "Admin access required" });
  next();
};
