// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Trace from '../../models/trace/trace.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {
  type TimelineEventOverview,
  TimelineEventOverviewCPUActivity,
  TimelineEventOverviewNetwork,
  TimelineEventOverviewResponsiveness,
} from './TimelineEventOverview.js';
import timelineHistoryManagerStyles from './timelineHistoryManager.css.js';
import type {TimelineMiniMap} from './TimelineMiniMap.js';

const {classMap, ifDefined, ref, styleMap} = Directives;

/**
 * The dropdown works by returning an index which is the trace index; but we
 * also need a way to signify that the user picked the "Landing Page" option. We
 * represent that as Infinity so we never accidentally collide with an actual
 * trace (in reality a large number like 99 would probably suffice...)
 */
export const LANDING_PAGE_INDEX_DROPDOWN_CHOICE: number = Infinity;

const UIStrings = {
  /**
   * @description Screen reader announcement for the current session in the timeline history dropdown button.
   * @example {example.com #3} PH1
   * @example {Show recent timeline sessions} PH2
   */
  currentSessionSS: 'Current session: {PH1}. {PH2}',
  /**
   * @description Title shown when viewing the live metrics landing page in the Performance panel.
   */
  landingPageTitle: 'Live metrics',
  /**
   * @description Title shown when viewing the new recording landing page for Node.js in the Performance panel.
   */
  nodeLandingPageTitle: 'New recording',
  /**
   * @description Format for a trace title with domain and sequence number in the timeline history dropdown.
   * @example {example.com} PH1
   * @example {2} PH2
   */
  sD: '{PH1} #{PH2}',
  /**
   * @description Format for a custom trace title with sequence number in the timeline history dropdown.
   * @example {Custom Profile} PH1
   * @example {example.com #2} PH2
   */
  customTitleWithSequence: '{PH1} ({PH2})',
  /**
   * @description Accessible label for the timeline session selection dropdown in the Performance panel.
   */
  selectTimelineSession: 'Select timeline session',
  /**
   * @description Label indicating a CPU slowdown multiplier applied to a recording in the timeline history dropdown.
   * @example {2} PH1
   */
  dSlowdown: '{PH1}× slowdown',
  /**
   * @description Tooltip for the back button in the timeline session selection dropdown in the Performance panel.
   */
  backButtonTooltip: 'View live metrics page',
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
  parsedTrace: Trace.TraceModel.ParsedTrace;
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
  #recordings: TraceRecordingHistoryItem[];
  readonly #action: UI.ActionRegistration.Action;
  readonly #nextNumberByDomain: Map<string, number>;
  readonly #buttonItem: UI.Toolbar.ToolbarItem;
  readonly #allOverviews: Array<{
    constructor: (parsedTrace: Trace.TraceModel.ParsedTrace) => TimelineEventOverview,
    height: number,
  }>;
  #totalHeight: number;
  #enabled: boolean;
  #lastActiveTrace: RecordingData|null = null;
  #minimapComponent?: TimelineMiniMap;
  #landingPageTitle: Common.UIString.LocalizedString;

  constructor(minimapComponent?: TimelineMiniMap, isNode?: boolean) {
    this.#recordings = [];
    this.#minimapComponent = minimapComponent;
    this.#action = UI.ActionRegistry.ActionRegistry.instance().getAction('timeline.show-history');
    this.#nextNumberByDomain = new Map();

    this.#buttonItem = new UI.Toolbar.ToolbarItem(document.createElement('button'));
    this.#buttonItem.setEnabled(this.#action.enabled());
    this.#action.addEventListener(UI.ActionRegistration.Events.ENABLED,
                                  event => this.#buttonItem.setEnabled(event.data));

    this.#landingPageTitle =
        isNode ? i18nString(UIStrings.nodeLandingPageTitle) : i18nString(UIStrings.landingPageTitle);

    this.clear();

    // Attempt to reuse the overviews coming from the panel's minimap
    // before creating new instances.
    this.#allOverviews = [
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
    this.#totalHeight = this.#allOverviews.reduce((acc, entry) => acc + entry.height, 0);
    this.#enabled = true;
  }

  addRecording(newInput: NewHistoryRecordingData): void {
    const filmStrip = newInput.filmStripForPreview;
    this.#lastActiveTrace = newInput.data;
    this.#recordings.unshift(newInput.data);

    // Order is important: this needs to happen first because lots of the
    // subsequent code depends on us storing the preview data into the map.
    this.#buildAndStorePreviewData(newInput.data.parsedTraceIndex, newInput.parsedTrace, filmStrip);

    this.#updateButton();
    this.#updateState();
    if (this.#recordings.length <= maxRecordings) {
      return;
    }
    const modelUsedMoreTimeAgo =
        this.#recordings.reduce((a, b) => lastUsedTime(a.parsedTraceIndex) < lastUsedTime(b.parsedTraceIndex) ? a : b);
    this.#recordings.splice(this.#recordings.indexOf(modelUsedMoreTimeAgo), 1);

    function lastUsedTime(index: number): number {
      const data = TimelineHistoryManager.#dataForTraceIndex(index);
      if (!data) {
        throw new Error('Unable to find data for model');
      }
      return data.lastUsed;
    }
  }

  setEnabled(enabled: boolean): void {
    this.#enabled = enabled;
    this.#updateState();
  }

  button(): UI.Toolbar.ToolbarItem {
    return this.#buttonItem;
  }

  clear(): void {
    this.#recordings = [];
    this.#lastActiveTrace = null;
    this.#updateState();
    this.#nextNumberByDomain.clear();
    this.#updateButton();
  }

  #getActiveTraceIndex(): number {
    if (!this.#lastActiveTrace) {
      return -1;
    }
    if (this.#lastActiveTrace.type === 'LANDING_PAGE') {
      return LANDING_PAGE_INDEX_DROPDOWN_CHOICE;
    }
    return this.#lastActiveTrace.parsedTraceIndex;
  }

  async showHistoryDropDown(): Promise<RecordingData|null> {
    if (this.#recordings.length < 1 || !this.#enabled) {
      return null;
    }

    // DropDown.show() function finishes when the dropdown menu is closed via selection or losing focus
    const activeTraceIndex =
        await DropDown.show(this.#recordings.map(recording => recording.parsedTraceIndex), this.#getActiveTraceIndex(),
                            this.#buttonItem.element, this.#landingPageTitle);

    if (activeTraceIndex === null) {
      return null;
    }

    // The dropdown choice uses indexes; we represent the landing page choice via this special index.
    if (activeTraceIndex === LANDING_PAGE_INDEX_DROPDOWN_CHOICE) {
      this.#setActiveTrace({type: 'LANDING_PAGE'});
      return {type: 'LANDING_PAGE'};
    }

    const index = this.#recordings.findIndex(recording => recording.parsedTraceIndex === activeTraceIndex);
    if (index < 0) {
      console.assert(false, 'selected recording not found');
      return null;
    }

    this.#setActiveTrace(this.#recordings[index]);
    return this.#recordings[index];
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
    if (!this.#enabled || this.#lastActiveTrace === null) {
      return null;
    }
    if (!this.#lastActiveTrace || this.#lastActiveTrace.type === 'LANDING_PAGE') {
      return null;
    }

    const index = this.#recordings.findIndex(recording => {
      return this.#lastActiveTrace?.type === 'TRACE_INDEX' && recording.type === 'TRACE_INDEX' &&
          recording.parsedTraceIndex === this.#lastActiveTrace.parsedTraceIndex;
    });

    if (index < 0) {
      return null;
    }

    const newIndex = Platform.NumberUtilities.clamp(index + direction, 0, this.#recordings.length - 1);
    this.#setActiveTrace(this.#recordings[newIndex]);
    return this.#recordings[newIndex];
  }

  navigateToLandingPage(): void {
    this.#setActiveTrace({type: 'LANDING_PAGE'});
  }

  #setActiveTrace(item: RecordingData): void {
    if (item.type === 'TRACE_INDEX') {
      const data = TimelineHistoryManager.#dataForTraceIndex(item.parsedTraceIndex);
      if (!data) {
        throw new Error('Unable to find data for model');
      }
      data.lastUsed = Date.now();
    }

    this.#lastActiveTrace = item;
    this.#updateButton();
  }

  #updateButton(): void {
    const title = this.#lastActiveTrace ? this.#title(this.#lastActiveTrace) : this.#landingPageTitle;
    const ariaLabel = this.#lastActiveTrace ?
        i18nString(UIStrings.currentSessionSS, {PH1: title, PH2: this.#action.title()}) :
        this.#action.title();
    const input: ButtonViewInput = {
      title,
      ariaLabel,
      tooltip: this.#action.title(),
      onClick: () => void this.#action.execute(),
    };
    BUTTON_VIEW(input, undefined, this.#buttonItem.element);
  }

  #updateState(): void {
    this.#action.setEnabled(this.#recordings.length >= 1 && this.#enabled);
  }

  #title(item: RecordingData): string {
    if (item.type === 'LANDING_PAGE') {
      return this.#landingPageTitle;
    }

    const data = TimelineHistoryManager.#dataForTraceIndex(item.parsedTraceIndex);
    if (!data) {
      throw new Error('Unable to find data for model');
    }
    return data.title;
  }

  #buildAndStorePreviewData(parsedTraceIndex: number, parsedTrace: Trace.TraceModel.ParsedTrace,
                            filmStrip: Trace.Extras.FilmStrip.Data|null): void {
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(parsedTrace.data.Meta.mainFrameURL);
    const domain = parsedURL ? parsedURL.host : '';

    const sequenceNumber = this.#nextNumberByDomain.get(domain) || 1;
    const titleWithSequenceNumber =
        domain ? i18nString(UIStrings.sD, {PH1: domain, PH2: sequenceNumber}) : `#${sequenceNumber}`;
    this.#nextNumberByDomain.set(domain, sequenceNumber + 1);

    const customTitle = parsedTrace.metadata.title;
    const title = customTitle ?
        i18nString(UIStrings.customTitleWithSequence, {PH1: customTitle, PH2: titleWithSequenceNumber}) :
        titleWithSequenceNumber;

    const metadata = parsedTrace.metadata;
    let metadataText = '';
    if (metadata) {
      const parts = [
        metadata.emulatedDeviceTitle,
        metadata.cpuThrottling ? i18nString(UIStrings.dSlowdown, {PH1: metadata.cpuThrottling}) : undefined,
        metadata.networkThrottling,
      ].filter(Boolean);
      metadataText = listFormatter.format(parts as string[]);
    }

    const screenshotEvent = filmStrip?.frames.at(-1)?.screenshotEvent ?? null;
    const overview = this.#buildOverview(parsedTrace);

    const data: PreviewData = {
      title,
      lastUsed: Date.now(),
      metadataText,
      screenshotEvent,
      overview,
      overviewHeight: this.#totalHeight,
    };
    parsedTraceIndexToPerformancePreviewData.set(parsedTraceIndex, data);
  }

  #buildOverview(parsedTrace: Trace.TraceModel.ParsedTrace): ImageBitmap {
    const dPR = window.devicePixelRatio;
    const canvas = new OffscreenCanvas(dPR * previewWidth, dPR * this.#totalHeight);
    const ctx = canvas.getContext('2d');
    let yOffset = 0;

    for (const overview of this.#allOverviews) {
      const timelineOverviewComponent = overview.constructor(parsedTrace);
      timelineOverviewComponent.update();
      if (ctx) {
        ctx.drawImage(
            timelineOverviewComponent.context().canvas, 0, yOffset, dPR * previewWidth, overview.height * dPR);
      }
      yOffset += overview.height * dPR;
    }
    return canvas.transferToImageBitmap();
  }

  static #dataForTraceIndex(index: number): PreviewData|null {
    return parsedTraceIndexToPerformancePreviewData.get(index) || null;
  }
}

