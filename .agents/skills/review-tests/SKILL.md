---
name: review-tests
description: >-
  Reviews Chrome DevTools frontend changes in target directories (\.test\.ts$, ^test/, ^front_end/testing/),
  strictly reflecting review standards, architectural invariants, and security boundaries
  derived from historical code reviews.
---

# Chrome DevTools frontend reviewer skill: tests

This skill provides review guidance for Chrome DevTools frontend changes matching the target directories (\.test\.ts$, ^test/, ^front_end/testing/). It focuses specifically on code review verification for test changes, complementing authoring guidance in `devtools-testing-guidance` and integrating with the general review checklist in `code-review`. Every rule below recurred in at least 5 CLs from 2 distinct reviewers in historical reviews; cite the rule id in findings.

## Path group `tests` (9 rules)

### `TEST_SHARED_FIXTURE_AND_HELPER_REUSE`: Reuse canonical front_end/testing helpers and beforeEach setup without mutating cached shared fixtures
- **Severity**: WARNING
- **Why**: Duplicating mock factories (`createTarget`, `createNetworkRequest`, `mockAidaClient`, `cleanTextContent`) or mutating cached objects returned by `TraceLoader` causes cross-test state corruption and maintenance drift across the test suite.
- **Look for**: Custom inline network request or AIDA client mocks in `.test.ts` files, in-place mutation of `parsedTrace` objects returned by `TraceLoader`, or manual `div` container creation around `renderElementIntoDOM(widget)`.
- **Do not flag**: Specialized test helpers inside `front_end/testing/` that define the canonical factory implementations themselves.

### `TEST_MODULAR_HOOKS_AND_TEST_UNIVERSE`: Use lightweight modular setup hooks and TestUniverse instead of heavyweight describeWithEnvironment wrappers
- **Severity**: WARNING
- **Why**: Wrapping unit tests in `describeWithEnvironment` initializes all DevTools global singletons and settings, slowing down tests and hiding implicit global dependencies. Tests should use `TestUniverse` or granular hooks (`setupLocaleHooks()`, `setupSettingsHooks()`, `updateHostConfig()`) and never mix `TestUniverse` with `describeWithEnvironment`.
- **Look for**: `describeWithEnvironment` in unit tests that only need locale, settings, or `TestUniverse`, or suites combining `new TestUniverse()` with `describeWithEnvironment`, or direct mutation of `Root.Runtime.hostConfig` instead of `updateHostConfig(...)`.
- **Do not flag**: Integration-style panel tests that exercise legacy singleton classes not yet migrated to `Universe` dependency injection. Bot-only CLI flags, credentials, or standalone runner scripts under `test/conductor/` or `test/ai_evals/` that do not run inside the standard Mocha unit test harness.

### `TEST_DETERMINISTIC_ASYNC_SYNCHRONIZATION`: Synchronize asynchronous test assertions using lifecycle promises, expectCall, or raf instead of arbitrary setTimeout delays
- **Severity**: ERROR
- **Why**: Waiting on wall-clock `setTimeout` delays or arbitrary microtask ticks makes unit tests slow and flaky under CPU contention on CI bots. Tests should await explicit widget update promises (`await widget.updateComplete`), event promises (`target.once(...)`), stub invocation helpers (`expectCall(stub)`), or `raf()`.
- **Look for**: `new Promise(r => setTimeout(r, ...))` in `.test.ts` files, synchronous DOM assertions immediately after `requestUpdate()`, or redundant `clock.tick()` calls when no fake timers are pending.
- **Do not flag**: Tests specifically verifying debounce/throttle timer expiration using `sinon.useFakeTimers()`.

### `TEST_STRICT_ASSERTIONS_AND_LITERAL_EXPECTATIONS`: Use strict Chai and Sinon assertions against literal expected values rather than assert.isNotNull on undefined-unions or conditional guards
- **Severity**: ERROR
- **Why**: Calling `assert.isNotNull(x)` on a value typed as `T | undefined` passes when `x` is `undefined`, silently skipping assertions. Similarly, wrapping assertions inside `if (el)` or computing expected values by calling the same production helper under test allows broken code to pass.
- **Look for**: `assert.isNotNull(...)` on `container?.querySelector` / `Map.get` / `Array.find` / optional properties, `if (el) { assert... }` blocks, `assert.isTrue(spy.called)` instead of `sinon.assert.calledWith`, assertions comparing output against production formatting helpers, or case-insensitive sorting tests whose inputs already sort identically under case-sensitive ASCII comparison (e.g. `['Alpha', 'beta']` where `'A' < 'b'` in ASCII; require inputs like `['zebra', 'alpha', 'Beta']` where ASCII and case-insensitive orders differ).
- **Do not flag**: Variables whose static return type is strictly `T | null` (and never `undefined`).

