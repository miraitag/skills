# Sections

Defines the rule categories, their order, impact level, and description.
The section ID (in parentheses) is the file prefix used to group rules.

> Review order: **Names → Domain → Data → Presentation → Presentation
> structure → Public** (inside-out, so renames cascade once). Impact only marks
> severity and sorts the summary; it does not change the review order.
>
> Ownership: each check lives in exactly one rule. File/symbol suffixes →
> `naming-conventions`; file case → `conv-kebab-case-files`; hook name,
> location and extension → `hooks-conventions`. Implementation topics
> (context typing/guards, RHF/Yup API, styles, colors, navigation typing) belong
> to `react-native-scotia-movil-mx-code-quality-skills`.

---

## 1. Names — Cross-cutting (naming)

**Impact:** HIGH
**Description:** File suffixes (`*.ui-model.ts`, `*.data-model.ts`,
`*.domain-model.ts`), symbol suffixes (`XUiModel`, `XDataModel`,
`XDomainModel`), noun-based names without action verbs (Clean Architecture),
file names in kebab-case (`conv-kebab-case-files`), and TypeScript suffixes by
artifact type (`conv-ts-file-suffixes`). This is the shared base for all other
categories.

## 2. Domain (domain)

**Impact:** HIGH
**Description:** Pure, framework-agnostic domain models and the gateway
interface with `Result<Domain, ServiceError>` that references only domain
models. This is the core of the architecture; it must not know about data or
presentation.

## 3. Data (data)

**Impact:** HIGH
**Description:** Data models that reflect transport shape (API), mappers that
expose only `toDomainModel` / `toDataModel`, and gateway implementation with
the flow HTTP → data model → mapper → domain model → `Result`.

## 4. Presentation (presentation)

**Impact:** CRITICAL
**Description:** Screens `<name>.screen.tsx` that render only, view-shaped UI
models, UI mappers that expose only `toUiModel`, and the core rule: every
view-model that consumes the gateway must map the domain result to a UI model
via a UI mapper. Violations leak models across layers and break boundaries.

## 5. Presentation structure (structure)

**Impact:** HIGH
**Description:** Internal organization of the presentation layer: screen
components (`screens/<screen>/components/` and `screens/components/`), hooks
(when, naming, and location), utilities (`utils/` + `utils-params`),
contexts/provider (dependency injection), provider-owned context state
contracts, navigation (typed navigator + params), values (colors / dimens /
strings / regex / dates), validation schemas (Yup), screen / component decomposition (size
metrics and where extracted code goes), and forms (React Hook Form + Yup
implementation). The `components/` folder exists only inside `screens/`, never
at the root of `private`.

## 6. Public (public)

**Impact:** CRITICAL
**Description:** Minimal public surface in `src/public/`: a barrel that exports
only the main component and its props interface (host contract). Everything else
lives in `src/private/` and is not exported.
