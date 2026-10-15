import { Router } from "express";
import { getPosts } from "../controllers/postsController.js";


export const postsRouter = Router()

postsRouter.get('/', getPosts)