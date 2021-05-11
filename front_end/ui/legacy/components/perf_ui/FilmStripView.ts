// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Host from '../../../../core/host/host.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import type * as SDK from '../../../../core/sdk/sdk.js'; // eslint-disable-line no-unused-vars
import * as UI from '../../legacy.js';

const UIStrings = {
  /**
  *@description Element title in Film Strip View of the Performance panel
  */
  doubleclickToZoomImageClickTo: 'Doubleclick to zoom image. Click to view preceding requests.',
  /**
  *@description Aria label for captured screenshots in network panel.
  *@example {3ms} PH1
  */
  screenshotForSSelectToView: 'Screenshot for {PH1} - select to view preceding requests.',
  /**
  *@description Text for one or a group of screenshots
  */
  screenshot: 'Screenshot',
  /**
  *@description Prev button title in Film Strip View of the Performance panel
  */
  previousFrame: 'Previous frame',
  /**
  *@description Next button title in Film Strip View of the Performance panel
  */
  nextFrame: 'Next frame',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/perf_ui/FilmStripView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class FilmStripView extends UI.Widget.HBox {
  _statusLabel: HTMLElement;
  _zeroTime!: number;
  _spanTime!: number;
  _model!: SDK.FilmStripModel.FilmStripModel;
  _mode?: string;

  constructor() {
    super(true);
    this.registerRequiredCSS('ui/legacy/components/perf_ui/filmStripView.css', {enableLegacyPatching: false});
    this.contentElement.classList.add('film-strip-view');
    this._statusLabel = this.contentElement.createChild('div', 'label');
    this.reset();
    this.setMode(Modes.TimeBased);
  }

  static _setImageData(imageElement: HTMLImageElement, data: string|null): void {
    if (data) {
      imageElement.src = 'data:image/jpg;base64,' + data;
    }
  }

  setMode(mode: string): void {
    this._mode = mode;
    this.contentElement.classList.toggle('time-based', mode === Modes.TimeBased);
    this.update();
  }

  setModel(filmStripModel: SDK.FilmStripModel.FilmStripModel, zeroTime: number, spanTime: number): void {
    this._model = filmStripModel;
    this._zeroTime = zeroTime;
    this._spanTime = spanTime;
    const frames = filmStripModel.frames();
    if (!frames.length) {
      this.reset();
      return;
    }
    this.update();
  }

  createFrameElement(frame: SDK.FilmStripModel.Frame): Promise<Element> {
    const time = frame.timestamp;
    const frameTime = Number.millisToString(time - this._zeroTime);
    const element = document.createElement('div');
    element.classList.add('frame');
    UI.Tooltip.Tooltip.install(element, i18nString(UIStrings.doubleclickToZoomImageClickTo));
    element.createChild('div', 'time').textContent = frameTime;
    element.tabIndex = 0;
    element.setAttribute('aria-label', i18nString(UIStrings.screenshotForSSelectToView, {PH1: frameTime}));
    UI.ARIAUtils.markAsButton(element);
    const imageElement = (element.createChild('div', 'thumbnail').createChild('img') as HTMLImageElement);
    imageElement.alt = i18nString(UIStrings.screenshot);
    element.addEventListener('mousedown', this._onMouseEvent.bind(this, Events.FrameSelected, time), false);
    element.addEventListener('mouseenter', this._onMouseEvent.bind(this, Events.FrameEnter, time), false);
    element.addEventListener('mouseout', this._onMouseEvent.bind(this, Events.FrameExit, time), false);
    element.addEventListener('dblclick', this._onDoubleClick.bind(this, frame), false);
    element.addEventListener('focusin', this._onMouseEvent.bind(this, Events.FrameEnter, time), false);
    element.addEventListener('focusout', this._onMouseEvent.bind(this, Events.FrameExit, time), false);
    element.addEventListener('keydown', event => {
      if (event.code === 'Enter' || event.code === 'Space') {
        this._onMouseEvent(Events.FrameSelected, time);
      }
    });

    return frame.imageDataPromise().then(FilmStripView._setImageData.bind(null, imageElement)).then(returnElement);
    function returnElement(): Element {
      return element;
    }
  }

  frameByTime(time: number): SDK.FilmStripModel.Frame {
    function comparator(time: number, frame: SDK.FilmStripModel.Frame): number {
      return time - frame.timestamp;
    }
    // Using the first frame to fill the interval between recording start
    // and a moment the frame is taken.
    const frames = this._model.frames();
    const index = Math.max(Platform.ArrayUtilities.upperBound(frames, time, comparator) - 1, 0);
    return frames[index];
  }

  update(): void {
    if (!this._model) {
      return;
    }
    const frames = this._model.frames();
    if (!frames.length) {
      return;
    }

    if (this._mode === Modes.FrameBased) {
      Promise.all(frames.map(this.createFrameElement.bind(this))).then(appendElements.bind(this));
      return;
    }

    const width = this.contentElement.clientWidth;
    const scale = this._spanTime / width;
    this.createFrameElement(frames[0]).then(
        continueWhenFrameImageLoaded.bind(this));  // Calculate frame width basing on the first frame.

    function continueWhenFrameImageLoaded(this: FilmStripView, element0: Element): void {
      const frameWidth = Math.ceil(UI.UIUtils.measurePreferredSize(element0, this.contentElement).width);
      if (!frameWidth) {
        return;
      }

      const promises = [];
      for (let pos = frameWidth; pos < width; pos += frameWidth) {
        const time = pos * scale + this._zeroTime;
        promises.push(this.createFrameElement(this.frameByTime(time)).then(fixWidth));
      }
      Promise.all(promises).then(appendElements.bind(this));
      function fixWidth(element: Element): Element {
        (element as HTMLElement).style.width = frameWidth + 'px';
        return element;
      }
    }

    function appendElements(this: FilmStripView, elements: Element[]): void {
      this.contentElement.removeChildren();
      for (let i = 0; i < elements.length; ++i) {
        this.contentElement.appendChild(elements[i]);
      }
    }
  }

  onResize(): void {
    if (this._mode === Modes.FrameBased) {
      return;
    }
    this.update();
  }

  _onMouseEvent(eventName: string|symbol, timestamp: number): void {
    this.dispatchEventToListeners(eventName, timestamp);
  }

  _onDoubleClick(filmStripFrame: SDK.FilmStripModel.Frame): void {
    new Dialog(filmStripFrame, this._zeroTime);
  }

  reset(): void {
    this._zeroTime = 0;
    this.contentElement.removeChildren();
    this.contentElement.appendChild(this._statusLabel);
  }

  setStatusText(text: string): void {
    this._statusLabel.textContent = text;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  FrameSelected = 'FrameSelected',
  FrameEnter = 'FrameEnter',
  FrameExit = 'FrameExit',
}


export const Modes = {
  TimeBased: 'TimeBased',
  FrameBased: 'FrameBased',
};

export class Dialog {
  _fragment: UI.Fragment.Fragment;
  _widget: UI.XWidget.XWidget;
  _frames: SDK.FilmStripModel.Frame[];
  _index: number;
  _zeroTime: number;
  _dialog: UI.Dialog.Dialog|null;

  constructor(filmStripFrame: SDK.FilmStripModel.Frame, zeroTime?: number) {
    const prevButton = UI.UIUtils.createTextButton('\u25C0', this._onPrevFrame.bind(this));
    UI.Tooltip.Tooltip.install(prevButton, i18nString(UIStrings.previousFrame));
    const nextButton = UI.UIUtils.createTextButton('\u25B6', this._onNextFrame.bind(this));
    UI.Tooltip.Tooltip.install(nextButton, i18nString(UIStrings.nextFrame));

    this._fragment = UI.Fragment.Fragment.build`
      <x-widget flex=none margin=12px>
        <x-hbox overflow=auto border='1px solid #ddd'>
          <img $='image' style="max-height: 80vh; max-width: 80vw;"></img>
        </x-hbox>
        <x-hbox x-center justify-content=center margin-top=10px>
          ${prevButton}
          <x-hbox $='time' margin=8px></x-hbox>
          ${nextButton}
        </x-hbox>
      </x-widget>
    `;

    this._widget = (this._fragment.element() as UI.XWidget.XWidget);
    (this._widget as HTMLElement).tabIndex = 0;
    this._widget.addEventListener('keydown', this._keyDown.bind(this), false);

    this._frames = filmStripFrame.model().frames();
    this._index = filmStripFrame.index;
    this._zeroTime = zeroTime || filmStripFrame.model().zeroTime();
    this._dialog = null;
    this._render();
  }

  _resize(): void {
    if (!this._dialog) {
      this._dialog = new UI.Dialog.Dialog();
      this._dialog.contentElement.appendChild(this._widget);
      this._dialog.setDefaultFocusedElement(this._widget);
      // Dialog can take an undefined `where` param for show(), however its superclass (GlassPane)
      // requires a Document. TypeScript is unhappy that show() is not given a parameter here,
      // however, so marking it as an ignore.
      // @ts-ignore See above.
      this._dialog.show();
    }
    this._dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
  }

  _keyDown(event: Event): void {
    const keyboardEvent = (event as KeyboardEvent);
    switch (keyboardEvent.key) {
      case 'ArrowLeft':
        if (Host.Platform.isMac() && keyboardEvent.metaKey) {
          this._onFirstFrame();
        } else {
          this._onPrevFrame();
        }
        break;

      case 'ArrowRight':
        if (Host.Platform.isMac() && keyboardEvent.metaKey) {
          this._onLastFrame();
        } else {
          this._onNextFrame();
        }
        break;

      case 'Home':
        this._onFirstFrame();
        break;

      case 'End':
        this._onLastFrame();
        break;
    }
  }

  _onPrevFrame(): void {
    if (this._index > 0) {
      --this._index;
    }
    this._render();
  }

  _onNextFrame(): void {
    if (this._index < this._frames.length - 1) {
      ++this._index;
    }
    this._render();
  }

  _onFirstFrame(): void {
    this._index = 0;
    this._render();
  }

  _onLastFrame(): void {
    this._index = this._frames.length - 1;
    this._render();
  }

  _render(): Promise<void> {
    const frame = this._frames[this._index];
    this._fragment.$('time').textContent = Number.millisToString(frame.timestamp - this._zeroTime);
    return frame.imageDataPromise()
        .then(imageData => {
          const image = (this._fragment.$('image') as HTMLImageElement);
          return FilmStripView._setImageData(image, imageData);
        })
        .then(this._resize.bind(this));
  }
}
