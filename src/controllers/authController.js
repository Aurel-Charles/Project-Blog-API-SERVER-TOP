import { getUserByEmail } from "../db/queries.js"
import { HttpError } from "../utils/httpErrorHandler.js";
import { verifyPassword } from "../utils/verifyPassword.js";
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