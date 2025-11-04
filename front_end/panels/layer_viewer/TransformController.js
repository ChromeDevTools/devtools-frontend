// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
const UIStrings = {
    /**
     * @description Tooltip text that appears when hovering over largeicon pan button in Transform Controller of the Layers panel
     */
    panModeX: 'Pan mode (X)',
    /**
     * @description Tooltip text that appears when hovering over largeicon rotate button in Transform Controller of the Layers panel
     */
    rotateModeV: 'Rotate mode (V)',
    /**
     * @description Tooltip text that appears when hovering over the largeicon center button in the Transform Controller of the Layers panel
     */
    resetTransform: 'Reset transform (0)',
};
const str_ = i18n.i18n.registerUIStrings('panels/layer_viewer/TransformController.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TransformController extends Common.ObjectWrapper.ObjectWrapper {
    mode;
    #scale;
    #offsetX;
    #offsetY;
    #rotateX;
    #rotateY;
    oldRotateX;
    oldRotateY;
    originX;
    originY;
    element;
    minScale;
    maxScale;
    controlPanelToolbar;
    modeButtons;
    /**
     * @param element The HTML element to apply transformations to.
     * @param disableRotate Optional. If true, pan and rotate will be disabled. Defaults to false.
     * @param preventDefaultOnMousedown Optional. If true, mousedown events will be prevented from their default behavior (including focus). Defaults to true.
     */
    constructor(element, disableRotate, preventDefaultOnMouseDown = true) {
        super();
        this.#scale = 1;
        this.#offsetX = 0;
        this.#offsetY = 0;
        this.#rotateX = 0;
        this.#rotateY = 0;
        this.oldRotateX = 0;
        this.oldRotateY = 0;
        this.originX = 0;
        this.originY = 0;
        this.element = element;
        this.registerShortcuts();
        UI.UIUtils.installDragHandle(element, this.onDragStart.bind(this), this.onDrag.bind(this), this.onDragEnd.bind(this), 'move', null, 0, preventDefaultOnMouseDown);
        element.addEventListener('wheel', this.onMouseWheel.bind(this), false);
        this.minScale = 0;
        this.maxScale = Infinity;
        this.controlPanelToolbar = document.createElement('devtools-toolbar');
        this.controlPanelToolbar.classList.add('transform-control-panel');
        this.controlPanelToolbar.setAttribute('jslog', `${VisualLogging.toolbar()}`);
        this.modeButtons = {};
        if (!disableRotate) {
            const panModeButton = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.panModeX), '3d-pan', undefined, 'layers.3d-pan', /* toggleOnClick */ false);
            panModeButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, this.setMode.bind(this, "Pan" /* Modes.PAN */));
            this.modeButtons["Pan" /* Modes.PAN */] = panModeButton;
            this.controlPanelToolbar.appendToolbarItem(panModeButton);
            const rotateModeButton = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.rotateModeV), '3d-rotate', undefined, 'layers.3d-rotate', /* toggleOnClick */ false);
            rotateModeButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, this.setMode.bind(this, "Rotate" /* Modes.ROTATE */));
            this.modeButtons["Rotate" /* Modes.ROTATE */] = rotateModeButton;
            this.controlPanelToolbar.appendToolbarItem(rotateModeButton);
        }
        this.setMode("Pan" /* Modes.PAN */);
        const resetButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.resetTransform), '3d-center', undefined, 'layers.3d-center');
        resetButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, this.resetAndNotify.bind(this, undefined));
        this.controlPanelToolbar.appendToolbarItem(resetButton);
        this.reset();
    }
    toolbar() {
        return this.controlPanelToolbar;
    }
    registerShortcuts() {
        const zoomFactor = 1.1;
        UI.ShortcutRegistry.ShortcutRegistry.instance().addShortcutListener(this.element, {
            'layers.reset-view': async () => {
                this.resetAndNotify();
                return true;
            },
            'layers.pan-mode': async () => {
                this.setMode("Pan" /* Modes.PAN */);
                return true;
            },
            'layers.rotate-mode': async () => {
                this.setMode("Rotate" /* Modes.ROTATE */);
                return true;
            },
            'layers.zoom-in': this.onKeyboardZoom.bind(this, zoomFactor),
            'layers.zoom-out': this.onKeyboardZoom.bind(this, 1 / zoomFactor),
            'layers.up': this.onKeyboardPanOrRotate.bind(this, 0, -1),
            'layers.down': this.onKeyboardPanOrRotate.bind(this, 0, 1),
            'layers.left': this.onKeyboardPanOrRotate.bind(this, -1, 0),
            'layers.right': this.onKeyboardPanOrRotate.bind(this, 1, 0),
        });
    }
    postChangeEvent() {
        this.dispatchEventToListeners("TransformChanged" /* Events.TRANSFORM_CHANGED */);
    }
    reset() {
        this.#scale = 1;
        this.#offsetX = 0;
        this.#offsetY = 0;
        this.#rotateX = 0;
        this.#rotateY = 0;
    }
    setMode(mode) {
        if (this.mode === mode) {
            return;
        }
        this.mode = mode;
        this.updateModeButtons();
    }
    updateModeButtons() {
        for (const mode in this.modeButtons) {
            this.modeButtons[mode].setToggled(mode === this.mode);
        }
    }
    resetAndNotify(event) {
        this.reset();
        this.postChangeEvent();
        if (event) {
            event.preventDefault();
        }
        this.element.focus();
    }
    setScaleConstraints(minScale, maxScale) {
        this.minScale = minScale;
        this.maxScale = maxScale;
        this.#scale = Platform.NumberUtilities.clamp(this.#scale, minScale, maxScale);
    }
    clampOffsets(minX, maxX, minY, maxY) {
        this.#offsetX = Platform.NumberUtilities.clamp(this.#offsetX, minX, maxX);
        this.#offsetY = Platform.NumberUtilities.clamp(this.#offsetY, minY, maxY);
    }
    scale() {
        return this.#scale;
    }
    offsetX() {
        return this.#offsetX;
    }
    offsetY() {
        return this.#offsetY;
    }
    rotateX() {
        return this.#rotateX;
    }
    rotateY() {
        return this.#rotateY;
    }
    onScale(scaleFactor, x, y) {
        scaleFactor = Platform.NumberUtilities.clamp(this.#scale * scaleFactor, this.minScale, this.maxScale) / this.#scale;
        this.#scale *= scaleFactor;
        this.#offsetX -= (x - this.#offsetX) * (scaleFactor - 1);
        this.#offsetY -= (y - this.#offsetY) * (scaleFactor - 1);
        this.postChangeEvent();
    }
    onPan(offsetX, offsetY) {
        this.#offsetX += offsetX;
        this.#offsetY += offsetY;
        this.postChangeEvent();
    }
    onRotate(rotateX, rotateY) {
        this.#rotateX = rotateX;
        this.#rotateY = rotateY;
        this.postChangeEvent();
    }
    async onKeyboardZoom(zoomFactor) {
        this.onScale(zoomFactor, this.element.clientWidth / 2, this.element.clientHeight / 2);
        return true;
    }
    async onKeyboardPanOrRotate(xMultiplier, yMultiplier) {
        const panStepInPixels = 6;
        const rotateStepInDegrees = 5;
        if (this.mode === "Rotate" /* Modes.ROTATE */) {
            // Sic! onRotate treats X and Y as "rotate around X" and "rotate around Y", so swap X/Y multipliers.
            this.onRotate(this.#rotateX + yMultiplier * rotateStepInDegrees, this.#rotateY + xMultiplier * rotateStepInDegrees);
        }
        else {
            this.onPan(xMultiplier * panStepInPixels, yMultiplier * panStepInPixels);
        }
        return true;
    }
    onMouseWheel(event) {
        /** @constant */
        const zoomFactor = 1.1;
        /** @constant */
        const wheelZoomSpeed = 1 / 53;
        const mouseEvent = event;
        const scaleFactor = Math.pow(zoomFactor, -mouseEvent.deltaY * wheelZoomSpeed);
        this.onScale(scaleFactor, mouseEvent.clientX - this.element.getBoundingClientRect().left, mouseEvent.clientY - this.element.getBoundingClientRect().top);
    }
    onDrag(event) {
        const { clientX, clientY } = event;
        if (this.mode === "Rotate" /* Modes.ROTATE */) {
            this.onRotate(this.oldRotateX + (this.originY - clientY) / this.element.clientHeight * 180, this.oldRotateY - (this.originX - clientX) / this.element.clientWidth * 180);
        }
        else {
            this.onPan(clientX - this.originX, clientY - this.originY);
            this.originX = clientX;
            this.originY = clientY;
        }
    }
    onDragStart(event) {
        this.element.focus();
        this.originX = event.clientX;
        this.originY = event.clientY;
        this.oldRotateX = this.#rotateX;
        this.oldRotateY = this.#rotateY;
        return true;
    }
    onDragEnd() {
        this.originX = 0;
        this.originY = 0;
        this.oldRotateX = 0;
        this.oldRotateY = 0;
    }
}
//# sourceMappingURL=TransformController.js.map