import { body, validationResult } from "express-validator"



export const validateLogin = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required").bail()
        .isEmail().withMessage("Invalid email"),
    body("password")
        .notEmpty().withMessage("Password is required"),
]


export const validateCreatePost =[
    body("title")
        .trim()
        .notEmpty().withMessage("Title is required"),
    body("content")
        .trim()
        .notEmpty().withMessage("Content is required"),
]

export const validateUpdatePost =[
    body("title")
        .optional()
        .trim()
        .notEmpty().withMessage("Title cannot be empty"),
    body("content")
        .optional()
        .trim()
        .notEmpty().withMessage("Content cannot be empty"),
    body("published")
        .optional()
        .isBoolean({ strict: true }).withMessage("Published must be true or false"),
]

export const validateCreateComment = [
    body("name")
        .if((value, {req}) => req.user === undefined )
        .trim()
        .notEmpty().withMessage("Name is required"),
    body("content")
        .trim()
        .notEmpty().withMessage("Comment is required")
]

export const validateUpdateComment = [
    body("content")
        .trim()
        .notEmpty().withMessage("Comment is required")
]



export function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}