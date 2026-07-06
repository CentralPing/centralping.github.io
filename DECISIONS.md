# Architectural Decisions: centralping.github.io

> **About this document.** This file is the persistent context store for AI agents working on
> the CentralPing project website. It is organized in priority order — sections near the top
> affect every change; sections lower down provide deeper context or historical records.
>
> **Section hierarchy:**
>
> 1. **Critical Constraints** — universal rules for this repo. Read first.
> 2. **Architecture** — how the site works. Read before structural changes.
> 3. **Detailed Decisions** — grouped by topic area.
> 4. **Project Setup** — GitHub, deployment, tooling.
>
> **Maintaining this document:**
>
> - **New decisions** go in Section 3 under the relevant topic group.
> - **Promote** a decision to Section 1 when it becomes a universal constraint.
> - **Never delete information** — move it to a lower section instead.
> - Keep Section 1 under 20 lines.
> - For library code conventions (code style, JSDoc, testing), defer to ergo's DECISIONS.md.

---

## 1. Critical Constraints

- **No library source code in this repo.** This repo contains only documentation, site
  components, and build configuration. Library code lives in `CentralPing/ergo` and
  `CentralPing/ergo-router`.

- **Content accuracy.** All technical descriptions, RFC citations, and API references must
  match the current state of the library repos. When in doubt, consult the library JSDoc
  (the single source of truth for API documentation).

- **No doc tooling in library repos.** All documentation generation dependencies
  (`starlight-typedoc`, `typedoc`, `typedoc-plugin-markdown`) live here, not in the
  library repos. This keeps library repos focused on library code.

---

## 2. Architecture

### Site Identity

Project website for `@centralping/ergo` and `@centralping/ergo-router`. Hosted at
https://centralping.github.io via GitHub Pages.

### Tech Stack

- **Framework:** Astro with Starlight documentation theme
- **API docs:** `starlight-typedoc` + `typedoc` + `typedoc-plugin-markdown` — generates API
  reference pages from library JSDoc at build time
- **Charts:** `@observablehq/plot` for benchmark visualizations
- **Image processing:** `sharp`

### Content Structure

```
src/content/docs/
├── index.mdx                 # Landing page
├── getting-started.mdx
├── why-ergo.mdx
├── benchmarks.mdx
├── concepts/
│   ├── fast-fail.mdx
│   ├── security.mdx
│   └── standards.mdx
└── packages/
    ├── ergo.mdx
    └── ergo-router.mdx
```

### Typedoc Integration

Typedoc processes ergo's JavaScript source via a `tsconfig.typedoc.json` with
`allowJs: true` and `skipErrorChecking: true`, reading JSDoc annotations as type information
without requiring the codebase to pass TypeScript's strict type checker.

The deploy workflow checks out the ergo source at the appropriate git ref (release tag or
`main`) into `.ergo-source/` before building. ergo's dependencies are installed with
`--ignore-scripts --omit=dev` since only source files and JSDoc annotations are needed.

**ergo-router follows the same pattern.** Both repos dispatch to this site; both use JSDoc as
their source of truth. The site uses `createStarlightTypeDocPlugin()` to create separate
`starlight-typedoc` plugin instances for each package, each with its own sidebar group
placeholder. ergo-router source is checked out into `.ergo-router-source/` with a symlink
to ergo at `$GITHUB_WORKSPACE/../ergo` (matching ergo-router's `file:../ergo` peer dep
pattern from its CI workflow). Each instance outputs to a distinct directory
(`api/ergo/`, `api/ergo-router/`).

