import { afterAll, beforeEach, describe, expect, test } from "vitest";
import  request  from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { insertUser } from "../src/db/queries.js";
import { createPassword } from "../src/utils/verifyPassword.js";
import jwt from "jsonwebtoken";

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


describe('Login', ()=> {
    const user = {
        firstname : "John", 
        lastname : "Doe",
        email : "j.doe@prisma.com", 
        password : "secret123"
    }
    let createdUser
    beforeEach(async()=>{
        createdUser =  await insertUser({...user, password: await createPassword(user.password)})
    })
    test("Login and recieve a token",async ()=> {
        const res = await request(app).post("/auth/login").send({email: user.email, password: user.password})
        expect(res.status).toBe(200)
        const token = res.body.token
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        expect(payload.id).toEqual(createdUser.id)
        expect(payload.role).toBe("USER")
    })

    test("Login and recieve wrong password",async ()=> {
        const res = await request(app).post("/auth/login").send({email: user.email, password: "invalid-password"})
        expect(res.status).toBe(401)
        expect(res.body.error).toBe("Email or Password is wrong")
    })

    test("Login and recieve unknown email",async ()=> {
        const res = await request(app).post("/auth/login").send({email: "unknown.email@prisma.com", password: user.password})
        expect(res.status).toBe(401)
        expect(res.body.error).toBe("Email or Password is wrong")
    })

})
