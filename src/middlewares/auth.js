import { getCommentById } from "../db/queries.js";
import { HttpError } from "../utils/httpErrorHandler.js";
import jwt from "jsonwebtoken";

export function isAuth(req,res, next) {
    const bearerHeader = req.headers.authorization

    if (!bearerHeader){
        throw new HttpError("Login required", 401)
    }

    const token = bearerHeader.split(' ')[1]
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        req.user = payload
    } catch (error) {
        throw new HttpError("Invalid or expired token", 401);
    }
    next()
}

export function isAdmin(req, res, next) {
    if (req.user.role !== "ADMIN") {
        throw new HttpError("Admin access required", 403)
    }
    next()
}

export function optionalAuth(req,res, next) {
    const bearerHeader = req.headers.authorization

    if (!bearerHeader){
        return next() 
    }

    const token = bearerHeader.split(' ')[1]
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        req.user = payload
    } catch (error) {
        // anonymous visitor - no "req.user"
    }
    next()
}

export async function canEditComment(req, res, next) {
    const postId = Number(req.params.postId)
    if (!Number.isInteger(postId)) {
        throw new HttpError("Can not find the post", 404)
    }
    const commentId = Number(req.params.commentId)
    if (!Number.isInteger(commentId)) {
        throw new HttpError("Can not find the comment", 404)
    }

    const comment = await getCommentById(commentId)
    if (comment === null || comment.postId !== postId) {
        throw new HttpError("Can not find the comment", 404)
    }
    if (comment.authorId !== req.user.id && req.user.role !== "ADMIN") {
        throw new HttpError("Not authorized", 403);
    }
    req.comment = comment
    next()
}
