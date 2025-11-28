// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../../ui/kit/kit.js';
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as ThemeSupport from '../../../../ui/legacy/theme_support/theme_support.js';
import { html, render } from '../../../../ui/lit/lit.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import entriesLinkOverlayStyles from './entriesLinkOverlay.css.js';
const UIStrings = {
    /**
     * @description Accessible label used to explain to a user that they are viewing an arrow representing a link between two entries.
     */
    diagram: 'Links between entries',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/overlays/components/EntriesLinkOverlay.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class EntryLinkStartCreating extends Event {
    static eventName = 'entrylinkstartcreating';
    constructor() {
        super(EntryLinkStartCreating.eventName, { bubbles: true, composed: true });
    }
}
export class EntriesLinkOverlay extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #coordinateFrom;
    #fromEntryDimensions;
    #coordinateTo;
    #toEntryDimensions = null;
    #connectorLineContainer = null;
    #connector = null;
    #entryFromWrapper = null;
    #entryToWrapper = null;
    #entryFromCirleConnector = null;
    #entryToCircleConnector = null;
    #entryFromVisible = true;
    #entryToVisible = true;
    #canvasRect = null;
    // These flags let us know if the entry we are drawing from/to are the
    // originals, or if they are the parent, which can happen if an entry is
    // collapsed. We care about this because if the entry is not the source, we
    // draw the border as dashed, not solid.
    #fromEntryIsSource = true;
    #toEntryIsSource = true;
    #arrowHidden = false;
    #linkState;
    constructor(initialFromEntryCoordinateAndDimensions, linkCreationNotStartedState) {
        super();
        this.#render();
        this.#coordinateFrom = { x: initialFromEntryCoordinateAndDimensions.x, y: initialFromEntryCoordinateAndDimensions.y };
        this.#fromEntryDimensions = {
            width: initialFromEntryCoordinateAndDimensions.width,
            height: initialFromEntryCoordinateAndDimensions.height,
        };
        this.#coordinateTo = { x: initialFromEntryCoordinateAndDimensions.x, y: initialFromEntryCoordinateAndDimensions.y };
        this.#connectorLineContainer = this.#shadow.querySelector('.connectorContainer') ?? null;
        this.#connector = this.#connectorLineContainer?.querySelector('line') ?? null;
        this.#entryFromWrapper = this.#shadow.querySelector('.from-highlight-wrapper') ?? null;
        this.#entryToWrapper = this.#shadow.querySelector('.to-highlight-wrapper') ?? null;
        this.#entryFromCirleConnector = this.#connectorLineContainer?.querySelector('.entryFromConnector') ?? null;
        this.#entryToCircleConnector = this.#connectorLineContainer?.querySelector('.entryToConnector') ?? null;
        this.#linkState = linkCreationNotStartedState;
        this.#render();
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
    entryFromWrapper() {
        return this.#entryFromWrapper;
    }
    entryToWrapper() {
        return this.#entryToWrapper;
    }
    /**
     * If one entry that is linked is in a collapsed track, we show the outlines
     * but hide only the arrow.
     */
    set hideArrow(shouldHide) {
        this.#arrowHidden = shouldHide;
        if (this.#connector) {
            this.#connector.style.display = shouldHide ? 'none' : 'block';
        }
    }
    set fromEntryCoordinateAndDimensions(fromEntryParams) {
        this.#coordinateFrom = { x: fromEntryParams.x, y: fromEntryParams.y };
        this.#fromEntryDimensions = { width: fromEntryParams.length, height: fromEntryParams.height };
        this.#updateCreateLinkBox();
        this.#redrawAllEntriesLinkParts();
    }
    set entriesVisibility(entriesVisibility) {
        this.#entryFromVisible = entriesVisibility.fromEntryVisibility;
        this.#entryToVisible = entriesVisibility.toEntryVisibility;
        this.#redrawAllEntriesLinkParts();
    }
    // The arrow might be pointing either to an entry or an empty space.
    // If the dimensions are not passed, it is pointing at an empty space.
    set toEntryCoordinateAndDimensions(toEntryParams) {
        this.#coordinateTo = { x: toEntryParams.x, y: toEntryParams.y };
        if (toEntryParams.length && toEntryParams.height) {
            this.#toEntryDimensions = { width: toEntryParams.length, height: toEntryParams.height };
        }
        else {
            this.#toEntryDimensions = null;
        }
        this.#updateCreateLinkBox();
        this.#redrawAllEntriesLinkParts();
    }
    set fromEntryIsSource(x) {
        if (x === this.#fromEntryIsSource) {
            return;
        }
        this.#fromEntryIsSource = x;
        this.#render();
    }
    set toEntryIsSource(x) {
        if (x === this.#toEntryIsSource) {
            return;
        }
        this.#toEntryIsSource = x;
        this.#render();
    }
    /*
      Redraw all parts of the EntriesLink overlay
       _________
      |__entry__|o\      <-- 'from 'entry wrapper and the circle connector next to it
                   \
                    \    <-- Arrow Connector
                     \   ________________
                      ➘ o|_____entry______|  <-- 'to' entry wrapper and the circle connector next to it
    */
    #redrawAllEntriesLinkParts() {
        if (!this.#connector || !this.#entryFromWrapper || !this.#entryToWrapper || !this.#entryFromCirleConnector ||
            !this.#entryToCircleConnector) {
            console.error('one of the required Entries Link elements is missing.');
            return;
        }
        if (this.#linkState === "creation_not_started" /* Trace.Types.File.EntriesLinkState.CREATION_NOT_STARTED */) {
            this.#entryFromCirleConnector.setAttribute('visibility', 'hidden');
            this.#entryToCircleConnector.setAttribute('visibility', 'hidden');
            this.#connector.style.display = 'none';
            return;
        }
        this.#setEntriesWrappersVisibility();
        this.#setConnectorCirclesVisibility();
        this.#setArrowConnectorStyle();
        this.#positionConnectorLineAndCircles();
        this.#render();
    }
    // Only draw the entry wrapper if that entry is visible
    #setEntriesWrappersVisibility() {
        if (!this.#entryFromWrapper || !this.#entryToWrapper) {
            return;
        }
        this.#entryFromWrapper.style.visibility = this.#entryFromVisible ? 'visible' : 'hidden';
        this.#entryToWrapper.style.visibility = this.#entryToVisible ? 'visible' : 'hidden';
    }
    // Draw the entry connector circles:
    //  - The entry the arrow is connecting to is the connection source
    //  - That entry currently is visible
    //  - There is enough space for the connector circle
    #setConnectorCirclesVisibility() {
        if (!this.#toEntryDimensions || !this.#entryFromCirleConnector || !this.#entryToCircleConnector) {
            return;
        }
        // If the user is zoomed out, the connector circles can be as large as the
        // event itself. So if the rectangle for this entry is too small, we
        // don't draw the circles.
        const minWidthToDrawConnectorCircles = 8;
        const drawFromEntryConnectorCircle = this.#entryFromVisible && !this.#arrowHidden && this.#fromEntryIsSource &&
            this.#fromEntryDimensions.width >= minWidthToDrawConnectorCircles;
        const drawToEntryConnectorCircle = !this.#arrowHidden && this.#entryToVisible && this.#toEntryIsSource &&
            this.#toEntryDimensions?.width >= minWidthToDrawConnectorCircles && !this.#arrowHidden;
        this.#entryFromCirleConnector.setAttribute('visibility', drawFromEntryConnectorCircle ? 'visible' : 'hidden');
        this.#entryToCircleConnector.setAttribute('visibility', drawToEntryConnectorCircle ? 'visible' : 'hidden');
    }
    #setArrowConnectorStyle() {
        if (!this.#connector) {
            return;
        }
        // If neither entry is visible, do not display the connector
        this.#connector.style.display = (this.#entryFromVisible || this.#entryToVisible) ? 'block' : 'none';
        this.#connector.setAttribute('stroke-width', '2');
        const arrowColor = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-text-primary');
        // Use a solid stroke if the 'to' entry's dimensions are unknown (during link creation) or if both entries are visible.
        if (!this.#toEntryDimensions || (this.#entryFromVisible && this.#entryToVisible)) {
            this.#connector.setAttribute('stroke', arrowColor);
            return;
        }
        // If one entry is not visible and one is, fade the arrow.
        if (this.#entryFromVisible && !this.#entryToVisible) {
            this.#connector.setAttribute('stroke', 'url(#fromVisibleLineGradient)');
        }
        else if (this.#entryToVisible && !this.#entryFromVisible) {
            this.#connector.setAttribute('stroke', 'url(#toVisibleLineGradient)');
        }
    }
    #positionConnectorLineAndCircles() {
        if (!this.#connector || !this.#entryFromCirleConnector || !this.#entryToCircleConnector) {
            return;
        }
        // If the entry is visible, the entry arrow starts from the middle of the right edge of the entry (end on the X axis and middle of the Y axis).
        // If not, draw it to the y coordinate of the entry and the edge of the timeline so it is pointing in the direction of the entry.
        const halfFromEntryHeight = this.#fromEntryDimensions.height / 2;
        const fromX = this.#coordinateFrom.x + this.#fromEntryDimensions.width;
        const fromY = this.#coordinateFrom.y + halfFromEntryHeight;
        this.#connector.setAttribute('x1', fromX.toString());
        this.#connector.setAttribute('y1', fromY.toString());
        this.#entryFromCirleConnector.setAttribute('cx', fromX.toString());
        this.#entryFromCirleConnector.setAttribute('cy', fromY.toString());
        // If the arrow is pointing to the entry and that entry is visible, point it to the middle of the entry.
        // If the entry is not visible, point the arrow to the edge of the screen towards the entry.
        // Otherwise, the arrow is following the mouse so we assign it to the provided coordinates.
        const toX = this.#coordinateTo.x;
        const toY = this.#toEntryDimensions ? this.#coordinateTo.y + (this.#toEntryDimensions?.height ?? 0) / 2 :
            this.#coordinateTo.y;
        this.#connector.setAttribute('x2', toX.toString());
        this.#connector.setAttribute('y2', toY.toString());
        this.#entryToCircleConnector.setAttribute('cx', toX.toString());
        this.#entryToCircleConnector.setAttribute('cy', toY.toString());
    }
    /*
     * Calculates the gradient stop percentage when only one entry is visible.
     * This percentage represents the portion of the line visible within the canvas,
     * used to create a fade effect towards the off-screen entry.
     * When one entry is off-screen, it is impossible to tell where exactly the line
     * is going to. Therefore, to not needlessly take space, the faded line is very short.
     *
     * To achieve this, we need to calculate what percentage of the
     * shole connection the short line is currently occupying and apply
     * that gradient to the visible connection part.
     */
    #partlyVisibleConnectionLinePercentage() {
        if (!this.#canvasRect) {
            return 100;
        }
        const fadedLineLength = 25;
        const lineLength = this.#coordinateTo.x - (this.#coordinateFrom.x + this.#fromEntryDimensions.width);
        const visibleLineFromTotalPercentage = (fadedLineLength * 100) / lineLength;
        return (visibleLineFromTotalPercentage < 100) ? visibleLineFromTotalPercentage : 100;
    }
    #updateCreateLinkBox() {
        const createLinkBox = this.#shadow.querySelector('.create-link-box');
        const createLinkIcon = createLinkBox?.querySelector('.create-link-icon') ?? null;
        if (!createLinkBox || !createLinkIcon) {
            console.error('creating element is missing.');
            return;
        }
        if (this.#linkState !== "creation_not_started" /* Trace.Types.File.EntriesLinkState.CREATION_NOT_STARTED */) {
            createLinkIcon.style.display = 'none';
            return;
        }
        createLinkIcon.style.left = `${this.#coordinateFrom.x + this.#fromEntryDimensions.width}px`;
        createLinkIcon.style.top = `${this.#coordinateFrom.y}px`;
    }
    #startCreatingConnection() {
        this.#linkState = "pending_to_event" /* Trace.Types.File.EntriesLinkState.PENDING_TO_EVENT */;
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
    #render() {
        const arrowColor = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-text-primary');
        // clang-format off
        render(html `
          <style>${entriesLinkOverlayStyles}</style>
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
              jslog=${VisualLogging.action('timeline.annotations.create-entry-link').track({ click: true })}
              @click=${this.#startCreatingConnection}
              name='arrow-right-circle'>
            </devtools-icon>
          </div>
        `, this.#shadow, { host: this });
        // clang-format on
    }
}
const CONNECTOR_CIRCLE_RADIUS = 2;
const CONNECTOR_CIRCLE_STROKE_WIDTH = 1;
// Defines the gap in the border when we are drawing a dashed outline.
// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray
const DASHED_STROKE_AMOUNT = 4;
customElements.define('devtools-entries-link-overlay', EntriesLinkOverlay);
//# sourceMappingURL=EntriesLinkOverlay.js.map