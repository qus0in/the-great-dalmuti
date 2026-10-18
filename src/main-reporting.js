import { createSupabaseReportRepository } from './infra/moderation/supabase-report-repository.js';
import { createReportUser } from './app/moderation/report-user.js';
import { createReportRouter } from './ui/moderation/report-router.js';

export function createReportRouterFor(config, serviceClient, authMiddleware) {
  const repository = createSupabaseReportRepository({
    url: config.publicConfig.supabaseUrl,
    publishableKey: config.publicConfig.supabasePublishableKey,
    serviceClient,
  });
  return createReportRouter({
    requireAuth: authMiddleware,
    reportUser: createReportUser(repository),
  });
}
