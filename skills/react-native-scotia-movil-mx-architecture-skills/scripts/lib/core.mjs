// Scotia audit scanner core — identical copy in both skill packages
// (architecture + code-quality). Zero dependencies, Node >= 18, works on
// macOS / Linux / Windows. Its job is to replace "read the repo to get
// context" with one cheap command whose output is a few hundred tokens.

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { join, relative, resolve, basename, dirname } from 'node:path';
import { execSync } from 'node:child_process';

const IMPACT_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const DEFAULT_EXCLUDE = ['**/node_modules/**', 'lib/**', '**/build/**', '**/dist/**', '**/coverage/**',
  '**/__tests__/**', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/*.d.ts'];
const SKIP_DIRS = new Set(['node_modules', '.git', 'lib', 'build', 'dist', 'coverage', 'android', 'ios', '.scotia-audit', 'Pods']);
export const AUDIT_DIR = '.scotia-audit';

// ───────────────────────── args / profile ─────────────────────────
export function parseArgs(argv) {
  const a = { scope: 'auto', max: 1, root: process.cwd() };
  for (const raw of argv) {
    const m = raw.match(/^--([\w-]+)(?:=(.*))?$/);
    if (!m) continue;
    a[m[1]] = m[2] === undefined ? true : m[2];
  }
  a.root = resolve(a.root);
  a.max = Number(a.max) || 1;
  return a;
}

export function readProfile(root) {
  const p = join(root, AUDIT_DIR, 'profile.md');
  const prof = { _exists: existsSync(p), _path: p };
  if (!prof._exists) return prof;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.replace(/\s+#.*$/, '').match(/^([a-z_]+):\s*(.*)$/);
    if (m) prof[m[1]] = m[2].trim();
  }
  return prof;
}

const list = (v) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []);

export function readDeps(root) {
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    return { pkg, deps: { ...pkg.peerDependencies, ...pkg.devDependencies, ...pkg.dependencies }, runtime: { ...pkg.dependencies } };
  } catch { return { pkg: {}, deps: {}, runtime: {} }; }
}

// ───────────────────────── globbing / files ─────────────────────────
function globToRe(g) {
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*' && g[i + 1] === '*') { re += '.*'; i++; if (g[i + 1] === '/') i++; }
    else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

const toPosix = (p) => p.split('\\').join('/');

function walk(dir, root, out) {
  let entries = [];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) walk(join(dir, e.name), root, out); }
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(toPosix(relative(root, join(dir, e.name))));
  }
}

function git(root, cmd) {
  try { return execSync(`git ${cmd}`, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return null; }
}

function resolveBase(root, explicit) {
  const candidates = [explicit, 'origin/develop', 'develop', 'origin/main', 'main', 'origin/master', 'master'].filter(Boolean);
  for (const ref of candidates) if (git(root, `rev-parse --verify --quiet ${ref}`)) return ref;
  return null;
}

export function collectFiles(args, profile, skillBaselineExists) {
  const root = args.root;
  const srcRoot = profile.src_root || 'src';
  const excludes = [...DEFAULT_EXCLUDE, ...list(profile.exclude)].map(globToRe);
  const keep = (f) => /\.(ts|tsx)$/.test(f) && f.startsWith(`${srcRoot}/`) && !excludes.some((re) => re.test(f));

  let scope = args.scope;
  const inGit = git(root, 'rev-parse --is-inside-work-tree') === 'true';
  if (scope === 'auto') scope = inGit && skillBaselineExists ? 'diff' : 'full';

  if (scope === 'diff') {
    const base = resolveBase(root, args.base || profile.base_branch);
    if (!inGit || !base) return { scope: 'full (no git base found)', files: fullList() };
    const mb = git(root, `merge-base HEAD ${base}`) || base;
    const changed = (git(root, `diff --name-only --diff-filter=ACMR ${mb}`) || '').split('\n');
    const untracked = (git(root, 'ls-files --others --exclude-standard') || '').split('\n');
    const files = [...new Set([...changed, ...untracked].map(toPosix))].filter((f) => f && keep(f) && existsSync(join(root, f)));
    return { scope: `diff vs ${base}`, files, base };
  }
  if (scope === 'full') return { scope: 'full', files: fullList() };
  // explicit path
  const p = toPosix(scope).replace(/\/$/, '');
  const abs = join(root, p);
  if (existsSync(abs) && statSync(abs).isFile()) return { scope: p, files: keep(p) ? [p] : [] };
  const out = []; walk(abs, root, out);
  return { scope: p, files: out.filter(keep) };

  function fullList() { const out = []; walk(join(root, srcRoot), root, out); return out.filter(keep); }
}

// ───────────────────────── context helpers for rules ─────────────────────────
export function makeContext(args, profile, files) {
  const root = args.root;
  const cache = new Map();
  const read = (rel) => {
    if (!cache.has(rel)) { try { cache.set(rel, readFileSync(join(root, rel), 'utf8')); } catch { cache.set(rel, null); } }
    return cache.get(rel);
  };
  const { pkg, deps, runtime } = readDeps(root);
  const ctx = {
    root, profile, pkg, deps, runtime, files, read,
    S: profile.src_root || 'src',
    P: profile.layers_root || `${profile.src_root || 'src'}/private`,
    variant: profile.naming_variant || 'feature-library',
    scopeIsFull: args.scope === 'full' || String(args._scopeLabel || '').startsWith('full'),
    exists: (rel) => existsSync(join(root, rel)),
    ls: (relDir) => { try { return readdirSync(join(root, relDir)); } catch { return []; } },
    has: (dep) => Boolean(deps[dep]),
    hasAny: (prefix) => Object.keys(deps).some((d) => d.startsWith(prefix)),
    inScope: (re) => files.some((f) => re.test(f)),
  };
  // lines of matching files that match lineRe (and not notRe)
  ctx.grep = (fileRe, lineRe, opts = {}) => {
    const hits = [];
    for (const f of files) {
      if (!fileRe.test(f)) continue;
      const src = read(f); if (src == null) continue;
      if (opts.fileHas && !opts.fileHas.test(src)) continue;
      if (opts.fileLacks && opts.fileLacks.test(src)) continue;
      src.split(/\r?\n/).forEach((text, i) => {
        if (lineRe.test(text) && !(opts.not && opts.not.test(text))) hits.push({ file: f, line: i + 1, text, note: opts.note });
      });
    }
    return hits;
  };
  // one hit per file when predicate(src, file) returns truthy (string → note)
  ctx.fileCheck = (fileRe, pred) => {
    const hits = [];
    for (const f of files) {
      if (!fileRe.test(f)) continue;
      const src = read(f); if (src == null) continue;
      const r = pred(src, f);
      if (r) hits.push({ file: f, line: typeof r === 'object' ? r.line : 1, text: typeof r === 'string' ? r : (r.text || ''), note: typeof r === 'object' ? r.note : undefined });
    }
    return hits;
  };
  // several hits per file: fn(src, file, push(line, text, note))
  ctx.fileCheckAll = (fileRe, fn) => {
    const hits = [];
    for (const f of files) {
      if (!fileRe.test(f)) continue;
      const src = read(f); if (src == null) continue;
      fn(src, f, (line, text, note) => hits.push({ file: f, line, text, note }));
    }
    return hits;
  };
  // balanced (...) / {...} blocks that start where startRe matches
  ctx.blocks = (src, startRe) => {
    const out = []; const re = new RegExp(startRe.source, startRe.flags.includes('g') ? startRe.flags : `${startRe.flags}g`);
    let m;
    while ((m = re.exec(src))) {
      const open = src.indexOf('(', m.index + m[0].length - 1);
      if (open < 0) break;
      const end = matchClose(src, open);
      if (end < 0) continue;
      out.push({ start: m.index, end, text: src.slice(open, end + 1), line: src.slice(0, m.index).split('\n').length });
    }
    return out;
  };
  ctx.lineOf = (src, index) => src.slice(0, index).split('\n').length;
  return ctx;
}

export function matchClose(src, openIdx) {
  const pairs = { '(': ')', '{': '}', '[': ']' };
  const stack = [];
  let quote = null;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (quote) { if (c === '\\') { i++; continue; } if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '/' && src[i + 1] === '/') { const nl = src.indexOf('\n', i); if (nl < 0) return -1; i = nl; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); if (e < 0) return -1; i = e + 1; continue; }
    if (pairs[c]) stack.push(pairs[c]);
    else if (c === ')' || c === '}' || c === ']') { if (stack.pop() !== c) return -1; if (!stack.length) return i; }
  }
  return -1;
}

// ───────────────────────── baseline ─────────────────────────
const norm = (t) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, 160);

export function loadBaseline(root, skill) {
  const p = join(root, AUDIT_DIR, `${skill}-baseline.tsv`);
  const set = new Set();
  if (existsSync(p)) for (const l of readFileSync(p, 'utf8').split(/\r?\n/)) if (l && !l.startsWith('#')) set.add(l);
  return { path: p, set, exists: existsSync(p) };
}
const baseKey = (h) => `${h.rule}\t${h.file}\t${norm(h.text)}`;

export function addToBaseline(root, skill, specs) {
  const dir = join(root, AUDIT_DIR); mkdirSync(dir, { recursive: true });
  const p = join(dir, `${skill}-baseline.tsv`);
  if (!existsSync(p)) writeFileSync(p, `# ${skill} findings accepted/skipped by the team. rule<TAB>file<TAB>line text. Delete a line to re-enable it.\n`);
  let n = 0;
  for (const spec of list(specs)) {
    const [rule, file, line] = spec.split(':');
    let text = '';
    try { text = readFileSync(join(root, file), 'utf8').split(/\r?\n/)[Number(line) - 1] || ''; } catch { /* file-level */ }
    appendFileSync(p, `${baseKey({ rule, file, text })}\n`); n++;
  }
  console.log(`baseline: +${n} → ${toPosix(relative(root, p))}`);
}

