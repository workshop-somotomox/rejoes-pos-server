import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

import { config } from '../config';
import { UploadedFile } from '../types';

async function ensureUploadDirs() {
  await Promise.all(
    Object.values(config.uploadDirs).map((dir) => fs.mkdir(dir, { recursive: true }))
  );
}

function buildFilename(suffix: string) {
  return `${uuidv4()}-${suffix}.jpg`;
}

export async function saveOriginalImage(file: UploadedFile) {
  if (!file?.buffer) {
    throw new Error('Invalid file buffer');
  }

  await ensureUploadDirs();
  const filename = buildFilename('original');
  const fullPath = path.join(config.uploadDirs.originals, filename);

  await sharp(file.buffer).jpeg({ quality: 85 }).toFile(fullPath);

  return {
    filename,
    path: fullPath,
    url: `/uploads/originals/${filename}`,
  };
}

export async function generateThumbnail(file: UploadedFile) {
  if (!file?.buffer) {
    throw new Error('Invalid file buffer');
  }

  await ensureUploadDirs();
  const filename = buildFilename('thumb');
  const fullPath = path.join(config.uploadDirs.thumbnails, filename);

  await sharp(file.buffer)
    .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toFile(fullPath);

  return {
    filename,
    path: fullPath,
    url: `/uploads/thumbnails/${filename}`,
  };
}
