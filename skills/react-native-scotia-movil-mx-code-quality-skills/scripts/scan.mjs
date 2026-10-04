#!/usr/bin/env node
// Code-quality scanner — deterministic / heuristic detection for the rules in rules/.
// Usage (from the audited project root):
//   node <skill>/scripts/scan.mjs                      summary (scope auto: diff if a baseline exists, else full)
//   node <skill>/scripts/scan.mjs --scope=full|diff|<path> [--base=<ref>] [--only=<rule|category,...>] [--eslint]
//   node <skill>/scripts/scan.mjs --rule=<id> [--limit=25 --offset=0]   candidate hits for one rule (file:line + text)
//   node <skill>/scripts/scan.mjs --skip=<id>:<file>:<line>[,...]   add skipped findings to the baseline
//   node <skill>/scripts/scan.mjs --init-profile       create/print .scotia-audit/profile.md
// --eslint merges the project's own ESLint results for mapped rules (more precise, slower).
// Topics owned by the architecture skill (names, locations, layers, values/) are NOT detected here.
// Dates rules decide which date API is used and whether date logic is correct.

import { execSync } from 'node:child_process';
import { relative } from 'node:path';
import { run } from './lib/core.mjs';

const TSX = /\.tsx$/;
const CODE = /\.tsx?$/;
const fileHit = (file, text, note, line = 1) => ({ file, line, text, note });
const needs = (...deps) => (ctx) => deps.some((d) => (d.endsWith('/') ? ctx.hasAny(d) : ctx.has(d))) || `needs ${deps.join(' | ')}`;

// JSX opening tag text starting at `idx` (until the matching `>` at depth 0)
function tagAt(src, idx) {
  let depth = 0;
  for (let i = idx + 1; i < src.length && i < idx + 3000; i++) {
    const c = src[i];
    if (c === '{') depth++; else if (c === '}') depth--;
    else if (c === '>' && depth === 0 && src[i - 1] !== '=') return src.slice(idx, i + 1);
  }
  return src.slice(idx, idx + 400);
}
const tags = (ctx, name, pred, note) => ctx.fileCheckAll(TSX, (src, f, push) => {
  const re = new RegExp(`<${name}[\\s/>]`, 'g'); let m;
  while ((m = re.exec(src))) { const t = tagAt(src, m.index); const r = pred(t, src); if (r) push(ctx.lineOf(src, m.index), t.split('\n')[0], typeof r === 'string' ? r : note); }
});

// body of each hook call: useEffect(…) etc.
const callBodies = (ctx, src, name) => ctx.blocks(src, new RegExp(`\\b${name}\\s*\\(`));

// ── Dates helpers ──
const COMMENT = /^\s*(\/\/|\*|\/\*)/;
const GETTER = /\.get(UTC)?(Date|Month|FullYear|Hours|Minutes|Seconds|Day)\(\)/;
const GETTERS = new RegExp(GETTER.source, 'g');
const DATE_LIBS = ['moment', 'moment-timezone', 'dayjs', 'luxon', 'date-fns'];
const RTF_POLYFILLS = ['@formatjs/intl-relativetimeformat', 'hermes-intl'];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const valuesDir = (ctx) => ctx.profile.values_root || `${ctx.P}/values`;
const notValues = (ctx) => (h) => !h.file.startsWith(`${valuesDir(ctx)}/`);
const isData = (ctx, f) => f.startsWith(`${ctx.P}/data/`);
const isUi = (ctx, f) => new RegExp(`^(${esc(ctx.P)}/presentation|${esc(ctx.S)}/public)/`).test(f) || TSX.test(f);

const indent = (l) => l.match(/^\s*/)[0].length;
// nearest enclosing function header above line i (by indentation), or null at module scope
function enclosingFn(lines, i) {
  let cur = indent(lines[i]);
  for (let k = i - 1; k >= 0; k--) {
    const l = lines[k]; if (!l.trim() || COMMENT.test(l)) continue;
    const ind = indent(l); if (ind >= cur) continue;
    if (/=>|\bfunction\b|^\s*(async\s+)?\w+\s*\([^)]*\)\s*(:\s*[\w<>[\], |.]+)?\s*\{\s*$/.test(l)) return l;
    if (ind === 0) return null;
    cur = ind;
  }
  return null;
}
const near = (lines, i, re, before = 6) => lines.slice(Math.max(0, i - before), i + 1).some((l) => re.test(l));

