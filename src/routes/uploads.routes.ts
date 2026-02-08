import { Router } from 'express';
import multer from 'multer';
import { uploadImage } from '../services/upload.service';
import { UploadRepository } from '../repositories/upload.repo';
import { ImageMetadata } from '../types/upload.types';
import { createLoanPhoto } from '../services/loanPhoto.repository';
import { logEvent } from '../services/audit.service';
import { AppError } from '../utils/errors';
import { success } from '../types/api.types';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Allow up to 10 files
  }
});

const uploadSingle = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  }
});
const router = Router();

const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
/**
 * @swagger
 * /api/uploads/loan-photo:
 *   post:
 *     summary: Upload a loan photo
 *     tags: [Uploads]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [photo, memberId]
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG, GIF, WebP, max 5MB)
 *               memberId:
 *                 type: string
 *                 description: Member ID to associate the photo with
 *                 example: "cm123abc"
 *     responses:
 *       201:
 *         description: Photo uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     uploadId:
 *                       type: string
 *                       example: "upload123"
 *                     status:
 *                       type: string
 *                       example: "success"
 *       400:
 *         description: Bad request - missing file, memberId, or invalid file type
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Photo file is required"
 */
router.post('/loan-photo', uploadSingle.single('photo'), async (req, res, next) => {
  try {
    const { memberId } = req.body;
    if (!memberId) {
      return next(new AppError(400, 'memberId is required'));
    }

    if (!req.file) {
      return next(new AppError(400, 'Photo file is required'));
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
    await UploadRepository.updateLoanPhoto(record.id, {
      r2Key,
      metadata: JSON.stringify(metadata),
    });

    return res.status(201).json(success({
      uploadId: record.id,
      status: 'success',
    }));
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/uploads/loan-photos:
 *   post:
 *     summary: Upload multiple loan photos at once
 *     tags: [Uploads]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [photos, memberId]
 *             properties:
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Array of image files (JPEG, PNG, GIF, WebP, max 5MB each, max 10 files)
 *               memberId:
 *                 type: string
 *                 description: Member ID to associate the photos with
 *                 example: "cm123abc"
 *     responses:
 *       201:
 *         description: Photos uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     uploadIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["upload123", "upload456"]
 *                     count:
 *                       type: number
 *                       example: 2
 *       400:
 *         description: Bad request - missing files, memberId, or invalid file type
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "At least one photo file is required"
 */
router.post('/loan-photos', upload.array('photos', 10), async (req, res, next) => {
  try {
    const { memberId } = req.body;
    if (!memberId) {
      return next(new AppError(400, 'memberId is required'));
    }

    if (!req.files || req.files.length === 0) {
      return next(new AppError(400, 'At least one photo file is required'));
    }

    const files = req.files as Express.Multer.File[];
    
    // Validate file types
    const invalidFiles = files.filter(file => !allowedMimes.includes(file.mimetype));
    if (invalidFiles.length > 0) {
      return next(new AppError(400, `Invalid file types: ${invalidFiles.map(f => f.mimetype).join(', ')}`));
    }

    const uploadPromises = files.map(async (file) => {
      const metadata: ImageMetadata = {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };

      // Create LoanPhoto record first
      const record = await createLoanPhoto('', metadata);

      // Upload to R2
      const r2Key = await uploadImage(file.buffer, metadata, memberId, record.id);

      // Update record with r2Key and final metadata
      await UploadRepository.updateLoanPhoto(record.id, {
        r2Key,
        metadata: JSON.stringify(metadata),
      });

      return record.id;
    });

    const uploadIds = await Promise.all(uploadPromises);

    return res.status(201).json(success({
      uploadIds,
      count: uploadIds.length,
      status: 'success',
    }));
  } catch (error) {
    return next(error);
  }
});

export default router;
