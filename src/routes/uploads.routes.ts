import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import fetch, { Response } from 'node-fetch';
import { prisma } from '../prisma';
import { uploadImage, ImageMetadata } from '../services/upload.service';
import { createLoanPhoto } from '../services/loanPhoto.repository';
import { logEvent } from '../services/audit.service';
import { AppError } from '../utils/errors';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  }
});
const router = Router();

const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

async function downloadImageFromUrl(imageUrl: string) {
  const trimmedUrl = imageUrl?.trim();
  if (!trimmedUrl) {
    throw new AppError(400, 'imageUrl is required when no file is uploaded');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    throw new AppError(400, 'Invalid imageUrl');
  }

  const response: Response = await fetch(parsedUrl.toString());
  if (!response.ok) {
    throw new AppError(400, 'Failed to download image');
  }

  const rawMime = response.headers.get('content-type') || '';
  const mimeType = rawMime.split(';')[0];
  if (!allowedMimes.includes(mimeType)) {
    throw new AppError(400, 'Invalid file type');
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_FILE_SIZE) {
    throw new AppError(400, 'Image exceeds size limit (5MB)');
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length > MAX_FILE_SIZE) {
    throw new AppError(400, 'Image exceeds size limit (5MB)');
  }

  const originalNameFromPath = path.basename(parsedUrl.pathname);
  const extensionFromMime = mimeType.split('/')[1] || 'jpg';
  const originalName = originalNameFromPath || `remote-image.${extensionFromMime}`;

  const metadata: ImageMetadata = {
    originalName,
    mimeType,
    size: buffer.length,
  };

  return { buffer, metadata };
}

router.post('/loan-photo', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]), async (req, res, next) => {
  try {
    const { memberId, imageUrl } = req.body;
    if (!memberId) {
      return next(new AppError(400, 'memberId is required'));
    }

    let buffer: Buffer;
    let metadata: ImageMetadata;
    const fileField = (req.files as Record<string, Express.Multer.File[]>) || {};
    const uploadedFile = (fileField.photo?.[0]) ?? (fileField.file?.[0]);

    if (uploadedFile) {
      if (!allowedMimes.includes(uploadedFile.mimetype)) {
        return next(new AppError(400, 'Invalid file type'));
      }

      metadata = {
        originalName: uploadedFile.originalname,
        mimeType: uploadedFile.mimetype,
        size: uploadedFile.size,
      };
      buffer = uploadedFile.buffer;
    } else if (imageUrl) {
      const downloaded = await downloadImageFromUrl(imageUrl);
      metadata = downloaded.metadata;
      buffer = downloaded.buffer;
    } else {
      return next(new AppError(400, 'Photo file or imageUrl is required'));
    }

    // Create LoanPhoto record first
    const record = await createLoanPhoto('', metadata);

    // Upload to R2
    const r2Key = await uploadImage(buffer, metadata, memberId, record.id);

    // Update record with r2Key and final metadata
    await prisma.loanPhoto.update({
      where: { id: record.id },
      data: { r2Key, metadata: JSON.stringify(metadata) },
    });

    // Log audit event (skip in test environment to avoid potential issues)
    if (process.env.NODE_ENV !== 'test') {
      await logEvent(memberId, 'photo_upload', {
        uploadId: record.id,
        r2Key,
        ...metadata,
      });
    }

    return res.status(201).json({
      uploadId: record.id,
      status: 'success',
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
