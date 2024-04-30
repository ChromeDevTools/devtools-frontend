// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as TraceEngine from '../../models/trace/trace.js';
import * as UI from '../../ui/legacy/legacy.js';

import {type PerformanceModel} from './PerformanceModel.js';
import {
  type TimelineEventOverview,
  TimelineEventOverviewCPUActivity,
  TimelineEventOverviewNetwork,
  TimelineEventOverviewResponsiveness,
} from './TimelineEventOverview.js';
import timelineHistoryManagerStyles from './timelineHistoryManager.css.js';
import {type TimelineMiniMap} from './TimelineMiniMap.js';

const UIStrings = {
  /**
   *@description Screen reader label for the Timeline History dropdown button
   *@example {example.com #3} PH1
   *@example {Show recent timeline sessions} PH2
   */
  currentSessionSS: 'Current Session: {PH1}. {PH2}',
  /**
   *@description Text that shows there is no recording
   */
  noRecordings: '(no recordings)',
  /**
   *@description Text in Timeline History Manager of the Performance panel
   *@example {2s} PH1
   */
  sAgo: '({PH1} ago)',
  /**
   *@description Text in Timeline History Manager of the Performance panel
   */
  moments: 'moments',
  /**
   * @description Text in Timeline History Manager of the Performance panel.
   * Placeholder is a number and the 'm' is the short form for 'minutes'.
   * @example {2} PH1
   */
  sM: '{PH1} m',
  /**
   * @description Text in Timeline History Manager of the Performance panel.
   * Placeholder is a number and the 'h' is the short form for 'hours'.
   * @example {2} PH1
   */
  sH: '{PH1} h',
  /**
   *@description Text in Timeline History Manager of the Performance panel
   *@example {example.com} PH1
   *@example {2} PH2
   */
  sD: '{PH1} #{PH2}',
  /**
   *@description Accessible label for the timeline session selection menu
   */
  selectTimelineSession: 'Select Timeline Session',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineHistoryManager.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export type RecordingData = {
  // Store the legacy PerformanceModel. As part of the data migration we aim to
  // remove this entirely.
  legacyModel: PerformanceModel,
  // By storing only the index of this trace, the TimelinePanel can then look
  // up this trace's data (and metadata) via this index.
  traceParseDataIndex: number,
};

export interface NewHistoryRecordingData {
  // The data we will save to restore later.
  data: RecordingData;
  // We do not store this, but need it to build the thumbnail preview.
  filmStripForPreview: TraceEngine.Extras.FilmStrip.Data|null;
  // Also not stored, but used to create the preview overview for a new trace.
  traceParsedData: TraceEngine.Handlers.Types.TraceParseData;
  // Used for the preview text
  startTime: number|null;
}

export class TimelineHistoryManager {
  private recordings: RecordingData[];
  private readonly action: UI.ActionRegistration.Action;
  private readonly nextNumberByDomain: Map<string, number>;
  private readonly buttonInternal: ToolbarButton;
  private readonly allOverviews: {
    constructor: (traceParsedData: TraceEngine.Handlers.Types.TraceParseData) => TimelineEventOverview,
    height: number,
  }[];
  private totalHeight: number;
  private enabled: boolean;
  private lastActiveTraceIndex: number|null = null;
  #minimapComponent?: TimelineMiniMap;
  constructor(minimapComponent?: TimelineMiniMap) {
    this.recordings = [];
    this.#minimapComponent = minimapComponent;
    this.action = UI.ActionRegistry.ActionRegistry.instance().getAction('timeline.show-history');
    this.nextNumberByDomain = new Map();
    this.buttonInternal = new ToolbarButton(this.action);

    UI.ARIAUtils.markAsMenuButton(this.buttonInternal.element);
    this.clear();

    // Attempt to reuse the overviews coming from the panel's minimap
    // before creating new instances.
    this.allOverviews = [
      {

        constructor: traceParsedData => {
          const responsivenessOverviewFromMinimap =
              this.#minimapComponent?.getControls().find(
                  control => control instanceof TimelineEventOverviewResponsiveness) as
              TimelineEventOverviewResponsiveness;
          return responsivenessOverviewFromMinimap || new TimelineEventOverviewResponsiveness(traceParsedData);
        },
        height: 3,
      },
      {
        constructor: traceParsedData => {
          const cpuOverviewFromMinimap =
              this.#minimapComponent?.getControls().find(
                  control => control instanceof TimelineEventOverviewCPUActivity) as TimelineEventOverviewCPUActivity;
          if (cpuOverviewFromMinimap) {
            return cpuOverviewFromMinimap;
          }
          return new TimelineEventOverviewCPUActivity(traceParsedData);
        },
        height: 20,
      },
      {
        constructor: traceParsedData => {
          const networkOverviewFromMinimap =
              this.#minimapComponent?.getControls().find(control => control instanceof TimelineEventOverviewNetwork) as
              TimelineEventOverviewNetwork;
          return networkOverviewFromMinimap || new TimelineEventOverviewNetwork(traceParsedData);
        },
        height: 8,
      },
    ];
    this.totalHeight = this.allOverviews.reduce((acc, entry) => acc + entry.height, 0);
    this.enabled = true;
  }

  addRecording(newInput: NewHistoryRecordingData): void {
    const {legacyModel, traceParseDataIndex} = newInput.data;
    const filmStrip = newInput.filmStripForPreview;
    this.lastActiveTraceIndex = traceParseDataIndex;
    this.recordings.unshift({legacyModel: legacyModel, traceParseDataIndex});

    // Order is important: this needs to happen first because lots of the
    // subsequent code depends on us storing the preview data into the map.
    this.#buildAndStorePreviewData(traceParseDataIndex, newInput.traceParsedData, filmStrip, newInput.startTime);

    const modelTitle = this.title(traceParseDataIndex);
    this.buttonInternal.setText(modelTitle);
    const buttonTitle = this.action.title();
    UI.ARIAUtils.setLabel(
        this.buttonInternal.element, i18nString(UIStrings.currentSessionSS, {PH1: modelTitle, PH2: buttonTitle}));
    this.updateState();
    if (this.recordings.length <= maxRecordings) {
      return;
    }
    const modelUsedMoreTimeAgo = this.recordings.reduce(
        (a, b) => lastUsedTime(a.traceParseDataIndex) < lastUsedTime(b.traceParseDataIndex) ? a : b);
    this.recordings.splice(this.recordings.indexOf(modelUsedMoreTimeAgo), 1);

    function lastUsedTime(index: number): number {
      const data = TimelineHistoryManager.dataForTraceIndex(index);
      if (!data) {
        throw new Error('Unable to find data for model');
      }
      return data.lastUsed;
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.updateState();
  }

  button(): ToolbarButton {
    return this.buttonInternal;
  }

  clear(): void {
    this.recordings = [];
    this.lastActiveTraceIndex = null;
    this.updateState();
    this.buttonInternal.setText(i18nString(UIStrings.noRecordings));
    this.nextNumberByDomain.clear();
  }

  async showHistoryDropDown(): Promise<RecordingData|null> {
    if (this.recordings.length < 2 || !this.enabled) {
      return null;
    }

    // DropDown.show() function finishes when the dropdown menu is closed via selection or losing focus
    const activeTraceIndex = await DropDown.show(
        this.recordings.map(recording => recording.traceParseDataIndex), (this.lastActiveTraceIndex as number),
        this.buttonInternal.element);
    if (activeTraceIndex === null) {
      return null;
    }
    const index = this.recordings.findIndex(recording => recording.traceParseDataIndex === activeTraceIndex);
    if (index < 0) {
      console.assert(false, 'selected recording not found');
      return null;
    }
    this.setCurrentModel(activeTraceIndex);
    return this.recordings[index];
  }

  cancelIfShowing(): void {
    DropDown.cancelIfShowing();
  }

  navigate(direction: number): RecordingData|null {
    if (!this.enabled || this.lastActiveTraceIndex === null) {
      return null;
    }
    const index = this.recordings.findIndex(recording => recording.traceParseDataIndex === this.lastActiveTraceIndex);
    if (index < 0) {
      return null;
    }
    const newIndex = Platform.NumberUtilities.clamp(index + direction, 0, this.recordings.length - 1);
    const {traceParseDataIndex} = this.recordings[newIndex];
    this.setCurrentModel(traceParseDataIndex);
    return this.recordings[newIndex];
  }

  private setCurrentModel(index: number): void {
    const data = TimelineHistoryManager.dataForTraceIndex(index);
    if (!data) {
      throw new Error('Unable to find data for model');
    }
    data.lastUsed = Date.now();
    this.lastActiveTraceIndex = index;
    const modelTitle = this.title(index);
    const buttonTitle = this.action.title();
    this.buttonInternal.setText(modelTitle);
    UI.ARIAUtils.setLabel(
        this.buttonInternal.element, i18nString(UIStrings.currentSessionSS, {PH1: modelTitle, PH2: buttonTitle}));
  }

  private updateState(): void {
    this.action.setEnabled(this.recordings.length > 1 && this.enabled);
  }

  static previewElement(traceDataIndex: number): Element {
    const data = TimelineHistoryManager.dataForTraceIndex(traceDataIndex);
    if (!data) {
      throw new Error('Unable to find data for model');
    }
    const startedAt = data.startTime;
    data.time.textContent =
        startedAt ? i18nString(UIStrings.sAgo, {PH1: TimelineHistoryManager.coarseAge(startedAt)}) : '';
    return data.preview;
  }

  private static coarseAge(time: number): string {
    const seconds = Math.round((Date.now() - time) / 1000);
    if (seconds < 50) {
      return i18nString(UIStrings.moments);
    }
    const minutes = Math.round(seconds / 60);
    if (minutes < 50) {
      return i18nString(UIStrings.sM, {PH1: minutes});
    }
    const hours = Math.round(minutes / 60);
    return i18nString(UIStrings.sH, {PH1: hours});
  }

  private title(index: number): string {
    const data = TimelineHistoryManager.dataForTraceIndex(index);
    if (!data) {
      throw new Error('Unable to find data for model');
    }
    return data.title;
  }

  #buildAndStorePreviewData(
      traceParseDataIndex: number, traceParsedData: TraceEngine.Handlers.Types.TraceParseData,
      filmStrip: TraceEngine.Extras.FilmStrip.Data|null, startTime: number|null): HTMLDivElement {
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(traceParsedData.Meta.mainFrameURL);
    const domain = parsedURL ? parsedURL.host : '';

    const sequenceNumber = this.nextNumberByDomain.get(domain) || 1;
    const titleWithSequenceNumber = i18nString(UIStrings.sD, {PH1: domain, PH2: sequenceNumber});
    this.nextNumberByDomain.set(domain, sequenceNumber + 1);
    const timeElement = document.createElement('span');

    const preview = document.createElement('div');
    preview.classList.add('preview-item');
    preview.classList.add('vbox');
    const data = {
      preview,
      title: titleWithSequenceNumber,
      time: timeElement,
      lastUsed: Date.now(),
      startTime,
    };
    traceDataIndexToPerformancePreviewData.set(traceParseDataIndex, data);

    preview.appendChild(this.#buildTextDetails(traceParsedData, domain, timeElement));
    const screenshotAndOverview = preview.createChild('div', 'hbox');
    screenshotAndOverview.appendChild(this.#buildScreenshotThumbnail(filmStrip));
    screenshotAndOverview.appendChild(this.#buildOverview(traceParsedData));
    return data.preview;
  }

  #buildTextDetails(traceParsedData: TraceEngine.Handlers.Types.TraceParseData, title: string, timeElement: Element):
      Element {
    const container = document.createElement('div');
    container.classList.add('text-details');
    container.classList.add('hbox');
    const nameSpan = container.createChild('span', 'name');
    nameSpan.textContent = title;
    UI.ARIAUtils.setLabel(nameSpan, title);
    const bounds = TraceEngine.Helpers.Timing.traceWindowMilliSeconds(traceParsedData.Meta.traceBounds);
    const duration = i18n.TimeUtilities.millisToString(bounds.range, false);
    const timeContainer = container.createChild('span', 'time');
    timeContainer.appendChild(document.createTextNode(duration));
    timeContainer.appendChild(timeElement);
    return container;
  }

  #buildScreenshotThumbnail(filmStrip: TraceEngine.Extras.FilmStrip.Data|null): Element {
    const container = document.createElement('div');
    container.classList.add('screenshot-thumb');
    const thumbnailAspectRatio = 3 / 2;
    container.style.width = this.totalHeight * thumbnailAspectRatio + 'px';
    container.style.height = this.totalHeight + 'px';
    if (!filmStrip) {
      return container;
    }
    const lastFrame = filmStrip.frames.at(-1);
    if (!lastFrame) {
      return container;
    }
    void UI.UIUtils.loadImage(lastFrame.screenshotEvent.args.dataUri).then(img => {
      if (img) {
        container.appendChild(img);
      }
    });
    return container;
  }

  #buildOverview(traceParsedData: TraceEngine.Handlers.Types.TraceParseData): Element {
    const container = document.createElement('div');
    const dPR = window.devicePixelRatio;
    container.style.width = previewWidth + 'px';
    container.style.height = this.totalHeight + 'px';
    const canvas = (container.createChild('canvas') as HTMLCanvasElement);
    canvas.width = dPR * previewWidth;
    canvas.height = dPR * this.totalHeight;

    const ctx = canvas.getContext('2d');
    let yOffset = 0;

    for (const overview of this.allOverviews) {
      const timelineOverviewComponent = overview.constructor(traceParsedData);
      timelineOverviewComponent.update();
      if (ctx) {
        ctx.drawImage(
            timelineOverviewComponent.context().canvas, 0, yOffset, dPR * previewWidth, overview.height * dPR);
      }
      yOffset += overview.height * dPR;
    }
    return container;
  }

  private static dataForTraceIndex(index: number): PreviewData|null {
    return traceDataIndexToPerformancePreviewData.get(index) || null;
  }
}

