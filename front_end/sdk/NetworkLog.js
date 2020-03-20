/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../common/common.js';

import {ConsoleMessage, ConsoleModel, MessageLevel, MessageSource} from './ConsoleModel.js';
import {Events as NetworkManagerEvents, Message, NetworkManager} from './NetworkManager.js';  // eslint-disable-line no-unused-vars
import {Events as NetworkRequestEvents, InitiatorType, NetworkRequest} from './NetworkRequest.js';  // eslint-disable-line no-unused-vars
import {Events as ResourceTreeModelEvents, ResourceTreeFrame, ResourceTreeModel} from './ResourceTreeModel.js';  // eslint-disable-line no-unused-vars
import {RuntimeModel} from './RuntimeModel.js';
import {SDKModelObserver, TargetManager} from './SDKModel.js';  // eslint-disable-line no-unused-vars

/**
 * @implements {SDKModelObserver<!NetworkManager>}
 */
export class NetworkLog extends Common.ObjectWrapper.ObjectWrapper {
  constructor() {
    super();
    /** @type {!Array<!NetworkRequest>} */
    this._requests = [];
    /** @type {!Set<!NetworkRequest>} */
    this._requestsSet = new Set();
    /** @type {!Map<!NetworkManager, !PageLoad>} */
    this._pageLoadForManager = new Map();
    this._isRecording = true;
    TargetManager.instance().observeModels(NetworkManager, this);
  }

  /**
   * @override
   * @param {!NetworkManager} networkManager
   */
  modelAdded(networkManager) {
    const eventListeners = [];
    eventListeners.push(
        networkManager.addEventListener(NetworkManagerEvents.RequestStarted, this._onRequestStarted, this));
    eventListeners.push(
        networkManager.addEventListener(NetworkManagerEvents.RequestUpdated, this._onRequestUpdated, this));
    eventListeners.push(
        networkManager.addEventListener(NetworkManagerEvents.RequestRedirected, this._onRequestRedirect, this));
    eventListeners.push(
        networkManager.addEventListener(NetworkManagerEvents.RequestFinished, this._onRequestUpdated, this));
    eventListeners.push(networkManager.addEventListener(
        NetworkManagerEvents.MessageGenerated, this._networkMessageGenerated.bind(this, networkManager)));

    const resourceTreeModel = networkManager.target().model(ResourceTreeModel);
    if (resourceTreeModel) {
      eventListeners.push(
          resourceTreeModel.addEventListener(ResourceTreeModelEvents.WillReloadPage, this._willReloadPage, this));
      eventListeners.push(resourceTreeModel.addEventListener(
          ResourceTreeModelEvents.MainFrameNavigated, this._onMainFrameNavigated, this));
      eventListeners.push(resourceTreeModel.addEventListener(ResourceTreeModelEvents.Load, this._onLoad, this));
      eventListeners.push(resourceTreeModel.addEventListener(
          ResourceTreeModelEvents.DOMContentLoaded, this._onDOMContentLoaded.bind(this, resourceTreeModel)));
    }

    networkManager[_events] = eventListeners;
  }

  /**
   * @override
   * @param {!NetworkManager} networkManager
   */
  modelRemoved(networkManager) {
    this._removeNetworkManagerListeners(networkManager);
  }

  /**
   * @param {!NetworkManager} networkManager
   */
  _removeNetworkManagerListeners(networkManager) {
    Common.EventTarget.EventTarget.removeEventListeners(networkManager[_events]);
  }

  /**
   * @param {boolean} enabled
   */
  setIsRecording(enabled) {
    if (this._isRecording === enabled) {
      return;
    }
    this._isRecording = enabled;
    if (enabled) {
      TargetManager.instance().observeModels(NetworkManager, this);
    } else {
      TargetManager.instance().unobserveModels(NetworkManager, this);
      TargetManager.instance().models(NetworkManager).forEach(this._removeNetworkManagerListeners.bind(this));
    }
  }

  /**
   * @param {string} url
   * @return {?NetworkRequest}
   */
  requestForURL(url) {
    return this._requests.find(request => request.url() === url) || null;
  }

  /**
   * @return {!Array<!NetworkRequest>}
   */
  requests() {
    return this._requests;
  }

  /**
   * @param {!NetworkManager} networkManager
   * @param {!Protocol.Network.RequestId} requestId
   * @return {?NetworkRequest}
   */
  requestByManagerAndId(networkManager, requestId) {
    // We itterate backwards because the last item will likely be the one needed for console network request lookups.
    for (let i = this._requests.length - 1; i >= 0; i--) {
      const request = this._requests[i];
      if (requestId === request.requestId() && networkManager === NetworkManager.forRequest(request)) {
        return request;
      }
    }
    return null;
  }

