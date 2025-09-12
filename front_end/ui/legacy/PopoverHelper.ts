// Copyright 2009 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as VisualLogging from '../visual_logging/visual_logging.js';

import {GlassPane, MarginBehavior, SizeBehavior} from './GlassPane.js';
import popoverStyles from './popover.css.js';

export class PopoverHelper {
  static createPopover = (jslogContext?: string): GlassPane => {
    const popover = new GlassPane(`${VisualLogging.popover(jslogContext).parent('mapped')}`);
    popover.registerRequiredCSS(popoverStyles);
    popover.setSizeBehavior(SizeBehavior.MEASURE_CONTENT);
    popover.setMarginBehavior(MarginBehavior.DEFAULT_MARGIN);
    return popover;
  };
  private disableOnClick: boolean;
  private getRequest: (arg0: MouseEvent|KeyboardEvent) => PopoverRequest | null;
  private scheduledRequest: PopoverRequest|null;
  private hidePopoverCallback: (() => void)|null;
  readonly container: HTMLElement;
  private showTimeout: number;
  private hideTimeout: number;
  private hidePopoverTimer: number|null;
  private showPopoverTimer: number|null;
  private readonly boundMouseDown: (event: MouseEvent) => void;
  private readonly boundMouseMove: (ev: MouseEvent) => void;
  private readonly boundMouseOut: (event: MouseEvent) => void;
  private readonly boundKeyUp: (ev: KeyboardEvent) => void;
  jslogContext?: string;
  constructor(
      container: HTMLElement, getRequest: (arg0: MouseEvent|KeyboardEvent) => PopoverRequest | null,
      jslogContext?: string) {
    this.disableOnClick = false;
    this.getRequest = getRequest;
    this.jslogContext = jslogContext;
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
    this.boundKeyUp = this.keyUp.bind(this);
    this.container.addEventListener('mousedown', this.boundMouseDown, false);
    this.container.addEventListener('mousemove', this.boundMouseMove, false);
    this.container.addEventListener('mouseout', this.boundMouseOut, false);
    this.container.addEventListener('keyup', this.boundKeyUp, false);
    this.setTimeout(1000);
  }

  setTimeout(showTimeout: number, hideTimeout?: number): void {
    this.showTimeout = showTimeout;
    this.hideTimeout = typeof hideTimeout === 'number' ? hideTimeout : showTimeout / 2;
  }

  setDisableOnClick(disableOnClick: boolean): void {
    this.disableOnClick = disableOnClick;
  }

  private eventInScheduledContent(event: MouseEvent): boolean {
    return this.scheduledRequest ? this.scheduledRequest.box.contains(event.clientX, event.clientY) : false;
  }

  private mouseDown(event: MouseEvent): void {
    if (this.disableOnClick) {
      this.hidePopover();
      return;
    }
    if (this.eventInScheduledContent(event)) {
      return;
    }

    this.startHidePopoverTimer(0);
    this.stopShowPopoverTimer();
    this.startShowPopoverTimer(event, 0);
  }

  private keyUp(event: KeyboardEvent): void {
    if (event.altKey && event.key === 'ArrowDown') {
      if (this.isPopoverVisible()) {
        this.hidePopover();
      } else {
        this.stopShowPopoverTimer();
        this.startHidePopoverTimer(0);
        this.startShowPopoverTimer(event, 0);
      }
      event.stopPropagation();
    } else if (event.key === 'Escape' && this.isPopoverVisible()) {
      this.hidePopover();
      event.stopPropagation();
    }
  }

  private mouseMove(event: MouseEvent): void {
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

  private popoverMouseOut(popover: GlassPane, event: MouseEvent): void {
    if (!popover.isShowing()) {
      return;
    }
    const node = (event.relatedTarget as Node | null);
    if (node && !node.isSelfOrDescendant(popover.contentElement)) {
      this.startHidePopoverTimer(this.hideTimeout);
    }
  }

  private mouseOut(event: MouseEvent): void {
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
      this.#hidePopover();
      this.hidePopoverTimer = null;
    }, timeout);
  }

  private startShowPopoverTimer(event: MouseEvent|KeyboardEvent, timeout: number): void {
    this.scheduledRequest = this.getRequest.call(null, event);
    if (!this.scheduledRequest) {
      return;
    }

    this.showPopoverTimer = window.setTimeout(() => {
      this.showPopoverTimer = null;
      this.stopHidePopoverTimer();
      this.#hidePopover();
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
    this.#hidePopover();
  }

  #hidePopover(): void {
    if (!this.hidePopoverCallback) {
      return;
    }
    this.hidePopoverCallback.call(null);
    this.hidePopoverCallback = null;
  }

  private showPopover(document: Document): void {
    const popover = PopoverHelper.createPopover(this.jslogContext);
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

      VisualLogging.setMappedParent(popover.contentElement, this.container);
      popover.contentElement.style.scrollbarGutter = 'stable';
      popover.contentElement.addEventListener('mousemove', this.popoverMouseMove.bind(this), true);
      popover.contentElement.addEventListener('mouseout', this.popoverMouseOut.bind(this, popover), true);
      popover.setContentAnchorBox(request.box);
      popover.show(document);

      this.hidePopoverCallback = () => {
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