export const maxRecordings = 5;
export const previewWidth = 450;
// The reason we store a global map is because the Dropdown component needs to
// be able to read the preview data in order to show a preview in the dropdown.
const traceDataIndexToPerformancePreviewData = new Map<number, PreviewData>();

export interface PreviewData {
  preview: Element;
  time: Element;
  lastUsed: number;
  startTime: number|null;
  title: string;
}

export class DropDown implements UI.ListControl.ListDelegate<number> {
  private readonly glassPane: UI.GlassPane.GlassPane;
  private readonly listControl: UI.ListControl.ListControl<number>;
  private readonly focusRestorer: UI.UIUtils.ElementFocusRestorer;
  private selectionDone: ((arg0: number|null) => void)|null;

  constructor(availableTraceDataIndexes: number[]) {
    this.glassPane = new UI.GlassPane.GlassPane();
    this.glassPane.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
    this.glassPane.setOutsideClickCallback(() => this.close(null));
    this.glassPane.setPointerEventsBehavior(UI.GlassPane.PointerEventsBehavior.BlockedByGlassPane);
    this.glassPane.setAnchorBehavior(UI.GlassPane.AnchorBehavior.PreferBottom);
    this.glassPane.element.addEventListener('blur', () => this.close(null));

    const shadowRoot = UI.Utils.createShadowRootWithCoreStyles(this.glassPane.contentElement, {
      cssFile: [timelineHistoryManagerStyles],
      delegatesFocus: undefined,
    });
    const contentElement = shadowRoot.createChild('div', 'drop-down');

    const listModel = new UI.ListModel.ListModel<number>();
    this.listControl = new UI.ListControl.ListControl<number>(listModel, this, UI.ListControl.ListMode.NonViewport);
    this.listControl.element.addEventListener('mousemove', this.onMouseMove.bind(this), false);
    listModel.replaceAll(availableTraceDataIndexes);

    UI.ARIAUtils.markAsMenu(this.listControl.element);
    UI.ARIAUtils.setLabel(this.listControl.element, i18nString(UIStrings.selectTimelineSession));
    contentElement.appendChild(this.listControl.element);
    contentElement.addEventListener('keydown', this.onKeyDown.bind(this), false);
    contentElement.addEventListener('click', this.onClick.bind(this), false);

    this.focusRestorer = new UI.UIUtils.ElementFocusRestorer(this.listControl.element);
    this.selectionDone = null;
  }