  /**
   * @param {!NetworkManager} networkManager
   * @param {string} url
   * @return {?NetworkRequest}
   */
  _requestByManagerAndURL(networkManager, url) {
    for (const request of this._requests) {
      if (url === request.url() && networkManager === NetworkManager.forRequest(request)) {
        return request;
      }
    }
    return null;
  }

  /**
   * @param {!NetworkRequest} request
   */
  _initializeInitiatorSymbolIfNeeded(request) {
    if (!request[_initiatorDataSymbol]) {
      /** @type {!{info: ?_InitiatorInfo, chain: !Set<!NetworkRequest>, request: (?NetworkRequest|undefined)}} */
      request[_initiatorDataSymbol] = {
        info: null,
        chain: null,
        request: undefined,
      };
    }
  }

  /**
   * @param {!NetworkRequest} request
   * @return {!_InitiatorInfo}
   */
  initiatorInfoForRequest(request) {
    this._initializeInitiatorSymbolIfNeeded(request);
    if (request[_initiatorDataSymbol].info) {
      return request[_initiatorDataSymbol].info;
    }

    let type = InitiatorType.Other;
    let url = '';
    let lineNumber = -Infinity;
    let columnNumber = -Infinity;
    let scriptId = null;
    let initiatorStack = null;
    const initiator = request.initiator();

    const redirectSource = request.redirectSource();
    if (redirectSource) {
      type = InitiatorType.Redirect;
      url = redirectSource.url();
    } else if (initiator) {
      if (initiator.type === Protocol.Network.InitiatorType.Parser) {
        type = InitiatorType.Parser;
        url = initiator.url ? initiator.url : url;
        lineNumber = initiator.lineNumber ? initiator.lineNumber : lineNumber;
      } else if (initiator.type === Protocol.Network.InitiatorType.Script) {
        for (let stack = initiator.stack; stack; stack = stack.parent) {
          const topFrame = stack.callFrames.length ? stack.callFrames[0] : null;
          if (!topFrame) {
            continue;
          }
          type = InitiatorType.Script;
          url = topFrame.url || Common.UIString.UIString('<anonymous>');
          lineNumber = topFrame.lineNumber;
          columnNumber = topFrame.columnNumber;
          scriptId = topFrame.scriptId;
          break;
        }
        if (!initiator.stack && initiator.url) {
          type = InitiatorType.Script;
          url = initiator.url;
          lineNumber = initiator.lineNumber || 0;
        }
        if (initiator.stack && initiator.stack.callFrames && initiator.stack.callFrames.length) {
          initiatorStack = initiator.stack || null;
        }
      } else if (initiator.type === Protocol.Network.InitiatorType.Preload) {
        type = InitiatorType.Preload;
      } else if (initiator.type === Protocol.Network.InitiatorType.SignedExchange) {
        type = InitiatorType.SignedExchange;
        url = initiator.url;
      }
    }

    request[_initiatorDataSymbol].info = {
      type: type,
      url: url,
      lineNumber: lineNumber,
      columnNumber: columnNumber,
      scriptId: scriptId,
      stack: initiatorStack
    };
    return request[_initiatorDataSymbol].info;
  }

  /**
   * @param {!NetworkRequest} request
   * @return {!InitiatorGraph}
   */
  initiatorGraphForRequest(request) {
    /** @type {!Map<!NetworkRequest>} */
    const initiated = new Map();
    const networkManager = NetworkManager.forRequest(request);
    for (const otherRequest of this._requests) {
      const otherRequestManager = NetworkManager.forRequest(otherRequest);
      if (networkManager === otherRequestManager && this._initiatorChain(otherRequest).has(request)) {
        // save parent request of otherRequst in order to build the initiator chain table later
        initiated.set(otherRequest, this._initiatorRequest(otherRequest));
      }
    }
    return {initiators: this._initiatorChain(request), initiated: initiated};
  }

  /**
   * @param {!NetworkRequest} request
   * @return {!Set<!NetworkRequest>}
   */
  _initiatorChain(request) {
    this._initializeInitiatorSymbolIfNeeded(request);
    let initiatorChainCache =
        /** @type {?Set<!NetworkRequest>} */ (request[_initiatorDataSymbol].chain);
    if (initiatorChainCache) {
      return initiatorChainCache;
    }

    initiatorChainCache = new Set();

    let checkRequest = request;
    do {
      this._initializeInitiatorSymbolIfNeeded(checkRequest);
      if (checkRequest[_initiatorDataSymbol].chain) {
        initiatorChainCache.addAll(checkRequest[_initiatorDataSymbol].chain);
        break;
      }
      if (initiatorChainCache.has(checkRequest)) {
        break;
      }
      initiatorChainCache.add(checkRequest);
      checkRequest = this._initiatorRequest(checkRequest);
    } while (checkRequest);
    request[_initiatorDataSymbol].chain = initiatorChainCache;
    return initiatorChainCache;
  }

