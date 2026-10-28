// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

const {classMap, ifDefined, repeat} = Directives;

const UIStrings = {
  /**
   * @description Aria label for JavaScript VM instances target list in heap profiler.
   */
  javascriptVmInstances: 'JavaScript VM instances',
  /**
   * @description Label for total JavaScript heap size in the isolate selector.
   */
  totalJsHeapSize: 'Total JS heap size',
  /**
   * @description Tooltip for the overall page JavaScript heap size change trend over the specified time window.
   * @example {3} PH1
   */
  totalPageJsHeapSizeChangeTrend: 'Total page JS heap size change trend over the last {PH1} minutes',
  /**
   * @description Tooltip for total page JavaScript heap size across all VM instances.
   */
  totalPageJsHeapSizeAcrossAllVm: 'Total page JS heap size across all VM instances',
  /**
   * @description Heap size change trend measured in kB/s.
   * @example {2 kB} PH1
   */
  changeRate: '{PH1}/s',
  /**
   * @description Text for isolate selector list items with positive change rate.
   * @example {1.0 kB} PH1
   */
  increasingBySPerSecond: 'increasing by {PH1} per second',
  /**
   * @description Text for isolate selector list items with negative change rate.
   * @example {1.0 kB} PH1
   */
  decreasingBySPerSecond: 'decreasing by {PH1} per second',
  /**
   * @description Tooltip for individual VM instance heap size in use by live JavaScript objects.
   */
  heapSizeInUseByLiveJsObjects: 'Heap size in use by live JS objects',
  /**
   * @description Tooltip for the heap size growth rate trend over the specified time window.
   * @example {3} PH1
   */
  heapSizeChangeTrendOverTheLastS: 'Heap size change trend over the last {PH1} minutes',
  /**
   * @description Text to show an item is empty.
   */
  empty: '(empty)',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/profiler/IsolateSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface TrendInfo {
  text: string;
  label?: string;
  increasing: boolean;
}

export interface IsolateItemInfo {
  id: string;
  heapText: string;
  trend: TrendInfo;
  titles: string[];
}

export interface ViewInput {
  items: IsolateItemInfo[];
  selectedIndex: number;
  trendIntervalMinutes: number;
  totalText: string;
  trend: TrendInfo;
  onSelect: (index: number) => void;
}

export type View = (input: ViewInput, _output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (!input.items.length) {
      return;
    }
    const {selectedIndex} = input;
    let nextIndex = -1;
    switch (event.key) {
      case 'ArrowUp':
      case 'PageUp':
        nextIndex = selectedIndex > 0 ? selectedIndex - 1 : 0;
        break;
      case 'ArrowDown':
      case 'PageDown':
        nextIndex = selectedIndex < input.items.length - 1 ? selectedIndex + 1 : input.items.length - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = input.items.length - 1;
        break;
      default:
        return;
    }
    event.consume(true);
    if (nextIndex !== -1 && nextIndex !== selectedIndex) {
      input.onSelect(nextIndex);
    }
  };

  // clang-format off
  render(html`
    <div class="vbox profile-launcher-target-list profile-launcher-target-list-container">
      <div class="javascript-vm-instances-list"
           role="listbox"
           aria-label=${i18nString(UIStrings.javascriptVmInstances)}
           tabindex=${input.items.length ? 0 : -1}
           @keydown=${onKeyDown}>
        ${repeat(input.items, item => item.id, (item, index) => {
          const isSelected = index === input.selectedIndex;
          return html`
            <div class=${classMap({
                   'profile-memory-usage-item': true,
                   hbox: true,
                   selected: isSelected,
                 })}
                 role="option"
                 aria-selected=${isSelected}
                 aria-setsize=${input.items.length}
                 aria-posinset=${index + 1}
                 jslog=${VisualLogging.item().track({
                   click: true,
                   resize: true,
                   keydown: 'ArrowUp|ArrowDown|PageUp|PageDown|Home|End',
                 })}
                 @click=${() => input.onSelect(index)}>
              <div class="profile-memory-usage-item-size"
                   title=${i18nString(UIStrings.heapSizeInUseByLiveJsObjects)}>
                ${item.heapText}
              </div>
              <div class=${classMap({
                     'profile-memory-usage-item-trend': true,
                     increasing: item.trend.increasing,
                   })}
                   title=${i18nString(UIStrings.heapSizeChangeTrendOverTheLastS, {PH1: input.trendIntervalMinutes})}
                   aria-label=${ifDefined(item.trend.label)}>
                ${item.trend.text}
              </div>
              <div class="profile-memory-usage-item-name">
                ${item.titles.map(title => html`<div title=${String(title)}>${title}</div>`)}
              </div>
            </div>
          `;
        })}
      </div>
    </div>
    <div class="profile-memory-usage-item hbox">
      <div class="profile-memory-usage-item-size"
           title=${i18nString(UIStrings.totalPageJsHeapSizeAcrossAllVm)}>
        ${input.totalText}
      </div>
      <div class=${classMap({
             'profile-memory-usage-item-trend': true,
             increasing: input.trend.increasing,
           })}
           title=${i18nString(UIStrings.totalPageJsHeapSizeChangeTrend, {PH1: input.trendIntervalMinutes})}
           aria-label=${ifDefined(input.trend.label)}>
        ${input.trend.text}
      </div>
      <div>${i18nString(UIStrings.totalJsHeapSize)}</div>
    </div>
  `, target);
  // clang-format on
};

