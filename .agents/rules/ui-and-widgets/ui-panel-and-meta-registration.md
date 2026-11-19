---
name: devtools/ui-and-widgets/ui-panel-and-meta-registration
rubric: design
severity: should_fix
---

**Rule.** Follow DevTools panel directory conventions and register settings and views in the appropriate *-meta.ts scope
- **Look for**: Panel-level `UI.Widget` views placed inside `panels/<panel>/components/`, new or migrated settings calling legacy `Common.Settings.registerSettingExtension(...)` instead of defining a `Common.Settings.SettingDescriptor` in the lowest layer where used (`core/sdk/SDKSettings.ts`, `models/<mod>/<Mod>Settings.ts`, or `ui/settings/<Panel>Settings.ts`, resolved via `Common.Settings.Settings.instance().resolve(descriptor)`) paired with `SettingsUI.SettingUIRegistration.register(descriptor, {...})` in a higher-level `*-meta.ts` file when user-configurable, internal non-user-facing state flags registered in `*-meta.ts` with user-facing titles or `SettingUIRegistration.register(...)`, or `loadView` callbacks calling `.instance()` instead of using the passed `Universe` context.
- **Do not flag**: Standalone reusable leaf components inside `components/`, genuine user-configurable preferences registered via `SettingDescriptor` and `SettingsUI.SettingUIRegistration.register(descriptor, {...})`, or pre-existing untouched `Common.Settings.registerSettingExtension` entries outside the CL's scope.

**Why.** Panel-level `UI.Widget` views belong directly under `front_end/panels/<panel>/` (reserving `components/` for reusable leaf components), while splitting settings into a lower-layer `SettingDescriptor` and higher-level `SettingsUI.SettingUIRegistration.register(descriptor, {...})` metadata in `*-meta.ts` replaces legacy `registerSettingExtension`, prevents module layering cycles, and keeps internal non-user-facing state flags out of the Settings UI.

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
// In ui/settings/ExampleSettings.ts (or core/sdk/SDKSettings.ts / models/<mod>/<Mod>Settings.ts):
export const hasShownInternalOnboardingSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'has-shown-internal-onboarding',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
};

export const showTimestampsSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'example-show-timestamps',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
};

// Resolved via Common.Settings.Settings.instance().resolve(descriptor); only user-facing settings register UI in *-meta.ts:
SettingsUI.SettingUIRegistration.register(SettingsUI.ExampleSettings.showTimestampsSettingDescriptor, {
  category: Common.Settings.SettingCategory.CONSOLE,
  title: i18nLazyString(UIStrings.showTimestamps),
});
```
