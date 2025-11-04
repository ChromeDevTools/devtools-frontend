// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const cursorByResizerType = new Map([
    ["width" /* ResizerType.WIDTH */, 'ew-resize'],
    ["height" /* ResizerType.HEIGHT */, 'ns-resize'],
    ["bidirection" /* ResizerType.BIDIRECTION */, 'nwse-resize'],
]);
export class DragResizeHandler {
    document;
    delegate;
    originX;
    originY;
    boundMousemove;
    boundMousedown;
    constructor(document, delegate) {
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
    onMousemove(event) {
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
    onMousedown(event) {
        const match = this.delegate.getDraggable(event.clientX, event.clientY);
        if (!match) {
            return;
        }
        const boundOnDrag = this.onDrag.bind(this, match);
        event.stopPropagation();
        event.preventDefault();
        if (match.initialWidth !== undefined &&
            (match.type === "width" /* ResizerType.WIDTH */ || match.type === "bidirection" /* ResizerType.BIDIRECTION */)) {
            this.originX = {
                coord: Math.round(event.clientX),
                value: match.initialWidth,
            };
        }
        if (match.initialHeight !== undefined &&
            (match.type === "height" /* ResizerType.HEIGHT */ || match.type === "bidirection" /* ResizerType.BIDIRECTION */)) {
            this.originY = {
                coord: Math.round(event.clientY),
                value: match.initialHeight,
            };
        }
        this.document.body.removeEventListener('mousemove', this.boundMousemove);
        this.document.body.style.cursor = cursorByResizerType.get(match.type) || 'default';
        const endDrag = (event) => {
            event.stopPropagation();
            event.preventDefault();
            this.originX = undefined;
            this.originY = undefined;
            this.document.body.style.cursor = 'default';
            this.document.body.removeEventListener('mousemove', boundOnDrag);
            this.document.body.addEventListener('mousemove', this.boundMousemove);
        };
        this.document.body.addEventListener('mouseup', endDrag, { once: true });
        window.addEventListener('mouseout', endDrag, { once: true });
        this.document.body.addEventListener('mousemove', boundOnDrag);
    }
    /**
     * Computes the new value while the cursor is being dragged and calls InspectorOverlayHost with the new value.
     */
    onDrag(match, e) {
        if (!this.originX && !this.originY) {
            return;
        }
        let width;
        let height;
        if (this.originX) {
            const delta = this.originX.coord - e.clientX;
            width = Math.round(this.originX.value - delta);
        }
        if (this.originY) {
            const delta = this.originY.coord - e.clientY;
            height = Math.round(this.originY.value - delta);
        }
        match.update({ width, height });
    }
}
//# sourceMappingURL=drag_resize_handler.js.map