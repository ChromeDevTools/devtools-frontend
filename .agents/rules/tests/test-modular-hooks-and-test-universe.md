---
name: devtools/tests/test-modular-hooks-and-test-universe
rubric: testing
severity: should_fix
---

**Rule.** Use lightweight modular setup hooks and TestUniverse instead of heavyweight describeWithEnvironment wrappers
- **Look for**: `describeWithEnvironment` in unit tests that only need locale, runtime, settings, or `TestUniverse`, suites combining `new TestUniverse()` with `describeWithEnvironment`, direct mutation of `Root.Runtime.hostConfig` instead of `updateHostConfig(...)`, or redundant manual `Root.Runtime.hostConfig` save/restore or `resetHostConfig()` hooks in `beforeEach` or `afterEach` in Karma unit tests (`test_setup.ts`) or suites that already call `setupRuntimeHooks()`.
- **Do not flag**: Integration-style panel tests that exercise legacy singleton classes not yet migrated to `Universe` dependency injection. Bot-only CLI flags, credentials, or standalone runner scripts under `test/conductor/` or `test/ai_evals/` that do not run inside the standard Mocha unit test harness.

**Why.** Wrapping unit tests in `describeWithEnvironment` initializes all DevTools global singletons and settings, slowing down tests and hiding implicit global dependencies. Tests should use `TestUniverse` or granular hooks (`setupLocaleHooks()`, `setupRuntimeHooks()`, `setupSettingsHooks()`, `updateHostConfig()`) and never mix `TestUniverse` with `describeWithEnvironment`. In Karma unit tests, `front_end/testing/test_setup.ts` calls `resetHostConfig()` automatically before every test, whereas `test/unit/mocha-hooks.ts` in Node `foundation_unittests` does not; Node suites calling `updateHostConfig(...)` should register `setupRuntimeHooks()`, and manual `hostConfig` save/restore hooks are unnecessary when `test_setup.ts` or `setupRuntimeHooks()` is active.

## Examples

Bad:

```ts
describeWithEnvironment('MyFormatter', () => {
  it('formats localized text', () => {
    const universe = new TestUniverse();
    Object.assign(Root.Runtime.hostConfig, {devToolsConsoleInsights: {enabled: true}});
    assert.strictEqual(format(), 'Expected');
  });
});
```

Good:

```ts
describe('MyFormatter', () => {
  setupLocaleHooks();
  setupRuntimeHooks();
  it('formats localized text', () => {
    updateHostConfig({devToolsConsoleInsights: {enabled: true}});
    const universe = new TestUniverse();
    assert.strictEqual(format(universe), 'Expected');
  });
});
```
