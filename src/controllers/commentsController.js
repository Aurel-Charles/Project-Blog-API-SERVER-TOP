import { deleteCommentById, getCommentsByPostId, getPostByIdForAdmin, getPublishedPostById, getUserByID, insertComment, updateCommentById } from "../db/queries.js";
import { HttpError } from "../utils/httpErrorHandler.js";

export async function getComments(req, res) {
    const id = Number(req.params.postId)
    if (!Number.isInteger(id)) {
        throw new HttpError("Can not find the post", 404)
    }

    const isAdmin = req.user?.role === "ADMIN";
    const post = isAdmin
    ? await getPostByIdForAdmin(id)
    : await getPublishedPostById(id);

    if (post === null) throw new HttpError("Post not found", 404);

    const comments = await getCommentsByPostId(id)
    res.json(comments)
}

export async function createComment(req, res) {
    const content = req.body.content
    if (!content) {
        throw new HttpError("Comment is empty", 400)
    }

    const postId = Number(req.params.postId)
    if (!Number.isInteger(postId)) {
        throw new HttpError("Can not find the post", 404)
    }

    const publishedPost  = await getPublishedPostById(postId)
    if (publishedPost === null) {
        throw new HttpError("Can not find the post", 404)
    }

    let user = null
    let name = req.body.name
    let authorId = null
    const isUser = req.user
    if (isUser) {
        user = await getUserByID(req.user.id)
        name = `${user.firstname} ${user.lastname.charAt(0).toUpperCase()}.`
        authorId = req.user.id
    }

    
    const data = {
        content,
        name,
        postId,
        authorId
    }

    const newComment = await insertComment(data)
    res.status(201).json(newComment)
}


export async function updateComment(req, res) {
    const content = req.body.content
    if (!content) {
        throw new HttpError("Content is empty", 400);
    }
    const data = {
        content
    }
    const updatedComment = await updateCommentById(req.comment.id, data)
    res.status(200).json(updatedComment)
}

export async function deleteComment(req, res) {
    await deleteCommentById(req.comment.id)
    res.status(204).end()
}