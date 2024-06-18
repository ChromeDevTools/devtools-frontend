// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import styles from './entryLabelOverlay.css.js';

export class EntryLabelOverlay extends HTMLElement {
  // The label is angled on the left from the centre of the entry it belongs to.
  // `LABEL_AND_CONNECTOR_SHIFT_LENGTH` specifies how many pixels to the left it is shifted.
  static readonly LABEL_AND_CONNECTOR_SHIFT_LENGTH = 4;
  // Length of the line that connects the label to the entry.
  static readonly LABEL_CONNECTOR_HEIGHT = 6;
  static readonly LABEL_PADDING = 4;

  static readonly litTagName = LitHtml.literal`devtools-entry-label-overlay`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.render.bind(this);
  #label = '';

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [styles];
  }

  set label(label: string) {
    if (label === this.#label) {
      return;
    }
    this.#label = label;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  /*
The entry label overlay consists of 3 parts - the label part with the label string inside,
the line connecting the label to the entry, and a black box around an entry to highlight the entry with a label.
  ________
 |_label__|                <-- label part with the label string inside
      \
       \                   <-- line connecting the label to the entry
        \
 ________________
|_____entry______|         <--- box around an entry

`afterOverlayUpdate` method below draws those 3 parts.
The height of the label depends on the entry height, while the sizes of the connecting line, the shift of connecting line
and paddings are hardcoded.
*/
  afterOverlayUpdate(entryHeight: number, entryWidth: number): void {
    const labelPartsWrapper = this.#shadow.querySelector<HTMLElement>('.label-parts-wrapper');
    const labelBox = labelPartsWrapper?.querySelector<HTMLElement>('.label-box');
    const connectorLineContainer = labelPartsWrapper?.querySelector('#connectorContainer') as SVGAElement;
    const connector = connectorLineContainer.querySelector('line');
    const entryHighlightWrapper = labelPartsWrapper?.querySelector('.entry-highlight-wrapper') as HTMLElement;

    if (!labelBox || !connectorLineContainer || !entryHighlightWrapper || !connector) {
      console.error('Some entry label elements are missing.');
      return;
    }

    // PART 1: draw the label box
    // Set label height to the entry height
    labelBox.style.height = `${entryHeight}px`;
    labelBox.style.padding = `${EntryLabelOverlay.LABEL_PADDING}px`;
    labelBox.style.transform = `translateX(-${EntryLabelOverlay.LABEL_AND_CONNECTOR_SHIFT_LENGTH}px)`;
    labelBox.innerHTML = this.#label;

    // PART 2: draw the connector from label to the entry
    // Set the width of the canvas that draws the connector to be equal to the label element
    connectorLineContainer.setAttribute('width', (labelBox.getBoundingClientRect().width).toString());
    connectorLineContainer.setAttribute('height', EntryLabelOverlay.LABEL_CONNECTOR_HEIGHT.toString());
    // Start drawing the line from the middle of the label box accounting for the shift.
    connector.setAttribute(
        'x1',
        (connectorLineContainer.getBoundingClientRect().width / 2 - EntryLabelOverlay.LABEL_AND_CONNECTOR_SHIFT_LENGTH)
            .toString());
    connector.setAttribute('y1', '0');
    // Finish drawing in middle of the entry container.
    connector.setAttribute('x2', (connectorLineContainer.getBoundingClientRect().width / 2).toString());
    connector.setAttribute('y2', (connectorLineContainer.getBoundingClientRect().height).toString());
    connector.setAttribute('stroke', 'black');
    connector.setAttribute('stroke-width', '2');

    // PART 3: draw the box that highlights the entry with a label
    entryHighlightWrapper.style.height = `${entryHeight}px`;
    entryHighlightWrapper.style.width = `${entryWidth}px`;
  }

  render(): void {
    LitHtml.render(
        LitHtml.html`
        <span class="label-parts-wrapper">
        <div class="label-box"></div>
        <svg id="connectorContainer">
          <line/>
        </svg>
        <div class="entry-highlight-wrapper"/>
        </span>`,
        this.#shadow, {host: this});
  }
}

customElements.define('devtools-entry-label-overlay', EntryLabelOverlay);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-entry-label-overlay': EntryLabelOverlay;
  }
}
