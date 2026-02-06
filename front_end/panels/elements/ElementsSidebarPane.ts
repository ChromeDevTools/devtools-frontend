// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as ComputedStyle from '../../models/computed_style/computed_style.js';
import * as UI from '../../ui/legacy/legacy.js';

export class ElementsSidebarPane extends UI.Widget.VBox {
  protected computedStyleModelInternal: ComputedStyle.ComputedStyleModel.ComputedStyleModel;
  constructor(
      computedStyleModel: ComputedStyle.ComputedStyleModel.ComputedStyleModel, options: UI.Widget.WidgetOptions = {}) {
    options.useShadowDom = options.useShadowDom ?? true;
    options.classes = options.classes ?? [];
    options.classes.push('flex-none');
    super(options);
    this.computedStyleModelInternal = computedStyleModel;
    this.computedStyleModelInternal.addEventListener(
        ComputedStyle.ComputedStyleModel.Events.CSS_MODEL_CHANGED, this.onCSSModelChanged, this);
    this.computedStyleModelInternal.addEventListener(
        ComputedStyle.ComputedStyleModel.Events.COMPUTED_STYLE_CHANGED, this.onComputedStyleChanged, this);
  }

  node(): SDK.DOMModel.DOMNode|null {
    return this.computedStyleModelInternal.node;
  }

  cssModel(): SDK.CSSModel.CSSModel|null {
    return this.computedStyleModelInternal.cssModel();
  }

  computedStyleModel(): ComputedStyle.ComputedStyleModel.ComputedStyleModel {
    return this.computedStyleModelInternal;
  }

  override async performUpdate(): Promise<void> {
    return;
  }

  onCSSModelChanged(
      _event: Common.EventTarget.EventTargetEvent<ComputedStyle.ComputedStyleModel.CSSModelChangedEvent|null>): void {
  }

  onComputedStyleChanged(): void {
  }
}
