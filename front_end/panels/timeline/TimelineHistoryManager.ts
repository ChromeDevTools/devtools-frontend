// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import type * as TraceEngine from '../../models/trace/trace.js';
import * as UI from '../../ui/legacy/legacy.js';

import {type PerformanceModel} from './PerformanceModel.js';
import {
  type TimelineEventOverview,
  TimelineEventOverviewCPUActivity,
  TimelineEventOverviewNetwork,
  TimelineEventOverviewResponsiveness,
} from './TimelineEventOverview.js';
import timelineHistoryManagerStyles from './timelineHistoryManager.css.js';
import {ThreadTracksSource} from './TimelinePanel.js';

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
  legacyModel: PerformanceModel,
  traceParseDataIndex: number,
};

export interface NewHistoryRecordingData {
  // The data we will save to restore later.
  data: RecordingData;
  // We do not store this, but need it to build the thumbnail preview.
  filmStripForPreview: TraceEngine.Extras.FilmStrip.Data|null;
  // Also not stored, but used to create the preview overview for a new trace.
  traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData;
}

export class TimelineHistoryManager {
  private recordings: RecordingData[];
  private readonly action: UI.ActionRegistration.Action;
  private readonly nextNumberByDomain: Map<string, number>;
  private readonly buttonInternal: ToolbarButton;
  private readonly allOverviews: {
    constructor:
        (traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData, performanceModel: PerformanceModel) =>
            TimelineEventOverview,
    height: number,
  }[];
  private totalHeight: number;
  private enabled: boolean;
  private lastActiveModel: PerformanceModel|null;
  #threadTracksSource: ThreadTracksSource = ThreadTracksSource.OLD_ENGINE;
  constructor(threadTracksSource?: ThreadTracksSource) {
    if (threadTracksSource) {
      this.#threadTracksSource = threadTracksSource;
    }

    this.recordings = [];
    this.action =
        (UI.ActionRegistry.ActionRegistry.instance().action('timeline.show-history') as UI.ActionRegistration.Action);
    this.nextNumberByDomain = new Map();
    this.buttonInternal = new ToolbarButton(this.action);

    UI.ARIAUtils.markAsMenuButton(this.buttonInternal.element);
    this.clear();

    this.allOverviews = [
      {
        constructor: (traceParsedData): TimelineEventOverviewResponsiveness => {
          return new TimelineEventOverviewResponsiveness(traceParsedData);
        },
        height: 3,
      },
      {
        constructor: (_traceParsedData, performanceModel): TimelineEventOverviewCPUActivity => {
          // TODO(crbug.com/1464206): remove this conditional once ThreadTracksSource has been fully shipped and the flag removed.
          if (this.#threadTracksSource === ThreadTracksSource.NEW_ENGINE) {
            return new TimelineEventOverviewCPUActivity(null, _traceParsedData);
          }

          return new TimelineEventOverviewCPUActivity(performanceModel, null);
        },
        height: 20,
      },
      {
        constructor: (traceParsedData): TimelineEventOverviewNetwork =>
            new TimelineEventOverviewNetwork(traceParsedData),
        height: 8,
      },
    ];
    this.totalHeight = this.allOverviews.reduce((acc, entry) => acc + entry.height, 0);
    this.enabled = true;
    this.lastActiveModel = null;
  }

