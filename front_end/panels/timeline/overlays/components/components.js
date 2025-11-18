var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/timeline/overlays/components/EntriesLinkOverlay.js
var EntriesLinkOverlay_exports = {};
__export(EntriesLinkOverlay_exports, {
  EntriesLinkOverlay: () => EntriesLinkOverlay,
  EntryLinkStartCreating: () => EntryLinkStartCreating
});
import "./../../../../ui/components/icon_button/icon_button.js";
import * as i18n from "./../../../../core/i18n/i18n.js";
import * as Trace from "./../../../../models/trace/trace.js";
import * as ThemeSupport from "./../../../../ui/legacy/theme_support/theme_support.js";
import { html, render } from "./../../../../ui/lit/lit.js";
import * as VisualLogging from "./../../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/timeline/overlays/components/entriesLinkOverlay.css.js
var entriesLinkOverlay_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.connectorContainer {
  display: flex;
  width: 100%;
  height: 100%;
}

.entry-wrapper {
  pointer-events: none;
  position: absolute;
  display: block;
  border: 2px solid var(--color-text-primary);
  box-sizing: border-box;

  &.cut-off-top {
    border-top: none;
  }

  &.cut-off-bottom {
    border-bottom: none;
  }

  &.cut-off-right {
    border-right: none;
  }

  &.cut-off-left {
    border-left: none;
  }
}

.entry-is-not-source {
  border: 2px dashed var(--color-text-primary);
}

.create-link-icon {
  pointer-events: auto;
  cursor: pointer;
  color: var(--sys-color-on-surface);
  width: 16px;
  height: 16px;
  position: absolute;
}

/*# sourceURL=${import.meta.resolve("./entriesLinkOverlay.css")} */`;

// gen/front_end/panels/timeline/overlays/components/EntriesLinkOverlay.js
var UIStrings = {
  /**
   * @description Accessible label used to explain to a user that they are viewing an arrow representing a link between two entries.
   */
  diagram: "Links between entries"
};
var str_ = i18n.i18n.registerUIStrings("panels/timeline/overlays/components/EntriesLinkOverlay.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var EntryLinkStartCreating = class _EntryLinkStartCreating extends Event {
  static eventName = "entrylinkstartcreating";
  constructor() {
    super(_EntryLinkStartCreating.eventName, { bubbles: true, composed: true });
  }
};
var EntriesLinkOverlay = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
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
      height: initialFromEntryCoordinateAndDimensions.height
    };
    this.#coordinateTo = { x: initialFromEntryCoordinateAndDimensions.x, y: initialFromEntryCoordinateAndDimensions.y };
    this.#connectorLineContainer = this.#shadow.querySelector(".connectorContainer") ?? null;
    this.#connector = this.#connectorLineContainer?.querySelector("line") ?? null;
    this.#entryFromWrapper = this.#shadow.querySelector(".from-highlight-wrapper") ?? null;
    this.#entryToWrapper = this.#shadow.querySelector(".to-highlight-wrapper") ?? null;
    this.#entryFromCirleConnector = this.#connectorLineContainer?.querySelector(".entryFromConnector") ?? null;
    this.#entryToCircleConnector = this.#connectorLineContainer?.querySelector(".entryToConnector") ?? null;
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
      this.#connector.style.display = shouldHide ? "none" : "block";
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
    } else {
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
    if (!this.#connector || !this.#entryFromWrapper || !this.#entryToWrapper || !this.#entryFromCirleConnector || !this.#entryToCircleConnector) {
      console.error("one of the required Entries Link elements is missing.");
      return;
    }
    if (this.#linkState === "creation_not_started") {
      this.#entryFromCirleConnector.setAttribute("visibility", "hidden");
      this.#entryToCircleConnector.setAttribute("visibility", "hidden");
      this.#connector.style.display = "none";
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
    this.#entryFromWrapper.style.visibility = this.#entryFromVisible ? "visible" : "hidden";
    this.#entryToWrapper.style.visibility = this.#entryToVisible ? "visible" : "hidden";
  }
  // Draw the entry connector circles:
  //  - The entry the arrow is connecting to is the connection source
  //  - That entry currently is visible
  //  - There is enough space for the connector circle
  #setConnectorCirclesVisibility() {
    if (!this.#toEntryDimensions || !this.#entryFromCirleConnector || !this.#entryToCircleConnector) {
      return;
    }
    const minWidthToDrawConnectorCircles = 8;
    const drawFromEntryConnectorCircle = this.#entryFromVisible && !this.#arrowHidden && this.#fromEntryIsSource && this.#fromEntryDimensions.width >= minWidthToDrawConnectorCircles;
    const drawToEntryConnectorCircle = !this.#arrowHidden && this.#entryToVisible && this.#toEntryIsSource && this.#toEntryDimensions?.width >= minWidthToDrawConnectorCircles && !this.#arrowHidden;
    this.#entryFromCirleConnector.setAttribute("visibility", drawFromEntryConnectorCircle ? "visible" : "hidden");
    this.#entryToCircleConnector.setAttribute("visibility", drawToEntryConnectorCircle ? "visible" : "hidden");
  }
  #setArrowConnectorStyle() {
    if (!this.#connector) {
      return;
    }
    this.#connector.style.display = this.#entryFromVisible || this.#entryToVisible ? "block" : "none";
    this.#connector.setAttribute("stroke-width", "2");
    const arrowColor = ThemeSupport.ThemeSupport.instance().getComputedValue("--color-text-primary");
    if (!this.#toEntryDimensions || this.#entryFromVisible && this.#entryToVisible) {
      this.#connector.setAttribute("stroke", arrowColor);
      return;
    }
    if (this.#entryFromVisible && !this.#entryToVisible) {
      this.#connector.setAttribute("stroke", "url(#fromVisibleLineGradient)");
    } else if (this.#entryToVisible && !this.#entryFromVisible) {
      this.#connector.setAttribute("stroke", "url(#toVisibleLineGradient)");
    }
  }
  #positionConnectorLineAndCircles() {
    if (!this.#connector || !this.#entryFromCirleConnector || !this.#entryToCircleConnector) {
      return;
    }
    const halfFromEntryHeight = this.#fromEntryDimensions.height / 2;
    const fromX = this.#coordinateFrom.x + this.#fromEntryDimensions.width;
    const fromY = this.#coordinateFrom.y + halfFromEntryHeight;
    this.#connector.setAttribute("x1", fromX.toString());
    this.#connector.setAttribute("y1", fromY.toString());
    this.#entryFromCirleConnector.setAttribute("cx", fromX.toString());
    this.#entryFromCirleConnector.setAttribute("cy", fromY.toString());
    const toX = this.#coordinateTo.x;
    const toY = this.#toEntryDimensions ? this.#coordinateTo.y + (this.#toEntryDimensions?.height ?? 0) / 2 : this.#coordinateTo.y;
    this.#connector.setAttribute("x2", toX.toString());
    this.#connector.setAttribute("y2", toY.toString());
    this.#entryToCircleConnector.setAttribute("cx", toX.toString());
    this.#entryToCircleConnector.setAttribute("cy", toY.toString());
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
    const visibleLineFromTotalPercentage = fadedLineLength * 100 / lineLength;
    return visibleLineFromTotalPercentage < 100 ? visibleLineFromTotalPercentage : 100;
  }
  #updateCreateLinkBox() {
    const createLinkBox = this.#shadow.querySelector(".create-link-box");
    const createLinkIcon = createLinkBox?.querySelector(".create-link-icon") ?? null;
    if (!createLinkBox || !createLinkIcon) {
      console.error("creating element is missing.");
      return;
    }
    if (this.#linkState !== "creation_not_started") {
      createLinkIcon.style.display = "none";
      return;
    }
    createLinkIcon.style.left = `${this.#coordinateFrom.x + this.#fromEntryDimensions.width}px`;
    createLinkIcon.style.top = `${this.#coordinateFrom.y}px`;
  }
  #startCreatingConnection() {
    this.#linkState = "pending_to_event";
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
    const arrowColor = ThemeSupport.ThemeSupport.instance().getComputedValue("--color-text-primary");
    render(html`
          <style>${entriesLinkOverlay_css_default}</style>
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
                visibility=${this.#entryToVisible || !this.#toEntryDimensions ? "visible" : "hidden"}>
                <path d="M0,0 V4 L4,2 Z" fill=${arrowColor} />
              </marker>
            </defs>
            <line
              marker-end="url(#arrow)"
              stroke-dasharray=${!this.#fromEntryIsSource || !this.#toEntryIsSource ? DASHED_STROKE_AMOUNT : "none"}
              visibility=${!this.#entryFromVisible && !this.#entryToVisible ? "hidden" : "visible"}
              />
            <circle class="entryFromConnector" fill="none" stroke=${arrowColor} stroke-width=${CONNECTOR_CIRCLE_STROKE_WIDTH} r=${CONNECTOR_CIRCLE_RADIUS} />
            <circle class="entryToConnector" fill="none" stroke=${arrowColor} stroke-width=${CONNECTOR_CIRCLE_STROKE_WIDTH} r=${CONNECTOR_CIRCLE_RADIUS} />
          </svg>
          <div class="entry-wrapper from-highlight-wrapper ${this.#fromEntryIsSource ? "" : "entry-is-not-source"}"></div>
          <div class="entry-wrapper to-highlight-wrapper ${this.#toEntryIsSource ? "" : "entry-is-not-source"}"></div>
          <div class="create-link-box ${this.#linkState ? "visible" : "hidden"}">
            <devtools-icon
              class='create-link-icon'
              jslog=${VisualLogging.action("timeline.annotations.create-entry-link").track({ click: true })}
              @click=${this.#startCreatingConnection}
              name='arrow-right-circle'>
            </devtools-icon>
          </div>
        `, this.#shadow, { host: this });
  }
};
var CONNECTOR_CIRCLE_RADIUS = 2;
var CONNECTOR_CIRCLE_STROKE_WIDTH = 1;
var DASHED_STROKE_AMOUNT = 4;
customElements.define("devtools-entries-link-overlay", EntriesLinkOverlay);