function formatTrend(trendValueMs: number, previous: TrendInfo): TrendInfo {
  const changeRateBytesPerSecond = trendValueMs * 1e3;
  const changeRateThresholdBytesPerSecond = 1000;
  if (Math.abs(changeRateBytesPerSecond) < changeRateThresholdBytesPerSecond) {
    return previous;
  }
  const changeRateText = i18n.ByteUtilities.bytesToString(Math.abs(changeRateBytesPerSecond));
  if (changeRateBytesPerSecond > 0) {
    return {
      text: '\u2B06' + i18nString(UIStrings.changeRate, {PH1: changeRateText}),
      label: i18nString(UIStrings.increasingBySPerSecond, {PH1: changeRateText}),
      increasing: true,
    };
  }
  return {
    text: '\u2B07' + i18nString(UIStrings.changeRate, {PH1: changeRateText}),
    label: i18nString(UIStrings.decreasingBySPerSecond, {PH1: changeRateText}),
    increasing: false,
  };
}

function getIsolateTitles(isolate: SDK.IsolateManager.Isolate): string[] {
  const modelCountByName = new Map<string, number>();
  const targetManager = SDK.TargetManager.TargetManager.instance();
  for (const model of isolate.models()) {
    const target = model.target();
    const isPrimaryPageTarget = targetManager.primaryPageTarget() === target;
    const name = target.name();
    const parsedURL = new Common.ParsedURL.ParsedURL(target.inspectedURL());
    const domain = parsedURL.isValid ? parsedURL.domain() : '';
    // If it is primary page target, omit `domain` in the title.
    // Otherwise show its `domain` and `name` as title if available.
    const title = target.decorateLabel(domain && !isPrimaryPageTarget ? `${domain}: ${name}` :
                                                                        name || domain || i18nString(UIStrings.empty));
    modelCountByName.set(title, (modelCountByName.get(title) || 0) + 1);
  }
  const titles: string[] = [];
  for (const [name, count] of modelCountByName) {
    const title = count > 1 ? `${name} (${count})` : name;
    titles.push(title);
  }
  return titles;
}

export class IsolateSelector extends UI.Widget.VBox implements SDK.IsolateManager.Observer {
  readonly #view: View;
  readonly #isolates: SDK.IsolateManager.Isolate[] = [];
  readonly #itemStates = new Map<SDK.IsolateManager.Isolate, IsolateItemInfo>();
  #selectedIsolate: SDK.IsolateManager.Isolate|null = null;
  #totalText = '';
  #totalTrend: TrendInfo = {text: '', increasing: false};

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;

