// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import webAudioStyles from './webAudio.css.js';
import {Events as ModelEvents, WebAudioModel} from './WebAudioModel.js';

const UIStrings = {
  /**
   * @description Text in Web Audio View if there is nothing to show.
   * Web Audio API is an API for controlling audio on the web.
   */
  noWebAudio: 'No Web Audio API usage detected',
  /**
   * @description Text in Web Audio View
   */
  openAPageThatUsesWebAudioApiTo: 'Open a page that uses Web Audio API to start monitoring.',
  /**
   * @description Text that shows there is no recording
   */
  noRecordings: '(no recordings)',
  /**
   * @description Label prefix for an audio context selection
   * @example {realtime (1e03ec)} PH1
   */
  audioContextS: 'Audio context: {PH1}',
  /**
   * @description The current state of an item
   */
  state: 'State',
  /**
   * @description Text in Web Audio View
   */
  sampleRate: 'Sample Rate',
  /**
   * @description Text in Web Audio View
   */
  callbackBufferSize: 'Callback Buffer Size',
  /**
   * @description Label in the Web Audio View for the maximum number of output channels
   * that this Audio Context has.
   */
  maxOutputChannels: 'Max Output Channels',
  /**
   * @description Text in Web Audio View
   */
  currentTime: 'Current Time',
  /**
   * @description Text in Web Audio View
   */
  callbackInterval: 'Callback Interval',
  /**
   * @description Text in Web Audio View
   */
  renderCapacity: 'Render Capacity',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/web_audio/WebAudioView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const WEBAUDIO_EXPLANATION_URL =
    'https://developer.chrome.com/docs/devtools/webaudio' as Platform.DevToolsPath.UrlString;

export class WebAudioView extends UI.Widget.VBox implements SDK.TargetManager.SDKModelObserver<WebAudioModel> {
  private readonly contentContainer: HTMLElement;
  private readonly detailViewContainer: HTMLElement;
  private readonly knownContexts = new Set<string>();
  private readonly landingPage: UI.EmptyWidget.EmptyWidget;
  private readonly summaryBarContainer: HTMLElement;
  private readonly contextSelectorPlaceholderText: Platform.UIString.LocalizedString;
  private readonly contextSelectorElement: HTMLSelectElement;
  private readonly contextSelectorItems: UI.ListModel.ListModel<Protocol.WebAudio.BaseAudioContext>;
  private readonly contextSelectorToolbarItem: UI.Toolbar.ToolbarItem;
  private readonly pollRealtimeDataThrottler: Common.Throttler.Throttler;

  constructor() {
    super({jslog: `${VisualLogging.panel('web-audio').track({resize: true})}`, useShadowDom: true});
    this.registerRequiredCSS(webAudioStyles);
    this.element.classList.add('web-audio-drawer');

    // Creates the toolbar.
    const toolbarContainer = this.contentElement.createChild('div', 'web-audio-toolbar-container vbox');
    toolbarContainer.role = 'toolbar';

    this.contextSelectorPlaceholderText = i18nString(UIStrings.noRecordings);
    this.contextSelectorItems = new UI.ListModel.ListModel();
    this.contextSelectorElement = document.createElement('select');
    this.contextSelectorToolbarItem = new UI.Toolbar.ToolbarItem(this.contextSelectorElement);
    this.contextSelectorToolbarItem.setTitle(
        i18nString(UIStrings.audioContextS, {PH1: this.contextSelectorPlaceholderText}));
    this.contextSelectorElement.addEventListener('change', this.onContextSelectorSelectionChanged.bind(this));
    this.contextSelectorElement.disabled = true;
    this.addContextSelectorPlaceholderOption();
    this.contextSelectorItems.addEventListener(
        UI.ListModel.Events.ITEMS_REPLACED, this.onContextSelectorListItemReplaced, this);
    const toolbar = toolbarContainer.createChild('devtools-toolbar', 'web-audio-toolbar');
    toolbar.role = 'presentation';
    toolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton('components.collect-garbage'));
    toolbar.appendSeparator();
    toolbar.appendToolbarItem(this.contextSelectorToolbarItem);
    toolbar.setAttribute('jslog', `${VisualLogging.toolbar()}`);

    // Create content container
    this.contentContainer = this.contentElement.createChild('div', 'web-audio-content-container vbox flex-auto');

    // Creates the detail view.
    this.detailViewContainer = this.contentContainer.createChild('div', 'web-audio-details-container vbox flex-auto');

    // Creates the landing page.
    this.landingPage = new UI.EmptyWidget.EmptyWidget(
        i18nString(UIStrings.noWebAudio), i18nString(UIStrings.openAPageThatUsesWebAudioApiTo));
    this.landingPage.link = WEBAUDIO_EXPLANATION_URL;
    this.landingPage.show(this.detailViewContainer);

    // Creates the summary bar.
    this.summaryBarContainer = this.contentContainer.createChild('div', 'web-audio-summary-container');

    SDK.TargetManager.TargetManager.instance().observeModels(WebAudioModel, this);
    this.pollRealtimeDataThrottler = new Common.Throttler.Throttler(1000);
  }

  override wasShown(): void {
    super.wasShown();
    for (const model of SDK.TargetManager.TargetManager.instance().models(WebAudioModel)) {
      this.addEventListeners(model);
    }
  }

  override willHide(): void {
    for (const model of SDK.TargetManager.TargetManager.instance().models(WebAudioModel)) {
      this.removeEventListeners(model);
    }
  }

  modelAdded(webAudioModel: WebAudioModel): void {
    if (this.isShowing()) {
      this.addEventListeners(webAudioModel);
    }
  }

  modelRemoved(webAudioModel: WebAudioModel): void {
    this.removeEventListeners(webAudioModel);
  }

  private addEventListeners(webAudioModel: WebAudioModel): void {
    webAudioModel.ensureEnabled();
    webAudioModel.addEventListener(ModelEvents.CONTEXT_CREATED, this.contextCreated, this);
    webAudioModel.addEventListener(ModelEvents.CONTEXT_DESTROYED, this.contextDestroyed, this);
    webAudioModel.addEventListener(ModelEvents.CONTEXT_CHANGED, this.contextChanged, this);
    webAudioModel.addEventListener(ModelEvents.MODEL_RESET, this.reset, this);
  }

  private removeEventListeners(webAudioModel: WebAudioModel): void {
    webAudioModel.removeEventListener(ModelEvents.CONTEXT_CREATED, this.contextCreated, this);
    webAudioModel.removeEventListener(ModelEvents.CONTEXT_DESTROYED, this.contextDestroyed, this);
    webAudioModel.removeEventListener(ModelEvents.CONTEXT_CHANGED, this.contextChanged, this);
    webAudioModel.removeEventListener(ModelEvents.MODEL_RESET, this.reset, this);
  }

  private addContextSelectorPlaceholderOption(): void {
    const placeholderOption = UI.Fragment.html`
    <option value="" hidden>${this.contextSelectorPlaceholderText}</option>`;
    this.contextSelectorElement.appendChild(placeholderOption);
  }

  private onContextSelectorListItemReplaced(): void {
    this.contextSelectorElement.removeChildren();

    if (this.contextSelectorItems.length === 0) {
      this.addContextSelectorPlaceholderOption();
      this.contextSelectorElement.disabled = true;
      this.onContextSelectorSelectionChanged();
      return;
    }

    for (const context of this.contextSelectorItems) {
      const option = UI.Fragment.html`
    <option value=${context.contextId}>${this.titleForContext(context)}</option>`;
      this.contextSelectorElement.appendChild(option);
    }
    this.contextSelectorElement.disabled = false;
    this.onContextSelectorSelectionChanged();
  }

  private selectedContext(): Protocol.WebAudio.BaseAudioContext|null {
    const selectedValue = this.contextSelectorElement.value;
    if (!selectedValue) {
      return null;
    }
    return this.contextSelectorItems.find(context => context.contextId === selectedValue) || null;
  }

  private onContextSelectorSelectionChanged(): void {
    const selectedContext = this.selectedContext();
    if (selectedContext) {
      this.contextSelectorToolbarItem.setTitle(
          i18nString(UIStrings.audioContextS, {PH1: this.titleForContext(selectedContext)}));
    } else {
      this.contextSelectorToolbarItem.setTitle(
          i18nString(UIStrings.audioContextS, {PH1: this.contextSelectorPlaceholderText}));
    }
    this.updateDetailView(selectedContext);
  }

  private titleForContext(context: Protocol.WebAudio.BaseAudioContext): string {
    return `${context.contextType} (${context.contextId.substr(-6)})`;
  }

  private contextCreated(event: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.BaseAudioContext>): void {
    const context = event.data;
    this.knownContexts.add(context.contextId);
    this.contextSelectorItems.insert(this.contextSelectorItems.length, context);
    this.onContextSelectorListItemReplaced();
    void this.pollRealtimeDataThrottler.schedule(this.pollRealtimeData.bind(this));
  }

  private contextDestroyed(event: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.GraphObjectId>): void {
    const contextId = event.data;
    this.knownContexts.delete(contextId);
    const index = this.contextSelectorItems.findIndex(context => context.contextId === contextId);
    if (index > -1) {
      this.contextSelectorItems.remove(index);
      this.onContextSelectorListItemReplaced();
    }
  }

  private contextChanged(event: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.BaseAudioContext>): void {
    const context = event.data;
    if (!this.knownContexts.has(context.contextId)) {
      return;
    }

    const changedContext = event.data;
    const index = this.contextSelectorItems.findIndex(context => context.contextId === changedContext.contextId);
    if (index > -1) {
      this.contextSelectorItems.replace(index, changedContext);
      this.onContextSelectorListItemReplaced();
    }
  }

  private reset(): void {
    this.contextSelectorItems.replaceAll([]);
    this.onContextSelectorListItemReplaced();

    if (this.landingPage.isShowing()) {
      this.landingPage.detach();
    }
    this.detailViewContainer.removeChildren();
    this.landingPage.show(this.detailViewContainer);
    this.knownContexts.clear();
  }

  private updateDetailView(context: Protocol.WebAudio.BaseAudioContext|null): void {
    if (!context) {
      this.landingPage.detach();
      this.detailViewContainer.removeChildren();
      this.landingPage.show(this.detailViewContainer);
      return;
    }

    if (this.landingPage.isShowing()) {
      this.landingPage.detach();
    }

    this.detailViewContainer.removeChildren();

    const container = document.createElement('div');
    container.classList.add('context-detail-container');

    const addEntry = (entry: string, value: string|number, unit?: string): void => {
      const valueWithUnit = value + (unit ? ` ${unit}` : '');
      container.appendChild(UI.Fragment.html`
        <div class="context-detail-row">
          <div class="context-detail-row-entry">${entry}</div>
          <div class="context-detail-row-value">${valueWithUnit}</div>
        </div>
      `);
    };

    const title = context.contextType === 'realtime' ? i18n.i18n.lockedString('AudioContext') :
                                                       i18n.i18n.lockedString('OfflineAudioContext');
    container.appendChild(UI.Fragment.html`
      <div class="context-detail-header">
        <div class="context-detail-title">${title}</div>
        <div class="context-detail-subtitle">${context.contextId}</div>
      </div>
    `);

    addEntry(i18nString(UIStrings.state), context.contextState);
    addEntry(i18nString(UIStrings.sampleRate), context.sampleRate, 'Hz');
    if (context.contextType === 'realtime') {
      addEntry(i18nString(UIStrings.callbackBufferSize), context.callbackBufferSize, 'frames');
    }
    addEntry(i18nString(UIStrings.maxOutputChannels), context.maxOutputChannelCount, 'ch');

    this.detailViewContainer.appendChild(container);
  }

  private updateSummaryBar(contextRealtimeData: Protocol.WebAudio.ContextRealtimeData): void {
    this.summaryBarContainer.removeChildren();
    const time = contextRealtimeData.currentTime.toFixed(3);
    const mean = (contextRealtimeData.callbackIntervalMean * 1000).toFixed(3);
    const stddev = (Math.sqrt(contextRealtimeData.callbackIntervalVariance) * 1000).toFixed(3);
    const capacity = (contextRealtimeData.renderCapacity * 100).toFixed(3);
    this.summaryBarContainer.appendChild(UI.Fragment.html`
      <div class="context-summary-container">
        <span>${i18nString(UIStrings.currentTime)}: ${time} s</span>
        <span>\u2758</span>
        <span>${i18nString(UIStrings.callbackInterval)}: μ = ${mean} ms, σ = ${stddev} ms</span>
        <span>\u2758</span>
        <span>${i18nString(UIStrings.renderCapacity)}: ${capacity} %</span>
      </div>
    `);
  }

  private clearSummaryBar(): void {
    this.summaryBarContainer.removeChildren();
  }

  private async pollRealtimeData(): Promise<void> {
    const context = this.selectedContext();
    if (!context) {
      this.clearSummaryBar();
      return;
    }

    for (const model of SDK.TargetManager.TargetManager.instance().models(WebAudioModel)) {
      // Display summary only for real-time context.
      if (context.contextType === 'realtime') {
        if (!this.knownContexts.has(context.contextId)) {
          continue;
        }
        const realtimeData = await model.requestRealtimeData(context.contextId);
        if (realtimeData) {
          this.updateSummaryBar(realtimeData);
        }
        void this.pollRealtimeDataThrottler.schedule(this.pollRealtimeData.bind(this));
      } else {
        this.clearSummaryBar();
      }
    }
  }
}
