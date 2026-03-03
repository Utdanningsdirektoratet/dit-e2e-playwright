/**
 * Active environment for the dub/frontend project.
 * Resolution logic lives in shared/env.js.
 *
 * Exports: config, env, baseURL, sitemapUrl, insecure
 */
import { createEnv } from '../../../shared/env.js';

export const { config, env, baseURL, sitemapUrl, insecure } = createEnv(import.meta.dirname);
