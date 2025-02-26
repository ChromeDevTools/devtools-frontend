// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Trace from '../../models/trace/trace.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {
  type TimelineEventOverview,
  TimelineEventOverviewCPUActivity,
  TimelineEventOverviewNetwork,
  TimelineEventOverviewResponsiveness,
} from './TimelineEventOverview.js';
import timelineHistoryManagerStyles from './timelineHistoryManager.css.js';
import type {TimelineMiniMap} from './TimelineMiniMap.js';

/**
 * The dropdown works by returning an index which is the trace index; but we
 * also need a way to signify that the user picked the "Landing Page" option. We
 * represent that as Infinity so we never accidentally collide with an actual
 * trace (in reality a large number like 99 would probably suffice...)
 */
export const LANDING_PAGE_INDEX_DROPDOWN_CHOICE = Infinity;

const UIStrings = {
  /**
   *@description Screen reader label for the Timeline History dropdown button
   *@example {example.com #3} PH1
   *@example {Show recent timeline sessions} PH2
   */
  currentSessionSS: 'Current session: {PH1}. {PH2}',
  /**
   *@description the title shown when the user is viewing the landing page which is showing live performance metrics that are updated automatically.
   */
  landingPageTitle: 'Live metrics',
  /**
   * @description the title shown when the user is viewing the landing page which can be used to make a new performance recording.
   */
  nodeLandingPageTitle: 'New recording',
  /**
   *@description Text in Timeline History Manager of the Performance panel
   *@example {example.com} PH1
   *@example {2} PH2
   */
  sD: '{PH1} #{PH2}',
  /**
   *@description Accessible label for the timeline session selection menu
   */
  selectTimelineSession: 'Select timeline session',
  /**
   * @description Text label for a menu item indicating that a specific slowdown multiplier is applied.
   * @example {2} PH1
   */
  dSlowdown: '{PH1}× slowdown',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineHistoryManager.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/**
 * The dropdown includes an option to navigate to the landing page; hence the
 * two types for storing recordings. The TimelineHistoryManager automatically
 * includes a link to go back to the landing page.
 */
interface TraceRecordingHistoryItem {
  type: 'TRACE_INDEX';
  // By storing only the index of this trace, the TimelinePanel can then look
  // up this trace's data (and metadata) via this index.
  parsedTraceIndex: number;
}
interface LandingPageHistoryItem {
  type: 'LANDING_PAGE';
}
export type RecordingData = TraceRecordingHistoryItem|LandingPageHistoryItem;

export interface NewHistoryRecordingData {
  // The data we will save to restore later.
  data: TraceRecordingHistoryItem;
  // We do not store this, but need it to build the thumbnail preview.
  filmStripForPreview: Trace.Extras.FilmStrip.Data|null;
  // Also not stored, but used to create the preview overview for a new trace.
  parsedTrace: Trace.Handlers.Types.ParsedTrace;
  metadata: Trace.Types.File.MetaData|null;
}

// Lazily instantiate the formatter as the constructor takes 50ms+
// TODO: move me and others like me to i18n module
const listFormatter = (function defineFormatter() {
  let intlListFormat: Intl.ListFormat;
  return {
    format(...args: Parameters<Intl.ListFormat['format']>): ReturnType<Intl.ListFormat['format']> {
      if (!intlListFormat) {
        const opts: Intl.ListFormatOptions = {type: 'unit', style: 'short'};
        intlListFormat = new Intl.ListFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, opts);
      }
      return intlListFormat.format(...args);
    },
  };
})();

export class TimelineHistoryManager {
  private recordings: TraceRecordingHistoryItem[];
  private readonly action: UI.ActionRegistration.Action;
  private readonly nextNumberByDomain: Map<string, number>;
  private readonly buttonInternal: ToolbarButton;
  private readonly allOverviews: Array<{
    constructor: (parsedTrace: Trace.Handlers.Types.ParsedTrace) => TimelineEventOverview,
    height: number,
  }>;
  private totalHeight: number;
  private enabled: boolean;
  private lastActiveTrace: RecordingData|null = null;
  #minimapComponent?: TimelineMiniMap;
  #landingPageTitle: Common.UIString.LocalizedString;

