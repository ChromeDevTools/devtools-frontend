// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../../core/i18n/i18n.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as ThemeSupport from '../../../../ui/legacy/theme_support/theme_support.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';

import styles from './entryLabelOverlay.css.js';

const UIStrings = {
  /**
   * @description Accessible label used to explain to a user that they are viewing an entry label.
   */
  entryLabel: 'Entry label',
  /**
   *@description Accessible label used to prompt the user to input text into the field.
   */
  inputTextPrompt: 'Enter an annotation label',

};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/overlays/components/EntryLabelOverlay.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class EmptyEntryLabelRemoveEvent extends Event {
  static readonly eventName = 'emptyentrylabelremoveevent';

  constructor() {
    super(EmptyEntryLabelRemoveEvent.eventName);
  }
}

export class EntryLabelChangeEvent extends Event {
  static readonly eventName = 'entrylabelchangeevent';

  constructor(public newLabel: string) {
    super(EntryLabelChangeEvent.eventName);
  }
}

export class EntryLabelOverlay extends HTMLElement {
  // The label is angled on the left from the centre of the entry it belongs to.
  // `LABEL_AND_CONNECTOR_SHIFT_LENGTH` specifies how many pixels to the left it is shifted.
  static readonly LABEL_AND_CONNECTOR_SHIFT_LENGTH = 8;
  // Length of the line that connects the label to the entry.
  static readonly LABEL_CONNECTOR_HEIGHT = 7;
  static readonly LABEL_HEIGHT = 17;
  static readonly LABEL_PADDING = 4;
  static readonly LABEL_AND_CONNECTOR_HEIGHT =
      EntryLabelOverlay.LABEL_HEIGHT + EntryLabelOverlay.LABEL_PADDING * 2 + EntryLabelOverlay.LABEL_CONNECTOR_HEIGHT;
  // Set the max label length to avoid labels that could signicantly increase the file size.
  static readonly MAX_LABEL_LENGTH = 100;

