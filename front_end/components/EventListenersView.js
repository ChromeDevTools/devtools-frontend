// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @typedef {Array<{object: !SDK.RemoteObject, eventListeners: ?Array<!SDK.EventListener>, frameworkEventListeners: ?{eventListeners: ?Array<!SDK.EventListener>, internalHandlers: ?SDK.RemoteArray}, isInternal: ?Array<boolean>}>}
 */
Components.EventListenersResult;

/**
 * @unrestricted
 */
Components.EventListenersView = class {
  /**
   * @param {!Element} element
   * @param {function()} changeCallback
   */
  constructor(element, changeCallback) {
    this._element = element;
    this._changeCallback = changeCallback;
    this._treeOutline = new TreeOutlineInShadow();
    this._treeOutline.hideOverflow();
    this._treeOutline.registerRequiredCSS('components/objectValue.css');
    this._treeOutline.registerRequiredCSS('components/eventListenersView.css');
    this._treeOutline.setComparator(Components.EventListenersTreeElement.comparator);
    this._treeOutline.element.classList.add('monospace');
    this._element.appendChild(this._treeOutline.element);
    this._emptyHolder = createElementWithClass('div', 'gray-info-message');
    this._emptyHolder.textContent = Common.UIString('No Event Listeners');
    this._linkifier = new Components.Linkifier();
    /** @type {!Map<string, !Components.EventListenersTreeElement>} */
    this._treeItemMap = new Map();
  }

  /**
   * @param {!Array<!SDK.RemoteObject>} objects
   * @return {!Promise<undefined>}
   */
  addObjects(objects) {
    this.reset();
    var promises = [];
    for (var object of objects)
      promises.push(this._addObject(object));
    return Promise.all(promises)
        .then(this.addEmptyHolderIfNeeded.bind(this))
        .then(this._eventListenersArrivedForTest.bind(this));
  }

  /**
   * @param {!SDK.RemoteObject} object
   * @return {!Promise<undefined>}
   */
  _addObject(object) {
    /** @type {?Array<!SDK.EventListener>} */
    var eventListeners = null;
    /** @type {?Components.FrameworkEventListenersObject}*/
    var frameworkEventListenersObject = null;

    var promises = [];
    promises.push(object.eventListeners().then(storeEventListeners));
    promises.push(SDK.EventListener.frameworkEventListeners(object).then(storeFrameworkEventListenersObject));
    return Promise.all(promises).then(markInternalEventListeners).then(addEventListeners.bind(this));

    /**
     * @param {?Array<!SDK.EventListener>} result
     */
    function storeEventListeners(result) {
      eventListeners = result;
    }

    /**
     * @param {?Components.FrameworkEventListenersObject} result
     */
    function storeFrameworkEventListenersObject(result) {
      frameworkEventListenersObject = result;
    }

    /**
     * @return {!Promise<undefined>}
     */
    function markInternalEventListeners() {
      if (!eventListeners || !frameworkEventListenersObject.internalHandlers)
        return Promise.resolve(undefined);
      return frameworkEventListenersObject.internalHandlers.object()
          .callFunctionJSONPromise(isInternalEventListener, eventListeners.map(handlerArgument))
          .then(setIsInternal);

      /**
       * @param {!SDK.EventListener} listener
       * @return {!Protocol.Runtime.CallArgument}
       */
      function handlerArgument(listener) {
        return SDK.RemoteObject.toCallArgument(listener.handler());
      }

      /**
       * @suppressReceiverCheck
       * @return {!Array<boolean>}
       * @this {Array<*>}
       */
      function isInternalEventListener() {
        var isInternal = [];
        var internalHandlersSet = new Set(this);
        for (var handler of arguments)
          isInternal.push(internalHandlersSet.has(handler));
        return isInternal;
      }

      /**
       * @param {!Array<boolean>} isInternal
       */
      function setIsInternal(isInternal) {
        for (var i = 0; i < eventListeners.length; ++i) {
          if (isInternal[i])
            eventListeners[i].setListenerType('frameworkInternal');
        }
      }
    }

    /**
     * @this {Components.EventListenersView}
     */
    function addEventListeners() {
      this._addObjectEventListeners(object, eventListeners);
      this._addObjectEventListeners(object, frameworkEventListenersObject.eventListeners);
    }
  }

  /**
   * @param {!SDK.RemoteObject} object
   * @param {?Array<!SDK.EventListener>} eventListeners
   */
  _addObjectEventListeners(object, eventListeners) {
    if (!eventListeners)
      return;
    for (var eventListener of eventListeners) {
      var treeItem = this._getOrCreateTreeElementForType(eventListener.type());
      treeItem.addObjectEventListener(eventListener, object);
    }
  }

  /**
   * @param {boolean} showFramework
   * @param {boolean} showPassive
   * @param {boolean} showBlocking
   */
  showFrameworkListeners(showFramework, showPassive, showBlocking) {
    var eventTypes = this._treeOutline.rootElement().children();
    for (var eventType of eventTypes) {
      var hiddenEventType = true;
      for (var listenerElement of eventType.children()) {
        var listenerType = listenerElement.eventListener().listenerType();
        var hidden = false;
        if (listenerType === 'frameworkUser' && !showFramework)
          hidden = true;
        if (listenerType === 'frameworkInternal' && showFramework)
          hidden = true;
        if (!showPassive && listenerElement.eventListener().passive())
          hidden = true;
        if (!showBlocking && !listenerElement.eventListener().passive())
          hidden = true;
        listenerElement.hidden = hidden;
        hiddenEventType = hiddenEventType && hidden;
      }
      eventType.hidden = hiddenEventType;
    }
  }

  /**
   * @param {string} type
   * @return {!Components.EventListenersTreeElement}
   */
  _getOrCreateTreeElementForType(type) {
    var treeItem = this._treeItemMap.get(type);
    if (!treeItem) {
      treeItem = new Components.EventListenersTreeElement(type, this._linkifier, this._changeCallback);
      this._treeItemMap.set(type, treeItem);
      treeItem.hidden = true;
      this._treeOutline.appendChild(treeItem);
    }
    this._emptyHolder.remove();
    return treeItem;
  }

  addEmptyHolderIfNeeded() {
    var allHidden = true;
    for (var eventType of this._treeOutline.rootElement().children()) {
      eventType.hidden = !eventType.firstChild();
      allHidden = allHidden && eventType.hidden;
    }
    if (allHidden && !this._emptyHolder.parentNode)
      this._element.appendChild(this._emptyHolder);
  }

  reset() {
    var eventTypes = this._treeOutline.rootElement().children();
    for (var eventType of eventTypes)
      eventType.removeChildren();
    this._linkifier.reset();
  }

  _eventListenersArrivedForTest() {
  }
};