**Astro `@` stripping in routes.** Astro strips the `@` character from directory names
during file-based route generation. `starlight-typedoc` generates API doc files into
`src/content/docs/api/ergo/@centralping/ergo/`, but Astro serves them at
`/api/ergo/centralping/ergo/...` (without `@`). All internal links to API reference pages
must use the `@`-free URL path. (#100)

**Custom tag registration.** A `tsdoc.json` file at the repo root extends
`typedoc/tsdoc.json` and registers `@fileoverview`, `@requires`, and `@member` as custom
block tags. Without this, TypeDoc warns about unrecognized tags and fails to populate module
index member listings (Variables/Functions sections remain empty despite individual member
pages being generated). The `checkJs: true` setting in both TypeDoc tsconfigs enables full
resolution of `export *` re-export chains — required alongside tag registration for module
index population. (#60)

**Subpath exports documentation.** ergo's TypeDoc instance uses multiple entry points to
document the public subpath exports (`lib/cookie`, `lib/json-api-query`, `utils/buffers`,
`utils/iterables`, `utils/observables`, `utils/streams`) alongside the main `http/` module.
Only named barrel exports are documented — wildcard glob exports (`./lib/*`, `./utils/*`)
are excluded to avoid documenting internal modules.

**Dispatch ref resolution.** The deploy workflow resolves ergo and ergo-router refs
independently based on `client_payload.package` and `client_payload.version`. When a
package-specific dispatch arrives (e.g., `{package: "ergo-router", version: "v0.2.0"}`),
that package builds from the specified ref while the other defaults to `main`. When no
package is specified (or the package is `ergo`), the version applies to ergo.

### Phased Versioning Plan

- **Phase 1 (current):** Generate API docs from the latest release (or `main` for dev). Single
  version served on the site.
- **Phase 2:** After multiple releases exist, add a version selector UI. Evaluate
  `starlight-versions` plugin or path-segmented Typedoc output.
- **Phase 3:** Pre-generate and cache versioned doc output per release to avoid unbounded build
  time growth.

### CI Dispatch Model

Both `ci.yml` (push to main) and `release.yml` (GitHub Release published) in ergo and
ergo-router dispatch `repository_dispatch` events to this repo with a
`{package, version}` payload:
- Push-to-main sends `version: "dev"` (resolved to `main` by the deploy workflow)
- Releases send the tag name (e.g. `v0.1.0`)

The deploy workflow normalizes scoped npm package names (strips `@centralping/` prefix) before
matching, so both `"ergo"` and `"@centralping/ergo"` are accepted. It then validates the ref
format (`main` or `vX.Y.Z`) and rejects anything else.

---

## 3. Detailed Decisions

### Branding / Theming

**Theme-aware logo swapping.** Package pages use CSS classes (`.light` / `.dark`) controlled
by Starlight's `[data-theme]` attribute for theme-aware `<img>` swapping between light and
dark wordmark variants.

**Auto-generated title suppression.** The auto-generated `<h1>` page title is hidden via
`main:has(.package-logo) h1#_top` in `src/styles/packages.css`, replaced by the logo/wordmark
image.

**Font note.** Wordmark SVGs use `<text>` elements with `font-family="Inter, system-ui,
-apple-system, sans-serif"`. GitHub renders SVGs as sandboxed `<img>` tags (no external font
loading), so text falls back to `system-ui`.

For the canonical branding specification (colors, symbol meaning, asset naming), see ergo's
DECISIONS.md Section 4 > Branding.

**Asset locations in this repo:**

| Directory | Files |
| --------- | ----- |
| `public/assets/` | Copies of wordmark SVGs for package pages |
| `src/assets/` | `logo.svg` (site logo in Starlight config) |
| `public/` | `favicon.svg` (∴ icon mark) |

### Benchmark Page

Benchmark results from ergo's `benchmarks/` directory are curated and published at
`/benchmarks/`. The page uses custom Astro components (`src/components/BenchChart.astro` and
chart sub-components) with data from `src/data/benchmarks.json`.

For benchmark methodology and the Docker orchestrator, see ergo's DECISIONS.md
Section 4 > Benchmarks.

### Middleware Guide Pages

Hand-authored MDX guide pages for each ergo `http/` middleware, living in
`src/content/docs/middleware/`. The site uses a **two-layer documentation model**:

- **Guide pages** (this section) — developer-facing documentation with options tables,
  return values, error response tables, usage examples (standalone + declarative
  ergo-router), and RFC references.
- **API Reference** — auto-generated from JSDoc via `starlight-typedoc` with precise type
  signatures. Each guide page links to the corresponding API reference page.

Guide pages complement rather than replace the auto-generated API reference. The gap they
fill is structural: `typedoc-plugin-markdown` does not render `@example`, `@see`, or
`@fileoverview` on individual member pages.

**Content structure per guide page:** Overview, Import, [Arguments (table),] Options (table),
Return Value, Error Responses (table), Usage (Tabs: Standalone + ergo-router), RFC References,
API Reference link. The Arguments section is used only for pages with mandatory positional
parameters (currently `handler` — the only middleware whose factory takes a positional arg
separate from the options object).

**Content source:** ergo `http/*.js` JSDoc is the single source of truth. Guide pages
derive from it but add narrative, cross-package examples, and error response tables that
TypeDoc cannot generate.

**Sidebar:** Uses `autogenerate: { directory: "middleware" }` for automatic discovery.

**Canonical template.** All middleware guide pages follow a codified canonical h2 ordering
enforced by `.cursor/rules/middleware-guide-template.mdc`:

1. Import
2. Arguments (optional — only for middleware with positional factory parameters; currently `handler`)
3. Options
4. Return Value
5. Error Responses
6. Usage (all deep-dive behavioral content lives here as h3 subsections)
7. RFC References (trailing trio)
8. Related Recipes (trailing trio)
9. API Reference (trailing trio)

h3 subsections within core sections (Options, Return Value, Error Responses) are acceptable
for documenting the parent section's API surface. Deep-dive usage patterns must be h3 under
Usage. Tab labels must be "Standalone" / "ergo-router" — no other labels. (#137)

**Accumulator terminology.** First prose mention of the domain accumulator per page uses the
linked form: `[domain accumulator](/concepts/accumulator/) (\`acc\`)`. Subsequent mentions
use bare `acc` in inline code. "Response accumulator" is introduced separately where
applicable and does not link to `/concepts/accumulator/` (different concept). Pages where
`acc` appears only inside code blocks (no prose introduction needed): cors, cache-control,
precondition, security-headers, compress. (#145)

**CSRF applicability section.** The CSRF guide page has a "When CSRF Applies" subsection
as the first h3 under `## Usage`. An early-signal `<Aside type="tip">` in the overview area
(before Import) alerts developers that Bearer token APIs do not need CSRF. The detailed
applicability guidance lives under Usage following the canonical template. (#51, #144)

**Precondition common pattern.** The precondition guide page documents the common pattern
(Safe Write Operations) and opt-out pattern as h3 subsections under `## Usage` with standard
"Standalone" / "ergo-router" tab labels. (#143)

**Maintenance:** When middleware options change in ergo, the corresponding guide page
should be updated. The API Reference link at the bottom of each page provides a
cross-check for type accuracy. (#72)

**responseSchema documentation.** The send guide page documents the `responseSchema` option —
a `Record<number|string, object>` map of status codes to JSON Schema objects for response body
projection. Includes a Resolution sub-table (exact → range → default → no projection),
interaction ordering Aside (projection before envelope), applicability Aside (Object bodies
with statusCode < 400 only), and usage examples (Standalone + ergo-router). The handler guide
page references `responseSchema` as a forwarded option.
**Content source:** ergo `http/send.js` (option definition lines 139-143; projection logic
lines 202-205), `lib/response-schema.js` (compile + resolve functions).
**Maintenance trigger:** When `responseSchema` resolution semantics change in ergo
(new key types, changed ordering, different body type applicability), update the send guide
page Resolution sub-table and Asides. (#115)

**onResponse lifecycle hook documentation.** The handler guide page documents the `onResponse`
post-send observation hook — signature `(req, res, responseInfo, domainAcc)`, responseInfo
shape table, error handling semantics (swallowed), and audit logging usage example. The
ergo-router package page adds a "Lifecycle Hooks" h3 section documenting the dual-level
execution model (route-level first, router-level second, each try/catch), the responseInfo
snapshot shape, a caution Aside that `onResponse` does not fire with `catchHandler`, and a
usage example combining audit logging with per-route metrics.
**Content source:** ergo `http/handler.js` (lines 62-67 JSDoc, lines 152-158 invocation),
`lib/response-info.js` (snapshot builder), ergo-router `lib/auto-wrap.js` (lines 120-134
route+router execution, line 113 catchHandler early return).
**Maintenance trigger:** When `onResponse` semantics change in ergo or ergo-router (new
responseInfo fields, changed execution order, changed error handling), update both the
handler guide page and the ergo-router Lifecycle Hooks section. (#116)

**catchHandler 4th argument documentation.** The ergo-router package page Route Options
table was updated to show the full `catchHandler` signature: `(req, res, err, domainAcc)`.
The fourth argument provides the domain accumulator state at the time of the error.
**Content source:** ergo-router `lib/auto-wrap.js` line 113.
**Maintenance trigger:** When `catchHandler` signature changes in ergo-router, update the
Route Options table and any cross-references. (#117)

**Validate shorthand form documentation.** The validate guide page documents the shorthand
form — passing a raw JSON Schema directly to `validate()` instead of wrapping it in
`{body: schema}`. Includes detection algorithm (JSON Schema indicator keywords), precedence
rule (targeted form wins when `body`/`query`/`params` present), empty object caveat, updated
unrecognized-keys Aside, and shorthand usage examples in both Standalone and ergo-router tabs.
**Content source:** ergo `http/validate.js` (shorthand detection lines 52-85, JSDoc lines
91-123), ergo DECISIONS.md "Shorthand form" paragraph.
**Maintenance trigger:** When the `JSON_SCHEMA_INDICATORS` set changes in ergo (new keywords
added or removed), or when shorthand detection semantics change (`isSchemaShorthand()`
logic), update the validate guide page detection keywords list and precedence explanation.
(#114)

**Validation error response documentation.** The validate guide page includes a "Validation
Error Response" subsection after the Error Responses table, documenting the full 422 body
shape (RFC 9457 Problem Details with `details` extension member), the `details` entry shape
table (`path`, `message`, `params`), keyword-specific `params` examples, validation order
(body → query → params, first failure wins), and the `detail` vs `details` singular/plural
distinction. The testing-patterns recipe validation tests assert on `problem.details` array
entries. The error-responses reference page 422 row cross-links to the new subsection.
**Content source:** ergo `lib/validate.js` `formatError` (lines 86-92), `http/validate.js`
(catch block lines 193-200).
**Maintenance trigger:** When `formatError()` changes in ergo (new fields, changed
`instancePath` mapping), when validation target order changes in `http/validate.js`, or
when AJV version updates change error object structure, update the validate guide
"Validation Error Response" section, the testing-patterns recipe validation assertions,
and the error-responses cross-link. (#139)

**Validate formats fast-mode default documentation.** The validate guide page documents
the `formats` option default as fast mode (simplified regexes that mitigate ReDoS).
Includes expanded `formats` Values table (5 value forms: `undefined`/`true` for fast-mode
default, `false` to disable, array for selective formats with full-mode regexes,
`{mode: 'full'}` for strict RFC compliance, and `{mode: 'fast'}` for explicit fast mode)
and a ReDoS mitigation tip Aside listing the 8 affected format validators (`date`, `time`,
`date-time`, `iso-time`, `iso-date-time`, `uri`, `uri-reference`, `email`).
**Content source:** ergo `lib/validate.js` (format mode resolution at lines 56-60,
`addFormats(ajv, {mode: 'fast'})` default), `http/validate.js` (JSDoc `options.formats`
at lines 106-107).
**Maintenance trigger:** When `ajv-formats` is upgraded (format list or fast-mode regex
set may change), when ergo changes the default mode in `createValidator()`, or when
`addFormats` handling changes in `lib/validate.js`, update the validate guide page
`formats` Values table and ReDoS mitigation tip. (#209)

**CSP override documentation.** The security-headers guide page documents CSP override
patterns at three levels: per-route (`contentSecurityPolicy` option), router defaults
(`defaults.securityHeaders.contentSecurityPolicy`), and transport-level
(`transport.security.csp`). The Security concepts page (API8 section) cross-references
the CSP Implications section for developers investigating security posture.
**Maintenance trigger:** when the transport CSP config shape changes in ergo-router
(`lib/transport/security-headers.js` `TRANSPORT_DEFAULTS.csp`), update the
transport-level CSP subsection. (#83)

**CSRF declarative config documentation.** The CSRF guide page's ergo-router tab was expanded
from a minimal stub to a comprehensive example showing `defaults: { cookie: true, csrf: { secret } }`,
browser routes inheriting CSRF from defaults, Bearer-only routes with `csrf: false`, and
auto-dispatch behavior (issue for safe methods, verify for unsafe). A cookie prerequisite
`<Aside type="caution">` was added after the Options table documenting that both `issue` and
`verify` depend on `acc.cookies` from the cookie middleware. The mixed-auth recipe's ergo-router
examples were also updated to include `cookie: true` in defaults alongside `csrf` — without it,
`acc.cookies` is undefined and CSRF fails at runtime.
**Maintenance trigger:** when `createCsrfAdapter()` dispatch logic changes in ergo-router
(`lib/pipeline-builder.js` lines 118-137), or when cookie/CSRF auto-inclusion behavior
changes, update both the CSRF guide page and the mixed-auth recipe. (#80)

**Intrinsic `setPath` documentation update.** After ergo#153, all 10 domain-producing
middleware factories (`logger`, `url`, `body`, `accepts`, `cookie`, `authorization`,
`tracing`, `prefer`, `paginate`, `idempotency`) carry an intrinsic `setPath` property
via `Object.defineProperty`. Standalone code examples across ~28 site pages were updated
from `{fn: middleware(), setPath: 'key'}` wrapper form to bare `middleware()` form.
Custom middleware examples retain explicit `{fn, setPath}` wrappers. CSRF examples
(`csrfMiddleware.issue`/`verify`) retain explicit wrappers because `createCsrf()` returns
`{issue, verify}`, not a single function. Three files with stale pre-0.4 `[fn, "key"]`
tuple syntax were also corrected directly to bare form.
**Content source:** ergo `DECISIONS.md` lines 215-224 (intrinsic `setPath` decision record),
per-factory JSDoc `@example` blocks in ergo `http/*.js`.
**Maintenance trigger:** When new domain-producing middleware factories are added to ergo
with intrinsic `setPath`, update the corresponding guide page and any recipe standalone
examples. When the intrinsic path mechanism changes (e.g., detection in `normalizeOp`),
update the Architecture page Composition Format section and Accumulator Reference prose. (#122)

**Idempotency auto-ordering clarification.** The idempotency guide page's ergo-router tab was
expanded with inline text explaining that ergo-router automatically includes body parsing for
POST/PUT/PATCH routes and places `idempotency` after it in the pipeline (Stage 3: body →
idempotency → validate). Includes a Config Resolution cross-link.
**Content source:** ergo-router `lib/pipeline-builder.js` (Stage 3 ordering at lines 218-234,
body auto-inclusion via `BODY_METHODS` Set).
**Maintenance trigger:** When Stage 3 ordering changes in pipeline-builder (body/idempotency/
validate sequence) or when body auto-inclusion logic changes, update the idempotency guide
page ergo-router tab text. (#165)

**Timeout global + per-route override example.** The timeout guide page was expanded with a
"Global Default with Per-Route Overrides" subsection under Usage showing `defaults: { timeout:
{ms: 5_000} }`, a route that inherits the default, a route with `timeout: {ms: 30_000}`
override, and a route with `timeout: false` for SSE (paired with `noSend: true`). Includes a
Config Resolution tip Aside.
**Content source:** ergo-router `lib/pipeline-builder.js` (timeout resolution at lines 244-247
via standard `resolve()`) and `lib/resolve-config.js` (resolution semantics).
**Maintenance trigger:** When timeout config resolution changes in pipeline-builder or when
`resolve()` semantics change in resolve-config, update the timeout guide page override
example. (#166)

**API naming rationale documentation.** The `why-ergo.mdx` page has an "API Naming" section
(after "The Name") surfacing the public-facing rationale for retaining `send`, `accepts`, and
`compose` as canonical API names. Cross-link tip Asides on `send.mdx`, `accepts.mdx`, and
`architecture.mdx` (Composition Format section) point readers to `/why-ergo/#api-naming`.
**Content source:** ergo `DECISIONS.md` API Naming section (lines 1247-1310, #139). The site
content is a condensed user-facing summary, not a verbatim copy.
**Maintenance trigger:** When ergo renames a public export, adds new naming decisions to the
API Naming section, or when the naming audit (#139) is revisited, update `why-ergo.mdx` and
the cross-link Asides on the affected middleware/concept pages. (#169)

**Body return-shape property table and content-type dispatch tip.** The body guide page
(`body.mdx`) includes a property table documenting all 8 `BodyResult` fields (type, charset,
encoding, length, received, boundary, raw, parsed) after the existing code example and before
the Multipart subsection. A tip `<Aside>` after the table explains that `type` carries the
semantic distinction for JSON variants and cross-links to the PATCH Semantics recipe for the
`acc.body.type` dispatch pattern.
**Content source:** ergo `types-override/ergo.d.ts` (`BodyResult` interface lines 319-329),
ergo `http/body.js` (`type` set from Content-Type header parse at lines 146-167).
**Maintenance trigger:** When `BodyResult` fields change in ergo (new fields added, types
changed, field removed), update the body guide page property table and the corresponding
`acc.body` subsection on the Accumulator Reference page. (#167)

**`parsed` optionality correction.** The `BodyResult` interface block on the Accumulator
Reference page (`accumulator.mdx`) showed `parsed?: unknown` (optional), but the property
table on the same page showed `parsed` as `unknown` (required) — an internal inconsistency.
Runtime analysis of `ergo/http/body.js` confirms `parsed` is always present on every
`BodyResult` success path (fast path L213: own data property, lazy path L220: accessor).
The `?` was removed from the interface block to match the table and the runtime behavior.
**Companion issue:** [ergo#174](https://github.com/CentralPing/ergo/issues/174) tracks
tightening `parsed?: T` to `parsed: T` in `ergo/types-override/ergo.d.ts` L332. Until
that issue is resolved, the docs show `parsed: unknown` (required) while the `.d.ts`
retains `parsed?: T`. This divergence is intentional per the content source-of-truth
hierarchy (JSDoc/runtime over type overrides).
**Content source:** ergo `http/body.js` (three return paths at L204-241), `types-override/ergo.d.ts` L332.
**Maintenance trigger:** When ergo#174 is resolved, the divergence note can be removed. (#179)

### Recipe Pages

Hand-authored MDX recipe pages for common API patterns, living in
`src/content/docs/recipes/`. Recipes complement the middleware guide pages
and API reference with a **cookbook structure**:

- **Problem** — what the developer is trying to accomplish
- **Solution** — working code examples with Tabs (Standalone + ergo-router)
- **Explanation** — how the solution works, why it is designed this way, and
  related ergo concepts

**Content source:** ergo source code (JSDoc, implementation) is the single
source of truth. Recipe code examples must be verified against the actual
library behavior.

**Sidebar:** Uses `autogenerate: { directory: "recipes" }` for automatic
discovery. Placed between "Middleware" and "API Reference" — the natural
information flow from "what it does" to "how to use it" to "exact types."

**Scope criteria:** A recipe belongs in this section when it involves
cross-cutting patterns spanning multiple middleware, or patterns that do not
naturally fit on a single middleware guide page. Single-middleware usage
examples belong on the middleware guide page instead. (#92)

**Middleware guide cross-links:** Middleware guide pages that have directly
relevant recipes include a "Related Recipes" section before the "API Reference"
section. Links use the format `- [Recipe Title](/recipes/slug/) — one-line
description`. This establishes a bidirectional discovery path: recipes link to
middleware guides for API details, and middleware guides link to recipes for
cross-cutting usage patterns. (#92, #42)

**Custom Middleware recipe:** `recipes/custom-middleware.mdx` documents how to
author middleware that fits ergo's accumulator-based return-value contract.
Scope justification: cross-cutting — spans the middleware contract (compose-with),
pipeline placement (`use` config key in ergo-router), accumulator access patterns
(domain + response), and `fromConnect()` interop. Does not belong on any single
middleware guide page because it documents the contract itself, not a specific
middleware. (#50)

**#72 gap-fill:** TypeScript tab examples (contract + domain contribution),
response timing two-step pattern, shared computation (memoized resolver),
audit logging (fire-and-record), anti-patterns section (5 patterns with
corrected alternatives), cross-links from middleware overview and Getting
Started next-steps. Canonical URL remains `/recipes/custom-middleware/` — no
`/guides/` content tier exists. (#72)

**Testing Patterns recipe:** `recipes/testing-patterns.mdx` documents comprehensive
HTTP testing patterns for ergo APIs using `node:test` and `node:assert/strict`.
Scope justification: cross-cutting — spans server lifecycle (`graceful()` + manual
`http.createServer`), auth testing (Bearer strategies, WWW-Authenticate), validation
(body schema 422 responses), rate limiting (burst + header assertions), error responses
(RFC 9457 Problem Details), graceful shutdown (programmatic `shutdown()`, `onShutdown`
callbacks), conditional requests (ETag round-trip, 304), and test isolation tips. Does
not belong on any single middleware guide page because it documents testing patterns
across the entire middleware surface.
**Cross-links:** Getting Started "Next Steps", ergo-router package page "Testing with
Programmatic Shutdown" section, graceful-shutdown recipe.
**Maintenance trigger:** When middleware error shapes change in ergo (new status codes,
changed Problem Details fields), when `graceful()` options change in ergo-router, or
when new middleware is added that requires distinct testing patterns, update the
corresponding section. (#73)

### Config Resolution Documentation

**Page:** `src/content/docs/packages/ergo-router.mdx` at `/packages/ergo-router/#config-resolution`.

A canonical "Config Resolution" section on the ergo-router package page documenting how the
pipeline builder's `resolve()` function resolves route config against router-level defaults.
Route values **replace** defaults entirely (shallow replace, not deep merge). The section
covers: resolution order, value table (`undefined`/`false`/`true`/`{...}`), replace-vs-extend
examples, the `use` key concatenation exception, and auto-inclusion interaction with `false`.

**Cross-references:** A caution `<Aside>` on the Getting Started page links to this section.
The multi-auth recipe's "Route-Level Resolution" subsection links here for the full resolution
rules. The canonical section consolidates documentation previously scattered across recipes.

**Content source:** ergo-router `lib/pipeline-builder.js` `resolve()` function (lines 94-116).
The runtime behavior is correct by design — this was a documentation gap, not a code defect.

**Maintenance trigger:** When `resolve()` semantics change in ergo-router (new value types,
merging behavior), update this section and the cross-referencing callout. (#81)

### Config Validation Documentation

**Page:** `src/content/docs/packages/ergo-router.mdx` at
`/packages/ergo-router/#config-validation`.

A "Config Validation" section on the ergo-router package page documenting the three layers
of registration-time validation: unknown key detection (with Levenshtein "did you mean?"
suggestions), value type enforcement, and semantic cross-key validation. Framed as a
**capability** ("ergo-router catches typos at startup") rather than diagnostic
troubleshooting — the complementary diagnostic framing lives on the
[Debugging & Diagnostics](/concepts/debugging/) page.

**Content source:** ergo-router `lib/validate-config.js` (7 exported functions, 6 key sets:
`PIPELINE_KEYS`, `ROUTE_OPTION_KEYS`, `ANNOTATION_KEYS`, `VALID_ROUTE_CONFIG_KEYS`,
`VALID_DEFAULTS_KEYS`, `VALID_ROUTER_OPTIONS_KEYS`). Levenshtein threshold constant
`MAX_SUGGESTION_DISTANCE = 3`.

**Cross-references:**
- [Debugging & Diagnostics](/concepts/debugging/) — Registration-Time Validation subsection
  tip Aside links to Config Validation; Further Reading bullet links to Config Validation
- [Config Resolution](#config-resolution) — referenced for how values resolve before
  semantic validation
- [Route Config Key Reference](#route-config-key-reference) — referenced for the complete
  valid key listing

**Maintenance trigger:** When validation functions change in ergo-router
`lib/validate-config.js` (new key categories added to any of the 6 key sets, new semantic
rules added to `validateSemanticConfig()`, changed strict/lenient behavior in
`validateKeys()`, new value type rules in `validateRouteConfig()` / `validateDefaults()` /
`validateRouterOptions()`), update the Config Validation section on the ergo-router package
page and the error message examples. (#170)

### Application Middleware & Route Options Documentation

**Page:** `src/content/docs/packages/ergo-router.mdx` at
`/packages/ergo-router/#application-middleware` and `/packages/ergo-router/#route-options`.

Two new h3 sections on the ergo-router package page documenting router-level API capabilities
that were implemented and typed in ergo-router but absent from the website:

- **Application Middleware** — `router.use(...fns)` method for middleware that runs before
  all four pipeline stages on every request. Includes chaining example, array-pipelines-only
  caveat, and distinction from the per-route `use` config key.
- **Route Options** — per-route config keys (`noSend`, `send`, `catchHandler`) that control
  auto-wrap behavior without corresponding to pipeline middleware. Includes `noSend` SSE
  example and full-response-responsibility warning.

**Cross-references:** An `<Aside>` on the Custom Middleware recipe
(`/recipes/custom-middleware/`) links to Application Middleware to distinguish `router.use()`
(application-level, before all stages) from `use` config key (per-route, after validation).
The ergo-router package page reciprocally links to the Custom Middleware recipe.

**Content source:** ergo-router `lib/router.js` (`router.use()` definition, lines 97-100;
`extractRouteOpts()`, lines 252-264) and `lib/auto-wrap.js` (`appMiddleware` consumption,
line 82; `noSend` logic, lines 79-84).

**Maintenance trigger:** When `router.use()` behavior changes (e.g., filtering, ordering),
when new route options are added to `extractRouteOpts()`, or when `noSend` behavior changes
in auto-wrap, update the corresponding section. (#82)

### Pagination Documentation

**Page:** `src/content/docs/packages/ergo-router.mdx` at
`/packages/ergo-router/#pagination`.

A new h3 section on the ergo-router package page documenting the pagination two-sided
contract — the `paginate` config key wires both request parsing (`paginate()` middleware
stores `acc.paginate`) and response metadata generation (`send()` reads `response.paginate`
to emit RFC 8288 Link headers and `X-Total-Count`). Includes offset and cursor examples
showing the complete handler return contract.

**Cross-references:**
- An `<Aside>` on the Accumulator Reference page (`/concepts/accumulator/#accpaginate`)
  links to this section, explaining the response-side contract.
- The section links to the [paginate middleware guide](/middleware/paginate/) for options
  and the [Pagination recipe](/recipes/pagination/) for end-to-end examples.
- The paginate middleware guide includes a tip `<Aside>` cross-referencing the Pagination
  recipe's `response.paginate` contract section.

**Pagination recipe expansion.** The Pagination recipe (`recipes/pagination.mdx`) was
expanded with three subsections: "The response.paginate Contract" (offset `{total}` and
cursor `{nextCursor?, prevCursor?}` shapes with convention-not-type Aside), "When Headers
Are NOT Generated" (five numbered gate conditions from `send.js` L269), and "ergo-router
Auto-Configuration" (auto-includes `url()`, auto-enables `send({paginate: true})` via
spread merge, preserves other send options).

**Content source:** ergo-router `lib/pipeline-builder.js` (paginate resolution, lines
189-202; URL auto-inclusion logic, line 193) and `lib/router.js` (send.paginate injection,
lines 215-218). ergo `http/send.js` (pagination gate conditions, lines 269-298).

**Maintenance trigger:** When paginate resolution semantics change in pipeline-builder
(new strategy types, changed auto-inclusion behavior), when `send()`'s pagination
response contract changes (gate conditions, response.paginate keys), or when the
spread-merge behavior for send options changes in `router.js`, update the ergo-router
package page section, the Pagination recipe contract/gate/auto-config subsections, the
paginate guide Aside cross-reference, and the accumulator page cross-reference.
(#79, #133)

### OpenAPI Generation Documentation

**Page:** `src/content/docs/packages/ergo-router.mdx` at
`/packages/ergo-router/#openapi-generation`.

A new h3 section on the ergo-router package page documenting `generateOpenAPI(router, options?)`
— the OpenAPI 3.1 specification generator. Includes import path
(`@centralping/ergo-router/openapi`), options table (title, version, description, servers,
info), code example with `openapi` annotations, auto-extraction list (path params, query
params, request body, security schemes, content types), config resolution note, annotation
key documentation, and cross-link to the OpenAPI Serving recipe.

**Cross-references:**
- The section links to the [OpenAPI Serving recipe](/recipes/openapi-serving/) for serving
  and API explorer integration.
- The `openapi` annotation key caution `<Aside>` documents that it is a pass-through, not
  valid in defaults.

**Content source:** ergo-router `openapi.js` (re-export entry) and `lib/openapi.js`
(function signature lines 222-223, JSDoc lines 205-221, auto-extraction logic lines 147-203).

**Maintenance trigger:** When `generateOpenAPI()` options change (new parameters, changed
defaults) or when auto-extraction adds new config key support, update this section. (#75)

### OpenAPI Serving Recipe

**Page:** `src/content/docs/recipes/openapi-serving.mdx` at `/recipes/openapi-serving/`.

A recipe page documenting how to serve the generated OpenAPI spec from a route and mount an
interactive API explorer (Scalar). Follows the standard Problem → Solution → Explanation
recipe structure with Tabs (Standalone + ergo-router).

**Content:**
- Serving the spec as JSON from `/openapi.json` (Standalone: pre-existing spec object;
  ergo-router: `generateOpenAPI()` + `authorization: false`)
- Interactive API explorer with Scalar (Standalone: `http.createServer` with HTML response;
  ergo-router: `noSend: true` + Scalar CDN `<script>` tag)
- Explanation sections: generation timing, auth-free routes, `openapi` annotation key,
  `noSend` pattern for HTML, config resolution interaction

**Cross-references:**
- Links to [OpenAPI Generation](/packages/ergo-router/#openapi-generation) package page section
- Links to [Route Options](/packages/ergo-router/#route-options) for `noSend`
- Links to [Config Resolution](/packages/ergo-router/#config-resolution)

**Content source:** ergo-router `lib/openapi.js` (generateOpenAPI function, lines 222-253),
`lib/pipeline-builder.js` (config resolution), `lib/auto-wrap.js` (noSend behavior).

**Maintenance trigger:** When `generateOpenAPI()` API changes, when Scalar CDN URL or
integration patterns change, or when `noSend` behavior changes in auto-wrap, update the
corresponding recipe sections. (#75)

### Structured Logging Recipe

**Page:** `src/content/docs/recipes/structured-logging.mdx` at `/recipes/structured-logging/`.

A recipe page documenting how to integrate production structured loggers (pino, winston)
with ergo's two logging surfaces: the `logger()` middleware per-request callback and
`graceful()`'s lifecycle log object. Follows the standard Problem → Solution → Explanation
recipe structure with Tabs (Standalone + ergo-router).

**Content:**
- Pino Integration (both surfaces unified via one instance)
- Winston Integration (same pattern, adapted for winston's `{message, ...meta}` format)
- Request ID Correlation (`acc.log.requestId` in execute handlers, child logger pattern)
- Trace Context Enrichment (pipeline ordering, traceId/spanId in log entries)
- Explanation: two integration surfaces table, `acc.log` is data (not a logger),
  request ID flow, production tips

**Cross-references:**
- Logger middleware guide "Related Recipes" section links to this recipe
- Getting Started "Next Steps" includes a link
- ergo-router package page "Custom Logger" subsection links for production patterns
- Graceful Shutdown recipe "Custom Logger Integration" subsection links here
- Recipes index page includes Structured Logging row

**Content source:** ergo `http/logger.js` (`log` option at line 96, `acc.log` return at
line 129), ergo-router `lib/lifecycle.js` (`log` duck-typed object at lines 48-52),
ergo `http/tracing.js` (trace context return value).

**Maintenance trigger:** When `logger()` callback shape changes in ergo (new fields in
the info object), when `graceful()` log interface changes in ergo-router (new methods),
or when `tracing()` return value changes (new correlation fields), update the
corresponding recipe sections. (#76)

### Sub-Router Documentation

**Pages:**
- `src/content/docs/packages/ergo-router.mdx` at `/packages/ergo-router/#sub-routers`
- `src/content/docs/recipes/sub-routers.mdx` at `/recipes/sub-routers/`

A two-layer documentation model for sub-routers and `router.mount()`:

- **Package page section** — API semantics: `mount()` signature, behavioral rules table
  (copy semantics, defaults isolation, transport scoping, `router.use()` scoping,
  `strictPatch`/`strictBody` governance, ordering constraint), caution aside for
  routes-before-mount requirement.
- **Recipe page** — practical patterns: basic mounting, per-group auth (Basic vs Bearer
  vs public), shared defaults vs isolation, per-group rate limiting (transport vs pipeline
  distinction), complete multi-resource API example. Problem/Solution/Explanation structure.

**Cross-references:**
- Package page links to recipe for practical patterns
- Recipe links to Config Resolution, Application Middleware, and Multi-Auth recipe
- Multi-Auth recipe links to Sub-Routers recipe for per-group auth alternative
- Recipes index page includes Sub-Routers row

**Content source:** ergo-router `lib/router.js` (`mount()` definition, lines 102-111;
`mountSubRouter()` implementation, lines 266-296). Pipeline resolution behavior from
`lib/pipeline-builder.js` `resolve()` (lines 94-116). Auto-wrap config freezing from
`lib/auto-wrap.js` (lines 77-84).

**Maintenance trigger:** When `mountSubRouter()` semantics change in ergo-router (e.g.,
live delegation instead of copy, defaults merging behavior, transport propagation), update
both the package page section and the recipe page. (#74)

### TypeDoc Entry File Naming

The `starlight-typedoc` plugin passes `entryFileName: "index"` to `typedoc-plugin-markdown`.
The plugin default is `"README"`, which generates the API landing page as `README.md` — Astro
renders this at `/api/ergo/readme/` instead of `/api/ergo/`. Setting `entryFileName: "index"`
causes the entry page to generate as `index.md`, which Astro serves as the directory index at
`/api/ergo/`. This is the [recommended setting for static site generators](https://typedoc-plugin-markdown.org/docs/options/file#entryfilename).

Note: `starlight-typedoc` already sets `readme: 'none'` internally (line 31 of
`libs/typedoc.ts`), so the entry file content is the documentation index (module overview +
export listing), not the repository README.

### Version Badges

Package pages use two badge strategies:

- **Version badges:** Dynamic [shields.io](https://shields.io/badges/npm-version) npm badges
  (`img.shields.io/npm/v/{package}`) that auto-update when new versions are published.
  Pointed at the default `latest` dist-tag (no tag suffix in the URL). Previously pointed at
  `beta` when `latest` was stale; switched to default after stable releases were published
  and `latest` caught up (#147).

- **Static metadata badges:** Starlight `<Badge>` components for fixed metadata
  (`Node.js ≥ 22`, `Pure ESM`). These are hand-maintained and update only when the
  constraint changes.

The `Badge` import in each package MDX file is retained for the static badges even though the
version badge is now a standard markdown image.

### TypeScript Documentation Examples

**Tab-switched JS/TS examples.** Documentation pages use Starlight's `<Tabs>/<TabItem>`
components to offer side-by-side JavaScript and TypeScript code examples. JavaScript
remains the primary tab (selected by default); TypeScript is supplementary.

**Selective application.** Tab-switched examples are applied to priority code blocks that
most directly demonstrate typed accumulator access — not every code block on every page.
This avoids page bloat while showing TypeScript users the typed experience. Current pages:
Getting Started Quick Start, Security page API1 (authorization + object-level access
control) and API3 (validation with `additionalProperties: false`). (#21)

### TypeScript Setup Guide

**Page:** `src/content/docs/typescript.mdx` at `/typescript/`.

A standalone guide page covering TypeScript setup for both `@centralping/ergo` and
`@centralping/ergo-router`. Lives in the "Start Here" sidebar group between "Getting
Started" and the Concepts section.

**Content structure:** Prerequisites, `@types/node` installation, `tsconfig.json`
configuration (`"types": ["node"]` requirement), type imports from ergo's `./types`
subpath, typed routes with `defineGet`/`definePost` (ergo-router main entry), standalone
`compose()` with manual annotations, next-steps cross-links.

**Content source:** ergo `types/ergo.d.ts` (consumer-facing type interfaces, `./types`
subpath export in `package.json`), ergo-router `types-override/ergo-router.d.ts`
(`defineGet`/`definePost`/`defineRoute` type inference helpers), ergo-router
`lib/define-route.js` (runtime implementation).

**Maintenance trigger:** When ergo's `./types` subpath export changes (new interfaces,
renamed types), when ergo-router's `defineGet`/`definePost` type inference changes
(new accumulator mappings, changed `InferAccumulator` conditional types), or when
`@types/node` peer dependency requirements change. (#132)

### Changelog

**Plugin:** `starlight-changelogs` (by HiDeoo, a Starlight core contributor) with the
`keep-a-changelog` provider. Both ergo and ergo-router maintain `CHANGELOG.md` files in
Keep a Changelog format — the plugin parses these directly.

**Configuration:** Two layers:
1. `starlightChangelogs()` Starlight plugin in `astro.config.mjs` (handles sidebar
   generation and page routing)
2. `changelogsLoader()` content collection in `src/content.config.ts` (loads and parses
   the changelog files)

**Path resolution:** Changelog files are read from `.ergo-source/CHANGELOG.md` and
`.ergo-router-source/CHANGELOG.md` — the same source checkouts the deploy workflow already
creates for TypeDoc. No workflow changes were needed.

**URL structure:**
- `/changelog/ergo/` — ergo version list
- `/changelog/ergo/versions/{version}/` — ergo version detail
- `/changelog/ergo-router/` — ergo-router version list
- `/changelog/ergo-router/versions/{version}/` — ergo-router version detail

**Sidebar:** Auto-generated by the plugin. No manual sidebar entry needed.

**`[Unreleased]` sections:** Ignored by default (plugin behavior). Only released versions
with dates appear on the site.

**Local development:** Same constraint as TypeDoc — running `npm run dev` locally requires
the source checkouts (`.ergo-source/`, `.ergo-router-source/`) to be present for a full
build. (#73)

### Migration Guides

Hand-authored MDX migration guide pages for breaking version transitions, living in
`src/content/docs/migration/`. Migration guides are the third documentation layer —
complementing changelogs (what changed) and guide pages (how to use) with step-by-step
upgrade instructions (how to migrate).

**Content structure per migration page:** Version Summary, Prerequisites (peer dependency
versions), Breaking Changes (each with Before/After code blocks using Tabs), Cumulative
Changes from Earlier Versions (for users skipping versions), Verification Checklist.

**Naming convention:** `{from-version}-to-{to-version}.mdx` (e.g., `0.3-to-0.4.mdx`).

**Scope:** Migration guides cover breaking changes that span both ergo and ergo-router when
they must be upgraded in lockstep. Non-breaking additions are noted by reference to the
changelog, not duplicated.

**Sidebar:** Uses `autogenerate: { directory: "migration" }` for automatic page discovery.
Placed after the Changelog section — the natural flow from "what changed" to "how to
upgrade."

**Cross-references:** Package pages (ergo.mdx, ergo-router.mdx) link to migration guides
in their Links section. Getting Started "Next Steps" links to the latest migration guide.

**Maintenance trigger:** When a new minor version introduces breaking changes, create a new
migration page covering the upgrade path. Each page should be self-contained — users
upgrading across multiple versions follow the cumulative changes section. (#77)

**Dot-stripping and `slug` frontmatter.** Astro uses `github-slugger` to generate content
collection IDs from file paths, which strips dots during normalization. Migration page
filenames like `0.3-to-0.4.mdx` produce slugs `03-to-04` (dot-free), causing links to
`/migration/0.3-to-0.4/` to 404. Fix: add explicit `slug: migration/{from}-to-{to}`
frontmatter (e.g., `slug: migration/0.3-to-0.4`) to each migration page. This is the same
class of framework character-normalization issue as `@` stripping (see above), but resolved
at the source via frontmatter rather than by adapting all consuming links. Every new migration
page with dots in the filename MUST include a `slug` frontmatter field preserving the dotted
path. (#163)

**0.4-to-0.5 migration guide.** `src/content/docs/migration/0.4-to-0.5.mdx` covers the
0.5.0 release cycle: ergo-router's registration-time config validation (potentially
breaking: `body: false` + `validate.body` now throws at registration instead of 500 per
request), ergo's notable additions (validate shorthand, responseSchema, onResponse,
catchHandler 4th argument, new presets), informational items (multi-runtime CI, @types/node
optional peer dep), and cumulative changes gap-fill for two ergo 0.2.0 breaking changes
(validate no-body 500, idempotency malformed header 400) previously omitted from the
0.3-to-0.4 guide. The existing 0.3-to-0.4 guide was also updated with the same two 0.2.0
cumulative entries. Cross-links on ergo.mdx, ergo-router.mdx, and getting-started.mdx
updated to point to the latest guide (`/migration/0.4-to-0.5/`).
**Content source:** ergo CHANGELOG 0.5.0 and 0.2.0 sections, ergo-router CHANGELOG
`[Unreleased]` section, ergo-router `lib/validate-config.js` (semantic validation, lines
377-393), `lib/presets.js` (new presets, lines 24-119).
**Maintenance trigger:** When 0.6.0 breaking changes are released, create a new
`0.5-to-0.6.mdx` migration guide and update cross-links. (#106)

### Dependency Pinning

**GFM opt-in workaround (resolved).** The explicit `markdown: { gfm: true }` in
`astro.config.mjs` was required on Astro 6.x because `@astrojs/mdx@5.x` read the field
directly and Astro 6.4 moved the default into processor internals. This workaround was
removed during the Astro 7 migration — Astro 7's Sätteri processor enables GFM by default
and `@astrojs/starlight@0.41+` depends on `@astrojs/mdx@7.x`, which handles GFM correctly.
(#27, #31, #199)

**Astro semver-major ignore.** The Dependabot config ignores `semver-major` for `astro`.
Major Astro upgrades require coordinated ecosystem support — `@astrojs/starlight`,
`starlight-typedoc`, `starlight-changelogs`, and `@ascorbic/loader-utils` must all declare
compatible peer dependency ranges before the site can adopt a new major version. The Astro 7
migration (PR #199) confirmed this pattern: `@astrojs/starlight@0.41.x` required
`astro@^7.0.2`, so both packages had to be upgraded simultaneously.

**Removal condition:** Remove the `semver-major` ignore entry for `astro` only after all
Starlight ecosystem dependencies declare compatible peer dependency ranges for the target
Astro major version. (#188)

### Security Messaging

Security compliance is framed as a *design consequence* of the pipeline structure and
conservative defaults — not a separate product identity or formal certification claim.
OWASP API Security Top 10 mapping page at `/concepts/security/`. "Secure by default" language
on the landing page hero, stage cards, and "Why ergo?" page. OWASP rows in Standards
Compliance tables.

### Accumulator Reference Page

**Page:** `src/content/docs/concepts/accumulator.mdx` at `/concepts/accumulator/`.

A cross-cutting reference page that documents every middleware's contribution to the
domain accumulator and the response accumulator shape. This is the third documentation
layer alongside guide pages (per-middleware) and API reference (auto-generated types).

**Source of truth:** `ergo/types-override/ergo.d.ts` result interfaces. The reference
page documents the same 9 typed interfaces plus `ResponseAccumulator`.

**Maintenance trigger:** When middleware result types change in ergo (new fields, renamed
interfaces, new middleware with typed results), update the corresponding subsection on the
reference page. The pipeline-builder `{fn, setPath}` config objects in `ergo-router/lib/pipeline-builder.js`
are the canonical source for the config-key-to-setPath mapping table.

**Sidebar position:** Manual entry in the Concepts group, immediately after "Architecture"
(the structural companion page). (#38)

### Error Response Reference Page

**Page:** `src/content/docs/concepts/error-responses.mdx` at `/concepts/error-responses/`.

A cross-cutting reference page that documents every HTTP error response produced by ergo
middleware and ergo-router transport logic — organized by pipeline stage with RFC citations.
This is the error-response counterpart to the Accumulator Reference page (which documents
the success-path data flow).

**Content source:** Middleware guide page "Error Responses" sections (the per-middleware
tables) plus ergo-router `lib/router.js` and `lib/transport/` source for transport-level
errors.

**Maintenance trigger:** When middleware error behavior changes in ergo (new status codes,
changed conditions) or ergo-router (new transport-level rejections), update the
corresponding section on this reference page. The `cping-check-docs-currency` skill
triggers on `ergo/http/*.js` changes and covers this page.

**Sidebar position:** Manual entry in the Concepts group, immediately after "Accumulator
Reference" (the two cross-cutting reference pages are adjacent). (#52)

### Debugging & Diagnostics Reference Page

**Page:** `src/content/docs/concepts/debugging.mdx` at `/concepts/debugging/`.

A cross-cutting reference page that documents ergo's diagnostic infrastructure — startup
errors, runtime warnings, warning codes, and troubleshooting FAQ. This is the third
cross-cutting reference page alongside the Accumulator Reference and Error Response
Reference.

**Content structure:** Startup-Time Errors (registration-time validation in ergo-router,
factory-time option validation in ergo), Runtime Warnings (`process.emitWarning` with
`{type: 'ErgoWarning', code}`), Warning Code Reference (fixed codes + 18 dynamic
`ERGO_{NAME}_UNKNOWN_OPTION` codes), Pipeline Debug Mode (links to Debug Tracing recipe),
onResponse Hook Debugging (swallowed errors, catchHandler interaction), Troubleshooting FAQ
(5 entries).

**Content sources:** ergo `lib/validate-options.js` (factory-time validation, Levenshtein
suggestions), ergo `http/validate.js` (`ERGO_VALIDATE_NO_BODY`, `ERGO_VALIDATE_UNKNOWN_KEY`),
ergo-router `lib/validate-config.js` (registration-time validation, `validateKeys`,
`validateSemanticConfig`), ergo `http/handler.js` (`onResponse` hook semantics),
ergo-router `lib/auto-wrap.js` (`catchHandler` early return preventing `onResponse`).

**Maintenance trigger:** When ergo factory validation or warning codes change (new
`ERGO_*` codes, changed Levenshtein threshold), when ergo-router registration-time
validation changes (new semantic checks, changed strict/lenient behavior), or when new
FAQ-worthy error scenarios are identified, update the corresponding section.

**Sidebar position:** Manual entry in the Concepts group, immediately after "Error Response
Reference" — the natural flow from error shapes to debugging those errors. (#112)

**Error message examples.** The Registration-Time Validation section includes JS code
blocks showing the incorrect config that produces each error, paired with the exact error
text from ergo-router's `validate-config.js`. Four categories are covered: unknown config
key (Levenshtein suggestion), wrong value type, missing `execute`, and semantic
contradiction (`body: false` + `validate.body`). A lenient mode (`strict: false`)
`console.warn` example follows the ergo-router Validation subsection. A Runtime Error
Responses section shows two representative RFC 9457 Problem Details response bodies (401
Unauthorized, 422 Unprocessable Content with `details` array) and cross-links to the Error
Response Reference for the full catalog.

**Cross-references:** The ergo-router package page includes a tip `<Aside>` after the
Route Config Key Reference Annotation Keys section, cross-linking to the Registration-Time
Validation section on the debugging page.

**Content source:** ergo-router `lib/validate-config.js` error templates (lines 236,
272, 278-281, 388-391, 243 for lenient mode prefix). ergo `utils/http-errors.js`
(`toJSON()` for RFC 9457 body shape). ergo `lib/validate.js` `formatError` (lines 86-92
for `details` entry shape).

**Maintenance trigger:** When error message templates change in `validate-config.js`
(wording, context format, new categories), update the code examples and error text on
`debugging.mdx`. When the RFC 9457 body shape changes in `utils/http-errors.js` (new
fields, changed `type` URL pattern), update the runtime error examples. (#171)

### Route Config Key Reference

**Page:** `src/content/docs/packages/ergo-router.mdx` at
`/packages/ergo-router/#route-config-key-reference`.

A new h3 section on the ergo-router package page providing a unified table of all config
keys accepted in declarative route configs. Organized by category: Pipeline Keys (22
entries with accumulator path, pipeline stage, and notes), Route Option Keys (4 entries:
`send`, `noSend`, `catchHandler`, `onResponse`), and Annotation Keys (1 entry: `openapi`).

**Content source:** ergo-router `lib/validate-config.js` (`PIPELINE_KEYS`,
`ROUTE_OPTION_KEYS`, `ANNOTATION_KEYS`, `VALID_ROUTE_CONFIG_KEYS` sets) and
`lib/pipeline-builder.js` (`{fn, setPath}` config objects for accumulator path mapping).

**Maintenance trigger:** When keys are added to or removed from the `PIPELINE_KEYS`,
`ROUTE_OPTION_KEYS`, or `ANNOTATION_KEYS` sets in `validate-config.js`, update the
corresponding table on this page. (#109)

### preconditionRequired/ETag Interaction Documentation

Documentation of the relationship between `send()`'s conditional request evaluation and
the `preconditionRequired` middleware, added to three pages:

- **`precondition.mdx`** — caution Aside explaining the complementary-but-independent
  relationship, common pattern section with safe write operations example, and opt-out
  example
- **`send.mdx`** — tip Aside in the Conditional Requests section cross-referencing the
  precondition middleware for header-presence enforcement
- **`getting-started.mdx`** — note Aside about default ETag behavior and `preconditionRequired`

**Key clarification:** `etag: true` (send default) and `preconditionRequired: true` are
independent concerns — neither enables the other. `etag` generates ETags and evaluates
conditional headers when present (304/412); `preconditionRequired` enforces that conditional
headers must be sent (428).

**Maintenance trigger:** When `send()`'s conditional request evaluation semantics change in
ergo, or when `preconditionRequired` behavior changes, update all three pages. (#101)

### Conditional Requests Documentation

**Page:** `src/content/docs/packages/ergo-router.mdx` at
`/packages/ergo-router/#conditional-requests`.

A new h3 section on the ergo-router package page documenting the full conditional request
pattern — how ETag generation (send default), conditional header evaluation (304/412), and
`preconditionRequired` enforcement (428) compose together as a declarative optimistic
concurrency lifecycle. Includes config interaction table, declarative PUT/PATCH example
showing the full request lifecycle, and cross-links to the precondition and send middleware
guide pages.

**Complementary changes:**
- `precondition.mdx` frontmatter description updated for Pagefind discoverability
  (adds "conditional request", "ETag", "optimistic concurrency" terms)
- `precondition.mdx` Related Recipes section linking to testing-patterns conditional
  request section

**Content source:** ergo `http/send.js` (ETag generation + conditional evaluation),
ergo `http/precondition.js` (428 enforcement), ergo-router `lib/pipeline-builder.js`
(`preconditionRequired` resolution via `PRECONDITION_METHODS` Set).

**Maintenance trigger:** When conditional evaluation semantics change in send (new status
codes, changed ETag comparison), when precondition enforcement semantics change (new headers
accepted, changed default methods), or when `PRECONDITION_METHODS` changes in
pipeline-builder, update the ergo-router Conditional Requests section, the precondition
frontmatter description, and cross-links. (#168)

### Response Timing Documentation

**Page:** `src/content/docs/packages/ergo-router.mdx` at
`/packages/ergo-router/#response-timing`.

A new h3 section on the ergo-router package page documenting the `timing` router option —
`X-Response-Time` header injection measuring pipeline execution time. Includes options table
(`timing: false` / `true` / `{header, precision}`), example response header, what-is-measured
vs what-is-excluded documentation (transport/dispatch overhead, short-circuit responses, bare
function pipelines), custom header name tip, `responseInfo.duration` independence note, and
cross-link to the handler guide for standalone usage.

**Key clarification:** The header value is a plain millisecond string (e.g., `"12.345"`),
NOT the W3C Server-Timing format (`metric;dur=12.345`). The handler.mdx `timing` option
description was updated with a cross-link to this section.

**Content source:** ergo `lib/response-time.js` (shared primitive, `DEFAULT_TIMING_HEADER`,
`DEFAULT_TIMING_PRECISION`), ergo-router `lib/auto-wrap.js` (factory-time resolution at lines
50-58, per-request application at lines 97/153), ergo-router DECISIONS.md lines 295-305.

**Maintenance trigger:** When `applyResponseTiming` signature changes in ergo (new options,
changed default header name), or when auto-wrap timing application changes (different
measurement boundaries, new exclusions), update both the ergo-router Response Timing section
and the handler.mdx timing option description. (#102)

### Timing Collision Callout

Caution Asides added to two pages warning that the timing primitive's `res.setHeader()` call
at `writeHead` time silently overwrites any custom header with the same name:

- **`src/content/docs/middleware/handler.mdx`** — caution Aside after the Options table
  (timing option row) explaining the collision and remediation (disable timing or use a
  different header name)
- **`src/content/docs/packages/ergo-router.mdx`** (Response Timing section) — caution Aside
  after the "Custom header name" tip, explaining that the timing header replaces any
  identically-named header set earlier by custom middleware

**Root cause:** `applyResponseTiming` in ergo `lib/response-time.js` line 45 calls
`this.setHeader(header, duration)` inside the patched `writeHead`. Node.js `setHeader`
replaces any existing header with the same name. Behavior is correct by design — the
documentation gap caused developer confusion during external evaluation.

**Maintenance trigger:** When `applyResponseTiming` behavior changes in ergo (e.g., the
primitive gains collision detection, changes to `appendHeader`, or changes the default header
name), update both caution Asides on handler.mdx and ergo-router.mdx. (#134)

### Presets Documentation

**Page:** `src/content/docs/packages/ergo-router.mdx` at
`/packages/ergo-router/#presets`.

A new h3 section on the ergo-router package page documenting the `presets` named export —
pre-built router configuration objects for common API patterns. Includes per-preset inventory
tables (jsonApi, sse, webhooks, public), what-presets-do-NOT-include list, shallow spread
gotcha documentation with correct override patterns, frozen-object tip, `noSend` per-route
note for SSE, and cross-links to Config Resolution and compress middleware guide.

**Content source:** ergo-router `lib/presets.js` (preset definitions, lines 24-119).

**Maintenance trigger:** When presets are added, removed, or modified in
`ergo-router/lib/presets.js`, update the per-preset inventory tables and the
what-presets-do-NOT-include list. (#110)

### Compression Guide Enhancement

**Page:** `src/content/docs/middleware/compress.mdx` at `/middleware/compress/`.

The compress middleware guide page was expanded from a 77-line stub to comprehensive
documentation covering: expanded option descriptions (threshold path distinction, encoding
negotiation), supported algorithms table (br/gzip/deflate with Node.js APIs), threshold
behavior section (res.end vs res.write path distinction), content-type filtering section
(compressible regex pattern), content-length behavior section (header removal, chunked
transfer), expanded skip conditions list, ergo-router usage examples (defaults.compress,
per-route disable, per-route customize), opt-in clarification Aside, testing with curl
section, and RFC 9110 §8.8.1 Content-Encoding reference.

**Content source:** ergo `http/compress.js` (middleware factory, `COMPRESSIBLE_RE` regex at
line 36, `NO_COMPRESS_STATUSES` set at line 35, threshold check at lines 107-124, streaming
bypass at lines 97-105, `createCompressor` switch at lines 150-161).

**Maintenance trigger:** When compress middleware options change in ergo (new options, changed
defaults, modified compressible pattern, changed skip conditions), update the corresponding
sections on this guide page. (#107)

### Rate Limit Guide Enhancement

**Page:** `src/content/docs/middleware/rate-limit.mdx` at `/middleware/rate-limit/`.

The rate-limit middleware guide page was expanded from a 102-line stub to comprehensive
documentation covering: Custom Store section (store interface contract table with `hit(key,
windowMs) → {count, resetMs}`), MemoryStore Options sub-section (`maxKeys`, `now`), Redis
Store Example (ioredis sorted set implementation), When to Use a Shared Store decision
table, process restart caution Aside, ergo-router Configuration section (precedence table,
transport vs pipeline Aside, per-route examples for strict/relaxed/disabled), Presets
Interaction sub-section (`presets.public` transport-level rate limiting), and Related Recipes
cross-links (sub-routers, testing-patterns).

**Content source:** ergo `lib/rate-limit.js` (MemoryStore class lines 33-84, `checkRateLimit`
lines 100-111, store interface contract), `http/rate-limit.js` (pipeline middleware factory
lines 42-70), ergo-router `lib/transport/rate-limit.js` (transport adapter lines 24-46),
`lib/pipeline-builder.js` (config resolution at line 164), `lib/presets.js` (presets.public
transport.rateLimit at line 107).

**Proxy Awareness section.** A "Proxy Awareness" subsection was added documenting the
`defaultKeyGenerator` proxy-IP trap: behind a reverse proxy, `req.socket.remoteAddress` is
the proxy's IP, so all clients share a single rate-limit bucket. The section includes a
proxy-aware `keyGenerator` code example (reads `X-Forwarded-For` with fallback), security
caveats (only trust forwarded headers behind a proxy you control), scope note (applies to
both pipeline-level and transport-level rate limiting), and a `trustProxy` clarification
(`trustProxy` only affects request IDs and HSTS — not rate limiting). Cross-referenced from
the production-deployment recipe (tip Aside) and the sub-routers recipe (tip Aside).
The production-deployment recipe code examples (Standalone + ergo-router tabs) were updated
to include `keyGenerator: proxyKeyGenerator` in the `rateLimit` options, and the existing
verbose caution Aside was simplified to a tip cross-referencing this section.
**Content source:** ergo `lib/rate-limit.js` (`defaultKeyGenerator` at line 118-120),
`http/rate-limit.js` (pipeline middleware `keyGenerator` option at line 44),
ergo-router `lib/transport/rate-limit.js` (transport adapter `keyGenerator` at line 29).

**Maintenance trigger:** When rate-limit middleware options change in ergo (new options,
changed defaults, modified store interface contract), when pipeline-builder config resolution
for rateLimit changes in ergo-router, when presets are modified to include/exclude rate
limiting, or when `defaultKeyGenerator` behavior changes in ergo or transport-level rate
limiting gains built-in proxy awareness, update the corresponding sections on this guide page
and all cross-references (production-deployment recipe, sub-routers recipe). (#104, #105, #127)

### Production Deployment Recipe

**Page:** `src/content/docs/recipes/production-deployment.mdx` at `/recipes/production-deployment/`.

A recipe page documenting a complete production deployment setup combining Docker, nginx
reverse proxy, health checks, structured logging, Redis rate limiting, environment-based
configuration, and graceful shutdown. Follows the standard Problem → Solution → Explanation
recipe structure with Tabs (Standalone + ergo-router).

**Content:**
- Application Setup (full entry point with env-based config, pino logging, Redis rate limiting,
  shutdown-aware health check, graceful lifecycle)
- Dockerfile (multi-stage build with tini init process)
- docker-compose.yml (nginx + app + redis with health checks)
- nginx Configuration (TLS termination, reverse proxy headers)
- Explanation sections: Trust Proxy Configuration (with security danger Aside), Environment-Based
  Configuration (env var table), Connection Draining (timeout alignment), TLS Termination,
  Process Signals in Containers (tini vs init:true), out-of-scope items

**Cross-references:**
- Links to [Graceful Shutdown recipe](/recipes/graceful-shutdown/) for lifecycle details
- Links to [Structured Logging recipe](/recipes/structured-logging/) for log integration patterns
- Links to [rate-limit middleware guide](/middleware/rate-limit/#redis-store-example) for store contract
- Links to [ergo-router package page](/packages/ergo-router/) for trustProxy
- Graceful Shutdown recipe links back to this page (end of Explanation)
- Rate-limit middleware guide "Related Recipes" section links to this page
- Getting Started "Next Steps" includes a link
- Recipes index page includes Production Deployment row

**Content source:** ergo `http/logger.js` (log option), ergo `http/rate-limit.js` (middleware
factory), ergo `lib/rate-limit.js` (MemoryStore, store contract), ergo-router `lib/lifecycle.js`
(graceful options), ergo-router `lib/transport/request-id.js` (trustProxy behavior).

**Maintenance trigger:** When `graceful()` options change in ergo-router (new lifecycle hooks,
changed timeout behavior), when rate-limit store contract changes in ergo, when trustProxy
behavior changes in ergo-router transport, or when Docker/nginx best practices evolve
significantly, update the corresponding recipe sections. (#111)

### Secure Mutations Recipe

**Page:** `src/content/docs/recipes/secure-mutations.mdx` at `/recipes/secure-mutations/`.

A recipe page documenting the integrated CSRF + mixed auth + idempotency mutation workflow
with client-side fetch helpers and test examples. Follows the standard Problem → Solution →
Explanation recipe structure with Tabs (Standalone + ergo-router).

**Scope justification:** Cross-cutting — spans cookie middleware (Stage 1), CSRF verification
(Stage 2), authorization (Stage 2), body parsing (Stage 3), idempotency enforcement (Stage 3),
and client-side fetch wiring (browser integration). Does not belong on any single middleware
guide page because the difficulty lies in the cross-middleware interaction pattern, not in any
individual middleware's behavior.

**Content:**
- Router Setup (mixed auth with CSRF defaults + Bearer override + idempotency on mutations)
- CSRF Token Flow (GET issues cookies, POST verifies via X-CSRF-TOKEN header)
- Idempotent Mutation (`complete()`/`discard()` lifecycle in execute handler)
- Client-Side Fetch Helper (plain JS: CSRF cookie read, RFC 8941 quoting, credentials)
- Testing the Integration (node:test + undici: GET for tokens, POST with headers, replay)
- Explanation: pipeline stage ordering, CSRF auto-dispatch, idempotency fingerprint, why
  `complete()` is explicit

**Cross-references:**
- CSRF middleware guide "Related Recipes" section links to this recipe
- Idempotency middleware guide "Related Recipes" section links to this recipe (new section)
- Recipes index page includes Secure Mutations row
- Recipe cross-links to: CSRF guide, idempotency guide, mixed-auth-cors-csrf recipe,
  authorization guide, Config Resolution

**Content source:** ergo `http/csrf.js` (issue/verify methods, cookie prerequisite),
ergo `http/idempotency.js` (RFC 8941 parsing, complete/discard lifecycle),
ergo-router `lib/pipeline-builder.js` (CSRF adapter dispatch lines 122-136, idempotency
in Stage 3 after body).

**Maintenance trigger:** When CSRF dispatch logic changes in ergo-router
(`createCsrfAdapter()` in `lib/pipeline-builder.js`), when idempotency complete/discard
semantics change in ergo (`http/idempotency.js`), or when the pipeline stage ordering
changes for any of the involved middleware, update the corresponding recipe sections. (#135)

### Bidirectional Recipe/Guide Cross-Links

**Convention:** Recipe pages include a `### Related Documentation` section (h3 under
Explanation) as the last section before file end. This section contains bullet-list links
to relevant middleware guide pages and package page sections, establishing bidirectional
discovery between recipes and guides.

**Format:** Matches the precedent set by `secure-mutations.mdx`:
```
### Related Documentation

- [Title](/path/) — description
```

**Default Headers quick-reference table.** The security-headers guide page includes a
`### Default Headers` subsection after the Options table listing the 5 headers emitted
with no configuration, their exact values, and the corresponding option key. This serves
developers writing test assertions who need the expected values without reading ergo source.

**Content source:** ergo `lib/security-headers.js` DEFAULTS object (lines 33-41) for
header values. Recipe cross-link content derived from each middleware guide page.

**Maintenance trigger:** When new recipes are added that reference middleware guides, add
a `### Related Documentation` section to the recipe. When new middleware guides add a
"Related Recipes" section, verify the referenced recipe has a reciprocal backlink. When
the DEFAULTS object in `lib/security-headers.js` changes (new headers, changed values),
update the Default Headers table in the security-headers guide. (#141, #146)

### Documentation Code Style

**Convention:** JavaScript and TypeScript code blocks in MDX documentation files follow the
library Prettier config profile. This ensures copy-paste fidelity — examples pasted into
projects using the library's Prettier config do not trigger reformatting.

| Rule | Value | Source |
| ---- | ----- | ------ |
| Quotes | Single quotes (`'`) | ergo `.prettierrc` `singleQuote: true` |
| Semicolons | Required | ergo `.prettierrc` `semi: true` |
| Bracket spacing | Compact (`{key: value}`) | ergo `.prettierrc` `bracketSpacing: false` |
| Numeric separators | Underscore for ms literals >= 10,000 (`60_000`) | Readability convention |

**Scope:** Fenced JS/TS code blocks, inline code representing JS values (e.g., option table
defaults), and `import` statements in code blocks. Does NOT apply to:

- JSX/HTML attributes (`type="tip"`, `lang="js"`) — double quotes per JSX convention
- MDX component props — double quotes per JSX convention
- Content-required double quotes (e.g., RFC 8941 structured field inner strings)
- TypeScript type notation in inline code (`` `string` ``, `` `boolean` ``)

**Source of truth:** ergo `DECISIONS.md` Code Style and Tooling section, which documents
`printWidth: 100`, `singleQuote: true`, `bracketSpacing: false`, `semi: true`,
`trailingComma: "none"`. The website `DECISIONS.md` line 20 says "For library code
conventions (code style, JSDoc, testing), defer to ergo's DECISIONS.md." This decision
makes that deferral explicit for documentation code examples. (#140)

### RFC Reference Formatting

**Convention:** Every RFC mention in site MDX prose must be linked. No bare RFC numbers in
running text.

- **Whole-RFC reference:** `[RFC NNNN](https://www.rfc-editor.org/rfc/rfcNNNN)` — linked
  to the RFC landing page.
- **Section reference:** `[RFC NNNN §N.N](https://www.rfc-editor.org/rfc/rfcNNNN#section-N.N)`
  — linked with section anchor. The `§` character is used for section notation.
- **Frontmatter `description` fields:** Bare RFC numbers are acceptable (links are not
  rendered in YAML frontmatter).
- **Non-RFC standards** (OWASP, Fetch Standard, JSON:API, W3C specs): link to their
  canonical source on every prose mention.

**Reference implementations:** `error-responses.mdx` and `standards.mdx` — these pages
demonstrate the linked section notation pattern consistently. (#148)

### Getting Started — Package Selection Guidance

**Page:** `src/content/docs/getting-started.mdx` at `/getting-started/`.

The Getting Started page includes a "Which Packages Do I Need?" decision guide section
between Installation and Quick Start, and a "Using ergo Without ergo-router" standalone
example section after the Quick Start's "What Happens" table.

**Decision guide:** A comparison table explaining when to use both packages (full REST API
with routing and transport concerns) vs ergo alone (custom routing, framework integration,
composable middleware without opinions). Links to the Architecture page for the deeper
structural explanation.

**Standalone example:** A minimal `compose() + handler() + http.createServer()` example
using `{fn, setPath}` config objects with logger, accepts, url, and an inline execute function.
Demonstrates the two-accumulator model without ergo-router's opinions. Links to the
handler guide for full options documentation.

**Content source:** ergo `http/main.js` named exports (`compose`, `handler`, `logger`,
`accepts`, `url`), `utils/compose-with.js` for the two-accumulator composition model,
`http/handler.js` for the handler return type and options.

**Maintenance trigger:** When ergo's main entry exports change (renamed exports, removed
middleware) or when the `handler()` API changes, update the standalone example. (#55)

---

## 4. Project Setup

### Repository

| Field | Value |
| ----- | ----- |
| GitHub | `CentralPing/centralping.github.io` |
| URL | https://github.com/CentralPing/centralping.github.io |
| Default branch | `main` |

### Deploy Workflow

Single workflow: `.github/workflows/deploy.yml`

- **Triggers:** push to `main`, `pull_request` to `main`, `repository_dispatch` type
  `docs-update`, `workflow_dispatch`
- **Build job:** Checkout site → resolve ergo ref → checkout ergo source → install ergo deps
  (prod only, ignore scripts) → `npm ci` → `npm run build` → upload `dist/` as Pages artifact.
  Runs on all trigger events including PRs (provides the required `build` status check).
- **Deploy job:** `actions/deploy-pages@v4` to `github-pages` environment. Gated with
  `if: github.event_name != 'pull_request'` to prevent deployment from PR builds. The
  `github-pages` environment also restricts deployments to the `main` branch via deployment
  branch policy.
- **Concurrency:** group `pages`, cancel-in-progress

### CodeRabbit

Configured via `.coderabbit.yaml` in the repo root. Pro features are free for public repos.

Key configuration choices:
- **Profile: `chill`** — this is a documentation site, not security-critical library code.
  Reviews focus on significant issues (broken content, incorrect API references).
- **`tone_instructions`** — focus on content accuracy, RFC citations, and Astro/Starlight
  patterns.
- **`path_instructions`** — `src/content/**` for documentation accuracy, `src/components/**`
  for accessibility and data binding.
- **`linked_repositories`** — links to `CentralPing/ergo` and `CentralPing/ergo-router` so
  CodeRabbit can detect when documentation references may be affected by library changes.
- **`path_filters`** — excludes `public/**` (static assets) and `dist/**` (build output).