  static readonly litTagName = LitHtml.literal`devtools-entry-label-overlay`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);

  // Once a label is bound for deletion, we remove it from the DOM via events
  // that are dispatched. But in the meantime the blur event of the input box
  // can fire, and that triggers a second removal. So we set this flag after
  // the first removal to avoid a duplicate event firing which is a no-op but
  // causes errors when we try to delete an already deleted annotation.
  #isPendingRemoval: boolean = false;

  // The label is set to editable when it is double clicked. If the user clicks away from the label box
  // element, the lable is set to not editable until it double clicked.s
  #isLabelEditable: boolean = true;
  #entryLabelVisibleHeight: number|null = null;

  #labelPartsWrapper: HTMLElement|null = null;
  #entryHighlightWrapper: HTMLElement|null = null;
  #inputField: HTMLElement|null = null;
  #connectorLineContainer: SVGAElement|null = null;
  #label: string;
  #shouldDrawBelowEntry: boolean;
  /**
   * The entry label overlay consists of 3 parts - the label part with the label string inside,
   * the line connecting the label to the entry, and a black box around an entry to highlight the entry with a label.
   * ________
   * |_label__|                <-- label part with the label string inside
   *     \
   *      \                   <-- line connecting the label to the entry with a circle at the end
   *       \
   * _______◯_________
   * |_____entry______|         <--- box around an entry
   *
   * `drawLabel` method below draws the first part.
   * `drawConnector` method below draws the second part - the connector line with a circle and the svg container for them.
   * `drawEntryHighlightWrapper` draws the third part.
   * We only rerender the first part if the label changes and the third part if the size of the entry changes.
   * The connector and circle shapes never change so we only draw the second part when the component is created.
   *
   * Otherwise, the entry label overlay object only gets repositioned.
   */

  constructor(label: string, shouldDrawBelowEntry: boolean = false) {
    super();
    this.#render();
    this.#shouldDrawBelowEntry = shouldDrawBelowEntry;
    this.#labelPartsWrapper = this.#shadow.querySelector<HTMLElement>('.label-parts-wrapper');
    this.#inputField = this.#labelPartsWrapper?.querySelector<HTMLElement>('.input-field') ?? null;
    this.#connectorLineContainer = this.#labelPartsWrapper?.querySelector<SVGAElement>('.connectorContainer') ?? null;
    this.#entryHighlightWrapper =
        this.#labelPartsWrapper?.querySelector<HTMLElement>('.entry-highlight-wrapper') ?? null;
    this.#label = label;
    this.#drawLabel(label);
    // If the label is not empty, it was loaded from the trace file.
    // In that case, do not auto-focus it as if the user were creating it for the first time
    if (label !== '') {
      this.setLabelEditabilityAndRemoveEmptyLabel(false);
    }
    const ariaLabel = label === '' ? i18nString(UIStrings.inputTextPrompt) : label;
    this.#inputField?.setAttribute('aria-label', ariaLabel);

    this.#drawConnector();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [styles];
  }

  entryHighlightWrapper(): HTMLElement|null {
    return this.#entryHighlightWrapper;
  }

  #handleLabelInputKeyUp(): void {
    // If the label changed on key up, dispatch label changed event.
    const labelBoxTextContent = this.#inputField?.textContent?.trim() ?? '';
    if (labelBoxTextContent !== this.#label) {
      this.#label = labelBoxTextContent;
      this.dispatchEvent(new EntryLabelChangeEvent(this.#label));
    }
    this.#inputField?.setAttribute('aria-label', labelBoxTextContent);
  }

  #handleLabelInputKeyDown(event: KeyboardEvent): boolean {
    if (!this.#inputField) {
      return false;
    }

    const allowedKeysAfterReachingLenLimit = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
    ];

    // We do not want to create multi-line labels.
    // Therefore, if the new key is `Enter` key, treat it
    // as the end of the label input and blur the input field.
    if (event.key === 'Enter' || event.key === 'Escape') {
      // Note that we do not stop the event propagating here; this is on
      // purpose because we need it to bubble up into TimelineFlameChartView's
      // handler. That updates the state and deals with the keydown.
      this.#inputField.dispatchEvent(new FocusEvent('blur', {bubbles: true}));
      return false;
    }

    // If the max limit is not reached, return true
    if (this.#inputField.textContent !== null &&
        this.#inputField.textContent.length <= EntryLabelOverlay.MAX_LABEL_LENGTH) {
      return true;
    }

    if (allowedKeysAfterReachingLenLimit.includes(event.key)) {
      return true;
    }

    if (event.key.length === 1 && event.ctrlKey /* Ctrl + A for selecting all */) {
      return true;
    }

    event.preventDefault();
    return false;
  }

  #handleLabelInputPaste(event: ClipboardEvent): void {
    event.preventDefault();

    const clipboardData = event.clipboardData;
    if (!clipboardData || !this.#inputField) {
      return;
    }

    const pastedText = clipboardData.getData('text');

    const newText = this.#inputField.textContent + pastedText;
    const trimmedText = newText.slice(0, EntryLabelOverlay.MAX_LABEL_LENGTH + 1);

    this.#inputField.textContent = trimmedText;

    // Reset the selection to the end
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(this.#inputField);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  set entryLabelVisibleHeight(entryLabelVisibleHeight: number) {
    if (entryLabelVisibleHeight === this.#entryLabelVisibleHeight) {
      // Even the position is not changed, the theme color might change, so we need to redraw the connector here.
      this.#drawConnector();
      return;
    }

    this.#entryLabelVisibleHeight = entryLabelVisibleHeight;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
    // If the label is editable, focus cursor on it.
    // This method needs to be called after rendering the wrapper because it is the last label overlay element to render.
    // By doing this, the cursor focuses when the label is created.
    if (this.#isLabelEditable) {
      this.#focusInputBox();
    }
    // The label and connector can move depending on the height of the entry
    this.#drawLabel();
    this.#drawConnector();
  }

  #drawConnector(): void {
    if (!this.#connectorLineContainer) {
      console.error('`connectorLineContainer` element is missing.');
      return;
    }

    if (this.#shouldDrawBelowEntry && this.#entryLabelVisibleHeight) {
      const translation = this.#entryLabelVisibleHeight + EntryLabelOverlay.LABEL_CONNECTOR_HEIGHT;

      this.#connectorLineContainer.style.transform = `translateY(${translation}px) rotate(180deg)`;
    }

    const connector = this.#connectorLineContainer.querySelector('line');
    const circle = this.#connectorLineContainer.querySelector('circle');
    if (!connector || !circle) {
      console.error('Some entry label elements are missing.');
      return;
    }
    // PART 2: draw the connector from label to the entry
    // Set the width of the canvas that draws the connector to be equal to the length of the shift multiplied by two.
    // That way, we can draw the connector from its corner to its middle. Since all elements are alligned in the middle, the connector
    // will end in the middle of the entry.
    this.#connectorLineContainer.setAttribute(
        'width', (EntryLabelOverlay.LABEL_AND_CONNECTOR_SHIFT_LENGTH * 2).toString());
    this.#connectorLineContainer.setAttribute('height', EntryLabelOverlay.LABEL_CONNECTOR_HEIGHT.toString());
    // Start drawing the top right corner.
    connector.setAttribute('x1', '0');
    connector.setAttribute('y1', '0');
    // Finish drawing in middle of the connector container.
    connector.setAttribute('x2', EntryLabelOverlay.LABEL_AND_CONNECTOR_SHIFT_LENGTH.toString());
    connector.setAttribute('y2', EntryLabelOverlay.LABEL_CONNECTOR_HEIGHT.toString());
    const connectorColor = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-text-primary');
    connector.setAttribute('stroke', connectorColor);
    connector.setAttribute('stroke-width', '2');

    // Draw the circle at the bottom of the connector
    circle.setAttribute('cx', EntryLabelOverlay.LABEL_AND_CONNECTOR_SHIFT_LENGTH.toString());
    circle.setAttribute('cy', EntryLabelOverlay.LABEL_CONNECTOR_HEIGHT.toString());
    circle.setAttribute('r', '3');
    circle.setAttribute('fill', connectorColor);
  }

  #drawLabel(initialLabel?: string): void {
    if (!this.#inputField) {
      console.error('`labelBox`element is missing.');
      return;
    }

    if (typeof initialLabel === 'string') {
      this.#inputField.innerText = initialLabel;
    }

    let xTranslation: number|null = null;
    let yTranslation: number|null = null;
    // PART 1: draw the label box
    if (this.#shouldDrawBelowEntry) {
      // Label is drawn below and slightly to the right.
      xTranslation = EntryLabelOverlay.LABEL_AND_CONNECTOR_SHIFT_LENGTH;
    } else {
      // If the label is drawn above, the connector goes up and to the left, so
      // we pull the label back slightly to align it nicely.
      xTranslation = EntryLabelOverlay.LABEL_AND_CONNECTOR_SHIFT_LENGTH * -1;
    }

    if (this.#shouldDrawBelowEntry && this.#entryLabelVisibleHeight) {
      // Move the label down from above the entry to below it. The label is positioned by default quite far above the entry, hence why we add:
      // 1. the height of the entry + of the label (inc its padding)
      // 2. the height of the connector (*2), so we have room to draw it
      const verticalTransform = this.#entryLabelVisibleHeight + EntryLabelOverlay.LABEL_HEIGHT +
          EntryLabelOverlay.LABEL_PADDING * 2 + EntryLabelOverlay.LABEL_CONNECTOR_HEIGHT * 2;

      yTranslation = verticalTransform;
    }

    let transformString = '';
    if (xTranslation) {
      transformString += `translateX(${xTranslation}px) `;
    }
    if (yTranslation) {
      transformString += `translateY(${yTranslation}px)`;
    }

    if (transformString.length) {
      this.#inputField.style.transform = transformString;
    }
  }

  #focusInputBox(): void {
    if (!this.#inputField) {
      console.error('`labelBox` element is missing.');
      return;
    }
    this.#inputField.focus();
  }

  setLabelEditabilityAndRemoveEmptyLabel(editable: boolean): void {
    this.#isLabelEditable = editable;
    this.#render();
    // If the label is editable, focus cursor on it
    if (editable) {
      this.#focusInputBox();
    }
    // On MacOS when clearing the input box it is left with a new line, so we
    // trim the string to remove any accidental trailing whitespace.
    const newLabelText = this.#inputField?.textContent?.trim() ?? '';
    // If the label is empty when it is being navigated away from, dispatch an event to remove this entry overlay
    if (!editable && newLabelText.length === 0 && !this.#isPendingRemoval) {
      this.#isPendingRemoval = true;
      this.dispatchEvent(new EmptyEntryLabelRemoveEvent());
    }
  }

  #render(): void {
    // clang-format off
    LitHtml.render(
        LitHtml.html`
        <span class="label-parts-wrapper" role="region" aria-label=${i18nString(UIStrings.entryLabel)}>
          <span
            class="input-field"
            role="textbox"
            @dblclick=${() => this.setLabelEditabilityAndRemoveEmptyLabel(true)}
            @blur=${() => this.setLabelEditabilityAndRemoveEmptyLabel(false)}
            @keydown=${this.#handleLabelInputKeyDown}
            @paste=${this.#handleLabelInputPaste}
            @keyup=${this.#handleLabelInputKeyUp}
            contenteditable=${this.#isLabelEditable ? 'plaintext-only' : false}>
          </span>
          <svg class="connectorContainer">
            <line/>
            <circle/>
          </svg>
          <div class="entry-highlight-wrapper"></div>
        </span>`,
        this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-entry-label-overlay', EntryLabelOverlay);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-entry-label-overlay': EntryLabelOverlay;
  }
}