export type DropDownItem = {
  type: 'LANDING_PAGE',
  title: Common.UIString.LocalizedString,
}|{
  type: 'RECORDING',
  parsedTraceIndex: number,
  preview: PreviewData,
};

function itemId(item: DropDownItem): string {
  if (item.type === 'LANDING_PAGE') {
    return 'history-dropdown-item-landing-page';
  }
  return `history-dropdown-item-${item.parsedTraceIndex}`;
}

const thumbnailAspectRatio = 3 / 2;

// clang-format off
function renderScreenshotThumbnail(
    screenshotEvent: Trace.Extras.FilmStrip.Frame['screenshotEvent']|null,
    height: number): LitTemplate {
  return html`
    <div class="screenshot-thumb" style=${styleMap({width: `${height * thumbnailAspectRatio}px`, height: `${height}px`})}>
      ${screenshotEvent ? html`<img src=${Trace.Handlers.ModelHandlers.Screenshots.screenshotImageDataUri(screenshotEvent)}>` : nothing}
    </div>
  `;
}

function renderOverview(overview: ImageBitmap, height: number): LitTemplate {
  return html`
    <div style=${styleMap({width: `${previewWidth}px`, height: `${height}px`})}>
      <canvas width=${overview.width} height=${overview.height} ${ref(el => {
        if (el instanceof HTMLCanvasElement) {
          const ctx = el.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, el.width, el.height);
            ctx.drawImage(overview, 0, 0);
          }
        }
      })}></canvas>
    </div>
  `;
}

