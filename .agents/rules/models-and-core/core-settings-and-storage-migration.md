---
name: devtools/models-and-core/core-settings-and-storage-migration
rubric: correctness
severity: blocking
---

**Rule.** Guard settings and storage migrations with try/catch, preserve user preferences across renames, and clean up obsolete flags
- **Look for**: Unprotected `JSON.parse()` in `Settings.ts` or storage classes, setting key renames that discard previously stored user preferences, or experiment removals that leave orphaned `localStorage` keys behind.
- **Do not flag**: In-memory parsing of static constant JSON fixtures.

**Why.** Corrupted `localStorage` payloads or legacy setting schemas can throw during `JSON.parse` and break DevTools startup unless caught and reset. When migrating setting keys or storage formats, existing user selections must be migrated rather than overwritten.

## Examples

Bad:

```ts
const stored = JSON.parse(setting.get());
setting.set(defaultConfig); // Overwrites user customization!
```

Good:

```ts
try {
  const stored = JSON.parse(rawSettingValue);
  migratedSetting.set({...defaultConfig, ...stored});
} catch {
  setting.remove();
}
```
