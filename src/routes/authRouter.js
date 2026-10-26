import { Router } from "express";
import { getAllUserComments, getMe, login, register, updateEmail, updateMe, updatePassword } from "../controllers/authController.js";
import { handleValidation, validateLogin, validateRegister, validateUpdateEmail, validateUpdateMe, validateUpdatePassword } from "../middlewares/validators.js";
import { checkCurrentPassword, isAuth } from "../middlewares/auth.js";


export const authRouter = Router()

authRouter.post('/login',validateLogin, handleValidation, login)
authRouter.post('/register',validateRegister, handleValidation, register)
authRouter.get('/me', isAuth, getMe)
authRouter.patch('/me', isAuth,validateUpdateMe, handleValidation, updateMe)
authRouter.patch('/me/password', isAuth,validateUpdatePassword, handleValidation, checkCurrentPassword, updatePassword )
authRouter.patch('/me/email', isAuth,validateUpdateEmail, handleValidation, checkCurrentPassword, updateEmail )
authRouter.get('/me/comments', isAuth, getAllUserComments)