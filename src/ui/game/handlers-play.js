import { passTurn, playCards } from '../../app/game/play-actions.js';
import { submitTribute } from '../../app/game/tribute-actions.js';
import { declareRevolution } from '../../app/game/revolution-actions.js';
import { wrap } from './wrap.js';
import { parseBody } from './parse-body.js';
import {
  passBodySchema,
  playsBodySchema,
  revolutionBodySchema,
  tributeBodySchema,
} from './schemas.js';

// POST /api/rooms/:code/plays — 카드 내기
export function playCardsHandler({ repository, clock }) {
  return wrap(async (req, res) => {
    const body = parseBody(playsBodySchema, req.body);
    const result = await playCards(
      { gameRepository: repository, clock },
      {
        code: req.params.code,
        user: req.authUser,
        cards: body.cards,
        version: body.version,
      },
    );
    res.json({
      game: result.game,
      publicState: result.publicState,
      trickEnded: result.trickEnded,
      roundEnded: result.roundEnded,
    });
  });
}

// POST /api/rooms/:code/pass — 패스
export function passHandler({ repository, clock }) {
  return wrap(async (req, res) => {
    const body = parseBody(passBodySchema, req.body);
    const result = await passTurn(
      { gameRepository: repository, clock },
      { code: req.params.code, user: req.authUser, version: body.version },
    );
    res.json({
      game: result.game,
      publicState: result.publicState,
      trickEnded: result.trickEnded,
      roundEnded: result.roundEnded,
    });
  });
}

// POST /api/rooms/:code/tribute — 조공 반환 카드 제출 (손패는 응답에 싣지 않는다)
export function tributeHandler({ repository, clock }) {
  return wrap(async (req, res) => {
    const body = parseBody(tributeBodySchema, req.body);
    const result = await submitTribute(
      { gameRepository: repository, clock },
      {
        code: req.params.code,
        user: req.authUser,
        returns: body.returns,
        version: body.version,
      },
    );
    res.json({
      game: result.game,
      publicState: result.publicState,
      exchanges: result.exchanges,
    });
  });
}

// POST /api/rooms/:code/revolution — 혁명 선언
export function revolutionHandler({ repository, clock }) {
  return wrap(async (req, res) => {
    const body = parseBody(revolutionBodySchema, req.body);
    const result = await declareRevolution(
      { gameRepository: repository, clock },
      { code: req.params.code, user: req.authUser, version: body.version },
    );
    res.json({
      game: result.game,
      publicState: result.publicState,
      revolution: result.revolution,
    });
  });
}