### `TEST_VIEW_AND_PRESENTER_ISOLATION`: Test presenters via createViewFunctionStub and test pure view functions directly without piercing internal DOM structures
- **Severity**: WARNING
- **Why**: In DevTools' MVP (`UI.Widget` + `DEFAULT_VIEW`) architecture, presenter tests should follow the view stubbing conventions documented in [`docs/ui_engineering.md`](../../../docs/ui_engineering.md) by stubbing the view function with `createViewFunctionStub(Presenter)` and asserting on `await view.nextInput`, while view rendering tests should invoke `DEFAULT_VIEW(input, output, target)` directly or use screenshot assertions.
- **Look for**: Presenter tests instantiating full DOM trees and querying shadow/child DOM selectors to simulate clicks when the widget accepts a `view` function, or view tests instantiating full presenters just to test template markup.
- **Do not flag**: Legacy widgets that have not yet separated their template rendering into a standalone `DEFAULT_VIEW` function. Pre-existing mounted widget tests in `*.test.ts` when migrating a widget to `DEFAULT_VIEW` (keep existing end-to-end presenter + `DEFAULT_VIEW` + child-widget wiring tests intact; `createViewFunctionStub` tests may be added for new presenter logic, not used to delete existing DOM wiring coverage).

### `TEST_PUBLIC_API_AND_ENCAPSULATION`: Exercise classes through public APIs and constructor-injected dependencies rather than accessing private members or stubbing unused singletons
- **Severity**: WARNING
- **Why**: Accessing `#private` or `private` methods via `(instance as any)` or `@ts-expect-error`, piercing child component shadow roots, or stubbing `Class.instance()` when dependencies are already passed via constructor couples tests to internal implementation details.
- **Look for**: `@ts-expect-error` or `(obj as any).privateMethod()` calls in `.test.ts` files, `sinon.stub(Class, 'instance')` alongside `new UnderTest(mockInstance)`, or `child.shadowRoot.querySelector(...)` inside parent component tests.
- **Do not flag**: Intentional negative type tests documented with an explanatory `@ts-expect-error` comment.

### `TEST_SINGLE_RESPONSIBILITY_AND_CONCISENESS`: Keep each it() block focused on a single behavior and prune duplicate or obsolete tests when features change
- **Severity**: WARNING
- **Why**: Combining multiple independent user interactions or feature scenarios into a single monolithic `it()` block obscures failure root causes, while leaving duplicate or orphaned tests behind increases suite runtime and maintenance burden.
- **Look for**: `it('... and ...')` blocks testing multiple orthogonal interactions sequentially, nested `{ ... }` scope blocks inside a single `it()`, or identical test cases duplicated across `describe` blocks.
- **Do not flag**: Multi-step stateful workflow tests where earlier steps are required preconditions to reach the state under test.

### `TEST_TYPE_SAFE_MOCKS_AND_EVENTS`: Construct typed stubs and real DOM or event instances instead of casting fake objects with as unknown as
- **Severity**: WARNING
- **Why**: Casting partial object literals via `as unknown as T` or `as any` bypasses TypeScript compile-time checks, masks missing methods when interfaces evolve, and causes brittle runtime failures. Using `sinon.createStubInstance(Class)`, real DOM/Event constructors (`DataTransfer`, `ClipboardEvent`), or typed fixture helpers preserves type safety.
- **Look for**: `as unknown as` or `as any` casts on mock objects, fake DOM nodes, or synthetic events in `.test.ts` files, or untyped `querySelector(...) as HTMLElement` calls.
- **Do not flag**: Tests explicitly verifying runtime handling of malformed untrusted payloads or narrow generic type parameters inside shared `front_end/testing/` helpers.

### `TEST_CLEANUP_MUTATED_GLOBALS_AND_WIDGETS`: Restore mutated global properties and detach manually instantiated widgets or singletons in afterEach or finally blocks
- **Severity**: WARNING
- **Why**: While Sinon stubs are restored automatically, direct mutations to `window`, `globalThis`, prototypes, or `localStorage`, as well as widgets and panels instantiated with `.markAsRoot()` or `show()`, persist across tests and leak listeners unless explicitly cleaned up in `afterEach` or `try...finally`.
- **Look for**: Direct assignments to `window.*`, `globalThis.*`, `Object.prototype.*`, `localStorage.*`, or `panel.show(document.body)` in `.test.ts` files without a matching restoration or `detach()` in `afterEach` or `finally`.
- **Do not flag**: Widgets mounted directly via `renderElementIntoDOM(widget)`, which detaches widgets automatically during global harness teardown.