const rules = [
  // ── Components ──
  { id: 'components-functional-pressable', cat: 'Components', impact: 'CRITICAL', check: (ctx) => [
    ...ctx.grep(TSX, /\bextends\s+(React\.)?(Pure)?Component\b/, { note: 'class component' }),
    ...ctx.grep(TSX, /<Touchable(Opacity|Highlight|WithoutFeedback)\b/, { note: 'Touchable* (use Pressable / base button)' }),
  ] },
  { id: 'components-conditional-rendering', cat: 'Components', impact: 'CRITICAL', heuristic: true, check: (ctx) =>
    ctx.grep(TSX, /\{\s*!?[a-zA-Z_][\w.?]*(\.length)?\s*&&\s*[(<]/, { not: /\{\s*(!|Boolean\(|(is|has|should|can|show|visible|enabled|loading|disabled)[A-Z]?\w*\s*&&)/, note: 'left operand of && may be 0 or ""' }) },
  { id: 'components-children-composition', cat: 'Components', impact: 'HIGH', manual: true },
  { id: 'components-image', cat: 'Components', impact: 'HIGH', check: (ctx) => tags(ctx, 'Image', (t) => {
    if (/resizeMode=["']stretch/.test(t)) return 'resizeMode="stretch" distorts';
    if (!/accessibilityLabel|accessible=\{false\}|accessibilityElementsHidden/.test(t)) return 'Image without accessibilityLabel';
    if (/uri:/.test(t) && !/style=/.test(t)) return 'remote Image without dimensions';
    return false;
  }) },
  { id: 'components-textinput', cat: 'Components', impact: 'HIGH', check: (ctx) => tags(ctx, 'TextInput', (t) => {
    if (/\{\.\.\.field\}|\{\.\.\.register/.test(t)) return false;
    if (!/\bvalue=/.test(t)) return 'uncontrolled TextInput (no value)';
    return /canvas-core/.test(ctx.profile.design_system || '') ? 'raw TextInput (reuse CanvasTextField)' : false;
  }) },
  { id: 'components-modal', cat: 'Components', impact: 'HIGH', check: (ctx) => [
    ...tags(ctx, 'Modal', (t) => !/onRequestClose/.test(t) && 'Modal without onRequestClose'),
    ...ctx.grep(TSX, /&&\s*\(?\s*<\w*Modal\b/, { note: 'conditionally mounted modal (pass visible instead)' }),
    ...ctx.grep(CODE, /import\s*\{[^}]*\bSafeAreaView\b[^}]*\}\s*from\s*'react-native'/, { note: 'SafeAreaView from react-native (use safe-area-context)' }),
  ] },

  // ── TypeScript ──
  { id: 'ts-typed-props', cat: 'TypeScript', impact: 'HIGH', check: (ctx) =>
    ctx.grep(CODE, /:\s*any\b|<any>|\bas any\b/, { not: /^\s*(\/\/|\*)|eslint-disable|useForm<any>|navigation\s*:\s*any/, note: 'any' }) },
  { id: 'ts-react-fc', cat: 'TypeScript', impact: 'MEDIUM', check: (ctx) => ctx.grep(TSX, /:\s*(React\.)?(FC|FunctionComponent|VFC)\s*</, { note: 'React.FC' }) },
  { id: 'ts-alphabetical-properties', cat: 'TypeScript', impact: 'MEDIUM', check: (ctx) => ctx.fileCheckAll(CODE, (src, f, push) => {
    const re = /\b(?:interface\s+\w+(?:<[^{]*?>)?(?:\s+extends\s+[^{]+)?|type\s+\w+(?:<[^=]*?>)?\s*=)\s*\{/g; let m;
    while ((m = re.exec(src))) {
      const open = m.index + m[0].length - 1; const close = findClose(src, open); if (close < 0) continue;
      for (const v of unsortedMembers(src, open, close)) push(ctx.lineOf(src, v.idx), `${v.prev} → ${v.name}`, 'properties not in alphabetical order');
    }
  }) },
  { id: 'ts-destructured-props', cat: 'TypeScript', impact: 'MEDIUM', check: (ctx) => [
    ...ctx.grep(CODE, /\(\s*[a-z]\w*\s*:\s*(Readonly<\s*)?[\w.]*(Props|Params)\b/, { note: 'props/params not destructured in the signature' }),
    ...ctx.grep(CODE, /(?<![.\w])(props|params)\.\w+/, { not: /^\s*(\/\/|\*)/, note: 'props.x access (destructure)' }),
    ...ctx.grep(TSX, /\{\s*\.\.\.(props|rest|others|restProps|otherProps|\w+Props)\s*\}/, { note: 'props spread into child (pass props explicitly)' }),
    ...ctx.fileCheckAll(CODE, (src, f, push) => {
      for (const m of src.matchAll(/\(\s*\{([^{}()]*)\}\s*:\s*(?:Readonly<\s*)?[\w.]+/g)) {
        const names = m[1].split(',').map((x) => x.trim()).filter(Boolean);
        if (names.some((n) => n.startsWith('...'))) { push(ctx.lineOf(src, m.index), m[0].split('\n')[0], 'rest operator in props/params'); continue; }
        const keys = names.map((n) => n.split(/[:=]/)[0].trim());
        for (let i = 1; i < keys.length; i++) if (cmp(keys[i - 1], keys[i]) > 0) { push(ctx.lineOf(src, m.index), `${keys[i - 1]} → ${keys[i]}`, 'destructuring not in alphabetical order'); break; }
      }
    }),
  ] },
  { id: 'ts-generics-utility-types', cat: 'TypeScript', impact: 'HIGH', heuristic: true, check: (ctx) =>
    ctx.grep(CODE, /\{\s*\[\s*\w+\s*:\s*string\s*\]\s*:/, { note: 'string index signature (prefer Record<Union, V>)' }) },

  // ── State and Hooks ──
  { id: 'state-usestate-typed', cat: 'State and Hooks', impact: 'HIGH', heuristic: true, check: (ctx) => [
    ...ctx.grep(CODE, /\buseState\(\s*(null|undefined|\[\]|\{\})?\s*\)/, { note: 'useState without generic (type not inferable)' }),
    ...ctx.fileCheckAll(CODE, (src, f, push) => {
      const vars = [...src.matchAll(/const \[(\w+),\s*(set\w+)\]\s*=\s*useState/g)];
      src.split('\n').forEach((l, i) => { for (const [, v, s] of vars) if (new RegExp(`\\b${s}\\(\\s*(\\{\\s*\\.\\.\\.${v}\\b|\\[\\s*\\.\\.\\.${v}\\b|${v}\\s*[-+*/])`).test(l)) push(i + 1, l, 'setter reads current state (use prev =>)'); });
    }),
  ] },
  { id: 'state-useeffect-cleanup', cat: 'State and Hooks', impact: 'HIGH', heuristic: true, check: (ctx) => ctx.fileCheckAll(CODE, (src, f, push) => {
    const LEAKY = /setInterval\(|setTimeout\(|addEventListener\(|addListener\(|\.subscribe\(|\.on\(\s*['"]|\bfetch\(|Animated\.(loop|timing|spring|decay)\(|requestAnimationFrame\(|InteractionManager\.runAfterInteractions\(/;
    const CLEANUP = /return\s*(\(\s*\)\s*=>|function|\w+\s*;|\(\)|[a-zA-Z]\w*\.(remove|unsubscribe|abort|stop|cancel)|\(\s*\)\s*=>)/;
    const CANCEL = /\b(signal|abort\(|cancel(led|ed)?\b|isMounted|isActive|ignore\b|unmounted|isSubscribed)/i;
    for (const name of ['useEffect', 'useLayoutEffect', 'useFocusEffect']) {
      for (const b of callBodies(ctx, src, name)) {
        const body = b.text;
        if (name !== 'useFocusEffect' && !/\]\s*\)$/.test(body.replace(/\s+/g, ''))) { push(b.line, `${name}(...)`, 'no dependency array'); continue; }
        if (LEAKY.test(body) && !CLEANUP.test(body)) push(b.line, `${name}(...)`, 'timer/listener/subscription/request without cleanup');
        // state updated after an async boundary without a cancellation guard
        const asyncSet = /(await\b|\.then\()[^]*?\bset[A-Z]\w*\(/.test(body);
        if (asyncSet && !CANCEL.test(body)) push(b.line, `${name}(...)`, 'setState after await/then without cancellation (stale or unmounted update)');
      }
    }
  }) },
  { id: 'state-focus-effect', cat: 'State and Hooks', impact: 'HIGH', applies: needs('@react-navigation/'), check: (ctx) => ctx.fileCheckAll(CODE, (src, f, push) => {
    for (const b of callBodies(ctx, src, 'useFocusEffect')) {
      const inner = b.text.slice(1).trim();
      if (!/^(React\.)?useCallback\s*\(|^[a-zA-Z_$][\w$]*\s*\)?$/.test(inner)) push(b.line, 'useFocusEffect(() => …)', 'callback not wrapped in useCallback (runs on every render)');
    }
    const isf = src.match(/const\s+(\w+)\s*=\s*useIsFocused\(\)/);
    if (isf) {
      const v = isf[1];
      const usedInDeps = new RegExp(`\\[[^\\]]*\\b${v}\\b[^\\]]*\\]\\s*\\)`).test(src);
      const usedInRender = new RegExp(`[{(&?:]\\s*!?${v}\\b[^\\n]*<|\\b${v}\\s*\\?`).test(src);
      if (usedInDeps && !usedInRender) push(ctx.lineOf(src, isf.index), isf[0], 'useIsFocused only drives an effect (use useFocusEffect)');
    }
  }) },
  { id: 'state-hook-dependencies', cat: 'State and Hooks', impact: 'HIGH', check: (ctx) =>
    ctx.grep(CODE, /eslint-disable(-next)?-line.*react-hooks\/exhaustive-deps|eslint-disable\s+react-hooks\/exhaustive-deps/, { note: 'exhaustive-deps disabled (justify or fix)' }) },
  { id: 'state-rules-of-hooks', cat: 'State and Hooks', impact: 'HIGH', heuristic: true, check: (ctx) => ctx.fileCheckAll(CODE, (src, f, push) => {
    for (const b of ctx.blocks(src, /\b(if|for|while)\s*\(/)) {
      const rest = src.slice(b.end + 1);
      const braced = /^\s*\{/.test(rest);
      const stop = braced ? findClose(src, b.end + 1 + rest.indexOf('{')) : b.end + 1 + Math.max(0, rest.search(/[;\n]/));
      const inner = src.slice(b.end + 1, stop);
      const h = inner.match(/\buse(State|Effect|LayoutEffect|Memo|Callback|Ref|Context|Reducer|[A-Z]\w*)\s*\(/);
      if (h && !/=>|\bfunction\b/.test(inner.slice(0, h.index))) push(ctx.lineOf(src, b.end + 1 + h.index), h[0], 'hook called conditionally / in a loop');
    }
  }) },
  { id: 'state-usecallback-usememo', cat: 'State and Hooks', impact: 'HIGH', manual: true },
  { id: 'state-useref-typed', cat: 'State and Hooks', impact: 'MEDIUM', check: (ctx) => [
    ...ctx.fileCheckAll(TSX, (src, f, push) => {
      for (const m of src.matchAll(/const \[(\w+),\s*set\w+\]\s*=\s*useState\b/g)) {
        const v = m[1]; const re = new RegExp(`\\b${v}\\b`);
        const uses = src.split('\n').filter((l, i) => re.test(l) && i !== ctx.lineOf(src, m.index) - 1);
        if (!uses.length) push(ctx.lineOf(src, m.index), m[0], 'state is set but never read (remove it or use useRef)');
        else if (!uses.some((l) => /<|=\{|return\b|\?\s|&&|\[[^\]]*\]\s*\)/.test(l))) push(ctx.lineOf(src, m.index), m[0], 'state never rendered nor a dependency (useRef?)');
      }
    }),
    ...ctx.grep(CODE, /\buseRef\(\s*(null)?\s*\)/, { note: 'useRef without generic' }),
    ...ctx.grep(CODE, /useState<ReturnType<typeof set(Timeout|Interval)>/, { note: 'timer in useState (use useRef)' }),
  ] },
  { id: 'state-context-api', cat: 'State and Hooks', impact: 'HIGH', check: (ctx) => [
    ...ctx.grep(CODE, /\bcreateContext\(\s*(null|\{\}|undefined)?\s*\)/, { note: 'createContext without <T | undefined>' }),
    ...ctx.grep(TSX, /\.Provider\s+value=\{\{/, { note: 'inline context value (wrap in useMemo)' }),
    ...ctx.fileCheck(/\/use[A-Z][^/]*\.tsx?$/, (src) => /\buseContext\(/.test(src) && !/throw new Error/.test(src) && 'context hook without guard (throw outside provider)'),
  ] },
  { id: 'state-context-reactivity', cat: 'State and Hooks', impact: 'HIGH', heuristic: true, check: (ctx) => [
    ...ctx.grep(/\.provider\.tsx$|Provider\.tsx$/, /new \w*(Store|StateImpl)\w*\(/, { fileLacks: /\buse(State|Reducer)\(/, note: 'mutable store in context without React state' }),
    ...ctx.grep(TSX, /\.\s*getState\(\)/, { note: 'render reads imperative getState()' }),
  ] },
  { id: 'state-custom-hook', cat: 'State and Hooks', impact: 'MEDIUM', manual: true },
  { id: 'state-derived-state', cat: 'State and Hooks', impact: 'HIGH', heuristic: true, check: (ctx) => ctx.fileCheckAll(CODE, (src, f, push) => {
    for (const b of callBodies(ctx, src, 'useEffect')) {
      const open = b.text.indexOf('{'); if (open < 0) continue;
      const body = b.text.slice(open + 1, b.text.lastIndexOf('}')).trim();
      const stmts = body.split(/;\s*\n|\n(?=\s*set[A-Z])/).map((s) => s.trim()).filter(Boolean);
      if (stmts.length && stmts.every((s) => /^set[A-Z]\w*\(/.test(s)) && !/await|fetch|\.then|subscribe|Listener/.test(body)) push(b.line, 'useEffect(() => { set…(…) })', 'state synced from other state/props (derive during render)');
      if (/^set[A-Z]\w*\(\s*props\.\w+\s*\)/.test(body)) push(b.line, body.slice(0, 60), 'props copied into state');
    }
  }) },
  { id: 'state-form-touched', cat: 'State and Hooks', impact: 'HIGH', heuristic: true, check: (ctx) =>
    ctx.grep(TSX, /\{\s*errors?\.\w+(\?\.message)?\s*(&&|\?)\s*\(?\s*<(Text|CanvasText)/, { not: /touched/i, note: 'error shown without touched/onBlur gating' }) },

  // ── Styles ──
  { id: 'styles-stylesheet-create', cat: 'Styles', impact: 'HIGH', check: (ctx) => ctx.grep(TSX, /style=\{\{/, { note: 'inline style object' }) },
  { id: 'styles-responsive-flexbox', cat: 'Styles', impact: 'MEDIUM', heuristic: true, check: (ctx) => [
    ...ctx.grep(CODE, /\bDimensions\.get\(/, { note: 'Dimensions.get (use useWindowDimensions)' }),
    ...ctx.grep(CODE, /\b(width|minWidth|maxWidth):\s*[2-9]\d{2}\b/, { note: 'fixed width ≥ 200' }),
  ] },
  { id: 'styles-platform-specifics', cat: 'Styles', impact: 'MEDIUM', heuristic: true, check: (ctx) =>
    ctx.grep(TSX, /Platform\.OS\s*===?\s*['"](ios|android)['"]\s*\?/, { note: 'platform ternary in component (Platform.select in StyleSheet)' }) },
  { id: 'styles-gap-spacing', cat: 'Styles', impact: 'MEDIUM', heuristic: true, check: (ctx) => ctx.fileCheck(TSX, (src) => {
    const n = (src.match(/\bmargin(Top|Bottom|Left|Right|Vertical|Horizontal)\s*:/g) || []).length;
    return n >= 4 && `${n} sibling margins (consider gap on the container)`;
  }) },
  { id: 'styles-single-style-no-array', cat: 'Styles', impact: 'LOW', check: (ctx) =>
    ctx.grep(TSX, /\w*[sS]tyle=\{\[\s*[^,\[\]]+?\s*\]\}/, { note: 'single style wrapped in an array' }) },
  { id: 'styles-type-assertions', cat: 'Styles', impact: 'MEDIUM', check: (ctx) => ctx.grep(CODE, /\bas (ViewStyle|TextStyle|ImageStyle)\b/, { note: 'as XStyle (use satisfies)' }) },

  // ── Lists ──
  { id: 'lists-flatlist-optimized', cat: 'Lists', impact: 'CRITICAL', check: (ctx) => [
    ...ctx.fileCheck(TSX, (src) => /<ScrollView\b/.test(src) && /\.map\(\s*\(?\s*\w+[^)]*\)?\s*=>\s*\(?\s*</.test(src) && { line: ctx.lineOf(src, src.indexOf('<ScrollView')), text: '<ScrollView> + .map(', note: 'ScrollView + map (virtualize with FlatList)' }),
    ...tags(ctx, 'FlatList', (t) => !/keyExtractor/.test(t) && 'FlatList without keyExtractor'),
  ] },
  { id: 'lists-stable-keys', cat: 'Lists', impact: 'HIGH', check: (ctx) =>
    ctx.grep(TSX, /key=\{\s*(index|i|idx)\s*\}|key=\{`[^`]*\$\{\s*(index|i|idx)\s*\}|keyExtractor=\{\s*\(\s*_?\w*\s*,\s*(index|i|idx)\s*\)|(index|idx)\.toString\(\)/, { note: 'index used as key' }) },
  { id: 'lists-sectionlist', cat: 'Lists', impact: 'HIGH', heuristic: true, check: (ctx) => [
    ...ctx.fileCheck(TSX, (src) => /<ScrollView\b/.test(src) && /\.map\([^]*?\.map\(/.test(src) && /section/i.test(src) && 'grouped list with nested map (use SectionList)'),
    ...tags(ctx, 'SectionList', (t) => !/keyExtractor/.test(t) && 'SectionList without keyExtractor'),
  ] },

  // ── Performance ──
  { id: 'perf-react-memo', cat: 'Performance', impact: 'HIGH', manual: true },
  { id: 'perf-no-inline-components', cat: 'Performance', impact: 'CRITICAL', check: (ctx) =>
    ctx.grep(TSX, /^\s{2,}(const|function)\s+[A-Z]\w*\s*(=\s*(memo\()?\(?[^=]*\)?\s*=>|\()/, { not: /=\s*(use|create|StyleSheet|styled|React\.(lazy|forwardRef)|lazy\()/, note: 'component declared inside another component' }) },
  { id: 'perf-hoist-static-jsx', cat: 'Performance', impact: 'HIGH', check: (ctx) =>
    ctx.grep(TSX, /(ItemSeparatorComponent|ListEmptyComponent|ListHeaderComponent|ListFooterComponent)=\{\s*\(\)\s*=>/, { note: 'inline list sub-component (hoist to module scope)' }) },

  // ── APIs and Data ──
  { id: 'api-typed-fetch', cat: 'APIs and Data', impact: 'HIGH', heuristic: true, check: (ctx) =>
    ctx.grep(CODE, /\.json\(\)(?!\s*as\b)(?!\s*\)\s*as\b)/, { note: 'untyped response.json()' }) },
  { id: 'api-parallel-fetch', cat: 'APIs and Data', impact: 'HIGH', heuristic: true, check: (ctx) => ctx.fileCheckAll(CODE, (src, f, push) => {
    const lines = src.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      const a = lines[i].match(/const\s+(\{[^}]*\}|\w+)\s*=\s*await\s/); const b = lines[i + 1].match(/const\s+(\{[^}]*\}|\w+)\s*=\s*await\s/);
      if (!a || !b) continue;
      const names = a[1].replace(/[{}\s]/g, '').split(',').filter(Boolean);
      if (!names.some((n) => new RegExp(`\\b${n.split(':').pop()}\\b`).test(lines[i + 1]))) push(i + 1, lines[i], 'independent sequential awaits (Promise.all)');
    }
  }) },
  { id: 'api-context-reducer', cat: 'APIs and Data', impact: 'MEDIUM', heuristic: true, check: (ctx) => ctx.fileCheck(/[Pp]rovider\.tsx$/, (src) => {
    const n = (src.match(/\buseState\(/g) || []).length; return n >= 4 && `${n} coordinated useState in provider (consider useReducer)`;
  }) },
  { id: 'api-native-permissions', cat: 'APIs and Data', impact: 'HIGH', applies: needs('react-native-permissions'), check: (ctx) => [
    ...ctx.grep(CODE, /\brequest\(\s*PERMISSIONS\./, { fileLacks: /\bcheck\(/, note: 'request without check' }),
    ...ctx.grep(CODE, /PERMISSIONS\.(IOS|ANDROID)\./, { fileLacks: /Platform\.(OS|select)/, note: 'platform-specific constant without Platform' }),
    ...ctx.fileCheck(CODE, (src) => /\b(check|request)\(\s*\w*PERMISSIONS/.test(src) && !/BLOCKED/.test(src) && 'BLOCKED state not handled (openSettings)'),
  ] },
  { id: 'api-community-module', cat: 'APIs and Data', impact: 'HIGH', applies: needs('react-native-biometrics'), check: (ctx) => [
    ...ctx.grep(CODE, /^\s{2,}.*new ReactNativeBiometrics\(/, { note: 'module instance per call (create once)' }),
    ...ctx.grep(CODE, /\.simplePrompt\(|\.createSignature\(/, { fileLacks: /isSensorAvailable/, note: 'no isSensorAvailable() guard' }),
  ] },
  { id: 'api-yup-schema', cat: 'APIs and Data', impact: 'MEDIUM', applies: needs('yup'), check: (ctx) => [
    ...ctx.grep(TSX, /^\s{2,}(const|let)\s+\w*[sS]chema\w*\s*=\s*(yup\.object|createYupSchema)/, { note: 'schema built inside a component' }),
    ...ctx.grep(CODE, /\.validate(Sync)?\(\s*[^,)]+\s*\)/, { fileHas: /\byup\b/, note: 'validate without { abortEarly: false }' }),
  ] },
  { id: 'api-rhf-controller', cat: 'APIs and Data', impact: 'HIGH', applies: needs('react-hook-form'), check: (ctx) =>
    ctx.grep(TSX, /\{\.\.\.register\(/, { note: 'register() on a native input (use Controller)' }) },
  { id: 'api-rhf-yup-resolver', cat: 'APIs and Data', impact: 'HIGH', applies: needs('react-hook-form'), check: (ctx) => [
    ...tags(ctx, 'Controller', (t, src) => /\brules=/.test(t) && /yupResolver/.test(src) && 'Controller rules ignored by the resolver'),
    ...ctx.fileCheck(TSX, (src) => /\buseForm\b/.test(src) && /yup\b/.test(src) && !/resolver\s*:/.test(src) && 'useForm with Yup but no resolver'),
  ] },
  { id: 'api-usefieldarray', cat: 'APIs and Data', impact: 'MEDIUM', applies: needs('react-hook-form'), heuristic: true, check: (ctx) =>
    ctx.grep(TSX, /useState(<[^>]*\[\]>)?\(\s*\[/, { fileHas: /\buseForm\b/, note: 'array state next to RHF (useFieldArray)' }) },
  { id: 'api-form-submit-viewmodel', cat: 'APIs and Data', impact: 'HIGH', applies: needs('react-hook-form'), check: (ctx) => ctx.fileCheck(TSX, (src) => {
    if (!/\buseForm\b/.test(src)) return false;
    if (!/handleSubmit\(/.test(src)) return 'form submits without handleSubmit';
    if (!/isValid/.test(src)) return 'submit button not gated by isValid';
    return false;
  }) },
  { id: 'api-dynamic-schema-builder', cat: 'APIs and Data', impact: 'MEDIUM', applies: needs('react-hook-form'), check: (ctx) => [
    ...ctx.grep(TSX, /resolver\s*:\s*yupResolver\(\s*\w+\(/, { note: 'schema factory called inline (useMemo it)' }),
    ...ctx.fileCheck(TSX, (src) => /\buseForm\b/.test(src) && /useMemo\([^]*?Object\.fromEntries|defaultValues\s*=\s*useMemo/.test(src) && !/\breset\(/.test(src) && 'runtime defaultValues without reset()'),
  ] },
  { id: 'api-async-error-handling', cat: 'APIs and Data', impact: 'MEDIUM', heuristic: true, check: (ctx) => ctx.fileCheckAll(CODE, (src, f, push) => {
    for (const b of ctx.blocks(src, /\basync\s*(function\s*\w*\s*)?\(/)) {
      const arrow = src.slice(b.end + 1, b.end + 12).match(/^\s*(:\s*[^=]+)?=>\s*\{|^\s*\{/);
      if (!arrow) continue;
      const open = src.indexOf('{', b.end + 1); const close = findClose(src, open); if (close < 0) continue;
      const body = src.slice(open, close);
      if (/\bawait\b/.test(body) && !/\btry\s*\{/.test(body) && !/\.catch\(/.test(body) && /navigat|set[A-Z]\w*\(|dispatch/.test(body)) push(b.line, src.split('\n')[b.line - 1], 'await drives UI/navigation without try/catch');
    }
  }) },

  // ── Navigation ──
  { id: 'nav-stack-navigator', cat: 'Navigation', impact: 'HIGH', applies: needs('@react-navigation/'), check: (ctx) => [
    ...ctx.grep(CODE, /from '@react-navigation\/stack'/, { note: 'JS stack (use native-stack)' }),
    ...ctx.grep(CODE, /create(Native)?StackNavigator\(\s*\)/, { note: 'navigator without ParamList generic' }),
    ...ctx.grep(CODE, /navigation\s*:\s*any|useNavigation\(\s*\)/, { not: /useNavigation<|as\s+\w*Navigation/, note: 'untyped navigation' }),
  ] },

  // ── Animations ──
  { id: 'anim-gpu', cat: 'Animations', impact: 'HIGH', check: (ctx) => [
    ...ctx.grep(CODE, /useNativeDriver:\s*false/, { note: 'JS-driven animation' }),
    ...ctx.grep(CODE, /\b(height|width|top|left|right|bottom|margin\w*|padding\w*):\s*\w*[aA]nim\w*/, { note: 'animating a layout property' }),
  ] },

  // ── Conventions ──
  { id: 'conv-design-tokens', cat: 'Conventions', impact: 'HIGH', check: (ctx) => [
    ...((ctx.scopeIsFull || ctx.inScope(/^package\.json$/)) && !ctx.hasAny('@scotia-movil-mx/react-native-canvas-core') && !Object.keys(ctx.deps).some((d) => /canvas-core/.test(d))
      ? [fileHit('package.json', 'canvas-core', 'canvas-core missing: colors must come from canvasTheme')] : []),
    ...ctx.grep(CODE, /['"]#[0-9a-fA-F]{3,8}['"]|\brgba?\(\s*\d|\b(color|backgroundColor|borderColor|tintColor)\s*:\s*['"](red|white|black|blue|green|gray|grey|transparent)['"]/, {
      not: /^\s*(\/\/|\*)/, note: 'hardcoded color → canvasTheme (theme hook), else values/colors.ts',
    }).filter((h) => !/\/(values|theme|tokens?|design-tokens)\/|colors?\.ts$/i.test(h.file)),
  ] },
  { id: 'conv-theme-provider', cat: 'Conventions', impact: 'HIGH', applies: (ctx) => ctx.files.some((f) => /theme/i.test(f) && /createContext/.test(ctx.read(f) || '')) || 'project does not define its own ThemeProvider', check: (ctx) =>
    ctx.fileCheck(/theme/i, (src) => /createContext/.test(src) && /createContext<[^>]*(Color|color)\w*\s*:\s*string/.test(src) && 'theme context stores raw colors') },
  { id: 'conv-pnpm', cat: 'Conventions', impact: 'HIGH', check: (ctx) => {
    if (!ctx.scopeIsFull && !ctx.inScope(/^(package\.json|\.npmrc)$/)) return [];
    const hits = [];
    for (const lf of ['package-lock.json', 'yarn.lock']) if (ctx.exists(lf)) hits.push(fileHit(lf, lf, 'non-pnpm lockfile'));
    const npmrc = ctx.read('.npmrc') || '';
    if (!/minimumReleaseAge/.test(npmrc)) hits.push(fileHit('.npmrc', 'minimumReleaseAge', '.npmrc without minimumReleaseAge'));
    if (!/blockExoticSubdeps/.test(npmrc)) hits.push(fileHit('.npmrc', 'blockExoticSubdeps', '.npmrc without blockExoticSubdeps'));
    if (!/^pnpm@/.test(ctx.pkg.packageManager || '')) hits.push(fileHit('package.json', 'packageManager', 'packageManager is not pnpm@x'));
    return hits;
  } },
  { id: 'conv-native-manifest', cat: 'Conventions', impact: 'HIGH', applies: (ctx) => ctx.exists('ios') || ctx.exists('android') || 'no native folders', check: (ctx) => {
    if (!ctx.scopeIsFull) return [];
    const hits = [];
    const am = 'android/app/src/main/AndroidManifest.xml'; const xml = ctx.read(am) || '';
    xml.split('\n').forEach((l, i) => { if (/READ_EXTERNAL_STORAGE/.test(l) && !/maxSdkVersion/.test(l)) hits.push(fileHit(am, l.trim(), 'READ_EXTERNAL_STORAGE without maxSdkVersion', i + 1)); });
    for (const d of ctx.ls('ios')) {
      const pl = `ios/${d}/Info.plist`; const src = ctx.read(pl); if (!src) continue;
      for (const m of src.matchAll(/<key>(NS\w+UsageDescription)<\/key>\s*<string>([^<]*)<\/string>/g)) if (m[2].trim().length < 25) hits.push(fileHit(pl, `${m[1]}: ${m[2]}`, 'generic usage description', ctx.lineOf(src, m.index)));
    }
    return hits;
  } },
  { id: 'conv-dev-logging', cat: 'Conventions', impact: 'HIGH', check: (ctx) => ctx.fileCheckAll(CODE, (src, f, push) => {
    const lines = src.split('\n');
    lines.forEach((l, i) => { if (/\bconsole\.(log|debug|info|warn|error)\(/.test(l) && !/__DEV__/.test(l) && !/__DEV__/.test(lines.slice(Math.max(0, i - 3), i).join(' '))) push(i + 1, l, 'console.* without __DEV__ guard'); });
  }) },

  // ── Dates (which API / correctness; values location is architecture values-conventions) ──
  { id: 'date-api-choice', cat: 'Dates', impact: 'HIGH', heuristic: true, check: (ctx) => {
    const NOTE = 'manual date formatting (evaluate Intl.DateTimeFormat)';
    return [
      ...ctx.fileCheckAll(CODE, (src, f, push) => {
        if (isData(ctx, f)) return; // transport formats live in the data layer
        const lines = src.split('\n');
        lines.forEach((l, i) => {
          if (COMMENT.test(l)) return;
          const getters = (l.match(GETTERS) || []).length;
          if (getters >= 2 && /\$\{|\+\s*['"`]|['"`]\s*\+|padStart|\.join\(/.test(l)) push(i + 1, l, NOTE);
          else if (/\.padStart\(\s*2\s*,\s*['"]0['"]\s*\)/.test(l) && lines.slice(Math.max(0, i - 3), i + 4).some((x) => GETTER.test(x))) push(i + 1, l, NOTE);
        });
      }),
      ...ctx.grep(CODE, /\[\s*['"](Ene(ro)?|Jan(uary)?|Lun(es)?|Dom(ingo)?|Mon(day)?|Sun(day)?)['"]\s*,/, { not: COMMENT, note: 'month / weekday names by hand (Intl provides them)' }),
      ...ctx.grep(CODE, /\.(toDateString|toUTCString|toGMTString)\(\)|new Date\([^)]*\)\.toString\(\)/, { not: COMMENT, note: 'debug date format used as text' }),
    ].filter((h) => !isData(ctx, h.file));
  } },
  { id: 'date-formatter-reuse', cat: 'Dates', impact: 'MEDIUM', heuristic: true, check: (ctx) => ctx.fileCheckAll(CODE, (src, f, push) => {
    const lines = src.split('\n');
    lines.forEach((l, i) => {
      if (COMMENT.test(l)) return;
      if (/new Intl\.DateTimeFormat\(/.test(l) && enclosingFn(lines, i) && !near(lines, i, /useMemo\(/, 3)) push(i + 1, l, 'formatter created per call/render (module scope or useMemo)');
      else if (/\.toLocale(Date|Time)?String\(/.test(l) && near(lines, i, /\.(map|forEach|reduce|flatMap)\(|renderItem|\bfor\s*\(/, 4)) push(i + 1, l, 'toLocale*String in a list/loop (one formatter per item)');
    });
  }) },
  { id: 'date-relative-time', cat: 'Dates', impact: 'LOW', heuristic: true, check: (ctx) => [
    ...ctx.grep(CODE, /['"`]\s*[Hh]ace\s+(\$\{|\{|\d)|\$\{[^}]+\}\s*(d[ií]as?|horas?|min\w*)\b|\bago['"`]|['"`](ayer|Ayer|ma[ñn]ana|Ma[ñn]ana|yesterday|Yesterday|tomorrow|Tomorrow)['"`]/, { not: COMMENT, note: 'relative time built by hand (one helper / Intl.RelativeTimeFormat)' }),
    ...(RTF_POLYFILLS.some((d) => ctx.has(d)) ? [] : ctx.grep(CODE, /\bIntl\.RelativeTimeFormat\b/, { not: COMMENT, note: 'Intl.RelativeTimeFormat is not in Hermes (no polyfill in package.json)' })),
  ] },

  { id: 'date-parsing', cat: 'Dates', impact: 'CRITICAL', check: (ctx) => ctx.fileCheckAll(CODE, (src, f, push) => {
    src.split('\n').forEach((l, i) => {
      if (COMMENT.test(l)) return;
      for (const m of l.matchAll(/new Date\(\s*(['"`])([^'"`]*)\1\s*\)/g)) {
        const s = m[2];
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) push(i + 1, l, 'date-only string parsed as UTC (previous day in Mexico)');
        else if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) push(i + 1, l, 'non-ISO string (Invalid Date on Hermes)');
      }
      if (/\bDate\.parse\(/.test(l)) push(i + 1, l, 'Date.parse: engine-dependent (explicit parse in the data mapper)');
      const arg = l.match(/new Date\(\s*([\w$.?[\]'"]+)\s*\)/);
      if (arg && !/^\d|^Date\.now|^['"`]/.test(arg[1]) && (/_/.test(arg[1]) || (isData(ctx, f) && /(date|Date|At|fecha|Fecha)$/.test(arg[1])))) push(i + 1, l, 'string from the API parsed with new Date (confirm format: date-only → UTC)');
      if (/new Date\(\s*[\w.]+\s*,\s*[\w.]*[mM](onth|es)\w*\s*,/.test(l) && !/[mM](onth|es)\w*\s*-\s*1/.test(l)) push(i + 1, l, 'month argument is 0-based (confirm - 1)');
    });
  }) },
  { id: 'date-locale-timezone', cat: 'Dates', impact: 'HIGH', check: (ctx) => {
    const tz = ctx.profile.date_time_zone;
    const DATEISH = /\b\w*([dD]ate|At|[tT]ime|today|now)\w*\??\.toLocaleString\(/;
    return [
      ...ctx.grep(CODE, /\.toLocale(Date|Time)String\(\s*(undefined\s*)?[,)]|\b\w*([dD]ate|At|[tT]ime|today|now)\w*\??\.toLocaleString\(\s*(undefined\s*)?[,)]|Intl\.DateTimeFormat\(\s*(undefined|\[\s*\])?\s*[,)]/, { not: COMMENT, note: 'device locale (pass dates.locale)' }),
      ...ctx.grep(CODE, /(\.toLocale(Date|Time)String|Intl\.(DateTimeFormat|RelativeTimeFormat))\(\s*['"`][a-z]{2}(-[A-Z]{2})?['"`]/, { not: COMMENT, note: 'locale literal (use dates.locale)' }),
      ...ctx.grep(CODE, /\.toLocaleString\(\s*['"`][a-z]{2}(-[A-Z]{2})?['"`]/, { not: COMMENT, note: 'locale literal (use dates.locale)' }).filter((h) => DATEISH.test(h.text)),
      ...ctx.grep(CODE, /toISOString\(\)\s*\.\s*(split\(\s*['"]T['"]\s*\)|slice\(\s*0\s*,\s*10\s*\)|substr(ing)?\(\s*0\s*,\s*10\s*\))/, { not: COMMENT, note: 'toISOString is UTC: next day after 18:00 in Mexico' }),
      ...ctx.grep(CODE, /\bgetTimezoneOffset\(\)/, { not: COMMENT, note: 'manual offset (use the timeZone option)' }),
      ...(tz && tz !== 'device' && tz !== 'unknown' ? ctx.fileCheckAll(CODE, (src, f, push) => {
        for (const b of ctx.blocks(src, /\bIntl\.DateTimeFormat\s*\(/)) if (!/timeZone/.test(b.text)) push(b.line, 'Intl.DateTimeFormat(…)', `no timeZone (profile date_time_zone: ${tz})`);
      }) : []),
    ].filter(notValues(ctx));
  } },
  { id: 'date-arithmetic-comparison', cat: 'Dates', impact: 'HIGH', check: (ctx) => ctx.fileCheckAll(CODE, (src, f, push) => {
    src.split('\n').forEach((l, i) => {
      if (COMMENT.test(l)) return;
      const mult = l.match(/\b(24|60|1000|1_000)\s*\*\s*(24|60|1000|1_000)\s*\*\s*(24|60|1000|1_000)(\s*\*\s*(24|60|1000|1_000))?/);
      if (/\b(86400000|86_400_000|864e5|8\.64e7)\b/.test(l) || (mult && /\b24\b/.test(mult[0]) && /\b1_?000\b/.test(mult[0]))) push(i + 1, l, 'day as milliseconds (calendar math)');
      if (/\b\w*([dD]ate|At)\b\s*[!=]==?\s*\w*([dD]ate|At)\b(?!\s*\.|\s*\()/.test(l) && !/getTime\(\)|null|undefined|typeof/.test(l)) push(i + 1, l, 'dates compared by reference (getTime())');
      if (/setMonth\([^)]*getMonth\(\)\s*[+-]/.test(l)) push(i + 1, l, 'setMonth(getMonth() ± n) overflows month end (addMonths)');
      if (/\.getYear\(\)/.test(l)) push(i + 1, l, 'getYear is deprecated (getFullYear)');
    });
  }) },
  { id: 'date-render-purity', cat: 'Dates', impact: 'MEDIUM', heuristic: true, check: (ctx) => ctx.fileCheckAll(/\.tsx$|\.view-model\.ts$/, (src, f, push) => {
    const lines = src.split('\n');
    const NOW = /new Date\(\)|Date\.now\(\)/;
    lines.forEach((l, i) => {
      if (COMMENT.test(l) || !NOW.test(l) || /\buse(State|Memo|Ref|Callback)\(\s*\(\)\s*=>/.test(l)) return;
      if (/\buseState\(\s*new Date\(/.test(l)) { push(i + 1, l, 'useState(new Date()) → lazy initializer'); return; }
      if (TSX.test(f) && /(=\{|>\s*\{|^\s*\{)[^}]*(new Date\(\)|Date\.now\(\))/.test(l) && /<|=\{/.test(l)) { push(i + 1, l, 'now read in JSX'); return; }
      const fn = enclosingFn(lines, i);
      if (fn && /^\s*(export\s+)?(const|function)\s+([A-Z]\w*|use[A-Z]\w*)\b/.test(fn) && /^\s*(const|let)\s+[\w{}[\], ]+\s*=/.test(l)) push(i + 1, l, 'now read at render (view-model / handler / lazy initializer)');
    });
  }) },

  { id: 'date-library', cat: 'Dates', impact: 'MEDIUM', check: (ctx) => {
    const hits = [];
    if (ctx.scopeIsFull || ctx.inScope(/^package\.json$/)) {
      const libs = DATE_LIBS.filter((d) => ctx.runtime[d] || ctx.deps[d]);
      if (libs.some((d) => d.startsWith('moment'))) hits.push(fileHit('package.json', 'moment', 'moment is in maintenance mode (Intl + native / date-fns)'));
      const families = new Set(libs.map((d) => d.replace(/-timezone$/, '')));
      if (families.size > 1) hits.push(fileHit('package.json', [...families].join(', '), 'more than one date library'));
    }
    hits.push(...ctx.grep(CODE, /from ['"]moment(-timezone)?['"]|require\(['"]moment/, { note: 'moment import' }));
    hits.push(...ctx.fileCheckAll(CODE, (src, f, push) => {
      if (isData(ctx, f) || !isUi(ctx, f)) return;
      const fns = /from ['"]date-fns(\/[\w-]+)?['"]/.test(src) && /\bformat\b/.test(src.match(/import[^;]*from ['"]date-fns[^'"]*['"]/g)?.join(' ') || '');
      const chain = /from ['"](dayjs|moment|luxon)['"]/.test(src);
      src.split('\n').forEach((l, i) => {
        if (COMMENT.test(l)) return;
        if ((fns && /(^|[^.\w])format\(\s*[^,]+,\s*[\w.'"`]/.test(l)) || (chain && /\.(format|toFormat)\(\s*[\w.'"`]/.test(l))) push(i + 1, l, 'library pattern for UI text (evaluate Intl.DateTimeFormat)');
      });
    }));
    return hits;
  } },
];

const cmp = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' });

// first out-of-order member of an interface / object type body (and of nested object types)
function unsortedMembers(src, open, close) {
  const out = []; const names = []; let depth = 0; let q = null; let atStart = true; let sub = -1;
  for (let i = open + 1; i < close; i++) {
    const c = src[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === '/' && src[i + 1] === '/') { const nl = src.indexOf('\n', i); i = nl < 0 ? close : nl - 1; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? close : e + 1; continue; }
    if (depth === 0 && atStart && /[A-Za-z_$'"]/.test(c)) {
      const m = src.slice(i, close).match(/^(?:readonly\s+)?(['"]?)([A-Za-z_$][\w$-]*)\1\s*(\?\s*)?[:(<]/);
      if (m) { names.push({ name: m[2], idx: i }); atStart = false; i += m[0].length - 2; continue; }
    }
    if (c === '"' || c === "'" || c === '`') { q = c; atStart = false; continue; }
    if (c === '{' || c === '(' || c === '[') { if (depth === 0 && c === '{') sub = i; depth++; atStart = false; continue; }
    if (c === '}' || c === ')' || c === ']') { depth--; if (depth === 0 && c === '}' && sub >= 0) { out.push(...unsortedMembers(src, sub, i)); sub = -1; } continue; }
    if (depth === 0 && (c === ';' || c === ',' || c === '\n')) { atStart = true; continue; }
    if (!/\s/.test(c)) atStart = false;
  }
  for (let k = 1; k < names.length; k++) if (cmp(names[k - 1].name, names[k].name) > 0) { out.push({ idx: names[k].idx, prev: names[k - 1].name, name: names[k].name }); break; }
  return out;
}

function findClose(src, open) {
  let d = 0; let q = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') q = c;
    else if (c === '{') d++;
    else if (c === '}') { d--; if (!d) return i; }
  }
  return -1;
}

// Optional: merge the project's own ESLint findings into the mapped rules.
const ESLINT_MAP = {
  'react-hooks/exhaustive-deps': 'state-hook-dependencies',
  'react-hooks/rules-of-hooks': 'state-rules-of-hooks',
  'react/no-unstable-nested-components': 'perf-no-inline-components',
  'react/no-array-index-key': 'lists-stable-keys',
  'react-native/no-inline-styles': 'styles-stylesheet-create',
  'react-native/no-color-literals': 'conv-design-tokens',
  '@typescript-eslint/no-explicit-any': 'ts-typed-props',
  'no-console': 'conv-dev-logging',
};
function eslintHits(args, ctx) {
  if (!args.eslint || !ctx.files.length) return {};
  const out = {};
  try {
    const files = ctx.files.map((f) => `"${f}"`).join(' ');
    const json = execSync(`npx --no-install eslint -f json ${files}`, { cwd: ctx.root, maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'], timeout: 300000 }).toString();
    collect(json);
  } catch (e) { if (!(e.stdout && e.stdout.length && collect(e.stdout.toString()))) console.log('eslint: not available (scan continues without it)'); }
  return out;
  function collect(json) {
    let res = []; try { res = JSON.parse(json); } catch { return false; }
    for (const r of res) for (const m of r.messages || []) {
      const id = ESLINT_MAP[m.ruleId]; if (!id) continue;
      (out[id] ||= []).push({ file: relative(ctx.root, r.filePath).split('\\').join('/'), line: m.line, text: m.message, note: `eslint ${m.ruleId}` });
    }
    return true;
  }
}

run({ skill: 'code-quality', title: 'CODE-QUALITY SCAN', rules, argv: process.argv.slice(2), extraHits: eslintHits });
