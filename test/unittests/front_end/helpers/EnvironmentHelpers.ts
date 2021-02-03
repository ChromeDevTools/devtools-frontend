// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../front_end/common/common.js';
import * as Host from '../../../../front_end/host/host.js';
import * as i18n from '../../../../front_end/i18n/i18n.js';
import * as Platform from '../../../../front_end/platform/platform.js';
import * as Root from '../../../../front_end/root/root.js';
import * as SDK from '../../../../front_end/sdk/sdk.js';

import type * as UIModule from '../../../../front_end/ui/ui.js';

// Don't import UI at this stage because it will fail without
// the environment. Instead we do the import at the end of the
// initialization phase.
let UI: typeof UIModule;

function exposeLSIfNecessary() {
  // SDK.ResourceTree model has to exist to avoid a circular dependency, thus it
  // needs to be placed on the global if it is not already there.
  const globalObject = (globalThis as unknown as {ls: Function});
  globalObject.ls = globalObject.ls || Common.ls;
}

// Initially expose the ls function so that imports that assume its existence
// don't fail. This side-effect will be undone as part of the deinitialize.
exposeLSIfNecessary();

// Expose the locale.
i18n.i18n.registerLocale('en-US');

// Load the strings from the resource file.
(async () => {
  const locale = i18n.i18n.registeredLocale;
  if (locale) {
    // proxied call.
    try {
      const data = await (await fetch(`locales/${locale}.json`)).json();
      if (data) {
        const localizedStrings = data;
        i18n.i18n.registerLocaleData(locale, localizedStrings);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('EnvironmentHelper: Loading en-US locale failed', error.message);
    }
  }
})();

let targetManager: SDK.SDKModel.TargetManager;

function initializeTargetManagerIfNecessary() {
  // SDK.ResourceTree model has to exist to avoid a circular dependency, thus it
  // needs to be placed on the global if it is not already there.
  const globalObject = (globalThis as unknown as {SDK: {ResourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel}});
  globalObject.SDK = globalObject.SDK || {};
  globalObject.SDK.ResourceTreeModel = globalObject.SDK.ResourceTreeModel || SDK.ResourceTreeModel.ResourceTreeModel;

  // Create the target manager.
  targetManager = targetManager || SDK.SDKModel.TargetManager.instance({forceNew: true});
}

export function createTarget({id = 'test', name = 'test', type = SDK.SDKModel.Type.Frame} = {}) {
  initializeTargetManagerIfNecessary();
  return targetManager.createTarget(id, name, type, null);
}

function createSettingValue(category: string, settingName: string, defaultValue: unknown, settingType = 'boolean'):
    Common.Settings.SettingRegistration {
  const settingCategory = category as Platform.UIString.LocalizedString;
  return {category: settingCategory, settingName, defaultValue, settingType};
}

export async function initializeGlobalVars({reset = true} = {}) {
  exposeLSIfNecessary();

  // Create the appropriate settings needed to boot.
  const extensions = [
    createSettingValue('Appearance', 'disablePausedStateOverlay', false),
    createSettingValue('Console', 'customFormatters', false),
    createSettingValue('Debugger', 'pauseOnCaughtException', false),
    createSettingValue('Debugger', 'pauseOnExceptionEnabled', false),
    createSettingValue('Debugger', 'disableAsyncStackTraces', false),
    createSettingValue('Debugger', 'breakpointsActive', true),
    createSettingValue('Debugger', 'javaScriptDisabled', false),
    createSettingValue('Debugger', 'skipContentScripts', false),
    createSettingValue('Debugger', 'skipStackFramesPattern', '', 'regex'),
    createSettingValue('Elements', 'showDetailedInspectTooltip', true),
    createSettingValue('Network', 'cacheDisabled', false),
    createSettingValue('Rendering', 'avifFormatDisabled', false),
    createSettingValue('Rendering', 'emulatedCSSMedia', '', 'enum'),
    createSettingValue('Rendering', 'emulatedCSSMediaFeaturePrefersColorScheme', '', 'enum'),
    createSettingValue('Rendering', 'emulatedCSSMediaFeaturePrefersReducedMotion', '', 'enum'),
    createSettingValue('Rendering', 'emulatedCSSMediaFeaturePrefersReducedData', '', 'enum'),
    createSettingValue('Rendering', 'emulatedCSSMediaFeatureColorGamut', '', 'enum'),
    createSettingValue('Rendering', 'emulatedVisionDeficiency', '', 'enum'),
    createSettingValue('Rendering', 'localFontsDisabled', false),
    createSettingValue('Rendering', 'showPaintRects', false),
    createSettingValue('Rendering', 'showLayoutShiftRegions', false),
    createSettingValue('Rendering', 'showAdHighlights', false),
    createSettingValue('Rendering', 'showDebugBorders', false),
    createSettingValue('Rendering', 'showFPSCounter', false),
    createSettingValue('Rendering', 'showScrollBottleneckRects', false),
    createSettingValue('Rendering', 'showHitTestBorders', false),
    createSettingValue('Rendering', 'showWebVitals', false),
    createSettingValue('Rendering', 'webpFormatDisabled', false),
    createSettingValue('Sources', 'cssSourceMapsEnabled', true),
    createSettingValue('Sources', 'jsSourceMapsEnabled', true),
    createSettingValue('Emulation', 'emulation.touch', '', 'enum'),
    createSettingValue('Emulation', 'emulation.idleDetection', '', 'enum'),
    createSettingValue('Grid', 'showGridLineLabels', true),
    createSettingValue('Grid', 'extendGridLines', true),
    createSettingValue('Grid', 'showGridAreas', true),
    createSettingValue('Grid', 'showGridTrackSizes', true),
    createSettingValue('', 'activeKeybindSet', '', 'enum'),
    createSettingValue('', 'userShortcuts', [], 'array'),
  ];

  // We instantiate a Runtime with an empty module as the settings needed to boot up are
  // provided via the Common.Settings.registerSettingExtension system. Nevertheless,
  // several unit test rely on a singleton instace so we stil need this call.
  // TODO(crbug.com/1134103): Remove this call once all extensions have been migrated.
  Root.Runtime.Runtime.instance({
    forceNew: reset,
    moduleDescriptors: [{
      name: 'Test',
      extensions: [],
      dependencies: [],
      modules: [],
      scripts: [],
      resources: [],
      condition: '',
      experiment: '',
    }],
  });

  Common.Settings.registerSettingExtengionsForTest(extensions, reset);

  // Instantiate the storage.
  const storageVals = new Map<string, string>();
  const storage = new Common.Settings.SettingsStorage(
      {}, (key, value) => storageVals.set(key, value), key => storageVals.delete(key), () => storageVals.clear(),
      'test');
  Common.Settings.Settings.instance({forceNew: reset, globalStorage: storage, localStorage: storage});

  // Dynamically import UI after the rest of the environment is set up, otherwise it will fail.
  UI = await import('../../../../front_end/ui/ui.js');
  UI.ZoomManager.ZoomManager.instance(
      {forceNew: true, win: window, frontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance});

  // Needed for any context menus which may be created - either in a test or via
  // rendering a component in the component docs server.
  UI.GlassPane.GlassPane.setContainer(document.body);
}

export async function deinitializeGlobalVars() {
  // Remove the global SDK.
  const globalObject = (globalThis as unknown as {SDK?: {}, ls?: {}});
  delete globalObject.SDK;
  delete globalObject.ls;

  // Remove instances.
  SDK.SDKModel.TargetManager.removeInstance();
  Root.Runtime.Runtime.removeInstance();
  Common.Settings.Settings.removeInstance();

  // Protect against the dynamic import not having happened.
  if (UI) {
    UI.ZoomManager.ZoomManager.removeInstance();
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
