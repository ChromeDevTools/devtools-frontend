// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as ObjectUI from '../object_ui/object_ui.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {frameworkEventListeners, FrameworkEventListenersObject} from './EventListenersUtils.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class EventListenersView extends UI.Widget.VBox {
  /**
   * @param {function()} changeCallback
   */
  constructor(changeCallback) {
    super();
    this._changeCallback = changeCallback;
    this._treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    this._treeOutline.hideOverflow();
    this._treeOutline.registerRequiredCSS('object_ui/objectValue.css');
    this._treeOutline.registerRequiredCSS('event_listeners/eventListenersView.css');
    this._treeOutline.setComparator(EventListenersTreeElement.comparator);
    this._treeOutline.element.classList.add('monospace');
    this._treeOutline.setShowSelectionOnKeyboardFocus(true);
    this._treeOutline.setFocusable(true);
    this.element.appendChild(this._treeOutline.element);
    this._emptyHolder = createElementWithClass('div', 'gray-info-message');
    this._emptyHolder.textContent = Common.UIString.UIString('No event listeners');
    this._emptyHolder.tabIndex = -1;
    this._linkifier = new Components.Linkifier.Linkifier();
    /** @type {!Map<string, !EventListenersTreeElement>} */
    this._treeItemMap = new Map();
  }

  /**
   * @override
   */
  focus() {
    if (!this._emptyHolder.parentNode) {
      this._treeOutline.forceSelect();
    } else {
      this._emptyHolder.focus();
    }
  }

  /**
   * @param {!Array<?SDK.RemoteObject.RemoteObject>} objects
   * @return {!Promise<undefined>}
   */
  async addObjects(objects) {
    this.reset();
    await Promise.all(objects.map(obj => obj ? this._addObject(obj) : Promise.resolve()));
    this.addEmptyHolderIfNeeded();
    this._eventListenersArrivedForTest();
  }

  /**
   * @param {!SDK.RemoteObject.RemoteObject} object
   * @return {!Promise<undefined>}
   */
  _addObject(object) {
    /** @type {!Array<!SDK.DOMDebuggerModel.EventListener>} */
    let eventListeners;
    /** @type {?FrameworkEventListenersObject}*/
    let frameworkEventListenersObject = null;

    const promises = [];
    const domDebuggerModel = object.runtimeModel().target().model(SDK.DOMDebuggerModel.DOMDebuggerModel);
    // TODO(kozyatinskiy): figure out how this should work for |window| when there is no DOMDebugger.
    if (domDebuggerModel) {
      promises.push(domDebuggerModel.eventListeners(object).then(storeEventListeners));
    }
    promises.push(frameworkEventListeners(object).then(storeFrameworkEventListenersObject));
    return Promise.all(promises).then(markInternalEventListeners).then(addEventListeners.bind(this));

    /**
     * @param {!Array<!SDK.DOMDebuggerModel.EventListener>} result
     */
    function storeEventListeners(result) {
      eventListeners = result;
    }

    /**
     * @param {?FrameworkEventListenersObject} result
     */
    function storeFrameworkEventListenersObject(result) {
      frameworkEventListenersObject = result;
    }

    /**
     * @return {!Promise<undefined>}
     */
    function markInternalEventListeners() {
      if (!frameworkEventListenersObject.internalHandlers) {
        return Promise.resolve(undefined);
      }
      return frameworkEventListenersObject.internalHandlers.object()
          .callFunctionJSON(isInternalEventListener, eventListeners.map(handlerArgument))
          .then(setIsInternal);

      /**
       * @param {!SDK.DOMDebuggerModel.EventListener} listener
       * @return {!Protocol.Runtime.CallArgument}
       */
      function handlerArgument(listener) {
        return SDK.RemoteObject.RemoteObject.toCallArgument(listener.handler());
      }

      /**
       * @suppressReceiverCheck
       * @return {!Array<boolean>}
       * @this {Array<*>}
       */
      function isInternalEventListener() {
        const isInternal = [];
        const internalHandlersSet = new Set(this);
        for (const handler of arguments) {
          isInternal.push(internalHandlersSet.has(handler));
        }
        return isInternal;
      }

      /**
       * @param {!Array<boolean>} isInternal
       */
      function setIsInternal(isInternal) {
        for (let i = 0; i < eventListeners.length; ++i) {
          if (isInternal[i]) {
            eventListeners[i].markAsFramework();
          }
        }
      }
    }

    /**
     * @this {EventListenersView}
     */
    function addEventListeners() {
      this._addObjectEventListeners(object, eventListeners);
      this._addObjectEventListeners(object, frameworkEventListenersObject.eventListeners);
    }
  }

  /**
   * @param {!SDK.RemoteObject.RemoteObject} object
   * @param {?Array<!SDK.DOMDebuggerModel.EventListener>} eventListeners
   */
  _addObjectEventListeners(object, eventListeners) {
    if (!eventListeners) {
      return;
    }
    for (const eventListener of eventListeners) {
      const treeItem = this._getOrCreateTreeElementForType(eventListener.type());
      treeItem.addObjectEventListener(eventListener, object);
    }
  }

  /**
   * @param {boolean} showFramework
   * @param {boolean} showPassive
   * @param {boolean} showBlocking
   */
  showFrameworkListeners(showFramework, showPassive, showBlocking) {
    const eventTypes = this._treeOutline.rootElement().children();
    for (const eventType of eventTypes) {
      let hiddenEventType = true;
      for (const listenerElement of eventType.children()) {
        const listenerOrigin = listenerElement.eventListener().origin();
        let hidden = false;
        if (listenerOrigin === SDK.DOMDebuggerModel.EventListener.Origin.FrameworkUser && !showFramework) {
          hidden = true;
        }
        if (listenerOrigin === SDK.DOMDebuggerModel.EventListener.Origin.Framework && showFramework) {
          hidden = true;
        }
        if (!showPassive && listenerElement.eventListener().passive()) {
          hidden = true;
        }
        if (!showBlocking && !listenerElement.eventListener().passive()) {
          hidden = true;
        }
        listenerElement.hidden = hidden;
        hiddenEventType = hiddenEventType && hidden;
      }
      eventType.hidden = hiddenEventType;
    }
  }

  /**
   * @param {string} type
   * @return {!EventListenersTreeElement}
   */
  _getOrCreateTreeElementForType(type) {
    let treeItem = this._treeItemMap.get(type);
    if (!treeItem) {
      treeItem = new EventListenersTreeElement(type, this._linkifier, this._changeCallback);
      this._treeItemMap.set(type, treeItem);
      treeItem.hidden = true;
      this._treeOutline.appendChild(treeItem);
    }
    this._emptyHolder.remove();
    return treeItem;
  }

  addEmptyHolderIfNeeded() {
    let allHidden = true;
    let firstVisibleChild = null;
    for (const eventType of this._treeOutline.rootElement().children()) {
      eventType.hidden = !eventType.firstChild();
      allHidden = allHidden && eventType.hidden;
      if (!firstVisibleChild && !eventType.hidden) {
        firstVisibleChild = eventType;
      }
    }
    if (allHidden && !this._emptyHolder.parentNode) {
      this.element.appendChild(this._emptyHolder);
    }
    if (firstVisibleChild) {
      firstVisibleChild.select(true /* omitFocus */);
    }
  }

  reset() {
    const eventTypes = this._treeOutline.rootElement().children();
    for (const eventType of eventTypes) {
      eventType.removeChildren();
    }
    this._linkifier.reset();
  }

  _eventListenersArrivedForTest() {
  }
}

