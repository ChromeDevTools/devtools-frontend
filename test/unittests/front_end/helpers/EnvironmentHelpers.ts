// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../front_end/core/common/common.js';
import * as Host from '../../../../front_end/core/host/host.js';
import * as i18n from '../../../../front_end/core/i18n/i18n.js';
import * as Root from '../../../../front_end/core/root/root.js';
import * as SDK from '../../../../front_end/core/sdk/sdk.js';
import type * as Protocol from '../../../../front_end/generated/protocol.js';
import * as Bindings from '../../../../front_end/models/bindings/bindings.js';
import * as Persistence from '../../../../front_end/models/persistence/persistence.js';
import * as Workspace from '../../../../front_end/models/workspace/workspace.js';
import * as IssuesManager from '../../../../front_end/models/issues_manager/issues_manager.js';

import type * as UIModule from '../../../../front_end/ui/legacy/legacy.js';

// Don't import UI at this stage because it will fail without
// the environment. Instead we do the import at the end of the
// initialization phase.
let UI: typeof UIModule;

let targetManager: SDK.TargetManager.TargetManager|null;

function initializeTargetManagerIfNecessary(): SDK.TargetManager.TargetManager {
  // Create the target manager.
  targetManager = targetManager || SDK.TargetManager.TargetManager.instance({forceNew: true});
  return targetManager;
}

let uniqueTargetId = 0;

export function createTarget({id, name = 'test', type = SDK.Target.Type.Frame, parentTarget, subtype}: {
  id?: Protocol.Target.TargetID,
  name?: string,
  type?: SDK.Target.Type,
  parentTarget?: SDK.Target.Target,
  subtype?: string,
} = {}) {
  if (!id) {
    if (!uniqueTargetId++) {
      id = 'test' as Protocol.Target.TargetID;
    } else {
      id = ('test' + uniqueTargetId) as Protocol.Target.TargetID;
    }
  }
  const targetManager = initializeTargetManagerIfNecessary();
  return targetManager.createTarget(
      id, name, type, parentTarget ? parentTarget : null, /* sessionId=*/ parentTarget ? id : undefined,
      /* suspended=*/ false,
      /* connection=*/ undefined, {subtype} as Protocol.Target.TargetInfo);
}

function createSettingValue(
    category: Common.Settings.SettingCategory, settingName: string, defaultValue: unknown,
    settingType = Common.Settings.SettingType.BOOLEAN): Common.Settings.SettingRegistration {
  return {category, settingName, defaultValue, settingType};
}

export function stubNoopSettings() {
  sinon.stub(Common.Settings.Settings, 'instance').returns({
    createSetting: () => ({
      get: () => [],
      set: () => {},
      addChangeListener: () => {},
      removeChangeListener: () => {},
      setDisabled: () => {},
      setTitle: () => {},
      title: () => {},
    }),
    moduleSetting: () => ({
      get: () => [],
      set: () => {},
      addChangeListener: () => {},
      removeChangeListener: () => {},
      setDisabled: () => {},
      setTitle: () => {},
      title: () => {},
    }),
  } as unknown as Common.Settings.Settings);
}

const REGISTERED_EXPERIMENTS = [
  'bfcacheDisplayTree',
  'captureNodeCreationStacks',
  'keyboardShortcutEditor',
  'preciseChanges',
  'protocolMonitor',
  'sourcesPrettyPrint',
  'wasmDWARFDebugging',
  'timelineShowAllEvents',
  'timelineV8RuntimeCallStats',
  'timelineInvalidationTracking',
  'ignoreListJSFramesOnTimeline',
  'instrumentationBreakpoints',
  'cssTypeComponentLength',
];