// ───────────────────────── run + report ─────────────────────────
export function run({ skill, title, rules, argv, extraHits }) {
  const args = parseArgs(argv);
  const profile = readProfile(args.root);
  if (args.skip) return addToBaseline(args.root, skill, args.skip);
  if (args['init-profile']) return initProfile(args.root, profile);

  const baseline = loadBaseline(args.root, skill);
  const { scope, files } = collectFiles(args, profile, baseline.exists);
  args._scopeLabel = scope;
  const ctx = makeContext(args, profile, files);
  const disabled = new Set(list(profile.disabled_rules));
  const only = list(args.only);
  const cats = new Set(rules.map((r) => r.cat.toLowerCase()));
  const pick = (r, o) => { const lo = o.toLowerCase(); const rc = r.cat.toLowerCase(); return r.id === o || rc === lo || (!cats.has(lo) && rc.startsWith(lo)); };
  const selected = rules.filter((r) => !disabled.has(r.id) && (!only.length || only.some((o) => pick(r, o))));

  const results = [];
  const external = extraHits ? extraHits(args, ctx) : {};
  for (const r of selected) {
    const na = r.applies ? r.applies(ctx) : true;
    if (na !== true) { results.push({ r, status: 'n/a', why: typeof na === 'string' ? na : '' }); continue; }
    if (r.manual && !r.check) { results.push({ r, status: 'manual' }); continue; }
    let hits = [];
    try { hits = r.check(ctx) || []; } catch (e) { results.push({ r, status: 'error', why: e.message }); continue; }
    const ext = external[r.id] || [];
    if (ext.length) { const at = new Set(ext.map((h) => `${h.file}:${h.line}`)); hits = ext.concat(hits.filter((h) => !at.has(`${h.file}:${h.line}`))); }
    const seen = new Set();
    hits = hits.filter((h) => { const k = `${h.file}:${h.line}:${h.note || ''}`; if (seen.has(k)) return false; seen.add(k); return true; });
    let suppressed = 0;
    hits = hits.filter((h) => { if (baseline.set.has(baseKey({ ...h, rule: r.id }))) { suppressed++; return false; } return true; });
    results.push({ r, status: hits.length ? 'hits' : (r.manual ? 'manual' : 'clean'), hits, suppressed });
  }

  if (args.rule) return printRule(args, results.find((x) => x.r.id === args.rule), args.rule);
  printSummary({ title, args, profile, scope, files, results, baseline });
}