/**
 * @unrestricted
 */
export class EventListenersTreeElement extends UI.TreeOutline.TreeElement {
  /**
   * @param {string} type
   * @param {!Components.Linkifier.Linkifier} linkifier
   * @param {function()} changeCallback
   */
  constructor(type, linkifier, changeCallback) {
    super(type);
    this.toggleOnClick = true;
    this._linkifier = linkifier;
    this._changeCallback = changeCallback;
    UI.ARIAUtils.setAccessibleName(this.listItemElement, `${type}, event listener`);
  }

  /**
   * @param {!UI.TreeOutline.TreeElement} element1
   * @param {!UI.TreeOutline.TreeElement} element2
   * @return {number}
   */
  static comparator(element1, element2) {
    if (element1.title === element2.title) {
      return 0;
    }
    return element1.title > element2.title ? 1 : -1;
  }

  /**
   * @param {!SDK.DOMDebuggerModel.EventListener} eventListener
   * @param {!SDK.RemoteObject.RemoteObject} object
   */
  addObjectEventListener(eventListener, object) {
    const treeElement = new ObjectEventListenerBar(eventListener, object, this._linkifier, this._changeCallback);
    this.appendChild(/** @type {!UI.TreeOutline.TreeElement} */ (treeElement));
  }
}


/**
 * @unrestricted
 */
