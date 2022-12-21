// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import type * as SDK from '../../../../core/sdk/sdk.js';
import * as UI from '../../legacy.js';

import filmStripViewStyles from './filmStripView.css.legacy.js';

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
export class FilmStripView extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.HBox>(UI.Widget.HBox) {
  private statusLabel: HTMLElement;
  private zeroTime!: number;
  private spanTime!: number;
  private model!: SDK.FilmStripModel.FilmStripModel;
  private mode?: string;

  constructor() {
    super(true);
    this.registerRequiredCSS(filmStripViewStyles);
    this.contentElement.classList.add('film-strip-view');
    this.statusLabel = this.contentElement.createChild('div', 'label');
    this.reset();
    this.setMode(Modes.TimeBased);
  }

  static setImageData(imageElement: HTMLImageElement, data: string|null): void {
    if (data) {
      imageElement.src = 'data:image/jpg;base64,' + data;
    }
  }

  setMode(mode: string): void {
    this.mode = mode;
    this.contentElement.classList.toggle('time-based', mode === Modes.TimeBased);
    this.update();
  }

  setModel(filmStripModel: SDK.FilmStripModel.FilmStripModel, zeroTime: number, spanTime: number): void {
    this.model = filmStripModel;
    this.zeroTime = zeroTime;
    this.spanTime = spanTime;
    const frames = filmStripModel.frames();
    if (!frames.length) {
      this.reset();
      return;
    }
    this.update();
  }

  createFrameElement(frame: SDK.FilmStripModel.Frame): Promise<Element> {
    const time = frame.timestamp;
    const frameTime = i18n.TimeUtilities.millisToString(time - this.zeroTime);
    const element = document.createElement('div');
    element.classList.add('frame');
    UI.Tooltip.Tooltip.install(element, i18nString(UIStrings.doubleclickToZoomImageClickTo));
    element.createChild('div', 'time').textContent = frameTime;
    element.tabIndex = 0;
    element.setAttribute('aria-label', i18nString(UIStrings.screenshotForSSelectToView, {PH1: frameTime}));
    UI.ARIAUtils.markAsButton(element);
    const imageElement = (element.createChild('div', 'thumbnail').createChild('img') as HTMLImageElement);
    imageElement.alt = i18nString(UIStrings.screenshot);
    element.addEventListener('mousedown', this.onMouseEvent.bind(this, Events.FrameSelected, time), false);
    element.addEventListener('mouseenter', this.onMouseEvent.bind(this, Events.FrameEnter, time), false);
    element.addEventListener('mouseout', this.onMouseEvent.bind(this, Events.FrameExit, time), false);
    element.addEventListener('dblclick', this.onDoubleClick.bind(this, frame), false);
    element.addEventListener('focusin', this.onMouseEvent.bind(this, Events.FrameEnter, time), false);
    element.addEventListener('focusout', this.onMouseEvent.bind(this, Events.FrameExit, time), false);
    element.addEventListener('keydown', event => {
      if (event.code === 'Enter' || event.code === 'Space') {
        this.onMouseEvent(Events.FrameSelected, time);
      }
    });

    return frame.imageDataPromise().then(FilmStripView.setImageData.bind(null, imageElement)).then(returnElement);
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
    const frames = this.model.frames();
    const index = Math.max(Platform.ArrayUtilities.upperBound(frames, time, comparator) - 1, 0);
    return frames[index];
  }

