// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import {ls} from '../common/common.js';   // eslint-disable-line rulesdir/es_modules_import
import * as Host from '../host/host.js';  // eslint-disable-line no-unused-vars

import {MultitargetNetworkManager} from './NetworkManager.js';
import {Events as ResourceTreeModelEvents, ResourceTreeFrame, ResourceTreeModel} from './ResourceTreeModel.js';  // eslint-disable-line no-unused-vars
import {Target, TargetManager} from './SDKModel.js';  // eslint-disable-line no-unused-vars


/** @typedef {{target: null, frameId: Protocol.Page.FrameId, initiatorUrl: ?string}|{target: Target, frameId: ?Protocol.Page.FrameId, initiatorUrl: ?string}} */
// @ts-ignore typedef
export let PageResourceLoadInitiator;  // eslint-disable-line no-unused-vars

/** @typedef {{success: ?boolean, errorMessage: (undefined|string), initiator: !PageResourceLoadInitiator, url: string, size: ?number}} */
// @ts-ignore typedef
export let PageResource;  // eslint-disable-line no-unused-vars

/** @type {?PageResourceLoader} */
let pageResourceLoader = null;

/**
 * The page resource loader is a bottleneck for all DevTools-initiated resource loads. For each such load, it keeps a
 * `PageResource` object around that holds meta information. This can be as the basis for reporting to the user which
 * resources were loaded, and whether there was a load error.
 */
export class PageResourceLoader extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {null|function(string):!Promise<!{success: boolean, content: string, errorDescription: !Host.ResourceLoader.LoadErrorDescription}>} loadOverride
   * @param {number} maxConcurrentLoads - Maximal number of concurrently dispatched loads. If this limit is reached, additional loads are queued up.
   * @param {number} loadTimeout - Timeout for the back-end of this loader. If the timeout is reached, the load promise is rejected and the result from the back-end gets discarded.
   */
  constructor(loadOverride, maxConcurrentLoads, loadTimeout) {
    super();
    this._currentlyLoading = 0;
    this._maxConcurrentLoads = maxConcurrentLoads;
    /** @type{!Map<string, !PageResource>} */
    this._pageResources = new Map();
    /** @type {!Array<!{resolve:function(*):void, reject:function(*):void}>} */
    this._queuedLoads = [];
    TargetManager.instance().addModelListener(
        ResourceTreeModel, ResourceTreeModelEvents.MainFrameNavigated, this._onMainFrameNavigated, this);
    this._loadOverride = loadOverride;
    this._loadTimeout = loadTimeout;
  }

  /**
   * @param {{forceNew: boolean, loadOverride:(null|function(string):!Promise<!{success: boolean, content: string, errorDescription: !Host.ResourceLoader.LoadErrorDescription}>), maxConcurrentLoads: number, loadTimeout: number}} _
   */
  static instance({forceNew, loadOverride, maxConcurrentLoads, loadTimeout} = {
    forceNew: false,
    loadOverride: null,
    maxConcurrentLoads: 500,
    loadTimeout: 30000
  }) {
    if (!pageResourceLoader || forceNew) {
      pageResourceLoader = new PageResourceLoader(loadOverride, maxConcurrentLoads, loadTimeout);
    }

    return pageResourceLoader;
  }

  /**
   *
   * @param {*} event
   */
  _onMainFrameNavigated(event) {
    const mainFrame = /** @type {!ResourceTreeFrame} */ (event.data);
    if (!mainFrame.isTopFrame()) {
      return;
    }
    for (const {reject} of this._queuedLoads) {
      reject(new Error(ls`Load canceled due to reload of inspected page`));
    }
    this._queuedLoads = [];
    this._pageResources.clear();
    this.dispatchEventToListeners(Events.Update);
  }

  getResourcesLoaded() {
    return this._pageResources;
  }

  /**
   * Loading is the number of currently loading and queued items. Resources is the total number of resources,
   * including loading and queued resources, but not including resources that are still loading but scheduled
   * for cancelation.
   * @returns {!{loading: number, queued: number, resources: number}};
   */
  getNumberOfResources() {
    return {loading: this._currentlyLoading, queued: this._queuedLoads.length, resources: this._pageResources.size};
  }

  async _acquireLoadSlot() {
    this._currentlyLoading++;
    if (this._currentlyLoading > this._maxConcurrentLoads) {
      /** @type {!{resolve:function(*):void, reject:function(*):void}} */
      const pair = {resolve: () => {}, reject: () => {}};
      const waitForCapacity = new Promise((resolve, reject) => {
        pair.resolve = resolve;
        pair.reject = reject;
      });
      this._queuedLoads.push(pair);
      await waitForCapacity;
    }
  }

  _releaseLoadSlot() {
    this._currentlyLoading--;
    const entry = this._queuedLoads.shift();
    if (entry) {
      entry.resolve(undefined);
    }
  }

  /**
   * @template T
   * @param {!Promise<T>} promise
   * @param {number} timeout
   */
  static async _withTimeout(promise, timeout) {
    /** @type {!Promise<T>} */
    const timeoutPromise =
        new Promise((_, reject) => setTimeout(reject, timeout, new Error(ls`Load canceled due to load timeout`)));
    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * @param {string} url
   * @param {!PageResourceLoadInitiator} initiator
   * @returns {string}
   */
  static makeKey(url, initiator) {
    if (initiator.frameId) {
      return `${url}-${initiator.frameId}`;
    }
    if (initiator.target) {
      return `${url}-${initiator.target.id()}`;
    }
    throw new Error('Invalid initiator');
  }

  /**
   * @param {string} url
   * @param {!PageResourceLoadInitiator} initiator
   * @return {!Promise<!{content: string}>}
   */
  async loadResource(url, initiator) {
    const key = PageResourceLoader.makeKey(url, initiator);
    /** @type {!PageResource} */
    const pageResource = {success: null, size: null, errorMessage: undefined, url, initiator};
    this._pageResources.set(key, pageResource);
    this.dispatchEventToListeners(Events.Update);
    try {
      await this._acquireLoadSlot();
      const resultPromise =
          this._loadOverride ? this._loadOverride(url) : MultitargetNetworkManager.instance().loadResource(url);
      const result = await PageResourceLoader._withTimeout(resultPromise, this._loadTimeout);
      pageResource.errorMessage = result.errorDescription.message;
      pageResource.success = result.success;
      if (result.success) {
        pageResource.size = result.content.length;
        return {content: result.content};
      }
      throw new Error(result.errorDescription.message);
    } catch (e) {
      if (pageResource.errorMessage === undefined) {
        pageResource.errorMessage = e.message;
      }
      if (pageResource.success === null) {
        pageResource.success = false;
      }
      throw e;
    } finally {
      this._releaseLoadSlot();
      this.dispatchEventToListeners(Events.Update);
    }
  }
}

/** @enum {symbol} */
export const Events = {
  Update: Symbol('Update')
};
