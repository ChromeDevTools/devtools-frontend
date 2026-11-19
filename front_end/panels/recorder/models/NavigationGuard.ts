// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import type * as Platform from '../../../core/platform/platform.js';
import type * as puppeteer from '../../../third_party/puppeteer/puppeteer.js';

import type {UserFlow} from './Schema.js';

const SESSION_ATTACHED = 'sessionattached' as puppeteer.CDPSessionEventSessionAttached;
const NON_INTERACTIVE_STEP_TYPES = new Set<string>(['setViewport', 'emulateNetworkConditions']);
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

interface FetchRequestPausedEvent {
  requestId: string;
  frameId: string;
  request: {url: string};
  responseStatusCode?: number;
  responseHeaders?: Array<{name: string, value: string}>;
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

function isRedirectResponse(event: FetchRequestPausedEvent): boolean {
  if (event.responseStatusCode === undefined || !REDIRECT_STATUS_CODES.has(event.responseStatusCode)) {
    return false;
  }
  const locationHeader = event.responseHeaders?.find(header => header.name.toLowerCase() === 'location');
  const locationValue = locationHeader?.value.trim();
  if (!locationValue) {
    return false;
  }
  try {
    new URL(locationValue, event.request.url);
    return true;
  } catch {
    return false;
  }
}

function isAttachmentResponse(event: FetchRequestPausedEvent): boolean {
  // Chrome downloads only a successful response. For other status codes, it
  // shows an error page or commits the response body.
  const status = event.responseStatusCode;
  if (status === undefined || status < 200 || status > 299) {
    return false;
  }
  // If a response has more than one Content-Disposition header, Chrome can
  // use a value that is not `attachment`. Accept only one header.
  const dispositions =
      event.responseHeaders?.filter(header => header.name.toLowerCase() === 'content-disposition') ?? [];
  // Chrome removes only HTTP whitespace (space and tab) around the type. The
  // `\s` class also matches other characters, for which Chrome does not find
  // the `attachment` type.
  return dispositions.length === 1 && /^[ \t]*attachment[ \t]*(?:;|$)/i.test(dispositions[0].value);
}

function isSessionClosedError(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false;
  }
  return err.name === 'TargetCloseError' || err.message.includes('Session closed') ||
      err.message.includes('Target closed') || err.message.includes('Session with given id not found');
}

/**
 * Returns false only if the session is known to be of a target that has no
 * frames, for example a worker. Puppeteer can report a session before it
 * knows the frame of the session, thus the frames of the page cannot answer
 * this question.
 */
