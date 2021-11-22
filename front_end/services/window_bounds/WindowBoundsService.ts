// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Legacy from '../../ui/legacy/legacy.js';

export interface WindowBoundsService {
  getDevToolsBoundingElement(): HTMLElement;
}

let windowBoundsServiceImplInstance: WindowBoundsServiceImpl;
export class WindowBoundsServiceImpl implements WindowBoundsService {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): WindowBoundsServiceImpl {
    const {forceNew} = opts;
    if (!windowBoundsServiceImplInstance || forceNew) {
      windowBoundsServiceImplInstance = new WindowBoundsServiceImpl();
    }

    return windowBoundsServiceImplInstance;
  }

  getDevToolsBoundingElement(): HTMLElement {
    return Legacy.InspectorView.InspectorView.maybeGetInspectorViewInstance()?.element || document.body;
  }
}
