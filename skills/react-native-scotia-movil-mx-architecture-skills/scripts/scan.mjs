#!/usr/bin/env node
// Architecture scanner — deterministic detection for the 23 rules in rules/.
// Usage (from the audited project root):
//   node <skill>/scripts/scan.mjs                      summary (scope auto: diff if a baseline exists, else full)
//   node <skill>/scripts/scan.mjs --scope=full|diff|<path> [--base=<ref>] [--only=<rule|category,...>]
//   node <skill>/scripts/scan.mjs --rule=<id> [--limit=25 --offset=0]   candidate hits for one rule (file:line + text)
//   node <skill>/scripts/scan.mjs --skip=<id>:<file>:<line>[,...]   add skipped findings to the baseline
//   node <skill>/scripts/scan.mjs --init-profile       create/print .scotia-audit/profile.md
// Hits are candidates: the agent confirms each one by reading only that range.
// Topics owned by the code-quality skill are deliberately NOT detected here.

import { run, basename, matchClose } from './lib/core.mjs';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const under = (ctx, sub) => new RegExp(`^${esc(ctx.P)}/${sub}`);
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)*$/;
const VERB_MODEL = /^export (interface|namespace|type) (Get|Create|Delete|Edit|Select|Calculate|Search|Validate)\w*(Ui|Data|Domain)?Model\b/;
const fileHit = (file, text, note) => ({ file, line: 1, text, note });
const hasLayers = (ctx) => ctx.exists(ctx.P) || `no ${ctx.P}/ (layers_root in profile)`;