const pad = (s, n) => String(s).padEnd(n);

function printSummary({ title, args, profile, scope, files, results, baseline }) {
  const withHits = results.filter((x) => x.status === 'hits')
    .sort((a, b) => IMPACT_ORDER[a.r.impact] - IMPACT_ORDER[b.r.impact] || b.hits.length - a.hits.length);
  const prof = profile._exists ? `${profile.project_type || '?'} · RN ${profile.react_native || '?'} · ${profile.naming_variant || 'feature-library'}` : 'MISSING → run --init-profile';
  console.log(`${title} | scope: ${scope} | files: ${files.length} | profile: ${prof}`);
  if (!files.length) { console.log('No source files in scope. Nothing to audit.'); return; }
  if (withHits.length) {
    console.log(`${pad('IMPACT', 9)}${pad('HITS', 5)}${pad('CATEGORY', 24)}${pad('RULE', 40)}FIRST HIT`);
    for (const x of withHits) {
      const first = x.hits.slice(0, args.max).map((h) => `${h.file}:${h.line}`).join(', ');
      console.log(`${pad(x.r.impact, 9)}${pad(x.hits.length, 5)}${pad(x.r.cat, 24)}${pad(x.r.id, 40)}${first}${x.r.heuristic ? '  (heuristic)' : ''}`);
    }
  } else console.log('No findings.');
  const by = (s) => results.filter((x) => x.status === s);
  const suppressed = results.reduce((n, x) => n + (x.suppressed || 0), 0);
  const na = by('n/a');
  const manual = by('manual');
  console.log(`clean: ${by('clean').length} | n/a: ${na.length}${na.length ? ` (${na.map((x) => x.r.id).join(', ')})` : ''} | baseline-suppressed: ${suppressed}`);
  if (manual.length) console.log(`manual-only (judgment, not grep-able): ${manual.map((x) => x.r.id).join(', ')}`);
  const errs = by('error'); if (errs.length) console.log(`scanner errors: ${errs.map((x) => `${x.r.id}: ${x.why}`).join('; ')}`);
}

