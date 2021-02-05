// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Input from './input.js';

export const UIStrings = {
  /**
    *@description Title of the inputs tool, which records user input.
    */
  inputs: 'Inputs',
  /**
    *@description Command to pause the replaying of user inputs.
    */
  pause: 'Pause',
  /**
    *@description Command to resume the replaying of user inputs.
    */
  resume: 'Resume',
  /**
    *@description Command for showing the inputs tool.
    */
  showInputs: 'Show Inputs',
  /**
    *@description Command to begin a recording of user input.
    */
  startRecording: 'Start recording',
  /**
    *@description Command to start replaying the recorded user input.
    */
  startReplaying: 'Start replaying',
  /**
    *@description Command to stop a recording of user input.
    */
  stopRecording: 'Stop recording',
};
const str_ = i18n.i18n.registerUIStrings('input/input-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedInputModule: (typeof Input|undefined);

async function loadInputModule(): Promise<typeof Input> {
  if (!loadedInputModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('input');
    loadedInputModule = await import('./input.js');
  }
  return loadedInputModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'Inputs',
  title: i18nString(UIStrings.inputs),
  commandPrompt: i18nString(UIStrings.showInputs),
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 7,
  async loadView() {
    const Input = await loadInputModule();
    return Input.InputTimeline.InputTimeline.instance();
  },
  experiment: Root.Runtime.ExperimentName.TIMELINE_REPLAY_EVENT,
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'input.toggle-recording',
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_START_RECORDING,
  toggleable: true,
  toggledIconClass: UI.ActionRegistration.IconClass.LARGEICON_STOP_RECORDING,
  toggleWithRedColor: true,
  async loadActionDelegate() {
    const Input = await loadInputModule();
    return Input.InputTimeline.ActionDelegate.instance();
  },
  category: UI.ActionRegistration.ActionCategory.INPUTS,
  experiment: Root.Runtime.ExperimentName.TIMELINE_REPLAY_EVENT,
  options: [
    {
      value: true,
      title: i18nString(UIStrings.startRecording),
    },
    {
      value: false,
      title: i18nString(UIStrings.stopRecording),
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'input.start-replaying',
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_PLAY,
  toggleable: false,
  async loadActionDelegate() {
    const Input = await loadInputModule();
    return Input.InputTimeline.ActionDelegate.instance();
  },
  category: UI.ActionRegistration.ActionCategory.INPUTS,
  experiment: Root.Runtime.ExperimentName.TIMELINE_REPLAY_EVENT,
  options: [
    {
      value: true,
      title: i18nString(UIStrings.startReplaying),
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'input.toggle-pause',
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_PAUSE,
  toggleable: true,
  toggledIconClass: UI.ActionRegistration.IconClass.LARGEICON_RESUME,
  async loadActionDelegate() {
    const Input = await loadInputModule();
    return Input.InputTimeline.ActionDelegate.instance();
  },
  category: UI.ActionRegistration.ActionCategory.INPUTS,
  experiment: Root.Runtime.ExperimentName.TIMELINE_REPLAY_EVENT,
  options: [
    {
      value: true,
      title: i18nString(UIStrings.pause),
    },
    {
      value: false,
      title: i18nString(UIStrings.resume),
    },
  ],
});
