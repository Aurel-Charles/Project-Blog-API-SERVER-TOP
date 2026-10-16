import bcrypt from 'bcryptjs';


export async function createPassword(password) {
    const hashPassword = await bcrypt.hash(password,10)
    return hashPassword
}

export async function verifyPassword(inputPassword, storedHash) {
    const isMatch = await bcrypt.compare(inputPassword, storedHash)
    return isMatch
}