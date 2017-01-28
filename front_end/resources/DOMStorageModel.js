/*
 * Copyright (C) 2008 Nokia Inc.  All rights reserved.
 * Copyright (C) 2013 Samsung Electronics. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
Resources.DOMStorage = class extends Common.Object {
  /**
   * @param {!Resources.DOMStorageModel} model
   * @param {string} securityOrigin
   * @param {boolean} isLocalStorage
   */
  constructor(model, securityOrigin, isLocalStorage) {
    super();
    this._model = model;
    this._securityOrigin = securityOrigin;
    this._isLocalStorage = isLocalStorage;
  }

  /**
   * @param {string} securityOrigin
   * @param {boolean} isLocalStorage
   * @return {!Protocol.DOMStorage.StorageId}
   */
  static storageId(securityOrigin, isLocalStorage) {
    return {securityOrigin: securityOrigin, isLocalStorage: isLocalStorage};
  }

  /** @return {!Protocol.DOMStorage.StorageId} */
  get id() {
    return Resources.DOMStorage.storageId(this._securityOrigin, this._isLocalStorage);
  }

  /** @return {string} */
  get securityOrigin() {
    return this._securityOrigin;
  }

  /** @return {boolean} */
  get isLocalStorage() {
    return this._isLocalStorage;
  }

  /**
   * @param {function(?Protocol.Error, !Array.<!Protocol.DOMStorage.Item>):void=} callback
   */
  getItems(callback) {
    this._model._agent.getDOMStorageItems(this.id, callback);
  }

  /**
   * @param {string} key
   * @param {string} value
   */
  setItem(key, value) {
    this._model._agent.setDOMStorageItem(this.id, key, value);
  }

  /**
   * @param {string} key
   */
  removeItem(key) {
    this._model._agent.removeDOMStorageItem(this.id, key);
  }

  clear() {
    this._model._agent.clear(this.id);
  }
};


/** @enum {symbol} */
Resources.DOMStorage.Events = {
  DOMStorageItemsCleared: Symbol('DOMStorageItemsCleared'),
  DOMStorageItemRemoved: Symbol('DOMStorageItemRemoved'),
  DOMStorageItemAdded: Symbol('DOMStorageItemAdded'),
  DOMStorageItemUpdated: Symbol('DOMStorageItemUpdated')
};

/**
 * @unrestricted
 */