  /**
   * @param {!NetworkRequest} request
   * @return {?NetworkRequest}
   */
  _initiatorRequest(request) {
    this._initializeInitiatorSymbolIfNeeded(request);
    if (request[_initiatorDataSymbol].request !== undefined) {
      return request[_initiatorDataSymbol].request;
    }
    const url = this.initiatorInfoForRequest(request).url;
    const networkManager = NetworkManager.forRequest(request);
    request[_initiatorDataSymbol].request = networkManager ? this._requestByManagerAndURL(networkManager, url) : null;
    return request[_initiatorDataSymbol].request;
  }

  _willReloadPage() {
    if (!Common.Settings.Settings.instance().moduleSetting('network_log.preserve-log').get()) {
      this.reset();
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onMainFrameNavigated(event) {
    const mainFrame = /** @type {!ResourceTreeFrame} */ (event.data);
    const manager = mainFrame.resourceTreeModel().target().model(NetworkManager);
    if (!manager || mainFrame.resourceTreeModel().target().parentTarget()) {
      return;
    }

    const oldRequests = this._requests;
    const oldManagerRequests = this._requests.filter(request => NetworkManager.forRequest(request) === manager);
    const oldRequestsSet = this._requestsSet;
    this._requests = [];
    this._requestsSet = new Set();
    this.dispatchEventToListeners(Events.Reset);

    // Preserve requests from the new session.
    let currentPageLoad = null;
    const requestsToAdd = [];
    for (const request of oldManagerRequests) {
      if (request.loaderId !== mainFrame.loaderId) {
        continue;
      }
      if (!currentPageLoad) {
        currentPageLoad = new PageLoad(request);
        let redirectSource = request.redirectSource();
        while (redirectSource) {
          requestsToAdd.push(redirectSource);
          redirectSource = redirectSource.redirectSource();
        }
      }
      requestsToAdd.push(request);
    }

    // Preserve service worker requests from the new session.
    const serviceWorkerRequestsToAdd = [];
    for (const swRequest of oldRequests) {
      if (!swRequest.initiatedByServiceWorker()) {
        continue;
      }

      // If there is a matching request that came before this one, keep it.
      const keepRequest = requestsToAdd.some(
          request => request.url() === swRequest.url() && request.issueTime() <= swRequest.issueTime());
      if (keepRequest) {
        serviceWorkerRequestsToAdd.push(swRequest);
      }
    }
    requestsToAdd.push(...serviceWorkerRequestsToAdd);

    for (const request of requestsToAdd) {
      oldRequestsSet.delete(request);
      this._requests.push(request);
      this._requestsSet.add(request);
      currentPageLoad.bindRequest(request);
      this.dispatchEventToListeners(Events.RequestAdded, request);
    }

    if (Common.Settings.Settings.instance().moduleSetting('network_log.preserve-log').get()) {
      for (const request of oldRequestsSet) {
        this._requests.push(request);
        this._requestsSet.add(request);
        this.dispatchEventToListeners(Events.RequestAdded, request);
      }
    }

    if (currentPageLoad) {
      this._pageLoadForManager.set(manager, currentPageLoad);
    }
  }

  /**
   * @param {!Array<!NetworkRequest>} requests
   */
  importRequests(requests) {
    this.reset();
    this._requests = [];
    this._requestsSet.clear();
    for (const request of requests) {
      this._requests.push(request);
      this._requestsSet.add(request);
      this.dispatchEventToListeners(Events.RequestAdded, request);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onRequestStarted(event) {
    const request = /** @type {!NetworkRequest} */ (event.data);
    this._requests.push(request);
    this._requestsSet.add(request);
    const manager = NetworkManager.forRequest(request);
    const pageLoad = manager ? this._pageLoadForManager.get(manager) : null;
    if (pageLoad) {
      pageLoad.bindRequest(request);
    }
    this.dispatchEventToListeners(Events.RequestAdded, request);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onRequestUpdated(event) {
    const request = /** @type {!NetworkRequest} */ (event.data);
    if (!this._requestsSet.has(request)) {
      return;
    }
    this.dispatchEventToListeners(Events.RequestUpdated, request);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onRequestRedirect(event) {
    const request = /** @type {!NetworkRequest} */ (event.data);
    delete request[_initiatorDataSymbol];
  }

  /**
   * @param {!ResourceTreeModel} resourceTreeModel
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onDOMContentLoaded(resourceTreeModel, event) {
    const networkManager = resourceTreeModel.target().model(NetworkManager);
    const pageLoad = networkManager ? this._pageLoadForManager.get(networkManager) : null;
    if (pageLoad) {
      pageLoad.contentLoadTime = /** @type {number} */ (event.data);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onLoad(event) {
    const networkManager = event.data.resourceTreeModel.target().model(NetworkManager);
    const pageLoad = networkManager ? this._pageLoadForManager.get(networkManager) : null;
    if (pageLoad) {
      pageLoad.loadTime = /** @type {number} */ (event.data.loadTime);
    }
  }

  reset() {
    this._requests = [];
    this._requestsSet.clear();
    const managers = new Set(TargetManager.instance().models(NetworkManager));
    for (const manager of this._pageLoadForManager.keys()) {
      if (!managers.has(manager)) {
        this._pageLoadForManager.delete(manager);
      }
    }

    this.dispatchEventToListeners(Events.Reset);
  }

  /**
   * @param {!NetworkManager} networkManager
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _networkMessageGenerated(networkManager, event) {
    const message = /** @type {!Message} */ (event.data);
    const consoleMessage = new ConsoleMessage(
        networkManager.target().model(RuntimeModel), MessageSource.Network,
        message.warning ? MessageLevel.Warning : MessageLevel.Info, message.message);
    this.associateConsoleMessageWithRequest(consoleMessage, message.requestId);
    ConsoleModel.instance().addMessage(consoleMessage);
  }

  /**
   * @param {!ConsoleMessage} consoleMessage
   * @param {!Protocol.Network.RequestId} requestId
   */
  associateConsoleMessageWithRequest(consoleMessage, requestId) {
    const target = consoleMessage.target();
    const networkManager = target ? target.model(NetworkManager) : null;
    if (!networkManager) {
      return;
    }
    const request = this.requestByManagerAndId(networkManager, requestId);
    if (!request) {
      return;
    }
    consoleMessage[_requestSymbol] = request;
    const initiator = request.initiator();
    if (initiator) {
      consoleMessage.stackTrace = initiator.stack || undefined;
      if (initiator.url) {
        consoleMessage.url = initiator.url;
        consoleMessage.line = initiator.lineNumber || 0;
      }
    }
  }

  /**
   * @param {!ConsoleMessage} consoleMessage
   * @return {?NetworkRequest}
   */
  static requestForConsoleMessage(consoleMessage) {
    return consoleMessage[_requestSymbol] || null;
  }
}

export class PageLoad {
  /**
   * @param {!NetworkRequest} mainRequest
   */
  constructor(mainRequest) {
    this.id = ++PageLoad._lastIdentifier;
    this.url = mainRequest.url();
    this.startTime = mainRequest.startTime;
    /** @type {number} */
    this.loadTime;
    /** @type {number} */
    this.contentLoadTime;
    this.mainRequest = mainRequest;

    this._showDataSaverWarningIfNeeded();
  }

  async _showDataSaverWarningIfNeeded() {
    const manager = NetworkManager.forRequest(this.mainRequest);
    if (!manager) {
      return;
    }
    if (!this.mainRequest.finished) {
      await this.mainRequest.once(NetworkRequestEvents.FinishedLoading);
    }
    const saveDataHeader = this.mainRequest.requestHeaderValue('Save-Data');
    if (!PageLoad._dataSaverMessageWasShown && saveDataHeader && saveDataHeader === 'on') {
      const message = Common.UIString.UIString(
          'Consider disabling %s while debugging. For more info see: %s', Common.UIString.UIString('Chrome Data Saver'),
          'https://support.google.com/chrome/?p=datasaver');
      manager.dispatchEventToListeners(
          NetworkManagerEvents.MessageGenerated,
          {message: message, requestId: this.mainRequest.requestId(), warning: true});
      PageLoad._dataSaverMessageWasShown = true;
    }
  }

  /**
   * @param {!NetworkRequest} request
   * @return {?PageLoad}
   */
  static forRequest(request) {
    return request[PageLoad._pageLoadForRequestSymbol] || null;
  }

  /**
   * @param {!NetworkRequest} request
   */
  bindRequest(request) {
    request[PageLoad._pageLoadForRequestSymbol] = this;
  }
}

PageLoad._lastIdentifier = 0;
PageLoad._pageLoadForRequestSymbol = Symbol('PageLoadForRequest');
PageLoad._dataSaverMessageWasShown = false;

const _requestSymbol = Symbol('_request');

export const Events = {
  Reset: Symbol('Reset'),
  RequestAdded: Symbol('RequestAdded'),
  RequestUpdated: Symbol('RequestUpdated')
};

const _initiatorDataSymbol = Symbol('InitiatorData');
const _events = Symbol('SDK.NetworkLog.events');

/** @typedef {!{initiators: !Set<!NetworkRequest>, initiated: !Map<!NetworkRequest, !NetworkRequest>}} */
export let InitiatorGraph;

/** @typedef {!{type: !InitiatorType, url: string, lineNumber: number, columnNumber: number, scriptId: ?string, stack: ?Protocol.Runtime.StackTrace}} */
export let _InitiatorInfo;
