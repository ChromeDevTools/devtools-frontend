// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../core/common/common.js';
import * as Host from '../core/host/host.js';
import * as i18n from '../core/i18n/i18n.js';
import type * as Platform from '../core/platform/platform.js';
import * as Root from '../core/root/root.js';
import * as SDK from '../core/sdk/sdk.js';
import type * as Protocol from '../generated/protocol.js';
import * as Bindings from '../models/bindings/bindings.js';
import * as IssuesManager from '../models/issues_manager/issues_manager.js';
import * as Logs from '../models/logs/logs.js';
import * as Persistence from '../models/persistence/persistence.js';
import * as ProjectSettings from '../models/project_settings/project_settings.js';
import * as Workspace from '../models/workspace/workspace.js';
import type * as UIModule from '../ui/legacy/legacy.js';

// Don't import UI at this stage because it will fail without
// the environment. Instead we do the import at the end of the
// initialization phase.
// eslint-disable-next-line @typescript-eslint/naming-convention
let UI: typeof UIModule;

let uniqueTargetId = 0;

export function createTarget(
    {id, name, type = SDK.Target.Type.FRAME, parentTarget, subtype, url = 'http://example.com'}: {
      id?: Protocol.Target.TargetID,
      name?: string,
      type?: SDK.Target.Type,
      parentTarget?: SDK.Target.Target,
      subtype?: string,
      url?: string,
    } = {}) {
  if (!id) {
    if (!uniqueTargetId++) {
      id = 'test' as Protocol.Target.TargetID;
    } else {
      id = ('test' + uniqueTargetId) as Protocol.Target.TargetID;
    }
  }
  const targetManager = SDK.TargetManager.TargetManager.instance();
  return targetManager.createTarget(
      id, name ?? id, type, parentTarget ? parentTarget : null, /* sessionId=*/ parentTarget ? id : undefined,
      /* suspended=*/ false,
      /* connection=*/ undefined, {targetId: id, url, subtype} as Protocol.Target.TargetInfo);
}

function createSettingValue(
    category: Common.Settings.SettingCategory, settingName: string, defaultValue: unknown,
    settingType = Common.Settings.SettingType.BOOLEAN): Common.Settings.SettingRegistration {
  return {category, settingName, defaultValue, settingType};
}

export function stubNoopSettings() {
  sinon.stub(Common.Settings.Settings, 'instance').returns({
    createSetting: (name: string) => ({
      name,
      get: () => [],
      set: () => {},
      addChangeListener: () => {},
      removeChangeListener: () => {},
      setDisabled: () => {},
      setTitle: () => {},
      title: () => {},
      asRegExp: () => {},
      type: () => Common.Settings.SettingType.BOOLEAN,
      getAsArray: () => [],
    }),
    moduleSetting: (name: string) => ({
      name,
      get: () => [],
      set: () => {},
      addChangeListener: () => {},
      removeChangeListener: () => {},
      setDisabled: () => {},
      setTitle: () => {},
      title: () => {},
      asRegExp: () => {},
      type: () => Common.Settings.SettingType.BOOLEAN,
      getAsArray: () => [],
    }),
    createLocalSetting: (name: string) => ({
      name,
      get: () => [],
      set: () => {},
      addChangeListener: () => {},
      removeChangeListener: () => {},
      setDisabled: () => {},
      setTitle: () => {},
      title: () => {},
      asRegExp: () => {},
      type: () => Common.Settings.SettingType.BOOLEAN,
      getAsArray: () => [],
    }),
    getHostConfig: () => ({} as Root.Runtime.HostConfig),
  } as unknown as Common.Settings.Settings);
}

export function registerActions(actions: UIModule.ActionRegistration.ActionRegistration[]): void {
  for (const action of actions) {
    UI.ActionRegistration.maybeRemoveActionExtension(action.actionId);
    UI.ActionRegistration.registerActionExtension(action);
  }
  const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
  UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
}

export function registerNoopActions(actionIds: string[]): void {
  for (const actionId of actionIds) {
    UI.ActionRegistration.maybeRemoveActionExtension(actionId);
    UI.ActionRegistration.registerActionExtension({
      actionId,
      category: UI.ActionRegistration.ActionCategory.NONE,
      title: () => 'mock' as Platform.UIString.LocalizedString,
    });
  }
  const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
  UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
}

