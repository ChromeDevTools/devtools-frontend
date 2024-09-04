// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {ContextDetailBuilder, ContextSummaryBuilder} from './AudioContextContentBuilder.js';
import {AudioContextSelector, Events as SelectorEvents} from './AudioContextSelector.js';
import * as GraphVisualizer from './graph_visualizer/graph_visualizer.js';
import webAudioStyles from './webAudio.css.js';
import {Events as ModelEvents, WebAudioModel} from './WebAudioModel.js';

const UIStrings = {
  /**
   *@description Text in Web Audio View
   */
  openAPageThatUsesWebAudioApiTo: 'Open a page that uses Web Audio API to start monitoring.',
};
const str_ = i18n.i18n.registerUIStrings('panels/web_audio/WebAudioView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class WebAudioView extends UI.ThrottledWidget.ThrottledWidget implements
    SDK.TargetManager.SDKModelObserver<WebAudioModel> {
  private readonly contextSelector: AudioContextSelector;
  private readonly contentContainer: HTMLElement;
  private readonly detailViewContainer: HTMLElement;
  private graphManager: GraphVisualizer.GraphManager.GraphManager;
  private readonly landingPage: UI.Widget.VBox;
  private readonly summaryBarContainer: HTMLElement;
  constructor() {
    super(true, 1000);
    this.element.setAttribute('jslog', `${VisualLogging.panel('web-audio').track({resize: true})}`);
    this.element.classList.add('web-audio-drawer');

    // Creates the toolbar.
    const toolbarContainer = this.contentElement.createChild('div', 'web-audio-toolbar-container vbox');
    this.contextSelector = new AudioContextSelector();
    const toolbar = new UI.Toolbar.Toolbar('web-audio-toolbar', toolbarContainer);
    toolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButtonForId('components.collect-garbage'));
    toolbar.appendSeparator();
    toolbar.appendToolbarItem(this.contextSelector.toolbarItem());
    toolbar.element.setAttribute('jslog', `${VisualLogging.toolbar()}`);

    // Create content container
    this.contentContainer = this.contentElement.createChild('div', 'web-audio-content-container vbox flex-auto');

    // Creates the detail view.
    this.detailViewContainer = this.contentContainer.createChild('div', 'web-audio-details-container vbox flex-auto');

    this.graphManager = new GraphVisualizer.GraphManager.GraphManager();

    // Creates the landing page.
    this.landingPage = new UI.Widget.VBox();
    this.landingPage.contentElement.classList.add('web-audio-landing-page', 'fill');
    this.landingPage.contentElement.appendChild(UI.Fragment.html`
  <div>
  <p>${i18nString(UIStrings.openAPageThatUsesWebAudioApiTo)}</p>
  </div>
  `);
    this.landingPage.show(this.detailViewContainer);

    // Creates the summary bar.
    this.summaryBarContainer = this.contentContainer.createChild('div', 'web-audio-summary-container');

    this.contextSelector.addEventListener(
        SelectorEvents.CONTEXT_SELECTED,
        (event: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.BaseAudioContext|null>) => {
          const context = event.data;
          if (context) {
            this.updateDetailView(context);
          }
          void this.doUpdate();
        });

    SDK.TargetManager.TargetManager.instance().observeModels(WebAudioModel, this);
  }

  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([webAudioStyles]);
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

  override async doUpdate(): Promise<void> {
    await this.pollRealtimeData();
    this.update();
  }

  private addEventListeners(webAudioModel: WebAudioModel): void {
    webAudioModel.ensureEnabled();
    webAudioModel.addEventListener(ModelEvents.CONTEXT_CREATED, this.contextCreated, this);
    webAudioModel.addEventListener(ModelEvents.CONTEXT_DESTROYED, this.contextDestroyed, this);
    webAudioModel.addEventListener(ModelEvents.CONTEXT_CHANGED, this.contextChanged, this);
    webAudioModel.addEventListener(ModelEvents.MODEL_RESET, this.reset, this);
    webAudioModel.addEventListener(ModelEvents.MODEL_SUSPEND, this.suspendModel, this);
    webAudioModel.addEventListener(ModelEvents.AUDIO_LISTENER_CREATED, this.audioListenerCreated, this);
    webAudioModel.addEventListener(
        ModelEvents.AUDIO_LISTENER_WILL_BE_DESTROYED, this.audioListenerWillBeDestroyed, this);
    webAudioModel.addEventListener(ModelEvents.AUDIO_NODE_CREATED, this.audioNodeCreated, this);
    webAudioModel.addEventListener(ModelEvents.AUDIO_NODE_WILL_BE_DESTROYED, this.audioNodeWillBeDestroyed, this);
    webAudioModel.addEventListener(ModelEvents.AUDIO_PARAM_CREATED, this.audioParamCreated, this);
    webAudioModel.addEventListener(ModelEvents.AUDIO_PARAM_WILL_BE_DESTROYED, this.audioParamWillBeDestroyed, this);
    webAudioModel.addEventListener(ModelEvents.NODES_CONNECTED, this.nodesConnected, this);
    webAudioModel.addEventListener(ModelEvents.NODES_DISCONNECTED, this.nodesDisconnected, this);
    webAudioModel.addEventListener(ModelEvents.NODE_PARAM_CONNECTED, this.nodeParamConnected, this);
    webAudioModel.addEventListener(ModelEvents.NODE_PARAM_DISCONNECTED, this.nodeParamDisconnected, this);
  }

  private removeEventListeners(webAudioModel: WebAudioModel): void {
    webAudioModel.removeEventListener(ModelEvents.CONTEXT_CREATED, this.contextCreated, this);
    webAudioModel.removeEventListener(ModelEvents.CONTEXT_DESTROYED, this.contextDestroyed, this);
    webAudioModel.removeEventListener(ModelEvents.CONTEXT_CHANGED, this.contextChanged, this);
    webAudioModel.removeEventListener(ModelEvents.MODEL_RESET, this.reset, this);
    webAudioModel.removeEventListener(ModelEvents.MODEL_SUSPEND, this.suspendModel, this);
    webAudioModel.removeEventListener(ModelEvents.AUDIO_LISTENER_CREATED, this.audioListenerCreated, this);
    webAudioModel.removeEventListener(
        ModelEvents.AUDIO_LISTENER_WILL_BE_DESTROYED, this.audioListenerWillBeDestroyed, this);
    webAudioModel.removeEventListener(ModelEvents.AUDIO_NODE_CREATED, this.audioNodeCreated, this);
    webAudioModel.removeEventListener(ModelEvents.AUDIO_NODE_WILL_BE_DESTROYED, this.audioNodeWillBeDestroyed, this);
    webAudioModel.removeEventListener(ModelEvents.AUDIO_PARAM_CREATED, this.audioParamCreated, this);
    webAudioModel.removeEventListener(ModelEvents.AUDIO_PARAM_WILL_BE_DESTROYED, this.audioParamWillBeDestroyed, this);
    webAudioModel.removeEventListener(ModelEvents.NODES_CONNECTED, this.nodesConnected, this);
    webAudioModel.removeEventListener(ModelEvents.NODES_DISCONNECTED, this.nodesDisconnected, this);
    webAudioModel.removeEventListener(ModelEvents.NODE_PARAM_CONNECTED, this.nodeParamConnected, this);
    webAudioModel.removeEventListener(ModelEvents.NODE_PARAM_DISCONNECTED, this.nodeParamDisconnected, this);
  }

  private contextCreated(event: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.BaseAudioContext>): void {
    const context = event.data;
    this.graphManager.createContext(context.contextId);
    this.contextSelector.contextCreated(event);
  }

  private contextDestroyed(event: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.GraphObjectId>): void {
    const contextId = event.data;
    this.graphManager.destroyContext(contextId);
    this.contextSelector.contextDestroyed(event);
  }

  private contextChanged(event: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.BaseAudioContext>): void {
    const context = event.data;
    if (!this.graphManager.hasContext(context.contextId)) {
      return;
    }

    this.contextSelector.contextChanged(event);
  }

  private reset(): void {
    if (this.landingPage.isShowing()) {
      this.landingPage.detach();
    }
    this.contextSelector.reset();
    this.detailViewContainer.removeChildren();
    this.landingPage.show(this.detailViewContainer);
    this.graphManager.clearGraphs();
  }

  private suspendModel(): void {
    this.graphManager.clearGraphs();
  }

  private audioListenerCreated(event: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.AudioListener>): void {
    const listener = event.data;
    const graph = this.graphManager.getGraph(listener.contextId);
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

  private audioListenerWillBeDestroyed(
      event: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.AudioListenerWillBeDestroyedEvent>): void {
    const {contextId, listenerId} = event.data;
    const graph = this.graphManager.getGraph(contextId);
    if (!graph) {
      return;
    }
    graph.removeNode(listenerId);
  }

  private audioNodeCreated(event: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.AudioNode>): void {
    const node = event.data;
    const graph = this.graphManager.getGraph(node.contextId);
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

  private audioNodeWillBeDestroyed(
      event: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.AudioNodeWillBeDestroyedEvent>): void {
    const {contextId, nodeId} = event.data;
    const graph = this.graphManager.getGraph(contextId);
    if (!graph) {
      return;
    }
    graph.removeNode(nodeId);
  }

  private audioParamCreated(event: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.AudioParam>): void {
    const param = event.data;
    const graph = this.graphManager.getGraph(param.contextId);
    if (!graph) {
      return;
    }
    graph.addParam({
      paramId: param.paramId,
      paramType: param.paramType,
      nodeId: param.nodeId,
    });
  }

  private audioParamWillBeDestroyed(
      event: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.AudioParamWillBeDestroyedEvent>): void {
    const {contextId, paramId} = event.data;
    const graph = this.graphManager.getGraph(contextId);
    if (!graph) {
      return;
    }
    graph.removeParam(paramId);
  }

  private nodesConnected(event: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.NodesConnectedEvent>): void {
    const {contextId, sourceId, destinationId, sourceOutputIndex, destinationInputIndex} = event.data;
    const graph = this.graphManager.getGraph(contextId);
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

  private nodesDisconnected(event: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.NodesDisconnectedEvent>):
      void {
    const {contextId, sourceId, destinationId, sourceOutputIndex, destinationInputIndex} = event.data;
    const graph = this.graphManager.getGraph(contextId);
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

  private nodeParamConnected(event: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.NodeParamConnectedEvent>):
      void {
    const {contextId, sourceId, destinationId, sourceOutputIndex} = event.data;
    const graph = this.graphManager.getGraph(contextId);
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

  private nodeParamDisconnected(
      event: Common.EventTarget.EventTargetEvent<Protocol.WebAudio.NodeParamDisconnectedEvent>): void {
    const {contextId, sourceId, destinationId, sourceOutputIndex} = event.data;
    const graph = this.graphManager.getGraph(contextId);
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

  private updateDetailView(context: Protocol.WebAudio.BaseAudioContext): void {
    if (this.landingPage.isShowing()) {
      this.landingPage.detach();
    }
    const detailBuilder = new ContextDetailBuilder(context);
    this.detailViewContainer.removeChildren();
    this.detailViewContainer.appendChild(detailBuilder.getFragment());
  }

  private updateSummaryBar(contextId: string, contextRealtimeData: Protocol.WebAudio.ContextRealtimeData): void {
    const summaryBuilder = new ContextSummaryBuilder(contextId, contextRealtimeData);
    this.summaryBarContainer.removeChildren();
    this.summaryBarContainer.appendChild(summaryBuilder.getFragment());
  }

  private clearSummaryBar(): void {
    this.summaryBarContainer.removeChildren();
  }

  private async pollRealtimeData(): Promise<void> {
    const context = this.contextSelector.selectedContext();
    if (!context) {
      this.clearSummaryBar();
      return;
    }

    for (const model of SDK.TargetManager.TargetManager.instance().models(WebAudioModel)) {
      // Display summary only for real-time context.
      if (context.contextType === 'realtime') {
        if (!this.graphManager.hasContext(context.contextId)) {
          continue;
        }
        const realtimeData = await model.requestRealtimeData(context.contextId);
        if (realtimeData) {
          this.updateSummaryBar(context.contextId, realtimeData);
        }
      } else {
        this.clearSummaryBar();
      }
    }
  }
}
