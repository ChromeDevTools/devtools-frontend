// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import { PageResourceLoader } from './PageResourceLoader.js';
import { parseSourceMap, SourceMap } from './SourceMap.js';
import { SourceMapCache } from './SourceMapCache.js';
import { Type } from './Target.js';
export class SourceMapManager extends Common.ObjectWrapper.ObjectWrapper {
    #target;
    #factory;
    #isEnabled = true;
    #clientData = new Map();
    #sourceMaps = new Map();
    #attachingClient = null;
    constructor(target, factory) {
        super();
        this.#target = target;
        this.#factory =
            factory ?? ((compiledURL, sourceMappingURL, payload) => new SourceMap(compiledURL, sourceMappingURL, payload));
    }
    setEnabled(isEnabled) {
        if (isEnabled === this.#isEnabled) {
            return;
        }
        // We need this copy, because `this.#clientData` is getting modified
        // in the loop body and trying to iterate over it at the same time
        // leads to an infinite loop.
        const clientData = [...this.#clientData.entries()];
        for (const [client] of clientData) {
            this.detachSourceMap(client);
        }
        this.#isEnabled = isEnabled;
        for (const [client, { relativeSourceURL, relativeSourceMapURL }] of clientData) {
            this.attachSourceMap(client, relativeSourceURL, relativeSourceMapURL);
        }
    }
    static getBaseUrl(target) {
        while (target && target.type() !== Type.FRAME) {
            target = target.parentTarget();
        }
        return target?.inspectedURL() ?? Platform.DevToolsPath.EmptyUrlString;
    }
    static resolveRelativeSourceURL(target, url) {
        url = Common.ParsedURL.ParsedURL.completeURL(SourceMapManager.getBaseUrl(target), url) ?? url;
        return url;
    }
    sourceMapForClient(client) {
        return this.#clientData.get(client)?.sourceMap;
    }
    // This method actively awaits the source map, if still loading.
    sourceMapForClientPromise(client) {
        const clientData = this.#clientData.get(client);
        if (!clientData) {
            return Promise.resolve(undefined);
        }
        return clientData.sourceMapPromise;
    }
    clientForSourceMap(sourceMap) {
        return this.#sourceMaps.get(sourceMap);
    }
    // TODO(bmeurer): We are lying about the type of |relativeSourceURL| here.
    attachSourceMap(client, relativeSourceURL, relativeSourceMapURL) {
        if (this.#clientData.has(client)) {
            throw new Error('SourceMap is already attached or being attached to client');
        }
        if (!relativeSourceMapURL) {
            return;
        }
        let clientData = {
            relativeSourceURL,
            relativeSourceMapURL,
            sourceMap: undefined,
            sourceMapPromise: Promise.resolve(undefined),
        };
        if (this.#isEnabled) {
            // The `// #sourceURL=foo` can be a random string, but is generally an absolute path.
            // Complete it to inspected page url for relative links.
            const sourceURL = SourceMapManager.resolveRelativeSourceURL(this.#target, relativeSourceURL);
            const sourceMapURL = Common.ParsedURL.ParsedURL.completeURL(sourceURL, relativeSourceMapURL);
            if (sourceMapURL) {
                if (this.#attachingClient) {
                    // This should not happen
                    console.error('Attaching source map may cancel previously attaching source map');
                }
                this.#attachingClient = client;
                this.dispatchEventToListeners(Events.SourceMapWillAttach, { client });
                if (this.#attachingClient === client) {
                    this.#attachingClient = null;
                    const initiator = client.createPageResourceLoadInitiator();
                    // TODO(crbug.com/458180550): Pass PageResourceLoader via constructor.
                    //     The reason we grab it here lazily from the context is that otherwise every
                    //     unit test using `createTarget` would need to set up a `PageResourceLoader`, as
                    //     CSSModel and DebuggerModel are autostarted by default, and they create a
                    //     SourceMapManager in their respective constructors.
                    const resourceLoader = this.#target.targetManager().context.get(PageResourceLoader);
                    clientData.sourceMapPromise =
                        loadSourceMap(resourceLoader, sourceMapURL, client.debugId(), initiator)
                            .then(payload => {
                            const sourceMap = this.#factory(sourceURL, sourceMapURL, payload, client);
                            if (this.#clientData.get(client) === clientData) {
                                clientData.sourceMap = sourceMap;
                                this.#sourceMaps.set(sourceMap, client);
                                this.dispatchEventToListeners(Events.SourceMapAttached, { client, sourceMap });
                            }
                            return sourceMap;
                        }, () => {
                            if (this.#clientData.get(client) === clientData) {
                                this.dispatchEventToListeners(Events.SourceMapFailedToAttach, { client });
                            }
                            return undefined;
                        });
                }
                else {
                    // Assume cancelAttachSourceMap was called.
                    if (this.#attachingClient) {
                        // This should not happen
                        console.error('Cancelling source map attach because another source map is attaching');
                    }
                    clientData = null;
                    this.dispatchEventToListeners(Events.SourceMapFailedToAttach, { client });
                }
            }
        }
        if (clientData) {
            this.#clientData.set(client, clientData);
        }
    }
    cancelAttachSourceMap(client) {
        if (client === this.#attachingClient) {
            this.#attachingClient = null;
            // This should not happen.
        }
        else if (this.#attachingClient) {
            console.error('cancel attach source map requested but a different source map was being attached');
        }
        else {
            console.error('cancel attach source map requested but no source map was being attached');
        }
    }
    detachSourceMap(client) {
        const clientData = this.#clientData.get(client);
        if (!clientData) {
            return;
        }
        this.#clientData.delete(client);
        if (!this.#isEnabled) {
            return;
        }
        const { sourceMap } = clientData;
        if (sourceMap) {
            this.#sourceMaps.delete(sourceMap);
            this.dispatchEventToListeners(Events.SourceMapDetached, { client, sourceMap });
        }
        else {
            this.dispatchEventToListeners(Events.SourceMapFailedToAttach, { client });
        }
    }
    waitForSourceMapsProcessedForTest() {
        return Promise.all(this.#sourceMaps.keys().map(sourceMap => sourceMap.scopesFallbackPromiseForTest));
    }
}
async function loadSourceMap(resourceLoader, url, debugId, initiator) {
    try {
        if (debugId) {
            const cachedSourceMap = await SourceMapCache.instance().get(debugId);
            if (cachedSourceMap) {
                return cachedSourceMap;
            }
        }
        const { content } = await resourceLoader.loadResource(url, initiator);
        const sourceMap = parseSourceMap(content);
        if ('debugId' in sourceMap && sourceMap.debugId) {
            // In case something goes wrong with updating the cache, we still want to use the source map.
            await SourceMapCache.instance().set(sourceMap.debugId, sourceMap).catch();
        }
        return sourceMap;
    }
    catch (cause) {
        throw new Error(`Could not load content for ${url}: ${cause.message}`, { cause });
    }
}
export async function tryLoadSourceMap(resourceLoader, url, initiator) {
    try {
        return await loadSourceMap(resourceLoader, url, null, initiator);
    }
    catch (cause) {
        console.error(cause);
        return null;
    }
}
export var Events;
(function (Events) {
    /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
    Events["SourceMapWillAttach"] = "SourceMapWillAttach";
    Events["SourceMapFailedToAttach"] = "SourceMapFailedToAttach";
    Events["SourceMapAttached"] = "SourceMapAttached";
    Events["SourceMapDetached"] = "SourceMapDetached";
    /* eslint-enable @typescript-eslint/naming-convention */
})(Events || (Events = {}));
//# sourceMappingURL=SourceMapManager.js.map