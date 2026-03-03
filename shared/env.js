/**
 * Factory for resolving the active environment from a project's config.json.
 *
 * Usage — in each project's env.js:
 *
 *   import { createEnv } from '../../../shared/env.js';
 *   export const { config, env, baseURL, sitemapUrl, insecure } = createEnv(import.meta.dirname);
 *
 * Why a factory instead of a direct export?
 *   Each project has its own config.json. The path must resolve relative to
 *   the project directory, not this shared module. Passing import.meta.dirname
 *   from the project's env.js keeps the path resolution correct.
 *
 * APP_ENV selects the environment (default: "production").
 * "development" is normalised to "local" so local dev servers work without config changes.
 *
 * @param {string} dirname  Directory containing config.json — pass import.meta.dirname
 * @returns {{ config: object, env: object, baseURL: string, sitemapUrl: string, insecure: boolean }}
 */
import { readFileSync } from 'fs';
import { join } from 'path';

export function createEnv(dirname) {
  const config = JSON.parse(readFileSync(join(dirname, 'config.json'), 'utf-8'));

  let envName = process.env.APP_ENV || 'production';
  if (envName === 'development') envName = 'local';

  const env = config.environments[envName];
  if (!env) {
    throw new Error(
      `Unknown APP_ENV="${process.env.APP_ENV}". Available: ${Object.keys(config.environments).join(', ')}`,
    );
  }

  return {
    config,
    env,
    baseURL: env.baseURL,
    // sitemapUrl can be overridden in config; defaults to <baseURL>/sitemap.xml
    sitemapUrl: env.sitemapUrl || `${env.baseURL}/sitemap.xml`,
    // insecure: true for local dev servers with self-signed certs
    insecure: !!env.ignoreHTTPSErrors,
  };
}
