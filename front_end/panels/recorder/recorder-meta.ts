// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Recorder from './recorder.js';
import * as Actions from './recorder-actions.js';

const UIStrings = {
  /**
   *@description Title of the Recorder Panel
   */
  recorder: 'Recorder',
  /**
   *@description Title of the Recorder Panel
   */
  showRecorder: 'Show Recorder',
  /**
   *@description Title of start/stop recording action in command menu
   */
  startStopRecording: 'Start/Stop recording',
  /**
   *@description Title of create a new recording action in command menu
   */
  createRecording: 'Create a new recording',
  /**
   *@description Title of start a new recording action in command menu
   */
  replayRecording: 'Replay recording',
  /**
   * @description Title for toggling code action in command menu
   */
  toggleCode: 'Toggle code view',
};

// TODO: (crbug.com/1181019)
const RecorderCategory = 'Recorder';

const str_ = i18n.i18n.registerUIStrings(
    'panels/recorder/recorder-meta.ts',
    UIStrings,
);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(
    undefined,
    str_,
);

let loadedRecorderModule: typeof Recorder|undefined;

async function loadRecorderModule(): Promise<typeof Recorder> {
  if (!loadedRecorderModule) {
    loadedRecorderModule = await import('./recorder.js');
  }
  return loadedRecorderModule;
}

function maybeRetrieveContextTypes<T = unknown>(
    getClassCallBack: (loadedRecorderModule: typeof Recorder) => T[],
    actionId: string,
    ): T[] {
  if (loadedRecorderModule === undefined) {
    return [];
  }
  if (actionId &&
      loadedRecorderModule.RecorderPanel.RecorderPanel.instance().isActionPossible(
          actionId as Actions.RecorderActions,
          )) {
    return getClassCallBack(loadedRecorderModule);
  }
  return [];
}

(UI.ViewManager.defaultOptionsForTabs as {[key: string]: boolean}).chrome_recorder = true;

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'chrome_recorder',
  commandPrompt: i18nLazyString(UIStrings.showRecorder),
  title: i18nLazyString(UIStrings.recorder),
  order: 90,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  isPreviewFeature: true,
  async loadView() {
    const Recorder = await loadRecorderModule();
    return Recorder.RecorderPanel.RecorderPanel.instance();
  },
});

UI.ActionRegistration.registerActionExtension({
  category: RecorderCategory as UI.ActionRegistration.ActionCategory,
  actionId: Actions.RecorderActions.CreateRecording,
  title: i18nLazyString(UIStrings.createRecording),
  async loadActionDelegate() {
    const Recorder = await loadRecorderModule();
    return Recorder.RecorderPanel.ActionDelegate.instance();
  },
});

UI.ActionRegistration.registerActionExtension({
  category: RecorderCategory as UI.ActionRegistration.ActionCategory,
  actionId: Actions.RecorderActions.StartRecording,
  title: i18nLazyString(UIStrings.startStopRecording),
  contextTypes() {
    return maybeRetrieveContextTypes(
        Recorder => [Recorder.RecorderPanel.RecorderPanel],
        Actions.RecorderActions.StartRecording,
    );
  },
  async loadActionDelegate() {
    const Recorder = await loadRecorderModule();
    return Recorder.RecorderPanel.ActionDelegate.instance();
  },
  bindings: [
    {
      shortcut: 'Ctrl+E',
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
    },
    {shortcut: 'Meta+E', platform: UI.ActionRegistration.Platforms.Mac},
  ],
});

UI.ActionRegistration.registerActionExtension({
  category: RecorderCategory as UI.ActionRegistration.ActionCategory,
  actionId: Actions.RecorderActions.ReplayRecording,
  title: i18nLazyString(UIStrings.replayRecording),
  contextTypes() {
    return maybeRetrieveContextTypes(
        Recorder => [Recorder.RecorderPanel.RecorderPanel],
        Actions.RecorderActions.ReplayRecording,
    );
  },
  async loadActionDelegate() {
    const Recorder = await loadRecorderModule();
    return Recorder.RecorderPanel.ActionDelegate.instance();
  },
  bindings: [
    {
      shortcut: 'Ctrl+Enter',
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
    },
    {shortcut: 'Meta+Enter', platform: UI.ActionRegistration.Platforms.Mac},
  ],
});

UI.ActionRegistration.registerActionExtension({
  category: RecorderCategory as UI.ActionRegistration.ActionCategory,
  actionId: Actions.RecorderActions.ToggleCodeView,
  title: i18nLazyString(UIStrings.toggleCode),
  contextTypes() {
    return maybeRetrieveContextTypes(
        Recorder => [Recorder.RecorderPanel.RecorderPanel],
        Actions.RecorderActions.ToggleCodeView,
    );
  },
  async loadActionDelegate() {
    const Recorder = await loadRecorderModule();
    return Recorder.RecorderPanel.ActionDelegate.instance();
  },
  bindings: [
    {
      shortcut: 'Ctrl+B',
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
    },
    {shortcut: 'Meta+B', platform: UI.ActionRegistration.Platforms.Mac},
  ],
});
