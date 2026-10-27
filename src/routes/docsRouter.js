import { Router } from "express";
import { isAuth } from "../middlewares/auth.js";
import { getDocs } from "../controllers/docsController.js";

export const docsRouter = Router()

docsRouter.get('/', isAuth, getDocs)