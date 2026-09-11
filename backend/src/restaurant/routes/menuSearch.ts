import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { searchMenu } from "../controllers/menuitem.js";

const router = express.Router();
router.post("/search", isAuth, searchMenu);

export default router;
