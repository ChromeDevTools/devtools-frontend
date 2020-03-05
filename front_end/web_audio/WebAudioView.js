// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

import {ContextDetailBuilder, ContextSummaryBuilder} from './AudioContextContentBuilder.js';
import {AudioContextSelector, Events as SelectorEvents} from './AudioContextSelector.js';
import {GraphManager} from './graph_visualizer/GraphManager.js';
import {Events as ModelEvents, WebAudioModel} from './WebAudioModel.js';

/**
 * @implements {SDK.SDKModel.SDKModelObserver<!WebAudioModel>}
 */
export class WebAudioView extends UI.ThrottledWidget.ThrottledWidget {
  constructor() {
    super(true, 1000);
    this.element.classList.add('web-audio-drawer');
    this.registerRequiredCSS('web_audio/webAudio.css');

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
        <p>${ls`Open a page that uses Web Audio API to start monitoring.`}</p>
      </div>
    `);
    this._landingPage.show(this._detailViewContainer);

    // Creates the summary bar.
    this._summaryBarContainer = this._contentContainer.createChild('div', 'web-audio-summary-container');

    this._contextSelector.addEventListener(SelectorEvents.ContextSelected, event => {
      const context =
          /** @type {!Protocol.WebAudio.BaseAudioContext} */ (event.data);
      this._updateDetailView(context);
      this.doUpdate();
    });

    SDK.SDKModel.TargetManager.instance().observeModels(WebAudioModel, this);
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    for (const model of SDK.SDKModel.TargetManager.instance().models(WebAudioModel)) {
      this._addEventListeners(model);
    }
  }

  /**
   * @override
   */
  willHide() {
    for (const model of SDK.SDKModel.TargetManager.instance().models(WebAudioModel)) {
      this._removeEventListeners(model);
    }
  }

  /**
   * @override
   * @param {!WebAudioModel} webAudioModel
   */
  modelAdded(webAudioModel) {
    if (this.isShowing()) {
      this._addEventListeners(webAudioModel);
    }
  }

  /**
   * @override
   * @param {!WebAudioModel} webAudioModel
   */
  modelRemoved(webAudioModel) {
    this._removeEventListeners(webAudioModel);
  }

  /**
   * @override
   * @return {!Promise<?>}
   */
  async doUpdate() {
    await this._pollRealtimeData();
    this.update();
  }

  /**
   * @param {!WebAudioModel} webAudioModel
   */
  _addEventListeners(webAudioModel) {
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

  /**
   * @param {!WebAudio.WebAudioModel} webAudioModel
   */
  _removeEventListeners(webAudioModel) {
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

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _contextCreated(event) {
    const context = /** @type {!Protocol.WebAudio.BaseAudioContext} */ (event.data);
    this._graphManager.createContext(context.contextId);
    this._contextSelector.contextCreated(event);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _contextDestroyed(event) {
    const contextId = /** @type {!Protocol.WebAudio.GraphObjectId} */ (event.data);
    this._graphManager.destroyContext(contextId);
    this._contextSelector.contextDestroyed(event);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _contextChanged(event) {
    const context = /** @type {!Protocol.WebAudio.BaseAudioContext} */ (event.data);
    if (!this._graphManager.hasContext(context.contextId)) {
      return;
    }

    this._contextSelector.contextChanged(event);
  }

  _reset() {
    if (this._landingPage.isShowing()) {
      this._landingPage.detach();
    }
    this._contextSelector.reset();
    this._detailViewContainer.removeChildren();
    this._landingPage.show(this._detailViewContainer);
    this._graphManager.clearGraphs();
  }

  _suspendModel() {
    this._graphManager.clearGraphs();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _audioListenerCreated(event) {
    const listener = /** @type {!Protocol.WebAudio.AudioListener} */ (event.data);
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

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _audioListenerWillBeDestroyed(event) {
    const {contextId, listenerId} = event.data;
    const graph = this._graphManager.getGraph(contextId);
    if (!graph) {
      return;
    }
    graph.removeNode(listenerId);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _audioNodeCreated(event) {
    const node = /** @type {!Protocol.WebAudio.AudioNode} */ (event.data);
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

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _audioNodeWillBeDestroyed(event) {
    const {contextId, nodeId} = event.data;
    const graph = this._graphManager.getGraph(contextId);
    if (!graph) {
      return;
    }
    graph.removeNode(nodeId);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _audioParamCreated(event) {
    const param = /** @type {!Protocol.WebAudio.AudioParam} */ (event.data);
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

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _audioParamWillBeDestroyed(event) {
    const {contextId, paramId} = event.data;
    const graph = this._graphManager.getGraph(contextId);
    if (!graph) {
      return;
    }
    graph.removeParam(paramId);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _nodesConnected(event) {
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

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _nodesDisconnected(event) {
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

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _nodeParamConnected(event) {
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

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _nodeParamDisconnected(event) {
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

  /**
   * @param {!Protocol.WebAudio.BaseAudioContext} context
   */
  _updateDetailView(context) {
    if (this._landingPage.isShowing()) {
      this._landingPage.detach();
    }
    const detailBuilder = new ContextDetailBuilder(context);
    this._detailViewContainer.removeChildren();
    this._detailViewContainer.appendChild(detailBuilder.getFragment());
  }

  /**
   * @param {!Protocol.WebAudio.GraphObjectId} contextId
   * @param {!Protocol.WebAudio.ContextRealtimeData} contextRealtimeData
   */
  _updateSummaryBar(contextId, contextRealtimeData) {
    const summaryBuilder = new ContextSummaryBuilder(contextId, contextRealtimeData);
    this._summaryBarContainer.removeChildren();
    this._summaryBarContainer.appendChild(summaryBuilder.getFragment());
  }

  _clearSummaryBar() {
    this._summaryBarContainer.removeChildren();
  }

  async _pollRealtimeData() {
    const context = this._contextSelector.selectedContext();
    if (!context) {
      this._clearSummaryBar();
      return;
    }

    for (const model of SDK.SDKModel.TargetManager.instance().models(WebAudio.WebAudioModel)) {
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