  update(): void {
    if (!this.model) {
      return;
    }
    const frames = this.model.frames();
    if (!frames.length) {
      return;
    }

    if (this.mode === Modes.FrameBased) {
      void Promise.all(frames.map(this.createFrameElement.bind(this))).then(appendElements.bind(this));
      return;
    }

    const width = this.contentElement.clientWidth;
    const scale = this.spanTime / width;
    void this.createFrameElement(frames[0]).then(
        continueWhenFrameImageLoaded.bind(this));  // Calculate frame width basing on the first frame.

    function continueWhenFrameImageLoaded(this: FilmStripView, element0: Element): void {
      const frameWidth = Math.ceil(UI.UIUtils.measurePreferredSize(element0, this.contentElement).width);
      if (!frameWidth) {
        return;
      }

      const promises = [];
      for (let pos = frameWidth; pos < width; pos += frameWidth) {
        const time = pos * scale + this.zeroTime;
        promises.push(this.createFrameElement(this.frameByTime(time)).then(fixWidth));
      }
      void Promise.all(promises).then(appendElements.bind(this));
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
    if (this.mode === Modes.FrameBased) {
      return;
    }
    this.update();
  }

  private onMouseEvent(eventName: string|symbol, timestamp: number): void {
    // TODO(crbug.com/1228674): Use type-safe event dispatch and remove <any>.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.dispatchEventToListeners<any>(eventName, timestamp);
  }

  private onDoubleClick(filmStripFrame: SDK.FilmStripModel.Frame): void {
    new Dialog(filmStripFrame, this.zeroTime);
  }

  reset(): void {
    this.zeroTime = 0;
    this.contentElement.removeChildren();
    this.contentElement.appendChild(this.statusLabel);
  }

  setStatusText(text: string): void {
    this.statusLabel.textContent = text;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  FrameSelected = 'FrameSelected',
  FrameEnter = 'FrameEnter',
  FrameExit = 'FrameExit',
}

export type EventTypes = {
  [Events.FrameSelected]: number,
  [Events.FrameEnter]: number,
  [Events.FrameExit]: number,
};

export const Modes = {
  TimeBased: 'TimeBased',
  FrameBased: 'FrameBased',
};

export class Dialog {
  private fragment: UI.Fragment.Fragment;
  private readonly widget: UI.XWidget.XWidget;
  private frames: SDK.FilmStripModel.Frame[];
  private index: number;
  private zeroTime: number;
  private dialog: UI.Dialog.Dialog|null;

  constructor(filmStripFrame: SDK.FilmStripModel.Frame, zeroTime?: number) {
    const prevButton = UI.UIUtils.createTextButton('\u25C0', this.onPrevFrame.bind(this));
    UI.Tooltip.Tooltip.install(prevButton, i18nString(UIStrings.previousFrame));
    const nextButton = UI.UIUtils.createTextButton('\u25B6', this.onNextFrame.bind(this));
    UI.Tooltip.Tooltip.install(nextButton, i18nString(UIStrings.nextFrame));

    this.fragment = UI.Fragment.Fragment.build`
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

    this.widget = (this.fragment.element() as UI.XWidget.XWidget);
    (this.widget as HTMLElement).tabIndex = 0;
    this.widget.addEventListener('keydown', this.keyDown.bind(this), false);

    this.frames = filmStripFrame.model().frames();
    this.index = filmStripFrame.index;
    this.zeroTime = zeroTime || filmStripFrame.model().zeroTime();
    this.dialog = null;
    void this.render();
  }

  private resize(): void {
    if (!this.dialog) {
      this.dialog = new UI.Dialog.Dialog();
      this.dialog.contentElement.appendChild(this.widget);
      this.dialog.setDefaultFocusedElement(this.widget);
      // Dialog can take an undefined `where` param for show(), however its superclass (GlassPane)
      // requires a Document. TypeScript is unhappy that show() is not given a parameter here,
      // however, so marking it as an ignore.
      // @ts-ignore See above.
      this.dialog.show();
    }
    this.dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
  }

  private keyDown(event: Event): void {
    const keyboardEvent = (event as KeyboardEvent);
    switch (keyboardEvent.key) {
      case 'ArrowLeft':
        if (Host.Platform.isMac() && keyboardEvent.metaKey) {
          this.onFirstFrame();
        } else {
          this.onPrevFrame();
        }
        break;

      case 'ArrowRight':
        if (Host.Platform.isMac() && keyboardEvent.metaKey) {
          this.onLastFrame();
        } else {
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

  private onPrevFrame(): void {
    if (this.index > 0) {
      --this.index;
    }
    void this.render();
  }

  private onNextFrame(): void {
    if (this.index < this.frames.length - 1) {
      ++this.index;
    }
    void this.render();
  }

  private onFirstFrame(): void {
    this.index = 0;
    void this.render();
  }

  private onLastFrame(): void {
    this.index = this.frames.length - 1;
    void this.render();
  }

  private render(): Promise<void> {
    const frame = this.frames[this.index];
    this.fragment.$('time').textContent = i18n.TimeUtilities.millisToString(frame.timestamp - this.zeroTime);
    return frame.imageDataPromise()
        .then(imageData => {
          const image = (this.fragment.$('image') as HTMLImageElement);
          return FilmStripView.setImageData(image, imageData);
        })
        .then(this.resize.bind(this));
  }
}
