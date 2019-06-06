// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {SDK.SDKModelObserver<!WebAudio.WebAudioModel>}
 */
WebAudio.WebAudioView = class extends UI.ThrottledWidget {
  constructor() {
    super(true, 1000);
    this.element.classList.add('web-audio-drawer');
    this.registerRequiredCSS('web_audio/webAudio.css');

    // Creates the toolbar.
    const toolbarContainer = this.contentElement.createChild(
      'div', 'web-audio-toolbar-container vbox');
    this._contextSelector = new WebAudio.AudioContextSelector(ls`BaseAudioContexts`);
    const toolbar = new UI.Toolbar('web-audio-toolbar', toolbarContainer);
    toolbar.appendToolbarItem(UI.Toolbar.createActionButtonForId('components.collect-garbage'));
    toolbar.appendSeparator();
    toolbar.appendToolbarItem(this._contextSelector.toolbarItem());

    // Creates the detail view.
    this._detailViewContainer = this.contentElement.createChild('div', 'vbox flex-auto');

    // Creates the landing page.
    this._landingPage = new UI.VBox();
    this._landingPage.contentElement.classList.add('web-audio-landing-page', 'fill');
    this._landingPage.contentElement.appendChild(UI.html`
      <div>
        <p>${ls`Open a page that uses Web Audio API to start monitoring.`}</p>
      </div>
    `);
    this._landingPage.show(this._detailViewContainer);

    // Creates the summary bar.
    this._summaryBarContainer = this.contentElement.createChild('div', 'web-audio-summary-container');

    this._contextSelector.addEventListener(WebAudio.AudioContextSelector.Events.ContextSelected, event => {
      const context =
          /** @type {!Protocol.WebAudio.BaseAudioContext} */ (event.data);
      this._updateDetailView(context);
      this.doUpdate();
    });

    SDK.targetManager.observeModels(WebAudio.WebAudioModel, this);
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    for (const model of SDK.targetManager.models(WebAudio.WebAudioModel))
      this._addEventListeners(model);
  }

  /**
   * @override
   */
  willHide() {
    for (const model of SDK.targetManager.models(WebAudio.WebAudioModel))
      this._removeEventListeners(model);
  }

  /**
   * @override
   * @param {!WebAudio.WebAudioModel} webAudioModel
   */
  modelAdded(webAudioModel) {
    if (this.isShowing())
      this._addEventListeners(webAudioModel);
  }

  /**
   * @override
   * @param {!WebAudio.WebAudioModel} webAudioModel
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
   * @param {!WebAudio.WebAudioModel} webAudioModel
   */
  _addEventListeners(webAudioModel) {
    webAudioModel.ensureEnabled();
    webAudioModel.addEventListener(WebAudio.WebAudioModel.Events.ContextCreated, this._contextCreated, this);
    webAudioModel.addEventListener(WebAudio.WebAudioModel.Events.ContextDestroyed, this._contextDestroyed, this);
    webAudioModel.addEventListener(WebAudio.WebAudioModel.Events.ContextChanged, this._contextChanged, this);
    webAudioModel.addEventListener(WebAudio.WebAudioModel.Events.ModelReset, this._reset, this);
  }

  /**
   * @param {!WebAudio.WebAudioModel} webAudioModel
   */
  _removeEventListeners(webAudioModel) {
    webAudioModel.removeEventListener(WebAudio.WebAudioModel.Events.ContextCreated, this._contextCreated, this);
    webAudioModel.removeEventListener(WebAudio.WebAudioModel.Events.ContextDestroyed, this._contextDestroyed, this);
    webAudioModel.removeEventListener(WebAudio.WebAudioModel.Events.ContextChanged, this._contextChanged, this);
    webAudioModel.removeEventListener(WebAudio.WebAudioModel.Events.ModelReset, this._reset, this);
  }

  /**
   * @param {!Common.Event} event
   */
  _contextCreated(event) {
    this._contextSelector.contextCreated(event);
  }

  /**
   * @param {!Common.Event} event
   */
  _contextDestroyed(event) {
    this._contextSelector.contextDestroyed(event);
  }

  /**
   * @param {!Common.Event} event
   */
  _contextChanged(event) {
    this._contextSelector.contextChanged(event);
  }

  _reset() {
    if (this._landingPage.isShowing())
      this._landingPage.detach();
    this._contextSelector.reset();
    this._detailViewContainer.removeChildren();
    this._landingPage.show(this._detailViewContainer);
  }

  /**
   * @param {!Protocol.WebAudio.BaseAudioContext} context
   */
  _updateDetailView(context) {
    if (this._landingPage.isShowing())
      this._landingPage.detach();
    const detailBuilder = new WebAudio.ContextDetailBuilder(context);
    this._detailViewContainer.removeChildren();
    this._detailViewContainer.appendChild(detailBuilder.getFragment());
  }

  /**
   * @param {!Protocol.WebAudio.ContextId} contextId
   * @param {!Protocol.WebAudio.ContextRealtimeData} contextRealtimeData
   */
  _updateSummaryBar(contextId, contextRealtimeData) {
    const summaryBuilder =
        new WebAudio.AudioContextSummaryBuilder(contextId, contextRealtimeData);
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

    for (const model of SDK.targetManager.models(WebAudio.WebAudioModel)) {
      // Display summary only for real-time context.
      if (context.contextType === 'realtime') {
        const realtimeData = await model.requestRealtimeData(context.contextId);
        if (realtimeData)
          this._updateSummaryBar(context.contextId, realtimeData);
      } else {
        this._clearSummaryBar();
      }
    }
  }
};
