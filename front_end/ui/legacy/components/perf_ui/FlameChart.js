// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import * as Buttons from '../../../components/buttons/buttons.js';
import * as UI from '../../legacy.js';
import * as ThemeSupport from '../../theme_support/theme_support.js';
import { drawExpansionArrow, drawIcon, horizontalLine } from './CanvasHelper.js';
import { ChartViewport } from './ChartViewport.js';
import flameChartStyles from './flameChart.css.js';
import { DEFAULT_FONT_SIZE, getFontFamilyForCanvas } from './Font.js';
import { TimelineGrid } from './TimelineGrid.js';
/**
 * Set as the `details` value on the fake context menu event we dispatch to
 * trigger a context menu on an event on a keyboard space key press.
 * {@link FlameChart.onContextMenu} for more details and explanation.
 */
const KEYBOARD_FAKED_CONTEXT_MENU_DETAIL = -1;
/**
 * The adjustments needed for the subtitle font (based off of the default font).
 */
const SUBTITLE_FONT_SIZE_AND_STYLE = 'italic 10px';
const UIStrings = {
    /**
     * @description Aria alert used to notify the user when an event has been selected because they tabbed into a group.
     * @example {Paint} PH1
     * @example {Main thread} PH2
     *
     */
    eventSelectedFromGroup: 'Selected a {PH1} event within {PH2}. Press "enter" to focus this event.',
    /**
     * @description Aria accessible name in Flame Chart of the Performance panel
     */
    flameChart: 'Flame Chart',
    /**
     * @description Text for the screen reader to announce a hovered group
     * @example {Network} PH1
     */
    sHovered: '{PH1} hovered',
    /**
     * @description Text for screen reader to announce a selected group.
     * @example {Network} PH1
     */
    sSelected: '{PH1} selected',
    /**
     * @description Text for screen reader to announce an expanded group
     * @example {Network} PH1
     */
    sExpanded: '{PH1} expanded',
    /**
     * @description Text for screen reader to announce a collapsed group
     * @example {Network} PH1
     */
    sCollapsed: '{PH1} collapsed',
    /**
     * @description Text for an action that adds a label annotation to an entry in the Flame Chart
     */
    labelEntry: 'Label entry',
    /**
     * @description Text for an action that adds link annotation between entries in the Flame Chart
     */
    linkEntries: 'Link entries',
    /**
     * @description Shown in the context menu when right clicking on a track header to enable the user to enter the track configuration mode.
     */
    enterTrackConfigurationMode: 'Configure tracks',
    /**
     * @description Shown in the context menu when right clicking on a track header to allow the user to exit track configuration mode.
     */
    exitTrackConfigurationMode: 'Finish configuring tracks',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/perf_ui/FlameChart.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * The expansion arrow is drawn from the center, so the indent is in fact the center of the arrow.
 * See `drawExpansionArrow` function to understand how we draw the arrow.
 * |headerLeftPadding|Arrow|
 * |expansionArrowIndent|
 *
 * When we are in edit mode, we render 3 icons to the left of the track's title.
 * When we are in normal mode, there are no icons to the left of the track's title.
 **/
// Placed to the left of the track header.
const HEADER_LEFT_PADDING = 6;
export const ARROW_SIDE = 8;
const EXPANSION_ARROW_INDENT = HEADER_LEFT_PADDING + ARROW_SIDE / 2;
const HEADER_LABEL_X_PADDING = 3;
const HEADER_LABEL_Y_PADDING = 2;
const PADDING_BETWEEN_TITLE_AND_SUBTITLE = 6;
/** The width of each of the edit mode icons. **/
export const EDIT_ICON_WIDTH = 16;
// This gap might seem quite small - but the icons themselves have some
// whitespace either side, so we don't need a huge gap.
const GAP_BETWEEN_EDIT_ICONS = 3;
// The UP icon is first, and is rendered in from the left just as the track text.
const UP_ICON_LEFT = HEADER_LEFT_PADDING;
// The DOWN icon is after the UP icon, hence we take the up icon's position,
// add its width and then the gap between them.
const DOWN_ICON_LEFT = UP_ICON_LEFT + EDIT_ICON_WIDTH + GAP_BETWEEN_EDIT_ICONS;
// The HIDE icon is after the DOWN icon, hence we take the up icon's position,
// add its width and then the gap between them.
const HIDE_ICON_LEFT = DOWN_ICON_LEFT + EDIT_ICON_WIDTH + GAP_BETWEEN_EDIT_ICONS;
// Represents the total width taken by the 3 icons (up, down, hide/show, and
// the gap between them.)
// We calculate this by taking the space to the left of the hide icon (which
// encompasses UP/DOWN icons), adding on the width of the HIDE icon, and then a
// bit of extra padding.
const EDIT_MODE_TOTAL_ICON_WIDTH = HIDE_ICON_LEFT + EDIT_ICON_WIDTH + GAP_BETWEEN_EDIT_ICONS;
// These are copied from front_end/images/*.svg, because we need to draw them with canvas.
// arrow-up.svg
const moveUpIconPath = 'M9.25 17V5.875L7.062 8.062L6 7L10 3L14 7L12.938 8.062L10.75 5.875V17H9.25Z';
// arrow-down.svg
const moveDownIconPath = 'M9.25 3V14.125L7.062 11.938L6 13L10 17L14 13L12.938 11.938L10.75 14.125V3H9.25Z';
// eye-crossed.svg
const hideIconPath = 'M13.2708 11.1459L11.9792 9.85419C12.0347 9.32641 11.875 8.87155 11.5 8.4896C11.125 8.10766 10.6736 7.94446 10.1458 8.00002L8.85417 6.70835C9.03472 6.63891 9.22222 6.58683 9.41667 6.5521C9.61111 6.51738 9.80556 6.50002 10 6.50002C10.9722 6.50002 11.7986 6.8403 12.4792 7.52085C13.1597 8.20141 13.5 9.0278 13.5 10C13.5 10.1945 13.4826 10.3889 13.4479 10.5834C13.4132 10.7778 13.3542 10.9653 13.2708 11.1459ZM16.0417 13.9167L14.9583 12.8334C15.4583 12.4445 15.9132 12.0174 16.3229 11.5521C16.7326 11.0868 17.0764 10.5695 17.3542 10C16.6736 8.59724 15.6701 7.49655 14.3438 6.69794C13.0174 5.89933 11.5694 5.50002 10 5.50002C9.63889 5.50002 9.28472 5.52085 8.9375 5.56252C8.59028 5.60419 8.25 5.67363 7.91667 5.77085L6.70833 4.56252C7.23611 4.35419 7.77431 4.20835 8.32292 4.12502C8.87153 4.04169 9.43056 4.00002 10 4.00002C11.9861 4.00002 13.8021 4.53821 15.4479 5.6146C17.0938 6.69099 18.2778 8.1528 19 10C18.6944 10.7917 18.2882 11.5104 17.7813 12.1563C17.2743 12.8021 16.6944 13.3889 16.0417 13.9167ZM16 18.125L13.2917 15.4167C12.7639 15.6111 12.2257 15.757 11.6771 15.8542C11.1285 15.9514 10.5694 16 10 16C8.01389 16 6.19792 15.4618 4.55208 14.3854C2.90625 13.309 1.72222 11.8472 1 10C1.30556 9.20835 1.70833 8.48613 2.20833 7.83335C2.70833 7.18058 3.29167 6.5903 3.95833 6.06252L1.875 3.97919L2.9375 2.91669L17.0625 17.0625L16 18.125ZM5.02083 7.14585C4.53472 7.53474 4.08333 7.96183 3.66667 8.4271C3.25 8.89238 2.90972 9.41669 2.64583 10C3.32639 11.4028 4.32986 12.5035 5.65625 13.3021C6.98264 14.1007 8.43056 14.5 10 14.5C10.3611 14.5 10.7153 14.4757 11.0625 14.4271C11.4097 14.3785 11.7569 14.3125 12.1042 14.2292L11.1667 13.2917C10.9722 13.3611 10.7778 13.4132 10.5833 13.4479C10.3889 13.4827 10.1944 13.5 10 13.5C9.02778 13.5 8.20139 13.1597 7.52083 12.4792C6.84028 11.7986 6.5 10.9722 6.5 10C6.5 9.80558 6.52431 9.61113 6.57292 9.41669C6.62153 9.22224 6.66667 9.0278 6.70833 8.83335L5.02083 7.14585Z';
// eye.svg
const showIconPath = 'M10 13.5C10.972 13.5 11.7983 13.1597 12.479 12.479C13.1597 11.7983 13.5 10.972 13.5 10C13.5 9.028 13.1597 8.20167 12.479 7.521C11.7983 6.84033 10.972 6.5 10 6.5C9.028 6.5 8.20167 6.84033 7.521 7.521C6.84033 8.20167 6.5 9.028 6.5 10C6.5 10.972 6.84033 11.7983 7.521 12.479C8.20167 13.1597 9.028 13.5 10 13.5ZM10 12C9.44467 12 8.97233 11.8057 8.583 11.417C8.19433 11.0277 8 10.5553 8 10C8 9.44467 8.19433 8.97233 8.583 8.583C8.97233 8.19433 9.44467 8 10 8C10.5553 8 11.0277 8.19433 11.417 8.583C11.8057 8.97233 12 9.44467 12 10C12 10.5553 11.8057 11.0277 11.417 11.417C11.0277 11.8057 10.5553 12 10 12ZM10 16C8.014 16 6.20833 15.455 4.583 14.365C2.95833 13.2743 1.764 11.8193 1 10C1.764 8.18067 2.95833 6.72567 4.583 5.635C6.20833 4.545 8.014 4 10 4C11.986 4 13.7917 4.545 15.417 5.635C17.0417 6.72567 18.236 8.18067 19 10C18.236 11.8193 17.0417 13.2743 15.417 14.365C13.7917 15.455 11.986 16 10 16ZM10 14.5C11.5553 14.5 12.9927 14.0973 14.312 13.292C15.632 12.486 16.646 11.3887 17.354 10C16.646 8.61133 15.632 7.514 14.312 6.708C12.9927 5.90267 11.5553 5.5 10 5.5C8.44467 5.5 7.00733 5.90267 5.688 6.708C4.368 7.514 3.354 8.61133 2.646 10C3.354 11.3887 4.368 12.486 5.688 13.292C7.00733 14.0973 8.44467 14.5 10 14.5Z';
export class FlameChart extends Common.ObjectWrapper.eventMixin(UI.Widget.VBox) {
    flameChartDelegate;
    chartViewport;
    dataProvider;
    candyStripePattern;
    candyStripePatternGray;
    contextMenu;
    viewportElement;
    canvas;
    context;
    popoverElement;
    markerHighlighElement;
    highlightElement;
    revealDescendantsArrowHighlightElement;
    selectedElement = null;
    rulerEnabled;
    barHeight;
    // Additional space around an entry that is added for operations with entry.
    // It allows for less pecision while selecting/hovering over an entry.
    hitMarginPx;
    textBaseline;
    textPadding;
    highlightedMarkerIndex;
    /**
     * The index of the entry that's hovered (typically), or focused because of searchResult or other reasons.focused via searchResults, or focused by other means.
     * Updated as the cursor moves. Meanwhile `selectedEntryIndex` is the entry that's been clicked.
     **/
    highlightedEntryIndex;
    /**
     * Represents the index of the entry that is selected. For an entry to be
     * selected, it has to be clicked by the user (generally).
     **/
    selectedEntryIndex;
    rawTimelineDataLength;
    markerPositions;
    customDrawnPositions;
    lastMouseOffsetX;
    selectedGroupIndex;
    keyboardFocusedGroup;
    offsetWidth;
    offsetHeight;
    dragStartX;
    dragStartY;
    lastMouseOffsetY;
    #minimumBoundary;
    maxDragOffset;
    timelineLevels;
    visibleLevelOffsets;
    visibleLevels;
    visibleLevelHeights;
    groupOffsets;
    rawTimelineData;
    forceDecorationCache;
    entryColorsCache;
    colorDimmingCache = new Map();
    totalTime;
    lastPopoverState;
    dimIndices;
    /** When true, all undimmed entries are outlined. When an array, only those indices are outlined (if not dimmed). */
    dimShouldOutlineUndimmedEntries = false;
    #tooltipPopoverYAdjustment = 0;
    #font;
    #subtitleFont;
    #groupTreeRoot;
    #searchResultEntryIndex = null;
    #inTrackConfigEditMode = false;
    #linkSelectionAnnotationIsInProgress = false;
    // Stored because we cache this value to save extra lookups and layoffs.
    #canvasBoundingClientRect = null;
    #selectedElementOutlineEnabled = true;
    #indexToDrawOverride = new Map();
    #persistedGroupConfig = null;
    #boundOnThemeChanged = this.#onThemeChanged.bind(this);
    constructor(dataProvider, flameChartDelegate, optionalConfig = {}) {
        super({ useShadowDom: true });
        this.#font = `${DEFAULT_FONT_SIZE} ${getFontFamilyForCanvas()}`;
        this.#subtitleFont = `${SUBTITLE_FONT_SIZE_AND_STYLE} ${getFontFamilyForCanvas()}`;
        this.registerRequiredCSS(flameChartStyles);
        this.registerRequiredCSS(UI.inspectorCommonStyles);
        this.contentElement.classList.add('flame-chart-main-pane');
        if (typeof optionalConfig.selectedElementOutline === 'boolean') {
            this.#selectedElementOutlineEnabled = optionalConfig.selectedElementOutline;
        }
        this.flameChartDelegate = flameChartDelegate;
        // The ChartViewport has its own built-in ruler for when the user holds
        // shift and moves the mouse. We want to disable that if we are within the
        // performance panel where we use overlays, but enable it otherwise.
        let enableCursorElement = true;
        if (typeof optionalConfig.useOverlaysForCursorRuler === 'boolean') {
            enableCursorElement = !optionalConfig.useOverlaysForCursorRuler;
        }
        this.chartViewport = new ChartViewport(this, {
            enableCursorElement,
        });
        this.chartViewport.show(this.contentElement);
        this.dataProvider = dataProvider;
        this.viewportElement = this.chartViewport.viewportElement;
        this.canvas = this.viewportElement.createChild('canvas', 'fill');
        if (optionalConfig.canvasVELogContext) {
            const context = VisualLogging.canvas(optionalConfig.canvasVELogContext).track({
                hover: true,
            });
            this.canvas.setAttribute('jslog', `${context}`);
        }
        this.context = this.canvas.getContext('2d');
        this.candyStripePattern = this.candyStripePatternGray = null;
        this.canvas.tabIndex = 0;
        UI.ARIAUtils.setLabel(this.canvas, i18nString(UIStrings.flameChart));
        UI.ARIAUtils.markAsTree(this.canvas);
        this.setDefaultFocusedElement(this.canvas);
        this.canvas.classList.add('flame-chart-canvas');
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this), false);
        this.canvas.addEventListener('mouseout', this.onMouseOut.bind(this), false);
        this.canvas.addEventListener('click', this.onClick.bind(this), false);
        this.canvas.addEventListener('dblclick', this.#onDblClick.bind(this), false);
        this.canvas.addEventListener('keydown', this.onKeyDown.bind(this), false);
        this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this), false);
        this.popoverElement =
            optionalConfig.tooltipElement || this.viewportElement.createChild('div', 'flame-chart-entry-info');
        this.markerHighlighElement = this.viewportElement.createChild('div', 'flame-chart-marker-highlight-element');
        this.highlightElement = this.viewportElement.createChild('div', 'flame-chart-highlight-element');
        this.revealDescendantsArrowHighlightElement =
            this.viewportElement.createChild('div', 'reveal-descendants-arrow-highlight-element');
        if (this.#selectedElementOutlineEnabled) {
            this.selectedElement = this.viewportElement.createChild('div', 'flame-chart-selected-element');
        }
        this.canvas.addEventListener('focus', () => {
            this.dispatchEventToListeners("CanvasFocused" /* Events.CANVAS_FOCUSED */);
        }, false);
        UI.UIUtils.installDragHandle(this.viewportElement, this.startDragging.bind(this), this.dragging.bind(this), this.endDragging.bind(this), null);
        this.rulerEnabled = true;
        this.barHeight = 17;
        this.hitMarginPx = 3;
        this.textBaseline = 5;
        this.textPadding = 5;
        this.chartViewport.setWindowTimes(dataProvider.minimumBoundary(), dataProvider.minimumBoundary() + dataProvider.totalTime());
        this.highlightedMarkerIndex = -1;
        this.highlightedEntryIndex = -1;
        this.selectedEntryIndex = -1;
        this.#searchResultEntryIndex = null;
        this.rawTimelineDataLength = 0;
        this.markerPositions = new Map();
        this.customDrawnPositions = new Map();
        this.lastMouseOffsetX = 0;
        this.selectedGroupIndex = -1;
        this.lastPopoverState = {
            entryIndex: -1,
            groupIndex: -1,
            hiddenEntriesPopover: false,
        };
        // Keyboard focused group is used to navigate groups irrespective of whether they are selectable or not
        this.keyboardFocusedGroup = -1;
    }
    #onThemeChanged() {
        this.scheduleUpdate();
    }
    wasShown() {
        super.wasShown();
        ThemeSupport.ThemeSupport.instance().addEventListener(ThemeSupport.ThemeChangeEvent.eventName, this.#boundOnThemeChanged);
    }
    willHide() {
        ThemeSupport.ThemeSupport.instance().removeEventListener(ThemeSupport.ThemeChangeEvent.eventName, this.#boundOnThemeChanged);
        this.hideHighlight();
        super.willHide();
    }
    canvasBoundingClientRect() {
        // If we have a rect already, and it has width & height, use it by default.
        // The reason we check the dimensions is because otherwise if this method was
        // called before the FlameChart was fully rendered it might have been
        // calculated with a width or height of 0, and that is clearly incorrect.
        if (this.#canvasBoundingClientRect && this.#canvasBoundingClientRect.width > 0 &&
            this.#canvasBoundingClientRect.height > 0) {
            return this.#canvasBoundingClientRect;
        }
        this.#canvasBoundingClientRect = this.canvas.getBoundingClientRect();
        return this.#canvasBoundingClientRect;
    }
    verticalScrollBarVisible() {
        return this.chartViewport.verticalScrollBarVisible();
    }
    /**
     * In some cases we need to manually adjust the positioning of the tooltip
     * vertically to account for the fact that it might be rendered not relative
     * to just this flame chart. This is true of the main flame chart in the
     * Performance Panel where the element is rendered in a higher-stack container
     * and we need to manually adjust its Y position to correctly put the tooltip
     * in the right place.
     */
    setTooltipYPixelAdjustment(y) {
        if (y === this.#tooltipPopoverYAdjustment) {
            return;
        }
        this.#tooltipPopoverYAdjustment = y;
        // Reposition the popover if it has any children (otherwise it is not visible)
        if (this.popoverElement.children.length) {
            this.updatePopoverOffset();
        }
    }
    getBarHeight() {
        return this.barHeight;
    }
    setBarHeight(value) {
        this.barHeight = value;
    }
    setTextBaseline(value) {
        this.textBaseline = value;
    }
    setTextPadding(value) {
        this.textPadding = value;
    }
    enableRuler(enable) {
        this.rulerEnabled = enable;
    }
    alwaysShowVerticalScroll() {
        this.chartViewport.alwaysShowVerticalScroll();
    }
    disableRangeSelection() {
        this.chartViewport.disableRangeSelection();
    }
    #shouldDimEvent(entryIndex) {
        if (this.dimIndices) {
            return this.dimIndices[entryIndex] !== 0;
        }
        return false;
    }
    /**
     * Returns true only if dimming is active, but not for this specific entry.
     * Also checks `dimShouldOutlineUndimmedEntries`.
     */
    #shouldOutlineEvent(entryIndex) {
        if (!this.isDimming() || this.#shouldDimEvent(entryIndex)) {
            return false;
        }
        if (ArrayBuffer.isView(this.dimShouldOutlineUndimmedEntries)) {
            return this.dimShouldOutlineUndimmedEntries[entryIndex] !== 0;
        }
        return this.dimShouldOutlineUndimmedEntries;
    }
    /**
     * Returns a contiguous boolean array for quick lookup during drawing.
     */
    #createTypedIndexArray(indices, inclusive) {
        const typedIndices = new Uint8Array(this.rawTimelineDataLength);
        if (inclusive) {
            for (const index of indices) {
                typedIndices[index] = 1;
            }
        }
        else {
            typedIndices.fill(1);
            for (const index of indices) {
                typedIndices[index] = 0;
            }
        }
        return typedIndices;
    }
    enableDimming(entryIndices, inclusive, outline) {
        this.dimIndices = this.#createTypedIndexArray(entryIndices, inclusive);
        this.dimShouldOutlineUndimmedEntries =
            Array.isArray(outline) ? this.#createTypedIndexArray(outline, true) : outline;
        this.draw();
    }
    disableDimming() {
        this.dimIndices = null;
        this.dimShouldOutlineUndimmedEntries = false;
        this.draw();
    }
    isDimming() {
        return Boolean(this.dimIndices);
    }
    #transformColor(entryIndex, color) {
        if (this.#shouldDimEvent(entryIndex)) {
            let dimmed = this.colorDimmingCache.get(color);
            if (dimmed) {
                return dimmed;
            }
            const parsedColor = Common.Color.parse(color);
            dimmed = parsedColor ? parsedColor.asLegacyColor().grayscale().asString() : 'lightgrey';
            this.colorDimmingCache.set(color, dimmed);
            return dimmed;
        }
        return color;
    }
    getColorForEntry(entryIndex) {
        if (!this.entryColorsCache) {
            return '';
        }
        return this.#transformColor(entryIndex, this.entryColorsCache[entryIndex]);
    }
    highlightEntry(entryIndex) {
        if (this.highlightedEntryIndex === entryIndex) {
            return;
        }
        if (!this.dataProvider.entryColor(entryIndex)) {
            return;
        }
        this.highlightedEntryIndex = entryIndex;
        this.updateElementPosition(this.highlightElement, this.highlightedEntryIndex);
        this.dispatchEventToListeners("EntryHovered" /* Events.ENTRY_HOVERED */, entryIndex);
    }
    hideHighlight() {
        if (this.#searchResultEntryIndex === null) {
            this.popoverElement.removeChildren();
            this.lastPopoverState = {
                entryIndex: -1,
                groupIndex: -1,
                hiddenEntriesPopover: false,
            };
        }
        if (this.highlightedEntryIndex === -1) {
            return;
        }
        this.highlightedEntryIndex = -1;
        this.updateElementPosition(this.highlightElement, this.highlightedEntryIndex);
        this.dispatchEventToListeners("EntryHovered" /* Events.ENTRY_HOVERED */, -1);
    }
    createCandyStripePattern(color) {
        // Set the candy stripe pattern to 17px so it repeats well.
        const size = 17;
        const candyStripeCanvas = document.createElement('canvas');
        candyStripeCanvas.width = size;
        candyStripeCanvas.height = size;
        const ctx = candyStripeCanvas.getContext('2d', { willReadFrequently: true });
        // Rotate the stripe by 45deg to the right.
        ctx.translate(size * 0.5, size * 0.5);
        ctx.rotate(Math.PI * 0.25);
        ctx.translate(-size * 0.5, -size * 0.5);
        ctx.fillStyle = color;
        for (let x = -size; x < size * 2; x += 3) {
            ctx.fillRect(x, -size, 1, size * 3);
        }
        // Because we're using a canvas, we know createPattern won't return null
        // https://html.spec.whatwg.org/multipage/canvas.html#dom-context-2d-createpattern-dev
        return ctx.createPattern(candyStripeCanvas, 'repeat');
    }
    resetCanvas() {
        const ratio = window.devicePixelRatio;
        const width = Math.round(this.offsetWidth * ratio);
        const height = Math.round(this.offsetHeight * ratio);
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.width = `${width / ratio}px`;
        this.canvas.style.height = `${height / ratio}px`;
    }
    windowChanged(startTime, endTime, animate) {
        this.flameChartDelegate.windowChanged(startTime, endTime, animate);
    }
    updateRangeSelection(startTime, endTime) {
        this.flameChartDelegate.updateRangeSelection(startTime, endTime);
    }
    setSize(width, height) {
        this.offsetWidth = width;
        this.offsetHeight = height;
    }
    startDragging(event) {
        this.hideHighlight();
        this.maxDragOffset = 0;
        this.dragStartX = event.pageX;
        this.dragStartY = event.pageY;
        return true;
    }
    dragging(event) {
        const dx = event.pageX - this.dragStartX;
        const dy = event.pageY - this.dragStartY;
        this.maxDragOffset = Math.max(this.maxDragOffset, Math.sqrt(dx * dx + dy * dy));
    }
    endDragging(_event) {
        this.updateHighlight();
    }
    timelineData(rebuild) {
        if (!this.dataProvider) {
            return null;
        }
        const timelineData = this.dataProvider.timelineData(rebuild);
        if (timelineData !== this.rawTimelineData ||
            (timelineData && timelineData.entryStartTimes.length !== this.rawTimelineDataLength)) {
            this.processTimelineData(timelineData);
        }
        return this.rawTimelineData || null;
    }
    revealEntryVertically(entryIndex) {
        const timelineData = this.timelineData();
        if (!timelineData) {
            return;
        }
        const level = timelineData.entryLevels[entryIndex];
        this.chartViewport.setScrollOffset(this.levelToOffset(level), this.levelHeight(level), true);
    }
    revealEntry(entryIndex) {
        const timelineData = this.timelineData();
        if (!timelineData) {
            return;
        }
        const timeLeft = this.chartViewport.windowLeftTime();
        const timeRight = this.chartViewport.windowRightTime();
        const entryStartTime = timelineData.entryStartTimes[entryIndex];
        let entryTotalTime = timelineData.entryTotalTimes[entryIndex];
        // Marker entries have NaN durations; for the sake of the reveal logic
        // let's pretend they have a 1ms duration so we can calculate a reasonable
        // time window to reveal
        if (Number.isNaN(entryTotalTime)) {
            entryTotalTime = 1;
        }
        const entryEndTime = entryStartTime + entryTotalTime;
        let minEntryTimeWindow = Math.min(entryTotalTime, timeRight - timeLeft);
        const level = timelineData.entryLevels[entryIndex];
        this.chartViewport.setScrollOffset(this.levelToOffset(level), this.levelHeight(level));
        const minVisibleWidthPx = 30;
        const futurePixelToTime = (timeRight - timeLeft) / this.offsetWidth;
        minEntryTimeWindow = Math.max(minEntryTimeWindow, futurePixelToTime * minVisibleWidthPx);
        if (timeLeft > entryEndTime) {
            const delta = timeLeft - entryEndTime + minEntryTimeWindow;
            this.windowChanged(timeLeft - delta, timeRight - delta, /* animate */ true);
        }
        else if (timeRight < entryStartTime) {
            const delta = entryStartTime - timeRight + minEntryTimeWindow;
            this.windowChanged(timeLeft + delta, timeRight + delta, /* animate */ true);
        }
    }
    setWindowTimes(startTime, endTime, animate) {
        this.chartViewport.setWindowTimes(startTime, endTime, animate);
        this.updateHighlight();
    }
    /**
     * Handle the mouse move event. The handle priority will be:
     *   1. Track configuration icons -> show tooltip for the icons
     *   2. Inside a track header -> mouse style will be a "pointer", indicating track can be focused
     *   3. Inside a track -> update the highlight of hovered event
     */
    onMouseMove(mouseEvent) {
        this.#searchResultEntryIndex = null;
        this.lastMouseOffsetX = mouseEvent.offsetX;
        this.lastMouseOffsetY = mouseEvent.offsetY;
        if (!this.enabled()) {
            return;
        }
        if (this.chartViewport.isDragging()) {
            return;
        }
        const timeMilliSeconds = Trace.Types.Timing.Milli(this.chartViewport.pixelToTime(mouseEvent.offsetX));
        this.dispatchEventToListeners("MouseMove" /* Events.MOUSE_MOVE */, {
            mouseEvent,
            timeInMicroSeconds: Trace.Helpers.Timing.milliToMicro(timeMilliSeconds),
        });
        // Check if the mouse is hovering any group's header area
        const { groupIndex, hoverType } = this.coordinatesToGroupIndexAndHoverType(mouseEvent.offsetX, mouseEvent.offsetY);
        switch (hoverType) {
            case "TRACK_CONFIG_UP_BUTTON" /* HoverType.TRACK_CONFIG_UP_BUTTON */:
            case "TRACK_CONFIG_DOWN_BUTTON" /* HoverType.TRACK_CONFIG_DOWN_BUTTON */:
            case "TRACK_CONFIG_HIDE_BUTTON" /* HoverType.TRACK_CONFIG_HIDE_BUTTON */:
            case "TRACK_CONFIG_SHOW_BUTTON" /* HoverType.TRACK_CONFIG_SHOW_BUTTON */: {
                this.hideHighlight();
                this.viewportElement.style.cursor = 'pointer';
                const iconTooltipElement = this.#prepareIconInfo(groupIndex, hoverType);
                if (iconTooltipElement) {
                    this.popoverElement.appendChild(iconTooltipElement);
                    this.updatePopoverOffset();
                }
                return;
            }
            case "INSIDE_TRACK_HEADER" /* HoverType.INSIDE_TRACK_HEADER */:
                this.updateHighlight();
                this.viewportElement.style.cursor = 'pointer';
                return;
            case "INSIDE_TRACK" /* HoverType.INSIDE_TRACK */:
            case "OUTSIDE_TRACKS" /* HoverType.OUTSIDE_TRACKS */:
                this.updateHighlight();
                return;
            case "ERROR" /* HoverType.ERROR */:
                return;
            default:
                Platform.assertNever(hoverType, `Invalid hovering type: ${hoverType}`);
        }
    }
    #prepareIconInfo(groupIndex, iconType) {
        const group = this.rawTimelineData?.groups[groupIndex];
        if (!group) {
            return null;
        }
        // Only show first 20 characters to make the tooltip not too long.
        const maxTitleChars = 20;
        const displayName = Platform.StringUtilities.trimMiddle(group.name, maxTitleChars);
        let iconTooltip = '';
        switch (iconType) {
            case "TRACK_CONFIG_UP_BUTTON" /* HoverType.TRACK_CONFIG_UP_BUTTON */:
                iconTooltip = `Move ${displayName} track up`;
                break;
            case "TRACK_CONFIG_DOWN_BUTTON" /* HoverType.TRACK_CONFIG_DOWN_BUTTON */:
                iconTooltip = `Move ${displayName} track down`;
                break;
            case "TRACK_CONFIG_HIDE_BUTTON" /* HoverType.TRACK_CONFIG_HIDE_BUTTON */:
                if (this.groupIsLastVisibleTopLevel(groupIndex)) {
                    iconTooltip = 'Can not hide the last top level track';
                }
                else {
                    iconTooltip = `Hide ${displayName} track`;
                }
                break;
            case "TRACK_CONFIG_SHOW_BUTTON" /* HoverType.TRACK_CONFIG_SHOW_BUTTON */:
                iconTooltip = `Show ${displayName} track`;
                break;
            default:
                return null;
        }
        const element = document.createElement('div');
        element.createChild('span', 'popoverinfo-title').textContent = iconTooltip;
        return element;
    }
    updateHighlight() {
        const entryIndex = this.coordinatesToEntryIndex(this.lastMouseOffsetX, this.lastMouseOffsetY);
        // Each time the entry highlight is updated, we need to check if the mouse is hovering over a
        // button that indicates hidden child elements and if so, update the button highlight.
        this.updateHiddenChildrenArrowHighlighPosition(entryIndex);
        // No entry is hovered.
        if (entryIndex === -1) {
            this.hideHighlight();
            const { groupIndex, hoverType } = this.coordinatesToGroupIndexAndHoverType(this.lastMouseOffsetX, this.lastMouseOffsetY);
            if (hoverType === "INSIDE_TRACK_HEADER" /* HoverType.INSIDE_TRACK_HEADER */) {
                this.#updatePopoverForGroup(groupIndex);
            }
            if (groupIndex >= 0 && this.rawTimelineData?.groups?.[groupIndex].selectable) {
                // This means the mouse is in a selectable group's area, and not hovering any entry.
                this.viewportElement.style.cursor = 'pointer';
            }
            else {
                // This means the mouse is not hovering any selectable track, and not hovering any entry.
                this.viewportElement.style.cursor = 'default';
            }
            return;
        }
        // Some entry is hovered.
        if (this.chartViewport.isDragging()) {
            return;
        }
        this.#updatePopoverForEntry(entryIndex);
        this.viewportElement.style.cursor = this.dataProvider.canJumpToEntry(entryIndex) ? 'pointer' : 'default';
        this.highlightEntry(entryIndex);
    }
    onMouseOut() {
        this.lastMouseOffsetX = -1;
        this.lastMouseOffsetY = -1;
        this.hideHighlight();
    }
    showPopoverForSearchResult(selectedSearchResult) {
        this.#searchResultEntryIndex = selectedSearchResult;
        this.#updatePopoverForEntry(selectedSearchResult);
    }
    #updatePopoverForEntry(entryIndex) {
        // Just update position if cursor is hovering the same entry.
        const isMouseOverRevealChildrenArrow = entryIndex !== null && this.isMouseOverRevealChildrenArrow(this.lastMouseOffsetX, entryIndex);
        if (entryIndex === this.lastPopoverState.entryIndex &&
            isMouseOverRevealChildrenArrow === this.lastPopoverState.hiddenEntriesPopover) {
            return this.updatePopoverOffset();
        }
        const data = this.timelineData();
        if (!data) {
            return;
        }
        const group = data.groups.at(this.selectedGroupIndex);
        // If the mouse is hovering over the hidden descendants arrow, get an element that shows how many children are hidden, otherwise an element with the event name and length
        const popoverElement = (isMouseOverRevealChildrenArrow && group) ?
            this.dataProvider.preparePopoverForCollapsedArrow?.(entryIndex) :
            entryIndex !== null && this.dataProvider.preparePopoverElement(entryIndex);
        if (popoverElement) {
            this.updatePopoverContents(popoverElement);
        }
        this.lastPopoverState = {
            entryIndex,
            groupIndex: -1,
            hiddenEntriesPopover: isMouseOverRevealChildrenArrow,
        };
    }
    updatePopoverContents(popoverElement) {
        this.popoverElement.removeChildren();
        this.popoverElement.appendChild(popoverElement);
        // Must update the offset AFTER the new content has been added.
        this.updatePopoverOffset();
        this.lastPopoverState.entryIndex = -1;
    }
    updateMouseOffset(mouseX, mouseY) {
        this.lastMouseOffsetX = mouseX;
        this.lastMouseOffsetY = mouseY;
    }
    #updatePopoverForGroup(groupIndex) {
        // Just update position if cursor is hovering the group name.
        if (groupIndex === this.lastPopoverState.groupIndex) {
            return this.updatePopoverOffset();
        }
        this.popoverElement.removeChildren();
        const data = this.timelineData();
        if (!data) {
            return;
        }
        const group = data.groups.at(groupIndex);
        if (group?.description) {
            this.popoverElement.innerText = (group?.description);
            this.updatePopoverOffset();
        }
        this.lastPopoverState = {
            groupIndex,
            entryIndex: -1,
            hiddenEntriesPopover: false,
        };
    }
    updatePopoverOffset() {
        let mouseX = this.lastMouseOffsetX;
        let mouseY = this.lastMouseOffsetY;
        // If the popover is being updated from a search, we calculate the coordinates manually
        if (this.#searchResultEntryIndex !== null) {
            const coordinate = this.entryIndexToCoordinates(this.selectedEntryIndex);
            const { x: canvasViewportOffsetX, y: canvasViewportOffsetY } = this.canvas.getBoundingClientRect();
            mouseX = coordinate?.x ? coordinate.x - canvasViewportOffsetX : mouseX;
            mouseY = coordinate?.y ? coordinate.y - canvasViewportOffsetY : mouseY;
        }
        // The parent dimensions are the maximum the popover can use.
        const parentWidth = this.popoverElement.parentElement ? this.popoverElement.parentElement.clientWidth : 0;
        const parentHeight = this.popoverElement.parentElement ? this.popoverElement.parentElement.clientHeight : 0;
        const infoWidth = this.popoverElement.clientWidth;
        const infoHeight = this.popoverElement.clientHeight;
        // How much offset to use (when placing popover relative to mouseX/mouseY)
        const offsetX = 10;
        // Incorporate any network flamechart height into dynamic positioning
        const offsetY = 6 + this.#tooltipPopoverYAdjustment;
        let x;
        let y;
        /**
         * Fancy positioning algorithm. It optimizes for consistent positioning, not obstructing any of the popover, and not positioning atop the mouse cursor.
         *
         * Take the mouse cursor position (mouseX/mouseY) and split up the area into four quadrants
         *     0: bottom-right. 1: top-right. 2: bottom-left. 3: top-left.
         *
         * We attempt this in two passes, first is for keeping the whole popover visible, the second is slightly relaxed.
         *   If we hit the second pass, its because the tooltip size is close to the size of the available (parent*) space.
         * In each pass, we loop through the quadrants
         *   If the tooltip can fit (after some adjustments) within a quadrant, we `break` and that x,y is used.
         */
        for (let pass = 0; pass < 2; ++pass) {
            for (let quadrant = 0; quadrant < 4; ++quadrant) {
                // The bitwise AND operator is used to generate the 4 unique combinations of two booleans. (true+false, true+true, etc)
                const dx = quadrant & 2 ? -offsetX - infoWidth : offsetX;
                const dy = quadrant & 1 ? -offsetY - infoHeight : offsetY;
                // mouseX+dx is ideal, but clamp against the available space (It will be adapted to fit)
                x = Platform.NumberUtilities.clamp(mouseX + dx, 0, parentWidth - infoWidth);
                y = Platform.NumberUtilities.clamp(mouseY + dy, 0, parentHeight - infoHeight);
                const popoverFits = pass === 0 ?
                    // Will the whole popover be visible?
                    (x >= mouseX || mouseX >= x + infoWidth) && (y >= mouseY || mouseY >= y + infoHeight) :
                    // Will the popover fit well in 1 dimension? (Though we typically see it fit in both, here. Shrug.)
                    x >= mouseX || mouseX >= x + infoWidth || y >= mouseY || mouseY >= y + infoHeight;
                if (popoverFits) {
                    break;
                }
            }
        }
        this.popoverElement.style.left = x + 'px';
        this.popoverElement.style.top = y + 'px';
    }
    /**
     * Handle double mouse click event in flame chart.
     */
    #onDblClick(mouseEvent) {
        this.focus();
        const { groupIndex } = this.coordinatesToGroupIndexAndHoverType(mouseEvent.offsetX, mouseEvent.offsetY);
        /**
         * When a hovered entry on any track is double clicked, create a label for it.
         *
         * Checking the existence of `highlightedEntryIndex` is enough to make sure that the double
         * click happened on the entry since an entry is only highlighted if the mouse is hovering it.
         */
        if (this.highlightedEntryIndex !== -1) {
            this.#selectGroup(groupIndex);
            this.dispatchEventToListeners("EntryLabelAnnotationAdded" /* Events.ENTRY_LABEL_ANNOTATION_ADDED */, { entryIndex: this.highlightedEntryIndex, withLinkCreationButton: true });
            // Log the double click on the TimelineFlameChartView for VE logs.
            const flameChartView = this.flameChartDelegate.containingElement?.();
            if (flameChartView) {
                VisualLogging.logClick(flameChartView, mouseEvent, { doubleClick: true });
            }
        }
    }
    /**
     * Handle mouse click event in flame chart
     *
     * And the handle priority will be:
     * 1. Track configuration icons -> Config a track
     * 1.1 if it's edit mode ignore others.
     * 2. Inside a track header -> Select and Expand/Collapse a track
     * 3. Inside a track -> Select a track
     * 3.1 shift + click -> Select the time range of clicked event
     * 3.2 click -> update highlight (handle in other functions)
     */
    onClick(mouseEvent) {
        this.focus();
        // onClick comes after dragStart and dragEnd events.
        // So if there was drag (mouse move) in the middle of that events
        // we skip the click. Otherwise we jump to the sources.
        const clickThreshold = 5;
        if (this.maxDragOffset > clickThreshold) {
            return;
        }
        // If any button is clicked, we should handle the action only and ignore others.
        const { groupIndex, hoverType } = this.coordinatesToGroupIndexAndHoverType(mouseEvent.offsetX, mouseEvent.offsetY);
        // There could be a special case, when there is no group and all entries are appended directly, for example the
        // Memory panel.
        // In this case, the |groupIndex| will be -1, and |groups| should be empty.
        // All the functions here can handle the -1 groupIndex properly, so we don't need to add extra check here.
        switch (hoverType) {
            case "TRACK_CONFIG_UP_BUTTON" /* HoverType.TRACK_CONFIG_UP_BUTTON */:
                this.moveGroupUp(groupIndex);
                return;
            case "TRACK_CONFIG_DOWN_BUTTON" /* HoverType.TRACK_CONFIG_DOWN_BUTTON */:
                this.moveGroupDown(groupIndex);
                return;
            case "TRACK_CONFIG_HIDE_BUTTON" /* HoverType.TRACK_CONFIG_HIDE_BUTTON */:
                if (this.groupIsLastVisibleTopLevel(groupIndex)) {
                    // If this is the last visible top-level group, we will not allow you hiding the track.
                    return;
                }
                this.hideGroup(groupIndex);
                return;
            case "TRACK_CONFIG_SHOW_BUTTON" /* HoverType.TRACK_CONFIG_SHOW_BUTTON */:
                this.showGroup(groupIndex);
                return;
            case "INSIDE_TRACK_HEADER" /* HoverType.INSIDE_TRACK_HEADER */:
                this.#selectGroup(groupIndex);
                this.toggleGroupExpand(groupIndex);
                return;
            case "INSIDE_TRACK" /* HoverType.INSIDE_TRACK */:
            case "OUTSIDE_TRACKS" /* HoverType.OUTSIDE_TRACKS */: {
                this.#selectGroup(groupIndex);
                const timelineData = this.timelineData();
                if (mouseEvent.shiftKey && this.highlightedEntryIndex !== -1 && timelineData) {
                    const start = timelineData.entryStartTimes[this.highlightedEntryIndex];
                    const end = start + timelineData.entryTotalTimes[this.highlightedEntryIndex];
                    this.chartViewport.setRangeSelection(start, end);
                }
                else {
                    this.chartViewport.onClick(mouseEvent);
                    this.dispatchEventToListeners("EntryInvoked" /* Events.ENTRY_INVOKED */, this.highlightedEntryIndex);
                }
                return;
            }
        }
    }
    setLinkSelectionAnnotationIsInProgress(inProgress) {
        this.#linkSelectionAnnotationIsInProgress = inProgress;
    }
    #selectGroup(groupIndex) {
        if (groupIndex < 0 || this.selectedGroupIndex === groupIndex) {
            return;
        }
        if (!this.rawTimelineData) {
            return;
        }
        const groups = this.rawTimelineData.groups;
        if (!groups) {
            return;
        }
        this.keyboardFocusedGroup = groupIndex;
        // Do not scroll the track if the user is currently selecting an entry for a connection annotation.
        // Scrolling the view when the entry is being selected results in creating a link with different entry from the one that was clicked on.
        if (!this.#linkSelectionAnnotationIsInProgress) {
            this.scrollGroupIntoView(groupIndex);
        }
        const groupName = groups[groupIndex].name;
        if (!groups[groupIndex].selectable) {
            this.deselectAllGroups();
            UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.sHovered, { PH1: groupName }));
        }
        else {
            this.selectedGroupIndex = groupIndex;
            this.flameChartDelegate.updateSelectedGroup(this, groups[groupIndex]);
            this.draw();
            UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.sSelected, { PH1: groupName }));
        }
    }
    deselectAllGroups() {
        this.selectedGroupIndex = -1;
        this.flameChartDelegate.updateSelectedGroup(this, null);
        this.draw();
    }
    deselectAllEntries() {
        this.selectedEntryIndex = -1;
        this.rawTimelineData?.emptyInitiators();
        this.draw();
    }
    isGroupFocused(index) {
        return index === this.selectedGroupIndex || index === this.keyboardFocusedGroup;
    }
    scrollGroupIntoView(index) {
        if (index < 0) {
            return;
        }
        if (!this.rawTimelineData) {
            return;
        }
        const groups = this.rawTimelineData.groups;
        const groupOffsets = this.groupOffsets;
        if (!groupOffsets || !groups) {
            return;
        }
        const groupTop = groupOffsets[index];
        let nextOffset = groupOffsets[index + 1];
        if (index === groups.length - 1) {
            nextOffset += groups[index].style.padding;
        }
        // For the top group, scroll all the way to the top of the chart
        // to accommodate the bar with time markers
        const scrollTop = index === 0 ? 0 : groupTop;
        const scrollHeight = Math.min(nextOffset - scrollTop, this.chartViewport.chartHeight());
        this.chartViewport.setScrollOffset(scrollTop, scrollHeight);
    }
    /**
     * Toggle a group's expanded state.
     * @param groupIndex the index of this group in the timelineData.groups
     * array. Note that this is the array index, and not the startLevel of the
     * group.
     */
    toggleGroupExpand(groupIndex) {
        if (groupIndex < 0 || !this.isGroupCollapsible(groupIndex)) {
            return;
        }
        if (!this.rawTimelineData?.groups) {
            return;
        }
        this.expandGroup(groupIndex, !this.rawTimelineData.groups[groupIndex].expanded /* setExpanded */);
    }
    expandGroup(groupIndex, setExpanded = true, propagatedExpand = false) {
        if (groupIndex < 0 || !this.isGroupCollapsible(groupIndex)) {
            return;
        }
        if (!this.rawTimelineData) {
            return;
        }
        const groups = this.rawTimelineData.groups;
        if (!groups) {
            return;
        }
        const group = groups[groupIndex];
        group.expanded = setExpanded;
        this.updateLevelPositions();
        this.updateHighlight();
        if (!group.expanded) {
            const timelineData = this.timelineData();
            if (timelineData) {
                const level = timelineData.entryLevels[this.selectedEntryIndex];
                if (this.selectedEntryIndex >= 0 && level >= group.startLevel &&
                    (groupIndex >= groups.length - 1 || groups[groupIndex + 1].startLevel > level)) {
                    this.selectedEntryIndex = -1;
                    // Reset all flow arrows when we deselect the entry.
                    this.rawTimelineData.emptyInitiators();
                }
            }
        }
        this.updateHeight();
        this.draw();
        this.#notifyProviderOfConfigurationChange();
        this.scrollGroupIntoView(groupIndex);
        // We only want to read expanded/collapsed state on user inputted expand/collapse
        if (!propagatedExpand) {
            const groupName = groups[groupIndex].name;
            const content = group.expanded ? i18nString(UIStrings.sExpanded, { PH1: groupName }) :
                i18nString(UIStrings.sCollapsed, { PH1: groupName });
            UI.ARIAUtils.LiveAnnouncer.alert(content);
        }
    }
    moveGroupUp(groupIndex) {
        if (groupIndex < 0) {
            return;
        }
        if (!this.rawTimelineData?.groups) {
            return;
        }
        if (!this.#groupTreeRoot) {
            return;
        }
        for (let i = 0; i < this.#groupTreeRoot.children.length; i++) {
            const child = this.#groupTreeRoot.children[i];
            if (child.index === groupIndex) {
                // exchange with previous one, only second or later group can do so
                if (i >= 1) {
                    this.#groupTreeRoot.children[i] = this.#groupTreeRoot.children[i - 1];
                    this.#groupTreeRoot.children[i - 1] = child;
                    break;
                }
            }
        }
        this.updateLevelPositions();
        this.updateHighlight();
        this.updateHeight();
        this.draw();
        this.#notifyProviderOfConfigurationChange();
    }
    #notifyProviderOfConfigurationChange() {
        if (!this.#groupTreeRoot) {
            return;
        }
        if (!this.dataProvider.handleTrackConfigurationChange) {
            return;
        }
        const groups = this.rawTimelineData?.groups;
        if (!groups) {
            return;
        }
        const sortedGroupIndexes = this.#getVisualOrderOfGroupIndexes(this.#groupTreeRoot);
        this.dataProvider.handleTrackConfigurationChange(groups, sortedGroupIndexes);
    }
    /**
     * Walks the tree in DFS to generate the visual order of the groups.
     */
    #getVisualOrderOfGroupIndexes(root) {
        const sortedGroupIndexes = [];
        function traverse(node) {
            if (node.index !== -1) {
                // The first root is a fake parent node that we do not render, we don't
                // want to include this in the sorted list.
                sortedGroupIndexes.push(node.index);
            }
            for (const child of node.children) {
                traverse(child);
            }
        }
        traverse(root);
        return sortedGroupIndexes;
    }
    moveGroupDown(groupIndex) {
        if (groupIndex < 0) {
            return;
        }
        if (!this.rawTimelineData?.groups) {
            return;
        }
        if (!this.#groupTreeRoot) {
            return;
        }
        for (let i = 0; i < this.#groupTreeRoot.children.length; i++) {
            const child = this.#groupTreeRoot.children[i];
            if (child.index === groupIndex) {
                // exchange with previous one, only second to last or before group can do so
                if (i <= this.#groupTreeRoot.children.length - 2) {
                    this.#groupTreeRoot.children[i] = this.#groupTreeRoot.children[i + 1];
                    this.#groupTreeRoot.children[i + 1] = child;
                    break;
                }
            }
        }
        this.updateLevelPositions();
        this.updateHighlight();
        this.updateHeight();
        this.draw();
        this.#notifyProviderOfConfigurationChange();
    }
    hideGroup(groupIndex) {
        this.#toggleGroupHiddenState(groupIndex, /* hidden= */ true);
    }
    showGroup(groupIndex) {
        this.#toggleGroupHiddenState(groupIndex, /* hidden= */ false);
    }
    showAllGroups() {
        if (!this.rawTimelineData?.groups) {
            return;
        }
        for (const group of this.rawTimelineData.groups) {
            group.hidden = false;
        }
        this.updateLevelPositions();
        this.updateHighlight();
        this.updateHeight();
        this.draw();
        this.#notifyProviderOfConfigurationChange();
        // When you show all groups, the UI can change quite significantly, so
        // scroll the user back up to the top to orient them.
        this.scrollGroupIntoView(0);
    }
    #toggleGroupHiddenState(groupIndex, hidden) {
        if (groupIndex < 0) {
            return;
        }
        if (!this.rawTimelineData?.groups) {
            return;
        }
        const groups = this.rawTimelineData.groups;
        if (!groups) {
            return;
        }
        const group = groups[groupIndex];
        group.hidden = hidden;
        this.updateLevelPositions();
        this.updateHighlight();
        this.updateHeight();
        this.draw();
        this.#notifyProviderOfConfigurationChange();
    }
    modifyTree(treeAction, index) {
        const data = this.timelineData();
        if (!data || !this.dataProvider.modifyTree) {
            return;
        }
        this.dataProvider.modifyTree(treeAction, index);
        this.update();
    }
    #buildEnterEditModeContextMenu(event) {
        if (this.#inTrackConfigEditMode) {
            return;
        }
        this.contextMenu = new UI.ContextMenu.ContextMenu(event);
        const label = i18nString(UIStrings.enterTrackConfigurationMode);
        this.contextMenu.defaultSection().appendItem(label, () => {
            this.enterTrackConfigurationMode();
        }, {
            jslogContext: 'track-configuration-enter',
        });
        void this.contextMenu.show();
    }
    #buildExitEditModeContextMenu(event) {
        if (this.#inTrackConfigEditMode === false) {
            return;
        }
        this.contextMenu = new UI.ContextMenu.ContextMenu(event);
        const label = i18nString(UIStrings.exitTrackConfigurationMode);
        this.contextMenu.defaultSection().appendItem(label, () => {
            this.#exitEditMode();
        }, {
            jslogContext: 'track-configuration-exit',
        });
        void this.contextMenu.show();
    }
    #hasTrackConfigurationMode() {
        // Track Configuration mode is off by default: a provider must define the
        // function and have it return `true` to enable it.
        return Boolean(this.dataProvider.hasTrackConfigurationMode?.());
    }
    onContextMenu(event) {
        const { groupIndex, hoverType } = this.coordinatesToGroupIndexAndHoverType(event.offsetX, event.offsetY);
        // If the user is in edit mode, allow a right click anywhere to exit the mode.
        if (this.#inTrackConfigEditMode) {
            this.#buildExitEditModeContextMenu(event);
            return;
        }
        // If we are not in edit mode, and the user right clicks on the header,
        // allow them to enter edit mode.
        // Data providers can disable the ability to enter this mode, hence the
        // extra check. For example, in the DevTools Performance Panel the network
        // data provider & flame chart does not support this mode, but the main one
        // does.
        if (hoverType === "INSIDE_TRACK_HEADER" /* HoverType.INSIDE_TRACK_HEADER */ && this.#hasTrackConfigurationMode()) {
            this.#buildEnterEditModeContextMenu(event);
        }
        // The user can create context menus in two ways:
        // 1. they right click and a contextMenu event is dispatched from the
        //    browser. This event will be trusted.
        // 2. they press "space" on the keyboard and we dispatch the event
        //    ourselves from {@see triggerContextMenuFromKeyPress}.
        // To enable us to differentiate, we set the detail property
        // [https://developer.mozilla.org/en-US/docs/Web/API/UIEvent/detail] to a
        // specific number (-1) for our faked context menu event. We can do this
        // because the detail property is never natively set to a negative number.
        // The reason this is important is because the highlightedEntryIndex is
        // only updated when the mouse moves, so if the user is navigating +
        // triggering menus via the keyboard, it will not be updated, and we should
        // use the selectedEntryIndex.
        const isFakedFromKeyboardPress = event.detail === KEYBOARD_FAKED_CONTEXT_MENU_DETAIL;
        const entryIndexToUse = isFakedFromKeyboardPress ? this.selectedEntryIndex : this.highlightedEntryIndex;
        if (entryIndexToUse === -1) {
            return;
        }
        if (!isFakedFromKeyboardPress) {
            this.dispatchEventToListeners("EntryInvoked" /* Events.ENTRY_INVOKED */, entryIndexToUse);
            this.setSelectedEntry(entryIndexToUse);
            // Update the selected group as well.
            this.#selectGroup(groupIndex);
        }
        // Build the context menu for right clicking individual entries.
        // The context menu only applies if the user is hovering over an individual
        // entry, and we are not in edit mode (which we know we cannot be in given
        // the conditional checks above)
        // If the flame chart provider can build a customized context menu for the
        // given entry, we will use that, otherwise just do nothing and fall back to
        // default context menu.
        // We need to use |selectedEntryIndex| instead of |highlightedEntryIndex|.
        // The reason is when we call the |setSelectedEntry| and |#selectGroup|,
        // the flame chart will be redrawn, so the |highlightedEntryIndex| will be
        // reset to -1.
        // In real life, because we might trigger the |mousemove| event again, the
        // |highlightedEntryIndex| might be correct, but to make the code easier
        // to maintain, let's use |selectedEntryIndex|.
        this.contextMenu = this.dataProvider.customizedContextMenu?.(event, this.selectedEntryIndex, groupIndex) ??
            new UI.ContextMenu.ContextMenu(event);
        // Generate context menu entries for annotations.
        const annotationSection = this.contextMenu.annotationSection();
        annotationSection.appendItem(i18nString(UIStrings.labelEntry), () => {
            this.dispatchEventToListeners("EntryLabelAnnotationAdded" /* Events.ENTRY_LABEL_ANNOTATION_ADDED */, { entryIndex: this.selectedEntryIndex, withLinkCreationButton: false });
        }, {
            jslogContext: 'timeline.annotations.create-entry-label',
        });
        annotationSection.appendItem(i18nString(UIStrings.linkEntries), () => {
            this.dispatchEventToListeners("EntriesLinkAnnotationCreated" /* Events.ENTRIES_LINK_ANNOTATION_CREATED */, { entryFromIndex: this.selectedEntryIndex });
        }, {
            jslogContext: 'timeline.annotations.create-entries-link',
        });
        void this.contextMenu.show();
    }
    #handleFlameChartTransformEvent(event) {
        if (this.selectedEntryIndex === -1) {
            return;
        }
        this.dataProvider.handleFlameChartTransformKeyboardEvent?.(event, this.selectedEntryIndex, this.selectedGroupIndex);
    }
    /**
     * Triggers a context menu as if the user had clicked on the selected entry.
     * To do this we calculate the (x, y) of the selected entry, and create a
     * fake mouse event to pretend the user has clicked on that coordinate.
     * We then dispatch the event as a "contextmenu" event, thus triggering the
     * usual contextmenu code path.
     */
    #triggerContextMenuFromKeyPress() {
        const startTime = this.timelineData()?.entryStartTimes[this.selectedEntryIndex];
        const level = this.timelineData()?.entryLevels[this.selectedEntryIndex];
        if (!startTime || !level) {
            return;
        }
        const boundingRect = this.canvasBoundingClientRect();
        if (!boundingRect) {
            return;
        }
        // If we use the (x, y) of the entry, that is relative to the canvas, so we
        // add on the left / top of the canvas' rect to place the contextmenu in
        // the correct place within the entire DevTools window.
        const x = this.chartViewport.timeToPosition(startTime) + boundingRect.left;
        const y = this.levelToOffset(level) - this.getScrollOffset() + boundingRect.top;
        // Set the `detail` key so in the context menu handler we can differentiate
        // between a keyboard invoked context menu and a mouse invoked one.
        const event = new MouseEvent('contextmenu', { clientX: x, clientY: y, detail: KEYBOARD_FAKED_CONTEXT_MENU_DETAIL });
        this.canvas.dispatchEvent(event);
    }
    onKeyDown(e) {
        if (UI.KeyboardShortcut.KeyboardShortcut.hasAtLeastOneModifier(e) || !this.timelineData()) {
            return;
        }
        if (e.key === ' ' && this.selectedEntryIndex > -1) {
            // If the user has an event selected, and there is a selected entry, then we open the context menu at this event.
            this.#triggerContextMenuFromKeyPress();
        }
        let eventHandled = this.handleSelectionNavigation(e);
        // Handle keyboard navigation in groups
        if (!eventHandled && this.rawTimelineData?.groups) {
            eventHandled = this.handleKeyboardGroupNavigation(e);
        }
        if (!eventHandled) {
            this.#handleFlameChartTransformEvent(e);
        }
    }
    bindCanvasEvent(eventName, onEvent) {
        this.canvas.addEventListener(eventName, onEvent);
    }
    drawTrackOnCanvas(trackName, context, minWidth) {
        const timelineData = this.timelineData();
        if (!timelineData) {
            return null;
        }
        const canvasWidth = this.offsetWidth;
        const canvasHeight = this.offsetHeight;
        context.save();
        const ratio = window.devicePixelRatio;
        context.scale(ratio, ratio);
        context.fillStyle = 'rgba(0, 0, 0, 0)';
        context.fillRect(0, 0, canvasWidth, canvasHeight);
        context.font = this.#font;
        const groups = this.rawTimelineData?.groups || [];
        const groupOffsets = this.groupOffsets;
        if (!groups.length || !groupOffsets) {
            return null;
        }
        const trackIndex = groups.findIndex(g => g.name.includes(trackName));
        if (trackIndex < 0) {
            return null;
        }
        this.scrollGroupIntoView(trackIndex);
        const group = groups[trackIndex];
        const startLevel = group.startLevel;
        const endLevel = groups[trackIndex + 1].startLevel;
        const groupTop = groupOffsets[trackIndex];
        const nextOffset = groupOffsets[trackIndex + 1];
        const { drawBatches, titleIndices } = this.getDrawBatches(context, timelineData);
        const entryIndexIsInTrack = (index) => {
            const barWidth = Math.min(this.#eventBarWidth(timelineData, index), canvasWidth);
            return timelineData.entryLevels[index] >= startLevel && timelineData.entryLevels[index] < endLevel &&
                barWidth > minWidth;
        };
        let allFilteredIndexes = [];
        for (const [{ color, outline }, { indexes }] of drawBatches) {
            const filteredIndexes = indexes.filter(entryIndexIsInTrack);
            allFilteredIndexes = [...allFilteredIndexes, ...filteredIndexes];
            this.#drawBatchEvents(context, timelineData, color, filteredIndexes, outline);
        }
        const filteredTitleIndices = titleIndices.filter(entryIndexIsInTrack);
        this.drawEventTitles(context, timelineData, filteredTitleIndices, canvasWidth);
        context.restore();
        return {
            top: groupOffsets[trackIndex],
            height: nextOffset - groupTop,
            visibleEntries: new Set(allFilteredIndexes),
        };
    }
    handleKeyboardGroupNavigation(event) {
        const keyboardEvent = event;
        let handled = false;
        let entrySelected = false;
        if (keyboardEvent.code === 'ArrowUp') {
            handled = this.selectPreviousGroup();
        }
        else if (keyboardEvent.code === 'ArrowDown') {
            handled = this.selectNextGroup();
        }
        else if (keyboardEvent.code === 'ArrowLeft') {
            if (this.keyboardFocusedGroup >= 0) {
                this.expandGroup(this.keyboardFocusedGroup, false /* setExpanded */);
                handled = true;
            }
        }
        else if (keyboardEvent.code === 'ArrowRight') {
            if (this.keyboardFocusedGroup >= 0) {
                this.expandGroup(this.keyboardFocusedGroup, true /* setExpanded */);
                this.selectFirstChild();
                handled = true;
            }
        }
        else if (keyboardEvent.key === 'Enter') {
            entrySelected = this.selectFirstEntryInCurrentGroup();
            handled = entrySelected;
        }
        if (handled && !entrySelected) {
            this.deselectAllEntries();
        }
        if (handled) {
            keyboardEvent.consume(true);
        }
        return handled;
    }
    /**
     * Used when the user presses "enter" when a group is selected, so that we
     * move their selection into an event in the group.
     */
    selectFirstEntryInCurrentGroup() {
        if (!this.rawTimelineData) {
            return false;
        }
        const allGroups = this.rawTimelineData.groups;
        if (this.keyboardFocusedGroup < 0 || !allGroups) {
            return false;
        }
        const group = allGroups[this.keyboardFocusedGroup];
        const startLevelInGroup = group.startLevel;
        // Return if no levels in this group
        if (startLevelInGroup < 0) {
            return false;
        }
        // Make sure this is the innermost nested group with this startLevel
        // This is because a parent group also contains levels of all its child groups
        // So check if the next group has the same level, if it does, user should
        // go to that child group to select this entry
        if (this.keyboardFocusedGroup < allGroups.length - 1 &&
            allGroups[this.keyboardFocusedGroup + 1].startLevel === startLevelInGroup) {
            return false;
        }
        if (!this.timelineLevels) {
            return false;
        }
        const timelineData = this.timelineData();
        if (!timelineData) {
            return false;
        }
        // Get the first entry within the group that is at least 1ms long.
        // Otherwise the panel can select a tiny event which is really hard to see
        // even at maximum zoom. We hedge our bets that the user probably doesn't
        // care for such a tiny event, at least not by default. Better to take them
        // to an event that is slightly more prominent in the UI.
        const minDurationOfFirstEntry = Trace.Types.Timing.Milli(1);
        let firstEntryIndex = this.timelineLevels[startLevelInGroup].find((i => {
            const duration = timelineData.entryTotalTimes[i];
            return !Number.isNaN(duration) && duration >= minDurationOfFirstEntry;
        }));
        if (typeof firstEntryIndex === 'undefined') {
            // If we didn't find a 1ms+ event, fallback to the first, regardless of duration.
            firstEntryIndex = this.timelineLevels[startLevelInGroup][0];
        }
        this.expandGroup(this.keyboardFocusedGroup, true /* setExpanded */);
        const eventName = this.dataProvider.entryTitle(firstEntryIndex);
        if (eventName) {
            UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.eventSelectedFromGroup, {
                PH1: eventName,
                PH2: group.name,
            }));
        }
        this.setSelectedEntry(firstEntryIndex);
        return true;
    }
    selectPreviousGroup() {
        if (this.keyboardFocusedGroup <= 0) {
            return false;
        }
        const groupIndexToSelect = this.getGroupIndexToSelect(-1 /* offset */);
        this.#selectGroup(groupIndexToSelect);
        return true;
    }
    selectNextGroup() {
        if (!this.rawTimelineData?.groups) {
            return false;
        }
        if (this.keyboardFocusedGroup >= this.rawTimelineData.groups.length - 1) {
            return false;
        }
        const groupIndexToSelect = this.getGroupIndexToSelect(1 /* offset */);
        this.#selectGroup(groupIndexToSelect);
        return true;
    }
    getGroupIndexToSelect(offset) {
        if (!this.rawTimelineData?.groups) {
            throw new Error('No raw timeline data');
        }
        const allGroups = this.rawTimelineData.groups;
        let groupIndexToSelect = this.keyboardFocusedGroup;
        let groupName, groupWithSubNestingLevel;
        do {
            groupIndexToSelect += offset;
            groupName = this.rawTimelineData.groups[groupIndexToSelect].name;
            groupWithSubNestingLevel = this.keyboardFocusedGroup !== -1 &&
                allGroups[groupIndexToSelect].style.nestingLevel > allGroups[this.keyboardFocusedGroup].style.nestingLevel;
        } while (groupIndexToSelect > 0 && groupIndexToSelect < allGroups.length - 1 &&
            (!groupName || groupWithSubNestingLevel));
        return groupIndexToSelect;
    }
    selectFirstChild() {
        if (!this.rawTimelineData?.groups) {
            return;
        }
        const allGroups = this.rawTimelineData.groups;
        if (this.keyboardFocusedGroup < 0 || this.keyboardFocusedGroup >= allGroups.length - 1) {
            return;
        }
        const groupIndexToSelect = this.keyboardFocusedGroup + 1;
        if (allGroups[groupIndexToSelect].style.nestingLevel > allGroups[this.keyboardFocusedGroup].style.nestingLevel) {
            this.#selectGroup(groupIndexToSelect);
        }
    }
    handleSelectionNavigation(event) {
        if (this.selectedEntryIndex === -1) {
            return false;
        }
        const timelineData = this.timelineData();
        if (!timelineData) {
            return false;
        }
        function timeComparator(time, entryIndex) {
            if (!timelineData) {
                throw new Error('No timeline data');
            }
            return time - timelineData.entryStartTimes[entryIndex];
        }
        function entriesIntersect(entry1, entry2) {
            if (!timelineData) {
                throw new Error('No timeline data');
            }
            const start1 = timelineData.entryStartTimes[entry1];
            const start2 = timelineData.entryStartTimes[entry2];
            const end1 = start1 + timelineData.entryTotalTimes[entry1];
            const end2 = start2 + timelineData.entryTotalTimes[entry2];
            return start1 < end2 && start2 < end1;
        }
        const keyboardEvent = (event);
        const keys = UI.KeyboardShortcut.Keys;
        if (keyboardEvent.keyCode === keys.Left.code || keyboardEvent.keyCode === keys.Right.code) {
            const level = timelineData.entryLevels[this.selectedEntryIndex];
            const levelIndexes = this.timelineLevels ? this.timelineLevels[level] : [];
            let indexOnLevel = Platform.ArrayUtilities.lowerBound(levelIndexes, this.selectedEntryIndex, (a, b) => a - b);
            indexOnLevel += keyboardEvent.keyCode === keys.Left.code ? -1 : 1;
            event.consume(true);
            if (indexOnLevel >= 0 && indexOnLevel < levelIndexes.length) {
                this.dispatchEventToListeners("EntrySelected" /* Events.ENTRY_SELECTED */, levelIndexes[indexOnLevel]);
            }
            return true;
        }
        if (keyboardEvent.keyCode === keys.Up.code || keyboardEvent.keyCode === keys.Down.code) {
            let level = timelineData.entryLevels[this.selectedEntryIndex];
            level += keyboardEvent.keyCode === keys.Up.code ? -1 : 1;
            if (level < 0 || (this.timelineLevels && level >= this.timelineLevels.length)) {
                this.deselectAllEntries();
                keyboardEvent.consume(true);
                return true;
            }
            const entryTime = timelineData.entryStartTimes[this.selectedEntryIndex] +
                timelineData.entryTotalTimes[this.selectedEntryIndex] / 2;
            const levelIndexes = this.timelineLevels ? this.timelineLevels[level] : [];
            let indexOnLevel = Platform.ArrayUtilities.upperBound(levelIndexes, entryTime, timeComparator) - 1;
            if (!entriesIntersect(this.selectedEntryIndex, levelIndexes[indexOnLevel])) {
                ++indexOnLevel;
                if (indexOnLevel >= levelIndexes.length ||
                    !entriesIntersect(this.selectedEntryIndex, levelIndexes[indexOnLevel])) {
                    if (keyboardEvent.code === 'ArrowDown') {
                        return false;
                    }
                    // Stay in the current group and give focus to the parent group instead of entries
                    this.deselectAllEntries();
                    keyboardEvent.consume(true);
                    return true;
                }
            }
            keyboardEvent.consume(true);
            this.dispatchEventToListeners("EntrySelected" /* Events.ENTRY_SELECTED */, levelIndexes[indexOnLevel]);
            return true;
        }
        if (event.key === 'Enter') {
            event.consume(true);
            this.dispatchEventToListeners("EntryInvoked" /* Events.ENTRY_INVOKED */, this.selectedEntryIndex);
            // Treat hitting enter on an entry just like we would clicking & create the annotation
            this.dispatchEventToListeners("EntryLabelAnnotationAdded" /* Events.ENTRY_LABEL_ANNOTATION_ADDED */, {
                entryIndex: this.selectedEntryIndex,
                withLinkCreationButton: true,
            });
            return true;
        }
        return false;
    }
    /**
     * Given offset of the cursor, returns the index of the entry.
     * This function is public for test purpose.
     * @param x
     * @param y
     * @returns the index of the entry
     */
    coordinatesToEntryIndex(x, y) {
        if (x < 0 || y < 0) {
            return -1;
        }
        const timelineData = this.timelineData();
        if (!timelineData) {
            return -1;
        }
        y += this.chartViewport.scrollOffset();
        if (!this.visibleLevelOffsets || !this.visibleLevelHeights || !this.visibleLevels) {
            throw new Error('No visible level offsets or heights');
        }
        // The real order of the levels might be changed.
        // So we just check each level, and check if the y is between the start and the end of this level. If yes, this is
        // the level we want to find.
        let cursorLevel = -1;
        for (let i = 0; i < this.dataProvider.maxStackDepth(); i++) {
            if (y >= this.visibleLevelOffsets[i] &&
                y < this.visibleLevelOffsets[i] + (this.visibleLevels[i] ? this.visibleLevelHeights[i] : 0)) {
                cursorLevel = i;
                break;
            }
        }
        if (cursorLevel < 0 || !this.visibleLevels[cursorLevel]) {
            return -1;
        }
        const offsetFromLevel = y - this.visibleLevelOffsets[cursorLevel];
        if (offsetFromLevel > this.levelHeight(cursorLevel)) {
            return -1;
        }
        // Check custom drawn entries first.
        for (const [index, pos] of this.customDrawnPositions) {
            if (timelineData.entryLevels[index] !== cursorLevel) {
                continue;
            }
            if (pos.x <= x && x < pos.x + pos.width) {
                return index;
            }
        }
        // Check markers.
        for (const [index, pos] of this.markerPositions) {
            if (timelineData.entryLevels[index] !== cursorLevel) {
                continue;
            }
            if (pos.x <= x && x < pos.x + pos.width) {
                return index;
            }
        }
        // Check regular entries.
        const entryStartTimes = timelineData.entryStartTimes;
        const entriesOnLevel = this.timelineLevels ? this.timelineLevels[cursorLevel] : [];
        if (!entriesOnLevel?.length) {
            return -1;
        }
        const cursorTime = this.chartViewport.pixelToTime(x);
        const indexOnLevel = Math.max(Platform.ArrayUtilities.upperBound(entriesOnLevel, cursorTime, (time, entryIndex) => time - entryStartTimes[entryIndex]) -
            1, 0);
        function checkEntryHit(entryIndex) {
            if (entryIndex === undefined) {
                return false;
            }
            if (!timelineData) {
                return false;
            }
            const startTime = entryStartTimes[entryIndex];
            const duration = timelineData.entryTotalTimes[entryIndex];
            const startX = this.chartViewport.timeToPosition(startTime);
            const endX = this.chartViewport.timeToPosition(startTime + duration);
            return startX - this.hitMarginPx < x && x < endX + this.hitMarginPx;
        }
        let entryIndex = entriesOnLevel[indexOnLevel];
        if (checkEntryHit.call(this, entryIndex)) {
            return entryIndex;
        }
        entryIndex = entriesOnLevel[indexOnLevel + 1];
        if (checkEntryHit.call(this, entryIndex)) {
            return entryIndex;
        }
        return -1;
    }
    /**
     * Given an entry's index and an X coordinate of a mouse click, returns
     * whether the mouse is hovering over the arrow button that reveals hidden children
     */
    isMouseOverRevealChildrenArrow(x, index) {
        // Check if given entry has an arrow
        if (!this.entryHasDecoration(index, "HIDDEN_DESCENDANTS_ARROW" /* FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW */)) {
            return false;
        }
        const timelineData = this.timelineData();
        if (!timelineData) {
            return false;
        }
        const startTime = timelineData.entryStartTimes[index];
        const duration = timelineData.entryTotalTimes[index];
        const endX = this.chartViewport.timeToPosition(startTime + duration);
        // The arrow icon is square, therefore the width is equal to the bar height
        const barHeight = this.#eventBarHeight(timelineData, index);
        const arrowWidth = barHeight;
        if (endX - arrowWidth - this.hitMarginPx < x && x < endX + this.hitMarginPx) {
            return true;
        }
        return false;
    }
    /**
     * Given an entry's index, returns its coordinates relative to the
     * viewport.
     * This function is public for test purpose.
     */
    entryIndexToCoordinates(entryIndex) {
        const timelineData = this.timelineData();
        const { x: canvasViewportOffsetX, y: canvasViewportOffsetY } = this.canvas.getBoundingClientRect();
        if (!timelineData || !this.visibleLevelOffsets) {
            return null;
        }
        const x = this.chartViewport.timeToPosition(timelineData.entryStartTimes[entryIndex]) + canvasViewportOffsetX;
        const y = this.visibleLevelOffsets[timelineData.entryLevels[entryIndex]] - this.chartViewport.scrollOffset() +
            canvasViewportOffsetY;
        return { x, y };
    }
    /**
     * Given an entry's index, returns its title
     */
    entryTitle(entryIndex) {
        return this.dataProvider.entryTitle(entryIndex);
    }
    /**
     * Returns the offset of the canvas relative to the viewport.
     */
    getCanvasOffset() {
        return this.canvas.getBoundingClientRect();
    }
    getCanvas() {
        return this.canvas;
    }
    /**
     * Returns the y scroll of the chart viewport.
     */
    getScrollOffset() {
        return this.chartViewport.scrollOffset();
    }
    getContextMenu() {
        return this.contextMenu;
    }
    /**
     * Given offset of the cursor, returns the index of the group and the hover type of current mouse position.
     * Will return -1 for index and HoverType.OUTSIDE_TRACKS if no group is hovered/clicked.
     * And the handle priority will be:
     * 1. Track configuration icons
     * 2. Inside a track header (track label and the expansion arrow)
     * 3. Inside a track
     * 4. Outside all tracks
     *
     * This function is public for test purpose.
     * @param x
     * @param y
     * @returns the index of the group and the button user clicked. If there is no button the button type will be
     * undefined.
     */
    coordinatesToGroupIndexAndHoverType(x, y) {
        if (!this.rawTimelineData?.groups || !this.groupOffsets) {
            return { groupIndex: -1, hoverType: "ERROR" /* HoverType.ERROR */ };
        }
        if (x < 0 || y < 0) {
            return { groupIndex: -1, hoverType: "ERROR" /* HoverType.ERROR */ };
        }
        y += this.chartViewport.scrollOffset();
        const groups = this.rawTimelineData.groups || [];
        // The real order of the groups is the preorder traversal, and it will match the order in the sortedGroup.
        // So we first do a preorder traversal to get an array of GroupIndex. And then based on the visual index we got
        // before, we can get the real group index.
        if (this.#groupTreeRoot) {
            const sortedGroupIndexes = this.#getVisualOrderOfGroupIndexes(this.#groupTreeRoot);
            // This shouldn't happen, because the tree should have the fake root and all groups. Add a sanity check to avoid
            // error.
            if (sortedGroupIndexes.length !== groups.length) {
                console.warn('The data from the group tree doesn\'t match the data from DataProvider.');
                return { groupIndex: -1, hoverType: "ERROR" /* HoverType.ERROR */ };
            }
            // Add an extra index, which is equal to the length of the |groups|, this
            // will be used for the coordinates after the last group.
            // If the coordinates after the last group, it will return in later check
            // `groupIndex >= groups.length` anyway. But add one more element to make
            // this array same length as the |groupOffsets|.
            sortedGroupIndexes.push(groups.length);
            for (let i = 0; i < sortedGroupIndexes.length; i++) {
                const groupIndex = sortedGroupIndexes[i];
                const nextIndex = sortedGroupIndexes[i + 1] ?? sortedGroupIndexes.length;
                if (y >= this.groupOffsets[groupIndex] && y < this.groupOffsets[nextIndex]) {
                    // This section is used to calculate the position of current group's header
                    // If we are in edit mode, the track label is pushed right to make room for the icons.
                    const context = this.context;
                    context.save();
                    context.font = this.#font;
                    const headerRight = HEADER_LEFT_PADDING + (this.#inTrackConfigEditMode ? EDIT_MODE_TOTAL_ICON_WIDTH : 0) +
                        this.labelWidthForGroup(context, groups[groupIndex]);
                    context.restore();
                    const mouseInHeaderRow = y >= this.groupOffsets[groupIndex] && y < this.groupOffsets[groupIndex] + groups[groupIndex].style.height;
                    if (this.#inTrackConfigEditMode) {
                        if (mouseInHeaderRow) {
                            if (UP_ICON_LEFT <= x && x < UP_ICON_LEFT + EDIT_ICON_WIDTH) {
                                return { groupIndex, hoverType: "TRACK_CONFIG_UP_BUTTON" /* HoverType.TRACK_CONFIG_UP_BUTTON */ };
                            }
                            if (DOWN_ICON_LEFT <= x && x < DOWN_ICON_LEFT + EDIT_ICON_WIDTH) {
                                return { groupIndex, hoverType: "TRACK_CONFIG_DOWN_BUTTON" /* HoverType.TRACK_CONFIG_DOWN_BUTTON */ };
                            }
                            if (HIDE_ICON_LEFT <= x && x < HIDE_ICON_LEFT + EDIT_ICON_WIDTH) {
                                return {
                                    groupIndex,
                                    hoverType: groups[groupIndex].hidden ? "TRACK_CONFIG_SHOW_BUTTON" /* HoverType.TRACK_CONFIG_SHOW_BUTTON */ :
                                        "TRACK_CONFIG_HIDE_BUTTON" /* HoverType.TRACK_CONFIG_HIDE_BUTTON */,
                                };
                            }
                            if (mouseInHeaderRow && x <= headerRight) {
                                return { groupIndex, hoverType: "INSIDE_TRACK_HEADER" /* HoverType.INSIDE_TRACK_HEADER */ };
                            }
                        }
                        // Ignore any other actions when user is customizing the tracks.
                        // For example, we won't toggle the expand status in the editing mode.
                    }
                    else {
                        // User is not in edit mode so they can either be in the header, or in the track.
                        if (mouseInHeaderRow && x <= headerRight) {
                            return { groupIndex, hoverType: "INSIDE_TRACK_HEADER" /* HoverType.INSIDE_TRACK_HEADER */ };
                        }
                        return { groupIndex, hoverType: "INSIDE_TRACK" /* HoverType.INSIDE_TRACK */ };
                    }
                }
            }
        }
        return { groupIndex: -1, hoverType: "OUTSIDE_TRACKS" /* HoverType.OUTSIDE_TRACKS */ };
    }
    enterTrackConfigurationMode() {
        if (!this.#hasTrackConfigurationMode()) {
            return;
        }
        const div = document.createElement('div');
        div.classList.add('flame-chart-edit-confirm');
        const button = new Buttons.Button.Button();
        button.data = {
            variant: "primary" /* Buttons.Button.Variant.PRIMARY */,
            jslogContext: 'track-configuration-exit',
        };
        button.innerText = i18nString(UIStrings.exitTrackConfigurationMode);
        div.appendChild(button);
        button.addEventListener('click', () => {
            this.#exitEditMode();
        });
        this.viewportElement.appendChild(div);
        this.#inTrackConfigEditMode = true;
        this.dispatchEventToListeners("TracksReorderStateChange" /* Events.TRACKS_REORDER_STATE_CHANGED */, true);
        this.updateLevelPositions();
        this.draw();
        // When we collapse all the tracks into edit mode, we can leave the user at
        // the bottom of the panel which can look very empty.
        // So, scroll the user to the top so they can see all of the collapsed
        // tracks.
        this.scrollGroupIntoView(0);
    }
    #removeEditModeButton() {
        const confirmButton = this.viewportElement.querySelector('.flame-chart-edit-confirm');
        if (confirmButton) {
            this.viewportElement.removeChild(confirmButton);
        }
    }
    #exitEditMode() {
        this.#removeEditModeButton();
        this.#inTrackConfigEditMode = false;
        this.dispatchEventToListeners("TracksReorderStateChange" /* Events.TRACKS_REORDER_STATE_CHANGED */, false);
        this.updateLevelPositions();
        this.draw();
    }
    markerIndexBeforeTime(time) {
        const timelineData = this.timelineData();
        if (!timelineData) {
            throw new Error('No timeline data');
        }
        const markers = timelineData.markers;
        if (!markers) {
            throw new Error('No timeline markers');
        }
        return Platform.ArrayUtilities.lowerBound(timelineData.markers, time, (markerTimestamp, marker) => markerTimestamp - marker.startTime());
    }
    /**
     * Draw the whole flame chart.
     * Make sure |setWindowTimes| is called with correct time range before this function.
     */
    draw() {
        const timelineData = this.timelineData();
        if (!timelineData) {
            return;
        }
        this.resetCanvas();
        this.dispatchEventToListeners("LatestDrawDimensions" /* Events.LATEST_DRAW_DIMENSIONS */, {
            chart: {
                widthPixels: this.offsetWidth,
                heightPixels: this.offsetHeight,
                scrollOffsetPixels: this.chartViewport.scrollOffset(),
                // If there are no groups because we have no timeline data, we treat
                // that as all being collapsed.
                allGroupsCollapsed: this.rawTimelineData?.groups.every(g => !g.expanded) ?? true,
            },
            traceWindow: Trace.Helpers.Timing.traceWindowFromMilliSeconds(this.minimumBoundary(), this.maximumBoundary()),
        });
        const canvasWidth = this.offsetWidth;
        const canvasHeight = this.offsetHeight;
        const context = this.context;
        context.save();
        const ratio = window.devicePixelRatio;
        const top = this.chartViewport.scrollOffset();
        context.scale(ratio, ratio);
        // Clear the canvas area by drawing a white square first
        context.fillStyle = 'rgba(0, 0, 0, 0)';
        context.fillRect(0, 0, canvasWidth, canvasHeight);
        context.translate(0, -top);
        context.font = this.#font;
        const { markerIndices, drawBatches, titleIndices } = this.getDrawBatches(context, timelineData);
        for (const [{ color, outline }, { indexes }] of drawBatches) {
            this.#drawBatchEvents(context, timelineData, color, indexes, outline);
        }
        if (!this.#inTrackConfigEditMode) {
            // In configuration mode, we do not render the actual flame chart, so we
            // can skip checking for any custom symbols on any tracks.
            this.#drawCustomSymbols(context, timelineData);
            // Markers get in the way of the UI for editing, so hide them in edit mode.
            this.drawMarkers(context, timelineData, markerIndices);
        }
        this.drawEventTitles(context, timelineData, titleIndices, canvasWidth);
        // If there is a `forceDecoration` function, it will be called in `drawEventTitles`, which will overwrite the
        // default decorations, so we need to call this function after the `drawEventTitles`.
        const allIndexes = Array.from(drawBatches.values()).map(x => x.indexes).flat();
        this.#drawDecorations(context, timelineData, allIndexes);
        context.restore();
        this.drawGroupHeaders(canvasWidth, canvasHeight);
        this.drawFlowEvents(context, timelineData);
        this.drawMarkerLines();
        const dividersData = TimelineGrid.calculateGridOffsets(this);
        const navStartTimes = this.dataProvider.mainFrameNavigationStartEvents?.() || [];
        let navStartTimeIndex = 0;
        const drawAdjustedTime = (time) => {
            if (navStartTimes.length === 0) {
                return this.formatValue(time, dividersData.precision);
            }
            // Track when the time crosses the boundary to the next nav start record,
            // and when it does, move the nav start array index accordingly.
            const hasNextNavStartTime = navStartTimes.length > navStartTimeIndex + 1;
            if (hasNextNavStartTime) {
                const nextNavStartTime = navStartTimes[navStartTimeIndex + 1];
                const nextNavStartTimeStartTimestamp = Trace.Helpers.Timing.microToMilli(nextNavStartTime.ts);
                if (time > nextNavStartTimeStartTimestamp) {
                    navStartTimeIndex++;
                }
            }
            // Adjust the time by the nearest nav start marker's value.
            const nearestMarker = navStartTimes[navStartTimeIndex];
            if (nearestMarker) {
                const nearestMarkerStartTime = Trace.Helpers.Timing.microToMilli(nearestMarker.ts);
                time -= nearestMarkerStartTime - this.zeroTime();
            }
            return this.formatValue(time, dividersData.precision);
        };
        TimelineGrid.drawCanvasGrid(context, dividersData);
        if (this.rulerEnabled) {
            TimelineGrid.drawCanvasHeaders(context, dividersData, drawAdjustedTime, 3, RulerHeight);
        }
        this.updateElementPosition(this.highlightElement, this.highlightedEntryIndex);
        this.updateElementPosition(this.selectedElement, this.selectedEntryIndex);
        if (this.#searchResultEntryIndex !== null) {
            this.showPopoverForSearchResult(this.#searchResultEntryIndex);
        }
        this.updateMarkerHighlight();
    }
    /**
     * Draws generic flame chart events, that is, the plain rectangles that fill several parts
     * in the timeline like the Main Thread flamechart and the timings track.
     * Drawn on a color by color basis to minimize the amount of times context.style is switched.
     */
    #drawBatchEvents(context, timelineData, color, indexes, outline) {
        context.save();
        context.beginPath();
        for (let i = 0; i < indexes.length; ++i) {
            const entryIndex = indexes[i];
            // If there is a draw override, then this is not a generic event.
            if (this.#indexToDrawOverride.has(entryIndex)) {
                continue;
            }
            // Doesn't draw a rect, just adds the rect into the current path
            this.#drawEventRect(context, timelineData, entryIndex);
        }
        // In some scenarios we want to draw outlines around events for added visual contrast.
        if (outline) {
            // This near-black works best in both light- and dark-mode. Color mix with the rect's bg so it's a good contrast, but still has the base flavor.
            const nearBlack = ThemeSupport.ThemeSupport.instance().getComputedValue('--ref-palette-neutral10');
            context.strokeStyle = `color-mix(in srgb, ${color}, ${nearBlack} 60%)`;
            context.stroke();
        }
        context.fillStyle = color;
        context.fill();
        context.restore();
    }
    /**
     * Draws decorations onto events. {@link FlameChartDecoration}.
     */
    #drawDecorations(context, timelineData, indexes) {
        const { entryTotalTimes, entryStartTimes, entryLevels } = timelineData;
        context.save();
        for (let i = 0; i < indexes.length; ++i) {
            const entryIndex = indexes[i];
            const decorationsForEvent = timelineData.entryDecorations.at(entryIndex);
            if (!decorationsForEvent || decorationsForEvent.length < 1) {
                continue;
            }
            if (decorationsForEvent.length > 1) {
                sortDecorationsForRenderingOrder(decorationsForEvent);
            }
            const entryStartTime = entryStartTimes[entryIndex];
            const duration = entryTotalTimes[entryIndex];
            const barX = this.timeToPositionClipped(entryStartTime);
            const barLevel = entryLevels[entryIndex];
            const barHeight = this.#eventBarHeight(timelineData, entryIndex);
            const barY = this.levelToOffset(barLevel);
            let barWidth = this.#eventBarWidth(timelineData, entryIndex);
            for (const decoration of decorationsForEvent) {
                switch (decoration.type) {
                    case "CANDY" /* FlameChartDecorationType.CANDY */: {
                        const candyStripeStartTime = Trace.Helpers.Timing.microToMilli(decoration.startAtTime);
                        if (duration < candyStripeStartTime) {
                            // If the duration of the event is less than the start time to draw the candy stripes, then we have no stripes to draw.
                            continue;
                        }
                        if (!this.candyStripePattern || !this.candyStripePatternGray) {
                            const red = 'rgba(255, 0, 0, 0.8)';
                            this.candyStripePattern = this.createCandyStripePattern(red);
                            const parsedColor = Common.Color.parse(red);
                            const dimmed = parsedColor?.asLegacyColor().grayscale().asString() ?? 'lightgrey';
                            this.candyStripePatternGray = this.createCandyStripePattern(dimmed);
                        }
                        context.save();
                        context.beginPath();
                        // Draw a rectangle over the event, starting at the X value of the
                        // event's start time + the startDuration of the candy striping.
                        const barXStart = this.timeToPositionClipped(entryStartTime + candyStripeStartTime);
                        // We stripe until the very end of the entry.
                        const barXEnd = this.timeToPositionClipped(entryStartTime + duration);
                        this.#drawEventRect(context, timelineData, entryIndex, {
                            startX: barXStart,
                            width: barXEnd - barXStart,
                        });
                        context.fillStyle =
                            this.#shouldDimEvent(entryIndex) ? this.candyStripePatternGray : this.candyStripePattern;
                        context.fill();
                        context.restore();
                        break;
                    }
                    case "WARNING_TRIANGLE" /* FlameChartDecorationType.WARNING_TRIANGLE */: {
                        let endTimePixels = barX + barWidth;
                        if (typeof decoration.customEndTime !== 'undefined') {
                            // The user can pass a customEndTime to tell us where the event's box ends and therefore where we should
                            // draw the triangle. So therefore we calculate the width by taking the end time off the start time.
                            const endTimeMilli = Trace.Helpers.Timing.microToMilli(decoration.customEndTime);
                            endTimePixels = this.timeToPositionClipped(endTimeMilli);
                            barWidth = endTimePixels - barX;
                        }
                        const triangleHeight = 8;
                        let triangleWidth = 8;
                        if (typeof decoration.customStartTime !== 'undefined') {
                            // The user can pass a customStartTime to tell us where the event's box start and therefore where we
                            // should draw the triangle. So therefore we calculate the width by taking the end time off the start
                            // time.
                            const startTimeMilli = Trace.Helpers.Timing.microToMilli(decoration.customStartTime);
                            const startTimePixels = this.timeToPositionClipped(startTimeMilli);
                            triangleWidth = Math.min(endTimePixels - startTimePixels, 8);
                        }
                        context.save();
                        context.beginPath();
                        context.rect(barX, barY, barWidth, barHeight);
                        context.clip();
                        context.beginPath();
                        context.fillStyle = this.#transformColor(entryIndex, 'red');
                        context.moveTo(barX + barWidth - triangleWidth, barY);
                        context.lineTo(barX + barWidth, barY);
                        context.lineTo(barX + barWidth, barY + triangleHeight);
                        context.fill();
                        context.restore();
                        break;
                    }
                    case "HIDDEN_DESCENDANTS_ARROW" /* FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW */: {
                        context.save();
                        context.beginPath();
                        context.rect(barX, barY, barWidth, barHeight);
                        const arrowSize = barHeight;
                        // If the bar is wider than double the arrow button, draw the button. Otherwise, draw a corner triangle to indicate some entries are hidden
                        if (barWidth > arrowSize * 2) {
                            const triangleSize = 7;
                            const triangleHorizontalPadding = 5;
                            const triangleVerrticalPadding = 6;
                            context.clip();
                            context.beginPath();
                            context.fillStyle = '#474747';
                            const arrowAX = barX + barWidth - triangleSize - triangleHorizontalPadding;
                            const arrowAY = barY + triangleVerrticalPadding;
                            context.moveTo(arrowAX, arrowAY);
                            const arrowBX = barX + barWidth - triangleHorizontalPadding;
                            const arrowBY = barY + triangleVerrticalPadding;
                            context.lineTo(arrowBX, arrowBY);
                            const arrowCX = barX + barWidth - triangleHorizontalPadding - triangleSize / 2;
                            const arrowCY = barY + barHeight - triangleVerrticalPadding;
                            context.lineTo(arrowCX, arrowCY);
                        }
                        else {
                            const triangleSize = 8;
                            context.clip();
                            context.beginPath();
                            context.fillStyle = '#474747';
                            context.moveTo(barX + barWidth - triangleSize, barY + barHeight);
                            context.lineTo(barX + barWidth, barY + barHeight);
                            context.lineTo(barX + barWidth, barY + triangleSize);
                        }
                        context.fill();
                        context.restore();
                        break;
                    }
                }
            }
        }
        context.restore();
    }
    /**
     * Draws (but does not fill) a rectangle for a given event onto the provided
     * context. Because sometimes we need to draw a portion of the rect, it
     * optionally allows the start X and width of the rect to be overridden by
     * custom pixel values. It currently does not allow the start Y and height to
     * be changed because we have no need to do so, but this can be extended in
     * the future if required.
     **/
    #drawEventRect(context, timelineData, entryIndex, overrides) {
        const { entryTotalTimes, entryStartTimes, entryLevels } = timelineData;
        const duration = entryTotalTimes[entryIndex];
        if (isNaN(duration)) {
            return;
        }
        const entryStartTime = entryStartTimes[entryIndex];
        const barX = overrides?.startX ?? this.timeToPositionClipped(entryStartTime);
        const barLevel = entryLevels[entryIndex];
        const barHeight = this.#eventBarHeight(timelineData, entryIndex);
        const barY = this.levelToOffset(barLevel);
        const barWidth = overrides?.width ?? this.#eventBarWidth(timelineData, entryIndex);
        if (barWidth === 0) {
            return;
        }
        // We purposefully leave a 1px gap off the height so there is a small gap
        // visually between events vertically in the panel.
        // Similarly, we leave 0.5 pixels off the width so that there is a small
        // gap between events. Otherwise if a trace has a lot of events it looks
        // like one solid block and is not very easy to distinguish when events
        // start and end.
        context.rect(barX, barY, barWidth - 0.5, barHeight - 1);
    }
    #eventBarHeight(timelineData, entryIndex) {
        const { entryLevels } = timelineData;
        const barLevel = entryLevels[entryIndex];
        const barHeight = this.levelHeight(barLevel);
        return barHeight;
    }
    entryWidth(entryIndex) {
        const timelineData = this.timelineData();
        if (!timelineData) {
            return 0;
        }
        return this.#eventBarWidth(timelineData, entryIndex);
    }
    #eventBarWidth(timelineData, entryIndex) {
        const { entryTotalTimes, entryStartTimes } = timelineData;
        const duration = entryTotalTimes[entryIndex];
        const entryStartTime = entryStartTimes[entryIndex];
        const barXStart = this.timeToPositionClipped(entryStartTime);
        const barXEnd = this.timeToPositionClipped(entryStartTime + duration);
        // Ensure that the width of the bar is at least one pixel.
        const barWidth = Math.max(barXEnd - barXStart, 1);
        return barWidth;
    }
    /**
     * Preprocess the data to be drawn to speed the rendering time.
     * Specifically:
     *  - Groups events into draw batches - same color + same outline - to help drawing performance
     *    by reducing how often `context.fillStyle` is changed.
     *  - Discards non visible events.
     *  - Gathers marker events (LCP, FCP, DCL, etc.).
     *  - Gathers event titles that should be rendered.
     */
    getDrawBatches(context, timelineData) {
        // These are the event indexes of events that we are drawing onto the timeline that:
        // 1) have text within them
        // 2) are visually wide enough in pixels to make it worth rendering the text.
        const titleIndices = [];
        // These point to events that represent single points in the timeline, most
        // often an event such as DCL/LCP.
        const markerIndices = [];
        const { entryTotalTimes, entryStartTimes } = timelineData;
        const top = this.chartViewport.scrollOffset();
        const textPadding = this.textPadding;
        // How wide in pixels / long in duration an event needs to be to make it
        // worthwhile rendering the text inside it.
        const minTextWidth = 2 * textPadding + UI.UIUtils.measureTextWidth(context, '…');
        const minTextWidthDuration = this.chartViewport.pixelToTimeOffset(minTextWidth);
        const keysByColorWithOutline = new Map();
        const keysByColorWithNoOutline = new Map();
        const getOrMakeKey = (color, outline) => {
            const map = outline ? keysByColorWithOutline : keysByColorWithNoOutline;
            const key = map.get(color);
            if (key) {
                return key;
            }
            const newKey = { color, outline };
            map.set(color, newKey);
            return newKey;
        };
        const drawBatches = new Map();
        for (let level = 0; level < this.dataProvider.maxStackDepth(); ++level) {
            // Since tracks can be reordered the |visibleLevelOffsets| is not necessarily sorted, so we need to check all levels.
            // Note that to check if a level is off the top of the screen, we can't
            // just check its offset, because then the level will disappear the
            // moment it is 1px off the top of the screen. So instead we check that
            // the entire height of the level is off the top of the screen before
            // skipping it.
            if (this.levelToOffset(level) + this.levelHeight(level) < top ||
                this.levelToOffset(level) > top + this.offsetHeight) {
                continue;
            }
            if (!this.visibleLevels?.[level]) {
                continue;
            }
            if (!this.timelineLevels) {
                break;
            }
            // Entries are ordered by start time within a level, so find the last visible entry.
            const levelIndexes = this.timelineLevels[level];
            const rightIndexOnLevel = Platform.ArrayUtilities.lowerBound(levelIndexes, this.chartViewport.windowRightTime(), (time, entryIndex) => time - entryStartTimes[entryIndex]) -
                1;
            let lastDrawOffset = Infinity;
            for (let entryIndexOnLevel = rightIndexOnLevel; entryIndexOnLevel >= 0; --entryIndexOnLevel) {
                const entryIndex = levelIndexes[entryIndexOnLevel];
                const duration = entryTotalTimes[entryIndex];
                // Markers are single events in time (e.g. LCP): they do not have a duration.
                if (isNaN(duration)) {
                    markerIndices.push(entryIndex);
                    continue;
                }
                if (duration >= minTextWidthDuration || this.forceDecorationCache?.[entryIndex]) {
                    // If the event is big enough visually to have its text rendered,
                    // or if it's in the array of event indexes that we forcibly render (as defined by the data provider)
                    // then we store its index. Later on, we'll loop through all
                    // `titleIndices` to render the text for each event.
                    titleIndices.push(entryIndex);
                }
                const entryStartTime = entryStartTimes[entryIndex];
                const entryOffsetRight = entryStartTime + duration;
                const levelForcedDrawable = Boolean(this.dataProvider.forceDrawableLevel?.(level));
                if (entryOffsetRight <= this.chartViewport.windowLeftTime() && !levelForcedDrawable) {
                    // If the event is entirely to the left of the visible window, and the level is not forced to be drawn, we can stop processing this level.
                    break;
                }
                const barX = this.timeToPositionClipped(entryStartTime);
                // Check if the entry entirely fits into an already drawn pixel, we can just skip drawing it.
                if (barX >= lastDrawOffset) {
                    continue;
                }
                lastDrawOffset = barX;
                if (this.entryColorsCache) {
                    const color = this.getColorForEntry(entryIndex);
                    const outline = this.#shouldOutlineEvent(entryIndex);
                    const key = getOrMakeKey(color, outline);
                    let batch = drawBatches.get(key);
                    if (!batch) {
                        batch = { indexes: [] };
                        drawBatches.set(key, batch);
                    }
                    batch.indexes.push(entryIndex);
                }
            }
        }
        return { drawBatches, titleIndices, markerIndices };
    }
    /**
     * The function to draw the group headers. It will draw the title by default.
     * And when a group is hovered, it will add a edit button.
     * And will draw the move up/down, hide and save button if user enter the editing mode.
     * @param width
     * @param height
     * @param hoveredGroupIndex This is used to show the edit icon for hovered group. If it is undefined or -1, it means
     * there is no group being hovered.
     */
    drawGroupHeaders(width, height) {
        const context = this.context;
        const top = this.chartViewport.scrollOffset();
        const ratio = window.devicePixelRatio;
        if (!this.rawTimelineData) {
            return;
        }
        const groups = this.rawTimelineData.groups || [];
        if (!groups.length) {
            return;
        }
        const groupOffsets = this.groupOffsets;
        if (groupOffsets === null || groupOffsets === undefined) {
            return;
        }
        const lastGroupOffset = groupOffsets[groupOffsets.length - 1];
        context.save();
        context.scale(ratio, ratio);
        context.translate(0, -top);
        context.font = this.#font;
        context.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-cdt-base-container');
        // Fill the gap between groups.
        this.forEachGroupInViewport((offset, _, group) => {
            const paddingHeight = group.style.padding;
            if (paddingHeight < 5) {
                return;
            }
            context.fillRect(0, offset - paddingHeight + 2, width, paddingHeight - 4);
        });
        // Fill the gap between last group and the bottom of canvas view.
        if (groups.length && lastGroupOffset < top + height) {
            context.fillRect(0, lastGroupOffset + 2, width, top + height - lastGroupOffset);
        }
        // The separating line between top level groups.
        context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-neutral-container');
        context.beginPath();
        // Draw a separator line at the beginning of each top-level group (except the first one).
        this.forEachGroupInViewport((offset, _, group, isFirst) => {
            if (isFirst || group.style.padding < 4) {
                return;
            }
            horizontalLine(context, width, offset - 2.5);
        });
        // Draw a separator line at the end of all groups.
        horizontalLine(context, width, lastGroupOffset + 1.5);
        context.stroke();
        this.forEachGroupInViewport((offset, index, group) => {
            if (group.style.useFirstLineForOverview) {
                return;
            }
            if (!this.isGroupCollapsible(index) || group.expanded) {
                if (!group.style.shareHeaderLine && this.isGroupFocused(index)) {
                    context.fillStyle = group.style.backgroundColor;
                    context.fillRect(0, offset, width, group.style.height);
                }
                return;
            }
            let nextGroup = index + 1;
            while (nextGroup < groups.length && groups[nextGroup].style.nestingLevel > group.style.nestingLevel) {
                nextGroup++;
            }
            const endLevel = nextGroup < groups.length ? groups[nextGroup].startLevel : this.dataProvider.maxStackDepth();
            this.drawCollapsedOverviewForGroup(group, offset, endLevel);
        });
        context.save();
        // If there is only one track, we won't allow the track reordering or hiding.
        const trackConfigurationAllowed = groups.length > 1;
        // When it is normal mode, there are no icons to the left of a track.
        // When it is in edit mode, there are three icons to customize the groups.
        const iconsWidth = this.#inTrackConfigEditMode ? EDIT_MODE_TOTAL_ICON_WIDTH : 0;
        this.forEachGroupInViewport((offset, groupIndex, group) => {
            context.font = this.#font;
            if (this.isGroupCollapsible(groupIndex) && !group.expanded || group.style.shareHeaderLine) {
                // In edit mode, we draw an extra rectangle for the save icon.
                const labelBackgroundWidth = this.labelWidthForGroup(context, group);
                const parsedColor = Common.Color.parse(group.style.backgroundColor);
                if (parsedColor) {
                    context.fillStyle = (parsedColor.setAlpha(0.8).asString());
                }
                context.fillRect(iconsWidth + HEADER_LEFT_PADDING, offset + HEADER_LABEL_Y_PADDING, labelBackgroundWidth, group.style.height - 2 * HEADER_LABEL_Y_PADDING);
            }
            context.fillStyle = (this.#inTrackConfigEditMode && group.hidden) ?
                ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-token-subtle', this.contentElement) :
                group.style.color;
            // The arrow is drawn from the center, so the indent is in fact the center of the arrow. See `drawExpansionArrow`
            // function to understand how we draw the arrow.
            // So the header looks like this:
            // |ICON_WIDTH|expansionArrowIndent * (nesting level + 1)|
            // |headerLeftPadding|EDIT  ICON|                     |Arrow|LabelXPadding|Title|LabelXPadding|
            //                                                                        ^ titleStart
            const titleStart = iconsWidth + EXPANSION_ARROW_INDENT * (group.style.nestingLevel + 1) + ARROW_SIDE / 2 +
                HEADER_LABEL_X_PADDING;
            const y = offset + group.style.height - this.textBaseline;
            context.fillText(group.name, titleStart, y);
            if (group.subtitle) {
                const titleMetrics = context.measureText(group.name);
                context.font = this.#subtitleFont;
                context.fillText(group.subtitle, titleStart + titleMetrics.width + PADDING_BETWEEN_TITLE_AND_SUBTITLE, y - 1);
                context.font = this.#font;
            }
            if (this.#inTrackConfigEditMode && group.hidden) {
                // Draw a strikethrough line for the hidden tracks.
                context.fillRect(titleStart, offset + group.style.height / 2, UI.UIUtils.measureTextWidth(context, group.name), 1);
            }
            // The icon and track title will look like this
            // Normal mode:
            // Track title
            // Edit mode:
            // [ Up ][Down][Hide]Track title
            if (trackConfigurationAllowed) {
                if (this.#inTrackConfigEditMode) {
                    const iconColor = group.hidden ? '--sys-color-token-subtle' : '--sys-color-on-surface';
                    // We only allow to reorder the top level groups.
                    if (group.style.nestingLevel === 0) {
                        drawIcon(context, UP_ICON_LEFT, offset, EDIT_ICON_WIDTH, moveUpIconPath, iconColor);
                        drawIcon(context, DOWN_ICON_LEFT, offset, EDIT_ICON_WIDTH, moveDownIconPath, iconColor);
                    }
                    // If this is the last visible top-level group, we will disable the hide action.
                    drawIcon(context, HIDE_ICON_LEFT, offset, EDIT_ICON_WIDTH, group.hidden ? showIconPath : hideIconPath, this.groupIsLastVisibleTopLevel(groupIndex) ? '--sys-color-state-disabled' : iconColor);
                }
            }
        });
        context.restore();
        context.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-token-subtle');
        this.forEachGroupInViewport((offset, index, group) => {
            if (this.isGroupCollapsible(index)) {
                drawExpansionArrow(context, iconsWidth + EXPANSION_ARROW_INDENT * (group.style.nestingLevel + 1), offset + group.style.height - this.textBaseline - ARROW_SIDE / 2, this.#inTrackConfigEditMode ? false : Boolean(group.expanded));
            }
        });
        context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-neutral-outline');
        context.beginPath();
        context.stroke();
        this.forEachGroupInViewport((offset, index, group, _isFirst, groupHeight) => {
            if (this.isGroupFocused(index)) {
                const lineWidth = 2;
                const bracketLength = 10;
                context.fillStyle =
                    ThemeSupport.ThemeSupport.instance().getComputedValue('--selected-group-border', this.contentElement);
                // The selected group indicator will be blue and in this kind of shape. And we will draw it with three
                // rectangles.
                // +-+---+
                // |-|---+
                // | |
                // | |
                // |-|---+
                // +-+---+
                // The vertical stroke
                context.fillRect(0, offset - lineWidth, lineWidth, groupHeight - group.style.padding + 2 * lineWidth);
                // The top horizontal stroke
                context.fillRect(0, offset - lineWidth, bracketLength, lineWidth);
                // The top horizontal stroke
                context.fillRect(0, offset + groupHeight - group.style.padding, bracketLength, lineWidth);
            }
        });
        context.restore();
    }
    /**
     * Draws page load events in the Timings track (LCP, FCP, DCL, etc.)
     */
    drawMarkers(context, timelineData, markerIndices) {
        const { entryStartTimes, entryLevels } = timelineData;
        this.markerPositions.clear();
        context.textBaseline = 'alphabetic';
        context.save();
        context.beginPath();
        let lastMarkerLevel = -1;
        let lastMarkerX = -Infinity;
        // Markers are sorted top to bottom, right to left.
        for (let m = markerIndices.length - 1; m >= 0; --m) {
            const entryIndex = markerIndices[m];
            const title = this.entryTitle(entryIndex);
            if (!title) {
                continue;
            }
            const entryStartTime = entryStartTimes[entryIndex];
            const level = entryLevels[entryIndex];
            if (lastMarkerLevel !== level) {
                lastMarkerX = -Infinity;
            }
            const x = Math.max(this.chartViewport.timeToPosition(entryStartTime), lastMarkerX);
            const y = this.levelToOffset(level);
            const h = this.levelHeight(level);
            const padding = 4;
            const width = Math.ceil(UI.UIUtils.measureTextWidth(context, title)) + 2 * padding;
            lastMarkerX = x + width + 1;
            lastMarkerLevel = level;
            this.markerPositions.set(entryIndex, { x, width });
            context.fillStyle = this.getColorForEntry(entryIndex);
            context.fillRect(x, y, width, h - 1);
            context.fillStyle = 'white';
            context.fillText(title, x + padding, y + h - this.textBaseline);
        }
        context.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        context.stroke();
        context.restore();
    }
    #drawCustomSymbols(context, timelineData) {
        const { entryStartTimes, entryTotalTimes, entryLevels } = timelineData;
        this.customDrawnPositions.clear();
        context.save();
        // TODO: Don't draw if it's not in the viewport.
        const posArray = [];
        for (const [entryIndex, drawOverride] of this.#indexToDrawOverride.entries()) {
            const entryStartTime = entryStartTimes[entryIndex];
            const entryTotalTime = entryTotalTimes[entryIndex];
            const level = entryLevels[entryIndex];
            // Skip if the group for this event has been hidden.
            const group = this.dataProvider.groupForEvent?.(entryIndex);
            if (group?.hidden) {
                continue;
            }
            const unclippedXStart = this.chartViewport.timeToPosition(entryStartTime);
            const unclippedXEnd = this.chartViewport.timeToPosition(entryStartTime + entryTotalTime);
            const x = unclippedXStart;
            const y = this.levelToOffset(level);
            const height = this.levelHeight(level);
            const width = unclippedXEnd - unclippedXStart;
            const pos = drawOverride(context, x, y, width, height, time => this.chartViewport.timeToPosition(time), color => this.#transformColor(entryIndex, color));
            posArray.push({ entryIndex, pos });
        }
        // Place in z order so coordinatesToEntryIndex finds the highest z-index match first.
        posArray.sort((a, b) => (b.pos.z ?? 0) - (a.pos.z ?? 0));
        for (const { entryIndex, pos } of posArray) {
            this.customDrawnPositions.set(entryIndex, pos);
        }
        context.restore();
    }
    /**
     * Draws the titles of trace events in the timeline. Also calls `decorateEntry` on the data
     * provider, which can do any custom drawing on the corresponding entry's area (e.g. draw screenshots
     * in the Performance Panel timeline).
     *
     * Takes in the width of the entire canvas so that we know if an event does
     * not fit into the viewport entirely, the max width we can draw is that
     * width, not the width of the event itself.
     */
    drawEventTitles(context, timelineData, titleIndices, canvasWidth) {
        const timeToPixel = this.chartViewport.timeToPixel();
        const textPadding = this.textPadding;
        context.save();
        context.beginPath();
        const { entryStartTimes, entryLevels } = timelineData;
        for (let i = 0; i < titleIndices.length; ++i) {
            const entryIndex = titleIndices[i];
            const entryStartTime = entryStartTimes[entryIndex];
            const barX = this.timeToPositionClipped(entryStartTime);
            // Ensure that the title does not go off screen, if the width of the
            // event is wider than the width of the canvas, use the canvas width as
            // our maximum width.
            const barWidth = Math.min(this.#eventBarWidth(timelineData, entryIndex), canvasWidth);
            const barLevel = entryLevels[entryIndex];
            const barY = this.levelToOffset(barLevel);
            let text = this.dataProvider.entryTitle(entryIndex);
            const barHeight = this.#eventBarHeight(timelineData, entryIndex);
            if (text?.length) {
                context.font = this.#font;
                const hasArrowDecoration = this.entryHasDecoration(entryIndex, "HIDDEN_DESCENDANTS_ARROW" /* FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW */);
                // Set the max width to be the width of the bar plus some padding. If the bar has an arrow decoration and the bar is wide enough for the larger
                // version of the decoration that is a square button, also subtract the width of the decoration.
                // Because the decoration is square, it's width is equal to this.barHeight
                const maxBarWidth = (hasArrowDecoration && barWidth > barHeight * 2) ? barWidth - textPadding - this.barHeight :
                    barWidth - 2 * textPadding;
                text = UI.UIUtils.trimTextMiddle(context, text, maxBarWidth);
            }
            const unclippedBarX = this.chartViewport.timeToPosition(entryStartTime);
            if (this.dataProvider.decorateEntry(entryIndex, context, text, barX, barY, barWidth, barHeight, unclippedBarX, timeToPixel, color => this.#transformColor(entryIndex, color))) {
                continue;
            }
            if (!text?.length) {
                continue;
            }
            context.fillStyle = this.#transformColor(entryIndex, this.dataProvider.textColor(entryIndex));
            context.fillText(text, barX + textPadding, barY + barHeight - this.textBaseline);
        }
        context.restore();
    }
    /**
     * @callback GroupCallback
     * @param groupTop pixels between group top and the top of the flame chart.
     * @param groupIndex
     * @param group
     * @param isFirstGroup if the group is the first one of this nesting level.
     * @param height pixels of height of this group
     */
    /**
     * Process the pixels of start and end, and other data of each group, which are used in drawing the group.
     * @param callback
     */
    forEachGroup(callback) {
        if (!this.rawTimelineData) {
            return;
        }
        const groups = this.rawTimelineData.groups || [];
        if (!groups.length) {
            return;
        }
        const groupOffsets = this.groupOffsets;
        if (!groupOffsets) {
            return;
        }
        const groupStack = [{ nestingLevel: -1, visible: true }];
        for (let i = 0; i < groups.length; ++i) {
            const groupTop = groupOffsets[i];
            const group = groups[i];
            let firstGroup = true;
            let last = groupStack[groupStack.length - 1];
            while (last && last.nestingLevel >= group.style.nestingLevel) {
                groupStack.pop();
                firstGroup = false;
                last = groupStack[groupStack.length - 1];
            }
            last = groupStack[groupStack.length - 1];
            const parentGroupVisible = last ? last.visible : false;
            const thisGroupVisible = !group.hidden && parentGroupVisible && (!this.isGroupCollapsible(i) || group.expanded);
            groupStack.push({ nestingLevel: group.style.nestingLevel, visible: Boolean(thisGroupVisible) });
            if (!this.#groupTreeRoot) {
                return;
            }
            const sortedGroupIndexes = [];
            function traverse(root) {
                sortedGroupIndexes.push(root.index);
                for (const child of root.children) {
                    traverse(child);
                }
            }
            traverse(this.#groupTreeRoot);
            // Skip the one whose index is -1, because we added to represent the top
            // level to be the parent of all groups.
            sortedGroupIndexes.shift();
            // This shouldn't happen, because the tree should have the fake root and all groups. Add a sanity check to avoid
            // error.
            if (sortedGroupIndexes.length !== groups.length) {
                console.warn('The data from the group tree doesn\'t match the data from DataProvider.');
                return;
            }
            // Add an extra index, which is equal to the length of the |groups|, this
            // will be used for the coordinates after the last group.
            // If the coordinates after the last group, it will return in later check
            // `groupIndex >= groups.length` anyway. But add one more element to make
            // this array same length as the |groupOffsets|.
            sortedGroupIndexes.push(groups.length);
            const currentIndex = sortedGroupIndexes.indexOf(i);
            const nextOffset = groupOffsets[sortedGroupIndexes[currentIndex + 1]];
            // In edit mode all the groups are visible.
            if (!this.#inTrackConfigEditMode && (!parentGroupVisible || group.hidden)) {
                continue;
            }
            callback(groupTop, i, group, firstGroup, nextOffset - groupTop);
        }
    }
    forEachGroupInViewport(callback) {
        const top = this.chartViewport.scrollOffset();
        this.forEachGroup((groupTop, index, group, firstGroup, height) => {
            if (groupTop - group.style.padding > top + this.offsetHeight) {
                return;
            }
            if (groupTop + height < top) {
                return;
            }
            callback(groupTop, index, group, firstGroup, height);
        });
    }
    /**
     * Returns the width of the title label of the group, which include the left padding, arrow and the group header text.
     * This function is public for test reason.
     * |ICON_WIDTH|expansionArrowIndent * (nestingLevel + 1)|
     * |headerLeftPadding|EDIT  ICON|                    |Arrow|LabelXPadding|Title|LabelXPadding|
     *                              |<--                      labelWidth                      -->|
     * @param context canvas context
     * @param group
     * @returns the width of the label of the group.
     */
    labelWidthForGroup(context, group) {
        return EXPANSION_ARROW_INDENT * (group.style.nestingLevel + 1) + ARROW_SIDE / 2 + HEADER_LABEL_X_PADDING +
            UI.UIUtils.measureTextWidth(context, group.name) + HEADER_LABEL_X_PADDING - HEADER_LEFT_PADDING;
    }
    drawCollapsedOverviewForGroup(group, y, endLevel) {
        const range = new Common.SegmentedRange.SegmentedRange(mergeCallback);
        const timeWindowLeft = this.chartViewport.windowLeftTime();
        const timeWindowRight = this.chartViewport.windowRightTime();
        const context = this.context;
        const groupBarHeight = group.style.height;
        if (!this.rawTimelineData) {
            return;
        }
        const entryStartTimes = this.rawTimelineData.entryStartTimes;
        const entryTotalTimes = this.rawTimelineData.entryTotalTimes;
        const timeToPixel = this.chartViewport.timeToPixel();
        for (let level = group.startLevel; level < endLevel; ++level) {
            const levelIndexes = this.timelineLevels ? this.timelineLevels[level] : [];
            const rightIndexOnLevel = Platform.ArrayUtilities.lowerBound(levelIndexes, timeWindowRight, (time, entryIndex) => time - entryStartTimes[entryIndex]) -
                1;
            let lastDrawOffset = Infinity;
            for (let entryIndexOnLevel = rightIndexOnLevel; entryIndexOnLevel >= 0; --entryIndexOnLevel) {
                const entryIndex = levelIndexes[entryIndexOnLevel];
                const entryStartTime = entryStartTimes[entryIndex];
                const barX = this.timeToPositionClipped(entryStartTime);
                const entryEndTime = entryStartTime + entryTotalTimes[entryIndex];
                if (isNaN(entryEndTime) || barX >= lastDrawOffset) {
                    continue;
                }
                if (entryEndTime <= timeWindowLeft) {
                    break;
                }
                lastDrawOffset = barX;
                const color = this.getColorForEntry(entryIndex);
                const endBarX = this.timeToPositionClipped(entryEndTime);
                if (group.style.useDecoratorsForOverview && this.dataProvider.forceDecoration(entryIndex)) {
                    const unclippedBarX = this.chartViewport.timeToPosition(entryStartTime);
                    const barWidth = this.#eventBarWidth(this.rawTimelineData, entryIndex);
                    context.beginPath();
                    context.fillStyle = color;
                    context.fillRect(barX, y, barWidth, groupBarHeight - 1);
                    this.dataProvider.decorateEntry(entryIndex, context, '', barX, y, barWidth, groupBarHeight, unclippedBarX, timeToPixel, color => this.#transformColor(entryIndex, color));
                    continue;
                }
                range.append(new Common.SegmentedRange.Segment(barX, endBarX, color));
            }
        }
        const segments = range.segments().slice().sort((a, b) => a.data.localeCompare(b.data));
        let lastColor;
        context.beginPath();
        for (let i = 0; i < segments.length; ++i) {
            const segment = segments[i];
            if (lastColor !== segments[i].data) {
                context.fill();
                context.beginPath();
                lastColor = segments[i].data;
                context.fillStyle = lastColor;
            }
            context.rect(segment.begin, y, segment.end - segment.begin, groupBarHeight);
        }
        context.fill();
        function mergeCallback(a, b) {
            return a.data === b.data && a.end + 0.4 > b.end ? a : null;
        }
    }
    drawFlowEvents(context, timelineData) {
        const td = this.timelineData();
        if (!td) {
            return;
        }
        const { entryTotalTimes, entryStartTimes, entryLevels } = timelineData;
        const ratio = window.devicePixelRatio;
        const top = this.chartViewport.scrollOffset();
        const arrowLineWidth = 6;
        const arrowWidth = 3;
        context.save();
        context.scale(ratio, ratio);
        context.translate(0, -top);
        const arrowColor = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-on-surface-subtle');
        context.fillStyle = arrowColor;
        context.strokeStyle = arrowColor;
        for (let i = 0; i < td.initiatorsData.length; ++i) {
            const initiatorsData = td.initiatorsData[i];
            // Draw an arrow in an 'elbow connector' shape if the initiator ends before the initiated event starts, like this
            // ---
            //   |
            //   --->
            // Otherwise directly draw from the initiator start to initiated start, like this:
            // |
            // |
            // ---->
            const initiatorStartTime = entryStartTimes[initiatorsData.initiatorIndex];
            const initiatorEndTime = entryStartTimes[initiatorsData.initiatorIndex] + entryTotalTimes[initiatorsData.initiatorIndex];
            const initiatedStartTime = entryStartTimes[initiatorsData.eventIndex];
            const initiatorEndsBeforeInitiatedStart = initiatorEndTime < initiatedStartTime;
            const initiatorArrowStartTime = initiatorEndsBeforeInitiatedStart ?
                initiatorEndTime :
                // The blue indicator's width is 2, so add a little bit offset to start the arrow.
                Math.max(initiatorStartTime, this.chartViewport.pixelToTime(5));
            const initiatorArrowEndTime = initiatedStartTime;
            // Do not draw the initiator if it is out of the viewport
            if (initiatorArrowEndTime < this.chartViewport.windowLeftTime()) {
                continue;
            }
            let startX = this.chartViewport.timeToPosition(initiatorArrowStartTime);
            let endX = this.chartViewport.timeToPosition(initiatorArrowEndTime);
            // Draw a circle around 'collapsed entries' arrow to indicate that the initiated entry is hidden
            if (initiatorsData.isInitiatorHidden) {
                const { circleEndX } = this.drawCircleAroundCollapseArrow(initiatorsData.initiatorIndex, context, timelineData);
                // If the circle exists around the initiator, start the initiator arrow from the circle end
                if (circleEndX) {
                    startX = circleEndX;
                }
            }
            if (initiatorsData.isEntryHidden) {
                const { circleStartX } = this.drawCircleAroundCollapseArrow(initiatorsData.eventIndex, context, timelineData);
                // If the circle exists around the initiated event, draw the initiator arrow until the circle beginning
                if (circleStartX) {
                    endX = circleStartX;
                }
            }
            const startLevel = entryLevels[initiatorsData.initiatorIndex];
            const endLevel = entryLevels[initiatorsData.eventIndex];
            const startY = this.levelToOffset(startLevel) + this.levelHeight(startLevel) / 2;
            const endY = this.levelToOffset(endLevel) + this.levelHeight(endLevel) / 2;
            const lineLength = endX - startX;
            context.lineWidth = 1;
            context.shadowColor = 'rgba(0, 0, 0, 0.3)';
            context.shadowOffsetX = 2;
            context.shadowOffsetY = 2;
            context.shadowBlur = 3;
            if (lineLength > arrowWidth) {
                // Add an arrow to the line if the line is long enough.
                context.beginPath();
                context.moveTo(endX, endY);
                context.lineTo(endX - arrowLineWidth, endY - 3);
                context.lineTo(endX - arrowLineWidth, endY + 3);
                context.fill();
            }
            if (initiatorEndsBeforeInitiatedStart) {
                // ---
                //   |
                //   --->
                context.beginPath();
                context.moveTo(startX, startY);
                context.lineTo(startX + lineLength / 2, startY);
                context.lineTo(startX + lineLength / 2, endY);
                context.lineTo(endX, endY);
                context.stroke();
            }
            else {
                // |
                // |
                // ---->
                context.beginPath();
                context.moveTo(startX, startY);
                context.lineTo(startX, endY);
                context.lineTo(endX, endY);
                context.stroke();
            }
        }
        context.restore();
    }
    drawCircleAroundCollapseArrow(entryIndex, context, timelineData) {
        const decorationsForEvent = timelineData.entryDecorations.at(entryIndex);
        // The circle is only drawn when the initiator arrow is going to/from some hidden entry. Make sure that the entry also has a decoration for hidden children.
        if (!decorationsForEvent?.find(decoration => decoration.type === "HIDDEN_DESCENDANTS_ARROW" /* FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW */)) {
            // This should not happen, break if it does.
            return {};
        }
        const { entryStartTimes, entryLevels } = timelineData;
        // The large version of 'hidden entries' is displayed
        // only when the bar width is over double the height.
        // We do not want to draw the circle if the arrow is not visible.
        const barWidth = this.#eventBarWidth(timelineData, entryIndex);
        if (barWidth < this.barHeight * 2) {
            return {};
        }
        const entryStartTime = entryStartTimes[entryIndex];
        const barX = this.timeToPositionClipped(entryStartTime);
        const barLevel = entryLevels[entryIndex];
        const barHeight = this.#eventBarHeight(timelineData, entryIndex);
        const barY = this.levelToOffset(barLevel);
        context.save();
        context.beginPath();
        context.rect(barX, barY, barWidth, barHeight);
        context.clip();
        context.lineWidth = 1;
        context.beginPath();
        context.fillStyle = '#474747';
        const triangleCenterX = barX + barWidth - this.barHeight / 2;
        const triangleCenterY = barY + this.barHeight / 2;
        const circleRadius = 6;
        context.beginPath();
        context.arc(triangleCenterX, triangleCenterY, circleRadius, 0, 2 * Math.PI);
        context.stroke();
        context.restore();
        return { circleStartX: triangleCenterX - circleRadius, circleEndX: triangleCenterX + circleRadius };
    }
    /**
     * Draws the vertical dashed lines in the timeline marking where the "Marker" events
     * happened in time.
     */
    drawMarkerLines() {
        const timelineData = this.timelineData();
        if (!timelineData) {
            return;
        }
        const markers = timelineData.markers;
        const left = this.markerIndexBeforeTime(this.minimumBoundary());
        const rightBoundary = this.maximumBoundary();
        const timeToPixel = this.chartViewport.timeToPixel();
        const context = this.context;
        context.save();
        const ratio = window.devicePixelRatio;
        context.scale(ratio, ratio);
        context.translate(0, 3);
        const height = RulerHeight - 1;
        for (let i = left; i < markers.length; i++) {
            const timestamp = markers[i].startTime();
            if (timestamp > rightBoundary) {
                break;
            }
            markers[i].draw(context, this.chartViewport.timeToPosition(timestamp), height, timeToPixel);
        }
        context.restore();
    }
    updateMarkerHighlight() {
        const element = this.markerHighlighElement;
        if (element.parentElement) {
            element.remove();
        }
        const markerIndex = this.highlightedMarkerIndex;
        if (markerIndex === -1) {
            return;
        }
        const timelineData = this.timelineData();
        if (!timelineData) {
            return;
        }
        const marker = timelineData.markers[markerIndex];
        const barX = this.timeToPositionClipped(marker.startTime());
        UI.Tooltip.Tooltip.install(element, marker.title() || '');
        const style = element.style;
        style.left = barX + 'px';
        style.backgroundColor = marker.color();
        this.viewportElement.appendChild(element);
    }
    processTimelineData(timelineData) {
        if (!timelineData) {
            this.timelineLevels = null;
            this.visibleLevelOffsets = null;
            this.visibleLevels = null;
            this.groupOffsets = null;
            this.rawTimelineData = null;
            this.forceDecorationCache = null;
            this.entryColorsCache = null;
            this.dimIndices = null;
            this.colorDimmingCache.clear();
            this.rawTimelineDataLength = 0;
            this.#groupTreeRoot = null;
            this.selectedGroupIndex = -1;
            this.keyboardFocusedGroup = -1;
            this.flameChartDelegate.updateSelectedGroup(this, null);
            return;
        }
        this.rawTimelineData = timelineData;
        this.rawTimelineDataLength = timelineData.entryStartTimes.length;
        this.forceDecorationCache = new Array(this.rawTimelineDataLength);
        this.entryColorsCache = new Array(this.rawTimelineDataLength);
        this.#indexToDrawOverride.clear();
        for (let i = 0; i < this.rawTimelineDataLength; ++i) {
            this.forceDecorationCache[i] = this.dataProvider.forceDecoration(i) ?? false;
            this.entryColorsCache[i] = this.dataProvider.entryColor(i);
            const drawOverride = this.dataProvider.getDrawOverride?.(i);
            if (drawOverride) {
                this.#indexToDrawOverride.set(i, drawOverride);
            }
        }
        const entryCounters = new Uint32Array(this.dataProvider.maxStackDepth() + 1);
        for (let i = 0; i < timelineData.entryLevels.length; ++i) {
            ++entryCounters[timelineData.entryLevels[i]];
        }
        const levelIndexes = new Array(entryCounters.length);
        for (let i = 0; i < levelIndexes.length; ++i) {
            levelIndexes[i] = new Uint32Array(entryCounters[i]);
            entryCounters[i] = 0;
        }
        for (let i = 0; i < timelineData.entryLevels.length; ++i) {
            const level = timelineData.entryLevels[i];
            levelIndexes[level][entryCounters[level]++] = i;
        }
        this.timelineLevels = levelIndexes;
        const groups = this.rawTimelineData.groups || [];
        for (let i = 0; i < groups.length; ++i) {
            // Find matching config based on the name of the track.
            const matchingConfig = this.#persistedGroupConfig?.find(c => c.trackName === groups[i].name);
            // Priority:
            // 1. Prefer the active track config.
            // 2. If that doesn't exist, prefer any explicit state set on the group.
            // 3. If that doesn't exist, set defaults.
            const expanded = matchingConfig?.expanded ?? groups[i].expanded ?? false;
            const hidden = matchingConfig?.hidden ?? groups[i].hidden ?? false;
            groups[i].expanded = expanded;
            groups[i].hidden = hidden;
        }
        if (!this.#groupTreeRoot) {
            this.#groupTreeRoot = this.buildGroupTree(groups);
        }
        else {
            // When the |groupTreeRoot| is already existing, and a "new" timeline data comes, this means the new timeline data
            // is just a modification of original, so we should update the tree instead of rebuild it.
            // For example,
            // [
            //   { name: 'Test Group 0', startLevel: 0, ...},
            //   { name: 'Test Group 1', startLevel: 1, ...},
            //   { name: 'Test Group 2', startLevel: 2, ...},
            // ], and [
            //   { name: 'Test Group 0', startLevel: 0, ...},
            //   { name: 'Test Group 1', startLevel: 2, ...},
            //   { name: 'Test Group 2', startLevel: 4, ...},
            // ],
            // are the same.
            // But they and [
            //   { name: 'Test Group 0', startLevel: 0, ...},
            //   { name: 'Test Group 2', startLevel: 1, ...},
            //   { name: 'Test Group 1', startLevel: 2, ...},
            // ] are different.
            // But if the |groups| is changed (this means the group order inside the |groups| is changed), it means the
            // timeline data is a real new one, then please call |reset()| before rendering.
            this.updateGroupTree(groups, this.#groupTreeRoot);
        }
        // If we have persisted track config, apply it. This method can get called when there is no timeline data, so we check for that.
        // For now, we only apply the sorting persistence if the length of the
        // groups in the config matches the length of the current trace. In the
        // future we might want to adjust this because it means that the persisted
        // config sorting isn't that useful; the moment you import a trace with a
        // new set of groups that are a different length, we don't use it.
        if (this.#persistedGroupConfig && groups.length > 0 && this.#groupTreeRoot &&
            this.#persistedGroupConfig.length === groups.length) {
            this.#reOrderGroupsBasedOnPersistedConfig(this.#persistedGroupConfig, this.#groupTreeRoot);
        }
        this.updateLevelPositions();
        this.updateHeight();
        // If this is a new trace, we will call the reset()(See TimelineFlameChartView > setModel()), which will set the
        // |selectedGroupIndex| to -1.
        // So when |selectedGroupIndex| is not -1, it means it is the same trace file, but might have some modification
        // (like reorder the track, merge an entry, etc).
        if (this.selectedGroupIndex === -1) {
            this.selectedGroupIndex = timelineData.selectedGroup ? groups.indexOf(timelineData.selectedGroup) : -1;
        }
        this.keyboardFocusedGroup = this.selectedGroupIndex;
        this.flameChartDelegate.updateSelectedGroup(this, timelineData.selectedGroup);
    }
    /**
     * If we find persisted configuration, we need to update the tree so the
     * children in the tree are ordered in the way they were ordered the last time
     * the user viewed this trace.
     */
    #reOrderGroupsBasedOnPersistedConfig(persistedConfig, root) {
        function traverseAndOrderChildren(node) {
            if (node.children.length) {
                // Sort the children based on their visual index, meaning that the tree
                // structure is updated to reflect what the stored configuration shows.
                node.children.sort((a, b) => {
                    const aIndex = persistedConfig[a.index].visualIndex;
                    const bIndex = persistedConfig[b.index].visualIndex;
                    return aIndex - bIndex;
                });
            }
            node.children.forEach(traverseAndOrderChildren);
        }
        traverseAndOrderChildren(root);
    }
    /**
     * Builds a tree node for a group. For each group the start level is inclusive and the end level is exclusive.
     * @param group
     * @param index index of the group in the |FlameChartTimelineData.groups[]|
     * @param endLevel The end level of this group, which is also the start level of the next group or the end of all
     * groups
     * @returns the tree node for the group
     */
    #buildGroupTreeNode(group, index, endLevel) {
        return {
            index,
            nestingLevel: group.style.nestingLevel,
            startLevel: group.startLevel,
            endLevel,
            children: [],
        };
    }
    /**
     * Builds a tree for the given group array, the tree will be built based on the nesting level.
     * We will add one fake root to represent the top level parent, and the for each tree node, its children means the
     * group nested in. The order of the children matters because it represent the order of groups.
     * So for example if there are Group 0-7, Group 0, 3, 4 have nestingLevel 0, Group 1, 2, 5, 6, 7 have nestingLevel 1.
     * Then we will get a tree like this.
     *              -1(fake root to represent the top level parent)
     *             / | \
     *            /  |  \
     *           0   3   4
     *          / \    / | \
     *         1   2  5  6  7
     * This function is public for test purpose.
     * @param groups the array of all groups, it should be the one from FlameChartTimelineData
     * @returns the root of the Group tree. The root is the fake one we added, which represent the parent for all groups
     */
    buildGroupTree(groups) {
        // Add an extra top level. This will be used as a parent for all groups, and
        // will be used to contain the levels that not belong to any group.
        const treeRoot = {
            index: -1,
            nestingLevel: -1,
            startLevel: 0,
            // If there is no |groups| (for example the JS Profiler), it means all the
            // levels belong to the top level, so just use the max level as the end.
            endLevel: groups.length ? groups[0].startLevel : this.dataProvider.maxStackDepth(),
            children: [],
        };
        const groupStack = [treeRoot];
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            const currentGroupNestingLevel = group.style.nestingLevel;
            let parentGroup = groupStack[groupStack.length - 1];
            while (parentGroup && parentGroup.nestingLevel >= currentGroupNestingLevel) {
                groupStack.pop();
                parentGroup = groupStack[groupStack.length - 1];
            }
            const nextGroup = groups[i + 1];
            // If this group is the last one, it means all the remaining levels belong
            // to this level, so just use the max level as the end.
            const endLevel = nextGroup?.startLevel ?? this.dataProvider.maxStackDepth();
            const currentGroupNode = this.#buildGroupTreeNode(group, i, endLevel);
            parentGroup.children.push(currentGroupNode);
            groupStack.push(currentGroupNode);
        }
        return treeRoot;
    }
    /**
     * Updates the tree for the given group array.
     * For a new timeline data, if the groups remains the same (the same here mean the group order inside the |groups|,
     * the start level, style and other attribute can be changed), but other parts are different.
     * For example the |entryLevels[]| or |maxStackDepth| is changed, then we should update the group tree instead of
     * re-build it.
     * So we can keep the order that user manually set.
     * To do this, we go through the tree, and update the start and end level of each group.
     * This function is public for test purpose.
     * @param groups the array of all groups, it should be the one from FlameChartTimelineData
     * @param root the root of the Group tree. The root is the fake one we added, which represent the parent for all groups
     */
    updateGroupTree(groups, root) {
        const maxStackDepth = this.dataProvider.maxStackDepth();
        function traverse(treeNode) {
            const index = treeNode.index;
            if (index < 0) {
                // For the extra top level. This will be used as a parent for all
                // groups, so it will start from level 0.
                treeNode.startLevel = 0;
                // If there is no |groups| (for example the JS Profiler), it means all the
                // levels belong to the top level, so just use the max level as the end.
                treeNode.endLevel = groups.length ? groups[0].startLevel : maxStackDepth;
            }
            else {
                // This shouldn't happen. If this happen, it means the |groups| from data provider is changed. Add a sanity
                // check to avoid error.
                if (!groups[index]) {
                    console.warn('The |groups| is changed. ' +
                        'Please make sure the flamechart is reset after data change in the data provider');
                    return;
                }
                treeNode.startLevel = groups[index].startLevel;
                const nextGroup = groups[index + 1];
                // If this group is the last one, it means all the remaining levels belong
                // to this level, so just use the max level as the end.
                treeNode.endLevel = nextGroup?.startLevel ?? maxStackDepth;
            }
            for (const child of treeNode.children) {
                traverse(child);
            }
        }
        traverse(root);
    }
    /**
     * Given a tree, do a preorder traversal, and process the group and the levels in this group.
     * So for a tree like this:
     *              -1
     *             / | \
     *            /  |  \
     *           0   3   4
     *          / \    / | \
     *         1   2  5  6  7
     * The traverse order will be: -1, 0, 1, 2, 3, 4, 5, 6, 7.
     * @param groupNode TreeNode for current group
     * @param currentOffset
     * @param parentGroupIsVisible used to determine if current group's header and its levels are visible
     * @returns the offset (in pixels) after processing current group
     */
    #traverseGroupTreeAndUpdateLevelPositionsForTheGroup(groupNode, currentOffset, parentGroupIsVisible) {
        if (!this.visibleLevels || !this.visibleLevelOffsets || !this.visibleLevelHeights || !this.groupOffsets) {
            return currentOffset;
        }
        const groups = this.rawTimelineData?.groups;
        if (!groups) {
            return currentOffset;
        }
        // This shouldn't happen. If this happen, it means the group tree is outdated. Add a sanity check to avoid error.
        if (groupNode.index >= groups.length) {
            console.warn('The data from the group tree is outdated. ' +
                'Please make sure the flamechart is reset after data change in the data provider');
            return currentOffset;
        }
        if (groupNode.index >= 0) {
            this.groupOffsets[groupNode.index] = currentOffset;
            // If |shareHeaderLine| is false, we add the height of one more level to
            // the current offset, which will be used for the start level of current
            // group.
            // For edit mode, we will show all the groups whose name are not empty.
            if ((this.#inTrackConfigEditMode && groups[groupNode.index].name) ||
                (!groups[groupNode.index].hidden && parentGroupIsVisible && !groups[groupNode.index].style.shareHeaderLine)) {
                currentOffset += groups[groupNode.index].style.height;
            }
        }
        // If this is the top level, it is always shown.
        // Otherwise, if the parent group is visible and current group is not hidden, and this group is expanded, then this
        // group is visible.
        let thisGroupIsVisible = false;
        if (groupNode.index < 0) {
            thisGroupIsVisible = true;
        }
        else {
            const thisGroupIsExpanded = !(this.isGroupCollapsible(groupNode.index) && !groups[groupNode.index].expanded);
            thisGroupIsVisible = !groups[groupNode.index].hidden && thisGroupIsExpanded;
        }
        const thisGroupLevelsAreVisible = thisGroupIsVisible && parentGroupIsVisible;
        for (let level = groupNode.startLevel; level < groupNode.endLevel; level++) {
            // This shouldn't happen. If this happen, it means the group tree is outdated. Add a sanity check to avoid error.
            if (level >= this.dataProvider.maxStackDepth()) {
                console.warn('The data from the group tree is outdated. ' +
                    'Please make sure the flamechart is reset after data change in the data provider');
                return currentOffset;
            }
            // Handle offset and visibility of each level inside this group.
            const isFirstOnLevel = level === groupNode.startLevel;
            // If this is the top level group, all the levels in this group are always shown.
            // Otherwise it depends on the visibility of parent group and this group.
            let thisLevelIsVisible;
            if (groupNode.index < 0) {
                thisLevelIsVisible = true;
            }
            else {
                const isFirstLevelAndForOverview = isFirstOnLevel && groups[groupNode.index].style.useFirstLineForOverview;
                thisLevelIsVisible = !groups[groupNode.index].hidden &&
                    (parentGroupIsVisible && (thisGroupLevelsAreVisible || isFirstLevelAndForOverview));
            }
            let height;
            if (groups[groupNode.index]) {
                // |shareHeaderLine| is false means the first level of this group is on the next level of the header.
                const isFirstLevelAndNotShareHeaderLine = isFirstOnLevel && !groups[groupNode.index].style.shareHeaderLine;
                // A group is collapsed means only ite header is visible.
                const thisGroupIsCollapsed = this.isGroupCollapsible(groupNode.index) && !groups[groupNode.index].expanded;
                if (isFirstLevelAndNotShareHeaderLine || thisGroupIsCollapsed) {
                    // This means this level is only the header, so we use the height of the header for this level.
                    height = groups[groupNode.index].style.height;
                }
                else {
                    height = groups[groupNode.index].style.itemsHeight ?? this.barHeight;
                }
            }
            else {
                height = this.barHeight;
            }
            // If it's in edit mode, all the levels are hidden.
            this.visibleLevels[level] = this.#inTrackConfigEditMode ? false : Boolean(thisLevelIsVisible);
            this.visibleLevelOffsets[level] = currentOffset;
            this.visibleLevelHeights[level] = this.#inTrackConfigEditMode ? 0 : height;
            // If this level not belong to any group, it is always shown, otherwise we need to check if it is visible.
            if (groupNode.index < 0 ||
                (!groups[groupNode.index].hidden) &&
                    (thisLevelIsVisible ||
                        (parentGroupIsVisible && groups[groupNode.index].style.shareHeaderLine && isFirstOnLevel))) {
                currentOffset += this.visibleLevelHeights[level];
            }
        }
        if (groupNode.children.length === 0) {
            return currentOffset;
        }
        for (const child of groupNode.children) {
            // If the child is not the first child, we will add a padding top.
            // For edit mode, we will show all the groups whose name are not empty.
            if ((this.#inTrackConfigEditMode && groups[child.index].name) ||
                (thisGroupLevelsAreVisible && !groups[child.index]?.hidden && child !== groupNode.children[0])) {
                currentOffset += (groups[child.index].style.padding ?? 0);
            }
            currentOffset =
                this.#traverseGroupTreeAndUpdateLevelPositionsForTheGroup(child, currentOffset, thisGroupLevelsAreVisible);
        }
        return currentOffset;
    }
    updateLevelPositions() {
        if (!this.#groupTreeRoot) {
            console.warn('Please make sure the new timeline data is processed before update the level positions.');
            return;
        }
        const levelCount = this.dataProvider.maxStackDepth();
        const groups = this.rawTimelineData?.groups || [];
        // Add an extra number in visibleLevelOffsets to store the end of last level
        this.visibleLevelOffsets = new Uint32Array(levelCount + 1);
        this.visibleLevelHeights = new Uint32Array(levelCount);
        this.visibleLevels = new Array(levelCount);
        // Add an extra number in groupOffsets to store the end of last group
        this.groupOffsets = new Uint32Array(groups.length + 1);
        let currentOffset = this.rulerEnabled ? RulerHeight + 2 : 2;
        // The root is always visible, so just simply set the |parentGroupIsVisible| to visible.
        currentOffset = this.#traverseGroupTreeAndUpdateLevelPositionsForTheGroup(this.#groupTreeRoot, currentOffset, /* parentGroupIsVisible= */ true);
        // Set the final offset to the last element of |groupOffsets| and
        // |visibleLevelOffsets|. This number represent the end of last group and
        // level.
        this.groupOffsets[groups.length] = currentOffset;
        this.visibleLevelOffsets[levelCount] = currentOffset;
    }
    isGroupCollapsible(index) {
        if (!this.rawTimelineData || index < 0) {
            return;
        }
        const groups = this.rawTimelineData.groups || [];
        const style = groups[index].style;
        if (style.collapsible === 1 /* GroupCollapsibleState.NEVER */) {
            return false;
        }
        if (!style.shareHeaderLine) {
            return style.collapsible === 0 /* GroupCollapsibleState.ALWAYS */;
        }
        const isLastGroup = index + 1 >= groups.length;
        if (style.collapsible === 2 /* GroupCollapsibleState.IF_MULTI_ROW */) {
            const nextRowStartLevel = isLastGroup ? this.dataProvider.maxStackDepth() : groups[index + 1].startLevel;
            const rowsInCurrentGroup = nextRowStartLevel - groups[index].startLevel;
            // If everything fits in one line, there's no need to offer the expand capability.
            if (rowsInCurrentGroup < 2) {
                return false;
            }
        }
        if (!isLastGroup && groups[index + 1].style.nestingLevel > style.nestingLevel) {
            return true;
        }
        const nextGroupLevel = isLastGroup ? this.dataProvider.maxStackDepth() : groups[index + 1].startLevel;
        if (nextGroupLevel !== groups[index].startLevel + 1) {
            return true;
        }
        // For groups that only have one line and share header line, pretend these are not collapsible
        // unless the itemsHeight does not match the headerHeight
        return style.height !== style.itemsHeight;
    }
    groupIsLastVisibleTopLevel(groupIndex) {
        if (groupIndex < 0 || !this.rawTimelineData) {
            return true;
        }
        const group = this.rawTimelineData.groups[groupIndex];
        const visibleTopLevelGroupNumber = this.#groupTreeRoot?.children.filter(track => !this.rawTimelineData?.groups[track.index].hidden).length;
        return visibleTopLevelGroupNumber === 1 && group.style.nestingLevel === 0 && !group.hidden;
    }
    setSelectedEntry(entryIndex) {
        // Check if the button that resets children of the entry is clicked. We need to check it even if the entry
        // clicked is not selected to avoid needing to double click
        if (this.isMouseOverRevealChildrenArrow(this.lastMouseOffsetX, entryIndex)) {
            this.modifyTree("RESET_CHILDREN" /* FilterAction.RESET_CHILDREN */, entryIndex);
        }
        if (this.selectedEntryIndex === entryIndex) {
            return;
        }
        if (entryIndex !== -1) {
            this.chartViewport.hideRangeSelection();
        }
        this.selectedEntryIndex = entryIndex;
        this.revealEntry(entryIndex);
        this.updateElementPosition(this.selectedElement, this.selectedEntryIndex);
        this.update();
    }
    entryHasDecoration(entryIndex, decorationType) {
        const timelineData = this.timelineData();
        if (!timelineData) {
            return false;
        }
        const decorationsForEvent = timelineData.entryDecorations.at(entryIndex);
        if (decorationsForEvent && decorationsForEvent.length >= 1) {
            return decorationsForEvent.some(decoration => decoration.type === decorationType);
        }
        return false;
    }
    getCustomDrawnPositionForEntryIndex(entryIndex) {
        const customPos = this.customDrawnPositions.get(entryIndex);
        if (customPos) {
            return customPos;
        }
        return this.markerPositions.get(entryIndex) ?? null;
    }
    /**
     * Update position of an Element. By default, the element is treated as a full entry and it's dimensions are set to the full entry width/length/height.
     * If isDecoration parameter is set to true, the element will be positioned on the right side of the entry and have a square shape where width == height of the entry.
     */
    updateElementPosition(element, entryIndex, isDecoration) {
        if (!element) {
            return;
        }
        const elementMinWidthPx = 2;
        element.classList.add('hidden');
        if (entryIndex === -1) {
            return;
        }
        const timelineData = this.timelineData();
        if (!timelineData) {
            return;
        }
        const startTime = timelineData.entryStartTimes[entryIndex];
        const duration = timelineData.entryTotalTimes[entryIndex];
        let barX = 0;
        let barWidth = 0;
        let visible = true;
        const customPos = this.customDrawnPositions.get(entryIndex);
        if (customPos) {
            barX = customPos.x;
            barWidth = customPos.width;
        }
        else if (Number.isNaN(duration)) {
            const position = this.markerPositions.get(entryIndex);
            if (position) {
                barX = position.x;
                barWidth = position.width;
            }
            else {
                visible = false;
            }
        }
        else {
            barX = this.chartViewport.timeToPosition(startTime);
            barWidth = duration * this.chartViewport.timeToPixel();
        }
        if (barX + barWidth <= 0 || barX >= this.offsetWidth) {
            return;
        }
        const barCenter = barX + barWidth / 2;
        barWidth = Math.max(barWidth, elementMinWidthPx);
        barX = barCenter - barWidth / 2;
        const entryLevel = timelineData.entryLevels[entryIndex];
        const barY = this.levelToOffset(entryLevel) - this.chartViewport.scrollOffset();
        const barHeight = this.levelHeight(entryLevel);
        const style = element.style;
        // TODO(paulirish): make these changes within a RenderCoordinator.write callback.
        // Currently these (plus the scrollOffset() right above) trigger layout thrashing.
        if (isDecoration) {
            style.top = barY + 'px';
            style.width = barHeight + 'px';
            style.height = barHeight + 'px';
            style.left = barX + barWidth - barHeight + 'px';
        }
        else {
            style.top = barY + 'px';
            style.width = barWidth + 'px';
            style.height = barHeight - 1 + 'px';
            style.left = barX + 'px';
        }
        element.classList.toggle('hidden', !visible);
        this.viewportElement.appendChild(element);
    }
    // Updates the highlight of an Arrow button that is shown on an entry if it has hidden child entries
    updateHiddenChildrenArrowHighlighPosition(entryIndex) {
        this.revealDescendantsArrowHighlightElement.classList.add('hidden');
        /**
         * No need to update the hidden descendants arrow highlight if
         * 1. No entry is highlighted
         * 2. Mouse is not hovering over the arrow button
         */
        if (entryIndex === -1 || !this.isMouseOverRevealChildrenArrow(this.lastMouseOffsetX, entryIndex)) {
            return;
        }
        this.updateElementPosition(this.revealDescendantsArrowHighlightElement, entryIndex, true);
    }
    timeToPositionClipped(time) {
        return Platform.NumberUtilities.clamp(this.chartViewport.timeToPosition(time), 0, this.offsetWidth);
    }
    /**
     * Returns the amount of pixels a group is vertically offset in the flame chart.
     * Now this function is only used for tests.
     */
    groupIndexToOffsetForTest(groupIndex) {
        if (!this.groupOffsets) {
            throw new Error('No visible group offsets');
        }
        return this.groupOffsets[groupIndex];
    }
    /**
     * Set the edit mode.
     * Now this function is only used for tests.
     */
    setEditModeForTest(editMode) {
        this.#inTrackConfigEditMode = editMode;
    }
    /**
     * Returns the visibility of a level in the.
     * flame chart.
     */
    levelIsVisible(level) {
        if (!this.visibleLevels) {
            throw new Error('No level visiblibities');
        }
        return this.visibleLevels[level];
    }
    /**
     * Returns the amount of pixels a level is vertically offset in the.
     * flame chart.
     */
    levelToOffset(level) {
        if (!this.visibleLevelOffsets) {
            throw new Error('No visible level offsets');
        }
        return this.visibleLevelOffsets[level];
    }
    levelHeight(level) {
        if (!this.visibleLevelHeights) {
            throw new Error('No visible level heights');
        }
        return this.visibleLevelHeights[level];
    }
    updateBoundaries() {
        this.totalTime = this.dataProvider.totalTime();
        this.#minimumBoundary = this.dataProvider.minimumBoundary();
        this.chartViewport.setBoundaries(this.#minimumBoundary, this.totalTime);
    }
    updateHeight() {
        this.chartViewport.setContentHeight(this.totalContentHeight());
    }
    /**
     * This is the total height that would be required to render the flame chart
     * with no overflows.
     */
    totalContentHeight() {
        return this.levelToOffset(this.dataProvider.maxStackDepth()) + 2;
    }
    onResize() {
        // Clear the rect cache because we have been resized.
        this.#canvasBoundingClientRect = null;
        this.scheduleUpdate();
    }
    setPersistedConfig(config) {
        this.#persistedGroupConfig = config;
    }
    update() {
        if (!this.timelineData()) {
            return;
        }
        this.updateHeight();
        this.updateBoundaries();
        this.draw();
        if (!this.chartViewport.isDragging()) {
            this.updateHighlight();
        }
    }
    // Reset the whole flame chart.
    // It will reset the viewport, which will reset the scrollTop and scrollLeft. So should be careful when call this
    // function. But when the data is "real" changed, especially when groups[] is changed, make sure call this before
    // re-rendering.
    // This will also clear all the selected entry, group, etc.
    // Remember to call |setWindowTimes| before draw the flame chart again.
    reset() {
        if (this.#inTrackConfigEditMode) {
            this.#removeEditModeButton();
            this.#inTrackConfigEditMode = false;
        }
        this.chartViewport.reset();
        this.rawTimelineData = null;
        this.rawTimelineDataLength = 0;
        this.#groupTreeRoot = null;
        this.dimIndices = null;
        this.colorDimmingCache.clear();
        this.highlightedMarkerIndex = -1;
        this.highlightedEntryIndex = -1;
        this.selectedEntryIndex = -1;
        this.selectedGroupIndex = -1;
        this.#persistedGroupConfig = null;
    }
    scheduleUpdate() {
        this.chartViewport.scheduleUpdate();
    }
    enabled() {
        return this.rawTimelineDataLength !== 0;
    }
    computePosition(time) {
        return this.chartViewport.timeToPosition(time);
    }
    formatValue(value, precision) {
        return this.dataProvider.formatValue(value - this.zeroTime(), precision);
    }
    maximumBoundary() {
        return Trace.Types.Timing.Milli(this.chartViewport.windowRightTime());
    }
    minimumBoundary() {
        return Trace.Types.Timing.Milli(this.chartViewport.windowLeftTime());
    }
    zeroTime() {
        return Trace.Types.Timing.Milli(this.dataProvider.minimumBoundary());
    }
    boundarySpan() {
        return Trace.Types.Timing.Milli(this.maximumBoundary() - this.minimumBoundary());
    }
    getDimIndices() {
        return this.dimIndices || null;
    }
}
export const RulerHeight = 15;
export const MinimalTimeWindowMs = 0.5;
// We have to ensure we draw the decorations in a particular order; warning
// triangles always go on top of any candy stripes.
const decorationDrawOrder = {
    CANDY: 1,
    WARNING_TRIANGLE: 2,
    HIDDEN_DESCENDANTS_ARROW: 3,
};
export function sortDecorationsForRenderingOrder(decorations) {
    decorations.sort((decoration1, decoration2) => {
        return decorationDrawOrder[decoration1.type] - decorationDrawOrder[decoration2.type];
    });
}
export class FlameChartTimelineData {
    entryLevels;
    entryTotalTimes;
    entryStartTimes;
    /**
     * An array of entry decorations, where each item in the array is an array of
     * decorations for the event at that index.
     **/
    entryDecorations;
    groups;
    /**
     * Markers are events with vertical lines that go down the entire timeline at their start time.
     * These are only used now in the Extensibility API; users can provide a
     * `marker` event
     * (https://developer.chrome.com/docs/devtools/performance/extension#inject_your_data_with_the_user_timings_api)
     * which will render with a vertical line.
     * If you are wondering what we use to draw page events like LCP, those are
     * done via the overlays system. In time, it probably makes sense to use the
     * overlays for e11y marker events too, and then we can remove markers from
     * TimelineData, rather than have two systems to build the same UI...
     */
    markers;
    // These four arrays are used to draw the initiator arrows, and if there are
    // multiple arrows, they should be a chain.
    initiatorsData;
    selectedGroup;
    constructor(entryLevels, entryTotalTimes, entryStartTimes, groups, entryDecorations = [], initiatorsData = []) {
        this.entryLevels = entryLevels;
        this.entryTotalTimes = entryTotalTimes;
        this.entryStartTimes = entryStartTimes;
        this.entryDecorations = entryDecorations;
        this.groups = groups || [];
        this.markers = [];
        this.initiatorsData = initiatorsData || [];
        this.selectedGroup = null;
    }
    // TODO(crbug.com/1501055) Thinking about refactor this class, so we can avoid create a new object when modifying the
    // flame chart.
    static create(data) {
        return new FlameChartTimelineData(data.entryLevels, data.entryTotalTimes, data.entryStartTimes, data.groups, data.entryDecorations || [], data.initiatorsData || []);
    }
    // TODO(crbug.com/1501055) Thinking about refactor this class, so we can avoid create a new object when modifying the
    // flame chart.
    static createEmpty() {
        return new FlameChartTimelineData([], // entry levels: what level on the timeline is an event on,
        [], // entry total times: the total duration of an event,
        [], // entry start times: the start time of a given event,
        []);
    }
    emptyInitiators() {
        this.initiatorsData = [];
    }
}
//# sourceMappingURL=FlameChart.js.map