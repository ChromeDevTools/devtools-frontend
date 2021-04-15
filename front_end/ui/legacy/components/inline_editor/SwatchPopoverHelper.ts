// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../../../core/common/common.js';
import * as UI from '../../legacy.js';

import {ColorSwatch} from './ColorSwatch.js';

export class SwatchPopoverHelper extends Common.ObjectWrapper.ObjectWrapper {
  _popover: UI.GlassPane.GlassPane;
  _hideProxy: () => void;
  _boundOnKeyDown: (event: KeyboardEvent) => void;
  _boundFocusOut: (event: FocusEvent) => void;
  _isHidden: boolean;
  _anchorElement: Element|null;
  _view?: UI.Widget.Widget;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _hiddenCallback?: ((arg0: boolean) => any);
  _focusRestorer?: UI.Widget.WidgetFocusRestorer;

  constructor() {
    super();
    this._popover = new UI.GlassPane.GlassPane();
    this._popover.registerRequiredCSS(
        'ui/legacy/components/inline_editor/swatchPopover.css', {enableLegacyPatching: false});
    this._popover.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
    this._popover.setMarginBehavior(UI.GlassPane.MarginBehavior.Arrow);
    this._popover.element.addEventListener('mousedown', e => e.consume(), false);

    this._hideProxy = this.hide.bind(this, true);
    this._boundOnKeyDown = this._onKeyDown.bind(this);
    this._boundFocusOut = this._onFocusOut.bind(this);
    this._isHidden = true;
    this._anchorElement = null;
  }

  _onFocusOut(event: FocusEvent): void {
    const relatedTarget = (event.relatedTarget as Element | null);
    if (this._isHidden || !relatedTarget || !this._view ||
        relatedTarget.isSelfOrDescendant(this._view.contentElement)) {
      return;
    }
    this._hideProxy();
  }

  isShowing(): boolean {
    return this._popover.isShowing();
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  show(view: UI.Widget.Widget, anchorElement: Element, hiddenCallback?: ((arg0: boolean) => any)): void {
    if (this._popover.isShowing()) {
      if (this._anchorElement === anchorElement) {
        return;
      }

      // Reopen the picker for another anchor element.
      this.hide(true);
    }

    this.dispatchEventToListeners(Events.WillShowPopover);

    this._isHidden = false;
    this._anchorElement = anchorElement;
    this._view = view;
    this._hiddenCallback = hiddenCallback;
    this.reposition();
    view.focus();

    const document = this._popover.element.ownerDocument;
    document.addEventListener('mousedown', this._hideProxy, false);
    if (document.defaultView) {
      document.defaultView.addEventListener('resize', this._hideProxy, false);
    }
    this._view.contentElement.addEventListener('keydown', this._boundOnKeyDown, false);
  }

  reposition(): void {
    // This protects against trying to reposition the popover after it has been hidden.
    if (this._isHidden || !this._view) {
      return;
    }
    // Unbind "blur" listener to avoid reenterability: |popover.show()| will hide the popover and trigger it synchronously.
    this._view.contentElement.removeEventListener('focusout', this._boundFocusOut, false);
    this._view.show(this._popover.contentElement);
    if (this._anchorElement) {
      let anchorBox = this._anchorElement.boxInWindow();
      if (ColorSwatch.isColorSwatch(this._anchorElement)) {
        const swatch = (this._anchorElement as ColorSwatch);
        if (!swatch.anchorBox) {
          return;
        }
        anchorBox = swatch.anchorBox;
      }

      this._popover.setContentAnchorBox(anchorBox);
      this._popover.show((this._anchorElement.ownerDocument as Document));
    }
    this._view.contentElement.addEventListener('focusout', this._boundFocusOut, false);
    if (!this._focusRestorer) {
      this._focusRestorer = new UI.Widget.WidgetFocusRestorer(this._view);
    }
  }

  hide(commitEdit?: boolean): void {
    if (this._isHidden) {
      return;
    }
    const document = this._popover.element.ownerDocument;
    this._isHidden = true;
    this._popover.hide();

    document.removeEventListener('mousedown', this._hideProxy, false);
    if (document.defaultView) {
      document.defaultView.removeEventListener('resize', this._hideProxy, false);
    }

    if (this._hiddenCallback) {
      this._hiddenCallback.call(null, Boolean(commitEdit));
    }

    if (this._focusRestorer) {
      this._focusRestorer.restore();
    }
    this._anchorElement = null;
    if (this._view) {
      this._view.detach();
      this._view.contentElement.removeEventListener('keydown', this._boundOnKeyDown, false);
      this._view.contentElement.removeEventListener('focusout', this._boundFocusOut, false);
      delete this._view;
    }
  }

  _onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.hide(true);
      event.consume(true);
      return;
    }
    if (event.key === 'Escape') {
      this.hide(false);
      event.consume(true);
    }
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  WillShowPopover = 'WillShowPopover',
}
