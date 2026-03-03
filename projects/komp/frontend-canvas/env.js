/**
 * Active environment for the komp/frontend-canvas project.
 * Resolution logic lives in shared/env.js.
 *
 * Exports: config, env, baseURL, canvasBaseURL
 * (canvasBaseURL is Canvas-specific — not in the shared factory)
 */
import { createEnv } from '../../../shared/env.js';

const { config, env, baseURL } = createEnv(import.meta.dirname);
export { config, env, baseURL };
export const canvasBaseURL = env.canvasBaseURL;
