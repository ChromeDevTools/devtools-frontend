// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {UI.ToolbarItem.ItemsProvider}
 * @unrestricted
 */
Sources.ObjectEventListenersSidebarPane = class extends UI.VBox {
  constructor() {
    super();
    this.element.classList.add('event-listeners-sidebar-pane');

    this._refreshButton = new UI.ToolbarButton(Common.UIString('Refresh'), 'largeicon-refresh');
    this._refreshButton.addEventListener(UI.ToolbarButton.Events.Click, this._refreshClick, this);
    this._refreshButton.setEnabled(false);

    this._eventListenersView = new EventListeners.EventListenersView(this.element, this.update.bind(this));
  }

  /**
   * @override
   * @return {!Array<!UI.ToolbarItem>}
   */
  toolbarItems() {
    return [this._refreshButton];
  }

  update() {
    if (this._lastRequestedContext) {
      this._lastRequestedContext.target().runtimeAgent().releaseObjectGroup(
          Sources.ObjectEventListenersSidebarPane._objectGroupName);
      delete this._lastRequestedContext;
    }
    var executionContext = UI.context.flavor(SDK.ExecutionContext);
    if (!executionContext) {
      this._eventListenersView.reset();
      this._eventListenersView.addEmptyHolderIfNeeded();
      return;
    }
    this._lastRequestedContext = executionContext;
    Promise.all([this._windowObjectInContext(executionContext)])
        .then(this._eventListenersView.addObjects.bind(this._eventListenersView));
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    UI.context.addFlavorChangeListener(SDK.ExecutionContext, this.update, this);
    this._refreshButton.setEnabled(true);
    this.update();
  }

  /**
   * @override
   */
  willHide() {
    super.willHide();
    UI.context.removeFlavorChangeListener(SDK.ExecutionContext, this.update, this);
    this._refreshButton.setEnabled(false);
  }

  /**
   * @param {!SDK.ExecutionContext} executionContext
   * @return {!Promise<!SDK.RemoteObject>} object
   */
  _windowObjectInContext(executionContext) {
    return new Promise(windowObjectInContext);
    /**
     * @param {function(?)} fulfill
     * @param {function(*)} reject
     */
    function windowObjectInContext(fulfill, reject) {
      executionContext.evaluate(
          'self', Sources.ObjectEventListenersSidebarPane._objectGroupName, false, true, false, false, false,
          mycallback);
      /**
       * @param {?SDK.RemoteObject} object
       */
      function mycallback(object) {
        if (object)
          fulfill(object);
        else
          reject(null);
      }
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _refreshClick(event) {
    event.data.consume();
    this.update();
  }
};

Sources.ObjectEventListenersSidebarPane._objectGroupName = 'object-event-listeners-sidebar-pane';
