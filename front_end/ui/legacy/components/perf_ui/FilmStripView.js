// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';
import filmStripViewStyles from './filmStripView.css.js';
const UIStrings = {
    /**
     * @description Element title in Film Strip View of the Performance panel
     */
    doubleclickToZoomImageClickTo: 'Doubleclick to zoom image. Click to view preceding requests.',
    /**
     * @description Aria label for captured screenshots in network panel.
     * @example {3ms} PH1
     */
    screenshotForSSelectToView: 'Screenshot for {PH1} - select to view preceding requests.',
    /**
     * @description Text for one or a group of screenshots
     */
    screenshot: 'Screenshot',
    /**
     * @description Prev button title in Film Strip View of the Performance panel
     */
    previousFrame: 'Previous frame',
    /**
     * @description Next button title in Film Strip View of the Performance panel
     */
    nextFrame: 'Next frame',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/perf_ui/FilmStripView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class FilmStripView extends Common.ObjectWrapper.eventMixin(UI.Widget.HBox) {
    statusLabel;
    zeroTime = Trace.Types.Timing.Milli(0);
    #filmStrip = null;
    constructor() {
        super({ useShadowDom: true });
        this.registerRequiredCSS(filmStripViewStyles);
        this.contentElement.classList.add('film-strip-view');
        this.statusLabel = this.contentElement.createChild('div', 'gray-info-message');
        this.reset();
    }
    static setImageData(imageElement, dataUri) {
        if (dataUri) {
            imageElement.src = dataUri;
        }
    }
    setModel(filmStrip) {
        this.#filmStrip = filmStrip;
        this.zeroTime = Trace.Helpers.Timing.microToMilli(filmStrip.zeroTime);
        if (!this.#filmStrip.frames.length) {
            this.reset();
            return;
        }
        this.update();
    }
    createFrameElement(frame) {
        const time = Trace.Helpers.Timing.microToMilli(frame.screenshotEvent.ts);
        const frameTime = i18n.TimeUtilities.millisToString(time - this.zeroTime);
        const element = document.createElement('button');
        element.classList.add('frame');
        UI.Tooltip.Tooltip.install(element, i18nString(UIStrings.doubleclickToZoomImageClickTo));
        element.createChild('div', 'time').textContent = frameTime;
        element.tabIndex = 0;
        element.setAttribute('jslog', `${VisualLogging.preview('film-strip').track({ click: true, dblclick: true })}`);
        element.setAttribute('aria-label', i18nString(UIStrings.screenshotForSSelectToView, { PH1: frameTime }));
        UI.ARIAUtils.markAsButton(element);
        const imageElement = element.createChild('div', 'thumbnail').createChild('img');
        imageElement.alt = i18nString(UIStrings.screenshot);
        element.addEventListener('mousedown', this.onMouseEvent.bind(this, "FrameSelected" /* Events.FRAME_SELECTED */, time), false);
        element.addEventListener('mouseenter', this.onMouseEvent.bind(this, "FrameEnter" /* Events.FRAME_ENTER */, time), false);
        element.addEventListener('mouseout', this.onMouseEvent.bind(this, "FrameExit" /* Events.FRAME_EXIT */, time), false);
        element.addEventListener('dblclick', this.onDoubleClick.bind(this, frame), false);
        element.addEventListener('focusin', this.onMouseEvent.bind(this, "FrameEnter" /* Events.FRAME_ENTER */, time), false);
        element.addEventListener('focusout', this.onMouseEvent.bind(this, "FrameExit" /* Events.FRAME_EXIT */, time), false);
        const imgData = Trace.Handlers.ModelHandlers.Screenshots.screenshotImageDataUri(frame.screenshotEvent);
        FilmStripView.setImageData(imageElement, imgData);
        return element;
    }
    update() {
        const frames = this.#filmStrip?.frames;
        if (!frames || frames.length < 1) {
            return;
        }
        const frameElements = frames.map(frame => this.createFrameElement(frame));
        this.contentElement.removeChildren();
        for (const element of frameElements) {
            this.contentElement.appendChild(element);
        }
    }
    onMouseEvent(eventName, timestamp) {
        // TODO(crbug.com/1228674): Use type-safe event dispatch and remove <any>.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.dispatchEventToListeners(eventName, timestamp);
    }
    onDoubleClick(filmStripFrame) {
        if (!this.#filmStrip) {
            return;
        }
        Dialog.fromFilmStrip(this.#filmStrip, filmStripFrame.index);
    }
    reset() {
        this.zeroTime = Trace.Types.Timing.Milli(0);
        this.contentElement.removeChildren();
        this.contentElement.appendChild(this.statusLabel);
    }
    setStatusText(text) {
        this.statusLabel.textContent = text;
    }
}
export class Dialog {
    widget;
    index;
    dialog = null;
    #data;
    static fromFilmStrip(filmStrip, selectedFrameIndex) {
        const data = {
            source: 'Trace',
            frames: filmStrip.frames,
            index: selectedFrameIndex,
            zeroTime: Trace.Helpers.Timing.microToMilli(filmStrip.zeroTime),
        };
        return new Dialog(data);
    }
    constructor(data) {
        this.#data = data;
        this.index = data.index;
        const prevButton = UI.UIUtils.createTextButton('\u25C0', this.onPrevFrame.bind(this));
        UI.Tooltip.Tooltip.install(prevButton, i18nString(UIStrings.previousFrame));
        const nextButton = UI.UIUtils.createTextButton('\u25B6', this.onNextFrame.bind(this));
        UI.Tooltip.Tooltip.install(nextButton, i18nString(UIStrings.nextFrame));
        this.widget = new UI.Widget.Widget({ classes: ['film-strip-image-dialog'] });
        this.widget.registerRequiredCSS(filmStripViewStyles);
        const imageBox = document.createElement('div');
        imageBox.classList.add('image-box');
        const image = document.createElement('img');
        image.setAttribute('data-film-strip-dialog-img', '');
        imageBox.append(image);
        const buttonBox = document.createElement('div');
        buttonBox.classList.add('button-box');
        const timeBox = document.createElement('div');
        timeBox.classList.add('time-box');
        buttonBox.append(prevButton);
        buttonBox.append(timeBox);
        buttonBox.append(nextButton);
        this.widget.contentElement.append(imageBox);
        this.widget.contentElement.append(buttonBox);
        this.widget.element.tabIndex = 0;
        this.widget.contentElement.append();
        this.widget.contentElement.addEventListener('keydown', this.keyDown.bind(this), false);
        this.dialog = null;
        void this.render();
    }
    hide() {
        if (this.dialog) {
            this.dialog.hide();
        }
    }
    #framesCount() {
        return this.#data.frames.length;
    }
    #zeroTime() {
        return this.#data.zeroTime;
    }
    resize() {
        if (!this.dialog) {
            this.dialog = new UI.Dialog.Dialog();
            this.widget.show(this.dialog.contentElement);
            this.dialog.setDefaultFocusedElement(this.widget.element);
            this.dialog.show();
        }
        this.dialog.setSizeBehavior("MeasureContent" /* UI.GlassPane.SizeBehavior.MEASURE_CONTENT */);
    }
    keyDown(event) {
        const keyboardEvent = event;
        switch (keyboardEvent.key) {
            case 'ArrowLeft':
                if (Host.Platform.isMac() && keyboardEvent.metaKey) {
                    this.onFirstFrame();
                }
                else {
                    this.onPrevFrame();
                }
                break;
            case 'ArrowRight':
                if (Host.Platform.isMac() && keyboardEvent.metaKey) {
                    this.onLastFrame();
                }
                else {
                    this.onNextFrame();
                }
                break;
            case 'Home':
                this.onFirstFrame();
                break;
            case 'End':
                this.onLastFrame();
                break;
        }
    }
    onPrevFrame() {
        if (this.index > 0) {
            --this.index;
        }
        void this.render();
    }
    onNextFrame() {
        if (this.index < this.#framesCount() - 1) {
            ++this.index;
        }
        void this.render();
    }
    onFirstFrame() {
        this.index = 0;
        void this.render();
    }
    onLastFrame() {
        this.index = this.#framesCount() - 1;
        void this.render();
    }
    render() {
        const frame = this.#data.frames[this.index];
        const timestamp = Trace.Helpers.Timing.microToMilli(frame.screenshotEvent.ts);
        const timeBox = this.widget.contentElement.querySelector('.time-box');
        if (timeBox) {
            timeBox.textContent = i18n.TimeUtilities.millisToString(timestamp - this.#zeroTime());
        }
        const image = this.widget.contentElement.querySelector('img');
        if (!image) {
            return;
        }
        image.setAttribute('data-frame-index', this.index.toString());
        const imgData = Trace.Handlers.ModelHandlers.Screenshots.screenshotImageDataUri(frame.screenshotEvent);
        FilmStripView.setImageData(image, imgData);
        this.resize();
    }
}
//# sourceMappingURL=FilmStripView.js.map