// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Widget} from './no-unscoped-light-dom-styles-widget.ts';

export class ShadowBase extends Widget {
  constructor() {
    super({useShadowDom: true});
  }
}
