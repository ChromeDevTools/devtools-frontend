// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import {ComputedStyleModel, Events} from './ComputedStyleModel.js';

export class ElementsSidebarPane extends UI.Widget.VBox {
  _computedStyleModel: ComputedStyleModel;
  _updateThrottler: Common.Throttler.Throttler;
  _updateWhenVisible: boolean;
  constructor(delegatesFocus?: boolean) {
    super(true, delegatesFocus);
    this.element.classList.add('flex-none');
    this._computedStyleModel = new ComputedStyleModel();
    this._computedStyleModel.addEventListener(Events.ComputedStyleChanged, this.onCSSModelChanged, this);

    this._updateThrottler = new Common.Throttler.Throttler(100);
    this._updateWhenVisible = false;
  }

  node(): SDK.DOMModel.DOMNode|null {
    return this._computedStyleModel.node();
  }

  cssModel(): SDK.CSSModel.CSSModel|null {
    return this._computedStyleModel.cssModel();
  }

  computedStyleModel(): ComputedStyleModel {
    return this._computedStyleModel;
  }

  async doUpdate(): Promise<void> {
    return;
  }

  update(): void {
    this._updateWhenVisible = !this.isShowing();
    if (this._updateWhenVisible) {
      return;
    }
    this._updateThrottler.schedule(innerUpdate.bind(this));

    function innerUpdate(this: ElementsSidebarPane): Promise<void> {
      return this.isShowing() ? this.doUpdate() : Promise.resolve();
    }
  }

  wasShown(): void {
    super.wasShown();
    if (this._updateWhenVisible) {
      this.update();
    }
  }

  onCSSModelChanged(_event: Common.EventTarget.EventTargetEvent): void {
  }
}
