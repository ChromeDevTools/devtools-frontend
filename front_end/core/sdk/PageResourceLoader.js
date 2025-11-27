// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';
import { IOModel } from './IOModel.js';
import { MultitargetNetworkManager, NetworkManager } from './NetworkManager.js';
import { Events as ResourceTreeModelEvents, ResourceTreeModel, } from './ResourceTreeModel.js';
import { TargetManager } from './TargetManager.js';
const UIStrings = {
    /**
     * @description Error message for canceled source map loads
     */
    loadCanceledDueToReloadOf: 'Load canceled due to reload of inspected page',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/PageResourceLoader.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
function isExtensionInitiator(initiator) {
    return 'extensionId' in initiator;
}
/** Used for revealing a resource. **/
export class ResourceKey {
    key;
    constructor(key) {
        this.key = key;
    }
}
/**
 * The page resource loader is a bottleneck for all DevTools-initiated resource loads. For each such load, it keeps a
 * `PageResource` object around that holds meta information. This can be as the basis for reporting to the user which
 * resources were loaded, and whether there was a load error.
 */
export class PageResourceLoader extends Common.ObjectWrapper.ObjectWrapper {
    #targetManager;
    #settings;
    #userAgentProvider;
    #currentlyLoading = 0;
    #currentlyLoadingPerTarget = new Map();
    #maxConcurrentLoads;
    #pageResources = new Map();
    #queuedLoads = [];
    #loadOverride;
    constructor(targetManager, settings, userAgentProvider, loadOverride, maxConcurrentLoads = 500) {
        super();
        this.#targetManager = targetManager;
        this.#settings = settings;
        this.#userAgentProvider = userAgentProvider;
        this.#maxConcurrentLoads = maxConcurrentLoads;
        this.#targetManager.addModelListener(ResourceTreeModel, ResourceTreeModelEvents.PrimaryPageChanged, this.onPrimaryPageChanged, this);
        this.#loadOverride = loadOverride;
    }
    static instance({ forceNew, targetManager, settings, userAgentProvider, loadOverride, maxConcurrentLoads } = {
        forceNew: false,
        loadOverride: null,
    }) {
        if (forceNew) {
            Root.DevToolsContext.globalInstance().set(PageResourceLoader, new PageResourceLoader(targetManager ?? TargetManager.instance(), settings ?? Common.Settings.Settings.instance(), userAgentProvider ?? MultitargetNetworkManager.instance(), loadOverride, maxConcurrentLoads));
        }
        return Root.DevToolsContext.globalInstance().get(PageResourceLoader);
    }
    static removeInstance() {
        Root.DevToolsContext.globalInstance().delete(PageResourceLoader);
    }
    onPrimaryPageChanged(event) {
        const { frame: mainFrame, type } = event.data;
        if (!mainFrame.isOutermostFrame()) {
            return;
        }
        for (const { reject } of this.#queuedLoads) {
            reject(new Error(i18nString(UIStrings.loadCanceledDueToReloadOf)));
        }
        this.#queuedLoads = [];
        const mainFrameTarget = mainFrame.resourceTreeModel().target();
        const keptResources = new Map();
        // If the navigation is a prerender-activation, the pageResources for the destination page have
        // already been preloaded. In such cases, we therefore don't just discard all pageResources, but
        // instead make sure to keep the pageResources for the prerendered target.
        for (const [key, pageResource] of this.#pageResources.entries()) {
            if ((type === "Activation" /* PrimaryPageChangeType.ACTIVATION */) && mainFrameTarget === pageResource.initiator.target) {
                keptResources.set(key, pageResource);
            }
        }
        this.#pageResources = keptResources;
        this.dispatchEventToListeners("Update" /* Events.UPDATE */);
    }
    getResourcesLoaded() {
        return this.#pageResources;
    }
    getScopedResourcesLoaded() {
        return new Map([...this.#pageResources].filter(([_, pageResource]) => this.#targetManager.isInScope(pageResource.initiator.target) ||
            isExtensionInitiator(pageResource.initiator)));
    }
    /**
     * Loading is the number of currently loading and queued items. Resources is the total number of resources,
     * including loading and queued resources, but not including resources that are still loading but scheduled
     * for cancelation.;
     */
    getNumberOfResources() {
        return { loading: this.#currentlyLoading, queued: this.#queuedLoads.length, resources: this.#pageResources.size };
    }
    getScopedNumberOfResources() {
        let loadingCount = 0;
        for (const [targetId, count] of this.#currentlyLoadingPerTarget) {
            const target = this.#targetManager.targetById(targetId);
            if (this.#targetManager.isInScope(target)) {
                loadingCount += count;
            }
        }
        return { loading: loadingCount, resources: this.getScopedResourcesLoaded().size };
    }
    async acquireLoadSlot(target) {
        this.#currentlyLoading++;
        if (target) {
            const currentCount = this.#currentlyLoadingPerTarget.get(target.id()) || 0;
            this.#currentlyLoadingPerTarget.set(target.id(), currentCount + 1);
        }
        if (this.#currentlyLoading > this.#maxConcurrentLoads) {
            const { promise: waitForCapacity, resolve, reject, } = Promise.withResolvers();
            this.#queuedLoads.push({ resolve, reject });
            await waitForCapacity;
        }
    }
    releaseLoadSlot(target) {
        this.#currentlyLoading--;
        if (target) {
            const currentCount = this.#currentlyLoadingPerTarget.get(target.id());
            if (currentCount) {
                this.#currentlyLoadingPerTarget.set(target.id(), currentCount - 1);
            }
        }
        const entry = this.#queuedLoads.shift();
        if (entry) {
            entry.resolve();
        }
    }
    static makeExtensionKey(url, initiator) {
        if (isExtensionInitiator(initiator) && initiator.extensionId) {
            return `${url}-${initiator.extensionId}`;
        }
        throw new Error('Invalid initiator');
    }
    static makeKey(url, initiator) {
        if (initiator.frameId) {
            return `${url}-${initiator.frameId}`;
        }
        if (initiator.target) {
            return `${url}-${initiator.target.id()}`;
        }
        throw new Error('Invalid initiator');
    }
    resourceLoadedThroughExtension(pageResource) {
        const key = PageResourceLoader.makeExtensionKey(pageResource.url, pageResource.initiator);
        this.#pageResources.set(key, pageResource);
        this.dispatchEventToListeners("Update" /* Events.UPDATE */);
    }
    async loadResource(url, initiator, isBinary = false) {
        if (isExtensionInitiator(initiator)) {
            throw new Error('Invalid initiator');
        }
        const key = PageResourceLoader.makeKey(url, initiator);
        const pageResource = { success: null, size: null, duration: null, errorMessage: undefined, url, initiator };
        this.#pageResources.set(key, pageResource);
        this.dispatchEventToListeners("Update" /* Events.UPDATE */);
        const startTime = performance.now();
        try {
            await this.acquireLoadSlot(initiator.target);
            const resultPromise = this.dispatchLoad(url, initiator, isBinary);
            const result = await resultPromise;
            pageResource.errorMessage = result.errorDescription.message;
            pageResource.success = result.success;
            if (result.success) {
                pageResource.size = result.content.length;
                return { content: result.content };
            }
            throw new Error(result.errorDescription.message);
        }
        catch (e) {
            if (pageResource.errorMessage === undefined) {
                pageResource.errorMessage = e.message;
            }
            if (pageResource.success === null) {
                pageResource.success = false;
            }
            throw e;
        }
        finally {
            pageResource.duration = performance.now() - startTime;
            this.releaseLoadSlot(initiator.target);
            this.dispatchEventToListeners("Update" /* Events.UPDATE */);
        }
    }
    async dispatchLoad(url, initiator, isBinary) {
        if (isExtensionInitiator(initiator)) {
            throw new Error('Invalid initiator');
        }
        const failureReason = null;
        if (this.#loadOverride) {
            return await this.#loadOverride(url);
        }
        const parsedURL = new Common.ParsedURL.ParsedURL(url);
        const eligibleForLoadFromTarget = this.getLoadThroughTargetSetting().get() && parsedURL &&
            parsedURL.scheme !== 'file' && parsedURL.scheme !== 'data' && parsedURL.scheme !== 'devtools' &&
            initiator.target;
        Host.userMetrics.developerResourceScheme(this.getDeveloperResourceScheme(parsedURL));
        if (eligibleForLoadFromTarget) {
            try {
                Host.userMetrics.developerResourceLoaded(0 /* Host.UserMetrics.DeveloperResourceLoaded.LOAD_THROUGH_PAGE_VIA_TARGET */);
                const result = await this.loadFromTarget(initiator.target, initiator.frameId, url, isBinary);
                return result;
            }
            catch (e) {
                if (e instanceof Error) {
                    Host.userMetrics.developerResourceLoaded(2 /* Host.UserMetrics.DeveloperResourceLoaded.LOAD_THROUGH_PAGE_FAILURE */);
                    if (e.message.includes('CSP violation')) {
                        return {
                            success: false,
                            content: '',
                            errorDescription: { statusCode: 0, netError: undefined, netErrorName: undefined, message: e.message, urlValid: undefined }
                        };
                    }
                }
            }
            Host.userMetrics.developerResourceLoaded(3 /* Host.UserMetrics.DeveloperResourceLoaded.LOAD_THROUGH_PAGE_FALLBACK */);
        }
        else {
            const code = this.getLoadThroughTargetSetting().get() ?
                6 /* Host.UserMetrics.DeveloperResourceLoaded.FALLBACK_PER_PROTOCOL */ :
                5 /* Host.UserMetrics.DeveloperResourceLoaded.FALLBACK_PER_OVERRIDE */;
            Host.userMetrics.developerResourceLoaded(code);
        }
        const result = await this.loadFromHostBindings(url);
        if (eligibleForLoadFromTarget && !result.success) {
            Host.userMetrics.developerResourceLoaded(7 /* Host.UserMetrics.DeveloperResourceLoaded.FALLBACK_FAILURE */);
        }
        if (failureReason) {
            // In case we have a success, add a note about why the load through the target failed.
            result.errorDescription.message =
                `Fetch through target failed: ${failureReason}; Fallback: ${result.errorDescription.message}`;
        }
        return result;
    }
    getDeveloperResourceScheme(parsedURL) {
        if (!parsedURL || parsedURL.scheme === '') {
            return 1 /* Host.UserMetrics.DeveloperResourceScheme.UKNOWN */;
        }
        const isLocalhost = parsedURL.host === 'localhost' || parsedURL.host.endsWith('.localhost');
        switch (parsedURL.scheme) {
            case 'file':
                return 7 /* Host.UserMetrics.DeveloperResourceScheme.FILE */;
            case 'data':
                return 6 /* Host.UserMetrics.DeveloperResourceScheme.DATA */;
            case 'blob':
                return 8 /* Host.UserMetrics.DeveloperResourceScheme.BLOB */;
            case 'http':
                return isLocalhost ? 4 /* Host.UserMetrics.DeveloperResourceScheme.HTTP_LOCALHOST */ :
                    2 /* Host.UserMetrics.DeveloperResourceScheme.HTTP */;
            case 'https':
                return isLocalhost ? 5 /* Host.UserMetrics.DeveloperResourceScheme.HTTPS_LOCALHOST */ :
                    3 /* Host.UserMetrics.DeveloperResourceScheme.HTTPS */;
        }
        return 0 /* Host.UserMetrics.DeveloperResourceScheme.OTHER */;
    }
    async loadFromTarget(target, frameId, url, isBinary) {
        const networkManager = target.model(NetworkManager);
        const ioModel = target.model(IOModel);
        const disableCache = this.#settings.moduleSetting('cache-disabled').get();
        const resource = await networkManager.loadNetworkResource(frameId, url, { disableCache, includeCredentials: true });
        try {
            const content = resource.stream ?
                (isBinary ? await ioModel.readToBuffer(resource.stream) : await ioModel.readToString(resource.stream)) :
                '';
            return {
                success: resource.success,
                content,
                errorDescription: {
                    statusCode: resource.httpStatusCode || 0,
                    netError: resource.netError,
                    netErrorName: resource.netErrorName,
                    message: Host.ResourceLoader.netErrorToMessage(resource.netError, resource.httpStatusCode, resource.netErrorName) ||
                        '',
                    urlValid: undefined,
                },
            };
        }
        finally {
            if (resource.stream) {
                void ioModel.close(resource.stream);
            }
        }
    }
    async loadFromHostBindings(url) {
        const headers = {};
        const currentUserAgent = this.#userAgentProvider.currentUserAgent();
        if (currentUserAgent) {
            headers['User-Agent'] = currentUserAgent;
        }
        if (this.#settings.moduleSetting('cache-disabled').get()) {
            headers['Cache-Control'] = 'no-cache';
        }
        const allowRemoteFilePaths = this.#settings.moduleSetting('network.enable-remote-file-loading').get();
        return await new Promise(resolve => Host.ResourceLoader.load(url, headers, (success, _responseHeaders, content, errorDescription) => {
            resolve({ success, content, errorDescription });
        }, allowRemoteFilePaths));
    }
    getLoadThroughTargetSetting() {
        return this.#settings.createSetting('load-through-target', true);
    }
}
//# sourceMappingURL=PageResourceLoader.js.map