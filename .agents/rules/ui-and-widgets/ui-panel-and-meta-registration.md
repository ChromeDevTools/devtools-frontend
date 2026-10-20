---
name: devtools/ui-and-widgets/ui-panel-and-meta-registration
rubric: design
severity: should_fix
---

**Rule.** Follow DevTools panel directory conventions and register settings and views in the appropriate *-meta.ts scope
- **Look for**: Panel-level `UI.Widget` views placed inside `panels/<panel>/components/`, internal state flags registered with user-facing titles in `*-meta.ts`, or `loadView` callbacks calling `.instance()` instead of using the passed `Universe` context.
- **Do not flag**: Standalone reusable leaf components inside `components/` or genuine user-configurable preferences.

**Why.** Panel-level `UI.Widget` views belong directly under `front_end/panels/<panel>/` (reserving `components/` for reusable leaf components), internal non-user-facing settings must use `SettingCategory.NONE` or model descriptors rather than appearing in Settings UI, and shared SDK settings belong in `sdk-meta.ts`.

## Examples

Bad:

```ts
Common.Settings.registerSettingExtension({
  settingName: 'has-shown-internal-onboarding',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  title: () => i18nString(UIStrings.onboardingShown),
});
```

Good:

```ts
Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NONE,
  settingName: 'has-shown-internal-onboarding',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});
```
