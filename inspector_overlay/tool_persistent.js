// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { Overlay } from './common.js';
import { DragResizeHandler } from './drag_resize_handler.js';
import { drawContainerQueryHighlight } from './highlight_container_query.js';
import { drawLayoutFlexContainerHighlight } from './highlight_flex_common.js';
import { drawLayoutGridHighlight } from './highlight_grid_common.js';
import { drawIsolatedElementHighlight } from './highlight_isolated_element.js';
import { drawScrollSnapHighlight } from './highlight_scroll_snap.js';
function makeDraggableDelegate(overlay) {
    return {
        getDraggable: (x, y) => {
            const result = overlay.isPointInDraggablePath(x, y);
            if (!result) {
                return;
            }
            return {
                type: result.type,
                initialWidth: result.initialWidth,
                initialHeight: result.initialHeight,
                id: result.highlightIndex,
                update: ({ width, height }) => {
                    window.InspectorOverlayHost.send({
                        highlightType: 'isolatedElement',
                        highlightIndex: result.highlightIndex,
                        newWidth: `${width}px`,
                        newHeight: `${height}px`,
                        resizerType: result.type,
                    });
                },
            };
        },
    };
}
export class PersistentOverlay extends Overlay {
    gridLabelState = { gridLayerCounter: 0 };
    gridLabels;
    draggableBorders = new Map();
    dragHandler;
    reset(data) {
        super.reset(data);
        this.gridLabelState.gridLayerCounter = 0;
        this.gridLabels.innerHTML = '';
    }
    renderGridMarkup() {
        const gridLabels = this.document.createElement('div');
        gridLabels.id = 'grid-label-container';
        this.document.body.append(gridLabels);
        this.gridLabels = gridLabels;
    }
    install() {
        this.document.body.classList.add('fill');
        const canvas = this.document.createElement('canvas');
        canvas.id = 'canvas';
        canvas.classList.add('fill');
        this.document.body.append(canvas);
        this.renderGridMarkup();
        this.setCanvas(canvas);
        super.install();
        this.dragHandler?.install();
    }
    uninstall() {
        this.document.body.classList.remove('fill');
        this.document.body.innerHTML = '';
        this.draggableBorders = new Map();
        super.uninstall();
        this.dragHandler?.uninstall();
    }
    drawGridHighlight(highlight) {
        this.context.save();
        drawLayoutGridHighlight(highlight, this.context, this.deviceScaleFactor, this.canvasWidth, this.canvasHeight, this.emulationScaleFactor, this.gridLabelState);
        this.context.restore();
    }
    drawFlexContainerHighlight(highlight) {
        this.context.save();
        drawLayoutFlexContainerHighlight(highlight, this.context, this.emulationScaleFactor);
        this.context.restore();
    }
    drawScrollSnapHighlight(highlight) {
        this.context.save();
        drawScrollSnapHighlight(highlight, this.context, this.emulationScaleFactor);
        this.context.restore();
    }
    drawContainerQueryHighlight(highlight) {
        this.context.save();
        drawContainerQueryHighlight(highlight, this.context, this.emulationScaleFactor);
        this.context.restore();
    }
    drawIsolatedElementHighlight(highlight) {
        if (!this.dragHandler) {
            this.dragHandler = new DragResizeHandler(this.document, makeDraggableDelegate(this));
            this.dragHandler.install();
        }
        this.context.save();
        const { widthPath, heightPath, bidirectionPath, currentWidth, currentHeight, highlightIndex } = drawIsolatedElementHighlight(highlight, this.context, this.canvasWidth, this.canvasHeight, this.emulationScaleFactor);
        this.draggableBorders.set(highlightIndex, {
            widthPath,
            heightPath,
            bidirectionPath,
            highlightIndex,
            initialWidth: currentWidth,
            initialHeight: currentHeight,
        });
        this.context.restore();
    }
    isPointInDraggablePath(x, y) {
        for (const { widthPath, heightPath, bidirectionPath, highlightIndex, initialWidth, initialHeight } of this
            .draggableBorders.values()) {
            if (this.context.isPointInPath(widthPath, x, y)) {
                return {
                    type: "width" /* ResizerType.WIDTH */,
                    highlightIndex,
                    initialWidth,
                };
            }
            if (this.context.isPointInPath(heightPath, x, y)) {
                return {
                    type: "height" /* ResizerType.HEIGHT */,
                    highlightIndex,
                    initialHeight,
                };
            }
            if (this.context.isPointInPath(bidirectionPath, x, y)) {
                return {
                    type: "bidirection" /* ResizerType.BIDIRECTION */,
                    highlightIndex,
                    initialWidth,
                    initialHeight,
                };
            }
        }
        return;
    }
}
//# sourceMappingURL=tool_persistent.js.map