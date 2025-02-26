// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../../ui/components/icon_button/icon_button.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as ThemeSupport from '../../../../ui/legacy/theme_support/theme_support.js';
import {html, render} from '../../../../ui/lit/lit.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';

import stylesRaw from './entriesLinkOverlay.css.js';

const UIStrings = {
  /**
   *@description Accessible label used to explain to a user that they are viewing an arrow representing a link between two entries.
   */
  diagram: 'Links bteween entries',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/timeline/overlays/components/EntriesLinkOverlay.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const styles = new CSSStyleSheet();
styles.replaceSync(stylesRaw.cssContent);

export class EntryLinkStartCreating extends Event {
  static readonly eventName = 'entrylinkstartcreating';

  constructor() {
    super(EntryLinkStartCreating.eventName, {bubbles: true, composed: true});
  }
}

export class EntriesLinkOverlay extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #coordinateFrom: {x: number, y: number};
  #fromEntryDimensions: {width: number, height: number};
  #coordinateTo: {x: number, y: number};
  #toEntryDimensions: {width: number, height: number}|null = null;
  #connectorLineContainer: SVGAElement|null = null;
  #connector: SVGLineElement|null = null;
  #entryFromWrapper: HTMLElement|null = null;
  #entryToWrapper: HTMLElement|null = null;
  #entryFromConnector: SVGCircleElement|null = null;
  #entryToConnector: SVGCircleElement|null = null;
  #entryFromVisible = true;
  #entryToVisible = true;
  #canvasRect: DOMRect|null = null;

  // These flags let us know if the entry we are drawing from/to are the
  // originals, or if they are the parent, which can happen if an entry is
  // collapsed. We care about this because if the entry is not the source, we
  // draw the border as dashed, not solid.
  #fromEntryIsSource = true;
  #toEntryIsSource = true;
  #arrowHidden = false;
  #linkState: Trace.Types.File.EntriesLinkState;

  constructor(
      initialFromEntryCoordinateAndDimensions: {x: number, y: number, width: number, height: number},
      linkCreationNotStartedState: Trace.Types.File.EntriesLinkState) {
    super();
    this.#render();
    this.#coordinateFrom = {x: initialFromEntryCoordinateAndDimensions.x, y: initialFromEntryCoordinateAndDimensions.y};
    this.#fromEntryDimensions = {
      width: initialFromEntryCoordinateAndDimensions.width,
      height: initialFromEntryCoordinateAndDimensions.height,
    };
    this.#coordinateTo = {x: initialFromEntryCoordinateAndDimensions.x, y: initialFromEntryCoordinateAndDimensions.y};
    this.#connectorLineContainer = this.#shadow.querySelector<SVGAElement>('.connectorContainer') ?? null;
    this.#connector = this.#connectorLineContainer?.querySelector('line') ?? null;
    this.#entryFromWrapper = this.#shadow.querySelector('.from-highlight-wrapper') ?? null;
    this.#entryToWrapper = this.#shadow.querySelector('.to-highlight-wrapper') ?? null;
    this.#entryFromConnector = this.#connectorLineContainer?.querySelector('.entryFromConnector') ?? null;
    this.#entryToConnector = this.#connectorLineContainer?.querySelector('.entryToConnector') ?? null;
    this.#linkState = linkCreationNotStartedState;
    this.#render();
  }

  set canvasRect(rect: DOMRect|null) {
    if (rect === null) {
      return;
    }
    if (this.#canvasRect && this.#canvasRect.width === rect.width && this.#canvasRect.height === rect.height) {
      return;
    }
    this.#canvasRect = rect;
    this.#render();
  }

  entryFromWrapper(): HTMLElement|null {
    return this.#entryFromWrapper;
  }

  entryToWrapper(): HTMLElement|null {
    return this.#entryToWrapper;
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [styles];
  }

  /**
   * If one entry that is linked is in a collapsed track, we show the outlines
   * but hide only the arrow.
   */
  set hideArrow(shouldHide: boolean) {
    this.#arrowHidden = shouldHide;
    if (this.#connector) {
      this.#connector.style.display = shouldHide ? 'none' : 'block';
    }
  }

  set fromEntryCoordinateAndDimensions(fromEntryParams: {x: number, y: number, length: number, height: number}) {
    this.#coordinateFrom = {x: fromEntryParams.x, y: fromEntryParams.y};
    this.#fromEntryDimensions = {width: fromEntryParams.length, height: fromEntryParams.height};
    this.#updateCreateLinkBox();
    this.#redrawConnectionArrow();
  }

  set entriesVisibility(entriesVisibility: {fromEntryVisibility: boolean, toEntryVisibility: boolean}) {
    this.#entryFromVisible = entriesVisibility.fromEntryVisibility;
    this.#entryToVisible = entriesVisibility.toEntryVisibility;
    this.#redrawConnectionArrow();
  }

  // The arrow might be pointing either to an entry or an empty space.
  // If the dimensions are not passed, it is pointing at an empty space.
  set toEntryCoordinateAndDimensions(toEntryParams: {x: number, y: number, length?: number, height?: number}) {
    this.#coordinateTo = {x: toEntryParams.x, y: toEntryParams.y};
    if (toEntryParams.length && toEntryParams.height) {
      this.#toEntryDimensions = {width: toEntryParams.length, height: toEntryParams.height};
    } else {
      this.#toEntryDimensions = null;
    }

    this.#updateCreateLinkBox();
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

    if (this.#linkState === Trace.Types.File.EntriesLinkState.CREATION_NOT_STARTED) {
      this.#entryFromConnector.setAttribute('visibility', 'hidden');
      this.#entryToConnector.setAttribute('visibility', 'hidden');
      return;
    }

    // If the user is zoomed out, the connector circles can be as large as the
    // event itself. So if the rectangle for this entry is too small, we
    // don't draw the circles.
    const minWidthToDrawConnectorCircles = 8;

    // We do not draw the connectors if the entry is not visible, or if the
    // entry we are connecting to isn't the actual source entry.
    // We also don't draw them if an entry is completely hidden, in which case
    // we aren't drawing the arrows, so it doesn't make sense to draw the
    // connectors.
    const drawFromEntryConnectorCircle = this.#entryFromVisible && !this.#arrowHidden && this.#fromEntryIsSource &&
        this.#fromEntryDimensions.width >= minWidthToDrawConnectorCircles;

    const widthOfToEntry = this.#toEntryDimensions?.width ?? 0;
    const drawToEntryConnectorCircle = !this.#arrowHidden && this.#entryToVisible && this.#toEntryIsSource &&
        widthOfToEntry >= minWidthToDrawConnectorCircles && !this.#arrowHidden;

    this.#entryFromConnector.setAttribute('visibility', drawFromEntryConnectorCircle ? 'visible' : 'hidden');
    this.#entryToConnector.setAttribute('visibility', drawToEntryConnectorCircle ? 'visible' : 'hidden');

    // If the entry is visible, the entry arrow starts from the middle of the right edge of the entry (end on the X axis and middle of the Y axis).
    // If not, draw it to the y coordinate of the entry and the edge of the timeline so it is pointing in the direction of the entry.
    const halfFromEntryHeight = this.#fromEntryDimensions.height / 2;
    if (this.#entryFromVisible) {
      const endConnectionPointX = String(this.#coordinateFrom.x + this.#fromEntryDimensions.width);
      const endConnectionPointY = String(this.#coordinateFrom.y + halfFromEntryHeight);

      this.#connector.setAttribute('x1', endConnectionPointX);
      this.#connector.setAttribute('y1', endConnectionPointY);

      this.#entryFromConnector.setAttribute('cx', endConnectionPointX);
      this.#entryFromConnector.setAttribute('cy', endConnectionPointY);
      this.#entryFromWrapper.style.visibility = 'visible';
    } else {
      this.#connector.setAttribute('x1', (this.#coordinateFrom.x + this.#fromEntryDimensions.width).toString());
      this.#connector.setAttribute('y1', String(this.#coordinateFrom.y + halfFromEntryHeight));
      this.#entryFromWrapper.style.visibility = 'hidden';
    }

    // If the arrow is pointing to the entry and that entry is visible, point it to the middle of the entry.
    // If the entry is not visible, point the arrow to the edge of the screen towards the entry.
    // Otherwise, the arrow is following the mouse so we assign it to the provided coordinates.
    if (this.#toEntryDimensions && this.#entryToVisible) {
      const connectionPointX = String(this.#coordinateTo.x);
      const connectionPointY = String(this.#coordinateTo.y + this.#toEntryDimensions.height / 2);

      this.#connector.setAttribute('x2', connectionPointX);
      this.#connector.setAttribute('y2', connectionPointY);

      this.#entryToConnector.setAttribute('cx', connectionPointX);
      this.#entryToConnector.setAttribute('cy', connectionPointY);

      this.#entryToWrapper.style.visibility = 'visible';
    } else {
      this.#entryToWrapper.style.visibility = 'hidden';
      this.#connector.setAttribute('x2', this.#coordinateTo.x.toString());
      // If `toEntryDimensions` exist, the arrow points to the entry and we need to take its height into account.
      // Otherwise, it is following the mouse.
      if (this.#toEntryDimensions) {
        const halfToEntryHeight = this.#toEntryDimensions.height / 2;
        this.#connector.setAttribute('y2', String(this.#coordinateTo.y + halfToEntryHeight));
      } else {
        this.#connector.setAttribute('y2', (this.#coordinateTo.y).toString());
      }
    }

    this.#connector.setAttribute('stroke-width', '2');

    if (this.#toEntryDimensions && this.#entryFromVisible && !this.#entryToVisible) {
      this.#connector.setAttribute('stroke', 'url(#fromVisibleLineGradient)');
    } else if (this.#toEntryDimensions && this.#entryToVisible && !this.#entryFromVisible) {
      this.#connector.setAttribute('stroke', 'url(#toVisibleLineGradient)');
    } else {
      const arrowColor = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-text-primary');
      this.#connector.setAttribute('stroke', arrowColor);
    }

    this.#render();
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

    const lineLength = this.#coordinateTo.x - (this.#coordinateFrom.x + this.#fromEntryDimensions.width);
    let visibleLineLength = 0;

    // If the visible entry is the 'From' entry, find the length of the visible arrow by
    // subtracting the point where the arrow starts from the whole canvas length.
    // If the 'to' entry is visible, the coordinate of the entry will be equal to
    // the visible arrow length.
    if (this.#entryFromVisible && !this.#entryToVisible) {
      visibleLineLength = this.#canvasRect.width - (this.#coordinateFrom.x + this.#fromEntryDimensions.width);
    } else if (!this.#entryFromVisible && this.#entryToVisible) {
      visibleLineLength = this.#coordinateTo.x;
    }

    const visibleLineFromTotalPercentage = (visibleLineLength * 100) / lineLength;

    return (visibleLineFromTotalPercentage < 100) ? visibleLineFromTotalPercentage : 100;
  }

  #updateCreateLinkBox(): void {
    const createLinkBox = this.#shadow.querySelector<HTMLElement>('.create-link-box');
    const createLinkIcon = createLinkBox?.querySelector<HTMLElement>('.create-link-icon') ?? null;

    if (!createLinkBox || !createLinkIcon) {
      console.error('creating element is missing.');
      return;
    }

    if (this.#linkState !== Trace.Types.File.EntriesLinkState.CREATION_NOT_STARTED) {
      createLinkIcon.style.display = 'none';
      return;
    }

    createLinkIcon.style.left = `${this.#coordinateFrom.x + this.#fromEntryDimensions.width}px`;
    createLinkIcon.style.top = `${this.#coordinateFrom.y}px`;
  }

  #startCreatingConnection(): void {
    this.#linkState = Trace.Types.File.EntriesLinkState.PENDING_TO_EVENT;
    this.dispatchEvent(new EntryLinkStartCreating());
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
    render(
        html`
          <svg class="connectorContainer" width="100%" height="100%" role="region" aria-label=${i18nString(UIStrings.diagram)}>
            <defs>
              <linearGradient
                id="fromVisibleLineGradient"
                x1="0%" y1="0%" x2="100%" y2="0%">
                <stop
                  offset="0%"
                  stop-color=${arrowColor}
                  stop-opacity="1" />
                <stop
                  offset="${this.#partlyVisibleConnectionLinePercentage()}%"
                  stop-color=${arrowColor}
                  stop-opacity="0" />
              </linearGradient>

              <linearGradient
                id="toVisibleLineGradient"
                x1="0%" y1="0%" x2="100%" y2="0%">
                <stop
                  offset="${100 - this.#partlyVisibleConnectionLinePercentage()}%"
                  stop-color=${arrowColor}
                  stop-opacity="0" />
                <stop
                  offset="100%"
                  stop-color=${arrowColor}
                  stop-opacity="1" />
              </linearGradient>
              <marker
                id="arrow"
                orient="auto"
                markerWidth="3"
                markerHeight="4"
                fill-opacity="1"
                refX="4"
                refY="2"
                visibility=${this.#entryToVisible || !this.#toEntryDimensions ? 'visible' : 'hidden'}>
                <path d="M0,0 V4 L4,2 Z" fill=${arrowColor} />
              </marker>
            </defs>
            <line
              marker-end="url(#arrow)"
              stroke-dasharray=${!this.#fromEntryIsSource || !this.#toEntryIsSource ? DASHED_STROKE_AMOUNT : 'none'}
              visibility=${!this.#entryFromVisible && !this.#entryToVisible ? 'hidden' : 'visible'}
              />
            <circle class="entryFromConnector" fill="none" stroke=${arrowColor} stroke-width=${CONNECTOR_CIRCLE_STROKE_WIDTH} r=${CONNECTOR_CIRCLE_RADIUS} />
            <circle class="entryToConnector" fill="none" stroke=${arrowColor} stroke-width=${CONNECTOR_CIRCLE_STROKE_WIDTH} r=${CONNECTOR_CIRCLE_RADIUS} />
          </svg>
          <div class="entry-wrapper from-highlight-wrapper ${this.#fromEntryIsSource ? '' : 'entry-is-not-source'}"></div>
          <div class="entry-wrapper to-highlight-wrapper ${this.#toEntryIsSource ? '' : 'entry-is-not-source'}"></div>
          <div class="create-link-box ${this.#linkState ? 'visible' : 'hidden'}">
            <devtools-icon
              class='create-link-icon'
              jslog=${VisualLogging.action('timeline.annotations.create-entry-link').track({click: true})}
              @click=${this.#startCreatingConnection}
              name='arrow-right-circle'>
            </devtools-icon>
          </div>
        `,
        this.#shadow, {host: this});
    // clang-format on
  }
}

const CONNECTOR_CIRCLE_RADIUS = 2;
const CONNECTOR_CIRCLE_STROKE_WIDTH = 1;

// Defines the gap in the border when we are drawing a dashed outline.
// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray
const DASHED_STROKE_AMOUNT = 4;

customElements.define('devtools-entries-link-overlay', EntriesLinkOverlay);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-entries-link-overlay': EntriesLinkOverlay;
  }
}
