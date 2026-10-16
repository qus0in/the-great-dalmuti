import { getMyStats } from '../../app/game/stats-query.js';
import { wrap } from './wrap.js';

// GET /api/stats — 요청자 본인의 전적 집계만 반환한다
export function statsHandler({ repository }) {
  return wrap(async (req, res) => {
    const stats = await getMyStats(
      { gameRepository: repository },
      { user: req.authUser },
    );
    res.json({ stats });
  });
}
