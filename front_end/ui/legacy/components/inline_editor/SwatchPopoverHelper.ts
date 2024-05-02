// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';

import {ColorSwatch} from './ColorSwatch.js';
import swatchPopoverStyles from './swatchPopover.css.js';

export class SwatchPopoverHelper extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  private readonly popover: UI.GlassPane.GlassPane;
  private readonly hideProxy: () => void;
  private readonly boundOnKeyDown: (event: KeyboardEvent) => void;
  private readonly boundFocusOut: (event: FocusEvent) => void;
  private isHidden: boolean;
  private anchorElement: Element|null;
  private view?: UI.Widget.Widget;
  private hiddenCallback?: ((arg0: boolean) => void);
  private focusRestorer?: UI.Widget.WidgetFocusRestorer;

  constructor() {
    super();
    this.popover = new UI.GlassPane.GlassPane();
    this.popover.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
    this.popover.setMarginBehavior(UI.GlassPane.MarginBehavior.Arrow);
    this.popover.element.addEventListener('mousedown', e => e.consume(), false);

    this.hideProxy = this.hide.bind(this, true);
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    this.boundFocusOut = this.onFocusOut.bind(this);
    this.isHidden = true;
    this.anchorElement = null;
  }

  private onFocusOut(event: FocusEvent): void {
    const relatedTarget = (event.relatedTarget as Element | null);
    if (this.isHidden || !relatedTarget || !this.view || relatedTarget.isSelfOrDescendant(this.view.contentElement)) {
      return;
    }
    this.hideProxy();
  }

  setAnchorElement(anchorElement: Element): void {
    this.anchorElement = anchorElement;
  }

  isShowing(view?: UI.Widget.Widget): boolean {
    return this.popover.isShowing() && ((view && this.view === view) || !view);
  }

  show(view: UI.Widget.Widget, anchorElement: Element, hiddenCallback?: ((arg0: boolean) => void)): void {
    if (this.popover.isShowing()) {
      if (this.anchorElement === anchorElement) {
        return;
      }

      // Reopen the picker for another anchor element.
      this.hide(true);
    }

    VisualLogging.setMappedParent(view.contentElement, anchorElement);
    this.popover.registerCSSFiles([swatchPopoverStyles]);
    this.dispatchEventToListeners(Events.WillShowPopover);

    this.isHidden = false;
    this.anchorElement = anchorElement;
    this.view = view;
    this.hiddenCallback = hiddenCallback;
    this.reposition();
    view.focus();

    const document = this.popover.element.ownerDocument;
    document.addEventListener('mousedown', this.hideProxy, false);
    if (document.defaultView) {
      document.defaultView.addEventListener('resize', this.hideProxy, false);
    }
    this.view.contentElement.addEventListener('keydown', this.boundOnKeyDown, false);
  }

  reposition(): void {
    // This protects against trying to reposition the popover after it has been hidden.
    if (this.isHidden || !this.view) {
      return;
    }
    // Unbind "blur" listener to avoid reenterability: |popover.show()| will hide the popover and trigger it synchronously.
    this.view.contentElement.removeEventListener('focusout', this.boundFocusOut, false);
    this.view.show(this.popover.contentElement);
    if (this.anchorElement) {
      let anchorBox = this.anchorElement.boxInWindow();
      if (ColorSwatch.isColorSwatch(this.anchorElement)) {
        const swatch = (this.anchorElement as ColorSwatch);
        if (!swatch.anchorBox) {
          return;
        }
        anchorBox = swatch.anchorBox;
      }

      this.popover.setContentAnchorBox(anchorBox);
      this.popover.show((this.anchorElement.ownerDocument as Document));
    }
    this.view.contentElement.addEventListener('focusout', this.boundFocusOut, false);
    if (!this.focusRestorer) {
      this.focusRestorer = new UI.Widget.WidgetFocusRestorer(this.view);
    }
  }

  hide(commitEdit?: boolean): void {
    if (this.isHidden) {
      return;
    }
    const document = this.popover.element.ownerDocument;
    this.isHidden = true;
    this.popover.hide();

    document.removeEventListener('mousedown', this.hideProxy, false);
    if (document.defaultView) {
      document.defaultView.removeEventListener('resize', this.hideProxy, false);
    }

    if (this.hiddenCallback) {
      this.hiddenCallback.call(null, Boolean(commitEdit));
    }

    if (this.focusRestorer) {
      this.focusRestorer.restore();
    }
    this.anchorElement = null;
    if (this.view) {
      this.view.detach();
      this.view.contentElement.removeEventListener('keydown', this.boundOnKeyDown, false);
      this.view.contentElement.removeEventListener('focusout', this.boundFocusOut, false);
      delete this.view;
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.hide(true);
      event.consume(true);
      return;
    }
    if (event.key === Platform.KeyboardUtilities.ESCAPE_KEY) {
      this.hide(false);
      event.consume(true);
    }
  }
}

export const enum Events {
  WillShowPopover = 'WillShowPopover',
}

export type EventTypes = {
  [Events.WillShowPopover]: void,
};