  constructor(minimapComponent?: TimelineMiniMap, isNode?: boolean) {
    this.recordings = [];
    this.#minimapComponent = minimapComponent;
    this.action = UI.ActionRegistry.ActionRegistry.instance().getAction('timeline.show-history');
    this.nextNumberByDomain = new Map();
    this.buttonInternal = new ToolbarButton(this.action);

    this.#landingPageTitle =
        isNode ? i18nString(UIStrings.nodeLandingPageTitle) : i18nString(UIStrings.landingPageTitle);

    UI.ARIAUtils.markAsMenuButton(this.buttonInternal.element);
    this.clear();

    // Attempt to reuse the overviews coming from the panel's minimap
    // before creating new instances.
    this.allOverviews = [
      {

        constructor: parsedTrace => {
          const responsivenessOverviewFromMinimap =
              this.#minimapComponent?.getControls().find(
                  control => control instanceof TimelineEventOverviewResponsiveness) as
              TimelineEventOverviewResponsiveness;
          return responsivenessOverviewFromMinimap || new TimelineEventOverviewResponsiveness(parsedTrace);
        },
        height: 3,
      },
      {
        constructor: parsedTrace => {
          const cpuOverviewFromMinimap =
              this.#minimapComponent?.getControls().find(
                  control => control instanceof TimelineEventOverviewCPUActivity) as TimelineEventOverviewCPUActivity;
          if (cpuOverviewFromMinimap) {
            return cpuOverviewFromMinimap;
          }
          return new TimelineEventOverviewCPUActivity(parsedTrace);
        },
        height: 20,
      },
      {
        constructor: parsedTrace => {
          const networkOverviewFromMinimap =
              this.#minimapComponent?.getControls().find(control => control instanceof TimelineEventOverviewNetwork) as
              TimelineEventOverviewNetwork;
          return networkOverviewFromMinimap || new TimelineEventOverviewNetwork(parsedTrace);
        },
        height: 8,
      },
    ];
    this.totalHeight = this.allOverviews.reduce((acc, entry) => acc + entry.height, 0);
    this.enabled = true;
  }

  addRecording(newInput: NewHistoryRecordingData): void {
    const filmStrip = newInput.filmStripForPreview;
    this.lastActiveTrace = newInput.data;
    this.recordings.unshift(newInput.data);

    // Order is important: this needs to happen first because lots of the
    // subsequent code depends on us storing the preview data into the map.
    this.#buildAndStorePreviewData(newInput.data.parsedTraceIndex, newInput.parsedTrace, newInput.metadata, filmStrip);

    const modelTitle = this.title(newInput.data);
    this.buttonInternal.setText(modelTitle);
    const buttonTitle = this.action.title();
    UI.ARIAUtils.setLabel(
        this.buttonInternal.element, i18nString(UIStrings.currentSessionSS, {PH1: modelTitle, PH2: buttonTitle}));
    this.updateState();
    if (this.recordings.length <= maxRecordings) {
      return;
    }
    const modelUsedMoreTimeAgo =
        this.recordings.reduce((a, b) => lastUsedTime(a.parsedTraceIndex) < lastUsedTime(b.parsedTraceIndex) ? a : b);
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
    this.lastActiveTrace = null;
    this.updateState();
    this.buttonInternal.setText(this.#landingPageTitle);
    this.nextNumberByDomain.clear();
  }

  #getActiveTraceIndexForListControl(): number {
    if (!this.lastActiveTrace) {
      return -1;
    }
    if (this.lastActiveTrace.type === 'LANDING_PAGE') {
      return LANDING_PAGE_INDEX_DROPDOWN_CHOICE;
    }
    return this.lastActiveTrace.parsedTraceIndex;
  }

  async showHistoryDropDown(): Promise<RecordingData|null> {
    if (this.recordings.length < 1 || !this.enabled) {
      return null;
    }

    // DropDown.show() function finishes when the dropdown menu is closed via selection or losing focus
    const activeTraceIndex = await DropDown.show(
        this.recordings.map(recording => recording.parsedTraceIndex), this.#getActiveTraceIndexForListControl(),
        this.buttonInternal.element, this.#landingPageTitle);

    if (activeTraceIndex === null) {
      return null;
    }

    // The ListControl class that backs the dropdown uses indexes; we represent
    // the landing page choice via this special index.
    if (activeTraceIndex === LANDING_PAGE_INDEX_DROPDOWN_CHOICE) {
      this.#setActiveTrace({type: 'LANDING_PAGE'});
      return {type: 'LANDING_PAGE'};
    }

    const index = this.recordings.findIndex(recording => recording.parsedTraceIndex === activeTraceIndex);
    if (index < 0) {
      console.assert(false, 'selected recording not found');
      return null;
    }

    this.#setActiveTrace(this.recordings[index]);
    return this.recordings[index];
  }

  cancelIfShowing(): void {
    DropDown.cancelIfShowing();
  }

  /**
   * Navigate by 1 in either direction to the next trace.
   * Navigating in this way does not include the landing page; it will loop
   * over only the traces.
   */
  navigate(direction: number): TraceRecordingHistoryItem|null {
    if (!this.enabled || this.lastActiveTrace === null) {
      return null;
    }
    if (!this.lastActiveTrace || this.lastActiveTrace.type === 'LANDING_PAGE') {
      return null;
    }

    const index = this.recordings.findIndex(recording => {
      return this.lastActiveTrace?.type === 'TRACE_INDEX' && recording.type === 'TRACE_INDEX' &&
          recording.parsedTraceIndex === this.lastActiveTrace.parsedTraceIndex;
    });

    if (index < 0) {
      return null;
    }

    const newIndex = Platform.NumberUtilities.clamp(index + direction, 0, this.recordings.length - 1);
    this.#setActiveTrace(this.recordings[newIndex]);
    return this.recordings[newIndex];
  }

  navigateToLandingPage(): void {
    this.#setActiveTrace({type: 'LANDING_PAGE'});
  }

  #setActiveTrace(item: RecordingData): void {
    if (item.type === 'TRACE_INDEX') {
      const data = TimelineHistoryManager.dataForTraceIndex(item.parsedTraceIndex);
      if (!data) {
        throw new Error('Unable to find data for model');
      }
      data.lastUsed = Date.now();
    }

    this.lastActiveTrace = item;
    const modelTitle = this.title(item);
    const buttonTitle = this.action.title();
    this.buttonInternal.setText(modelTitle);
    UI.ARIAUtils.setLabel(
        this.buttonInternal.element, i18nString(UIStrings.currentSessionSS, {PH1: modelTitle, PH2: buttonTitle}));
  }

  private updateState(): void {
    this.action.setEnabled(this.recordings.length >= 1 && this.enabled);
  }

  static previewElement(parsedTraceIndex: number): Element {
    const data = TimelineHistoryManager.dataForTraceIndex(parsedTraceIndex);
    if (!data) {
      throw new Error('Unable to find data for model');
    }
    return data.preview;
  }

  private title(item: RecordingData): string {
    if (item.type === 'LANDING_PAGE') {
      return this.#landingPageTitle;
    }

    const data = TimelineHistoryManager.dataForTraceIndex(item.parsedTraceIndex);
    if (!data) {
      throw new Error('Unable to find data for model');
    }
    return data.title;
  }

  #buildAndStorePreviewData(
      parsedTraceIndex: number, parsedTrace: Trace.Handlers.Types.ParsedTrace, metadata: Trace.Types.File.MetaData|null,
      filmStrip: Trace.Extras.FilmStrip.Data|null): HTMLDivElement {
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(parsedTrace.Meta.mainFrameURL);
    const domain = parsedURL ? parsedURL.host : '';

    const sequenceNumber = this.nextNumberByDomain.get(domain) || 1;
    const titleWithSequenceNumber = i18nString(UIStrings.sD, {PH1: domain, PH2: sequenceNumber});
    this.nextNumberByDomain.set(domain, sequenceNumber + 1);

    const preview = document.createElement('div');
    preview.classList.add('preview-item');
    preview.classList.add('vbox');
    preview.setAttribute('jslog', `${VisualLogging.dropDown('timeline.history-item').track({click: true})}`);
    preview.style.width = `${previewWidth}px`;
    const data = {
      preview,
      title: titleWithSequenceNumber,
      lastUsed: Date.now(),
    };
    parsedTraceIndexToPerformancePreviewData.set(parsedTraceIndex, data);

    preview.appendChild(this.#buildTextDetails(metadata, domain));
    const screenshotAndOverview = preview.createChild('div', 'hbox');
    screenshotAndOverview.appendChild(this.#buildScreenshotThumbnail(filmStrip));
    screenshotAndOverview.appendChild(this.#buildOverview(parsedTrace));
    return data.preview;
  }

  #buildTextDetails(metadata: Trace.Types.File.MetaData|null, title: string): Element {
    const container = document.createElement('div');
    container.classList.add('text-details');
    container.classList.add('hbox');
    const nameSpan = container.createChild('span', 'name');
    nameSpan.textContent = title;
    UI.ARIAUtils.setLabel(nameSpan, title);

    if (metadata) {
      const parts = [
        metadata.emulatedDeviceTitle,
        metadata.cpuThrottling ? i18nString(UIStrings.dSlowdown, {PH1: metadata.cpuThrottling}) : undefined,
        metadata.networkThrottling,
      ].filter(Boolean);
      container.createChild('span', 'metadata').textContent = listFormatter.format(parts as string[]);
    }

    return container;
  }

  #buildScreenshotThumbnail(filmStrip: Trace.Extras.FilmStrip.Data|null): Element {
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
    // TODO(paulirish): Adopt Util.ImageCache
    const uri = Trace.Handlers.ModelHandlers.Screenshots.screenshotImageDataUri(lastFrame.screenshotEvent);
    void UI.UIUtils.loadImage(uri).then(img => {
      if (img) {
        container.appendChild(img);
      }
    });
    return container;
  }

  #buildOverview(parsedTrace: Trace.Handlers.Types.ParsedTrace): Element {
    const container = document.createElement('div');
    const dPR = window.devicePixelRatio;
    container.style.width = previewWidth + 'px';
    container.style.height = this.totalHeight + 'px';
    const canvas = container.createChild('canvas');
    canvas.width = dPR * previewWidth;
    canvas.height = dPR * this.totalHeight;

    const ctx = canvas.getContext('2d');
    let yOffset = 0;

    for (const overview of this.allOverviews) {
      const timelineOverviewComponent = overview.constructor(parsedTrace);
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
    return parsedTraceIndexToPerformancePreviewData.get(index) || null;
  }
}

