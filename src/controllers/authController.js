import { getCommentsByAuthor, getUserByEmail, getUserByID, insertUser } from "../db/queries.js"
import { HttpError } from "../utils/httpErrorHandler.js";
import { createPassword, verifyPassword } from "../utils/verifyPassword.js";
import jwt from "jsonwebtoken";


export async function login(req, res){
    const {email , password} = req.body 
    const user = await getUserByEmail(email)
    if (user === null) {
        throw new HttpError("Email or Password is wrong", 401);
    }
    
    const isPasswordCorrect = await verifyPassword(password , user.password)
    if (!isPasswordCorrect) {
        throw new HttpError("Email or Password is wrong", 401);
    }

    const token = jwt.sign(
        {id: user.id, role: user.role},
        process.env.JWT_SECRET,
        {expiresIn: "1d"}
    )
    
    res.json({token})
}

export async function register(req, res) {
    const {firstname, lastname, email, password} = req.body

    const isTaken = await getUserByEmail(email)
    if (isTaken !== null) {
        throw new HttpError("Email is already taken", 409);
    }

    const hashPassword = await createPassword(password)

    const newUser = {
        firstname,
        lastname,
        email,
        password: hashPassword
    }
    
    const registeredUser = await insertUser(newUser)

    const token = jwt.sign(
        {id: registeredUser.id, role: registeredUser.role},
        process.env.JWT_SECRET,
        {expiresIn: "1d"}
    )

    res.status(201).json({token})
}

export async function getMe(req, res) {
    const userId = req.user.id
    const user = await getUserByID(userId)
    if (!user) throw new HttpError("User not found", 401)
    res.status(200).json(user)
}

export async function getAllUserComments(req, res) {
    const comments = await getCommentsByAuthor(req.user.id)
    res.json(comments)
}