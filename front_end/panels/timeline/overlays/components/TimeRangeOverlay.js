// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../../../ui/lit/lit.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import timeRangeOverlayStyles from './timeRangeOverlay.css.js';
const UIStrings = {
    /**
     * @description Accessible label for the time range overlay in the Performance panel.
     */
    timeRange: 'Time range',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/overlays/components/TimeRangeOverlay.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, output, target) => {
    // The label text is bound with `live` because the user edits it directly
    // in the DOM. `live` compares against the current DOM text rather than the
    // last rendered value. The input handler keeps the widget's label in sync,
    // so re-rendering leaves the user's text and caret untouched.
    // clang-format off
    render(html `
        <style>${timeRangeOverlayStyles}</style>
        <span
          class="range-container"
          role="region"
          aria-label=${i18nString(UIStrings.timeRange)}
          ${Directives.ref(el => { output.rangeContainer = el instanceof HTMLElement ? el : undefined; })}
        >
          <span
           class="label-text"
           role="textbox"
           @focusout=${input.onLabelFocusOut}
           @dblclick=${input.onLabelDblClick}
           @keydown=${input.onLabelKeyDown}
           @input=${input.onLabelInput}
           contenteditable=${input.isLabelEditable ? 'plaintext-only' : false}
           aria-label=${input.label}
           .textContent=${Directives.live(input.label)}
           jslog=${VisualLogging.textField('timeline.annotations.time-range-label-input').track({ keydown: true, click: true })}
           ${Directives.ref(el => { output.labelBox = el instanceof HTMLElement ? el : undefined; })}
          ></span>
          <span
            class="duration"
            ${Directives.ref(el => { output.durationBox = el instanceof HTMLElement ? el : undefined; })}
          >${input.durationText}</span>
        </span>
      `, target);
    // clang-format on
};
export class TimeRangeOverlay extends UI.Widget.Widget {
    #duration = null;
    #canvasRect = null;
    #label = '';
    // The label is set to editable and in focus anytime the label is empty and when the label it is double clicked.
    // If the user clicks away from the selected range element and the label is not empty, the label is set to not editable until it is double clicked.
    #isLabelEditable = true;
    // Focus can only move to the label once the view has made it editable, so
    // the focus waits for the next update.
    #focusLabelOnUpdate = false;
    /**
     * Called with the new label whenever the user edits it.
     */
    onLabelChange = () => { };
    /**
     * Called when the user presses Enter or Escape while the label is empty,
     * which removes the time range.
     */
    onRemove = () => { };
    #view;
    #viewOutput = {};
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
        this.requestUpdate();
    }
    /**
     * Sets the label text. A non-empty label makes the label non-editable until
     * the user double clicks it. An empty label makes it editable.
     */
    set label(label) {
        if (label === this.#label) {
            return;
        }
        this.#label = label;
        // A non-empty label set from outside must have been loaded from the
        // trace file. In this case we do not want it to default to editable.
        this.#isLabelEditable = label === '';
        this.requestUpdate();
    }
    set canvasRect(rect) {
        if (rect === null) {
            return;
        }
        if (this.#canvasRect && this.#canvasRect.width === rect.width && this.#canvasRect.height === rect.height) {
            return;
        }
        this.#canvasRect = rect;
        this.requestUpdate();
    }
    set duration(duration) {
        if (duration === this.#duration) {
            return;
        }
        this.#duration = duration;
        this.requestUpdate();
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
     *
     * This runs synchronously, rather than through `requestUpdate()`, so that
     * `Overlays` can reposition the label in the same frame as the range.
     */
    updateLabelPositioning() {
        const { rangeContainer, labelBox, durationBox } = this.#viewOutput;
        if (!rangeContainer || !labelBox || !this.#canvasRect) {
            return;
        }
        // On the RHS of the panel a scrollbar can be shown which means the canvas
        // has a 9px gap on the right hand edge. We use this value when calculating
        // values and label positioning from the left hand side in order to be
        // consistent on both edges of the UI.
        const paddingForScrollbar = 9;
        const overlayRect = this.element.getBoundingClientRect();
        const labelFocused = UI.DOMUtilities.deepActiveElement(this.element.ownerDocument) === labelBox;
        const labelRect = rangeContainer.getBoundingClientRect();
        const visibleOverlayWidth = this.#visibleOverlayWidth(overlayRect) - paddingForScrollbar;
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
        rangeContainer.classList.toggle('labelHidden', hideLabel);
        if (hideLabel) {
            // Label is invisible, no need to do all the layout.
            return;
        }
        // Check if label is off the LHS of the screen.
        const labelLeftMarginToCenter = (overlayRect.width - labelRect.width) / 2;
        const newLabelX = overlayRect.x + labelLeftMarginToCenter;
        const labelOffLeftOfScreen = newLabelX < this.#canvasRect.x;
        rangeContainer.classList.toggle('offScreenLeft', labelOffLeftOfScreen);
        // Check if label is off the RHS of the screen
        const rightBound = this.#canvasRect.x + this.#canvasRect.width;
        // The label's right hand edge is the gap from the left of the range to the
        // label, and then the width of the label.
        const labelRightEdge = overlayRect.x + labelLeftMarginToCenter + labelRect.width;
        const labelOffRightOfScreen = labelRightEdge > rightBound;
        rangeContainer.classList.toggle('offScreenRight', labelOffRightOfScreen);
        if (labelOffLeftOfScreen) {
            // If the label is off the left of the screen, we adjust by the
            // difference between the X that represents the start of the cavnas, and
            // the X that represents the start of the overlay.
            // We then take the absolute value of this - because if the canvas starts
            // at 0, and the overlay is -200px, we have to adjust the label by +200.
            // Add on 9 pixels to pad from the left; this is the width of the sidebar
            // on the RHS so we match it so the label is equally padded on either
            // side.
            rangeContainer.style.marginLeft = `${Math.abs(this.#canvasRect.x - overlayRect.x) + paddingForScrollbar}px`;
        }
        else if (labelOffRightOfScreen) {
            // If the label is off the right of the screen, we adjust by adding the
            // right margin equal to the difference between the right edge of the
            // overlay and the right edge of the canvas.
            rangeContainer.style.marginRight = `${overlayRect.right - this.#canvasRect.right + paddingForScrollbar}px`;
        }
        else {
            // Keep the label central.
            rangeContainer.style.margin = '0px';
        }
        // If the text is empty, set the label editibility to true.
        // Only allow to remove the focus and save the range as annotation if the label is not empty.
        if (this.#label === '') {
            this.#setLabelEditability(true);
        }
    }
    #focusInputBox() {
        const labelBox = this.#viewOutput.labelBox;
        if (!labelBox) {
            console.error('`labelBox` element is missing.');
            return;
        }
        labelBox.focus();
    }
    #setLabelEditability(editable) {
        // Always keep focus on the label input field if the label is empty.
        // TODO: Do not remove a range that is being navigated away from if the label is not empty
        if (this.#label === '') {
            this.#focusInputBox();
            return;
        }
        this.#isLabelEditable = editable;
        // If the label is editable, focus cursor on it once it has rendered.
        this.#focusLabelOnUpdate = editable;
        this.requestUpdate();
    }
    #handleLabelInput() {
        // Sync on every input (typing, paste, cut, drag and drop) so that
        // `#label` always matches the text in the DOM.
        const labelBoxTextContent = this.#viewOutput.labelBox?.textContent ?? '';
        if (labelBoxTextContent !== this.#label) {
            this.#label = labelBoxTextContent;
            this.onLabelChange(this.#label);
            // Update so the aria-label binding picks up the new label.
            this.requestUpdate();
        }
    }
    #handleLabelInputKeyDown(event) {
        // If the new key is `Enter` or `Escape` key, treat it
        // as the end of the label input and blur the input field.
        // If the text field is empty when `Enter` or `Escape` are pressed,
        // remove the time range.
        if (event.key === Platform.KeyboardUtilities.ENTER_KEY || event.key === Platform.KeyboardUtilities.ESCAPE_KEY) {
            // In DevTools, the `Escape` button will by default toggle the console
            // drawer, which we don't want here, so we need to call
            // `stopPropagation()`.
            event.stopPropagation();
            if (this.#label === '') {
                this.onRemove();
            }
            this.#viewOutput.labelBox?.blur();
        }
    }
    performUpdate() {
        this.#view({
            label: this.#label,
            durationText: this.#duration ? i18n.TimeUtilities.formatMicroSecondsTime(this.#duration) : '',
            isLabelEditable: this.#isLabelEditable,
            onLabelFocusOut: () => this.#setLabelEditability(false),
            onLabelDblClick: () => this.#setLabelEditability(true),
            onLabelKeyDown: this.#handleLabelInputKeyDown.bind(this),
            onLabelInput: this.#handleLabelInput.bind(this),
        }, this.#viewOutput, this.contentElement);
        // The duration text and editability both change the label's width, so
        // reposition it after every render.
        this.updateLabelPositioning();
        if (this.#focusLabelOnUpdate) {
            this.#focusLabelOnUpdate = false;
            // The label may have been set, which makes it non-editable, since the
            // focus was requested.
            if (this.#isLabelEditable) {
                this.#focusInputBox();
            }
        }
    }
}
//# sourceMappingURL=TimeRangeOverlay.js.map