export const maxRecordings = 5;
export const previewWidth = 500;
// The reason we store a global map is because the Dropdown component needs to
// be able to read the preview data in order to show a preview in the dropdown.
const parsedTraceIndexToPerformancePreviewData = new Map<number, PreviewData>();

export interface PreviewData {
  preview: Element;
  lastUsed: number;
  title: string;
}

export class DropDown implements UI.ListControl.ListDelegate<number> {
  private readonly glassPane: UI.GlassPane.GlassPane;
  private readonly listControl: UI.ListControl.ListControl<number>;
  private readonly focusRestorer: UI.UIUtils.ElementFocusRestorer;
  private selectionDone: ((arg0: number|null) => void)|null;
  #landingPageTitle: Common.UIString.LocalizedString;

  constructor(availableparsedTraceIndexes: number[], landingPageTitle: Common.UIString.LocalizedString) {
    this.#landingPageTitle = landingPageTitle;

    this.glassPane = new UI.GlassPane.GlassPane();
    this.glassPane.setSizeBehavior(UI.GlassPane.SizeBehavior.MEASURE_CONTENT);
    this.glassPane.setOutsideClickCallback(() => this.close(null));
    this.glassPane.setPointerEventsBehavior(UI.GlassPane.PointerEventsBehavior.BLOCKED_BY_GLASS_PANE);
    this.glassPane.setAnchorBehavior(UI.GlassPane.AnchorBehavior.PREFER_BOTTOM);
    this.glassPane.element.addEventListener('blur', () => this.close(null));

    const shadowRoot = UI.UIUtils.createShadowRootWithCoreStyles(
        this.glassPane.contentElement, {cssFile: timelineHistoryManagerStyles});
    const contentElement = shadowRoot.createChild('div', 'drop-down');

    const listModel = new UI.ListModel.ListModel<number>();
    this.listControl = new UI.ListControl.ListControl<number>(listModel, this, UI.ListControl.ListMode.NonViewport);
    this.listControl.element.addEventListener('mousemove', this.onMouseMove.bind(this), false);
    listModel.replaceAll(availableparsedTraceIndexes);

    UI.ARIAUtils.markAsMenu(this.listControl.element);
    UI.ARIAUtils.setLabel(this.listControl.element, i18nString(UIStrings.selectTimelineSession));
    contentElement.appendChild(this.listControl.element);
    contentElement.addEventListener('keydown', this.onKeyDown.bind(this), false);
    contentElement.addEventListener('click', this.onClick.bind(this), false);

    this.focusRestorer = new UI.UIUtils.ElementFocusRestorer(this.listControl.element);
    this.selectionDone = null;
  }

