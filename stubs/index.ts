import { fileURLToPath } from 'node:url'
import { dirname as pathDirname } from 'node:path'

export const stubsRoot = pathDirname(fileURLToPath(import.meta.url))
