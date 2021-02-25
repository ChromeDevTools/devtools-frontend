// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */
import type * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {ContextDetailBuilder, ContextSummaryBuilder} from './AudioContextContentBuilder.js';
import {AudioContextSelector, Events as SelectorEvents} from './AudioContextSelector.js';
import {GraphManager} from './graph_visualizer/GraphManager.js';
import {Events as ModelEvents, WebAudioModel} from './WebAudioModel.js';

export const UIStrings = {
  /**
  *@description Text in Web Audio View
  */
  openAPageThatUsesWebAudioApiTo: 'Open a page that uses Web Audio API to start monitoring.',
};
const str_ = i18n.i18n.registerUIStrings('web_audio/WebAudioView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);


let webAudioViewInstance: WebAudioView;
export class WebAudioView extends UI.ThrottledWidget.ThrottledWidget implements
    SDK.SDKModel.SDKModelObserver<WebAudioModel> {
  _contextSelector: AudioContextSelector;
  _contentContainer: HTMLElement;
  _detailViewContainer: HTMLElement;
  _graphManager: GraphManager;
  _landingPage: UI.Widget.VBox;
  _summaryBarContainer: HTMLElement;
  constructor() {
    super(true, 1000);
    this.element.classList.add('web-audio-drawer');
    this.registerRequiredCSS('web_audio/webAudio.css', {enableLegacyPatching: false});

    // Creates the toolbar.
    const toolbarContainer = this.contentElement.createChild('div', 'web-audio-toolbar-container vbox');
    this._contextSelector = new AudioContextSelector();
    const toolbar = new UI.Toolbar.Toolbar('web-audio-toolbar', toolbarContainer);
    toolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButtonForId('components.collect-garbage'));
    toolbar.appendSeparator();
    toolbar.appendToolbarItem(this._contextSelector.toolbarItem());

    // Create content container
    this._contentContainer = this.contentElement.createChild('div', 'web-audio-content-container vbox flex-auto');

    // Creates the detail view.
    this._detailViewContainer = this._contentContainer.createChild('div', 'web-audio-details-container vbox flex-auto');

    this._graphManager = new GraphManager();

    // Creates the landing page.
    this._landingPage = new UI.Widget.VBox();
    this._landingPage.contentElement.classList.add('web-audio-landing-page', 'fill');
    this._landingPage.contentElement.appendChild(UI.Fragment.html`
  <div>
  <p>${i18nString(UIStrings.openAPageThatUsesWebAudioApiTo)}</p>
  </div>
  `);
    this._landingPage.show(this._detailViewContainer);

    // Creates the summary bar.
    this._summaryBarContainer = this._contentContainer.createChild('div', 'web-audio-summary-container');

    this._contextSelector.addEventListener(
        SelectorEvents.ContextSelected, (event: Common.EventTarget.EventTargetEvent): void => {
          const context = (event.data as Protocol.WebAudio.BaseAudioContext);
          this._updateDetailView(context);
          this.doUpdate();
        });

    SDK.SDKModel.TargetManager.instance().observeModels(WebAudioModel, this);
  }

  static instance(opts = {forceNew: null}): WebAudioView {
    const {forceNew} = opts;
    if (!webAudioViewInstance || forceNew) {
      webAudioViewInstance = new WebAudioView();
    }

    return webAudioViewInstance;
  }

  wasShown(): void {
    super.wasShown();
    for (const model of SDK.SDKModel.TargetManager.instance().models(WebAudioModel)) {
      this._addEventListeners(model);
    }
  }

  willHide(): void {
    for (const model of SDK.SDKModel.TargetManager.instance().models(WebAudioModel)) {
      this._removeEventListeners(model);
    }
  }

  modelAdded(webAudioModel: WebAudioModel): void {
    if (this.isShowing()) {
      this._addEventListeners(webAudioModel);
    }
  }

  modelRemoved(webAudioModel: WebAudioModel): void {
    this._removeEventListeners(webAudioModel);
  }

  async doUpdate(): Promise<void> {
    await this._pollRealtimeData();
    this.update();
  }

  _addEventListeners(webAudioModel: WebAudioModel): void {
    webAudioModel.ensureEnabled();
    webAudioModel.addEventListener(ModelEvents.ContextCreated, this._contextCreated, this);
    webAudioModel.addEventListener(ModelEvents.ContextDestroyed, this._contextDestroyed, this);
    webAudioModel.addEventListener(ModelEvents.ContextChanged, this._contextChanged, this);
    webAudioModel.addEventListener(ModelEvents.ModelReset, this._reset, this);
    webAudioModel.addEventListener(ModelEvents.ModelSuspend, this._suspendModel, this);
    webAudioModel.addEventListener(ModelEvents.AudioListenerCreated, this._audioListenerCreated, this);
    webAudioModel.addEventListener(ModelEvents.AudioListenerWillBeDestroyed, this._audioListenerWillBeDestroyed, this);
    webAudioModel.addEventListener(ModelEvents.AudioNodeCreated, this._audioNodeCreated, this);
    webAudioModel.addEventListener(ModelEvents.AudioNodeWillBeDestroyed, this._audioNodeWillBeDestroyed, this);
    webAudioModel.addEventListener(ModelEvents.AudioParamCreated, this._audioParamCreated, this);
    webAudioModel.addEventListener(ModelEvents.AudioParamWillBeDestroyed, this._audioParamWillBeDestroyed, this);
    webAudioModel.addEventListener(ModelEvents.NodesConnected, this._nodesConnected, this);
    webAudioModel.addEventListener(ModelEvents.NodesDisconnected, this._nodesDisconnected, this);
    webAudioModel.addEventListener(ModelEvents.NodeParamConnected, this._nodeParamConnected, this);
    webAudioModel.addEventListener(ModelEvents.NodeParamDisconnected, this._nodeParamDisconnected, this);
  }

  _removeEventListeners(webAudioModel: WebAudioModel): void {
    webAudioModel.removeEventListener(ModelEvents.ContextCreated, this._contextCreated, this);
    webAudioModel.removeEventListener(ModelEvents.ContextDestroyed, this._contextDestroyed, this);
    webAudioModel.removeEventListener(ModelEvents.ContextChanged, this._contextChanged, this);
    webAudioModel.removeEventListener(ModelEvents.ModelReset, this._reset, this);
    webAudioModel.removeEventListener(ModelEvents.ModelSuspend, this._suspendModel, this);
    webAudioModel.removeEventListener(ModelEvents.AudioListenerCreated, this._audioListenerCreated, this);
    webAudioModel.removeEventListener(
        ModelEvents.AudioListenerWillBeDestroyed, this._audioListenerWillBeDestroyed, this);
    webAudioModel.removeEventListener(ModelEvents.AudioNodeCreated, this._audioNodeCreated, this);
    webAudioModel.removeEventListener(ModelEvents.AudioNodeWillBeDestroyed, this._audioNodeWillBeDestroyed, this);
    webAudioModel.removeEventListener(ModelEvents.AudioParamCreated, this._audioParamCreated, this);
    webAudioModel.removeEventListener(ModelEvents.AudioParamWillBeDestroyed, this._audioParamWillBeDestroyed, this);
    webAudioModel.removeEventListener(ModelEvents.NodesConnected, this._nodesConnected, this);
    webAudioModel.removeEventListener(ModelEvents.NodesDisconnected, this._nodesDisconnected, this);
    webAudioModel.removeEventListener(ModelEvents.NodeParamConnected, this._nodeParamConnected, this);
    webAudioModel.removeEventListener(ModelEvents.NodeParamDisconnected, this._nodeParamDisconnected, this);
  }

  _contextCreated(event: Common.EventTarget.EventTargetEvent): void {
    const context = (event.data as Protocol.WebAudio.BaseAudioContext);
    this._graphManager.createContext(context.contextId);
    this._contextSelector.contextCreated(event);
  }

  _contextDestroyed(event: Common.EventTarget.EventTargetEvent): void {
    const contextId = (event.data as string);
    this._graphManager.destroyContext(contextId);
    this._contextSelector.contextDestroyed(event);
  }

  _contextChanged(event: Common.EventTarget.EventTargetEvent): void {
    const context = (event.data as Protocol.WebAudio.BaseAudioContext);
    if (!this._graphManager.hasContext(context.contextId)) {
      return;
    }

    this._contextSelector.contextChanged(event);
  }

  _reset(): void {
    if (this._landingPage.isShowing()) {
      this._landingPage.detach();
    }
    this._contextSelector.reset();
    this._detailViewContainer.removeChildren();
    this._landingPage.show(this._detailViewContainer);
    this._graphManager.clearGraphs();
  }

  _suspendModel(): void {
    this._graphManager.clearGraphs();
  }

  _audioListenerCreated(event: Common.EventTarget.EventTargetEvent): void {
    const listener = (event.data as Protocol.WebAudio.AudioListener);
    const graph = this._graphManager.getGraph(listener.contextId);
    if (!graph) {
      return;
    }
    graph.addNode({
      nodeId: listener.listenerId,
      nodeType: 'Listener',
      numberOfInputs: 0,
      numberOfOutputs: 0,
    });
  }

  _audioListenerWillBeDestroyed(event: Common.EventTarget.EventTargetEvent): void {
    const {contextId, listenerId} = event.data;
    const graph = this._graphManager.getGraph(contextId);
    if (!graph) {
      return;
    }
    graph.removeNode(listenerId);
  }

  _audioNodeCreated(event: Common.EventTarget.EventTargetEvent): void {
    const node = (event.data as Protocol.WebAudio.AudioNode);
    const graph = this._graphManager.getGraph(node.contextId);
    if (!graph) {
      return;
    }
    graph.addNode({
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      numberOfInputs: node.numberOfInputs,
      numberOfOutputs: node.numberOfOutputs,
    });
  }

  _audioNodeWillBeDestroyed(event: Common.EventTarget.EventTargetEvent): void {
    const {contextId, nodeId} = event.data;
    const graph = this._graphManager.getGraph(contextId);
    if (!graph) {
      return;
    }
    graph.removeNode(nodeId);
  }

  _audioParamCreated(event: Common.EventTarget.EventTargetEvent): void {
    const param = (event.data as Protocol.WebAudio.AudioParam);
    const graph = this._graphManager.getGraph(param.contextId);
    if (!graph) {
      return;
    }
    graph.addParam({
      paramId: param.paramId,
      paramType: param.paramType,
      nodeId: param.nodeId,
    });
  }

  _audioParamWillBeDestroyed(event: Common.EventTarget.EventTargetEvent): void {
    const {contextId, paramId} = event.data;
    const graph = this._graphManager.getGraph(contextId);
    if (!graph) {
      return;
    }
    graph.removeParam(paramId);
  }

  _nodesConnected(event: Common.EventTarget.EventTargetEvent): void {
    const {contextId, sourceId, destinationId, sourceOutputIndex, destinationInputIndex} = event.data;
    const graph = this._graphManager.getGraph(contextId);
    if (!graph) {
      return;
    }
    graph.addNodeToNodeConnection({
      sourceId,
      destinationId,
      sourceOutputIndex,
      destinationInputIndex,
    });
  }

  _nodesDisconnected(event: Common.EventTarget.EventTargetEvent): void {
    const {contextId, sourceId, destinationId, sourceOutputIndex, destinationInputIndex} = event.data;
    const graph = this._graphManager.getGraph(contextId);
    if (!graph) {
      return;
    }
    graph.removeNodeToNodeConnection({
      sourceId,
      destinationId,
      sourceOutputIndex,
      destinationInputIndex,
    });
  }

  _nodeParamConnected(event: Common.EventTarget.EventTargetEvent): void {
    const {contextId, sourceId, destinationId, sourceOutputIndex} = event.data;
    const graph = this._graphManager.getGraph(contextId);
    if (!graph) {
      return;
    }
    // Since the destinationId is AudioParamId, we need to find the nodeId as the
    // real destinationId.
    const nodeId = graph.getNodeIdByParamId(destinationId);
    if (!nodeId) {
      return;
    }
    graph.addNodeToParamConnection({
      sourceId,
      destinationId: nodeId,
      sourceOutputIndex,
      destinationParamId: destinationId,
    });
  }

  _nodeParamDisconnected(event: Common.EventTarget.EventTargetEvent): void {
    const {contextId, sourceId, destinationId, sourceOutputIndex} = event.data;
    const graph = this._graphManager.getGraph(contextId);
    if (!graph) {
      return;
    }
    // Since the destinationId is AudioParamId, we need to find the nodeId as the
    // real destinationId.
    const nodeId = graph.getNodeIdByParamId(destinationId);
    if (!nodeId) {
      return;
    }
    graph.removeNodeToParamConnection({
      sourceId,
      destinationId: nodeId,
      sourceOutputIndex,
      destinationParamId: destinationId,
    });
  }

  _updateDetailView(context: Protocol.WebAudio.BaseAudioContext): void {
    if (this._landingPage.isShowing()) {
      this._landingPage.detach();
    }
    const detailBuilder = new ContextDetailBuilder(context);
    this._detailViewContainer.removeChildren();
    this._detailViewContainer.appendChild(detailBuilder.getFragment());
  }

  _updateSummaryBar(contextId: string, contextRealtimeData: Protocol.WebAudio.ContextRealtimeData): void {
    const summaryBuilder = new ContextSummaryBuilder(contextId, contextRealtimeData);
    this._summaryBarContainer.removeChildren();
    this._summaryBarContainer.appendChild(summaryBuilder.getFragment());
  }

  _clearSummaryBar(): void {
    this._summaryBarContainer.removeChildren();
  }

  async _pollRealtimeData(): Promise<void> {
    const context = this._contextSelector.selectedContext();
    if (!context) {
      this._clearSummaryBar();
      return;
    }

    for (const model of SDK.SDKModel.TargetManager.instance().models(WebAudioModel)) {
      // Display summary only for real-time context.
      if (context.contextType === 'realtime') {
        if (!this._graphManager.hasContext(context.contextId)) {
          continue;
        }
        const realtimeData = await model.requestRealtimeData(context.contextId);
        if (realtimeData) {
          this._updateSummaryBar(context.contextId, realtimeData);
        }
      } else {
        this._clearSummaryBar();
      }
    }
  }
}
