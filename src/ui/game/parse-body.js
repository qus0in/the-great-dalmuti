// zod 서버 경계 검증: 실패한 ZodError는 issues 배열 덕분에 에러 미들웨어가 400으로 매핑한다
export function parseBody(schema, body) {
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) throw parsed.error;
  return parsed.data;
}
