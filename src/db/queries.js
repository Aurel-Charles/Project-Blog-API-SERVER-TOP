import { prisma } from "./prisma.js";


// AUTH/USER queries ----------------------------------

export async function getUserByID(id) {
    const user = await prisma.user.findUnique({
        where : {id : id},
        select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            role: true
        }
    })
    return user
}

export async function getUserByEmail(email) {
    const user = await prisma.user.findUnique({
        where: {email : email}
    })
    return user
}

export async function insertUser(user) {
    const newUser = await prisma.user.create({
        data: {
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            password: user.password
        },
    })
    return newUser
}

// POSTS queries ----------------------------------

export async function getAllPosts(){
    const allPosts = await prisma.post.findMany({
        orderBy: {
            createdAt: "desc"
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

export async function getPublishedPostById(id) {
    const post = await prisma.post.findUnique({
        where: {
            id : id,
            publishedAt: {not: null}
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
    return post
}

export async function getPostByIdForAdmin(id) {
    const post = await prisma.post.findUnique({
        where: {
            id : id,
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
    return post
}

export async function insertPost(post) {
    const newPost = await prisma.post.create({
        data: {
            title : post.title,
            content : post.content,
            authorId : post.authorId
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
    return newPost
}

export async function updatePostById(id, data){
    const updatedPost = await prisma.post.update({
        where: {
            id :id,
        },
        data : data,
        include: {
            author: {
                select: {
                    firstname: true,
                    lastname: true
                }
            }
        }
    })
    return updatedPost
}

export async function deletePostById(id) {
    await prisma.post.delete({
        where: {id: id}
    })
}


// COMMENTS  queries

export async function getCommentsByPostId(postId){
    const comments = await prisma.comment.findMany({
        where : {postId : postId},
        orderBy : {createdAt : "asc"}
    })
    return comments
}

export async function insertComment(comment) {
    const newComment = await prisma.comment.create({
        data: {
            content : comment.content,
            name: comment.name,
            postId: comment.postId,
            authorId : comment.authorId
        }
    })
    return newComment
}

export async function getCommentById(id) {
    const comment = await prisma.comment.findUnique({
        where : {id : id}
    })
    return comment
}

export async function updateCommentById(id, data){
    const updatedComment = await prisma.comment.update({
        where: {
            id :id,
        },
        data : {
            content : data.content
        }
    })
    return updatedComment
}

export async function deleteCommentById(id) {
    await prisma.comment.delete({
        where: {id : id}
    })
}

export async function getCommentsByAuthor(authorId) {
    const comments = await prisma.comment.findMany({
        where : {
            authorId : authorId,
            post : {
                publishedAt : {not: null}
            }
        },
        include : {
            post : {
                select :{
                    id : true,
                    title : true
                }
            }
        },
        orderBy : {createdAt: "desc"}
    })
    return comments
}