const REGISTERED_EXPERIMENTS = [
  Root.Runtime.ExperimentName.CAPTURE_NODE_CREATION_STACKS,
  Root.Runtime.ExperimentName.PROTOCOL_MONITOR,
  'timeline-show-all-events',
  'timeline-v8-runtime-call-stats',
  'timeline-invalidation-tracking',
  Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS,
  Root.Runtime.ExperimentName.HEADER_OVERRIDES,
  Root.Runtime.ExperimentName.USE_SOURCE_MAP_SCOPES,
  'font-editor',
  Root.Runtime.ExperimentName.TIMELINE_DEBUG_MODE,
  Root.Runtime.ExperimentName.FULL_ACCESSIBILITY_TREE,
  Root.Runtime.ExperimentName.TIMELINE_SHOW_POST_MESSAGE_EVENTS,
  Root.Runtime.ExperimentName.TIMELINE_ENHANCED_TRACES,
  Root.Runtime.ExperimentName.TIMELINE_COMPILED_SOURCES,
];

export async function initializeGlobalVars({reset = true} = {}) {
  await initializeGlobalLocaleVars();

  // Create the appropriate settings needed to boot.
  const settings = [
    createSettingValue(
        Common.Settings.SettingCategory.ADORNER, 'adorner-settings', [], Common.Settings.SettingType.ARRAY),
    createSettingValue(Common.Settings.SettingCategory.APPEARANCE, 'disable-paused-state-overlay', false),
    createSettingValue(
        Common.Settings.SettingCategory.APPEARANCE, 'sidebar-position', 'auto', Common.Settings.SettingType.ENUM),
    createSettingValue(Common.Settings.SettingCategory.CONSOLE, 'custom-formatters', false),
    createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'pause-on-exception-enabled', false),
    createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'pause-on-caught-exception', false),
    createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'pause-on-uncaught-exception', false),
    createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'disable-async-stack-traces', false),
    createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'breakpoints-active', true),
    createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'java-script-disabled', false),
    createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'skip-content-scripts', true),
    createSettingValue(
        Common.Settings.SettingCategory.DEBUGGER, 'automatically-ignore-list-known-third-party-scripts', true),
    createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'skip-anonymous-scripts', false),
    createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'enable-ignore-listing', true),
    createSettingValue(
        Common.Settings.SettingCategory.DEBUGGER, 'skip-stack-frames-pattern',
        '/node_modules/|^node:', Common.Settings.SettingType.REGEX),
    createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'navigator-group-by-folder', true),
    createSettingValue(Common.Settings.SettingCategory.ELEMENTS, 'dom-word-wrap', true),
    createSettingValue(Common.Settings.SettingCategory.ELEMENTS, 'show-detailed-inspect-tooltip', true),
    createSettingValue(Common.Settings.SettingCategory.ELEMENTS, 'show-html-comments', true),
    createSettingValue(Common.Settings.SettingCategory.ELEMENTS, 'show-ua-shadow-dom', false),
    createSettingValue(Common.Settings.SettingCategory.PERFORMANCE, 'annotations-hidden', false),
    createSettingValue(Common.Settings.SettingCategory.NETWORK, 'cache-disabled', false),
    createSettingValue(Common.Settings.SettingCategory.RENDERING, 'avif-format-disabled', false),
    createSettingValue(
        Common.Settings.SettingCategory.RENDERING, 'emulated-css-media', '', Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.RENDERING, 'emulated-css-media-feature-prefers-color-scheme', '',
        Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.RENDERING, 'emulated-css-media-feature-forced-colors', '',
        Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.RENDERING, 'emulated-css-media-feature-prefers-reduced-motion', '',
        Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.RENDERING, 'emulated-css-media-feature-prefers-contrast', '',
        Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.RENDERING, 'emulated-css-media-feature-prefers-reduced-data', '',
        Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.RENDERING, 'emulated-css-media-feature-prefers-reduced-transparency', '',
        Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.RENDERING, 'emulated-css-media-feature-color-gamut', '',
        Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.RENDERING, 'emulated-vision-deficiency', '', Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.RENDERING, 'emulated-os-text-scale', '', Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.RENDERING, 'emulate-auto-dark-mode', '', Common.Settings.SettingType.ENUM),
    createSettingValue(Common.Settings.SettingCategory.RENDERING, 'local-fonts-disabled', false),
    createSettingValue(Common.Settings.SettingCategory.RENDERING, 'show-paint-rects', false),
    createSettingValue(Common.Settings.SettingCategory.RENDERING, 'show-layout-shift-regions', false),
    createSettingValue(Common.Settings.SettingCategory.RENDERING, 'show-ad-highlights', false),
    createSettingValue(Common.Settings.SettingCategory.RENDERING, 'show-debug-borders', false),
    createSettingValue(Common.Settings.SettingCategory.RENDERING, 'show-fps-counter', false),
    createSettingValue(Common.Settings.SettingCategory.RENDERING, 'show-scroll-bottleneck-rects', false),
    createSettingValue(Common.Settings.SettingCategory.RENDERING, 'webp-format-disabled', false),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'allow-scroll-past-eof', true),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'css-source-maps-enabled', true),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'inline-variable-values', true),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'auto-pretty-print-minified', true),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'js-source-maps-enabled', true),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'show-whitespaces-in-editor', 'none'),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'sources.word-wrap', true),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'text-editor-autocompletion', true),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'text-editor-auto-detect-indent', false),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'text-editor-bracket-closing', true),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'text-editor-bracket-matching', true),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'text-editor-code-folding', true),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'text-editor-indent', '    '),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'text-editor-tab-moves-focus', false),
    createSettingValue(
        Common.Settings.SettingCategory.EMULATION, 'emulation.touch', '', Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.EMULATION, 'emulation.idle-detection', '', Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.EMULATION, 'emulation.cpu-pressure', '', Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.GRID, 'show-grid-line-labels', 'none', Common.Settings.SettingType.ENUM),
    createSettingValue(Common.Settings.SettingCategory.GRID, 'extend-grid-lines', true),
    createSettingValue(Common.Settings.SettingCategory.GRID, 'show-grid-areas', true),
    createSettingValue(Common.Settings.SettingCategory.GRID, 'show-grid-track-sizes', true),
    createSettingValue(
        Common.Settings.SettingCategory.NONE, 'active-keybind-set', '', Common.Settings.SettingType.ENUM),
    createSettingValue(Common.Settings.SettingCategory.NONE, 'user-shortcuts', [], Common.Settings.SettingType.ARRAY),
    createSettingValue(
        Common.Settings.SettingCategory.APPEARANCE, 'help.show-release-note', true,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(Common.Settings.SettingCategory.NETWORK, 'request-blocking-enabled', false),
    createSettingValue(Common.Settings.SettingCategory.CONSOLE, 'monitoring-xhr-enabled', false),
    createSettingValue(
        Common.Settings.SettingCategory.NONE, 'custom-network-conditions', [], Common.Settings.SettingType.ARRAY),
    createSettingValue(
        Common.Settings.SettingCategory.NONE, 'calibrated-cpu-throttling', [], Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.APPEARANCE, 'ui-theme', 'systemPreferred', Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.APPEARANCE, 'language', 'en-US', Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.PERSISTENCE, 'persistence-network-overrides-enabled', true,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.NETWORK, 'network-log.preserve-log', true, Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.NETWORK, 'network-log.record-log', true, Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.SOURCES, 'network.enable-remote-file-loading', false,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'hide-network-messages', false, Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'selected-context-filter-enabled', false,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'console-group-similar', false, Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'console-shows-cors-errors', false,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'console-timestamps-enabled', false,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'console-insights-enabled', true, Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'console-insights-onboarding-finished', true,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'console-history-autocomplete', false,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'console-autocomplete-on-enter', false,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'preserve-console-log', false, Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'console-eager-eval', false, Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'console-user-activation-eval', false,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'console-trace-expand', false, Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.PERFORMANCE, 'flamechart-selected-navigation', false,
        Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.ELEMENTS, 'show-css-property-documentation-on-hover', false,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.AI, 'ai-assistance-enabled', false, Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.AI, 'ai-annotations-enabled', false, Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.AI, 'ai-assistance-history-entries', [], Common.Settings.SettingType.ARRAY),
    createSettingValue(
        Common.Settings.SettingCategory.AI, 'ai-assistance-patching-fre-completed', false,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.AI, 'ai-code-completion-enabled', false, Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.AI, 'ai-code-completion-teaser-dismissed', false,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.MOBILE, 'emulation.show-device-outline', false,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.APPEARANCE, 'chrome-theme-colors', true, Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.PERFORMANCE, 'timeline.user-had-shortcuts-dialog-opened-once', false,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.ELEMENTS, 'show-event-listeners-for-ancestors', true,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(Common.Settings.SettingCategory.ELEMENTS, 'global-ai-button-click-count', 0),
    createSettingValue(Common.Settings.SettingCategory.ACCOUNT, 'receive-gdp-badges', false),
  ];

  Common.Settings.registerSettingsForTest(settings, reset);

  // Instantiate the storage.
  const storage = new Common.Settings.SettingsStorage({}, Common.Settings.NOOP_STORAGE, 'test');
  Common.Settings.Settings.instance(
      {forceNew: reset, syncedStorage: storage, globalStorage: storage, localStorage: storage});

  Root.Runtime.experiments.clearForTest();
  for (const experimentName of REGISTERED_EXPERIMENTS) {
    Root.Runtime.experiments.register(experimentName, '');
  }

  // Dynamically import UI after the rest of the environment is set up, otherwise it will fail.
  UI = await import('../ui/legacy/legacy.js');
  UI.ZoomManager.ZoomManager.instance(
      {forceNew: true, win: window, frontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance});

  // Initialize theme support and context menus.
  Common.Settings.Settings.instance().createSetting('uiTheme', 'systemPreferred');
  UI.UIUtils.initializeUIUtils(document);
}

