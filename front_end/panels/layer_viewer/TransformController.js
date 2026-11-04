// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
const UIStrings = {
    /**
     * @description Tooltip text that appears when hovering over largeicon pan
     * button in transform controller of the Layers panel.
     */
    panModeX: 'Pan mode (X)',
    /**
     * @description Tooltip text that appears when hovering over largeicon rotate
     * button in transform controller of the Layers panel.
     */
    rotateModeV: 'Rotate mode (V)',
    /**
     * @description Tooltip text that appears when hovering over the largeicon
     * center button in the transform controller of the Layers panel.
     */
    resetTransform: 'Reset transform (0)',
};
const str_ = i18n.i18n.registerUIStrings('panels/layer_viewer/TransformController.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    ${!input.disableRotate ? html `
      <devtools-button
          class="toolbar-button"
          title=${i18nString(UIStrings.panModeX)}
          jslog=${VisualLogging.toggle().track({ click: true }).context('layers.3d-pan')}
          .iconName=${'3d-pan'}
          .toggledIconName=${'3d-pan'}
          .toggleType=${"primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */}
          .toggleOnClick=${false}
          .toggled=${input.mode === "Pan" /* Modes.PAN */}
          .variant=${"icon_toggle" /* Buttons.Button.Variant.ICON_TOGGLE */}
          @click=${() => input.onSetMode("Pan" /* Modes.PAN */)}>
      </devtools-button>
      <devtools-button
          class="toolbar-button"
          title=${i18nString(UIStrings.rotateModeV)}
          jslog=${VisualLogging.toggle().track({ click: true }).context('layers.3d-rotate')}
          .iconName=${'3d-rotate'}
          .toggledIconName=${'3d-rotate'}
          .toggleType=${"primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */}
          .toggleOnClick=${false}
          .toggled=${input.mode === "Rotate" /* Modes.ROTATE */}
          .variant=${"icon_toggle" /* Buttons.Button.Variant.ICON_TOGGLE */}
          @click=${() => input.onSetMode("Rotate" /* Modes.ROTATE */)}>
      </devtools-button>
    ` : nothing}
    <devtools-button
        class="toolbar-button"
        title=${i18nString(UIStrings.resetTransform)}
        .iconName=${'3d-center'}
        .jslogContext=${'layers.3d-center'}
        .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
        @click=${(event) => {
        event.preventDefault();
        input.onReset();
    }}>
    </devtools-button>
  `, target, {
        container: {
            classes: ['transform-control-panel'],
            attributes: { jslog: `${VisualLogging.toolbar()}` },
        },
    });
    // clang-format on
};
export class TransformController extends Common.ObjectWrapper.ObjectWrapper {
    mode = "Pan" /* Modes.PAN */;
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
    #disableRotate;
    #controlPanelToolbar = new UI.Toolbar.Toolbar();
    #view;
    /**
     * @param element The HTML element to apply transformations to.
     * @param disableRotate Optional. If true, pan and rotate will be disabled.
     *     Defaults to false.
     * @param preventDefaultOnMousedown Optional. If true, mousedown events will
     *     be prevented from their default behavior (including focus). Defaults to
     *     true.
     */
    constructor(element, disableRotate, preventDefaultOnMouseDown = true, view = DEFAULT_VIEW) {
        super();
        this.#view = view;
        this.#disableRotate = Boolean(disableRotate);
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
        this.#performUpdate();
        this.reset();
    }
    #performUpdate() {
        this.#view({
            disableRotate: this.#disableRotate,
            mode: this.mode,
            onSetMode: this.setMode.bind(this),
            onReset: this.resetAndNotify.bind(this),
        }, undefined, this.#controlPanelToolbar);
    }
    toolbar() {
        return this.#controlPanelToolbar;
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
        this.#performUpdate();
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
            // Sic! onRotate treats X and Y as "rotate around X" and "rotate around
            // Y", so swap X/Y multipliers.
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
export var Events;
(function (Events) {
    Events["TRANSFORM_CHANGED"] = "TransformChanged";
})(Events || (Events = {}));
export var Modes;
(function (Modes) {
    Modes["PAN"] = "Pan";
    Modes["ROTATE"] = "Rotate";
})(Modes || (Modes = {}));
//# sourceMappingURL=TransformController.js.map