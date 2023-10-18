/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as TraceEngine from '../../../../models/trace/trace.js';
import * as IconButton from '../../../components/icon_button/icon_button.js';
import * as UI from '../../legacy.js';
import * as ThemeSupport from '../../theme_support/theme_support.js';

import overviewGridStyles from './overviewGrid.css.legacy.js';
import {type Calculator, TimelineGrid} from './TimelineGrid.js';

const UIStrings = {
  /**
   *@description Label for the window for Overview grids
   */
  overviewGridWindow: 'Overview grid window',
  /**
   *@description Label for left window resizer for Overview grids
   */
  leftResizer: 'Left Resizer',
  /**
   *@description Label for right window resizer for Overview grids
   */
  rightResizer: 'Right Resizer',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/perf_ui/OverviewGrid.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class OverviewGrid {
  element: HTMLDivElement;
  private readonly grid: TimelineGrid;
  private readonly window: Window;
  constructor(prefix: string, calculator?: Calculator) {
    this.element = document.createElement('div');
    this.element.id = prefix + '-overview-container';

    this.grid = new TimelineGrid();
    this.grid.element.id = prefix + '-overview-grid';
    this.grid.setScrollTop(0);

    this.element.appendChild(this.grid.element);

    this.window = new Window(this.element, this.grid.dividersLabelBarElement, calculator);
  }

  enableCreateBreadcrumbsButton(): void {
    this.window.enableCreateBreadcrumbsButton();
  }

  clientWidth(): number {
    return this.element.clientWidth;
  }

  updateDividers(calculator: Calculator): void {
    this.grid.updateDividers(calculator);
  }

  addEventDividers(dividers: Element[]): void {
    this.grid.addEventDividers(dividers);
  }

  removeEventDividers(): void {
    this.grid.removeEventDividers();
  }

  reset(): void {
    this.window.reset();
  }

  windowLeft(): number {
    return this.window.windowLeft || 0;
  }

  windowRight(): number {
    return this.window.windowRight || 0;
  }

  setWindow(left: number, right: number): void {
    this.window.setWindow(left, right);
  }

  addEventListener<T extends keyof EventTypes>(
      eventType: T, listener: Common.EventTarget.EventListener<EventTypes, T>,
      thisObject?: Object): Common.EventTarget.EventDescriptor {
    return this.window.addEventListener(eventType, listener, thisObject);
  }

  setClickHandler(clickHandler: ((arg0: Event) => boolean)|null): void {
    this.window.setClickHandler(clickHandler);
  }

  zoom(zoomFactor: number, referencePoint: number): void {
    this.window.zoom(zoomFactor, referencePoint);
  }

  setResizeEnabled(enabled: boolean): void {
    this.window.setEnabled(enabled);
  }
}

export const MinSelectableSize = 14;
export const WindowScrollSpeedFactor = .3;
export const ResizerOffset = 3.5;  // half pixel because offset values are not rounded but ceiled
export const OffsetFromWindowEnds = 10;

export class Window extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  private parentElement: Element;
  private calculator: Calculator|undefined;
  private leftResizeElement: HTMLElement;
  private rightResizeElement: HTMLElement;
  private leftCurtainElement: HTMLElement;
  private rightCurtainElement: HTMLElement;
  private breadcrumbButtonContainerElement: HTMLElement;
  private createBreadcrumbButton: HTMLElement;
  private curtainsRange?: HTMLElement;
  private breadcrumbZoomIcon?: IconButton.Icon.Icon;

  private overviewWindowSelector!: WindowSelector|undefined;
  private offsetLeft!: number;
  private dragStartPoint!: number;
  private dragStartLeft!: number;
  private dragStartRight!: number;
  windowLeft?: number;
  windowRight?: number;
  private enabled?: boolean;
  private clickHandler?: ((arg0: Event) => boolean)|null;
  private resizerParentOffsetLeft?: number;
  private breadcrumbsEnabled: boolean = false;
  #mouseOverGridFirstTime: boolean = false;
  constructor(parentElement: Element, dividersLabelBarElement?: Element, calculator?: Calculator) {
    super();
    this.parentElement = parentElement;
    this.parentElement.classList.add('parent-element');
    UI.ARIAUtils.markAsGroup(this.parentElement);
    this.calculator = calculator;

    UI.ARIAUtils.setLabel(this.parentElement, i18nString(UIStrings.overviewGridWindow));

    UI.UIUtils.installDragHandle(
        this.parentElement, this.startWindowSelectorDragging.bind(this), this.windowSelectorDragging.bind(this),
        this.endWindowSelectorDragging.bind(this), 'text', null);
    if (dividersLabelBarElement) {
      UI.UIUtils.installDragHandle(
          dividersLabelBarElement, this.startWindowDragging.bind(this), this.windowDragging.bind(this), null,
          '-webkit-grabbing', '-webkit-grab');
    }

    this.parentElement.addEventListener('wheel', this.onMouseWheel.bind(this), true);
    this.parentElement.addEventListener('dblclick', this.resizeWindowMaximum.bind(this), true);
    ThemeSupport.ThemeSupport.instance().appendStyle(this.parentElement, overviewGridStyles);

    this.leftResizeElement = parentElement.createChild('div', 'overview-grid-window-resizer') as HTMLElement;
    UI.UIUtils.installDragHandle(
        this.leftResizeElement, this.resizerElementStartDragging.bind(this), this.leftResizeElementDragging.bind(this),
        null, 'ew-resize');
    this.rightResizeElement = (parentElement.createChild('div', 'overview-grid-window-resizer') as HTMLElement);
    UI.UIUtils.installDragHandle(
        this.rightResizeElement, this.resizerElementStartDragging.bind(this),
        this.rightResizeElementDragging.bind(this), null, 'ew-resize');

    UI.ARIAUtils.setLabel(this.leftResizeElement, i18nString(UIStrings.leftResizer));
    UI.ARIAUtils.markAsSlider(this.leftResizeElement);
    const leftKeyDown = (event: Event): void => this.handleKeyboardResizing(event, false);
    this.leftResizeElement.addEventListener('keydown', leftKeyDown);

    UI.ARIAUtils.setLabel(this.rightResizeElement, i18nString(UIStrings.rightResizer));
    UI.ARIAUtils.markAsSlider(this.rightResizeElement);

    const rightKeyDown = (event: Event): void => this.handleKeyboardResizing(event, true);
    this.rightResizeElement.addEventListener('keydown', rightKeyDown);
    this.rightResizeElement.addEventListener('focus', this.onRightResizeElementFocused.bind(this));
    this.leftCurtainElement = (parentElement.createChild('div', 'window-curtain-left') as HTMLElement);
    this.rightCurtainElement = (parentElement.createChild('div', 'window-curtain-right') as HTMLElement);

    this.breadcrumbButtonContainerElement =
        (parentElement.createChild('div', 'create-breadcrumb-button-container') as HTMLElement);
    this.createBreadcrumbButton =
        (this.breadcrumbButtonContainerElement.createChild('div', 'create-breadcrumb-button') as HTMLElement);
    this.reset();
  }

  enableCreateBreadcrumbsButton(): void {
    this.curtainsRange = (this.createBreadcrumbButton.createChild('div') as HTMLElement);
    this.breadcrumbZoomIcon = new IconButton.Icon.Icon();
    this.breadcrumbZoomIcon.data = {
      iconName: 'zoom-in',
      color: 'var(--icon-default)',
      width: '20px',
      height: '20px',
    };
    this.createBreadcrumbButton.appendChild(this.breadcrumbZoomIcon);
    this.createBreadcrumbButton.addEventListener('click', () => {
      this.createBreadcrumb();
    });

    this.breadcrumbsEnabled = true;

    this.changeBreadcrumbButtonVisibilityOnInteraction(this.parentElement);
    this.changeBreadcrumbButtonVisibilityOnInteraction(this.rightResizeElement);
    this.changeBreadcrumbButtonVisibilityOnInteraction(this.leftResizeElement);
  }

  changeBreadcrumbButtonVisibilityOnInteraction(element: Element): void {
    element.addEventListener('mouseover', () => {
      this.#mouseOverGridFirstTime = true;
      if ((this.windowLeft ?? 0) <= 0 && (this.windowRight ?? 1) >= 1) {
        this.breadcrumbButtonContainerElement.style.visibility = 'hidden';
      } else {
        this.breadcrumbButtonContainerElement.style.visibility = 'visible';
      }
    });

    element.addEventListener('mouseout', () => {
      this.breadcrumbButtonContainerElement.style.visibility = 'hidden';
    });
  }

  private onRightResizeElementFocused(): void {
    // To prevent browser focus from scrolling the element into view and shifting the contents of the strip
    this.parentElement.scrollLeft = 0;
  }

  reset(): void {
    this.#mouseOverGridFirstTime = false;
    this.windowLeft = 0.0;
    this.windowRight = 1.0;
    this.setEnabled(true);
    this.updateCurtains();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.rightResizeElement.tabIndex = enabled ? 0 : -1;
    this.leftResizeElement.tabIndex = enabled ? 0 : -1;
  }

  setClickHandler(clickHandler: ((arg0: Event) => boolean)|null): void {
    this.clickHandler = clickHandler;
  }

  private resizerElementStartDragging(event: Event): boolean {
    const mouseEvent = (event as MouseEvent);
    const target = (event.target as HTMLElement);
    if (!this.enabled) {
      return false;
    }
    this.resizerParentOffsetLeft = mouseEvent.pageX - mouseEvent.offsetX - target.offsetLeft;
    event.stopPropagation();
    return true;
  }

  private leftResizeElementDragging(event: Event): void {
    const mouseEvent = (event as MouseEvent);
    this.resizeWindowLeft(mouseEvent.pageX - (this.resizerParentOffsetLeft || 0));
    event.preventDefault();
  }

  private rightResizeElementDragging(event: Event): void {
    const mouseEvent = (event as MouseEvent);
    this.resizeWindowRight(mouseEvent.pageX - (this.resizerParentOffsetLeft || 0));
    event.preventDefault();
  }

  private handleKeyboardResizing(event: Event, moveRightResizer?: boolean): void {
    const keyboardEvent = (event as KeyboardEvent);
    const target = (event.target as HTMLElement);
    let increment = false;
    if (keyboardEvent.key === 'ArrowLeft' || keyboardEvent.key === 'ArrowRight') {
      if (keyboardEvent.key === 'ArrowRight') {
        increment = true;
      }
      const newPos = this.getNewResizerPosition(target.offsetLeft, increment, keyboardEvent.ctrlKey);
      if (moveRightResizer) {
        this.resizeWindowRight(newPos);
      } else {
        this.resizeWindowLeft(newPos);
      }
      event.consume(true);
    }
  }

  private getNewResizerPosition(offset: number, increment?: boolean, ctrlPressed?: boolean): number {
    let newPos;
    // We shift by 10px if the ctrlKey is pressed and 2 otherwise.  1px shifts result in noOp due to rounding in updateCurtains
    let pixelsToShift: number|(2 | 10) = ctrlPressed ? 10 : 2;
    pixelsToShift = increment ? pixelsToShift : -Math.abs(pixelsToShift);
    const offsetLeft = offset + ResizerOffset;
    newPos = offsetLeft + pixelsToShift;
    if (increment && newPos < OffsetFromWindowEnds) {
      // When incrementing, snap to the window offset value (10px) if the new position is between 0px and 10px
      newPos = OffsetFromWindowEnds;
    } else if (!increment && newPos > this.parentElement.clientWidth - OffsetFromWindowEnds) {
      // When decrementing, snap to the window offset value (10px) from the rightmost side if the new position is within 10px from the end.
      newPos = this.parentElement.clientWidth - OffsetFromWindowEnds;
    }

    return newPos;
  }

  private startWindowSelectorDragging(event: Event): boolean {
    if (!this.enabled) {
      return false;
    }
    const mouseEvent = (event as MouseEvent);
    this.offsetLeft = this.parentElement.getBoundingClientRect().left;
    const position = mouseEvent.x - this.offsetLeft;
    this.overviewWindowSelector = new WindowSelector(this.parentElement, position);
    return true;
  }

  private windowSelectorDragging(event: Event): void {
    if (!this.overviewWindowSelector) {
      return;
    }
    const mouseEvent = (event as MouseEvent);
    this.overviewWindowSelector.updatePosition(mouseEvent.x - this.offsetLeft);
    event.preventDefault();
  }

  private endWindowSelectorDragging(event: Event): void {
    if (!this.overviewWindowSelector) {
      return;
    }
    const mouseEvent = (event as MouseEvent);
    const window = this.overviewWindowSelector.close(mouseEvent.x - this.offsetLeft);

    // prevent selecting a window on clicking the minimap if breadcrumbs are enabled
    if (this.breadcrumbsEnabled && window.start === window.end) {
      return;
    }

    delete this.overviewWindowSelector;
    const clickThreshold = 3;
    if (window.end - window.start < clickThreshold) {
      if (this.clickHandler && this.clickHandler.call(null, event)) {
        return;
      }
      const middle = window.end;
      window.start = Math.max(0, middle - MinSelectableSize / 2);
      window.end = Math.min(this.parentElement.clientWidth, middle + MinSelectableSize / 2);
    } else if (window.end - window.start < MinSelectableSize) {
      if (this.parentElement.clientWidth - window.end > MinSelectableSize) {
        window.end = window.start + MinSelectableSize;
      } else {
        window.start = window.end - MinSelectableSize;
      }
    }
    this.setWindowPosition(window.start, window.end);
  }

  private startWindowDragging(event: Event): boolean {
    const mouseEvent = (event as MouseEvent);
    this.dragStartPoint = mouseEvent.pageX;
    this.dragStartLeft = this.windowLeft || 0;
    this.dragStartRight = this.windowRight || 0;
    event.stopPropagation();
    return true;
  }

  private windowDragging(event: Event): void {
    this.breadcrumbButtonContainerElement.style.visibility = 'visible';
    const mouseEvent = (event as MouseEvent);
    mouseEvent.preventDefault();
    let delta: number = (mouseEvent.pageX - this.dragStartPoint) / this.parentElement.clientWidth;
    if (this.dragStartLeft + delta < 0) {
      delta = -this.dragStartLeft;
    }

    if (this.dragStartRight + delta > 1) {
      delta = 1 - this.dragStartRight;
    }

    this.setWindow(this.dragStartLeft + delta, this.dragStartRight + delta);
  }

  private resizeWindowLeft(start: number): void {
    // Glue to edge.
    if (start < OffsetFromWindowEnds) {
      start = 0;
    } else if (start > this.rightResizeElement.offsetLeft - 4) {
      start = this.rightResizeElement.offsetLeft - 4;
    }
    this.setWindowPosition(start, null);
  }

  private resizeWindowRight(end: number): void {
    // Glue to edge.
    if (end > this.parentElement.clientWidth - OffsetFromWindowEnds) {
      end = this.parentElement.clientWidth;
    } else if (end < this.leftResizeElement.offsetLeft + MinSelectableSize) {
      end = this.leftResizeElement.offsetLeft + MinSelectableSize;
    }
    this.setWindowPosition(null, end);
  }

  private resizeWindowMaximum(): void {
    this.setWindowPosition(0, this.parentElement.clientWidth);
  }

  private getRawSliderValue(leftSlider?: boolean): number {
    if (!this.calculator) {
      throw new Error('No calculator to calculate boundaries');
    }

    const minimumValue = this.calculator.minimumBoundary();
    const valueSpan = this.calculator.maximumBoundary() - minimumValue;
    if (leftSlider) {
      return minimumValue + valueSpan * (this.windowLeft || 0);
    }
    return minimumValue + valueSpan * (this.windowRight || 0);
  }

  private updateResizeElementPositionValue(leftValue: number, rightValue: number): void {
    const roundedLeftValue = leftValue.toFixed(2);
    const roundedRightValue = rightValue.toFixed(2);
    UI.ARIAUtils.setAriaValueNow(this.leftResizeElement, roundedLeftValue);
    UI.ARIAUtils.setAriaValueNow(this.rightResizeElement, roundedRightValue);

    // Left and right sliders cannot be within 0.5% of each other (Range of AriaValueMin/Max/Now is from 0-100).
    const leftResizeCeiling = Number(roundedRightValue) - 0.5;
    const rightResizeFloor = Number(roundedLeftValue) + 0.5;
    UI.ARIAUtils.setAriaValueMinMax(this.leftResizeElement, '0', leftResizeCeiling.toString());
    UI.ARIAUtils.setAriaValueMinMax(this.rightResizeElement, rightResizeFloor.toString(), '100');
  }

  private updateResizeElementPositionLabels(): void {
    if (!this.calculator) {
      return;
    }
    const startValue = this.calculator.formatValue(
        TraceEngine.Types.Timing.MilliSeconds(this.getRawSliderValue(/* leftSlider */ true)));
    const endValue = this.calculator.formatValue(
        TraceEngine.Types.Timing.MilliSeconds(this.getRawSliderValue(/* leftSlider */ false)));
    UI.ARIAUtils.setAriaValueText(this.leftResizeElement, String(startValue));
    UI.ARIAUtils.setAriaValueText(this.rightResizeElement, String(endValue));
  }

  private updateResizeElementPercentageLabels(leftValue: string, rightValue: string): void {
    UI.ARIAUtils.setAriaValueText(this.leftResizeElement, leftValue);
    UI.ARIAUtils.setAriaValueText(this.rightResizeElement, rightValue);
  }

  private calculateWindowPosition(): {
    rawStartValue: number,
    rawEndValue: number,
  } {
    return {
      rawStartValue: Number(this.getRawSliderValue(/* leftSlider */ true)),
      rawEndValue: Number(this.getRawSliderValue(/* leftSlider */ false)),
    };
  }

  setWindow(windowLeft: number, windowRight: number): void {
    this.windowLeft = windowLeft;
    this.windowRight = windowRight;
    this.updateCurtains();
    if (this.calculator) {
      this.dispatchEventToListeners(Events.WindowChangedWithPosition, this.calculateWindowPosition());
    }
    this.dispatchEventToListeners(Events.WindowChanged);
    this.changeBreadcrumbButtonVisibility(windowLeft, windowRight);
  }

  // Add breadcrumb button is only visible when the window is set to something other than the full range
  private changeBreadcrumbButtonVisibility(windowLeft: number, windowRight: number): void {
    // this.#mouseOverOverviewFirstTime is checked to not show button the first time when trace is loaded and window is set without user interaction
    this.breadcrumbButtonContainerElement.style.visibility =
        ((windowRight >= 1 && windowLeft <= 0) || !this.#mouseOverGridFirstTime) ? 'hidden' : 'visible';
  }

  createBreadcrumb(): void {
    this.dispatchEventToListeners(Events.BreadcrumbAdded, this.calculateWindowPosition());
  }

  private updateCurtains(): void {
    const windowLeft = this.windowLeft || 0;
    const windowRight = this.windowRight || 0;
    let left = windowLeft;
    let right = windowRight;
    const width = right - left;

    // OverviewGrids that are instantiated before the parentElement is shown will have a parent element client width of 0 which throws off the 'factor' calculation
    if (this.parentElement.clientWidth !== 0) {
      // We allow actual time window to be arbitrarily small but don't want the UI window to be too small.
      const widthInPixels = width * this.parentElement.clientWidth;
      const minWidthInPixels = MinSelectableSize / 2;
      if (widthInPixels < minWidthInPixels) {
        const factor = minWidthInPixels / widthInPixels;
        left = ((windowRight + windowLeft) - width * factor) / 2;
        right = ((windowRight + windowLeft) + width * factor) / 2;
      }
    }
    const leftResizerPercLeftOffset = (100 * left);
    const rightResizerPercLeftOffset = (100 * right);
    const rightResizerPercRightOffset = (100 - (100 * right));

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

    this.updateResizeElementPositionValue(leftResizerPercLeftOffset, rightResizerPercLeftOffset);
    if (this.calculator) {
      this.updateResizeElementPositionLabels();
    } else {
      this.updateResizeElementPercentageLabels(leftResizerPercLeftOffsetString, rightResizerPercLeftOffsetString);
    }

    this.toggleZoomButtonDisplay();
  }

  private toggleZoomButtonDisplay(): void {
    if (this.breadcrumbZoomIcon) {
      // disable button that creates breadcrumbs and hide the zoom icon
      // when the selected window is smaller than 4.5 ms
      // 4.5 is rounded to 5 in the UI
      if (this.getWindowRange() < 4.5) {
        this.breadcrumbZoomIcon.style.display = 'none';
        this.breadcrumbButtonContainerElement.style.pointerEvents = 'none';
      } else {
        this.breadcrumbZoomIcon.style.display = 'flex';
        this.breadcrumbButtonContainerElement.style.pointerEvents = 'auto';
      }
    }
  }

  private getWindowRange(): number {
    if (!this.calculator) {
      throw new Error('No calculator to calculate window range');
    }

    const left = (this.windowLeft && this.windowLeft > 0) ? this.windowLeft : 0;
    const right = (this.windowRight && this.windowRight < 1) ? this.windowRight : 1;
    return (this.calculator.boundarySpan() * (right - left));
  }

  private setWindowPosition(start: number|null, end: number|null): void {
    const clientWidth = this.parentElement.clientWidth;
    const windowLeft = typeof start === 'number' ? start / clientWidth : this.windowLeft;
    const windowRight = typeof end === 'number' ? end / clientWidth : this.windowRight;
    this.setWindow(windowLeft || 0, windowRight || 0);
  }

  private onMouseWheel(event: Event): void {
    const wheelEvent = (event as WheelEvent);
    if (!this.enabled) {
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
      const windowLeft = this.leftResizeElement.offsetLeft + ResizerOffset;
      const windowRight = this.rightResizeElement.offsetLeft + ResizerOffset;

      if (windowLeft - offset < 0) {
        offset = windowLeft;
      }

      if (windowRight - offset > this.parentElement.clientWidth) {
        offset = windowRight - this.parentElement.clientWidth;
      }

      this.setWindowPosition(windowLeft - offset, windowRight - offset);

      wheelEvent.preventDefault();
    }
  }

  zoom(factor: number, reference: number): void {
    let left: number = this.windowLeft || 0;
    let right: number = this.windowRight || 0;
    const windowSize = right - left;
    let newWindowSize: 1|number = factor * windowSize;
    if (newWindowSize > 1) {
      newWindowSize = 1;
      factor = newWindowSize / windowSize;
    }
    left = reference + (left - reference) * factor;
    left = Platform.NumberUtilities.clamp(left, 0, 1 - newWindowSize);

    right = reference + (right - reference) * factor;
    right = Platform.NumberUtilities.clamp(right, newWindowSize, 1);
    this.setWindow(left, right);
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  WindowChanged = 'WindowChanged',
  WindowChangedWithPosition = 'WindowChangedWithPosition',
  BreadcrumbAdded = 'BreadcrumbAdded',
}

export interface WindowChangedWithPositionEvent {
  rawStartValue: number;
  rawEndValue: number;
}

export type EventTypes = {
  [Events.WindowChanged]: void,
  [Events.BreadcrumbAdded]: WindowChangedWithPositionEvent,
  [Events.WindowChangedWithPosition]: WindowChangedWithPositionEvent,
};

export class WindowSelector {
  private startPosition: number;
  private width: number;
  private windowSelector: HTMLDivElement;

  constructor(parent: Element, position: number) {
    this.startPosition = position;
    this.width = (parent as HTMLElement).offsetWidth;
    this.windowSelector = document.createElement('div');
    this.windowSelector.className = 'overview-grid-window-selector';
    this.windowSelector.style.left = this.startPosition + 'px';
    this.windowSelector.style.right = this.width - this.startPosition + 'px';
    parent.appendChild(this.windowSelector);
  }

  close(position: number): {
    start: number,
    end: number,
  } {
    position = Math.max(0, Math.min(position, this.width));
    this.windowSelector.remove();
    return this.startPosition < position ? {start: this.startPosition, end: position} :
                                           {start: position, end: this.startPosition};
  }

  updatePosition(position: number): void {
    position = Math.max(0, Math.min(position, this.width));
    if (position < this.startPosition) {
      this.windowSelector.style.left = position + 'px';
      this.windowSelector.style.right = this.width - this.startPosition + 'px';
    } else {
      this.windowSelector.style.left = this.startPosition + 'px';
      this.windowSelector.style.right = this.width - position + 'px';
    }
  }
}
