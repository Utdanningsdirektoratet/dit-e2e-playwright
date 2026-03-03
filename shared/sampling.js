/**
 * Test-run sampling utilities.
 *
 * Pick a small random subset of items each run so long-running suites stay
 * fast. Over many runs the law of large numbers ensures eventual coverage —
 * no rotation logic needed.
 *
 * Usage:
 *   import { randomSample } from '../../../shared/sampling.js';
 *   const pages = randomSample(allPages, 5); // 5 random pages this run
 */

/**
 * Return `n` randomly selected items from `items` (without replacement).
 * Returns the full list unchanged when items.length <= n.
 *
 * Uses a partial Fisher-Yates shuffle — O(n), unbiased.
 *
 * @template T
 * @param {T[]} items
 * @param {number} n
 * @returns {T[]}
 */
export function randomSample(items, n) {
  if (items.length <= n) return items;
  const arr = [...items];
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (arr.length - i));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}
