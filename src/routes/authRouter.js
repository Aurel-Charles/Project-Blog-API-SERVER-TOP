import { Router } from "express";
import { getAllUserComments, getMe, login, register } from "../controllers/authController.js";
import { handleValidation, validateLogin, validateRegister } from "../middlewares/validators.js";
import { isAuth } from "../middlewares/auth.js";


export const authRouter = Router()

authRouter.post('/login',validateLogin, handleValidation, login)
authRouter.post('/register',validateRegister, handleValidation, register)
authRouter.get('/me', isAuth, getMe)
authRouter.get('/me/comments', isAuth, getAllUserComments)