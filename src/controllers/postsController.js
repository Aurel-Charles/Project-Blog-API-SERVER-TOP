import { deletePostById, getAllPosts, getPostByIdForAdmin, getPublishedPostById, getPublishedPosts, insertPost, updatePostById } from "../db/queries.js";
import { HttpError } from "../utils/httpErrorHandler.js";

export async function getPosts(req, res) {
    const isAdmin = req.user?.role === "ADMIN";

    const allPosts = isAdmin
    ? await getAllPosts()
    : await getPublishedPosts();

    res.json(allPosts);
}

export async function getPostById(req, res) {
        const id = Number(req.params.postId)
        if (!Number.isInteger(id)) {
            throw new HttpError("Can not find the post", 404)
        }

        const isAdmin = req.user?.role === "ADMIN";

        const post = isAdmin
        ? await getPostByIdForAdmin(id)
        : await getPublishedPostById(id);

        if (post === null) throw new HttpError("Post not found", 404);
        res.json(post);
}

export async function createPost(req,res) {
    const post = {
        title : req.body.title,
        content : req.body.content,
        authorId: req.user.id,
    }
    const newPost = await insertPost(post) 
    res.status(201).json(newPost)
}


export async function updatePost(req, res) {
    const id = Number(req.params.postId)
    
    if (!Number.isInteger(id)) {
        throw new HttpError("Can not find the post", 404)
    }

    const existingPost = await getPostByIdForAdmin(id);
    if (!existingPost) throw new HttpError("Post not found", 404);

    let publishedAt 
    if (req.body.published === true && existingPost.publishedAt ===null) {
        publishedAt = new Date()
    }else if (req.body.published === false) {
        publishedAt = null
    }
    const data = {
        title : req.body.title,
        content : req.body.content,
        publishedAt
    }


    const updatedPost = await updatePostById(id, data)
    res.json(updatedPost)
}

export async function deletePost(req, res) {
    const id = Number(req.params.postId)
    
    if (!Number.isInteger(id)) {
        throw new HttpError("Can not find the post", 404)
    }

    const existingPost = await getPostByIdForAdmin(id);
    if (!existingPost) throw new HttpError("Post not found", 404);

    await deletePostById(id)
    res.status(204).end()
}