// gen/front_end/panels/timeline/overlays/components/EntryLabelOverlay.js
var EntryLabelOverlay_exports = {};
__export(EntryLabelOverlay_exports, {
  EntryLabelChangeEvent: () => EntryLabelChangeEvent,
  EntryLabelOverlay: () => EntryLabelOverlay,
  EntryLabelRemoveEvent: () => EntryLabelRemoveEvent,
  LabelAnnotationsConsentDialogVisibilityChange: () => LabelAnnotationsConsentDialogVisibilityChange
});
import "./../../../../ui/components/icon_button/icon_button.js";
import "./../../../../ui/components/tooltips/tooltips.js";
import "./../../../../ui/components/spinners/spinners.js";
import * as Common from "./../../../../core/common/common.js";
import * as Host from "./../../../../core/host/host.js";
import * as i18n3 from "./../../../../core/i18n/i18n.js";
import * as Platform from "./../../../../core/platform/platform.js";
import * as Root from "./../../../../core/root/root.js";
import * as AiAssistanceModels from "./../../../../models/ai_assistance/ai_assistance.js";
import * as Buttons from "./../../../../ui/components/buttons/buttons.js";
import * as ComponentHelpers from "./../../../../ui/components/helpers/helpers.js";
import * as UIHelpers from "./../../../../ui/helpers/helpers.js";
import * as UI from "./../../../../ui/legacy/legacy.js";
import * as ThemeSupport3 from "./../../../../ui/legacy/theme_support/theme_support.js";
import * as Lit from "./../../../../ui/lit/lit.js";
import * as VisualLogging2 from "./../../../../ui/visual_logging/visual_logging.js";
import * as PanelCommon from "./../../../common/common.js";

// gen/front_end/panels/timeline/overlays/components/entryLabelOverlay.css.js
var entryLabelOverlay_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.label-parts-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.label-button-input-wrapper {
  display: flex;
  position: relative;
  overflow: visible;
}

.ai-label-button-wrapper,
.ai-label-disabled-button-wrapper,
.ai-label-loading,
.ai-label-error {
  /* position the button wrapper on the very right of the label */
  position: absolute;
  left: 100%;
  display: flex;
  /* Since the ai-button is a bit bigger than the label, lift it up for it to appear more centered */
  transform: translateY(-3px);
  flex-flow: row nowrap;
  border: none;
  border-radius: var(--sys-shape-corner-large);
  background: var(--sys-color-surface3);
  box-shadow: var(--drop-shadow);
  align-items: center;
  gap: var(--sys-size-4);
  pointer-events: auto;
  transition:
    all var(--sys-motion-duration-medium2) var(--sys-motion-easing-emphasized);

  &.only-pen-wrapper {
    /* when the button wrapper is not hovered, set the max width to only fit the pen icon */
    overflow: hidden;
    width: var(--sys-size-12);
    height: var(--sys-size-12);
  }

  * {
    /* When unhovered, shift the contents left you don't see the border of the .ai-label-button  */
    transform: translateX(-2px);
  }
}

.delete-button {
  display: flex;
  pointer-events: auto;
  position: absolute;
  right: 0;
  top: -5px;
  border-radius: 50%;
  padding: 0;
  border: none;
  background: var(--color-background-inverted);
}

.ai-label-loading,
.ai-label-error {
  gap: var(--sys-size-6);
  padding: var(--sys-size-5) var(--sys-size-8);
}

.ai-label-button-wrapper:focus,
.ai-label-button-wrapper:focus-within,
.ai-label-button-wrapper:hover {
  width: auto;
  height: var(--sys-size-13);
  padding: var(--sys-size-3) var(--sys-size-5);
  transform: translateY(-9px); /* -9px is the original -3px minus 6px (coming from the padding adjustment) */

  * {
    transform: translateX(0);
  }
}

.ai-label-button {
  display: flex;
  align-items: center;
  gap: var(--sys-size-4);
  padding: var(--sys-size-3) var(--sys-size-5);
  border: 1px solid var(--color-primary);
  border-radius: var(--sys-shape-corner-large);

  &.enabled {
    background: var(--sys-color-surface3);
  }

  &.disabled {
    background: var(--sys-color-surface5);
  }

  &:hover {
    background: var(--sys-color-state-hover-on-subtle);
  }
}

.generate-label-text {
  white-space: nowrap;
  color: var(--color-primary);
}

.input-field {
  background-color: var(--color-background-inverted);
  color: var(--color-background);
  pointer-events: auto;
  border-radius: var(--sys-shape-corner-extra-small);
  white-space: nowrap;
  padding: var(--sys-size-3) var(--sys-size-4);
  font-family: var(--default-font-family);
  font-size: var(--sys-typescale-body2-size);
  font-weight: var(--ref-typeface-weight-medium);
  outline: 2px solid var(--color-background);
}


