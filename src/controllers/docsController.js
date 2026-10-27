import { getReadme } from "../utils/readReadme.js"

export async function getDocs(req, res) {
    const content = await getReadme()
    res.json({content})
}