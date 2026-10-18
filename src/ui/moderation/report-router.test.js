import { it } from 'node:test';
import assert from 'node:assert/strict';
import {
  postReport,
  reportTestApp,
  withReportServer,
} from './report-test-app.js';

it('신고 성공은 사용자 JWT와 RLS insert를 쓰고 suspect 사진을 보관한다', async () => {
  const { app, repository } = reportTestApp();
  await withReportServer(app, async (base) => {
    assert.deepEqual(
      await postReport(base, 'member', {
        targetId: 'suspect',
        reason: 'photo',
      }),
      { status: 201, body: { ok: true } },
    );
    assert.equal(repository.calls.reports[0].accessToken, 'member');
    assert.equal(repository.calls.reports[0].reporterId, 'reporter');
    assert.deepEqual(repository.calls.moved, ['suspect']);
  });
});

it('중복 신고는 409 DUPLICATE로 응답한다', async () => {
  const { app } = reportTestApp();
  await withReportServer(app, async (base) => {
    assert.deepEqual(
      await postReport(base, 'member', {
        targetId: 'dup',
        reason: 'chat',
      }),
      { status: 409, body: { error: 'DUPLICATE' } },
    );
  });
});

it('인증이 없으면 401, 익명 사용자 RLS 거부는 403이다', async () => {
  const { app } = reportTestApp();
  await withReportServer(app, async (base) => {
    assert.equal(
      (
        await postReport(base, null, {
          targetId: 'x',
          reason: 'photo',
        })
      ).status,
      401,
    );
    assert.deepEqual(
      await postReport(base, 'anonymous', {
        targetId: 'suspect',
        reason: 'other',
      }),
      { status: 403, body: { error: 'FORBIDDEN' } },
    );
  });
});
