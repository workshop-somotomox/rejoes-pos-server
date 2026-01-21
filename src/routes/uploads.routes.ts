import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../prisma';
import { generateThumbnail, saveOriginalImage } from '../services/image.service';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  }
});
const router = Router();

router.post('/loan-photo', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Photo file is required' });
    }

    const original = await saveOriginalImage(req.file);
    const thumbnail = await generateThumbnail(req.file);

    const record = await prisma.loanPhoto.create({
      data: {
        photoUrl: original.url,
        thumbnailUrl: thumbnail.url,
      },
    });

    return res.status(201).json({
      uploadId: record.id,
      photoUrl: record.photoUrl,
      thumbnailUrl: record.thumbnailUrl,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