  static show(availableTraceDataIndexes: number[], activeTraceDataIndex: number, anchor: Element):
      Promise<number|null> {
    if (DropDown.instance) {
      return Promise.resolve(null);
    }
    const instance = new DropDown(availableTraceDataIndexes);
    return instance.show(anchor, activeTraceDataIndex);
  }

  static cancelIfShowing(): void {
    if (!DropDown.instance) {
      return;
    }
    DropDown.instance.close(null);
  }

  private show(anchor: Element, activeTraceDataIndex: number): Promise<number|null> {
    DropDown.instance = this;
    this.glassPane.setContentAnchorBox(anchor.boxInWindow());
    this.glassPane.show((this.glassPane.contentElement.ownerDocument as Document));
    this.listControl.element.focus();
    this.listControl.selectItem(activeTraceDataIndex);

    return new Promise(fulfill => {
      this.selectionDone = fulfill;
    });
  }

  private onMouseMove(event: Event): void {
    const node = (event.target as HTMLElement).enclosingNodeOrSelfWithClass('preview-item');
    const listItem = node && this.listControl.itemForNode(node);
    if (listItem === null) {
      return;
    }
    this.listControl.selectItem(listItem);
  }

  private onClick(event: Event): void {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // @ts-expect-error
    if (!(event.target).enclosingNodeOrSelfWithClass('preview-item')) {
      return;
    }
    this.close(this.listControl.selectedItem());
  }