/* When the input field is focused we want to style it as a light background so
 * it's clear that the user is in it and can edit the text.
* However we also do this styling when the user's focus is on the GenerateAI
* button (using the :focus-within on the parent). This is so if you open an
* empty annotation, and then tab to the GenerateAI button, the text field
* styling doesn't change. */
.input-field:focus,
.label-parts-wrapper:focus-within .input-field,
.input-field.fake-focus-state {
  background-color: var(--color-background);
  color: var(--color-background-inverted);
  outline: 2px solid var(--color-background-inverted);
}

.connectorContainer {
  overflow: visible;
}

.entry-highlight-wrapper {
  box-sizing: border-box;
  border: 2px solid var(--sys-color-on-surface);

  &.cut-off-top {
    border-top: none;
  }

  &.cut-off-bottom {
    border-bottom: none;
  }

  &.cut-off-right {
    border-right: none;
  }

  &.cut-off-left {
    border-left: none;
  }
}

/* The tooltip for the AI label generation info */
.info-tooltip-container {
  max-width: var(--sys-size-28);

  button.link {
    cursor: pointer;
    text-decoration: underline;
    border: none;
    padding: 0;
    background: none;
    font: inherit;
    font-weight: var(--ref-typeface-weight-medium);
    display: block;
    margin-top: var(--sys-size-4);
    color: var(--sys-color-primary);
  }
}

