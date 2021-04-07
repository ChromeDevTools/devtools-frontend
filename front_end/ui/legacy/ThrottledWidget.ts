// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import {VBox} from './Widget.js';

export class ThrottledWidget extends VBox {
  _updateThrottler: Common.Throttler.Throttler;
  _updateWhenVisible: boolean;

  constructor(isWebComponent?: boolean, timeout?: number) {
    super(isWebComponent);
    this._updateThrottler = new Common.Throttler.Throttler(timeout === undefined ? 100 : timeout);
    this._updateWhenVisible = false;
  }

  protected doUpdate(): Promise<void> {
    return Promise.resolve();
  }

  update(): void {
    this._updateWhenVisible = !this.isShowing();
    if (this._updateWhenVisible) {
      return;
    }
    this._updateThrottler.schedule(() => {
      if (this.isShowing()) {
        return this.doUpdate();
      }
      this._updateWhenVisible = true;
      return Promise.resolve();
    });
  }

  wasShown(): void {
    super.wasShown();
    if (this._updateWhenVisible) {
      this.update();
    }
  }
}