  private onKeyDown(event: Event): void {
    switch ((event as KeyboardEvent).key) {
      case 'Tab':
      case 'Escape':
        this.close(null);
        break;
      case 'Enter':
        this.close(this.listControl.selectedItem());
        break;
      default:
        return;
    }
    event.consume(true);
  }

  private close(traceIndex: number|null): void {
    if (this.selectionDone) {
      this.selectionDone(traceIndex);
    }
    this.focusRestorer.restore();
    this.glassPane.hide();
    DropDown.instance = null;
  }

  createElementForItem(traceDataIndex: number): Element {
    const element = TimelineHistoryManager.previewElement(traceDataIndex);
    UI.ARIAUtils.markAsMenuItem(element);
    element.classList.remove('selected');
    return element;
  }

  heightForItem(_traceDataIndex: number): number {
    console.assert(false, 'Should not be called');
    return 0;
  }

  isItemSelectable(_traceDataIndex: number): boolean {
    return true;
  }

  selectedItemChanged(from: number|null, to: number|null, fromElement: Element|null, toElement: Element|null): void {
    if (fromElement) {
      fromElement.classList.remove('selected');
    }
    if (toElement) {
      toElement.classList.add('selected');
    }
  }

  updateSelectedItemARIA(_fromElement: Element|null, _toElement: Element|null): boolean {
    return false;
  }

  private static instance: DropDown|null = null;
}

export class ToolbarButton extends UI.Toolbar.ToolbarItem {
  private contentElement: HTMLElement;

  constructor(action: UI.ActionRegistration.Action) {
    const element = document.createElement('button');
    element.classList.add('history-dropdown-button');
    super(element);
    this.contentElement = this.element.createChild('span', 'content');
    this.element.addEventListener('click', () => void action.execute(), false);
    this.setEnabled(action.enabled());
    action.addEventListener(UI.ActionRegistration.Events.Enabled, event => this.setEnabled(event.data));
    this.setTitle(action.title());
  }

  setText(text: string): void {
    this.contentElement.textContent = text;
  }
}
