---
name: devtools-setting-migration
description: "Workflow for splitting an existing SettingRegistration into a SettingDescriptor (placed in the lowest layer where used: core/, models/, or ui/settings/) and SettingUIDescriptor (registered in a higher-level -meta.ts file, outside of core/ and models/)."
---

# DevTools Setting Migration Guide

This skill guide describes how to migrate an existing legacy `SettingRegistration` in DevTools by splitting it into a `SettingDescriptor` (non-UI descriptor) and a `SettingUIDescriptor` (UI descriptor).

---

## Key Principles & Layer Boundaries

### 1. `SettingDescriptor` Location ("Lowest Layer")
* **Lowest Layer Rule:** A `SettingDescriptor` MUST be placed in the lowest architectural layer where the setting is used.
  * **Core / Model Settings:** If a setting is used by `core/sdk` (or `models/`), its `SettingDescriptor` should be located in `core/sdk` (or `models/`).
  * **Panel / UI Settings:** If a setting is only used by UI components or a specific panel (e.g. `panels/console/`), its `SettingDescriptor` **MUST GO INTO `ui/settings/FooSettings.ts`** (e.g. `ui/settings/ConsoleSettings.ts` where `Foo` is the panel name).
* **CRITICAL RULE — PANEL DESCRIPTORS MUST NOT BE PLACED IN `panels/`:**
  * A `SettingDescriptor` **MUST NOT** be placed inside a `panels/` directory (e.g. `panels/console/ConsoleSettings.ts`).
  * **Reason:** Panel `-meta.ts` files (e.g. `panels/console/console-meta.ts`) need to import the `SettingDescriptor` to call `SettingsUI.SettingUIRegistration.register(descriptor, uiDescriptor)`. `-meta.ts` files are loaded early and **MUST NOT import from `panels/`** (which would break lazy-loading of panel bundles). Since `ui/settings/` is in the `ui/` layer below `panels/`, `-meta.ts` files can safely import from `ui/settings/`.
* **CRITICAL RULE — MUST NOT BE IN A `-meta.ts` FILE:**
  * A `SettingDescriptor` **MUST NOT** be placed in a `-meta.ts` file.
  * **Reason:** Actual runtime code (e.g. models, panels, SDKs) needs to import the descriptor directly to call `Settings.instance().resolve(descriptor)`. Preload `-meta.ts` files are meant for lazy-loaded extension registrations and must not be imported by runtime code to avoid circular dependencies and module boundary violations.