export class ObjectEventListenerBar extends UI.TreeOutline.TreeElement {
  /**
   * @param {!SDK.DOMDebuggerModel.EventListener} eventListener
   * @param {!SDK.RemoteObject.RemoteObject} object
   * @param {!Components.Linkifier.Linkifier} linkifier
   * @param {function()} changeCallback
   */
  constructor(eventListener, object, linkifier, changeCallback) {
    super('', true);
    this._eventListener = eventListener;
    this.editable = false;
    this._setTitle(object, linkifier);
    this._changeCallback = changeCallback;
  }

  /**
   * @override
   * @returns {!Promise}
   */
  async onpopulate() {
    const properties = [];
    const eventListener = this._eventListener;
    const runtimeModel = eventListener.domDebuggerModel().runtimeModel();
    properties.push(runtimeModel.createRemotePropertyFromPrimitiveValue('useCapture', eventListener.useCapture()));
    properties.push(runtimeModel.createRemotePropertyFromPrimitiveValue('passive', eventListener.passive()));
    properties.push(runtimeModel.createRemotePropertyFromPrimitiveValue('once', eventListener.once()));
    if (typeof eventListener.handler() !== 'undefined') {
      properties.push(new SDK.RemoteObject.RemoteObjectProperty('handler', eventListener.handler()));
    }
    ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement.populateWithProperties(this, properties, [], true, null);
  }

  /**
   * @param {!SDK.RemoteObject.RemoteObject} object
   * @param {!Components.Linkifier.Linkifier} linkifier
   */
  _setTitle(object, linkifier) {
    const title = this.listItemElement.createChild('span', 'event-listener-details');
    const subtitle = this.listItemElement.createChild('span', 'event-listener-tree-subtitle');
    const linkElement = linkifier.linkifyRawLocation(this._eventListener.location(), this._eventListener.sourceURL());
    subtitle.appendChild(linkElement);

    const propertyValue = ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.createPropertyValue(
        object, /* wasThrown */ false, /* showPreview */ false);
    this._valueTitle = propertyValue.element;
    title.appendChild(this._valueTitle);

    if (this._eventListener.canRemove()) {
      const deleteButton = title.createChild('span', 'event-listener-button');
      deleteButton.textContent = Common.UIString.UIString('Remove');
      deleteButton.title = Common.UIString.UIString('Delete event listener');
      deleteButton.addEventListener('click', event => {
        this._removeListener();
        event.consume();
      }, false);
      title.appendChild(deleteButton);
    }

    if (this._eventListener.isScrollBlockingType() && this._eventListener.canTogglePassive()) {
      const passiveButton = title.createChild('span', 'event-listener-button');
      passiveButton.textContent = Common.UIString.UIString('Toggle Passive');
      passiveButton.title = Common.UIString.UIString('Toggle whether event listener is passive or blocking');
      passiveButton.addEventListener('click', event => {
        this._togglePassiveListener();
        event.consume();
      }, false);
      title.appendChild(passiveButton);
    }

    this.listItemElement.addEventListener('contextmenu', event => {
      const menu = new UI.ContextMenu.ContextMenu(event);
      if (event.target !== linkElement) {
        menu.appendApplicableItems(linkElement);
      }
      if (object.subtype === 'node') {
        menu.defaultSection().appendItem(ls`Reveal in Elements panel`, () => Common.Revealer.reveal(object));
      }
      menu.defaultSection().appendItem(
          ls`Delete event listener`, this._removeListener.bind(this), !this._eventListener.canRemove());
      menu.defaultSection().appendCheckboxItem(
          ls`Passive`, this._togglePassiveListener.bind(this), this._eventListener.passive(),
          !this._eventListener.canTogglePassive());
      menu.show();
    });
  }

  _removeListener() {
    this._removeListenerBar();
    this._eventListener.remove();
  }

  _togglePassiveListener() {
    this._eventListener.togglePassive().then(this._changeCallback());
  }

  _removeListenerBar() {
    const parent = this.parent;
    parent.removeChild(this);
    if (!parent.childCount()) {
      parent.collapse();
    }
    let allHidden = true;
    for (let i = 0; i < parent.childCount(); ++i) {
      if (!parent.childAt(i).hidden) {
        allHidden = false;
      }
    }
    parent.hidden = allHidden;
  }

  /**
   * @return {!SDK.DOMDebuggerModel.EventListener}
   */
  eventListener() {
    return this._eventListener;
  }

  /**
   * @override
   */
  onenter() {
    if (this._valueTitle) {
      this._valueTitle.click();
      return true;
    }

    return false;
  }
}
