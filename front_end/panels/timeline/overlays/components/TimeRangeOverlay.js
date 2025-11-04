// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import { html, render } from '../../../../ui/lit/lit.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import timeRangeOverlayStyles from './timeRangeOverlay.css.js';
const UIStrings = {
    /**
     * @description Accessible label used to explain to a user that they are viewing an entry label.
     */
    timeRange: 'Time range',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/overlays/components/TimeRangeOverlay.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TimeRangeLabelChangeEvent extends Event {
    newLabel;
    static eventName = 'timerangelabelchange';
    constructor(newLabel) {
        super(TimeRangeLabelChangeEvent.eventName);
        this.newLabel = newLabel;
    }
}
export class TimeRangeRemoveEvent extends Event {
    static eventName = 'timerangeremoveevent';
    constructor() {
        super(TimeRangeRemoveEvent.eventName);
    }
}
export class TimeRangeOverlay extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #duration = null;
    #canvasRect = null;
    #label;
    // The label is set to editable and in focus anytime the label is empty and when the label it is double clicked.
    // If the user clicks away from the selected range element and the label is not empty, the label is set to not editable until it is double clicked.
    #isLabelEditable = true;
    #rangeContainer = null;
    #labelBox = null;
    constructor(initialLabel) {
        super();
        this.#render();
        this.#rangeContainer = this.#shadow.querySelector('.range-container');
        this.#labelBox = this.#rangeContainer?.querySelector('.label-text') ?? null;
        this.#label = initialLabel;
        if (!this.#labelBox) {
            console.error('`labelBox` element is missing.');
            return;
        }
        this.#labelBox.innerText = initialLabel;
        if (initialLabel) {
            this.#labelBox?.setAttribute('aria-label', initialLabel);
            // To construct a time range with a predefined label, it must have been
            // loaded from the trace file. In this case we do not want it to default
            // to editable.
            this.#setLabelEditability(false);
        }
    }
    set canvasRect(rect) {
        if (rect === null) {
            return;
        }
        if (this.#canvasRect && this.#canvasRect.width === rect.width && this.#canvasRect.height === rect.height) {
            return;
        }
        this.#canvasRect = rect;
        this.#render();
    }
    set duration(duration) {
        if (duration === this.#duration) {
            return;
        }
        this.#duration = duration;
        this.#render();
    }
    /**
     * This calculates how much of the time range is in the user's view. This is
     * used to determine how much of the label can fit into the view, and if we
     * should even show the label.
     */
    #visibleOverlayWidth(overlayRect) {
        if (!this.#canvasRect) {
            return 0;
        }
        const { x: overlayStartX, width } = overlayRect;
        const overlayEndX = overlayStartX + width;
        const canvasStartX = this.#canvasRect.x;
        const canvasEndX = this.#canvasRect.x + this.#canvasRect.width;
        const leftVisible = Math.max(canvasStartX, overlayStartX);
        const rightVisible = Math.min(canvasEndX, overlayEndX);
        return rightVisible - leftVisible;
    }
    /**
     * We use this method after the overlay has been positioned in order to move
     * the label as required to keep it on screen.
     * If the label is off to the left or right, we fix it to that corner and
     * align the text so the label is visible as long as possible.
     */
    updateLabelPositioning() {
        if (!this.#rangeContainer) {
            return;
        }
        if (!this.#canvasRect || !this.#labelBox) {
            return;
        }
        // On the RHS of the panel a scrollbar can be shown which means the canvas
        // has a 9px gap on the right hand edge. We use this value when calculating
        // values and label positioning from the left hand side in order to be
        // consistent on both edges of the UI.
        const paddingForScrollbar = 9;
        const overlayRect = this.getBoundingClientRect();
        const labelFocused = this.#shadow.activeElement === this.#labelBox;
        const labelRect = this.#rangeContainer.getBoundingClientRect();
        const visibleOverlayWidth = this.#visibleOverlayWidth(overlayRect) - paddingForScrollbar;
        const durationBox = this.#rangeContainer.querySelector('.duration') ?? null;
        const durationBoxLength = durationBox?.getBoundingClientRect().width;
        if (!durationBoxLength) {
            return;
        }
        const overlayTooNarrow = visibleOverlayWidth <= durationBoxLength;
        // We do not hide the label if:
        // 1. it is focused (user is typing into it)
        // 2. it is empty - this means it's a new label and we need to let the user type into it!
        // 3. it is too narrow - narrower than the duration length
        const hideLabel = overlayTooNarrow && !labelFocused && this.#label.length > 0;
        this.#rangeContainer.classList.toggle('labelHidden', hideLabel);
        if (hideLabel) {
            // Label is invisible, no need to do all the layout.
            return;
        }
        // Check if label is off the LHS of the screen.
        const labelLeftMarginToCenter = (overlayRect.width - labelRect.width) / 2;
        const newLabelX = overlayRect.x + labelLeftMarginToCenter;
        const labelOffLeftOfScreen = newLabelX < this.#canvasRect.x;
        this.#rangeContainer.classList.toggle('offScreenLeft', labelOffLeftOfScreen);
        // Check if label is off the RHS of the screen
        const rightBound = this.#canvasRect.x + this.#canvasRect.width;
        // The label's right hand edge is the gap from the left of the range to the
        // label, and then the width of the label.
        const labelRightEdge = overlayRect.x + labelLeftMarginToCenter + labelRect.width;
        const labelOffRightOfScreen = labelRightEdge > rightBound;
        this.#rangeContainer.classList.toggle('offScreenRight', labelOffRightOfScreen);
        if (labelOffLeftOfScreen) {
            // If the label is off the left of the screen, we adjust by the
            // difference between the X that represents the start of the cavnas, and
            // the X that represents the start of the overlay.
            // We then take the absolute value of this - because if the canvas starts
            // at 0, and the overlay is -200px, we have to adjust the label by +200.
            // Add on 9 pixels to pad from the left; this is the width of the sidebar
            // on the RHS so we match it so the label is equally padded on either
            // side.
            this.#rangeContainer.style.marginLeft = `${Math.abs(this.#canvasRect.x - overlayRect.x) + paddingForScrollbar}px`;
        }
        else if (labelOffRightOfScreen) {
            // If the label is off the right of the screen, we adjust by adding the
            // right margin equal to the difference between the right edge of the
            // overlay and the right edge of the canvas.
            this.#rangeContainer.style.marginRight = `${overlayRect.right - this.#canvasRect.right + paddingForScrollbar}px`;
        }
        else {
            // Keep the label central.
            this.#rangeContainer.style.margin = '0px';
        }
        // If the text is empty, set the label editibility to true.
        // Only allow to remove the focus and save the range as annotation if the label is not empty.
        if (this.#labelBox?.innerText === '') {
            this.#setLabelEditability(true);
        }
    }
    #focusInputBox() {
        if (!this.#labelBox) {
            console.error('`labelBox` element is missing.');
            return;
        }
        this.#labelBox.focus();
    }
    #setLabelEditability(editable) {
        // Always keep focus on the label input field if the label is empty.
        // TODO: Do not remove a range that is being navigated away from if the label is not empty
        if (this.#labelBox?.innerText === '') {
            this.#focusInputBox();
            return;
        }
        this.#isLabelEditable = editable;
        this.#render();
        // If the label is editable, focus cursor on it
        if (editable) {
            this.#focusInputBox();
        }
    }
    #handleLabelInputKeyUp() {
        // If the label changed on key up, dispatch label changed event
        const labelBoxTextContent = this.#labelBox?.textContent ?? '';
        if (labelBoxTextContent !== this.#label) {
            this.#label = labelBoxTextContent;
            this.dispatchEvent(new TimeRangeLabelChangeEvent(this.#label));
            this.#labelBox?.setAttribute('aria-label', labelBoxTextContent);
        }
    }
    #handleLabelInputKeyDown(event) {
        // If the new key is `Enter` or `Escape` key, treat it
        // as the end of the label input and blur the input field.
        // If the text field is empty when `Enter` or `Escape` are pressed,
        // dispatch an event to remove the time range.
        if (event.key === Platform.KeyboardUtilities.ENTER_KEY || event.key === Platform.KeyboardUtilities.ESCAPE_KEY) {
            // In DevTools, the `Escape` button will by default toggle the console
            // drawer, which we don't want here, so we need to call
            // `stopPropagation()`.
            event.stopPropagation();
            if (this.#label === '') {
                this.dispatchEvent(new TimeRangeRemoveEvent());
            }
            this.#labelBox?.blur();
            return false;
        }
        return true;
    }
    #render() {
        const durationText = this.#duration ? i18n.TimeUtilities.formatMicroSecondsTime(this.#duration) : '';
        // clang-format off
        render(html `
          <style>${timeRangeOverlayStyles}</style>
          <span class="range-container" role="region" aria-label=${i18nString(UIStrings.timeRange)}>
            <span
             class="label-text"
             role="textbox"
             @focusout=${() => this.#setLabelEditability(false)}
             @dblclick=${() => this.#setLabelEditability(true)}
             @keydown=${this.#handleLabelInputKeyDown}
             @keyup=${this.#handleLabelInputKeyUp}
             contenteditable=${this.#isLabelEditable ? 'plaintext-only' : false}
             jslog=${VisualLogging.textField('timeline.annotations.time-range-label-input').track({ keydown: true, click: true })}
            ></span>
            <span class="duration">${durationText}</span>
          </span>
          `, this.#shadow, { host: this });
        // clang-format on
        // Now we have rendered, we need to re-run the code to tweak the margin &
        // positioning of the label.
        this.updateLabelPositioning();
    }
}
customElements.define('devtools-time-range-overlay', TimeRangeOverlay);
//# sourceMappingURL=TimeRangeOverlay.js.map