### 2. `SettingUIDescriptor` Location (Higher-Level `-meta.ts` File)
* A `SettingUIDescriptor` defines UI-specific properties (category, title, tags, options, reload requirement, etc.).
* **Higher-Level Meta File Rule:** UI registrations **MUST BE PLACED IN A `-meta.ts` FILE ON A HIGHER LEVEL** (e.g., `entrypoints/main/main-meta.ts`, `entrypoints/inspector_main/inspector_main-meta.ts`, `panels/settings/settings-meta.ts`, or the specific panel's `-meta.ts` file).
* **CRITICAL RULE — MUST NOT REMAIN IN `core/` OR `models/`:**
  * UI descriptors **MUST NOT** remain in or be added to `-meta.ts` files under `core/` or `models/` (such as `core/sdk/sdk-meta.ts` or `models/*/*-meta.ts`).
  * **Goal:** A major goal of this migration is to completely eliminate `-meta.ts` files in `core/` and `models/`.

### 3. Resolving Settings vs `moduleSetting(name)`
* Legacy code retrieves settings using string identifiers: `Settings.instance().moduleSetting('setting-name')`.
* Refactored code should replace `moduleSetting('setting-name')` with `Settings.instance().resolve(settingDescriptor)`.

---

## Step-by-Step Migration Workflow

Given a setting name (e.g., `'preserve-console-log'` or `'network-messages'`):

### Step 1: Locate Existing Registration & Analyze Use-Sites
1. Search for the setting name in `-meta.ts` files to find its `Common.Settings.registerSettingExtension` block.
2. Search for all occurrences of `'setting-name'` or `moduleSetting('setting-name')` across the codebase to identify all use-sites.
3. Determine the **lowest layer** among all use-sites:
   * If used in `core/sdk` -> Target directory is `core/sdk/`.
   * If used in `models/` -> Target directory is `models/<module>/`.
   * If used in a panel (`panels/foo`) or UI -> Target directory is **`ui/settings/`** (file: `ui/settings/FooSettings.ts`). **NEVER place descriptors in `panels/`**.

---

### Step 2: Extract & Define `SettingDescriptor` in the Lowest Layer

#### Decision Strategy: Create vs. Update File
When placing a `SettingDescriptor` in the target directory, decide whether to create or update a file using these rules:

1. **For Panel / UI Settings (Target is `ui/settings/`)**:
   * **UPDATE**: Check if `ui/settings/FooSettings.ts` already exists (e.g., `ui/settings/ConsoleSettings.ts`). If so, add and export the `SettingDescriptor` there.
   * **CREATE**: If `ui/settings/FooSettings.ts` does not exist:
     * Create `ui/settings/FooSettings.ts`.
     * Add `FooSettings.ts` to `sources` in `ui/settings/BUILD.gn`.
     * Export `FooSettings.ts` from `ui/settings/settings.ts`.

2. **For Core / Model Settings (Target is `core/` or `models/`)**:
   * **UPDATE**: Check if a module-wide settings file exists in that directory (e.g. `core/sdk/SDKSettings.ts`, `models/workspace/WorkspaceSettings.ts`). If so, add and export the `SettingDescriptor` there.
   * **UPDATE**: If no module settings file exists and the setting is strictly used inside a single file (e.g., `ResourceTreeModel.ts`), update that `.ts` file by exporting the `SettingDescriptor` at the top.
   * **CREATE**: Otherwise, create `<Module>Settings.ts` (e.g., `core/sdk/SDKSettings.ts`), add it to `sources` in `BUILD.gn`, and export it from the module's entrypoint (`sdk.ts`).

#### Code Definition Example:
Define and export the `SettingDescriptor` in the target file:

```typescript
import type * as Common from '../core/common/common.js';

export const preserveConsoleLogSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'preserve-console-log',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};
```

*Note: For conditional settings (dependent on `hostConfig`), use `Common.Settings.ConditionalSettingDescriptor<ValueT, ReasonT>` with an `isAvailable` function.*

---

### Step 3: Move UI Registration to a Higher-Level `-meta.ts` File
If the original registration was in a `core/` or `models/` `-meta.ts` file (e.g., `core/sdk/sdk-meta.ts`), **MOVE** the UI registration to a higher-level `-meta.ts` file (e.g., `entrypoints/main/main-meta.ts` or `panels/console/console-meta.ts`).

In the higher-level `-meta.ts` file:
1. Import `SettingsUI` from `ui/settings/settings.js` (e.g., `import * as SettingsUI from '../../ui/settings/settings.js';`).
2. Import the `SettingDescriptor` (from `core/sdk/`, `models/`, or `ui/settings/`).
3. Register using `SettingsUI.SettingUIRegistration.register(...)`:

```typescript
import * as SettingsUI from '../../ui/settings/settings.js';
import * as SDK from '../../core/sdk/sdk.js';

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.preserveConsoleLogSettingDescriptor, {
  category: Common.Settings.SettingCategory.CONSOLE,
  title: i18nLazyString(UIStrings.preserveLogUponNavigation),
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.preserveLogUponNavigation),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotPreserveLogUponNavigation),
    },
  ],
});
```

4. **Delete** the old `Common.Settings.registerSettingExtension` call from the `core/` or `models/` `-meta.ts` file. (If the `-meta.ts` file becomes empty, delete the file and clean up its build references).

---

### Step 4: Update Call Sites (`moduleSetting` to `resolve`)
Find all call sites referencing the setting via `moduleSetting`:

```typescript
// BEFORE:
const setting = Common.Settings.Settings.instance().moduleSetting('preserve-console-log');

// AFTER:
import { preserveConsoleLogSettingDescriptor } from './SDKSettings.js';
...
const setting = Common.Settings.Settings.instance().resolve(preserveConsoleLogSettingDescriptor);
```

*For conditional settings, use `Common.Settings.Settings.instance().maybeResolve(descriptor)` instead of `resolve(descriptor)`.*

---

### Step 5: Update `BUILD.gn` Files and Module Entrypoints
1. If a new `.ts` file was created (e.g., `SDKSettings.ts` or `ui/settings/ConsoleSettings.ts`):
   * Add the file to `sources` in its module's `BUILD.gn`.
   * Export the file from the module's entrypoint (`sdk.ts`, `settings.ts`, etc.).
2. If a `core/` or `models/` `-meta.ts` file was deleted, remove it from `BUILD.gn` and `devtools_grd_files.gni`.
3. Verify module imports strictly follow DevTools import rules (refer to `devtools-imports` skill).

---

### Step 6: Verify Changes
1. Run `autoninja -C out/Default` to check GN build.
2. Run `npm run lint` to check style and formatting rules.
3. Run relevant unit tests for the modified module.

---

## Concrete Examples

### Example 1: Core/SDK Setting Migration (`preserve-console-log`)

#### Before Migration
Setting registered in **`front_end/core/sdk/sdk-meta.ts`** *(Legacy core meta file)*:
```typescript
Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.CONSOLE,
  storageType: Common.Settings.SettingStorageType.SYNCED,
  title: i18nLazyString(UIStrings.preserveLogUponNavigation),
  settingName: 'preserve-console-log',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  options: [...],
});
```

Setting used in **`front_end/core/sdk/ResourceTreeModel.ts`**:
```typescript
const setting = Common.Settings.Settings.instance().moduleSetting('preserve-console-log');
```

---

#### After Migration

1. **`front_end/core/sdk/SDKSettings.ts`** *(Lowest Layer in Core — NOT a `-meta.ts` file)*:
```typescript
import type * as Common from '../common/common.js';

export const preserveConsoleLogSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'preserve-console-log',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};
```

2. **`front_end/entrypoints/main/main-meta.ts`** *(Higher-Level Meta File — NOT in `core/` or `models/`)*:
```typescript
import * as SDK from '../../core/sdk/sdk.js';
import * as SettingsUI from '../../ui/settings/settings.js';

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.preserveConsoleLogSettingDescriptor, {
  category: Common.Settings.SettingCategory.CONSOLE,
  title: i18nLazyString(UIStrings.preserveLogUponNavigation),
  options: [...],
});
```

3. **`front_end/core/sdk/ResourceTreeModel.ts`** *(Call Site in `core/sdk`)*:
```typescript
import { preserveConsoleLogSettingDescriptor } from './SDKSettings.js';

const setting = Common.Settings.Settings.instance().resolve(preserveConsoleLogSettingDescriptor);
```

4. **`front_end/core/sdk/sdk-meta.ts`**:
Registration for `'preserve-console-log'` removed.

---

### Example 2: Panel UI Setting Migration (`network-messages`)

#### Before Migration
Setting registered in **`front_end/panels/console/console-meta.ts`**:
```typescript
Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.CONSOLE,
  storageType: Common.Settings.SettingStorageType.SYNCED,
  title: i18nLazyString(UIStrings.networkMessages),
  settingName: 'network-messages',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  options: [...],
});
```

Setting used in **`front_end/panels/console/ConsoleView.ts`**:
```typescript
const setting = Common.Settings.Settings.instance().moduleSetting('network-messages');
```

---

#### After Migration

1. **`front_end/ui/settings/ConsoleSettings.ts`** *(Lowest Layer for UI/Panel Descriptor — NOT in `panels/console/`!)*:
```typescript
import type * as Common from '../../core/common/common.js';

export const networkMessagesSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'network-messages',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};
```

2. **`front_end/panels/console/console-meta.ts`** *(Panel Meta File — Imports Descriptor from `ui/settings/`)*:
```typescript
import * as SettingsUI from '../../ui/settings/settings.js';

SettingsUI.SettingUIRegistration.register(SettingsUI.ConsoleSettings.networkMessagesSettingDescriptor, {
  category: Common.Settings.SettingCategory.CONSOLE,
  title: i18nLazyString(UIStrings.networkMessages),
  options: [...],
});
```

3. **`front_end/panels/console/ConsoleView.ts`** *(Call Site in `panels/console`)*:
```typescript
import * as SettingsUI from '../../ui/settings/settings.js';

const setting = Common.Settings.Settings.instance().resolve(SettingsUI.ConsoleSettings.networkMessagesSettingDescriptor);
```

---

## Interface Reference Summary

### `SettingDescriptor<T>`
Defined in `core/common/Settings.ts`:
* `name: string`: Unique setting name (kebab-case).
* `type: SettingType`: `BOOLEAN`, `ENUM`, `ARRAY`, or `REGEX`.
* `defaultValue: ValueT | ((hostConfig: HostConfig) => ValueT)`: Default setting value.
* `storageType?: SettingStorageType`: `SYNCED`, `LOCAL`, `GLOBAL`, or `SESSION`.

### `SettingUIDescriptor`
Defined in `ui/settings/SettingUIRegistration.ts`:
* `category?: SettingCategory`: Category under which setting is listed in Settings UI.
* `order?: number`: Sorting order.
* `title?: () => LocalizedString`: Title string displayed in Settings UI.
* `tags?: Array<() => LocalizedString>`: Search tags for Command Menu.
* `options?: SettingExtensionOption[]`: Enum / boolean option descriptions.
* `reloadRequired?: boolean`: Whether setting change requires DevTools reload.
* `deprecationNotice?: { disabled: boolean, warning: () => LocalizedString, experiment?: string }`: Deprecation notice.
* `learnMore?: LearnMore`: Help link or tooltip info.