export async function deinitializeGlobalVars() {
  // Remove the global SDK.
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const globalObject = (globalThis as unknown as {SDK?: unknown, ls?: unknown});
  delete globalObject.SDK;
  delete globalObject.ls;

  for (const target of SDK.TargetManager.TargetManager.instance().targets()) {
    target.dispose('deinitializeGlobalVars');
  }

  // Remove instances.
  await deinitializeGlobalLocaleVars();
  Logs.NetworkLog.NetworkLog.removeInstance();
  SDK.TargetManager.TargetManager.removeInstance();
  SDK.FrameManager.FrameManager.removeInstance();
  Root.Runtime.Runtime.removeInstance();
  Common.Settings.Settings.removeInstance();
  Common.Revealer.RevealerRegistry.removeInstance();
  Common.Console.Console.removeInstance();
  Workspace.Workspace.WorkspaceImpl.removeInstance();
  Workspace.IgnoreListManager.IgnoreListManager.removeInstance();
  Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.removeInstance();
  Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.removeInstance();
  IssuesManager.IssuesManager.IssuesManager.removeInstance();
  Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.removeInstance();
  ProjectSettings.ProjectSettingsModel.ProjectSettingsModel.removeInstance();

  Common.Settings.resetSettings();

  // Protect against the dynamic import not having happened.
  if (UI) {
    UI.ZoomManager.ZoomManager.removeInstance();
    UI.ViewManager.ViewManager.removeInstance();
    UI.ViewManager.resetViewRegistration();
    UI.Context.Context.removeInstance();
    UI.InspectorView.InspectorView.removeInstance();
    UI.ActionRegistry.ActionRegistry.reset();
  }

  Root.Runtime.experiments.clearForTest();
}

