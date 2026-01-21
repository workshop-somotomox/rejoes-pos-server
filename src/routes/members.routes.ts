import { Router } from 'express';
import { getMemberByCard } from '../services/member.service';

const router = Router();

router.get('/by-card/:cardToken', async (req, res, next) => {
  try {
    const { cardToken } = req.params;
    const payload = await getMemberByCard(cardToken);
    res.json({
      member: payload.member,
      allowances: payload.allowances,
      activeLoans: payload.activeLoans,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
