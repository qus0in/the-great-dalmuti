import { z } from 'zod';

// 조공 반환 카드는 id만 있으면 되므로 나머지 필드는 제거한다
const cardRef = z.object({ id: z.string() });

export const playsBodySchema = z.object({
  version: z.number().int(),
  cards: z.array(z.string()).min(1),
});

export const passBodySchema = z.object({
  version: z.number().int(),
});

export const tributeBodySchema = z.object({
  version: z.number().int(),
  returns: z.record(z.string(), z.array(cardRef)),
});

export const revolutionBodySchema = z.object({
  version: z.number().int(),
});