export function describeWithEnvironment(title: string, fn: (this: Mocha.Suite) => void, opts: {reset: boolean} = {
  reset: true,
}) {
  return describe(title, function() {
    before(async () => await initializeGlobalVars(opts));
    fn.call(this);
    after(async () => await deinitializeGlobalVars());
  });
}

describeWithEnvironment.only = function(title: string, fn: (this: Mocha.Suite) => void, opts: {reset: boolean} = {
  reset: true,
}) {
  // eslint-disable-next-line mocha/no-exclusive-tests
  return describe.only(title, function() {
    before(async () => await initializeGlobalVars(opts));
    fn.call(this);
    after(async () => await deinitializeGlobalVars());
  });
};
describeWithEnvironment.skip = function(title: string, fn: (this: Mocha.Suite) => void, _opts: {reset: boolean} = {
  reset: true,
}) {
  // eslint-disable-next-line rulesdir/check-test-definitions
  return describe.skip(title, function() {
    fn.call(this);
  });
};

export async function initializeGlobalLocaleVars() {
  // Expose the locale.
  i18n.DevToolsLocale.DevToolsLocale.instance({
    create: true,
    data: {
      navigatorLanguage: 'en-US',
      settingLanguage: 'en-US',
      lookupClosestDevToolsLocale: () => 'en-US',
    },
  });

  if (i18n.i18n.hasLocaleDataForTest('en-US')) {
    return;
  }

  // Load the strings from the resource file.
  try {
    await i18n.i18n.fetchAndRegisterLocaleData('en-US');
  } catch (error) {
    console.warn('EnvironmentHelper: Loading en-US locale failed', error.message);
  }
}

