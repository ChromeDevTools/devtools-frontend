
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../../core/i18n/i18n.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as ThemeSupport from '../../../../ui/legacy/theme_support/theme_support.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';

const UIStrings = {
  /**
   *@description Accessible label used to explain to a user that they are viewing an arrow representing a link between two entries.
   */
  diagram: 'Links bteween entries',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/overlays/components/EntriesLinkOverlay.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

import styles from './entriesLinkOverlay.css.js';

export class EntriesLinkOverlay extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-entries-link-overlay`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);
  #coordinateFrom: {x: number, y: number};
  #fromEntryDimentions: {width: number, height: number};
  #coordinateTo: {x: number, y: number};
  #toEntryDimentions: {width: number, height: number}|null = null;
  #connectorLineContainer: SVGAElement|null = null;
  #connector: SVGLineElement|null = null;
  #entryFromWrapper: SVGLineElement|null = null;
  #entryToWrapper: SVGLineElement|null = null;
  #entryFromConnector: SVGCircleElement|null = null;
  #entryToConnector: SVGCircleElement|null = null;
  #entryFromVisible: boolean = true;
  #entryToVisible: boolean = true;
  #canvasRect: DOMRect|null = null;

  // These flags let us know if the entry we are drawing from/to are the
  // originals, or if they are the parent, which can happen if an entry is
  // collapsed. We care about this because if the entry is not the source, we
  // draw the border as dashed, not solid.
  #fromEntryIsSource: boolean = true;
  #toEntryIsSource: boolean = true;

  constructor(initialFromEntryCoordinateAndDimentions: {x: number, y: number, width: number, height: number}) {
    super();
    this.#render();
    this.#coordinateFrom = {x: initialFromEntryCoordinateAndDimentions.x, y: initialFromEntryCoordinateAndDimentions.y};
    this.#fromEntryDimentions = {
      width: initialFromEntryCoordinateAndDimentions.width,
      height: initialFromEntryCoordinateAndDimentions.height,
    };
    this.#coordinateTo = {x: initialFromEntryCoordinateAndDimentions.x, y: initialFromEntryCoordinateAndDimentions.y};
    this.#connectorLineContainer = this.#shadow.querySelector<SVGAElement>('.connectorContainer') ?? null;
    this.#connector = this.#connectorLineContainer?.querySelector('line') ?? null;
    this.#entryFromWrapper = this.#connectorLineContainer?.querySelector('.entryFromWrapper') ?? null;
    this.#entryToWrapper = this.#connectorLineContainer?.querySelector('.entryToWrapper') ?? null;
    this.#entryFromConnector = this.#connectorLineContainer?.querySelector('.entryFromConnector') ?? null;
    this.#entryToConnector = this.#connectorLineContainer?.querySelector('.entryToConnector') ?? null;
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

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [styles];
  }

  /**
   * If one entry that is linked is in a collapsed track, we show the outlines
   * but hide only the arrow.
   */
  set hideArrow(shouldHide: boolean) {
    if (this.#connector) {
      this.#connector.style.display = shouldHide ? 'none' : 'block';
    }
  }

  set fromEntryCoordinateAndDimentions(fromEntryParams: {x: number, y: number, length: number, height: number}) {
    this.#coordinateFrom = {x: fromEntryParams.x, y: fromEntryParams.y};
    this.#fromEntryDimentions = {width: fromEntryParams.length, height: fromEntryParams.height};
    this.#redrawConnectionArrow();
  }

  set entriesVisibility(entriesVisibility: {fromEntryVisibility: boolean, toEntryVisibility: boolean}) {
    this.#entryFromVisible = entriesVisibility.fromEntryVisibility;
    this.#entryToVisible = entriesVisibility.toEntryVisibility;
  }

  // The arrow might be pointing either to an entry or an empty space.
  // If the dimentions are not passed, it is pointing at an empty space.
  set toEntryCoordinateAndDimentions(toEntryParams: {x: number, y: number, length?: number, height?: number}) {
    this.#coordinateTo = {x: toEntryParams.x, y: toEntryParams.y};
    if (toEntryParams.length && toEntryParams.height) {
      this.#toEntryDimentions = {width: toEntryParams.length, height: toEntryParams.height};
    } else {
      this.#toEntryDimentions = null;
    }

    this.#redrawConnectionArrow();
  }

  set fromEntryIsSource(x: boolean) {
    if (x === this.#fromEntryIsSource) {
      return;
    }
    this.#fromEntryIsSource = x;
    this.#render();
  }

  set toEntryIsSource(x: boolean) {
    if (x === this.#toEntryIsSource) {
      return;
    }
    this.#toEntryIsSource = x;
    this.#render();
  }

  #redrawConnectionArrow(): void {
    if (!this.#connector || !this.#entryFromWrapper || !this.#entryToWrapper || !this.#entryFromConnector ||
        !this.#entryToConnector) {
      console.error('`connector` element is missing.');
      return;
    }

    // We do not draw the connectors if the entry is not visible, or if the
    // entry we are connecting to isn't the actual source entry.
    // We also don't draw them if an entry is completely hidden, in which case
    // we aren't drawing the arrows, so it doesn't make sense to draw the
    // connectors.
    const drawFromEntryConnectorCircle = this.#entryFromVisible && this.#entryToVisible && this.#fromEntryIsSource;
    const drawToEntryConnectorCircle = this.#entryFromVisible && this.#entryToVisible && this.#toEntryIsSource;

    this.#entryFromConnector.setAttribute('visibility', drawFromEntryConnectorCircle ? 'visible' : 'hidden');
    this.#entryToConnector.setAttribute('visibility', drawToEntryConnectorCircle ? 'visible' : 'hidden');

    // If the entry is visible, the entry arrow starts from the end on the X axis and middle of the Y axis.
    // If not, draw it to the same y point without the entry height offset and the box around the entry.
    // This way it will be attached to the track edge.
    if (this.#entryFromVisible) {
      const halfEntryHeight = this.#fromEntryDimentions.height / 2;
      const endConnectionPointX = String(this.#coordinateFrom.x + this.#fromEntryDimentions.width);
      const endConnectionPointY = String(this.#coordinateFrom.y + halfEntryHeight);

      this.#connector.setAttribute('x1', endConnectionPointX);
      this.#connector.setAttribute('y1', endConnectionPointY);

      this.#entryFromConnector.setAttribute('cx', endConnectionPointX);
      this.#entryFromConnector.setAttribute('cy', endConnectionPointY);

      this.#entryFromWrapper.setAttribute('visibility', 'visible');
      this.#entryFromWrapper.setAttribute('x', this.#coordinateFrom.x.toString());
      this.#entryFromWrapper.setAttribute('y', this.#coordinateFrom.y.toString());
      this.#entryFromWrapper.setAttribute('width', this.#fromEntryDimentions.width.toString());
      this.#entryFromWrapper.setAttribute('height', this.#fromEntryDimentions.height.toString());
    } else {
      this.#connector.setAttribute('x1', (this.#coordinateFrom.x + this.#fromEntryDimentions.width).toString());
      this.#connector.setAttribute('y1', this.#coordinateFrom.y.toString());
      this.#entryFromWrapper.setAttribute('visibility', 'hidden');
    }

    // If the arrow is pointing to the entry, point it to the middle of the entry and draw a box around the entry.
    // If the arrow is pointing to an entry, but it is not visible, the coordinates are for the edge of the track
    // and we don't need the half entry height offset.
    // Otherwise, thhe arrow is following the mouse so we assign it to the provided coordinates.
    if (this.#toEntryDimentions) {
      if (this.#entryToVisible) {
        this.#entryToWrapper.setAttribute('visibility', 'visible');
        this.#entryToWrapper.setAttribute('x', this.#coordinateTo.x.toString());
        this.#entryToWrapper.setAttribute('y', this.#coordinateTo.y.toString());
        this.#entryToWrapper.setAttribute('width', this.#toEntryDimentions.width.toString());
        this.#entryToWrapper.setAttribute('height', this.#toEntryDimentions.height.toString());

        const connectionPointX = String(this.#coordinateTo.x);
        const connectionPointY = String(this.#coordinateTo.y + this.#toEntryDimentions.height / 2);

        this.#connector.setAttribute('x2', connectionPointX);
        this.#connector.setAttribute('y2', connectionPointY);

        this.#entryToConnector.setAttribute('cx', connectionPointX);
        this.#entryToConnector.setAttribute('cy', connectionPointY);

      } else {
        this.#entryToWrapper.setAttribute('visibility', 'hidden');
        this.#connector.setAttribute('x2', this.#coordinateTo.x.toString());
        this.#connector.setAttribute('y2', (this.#coordinateTo.y).toString());
      }

    } else {
      this.#entryToWrapper.setAttribute('visibility', 'hidden');
      this.#connector.setAttribute('x2', this.#coordinateTo.x.toString());
      this.#connector.setAttribute('y2', this.#coordinateTo.y.toString());
    }

    this.#connector.setAttribute('stroke-width', '2');

    if (this.#entryFromVisible && !this.#entryToVisible) {
      this.#connector.setAttribute('stroke', 'url(#fromVisibleLineGradient)');
    } else if (this.#entryToVisible && !this.#entryFromVisible) {
      this.#connector.setAttribute('stroke', 'url(#toVisibleLineGradient)');
    } else {
      const arrowColor = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-text-primary');
      this.#connector.setAttribute('stroke', arrowColor);
    }

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  /*
   * When only one entry from the connection is visible, the connection
   * line becomes a gradient from the visible entry to the edge of
   * the screen towards the entry that is not visible.
   *
   * To achieve this, we need to calculate what percentage of the
   * visible screen the connection is currently occupying and apply
   * that gradient to the visible connection part.
   */
  #partlyVisibleConnectionLinePercentage(): number {
    if (!this.#canvasRect) {
      return 100;
    }

    const lineLength = this.#coordinateTo.x - (this.#coordinateFrom.x + this.#fromEntryDimentions.width);
    let visibleLineLength = 0;

    // If the visible entry is the 'From' entry, find the length of the visible arrow by
    // substracting the point where the arrow starts from the whole canvas length.
    // If the 'to' entry is visible, the coordinate of the entry will be equal to
    // the visible arrow length.
    if (this.#entryFromVisible && !this.#entryToVisible) {
      visibleLineLength = this.#canvasRect.width - (this.#coordinateFrom.x + this.#fromEntryDimentions.width);
    } else if (!this.#entryFromVisible && this.#entryToVisible) {
      visibleLineLength = this.#coordinateTo.x;
    }

    const visibleLineFromTotalPercentage = (visibleLineLength * 100) / lineLength;

    return (visibleLineFromTotalPercentage < 100) ? visibleLineFromTotalPercentage : 100;
  }

  /*
  The entries link overlay is an arrow connecting 2 entries.
  The Entries are drawn by Flamechart and this Overlay is only drawing the arrow between them.
   _________
  |__entry__|\
              \
               \          <-- arrow connecting the sides of entries drawn by this overlay
                \   ________________
                 ➘ |_____entry______|
  */
  #render(): void {
    const arrowColor = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-text-primary');
    // clang-format off
    LitHtml.render(
        LitHtml.html`
          <svg class="connectorContainer" width="100%" height="100%" role="region" aria-label=${i18nString(UIStrings.diagram)}>
            <defs>
              <linearGradient
                id="fromVisibleLineGradient"
                x1="0%" y1="0%" x2="100%" y2="0%">
                <stop
                  offset="0%"
                  stop-color="black"
                  stop-opacity="1" />
                <stop
                  offset="${this.#partlyVisibleConnectionLinePercentage()}%"
                  stop-color="black"
                  stop-opacity="0" />
              </linearGradient>

              <linearGradient
                id="toVisibleLineGradient"
                x1="0%" y1="0%" x2="100%" y2="0%">
                <stop
                  offset="${100 - this.#partlyVisibleConnectionLinePercentage()}%"
                  stop-color="black"
                  stop-opacity="0" />
                <stop
                  offset="100%"
                  stop-color="black"
                  stop-opacity="1" />
              </linearGradient>
              <marker
                id="arrow"
                orient="auto"
                markerWidth="3"
                markerHeight="4"
                fill-opacity="1"
                refX="4"
                refY="2">
                <path d="M0,0 V4 L4,2 Z" fill=${arrowColor} />
              </marker>
            </defs>
            <line
              marker-end="url(#arrow)"
              stroke-dasharray=${!this.#fromEntryIsSource || !this.#toEntryIsSource ? DASHED_STROKE_AMOUNT : 'none'}
              stroke-opacity=${!this.#entryFromVisible && !this.#entryToVisible ? OUT_OF_VIEW_STROKE_OPACITY : 1}
              />

            <rect
              class="entryFromWrapper" fill="none" stroke="black" stroke-dasharray=${this.#fromEntryIsSource ? 'none' : DASHED_STROKE_AMOUNT} />
            <rect
              class="entryToWrapper" fill="none" stroke="black" stroke-dasharray=${this.#toEntryIsSource ? 'none' : DASHED_STROKE_AMOUNT} />

            <circle class="entryFromConnector" fill="none" stroke=${arrowColor} stroke-width="2" cx="50" cy="50" r="3" />
            <circle class="entryToConnector" fill="none" stroke=${arrowColor} stroke-width="2" cx="50" cy="50" r="3" />
          </svg>
        `,
        this.#shadow, {host: this});
    // clang-format on
  }
}

// Defines the gap in the border when we are drawing a dashed outline.
// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray
const DASHED_STROKE_AMOUNT = 4;
const OUT_OF_VIEW_STROKE_OPACITY = 0.2;

customElements.define('devtools-entries-link-overlay', EntriesLinkOverlay);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-entries-link-overlay': EntriesLinkOverlay;
  }
}
