// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import {VBox} from './Widget.js';

export class ThrottledWidget extends VBox {
  private readonly updateThrottler: Common.Throttler.Throttler;
  private updateWhenVisible: boolean;

  constructor(isWebComponent?: boolean, timeout?: number) {
    super(isWebComponent);
    this.updateThrottler = new Common.Throttler.Throttler(timeout === undefined ? 100 : timeout);
    this.updateWhenVisible = false;
  }

  protected doUpdate(): Promise<void> {
    return Promise.resolve();
  }

  update(): void {
    this.updateWhenVisible = !this.isShowing();
    if (this.updateWhenVisible) {
      return;
    }
    void this.updateThrottler.schedule(() => {
      if (this.isShowing()) {
        return this.doUpdate();
      }
      this.updateWhenVisible = true;
      return Promise.resolve();
    });
  }

  wasShown(): void {
    super.wasShown();
    if (this.updateWhenVisible) {
      this.update();
    }
  }
}
