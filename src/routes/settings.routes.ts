import { Router } from 'express';
import { getAllSettings, updateSettings } from '../services/settings.service';
import { success } from '../types/api.types';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const settings = await getAllSettings();
    res.json(success(settings));
  } catch (error) {
    next(error);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const entries = req.body;
    if (!entries || typeof entries !== 'object' || Array.isArray(entries)) {
      return res.status(400).json({ success: false, message: 'Body must be a JSON object of key-value pairs' });
    }

    const stringEntries: Record<string, string> = {};
    for (const [key, value] of Object.entries(entries)) {
      stringEntries[key] = String(value);
    }

    const updated = await updateSettings(stringEntries);
    res.json(success(updated));
  } catch (error) {
    next(error);
  }
});

export default router;
