import { prisma } from "./prisma.js";

export async function getPublishedPosts(){
    const allPosts = await prisma.post.findMany({
        where: {
            publishedAt : {not: null}
        },
        orderBy: {
            publishedAt: "desc"
        },
        include: {
            author: {
                select: {
                    firstname: true,
                    lastname: true
                }
            }
        }
    })
    return allPosts
}