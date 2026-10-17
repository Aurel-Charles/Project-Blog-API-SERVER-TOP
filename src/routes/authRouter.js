import { Router } from "express";
import { login, register } from "../controllers/authController.js";
import { handleValidation, validateLogin, validateRegister } from "../middlewares/validators.js";


export const authRouter = Router()

authRouter.post('/login',validateLogin, handleValidation, login)
authRouter.post('/register',validateRegister, handleValidation, register)