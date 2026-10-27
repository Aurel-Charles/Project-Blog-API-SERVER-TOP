import { deleteUserById, getCommentsByAuthor, getUserByEmail, getUserByID, insertUser, updateUser } from "../db/queries.js"
import { createToken } from "../utils/createToken.js";
import { HttpError } from "../utils/httpErrorHandler.js";
import { createPassword, verifyPassword } from "../utils/verifyPassword.js";


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

    const token = createToken(user)
    
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

    const token = createToken(registeredUser)

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

export async function updateMe(req, res) {
    const id = req.user.id
    const data = {
        firstname : req.body.firstname,
        lastname : req.body.lastname
    }
    const updatedUser = await updateUser(id, data)
    res.json(updatedUser)
}

export async function updatePassword(req, res) {
    const id = req.user.id
    const newPassword = req.body.newPassword
    const hashNewPassword = await createPassword(newPassword)
    const data = {
        password : hashNewPassword,
        passwordChangedAt : new Date()
    }
    const user =  await updateUser(id, data)
    const token = createToken(user)
    res.json({token})
}

export async function updateEmail(req, res) {
    const email = req.body.email
    const id = req.user.id
    const existingUser = await getUserByEmail(email)
    if (existingUser && id !== existingUser.id) {
        throw new HttpError("Email already used", 409);
    }
    const data = {email : email}
    const updatedUser = await updateUser(id, data)
    res.json(updatedUser)
}

export async function deleteMe(req, res) {
    if (req.user.role === "ADMIN") {
        throw new HttpError("The admin account cannot be deleted", 403)
    }

    const id = req.user.id
    await deleteUserById(id)

    res.status(204).end()
}
