import { createAdminActions } from './app/admin/admin-actions-service.js';
import { createAdminService } from './app/admin/admin-service.js';
import { createSupabaseAdminRepository } from './infra/admin/supabase-admin-repository.js';
import { createAdminRouter } from './ui/admin-router.js';

export function createAdminRouterFor(config, serviceClient, requireAuth) {
  const repository = createSupabaseAdminRepository({
    url: config.publicConfig.supabaseUrl,
    publishableKey: config.publicConfig.supabasePublishableKey,
    serviceClient,
  });
  return createAdminRouter({ repository, requireAuth });
}

export { createAdminActions, createAdminService };
