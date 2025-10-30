// Copyright 2009 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as VisualLogging from '../visual_logging/visual_logging.js';
import { GlassPane } from './GlassPane.js';
import popoverStyles from './popover.css.js';
export class PopoverHelper {
    static createPopover = (jslogContext) => {
        const popover = new GlassPane(`${VisualLogging.popover(jslogContext).parent('mapped')}`);
        popover.registerRequiredCSS(popoverStyles);
        popover.setSizeBehavior("MeasureContent" /* SizeBehavior.MEASURE_CONTENT */);
        popover.setMarginBehavior("DefaultMargin" /* MarginBehavior.DEFAULT_MARGIN */);
        return popover;
    };
    disableOnClick;
    getRequest;
    scheduledRequest;
    hidePopoverCallback;
    container;
    showTimeout;
    hideTimeout;
    hidePopoverTimer;
    showPopoverTimer;
    boundMouseDown;
    boundMouseMove;
    boundMouseOut;
    boundKeyUp;
    jslogContext;
    constructor(container, getRequest, jslogContext) {
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
    setTimeout(showTimeout, hideTimeout) {
        this.showTimeout = showTimeout;
        this.hideTimeout = typeof hideTimeout === 'number' ? hideTimeout : showTimeout / 2;
    }
    setDisableOnClick(disableOnClick) {
        this.disableOnClick = disableOnClick;
    }
    eventInScheduledContent(event) {
        return this.scheduledRequest ? this.scheduledRequest.box.contains(event.clientX, event.clientY) : false;
    }
    mouseDown(event) {
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
    keyUp(event) {
        if (event.altKey && event.key === 'ArrowDown') {
            if (this.isPopoverVisible()) {
                this.hidePopover();
            }
            else {
                this.stopShowPopoverTimer();
                this.startHidePopoverTimer(0);
                this.startShowPopoverTimer(event, 0);
            }
            event.stopPropagation();
        }
        else if (event.key === 'Escape' && this.isPopoverVisible()) {
            this.hidePopover();
            event.stopPropagation();
        }
    }
    mouseMove(event) {
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
    popoverMouseMove(_event) {
        this.stopHidePopoverTimer();
    }
    popoverMouseOut(popover, event) {
        if (!popover.isShowing()) {
            return;
        }
        const node = event.relatedTarget;
        if (node && !node.isSelfOrDescendant(popover.contentElement)) {
            this.startHidePopoverTimer(this.hideTimeout);
        }
    }
    mouseOut(event) {
        if (!this.isPopoverVisible()) {
            return;
        }
        if (!this.eventInScheduledContent(event)) {
            this.startHidePopoverTimer(this.hideTimeout);
        }
    }
    startHidePopoverTimer(timeout) {
        // User has |timeout| ms to reach the popup.
        if (!this.hidePopoverCallback || this.hidePopoverTimer) {
            return;
        }
        this.hidePopoverTimer = window.setTimeout(() => {
            this.#hidePopover();
            this.hidePopoverTimer = null;
        }, timeout);
    }
    startShowPopoverTimer(event, timeout) {
        this.scheduledRequest = this.getRequest.call(null, event);
        if (!this.scheduledRequest) {
            return;
        }
        this.showPopoverTimer = window.setTimeout(() => {
            this.showPopoverTimer = null;
            this.stopHidePopoverTimer();
            this.#hidePopover();
            const document = (event.target.ownerDocument);
            this.showPopover(document);
        }, timeout);
    }
    stopShowPopoverTimer() {
        if (!this.showPopoverTimer) {
            return;
        }
        clearTimeout(this.showPopoverTimer);
        this.showPopoverTimer = null;
    }
    isPopoverVisible() {
        return Boolean(this.hidePopoverCallback);
    }
    hidePopover() {
        this.stopShowPopoverTimer();
        this.#hidePopover();
    }
    #hidePopover() {
        if (!this.hidePopoverCallback) {
            return;
        }
        this.hidePopoverCallback.call(null);
        this.hidePopoverCallback = null;
    }
    showPopover(document) {
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
    stopHidePopoverTimer() {
        if (!this.hidePopoverTimer) {
            return;
        }
        clearTimeout(this.hidePopoverTimer);
        this.hidePopoverTimer = null;
        // We know that we reached the popup, but we might have moved over other elements.
        // Discard pending command.
        this.stopShowPopoverTimer();
    }
    dispose() {
        this.container.removeEventListener('mousedown', this.boundMouseDown, false);
        this.container.removeEventListener('mousemove', this.boundMouseMove, false);
        this.container.removeEventListener('mouseout', this.boundMouseOut, false);
    }
}
let popoverHelperInstance = null;
//# sourceMappingURL=PopoverHelper.js.map