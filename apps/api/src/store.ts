import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CmsData } from './types.js';
const dataPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/cms.json');
export async function readCms(): Promise<CmsData> { return JSON.parse(await readFile(dataPath, 'utf8')) as CmsData; }
export async function saveCms(data: CmsData): Promise<void> { await mkdir(path.dirname(dataPath), { recursive: true }); const temporary = `${dataPath}.tmp`; await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`); await rename(temporary, dataPath); }
