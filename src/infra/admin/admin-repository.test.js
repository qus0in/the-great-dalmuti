import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseAdminRepository } from './supabase-admin-repository.js';
import {
  createFakeRepository,
  exercise,
  expectedCalls,
} from './admin-repository-fixture.js';

it('uses caller JWT for DB work and fixed service-role Storage paths', async () => {
  const calls = [];
  const repository = createFakeRepository(calls, createSupabaseAdminRepository);
  await exercise(repository);
  assert.deepEqual(calls, expectedCalls());
});
