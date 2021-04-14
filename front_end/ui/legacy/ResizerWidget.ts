// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import {elementDragStart} from './UIUtils.js';

export class ResizerWidget extends Common.ObjectWrapper.ObjectWrapper {
  _isEnabled: boolean;
  _elements: Set<HTMLElement>;
  _installDragOnMouseDownBound: (event: Event) => false | undefined;
  _cursor: string;
  _startX?: number;
  _startY?: number;

  constructor() {
    super();

    this._isEnabled = true;
    this._elements = new Set();
    this._installDragOnMouseDownBound = this._installDragOnMouseDown.bind(this);
    this._cursor = 'nwse-resize';
  }

  isEnabled(): boolean {
    return this._isEnabled;
  }

  setEnabled(enabled: boolean): void {
    this._isEnabled = enabled;
    this.updateElementCursors();
  }

  elements(): Element[] {
    return [...this._elements];
  }

  addElement(element: HTMLElement): void {
    if (!this._elements.has(element)) {
      this._elements.add(element);
      element.addEventListener('mousedown', this._installDragOnMouseDownBound, false);
      this._updateElementCursor(element);
    }
  }

  removeElement(element: HTMLElement): void {
    if (this._elements.has(element)) {
      this._elements.delete(element);
      element.removeEventListener('mousedown', this._installDragOnMouseDownBound, false);
      element.style.removeProperty('cursor');
    }
  }

  updateElementCursors(): void {
    this._elements.forEach(this._updateElementCursor.bind(this));
  }

  _updateElementCursor(element: HTMLElement): void {
    if (this._isEnabled) {
      element.style.setProperty('cursor', this.cursor());
    } else {
      element.style.removeProperty('cursor');
    }
  }

  cursor(): string {
    return this._cursor;
  }

  setCursor(cursor: string): void {
    this._cursor = cursor;
    this.updateElementCursors();
  }

  _installDragOnMouseDown(event: Event): false|undefined {
    const element = (event.target as HTMLElement);
    // Only handle drags of the nodes specified.
    if (!this._elements.has(element)) {
      return false;
    }
    elementDragStart(element, this._dragStart.bind(this), event => {
      this._drag(event);
    }, this._dragEnd.bind(this), this.cursor(), event);
    return undefined;
  }

  _dragStart(event: MouseEvent): boolean {
    if (!this._isEnabled) {
      return false;
    }
    this._startX = event.pageX;
    this._startY = event.pageY;
    this.sendDragStart(this._startX, this._startY);
    return true;
  }

  sendDragStart(x: number, y: number): void {
    this.dispatchEventToListeners(Events.ResizeStart, {startX: x, currentX: x, startY: y, currentY: y});
  }

  _drag(event: MouseEvent): boolean {
    if (!this._isEnabled) {
      this._dragEnd(event);
      return true;  // Cancel drag.
    }
    this.sendDragMove((this._startX as number), event.pageX, (this._startY as number), event.pageY, event.shiftKey);
    event.preventDefault();
    return false;  // Continue drag.
  }

  sendDragMove(startX: number, currentX: number, startY: number, currentY: number, shiftKey: boolean): void {
    this.dispatchEventToListeners(
        Events.ResizeUpdate,
        {startX: startX, currentX: currentX, startY: startY, currentY: currentY, shiftKey: shiftKey});
  }

  _dragEnd(_event: MouseEvent): void {
    this.dispatchEventToListeners(Events.ResizeEnd);
    delete this._startX;
    delete this._startY;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  ResizeStart = 'ResizeStart',
  ResizeUpdate = 'ResizeUpdate',
  ResizeEnd = 'ResizeEnd',
}


export class SimpleResizerWidget extends ResizerWidget {
  _isVertical: boolean;
  constructor() {
    super();
    this._isVertical = true;
  }

  isVertical(): boolean {
    return this._isVertical;
  }

  /**
   * Vertical widget resizes height (along y-axis).
   */
  setVertical(vertical: boolean): void {
    this._isVertical = vertical;
    this.updateElementCursors();
  }

  cursor(): string {
    return this._isVertical ? 'ns-resize' : 'ew-resize';
  }

  sendDragStart(x: number, y: number): void {
    const position = this._isVertical ? y : x;
    this.dispatchEventToListeners(Events.ResizeStart, {startPosition: position, currentPosition: position});
  }

  sendDragMove(startX: number, currentX: number, startY: number, currentY: number, shiftKey: boolean): void {
    if (this._isVertical) {
      this.dispatchEventToListeners(
          Events.ResizeUpdate, {startPosition: startY, currentPosition: currentY, shiftKey: shiftKey});
    } else {
      this.dispatchEventToListeners(
          Events.ResizeUpdate, {startPosition: startX, currentPosition: currentX, shiftKey: shiftKey});
    }
  }
}
