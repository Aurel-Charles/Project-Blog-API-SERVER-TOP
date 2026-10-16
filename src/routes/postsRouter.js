import { Router } from "express";
import { createPost, deletePost, getPostById, getPosts, updatePost } from "../controllers/postsController.js";
import { isAdmin, isAuth, optionalAuth } from "../middlewares/auth.js";
import { commentsRouter } from "./commentsRouter.js";
import { handleValidation, validateCreatePost, validateUpdatePost } from "../middlewares/validators.js";


export const postsRouter = Router()


postsRouter.get('/',optionalAuth, getPosts)
postsRouter.post('/', isAuth, isAdmin,validateCreatePost,handleValidation, createPost)
postsRouter.get('/:postId',optionalAuth, getPostById)
postsRouter.patch('/:postId', isAuth, isAdmin,validateUpdatePost, handleValidation, updatePost)
postsRouter.delete('/:postId', isAuth, isAdmin, deletePost)

postsRouter.use('/:postId/comments', commentsRouter)