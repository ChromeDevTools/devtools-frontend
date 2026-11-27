// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../../ui/kit/kit.js';
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
const CONNECTOR_CIRCLE_RADIUS = 2;
const CONNECTOR_CIRCLE_STROKE_WIDTH = 1;
const MIN_WIDTH_TO_DRAW_CONNECTOR_CIRCLES = 8;
// Defines the gap in the border when we are drawing a dashed outline.
// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray
const DASHED_STROKE_AMOUNT = 4;
export class EntryLinkStartCreating extends Event {
    static eventName = 'entrylinkstartcreating';
    constructor() {
        super(EntryLinkStartCreating.eventName, { bubbles: true, composed: true });
    }
}
export const DEFAULT_VIEW = (input, _output, target) => {
    const isCreationNotStarted = input.linkState === Trace.Types.File.EntriesLinkState.CREATION_NOT_STARTED;
    const fromX = input.coordinateFrom.x + input.fromEntryDimensions.width;
    const fromY = input.coordinateFrom.y + input.fromEntryDimensions.height / 2;
    const toX = input.coordinateTo.x;
    const toY = input.toEntryDimensions ? input.coordinateTo.y + input.toEntryDimensions.height / 2 : input.coordinateTo.y;
    const drawFromEntryConnectorCircle = !isCreationNotStarted && input.toEntryDimensions !== null &&
        input.entryFromVisible && !input.arrowHidden && input.fromEntryIsSource &&
        input.fromEntryDimensions.width >= MIN_WIDTH_TO_DRAW_CONNECTOR_CIRCLES;
    const drawToEntryConnectorCircle = !isCreationNotStarted && input.toEntryDimensions !== null &&
        input.entryToVisible && !input.arrowHidden && input.toEntryIsSource &&
        input.toEntryDimensions.width >= MIN_WIDTH_TO_DRAW_CONNECTOR_CIRCLES;
    const showConnectorLine = !isCreationNotStarted && !input.arrowHidden && (input.entryFromVisible || input.entryToVisible);
    let connectorStroke = input.arrowColor;
    if (input.toEntryDimensions && !(input.entryFromVisible && input.entryToVisible)) {
        if (input.entryFromVisible && !input.entryToVisible) {
            connectorStroke = 'url(#fromVisibleLineGradient)';
        }
        else if (input.entryToVisible && !input.entryFromVisible) {
            connectorStroke = 'url(#toVisibleLineGradient)';
        }
    }
    // Only draw the entry wrapper if that entry is visible.
    const fromHighlightClasses = Directives.classMap({
        'entry-wrapper': true,
        'from-highlight-wrapper': true,
        'entry-is-not-source': !input.fromEntryIsSource,
        'cut-off-top': input.fromEntryCutOff.cutOffTop,
        'cut-off-bottom': input.fromEntryCutOff.cutOffBottom,
        'cut-off-right': input.fromEntryCutOff.cutOffRight,
    });
    const fromHighlightStyles = Directives.styleMap({
        visibility: input.entryFromVisible ? 'visible' : 'hidden',
        left: `${input.coordinateFrom.x}px`,
        top: `${input.coordinateFrom.y}px`,
        width: `${input.fromEntryDimensions.width}px`,
        height: `${input.fromEntryDimensions.height}px`,
    });
    const toHighlightClasses = Directives.classMap({
        'entry-wrapper': true,
        'to-highlight-wrapper': true,
        'entry-is-not-source': !input.toEntryIsSource,
        'cut-off-top': input.toEntryCutOff.cutOffTop,
        'cut-off-bottom': input.toEntryCutOff.cutOffBottom,
        'cut-off-right': input.toEntryCutOff.cutOffRight,
    });
    const toHighlightStyles = Directives.styleMap({
        visibility: input.entryToVisible && input.toEntryDimensions !== null ? 'visible' : 'hidden',
        left: input.toEntryDimensions ? `${input.coordinateTo.x}px` : undefined,
        top: input.toEntryDimensions ? `${input.coordinateTo.y}px` : undefined,
        width: input.toEntryDimensions ? `${input.toEntryDimensions.width}px` : undefined,
        height: input.toEntryDimensions ? `${input.toEntryDimensions.height}px` : undefined,
    });
    const createLinkIconStyles = Directives.styleMap({
        display: isCreationNotStarted ? undefined : 'none',
        left: isCreationNotStarted ? `${fromX}px` : undefined,
        top: isCreationNotStarted ? `${input.coordinateFrom.y}px` : undefined,
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
                stop-color=${input.arrowColor}
                stop-opacity="1" />
              <stop
                offset="${input.partlyVisibleConnectionLinePercentage}%"
                stop-color=${input.arrowColor}
                stop-opacity="0" />
            </linearGradient>

            <linearGradient
              id="toVisibleLineGradient"
              x1="0%" y1="0%" x2="100%" y2="0%">
              <stop
                offset="${100 - input.partlyVisibleConnectionLinePercentage}%"
                stop-color=${input.arrowColor}
                stop-opacity="0" />
              <stop
                offset="100%"
                stop-color=${input.arrowColor}
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
              visibility=${input.entryToVisible || !input.toEntryDimensions ? 'visible' : 'hidden'}>
              <path d="M0,0 V4 L4,2 Z" fill=${input.arrowColor} />
            </marker>
          </defs>
          <line
            marker-end="url(#arrow)"
            stroke=${connectorStroke}
            stroke-width="2"
            stroke-dasharray=${!input.fromEntryIsSource || !input.toEntryIsSource ? DASHED_STROKE_AMOUNT : 'none'}
            visibility=${!input.entryFromVisible && !input.entryToVisible ? 'hidden' : 'visible'}
            style=${Directives.styleMap({ display: showConnectorLine ? 'block' : 'none' })}
            x1=${fromX}
            y1=${fromY}
            x2=${toX}
            y2=${toY}
            />
          <circle class="entryFromConnector" fill="none" stroke=${input.arrowColor} stroke-width=${CONNECTOR_CIRCLE_STROKE_WIDTH} r=${CONNECTOR_CIRCLE_RADIUS} cx=${fromX} cy=${fromY} visibility=${drawFromEntryConnectorCircle ? 'visible' : 'hidden'} />
          <circle class="entryToConnector" fill="none" stroke=${input.arrowColor} stroke-width=${CONNECTOR_CIRCLE_STROKE_WIDTH} r=${CONNECTOR_CIRCLE_RADIUS} cx=${toX} cy=${toY} visibility=${drawToEntryConnectorCircle ? 'visible' : 'hidden'} />
        </svg>
        <div class=${fromHighlightClasses} style=${fromHighlightStyles}></div>
        <div class=${toHighlightClasses} style=${toHighlightStyles}></div>
        <div class="create-link-box" ?hidden=${!isCreationNotStarted}>
          <devtools-icon
            class="create-link-icon"
            style=${createLinkIconStyles}
            jslog=${VisualLogging.action('timeline.annotations.create-entry-link').track({ click: true })}
            @click=${input.onStartCreating}
            name="arrow-right-circle">
          </devtools-icon>
        </div>
      `, target);
    // clang-format on
};
export class EntriesLinkOverlay extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #view;
    #coordinateFrom;
    #fromEntryDimensions;
    #fromEntryCutOff = { cutOffTop: false, cutOffBottom: false, cutOffRight: false };
    #coordinateTo;
    #toEntryDimensions = null;
    #toEntryCutOff = { cutOffTop: false, cutOffBottom: false, cutOffRight: false };
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
    constructor(initialFromEntryCoordinateAndDimensions, linkCreationNotStartedState, view = DEFAULT_VIEW) {
        super();
        this.#view = view;
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
        const cutOffTop = Boolean(fromEntryParams.cutOffTop);
        const cutOffBottom = Boolean(fromEntryParams.cutOffBottom);
        const cutOffRight = Boolean(fromEntryParams.cutOffRight);
        if (this.#coordinateFrom.x === fromEntryParams.x && this.#coordinateFrom.y === fromEntryParams.y &&
            this.#fromEntryDimensions.width === fromEntryParams.length &&
            this.#fromEntryDimensions.height === fromEntryParams.height && this.#fromEntryCutOff.cutOffTop === cutOffTop &&
            this.#fromEntryCutOff.cutOffBottom === cutOffBottom && this.#fromEntryCutOff.cutOffRight === cutOffRight) {
            return;
        }
        this.#coordinateFrom = { x: fromEntryParams.x, y: fromEntryParams.y };
        this.#fromEntryDimensions = { width: fromEntryParams.length, height: fromEntryParams.height };
        this.#fromEntryCutOff = { cutOffTop, cutOffBottom, cutOffRight };
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
        const newDimensions = (toEntryParams.length && toEntryParams.height) ?
            { width: toEntryParams.length, height: toEntryParams.height } :
            null;
        const cutOffTop = Boolean(toEntryParams.cutOffTop);
        const cutOffBottom = Boolean(toEntryParams.cutOffBottom);
        const cutOffRight = Boolean(toEntryParams.cutOffRight);
        if (this.#coordinateTo.x === toEntryParams.x && this.#coordinateTo.y === toEntryParams.y &&
            this.#toEntryDimensions?.width === newDimensions?.width &&
            this.#toEntryDimensions?.height === newDimensions?.height && this.#toEntryCutOff.cutOffTop === cutOffTop &&
            this.#toEntryCutOff.cutOffBottom === cutOffBottom && this.#toEntryCutOff.cutOffRight === cutOffRight) {
            return;
        }
        this.#coordinateTo = { x: toEntryParams.x, y: toEntryParams.y };
        this.#toEntryDimensions = newDimensions;
        this.#toEntryCutOff = { cutOffTop, cutOffBottom, cutOffRight };
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
     * whole connection the short line is currently occupying and apply
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
        this.#view({
            coordinateFrom: this.#coordinateFrom,
            fromEntryDimensions: this.#fromEntryDimensions,
            fromEntryCutOff: this.#fromEntryCutOff,
            coordinateTo: this.#coordinateTo,
            toEntryDimensions: this.#toEntryDimensions,
            toEntryCutOff: this.#toEntryCutOff,
            entryFromVisible: this.#entryFromVisible,
            entryToVisible: this.#entryToVisible,
            fromEntryIsSource: this.#fromEntryIsSource,
            toEntryIsSource: this.#toEntryIsSource,
            arrowHidden: this.#arrowHidden,
            linkState: this.#linkState,
            partlyVisibleConnectionLinePercentage: this.#partlyVisibleConnectionLinePercentage(),
            arrowColor,
            onStartCreating: this.#startCreatingConnection.bind(this),
        }, undefined, this.#shadow);
    }
}
customElements.define('devtools-entries-link-overlay', EntriesLinkOverlay);
//# sourceMappingURL=EntriesLinkOverlay.js.map