/**
 * @unrestricted
 */
Components.EventListenersTreeElement = class extends TreeElement {
  /**
   * @param {string} type
   * @param {!Components.Linkifier} linkifier
   * @param {function()} changeCallback
   */
  constructor(type, linkifier, changeCallback) {
    super(type);
    this.toggleOnClick = true;
    this.selectable = false;
    this._linkifier = linkifier;
    this._changeCallback = changeCallback;
  }

  /**
   * @param {!TreeElement} element1
   * @param {!TreeElement} element2
   * @return {number}
   */
  static comparator(element1, element2) {
    if (element1.title === element2.title)
      return 0;
    return element1.title > element2.title ? 1 : -1;
  }

  /**
   * @param {!SDK.EventListener} eventListener
   * @param {!SDK.RemoteObject} object
   */
  addObjectEventListener(eventListener, object) {
    var treeElement =
        new Components.ObjectEventListenerBar(eventListener, object, this._linkifier, this._changeCallback);
    this.appendChild(/** @type {!TreeElement} */ (treeElement));
  }
};


/**
 * @unrestricted
 */
Components.ObjectEventListenerBar = class extends TreeElement {
  /**
   * @param {!SDK.EventListener} eventListener
   * @param {!SDK.RemoteObject} object
   * @param {!Components.Linkifier} linkifier
   * @param {function()} changeCallback
   */
  constructor(eventListener, object, linkifier, changeCallback) {
    super('', true);
    this._eventListener = eventListener;
    this.editable = false;
    this.selectable = false;
    this._setTitle(object, linkifier);
    this._changeCallback = changeCallback;
  }

  /**
   * @override
   */
  onpopulate() {
    var properties = [];
    var eventListener = this._eventListener;
    var runtimeModel = eventListener.target().runtimeModel;
    properties.push(runtimeModel.createRemotePropertyFromPrimitiveValue('useCapture', eventListener.useCapture()));
    properties.push(runtimeModel.createRemotePropertyFromPrimitiveValue('passive', eventListener.passive()));
    properties.push(runtimeModel.createRemotePropertyFromPrimitiveValue('once', eventListener.once()));
    if (typeof eventListener.handler() !== 'undefined')
      properties.push(new SDK.RemoteObjectProperty('handler', eventListener.handler()));
    Components.ObjectPropertyTreeElement.populateWithProperties(this, properties, [], true, null);
  }

  /**
   * @param {!SDK.RemoteObject} object
   * @param {!Components.Linkifier} linkifier
   */
  _setTitle(object, linkifier) {
    var title = this.listItemElement.createChild('span');
    var subtitle = this.listItemElement.createChild('span', 'event-listener-tree-subtitle');
    subtitle.appendChild(linkifier.linkifyRawLocation(this._eventListener.location(), this._eventListener.sourceURL()));

    title.appendChild(Components.ObjectPropertiesSection.createValueElement(object, false));

    if (this._eventListener.removeFunction()) {
      var deleteButton = title.createChild('span', 'event-listener-button');
      deleteButton.textContent = Common.UIString('Remove');
      deleteButton.title = Common.UIString('Delete event listener');
      deleteButton.addEventListener('click', removeListener.bind(this), false);
      title.appendChild(deleteButton);
    }

    if (this._eventListener.isScrollBlockingType() && this._eventListener.isNormalListenerType()) {
      var passiveButton = title.createChild('span', 'event-listener-button');
      passiveButton.textContent = Common.UIString('Toggle Passive');
      passiveButton.title = Common.UIString('Toggle whether event listener is passive or blocking');
      passiveButton.addEventListener('click', togglePassiveListener.bind(this), false);
      title.appendChild(passiveButton);
    }

    /**
     * @param {!Common.Event} event
     * @this {Components.ObjectEventListenerBar}
     */
    function removeListener(event) {
      event.consume();
      this._removeListenerBar();
      this._eventListener.remove();
    }

    /**
     * @param {!Common.Event} event
     * @this {Components.ObjectEventListenerBar}
     */
    function togglePassiveListener(event) {
      event.consume();
      this._eventListener.togglePassive().then(this._changeCallback());
    }
  }

  _removeListenerBar() {
    var parent = this.parent;
    parent.removeChild(this);
    if (!parent.childCount()) {
      parent.parent.removeChild(parent);
      return;
    }
    var allHidden = true;
    for (var i = 0; i < parent.childCount(); ++i) {
      if (!parent.childAt(i).hidden)
        allHidden = false;
    }
    parent.hidden = allHidden;
  }

  /**
   * @return {!SDK.EventListener}
   */
  eventListener() {
    return this._eventListener;
  }
};
