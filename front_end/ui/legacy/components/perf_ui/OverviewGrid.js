// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as IconButton from '../../../components/icon_button/icon_button.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';
import overviewGridStyles from './overviewGrid.css.js';
import { TimelineGrid } from './TimelineGrid.js';
const UIStrings = {
    /**
     * @description Label for the window for Overview grids
     */
    overviewGridWindow: 'Overview grid window',
    /**
     * @description Label for left window resizer for Overview grids
     */
    leftResizer: 'Left Resizer',
    /**
     * @description Label for right window resizer for Overview grids
     */
    rightResizer: 'Right Resizer',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/perf_ui/OverviewGrid.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class OverviewGrid {
    element;
    grid;
    // The |window| will manage the html element of resizers, the left/right blue-colour curtain, and handle the resizing,
    // zooming, and breadcrumb creation.
    window;
    constructor(prefix, calculator) {
        this.element = document.createElement('div');
        this.element.id = prefix + '-overview-container';
        this.grid = new TimelineGrid();
        this.grid.element.id = prefix + '-overview-grid';
        this.grid.setScrollTop(0);
        this.element.appendChild(this.grid.element);
        this.window = new Window(this.element, this.grid.dividersLabelBarElement, calculator);
    }
    enableCreateBreadcrumbsButton() {
        return this.window.enableCreateBreadcrumbsButton();
    }
    set showingScreenshots(isShowing) {
        this.window.showingScreenshots = isShowing;
    }
    clientWidth() {
        return this.element.clientWidth;
    }
    updateDividers(calculator) {
        this.grid.updateDividers(calculator);
    }
    addEventDividers(dividers) {
        this.grid.addEventDividers(dividers);
    }
    removeEventDividers() {
        this.grid.removeEventDividers();
    }
    reset() {
        this.window.reset();
    }
    // The ratio of the left slider position compare to the whole overview grid.
    // It should be a number between 0 and 1.
    windowLeftRatio() {
        return this.window.windowLeftRatio || 0;
    }
    // The ratio of the right slider position compare to the whole overview grid.
    // It should be a number between 0 and 1.
    windowRightRatio() {
        return this.window.windowRightRatio || 0;
    }
    /**
     * This function will return the raw value of the slider window.
     * Since the OverviewGrid is used in Performance panel or Memory panel, the raw value can be in milliseconds or bytes.
     *
     * @returns the pair of start/end value of the slider window in milliseconds or bytes
     */
    calculateWindowValue() {
        return this.window.calculateWindowValue();
    }
    setWindowRatio(leftRatio, rightRatio) {
        this.window.setWindowRatio(leftRatio, rightRatio);
    }
    addEventListener(eventType, listener, thisObject) {
        return this.window.addEventListener(eventType, listener, thisObject);
    }
    setClickHandler(clickHandler) {
        this.window.setClickHandler(clickHandler);
    }
    zoom(zoomFactor, referencePoint) {
        this.window.zoom(zoomFactor, referencePoint);
    }
    setResizeEnabled(enabled) {
        this.window.setResizeEnabled(enabled);
    }
}
const MinSelectableSize = 14;
const WindowScrollSpeedFactor = .3;
const ResizerOffset = 5;
const OffsetFromWindowEnds = 10;
export class Window extends Common.ObjectWrapper.ObjectWrapper {
    parentElement;
    calculator;
    leftResizeElement;
    rightResizeElement;
    leftCurtainElement;
    rightCurtainElement;
    breadcrumbButtonContainerElement;
    createBreadcrumbButton;
    curtainsRange;
    breadcrumbZoomIcon;
    overviewWindowSelector;
    offsetLeft;
    dragStartPointPixel;
    dragStartLeftRatio;
    dragStartRightRatio;
    // The ratio of the left/right resizer position compare to the whole overview grid.
    // They should be a number between 0 and 1.
    windowLeftRatio = 0;
    windowRightRatio = 1;
    resizeEnabled;
    clickHandler;
    resizerParentOffsetLeft;
    #breadcrumbsEnabled = false;
    #mouseOverGridOverview = false;
    constructor(parentElement, dividersLabelBarElement, calculator) {
        super();
        this.parentElement = parentElement;
        this.parentElement.classList.add('parent-element');
        UI.ARIAUtils.markAsGroup(this.parentElement);
        this.calculator = calculator;
        UI.ARIAUtils.setLabel(this.parentElement, i18nString(UIStrings.overviewGridWindow));
        UI.UIUtils.installDragHandle(this.parentElement, this.startWindowSelectorDragging.bind(this), this.windowSelectorDragging.bind(this), this.endWindowSelectorDragging.bind(this), 'text', null);
        if (dividersLabelBarElement) {
            UI.UIUtils.installDragHandle(dividersLabelBarElement, this.startWindowDragging.bind(this), this.windowDragging.bind(this), null, '-webkit-grabbing', '-webkit-grab');
        }
        this.parentElement.addEventListener('wheel', this.onMouseWheel.bind(this), true);
        this.parentElement.addEventListener('dblclick', this.resizeWindowMaximum.bind(this), true);
        UI.DOMUtilities.appendStyle(this.parentElement, overviewGridStyles);
        this.leftResizeElement = parentElement.createChild('div', 'overview-grid-window-resizer');
        UI.UIUtils.installDragHandle(this.leftResizeElement, this.resizerElementStartDragging.bind(this), this.leftResizeElementDragging.bind(this), null, 'ew-resize');
        this.rightResizeElement = parentElement.createChild('div', 'overview-grid-window-resizer');
        UI.UIUtils.installDragHandle(this.rightResizeElement, this.resizerElementStartDragging.bind(this), this.rightResizeElementDragging.bind(this), null, 'ew-resize');
        UI.ARIAUtils.setLabel(this.leftResizeElement, i18nString(UIStrings.leftResizer));
        UI.ARIAUtils.markAsSlider(this.leftResizeElement);
        const leftKeyDown = (event) => this.handleKeyboardResizing(event, false);
        this.leftResizeElement.addEventListener('keydown', leftKeyDown);
        this.leftResizeElement.addEventListener('click', this.onResizerClicked);
        UI.ARIAUtils.setLabel(this.rightResizeElement, i18nString(UIStrings.rightResizer));
        UI.ARIAUtils.markAsSlider(this.rightResizeElement);
        const rightKeyDown = (event) => this.handleKeyboardResizing(event, true);
        this.rightResizeElement.addEventListener('keydown', rightKeyDown);
        this.rightResizeElement.addEventListener('focus', this.onRightResizeElementFocused.bind(this));
        this.rightResizeElement.addEventListener('click', this.onResizerClicked);
        this.leftCurtainElement = parentElement.createChild('div', 'window-curtain-left');
        this.rightCurtainElement = parentElement.createChild('div', 'window-curtain-right');
        this.breadcrumbButtonContainerElement = parentElement.createChild('div', 'create-breadcrumb-button-container');
        this.createBreadcrumbButton = this.breadcrumbButtonContainerElement.createChild('div', 'create-breadcrumb-button');
        this.createBreadcrumbButton.setAttribute('jslog', `${VisualLogging.action('timeline.create-breadcrumb').track({ click: true })}`);
        this.reset();
    }
    enableCreateBreadcrumbsButton() {
        this.curtainsRange = this.createBreadcrumbButton.createChild('div');
        this.breadcrumbZoomIcon = IconButton.Icon.create('zoom-in');
        this.createBreadcrumbButton.appendChild(this.breadcrumbZoomIcon);
        this.createBreadcrumbButton.addEventListener('click', () => {
            this.#createBreadcrumb();
        });
        this.#breadcrumbsEnabled = true;
        this.#changeBreadcrumbButtonVisibilityOnInteraction(this.parentElement);
        this.#changeBreadcrumbButtonVisibilityOnInteraction(this.rightResizeElement);
        this.#changeBreadcrumbButtonVisibilityOnInteraction(this.leftResizeElement);
        return this.breadcrumbButtonContainerElement;
    }
    set showingScreenshots(isShowing) {
        this.breadcrumbButtonContainerElement.classList.toggle('with-screenshots', isShowing);
    }
    #changeBreadcrumbButtonVisibilityOnInteraction(element) {
        if (!this.#breadcrumbsEnabled) {
            return;
        }
        element.addEventListener('mouseover', () => {
            if (this.windowLeftRatio <= 0 && this.windowRightRatio >= 1) {
                this.breadcrumbButtonContainerElement.classList.toggle('is-breadcrumb-button-visible', false);
                this.#mouseOverGridOverview = false;
            }
            else {
                this.breadcrumbButtonContainerElement.classList.toggle('is-breadcrumb-button-visible', true);
                this.#mouseOverGridOverview = true;
            }
        });
        element.addEventListener('mouseout', () => {
            this.breadcrumbButtonContainerElement.classList.toggle('is-breadcrumb-button-visible', false);
            this.#mouseOverGridOverview = false;
        });
    }
    onResizerClicked(event) {
        if (event.target) {
            event.target.focus();
        }
    }
    onRightResizeElementFocused() {
        // To prevent browser focus from scrolling the element into view and shifting the contents of the strip
        this.parentElement.scrollLeft = 0;
    }
    reset() {
        this.windowLeftRatio = 0;
        this.windowRightRatio = 1;
        this.setResizeEnabled(true);
        this.updateCurtains();
    }
    setResizeEnabled(resizeEnabled) {
        this.resizeEnabled = resizeEnabled;
        this.rightResizeElement.tabIndex = resizeEnabled ? 0 : -1;
        this.leftResizeElement.tabIndex = resizeEnabled ? 0 : -1;
    }
    setClickHandler(clickHandler) {
        this.clickHandler = clickHandler;
    }
    resizerElementStartDragging(event) {
        const mouseEvent = event;
        const target = event.target;
        if (!this.resizeEnabled) {
            return false;
        }
        this.resizerParentOffsetLeft = mouseEvent.pageX - mouseEvent.offsetX - target.offsetLeft;
        event.stopPropagation();
        return true;
    }
    leftResizeElementDragging(event) {
        const mouseEvent = event;
        this.resizeWindowLeft(mouseEvent.pageX - (this.resizerParentOffsetLeft || 0));
        event.preventDefault();
    }
    rightResizeElementDragging(event) {
        const mouseEvent = event;
        this.resizeWindowRight(mouseEvent.pageX - (this.resizerParentOffsetLeft || 0));
        event.preventDefault();
    }
    handleKeyboardResizing(event, moveRightResizer) {
        const keyboardEvent = event;
        const target = event.target;
        let increment = false;
        if (keyboardEvent.key === 'ArrowLeft' || keyboardEvent.key === 'ArrowRight') {
            if (keyboardEvent.key === 'ArrowRight') {
                increment = true;
            }
            const newPos = this.getNewResizerPosition(target.offsetLeft, increment, keyboardEvent.ctrlKey);
            if (moveRightResizer) {
                this.resizeWindowRight(newPos);
            }
            else {
                this.resizeWindowLeft(newPos);
            }
            event.consume(true);
        }
    }
    getNewResizerPosition(offset, increment, ctrlPressed) {
        let newPos;
        // We shift by 10px if the ctrlKey is pressed and 2 otherwise.  1px shifts result in noOp due to rounding in updateCurtains
        let pixelsToShift = ctrlPressed ? 10 : 2;
        pixelsToShift = increment ? pixelsToShift : -Math.abs(pixelsToShift);
        const offsetLeft = offset + ResizerOffset;
        newPos = offsetLeft + pixelsToShift;
        if (increment && newPos < OffsetFromWindowEnds) {
            // When incrementing, snap to the window offset value (10px) if the new position is between 0px and 10px
            newPos = OffsetFromWindowEnds;
        }
        else if (!increment && newPos > this.parentElement.clientWidth - OffsetFromWindowEnds) {
            // When decrementing, snap to the window offset value (10px) from the rightmost side if the new position is within 10px from the end.
            newPos = this.parentElement.clientWidth - OffsetFromWindowEnds;
        }
        return newPos;
    }
    startWindowSelectorDragging(event) {
        if (!this.resizeEnabled) {
            return false;
        }
        const mouseEvent = event;
        this.offsetLeft = this.parentElement.getBoundingClientRect().left;
        const position = mouseEvent.x - this.offsetLeft;
        this.overviewWindowSelector = new WindowSelector(this.parentElement, position);
        return true;
    }
    windowSelectorDragging(event) {
        this.#mouseOverGridOverview = true;
        if (!this.overviewWindowSelector) {
            return;
        }
        const mouseEvent = event;
        this.overviewWindowSelector.updatePosition(mouseEvent.x - this.offsetLeft);
        event.preventDefault();
    }
    endWindowSelectorDragging(event) {
        if (!this.overviewWindowSelector) {
            return;
        }
        const mouseEvent = event;
        const window = this.overviewWindowSelector.close(mouseEvent.x - this.offsetLeft);
        // prevent selecting a window on clicking the minimap if breadcrumbs are enabled
        if (this.#breadcrumbsEnabled && window.start === window.end) {
            return;
        }
        delete this.overviewWindowSelector;
        const clickThreshold = 3;
        if (window.end - window.start < clickThreshold) {
            if (this.clickHandler?.call(null, event)) {
                return;
            }
            const middle = window.end;
            window.start = Math.max(0, middle - MinSelectableSize / 2);
            window.end = Math.min(this.parentElement.clientWidth, middle + MinSelectableSize / 2);
        }
        else if (window.end - window.start < MinSelectableSize) {
            if (this.parentElement.clientWidth - window.end > MinSelectableSize) {
                window.end = window.start + MinSelectableSize;
            }
            else {
                window.start = window.end - MinSelectableSize;
            }
        }
        this.setWindowPosition(window.start, window.end);
    }
    startWindowDragging(event) {
        const mouseEvent = event;
        this.dragStartPointPixel = mouseEvent.pageX;
        this.dragStartLeftRatio = this.windowLeftRatio;
        this.dragStartRightRatio = this.windowRightRatio;
        event.stopPropagation();
        return true;
    }
    windowDragging(event) {
        this.#mouseOverGridOverview = true;
        if (this.#breadcrumbsEnabled) {
            this.breadcrumbButtonContainerElement.classList.toggle('is-breadcrumb-button-visible', true);
        }
        const mouseEvent = event;
        mouseEvent.preventDefault();
        let delta = (mouseEvent.pageX - this.dragStartPointPixel) / this.parentElement.clientWidth;
        if (this.dragStartLeftRatio + delta < 0) {
            delta = -this.dragStartLeftRatio;
        }
        if (this.dragStartRightRatio + delta > 1) {
            delta = 1 - this.dragStartRightRatio;
        }
        this.setWindowRatio(this.dragStartLeftRatio + delta, this.dragStartRightRatio + delta);
    }
    resizeWindowLeft(start) {
        this.#mouseOverGridOverview = true;
        // Glue to edge.
        if (start < OffsetFromWindowEnds) {
            start = 0;
        }
        else if (start > this.rightResizeElement.offsetLeft - 4) {
            start = this.rightResizeElement.offsetLeft - 4;
        }
        this.setWindowPosition(start, null);
    }
    resizeWindowRight(end) {
        this.#mouseOverGridOverview = true;
        // Glue to edge.
        if (end > this.parentElement.clientWidth - OffsetFromWindowEnds) {
            end = this.parentElement.clientWidth;
        }
        else if (end < this.leftResizeElement.offsetLeft + MinSelectableSize) {
            end = this.leftResizeElement.offsetLeft + MinSelectableSize;
        }
        this.setWindowPosition(null, end);
    }
    resizeWindowMaximum() {
        this.setWindowPosition(0, this.parentElement.clientWidth);
    }
    /**
     * This function will return the raw value of the give slider.
     * Since the OverviewGrid is used in Performance panel or Memory panel, the raw value can be in milliseconds or bytes.
     * @param leftSlider if this slider is the left one
     * @returns the value in milliseconds or bytes
     */
    getRawSliderValue(leftSlider) {
        if (!this.calculator) {
            throw new Error('No calculator to calculate boundaries');
        }
        const minimumValue = this.calculator.minimumBoundary();
        const valueSpan = this.calculator.maximumBoundary() - minimumValue;
        if (leftSlider) {
            return minimumValue + valueSpan * this.windowLeftRatio;
        }
        return minimumValue + valueSpan * this.windowRightRatio;
    }
    updateResizeElementAriaValue(leftPercentValue, rightPercentValue) {
        const roundedLeftValue = leftPercentValue.toFixed(2);
        const roundedRightValue = rightPercentValue.toFixed(2);
        UI.ARIAUtils.setAriaValueNow(this.leftResizeElement, roundedLeftValue);
        UI.ARIAUtils.setAriaValueNow(this.rightResizeElement, roundedRightValue);
        // Left and right sliders cannot be within 0.5% of each other (Range of AriaValueMin/Max/Now is from 0-100).
        const leftResizeCeiling = Number(roundedRightValue) - 0.5;
        const rightResizeFloor = Number(roundedLeftValue) + 0.5;
        UI.ARIAUtils.setAriaValueMinMax(this.leftResizeElement, '0', leftResizeCeiling.toString());
        UI.ARIAUtils.setAriaValueMinMax(this.rightResizeElement, rightResizeFloor.toString(), '100');
    }
    updateResizeElementPositionLabels() {
        if (!this.calculator) {
            return;
        }
        const startValue = this.calculator.formatValue(this.getRawSliderValue(/* leftSlider */ true));
        const endValue = this.calculator.formatValue(this.getRawSliderValue(/* leftSlider */ false));
        UI.ARIAUtils.setAriaValueText(this.leftResizeElement, String(startValue));
        UI.ARIAUtils.setAriaValueText(this.rightResizeElement, String(endValue));
    }
    updateResizeElementPercentageLabels(leftValue, rightValue) {
        UI.ARIAUtils.setAriaValueText(this.leftResizeElement, leftValue);
        UI.ARIAUtils.setAriaValueText(this.rightResizeElement, rightValue);
    }
    /**
     * This function will return the raw value of the slider window.
     * Since the OverviewGrid is used in Performance panel or Memory panel, the raw value can be in milliseconds or bytes.
     *
     * @returns the pair of start/end value of the slider window in milliseconds or bytes
     */
    calculateWindowValue() {
        return {
            rawStartValue: this.getRawSliderValue(/* leftSlider */ true),
            rawEndValue: this.getRawSliderValue(/* leftSlider */ false),
        };
    }
    setWindowRatio(windowLeftRatio, windowRightRatio) {
        this.windowLeftRatio = windowLeftRatio;
        this.windowRightRatio = windowRightRatio;
        this.updateCurtains();
        if (this.calculator) {
            this.dispatchEventToListeners("WindowChangedWithPosition" /* Events.WINDOW_CHANGED_WITH_POSITION */, this.calculateWindowValue());
        }
        this.dispatchEventToListeners("WindowChanged" /* Events.WINDOW_CHANGED */);
        this.#changeBreadcrumbButtonVisibility(windowLeftRatio, windowRightRatio);
    }
    // "Create breadcrumb" button is only visible when the window is set to
    // something other than the full range and mouse is hovering over the MiniMap
    #changeBreadcrumbButtonVisibility(windowLeftRatio, windowRightRatio) {
        if (!this.#breadcrumbsEnabled) {
            return;
        }
        if ((windowRightRatio >= 1 && windowLeftRatio <= 0) || !this.#mouseOverGridOverview) {
            this.breadcrumbButtonContainerElement.classList.toggle('is-breadcrumb-button-visible', false);
        }
        else {
            this.breadcrumbButtonContainerElement.classList.toggle('is-breadcrumb-button-visible', true);
        }
    }
    #createBreadcrumb() {
        this.dispatchEventToListeners("BreadcrumbAdded" /* Events.BREADCRUMB_ADDED */, this.calculateWindowValue());
    }
    updateCurtains() {
        const windowLeftRatio = this.windowLeftRatio;
        const windowRightRatio = this.windowRightRatio;
        let leftRatio = windowLeftRatio;
        let rightRatio = windowRightRatio;
        const widthRatio = rightRatio - leftRatio;
        // OverviewGrids that are instantiated before the parentElement is shown will have a parent element client width of 0 which throws off the 'factor' calculation
        if (this.parentElement.clientWidth !== 0) {
            // We allow actual time window to be arbitrarily small but don't want the UI window to be too small.
            const widthInPixels = widthRatio * this.parentElement.clientWidth;
            const minWidthInPixels = MinSelectableSize / 2;
            if (widthInPixels < minWidthInPixels) {
                const factor = minWidthInPixels / widthInPixels;
                leftRatio = ((windowRightRatio + windowLeftRatio) - widthRatio * factor) / 2;
                rightRatio = ((windowRightRatio + windowLeftRatio) + widthRatio * factor) / 2;
            }
        }
        const leftResizerPercLeftOffset = (100 * leftRatio);
        const rightResizerPercLeftOffset = (100 * rightRatio);
        const rightResizerPercRightOffset = (100 - (100 * rightRatio));
        const leftResizerPercLeftOffsetString = leftResizerPercLeftOffset + '%';
        const rightResizerPercLeftOffsetString = rightResizerPercLeftOffset + '%';
        this.leftResizeElement.style.left = leftResizerPercLeftOffsetString;
        this.rightResizeElement.style.left = rightResizerPercLeftOffsetString;
        this.leftCurtainElement.style.width = leftResizerPercLeftOffsetString;
        this.rightCurtainElement.style.width = rightResizerPercRightOffset + '%';
        this.breadcrumbButtonContainerElement.style.marginLeft =
            (leftResizerPercLeftOffset > 0) ? leftResizerPercLeftOffset + '%' : '0%';
        this.breadcrumbButtonContainerElement.style.marginRight =
            (rightResizerPercRightOffset > 0) ? rightResizerPercRightOffset + '%' : '0%';
        if (this.curtainsRange) {
            this.curtainsRange.textContent = this.getWindowRange().toFixed(0) + ' ms';
        }
        this.updateResizeElementAriaValue(leftResizerPercLeftOffset, rightResizerPercLeftOffset);
        if (this.calculator) {
            this.updateResizeElementPositionLabels();
        }
        else {
            this.updateResizeElementPercentageLabels(leftResizerPercLeftOffsetString, rightResizerPercLeftOffsetString);
        }
        this.toggleBreadcrumbZoomButtonDisplay();
    }
    toggleBreadcrumbZoomButtonDisplay() {
        if (this.breadcrumbZoomIcon) {
            // disable button that creates breadcrumbs and hide the zoom icon
            // when the selected window is smaller than 4.5 ms
            // 4.5 is rounded to 5 in the UI
            if (this.getWindowRange() < 4.5) {
                this.breadcrumbZoomIcon.style.display = 'none';
                this.breadcrumbButtonContainerElement.style.pointerEvents = 'none';
            }
            else {
                this.breadcrumbZoomIcon.style.display = 'flex';
                this.breadcrumbButtonContainerElement.style.pointerEvents = 'auto';
            }
        }
    }
    getWindowRange() {
        if (!this.calculator) {
            throw new Error('No calculator to calculate window range');
        }
        const leftRatio = this.windowLeftRatio > 0 ? this.windowLeftRatio : 0;
        const rightRatio = this.windowRightRatio < 1 ? this.windowRightRatio : 1;
        return (this.calculator.boundarySpan() * (rightRatio - leftRatio));
    }
    setWindowPosition(startPixel, endPixel) {
        const clientWidth = this.parentElement.clientWidth;
        const windowLeft = typeof startPixel === 'number' ? startPixel / clientWidth : this.windowLeftRatio;
        const windowRight = typeof endPixel === 'number' ? endPixel / clientWidth : this.windowRightRatio;
        this.setWindowRatio(windowLeft || 0, windowRight || 0);
    }
    onMouseWheel(event) {
        const wheelEvent = event;
        if (!this.resizeEnabled) {
            return;
        }
        if (wheelEvent.deltaY) {
            const zoomFactor = 1.1;
            const wheelZoomSpeed = 1 / 53;
            const reference = wheelEvent.offsetX / this.parentElement.clientWidth;
            this.zoom(Math.pow(zoomFactor, wheelEvent.deltaY * wheelZoomSpeed), reference);
        }
        if (wheelEvent.deltaX) {
            let offset = Math.round(wheelEvent.deltaX * WindowScrollSpeedFactor);
            const windowLeftPixel = this.leftResizeElement.offsetLeft + ResizerOffset;
            const windowRightPixel = this.rightResizeElement.offsetLeft + ResizerOffset;
            if (windowLeftPixel - offset < 0) {
                offset = windowLeftPixel;
            }
            if (windowRightPixel - offset > this.parentElement.clientWidth) {
                offset = windowRightPixel - this.parentElement.clientWidth;
            }
            this.setWindowPosition(windowLeftPixel - offset, windowRightPixel - offset);
            wheelEvent.preventDefault();
        }
    }
    zoom(factor, reference) {
        let leftRatio = this.windowLeftRatio || 0;
        let rightRatio = this.windowRightRatio || 0;
        const windowSizeRatio = rightRatio - leftRatio;
        let newWindowSizeRatio = factor * windowSizeRatio;
        if (newWindowSizeRatio > 1) {
            newWindowSizeRatio = 1;
            factor = newWindowSizeRatio / windowSizeRatio;
        }
        leftRatio = reference + (leftRatio - reference) * factor;
        leftRatio = Platform.NumberUtilities.clamp(leftRatio, 0, 1 - newWindowSizeRatio);
        rightRatio = reference + (rightRatio - reference) * factor;
        rightRatio = Platform.NumberUtilities.clamp(rightRatio, newWindowSizeRatio, 1);
        this.setWindowRatio(leftRatio, rightRatio);
    }
}
export class WindowSelector {
    startPosition;
    width;
    windowSelector;
    constructor(parent, position) {
        this.startPosition = position;
        this.width = parent.offsetWidth;
        this.windowSelector = document.createElement('div');
        this.windowSelector.className = 'overview-grid-window-selector';
        this.windowSelector.style.left = this.startPosition + 'px';
        this.windowSelector.style.right = this.width - this.startPosition + 'px';
        parent.appendChild(this.windowSelector);
    }
    close(position) {
        position = Math.max(0, Math.min(position, this.width));
        this.windowSelector.remove();
        return this.startPosition < position ? { start: this.startPosition, end: position } :
            { start: position, end: this.startPosition };
    }
    updatePosition(position) {
        position = Math.max(0, Math.min(position, this.width));
        if (position < this.startPosition) {
            this.windowSelector.style.left = position + 'px';
            this.windowSelector.style.right = this.width - this.startPosition + 'px';
        }
        else {
            this.windowSelector.style.left = this.startPosition + 'px';
            this.windowSelector.style.right = this.width - position + 'px';
        }
    }
}
//# sourceMappingURL=OverviewGrid.js.map