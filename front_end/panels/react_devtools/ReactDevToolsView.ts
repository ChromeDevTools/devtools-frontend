// Copyright (c) Meta Platforms, Inc. and affiliates.
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../ui/legacy/legacy.js';

let instance: ReactDevToolsViewImpl;

export class ReactDevToolsViewImpl extends UI.Widget.VBox {
  static instance(): ReactDevToolsViewImpl {
    if (!instance) {
      instance = new ReactDevToolsViewImpl();
    }

    return instance;
  }

  private constructor() {
    super(true, true);
  }

  override wasShown(): void {
    super.wasShown();

    this.render();
  }

  render(): void {
    return;
  }
}
