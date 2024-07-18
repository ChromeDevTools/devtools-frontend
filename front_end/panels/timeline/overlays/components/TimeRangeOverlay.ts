// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../../core/i18n/i18n.js';
import type * as TraceEngine from '../../../../models/trace/trace.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';

import styles from './timeRangeOverlay.css.js';

export class TimeRangeOverlay extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-time-range-overlay`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);
  #duration: TraceEngine.Types.Timing.MicroSeconds|null = null;
  #label = '';
  #canvasRect: DOMRect|null = null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [styles];
  }

  set canvasRect(rect: DOMRect|null) {
    this.#canvasRect = rect;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set duration(duration: TraceEngine.Types.Timing.MicroSeconds|null) {
    if (duration === this.#duration) {
      return;
    }
    this.#duration = duration;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set label(label: string) {
    if (label === this.#label) {
      return;
    }
    this.#label = label;
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
  afterOverlayUpdate(): void {
    const label = this.#shadow.querySelector<HTMLElement>('.label');
    if (!label) {
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
    const labelRect = label.getBoundingClientRect();
    const visibleOverlayWidth = this.#visibleOverlayWidth(overlayRect) - paddingForScrollbar;
    const overlayTooNarrow = visibleOverlayWidth <= labelRect.width - paddingForScrollbar;
    label.classList.toggle('labelHidden', overlayTooNarrow);

    if (overlayTooNarrow) {
      // Label is invisible, no need to do all the layout.
      return;
    }

    // Check if label is off the LHS of the screen.
    const labelLeftMarginToCenter = (overlayRect.width - labelRect.width) / 2;
    const newLabelX = overlayRect.x + labelLeftMarginToCenter;

    const labelOffLeftOfScreen = newLabelX < this.#canvasRect.x;
    label.classList.toggle('offScreenLeft', labelOffLeftOfScreen);

    // Check if label is off the RHS of the screen
    const rightBound = this.#canvasRect.x + this.#canvasRect.width;
    // The label's right hand edge is the gap from the left of the range to the
    // label, and then the width of the label.
    const labelRightEdge = overlayRect.x + labelLeftMarginToCenter + labelRect.width;
    const labelOffRightOfScreen = labelRightEdge > rightBound;
    label.classList.toggle('offScreenRight', labelOffRightOfScreen);

    if (labelOffLeftOfScreen) {
      // If the label is off the left of the screen, we adjust by the
      // difference between the X that represents the start of the cavnas, and
      // the X that represents the start of the overlay.
      // We then take the absolute value of this - because if the canvas starts
      // at 0, and the overlay is -200px, we have to adjust the label by +200.
      // Add on 9 pixels to pad from the left; this is the width of the sidebar
      // on the RHS so we match it so the label is equally padded on either
      // side.
      label.style.marginLeft = `${Math.abs(this.#canvasRect.x - overlayRect.x) + paddingForScrollbar}px`;
    } else if (labelOffRightOfScreen) {
      // To calculate how far left to push the label, we take the right hand
      // bound (the canvas width and subtract the label's width).
      // Finally, we subtract the X position of the overlay (if the overlay is
      // 200px within the view, we don't need to push the label that 200px too
      // otherwise it will be off-screen)
      const leftMargin = rightBound - labelRect.width - overlayRect.x;

      label.style.marginLeft = `${leftMargin}px`;

    } else {
      // Keep the label central.
      label.style.marginLeft = `${labelLeftMarginToCenter}px`;
    }
  }

  #render(): void {
    const durationText = this.#duration ? i18n.TimeUtilities.formatMicroSecondsTime(this.#duration) : '';

    LitHtml.render(
        LitHtml.html`<span class="label" title=${this.#label}><span class="label-text">${this.#label}</span>${
            durationText}</span>`,
        this.#shadow, {host: this});
  }
}

customElements.define('devtools-time-range-overlay', TimeRangeOverlay);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-time-range-overlay': TimeRangeOverlay;
  }
}
