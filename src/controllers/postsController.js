import { getPublishedPosts } from "../db/queries.js";

export async function getPosts(req, res) {
        const allPosts = await getPublishedPosts()
        res.json(allPosts)
}