export async function initializeGlobalVars({reset = true} = {}) {
  await initializeGlobalLocaleVars();

  // Create the appropriate settings needed to boot.
  const settings = [
    createSettingValue(Common.Settings.SettingCategory.APPEARANCE, 'disablePausedStateOverlay', false),
    createSettingValue(Common.Settings.SettingCategory.CONSOLE, 'customFormatters', false),
    createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'pauseOnExceptionEnabled', false),
    createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'pauseOnCaughtException', false),
    createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'pauseOnUncaughtException', false),
    createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'disableAsyncStackTraces', false),
    createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'breakpointsActive', true),
    createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'javaScriptDisabled', false),
    createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'skipContentScripts', false),
    createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'automaticallyIgnoreListKnownThirdPartyScripts', true),
    createSettingValue(Common.Settings.SettingCategory.DEBUGGER, 'enableIgnoreListing', true),
    createSettingValue(
        Common.Settings.SettingCategory.DEBUGGER, 'skipStackFramesPattern', '', Common.Settings.SettingType.REGEX),
    createSettingValue(Common.Settings.SettingCategory.ELEMENTS, 'showDetailedInspectTooltip', true),
    createSettingValue(Common.Settings.SettingCategory.NETWORK, 'cacheDisabled', false),
    createSettingValue(Common.Settings.SettingCategory.RENDERING, 'avifFormatDisabled', false),
    createSettingValue(
        Common.Settings.SettingCategory.RENDERING, 'emulatedCSSMedia', '', Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.RENDERING, 'emulatedCSSMediaFeaturePrefersColorScheme', '',
        Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.RENDERING, 'emulatedCSSMediaFeatureForcedColors', '',
        Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.RENDERING, 'emulatedCSSMediaFeaturePrefersReducedMotion', '',
        Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.RENDERING, 'emulatedCSSMediaFeaturePrefersContrast', '',
        Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.RENDERING, 'emulatedCSSMediaFeaturePrefersReducedData', '',
        Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.RENDERING, 'emulatedCSSMediaFeatureColorGamut', '',
        Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.RENDERING, 'emulatedVisionDeficiency', '', Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.RENDERING, 'emulateAutoDarkMode', '', Common.Settings.SettingType.ENUM),
    createSettingValue(Common.Settings.SettingCategory.RENDERING, 'localFontsDisabled', false),
    createSettingValue(Common.Settings.SettingCategory.RENDERING, 'showPaintRects', false),
    createSettingValue(Common.Settings.SettingCategory.RENDERING, 'showLayoutShiftRegions', false),
    createSettingValue(Common.Settings.SettingCategory.RENDERING, 'showAdHighlights', false),
    createSettingValue(Common.Settings.SettingCategory.RENDERING, 'showDebugBorders', false),
    createSettingValue(Common.Settings.SettingCategory.RENDERING, 'showFPSCounter', false),
    createSettingValue(Common.Settings.SettingCategory.RENDERING, 'showScrollBottleneckRects', false),
    createSettingValue(Common.Settings.SettingCategory.RENDERING, 'showWebVitals', false),
    createSettingValue(Common.Settings.SettingCategory.RENDERING, 'webpFormatDisabled', false),
    createSettingValue(Common.Settings.SettingCategory.RENDERING, 'jpegXlFormatDisabled', false),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'allowScrollPastEof', true),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'cssSourceMapsEnabled', true),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'inlineVariableValues', true),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'jsSourceMapsEnabled', true),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'showWhitespacesInEditor', 'none'),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'textEditorAutocompletion', true),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'textEditorAutoDetectIndent', false),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'textEditorBracketMatching', true),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'textEditorCodeFolding', true),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'textEditorIndent', '    '),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'textEditorTabMovesFocus', false),
    createSettingValue(Common.Settings.SettingCategory.SOURCES, 'domWordWrap', true),
    createSettingValue(
        Common.Settings.SettingCategory.EMULATION, 'emulation.touch', '', Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.EMULATION, 'emulation.idleDetection', '', Common.Settings.SettingType.ENUM),
    createSettingValue(Common.Settings.SettingCategory.GRID, 'showGridLineLabels', true),
    createSettingValue(Common.Settings.SettingCategory.GRID, 'extendGridLines', true),
    createSettingValue(Common.Settings.SettingCategory.GRID, 'showGridAreas', true),
    createSettingValue(Common.Settings.SettingCategory.GRID, 'showGridTrackSizes', true),
    createSettingValue(Common.Settings.SettingCategory.NONE, 'activeKeybindSet', '', Common.Settings.SettingType.ENUM),
    createSettingValue(Common.Settings.SettingCategory.NONE, 'userShortcuts', [], Common.Settings.SettingType.ARRAY),
    createSettingValue(
        Common.Settings.SettingCategory.APPEARANCE, 'help.show-release-note', true,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(Common.Settings.SettingCategory.NETWORK, 'requestBlockingEnabled', false),
    createSettingValue(Common.Settings.SettingCategory.CONSOLE, 'monitoringXHREnabled', false),
    createSettingValue(
        Common.Settings.SettingCategory.NONE, 'customNetworkConditions', [], Common.Settings.SettingType.ARRAY),
    createSettingValue(
        Common.Settings.SettingCategory.APPEARANCE, 'uiTheme', 'systemPreferred', Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.APPEARANCE, 'language', 'en-US', Common.Settings.SettingType.ENUM),
    createSettingValue(
        Common.Settings.SettingCategory.PERSISTENCE, 'persistenceNetworkOverridesEnabled', true,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.NETWORK, 'network_log.preserve-log', true, Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.NETWORK, 'network_log.record-log', true, Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.SOURCES, 'network.enable-remote-file-loading', false,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'hideNetworkMessages', false, Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'selectedContextFilterEnabled', false,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'consoleGroupSimilar', false, Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'consoleShowsCorsErrors', false, Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'consoleTimestampsEnabled', false,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'consoleHistoryAutocomplete', false,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'preserveConsoleLog', false, Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'consoleEagerEval', false, Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.CONSOLE, 'consoleUserActivationEval', false,
        Common.Settings.SettingType.BOOLEAN),
    createSettingValue(
        Common.Settings.SettingCategory.PERFORMANCE, 'showNativeFunctionsInJSProfile', false,
        Common.Settings.SettingType.BOOLEAN),
  ];

  Common.Settings.registerSettingsForTest(settings, reset);

  // Instantiate the storage.
  const storage = new Common.Settings.SettingsStorage({}, Common.Settings.NOOP_STORAGE, 'test');
  Common.Settings.Settings.instance(
      {forceNew: reset, syncedStorage: storage, globalStorage: storage, localStorage: storage});

  for (const experimentName of REGISTERED_EXPERIMENTS) {
    Root.Runtime.experiments.register(experimentName, '');
  }

  // Dynamically import UI after the rest of the environment is set up, otherwise it will fail.
  UI = await import('../../../../front_end/ui/legacy/legacy.js');
  UI.ZoomManager.ZoomManager.instance(
      {forceNew: true, win: window, frontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance});

  // Initialize theme support and context menus.
  Common.Settings.Settings.instance().createSetting('uiTheme', 'systemPreferred');
  UI.UIUtils.initializeUIUtils(document);

  initializeTargetManagerIfNecessary();
}

