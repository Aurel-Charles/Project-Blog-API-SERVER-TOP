import { Router } from "express";
import { login } from "../controllers/authController.js";
import { handleValidation, validateLogin } from "../middlewares/validators.js";


export const authRouter = Router()

authRouter.post('/login',validateLogin, handleValidation, login)