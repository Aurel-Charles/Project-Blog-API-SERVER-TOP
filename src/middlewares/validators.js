import { body, validationResult } from "express-validator"
import sanitize from "sanitize-html"

const allowedTags = [
    "h2","h3","strong","em","ul","ol","li","a","blockquote","code","pre","p","br"
]

function sanitizeContent(value) {
    const cleanValue = sanitize(
        value,
        {
            allowedTags: allowedTags,
            allowedAttributes: { a: ["href"] }
        }
    )
    return cleanValue
}

export const validateLogin = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required").bail()
        .isEmail().withMessage("Invalid email"),
    body("password")
        .notEmpty().withMessage("Password is required"),
]

export const validateRegister =[
    body("firstname")
    .trim()
    .notEmpty().withMessage("Firstname is required")
    .isLength({max: 20}).withMessage("Firstname must be 20 characters max"),
    body("lastname")
    .trim()
    .notEmpty().withMessage("Lastname is required")
    .isLength({max: 20}).withMessage("Lastname must be 20 characters max"),
    body("email")
    .trim()
    .notEmpty().withMessage("Email is required").bail()
    .isEmail().withMessage("Invalid email"),
body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({min: 7}).withMessage("Password must be at least 7 characters"),
body("confirmPassword")
    .notEmpty().withMessage("confirmPassword is required")
    .custom((value, {req}) => value === req.body.password ).withMessage("Passwords do not match"),
]

export const validateCreatePost =[
    body("title")
        .trim()
        .notEmpty().withMessage("Title is required"),
    body("content")
        .trim()
        .customSanitizer((value)=> sanitizeContent(value) )
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
        .customSanitizer((value)=> sanitizeContent(value) )
        .notEmpty().withMessage("Content cannot be empty"),
    body("published")
        .optional()
        .isBoolean({ strict: true }).withMessage("Published must be true or false"),
]

export const validateCreateComment = [
    body("name")
        .if((value, {req}) => req.user === undefined )
        .trim()
        .notEmpty().withMessage("Name is required")
        .isLength({max: 40}).withMessage("Name must be 40 characters max"),
    body("content")
        .trim()
        .notEmpty().withMessage("Comment is required")
        .isLength({max: 250}).withMessage("Comment must be 250 characters max")
    ]
    
export const validateUpdateComment = [
    body("content")
        .trim()
        .notEmpty().withMessage("Comment is required")
        .isLength({max: 250}).withMessage("Comment must be 250 characters max")
]

export const validateUpdateMe =[
    body("firstname")
        .optional()
        .trim()
        .notEmpty().withMessage("Firstname cannot be empty")
        .isLength({max: 20}).withMessage("Firstname must be 20 characters max"),
    body("lastname")
        .optional()
        .trim()
        .notEmpty().withMessage("Lastname cannot be empty")
        .isLength({max: 20}).withMessage("Lastname must be 20 characters max"),
]

export const validateUpdatePassword = [
    body("currentPassword")
    .notEmpty().withMessage("Current password is required"),
    body("newPassword")
    .notEmpty().withMessage("New password is required")
    .isLength({min: 7}).withMessage("Password must be at least 7 characters"),
    body("confirmNewPassword")
    .notEmpty().withMessage("confirmPassword is required")
    .custom((value, {req}) => value === req.body.newPassword ).withMessage("Passwords do not match"),   
]

export const validateUpdateEmail = [
    body("email")
    .trim()
    .notEmpty().withMessage("Email is required").bail()
    .isEmail().withMessage("Invalid email"),
    body("currentPassword")
    .notEmpty().withMessage("Current password is required"),
]


export function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}