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

import {GlassPane, MarginBehavior, SizeBehavior} from './GlassPane.js';
import popoverStyles from './popover.css.legacy.js';

export class PopoverHelper {
  static createPopover = (): GlassPane => {
    const popover = new GlassPane();
    popover.registerRequiredCSS(popoverStyles);
    popover.setSizeBehavior(SizeBehavior.MeasureContent);
    popover.setMarginBehavior(MarginBehavior.Arrow);
    return popover;
  };
  private disableOnClick: boolean;
  private hasPadding: boolean;
  private getRequest: (arg0: MouseEvent) => PopoverRequest | null;
  private scheduledRequest: PopoverRequest|null;
  private hidePopoverCallback: (() => void)|null;
  private readonly container: Element;
  private showTimeout: number;
  private hideTimeout: number;
  private hidePopoverTimer: number|null;
  private showPopoverTimer: number|null;
  private readonly boundMouseDown: (event: Event) => void;
  private readonly boundMouseMove: (ev: Event) => void;
  private readonly boundMouseOut: (event: Event) => void;
  constructor(container: Element, getRequest: (arg0: MouseEvent) => PopoverRequest | null) {
    this.disableOnClick = false;
    this.hasPadding = false;
    this.getRequest = getRequest;
    this.scheduledRequest = null;
    this.hidePopoverCallback = null;
    this.container = container;
    this.showTimeout = 0;
    this.hideTimeout = 0;
    this.hidePopoverTimer = null;
    this.showPopoverTimer = null;
    this.boundMouseDown = this.mouseDown.bind(this);
    this.boundMouseMove = this.mouseMove.bind(this);
    this.boundMouseOut = this.mouseOut.bind(this);
    this.container.addEventListener('mousedown', this.boundMouseDown, false);
    this.container.addEventListener('mousemove', this.boundMouseMove, false);
    this.container.addEventListener('mouseout', this.boundMouseOut, false);
    this.setTimeout(1000);
  }

  setTimeout(showTimeout: number, hideTimeout?: number): void {
    this.showTimeout = showTimeout;
    this.hideTimeout = typeof hideTimeout === 'number' ? hideTimeout : showTimeout / 2;
  }

  setHasPadding(hasPadding: boolean): void {
    this.hasPadding = hasPadding;
  }

  setDisableOnClick(disableOnClick: boolean): void {
    this.disableOnClick = disableOnClick;
  }

  private eventInScheduledContent(ev: Event): boolean {
    const event = (ev as MouseEvent);
    return this.scheduledRequest ? this.scheduledRequest.box.contains(event.clientX, event.clientY) : false;
  }

  private mouseDown(event: Event): void {
    if (this.disableOnClick) {
      this.hidePopover();
      return;
    }
    if (this.eventInScheduledContent(event)) {
      return;
    }

    this.startHidePopoverTimer(0);
    this.stopShowPopoverTimer();
    this.startShowPopoverTimer((event as MouseEvent), 0);
  }

  private mouseMove(ev: Event): void {
    const event = (ev as MouseEvent);
    if (this.eventInScheduledContent(event)) {
      // Reschedule showing popover since mouse moved and
      // we only want to show the popover when the mouse is
      // standing still on the container for some amount of time.
      this.stopShowPopoverTimer();
      this.startShowPopoverTimer(event, this.isPopoverVisible() ? this.showTimeout * 0.6 : this.showTimeout);
      return;
    }

    this.startHidePopoverTimer(this.hideTimeout);
    this.stopShowPopoverTimer();
    if (event.buttons && this.disableOnClick) {
      return;
    }
    this.startShowPopoverTimer(event, this.isPopoverVisible() ? this.showTimeout * 0.6 : this.showTimeout);
  }

  private popoverMouseMove(_event: Event): void {
    this.stopHidePopoverTimer();
  }

