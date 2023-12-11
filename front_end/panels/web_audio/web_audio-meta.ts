// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as WebAudio from './web_audio.js';

const UIStrings = {
  /**
   *@description Title of the WebAudio tool
   */
  webaudio: 'WebAudio',
  /**
   *@description A tags of WebAudio tool that can be searched in the command menu
   */
  audio: 'audio',
  /**
   *@description Command for showing the WebAudio tool
   */
  showWebaudio: 'Show WebAudio',
};
const str_ = i18n.i18n.registerUIStrings('panels/web_audio/web_audio-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedWebAudioModule: (typeof WebAudio|undefined);

async function loadWebAudioModule(): Promise<typeof WebAudio> {
  if (!loadedWebAudioModule) {
    loadedWebAudioModule = await import('./web_audio.js');
  }
  return loadedWebAudioModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'web-audio',
  title: i18nLazyString(UIStrings.webaudio),
  commandPrompt: i18nLazyString(UIStrings.showWebaudio),
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 100,
  async loadView() {
    const WebAudio = await loadWebAudioModule();
    return new WebAudio.WebAudioView.WebAudioView();
  },
  tags: [i18nLazyString(UIStrings.audio)],
});