export function deinitializeGlobalLocaleVars() {
  i18n.DevToolsLocale.DevToolsLocale.removeInstance();
}

export function describeWithLocale(title: string, fn: (this: Mocha.Suite) => void) {
  return describe(title, function() {
    before(async () => await initializeGlobalLocaleVars());
    fn.call(this);
    after(deinitializeGlobalLocaleVars);
  });
}
describeWithLocale.only = function(title: string, fn: (this: Mocha.Suite) => void) {
  // eslint-disable-next-line mocha/no-exclusive-tests
  return describe.only(title, function() {
    before(async () => await initializeGlobalLocaleVars());
    fn.call(this);
    after(deinitializeGlobalLocaleVars);
  });
};
describeWithLocale.skip = function(title: string, fn: (this: Mocha.Suite) => void) {
  // eslint-disable-next-line rulesdir/check-test-definitions
  return describe.skip(title, function() {
    fn.call(this);
  });
};

export function createFakeSetting<T>(name: string, defaultValue: T): Common.Settings.Setting<T> {
  const storage = new Common.Settings.SettingsStorage({}, Common.Settings.NOOP_STORAGE, 'test');
  return new Common.Settings.Setting(name, defaultValue, new Common.ObjectWrapper.ObjectWrapper(), storage);
}

export function createFakeRegExpSetting(name: string, defaultValue: string): Common.Settings.RegExpSetting {
  const storage = new Common.Settings.SettingsStorage({}, Common.Settings.NOOP_STORAGE, 'test');
  return new Common.Settings.RegExpSetting(name, defaultValue, new Common.ObjectWrapper.ObjectWrapper(), storage);
}

export function setupActionRegistry() {
  before(function() {
    const actionRegistry = UI.ActionRegistry.ActionRegistry.instance();
    UI.ShortcutRegistry.ShortcutRegistry.instance({
      forceNew: true,
      actionRegistry,
    });
  });
  after(function() {
    if (UI) {
      UI.ShortcutRegistry.ShortcutRegistry.removeInstance();
      UI.ActionRegistry.ActionRegistry.removeInstance();
    }
  });
}

// This needs to be invoked within a describe block, rather than within an it() block.
export function expectConsoleLogs(expectedLogs: {warn?: string[], log?: string[], error?: string[]}) {
  const {error, warn, log} = console;
  before(() => {
    if (expectedLogs.log) {
      // eslint-disable-next-line no-console
      console.log = (...data: unknown[]) => {
        if (!expectedLogs.log?.includes(data.join(' '))) {
          log(...data);
        }
      };
    }
    if (expectedLogs.warn) {
      console.warn = (...data: unknown[]) => {
        if (!expectedLogs.warn?.includes(data.join(' '))) {
          warn(...data);
        }
      };
    }
    if (expectedLogs.error) {
      console.error = (...data: unknown[]) => {
        if (!expectedLogs.error?.includes(data.join(' '))) {
          error(...data);
        }
      };
    }
  });
  after(() => {
    if (expectedLogs.log) {
      // eslint-disable-next-line no-console
      console.log = log;
    }
    if (expectedLogs.warn) {
      console.warn = warn;
    }
    if (expectedLogs.error) {
      console.error = error;
    }
  });
}

let originalUserAgent: string;

export function setUserAgentForTesting(): void {
  originalUserAgent = window.navigator.userAgent;
  Object.defineProperty(window.navigator, 'userAgent', {value: 'Chrome/unit_test', configurable: true});
}

export function restoreUserAgentForTesting(): void {
  Object.defineProperty(window.navigator, 'userAgent', {value: originalUserAgent});
}

export function resetHostConfig() {
  for (const key of Object.keys(Root.Runtime.hostConfig)) {
    // @ts-expect-error TypeScript does not deduce the correct type
    delete Root.Runtime.hostConfig[key];
  }
}

/**
 * Update `Root.Runtime.hostConfig` for testing.
 * `Root.Runtime.hostConfig` is automatically cleaned-up between unit
 * tests.
 */
export function updateHostConfig(config: Root.Runtime.HostConfig) {
  Object.assign(Root.Runtime.hostConfig, config);
}
