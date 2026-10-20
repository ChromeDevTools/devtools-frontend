---
name: devtools/tests/test-modular-hooks-and-test-universe
rubric: testing
severity: should_fix
---

**Rule.** Use lightweight modular setup hooks and TestUniverse instead of heavyweight describeWithEnvironment wrappers
- **Look for**: `describeWithEnvironment` in unit tests that only need locale, settings, or `TestUniverse`, or suites combining `new TestUniverse()` with `describeWithEnvironment`, or direct mutation of `Root.Runtime.hostConfig` instead of `updateHostConfig(...)`.
- **Do not flag**: Integration-style panel tests that exercise legacy singleton classes not yet migrated to `Universe` dependency injection. Bot-only CLI flags, credentials, or standalone runner scripts under `test/conductor/` or `test/ai_evals/` that do not run inside the standard Mocha unit test harness.

**Why.** Wrapping unit tests in `describeWithEnvironment` initializes all DevTools global singletons and settings, slowing down tests and hiding implicit global dependencies. Tests should use `TestUniverse` or granular hooks (`setupLocaleHooks()`, `setupSettingsHooks()`, `updateHostConfig()`) and never mix `TestUniverse` with `describeWithEnvironment`.

## Examples

Bad:

```ts
describeWithEnvironment('MyFormatter', () => {
  it('formats localized text', () => {
    const universe = new TestUniverse();
    Object.assign(Root.Runtime.hostConfig, {devToolsFeature: {enabled: true}});
    assert.strictEqual(format(), 'Expected');
  });
});
```

Good:

```ts
describe('MyFormatter', () => {
  setupLocaleHooks();
  it('formats localized text', () => {
    updateHostConfig({devToolsFeature: {enabled: true}});
    const universe = new TestUniverse();
    assert.strictEqual(format(universe), 'Expected');
  });
});
```
