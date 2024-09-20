// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Trace from '../../../../models/trace/trace.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../../ui/components/icon_button/icon_button.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';

import styles from './timeRangeOverlay.css.js';

const UIStrings = {
  /**
   *@description Accessible label used to explain to a user that they are viewing an entry label.
   */
  timeRange: 'Time range',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/overlays/components/TimeRangeOverlay.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class TimeRangeLabelChangeEvent extends Event {
  static readonly eventName = 'timerangelabelchange';

  constructor(public newLabel: string) {
    super(TimeRangeLabelChangeEvent.eventName);
  }
}

export class TimeRangeRemoveEvent extends Event {
  static readonly eventName = 'timerangeremoveevent';

  constructor() {
    super(TimeRangeRemoveEvent.eventName);
  }
}

export class TimeRangeOverlay extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-time-range-overlay`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);
  #duration: Trace.Types.Timing.MicroSeconds|null = null;
  #canvasRect: DOMRect|null = null;
  #label: string;

  // The label is set to editable and in focus anytime the label is empty and when the label it is double clicked.
  // If the user clicks away from the selected range element and the label is not empty, the lable is set to not editable until it is double clicked.
  #isLabelEditable: boolean = true;

  #rangeContainer: HTMLElement|null = null;
  #labelBox: HTMLElement|null = null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [styles];
  }

  constructor(initialLabel: string) {
    super();
    this.#render();
    this.#rangeContainer = this.#shadow.querySelector<HTMLElement>('.range-container');
    this.#labelBox = this.#rangeContainer?.querySelector<HTMLElement>('.label-text') ?? null;
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

  set canvasRect(rect: DOMRect|null) {
    if (rect === null) {
      return;
    }
    if (this.#canvasRect && this.#canvasRect.width === rect.width && this.#canvasRect.height === rect.height) {
      return;
    }
    this.#canvasRect = rect;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set duration(duration: Trace.Types.Timing.MicroSeconds|null) {
    if (duration === this.#duration) {
      return;
    }
    this.#duration = duration;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  /**
   * This calculates how much of the time range is in the user's view. This is
   * used to determine how much of the label can fit into the view, and if we
   * should even show the label.
   */
  #visibleOverlayWidth(overlayRect: DOMRect): number {
    if (!this.#canvasRect) {
      return 0;
    }

    const {x: overlayStartX, width} = overlayRect;
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
  updateLabelPositioning(): void {
    if (!this.#rangeContainer) {
      return;
    }

    if (!this.#canvasRect) {
      return;
    }

    // On the RHS of the panel a scrollbar can be shown which means the canvas
    // has a 9px gap on the right hand edge. We use this value when calculating
    // values and label positioning from the left hand side in order to be
    // consistent on both edges of the UI.
    const paddingForScrollbar = 9;

    const overlayRect = this.getBoundingClientRect();
    const labelRect = this.#rangeContainer.getBoundingClientRect();
    const visibleOverlayWidth = this.#visibleOverlayWidth(overlayRect) - paddingForScrollbar;
    const overlayTooNarrow = visibleOverlayWidth <= labelRect.width - paddingForScrollbar;
    this.#rangeContainer.classList.toggle('labelHidden', overlayTooNarrow);

    if (overlayTooNarrow) {
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
    } else if (labelOffRightOfScreen) {
      // To calculate how far left to push the label, we take the right hand
      // bound (the canvas width and subtract the label's width).
      // Finally, we subtract the X position of the overlay (if the overlay is
      // 200px within the view, we don't need to push the label that 200px too
      // otherwise it will be off-screen)
      const leftMargin = rightBound - labelRect.width - overlayRect.x;

      this.#rangeContainer.style.marginLeft = `${leftMargin}px`;

    } else {
      // Keep the label central.
      this.#rangeContainer.style.marginLeft = `${labelLeftMarginToCenter}px`;
    }

    // If the text is empty, set the label editibility to true.
    // Only allow to remove the focus and save the range as annotation if the label is not empty.
    if (this.#labelBox?.innerText === '') {
      this.#setLabelEditability(true);
    }
  }

  #focusInputBox(): void {
    if (!this.#labelBox) {
      console.error('`labelBox` element is missing.');
      return;
    }
    this.#labelBox.focus();
  }

  #setLabelEditability(editable: boolean): void {
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

  #handleLabelInputKeyUp(): void {
    // If the label changed on key up, dispatch label changed event
    const labelBoxTextContent = this.#labelBox?.textContent ?? '';
    if (labelBoxTextContent !== this.#label) {
      this.#label = labelBoxTextContent;
      this.dispatchEvent(new TimeRangeLabelChangeEvent(this.#label));
      this.#labelBox?.setAttribute('aria-label', labelBoxTextContent);
    }
  }

  #handleLabelInputKeyDown(event: KeyboardEvent): boolean {
    // If the new key is `Enter` or `Escape` key, treat it
    // as the end of the label input and blur the input field.
    // If the text field is empty when `Enter` or `Escape` are pressed,
    // dispatch an event to remove the time range.
    if (event.key === 'Enter' || event.key === 'Escape') {
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

  #render(): void {
    const durationText = this.#duration ? i18n.TimeUtilities.formatMicroSecondsTime(this.#duration) : '';
    // clang-format off
    LitHtml.render(
        LitHtml.html`
          <span class="range-container" role="region" aria-label=${i18nString(UIStrings.timeRange)}>
            <${IconButton.Icon.Icon.litTagName} class="user-created-icon" name='profile'}>
            </${IconButton.Icon.Icon.litTagName}>
            <span
             class="label-text"
             role="textbox"
             @focusout=${() => this.#setLabelEditability(false)}
             @dblclick=${() => this.#setLabelEditability(true)}
             @keydown=${this.#handleLabelInputKeyDown}
             @keyup=${this.#handleLabelInputKeyUp}
             contenteditable=${this.#isLabelEditable ? 'plaintext-only' : false}>
            </span>
            <span
            class="duration">${durationText}</span>
          </span>
          `,
        this.#shadow, {host: this});
    // clang-format on

    // Now we have rendered, we need to re-run the code to tweak the margin &
    // positioning of the label.
    this.updateLabelPositioning();
  }
}

customElements.define('devtools-time-range-overlay', TimeRangeOverlay);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-time-range-overlay': TimeRangeOverlay;
  }
}