function renderLandingPageContent(item: Extract<DropDownItem, {type: 'LANDING_PAGE'}>): LitTemplate {
  return html`
    <devtools-icon class="back-arrow" title=${i18nString(UIStrings.backButtonTooltip)} name="arrow-back"></devtools-icon>
    <span>${item.title}</span>
  `;
}

function renderRecordingContent(data: PreviewData): LitTemplate {
  return html`
    <div class="text-details hbox">
      <span class="name">${data.title}</span>
      ${data.metadataText ? html`<span class="metadata">${data.metadataText}</span>` : nothing}
    </div>
    <div class="hbox">
      ${renderScreenshotThumbnail(data.screenshotEvent, data.overviewHeight)}
      ${renderOverview(data.overview, data.overviewHeight)}
    </div>
  `;
}

function renderEntry(
    item: DropDownItem,
    isSelected: boolean,
    posInSet: number,
    setSize: number,
    onHover: () => void,
    onActivate: () => void): LitTemplate {
  const classes: Record<string, boolean> = {'preview-item': true, selected: isSelected};
  let jslog: VisualLogging.Loggable;
  let content: LitTemplate;
  switch (item.type) {
    case 'LANDING_PAGE':
      jslog = VisualLogging.item().track({click: true, resize: true, keydown: 'ArrowUp|ArrowDown|PageUp|PageDown|Home|End'});
      content = renderLandingPageContent(item);
      classes['landing-page-item'] = true;
      break;
    case 'RECORDING':
      jslog = VisualLogging.dropDown('timeline.history-item').track({click: true});
      content = renderRecordingContent(item.preview);
      classes['vbox'] = true;
      break;
    default:
      Platform.assertNever(item, 'Unknown history dropdown item');
  }
  return html`
    <div class=${classMap(classes)}
        role="menuitem"
        id=${itemId(item)}
        aria-posinset=${posInSet}
        aria-setsize=${setSize}
        aria-selected=${ifDefined(isSelected ? 'true' : undefined)}
        jslog=${jslog}
        style=${styleMap({width: `${previewWidth}px`})}
        @mousemove=${onHover}
        @click=${onActivate}>
      ${content}
    </div>
  `;
}