/*# sourceURL=${import.meta.resolve("./entryLabelOverlay.css")} */`;

// gen/front_end/panels/timeline/overlays/components/EntryLabelOverlay.js
var { html: html2, Directives: Directives2 } = Lit;
var UIStrings2 = {
  /**
   * @description Accessible label used to explain to a user that they are viewing an entry label.
   */
  entryLabel: "Entry label",
  /**
   * @description Accessible label used to prompt the user to input text into the field.
   */
  inputTextPrompt: "Enter an annotation label",
  /**
   * @description Text displayed on a button that generates an AI label.
   */
  generateLabelButton: "Generate label",
  /**
   * @description Label used for screenreaders on the FRE dialog
   */
  freDialog: "Get AI-powered annotation suggestions dialog",
  /**
   * @description Screen-reader text for a tooltip link for navigating to "AI innovations" settings where the user can learn more about auto-annotations.
   */
  learnMoreAriaLabel: "Learn more about auto annotations in settings",
  /**
   * @description Screen-reader text for a tooltip icon.
   */
  moreInfoAriaLabel: "More information about this feature"
};
var UIStringsNotTranslate = {
  /**
   * @description Tooltip link for the navigating to "AI innovations" page in settings.
   */
  learnMore: "Learn more in settings",
  /**
   * @description Security disclaimer text displayed when the information icon on a button that generates an AI label is hovered.
   */
  generateLabelSecurityDisclaimer: "The selected call stack is sent to Google. The content you submit and that is generated by this feature will be used to improve Google\u2019s AI models. This is an experimental AI feature and won\u2019t always get it right.",
  /**
   * @description Enterprise users with logging off - Security disclaimer text displayed when the information icon on a button that generates an AI label is hovered.
   */
  generateLabelSecurityDisclaimerLogginOff: "The selected call stack is sent to Google. The content you submit and that is generated by this feature will not be used to improve Google\u2019s AI models. This is an experimental AI feature and won\u2019t always get it right.",
  /**
   * @description The `Generate AI label button` tooltip disclaimer for when the feature is not available and the reason can be checked in settings.
   */
  autoAnnotationNotAvailableDisclaimer: "Auto annotations are not available.",
  /**
   * @description The `Generate AI label button` tooltip disclaimer for when the feature is not available because the user is offline.
   */
  autoAnnotationNotAvailableOfflineDisclaimer: "Auto annotations are not available because you are offline.",
  /**
   * @description Header text for the AI-powered annotations suggestions disclaimer dialog.
   */
  freDisclaimerHeader: "Get AI-powered annotation suggestions",
  /**
   * @description Text shown when the AI-powered annotation is being generated.
   */
  generatingLabel: "Generating label",
  /**
   * @description Text shown when the generation of the AI-powered annotation failed.
   */
  generationFailed: "Generation failed",
  /**
   * @description First disclaimer item text for the fre dialog - AI won't always get it right.
   */
  freDisclaimerAiWontAlwaysGetItRight: "This feature uses AI and won\u2019t always get it right",
  /**
   * @description Second disclaimer item text for the fre dialog - trace data is sent to Google.
   */
  freDisclaimerPrivacyDataSentToGoogle: "To generate annotation suggestions, your performance trace is sent to Google. This data may be seen by human reviewers to improve this feature.",
  /**
   * @description Second disclaimer item text for the fre dialog - trace data is sent to Google.
   */
  freDisclaimerPrivacyDataSentToGoogleNoLogging: "To generate annotation suggestions, your performance trace is sent to Google. This data will not be used to improve Google\u2019s AI models. Your organization may change these settings at any time.",
  /**
   * @description Text for the 'learn more' button displayed in fre.
   */
  learnMoreButton: "Learn more"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/timeline/overlays/components/EntryLabelOverlay.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var lockedString = i18n3.i18n.lockedString;
function isAiAssistanceServerSideLoggingEnabled() {
  return !Root.Runtime.hostConfig.aidaAvailability?.disallowLogging;
}
var EntryLabelRemoveEvent = class _EntryLabelRemoveEvent extends Event {
  static eventName = "entrylabelremoveevent";
  constructor() {
    super(_EntryLabelRemoveEvent.eventName);
  }
};
var EntryLabelChangeEvent = class _EntryLabelChangeEvent extends Event {
  newLabel;
  static eventName = "entrylabelchangeevent";
  constructor(newLabel) {
    super(_EntryLabelChangeEvent.eventName);
    this.newLabel = newLabel;
  }
};
var LabelAnnotationsConsentDialogVisibilityChange = class _LabelAnnotationsConsentDialogVisibilityChange extends Event {
  isVisible;
  static eventName = "labelannotationsconsentdialogvisiblitychange";
  constructor(isVisible) {
    super(_LabelAnnotationsConsentDialogVisibilityChange.eventName, { bubbles: true, composed: true });
    this.isVisible = isVisible;
  }
};
var EntryLabelOverlay = class _EntryLabelOverlay extends HTMLElement {
  // The label is angled on the left from the centre of the entry it belongs to.
  // `LABEL_AND_CONNECTOR_SHIFT_LENGTH` specifies how many pixels to the left it is shifted.
  static LABEL_AND_CONNECTOR_SHIFT_LENGTH = 8;
  // Length of the line that connects the label to the entry.
  static LABEL_CONNECTOR_HEIGHT = 7;
  // Set the max label length to avoid labels that could signicantly increase the file size.
  static MAX_LABEL_LENGTH = 100;
  #shadow = this.attachShadow({ mode: "open" });
  // Once a label is bound for deletion, we remove it from the DOM via events
  // that are dispatched. But in the meantime the blur event of the input box
  // can fire, and that triggers a second removal. So we set this flag after
  // the first removal to avoid a duplicate event firing which is a no-op but
  // causes errors when we try to delete an already deleted annotation.
  #isPendingRemoval = false;
  // The label is set to editable when it is double clicked. If the user clicks away from the label box
  // element, the label is set to not editable until it double clicked.s
  #isLabelEditable = true;
  #entryLabelVisibleHeight = null;
  #labelPartsWrapper = null;
  #entryHighlightWrapper = null;
  #inputField = null;
  #connectorLineContainer = null;
  #label;
  #shouldDrawBelowEntry;
  #richTooltip = Directives2.createRef();
  #noLogging;
  /**
   * Required to generate a label with AI.
   */
  #callTree = null;
  // Creates or gets the setting if it exists.
  #aiAnnotationsEnabledSetting = Common.Settings.Settings.instance().createSetting("ai-annotations-enabled", false);
  #agent = new AiAssistanceModels.PerformanceAnnotationsAgent.PerformanceAnnotationsAgent({
    aidaClient: new Host.AidaClient.AidaClient(),
    serverSideLoggingEnabled: isAiAssistanceServerSideLoggingEnabled()
  });
  /**
   * We track this because when the user is in this flow we don't want the
   * empty annotation label to be removed on blur, as we take them to the flow &
   * want to keep the label there for when they come back from the flow having
   * consented, hopefully!
   */
  #inAIConsentDialogFlow = false;
  #currAIButtonState = "hidden";
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
  constructor(label, shouldDrawBelowEntry = false) {
    super();
    this.#render();
    this.#shouldDrawBelowEntry = shouldDrawBelowEntry;
    this.#labelPartsWrapper = this.#shadow.querySelector(".label-parts-wrapper");
    this.#inputField = this.#labelPartsWrapper?.querySelector(".input-field") ?? null;
    this.#connectorLineContainer = this.#labelPartsWrapper?.querySelector(".connectorContainer") ?? null;
    this.#entryHighlightWrapper = this.#labelPartsWrapper?.querySelector(".entry-highlight-wrapper") ?? null;
    this.#label = label;
    this.#noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue === Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
    this.#drawLabel(label);
    if (label !== "") {
      this.setLabelEditabilityAndRemoveEmptyLabel(false);
    }
    const ariaLabel = label === "" ? i18nString2(UIStrings2.inputTextPrompt) : label;
    this.#inputField?.setAttribute("aria-label", ariaLabel);
    this.#drawConnector();
  }
  /**
   * So we can provide a mocked agent in tests. Do not call this method outside of a test!
   */
  overrideAIAgentForTest(agent) {
    this.#agent = agent;
  }
  entryHighlightWrapper() {
    return this.#entryHighlightWrapper;
  }
  #handleLabelInputKeyUp() {
    const labelBoxTextContent = this.#inputField?.textContent?.trim() ?? "";
    if (labelBoxTextContent !== this.#label) {
      this.#label = labelBoxTextContent;
      this.dispatchEvent(new EntryLabelChangeEvent(this.#label));
      this.#inputField?.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    }
    this.#setAIButtonRenderState();
    this.#render();
    this.#inputField?.setAttribute("aria-label", labelBoxTextContent);
  }
  #handleLabelInputKeyDown(event) {
    if (!this.#inputField) {
      return false;
    }
    const allowedKeysAfterReachingLenLimit = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight"
    ];
    if ((event.key === Platform.KeyboardUtilities.ENTER_KEY || event.key === Platform.KeyboardUtilities.ESCAPE_KEY) && this.#isLabelEditable) {
      this.#inputField.blur();
      this.setLabelEditabilityAndRemoveEmptyLabel(false);
      return false;
    }
    if (this.#inputField.textContent !== null && this.#inputField.textContent.length <= _EntryLabelOverlay.MAX_LABEL_LENGTH) {
      return true;
    }
    if (allowedKeysAfterReachingLenLimit.includes(event.key)) {
      return true;
    }
    if (event.key.length === 1 && event.ctrlKey) {
      return true;
    }
    event.preventDefault();
    return false;
  }
  #handleLabelInputPaste(event) {
    event.preventDefault();
    const clipboardData = event.clipboardData;
    if (!clipboardData || !this.#inputField) {
      return;
    }
    const pastedText = clipboardData.getData("text").replace(/(\r\n|\n|\r)/gm, "");
    const newText = this.#inputField.textContent + pastedText;
    const trimmedText = newText.slice(0, _EntryLabelOverlay.MAX_LABEL_LENGTH + 1);
    this.#inputField.textContent = trimmedText;
    this.#placeCursorAtInputEnd();
  }
  set entryLabelVisibleHeight(entryLabelVisibleHeight) {
    this.#entryLabelVisibleHeight = entryLabelVisibleHeight;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    if (this.#isLabelEditable) {
      this.#focusInputBox();
    }
    this.#drawLabel();
    this.#drawConnector();
  }
  #drawConnector() {
    if (!this.#connectorLineContainer) {
      console.error("`connectorLineContainer` element is missing.");
      return;
    }
    if (this.#shouldDrawBelowEntry && this.#entryLabelVisibleHeight) {
      const translation = this.#entryLabelVisibleHeight + _EntryLabelOverlay.LABEL_CONNECTOR_HEIGHT;
      this.#connectorLineContainer.style.transform = `translateY(${translation}px) rotate(180deg)`;
    }
    const connector = this.#connectorLineContainer.querySelector("line");
    const circle = this.#connectorLineContainer.querySelector("circle");
    if (!connector || !circle) {
      console.error("Some entry label elements are missing.");
      return;
    }
    this.#connectorLineContainer.setAttribute("width", (_EntryLabelOverlay.LABEL_AND_CONNECTOR_SHIFT_LENGTH * 2).toString());
    this.#connectorLineContainer.setAttribute("height", _EntryLabelOverlay.LABEL_CONNECTOR_HEIGHT.toString());
    connector.setAttribute("x1", "0");
    connector.setAttribute("y1", "0");
    connector.setAttribute("x2", _EntryLabelOverlay.LABEL_AND_CONNECTOR_SHIFT_LENGTH.toString());
    connector.setAttribute("y2", _EntryLabelOverlay.LABEL_CONNECTOR_HEIGHT.toString());
    const connectorColor = ThemeSupport3.ThemeSupport.instance().getComputedValue("--color-text-primary");
    connector.setAttribute("stroke", connectorColor);
    connector.setAttribute("stroke-width", "2");
    circle.setAttribute("cx", _EntryLabelOverlay.LABEL_AND_CONNECTOR_SHIFT_LENGTH.toString());
    circle.setAttribute("cy", (_EntryLabelOverlay.LABEL_CONNECTOR_HEIGHT + 1).toString());
    circle.setAttribute("r", "3");
    circle.setAttribute("fill", connectorColor);
  }
  #drawLabel(initialLabel) {
    if (!this.#inputField) {
      console.error("`labelBox`element is missing.");
      return;
    }
    if (typeof initialLabel === "string") {
      this.#inputField.innerText = initialLabel;
    }
    let xTranslation = null;
    let yTranslation = null;
    if (this.#shouldDrawBelowEntry) {
      xTranslation = _EntryLabelOverlay.LABEL_AND_CONNECTOR_SHIFT_LENGTH;
    } else {
      xTranslation = _EntryLabelOverlay.LABEL_AND_CONNECTOR_SHIFT_LENGTH * -1;
    }
    if (this.#shouldDrawBelowEntry && this.#entryLabelVisibleHeight) {
      const verticalTransform = this.#entryLabelVisibleHeight + _EntryLabelOverlay.LABEL_CONNECTOR_HEIGHT * 2 + this.#inputField?.offsetHeight;
      yTranslation = verticalTransform;
    }
    let transformString = "";
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
  #focusInputBox() {
    if (!this.#inputField) {
      console.error("`labelBox` element is missing.");
      return;
    }
    this.#inputField.focus();
  }
  setLabelEditabilityAndRemoveEmptyLabel(editable) {
    if (this.#inAIConsentDialogFlow && editable === false) {
      return;
    }
    if (editable) {
      this.setAttribute("data-user-editing-label", "true");
    } else {
      this.removeAttribute("data-user-editing-label");
    }
    this.#isLabelEditable = editable;
    this.#render();
    if (editable && this.#inputField) {
      this.#placeCursorAtInputEnd();
      this.#focusInputBox();
    }
    const newLabelText = this.#inputField?.textContent?.trim() ?? "";
    if (!editable && newLabelText.length === 0 && !this.#isPendingRemoval) {
      this.#isPendingRemoval = true;
      this.dispatchEvent(new EntryLabelRemoveEvent());
    }
  }
  /**
   * Places the user's cursor at the end of the input. We do this when the user
   * focuses the input with either the keyboard or mouse, and when they paste in
   * text, so that the cursor is placed in a useful position to edit.
   */
  #placeCursorAtInputEnd() {
    if (!this.#inputField) {
      return;
    }
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(this.#inputField);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  set callTree(callTree) {
    this.#callTree = callTree;
    this.#setAIButtonRenderState();
  }
  // Generate the AI label suggestion if:
  // 1. the user has already already seen the fre dialog and confirmed the feature usage
  // or
  // 2. turned on the `generate AI labels` setting through the AI settings panel
  //
  // Otherwise, show the fre dialog with a 'Got it' button that turns the setting on.
  async #handleAiButtonClick() {
    if (this.#aiAnnotationsEnabledSetting.get()) {
      if (!this.#callTree || !this.#inputField) {
        return;
      }
      try {
        this.#currAIButtonState = "generating_label";
        UI.ARIAUtils.LiveAnnouncer.alert(UIStringsNotTranslate.generatingLabel);
        this.#render();
        this.#focusInputBox();
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
        this.#label = await this.#agent.generateAIEntryLabel(this.#callTree);
        this.dispatchEvent(new EntryLabelChangeEvent(this.#label));
        this.#inputField.innerText = this.#label;
        this.#placeCursorAtInputEnd();
        this.#setAIButtonRenderState();
        this.#render();
      } catch {
        this.#currAIButtonState = "generation_failed";
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
      }
    } else {
      this.#inAIConsentDialogFlow = true;
      this.#render();
      const hasConsented = await this.#showUserAiFirstRunDialog();
      this.#inAIConsentDialogFlow = false;
      this.setLabelEditabilityAndRemoveEmptyLabel(true);
      if (hasConsented) {
        await this.#handleAiButtonClick();
      }
    }
  }
  /**
   * @returns `true` if the user has now consented, and `false` otherwise.
   */
  async #showUserAiFirstRunDialog() {
    this.dispatchEvent(new LabelAnnotationsConsentDialogVisibilityChange(true));
    const userConsented = await PanelCommon.FreDialog.show({
      ariaLabel: i18nString2(UIStrings2.freDialog),
      header: { iconName: "pen-spark", text: lockedString(UIStringsNotTranslate.freDisclaimerHeader) },
      reminderItems: [
        {
          iconName: "psychiatry",
          content: lockedString(UIStringsNotTranslate.freDisclaimerAiWontAlwaysGetItRight)
        },
        {
          iconName: "google",
          content: this.#noLogging ? lockedString(UIStringsNotTranslate.freDisclaimerPrivacyDataSentToGoogleNoLogging) : lockedString(UIStringsNotTranslate.freDisclaimerPrivacyDataSentToGoogle)
        }
      ],
      onLearnMoreClick: () => {
        UIHelpers.openInNewTab("https://developer.chrome.com/docs/devtools/performance/annotations#auto-annotations");
      },
      learnMoreButtonText: UIStringsNotTranslate.learnMoreButton
    });
    this.dispatchEvent(new LabelAnnotationsConsentDialogVisibilityChange(false));
    if (userConsented) {
      this.#aiAnnotationsEnabledSetting.set(true);
    }
    return this.#aiAnnotationsEnabledSetting.get();
  }
  #setAIButtonRenderState() {
    const hasAiExperiment = Boolean(Root.Runtime.hostConfig.devToolsAiGeneratedTimelineLabels?.enabled);
    const aiDisabledByEnterprisePolicy = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue === Root.Runtime.GenAiEnterprisePolicyValue.DISABLE;
    const dataToGenerateLabelAvailable = this.#callTree !== null;
    const labelIsEmpty = this.#label?.length <= 0;
    if (!hasAiExperiment || aiDisabledByEnterprisePolicy || !dataToGenerateLabelAvailable || !labelIsEmpty) {
      this.#currAIButtonState = "hidden";
    } else {
      const aiAvailable = Root.Runtime.hostConfig.aidaAvailability?.enabled && !Root.Runtime.hostConfig.aidaAvailability?.blockedByAge && !Root.Runtime.hostConfig.aidaAvailability?.blockedByGeo && navigator.onLine;
      if (aiAvailable) {
        this.#currAIButtonState = "enabled";
      } else {
        this.#currAIButtonState = "disabled";
      }
    }
  }
  #renderAITooltip(opts) {
    return html2`<devtools-tooltip
    variant="rich"
    id="info-tooltip"
    ${Directives2.ref(this.#richTooltip)}>
      <div class="info-tooltip-container">
        ${opts.textContent} ${opts.includeSettingsButton ? html2`
          <button
            class="link tooltip-link"
            role="link"
            jslog=${VisualLogging2.link("open-ai-settings").track({
      click: true
    })}
            @click=${this.#onTooltipLearnMoreClick}
            aria-label=${i18nString2(UIStrings2.learnMoreAriaLabel)}
          >${lockedString(UIStringsNotTranslate.learnMore)}</button>
        ` : Lit.nothing}
      </div>
    </devtools-tooltip>`;
  }
  #renderGeneratingLabelAiButton() {
    return html2`
      <span
        class="ai-label-loading">
        <devtools-spinner></devtools-spinner>
        <span class="generate-label-text">${lockedString(UIStringsNotTranslate.generatingLabel)}</span>
      </span>
    `;
  }
  #renderAiButton() {
    if (this.#currAIButtonState === "generation_failed") {
      return html2`
        <span
          class="ai-label-error">
          <devtools-icon
            class="warning extra-large"
            name="warning"
            style="color: var(--ref-palette-error50)">
          </devtools-icon>
          <span class="generate-label-text">${lockedString(UIStringsNotTranslate.generationFailed)}</span>
        </span>
      `;
    }
    return html2`
      <!-- 'preventDefault' on the AI label button to prevent the label removal on blur  -->
      <span
        class="ai-label-button-wrapper only-pen-wrapper"
        @mousedown=${(e) => e.preventDefault()}>
        <button
          class="ai-label-button enabled"
          @click=${this.#handleAiButtonClick}
          jslog=${VisualLogging2.link("timeline.annotations.ai-generate-label").track({
      click: true
    })}>
          <devtools-icon
            class="pen-icon extra-large"
            name="pen-spark"
            style="color: var(--icon-primary);">
          </devtools-icon>
          <span class="generate-label-text">${i18nString2(UIStrings2.generateLabelButton)}</span>
        </button>
        <devtools-button
          aria-details="info-tooltip"
          class="pen-icon"
          .title=${i18nString2(UIStrings2.moreInfoAriaLabel)}
          .iconName=${"info"}
          .variant=${"icon"}
          ></devtools-button>
        ${this.#renderAITooltip({
      textContent: this.#noLogging ? lockedString(UIStringsNotTranslate.generateLabelSecurityDisclaimerLogginOff) : lockedString(UIStringsNotTranslate.generateLabelSecurityDisclaimer),
      includeSettingsButton: true
    })}
      </span>
    `;
  }
  #onTooltipLearnMoreClick() {
    this.#richTooltip?.value?.hidePopover();
    void UI.ViewManager.ViewManager.instance().showView("chrome-ai");
  }
  // The disabled button rendered when the `generate AI label` feature is not available
  // because of the geolocation, age or if they are not logged in into the google account.
  //
  // If the user is offline, display the same button with a different tooltip.
  #renderDisabledAiButton() {
    const noConnection = navigator.onLine === false;
    return html2`
      <!-- 'preventDefault' on the AI label button to prevent the label removal on blur  -->
      <span
        class="ai-label-disabled-button-wrapper only-pen-wrapper"
        @mousedown=${(e) => e.preventDefault()}>
        <button
          class="ai-label-button disabled"
          ?disabled=${true}
          @click=${this.#handleAiButtonClick}>
          <devtools-icon
            aria-details="info-tooltip"
            class="pen-icon extra-large"
            name="pen-spark"
            style="color: var(--sys-color-state-disabled);">
          </devtools-icon>
        </button>
        ${this.#renderAITooltip({
      textContent: noConnection ? lockedString(UIStringsNotTranslate.autoAnnotationNotAvailableOfflineDisclaimer) : lockedString(UIStringsNotTranslate.autoAnnotationNotAvailableDisclaimer),
      includeSettingsButton: !noConnection
    })}
      </span>
    `;
  }
  #handleFocusOutEvent(event) {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget && this.#shadow.contains(relatedTarget)) {
      return;
    }
    this.setLabelEditabilityAndRemoveEmptyLabel(false);
  }
  #render() {
    const inputFieldClasses = Lit.Directives.classMap({
      "input-field": true,
      // When the consent modal pops up, we want the input to look like it has focus so it visually doesn't change.
      // Once the consent flow is closed, we restore focus and maintain the appearance.
      "fake-focus-state": this.#inAIConsentDialogFlow
    });
    Lit.render(html2`
        <style>${entryLabelOverlay_css_default}</style>
        <span class="label-parts-wrapper" role="region" aria-label=${i18nString2(UIStrings2.entryLabel)}
          @focusout=${this.#handleFocusOutEvent}
        >
          <span
            class="label-button-input-wrapper">
            <span
              class=${inputFieldClasses}
              role="textbox"
              @focus=${() => {
      this.setLabelEditabilityAndRemoveEmptyLabel(true);
    }}
              @dblclick=${() => {
      this.setLabelEditabilityAndRemoveEmptyLabel(true);
    }}
              @keydown=${this.#handleLabelInputKeyDown}
              @paste=${this.#handleLabelInputPaste}
              @input=${this.#handleLabelInputKeyUp}
              contenteditable=${this.#isLabelEditable ? "plaintext-only" : false}
              jslog=${VisualLogging2.textField("timeline.annotations.entry-label-input").track({ keydown: true, click: true, change: true })}
              tabindex="0"
            ></span>
            ${this.#isLabelEditable && this.#inputField?.innerText !== "" ? html2`
              <button
                class="delete-button"
                @click=${() => this.dispatchEvent(new EntryLabelRemoveEvent())}
                jslog=${VisualLogging2.action("timeline.annotations.delete-entry-label").track({ click: true })}>
              <devtools-icon name="cross" class="small" style="color: var(--color-background);"
              ></devtools-icon>
              </button>
            ` : Lit.nothing}
            ${(() => {
      switch (this.#currAIButtonState) {
        case "hidden":
          return Lit.nothing;
        case "enabled":
          return this.#renderAiButton();
        case "generating_label":
          return this.#renderGeneratingLabelAiButton();
        case "generation_failed":
          return this.#renderAiButton();
        case "disabled":
          return this.#renderDisabledAiButton();
      }
    })()}
          </span>
          <svg class="connectorContainer">
            <line/>
            <circle/>
          </svg>
          <div class="entry-highlight-wrapper"></div>
        </span>`, this.#shadow, { host: this });
  }
};
customElements.define("devtools-entry-label-overlay", EntryLabelOverlay);

// gen/front_end/panels/timeline/overlays/components/TimeRangeOverlay.js
var TimeRangeOverlay_exports = {};
__export(TimeRangeOverlay_exports, {
  TimeRangeLabelChangeEvent: () => TimeRangeLabelChangeEvent,
  TimeRangeOverlay: () => TimeRangeOverlay,
  TimeRangeRemoveEvent: () => TimeRangeRemoveEvent
});
import * as i18n5 from "./../../../../core/i18n/i18n.js";
import * as Platform2 from "./../../../../core/platform/platform.js";
import { html as html3, render as render3 } from "./../../../../ui/lit/lit.js";
import * as VisualLogging3 from "./../../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/timeline/overlays/components/timeRangeOverlay.css.js
var timeRangeOverlay_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: flex;
  overflow: hidden;
  flex-direction: column;
  justify-content: flex-end;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding-bottom: 5px;
  /* stylelint-disable-next-line plugin/use_theme_colors */
  background: linear-gradient(
    180deg,
    rgb(255 125 210 / 0%) 0%,
    rgb(255 125 210 / 15%) 85%
  );
  border-color: var(--ref-palette-pink55);
  border-width: 0 1px 5px;
  border-style: solid;
  pointer-events: none;
}

.range-container {
  display: flex;
  align-items: center;
  flex-direction: column;
  text-align: center;
  box-sizing: border-box;
  pointer-events: all;
  user-select: none;
  color: var(--sys-color-pink);

  &.labelHidden {
    /* Have to use this not display: none so it maintains its width */
    user-select: none;
    pointer-events: none;
    visibility: hidden;
  }

  &.offScreenLeft {
    align-items: flex-start;
    text-align: left;
  }

  &.offScreenRight {
    align-items: flex-end;
    text-align: right;
  }
}

.label-text {
  /*
  * The width priority is min-width > max-width > width
  * When the range itself is smaller that 70px, expand 100% to fill the whole width.
  * When the range is wider, only expand the textfield to over 70px
  * if it's needed to fit the label text.
  */
  width: 100%;
  max-width: 70px;
  min-width: fit-content;
  text-overflow: ellipsis;
  overflow: hidden;
  word-break: normal;
  overflow-wrap: anywhere;
  margin-bottom: 3px;
  display: -webkit-box;
  white-space: break-spaces;
  background: var(--sys-color-cdt-base-container);
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.duration {
  background: var(--sys-color-cdt-base-container);
}

.label-text[contenteditable='true'] {
  outline: none;
  box-shadow: 0 0 0 1px var(--ref-palette-pink55);
}

.label-text[contenteditable='false'] {
  width: auto;
}

/*# sourceURL=${import.meta.resolve("./timeRangeOverlay.css")} */`;

// gen/front_end/panels/timeline/overlays/components/TimeRangeOverlay.js
var UIStrings3 = {
  /**
   * @description Accessible label used to explain to a user that they are viewing an entry label.
   */
  timeRange: "Time range"
};
var str_3 = i18n5.i18n.registerUIStrings("panels/timeline/overlays/components/TimeRangeOverlay.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var TimeRangeLabelChangeEvent = class _TimeRangeLabelChangeEvent extends Event {
  newLabel;
  static eventName = "timerangelabelchange";
  constructor(newLabel) {
    super(_TimeRangeLabelChangeEvent.eventName);
    this.newLabel = newLabel;
  }
};
var TimeRangeRemoveEvent = class _TimeRangeRemoveEvent extends Event {
  static eventName = "timerangeremoveevent";
  constructor() {
    super(_TimeRangeRemoveEvent.eventName);
  }
};
var TimeRangeOverlay = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #duration = null;
  #canvasRect = null;
  #label;
  // The label is set to editable and in focus anytime the label is empty and when the label it is double clicked.
  // If the user clicks away from the selected range element and the label is not empty, the label is set to not editable until it is double clicked.
  #isLabelEditable = true;
  #rangeContainer = null;
  #labelBox = null;
  constructor(initialLabel) {
    super();
    this.#render();
    this.#rangeContainer = this.#shadow.querySelector(".range-container");
    this.#labelBox = this.#rangeContainer?.querySelector(".label-text") ?? null;
    this.#label = initialLabel;
    if (!this.#labelBox) {
      console.error("`labelBox` element is missing.");
      return;
    }
    this.#labelBox.innerText = initialLabel;
    if (initialLabel) {
      this.#labelBox?.setAttribute("aria-label", initialLabel);
      this.#setLabelEditability(false);
    }
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
  set duration(duration) {
    if (duration === this.#duration) {
      return;
    }
    this.#duration = duration;
    this.#render();
  }
  /**
   * This calculates how much of the time range is in the user's view. This is
   * used to determine how much of the label can fit into the view, and if we
   * should even show the label.
   */
  #visibleOverlayWidth(overlayRect) {
    if (!this.#canvasRect) {
      return 0;
    }
    const { x: overlayStartX, width } = overlayRect;
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
  updateLabelPositioning() {
    if (!this.#rangeContainer) {
      return;
    }
    if (!this.#canvasRect || !this.#labelBox) {
      return;
    }
    const paddingForScrollbar = 9;
    const overlayRect = this.getBoundingClientRect();
    const labelFocused = this.#shadow.activeElement === this.#labelBox;
    const labelRect = this.#rangeContainer.getBoundingClientRect();
    const visibleOverlayWidth = this.#visibleOverlayWidth(overlayRect) - paddingForScrollbar;
    const durationBox = this.#rangeContainer.querySelector(".duration") ?? null;
    const durationBoxLength = durationBox?.getBoundingClientRect().width;
    if (!durationBoxLength) {
      return;
    }
    const overlayTooNarrow = visibleOverlayWidth <= durationBoxLength;
    const hideLabel = overlayTooNarrow && !labelFocused && this.#label.length > 0;
    this.#rangeContainer.classList.toggle("labelHidden", hideLabel);
    if (hideLabel) {
      return;
    }
    const labelLeftMarginToCenter = (overlayRect.width - labelRect.width) / 2;
    const newLabelX = overlayRect.x + labelLeftMarginToCenter;
    const labelOffLeftOfScreen = newLabelX < this.#canvasRect.x;
    this.#rangeContainer.classList.toggle("offScreenLeft", labelOffLeftOfScreen);
    const rightBound = this.#canvasRect.x + this.#canvasRect.width;
    const labelRightEdge = overlayRect.x + labelLeftMarginToCenter + labelRect.width;
    const labelOffRightOfScreen = labelRightEdge > rightBound;
    this.#rangeContainer.classList.toggle("offScreenRight", labelOffRightOfScreen);
    if (labelOffLeftOfScreen) {
      this.#rangeContainer.style.marginLeft = `${Math.abs(this.#canvasRect.x - overlayRect.x) + paddingForScrollbar}px`;
    } else if (labelOffRightOfScreen) {
      this.#rangeContainer.style.marginRight = `${overlayRect.right - this.#canvasRect.right + paddingForScrollbar}px`;
    } else {
      this.#rangeContainer.style.margin = "0px";
    }
    if (this.#labelBox?.innerText === "") {
      this.#setLabelEditability(true);
    }
  }
  #focusInputBox() {
    if (!this.#labelBox) {
      console.error("`labelBox` element is missing.");
      return;
    }
    this.#labelBox.focus();
  }
  #setLabelEditability(editable) {
    if (this.#labelBox?.innerText === "") {
      this.#focusInputBox();
      return;
    }
    this.#isLabelEditable = editable;
    this.#render();
    if (editable) {
      this.#focusInputBox();
    }
  }
  #handleLabelInputKeyUp() {
    const labelBoxTextContent = this.#labelBox?.textContent ?? "";
    if (labelBoxTextContent !== this.#label) {
      this.#label = labelBoxTextContent;
      this.dispatchEvent(new TimeRangeLabelChangeEvent(this.#label));
      this.#labelBox?.setAttribute("aria-label", labelBoxTextContent);
    }
  }
  #handleLabelInputKeyDown(event) {
    if (event.key === Platform2.KeyboardUtilities.ENTER_KEY || event.key === Platform2.KeyboardUtilities.ESCAPE_KEY) {
      event.stopPropagation();
      if (this.#label === "") {
        this.dispatchEvent(new TimeRangeRemoveEvent());
      }
      this.#labelBox?.blur();
      return false;
    }
    return true;
  }
  #render() {
    const durationText = this.#duration ? i18n5.TimeUtilities.formatMicroSecondsTime(this.#duration) : "";
    render3(html3`
          <style>${timeRangeOverlay_css_default}</style>
          <span class="range-container" role="region" aria-label=${i18nString3(UIStrings3.timeRange)}>
            <span
             class="label-text"
             role="textbox"
             @focusout=${() => this.#setLabelEditability(false)}
             @dblclick=${() => this.#setLabelEditability(true)}
             @keydown=${this.#handleLabelInputKeyDown}
             @keyup=${this.#handleLabelInputKeyUp}
             contenteditable=${this.#isLabelEditable ? "plaintext-only" : false}
             jslog=${VisualLogging3.textField("timeline.annotations.time-range-label-input").track({ keydown: true, click: true })}
            ></span>
            <span class="duration">${durationText}</span>
          </span>
          `, this.#shadow, { host: this });
    this.updateLabelPositioning();
  }
};
customElements.define("devtools-time-range-overlay", TimeRangeOverlay);

// gen/front_end/panels/timeline/overlays/components/TimespanBreakdownOverlay.js
var TimespanBreakdownOverlay_exports = {};
__export(TimespanBreakdownOverlay_exports, {
  TimespanBreakdownOverlay: () => TimespanBreakdownOverlay
});
import * as i18n7 from "./../../../../core/i18n/i18n.js";
import * as Lit2 from "./../../../../ui/lit/lit.js";

// gen/front_end/panels/timeline/overlays/components/timespanBreakdownOverlay.css.js
var timespanBreakdownOverlay_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.timespan-breakdown-overlay-section {
  border: solid;
  border-color: var(--sys-color-on-surface);
  border-width: 4px 1px 0;
  align-content: flex-start;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  background-image: linear-gradient(180deg, var(--sys-color-on-primary), transparent);
  height: 90%;
  box-sizing: border-box;
  padding-top: var(--sys-size-2);

  :host(.is-below) & {
    border-top-width: 0;
    border-bottom-width: 4px;
    align-content: flex-end; /* anchor the text at the bottom */
    padding-bottom: var(--sys-size-2);
    padding-top: 0;

    /* re-order so the timestamp is below label */
    .timespan-breakdown-overlay-label {
      display: flex;
      flex-direction: column-reverse;
    }
  }
}

:host {
  display: flex;
  overflow: hidden;
  flex-direction: row;
  justify-content: flex-end;
  align-items: flex-end;
  width: 100%;
  box-sizing: border-box;
  height: 100%;
  max-height: 100px;

  /* Ensure that the first & last sections always have the left/right border */
  /* (disable stylelint because we need the !important to override border
   * styles below + keeping them here is clearer to read) */
  .timespan-breakdown-overlay-section:first-child {
    border-left-width: 1px !important; /* stylelint-disable-line declaration-no-important */
  }

  .timespan-breakdown-overlay-section:last-child {
    border-right-width: 1px !important; /* stylelint-disable-line declaration-no-important */
  }
}

:host(.is-below) {
  align-items: flex-start;
}

/* Depending on if the number of sections is odd or even, we alternate the
 * heights of the even/odd sections. We do this to ensure that the first item
 * is never a "high" item, because that looks a bit clunky. */
:host(.odd-number-of-sections) {
  .timespan-breakdown-overlay-section:nth-child(even) {
    height: 100%;
  }

  .timespan-breakdown-overlay-section:nth-child(odd) {
    border-left-width: 0;
    border-right-width: 0;
  }
}

:host(.even-number-of-sections) {
  .timespan-breakdown-overlay-section:nth-child(odd) {
    height: 100%;
  }

  .timespan-breakdown-overlay-section:nth-child(even) {
    border-left-width: 0;
    border-right-width: 0;
  }
}

.timespan-breakdown-overlay-label {
  font-family: var(--default-font-family);
  font-size: var(--sys-typescale-body2-size);
  line-height: var(--sys-typescale-body4-line-height);
  font-weight: var(--ref-typeface-weight-medium);
  color: var(--sys-color-on-surface);
  text-align: center;
  box-sizing: border-box;
  width: max-content;
  padding: 0 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  text-wrap: nowrap;

  .duration-text {
    font-size: var(--sys-typescale-body4-size);
    text-overflow: ellipsis;
    overflow: hidden;
    text-wrap: nowrap;
    display: block;
  }

  .discovery-time-ms {
    font-weight: var(--ref-typeface-weight-bold);
  }

  &.labelHidden {
    /* Have to use this not display: none so it maintains its width */
    user-select: none;
    pointer-events: none;
    visibility: hidden;
  }

  &.labelTruncated {
    /* This means the label will show the text that fits with an ellipsis for
     * the overflow */
    max-width: 100%;
  }

  &.offScreenLeft {
    text-align: left;
  }

  &.offScreenRight {
    text-align: right;
  }
}

/*# sourceURL=${import.meta.resolve("./timespanBreakdownOverlay.css")} */`;

// gen/front_end/panels/timeline/overlays/components/TimespanBreakdownOverlay.js
var { html: html4 } = Lit2;
var TimespanBreakdownOverlay = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #canvasRect = null;
  #sections = null;
  set isBelowEntry(isBelow) {
    this.classList.toggle("is-below", isBelow);
  }
  set canvasRect(rect) {
    if (this.#canvasRect && rect && this.#canvasRect.width === rect.width && this.#canvasRect.height === rect.height) {
      return;
    }
    this.#canvasRect = rect;
    this.#render();
  }
  set sections(sections) {
    if (sections === this.#sections) {
      return;
    }
    this.#sections = sections;
    this.#render();
  }
  /**
   * We use this method after the overlay has been positioned in order to move
   * the section label as required to keep it on screen.
   * If the label is off to the left or right, we fix it to that corner and
   * align the text so the label is visible as long as possible.
   */
  checkSectionLabelPositioning() {
    const sections = this.#shadow.querySelectorAll(".timespan-breakdown-overlay-section");
    if (!sections) {
      return;
    }
    if (!this.#canvasRect) {
      return;
    }
    const paddingForScrollbar = 9;
    const sectionLayoutData = /* @__PURE__ */ new Map();
    for (const section of sections) {
      const label = section.querySelector(".timespan-breakdown-overlay-label");
      if (!label) {
        continue;
      }
      const sectionRect = section.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      sectionLayoutData.set(section, { sectionRect, labelRect, label });
    }
    const minSectionWidthToShowAnyLabel = 30;
    for (const section of sections) {
      const layoutData = sectionLayoutData.get(section);
      if (!layoutData) {
        break;
      }
      const { labelRect, sectionRect, label } = layoutData;
      const labelHidden = sectionRect.width < minSectionWidthToShowAnyLabel;
      const labelTruncated = sectionRect.width - 5 <= labelRect.width;
      label.classList.toggle("labelHidden", labelHidden);
      label.classList.toggle("labelTruncated", labelTruncated);
      if (labelHidden || labelTruncated) {
        continue;
      }
      const labelLeftMarginToCenter = (sectionRect.width - labelRect.width) / 2;
      const newLabelX = sectionRect.x + labelLeftMarginToCenter;
      const labelOffLeftOfScreen = newLabelX < this.#canvasRect.x;
      label.classList.toggle("offScreenLeft", labelOffLeftOfScreen);
      const rightBound = this.#canvasRect.x + this.#canvasRect.width;
      const labelRightEdge = sectionRect.x + labelLeftMarginToCenter + labelRect.width;
      const labelOffRightOfScreen = labelRightEdge > rightBound;
      label.classList.toggle("offScreenRight", labelOffRightOfScreen);
      if (labelOffLeftOfScreen) {
        label.style.marginLeft = `${Math.abs(this.#canvasRect.x - sectionRect.x) + paddingForScrollbar}px`;
      } else if (labelOffRightOfScreen) {
        const leftMargin = rightBound - labelRect.width - sectionRect.x;
        label.style.marginLeft = `${leftMargin}px`;
      } else {
        label.style.marginLeft = `${labelLeftMarginToCenter}px`;
      }
    }
  }
  renderedSections() {
    return Array.from(this.#shadow.querySelectorAll(".timespan-breakdown-overlay-section"));
  }
  #renderSection(section) {
    return html4`
      <div class="timespan-breakdown-overlay-section">
        <div class="timespan-breakdown-overlay-label">
        ${section.showDuration ? html4`<span class="duration-text">${i18n7.TimeUtilities.formatMicroSecondsAsMillisFixed(section.bounds.range)}</span> ` : Lit2.nothing}
          <span class="section-label-text">${section.label}</span>
        </div>
      </div>`;
  }
  #render() {
    if (this.#sections) {
      this.classList.toggle("odd-number-of-sections", this.#sections.length % 2 === 1);
      this.classList.toggle("even-number-of-sections", this.#sections.length % 2 === 0);
    }
    Lit2.render(html4`<style>${timespanBreakdownOverlay_css_default}</style>
             ${this.#sections?.map(this.#renderSection)}`, this.#shadow, { host: this });
    this.checkSectionLabelPositioning();
  }
};
customElements.define("devtools-timespan-breakdown-overlay", TimespanBreakdownOverlay);
export {
  EntriesLinkOverlay_exports as EntriesLinkOverlay,
  EntryLabelOverlay_exports as EntryLabelOverlay,
  TimeRangeOverlay_exports as TimeRangeOverlay,
  TimespanBreakdownOverlay_exports as TimespanBreakdownOverlay
};
//# sourceMappingURL=components.js.map
