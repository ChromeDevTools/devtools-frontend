// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import webAudioStyles from './webAudio.css.js';
import {Events as ModelEvents, WebAudioModel} from './WebAudioModel.js';
const {widgetConfig} = UI.Widget;
const {bindToAction} = UI.UIUtils;

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

interface ViewInput {
  contexts: Protocol.WebAudio.BaseAudioContext[];
  selectedContextIndex: number;
  onContextSelectorSelectionChanged: (contextId: string) => void;
  contextRealtimeData: Protocol.WebAudio.ContextRealtimeData|null;
}

type View = (input: ViewInput, output: object, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const {
    contexts,
    selectedContextIndex,
    onContextSelectorSelectionChanged,
    contextRealtimeData,
  } = input;
  const selectedContext = selectedContextIndex > -1 ? contexts[selectedContextIndex] : null;

  const titleForContext = (context: Protocol.WebAudio.BaseAudioContext): string =>
      context.contextType + ' (' + context.contextId.substr(-6) + ')';

  const selectorTitle = i18nString(
      UIStrings.audioContextS,
      {PH1: selectedContext ? titleForContext(selectedContext) : i18nString(UIStrings.noRecordings)});

  // clang-format off
  render(html`
    <style>${webAudioStyles}</style>
    <div class="web-audio-toolbar-container vbox" role="toolbar">
      <devtools-toolbar class="web-audio-toolbar" role="presentation"
          jslog=${VisualLogging.toolbar()}>
        <devtools-button ${bindToAction('components.collect-garbage')}></devtools-button>
        <div class="toolbar-divider"></div>
        <select
          title=${selectorTitle}
          aria-label=${selectorTitle}
          ?disabled=${contexts.length === 0}
          @change=${(e: Event) => onContextSelectorSelectionChanged((e.target as HTMLSelectElement).value)}
          .value=${selectedContext ? selectedContext.contextId : ''}>
          ${contexts.length === 0
              ? html`<option value="" hidden>${i18nString(UIStrings.noRecordings)}</option>`
              : contexts.map(context => html`
            <option value=${context.contextId}>${titleForContext(context)}</option>
          `)}
        </select>
      </devtools-toolbar>
    </div>
    <div class="web-audio-content-container vbox flex-auto">
      ${!selectedContext ? html`
        <div class="web-audio-details-container vbox flex-auto">
          <devtools-widget .widgetConfig=${widgetConfig(UI.EmptyWidget.EmptyWidget,
            {header: i18nString(UIStrings.noWebAudio),
              text: i18nString(UIStrings.openAPageThatUsesWebAudioApiTo),
            link: WEBAUDIO_EXPLANATION_URL,
          })}>
          </devtools-widget>
        </div>` : html`<div class="web-audio-details-container vbox flex-auto">
          <div class="context-detail-container">
            <div class="context-detail-header">
              <div class="context-detail-title">
                ${selectedContext.contextType === 'realtime' ? i18n.i18n.lockedString('AudioContext')
                                                             : i18n.i18n.lockedString('OfflineAudioContext')}
              </div>
              <div class="context-detail-subtitle">${selectedContext.contextId}</div>
            </div>
            <div class="context-detail-row">
              <div class="context-detail-row-entry">${i18nString(UIStrings.state)}</div>
              <div class="context-detail-row-value">${selectedContext.contextState}</div>
            </div>
            <div class="context-detail-row">
              <div class="context-detail-row-entry">${i18nString(UIStrings.sampleRate)}</div>
              <div class="context-detail-row-value">${selectedContext.sampleRate} Hz</div>
            </div>
            ${selectedContext.contextType === 'realtime' ? html`
              <div class="context-detail-row">
                <div class="context-detail-row-entry">${i18nString(UIStrings.callbackBufferSize)}</div>
                <div class="context-detail-row-value">${selectedContext.callbackBufferSize} frames</div>
              </div>` : ''}
            <div class="context-detail-row">
              <div class="context-detail-row-entry">${i18nString(UIStrings.maxOutputChannels)}</div>
              <div class="context-detail-row-value">${selectedContext.maxOutputChannelCount} ch</div>
            </div>
          </div>
        </div>`}
      <div class="web-audio-summary-container">
        ${contextRealtimeData ?
            html`<div class="context-summary-container">
            <span>${i18nString(UIStrings.currentTime)}: ${contextRealtimeData.currentTime.toFixed(3)} s</span>
            <span>\u2758</span>
            <span>${i18nString(UIStrings.callbackInterval)}: μ = ${
                (contextRealtimeData.callbackIntervalMean * 1000).toFixed(3)} ms, σ = ${
                (Math.sqrt(contextRealtimeData.callbackIntervalVariance) * 1000).toFixed(3)} ms</span>
            <span>\u2758</span>
            <span>${i18nString(UIStrings.renderCapacity)}: ${
                (contextRealtimeData.renderCapacity * 100).toFixed(3)} %</span>
          </div>` : ''}
      </div>
    </div>`, target);
  // clang-format on
};

