// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import type * as Trace from '../../../../models/trace/trace.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../../../ui/lit/lit.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';

import timeRangeOverlayStyles from './timeRangeOverlay.css.js';

const UIStrings = {
  /**
   * @description Accessible label for the time range overlay in the Performance panel.
   */
  timeRange: 'Time range',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/timeline/overlays/components/TimeRangeOverlay.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  label: string;
  durationText: string;
  isLabelEditable: boolean;
  onLabelFocusOut: () => void;
  onLabelDblClick: () => void;
  onLabelEditComplete: () => void;
  onLabelInput: (label: string) => void;
}

export interface PositionLabelOptions {
  /**
   * The bounds of the flame chart canvas that the label must stay within.
   */
  canvasRect: DOMRect;
  /**
   * Whether to hide the label if the range is too narrow: that is, if the
   * visible part of the range is not wider than the duration text.
   */
  hideLabelIfTooNarrow: boolean;
}

/**
 * Callbacks the view fills in when it renders.
 */
export interface ViewOutput {
  focusLabel: () => void;
  /**
   * Moves the label as required to keep it on screen, and hides it if the
   * visible part of the range is too narrow. Returns true once the label has
   * been measured, including when it is hidden. Returns false, without
   * changing anything, if the duration text has no width to measure against,
   * or if the view has not rendered yet.
   */
  positionLabel: (options: PositionLabelOptions) => boolean;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

/**
 * Calculates how much of the time range is within the canvas. This is used to
 * determine whether the label fits in the visible part of the range.
 */
function visibleOverlayWidth(overlayRect: DOMRect, canvasRect: DOMRect): number {
  const {x: overlayStartX, width} = overlayRect;
  const overlayEndX = overlayStartX + width;

  const canvasStartX = canvasRect.x;
  const canvasEndX = canvasRect.x + canvasRect.width;

  const leftVisible = Math.max(canvasStartX, overlayStartX);
  const rightVisible = Math.min(canvasEndX, overlayEndX);
  return rightVisible - leftVisible;
}

/**
 * Moves the label as required to keep it on screen. If the label is off to
 * the left or right, it is fixed to that edge and its text is aligned so the
 * label stays visible as long as possible.
 *
 * This sets classes and margins on `rangeContainer` directly, rather than
 * through template bindings, because it runs synchronously outside of a
 * render. The `class` attribute of `.range-container` must stay static in the
 * template: a binding on it would overwrite the classes set here.
 *
 * `overlay` must be the element sized to the time range, because its bounds
 * are compared against the canvas bounds.
 */
function applyLabelPosition(overlay: HTMLElement, rangeContainer: HTMLElement, durationBox: HTMLElement,
                            options: PositionLabelOptions): boolean {
  const {canvasRect, hideLabelIfTooNarrow} = options;
  // On the RHS of the panel a scrollbar can be shown which means the canvas
  // has a 9px gap on the right hand edge. We use this value when calculating
  // values and label positioning from the left hand side in order to be
  // consistent on both edges of the UI.
  const paddingForScrollbar = 9;
  const overlayRect = overlay.getBoundingClientRect();

  const labelRect = rangeContainer.getBoundingClientRect();
  const visibleWidth = visibleOverlayWidth(overlayRect, canvasRect) - paddingForScrollbar;

  const durationBoxLength = durationBox.getBoundingClientRect().width;
  if (!durationBoxLength) {
    return false;
  }
  const hideLabel = hideLabelIfTooNarrow && visibleWidth <= durationBoxLength;
  rangeContainer.classList.toggle('labelHidden', hideLabel);

  if (hideLabel) {
    // Label is invisible, no need to do all the layout.
    return true;
  }

  // Check if label is off the LHS of the screen.
  const labelLeftMarginToCenter = (overlayRect.width - labelRect.width) / 2;
  const newLabelX = overlayRect.x + labelLeftMarginToCenter;

  const labelOffLeftOfScreen = newLabelX < canvasRect.x;
  rangeContainer.classList.toggle('offScreenLeft', labelOffLeftOfScreen);

  // Check if label is off the RHS of the screen.
  const rightBound = canvasRect.x + canvasRect.width;
  // The label's right hand edge is the gap from the left of the range to the
  // label, and then the width of the label.
  const labelRightEdge = overlayRect.x + labelLeftMarginToCenter + labelRect.width;
  const labelOffRightOfScreen = labelRightEdge > rightBound;
  rangeContainer.classList.toggle('offScreenRight', labelOffRightOfScreen);

  if (labelOffLeftOfScreen) {
    // If the label is off the left of the screen, we adjust by the
    // difference between the X that represents the start of the canvas, and
    // the X that represents the start of the overlay.
    // We then take the absolute value of this - because if the canvas starts
    // at 0, and the overlay is -200px, we have to adjust the label by +200.
    // Add on 9 pixels to pad from the left; this is the width of the sidebar
    // on the RHS so we match it so the label is equally padded on either
    // side.
    rangeContainer.style.marginLeft = `${Math.abs(canvasRect.x - overlayRect.x) + paddingForScrollbar}px`;
  } else if (labelOffRightOfScreen) {
    // If the label is off the right of the screen, we adjust by adding the
    // right margin equal to the difference between the right edge of the
    // overlay and the right edge of the canvas.
    rangeContainer.style.marginRight = `${overlayRect.right - canvasRect.right + paddingForScrollbar}px`;
  } else {
    // Keep the label central.
    rangeContainer.style.margin = '0px';
  }
  return true;
}

export const DEFAULT_VIEW: View = (input, output, target) => {
  const handleKeyDown = (event: KeyboardEvent): void => {
    // If the new key is `Enter` or `Escape` key, treat it
    // as the end of the label input and blur the input field.
    if (event.key === Platform.KeyboardUtilities.ENTER_KEY || event.key === Platform.KeyboardUtilities.ESCAPE_KEY) {
      // In DevTools, the `Escape` button will by default toggle the console
      // drawer, which we don't want here, so we need to call
      // `stopPropagation()`.
      event.stopPropagation();
      input.onLabelEditComplete();
      if (event.target instanceof HTMLElement) {
        event.target.blur();
      }
    }
  };

  let rangeContainer: HTMLElement|undefined;
  let durationBox: HTMLElement|undefined;

  // The label text is bound with `live` because the user edits it directly
  // in the DOM. `live` compares against the current DOM text rather than the
  // last rendered value. The input handler keeps the widget's label in sync,
  // so re-rendering leaves the user's text and caret untouched.
  // clang-format off
  render(
      html`
        <style>${timeRangeOverlayStyles}</style>
        <span
          class="range-container"
          role="region"
          aria-label=${i18nString(UIStrings.timeRange)}
          ${Directives.ref(el => { rangeContainer = el instanceof HTMLElement ? el : undefined; })}
        >
          <span
           class="label-text"
           role="textbox"
           @focusout=${input.onLabelFocusOut}
           @dblclick=${input.onLabelDblClick}
           @keydown=${handleKeyDown}
           @input=${(event: Event) => input.onLabelInput(event.target instanceof HTMLElement ? event.target.textContent ?? '' : '')}
           contenteditable=${input.isLabelEditable ? 'plaintext-only' : false}
           aria-label=${input.label}
           .textContent=${Directives.live(input.label)}
           jslog=${VisualLogging.textField('timeline.annotations.time-range-label-input').track({keydown: true, click: true})}
           ${Directives.ref(el => {
             if (el instanceof HTMLElement) {
               output.focusLabel = () => el.focus();
             }
           })}
          ></span>
          <span
            class="duration"
            ${Directives.ref(el => { durationBox = el instanceof HTMLElement ? el : undefined; })}
          >${input.durationText}</span>
        </span>
      `,
      target);
  // clang-format on

  // The refs are copied to consts so that TypeScript keeps their narrowing
  // inside the callback below. The template is static, so both refs are set
  // once `render()` has returned. If they are not, the callback does nothing.
  const renderedRangeContainer = rangeContainer;
  const renderedDurationBox = durationBox;
  if (renderedRangeContainer && renderedDurationBox) {
    output.positionLabel = options => applyLabelPosition(target, renderedRangeContainer, renderedDurationBox, options);
  } else {
    output.positionLabel = () => false;
  }
};

export class TimeRangeOverlay extends UI.Widget.Widget {
  #duration: Trace.Types.Timing.Micro|null = null;
  #canvasRect: DOMRect|null = null;
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
  onLabelChange: (label: string) => void = () => {};
  /**
   * Called when the user presses Enter or Escape while the label is empty,
   * which removes the time range.
   */
  onRemove: () => void = () => {};

