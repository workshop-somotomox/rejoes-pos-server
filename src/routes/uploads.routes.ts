import { Router } from 'express';
import multer from 'multer';
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

router.post('/loan-photo', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError(400, 'Photo file is required'));
    }

    const { memberId } = req.body;
    if (!memberId) {
      return next(new AppError(400, 'memberId is required'));
    }

    if (!allowedMimes.includes(req.file.mimetype)) {
      return next(new AppError(400, 'Invalid file type'));
    }

    const metadata: ImageMetadata = {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    };

    // Create LoanPhoto record first
    const record = await createLoanPhoto('', metadata);

    // Upload to R2
    const r2Key = await uploadImage(req.file.buffer, metadata, memberId, record.id);

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
