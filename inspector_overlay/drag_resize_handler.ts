// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const enum ResizerType {
  WIDTH = 'width',
  HEIGHT = 'height',
  BIDIRECTION = 'bidirection',
}

export interface Draggable {
  type: ResizerType;
  initialWidth?: number;
  initialHeight?: number;
  update({width, height}: {width?: number, height?: number}): void;
}

export interface Delegate {
  getDraggable(x: number, y: number): Draggable|undefined;
}

const cursorByResizerType = new Map([
  [ResizerType.WIDTH, 'ew-resize'],
  [ResizerType.HEIGHT, 'ns-resize'],
  [ResizerType.BIDIRECTION, 'nwse-resize'],
]);

type OriginInfo = {
  coord: number,
  value: number,
};

export class DragResizeHandler {
  private document: Document;
  private delegate: Delegate;
  private originX?: OriginInfo;
  private originY?: OriginInfo;
  private boundMousemove: (event: MouseEvent) => void;
  private boundMousedown: (event: MouseEvent) => void;

  constructor(document: Document, delegate: Delegate) {
    this.document = document;
    this.delegate = delegate;
    this.boundMousemove = this.onMousemove.bind(this);
    this.boundMousedown = this.onMousedown.bind(this);
  }

  install() {
    this.document.body.addEventListener('mousemove', this.boundMousemove);
    this.document.body.addEventListener('mousedown', this.boundMousedown);
  }

  uninstall() {
    this.document.body.removeEventListener('mousemove', this.boundMousemove);
    this.document.body.removeEventListener('mousedown', this.boundMousedown);
  }

  /**
   * Updates the cursor style of the mouse is hovered over a resizeable area.
   */
  private onMousemove(event: MouseEvent) {
    const match = this.delegate.getDraggable(event.clientX, event.clientY);
    if (!match) {
      this.document.body.style.cursor = 'default';
      return;
    }
    this.document.body.style.cursor = cursorByResizerType.get(match.type) || 'default';
  }

  /**
   * Starts dragging
   */
  private onMousedown(event: MouseEvent) {
    const match = this.delegate.getDraggable(event.clientX, event.clientY);
    if (!match) {
      return;
    }

    const boundOnDrag = this.onDrag.bind(this, match);

    event.stopPropagation();
    event.preventDefault();

    if (match.initialWidth !== undefined &&
        (match.type === ResizerType.WIDTH || match.type === ResizerType.BIDIRECTION)) {
      this.originX = {
        coord: Math.round(event.clientX),
        value: match.initialWidth,
      };
    }

    if (match.initialHeight !== undefined &&
        (match.type === ResizerType.HEIGHT || match.type === ResizerType.BIDIRECTION)) {
      this.originY = {
        coord: Math.round(event.clientY),
        value: match.initialHeight,
      };
    }

    this.document.body.removeEventListener('mousemove', this.boundMousemove);
    this.document.body.style.cursor = cursorByResizerType.get(match.type) || 'default';

    const endDrag = (event: Event) => {
      event.stopPropagation();
      event.preventDefault();
      this.originX = undefined;
      this.originY = undefined;

      this.document.body.style.cursor = 'default';
      this.document.body.removeEventListener('mousemove', boundOnDrag);
      this.document.body.addEventListener('mousemove', this.boundMousemove);
    };

    this.document.body.addEventListener('mouseup', endDrag, {once: true});
    window.addEventListener('mouseout', endDrag, {once: true});

    this.document.body.addEventListener('mousemove', boundOnDrag);
  }

  /**
   * Computes the new value while the cursor is being dragged and calls InspectorOverlayHost with the new value.
   */
  private onDrag(match: Draggable, e: MouseEvent) {
    if (!this.originX && !this.originY) {
      return;
    }

    let width: number|undefined;
    let height: number|undefined;
    if (this.originX) {
      const delta = this.originX.coord - e.clientX;
      width = Math.round(this.originX.value - delta);
    }

    if (this.originY) {
      const delta = this.originY.coord - e.clientY;
      height = Math.round(this.originY.value - delta);
    }

    match.update({width, height});
  }
}