Resources.DOMStorageModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);

    this._securityOriginManager = SDK.SecurityOriginManager.fromTarget(target);
    /** @type {!Object.<string, !Resources.DOMStorage>} */
    this._storages = {};
    this._agent = target.domstorageAgent();
  }

  /**
   * @param {!SDK.Target} target
   * @return {!Resources.DOMStorageModel}
   */
  static fromTarget(target) {
    return /** @type {!Resources.DOMStorageModel} */ (target.model(Resources.DOMStorageModel));
  }

  enable() {
    if (this._enabled)
      return;

    this.target().registerDOMStorageDispatcher(new Resources.DOMStorageDispatcher(this));
    this._securityOriginManager.addEventListener(
        SDK.SecurityOriginManager.Events.SecurityOriginAdded, this._securityOriginAdded, this);
    this._securityOriginManager.addEventListener(
        SDK.SecurityOriginManager.Events.SecurityOriginRemoved, this._securityOriginRemoved, this);

    for (var securityOrigin of this._securityOriginManager.securityOrigins())
      this._addOrigin(securityOrigin);
    this._agent.enable();

    this._enabled = true;
  }

  /**
   * @param {string} origin
   */
  clearForOrigin(origin) {
    if (!this._enabled)
      return;
    this._removeOrigin(origin);
    this._addOrigin(origin);
  }

  /**
   * @param {!Common.Event} event
   */
  _securityOriginAdded(event) {
    this._addOrigin(/** @type {string} */ (event.data));
  }

  /**
   * @param {string} securityOrigin
   */
  _addOrigin(securityOrigin) {
    var localStorageKey = this._storageKey(securityOrigin, true);
    console.assert(!this._storages[localStorageKey]);
    var localStorage = new Resources.DOMStorage(this, securityOrigin, true);
    this._storages[localStorageKey] = localStorage;
    this.dispatchEventToListeners(Resources.DOMStorageModel.Events.DOMStorageAdded, localStorage);

    var sessionStorageKey = this._storageKey(securityOrigin, false);
    console.assert(!this._storages[sessionStorageKey]);
    var sessionStorage = new Resources.DOMStorage(this, securityOrigin, false);
    this._storages[sessionStorageKey] = sessionStorage;
    this.dispatchEventToListeners(Resources.DOMStorageModel.Events.DOMStorageAdded, sessionStorage);
  }

  /**
   * @param {!Common.Event} event
   */
  _securityOriginRemoved(event) {
    this._removeOrigin(/** @type {string} */ (event.data));
  }

  /**
   * @param {string} securityOrigin
   */
  _removeOrigin(securityOrigin) {
    var localStorageKey = this._storageKey(securityOrigin, true);
    var localStorage = this._storages[localStorageKey];
    console.assert(localStorage);
    delete this._storages[localStorageKey];
    this.dispatchEventToListeners(Resources.DOMStorageModel.Events.DOMStorageRemoved, localStorage);

    var sessionStorageKey = this._storageKey(securityOrigin, false);
    var sessionStorage = this._storages[sessionStorageKey];
    console.assert(sessionStorage);
    delete this._storages[sessionStorageKey];
    this.dispatchEventToListeners(Resources.DOMStorageModel.Events.DOMStorageRemoved, sessionStorage);
  }

  /**
   * @param {string} securityOrigin
   * @param {boolean} isLocalStorage
   * @return {string}
   */
  _storageKey(securityOrigin, isLocalStorage) {
    return JSON.stringify(Resources.DOMStorage.storageId(securityOrigin, isLocalStorage));
  }

  /**
   * @param {!Protocol.DOMStorage.StorageId} storageId
   */
  _domStorageItemsCleared(storageId) {
    var domStorage = this.storageForId(storageId);
    if (!domStorage)
      return;

    var eventData = {};
    domStorage.dispatchEventToListeners(Resources.DOMStorage.Events.DOMStorageItemsCleared, eventData);
  }

  /**
   * @param {!Protocol.DOMStorage.StorageId} storageId
   * @param {string} key
   */
  _domStorageItemRemoved(storageId, key) {
    var domStorage = this.storageForId(storageId);
    if (!domStorage)
      return;

    var eventData = {key: key};
    domStorage.dispatchEventToListeners(Resources.DOMStorage.Events.DOMStorageItemRemoved, eventData);
  }

  /**
   * @param {!Protocol.DOMStorage.StorageId} storageId
   * @param {string} key
   * @param {string} value
   */
  _domStorageItemAdded(storageId, key, value) {
    var domStorage = this.storageForId(storageId);
    if (!domStorage)
      return;

    var eventData = {key: key, value: value};
    domStorage.dispatchEventToListeners(Resources.DOMStorage.Events.DOMStorageItemAdded, eventData);
  }

  /**
   * @param {!Protocol.DOMStorage.StorageId} storageId
   * @param {string} key
   * @param {string} oldValue
   * @param {string} value
   */
  _domStorageItemUpdated(storageId, key, oldValue, value) {
    var domStorage = this.storageForId(storageId);
    if (!domStorage)
      return;

    var eventData = {key: key, oldValue: oldValue, value: value};
    domStorage.dispatchEventToListeners(Resources.DOMStorage.Events.DOMStorageItemUpdated, eventData);
  }

  /**
   * @param {!Protocol.DOMStorage.StorageId} storageId
   * @return {!Resources.DOMStorage}
   */
  storageForId(storageId) {
    return this._storages[JSON.stringify(storageId)];
  }

  /**
   * @return {!Array.<!Resources.DOMStorage>}
   */
  storages() {
    var result = [];
    for (var id in this._storages)
      result.push(this._storages[id]);
    return result;
  }
};

SDK.SDKModel.register(Resources.DOMStorageModel, SDK.Target.Capability.None);

/** @enum {symbol} */
Resources.DOMStorageModel.Events = {
  DOMStorageAdded: Symbol('DOMStorageAdded'),
  DOMStorageRemoved: Symbol('DOMStorageRemoved')
};

/**
 * @implements {Protocol.DOMStorageDispatcher}
 * @unrestricted
 */
Resources.DOMStorageDispatcher = class {
  /**
   * @param {!Resources.DOMStorageModel} model
   */
  constructor(model) {
    this._model = model;
  }

  /**
   * @override
   * @param {!Protocol.DOMStorage.StorageId} storageId
   */
  domStorageItemsCleared(storageId) {
    this._model._domStorageItemsCleared(storageId);
  }

  /**
   * @override
   * @param {!Protocol.DOMStorage.StorageId} storageId
   * @param {string} key
   */
  domStorageItemRemoved(storageId, key) {
    this._model._domStorageItemRemoved(storageId, key);
  }

  /**
   * @override
   * @param {!Protocol.DOMStorage.StorageId} storageId
   * @param {string} key
   * @param {string} value
   */
  domStorageItemAdded(storageId, key, value) {
    this._model._domStorageItemAdded(storageId, key, value);
  }

  /**
   * @override
   * @param {!Protocol.DOMStorage.StorageId} storageId
   * @param {string} key
   * @param {string} oldValue
   * @param {string} value
   */
  domStorageItemUpdated(storageId, key, oldValue, value) {
    this._model._domStorageItemUpdated(storageId, key, oldValue, value);
  }
};

Resources.DOMStorageModel._symbol = Symbol('DomStorage');
