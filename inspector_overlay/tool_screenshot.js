// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { Overlay } from './common.js';
let anchor = null;
let position = null;
export class ScreenshotOverlay extends Overlay {
    zone;
    constructor(window, style = []) {
        super(window, style);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
    }
    install() {
        const root = this.document.documentElement;
        root.addEventListener('mousedown', this.onMouseDown, true);
        root.addEventListener('mouseup', this.onMouseUp, true);
        root.addEventListener('mousemove', this.onMouseMove, true);
        root.addEventListener('keydown', this.onKeyDown, true);
        const zone = this.document.createElement('div');
        zone.id = 'zone';
        this.document.body.append(zone);
        this.zone = zone;
        super.install();
    }
    uninstall() {
        this.document.body.innerHTML = '';
        const root = this.document.documentElement;
        root.removeEventListener('mousedown', this.onMouseDown, true);
        root.removeEventListener('mouseup', this.onMouseUp, true);
        root.removeEventListener('mousemove', this.onMouseMove, true);
        root.removeEventListener('keydown', this.onKeyDown, true);
        super.uninstall();
    }
    onMouseDown(event) {
        anchor = { x: event.pageX, y: event.pageY };
        position = anchor;
        this.updateZone();
        event.stopPropagation();
        event.preventDefault();
    }
    onMouseUp(event) {
        if (anchor && position) {
            const rect = currentRect();
            if (rect.width >= 5 && rect.height >= 5) {
                this.window.InspectorOverlayHost.send(rect);
            }
        }
        cancel();
        this.updateZone();
        event.stopPropagation();
        event.preventDefault();
    }
    onMouseMove(event) {
        if (anchor && event.buttons === 1) {
            position = { x: event.pageX, y: event.pageY };
        }
        else {
            anchor = null;
        }
        this.updateZone();
        event.stopPropagation();
        event.preventDefault();
    }
    onKeyDown(event) {
        if (anchor && event.key === 'Escape') {
            cancel();
            this.updateZone();
            event.stopPropagation();
            event.preventDefault();
        }
    }
    updateZone() {
        const zone = this.zone;
        if (!position || !anchor) {
            zone.style.display = 'none';
            return;
        }
        zone.style.display = 'block';
        const rect = currentRect();
        zone.style.left = rect.x + 'px';
        zone.style.top = rect.y + 'px';
        zone.style.width = rect.width + 'px';
        zone.style.height = rect.height + 'px';
    }
}
function currentRect() {
    if (!anchor) {
        throw new Error('Error calculating currentRect: no anchor was defined.');
    }
    if (!position) {
        throw new Error('Error calculating currentRect: no position was defined.');
    }
    return {
        x: Math.min(anchor.x, position.x),
        y: Math.min(anchor.y, position.y),
        width: Math.abs(anchor.x - position.x),
        height: Math.abs(anchor.y - position.y),
    };
}
function cancel() {
    anchor = null;
    position = null;
}
//# sourceMappingURL=tool_screenshot.js.map