export type NavigationTarget = 'previous'|'next'|'first'|'last';

export interface DropDownViewInput {
  items: DropDownItem[];
  selectedItem: DropDownItem|null;
  onHover: (item: DropDownItem) => void;
  onActivate: (item: DropDownItem) => void;
  onNavigate: (target: NavigationTarget) => void;
  onActivateSelected: () => void;
  onCancel: () => void;
}

export type View = (input: DropDownViewInput, output: undefined, target: HTMLElement|DocumentFragment) => void;

// clang-format off
export const DEFAULT_VIEW: View = (input: DropDownViewInput, _output: undefined, target: HTMLElement|DocumentFragment): void => {
  const activeDescendantId = input.selectedItem ? itemId(input.selectedItem) : nothing;
  const onKeyDown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case 'ArrowUp':
        input.onNavigate('previous');
        break;
      case 'ArrowDown':
        input.onNavigate('next');
        break;
      case 'Home':
        input.onNavigate('first');
        break;
      case 'End':
        input.onNavigate('last');
        break;
      case 'Enter':
        input.onActivateSelected();
        break;
      case 'Tab':
      case 'Escape':
        input.onCancel();
        break;
      default:
        return;
    }
    event.consume(true);
  };

  render(
      html`
        <style>${timelineHistoryManagerStyles}</style>
        <div class="drop-down">
          <div role="menu"
              aria-label=${i18nString(UIStrings.selectTimelineSession)}
              tabindex="-1"
              autofocus
              style="overflow-y: auto"
              aria-activedescendant=${activeDescendantId}
              @keydown=${onKeyDown}>
            ${input.items.map((item, index) => {
              const isSelected = item === input.selectedItem;
              return renderEntry(
                  item, isSelected, index + 1, input.items.length, (): void => input.onHover(item),
                  (): void => input.onActivate(item));
            })}
          </div>
        </div>
      `,
      target);
};
// clang-format on

