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

export function isDevToolsUrl(url: Platform.DevToolsPath.UrlString): boolean {
  return Common.ParsedURL.schemeIs(url, 'devtools:');
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
  if (isDevToolsUrl(currentUrl as Platform.DevToolsPath.UrlString)) {
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
 * Returns true if a step with a target that is not 'main' runs before the
 * first main-page navigate step. Such a step can send input to a frame or to
 * a popup of the current page, thus the current page must stay.
 */
function hasOtherTargetStepBeforeNavigate(flow: UserFlow): boolean {
  for (const step of flow.steps) {
    if ('target' in step && step.target && step.target !== 'main') {
      return true;
    }
    if (step.type === 'navigate') {
      return false;
    }
  }
  return false;
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
 * Returns the URL from the target info of `frame`, if the frame is the root
 * frame of an out-of-process iframe (OOPIF). Returns undefined for other
 * frames, and if the target of the session is not known.
 *
 * The browser process sends the target info. The session of the OOPIF sends
 * `frame.url()`, thus a compromised renderer of the OOPIF can forge it. The
 * browser process reports no URL for the other subframes.
 */
function oopifTargetUrl(frame: Pick<puppeteer.Frame, 'client'|'_id'>, guardedPage: puppeteer.Page): string|undefined {
  // A frame in the session of the main frame is not out of process.
  if (frame.client === guardedPage.mainFrame().client) {
    return undefined;
  }
  try {
    const targetInfo = (frame.client as unknown as {target(): puppeteer.Target}).target()._getTargetInfo();
    // The ID of an OOPIF target is the ID of its root frame. The other frames
    // of the session are in-process subframes of the OOPIF.
    return targetInfo.type === 'iframe' && targetInfo.targetId === frame._id ? targetInfo.url : undefined;
  } catch {
    // Puppeteer can report a session before it knows the target of the session.
    return undefined;
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
  /** True if no step can send input to the page or to its frames before the page navigates. */
  readonly #replayNavigatesFirst: boolean;
  readonly #onError: () => void;
  readonly #guardedPages = new Set<puppeteer.Page>();
  /** The pages for which the guard checked the documents from before the guard. */
  readonly #checkedPages = new Set<puppeteer.Page>();
  readonly #guardedClients = new Set<puppeteer.CDPSession>();
  readonly #prerenderClients = new Set<puppeteer.CDPSession>();
  readonly #cleanups: Array<() => Promise<void>> = [];
  #error?: Error;
  #disposed = false;
  /** Aborted when the guard has an error or is disposed. */
  readonly #abortController = new AbortController();
  readonly #stepTargetUrls = new Set<string>();
  readonly #watchedBrowsers = new Set<puppeteer.Browser>();
  readonly #errorOrDispose = Promise.withResolvers<void>();

  /**
   * @param currentUrl The URL of the inspected page. It must come from the
   * target info of the browser process. Do not use `page.url()`, because
   * Puppeteer sets that value from CDP messages that the renderer writes.
   * @param onError The guard calls it each time it blocks a navigation or
   * cannot enable the interception.
   */
  constructor(flow: UserFlow, currentUrl: string, onError: () => void) {
    this.#allowedNavigations = collectAllowedNavigations(flow, currentUrl);
    this.#checkSubframes = hasSubframeSteps(flow);
    this.#replayUsesCurrentPage = shouldAllowCurrentUrl(flow, currentUrl);
    this.#replayNavigatesFirst = !this.#replayUsesCurrentPage && !hasOtherTargetStepBeforeNavigate(flow);
    this.#onError = onError;
  }

  /** The first error of the guard, if a navigation was blocked. */
  get error(): Error|undefined {
    return this.#error;
  }

  /**
   * Resolves when the guard has an error or when `dispose()` is called. Use
   * it to stop a wait for an operation that the guard blocked.
   */
  get errorOrDisposePromise(): Promise<void> {
    return this.#errorOrDispose.promise;
  }

  #block(url: string): void {
    this.#error ??= new Error(`Navigation to ${url} is not allowed, because the recording does not contain its origin`);
    this.#abortController.abort();
    this.#errorOrDispose.resolve();
    this.#onError();
  }

  #failGuard(err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    this.#error ??= new Error(`Could not enable the navigation guard: ${message}`);
    this.#abortController.abort();
    this.#errorOrDispose.resolve();
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
      // A prerender session has the frames of a page that can become the main
      // frame, and `guardedPage` does not know these frames. The guard checks
      // all their documents until the page uses this session.
      const isInactivePrerender = this.#prerenderClients.has(client) && guardedPage.mainFrame().client !== client;
      const isSubframe = !isInactivePrerender && event.frameId !== guardedPage.mainFrame()._id;
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
  #checkFrameUrl(frame: Pick<puppeteer.Frame, 'url'|'client'|'_id'>, guardedPage: puppeteer.Page): void {
    const isSubframe = frame !== guardedPage.mainFrame();
    if (isSubframe && !this.#checkSubframes) {
      return;
    }
    const url = this.#disallowedFrameUrl(frame, guardedPage);
    if (url !== undefined) {
      this.#block(url);
    }
  }

  /**
   * Returns a URL of `frame` that is from an origin that is not in the
   * recording, or undefined if there is no such URL. For the root frame of
   * an OOPIF, the guard checks `frame.url()` and the URL from the target
   * info, because a compromised renderer can forge `frame.url()`.
   */
  #disallowedFrameUrl(frame: Pick<puppeteer.Frame, 'url'|'client'|'_id'>, guardedPage: puppeteer.Page): string
      |undefined {
    const urls = [frame.url(), oopifTargetUrl(frame, guardedPage)];
    return urls.find(url => url !== undefined && this.#isDisallowedUrl(url));
  }

  /**
   * Checks the document of a prerendered page from before the replay. A
   * response can arrive before the interception is on and commit later, and
   * Puppeteer does not report the navigations of a prerendered page. Thus the
   * guard reads the URL of the main frame from the session, now and for each
   * later commit. The URL of the target is empty until the page commits.
   */
  async #checkExistingPrerender(session: puppeteer.CDPSession, targetUrl: string): Promise<void> {
    const checkUrl = (url: string): void => {
      // about: pages and the Chrome error page do not come from the network.
      if (!url || url.startsWith('about:') || url.startsWith('chrome-error:')) {
        return;
      }
      if (!isNavigationAllowed(url, this.#allowedNavigations)) {
        this.#block(url);
      }
    };
    const onFrameNavigated = (event: {frame: {url: string, parentId?: string}}): void => {
      if (!event.frame.parentId) {
        checkUrl(event.frame.url);
      }
    };
    session.on('Page.frameNavigated', onFrameNavigated);
    this.#cleanups.push(async () => {
      session.off('Page.frameNavigated', onFrameNavigated);
    });
    try {
      await session.send('Page.enable');
      const tree = await session.send('Page.getFrameTree') as {frameTree?: {frame: {url: string}}} | undefined;
      checkUrl(tree?.frameTree?.frame.url ?? targetUrl);
    } catch (err) {
      // A prerendered page that is closed cannot become the main frame.
      if (!session.detached && !isSessionClosedError(err)) {
        this.#failGuard(err);
      }
    }
  }

  /**
   * Returns the prerendered pages of `guardedPage` that have a session. The
   * session of a prerendered page is a child of the tab session.
   * `browser.targets()` does not contain prerender targets, thus use the
   * child targets of the tab target.
   */
  #prerenderTargets(guardedPage: puppeteer.Page): Array<{session: puppeteer.CDPSession, url: string}> {
    const pageSession = guardedPage.mainFrame().client;
    const tabSession = pageSession.parentSession();
    if (!tabSession || tabSession === pageSession) {
      return [];
    }
    const tabTarget = (tabSession as unknown as {target(): puppeteer.Target}).target();
    const result: Array<{session: puppeteer.CDPSession, url: string}> = [];
    for (const prerenderTarget of tabTarget._childTargets()) {
      const session = prerenderTarget._session();
      if (prerenderTarget._subtype() === 'prerender' && session) {
        result.push({session, url: prerenderTarget.url()});
      }
    }
    return result;
  }

  /**
   * Checks the documents that `guardedPage` has now: the frames and the
   * prerendered pages. They loaded without a check, and a step can send input
   * to them before they navigate. Checks each page one time only.
   */
  async #checkExistingDocuments(guardedPage: puppeteer.Page): Promise<void> {
    if (this.#checkedPages.has(guardedPage)) {
      return;
    }
    this.#checkedPages.add(guardedPage);
    for (const frame of guardedPage.frames()) {
      this.#checkFrameUrl(frame, guardedPage);
    }
    for (const {session, url} of this.#prerenderTargets(guardedPage)) {
      // The guard cannot pause the responses of a session without the
      // interception. `guardPage` reports the failure for an open session.
      if (this.#guardedClients.has(session)) {
        await this.#checkExistingPrerender(session, url);
      }
    }
  }

  /**
   * Enables the guard on all frames of `guardedPage`. The guard also checks
   * the URLs that the frames have now, if `checkExistingFrames` is true or if
   * a step can send input to the inspected page before the page navigates.
   * A later call with `checkExistingFrames` set to true does this check for a
   * page that has the guard already.
   */
  async guardPage(guardedPage: puppeteer.Page, checkExistingFrames: boolean): Promise<void> {
    if (this.#guardedPages.has(guardedPage)) {
      // The first call for the inspected page does not check the frames if
      // the replay navigates the page first. A step with a different target
      // can send input to a frame of the page before that navigation.
      if (checkExistingFrames) {
        await this.#checkExistingDocuments(guardedPage);
      }
      return;
    }
    this.#guardedPages.add(guardedPage);
    const onFrameNavigated = (frame: Pick<puppeteer.Frame, 'url'|'client'|'_id'>): void => {
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
    // The session of a prerendered page is a child of the tab session. After
    // the activation, the main frame uses this session. Puppeteer emits the
    // event before it resumes the prerendered page, thus no request of the
    // session starts before the interception is on.
    const pageSession = guardedPage.mainFrame().client;
    const tabSession = pageSession.parentSession();
    if (tabSession && tabSession !== pageSession) {
      const onPageSessionAttached = (session: puppeteer.CDPSession): void => {
        this.#prerenderClients.add(session);
        void this.#guardClient(session, guardedPage).catch((err: unknown) => {
          if (!session.detached && !isSessionClosedError(err)) {
            this.#failGuard(err);
          }
        });
      };
      tabSession.on(SESSION_ATTACHED, onPageSessionAttached);
      this.#cleanups.push(async () => {
        tabSession.off(SESSION_ATTACHED, onPageSessionAttached);
      });
      // The page can have a prerendered page from before the replay. Its
      // session is attached already, and its document loaded without a check.
      for (const {session} of this.#prerenderTargets(guardedPage)) {
        this.#prerenderClients.add(session);
        try {
          await this.#guardClient(session, guardedPage);
        } catch (err) {
          // A prerendered page that is closed cannot become the main frame.
          if (!session.detached && !isSessionClosedError(err)) {
            this.#failGuard(err);
          }
        }
      }
    }
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
    // If the replay navigates the page first, that navigation removes the
    // frames and the prerendered pages of the current document. They cannot
    // get input, thus their documents must not stop the replay.
    if (checkExistingFrames || this.#replayUsesCurrentPage) {
      await this.#checkExistingDocuments(guardedPage);
    }
    await this.#removeHistory(guardedPage, /* navigateAwayIfDisallowed= */ !checkExistingFrames);
  }

  /**
   * Returns true if the URL of a frame is from an origin that is not in the
   * recording. about: pages and the Chrome error page do not come from the
   * network.
   */
  #isDisallowedUrl(url: string): boolean {
    if (!url || url.startsWith('about:') || url.startsWith('chrome-error:')) {
      return false;
    }
    return !isNavigationAllowed(url, this.#allowedNavigations);
  }

  /**
   * Removes the session history of `guardedPage`, if it can contain a
   * document with an origin that is not in the recording. Chrome does not
   * pause a response for a back/forward cache restore, thus `history.back()`
   * could show such a document from before the replay.
   *
   * The history reports only the URLs of main frames, and a restore reports
   * no navigation for subframes. Thus, if the guard checks subframes, it
   * always removes the history.
   *
   * If `navigateAwayIfDisallowed` is true and the current document has such
   * an origin, the page first navigates to about:blank, so that the history
   * does not contain this document. The guard does not change the page if it
   * has an error or is disposed, because the replay does not run then.
   *
   * The URL of the current document comes from the session history of the
   * browser process. `page.url()` and `frame.url()` come from CDP messages
   * that the renderer writes, and a compromised renderer can forge them:
   * - The guard does not use `page.url()`. A current document with an unknown
   *   URL is not allowed.
   * - If a step can send input to the current document, the guard stops the
   *   replay for a current document that is not allowed.
   *   `#checkExistingDocuments` cannot find this document if the renderer
   *   forges the URL of the main frame.
   * - If the guard checks subframes and no step uses the current page before
   *   the page navigates, the page always navigates to about:blank.
   * - If a step uses a frame of the current page first, the page must stay.
   *   The history does not report the URLs of subframes. In this case, the
   *   guard uses the target info for out-of-process iframes and `frame.url()`
   *   for the other subframes. See `#disallowedFrameUrl`.
   */
  async #removeHistory(guardedPage: puppeteer.Page, navigateAwayIfDisallowed: boolean): Promise<void> {
    if (this.#error || this.#disposed) {
      return;
    }
    const client = guardedPage.mainFrame().client;
    const history =
        await client.send('Page.getNavigationHistory') as {currentIndex?: number, entries?: Array<{url: string}>} |
        undefined;
    if (this.#error || this.#disposed) {
      return;
    }
    const entries = history?.entries ?? [];
    const currentUrl = entries[history?.currentIndex ?? -1]?.url as Platform.DevToolsPath.UrlString | undefined;
    // DevTools targets do not support navigations. See `RecordingPlayer`.
    if (currentUrl !== undefined && isDevToolsUrl(currentUrl)) {
      return;
    }
    // A step can send input to the current document of a step target page, and
    // of the inspected page if the replay uses the current page.
    if (!navigateAwayIfDisallowed || this.#replayUsesCurrentPage) {
      if (currentUrl === undefined) {
        this.#failGuard(new Error('The session history has no current entry'));
        return;
      }
      if (this.#isDisallowedUrl(currentUrl)) {
        this.#block(currentUrl);
        return;
      }
    }
    // Keep the history, and thus the Back button, if all entries are allowed.
    if (!this.#checkSubframes && entries.length > 0 &&
        entries.every(entry => isNavigationAllowed(entry.url, this.#allowedNavigations))) {
      return;
    }
    const hasDisallowedDocument = currentUrl === undefined || this.#isDisallowedUrl(currentUrl) ||
        (this.#checkSubframes &&
         (this.#replayNavigatesFirst ||
          guardedPage.frames().some(frame => this.#disallowedFrameUrl(frame, guardedPage) !== undefined)));
    if (navigateAwayIfDisallowed && hasDisallowedDocument) {
      await guardedPage.goto('about:blank');
      if (this.#error || this.#disposed) {
        return;
      }
    }
    await client.send('Page.resetNavigationHistory');
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
    this.#errorOrDispose.resolve();
    for (const cleanup of this.#cleanups.splice(0)) {
      await cleanup();
    }
  }
}
