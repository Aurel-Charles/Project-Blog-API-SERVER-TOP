import { describe, expect, test } from "vitest";
import  request  from "supertest";
import { app } from "../src/app.js";



test("index route works", async () => {
    const res = await request(app).get("/")    
    expect(res.body.message).toEqual("Hello blogers" )
    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch((/json/))
});

test("Unknown route", async () => {
    const resNoRoute = await request(app).get('/somewrongroute')
    expect(resNoRoute.status).toBe(404)
    expect(resNoRoute.body.error).toEqual("Route not found")
})

describe("Protected routes without token", ()=> {
    test.each([
        { methode : "post" ,  path: "/posts" },
        { methode : "patch",  path: "/posts/1"},
        { methode : "delete",  path: "/posts/1"},
        { methode : "get",  path: "/auth/me"},
        { methode : "get",  path: "/docs"}
    ])(`$methode: $path without token return 401`,async (route)=> {
        const res = await request(app)[route.methode](route.path)
        expect(res.status).toBe(401)
        expect(res.body.error).toBe("Login required")
    })
})

describe("Protected routes with invalid token", ()=> {
    test("GET auth/me with invalid token return 401",async ()=> {
        const res = await request(app).get("/auth/me").set("Authorization", "Bearer wrongToken")
        expect(res.status).toBe(401)
        expect(res.body.error).toBe("Invalid or expired token")
    })
})

describe("Login without/wrong email return 400", ()=> {
    test("POST auth/login without email return 400",async ()=> {
        const res = await request(app).post("/auth/login")
        expect(res.status).toBe(400)
        expect(res.body.errors.some((error)=> error.path === "email" )).toBe(true)
    })
    test("POST auth/login with wrong email return 400",async ()=> {
        const res = await request(app).post("/auth/login").send({email: "not-an-email", password: "x"})
        expect(res.status).toBe(400)
        expect(res.body.errors.some((error)=> error.path === "email" )).toBe(true)
    })
})

describe("Login without/wrong password return 400", ()=> {
    test("POST auth/login without password return 400",async ()=> {
        const res = await request(app).post("/auth/login").send({email: "john.go@odin.com"})
        expect(res.status).toBe(400)
        expect(res.body.errors.some((error)=> error.path === "password" )).toBe(true)
    })
})

describe("Register with wrong password return 400", ()=> {
    const validUser = {
        firstname: "John",
        lastname: "Doe",
        email: "j.doe@cool.com",
        password: "cool-password",
        confirmPassword: "cool-password"
    }

    test("POST auth/register with wrong confirm password return 400",async ()=> {
        const res = await request(app).post("/auth/register").send({...validUser, confirmPassword: "oups"})
        expect(res.status).toBe(400)
        expect(res.body.errors).toHaveLength(1)
        expect(res.body.errors.some((error)=> error.path === "confirmPassword" )).toBe(true)
    })
    
    test("POST auth/register with password too short (3characters) return 400",async ()=> {
        const res = await request(app).post("/auth/register").send({...validUser,password: "tip" , confirmPassword: "tip"})
        expect(res.status).toBe(400)
        expect(res.body.errors).toHaveLength(1)
        expect(res.body.errors.some((error)=> error.path === "password" )).toBe(true)
    })
})

describe("Invalid ID in URL", ()=> {
    test.each([
        { path: "/posts/abc" },
        { path: "/posts/abc/comments" },
        { path: "/posts/1.2/comments" }
    ])(`$path does not use integer as an ID return 404`,async (route)=> {
        const res = await request(app).get(route.path)
        expect(res.status).toBe(404)
        expect(res.body.error).toBe("Can not find the post")
    })
})

describe("Invalid json body format", ()=> {
    test("malformed JSON body returns 400 from express.json()",async ()=> {
        const res = await request(app).post("/auth/login").set("Content-Type", "application/json").send('{"email":}')
        expect(res.status).toBe(400)
        expect(res.body.error).toBeTypeOf("string")
        expect(res.body.errors).toBeUndefined()
    })
})