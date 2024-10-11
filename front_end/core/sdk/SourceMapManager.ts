// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';

import type {FrameAssociated} from './FrameAssociated.js';
import {PageResourceLoader, type PageResourceLoadInitiator} from './PageResourceLoader.js';
import {parseSourceMap, SourceMap, type SourceMapV3} from './SourceMap.js';
import {type Target, Type} from './Target.js';

export class SourceMapManager<T extends FrameAssociated> extends Common.ObjectWrapper.ObjectWrapper<EventTypes<T>> {
  readonly #target: Target;
  #isEnabled: boolean;
  readonly #clientData: Map<T, ClientData>;
  readonly #sourceMaps: Map<SourceMap, T>;
  #attachingClient: T|null;

  constructor(target: Target) {
    super();

    this.#target = target;
    this.#isEnabled = true;
    this.#attachingClient = null;
    this.#clientData = new Map();
    this.#sourceMaps = new Map();
  }

  setEnabled(isEnabled: boolean): void {
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
    for (const [client, {relativeSourceURL, relativeSourceMapURL}] of clientData) {
      this.attachSourceMap(client, relativeSourceURL, relativeSourceMapURL);
    }
  }

  private static getBaseUrl(target: Target|null): Platform.DevToolsPath.UrlString {
    while (target && target.type() !== Type.FRAME) {
      target = target.parentTarget();
    }
    return target?.inspectedURL() ?? Platform.DevToolsPath.EmptyUrlString;
  }

  static resolveRelativeSourceURL(target: Target|null, url: Platform.DevToolsPath.UrlString):
      Platform.DevToolsPath.UrlString {
    url = Common.ParsedURL.ParsedURL.completeURL(SourceMapManager.getBaseUrl(target), url) ?? url;
    return url;
  }

  sourceMapForClient(client: T): SourceMap|undefined {
    return this.#clientData.get(client)?.sourceMap;
  }

  // This method actively awaits the source map, if still loading.
  sourceMapForClientPromise(client: T): Promise<SourceMap|undefined> {
    const clientData = this.#clientData.get(client);
    if (!clientData) {
      return Promise.resolve(undefined);
    }

    return clientData.sourceMapPromise;
  }

  clientForSourceMap(sourceMap: SourceMap): T|undefined {
    return this.#sourceMaps.get(sourceMap);
  }

  // TODO(bmeurer): We are lying about the type of |relativeSourceURL| here.
  attachSourceMap(
      client: T, relativeSourceURL: Platform.DevToolsPath.UrlString, relativeSourceMapURL: string|undefined): void {
    if (this.#clientData.has(client)) {
      throw new Error('SourceMap is already attached or being attached to client');
    }
    if (!relativeSourceMapURL) {
      return;
    }

    let clientData: ClientData|null = {
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
        this.dispatchEventToListeners(Events.SourceMapWillAttach, {client});

        if (this.#attachingClient === client) {
          this.#attachingClient = null;
          const initiator = client.createPageResourceLoadInitiator();
          clientData.sourceMapPromise =
              loadSourceMap(sourceMapURL, initiator)
                  .then(
                      payload => {
                        const sourceMap = new SourceMap(sourceURL, sourceMapURL, payload);
                        if (this.#clientData.get(client) === clientData) {
                          clientData.sourceMap = sourceMap;
                          this.#sourceMaps.set(sourceMap, client);
                          this.dispatchEventToListeners(Events.SourceMapAttached, {client, sourceMap});
                        }
                        return sourceMap;
                      },
                      () => {
                        if (this.#clientData.get(client) === clientData) {
                          this.dispatchEventToListeners(Events.SourceMapFailedToAttach, {client});
                        }
                        return undefined;
                      });
        } else {
          // Assume cancelAttachSourceMap was called.
          if (this.#attachingClient) {
            // This should not happen
            console.error('Cancelling source map attach because another source map is attaching');
          }
          clientData = null;
          this.dispatchEventToListeners(Events.SourceMapFailedToAttach, {client});
        }
      }
    }
    if (clientData) {
      this.#clientData.set(client, clientData);
    }
  }

  cancelAttachSourceMap(client: T): void {
    if (client === this.#attachingClient) {
      this.#attachingClient = null;
    } else {
      // This should not happen.
      if (this.#attachingClient) {
        console.error('cancel attach source map requested but a different source map was being attached');
      } else {
        console.error('cancel attach source map requested but no source map was being attached');
      }
    }
  }

  detachSourceMap(client: T): void {
    const clientData = this.#clientData.get(client);
    if (!clientData) {
      return;
    }
    this.#clientData.delete(client);
    if (!this.#isEnabled) {
      return;
    }
    const {sourceMap} = clientData;
    if (sourceMap) {
      this.#sourceMaps.delete(sourceMap);
      this.dispatchEventToListeners(Events.SourceMapDetached, {client, sourceMap});
    } else {
      this.dispatchEventToListeners(Events.SourceMapFailedToAttach, {client});
    }
  }
}

async function loadSourceMap(
    url: Platform.DevToolsPath.UrlString, initiator: PageResourceLoadInitiator): Promise<SourceMapV3> {
  try {
    const {content} = await PageResourceLoader.instance().loadResource(url, initiator);
    return parseSourceMap(content);
  } catch (cause) {
    throw new Error(`Could not load content for ${url}: ${cause.message}`, {cause});
  }
}

type ClientData = {
  relativeSourceURL: Platform.DevToolsPath.UrlString,
  // Stores the raw sourceMappingURL as provided by V8. These are not guaranteed to
  // be valid URLs and will be checked and resolved once `attachSourceMap` is called.
  relativeSourceMapURL: string,
  sourceMap: SourceMap|undefined,
  sourceMapPromise: Promise<SourceMap|undefined>,
};

export enum Events {
  /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
  SourceMapWillAttach = 'SourceMapWillAttach',
  SourceMapFailedToAttach = 'SourceMapFailedToAttach',
  SourceMapAttached = 'SourceMapAttached',
  SourceMapDetached = 'SourceMapDetached',
  /* eslint-enable @typescript-eslint/naming-convention */
}

export type EventTypes<T extends FrameAssociated> = {
  [Events.SourceMapWillAttach]: {client: T},
  [Events.SourceMapFailedToAttach]: {client: T},
  [Events.SourceMapAttached]: {client: T, sourceMap: SourceMap},
  [Events.SourceMapDetached]: {client: T, sourceMap: SourceMap},
};
