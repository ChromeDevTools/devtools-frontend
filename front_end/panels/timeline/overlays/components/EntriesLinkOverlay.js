// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../../ui/kit/kit.js';
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as ThemeSupport from '../../../../ui/legacy/theme_support/theme_support.js';
import { Directives, html, render } from '../../../../ui/lit/lit.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import entriesLinkOverlayStyles from './entriesLinkOverlay.css.js';
const UIStrings = {
    /**
     * @description Accessible label for the connector container in the entries link overlay of the Performance panel.
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
        this.#coordinateFrom = { x: initialFromEntryCoordinateAndDimensions.x, y: initialFromEntryCoordinateAndDimensions.y };
        this.#fromEntryDimensions = {
            width: initialFromEntryCoordinateAndDimensions.width,
            height: initialFromEntryCoordinateAndDimensions.height,
        };
        this.#coordinateTo = { x: initialFromEntryCoordinateAndDimensions.x, y: initialFromEntryCoordinateAndDimensions.y };
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
        return this.#shadow.querySelector('.from-highlight-wrapper');
    }
    entryToWrapper() {
        return this.#shadow.querySelector('.to-highlight-wrapper');
    }
    /**
     * If one entry that is linked is in a collapsed track, we show the outlines
     * but hide only the arrow.
     */
    set hideArrow(shouldHide) {
        if (this.#arrowHidden === shouldHide) {
            return;
        }
        this.#arrowHidden = shouldHide;
        this.#render();
    }
    set fromEntryCoordinateAndDimensions(fromEntryParams) {
        this.#coordinateFrom = { x: fromEntryParams.x, y: fromEntryParams.y };
        this.#fromEntryDimensions = { width: fromEntryParams.length, height: fromEntryParams.height };
        this.#render();
    }
    set entriesVisibility(entriesVisibility) {
        this.#entryFromVisible = entriesVisibility.fromEntryVisibility;
        this.#entryToVisible = entriesVisibility.toEntryVisibility;
        this.#render();
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
        this.#render();
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
    #startCreatingConnection() {
        this.#linkState = Trace.Types.File.EntriesLinkState.PENDING_TO_EVENT;
        this.#render();
        this.dispatchEvent(new EntryLinkStartCreating());
    }
    /*
      The entries link overlay is an arrow connecting 2 entries.
      The Entries are drawn by Flamechart and this Overlay is only drawing the arrow between them.
  
      |__entry__|o\      <-- 'from' entry wrapper and the circle connector next to it
                    \    <-- Arrow Connector
                      ➘ o|_____entry______|  <-- 'to' entry wrapper and the circle connector next to it
    */
    #render() {
        const arrowColor = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-text-primary');
        const isCreationNotStarted = this.#linkState === Trace.Types.File.EntriesLinkState.CREATION_NOT_STARTED;
        const fromX = this.#coordinateFrom.x + this.#fromEntryDimensions.width;
        const fromY = this.#coordinateFrom.y + this.#fromEntryDimensions.height / 2;
        const toX = this.#coordinateTo.x;
        const toY = this.#toEntryDimensions ? this.#coordinateTo.y + this.#toEntryDimensions.height / 2 : this.#coordinateTo.y;
        const drawFromEntryConnectorCircle = !isCreationNotStarted && this.#toEntryDimensions !== null &&
            this.#entryFromVisible && !this.#arrowHidden && this.#fromEntryIsSource &&
            this.#fromEntryDimensions.width >= MIN_WIDTH_TO_DRAW_CONNECTOR_CIRCLES;
        const drawToEntryConnectorCircle = !isCreationNotStarted && this.#toEntryDimensions !== null &&
            this.#entryToVisible && !this.#arrowHidden && this.#toEntryIsSource &&
            this.#toEntryDimensions.width >= MIN_WIDTH_TO_DRAW_CONNECTOR_CIRCLES;
        const showConnectorLine = !isCreationNotStarted && !this.#arrowHidden && (this.#entryFromVisible || this.#entryToVisible);
        let connectorStroke = arrowColor;
        if (this.#toEntryDimensions && !(this.#entryFromVisible && this.#entryToVisible)) {
            if (this.#entryFromVisible && !this.#entryToVisible) {
                connectorStroke = 'url(#fromVisibleLineGradient)';
            }
            else if (this.#entryToVisible && !this.#entryFromVisible) {
                connectorStroke = 'url(#toVisibleLineGradient)';
            }
        }
        const fromHighlightClasses = Directives.classMap({
            'entry-wrapper': true,
            'from-highlight-wrapper': true,
            'entry-is-not-source': !this.#fromEntryIsSource,
        });
        const toHighlightClasses = Directives.classMap({
            'entry-wrapper': true,
            'to-highlight-wrapper': true,
            'entry-is-not-source': !this.#toEntryIsSource,
        });
        const createLinkIconStyles = Directives.styleMap({
            display: isCreationNotStarted ? undefined : 'none',
            left: isCreationNotStarted ? `${fromX}px` : undefined,
            top: isCreationNotStarted ? `${this.#coordinateFrom.y}px` : undefined,
        });
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
              stroke=${connectorStroke}
              stroke-width="2"
              stroke-dasharray=${!this.#fromEntryIsSource || !this.#toEntryIsSource ? DASHED_STROKE_AMOUNT : 'none'}
              visibility=${!this.#entryFromVisible && !this.#entryToVisible ? 'hidden' : 'visible'}
              style=${Directives.styleMap({ display: showConnectorLine ? 'block' : 'none' })}
              x1=${fromX}
              y1=${fromY}
              x2=${toX}
              y2=${toY}
              />
            <circle class="entryFromConnector" fill="none" stroke=${arrowColor} stroke-width=${CONNECTOR_CIRCLE_STROKE_WIDTH} r=${CONNECTOR_CIRCLE_RADIUS} cx=${fromX} cy=${fromY} visibility=${drawFromEntryConnectorCircle ? 'visible' : 'hidden'} />
            <circle class="entryToConnector" fill="none" stroke=${arrowColor} stroke-width=${CONNECTOR_CIRCLE_STROKE_WIDTH} r=${CONNECTOR_CIRCLE_RADIUS} cx=${toX} cy=${toY} visibility=${drawToEntryConnectorCircle ? 'visible' : 'hidden'} />
          </svg>
          <div class=${fromHighlightClasses} style=${Directives.styleMap({ visibility: this.#entryFromVisible ? 'visible' : 'hidden' })}></div>
          <div class=${toHighlightClasses} style=${Directives.styleMap({ visibility: this.#entryToVisible && this.#toEntryDimensions !== null ? 'visible' : 'hidden' })}></div>
          <div class="create-link-box" ?hidden=${!isCreationNotStarted}>
            <devtools-icon
              class="create-link-icon"
              style=${createLinkIconStyles}
              jslog=${VisualLogging.action('timeline.annotations.create-entry-link').track({ click: true })}
              @click=${this.#startCreatingConnection}
              name="arrow-right-circle">
            </devtools-icon>
          </div>
        `, this.#shadow, { host: this });
        // clang-format on
    }
}
const CONNECTOR_CIRCLE_RADIUS = 2;
const CONNECTOR_CIRCLE_STROKE_WIDTH = 1;
const MIN_WIDTH_TO_DRAW_CONNECTOR_CIRCLES = 8;
// Defines the gap in the border when we are drawing a dashed outline.
// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray
const DASHED_STROKE_AMOUNT = 4;
customElements.define('devtools-entries-link-overlay', EntriesLinkOverlay);
//# sourceMappingURL=EntriesLinkOverlay.js.map