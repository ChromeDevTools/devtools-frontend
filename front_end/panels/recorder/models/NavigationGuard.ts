// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import type * as Platform from '../../../core/platform/platform.js';
import type * as puppeteer from '../../../third_party/puppeteer/puppeteer.js';

import type {UserFlow} from './Schema.js';

const NON_INTERACTIVE_STEP_TYPES = new Set<string>(['setViewport', 'emulateNetworkConditions']);

interface FetchRequestPausedEvent {
  requestId: string;
  frameId: string;
  request: {url: string};
}

export interface AllowedNavigations {
  /** Origins of the URLs that have a non-opaque origin (for example, http: and https:). */
  origins: Set<string>;
  /** Complete URLs that have an opaque origin (for example, data:). */
  urls: Set<string>;
}

function addAllowedNavigation(allowed: AllowedNavigations, url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Recordings can contain values that are not URLs. They cannot match a request.
    return;
  }
  if (parsed.origin === 'null') {
    allowed.urls.add(parsed.href);
  } else {
    allowed.origins.add(parsed.origin);
  }
}

/**
 * Returns true if the replay can use the current page: a step can interact
 * with the main page before the first main-page navigate step, or the
 * recording has no main-page navigate step. On DevTools targets, navigate
 * steps are skipped, so the current URL stays allowed.
 */
function shouldAllowCurrentUrl(flow: UserFlow, currentUrl: string): boolean {
  if (Common.ParsedURL.schemeIs(currentUrl as Platform.DevToolsPath.UrlString, 'devtools:')) {
    return true;
  }
  for (const step of flow.steps) {
    // A step with a different target runs on a popup or on an iframe. It does
    // not show that the replay sends input to the main page.
    if ('target' in step && step.target && step.target !== 'main') {
      continue;
    }
    if (step.type === 'navigate') {
      return false;
    }
    if (!NON_INTERACTIVE_STEP_TYPES.has(step.type)) {
      return true;
    }
  }
  // The replay does not leave the current page.
  return true;
}

/**
 * Collects the navigations that a replay of `flow` is allowed to make: all
 * URLs in the recording, plus `currentUrl` if an interactive step can run
 * before the first main-page navigate step.
 */
export function collectAllowedNavigations(flow: UserFlow, currentUrl: string): AllowedNavigations {
  const allowed: AllowedNavigations = {origins: new Set(), urls: new Set()};
  if (shouldAllowCurrentUrl(flow, currentUrl)) {
    addAllowedNavigation(allowed, currentUrl);
  }
  for (const step of flow.steps) {
    if (step.type === 'navigate') {
      addAllowedNavigation(allowed, step.url);
    }
    if ('target' in step && typeof step.target === 'string' && step.target !== 'main') {
      addAllowedNavigation(allowed, step.target);
    }
    for (const event of step.assertedEvents ?? []) {
      if (event.url) {
        addAllowedNavigation(allowed, event.url);
      }
    }
  }
  return allowed;
}

export function isNavigationAllowed(url: string, allowed: AllowedNavigations): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.origin === 'null') {
    return allowed.urls.has(parsed.href);
  }
  return allowed.origins.has(parsed.origin);
}

/**
 * Stops a replay if a page commits a navigation to an origin that is not in
 * the recording. The guard pauses document responses with the Fetch domain.
 */
export class NavigationGuard {
  readonly #allowedNavigations: AllowedNavigations;
  readonly #onError: () => void;
  readonly #guardedPages = new Set<puppeteer.Page>();
  readonly #guardedClients = new Set<puppeteer.CDPSession>();
  readonly #cleanups: Array<() => Promise<void>> = [];
  #error?: Error;

  /** @param onError The guard calls it each time it blocks a navigation. */
  constructor(flow: UserFlow, currentUrl: string, onError: () => void) {
    this.#allowedNavigations = collectAllowedNavigations(flow, currentUrl);
    this.#onError = onError;
  }

  /** The first error of the guard, if a navigation was blocked. */
  get error(): Error|undefined {
    return this.#error;
  }

  #block(url: string): void {
    this.#error ??= new Error(`Navigation to ${url} is not allowed, because the recording does not contain its origin`);
    this.#onError();
  }

  async #guardClient(client: puppeteer.CDPSession, guardedPage: puppeteer.Page): Promise<void> {
    if (this.#guardedClients.has(client)) {
      return;
    }
    this.#guardedClients.add(client);
    const onRequestPaused = (event: FetchRequestPausedEvent): void => {
      const isSubframe = event.frameId !== guardedPage.mainFrame()._id;
      if (isSubframe || isNavigationAllowed(event.request.url, this.#allowedNavigations)) {
        // The request can be gone already, for example if the page closed.
        void client.send('Fetch.continueRequest', {requestId: event.requestId}).catch(() => {});
        return;
      }
      this.#block(event.request.url);
      void client.send('Fetch.failRequest', {requestId: event.requestId, errorReason: 'BlockedByClient'})
          .catch(() => {});
    };
    client.on('Fetch.requestPaused', onRequestPaused);
    this.#cleanups.push(async () => {
      // The listener stays until the interception is off, so that it handles
      // the requests that are paused. The session can be closed already.
      await client.send('Fetch.disable').catch(() => {});
      client.off('Fetch.requestPaused', onRequestPaused);
    });
    await client.send(
        'Fetch.enable',
        {patterns: [{urlPattern: '*', resourceType: 'Document', requestStage: 'Response'}]},
    );
  }

  /** Enables the guard on the main frame of `guardedPage`. */
  async guardPage(guardedPage: puppeteer.Page): Promise<void> {
    if (this.#guardedPages.has(guardedPage)) {
      return;
    }
    this.#guardedPages.add(guardedPage);
    // Chrome pauses the responses for the main frame in the session of the page.
    await this.#guardClient(guardedPage.mainFrame().client, guardedPage);
  }

  /** Disables the interception and removes all listeners. */
  async dispose(): Promise<void> {
    for (const cleanup of this.#cleanups.splice(0)) {
      await cleanup();
    }
  }
}
