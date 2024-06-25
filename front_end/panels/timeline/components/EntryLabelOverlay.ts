// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import styles from './entryLabelOverlay.css.js';

export class EmptyEntryLabelRemoveEvent extends Event {
  static readonly eventName = 'emptyentrylabelremoveevent';

  constructor() {
    super(EmptyEntryLabelRemoveEvent.eventName);
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
  // The label is set to editable when it is double clicked. If the user clicks away from the label box
  // element, the lable is set to not editable until it double clicked.
  #isLabelEditable: boolean = true;
  #entryDimensions: {height: number, width: number}|null = null;

  #labelPartsWrapper: HTMLElement|null = null;
  #labelBox: HTMLElement|null = null;

  /*
The entry label overlay consists of 3 parts - the label part with the label string inside,
the line connecting the label to the entry, and a black box around an entry to highlight the entry with a label.
________
|_label__|                <-- label part with the label string inside
    \
     \                   <-- line connecting the label to the entry with a circle at the end
      \
_______◯_________
|_____entry______|         <--- box around an entry

`drawLabel` method below draws the first part.
`drawConnector` method below draws the second part - the connector line with a circle and the svg container for them.
`drawEntryHighlightWrapper` draws the third part.
We only rerender the first part if the label changes and the third part if the size of the entry changes.
The connector and circle shapes never change so we only draw the second part when the component is created.

Otherwise, the entry label overlay object only gets repositioned.
*/

  constructor(label: string) {
    super();
    this.#render();
    this.#labelPartsWrapper = this.#shadow.querySelector<HTMLElement>('.label-parts-wrapper');
    this.#drawLabel(label);
    this.#drawConnector();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [styles];
    this.#labelBox?.addEventListener('keydown', this.#handleLabelInputKeyDown);
    this.#labelBox?.addEventListener('paste', this.#handleLabelInputPaste);
  }

  disconnectedCallback(): void {
    this.#labelBox?.removeEventListener('keydown', this.#handleLabelInputKeyDown);
    this.#labelBox?.removeEventListener('paste', this.#handleLabelInputPaste);
  }

  #handleLabelInputKeyDown(event: KeyboardEvent): boolean {
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
      this.dispatchEvent(new FocusEvent('blur', {bubbles: true}));
      return false;
    }

    // If the max limit is not reached, return true
    if (!this.textContent || this.textContent.length <= EntryLabelOverlay.MAX_LABEL_LENGTH) {
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
    if (!clipboardData) {
      return;
    }

    const pastedText = clipboardData.getData('text');

    const newText = this.textContent + pastedText;
    const trimmedText = newText.slice(0, EntryLabelOverlay.MAX_LABEL_LENGTH + 1);

    this.textContent = trimmedText;

    // Reset the selection to the end
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(this);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  set entryDimensions(entryDimensions: {height: number, width: number}) {
    if (entryDimensions.height === this.#entryDimensions?.height &&
        entryDimensions.width === this.#entryDimensions?.width) {
      return;
    }

    this.#entryDimensions = entryDimensions;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
    // We need to redraw the entry wrapper only if the entry dimensions change
    this.#drawEntryHighlightWrapper();
  }

  #drawConnector(): void {
    if (!this.#labelPartsWrapper) {
      console.error('`labelPartsWrapper` element is missing.');
      return;
    }
    const connectorLineContainer = this.#labelPartsWrapper.querySelector('.connectorContainer') as SVGAElement;
    const connector = connectorLineContainer.querySelector('line');
    const circle = connectorLineContainer.querySelector('circle');
    const entryHighlightWrapper = this.#labelPartsWrapper.querySelector('.entry-highlight-wrapper') as HTMLElement;
    if (!connectorLineContainer || !entryHighlightWrapper || !connector || !circle) {
      console.error('Some entry label elements are missing.');
      return;
    }
    // PART 2: draw the connector from label to the entry
    // Set the width of the canvas that draws the connector to be equal to the length of the shift multiplied by two.
    // That way, we can draw the connector from its corner to its middle. Since all elements are alligned in the middle, the connector
    // will end in the middle of the entry.
    connectorLineContainer.setAttribute('width', (EntryLabelOverlay.LABEL_AND_CONNECTOR_SHIFT_LENGTH * 2).toString());
    connectorLineContainer.setAttribute('height', EntryLabelOverlay.LABEL_CONNECTOR_HEIGHT.toString());
    // Start drawing the top right corner.
    connector.setAttribute('x1', '0');
    connector.setAttribute('y1', '0');
    // Finish drawing in middle of the connector container.
    connector.setAttribute('x2', EntryLabelOverlay.LABEL_AND_CONNECTOR_SHIFT_LENGTH.toString());
    connector.setAttribute('y2', EntryLabelOverlay.LABEL_CONNECTOR_HEIGHT.toString());
    connector.setAttribute('stroke', 'black');
    connector.setAttribute('stroke-width', '2');

    // Draw the circle at the bottom of the connector
    circle.setAttribute('cx', EntryLabelOverlay.LABEL_AND_CONNECTOR_SHIFT_LENGTH.toString());
    circle.setAttribute('cy', EntryLabelOverlay.LABEL_CONNECTOR_HEIGHT.toString());
    circle.setAttribute('r', '3');
    circle.setAttribute('fill', 'black');
  }

