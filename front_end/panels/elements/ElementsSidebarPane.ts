// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import {ComputedStyleModel, Events, type ComputedStyleChangedEvent} from './ComputedStyleModel.js';

export class ElementsSidebarPane extends UI.Widget.VBox {
  protected computedStyleModelInternal: ComputedStyleModel;
  private readonly updateThrottler: Common.Throttler.Throttler;
  private updateWhenVisible: boolean;
  constructor(delegatesFocus?: boolean) {
    super(true, delegatesFocus);
    this.element.classList.add('flex-none');
    this.computedStyleModelInternal = new ComputedStyleModel();
    this.computedStyleModelInternal.addEventListener(Events.ComputedStyleChanged, this.onCSSModelChanged, this);

    this.updateThrottler = new Common.Throttler.Throttler(100);
    this.updateWhenVisible = false;
  }

  node(): SDK.DOMModel.DOMNode|null {
    return this.computedStyleModelInternal.node();
  }

  cssModel(): SDK.CSSModel.CSSModel|null {
    return this.computedStyleModelInternal.cssModel();
  }

  computedStyleModel(): ComputedStyleModel {
    return this.computedStyleModelInternal;
  }

  async doUpdate(): Promise<void> {
    return;
  }

  update(): void {
    this.updateWhenVisible = !this.isShowing();
    if (this.updateWhenVisible) {
      return;
    }
    void this.updateThrottler.schedule(innerUpdate.bind(this));

    function innerUpdate(this: ElementsSidebarPane): Promise<void> {
      return this.isShowing() ? this.doUpdate() : Promise.resolve();
    }
  }

  override wasShown(): void {
    super.wasShown();
    if (this.updateWhenVisible) {
      this.update();
    }
  }

  onCSSModelChanged(_event: Common.EventTarget.EventTargetEvent<ComputedStyleChangedEvent|null>): void {
  }
}
