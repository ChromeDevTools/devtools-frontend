// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../ui/legacy/legacy.js';

let freestylerPanelInstance: FreestylerPanel;

// TODO(b/340805362): Here be dragons.
export class FreestylerPanel extends UI.Panel.Panel {
  private constructor() {
    super('freestyler');

    this.element.textContent = 'freestyler';
  }

  static instance(opts: {
    forceNew: boolean|null,
  }|undefined = {forceNew: null}): FreestylerPanel {
    const {forceNew} = opts;
    if (!freestylerPanelInstance || forceNew) {
      freestylerPanelInstance = new FreestylerPanel();
    }

    return freestylerPanelInstance;
  }
}