    SDK.IsolateManager.IsolateManager.instance().observeIsolates(this);
    this.requestUpdate();
  }

  override performUpdate(): void {
    const trendIntervalMinutes = Math.round(SDK.IsolateManager.MemoryTrendWindowMs / 60e3);
    const items =
        this.#isolates.map(isolate => this.#itemStates.get(isolate)).filter(item => Boolean(item)) as IsolateItemInfo[];
    const selectedIndex = this.#selectedIsolate ? this.#isolates.indexOf(this.#selectedIsolate) : -1;
    this.#view({
      items,
      selectedIndex,
      trendIntervalMinutes,
      totalText: this.#totalText,
      trend: this.#totalTrend,
      onSelect: index => {
        const isolate = this.#isolates[index];
        if (isolate) {
          this.#selectIsolate(isolate);
        }
      },
    },
               undefined, this.contentElement);
  }

  override wasShown(): void {
    super.wasShown();
    SDK.IsolateManager.IsolateManager.instance().addEventListener(SDK.IsolateManager.Events.MEMORY_CHANGED,
                                                                  this.heapStatsChanged, this);
    SDK.TargetManager.TargetManager.instance().addEventListener(SDK.TargetManager.Events.NAME_CHANGED,
                                                                this.targetChanged, this);
    SDK.TargetManager.TargetManager.instance().addEventListener(SDK.TargetManager.Events.INSPECTED_URL_CHANGED,
                                                                this.targetChanged, this);
    for (const [isolate, item] of this.#itemStates) {
      item.titles = getIsolateTitles(isolate);
    }
    this.requestUpdate();
  }

  override willHide(): void {
    super.willHide();
    SDK.IsolateManager.IsolateManager.instance().removeEventListener(SDK.IsolateManager.Events.MEMORY_CHANGED,
                                                                     this.heapStatsChanged, this);
    SDK.TargetManager.TargetManager.instance().removeEventListener(SDK.TargetManager.Events.NAME_CHANGED,
                                                                   this.targetChanged, this);
    SDK.TargetManager.TargetManager.instance().removeEventListener(SDK.TargetManager.Events.INSPECTED_URL_CHANGED,
                                                                   this.targetChanged, this);
  }

  isolateAdded(isolate: SDK.IsolateManager.Isolate): void {
    const item: IsolateItemInfo = {
      id: isolate.id(),
      heapText: '',
      trend: {text: '', increasing: false},
      titles: getIsolateTitles(isolate),
    };
    const isPrimary =
        isolate.runtimeModel()?.target() === SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    const index = isPrimary ? 0 : this.#isolates.length;
    this.#isolates.splice(index, 0, isolate);
    this.#itemStates.set(isolate, item);
    if (index === 0 || !this.#selectedIsolate) {
      this.#selectIsolate(isolate);
    }
    this.updateTotal();
  }

  isolateChanged(isolate: SDK.IsolateManager.Isolate): void {
    const item = this.#itemStates.get(isolate);
    if (item) {
      item.titles = getIsolateTitles(isolate);
    }
    this.updateTotal();
  }

  isolateRemoved(isolate: SDK.IsolateManager.Isolate): void {
    const index = this.#isolates.indexOf(isolate);
    if (index !== -1) {
      this.#isolates.splice(index, 1);
    }
    this.#itemStates.delete(isolate);
    if (this.#selectedIsolate === isolate) {
      const nextIsolate = this.#isolates[Math.min(index, this.#isolates.length - 1)] ?? null;
      this.#selectIsolate(nextIsolate);
    }
    this.updateTotal();
  }

  targetChanged(event: Common.EventTarget.EventTargetEvent<SDK.Target.Target>): void {
    const target = event.data;
    const model = target.model(SDK.RuntimeModel.RuntimeModel);
    if (!model) {
      return;
    }
    const isolate = SDK.IsolateManager.IsolateManager.instance().isolateByModel(model);
    const item = isolate && this.#itemStates.get(isolate);
    if (item && isolate) {
      item.titles = getIsolateTitles(isolate);
      this.requestUpdate();
    }
  }

  heapStatsChanged(event: Common.EventTarget.EventTargetEvent<SDK.IsolateManager.Isolate>): void {
    const isolate = event.data;
    const item = this.#itemStates.get(isolate);
    if (item) {
      item.heapText = i18n.ByteUtilities.bytesToString(isolate.usedHeapSize());
      item.trend = formatTrend(isolate.usedHeapSizeGrowRate(), item.trend);
    }
    this.updateTotal();
  }

  updateTotal(): void {
    let total = 0;
    let trend = 0;
    for (const isolate of SDK.IsolateManager.IsolateManager.instance().isolates()) {
      total += isolate.usedHeapSize();
      trend += isolate.usedHeapSizeGrowRate();
    }
    this.#totalText = i18n.ByteUtilities.bytesToString(total);
    this.#totalTrend = formatTrend(trend, this.#totalTrend);
    this.requestUpdate();
  }

  #selectIsolate(isolate: SDK.IsolateManager.Isolate|null): void {
    this.#selectedIsolate = isolate;
    const model = isolate?.runtimeModel() ?? null;
    UI.Context.Context.instance().setFlavor(SDK.HeapProfilerModel.HeapProfilerModel,
                                            model?.heapProfilerModel() ?? null);
    UI.Context.Context.instance().setFlavor(SDK.CPUProfilerModel.CPUProfilerModel,
                                            model?.target()?.model(SDK.CPUProfilerModel.CPUProfilerModel) ?? null);
    this.requestUpdate();
  }
}
