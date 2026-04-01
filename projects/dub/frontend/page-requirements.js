/**
 * Pages that MUST have certain interactive components.
 * If a required component is not detected on that page, the test fails.
 *
 * Component names must match keys in the COMPONENTS map in 300-sitemap.spec.js.
 * Patterns handle both Bokmål and Nynorsk (/nn/) variants automatically.
 */
export const PAGE_REQUIREMENTS = [
  {
    match: /^\/(nn\/)?filmoversikt\/$/,
    require: ["filter"],
  },
  {
    match: /^\/(nn\/)?tema\/(mellomtrinn|ungdom)\/[^/]+\/$/,
    require: ["slider", "accordion", "anchorMenu"],
  },
  // NOTE: not all /larer/ pages have accordions — auto-detection handles it
];

export function getRequiredComponents(pathname) {
  const required = new Set();
  for (const rule of PAGE_REQUIREMENTS) {
    if (rule.match.test(pathname)) {
      rule.require.forEach((c) => required.add(c));
    }
  }
  return [...required];
}
