/**
 * Build-time app configuration (#27).
 *
 * The app's Supabase URL and anon key are not committed. They come from the build environment:
 * a shell/CI variable, or a TAPPAY_* line in the repo's .env file (git-ignored). This Babel
 * plugin replaces `process.env.TAPPAY_…` reads in app code with the value as a string literal, or
 * `undefined` when it is not set. Only the names in INLINED are replaced, so no other
 * environment variable can end up in the bundle. No dependency is needed.
 *
 * After changing a value, restart Metro with `npm start -- --reset-cache` (Metro caches
 * transformed files).
 */
const fs = require('fs');
const path = require('path');

const INLINED = ['TAPPAY_SUPABASE_URL', 'TAPPAY_SUPABASE_ANON_KEY'];

/** Fill unset INLINED variables from <repo>/.env (simple KEY=VALUE lines; shell values win). */
function loadAppEnv(envFile = path.join(__dirname, '..', '.env')) {
  let text;
  try {
    text = fs.readFileSync(envFile, 'utf8');
  } catch {
    return; // no .env: rely on the environment
  }
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || !INLINED.includes(match[1]) || process.env[match[1]]) {
      continue;
    }
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

function inlineAppConfig({types: t}) {
  return {
    name: 'tappay-inline-app-config',
    visitor: {
      MemberExpression(nodePath) {
        const {node} = nodePath;
        if (
          !t.isMemberExpression(node.object) ||
          !t.isIdentifier(node.object.object, {name: 'process'}) ||
          !t.isIdentifier(node.object.property, {name: 'env'})
        ) {
          return;
        }
        const name = node.computed
          ? t.isStringLiteral(node.property) && node.property.value
          : t.isIdentifier(node.property) && node.property.name;
        if (!name || !INLINED.includes(name)) {
          return;
        }
        // Leave writes alone (`process.env.X = …`, `delete process.env.X`): only reads are inlined.
        const parent = nodePath.parent;
        if (
          (t.isAssignmentExpression(parent) && parent.left === node) ||
          (t.isUpdateExpression(parent) && parent.argument === node) ||
          (t.isUnaryExpression(parent, {operator: 'delete'}) && parent.argument === node)
        ) {
          return;
        }
        const value = process.env[name];
        nodePath.replaceWith(value ? t.stringLiteral(value) : t.identifier('undefined'));
      },
    },
  };
}

module.exports = inlineAppConfig;
module.exports.INLINED = INLINED;
module.exports.loadAppEnv = loadAppEnv;