  addRecording(newInput: NewHistoryRecordingData): void {
    const {legacyModel, traceParseDataIndex} = newInput.data;
    const filmStrip = newInput.filmStripForPreview;
    this.lastActiveModel = legacyModel;
    this.recordings.unshift({legacyModel: legacyModel, traceParseDataIndex});

    this.buildPreview(legacyModel, newInput.traceParsedData, filmStrip);
    const modelTitle = this.title(legacyModel);
    this.buttonInternal.setText(modelTitle);
    const buttonTitle = this.action.title();
    UI.ARIAUtils.setLabel(
        this.buttonInternal.element, i18nString(UIStrings.currentSessionSS, {PH1: modelTitle, PH2: buttonTitle}));
    this.updateState();
    if (this.recordings.length <= maxRecordings) {
      return;
    }
    const modelUsedMoreTimeAgo =
        this.recordings.reduce((a, b) => lastUsedTime(a.legacyModel) < lastUsedTime(b.legacyModel) ? a : b);
    this.recordings.splice(this.recordings.indexOf(modelUsedMoreTimeAgo), 1);

    function lastUsedTime(model: PerformanceModel): number {
      const data = TimelineHistoryManager.dataForModel(model);
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
    this.lastActiveModel = null;
    this.updateState();
    this.buttonInternal.setText(i18nString(UIStrings.noRecordings));
    this.nextNumberByDomain.clear();
  }

  async showHistoryDropDown(): Promise<RecordingData|null> {
    if (this.recordings.length < 2 || !this.enabled) {
      return null;
    }

    // DropDown.show() function finishes when the dropdown menu is closed via selection or losing focus
    const legacyModel = await DropDown.show(
        this.recordings.map(recording => recording.legacyModel), (this.lastActiveModel as PerformanceModel),
        this.buttonInternal.element);
    if (!legacyModel) {
      return null;
    }
    const index = this.recordings.findIndex(recording => recording.legacyModel === legacyModel);
    if (index < 0) {
      console.assert(false, 'selected recording not found');
      return null;
    }
    this.setCurrentModel(legacyModel);
    return this.recordings[index];
  }

  cancelIfShowing(): void {
    DropDown.cancelIfShowing();
  }

  navigate(direction: number): RecordingData|null {
    if (!this.enabled || !this.lastActiveModel) {
      return null;
    }
    const index = this.recordings.findIndex(recording => recording.legacyModel === this.lastActiveModel);
    if (index < 0) {
      return null;
    }
    const newIndex = Platform.NumberUtilities.clamp(index + direction, 0, this.recordings.length - 1);
    const legacyModel = this.recordings[newIndex].legacyModel;
    this.setCurrentModel(legacyModel);
    return this.recordings[newIndex];
  }

  private setCurrentModel(model: PerformanceModel): void {
    const data = TimelineHistoryManager.dataForModel(model);
    if (!data) {
      throw new Error('Unable to find data for model');
    }
    data.lastUsed = Date.now();
    this.lastActiveModel = model;
    const modelTitle = this.title(model);
    const buttonTitle = this.action.title();
    this.buttonInternal.setText(modelTitle);
    UI.ARIAUtils.setLabel(
        this.buttonInternal.element, i18nString(UIStrings.currentSessionSS, {PH1: modelTitle, PH2: buttonTitle}));
  }

  private updateState(): void {
    this.action.setEnabled(this.recordings.length > 1 && this.enabled);
  }

  static previewElement(performanceModel: PerformanceModel): Element {
    const data = TimelineHistoryManager.dataForModel(performanceModel);
    if (!data) {
      throw new Error('Unable to find data for model');
    }
    const startedAt = performanceModel.recordStartTime();
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

  private title(performanceModel: PerformanceModel): string {
    const data = TimelineHistoryManager.dataForModel(performanceModel);
    if (!data) {
      throw new Error('Unable to find data for model');
    }
    return data.title;
  }

  private buildPreview(
      performanceModel: PerformanceModel, traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData,
      filmStrip: TraceEngine.Extras.FilmStrip.Data|null): HTMLDivElement {
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(performanceModel.timelineModel().pageURL());
    const domain = parsedURL ? parsedURL.host : '';
    const title = performanceModel.tracingModel().title() || domain;

    const sequenceNumber = this.nextNumberByDomain.get(title) || 1;
    const titleWithSequenceNumber = i18nString(UIStrings.sD, {PH1: title, PH2: sequenceNumber});
    this.nextNumberByDomain.set(title, sequenceNumber + 1);
    const timeElement = document.createElement('span');

    const preview = document.createElement('div');
    preview.classList.add('preview-item');
    preview.classList.add('vbox');
    const data = {preview, title: titleWithSequenceNumber, time: timeElement, lastUsed: Date.now()};
    modelToPerformanceData.set(performanceModel, data);

    preview.appendChild(this.buildTextDetails(performanceModel, title, timeElement));
    const screenshotAndOverview = preview.createChild('div', 'hbox');
    screenshotAndOverview.appendChild(this.buildScreenshotThumbnail(filmStrip));
    screenshotAndOverview.appendChild(this.buildOverview(performanceModel, traceParsedData));
    return data.preview;
  }

  private buildTextDetails(performanceModel: PerformanceModel, title: string, timeElement: Element): Element {
    const container = document.createElement('div');
    container.classList.add('text-details');
    container.classList.add('hbox');
    const nameSpan = container.createChild('span', 'name');
    nameSpan.textContent = title;
    UI.ARIAUtils.setLabel(nameSpan, title);
    const tracingModel = performanceModel.tracingModel();
    const duration =
        i18n.TimeUtilities.millisToString(tracingModel.maximumRecordTime() - tracingModel.minimumRecordTime(), false);
    const timeContainer = container.createChild('span', 'time');
    timeContainer.appendChild(document.createTextNode(duration));
    timeContainer.appendChild(timeElement);
    return container;
  }

  private buildScreenshotThumbnail(filmStrip: TraceEngine.Extras.FilmStrip.Data|null): Element {
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
    void UI.UIUtils.loadImageFromData(lastFrame.screenshotAsString).then(img => {
      if (img) {
        container.appendChild(img);
      }
    });
    return container;
  }

  private buildOverview(
      performanceModel: PerformanceModel, traceParsedData: TraceEngine.Handlers.Migration.PartialTraceData): Element {
    const container = document.createElement('div');

    container.style.width = previewWidth + 'px';
    container.style.height = this.totalHeight + 'px';
    const canvas = (container.createChild('canvas') as HTMLCanvasElement);
    canvas.width = window.devicePixelRatio * previewWidth;
    canvas.height = window.devicePixelRatio * this.totalHeight;

    const ctx = canvas.getContext('2d');
    let yOffset = 0;

    for (const overview of this.allOverviews) {
      const timelineOverviewComponent = overview.constructor(traceParsedData, performanceModel);
      timelineOverviewComponent.setCanvasSize(previewWidth, overview.height);
      timelineOverviewComponent.update();
      const sourceContext = timelineOverviewComponent.context();
      const imageData = sourceContext.getImageData(0, 0, sourceContext.canvas.width, sourceContext.canvas.height);
      if (ctx) {
        ctx.putImageData(imageData, 0, yOffset);
      }
      yOffset += overview.height * window.devicePixelRatio;
    }
    return container;
  }

  private static dataForModel(model: PerformanceModel): PreviewData|null {
    return modelToPerformanceData.get(model) || null;
  }
}

export const maxRecordings = 5;
export const previewWidth = 450;
const modelToPerformanceData = new WeakMap<PerformanceModel, {
  preview: Element,
  title: string,
  time: Element,
  lastUsed: number,
}>();

export class DropDown implements UI.ListControl.ListDelegate<PerformanceModel> {
  private readonly glassPane: UI.GlassPane.GlassPane;
  private readonly listControl: UI.ListControl.ListControl<PerformanceModel>;
  private readonly focusRestorer: UI.UIUtils.ElementFocusRestorer;
  private selectionDone: ((arg0: PerformanceModel|null) => void)|null;

  constructor(models: PerformanceModel[]) {
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

    const listModel = new UI.ListModel.ListModel<PerformanceModel>();
    this.listControl =
        new UI.ListControl.ListControl<PerformanceModel>(listModel, this, UI.ListControl.ListMode.NonViewport);
    this.listControl.element.addEventListener('mousemove', this.onMouseMove.bind(this), false);
    listModel.replaceAll(models);

    UI.ARIAUtils.markAsMenu(this.listControl.element);
    UI.ARIAUtils.setLabel(this.listControl.element, i18nString(UIStrings.selectTimelineSession));
    contentElement.appendChild(this.listControl.element);
    contentElement.addEventListener('keydown', this.onKeyDown.bind(this), false);
    contentElement.addEventListener('click', this.onClick.bind(this), false);

    this.focusRestorer = new UI.UIUtils.ElementFocusRestorer(this.listControl.element);
    this.selectionDone = null;
  }

  static show(models: PerformanceModel[], currentModel: PerformanceModel, anchor: Element):
      Promise<PerformanceModel|null> {
    if (DropDown.instance) {
      return Promise.resolve((null as PerformanceModel | null));
    }
    const instance = new DropDown(models);
    return instance.show(anchor, currentModel);
  }

  static cancelIfShowing(): void {
    if (!DropDown.instance) {
      return;
    }
    DropDown.instance.close(null);
  }

  private show(anchor: Element, currentModel: PerformanceModel): Promise<PerformanceModel|null> {
    DropDown.instance = this;
    this.glassPane.setContentAnchorBox(anchor.boxInWindow());
    this.glassPane.show((this.glassPane.contentElement.ownerDocument as Document));
    this.listControl.element.focus();
    this.listControl.selectItem(currentModel);

    return new Promise(fulfill => {
      this.selectionDone = fulfill;
    });
  }

  private onMouseMove(event: Event): void {
    const node = (event.target as HTMLElement).enclosingNodeOrSelfWithClass('preview-item');
    const listItem = node && this.listControl.itemForNode(node);
    if (!listItem) {
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

  private close(model: PerformanceModel|null): void {
    if (this.selectionDone) {
      this.selectionDone(model);
    }
    this.focusRestorer.restore();
    this.glassPane.hide();
    DropDown.instance = null;
  }

  createElementForItem(item: PerformanceModel): Element {
    const element = TimelineHistoryManager.previewElement(item);
    UI.ARIAUtils.markAsMenuItem(element);
    element.classList.remove('selected');
    return element;
  }

  heightForItem(_item: PerformanceModel): number {
    console.assert(false, 'Should not be called');
    return 0;
  }

  isItemSelectable(_item: PerformanceModel): boolean {
    return true;
  }

  selectedItemChanged(
      from: PerformanceModel|null, to: PerformanceModel|null, fromElement: Element|null,
      toElement: Element|null): void {
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
    const dropdownArrowIcon = UI.Icon.Icon.create('triangle-down');
    this.element.appendChild(dropdownArrowIcon);
    this.element.addEventListener('click', () => void action.execute(), false);
    this.setEnabled(action.enabled());
    action.addEventListener(UI.ActionRegistration.Events.Enabled, event => this.setEnabled(event.data));
    this.setTitle(action.title());
  }

  setText(text: string): void {
    this.contentElement.textContent = text;
  }
}

export interface PreviewData {
  preview: Element;
  time: Element;
  lastUsed: number;
  title: string;
}