  #drawLabel(initialLabel: string): void {
    if (!this.#labelPartsWrapper) {
      console.error('`labelPartsWrapper` element is missing.');
      return;
    }

    this.#labelBox = this.#labelPartsWrapper.querySelector<HTMLElement>('.label-box');

    if (!this.#labelBox) {
      console.error('`labelBox` element is missing.');
      return;
    }

    this.#labelBox.innerText = initialLabel;
    // PART 1: draw the label box
    // Set label height to the entry height
    this.#labelBox.style.height = `${EntryLabelOverlay.LABEL_HEIGHT}px`;
    this.#labelBox.style.padding = `${EntryLabelOverlay.LABEL_PADDING}px`;
    this.#labelBox.style.transform = `translateX(-${EntryLabelOverlay.LABEL_AND_CONNECTOR_SHIFT_LENGTH}px)`;

    // If the label is not empty, it was loaded from the trace file.
    // In that case, do not make just created label editable.
    if (initialLabel !== '') {
      this.#setLabelEditabilityAndRemoveEmptyLabel(false);
    }
  }

  #drawEntryHighlightWrapper(): void {
    if (!this.#labelPartsWrapper) {
      console.error('`labelPartsWrapper` element is missing.');
      return;
    }
    const entryHighlightWrapper = this.#labelPartsWrapper.querySelector('.entry-highlight-wrapper') as HTMLElement;

    if (!entryHighlightWrapper) {
      console.error('`entryHighlightWrapper` element is missing.');
      return;
    }

    // PART 3: draw the box that highlights the entry with a label
    entryHighlightWrapper.style.height = `${this.#entryDimensions?.height}px`;
    entryHighlightWrapper.style.width = `${this.#entryDimensions?.width}px`;

    // If the label is editable, focus cursor on it.
    // This method needs to be called after rendering the wrapper because it is the last label overlay element to render.
    // By doing this, the cursor focuses when the label is created.
    if (this.#isLabelEditable) {
      this.#focusInputBox();
    }
  }

  #focusInputBox(): void {
    if (!this.#labelBox) {
      console.error('`labelBox` element is missing.');
      return;
    }
    this.#labelBox.focus();
  }

  #setLabelEditabilityAndRemoveEmptyLabel(editable: boolean): void {
    this.#isLabelEditable = editable;
    this.#render();
    // If the label is editable, focus cursor on it
    if (editable) {
      this.#focusInputBox();
    }
    // If the label is empty when it is being navigated away from, dispatch an event to remove this entry overlay
    if (!editable && this.#labelBox?.innerText.length === 0) {
      this.dispatchEvent(new EmptyEntryLabelRemoveEvent());
    }
  }

  #render(): void {
    // clang-format off
    LitHtml.render(
        LitHtml.html`
        <span class="label-parts-wrapper">
          <span
            class="label-box"
            @dblclick=${() => this.#setLabelEditabilityAndRemoveEmptyLabel(true)}
            @blur=${() => this.#setLabelEditabilityAndRemoveEmptyLabel(false)}
            contenteditable=${this.#isLabelEditable}>
          </span>
          <svg class="connectorContainer">
            <line/>
            <circle/>
          </svg>
          <div class="entry-highlight-wrapper"/>
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
