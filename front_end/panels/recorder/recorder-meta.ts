// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Actions from './recorder-actions/recorder-actions.js';
import type * as Recorder from './recorder.js';

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

const viewId = 'chrome-recorder';
(UI.ViewManager.defaultOptionsForTabs as {[key: string]: boolean})[viewId] = true;
UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: viewId,
  commandPrompt: i18nLazyString(UIStrings.showRecorder),
  title: i18nLazyString(UIStrings.recorder),
  order: 90,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  async loadView() {
    const Recorder = await loadRecorderModule();
    return Recorder.RecorderPanel.RecorderPanel.instance();
  },
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.RECORDER,
  actionId: Actions.RecorderActions.CREATE_RECORDING,
  title: i18nLazyString(UIStrings.createRecording),
  async loadActionDelegate() {
    const Recorder = await loadRecorderModule();
    return new Recorder.RecorderPanel.ActionDelegate();
  },
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.RECORDER,
  actionId: Actions.RecorderActions.START_RECORDING,
  title: i18nLazyString(UIStrings.startStopRecording),
  contextTypes() {
    return maybeRetrieveContextTypes(
        Recorder => [Recorder.RecorderPanel.RecorderPanel],
        Actions.RecorderActions.START_RECORDING,
    );
  },
  async loadActionDelegate() {
    const Recorder = await loadRecorderModule();
    return new Recorder.RecorderPanel.ActionDelegate();
  },
  bindings: [
    {
      shortcut: 'Ctrl+E',
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
    },
    {shortcut: 'Meta+E', platform: UI.ActionRegistration.Platforms.MAC},
  ],
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.RECORDER,
  actionId: Actions.RecorderActions.REPLAY_RECORDING,
  title: i18nLazyString(UIStrings.replayRecording),
  contextTypes() {
    return maybeRetrieveContextTypes(
        Recorder => [Recorder.RecorderPanel.RecorderPanel],
        Actions.RecorderActions.REPLAY_RECORDING,
    );
  },
  async loadActionDelegate() {
    const Recorder = await loadRecorderModule();
    return new Recorder.RecorderPanel.ActionDelegate();
  },
  bindings: [
    {
      shortcut: 'Ctrl+Enter',
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
    },
    {shortcut: 'Meta+Enter', platform: UI.ActionRegistration.Platforms.MAC},
  ],
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.RECORDER,
  actionId: Actions.RecorderActions.TOGGLE_CODE_VIEW,
  title: i18nLazyString(UIStrings.toggleCode),
  contextTypes() {
    return maybeRetrieveContextTypes(
        Recorder => [Recorder.RecorderPanel.RecorderPanel],
        Actions.RecorderActions.TOGGLE_CODE_VIEW,
    );
  },
  async loadActionDelegate() {
    const Recorder = await loadRecorderModule();
    return new Recorder.RecorderPanel.ActionDelegate();
  },
  bindings: [
    {
      shortcut: 'Ctrl+B',
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
    },
    {shortcut: 'Meta+B', platform: UI.ActionRegistration.Platforms.MAC},
  ],
});