  private popoverMouseOut(popover: GlassPane, ev: Event): void {
    const event = (ev as MouseEvent);
    if (!popover.isShowing()) {
      return;
    }
    const node = (event.relatedTarget as Node | null);
    if (node && !node.isSelfOrDescendant(popover.contentElement)) {
      this.startHidePopoverTimer(this.hideTimeout);
    }
  }

  private mouseOut(event: Event): void {
    if (!this.isPopoverVisible()) {
      return;
    }
    if (!this.eventInScheduledContent(event)) {
      this.startHidePopoverTimer(this.hideTimeout);
    }
  }

  private startHidePopoverTimer(timeout: number): void {
    // User has |timeout| ms to reach the popup.
    if (!this.hidePopoverCallback || this.hidePopoverTimer) {
      return;
    }

    this.hidePopoverTimer = window.setTimeout(() => {
      this.hidePopoverInternal();
      this.hidePopoverTimer = null;
    }, timeout);
  }

  private startShowPopoverTimer(event: MouseEvent, timeout: number): void {
    this.scheduledRequest = this.getRequest.call(null, event);
    if (!this.scheduledRequest) {
      return;
    }

    this.showPopoverTimer = window.setTimeout(() => {
      this.showPopoverTimer = null;
      this.stopHidePopoverTimer();
      this.hidePopoverInternal();
      const document = ((event.target as Node).ownerDocument) as Document;
      this.showPopover(document);
    }, timeout);
  }

  private stopShowPopoverTimer(): void {
    if (!this.showPopoverTimer) {
      return;
    }
    clearTimeout(this.showPopoverTimer);
    this.showPopoverTimer = null;
  }

  isPopoverVisible(): boolean {
    return Boolean(this.hidePopoverCallback);
  }

  hidePopover(): void {
    this.stopShowPopoverTimer();
    this.hidePopoverInternal();
  }

  private hidePopoverInternal(): void {
    if (!this.hidePopoverCallback) {
      return;
    }
    this.hidePopoverCallback.call(null);
    this.hidePopoverCallback = null;
  }

  private showPopover(document: Document): void {
    const popover = PopoverHelper.createPopover();
    const request = this.scheduledRequest;
    if (!request) {
      return;
    }
    void request.show.call(null, popover).then(success => {
      if (!success) {
        return;
      }

      if (this.scheduledRequest !== request) {
        if (request.hide) {
          request.hide.call(null);
        }
        return;
      }

      // This should not happen, but we hide previous popover to be on the safe side.
      if (popoverHelperInstance) {
        popoverHelperInstance.hidePopover();
      }
      popoverHelperInstance = this;

      popover.contentElement.classList.toggle('has-padding', this.hasPadding);
      popover.contentElement.addEventListener('mousemove', this.popoverMouseMove.bind(this), true);
      popover.contentElement.addEventListener('mouseout', this.popoverMouseOut.bind(this, popover), true);
      popover.setContentAnchorBox(request.box);
      popover.show(document);

      this.hidePopoverCallback = (): void => {
        if (request.hide) {
          request.hide.call(null);
        }
        popover.hide();
        popoverHelperInstance = null;
      };
    });
  }

  private stopHidePopoverTimer(): void {
    if (!this.hidePopoverTimer) {
      return;
    }
    clearTimeout(this.hidePopoverTimer);
    this.hidePopoverTimer = null;

    // We know that we reached the popup, but we might have moved over other elements.
    // Discard pending command.
    this.stopShowPopoverTimer();
  }

  dispose(): void {
    this.container.removeEventListener('mousedown', this.boundMouseDown, false);
    this.container.removeEventListener('mousemove', this.boundMouseMove, false);
    this.container.removeEventListener('mouseout', this.boundMouseOut, false);
  }
}

let popoverHelperInstance: PopoverHelper|null = null;
export interface PopoverRequest {
  box: AnchorBox;
  show: (arg0: GlassPane) => Promise<boolean>;
  hide?: (() => void);
}
