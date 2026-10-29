import { afterAll, beforeEach, describe, expect, test } from "vitest";
import  request  from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { createPassword } from "../src/utils/verifyPassword.js";
import { createToken } from "../src/utils/createToken.js";

beforeEach(async()=> {
    await prisma.$transaction([
        prisma.comment.deleteMany(),
        prisma.post.deleteMany(),
        prisma.user.deleteMany()
    ])
})
afterAll(async()=> {
    await prisma.$disconnect()
})


describe('POST /posts', ()=> {
    const admin = {
        firstname : "John", 
        lastname : "Doe",
        email : "j.doe@prisma.com", 
        password : "secret123",
        role: "ADMIN"
    }
    const user = {
        firstname : "Les", 
        lastname : "Martin",
        email : "l.martin@prisma.com", 
        password : "justeUser123",
    }


    let createdAdmin
    let createdUser
    let adminToken
    let userToken
    beforeEach(async()=>{
        createdAdmin =  await prisma.user.create({
            data : {
                ...admin,
                password: await createPassword( admin.password),
            }
        })
        createdUser =  await prisma.user.create({
            data : {
                ...user,
                password: await createPassword( user.password),
            }
        })
        adminToken = createToken(createdAdmin)
        userToken = createToken(createdUser)
    })
    test("Create a post as Admin",async ()=> {
        const res = await request(app).post("/posts").set("Authorization", `Bearer ${adminToken}`).send({title: "Test Post", content: "some cool content"})
        expect(res.status).toBe(201)
        expect(res.body.authorId).toBe(createdAdmin.id)
        expect(res.body.publishedAt).toBeNull()
    })
    test("Can not create a post as User",async ()=> {
        const res = await request(app).post("/posts").set("Authorization", `Bearer ${userToken}`).send({title: "Test user Post", content: "some content that won't be stored"})
        expect(res.status).toBe(403)
        expect(res.body.error).toBe("Admin access required")
        const numPosts = await prisma.post.count()
        expect(numPosts).toBe(0)
    })
})

describe('GET /posts?status=', ()=> {
    const admin = {
        firstname : "John", 
        lastname : "Doe",
        email : "j.doe@prisma.com", 
        password : "secret123",
        role: "ADMIN"
    }
    const user = {
        firstname : "Les", 
        lastname : "Martin",
        email : "l.martin@prisma.com", 
        password : "justeUser123",
    }


    let createdAdmin
    let createdUser
    let adminToken
    let userToken
    let post
    let draft
    beforeEach(async()=>{
        createdAdmin =  await prisma.user.create({
            data : {
                ...admin,
                password: await createPassword( admin.password),
            }
        })
        createdUser =  await prisma.user.create({
            data : {
                ...user,
                password: await createPassword( user.password),
            }
        })
        adminToken = createToken(createdAdmin)
        userToken = createToken(createdUser)
        post = await prisma.post.create({
            data: {
                title: "this is a post",
                content: "And im live",
                authorId : createdAdmin.id , 
                publishedAt: new Date()
            }
        })
        draft = await prisma.post.create({
            data: {
                title: "this is a DRAFT",
                content: "Still need some thought", 
                authorId : createdAdmin.id ,
            }
        })
    })
    test("GET posts without token",async ()=> {
        const res = await request(app).get("/posts")
        expect(res.status).toBe(200)
        expect(res.body).toHaveLength(1)
        expect(res.body[0].id).toBe(post.id)
    })
    test("GET posts as Admin",async ()=> {
        const res = await request(app).get("/posts").set("Authorization", `Bearer ${adminToken}`)
        expect(res.status).toBe(200)
        expect(res.body).toHaveLength(1)
        expect(res.body[0].id).toBe(post.id)
    })
    test("GET posts?status=all as Admin",async ()=> {
        const res = await request(app).get("/posts?status=all").set("Authorization", `Bearer ${adminToken}`)
        expect(res.status).toBe(200)
        expect(res.body).toHaveLength(2)
        const allPostId = res.body.map((post)=> post.id)
        expect(allPostId).toContain(draft.id)
        expect(allPostId).toContain(post.id)
    })
})
