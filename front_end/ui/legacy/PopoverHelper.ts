/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* eslint-disable rulesdir/no_underscored_properties */

import {GlassPane, MarginBehavior, SizeBehavior} from './GlassPane.js';

export class PopoverHelper {
  _disableOnClick: boolean;
  _hasPadding: boolean;
  _getRequest: (arg0: MouseEvent) => PopoverRequest | null;
  _scheduledRequest: PopoverRequest|null;
  _hidePopoverCallback: (() => void)|null;
  _container: Element;
  _showTimeout: number;
  _hideTimeout: number;
  _hidePopoverTimer: number|null;
  _showPopoverTimer: number|null;
  _boundMouseDown: (event: Event) => void;
  _boundMouseMove: (ev: Event) => void;
  _boundMouseOut: (event: Event) => void;
  constructor(container: Element, getRequest: (arg0: MouseEvent) => PopoverRequest | null) {
    this._disableOnClick = false;
    this._hasPadding = false;
    this._getRequest = getRequest;
    this._scheduledRequest = null;
    this._hidePopoverCallback = null;
    this._container = container;
    this._showTimeout = 0;
    this._hideTimeout = 0;
    this._hidePopoverTimer = null;
    this._showPopoverTimer = null;
    this._boundMouseDown = this._mouseDown.bind(this);
    this._boundMouseMove = this._mouseMove.bind(this);
    this._boundMouseOut = this._mouseOut.bind(this);
    this._container.addEventListener('mousedown', this._boundMouseDown, false);
    this._container.addEventListener('mousemove', this._boundMouseMove, false);
    this._container.addEventListener('mouseout', this._boundMouseOut, false);
    this.setTimeout(1000);
  }

  setTimeout(showTimeout: number, hideTimeout?: number): void {
    this._showTimeout = showTimeout;
    this._hideTimeout = typeof hideTimeout === 'number' ? hideTimeout : showTimeout / 2;
  }

  setHasPadding(hasPadding: boolean): void {
    this._hasPadding = hasPadding;
  }

  setDisableOnClick(disableOnClick: boolean): void {
    this._disableOnClick = disableOnClick;
  }

  _eventInScheduledContent(ev: Event): boolean {
    const event = (ev as MouseEvent);
    return this._scheduledRequest ? this._scheduledRequest.box.contains(event.clientX, event.clientY) : false;
  }

  _mouseDown(event: Event): void {
    if (this._disableOnClick) {
      this.hidePopover();
      return;
    }
    if (this._eventInScheduledContent(event)) {
      return;
    }

    this._startHidePopoverTimer(0);
    this._stopShowPopoverTimer();
    this._startShowPopoverTimer((event as MouseEvent), 0);
  }

  _mouseMove(ev: Event): void {
    const event = (ev as MouseEvent);
    // Pretend that nothing has happened.
    if (this._eventInScheduledContent(event)) {
      return;
    }

    this._startHidePopoverTimer(this._hideTimeout);
    this._stopShowPopoverTimer();
    if (event.which && this._disableOnClick) {
      return;
    }
    this._startShowPopoverTimer(event, this.isPopoverVisible() ? this._showTimeout * 0.6 : this._showTimeout);
  }

  _popoverMouseMove(_event: Event): void {
    this._stopHidePopoverTimer();
  }

  _popoverMouseOut(popover: GlassPane, ev: Event): void {
    const event = (ev as MouseEvent);
    if (!popover.isShowing()) {
      return;
    }
    const node = (event.relatedTarget as Node | null);
    if (node && !node.isSelfOrDescendant(popover.contentElement)) {
      this._startHidePopoverTimer(this._hideTimeout);
    }
  }

  _mouseOut(event: Event): void {
    if (!this.isPopoverVisible()) {
      return;
    }
    if (!this._eventInScheduledContent(event)) {
      this._startHidePopoverTimer(this._hideTimeout);
    }
  }

  _startHidePopoverTimer(timeout: number): void {
    // User has |timeout| ms to reach the popup.
    if (!this._hidePopoverCallback || this._hidePopoverTimer) {
      return;
    }

    this._hidePopoverTimer = window.setTimeout(() => {
      this._hidePopover();
      this._hidePopoverTimer = null;
    }, timeout);
  }

  _startShowPopoverTimer(event: MouseEvent, timeout: number): void {
    this._scheduledRequest = this._getRequest.call(null, event);
    if (!this._scheduledRequest) {
      return;
    }

    this._showPopoverTimer = window.setTimeout(() => {
      this._showPopoverTimer = null;
      this._stopHidePopoverTimer();
      this._hidePopover();
      const document = ((event.target as Node).ownerDocument) as Document;
      this._showPopover(document);
    }, timeout);
  }

  _stopShowPopoverTimer(): void {
    if (!this._showPopoverTimer) {
      return;
    }
    clearTimeout(this._showPopoverTimer);
    this._showPopoverTimer = null;
  }

  isPopoverVisible(): boolean {
    return Boolean(this._hidePopoverCallback);
  }

  hidePopover(): void {
    this._stopShowPopoverTimer();
    this._hidePopover();
  }

  _hidePopover(): void {
    if (!this._hidePopoverCallback) {
      return;
    }
    this._hidePopoverCallback.call(null);
    this._hidePopoverCallback = null;
  }

  _showPopover(document: Document): void {
    const popover = new GlassPane();
    popover.registerRequiredCSS('ui/legacy/popover.css');
    popover.setSizeBehavior(SizeBehavior.MeasureContent);
    popover.setMarginBehavior(MarginBehavior.Arrow);
    const request = this._scheduledRequest;
    if (!request) {
      return;
    }
    request.show.call(null, popover).then(success => {
      if (!success) {
        return;
      }

      if (this._scheduledRequest !== request) {
        if (request.hide) {
          request.hide.call(null);
        }
        return;
      }

      // This should not happen, but we hide previous popover to be on the safe side.
      if (popoverHelperInstance) {
        console.error('One popover is already visible');
        popoverHelperInstance.hidePopover();
      }
      popoverHelperInstance = this;

      popover.contentElement.classList.toggle('has-padding', this._hasPadding);
      popover.contentElement.addEventListener('mousemove', this._popoverMouseMove.bind(this), true);
      popover.contentElement.addEventListener('mouseout', this._popoverMouseOut.bind(this, popover), true);
      popover.setContentAnchorBox(request.box);
      popover.show(document);

      this._hidePopoverCallback = (): void => {
        if (request.hide) {
          request.hide.call(null);
        }
        popover.hide();
        popoverHelperInstance = null;
      };
    });
  }

  _stopHidePopoverTimer(): void {
    if (!this._hidePopoverTimer) {
      return;
    }
    clearTimeout(this._hidePopoverTimer);
    this._hidePopoverTimer = null;

    // We know that we reached the popup, but we might have moved over other elements.
    // Discard pending command.
    this._stopShowPopoverTimer();
  }

  dispose(): void {
    this._container.removeEventListener('mousedown', this._boundMouseDown, false);
    this._container.removeEventListener('mousemove', this._boundMouseMove, false);
    this._container.removeEventListener('mouseout', this._boundMouseOut, false);
  }
}

let popoverHelperInstance: PopoverHelper|null = null;
export interface PopoverRequest {
  box: AnchorBox;
  show: (arg0: GlassPane) => Promise<boolean>;
  hide?: (() => void);
}