  static show(
      availableparsedTraceIndexes: number[], activeparsedTraceIndex: number, anchor: Element,
      landingPageTitle: Common.UIString.LocalizedString = i18nString(UIStrings.landingPageTitle)):
      Promise<number|null> {
    if (DropDown.instance) {
      return Promise.resolve(null);
    }
    const availableDropdownChoices = [...availableparsedTraceIndexes];
    availableDropdownChoices.unshift(LANDING_PAGE_INDEX_DROPDOWN_CHOICE);
    const instance = new DropDown(availableDropdownChoices, landingPageTitle);
    return instance.show(anchor, activeparsedTraceIndex);
  }

  static cancelIfShowing(): void {
    if (!DropDown.instance) {
      return;
    }
    DropDown.instance.close(null);
  }

  private show(anchor: Element, activeparsedTraceIndex: number): Promise<number|null> {
    DropDown.instance = this;
    this.glassPane.setContentAnchorBox(anchor.boxInWindow());
    this.glassPane.show(this.glassPane.contentElement.ownerDocument);
    this.listControl.element.focus();
    this.listControl.selectItem(activeparsedTraceIndex);

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

  createElementForItem(parsedTraceIndex: number): Element {
    if (parsedTraceIndex === LANDING_PAGE_INDEX_DROPDOWN_CHOICE) {
      return this.#createLandingPageListItem();
    }
    const element = TimelineHistoryManager.previewElement(parsedTraceIndex);
    UI.ARIAUtils.markAsMenuItem(element);
    element.classList.remove('selected');
    return element;
  }

  #createLandingPageListItem(): HTMLElement {
    const div = document.createElement('div');
    UI.ARIAUtils.markAsMenuItem(div);
    div.classList.remove('selected');
    div.classList.add('preview-item');
    div.classList.add('landing-page-item');

    div.style.width = `${previewWidth}px`;

    const icon = IconButton.Icon.create('arrow-back');
    div.appendChild(icon);

    const text = document.createElement('span');
    text.innerText = this.#landingPageTitle;
    div.appendChild(text);
    return div;
  }

  heightForItem(_parsedTraceIndex: number): number {
    console.assert(false, 'Should not be called');
    return 0;
  }

  isItemSelectable(_parsedTraceIndex: number): boolean {
    return true;
  }

  selectedItemChanged(_from: number|null, _to: number|null, fromElement: Element|null, toElement: Element|null): void {
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
    element.setAttribute('jslog', `${VisualLogging.dropDown('history')}`);
    super(element);
    this.contentElement = this.element.createChild('span', 'content');
    this.element.addEventListener('click', () => void action.execute(), false);
    this.setEnabled(action.enabled());
    action.addEventListener(UI.ActionRegistration.Events.ENABLED, event => this.setEnabled(event.data));
    this.setTitle(action.title());
  }

  setText(text: string): void {
    this.contentElement.textContent = text;
  }
}