function printRule(args, res, id) {
  if (!res) { console.log(`rule ${id}: not selected or unknown`); return; }
  if (res.status !== 'hits') { console.log(`rule ${id}: ${res.status}${res.why ? ` (${res.why})` : ''}`); return; }
  const cap = Number(args.limit) || 60; const from = Number(args.offset) || 0;
  console.log(`rule ${id} (${res.r.impact}) — ${res.hits.length} candidate hits${res.r.heuristic ? ' (heuristic: confirm each one)' : ''}${from ? ` · from #${from + 1}` : ''}`);
  for (const h of res.hits.slice(from, from + cap)) console.log(`${h.file}:${h.line}  ${h.note ? `[${h.note}] ` : ''}${norm(h.text).slice(0, 120)}`);
  const left = res.hits.length - from - cap;
  if (left > 0) console.log(`… ${left} more → --offset=${from + cap} --limit=${cap} (or narrow --scope)`);
}

// ───────────────────────── profile bootstrap ─────────────────────────
function initProfile(root, profile) {
  if (profile._exists) { console.log(readFileSync(profile._path, 'utf8')); return; }
  const { pkg, deps } = readDeps(root);
  const ver = (deps['react-native'] || 'unknown').replace(/^[\^~]/, '');
  const pm = existsSync(join(root, 'pnpm-lock.yaml')) ? 'pnpm' : existsSync(join(root, 'yarn.lock')) ? 'yarn' : existsSync(join(root, 'package-lock.json')) ? 'npm' : (pkg.packageManager || 'unknown').split('@')[0];
  const src = existsSync(join(root, 'src')) ? 'src' : 'unknown';
  const layers = existsSync(join(root, 'src/private')) ? 'src/private' : 'unknown';
  const isFeature = existsSync(join(root, 'src/public')) && existsSync(join(root, 'src/private'));
  const native = existsSync(join(root, 'android')) || existsSync(join(root, 'ios'));
  let arch = 'unknown';
  try { const gp = readFileSync(join(root, 'android/gradle.properties'), 'utf8'); const m = gp.match(/newArchEnabled\s*=\s*(\w+)/); if (m) arch = m[1] === 'true' ? 'new' : 'old'; } catch { /* none */ }
  if (arch === 'unknown' && /^0\.(7[6-9]|[89]\d)/.test(ver)) arch = 'new (RN default)';
  const usesList = ['react-hook-form', 'yup', '@hookform/resolvers', '@react-navigation/native-stack', '@react-navigation/stack', 'react-native-reanimated',
    'react-native-permissions', 'react-native-biometrics', 'redux', '@reduxjs/toolkit', 'zustand', '@shopify/flash-list', 'react-native-safe-area-context']
    .filter((d) => deps[d]);
  const ds = Object.keys(deps).filter((d) => /canvas-core|lego-ui/.test(d));
  const head = git(root, 'symbolic-ref --short refs/remotes/origin/HEAD');
  const script = (n) => (pkg.scripts && pkg.scripts[n] ? `${pm === 'pnpm' || pm === 'yarn' ? pm : 'npm run'} ${n}` : 'unknown');
  const body = `# Scotia audit profile — shared by the architecture and code-quality skills.
# Both skills read this instead of exploring the repo. Edit freely; commit it.
project_type: ${isFeature ? 'feature-library' : native ? 'app' : 'unknown'}   # feature-library | app | brownfield | design-system
react_native: ${ver}
rn_architecture: ${arch}
package_manager: ${pm}
expo: ${deps.expo ? 'yes' : 'no'}
src_root: ${src}
layers_root: ${layers}
values_root: ${layers === 'unknown' ? 'unknown' : `${layers}/values`}   # colors.ts, dimens.ts, strings.ts, regex.ts, dates.ts
naming_variant: feature-library   # feature-library (kebab files, use<X>.ts hooks) | design-system (PascalCase component files)
base_branch: ${head || 'unknown'}
typecheck_cmd: ${script('typecheck') !== 'unknown' ? script('typecheck') : 'npx tsc --noEmit'}
lint_cmd: ${script('lint')}
eslint: ${['.eslintrc', '.eslintrc.js', '.eslintrc.json', '.eslintrc.cjs', 'eslint.config.js', 'eslint.config.mjs'].some((f) => existsSync(join(root, f))) ? 'available' : 'none'}
design_system: ${ds.join(', ') || 'none'}
theme_hook: useCanvasCoreTheme   # canvas-core hook that exposes canvasTheme
max_component_lines: 200   # screen-decomposition-conventions thresholds
max_jsx_elements: 40
max_state_hooks: 4
max_handlers: 6
uses: ${usesList.join(', ')}
exclude:                  # extra globs, comma-separated (defaults already skip tests, lib/, node_modules)
disabled_rules:           # rule ids the team does not apply in this project
`;
  mkdirSync(join(root, AUDIT_DIR), { recursive: true });
  writeFileSync(profile._path, body);
  console.log(`profile written: ${AUDIT_DIR}/profile.md (review the 'unknown' values)\n${body}`);
}

export { basename, dirname, join, list, norm };