function canHaveFrames(session: puppeteer.CDPSession): boolean {
  try {
    const type = (session as unknown as {target(): puppeteer.Target}).target()._getTargetInfo().type;
    return type === 'iframe' || type === 'page';
  } catch {
    // The target of the session is not known.
    return true;
  }
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

/**
 * Returns true if a step can send input to a subframe. A target that is not
 * 'main' is the URL of a popup or of an out-of-process iframe.
 */
export function hasSubframeSteps(flow: UserFlow): boolean {
  return flow.steps.some(step => {
    const hasFrame = 'frame' in step && Boolean(step.frame?.length);
    const hasTarget = 'target' in step && Boolean(step.target) && step.target !== 'main';
    return hasFrame || hasTarget;
  });
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
 * It continues HTTP redirect hops and attachment downloads, because they do
 * not commit a document.
 */
export class NavigationGuard {
  readonly #allowedNavigations: AllowedNavigations;
  readonly #checkSubframes: boolean;
  /** True if a step can send input to the page before the page navigates. */
  readonly #replayUsesCurrentPage: boolean;
  readonly #onError: () => void;
  readonly #guardedPages = new Set<puppeteer.Page>();
  readonly #guardedClients = new Set<puppeteer.CDPSession>();
  readonly #cleanups: Array<() => Promise<void>> = [];
  #error?: Error;
  #disposed = false;
  /** Aborted when the guard has an error or is disposed. */
  readonly #abortController = new AbortController();
  readonly #stepTargetUrls = new Set<string>();
  readonly #watchedBrowsers = new Set<puppeteer.Browser>();

  /**
   * @param onError The guard calls it each time it blocks a navigation or
   * cannot enable the interception.
   */
  constructor(flow: UserFlow, currentUrl: string, onError: () => void) {
    this.#allowedNavigations = collectAllowedNavigations(flow, currentUrl);
    this.#checkSubframes = hasSubframeSteps(flow);
    this.#replayUsesCurrentPage = shouldAllowCurrentUrl(flow, currentUrl);
    this.#onError = onError;
  }

  /** The first error of the guard, if a navigation was blocked. */
  get error(): Error|undefined {
    return this.#error;
  }

  #block(url: string): void {
    this.#error ??= new Error(`Navigation to ${url} is not allowed, because the recording does not contain its origin`);
    this.#abortController.abort();
    this.#onError();
  }

  #failGuard(err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    this.#error ??= new Error(`Could not enable the navigation guard: ${message}`);
    this.#abortController.abort();
    this.#onError();
  }

  /**
   * A failure to enable the interception on the session of `frame` can be
   * ignored if the session is closed, or if the frame is a subframe and the
   * guard does not check subframes.
   */
  #canIgnoreFailure(frame: Pick<puppeteer.Frame, 'client'>, guardedPage: puppeteer.Page, err: unknown): boolean {
    if (frame.client.detached || isSessionClosedError(err)) {
      return true;
    }
    return frame !== guardedPage.mainFrame() && !this.#checkSubframes;
  }

  async #guardClient(client: puppeteer.CDPSession, guardedPage: puppeteer.Page): Promise<void> {
    if (this.#disposed || this.#guardedClients.has(client)) {
      return;
    }
    this.#guardedClients.add(client);
    const onRequestPaused = (event: FetchRequestPausedEvent): void => {
      const isSubframe = event.frameId !== guardedPage.mainFrame()._id;
      if ((isSubframe && !this.#checkSubframes) || isRedirectResponse(event) || isAttachmentResponse(event) ||
          isNavigationAllowed(event.request.url, this.#allowedNavigations)) {
        // The request can be gone already, for example if the page closed.
        void client.send('Fetch.continueRequest', {requestId: event.requestId}).catch(() => {});
        return;
      }
      this.#block(event.request.url);
      void client.send('Fetch.failRequest', {requestId: event.requestId, errorReason: 'BlockedByClient'})
          .catch(() => {});
    };
    // Puppeteer emits this event before it resumes the new target, for
    // example an OOPIF. `guardClient` sends `Fetch.enable` synchronously, thus
    // the target cannot start a navigation before the interception is on.
    const onSessionAttached = (session: puppeteer.CDPSession): void => {
      void this.#guardClient(session, guardedPage).catch((err: unknown) => {
        if (!this.#checkSubframes || session.detached || isSessionClosedError(err)) {
          return;
        }
        // Ignore the targets that have no frames (for example, workers). They
        // do not support the Fetch domain.
        if (canHaveFrames(session)) {
          this.#failGuard(err);
        }
      });
    };
    client.on('Fetch.requestPaused', onRequestPaused);
    client.on(SESSION_ATTACHED, onSessionAttached);
    // Register the cleanup before the command, so that `dispose()` disables
    // the interception also while the command is in progress.
    const cleanup = async(): Promise<void> => {
      client.off(SESSION_ATTACHED, onSessionAttached);
      // The listener stays until the interception is off, so that it handles
      // the requests that are paused. The session can be closed already.
      await client.send('Fetch.disable').catch(() => {});
      client.off('Fetch.requestPaused', onRequestPaused);
    };
    this.#cleanups.push(cleanup);
    try {
      await client.send(
          'Fetch.enable',
          {patterns: [{urlPattern: '*', resourceType: 'Document', requestStage: 'Response'}]},
      );
    } catch (err) {
      // A later framenavigated event can try again.
      this.#guardedClients.delete(client);
      const index = this.#cleanups.indexOf(cleanup);
      if (index !== -1) {
        this.#cleanups.splice(index, 1);
      }
      client.off(SESSION_ATTACHED, onSessionAttached);
      client.off('Fetch.requestPaused', onRequestPaused);
      throw err;
    }
  }

  // Finds the documents that loaded without a paused response.
  #checkFrameUrl(frame: Pick<puppeteer.Frame, 'url'|'client'>, guardedPage: puppeteer.Page): void {
    const url = frame.url();
    const isSubframe = frame !== guardedPage.mainFrame();
    // about: pages and the Chrome error page do not come from the network.
    if ((isSubframe && !this.#checkSubframes) || !url || url.startsWith('about:') || url.startsWith('chrome-error:')) {
      return;
    }
    if (!isNavigationAllowed(url, this.#allowedNavigations)) {
      this.#block(url);
    }
  }

  /**
   * Enables the guard on all frames of `guardedPage`. The guard also checks
   * the URLs that the frames have now, if `checkExistingFrames` is true or if
   * a step can send input to the inspected page before the page navigates.
   */
  async guardPage(guardedPage: puppeteer.Page, checkExistingFrames: boolean): Promise<void> {
    if (this.#guardedPages.has(guardedPage)) {
      return;
    }
    this.#guardedPages.add(guardedPage);
    const onFrameNavigated = (frame: Pick<puppeteer.Frame, 'url'|'client'>): void => {
      // The frame can have a new session, for example for an OOPIF.
      void this.#guardClient(frame.client, guardedPage).catch((err: unknown) => {
        if (!this.#canIgnoreFailure(frame, guardedPage, err)) {
          this.#failGuard(err);
        }
      });
      this.#checkFrameUrl(frame, guardedPage);
    };
    guardedPage.on('framenavigated', onFrameNavigated as never);
    this.#cleanups.push(async () => {
      guardedPage.off('framenavigated', onFrameNavigated as never);
    });
    for (const frame of guardedPage.frames()) {
      try {
        await this.#guardClient(frame.client, guardedPage);
      } catch (err) {
        // The replay cannot continue without the guard on the main frame.
        if (frame === guardedPage.mainFrame() || !this.#canIgnoreFailure(frame, guardedPage, err)) {
          throw err;
        }
      }
    }
    if (checkExistingFrames || this.#replayUsesCurrentPage) {
      // The frames loaded without a check. A step can send input to them
      // before they navigate.
      for (const frame of guardedPage.frames()) {
        this.#checkFrameUrl(frame, guardedPage);
      }
    }
  }

  /**
   * Enables the guard on a page that a step targets. A page that is closed
   * cannot receive input, thus the guard ignores a failure for such a page.
   */
  async #guardStepTargetPage(targetPage: puppeteer.Page): Promise<void> {
    try {
      await this.guardPage(targetPage, /* checkExistingFrames= */ true);
    } catch (err) {
      if (!targetPage.isClosed() && !isSessionClosedError(err)) {
        throw err;
      }
    }
  }

  /**
   * Enables the guard on the page of `target`, and on each page that contains
   * a frame with the URL of `target` (for example, an OOPIF in a popup).
   */
  async #guardPagesOfTarget(browser: puppeteer.Browser, target: Pick<puppeteer.Target, 'url'|'page'>): Promise<void> {
    const targetUrl = target.url();
    const targetPage = await target.page();
    if (targetPage) {
      await this.#guardStepTargetPage(targetPage as puppeteer.Page);
    }
    for (const candidatePage of await browser.pages()) {
      if (candidatePage.url() === targetUrl || candidatePage.frames().some(frame => frame.url() === targetUrl)) {
        await this.#guardStepTargetPage(candidatePage as puppeteer.Page);
      }
    }
  }

  /**
   * Replay finds the target of a step separately, after `guardStepTarget`. In
   * the time between, a page can open a new target with the same URL. Thus
   * the guard also enables itself on each target that gets one of the step
   * target URLs later.
   */
  #watchStepTargets(browser: puppeteer.Browser): void {
    if (this.#watchedBrowsers.has(browser)) {
      return;
    }
    this.#watchedBrowsers.add(browser);
    const onTarget = (target: Pick<puppeteer.Target, 'url'|'page'>): void => {
      if (this.#disposed || !this.#stepTargetUrls.has(target.url())) {
        return;
      }
      void this.#guardPagesOfTarget(browser, target).catch((err: unknown) => this.#failGuard(err));
    };
    browser.on('targetcreated', onTarget as never);
    browser.on('targetchanged', onTarget as never);
    this.#cleanups.push(async () => {
      browser.off('targetcreated', onTarget as never);
      browser.off('targetchanged', onTarget as never);
    });
  }

  /**
   * Enables the guard on each page that has the URL `targetUrl` or that
   * contains a frame with this URL (for example, an OOPIF in a popup). Waits
   * for a target with this URL for `timeout` milliseconds at most. The wait
   * stops when the guard has an error or is disposed.
   */
  async guardStepTarget(browser: puppeteer.Browser, targetUrl: string, timeout: number): Promise<void> {
    this.#stepTargetUrls.add(targetUrl);
    this.#watchStepTargets(browser);
    const signal = this.#abortController.signal;
    let target;
    try {
      target = await browser.waitForTarget(t => t.url() === targetUrl, {timeout, signal});
    } catch (err) {
      if (signal.aborted) {
        return;
      }
      throw err;
    }
    await this.#guardPagesOfTarget(browser, target);
  }

  /** Disables the interception and removes all listeners. */
  async dispose(): Promise<void> {
    this.#disposed = true;
    this.#abortController.abort();
    for (const cleanup of this.#cleanups.splice(0)) {
      await cleanup();
    }
  }
}
