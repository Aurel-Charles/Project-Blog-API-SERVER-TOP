import { readFile } from 'node:fs/promises';
import path from "path";

export async function getReadme() {
    const topDir = import.meta.dirname
    const filePath = path.join(topDir,"../../", "README.md")
    const contents = await readFile(filePath, { encoding: 'utf8' });
    return contents
}