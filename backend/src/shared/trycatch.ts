import { RequestHandler } from "express";
const TryCatch = (handler: RequestHandler): RequestHandler => async (req, res, next) => {
  try { await handler(req, res, next); }
  catch (error) {
    console.error(error);
    if (!res.headersSent) res.status(500).json({ message: "Internal server error" });
  }
};
export default TryCatch;
