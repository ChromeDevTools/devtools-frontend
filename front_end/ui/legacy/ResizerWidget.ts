// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

import {elementDragStart} from './UIUtils.js';

export class ResizerWidget extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  #isEnabled = true;
  #elements = new Set<HTMLElement>();
  readonly #installDragOnMouseDownBound: (event: Event) => false | undefined;
  #cursor = 'nwse-resize';
  #startX?: number;
  #startY?: number;

  constructor() {
    super();

    this.#installDragOnMouseDownBound = this.#installDragOnMouseDown.bind(this);
  }

  isEnabled(): boolean {
    return this.#isEnabled;
  }

  setEnabled(enabled: boolean): void {
    this.#isEnabled = enabled;
    this.updateElementCursors();
  }

  elements(): Element[] {
    return [...this.#elements];
  }

  addElement(element: HTMLElement): void {
    if (!this.#elements.has(element)) {
      this.#elements.add(element);
      element.addEventListener('pointerdown', this.#installDragOnMouseDownBound, false);
      this.#updateElementCursor(element);
    }
  }

  removeElement(element: HTMLElement): void {
    if (this.#elements.has(element)) {
      this.#elements.delete(element);
      element.removeEventListener('pointerdown', this.#installDragOnMouseDownBound, false);
      element.style.removeProperty('cursor');
    }
  }

  updateElementCursors(): void {
    this.#elements.forEach(this.#updateElementCursor.bind(this));
  }

  #updateElementCursor(element: HTMLElement): void {
    if (this.#isEnabled) {
      element.style.setProperty('cursor', this.cursor());
      element.style.setProperty('touch-action', 'none');
    } else {
      element.style.removeProperty('cursor');
      element.style.removeProperty('touch-action');
    }
  }

  cursor(): string {
    return this.#cursor;
  }

  setCursor(cursor: string): void {
    this.#cursor = cursor;
    this.updateElementCursors();
  }

  #installDragOnMouseDown(event: Event): false|undefined {
    const element = (event.target as HTMLElement);
    // Only handle drags of the nodes specified.
    if (!this.#elements.has(element)) {
      return false;
    }
    elementDragStart(element, this.#dragStart.bind(this), event => {
      this.#drag(event);
    }, this.#dragEnd.bind(this), this.cursor(), event);
    return undefined;
  }

  #dragStart(event: MouseEvent): boolean {
    if (!this.#isEnabled) {
      return false;
    }
    this.#startX = event.pageX;
    this.#startY = event.pageY;
    this.sendDragStart(this.#startX, this.#startY);
    return true;
  }

  sendDragStart(x: number, y: number): void {
    this.dispatchEventToListeners(Events.RESIZE_START, {startX: x, currentX: x, startY: y, currentY: y});
  }

  #drag(event: MouseEvent): boolean {
    if (!this.#isEnabled) {
      this.#dragEnd(event);
      return true;  // Cancel drag.
    }
    this.sendDragMove((this.#startX as number), event.pageX, (this.#startY as number), event.pageY, event.shiftKey);
    event.preventDefault();
    return false;  // Continue drag.
  }

  sendDragMove(startX: number, currentX: number, startY: number, currentY: number, shiftKey: boolean): void {
    this.dispatchEventToListeners(Events.RESIZE_UPDATE_XY, {startX, currentX, startY, currentY, shiftKey});
  }

  #dragEnd(_event: MouseEvent): void {
    this.dispatchEventToListeners(Events.RESIZE_END);
    this.#startX = undefined;
    this.#startY = undefined;
  }
}

export const enum Events {
  RESIZE_START = 'ResizeStart',
  RESIZE_UPDATE_XY = 'ResizeUpdateXY',
  RESIZE_UPDATE_POSITION = 'ResizeUpdatePosition',
  RESIZE_END = 'ResizeEnd',
}

export interface ResizeStartXYEvent {
  startX: number;
  currentX: number;
  startY: number;
  currentY: number;
}

export interface ResizeStartPositionEvent {
  startPosition: number;
  currentPosition: number;
}

export interface ResizeUpdateXYEvent {
  startX: number;
  currentX: number;
  startY: number;
  currentY: number;
  shiftKey: boolean;
}

export interface ResizeUpdatePositionEvent {
  startPosition: number;
  currentPosition: number;
  shiftKey: boolean;
}

export interface EventTypes {
  [Events.RESIZE_START]: ResizeStartXYEvent|ResizeStartPositionEvent;
  [Events.RESIZE_UPDATE_XY]: ResizeUpdateXYEvent;
  [Events.RESIZE_UPDATE_POSITION]: ResizeUpdatePositionEvent;
  [Events.RESIZE_END]: void;
}

export class SimpleResizerWidget extends ResizerWidget {
  #isVertical = true;

  isVertical(): boolean {
    return this.#isVertical;
  }

  /**
   * Vertical widget resizes height (along y-axis).
   */
  setVertical(vertical: boolean): void {
    this.#isVertical = vertical;
    this.updateElementCursors();
  }

  override cursor(): string {
    return this.#isVertical ? 'ns-resize' : 'ew-resize';
  }

  override sendDragStart(x: number, y: number): void {
    const position = this.#isVertical ? y : x;
    this.dispatchEventToListeners(Events.RESIZE_START, {startPosition: position, currentPosition: position});
  }

  override sendDragMove(startX: number, currentX: number, startY: number, currentY: number, shiftKey: boolean): void {
    if (this.#isVertical) {
      this.dispatchEventToListeners(
          Events.RESIZE_UPDATE_POSITION, {startPosition: startY, currentPosition: currentY, shiftKey});
    } else {
      this.dispatchEventToListeners(
          Events.RESIZE_UPDATE_POSITION, {startPosition: startX, currentPosition: currentX, shiftKey});
    }
  }
}
