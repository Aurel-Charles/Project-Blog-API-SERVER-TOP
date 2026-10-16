import { Router } from "express";
import { createComment, deleteComment, getComments, updateComment } from "../controllers/commentsController.js";
import { canEditComment, isAuth, optionalAuth } from "../middlewares/auth.js";
import { handleValidation, validateCreateComment, validateUpdateComment } from "../middlewares/validators.js";

export const commentsRouter = Router({ mergeParams: true });

commentsRouter.get("/",optionalAuth, getComments);
commentsRouter.post("/",optionalAuth,validateCreateComment, handleValidation, createComment);
commentsRouter.patch("/:commentId",isAuth,canEditComment,validateUpdateComment, handleValidation, updateComment);
commentsRouter.delete("/:commentId",isAuth,canEditComment, deleteComment);