const rules = [
  // ── Names (cross-cutting) ──
  { id: 'naming-conventions', cat: 'Names', impact: 'HIGH', applies: hasLayers, check: (ctx) => [
    // naming-conventions owns ALL model-file suffix checks (layer rules only check content)
    ...ctx.files.filter((f) => f.startsWith(`${ctx.P}/`) && /(-ui\.model\.ts|\.response\.ts|\.request\.model\.ts)$/.test(f)).map((f) => fileHit(f, basename(f), 'legacy model suffix')),
    ...ctx.files.filter((f) => f.startsWith(`${ctx.P}/`) && /\/model\/[^/]*-model\.ts$/.test(f) && !/\.(ui|data|domain)-model\.ts$/.test(f)).map((f) => fileHit(f, basename(f), 'legacy -model suffix')),
    ...ctx.files.filter((f) => under(ctx, 'domain/model/').test(f) && /\.model\.ts$/.test(f) && !/\.domain-model\.ts$/.test(f)).map((f) => fileHit(f, basename(f), 'domain model file must be *.domain-model.ts')),
    ...ctx.files.filter((f) => under(ctx, 'data/api/model/').test(f) && /[^-]\.model\.ts$/.test(f) && !/\.data-model\.ts$/.test(f) && !/\.request\.model\.ts$/.test(f)).map((f) => fileHit(f, basename(f), 'data model file must be *.data-model.ts')),
    ...ctx.grep(under(ctx, ''), VERB_MODEL, { note: 'verb in model name' }),
    ...ctx.grep(new RegExp(`^${esc(ctx.P)}/(domain|presentation)/`), /^export (interface|type|namespace|class) \w*(Request|Response|Payload|DTO)\b/, { note: 'transport term outside data' }),
    // symbol suffix must match the layer that declares it
    ...ctx.grep(new RegExp(`^${esc(ctx.P)}/(data|presentation)/`), /^\s*export (interface|type|namespace|class) \w+DomainModel\b/, { note: 'DomainModel declared outside domain/' }),
    ...ctx.grep(new RegExp(`^${esc(ctx.P)}/(domain|presentation)/`), /^\s*export (interface|type|namespace|class) \w+DataModel\b/, { note: 'DataModel declared outside data/' }),
    ...ctx.grep(new RegExp(`^${esc(ctx.P)}/(domain|data)/`), /^\s*export (interface|type|namespace|class) \w+UiModel\b/, { note: 'UiModel declared outside presentation/' }),
  ] },
  { id: 'conv-kebab-case-files', cat: 'Names', impact: 'MEDIUM', check: (ctx) => ctx.files.filter((f) => {
    const name = basename(f).replace(/\.(ts|tsx)$/, '');
    if (name === 'index' || /^use[A-Z][A-Za-z0-9]*$/.test(name)) return false;
    if (f.startsWith(`${ctx.S}/public/`) && /^[A-Z][A-Za-z0-9]*$/.test(name)) return false; // main embeddable component
    if (ctx.variant === 'design-system' && /\.tsx$/.test(f) && /^[A-Z][A-Za-z0-9]*$/.test(name)) return false;
    return !KEBAB.test(name);
  }).map((f) => fileHit(f, basename(f), 'file name not kebab-case')) },
  { id: 'conv-ts-file-suffixes', cat: 'Names', impact: 'MEDIUM', check: (ctx) => [
    ...ctx.files.filter((f) => /^(models?|types?|interfaces?|enums?)\.ts$/.test(basename(f))).map((f) => fileHit(f, basename(f), 'generic file name without suffix')),
    ...ctx.fileCheck(/\.ts$/, (src, f) => !/\.enum\.ts$/.test(f) && /^export (const )?enum /m.test(src) && /^export (interface|type) /m.test(src) && 'mixes runtime enum with types'),
  ] },

  // ── Domain ──
  { id: 'domain-model-conventions', cat: 'Domain', impact: 'HIGH', applies: hasLayers, check: (ctx) => {
    const re = under(ctx, 'domain/model/');
    return [
      ...ctx.files.filter((f) => re.test(f) && /\/index\.tsx?$/.test(f)).map((f) => fileHit(f, basename(f), 'barrel index in domain/model')),
      ...ctx.grep(new RegExp(`${re.source}.*\\.domain-model\\.ts$`), /^export (interface|namespace) \w+/, { not: /DomainModel(\s|\{|$|<)/, note: 'symbol without DomainModel suffix' }),
      ...ctx.grep(re, /from '.*\/(data|presentation)\//, { note: 'imports another layer' }),
      ...ctx.grep(re, /^\s*[a-z]+_[a-z0-9_]+\??:/, { note: 'snake_case transport field' }),
      ...ctx.grep(new RegExp(`^${esc(ctx.S)}/`), /from '[^']*\/domain\/model'/, { note: 'import through domain/model barrel' }),
    ];
  } },
  { id: 'domain-gateway-conventions', cat: 'Domain', impact: 'HIGH', applies: hasLayers, check: (ctx) => {
    const re = under(ctx, 'domain/gateway/');
    return [
      ...ctx.grep(re, /\b\w+(DataModel|UiModel)\b/, { note: 'non-domain model in gateway' }),
      ...ctx.grep(re, /from '.*\/(data|presentation)\//, { note: 'imports another layer' }),
      ...ctx.grep(re, /\):\s*Promise</, { not: /Promise<\s*Result</, note: 'return is not Promise<Result<…>>' }),
    ];
  } },

  // ── Data ──
  { id: 'data-model-conventions', cat: 'Data', impact: 'HIGH', applies: hasLayers, check: (ctx) => {
    const re = under(ctx, 'data/api/model/');
    return [
      ...ctx.grep(new RegExp(`${re.source}.*\\.data-model\\.ts$`), /^export namespace \w+/, { not: /DataModel\s*\{/, note: 'namespace without DataModel suffix' }),
      ...ctx.grep(re, /from '.*\/(domain|presentation)\//, { note: 'imports another layer' }),
    ];
  } },
  { id: 'data-mapper-conventions', cat: 'Data', impact: 'HIGH', applies: hasLayers, check: (ctx) => {
    const re = under(ctx, 'data/mapper/');
    return [
      ...ctx.files.filter((f) => re.test(f) && /(model|request|response|-ui)[^/]*\.mapper\.ts$/.test(basename(f))).map((f) => fileHit(f, basename(f), 'model/transport suffix in mapper name')),
      ...ctx.grep(re, /^export (const|function) (\w+)/, { not: /^export (const|function) (\w*Mapper|toDomainModel|toDataModel)\b/, note: 'exports a helper (keep it private)' }),
      ...mapperKeys(ctx, re, /^(toDomainModel|toDataModel)$/),
      ...ctx.grep(re, /\b(\w+UiModel|toUiModel)\b/, { note: 'UI concern in data mapper' }),
    ];
  } },
  { id: 'data-gateway-impl-conventions', cat: 'Data', impact: 'HIGH', applies: hasLayers, check: (ctx) => {
    const re = new RegExp(`^${esc(ctx.P)}/data/gateway/.*\\.impl\\.ts$`);
    return [
      ...ctx.grep(re, /Result\.success\(\s*\{/, { note: 'inline mapping (use Mapper.toDomainModel)' }),
      ...ctx.grep(re, /Result\.success\(\s*(response|res|data)(\.data)?\s*\)/, { note: 'returns transport payload' }),
      ...ctx.grep(re, /Result<\s*\w*DataModel/, { note: 'data model leaks in return type' }),
      ...writeRequests(ctx, re),
      ...ctx.grep(re, /\b(body|data)\s*:\s*(\{|JSON\.stringify\(\s*\{)/, { note: 'request body as object literal (use Mapper.toDataModel)' }),
    ];
  } },

  // ── Presentation ──
  { id: 'presentation-screen-conventions', cat: 'Presentation', impact: 'CRITICAL', applies: hasLayers, check: (ctx) => {
    const screens = under(ctx, 'presentation/screens/');
    return [
      ...ctx.files.filter((f) => screens.test(f) && /creen[^/]*\.tsx$/.test(basename(f)) && !/\.screen\.tsx$/.test(basename(f))).map((f) => fileHit(f, basename(f), 'screen file must end in .screen.tsx')),
      ...ctx.grep(/\.screen\.tsx$/, /\b\w+(DomainModel|DataModel)\b/, { note: 'screen uses domain/data model' }),
      ...ctx.grep(/\.screen\.tsx$/, /\b\w*[gG]ateway\w*\.\w+\(|new \w+GatewayImpl\(/, { note: 'side effect in screen (move to view-model)' }),
    ];
  } },
  { id: 'presentation-ui-model-conventions', cat: 'Presentation', impact: 'CRITICAL', applies: hasLayers, heuristic: true, check: (ctx) => {
    const pres = under(ctx, 'presentation/');
    return [
      ...ctx.fileCheck(new RegExp(`^${esc(ctx.P)}/presentation/screens/[^/]+/model/[^/]+\\.model\\.ts$`), (src, f) => !/-ui\.model\.ts$/.test(f) && /export (interface|namespace|type) \w+UiModel\b|^\s*export interface \w*UiModel\b/m.test(src) && 'UI model in .model.ts (use .ui-model.ts; .model.ts only for FormFields / component-local models)'),
      ...ctx.grep(/\.ui-model\.ts$/, /^export (interface|namespace) \w+/, { not: /UiModel(\s|\{|$|<)/, note: 'symbol without UiModel suffix' }),
      ...ctx.grep(/\.ui-model\.ts$/, /from '.*\/(data|domain)\//, { note: 'UI model imports data/domain' }),
    ];
  } },
  { id: 'presentation-ui-mapper-conventions', cat: 'Presentation', impact: 'CRITICAL', applies: hasLayers, check: (ctx) => {
    const re = new RegExp(`^${esc(ctx.P)}/presentation/screens/.*/mapper/[^/]+\\.mapper\\.ts$`);
    return [
      ...ctx.files.filter((f) => re.test(f) && /(ui-model|-ui)\.mapper\.ts$/.test(f)).map((f) => fileHit(f, basename(f), 'model suffix in mapper name')),
      ...ctx.grep(re, /^export (const|function) (\w+)/, { not: /^export (const|function) (\w*Mapper|toUiModel)\b|^export const \w+: \w+\[\] = \[/, note: 'exports a non-toUiModel symbol' }),
      ...mapperKeys(ctx, re, /^(toUiModel|toDataModel)$/),
      ...ctx.grep(re, /\b\w+DataModel\b/, { note: 'UI mapper touches data models' }),
      ...ctx.grep(re, /^export const \w+: \w+\[\] = \[/, { note: 'static list in mapper/ (move to values)' }),
    ];
  } },
  { id: 'presentation-view-model-conventions', cat: 'Presentation', impact: 'CRITICAL', applies: hasLayers, heuristic: true, check: (ctx) => [
    ...ctx.files.filter((f) => under(ctx, 'presentation/').test(f) && /view[-._]?model/i.test(basename(f)) && !/^[a-z0-9]+(-[a-z0-9]+)*\.view-model\.ts$/.test(basename(f))).map((f) => fileHit(f, basename(f), 'view-model file must be <screen>.view-model.ts')),
    ...ctx.grep(under(ctx, 'presentation/'), /^export (const|function) [A-Z]\w*ViewModel\b/, { note: 'view-model hook must be use<Screen>ScreenViewModel' }),
    ...ctx.grep(/view[-._]?model\.tsx?$/i, /\.value(\s|,|;|\)|\.)/, { fileHas: /Gateway/, not: /toUiModel|Mapper|\.value\.(success|length|map\(\s*\w+Mapper)/, note: 'gateway result stored without toUiModel' }),
    ...ctx.grep(/\.ui-state\.ts$/, /\b\w+DomainModel\b/, { note: 'domain model in UiState' }),
  ] },

  // ── Presentation structure ──
  { id: 'screen-components-conventions', cat: 'Presentation structure', impact: 'HIGH', applies: hasLayers, check: (ctx) => {
    const hits = []; const seen = new Set();
    for (const f of ctx.files) {
      if (!f.startsWith(`${ctx.P}/`)) continue;
      if (/\/components\//.test(f) && !/\/screens\//.test(f)) { const d = f.slice(0, f.indexOf('/components/') + 11); if (!seen.has(d)) { seen.add(d); hits.push(fileHit(f, d, 'components/ outside screens/')); } continue; }
      const m = f.match(/^(.*\/screens\/(?:.*\/)?components\/[^/]+)\/[^/]+\.tsx$/);
      if (m && !seen.has(m[1])) { seen.add(m[1]); if (!ctx.ls(m[1]).some((n) => /\.props\.tsx?$/.test(n))) hits.push(fileHit(f, m[1], 'component without <comp>.props.ts')); }
      if (/\/screens\/.*\.styles?\.ts$/.test(f)) hits.push(fileHit(f, basename(f), 'separate styles file (styles are collocated in the .tsx)'));
    }
    return hits;
  } },
  { id: 'screen-decomposition-conventions', cat: 'Presentation structure', impact: 'MEDIUM', applies: hasLayers, heuristic: true, check: (ctx) => {
    const n = (k, d) => Number(ctx.profile[k]) || d;
    const lim = { lines: n('max_component_lines', 200), jsx: n('max_jsx_elements', 40), state: n('max_state_hooks', 4), handlers: n('max_handlers', 6) };
    const target = new RegExp(`^(${esc(ctx.P)}/presentation/screens/.*|${esc(ctx.S)}/public/[^/]+)\\.tsx$`);
    return ctx.fileCheckAll(target, (src, f, push) => {
      // lines of code without imports, comments, blanks and the StyleSheet block
      let code = src.replace(/\/\*[\s\S]*?\*\//g, '');
      const ss = code.search(/StyleSheet\.create\s*\(/);
      if (ss >= 0) { const end = matchClose(code, code.indexOf('(', ss)); if (end > 0) code = code.slice(0, ss) + code.slice(end + 1); }
      const loc = code.split('\n').filter((l) => l.trim() && !/^\s*(\/\/|import\b|\} from |export \* )/.test(l)).length;
      const jsx = (src.match(/(^|[\s({>?:&|=,])<([A-Z][\w.]*|[a-z]+)(?=[\s/>])/gm) || []).length;
      const state = (src.match(/\buse(State|Reducer)\s*[<(]/g) || []).length;
      const handlers = (src.match(/\b(const|function)\s+(handle|on)[A-Z]\w*\s*[=(]/g) || []).length;
      const over = [loc > lim.lines && `${loc} lines (>${lim.lines})`, jsx > lim.jsx && `${jsx} JSX elements (>${lim.jsx})`,
        state > lim.state && `${state} useState/useReducer (>${lim.state})`, handlers > lim.handlers && `${handlers} handlers (>${lim.handlers})`].filter(Boolean);
      if (over.length) push(1, basename(f), `split candidate: ${over.join(', ')}`);
      // renderX() helpers inside components
      for (const m of src.matchAll(/^\s+(const|function)\s+(render(?!Item\b|SectionHeader\b|SectionFooter\b)[A-Z]\w*)\b/gm)) push(ctx.lineOf(src, m.index), m[0].trim(), 'render function inside a component (make it a subcomponent)');
      // long pure functions inside a component body (util candidates)
      for (const m of src.matchAll(/^ {2,}const ([a-z]\w*)\s*=\s*(?:useCallback\()?\(([^)]*)\)\s*(?::\s*[^=]+)?=>\s*\{/gm)) {
        const open = m.index + m[0].length - 1; const close = matchClose(src, open); if (close < 0) continue;
        const body = src.slice(open, close);
        if (body.split('\n').length > 9 && !/\buse[A-Z]\w*\(|\bset[A-Z]\w*\(|navigation\.|[gG]ateway|await\b|dispatch\(|\.current\b/.test(body)) push(ctx.lineOf(src, m.index), `const ${m[1]} = (…) => { … }`, 'long pure function inside a component (util candidate)');
      }
    });
  } },
  { id: 'hooks-conventions', cat: 'Presentation structure', impact: 'HIGH', applies: hasLayers, check: (ctx) => {
    const pres = under(ctx, 'presentation/');
    return [
      ...ctx.files.filter((f) => pres.test(f) && /\/hooks\/[^/]+\.tsx?$/.test(f) && !/^use[A-Z]/.test(basename(f))).map((f) => fileHit(f, basename(f), 'hook file without use prefix')),
      ...ctx.grep(new RegExp(`${pres.source}.*\\/use[A-Z][^/]*\\.tsx?$`), /^export (const|function) [a-z]\w*/, { not: /^export (const|function) use[A-Z]/, note: 'exported hook without use prefix' }),
      ...ctx.fileCheck(new RegExp(`${pres.source}.*\\/use[A-Z][^/]*\\.tsx$`), (src) => !/<\/|<[A-Z][\w.]*[\s/>]|return \(\s*</.test(src) && '.tsx without JSX (use .ts)'),
      ...ctx.files.filter((f) => pres.test(f) && /\/use[A-Z][^/]*\.tsx?$/.test(f) && !/\/hooks\//.test(f)).map((f) => fileHit(f, basename(f), 'hook outside a hooks/ folder')),
    ];
  } },
  { id: 'utils-conventions', cat: 'Presentation structure', impact: 'MEDIUM', applies: hasLayers, check: (ctx) => {
    const pres = under(ctx, 'presentation/');
    const utils = new RegExp(`${pres.source}.*\\.utils\\.ts$`);
    return [
      ...ctx.files.filter((f) => utils.test(f) && !/\/utils\//.test(f)).map((f) => fileHit(f, basename(f), 'utils outside a utils/ folder')),
      ...ctx.files.filter((f) => pres.test(f) && /utils?\.params\.ts$|[^s]-params\.ts$/.test(basename(f)) && /utils/.test(basename(f)) && !/\.utils-params\.ts$/.test(f)).map((f) => fileHit(f, basename(f), 'must be <name>.utils-params.ts')),
      ...ctx.grep(utils, /export default/, { note: 'default export in utils' }),
      ...ctx.grep(utils, /\buse(State|Effect|Ref|Callback|Memo|Context)\(/, { note: 'React hook inside utils (make it a hook)' }),
      ...ctx.fileCheck(new RegExp(`${pres.source}.*\\.utils-params\\.ts$`), (src) => !/UtilsParams/.test(src) && 'params without XUtilsParams namespace'),
    ];
  } },
  { id: 'contexts-provider-conventions', cat: 'Presentation structure', impact: 'HIGH', applies: hasLayers, check: (ctx) => [
    ...ctx.grep(under(ctx, 'presentation/screens/'), /\buseContext\(/, { note: 'raw useContext in screens (use a contexts/hooks accessor)' }),
    ...ctx.files.filter((f) => under(ctx, 'presentation/contexts/').test(f) && /\.tsx$/.test(f) && !/\/(hooks|state)\//.test(f) && !/\.(context|provider|provider\.props)\.tsx$/.test(f)).map((f) => fileHit(f, basename(f), 'role suffix must be .context/.provider/.provider.props')),
  ] },
  { id: 'contexts-state-conventions', cat: 'Presentation structure', impact: 'HIGH', applies: hasLayers, check: (ctx) => {
    const hits = ctx.files.filter((f) => /\.(state|state-impl)\.ts$/.test(f) && !/\/contexts\/state\//.test(f)).map((f) => fileHit(f, basename(f), 'state contract outside contexts/state/'));
    for (const f of ctx.files.filter((x) => /\/contexts\/provider\/[^/]+\.provider\.props\.tsx?$/.test(x))) {
      const props = ctx.read(f) || '';
      const prov = ctx.read(f.replace(/\.provider\.props\.tsx?$/, '.provider.tsx')) || '';
      if (/ProviderState\b/.test(props) && /new \w*ProviderStateImpl\(/.test(prov)) hits.push(fileHit(f, basename(f), 'double ownership: state injected AND created by the provider'));
    }
    return hits;
  } },
  { id: 'navigation-conventions', cat: 'Presentation structure', impact: 'HIGH', applies: hasLayers, check: (ctx) => {
    const nav = under(ctx, 'presentation/navigation/');
    return [
      ...ctx.files.filter((f) => nav.test(f) && !/\.(navigator\.tsx|params\.ts)$/.test(f)).map((f) => fileHit(f, basename(f), 'must be *.navigator.tsx / *.params.ts')),
      ...ctx.grep(nav, /from '\.\.\/screens\//, { not: /\.screen'/, note: 'screen import not <name>.screen' }),
      ...ctx.fileCheck(/\.navigator\.tsx$/, (src) => /\bawait\b|\w+Gateway\w*\.\w+\(|useEffect\(/.test(src) && 'business logic in navigator'),
    ];
  } },
  { id: 'values-conventions', cat: 'Presentation structure', impact: 'MEDIUM', applies: hasLayers, heuristic: true, check: (ctx) => {
    const V = ctx.profile.values_root || `${ctx.P}/values`;
    const code = new RegExp(`^(${esc(ctx.P)}|${esc(ctx.S)}/public)/`);
    const ui = new RegExp(`^(${esc(ctx.P)}/presentation|${esc(ctx.S)}/public)/`);
    const notValues = (h) => !h.file.startsWith(`${V}/`);
    const skip = /^\s*(import |export \* |\/\/|\*)/;
    return [
      ...ctx.grep(new RegExp(`${ui.source}.*\\.tsx$`), />\s*[A-Za-zÁÉÍÓÚáéíóúñÑ¿¡][^<>{}]{2,}</, { not: /strings\./, note: 'screen text literal in JSX (values/strings)' }),
      ...ctx.grep(ui, /\b(title|label|text|placeholder|subtitle|description|message|errorText|helperText|accessibilityLabel|accessibilityHint|buttonText|caption|header)\s*(=|:)\s*['"`][^'"`]*[A-Za-zÁÉÍÓÚáéíóúñ]/, { not: skip, note: 'screen text literal in prop (values/strings)' }),
      ...ctx.grep(code, /(^|[^'"\\])(''|"")(?!['"])/, { not: skip, note: "empty string → strings.common.empty" }).filter(notValues),
      ...ctx.grep(code, /(?:^|[=(,:?!&|[]|\breturn)\s*\/(?![*/\s])(?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^/\\\n[])+\/[dgimsuy]*(?=\s*(?:[.,;)\]}]|$))|new RegExp\(\s*['"`]/, { not: skip, note: 'regex literal (values/regex)' }).filter(notValues),
      ...ctx.grep(code, /['"`](DD|dd|D|d)[/.\-](MM|M|MMM|MMMM)[/.\-](YYYY|yyyy|YY|yy)['"`]|['"`](YYYY|yyyy)[/.\-]MM[/.\-](DD|dd)['"`]|['"`](HH|hh|H|h):mm(:ss)?( ?[aA])?['"`]|toLocale(Date|Time)?String\([^)]*\{|Intl\.DateTimeFormat\([^)]*\{/, { not: skip, note: 'date format literal (values/dates)' }).filter(notValues),
      ...ctx.grep(new RegExp(`^${esc(V)}/`), /=>|\bfunction\b/, { note: 'logic inside values/' }),
    ];
  } },
  { id: 'schemas-conventions', cat: 'Presentation structure', impact: 'MEDIUM', applies: (ctx) => ctx.has('yup') || 'yup not in package.json', check: (ctx) => {
    const pres = under(ctx, 'presentation/');
    return [
      ...ctx.files.filter((f) => pres.test(f) && /chema/i.test(basename(f)) && !/\.schema\.ts$/.test(f)).map((f) => fileHit(f, basename(f), 'must be <screen>.schema.ts')),
      ...ctx.fileCheck(pres, (src, f) => /\byup\.object\(/.test(src) && !/createYupSchema/.test(src) && !/create-yup\.schema\.ts$/.test(f) && { line: src.split('\n').findIndex((l) => /yup\.object\(/.test(l)) + 1, text: 'yup.object(', note: 'schema not wrapped with createYupSchema<FormFields>' }),
      ...ctx.grep(pres, /\.(required|min|max|matches|oneOf|email)\([^)]*['"][A-Za-zÁÉÍÓÚáéíóúñ]/, { fileHas: /\byup\b/, note: 'inline validation message (use values/strings)' }),
      ...ctx.grep(under(ctx, 'presentation/schemas/'), /\buse(State|Effect)\(|navigation\.|await /, { note: 'side effect in schema module' }),
    ];
  } },
  { id: 'forms-conventions', cat: 'Presentation structure', impact: 'HIGH', applies: (ctx) => ctx.has('react-hook-form') || ctx.files.some((f) => /useForm\(/.test(ctx.read(f) || '')) || 'no react-hook-form', check: (ctx) => {
    const hits = []; const dirs = new Set();
    for (const f of ctx.files) {
      if (!under(ctx, 'presentation/screens/').test(f)) continue;
      const src = ctx.read(f) || '';
      if (!/\buseForm\b/.test(src)) continue;
      const m = f.match(/^(.*\/screens\/[^/]+)\//); if (!m || dirs.has(m[1])) continue; dirs.add(m[1]);
      const names = ctx.ls(m[1]);
      const missing = [!names.some((n) => /\.schema\.ts$/.test(n)) && 'schema', !names.some((n) => /\.view-model\.ts$/.test(n)) && 'view-model (<screen>.view-model.ts)', !ctx.ls(`${m[1]}/model`).some((n) => /\.model\.ts$/.test(n)) && 'model/'].filter(Boolean);
      if (missing.length) hits.push(fileHit(f, m[1], `form missing: ${missing.join(', ')}`));
    }
    hits.push(...ctx.grep(under(ctx, 'presentation/'), /useForm(<any>|\()/, { note: 'useForm not typed with <Feature>FormFields' }));
    hits.push(...ctx.grep(/\.screen\.tsx$/, /\buseState\b/, { fileHas: /\buseForm\b/, not: /useState<Record</, note: 'manual field state next to RHF' }));
    const used = ctx.files.some((f) => /\buseForm\b/.test(ctx.read(f) || ''));
    if (used) for (const d of ['react-hook-form', 'yup', '@hookform/resolvers']) if (!ctx.runtime[d]) hits.push(fileHit('package.json', d, `${d} missing from runtime dependencies`));
    return hits;
  } },
  { id: 'forms-dynamic-conventions', cat: 'Presentation structure', impact: 'HIGH', applies: (ctx) => ctx.has('react-hook-form') || 'no react-hook-form', check: (ctx) => [
    ...ctx.grep(under(ctx, 'presentation/screens/'), /\bcreateYupSchema\b/, { not: /^import /, note: 'schema factory outside <screen>.schema.ts' }).filter((h) => !/\.schema\.ts$/.test(h.file)),
    ...ctx.grep(under(ctx, 'presentation/screens/'), /useState<Record</, { fileHas: /\buseForm\b/, note: 'parallel field state for runtime fields' }),
  ] },

  // ── Public ──
  { id: 'public-api-conventions', cat: 'Public', impact: 'CRITICAL', applies: (ctx) => ctx.exists(`${ctx.S}/public`) || `no ${ctx.S}/public`, check: (ctx) => {
    const hits = [];
    const touched = ctx.scopeIsFull || ctx.inScope(new RegExp(`^${esc(ctx.S)}/(index\\.tsx?|public/)`));
    if (!touched) return hits;
    const idx = ctx.read(`${ctx.S}/index.tsx`) ?? ctx.read(`${ctx.S}/index.ts`);
    if (idx != null && !/export \* from '\.\/public'/.test(idx)) hits.push(fileHit(`${ctx.S}/index.tsx`, 'index', 'root barrel must re-export ./public'));
    (idx || '').split('\n').forEach((l, i) => { if (/from '\.\/private/.test(l)) hits.push({ file: `${ctx.S}/index.tsx`, line: i + 1, text: l, note: 'root barrel exports internals' }); });
    const pub = ctx.read(`${ctx.S}/public/index.ts`) || '';
    pub.split('\n').forEach((l, i) => { if (/\.\.\/private/.test(l)) hits.push({ file: `${ctx.S}/public/index.ts`, line: i + 1, text: l, note: 'public barrel exports internals' }); });
    for (const n of ctx.ls(`${ctx.S}/public`).filter((x) => /\.tsx$/.test(x))) {
      const src = ctx.read(`${ctx.S}/public/${n}`) || '';
      src.split('\n').forEach((l, i) => { if (/\buse(State|Effect)\(|\bfetch\(|\w+Gateway\w*\.\w+\(/.test(l)) hits.push({ file: `${ctx.S}/public/${n}`, line: i + 1, text: l, note: 'logic in public component' }); });
    }
    return hits;
  } },
];

// write calls (post/put/patch) must send a request built by Mapper.toDataModel
function splitArgs(text) {
  const args = []; let depth = 0; let q = null; let cur = '';
  for (let i = 1; i < text.length - 1; i++) {
    const c = text[i];
    if (q) { cur += c; if (c === '\\') { cur += text[++i]; } else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; cur += c; continue; }
    if ('({['.includes(c)) depth++; else if (')}]'.includes(c)) depth--;
    if (c === ',' && depth === 0) { args.push(cur.trim()); cur = ''; } else cur += c;
  }
  if (cur.trim()) args.push(cur.trim());
  return args;
}
function writeRequests(ctx, fileRe) {
  const hits = [];
  for (const f of ctx.files.filter((x) => fileRe.test(x))) {
    const src = ctx.read(f) || '';
    for (const b of ctx.blocks(src, /\.(post|put|patch)\s*(<[^>(]*>)?\s*\(/)) {
      const body = splitArgs(b.text)[1];
      if (!body || /toDataModel\(/.test(body)) continue;
      let note = null;
      if (/^[{[]/.test(body)) note = 'object literal as request (use Mapper.toDataModel)';
      else if (/^\.\.\./.test(body)) note = 'spread as request (use Mapper.toDataModel)';
      else if (/^[A-Za-z_$][\w$]*$/.test(body)) {
        const built = new RegExp(`\\b(const|let)\\s+${body}\\b[^=]*=\\s*[\\w.]*toDataModel\\(|\\b${body}\\s*:\\s*[\\w.]*DataModel\\b`).test(src);
        if (!built) note = `request '${body}' not built by Mapper.toDataModel`;
      } else note = 'request expression not built by Mapper.toDataModel';
      if (note) hits.push({ file: f, line: b.line, text: src.split('\n')[b.line - 1], note });
    }
  }
  return hits;
}

// keys of `export const XMapper = { … }` objects that are not part of the allowed contract
function mapperKeys(ctx, fileRe, allowed) {
  const hits = [];
  for (const f of ctx.files.filter((x) => fileRe.test(x))) {
    const src = ctx.read(f) || '';
    const m = src.match(/export const \w+Mapper\s*(:\s*[\w<>, ]+)?=\s*\{/);
    if (!m) continue;
    const open = src.indexOf('{', m.index + m[0].length - 1);
    let depth = 0;
    for (let i = open; i < src.length; i++) {
      const c = src[i];
      if (c === '{' || c === '(' || c === '[') depth++;
      else if (c === '}' || c === ')' || c === ']') { depth--; if (!depth) break; }
      else if (depth === 1 && /[A-Za-z_]/.test(c) && /[\s,{]/.test(src[i - 1])) {
        const km = src.slice(i).match(/^(\w+)\s*(\(|:)/);
        if (km && !allowed.test(km[1])) hits.push({ file: f, line: ctx.lineOf(src, i), text: km[1], note: 'non-contract method in mapper object' });
        if (km) i += km[1].length - 1;
      }
    }
  }
  return hits;
}

run({ skill: 'architecture', title: 'ARCHITECTURE SCAN', rules, argv: process.argv.slice(2) });
