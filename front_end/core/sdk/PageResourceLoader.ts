// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as i18n from '../i18n/i18n.js';
import type * as Platform from '../platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';

import {FrameManager} from './FrameManager.js';
import {IOModel} from './IOModel.js';
import {MultitargetNetworkManager} from './NetworkManager.js';
import {NetworkManager} from './NetworkManager.js';

import {Events as ResourceTreeModelEvents, ResourceTreeModel, type ResourceTreeFrame} from './ResourceTreeModel.js';
import {type Target} from './Target.js';
import {TargetManager} from './TargetManager.js';

const UIStrings = {
  /**
   *@description Error message for canceled source map loads
   */
  loadCanceledDueToReloadOf: 'Load canceled due to reload of inspected page',
  /**
   *@description Error message for canceled source map loads
   */
  loadCanceledDueToLoadTimeout: 'Load canceled due to load timeout',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/PageResourceLoader.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export type PageResourceLoadInitiator = {
  target: null,
  frameId: Protocol.Page.FrameId,
  initiatorUrl: Platform.DevToolsPath.UrlString|null,
}|{
  target: Target,
  frameId: Protocol.Page.FrameId | null,
  initiatorUrl: Platform.DevToolsPath.UrlString | null,
};

export interface PageResource {
  success: boolean|null;
  errorMessage?: string;
  initiator: PageResourceLoadInitiator;
  url: Platform.DevToolsPath.UrlString;
  size: number|null;
}

let pageResourceLoader: PageResourceLoader|null = null;

interface LoadQueueEntry {
  resolve: () => void;
  reject: (arg0: Error) => void;
}

/**
 * The page resource loader is a bottleneck for all DevTools-initiated resource loads. For each such load, it keeps a
 * `PageResource` object around that holds meta information. This can be as the basis for reporting to the user which
 * resources were loaded, and whether there was a load error.
 */
export class PageResourceLoader extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  #currentlyLoading: number;
  readonly #maxConcurrentLoads: number;
  readonly #pageResources: Map<string, PageResource>;
  #queuedLoads: LoadQueueEntry[];
  readonly #loadOverride: ((arg0: string) => Promise<{
                             success: boolean,
                             content: string,
                             errorDescription: Host.ResourceLoader.LoadErrorDescription,
                           }>)|null;
  readonly #loadTimeout: number;
  constructor(
      loadOverride: ((arg0: string) => Promise<{
                       success: boolean,
                       content: string,
                       errorDescription: Host.ResourceLoader.LoadErrorDescription,
                     }>)|null,
      maxConcurrentLoads: number, loadTimeout: number) {
    super();
    this.#currentlyLoading = 0;
    this.#maxConcurrentLoads = maxConcurrentLoads;
    this.#pageResources = new Map();
    this.#queuedLoads = [];
    TargetManager.instance().addModelListener(
        ResourceTreeModel, ResourceTreeModelEvents.MainFrameNavigated, this.onMainFrameNavigated, this);
    this.#loadOverride = loadOverride;
    this.#loadTimeout = loadTimeout;
  }

  static instance({forceNew, loadOverride, maxConcurrentLoads, loadTimeout}: {
    forceNew: boolean,
    loadOverride: (null|((arg0: string) => Promise<{
                           success: boolean,
                           content: string,
                           errorDescription: Host.ResourceLoader.LoadErrorDescription,
                         }>)),
    maxConcurrentLoads: number,
    loadTimeout: number,
  } = {
    forceNew: false,
    loadOverride: null,
    maxConcurrentLoads: 500,
    loadTimeout: 30000,
  }): PageResourceLoader {
    if (!pageResourceLoader || forceNew) {
      pageResourceLoader = new PageResourceLoader(loadOverride, maxConcurrentLoads, loadTimeout);
    }

    return pageResourceLoader;
  }

  static removeInstance(): void {
    pageResourceLoader = null;
  }

  onMainFrameNavigated(event: Common.EventTarget.EventTargetEvent<ResourceTreeFrame>): void {
    const mainFrame = event.data;
    if (!mainFrame.isTopFrame()) {
      return;
    }
    for (const {reject} of this.#queuedLoads) {
      reject(new Error(i18nString(UIStrings.loadCanceledDueToReloadOf)));
    }
    this.#queuedLoads = [];
    this.#pageResources.clear();
    this.dispatchEventToListeners(Events.Update);
  }

  getResourcesLoaded(): Map<string, PageResource> {
    return this.#pageResources;
  }

  /**
   * Loading is the number of currently loading and queued items. Resources is the total number of resources,
   * including loading and queued resources, but not including resources that are still loading but scheduled
   * for cancelation.;
   */
  getNumberOfResources(): {
    loading: number,
    queued: number,
    resources: number,
  } {
    return {loading: this.#currentlyLoading, queued: this.#queuedLoads.length, resources: this.#pageResources.size};
  }

  private async acquireLoadSlot(): Promise<void> {
    this.#currentlyLoading++;
    if (this.#currentlyLoading > this.#maxConcurrentLoads) {
      const entry: LoadQueueEntry = {resolve: (): void => {}, reject: (): void => {}};
      const waitForCapacity = new Promise<void>((resolve, reject) => {
        entry.resolve = resolve;
        entry.reject = reject;
      });
      this.#queuedLoads.push(entry);
      await waitForCapacity;
    }
  }

  private releaseLoadSlot(): void {
    this.#currentlyLoading--;
    const entry = this.#queuedLoads.shift();
    if (entry) {
      entry.resolve();
    }
  }

  static async withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    const timeoutPromise = new Promise<T>(
        (_, reject) =>
            window.setTimeout(reject, timeout, new Error(i18nString(UIStrings.loadCanceledDueToLoadTimeout))));
    return Promise.race([promise, timeoutPromise]);
  }

  static makeKey(url: Platform.DevToolsPath.UrlString, initiator: PageResourceLoadInitiator): string {
    if (initiator.frameId) {
      return `${url}-${initiator.frameId}`;
    }
    if (initiator.target) {
      return `${url}-${initiator.target.id()}`;
    }
    throw new Error('Invalid initiator');
  }

  async loadResource(url: Platform.DevToolsPath.UrlString, initiator: PageResourceLoadInitiator): Promise<{
    content: string,
  }> {
    const key = PageResourceLoader.makeKey(url, initiator);
    const pageResource: PageResource = {success: null, size: null, errorMessage: undefined, url, initiator};
    this.#pageResources.set(key, pageResource);
    this.dispatchEventToListeners(Events.Update);
    try {
      await this.acquireLoadSlot();
      const resultPromise = this.dispatchLoad(url, initiator);
      const result = await PageResourceLoader.withTimeout(resultPromise, this.#loadTimeout);
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
      this.releaseLoadSlot();
      this.dispatchEventToListeners(Events.Update);
    }
  }

  private async dispatchLoad(url: Platform.DevToolsPath.UrlString, initiator: PageResourceLoadInitiator): Promise<{
    success: boolean,
    content: string,
    errorDescription: Host.ResourceLoader.LoadErrorDescription,
  }> {
    let failureReason: string|null = null;
    if (this.#loadOverride) {
      return this.#loadOverride(url);
    }
    const parsedURL = new Common.ParsedURL.ParsedURL(url);
    const eligibleForLoadFromTarget = getLoadThroughTargetSetting().get() && parsedURL && parsedURL.scheme !== 'file' &&
        parsedURL.scheme !== 'data' && parsedURL.scheme !== 'devtools';
    Host.userMetrics.developerResourceScheme(this.getDeveloperResourceScheme(parsedURL));
    if (eligibleForLoadFromTarget) {
      try {
        if (initiator.target) {
          Host.userMetrics.developerResourceLoaded(Host.UserMetrics.DeveloperResourceLoaded.LoadThroughPageViaTarget);
          const result = await this.loadFromTarget(initiator.target, initiator.frameId, url);
          return result;
        }
        const frame = FrameManager.instance().getFrame(initiator.frameId);
        if (frame) {
          Host.userMetrics.developerResourceLoaded(Host.UserMetrics.DeveloperResourceLoaded.LoadThroughPageViaFrame);
          const result = await this.loadFromTarget(frame.resourceTreeModel().target(), initiator.frameId, url);
          return result;
        }
      } catch (e) {
        if (e instanceof Error) {
          Host.userMetrics.developerResourceLoaded(Host.UserMetrics.DeveloperResourceLoaded.LoadThroughPageFailure);
          failureReason = e.message;
        }
      }
      Host.userMetrics.developerResourceLoaded(Host.UserMetrics.DeveloperResourceLoaded.LoadThroughPageFallback);
      console.warn('Fallback triggered', url, initiator);
    } else {
      const code = getLoadThroughTargetSetting().get() ? Host.UserMetrics.DeveloperResourceLoaded.FallbackPerProtocol :
                                                         Host.UserMetrics.DeveloperResourceLoaded.FallbackPerOverride;
      Host.userMetrics.developerResourceLoaded(code);
    }

    const result = await MultitargetNetworkManager.instance().loadResource(url);
    if (eligibleForLoadFromTarget && !result.success) {
      Host.userMetrics.developerResourceLoaded(Host.UserMetrics.DeveloperResourceLoaded.FallbackFailure);
    }
    if (failureReason) {
      // In case we have a success, add a note about why the load through the target failed.
      result.errorDescription.message =
          `Fetch through target failed: ${failureReason}; Fallback: ${result.errorDescription.message}`;
    }
    return result;
  }

  private getDeveloperResourceScheme(parsedURL: Common.ParsedURL.ParsedURL|
                                     null): Host.UserMetrics.DeveloperResourceScheme {
    if (!parsedURL || parsedURL.scheme === '') {
      return Host.UserMetrics.DeveloperResourceScheme.SchemeUnknown;
    }
    const isLocalhost = parsedURL.host === 'localhost' || parsedURL.host.endsWith('.localhost');
    switch (parsedURL.scheme) {
      case 'file':
        return Host.UserMetrics.DeveloperResourceScheme.SchemeFile;
      case 'data':
        return Host.UserMetrics.DeveloperResourceScheme.SchemeData;
      case 'blob':
        return Host.UserMetrics.DeveloperResourceScheme.SchemeBlob;
      case 'http':
        return isLocalhost ? Host.UserMetrics.DeveloperResourceScheme.SchemeHttpLocalhost :
                             Host.UserMetrics.DeveloperResourceScheme.SchemeHttp;
      case 'https':
        return isLocalhost ? Host.UserMetrics.DeveloperResourceScheme.SchemeHttpsLocalhost :
                             Host.UserMetrics.DeveloperResourceScheme.SchemeHttps;
    }
    return Host.UserMetrics.DeveloperResourceScheme.SchemeOther;
  }

  private async loadFromTarget(
      target: Target, frameId: Protocol.Page.FrameId|null, url: Platform.DevToolsPath.UrlString): Promise<{
    success: boolean,
    content: string,
    errorDescription: {
      statusCode: number,
      netError: number|undefined,
      netErrorName: string|undefined,
      message: string,
      urlValid: undefined,
    },
  }> {
    const networkManager = (target.model(NetworkManager) as NetworkManager);
    const ioModel = (target.model(IOModel) as IOModel);
    const disableCache = Common.Settings.Settings.instance().moduleSetting('cacheDisabled').get();
    const resource = await networkManager.loadNetworkResource(frameId, url, {disableCache, includeCredentials: true});
    try {
      const content = resource.stream ? await ioModel.readToString(resource.stream) : '';
      return {
        success: resource.success,
        content,
        errorDescription: {
          statusCode: resource.httpStatusCode || 0,
          netError: resource.netError,
          netErrorName: resource.netErrorName,
          message: Host.ResourceLoader.netErrorToMessage(
                       resource.netError, resource.httpStatusCode, resource.netErrorName) ||
              '',
          urlValid: undefined,
        },
      };
    } finally {
      if (resource.stream) {
        void ioModel.close(resource.stream);
      }
    }
  }
}

export function getLoadThroughTargetSetting(): Common.Settings.Setting<boolean> {
  return Common.Settings.Settings.instance().createSetting('loadThroughTarget', true);
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  Update = 'Update',
}

export type EventTypes = {
  [Events.Update]: void,
};