export const maxRecordings = 5;
export const previewWidth = 500;
// The reason we store a global map is because the Dropdown component needs to
// be able to read the preview data in order to show a preview in the dropdown.
const parsedTraceIndexToPerformancePreviewData = new Map<number, PreviewData>();

export interface PreviewData {
  lastUsed: number;
  title: string;
  metadataText: string;
  screenshotEvent: Trace.Extras.FilmStrip.Frame['screenshotEvent']|null;
  overview: ImageBitmap;
  overviewHeight: number;
}

export class DropDown extends UI.Widget.Widget<ShadowRoot> {
  readonly #view: View;
  #items: DropDownItem[] = [];
  #selectedItem: DropDownItem|null = null;
  #glassPane: UI.GlassPane.GlassPane|null = null;
  #previousFocus: HTMLElement|null = null;
  #selectionDone: ((arg0: number|null) => void)|null = null;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: 'pure'});
    this.#view = view;
  }

  get items(): DropDownItem[] {
    return this.#items;
  }

  set items(items: DropDownItem[]) {
    if (this.#items === items) {
      return;
    }
    this.#items = items;
    this.requestUpdate();
  }

  get selectedItem(): DropDownItem|null {
    return this.#selectedItem;
  }

  set selectedItem(item: DropDownItem|null) {
    if (this.#selectedItem === item) {
      return;
    }
    this.#selectedItem = item;
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override performUpdate(): void {
    const input: DropDownViewInput = {
      items: this.#items,
      selectedItem: this.#selectedItem,
      onHover: item => this.#hover(item),
      onActivate: item => this.#activate(item),
      onNavigate: target => this.#navigate(target),
      onActivateSelected: () => this.#activateSelected(),
      onCancel: () => this.#close(null),
    };
    this.#view(input, undefined, this.contentElement);
  }

  static show(availableparsedTraceIndexes: number[], activeparsedTraceIndex: number, anchor: Element,
              landingPageTitle: Common.UIString.LocalizedString = i18nString(UIStrings.landingPageTitle),
              view: View = DEFAULT_VIEW): Promise<number|null> {
    if (DropDown.instance) {
      return Promise.resolve(null);
    }
    const items: DropDownItem[] = [
      {type: 'LANDING_PAGE', title: landingPageTitle},
    ];
    for (const traceIndex of availableparsedTraceIndexes) {
      const preview = parsedTraceIndexToPerformancePreviewData.get(traceIndex);
      if (!preview) {
        throw new Error('Unable to find data for model');
      }
      items.push({
        type: 'RECORDING',
        parsedTraceIndex: traceIndex,
        preview,
      });
    }
    const instance = new DropDown(undefined, view);
    DropDown.instance = instance;
    instance.items = items;
    return instance.#show(anchor, activeparsedTraceIndex);
  }

  static cancelIfShowing(): void {
    if (!DropDown.instance) {
      return;
    }
    DropDown.instance.#close(null);
  }

  #show(anchor: Element, activeparsedTraceIndex: number): Promise<number|null> {
    const activeItem = this.#items.find(item => {
      if (item.type === 'LANDING_PAGE') {
        return activeparsedTraceIndex === LANDING_PAGE_INDEX_DROPDOWN_CHOICE;
      }
      return item.parsedTraceIndex === activeparsedTraceIndex;
    });
    this.selectedItem = activeItem ?? null;
    this.#previousFocus = UI.DOMUtilities.deepActiveElement(document) as HTMLElement | null;

    this.#glassPane = new UI.GlassPane.GlassPane();
    this.#glassPane.setSizeBehavior(UI.GlassPane.SizeBehavior.MEASURE_CONTENT);
    this.#glassPane.setOutsideClickCallback(() => this.#close(null));
    this.#glassPane.setPointerEventsBehavior(UI.GlassPane.PointerEventsBehavior.BLOCKED_BY_GLASS_PANE);
    this.#glassPane.setAnchorBehavior(UI.GlassPane.AnchorBehavior.PREFER_BOTTOM);
    this.#glassPane.element.addEventListener('blur', () => this.#close(null));

    super.show(this.#glassPane.contentElement);

    void this.updateComplete.then(() => {
      if (DropDown.instance !== this || !this.#glassPane) {
        return;
      }
      this.#glassPane.setContentAnchorBox(anchor.boxInWindow());
      this.#glassPane.show(this.#glassPane.contentElement.ownerDocument);
      this.focus();
    });

    return new Promise(fulfill => {
      this.#selectionDone = fulfill;
    });
  }

  #navigate(target: NavigationTarget): void {
    const len = this.#items.length;
    const current = this.#selectedItem ? this.#items.indexOf(this.#selectedItem) : -1;
    let nextIndex: number;
    switch (target) {
      case 'first':
        nextIndex = 0;
        break;
      case 'last':
        nextIndex = len - 1;
        break;
      case 'previous':
        nextIndex = current === -1 ? len - 1 : (current - 1 + len) % len;
        break;
      case 'next':
        nextIndex = current === -1 ? 0 : (current + 1) % len;
        break;
      default:
        Platform.assertNever(target, 'Unknown navigation target');
    }
    this.#selectAt(nextIndex);
  }

  #selectAt(index: number): void {
    this.selectedItem = this.#items[index];
  }

  #hover(item: DropDownItem): void {
    this.selectedItem = item;
  }

  #activate(item: DropDownItem): void {
    const choice = item.type === 'LANDING_PAGE' ? LANDING_PAGE_INDEX_DROPDOWN_CHOICE : item.parsedTraceIndex;
    this.#close(choice);
  }

  #activateSelected(): void {
    if (this.#selectedItem) {
      this.#activate(this.#selectedItem);
    } else {
      this.#close(null);
    }
  }

  #close(traceIndex: number|null): void {
    if (DropDown.instance !== this) {
      return;
    }
    DropDown.instance = null;

    if (this.#selectionDone) {
      this.#selectionDone(traceIndex);
      this.#selectionDone = null;
    }

    this.#previousFocus?.focus();
    this.#previousFocus = null;

    const glassPane = this.#glassPane;
    this.#glassPane = null;
    glassPane?.hide();
    if (this.isShowing()) {
      this.detach();
    }
  }

  static instance: DropDown|null = null;
}

interface ButtonViewInput {
  title: string;
  ariaLabel: string;
  tooltip: string;
  onClick: () => void;
}

const BUTTON_VIEW = (input: ButtonViewInput, _output: undefined, target: HTMLElement): void => {
  render(
      html`<span class="content">${input.title}</span>`,
      target,
      {
        container: {
          classes: ['history-dropdown-button'],
          attributes: {
            'aria-haspopup': 'true',
            'aria-label': input.ariaLabel,
            title: input.tooltip,
            jslog: `${VisualLogging.dropDown('history')}`,
          },
          listeners: {
            click: input.onClick,
          },
        },
      },
  );
};
