import { prisma } from "../db/prisma.js";
import { getCommentById, getUserByID, getUserWithPasswordById } from "../db/queries.js";
import { HttpError } from "../utils/httpErrorHandler.js";
import jwt from "jsonwebtoken";
import { verifyPassword } from "../utils/verifyPassword.js";


async function isTokenValid(payload) {
    const user = await getUserWithPasswordById(payload.id)
    
    if (!user) return false
    
    const passwordChangedAt = Math.floor(user.passwordChangedAt.getTime() / 1000)
    if (payload.iat < passwordChangedAt) {
        return false
    }
    return true
}


export async function isAuth(req,res, next) {
    const bearerHeader = req.headers.authorization

    if (!bearerHeader){
        throw new HttpError("Login required", 401)
    }

    const token = bearerHeader.split(' ')[1]

    let payload
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET)
    } catch (error) {
        throw new HttpError("Invalid or expired token", 401);
    }
    if ( !await isTokenValid(payload)) {
        throw new HttpError("Invalid or expired token", 401);
    }
    req.user = payload
    next()
}

export function isAdmin(req, res, next) {
    if (req.user.role !== "ADMIN") {
        throw new HttpError("Admin access required", 403)
    }
    next()
}

export async function optionalAuth(req,res, next) {
    const bearerHeader = req.headers.authorization

    if (!bearerHeader){
        return next() 
    }

    const token = bearerHeader.split(' ')[1]
    let payload
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET)
    } catch (error) {
        return next()
    }
    const isValid = await isTokenValid(payload)
    if (isValid) {req.user = payload}
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

export async function checkCurrentPassword(req, res, next ) {
    const currentPassword = req.body.currentPassword
    const user = await getUserWithPasswordById(req.user.id)
    const password = user.password
    const isMatch = await verifyPassword(currentPassword, password)
    if (!isMatch) {
        throw new HttpError("Current password is incorrect", 403);
    }
    next()
}