export async function deinitializeGlobalVars() {
  // Remove the global SDK.
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const globalObject = (globalThis as unknown as {SDK?: {}, ls?: {}});
  delete globalObject.SDK;
  delete globalObject.ls;

  Root.Runtime.experiments.clearForTest();

  for (const target of SDK.TargetManager.TargetManager.instance().targets()) {
    target.dispose('deinitializeGlobalVars');
  }
  // Remove instances.
  await deinitializeGlobalLocaleVars();
  SDK.TargetManager.TargetManager.removeInstance();
  SDK.ConsoleModel.ConsoleModel.removeInstance();
  targetManager = null;
  Root.Runtime.Runtime.removeInstance();
  Common.Settings.Settings.removeInstance();
  Workspace.Workspace.WorkspaceImpl.removeInstance();
  Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.removeInstance();
  Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.removeInstance();
  IssuesManager.IssuesManager.IssuesManager.removeInstance();
  Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.removeInstance();

  Common.Settings.resetSettings();

  // Protect against the dynamic import not having happened.
  if (UI) {
    UI.ZoomManager.ZoomManager.removeInstance();
    UI.ViewManager.ViewManager.removeInstance();
    UI.ViewManager.resetViewRegistration();
    UI.Context.Context.removeInstance();
    UI.InspectorView.InspectorView.removeInstance();
  }
}

export function describeWithEnvironment(title: string, fn: (this: Mocha.Suite) => void, opts: {reset: boolean} = {
  reset: true,
}) {
  return describe(`env-${title}`, () => {
    before(async () => await initializeGlobalVars(opts));
    after(async () => await deinitializeGlobalVars());
    describe(title, fn);
  });
}

describeWithEnvironment.only = function(title: string, fn: (this: Mocha.Suite) => void, opts: {reset: boolean} = {
  reset: true,
}) {
  // eslint-disable-next-line rulesdir/no_only
  return describe.only(`env-${title}`, () => {
    before(async () => await initializeGlobalVars(opts));
    after(async () => await deinitializeGlobalVars());
    describe(title, fn);
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

  // Load the strings from the resource file.
  const locale = i18n.DevToolsLocale.DevToolsLocale.instance().locale;
  // proxied call.
  try {
    await i18n.i18n.fetchAndRegisterLocaleData(locale);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('EnvironmentHelper: Loading en-US locale failed', error.message);
  }
}

export function deinitializeGlobalLocaleVars() {
  i18n.DevToolsLocale.DevToolsLocale.removeInstance();
}

export function describeWithLocale(title: string, fn: (this: Mocha.Suite) => void) {
  return describe(`locale-${title}`, () => {
    before(async () => await initializeGlobalLocaleVars());
    after(deinitializeGlobalLocaleVars);
    describe(title, fn);
  });
}

export function createFakeSetting<T>(name: string, defaultValue: T): Common.Settings.Setting<T> {
  const storage = new Common.Settings.SettingsStorage({}, Common.Settings.NOOP_STORAGE, 'test');
  return new Common.Settings.Setting(name, defaultValue, new Common.ObjectWrapper.ObjectWrapper(), storage);
}

export function enableFeatureForTest(feature: string): void {
  Root.Runtime.experiments.enableForTest(feature);
}