  readonly #view: View;
  readonly #viewOutput: ViewOutput = {
    focusLabel: () => {},
    positionLabel: () => false,
  };

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
    this.requestUpdate();
  }

  /**
   * Sets the label text. A non-empty label makes the label non-editable until
   * the user double clicks it. An empty label makes it editable.
   */
  set label(label: string) {
    if (label === this.#label) {
      return;
    }
    this.#label = label;
    // A non-empty label set from outside must have been loaded from the
    // trace file. In this case we do not want it to default to editable.
    this.#isLabelEditable = label === '';
    this.requestUpdate();
  }

  set canvasRect(rect: DOMRect|null) {
    if (rect === null) {
      return;
    }
    if (this.#canvasRect && this.#canvasRect.width === rect.width && this.#canvasRect.height === rect.height) {
      return;
    }
    this.#canvasRect = rect;
    this.requestUpdate();
  }

  set duration(duration: Trace.Types.Timing.Micro|null) {
    if (duration === this.#duration) {
      return;
    }
    this.#duration = duration;
    this.requestUpdate();
  }

  /**
   * We use this method after the overlay has been positioned in order to move
   * the label as required to keep it on screen.
   *
   * This runs synchronously, rather than through `requestUpdate()`, so that
   * `Overlays` can reposition the label in the same frame as the range. The
   * current state is passed to the view as arguments, rather than through the
   * view input, because the last render may not include it yet.
   */
  updateLabelPositioning(): void {
    if (!this.#canvasRect) {
      return;
    }

    const measured = this.#viewOutput.positionLabel({
      canvasRect: this.#canvasRect,
      // Do not hide the label when:
      // 1. It is empty (a new range that the user needs to type into).
      // 2. It is currently being edited (`#isLabelEditable` is true). For a
      //    non-empty label, `#isLabelEditable` is true only while the user has
      //    double-clicked to edit the label (or is still typing into an
      //    initially empty label) and has not yet blurred it (`@focusout`
      //    resets `#isLabelEditable` to false).
      hideLabelIfTooNarrow: !this.#isLabelEditable && this.#label.length > 0,
    });
    // Nothing is measured while the duration text has no width. In that case
    // the empty label is not focused either.
    if (!measured) {
      return;
    }

    // If the text is empty, set the label editibility to true.
    // Only allow to remove the focus and save the range as annotation if the label is not empty.
    if (this.#label === '') {
      this.#setLabelEditability(true);
    }
  }

  #setLabelEditability(editable: boolean): void {
    // Always keep focus on the label input field if the label is empty.
    // TODO: Do not remove a range that is being navigated away from if the label is not empty
    if (this.#label === '') {
      this.#viewOutput.focusLabel();
      return;
    }
    this.#isLabelEditable = editable;
    // If the label is editable, focus cursor on it once it has rendered.
    this.#focusLabelOnUpdate = editable;
    this.requestUpdate();
  }

  #handleLabelInput(label: string): void {
    // Sync on every input (typing, paste, cut, drag and drop) so that
    // `#label` always matches the text in the DOM.
    if (label !== this.#label) {
      this.#label = label;
      this.onLabelChange(this.#label);
      // Update so the aria-label binding picks up the new label.
      this.requestUpdate();
    }
  }

  #handleLabelEditComplete(): void {
    // If the text field is empty when `Enter` or `Escape` are pressed,
    // remove the time range.
    if (this.#label === '') {
      this.onRemove();
    }
  }

  override performUpdate(): void {
    this.#view(
        {
          label: this.#label,
          durationText: this.#duration ? i18n.TimeUtilities.formatMicroSecondsTime(this.#duration) : '',
          isLabelEditable: this.#isLabelEditable,
          onLabelFocusOut: () => this.#setLabelEditability(false),
          onLabelDblClick: () => this.#setLabelEditability(true),
          onLabelEditComplete: this.#handleLabelEditComplete.bind(this),
          onLabelInput: this.#handleLabelInput.bind(this),
        },
        this.#viewOutput,
        this.contentElement,
    );
    // The duration text and editability both change the label's width, so
    // reposition it after every render.
    this.updateLabelPositioning();
    if (this.#focusLabelOnUpdate) {
      this.#focusLabelOnUpdate = false;
      // The label may have been set, which makes it non-editable, since the
      // focus was requested.
      if (this.#isLabelEditable) {
        this.#viewOutput.focusLabel();
      }
    }
  }
}