export class WebAudioView extends UI.Widget.VBox implements SDK.TargetManager.SDKModelObserver<WebAudioModel> {
  private readonly knownContexts = new Set<string>();
  private readonly contextSelectorItems: UI.ListModel.ListModel<Protocol.WebAudio.BaseAudioContext>;
  private contextRealtimeData: Protocol.WebAudio.ContextRealtimeData|null = null;
  private readonly view: View;
  private selectedContextIndex = -1;
  private readonly pollRealtimeDataThrottler: Common.Throttler.Throttler;

  constructor(element?: HTMLElement, view = DEFAULT_VIEW) {
    super({jslog: `${VisualLogging.panel('web-audio').track({resize: true})}`, useShadowDom: true});
    this.view = view;

    this.contextSelectorItems = new UI.ListModel.ListModel();
    this.contextSelectorItems.addEventListener(UI.ListModel.Events.ITEMS_REPLACED, this.requestUpdate, this);

    SDK.TargetManager.TargetManager.instance().observeModels(WebAudioModel, this);
    this.pollRealtimeDataThrottler = new Common.Throttler.Throttler(1000);
    this.performUpdate();
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

  override performUpdate(): void {
    const input = {
      contexts: [...this.contextSelectorItems],
      selectedContextIndex: this.selectedContextIndex,
      onContextSelectorSelectionChanged: this.onContextSelectorSelectionChanged.bind(this),
      contextRealtimeData: this.contextRealtimeData,
    };
    this.view(input, {}, this.contentElement);
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

  private onContextSelectorSelectionChanged(contextId: string): void {
    this.selectedContextIndex = this.contextSelectorItems.findIndex(context => context.contextId === contextId);
    void this.pollRealtimeDataThrottler.schedule(this.pollRealtimeData.bind(this));
    this.requestUpdate();
  }

  private contextCreated(event: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.BaseAudioContext>): void {
    const context = event.data;
    this.knownContexts.add(context.contextId);
    this.contextSelectorItems.insert(this.contextSelectorItems.length, context);
    if (this.selectedContextIndex === -1) {
      this.selectedContextIndex = this.contextSelectorItems.length - 1;
      void this.pollRealtimeDataThrottler.schedule(this.pollRealtimeData.bind(this));
    }
    this.requestUpdate();
  }

  private contextDestroyed(event: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.GraphObjectId>): void {
    const contextId = event.data;
    this.knownContexts.delete(contextId);
    const index = this.contextSelectorItems.findIndex(context => context.contextId === contextId);
    if (index > -1) {
      const selectedContext =
          this.selectedContextIndex > -1 ? this.contextSelectorItems.at(this.selectedContextIndex) : null;
      this.contextSelectorItems.remove(index);
      const newSelectedIndex = selectedContext ? this.contextSelectorItems.indexOf(selectedContext) : -1;
      if (newSelectedIndex > -1) {
        this.selectedContextIndex = newSelectedIndex;
      } else {
        this.selectedContextIndex = Math.min(index, this.contextSelectorItems.length - 1);
      }
    }
    this.requestUpdate();
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
    }
    this.requestUpdate();
  }

  private reset(): void {
    this.contextSelectorItems.replaceAll([]);
    this.selectedContextIndex = -1;

    this.knownContexts.clear();
    this.requestUpdate();
  }

  private setContextRealtimeData(contextRealtimeData: Protocol.WebAudio.ContextRealtimeData|null): void {
    this.contextRealtimeData = contextRealtimeData;
    this.requestUpdate();
  }

  private async pollRealtimeData(): Promise<void> {
    if (this.selectedContextIndex < 0) {
      this.setContextRealtimeData(null);
      return;
    }

    const context = this.contextSelectorItems.at(this.selectedContextIndex);
    if (!context) {
      this.setContextRealtimeData(null);
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
          this.setContextRealtimeData(realtimeData);
        }
        void this.pollRealtimeDataThrottler.schedule(this.pollRealtimeData.bind(this));
      } else {
        this.setContextRealtimeData(null);
      }
    }
  }
}
