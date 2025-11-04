// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolClient from '../../core/protocol_client/protocol_client.js';
import type {ProtocolMapping} from '../../generated/protocol-mapping.js';
import type * as Protocol from '../../generated/protocol.js';
import * as puppeteer from '../../third_party/puppeteer/puppeteer.js';

/**
 * This class serves as a puppeteer.Connection while sending/receiving CDP messages
 * over DevTools' own SessionRouter.
 *
 * The only oddity is that we attached to a concrete target with a sessionId but make
 * it look to puppeteer like it's the default session (no session ID).
 *
 * Since we see all CDPEvents, we filter out the ones whose session we don't know about.
 */
class PuppeteerConnectionAdapter extends puppeteer.Connection implements
    ProtocolClient.CDPConnection.CDPConnectionObserver {
  readonly #connection: ProtocolClient.CDPConnection.CDPConnection;
  readonly #sessionId: Protocol.Target.SessionID;

  constructor(connection: ProtocolClient.CDPConnection.CDPConnection, sessionId: Protocol.Target.SessionID) {
    // url is an empty string in this case parallel to:
    // https://github.com/puppeteer/puppeteer/blob/f63a123ecef86693e6457b07437a96f108f3e3c5/src/common/BrowserConnector.ts#L72
    // Pass a 'null' transport, it should never actually be used, otherwise we do something wrong overwriting connection.
    super('', {close: () => undefined} as puppeteer.ConnectionTransport);
    this.#connection = connection;
    this.#connection.observe(this);
    this.#sessionId = sessionId;
  }

  // eslint-disable-next-line @devtools/no-underscored-properties
  override _rawSend(
      _callbacks: unknown, method: string|number|symbol, params: unknown, sessionId?: string,
      _options?: unknown): Promise<unknown> {
    return this.#connection
        .send(
            method as ProtocolClient.CDPConnection.Command,
            params as ProtocolClient.CDPConnection.CommandParams<ProtocolClient.CDPConnection.Command>,
            sessionId ?? this.#sessionId)
        .then(response => 'result' in response ? response.result : {});
  }

  onEvent<T extends keyof ProtocolMapping.Events>(event: ProtocolClient.CDPConnection.CDPEvent<T>): void {
    const {sessionId} = event;
    if (sessionId === this.#sessionId) {
      // Puppeteer is expecting to use the default session, but we give it a non-default session in #connection.
      // Replace that sessionId with undefined so Puppeteer treats it as default.
      event.sessionId = undefined;
    } else if (!sessionId || !this._sessions.has(sessionId)) {
      // Ignore the root session, or sessions puppeteer doesn't know about.
      return;
    }

    void super.onMessage(JSON.stringify(event));
  }

  onDisconnect(): void {
    this.dispose();
  }

  override dispose(): void {
    super.dispose();
    this.#connection.unobserve(this);
    void this.#connection.send('Target.detachFromTarget', {sessionId: this.#sessionId}, this.#sessionId);
  }
}

export class PuppeteerConnectionHelper {
  static async connectPuppeteerToConnectionViaTab(options: {
    connection: ProtocolClient.CDPConnection.CDPConnection,
    targetId: Protocol.Target.TargetID,
    sessionId: Protocol.Target.SessionID,
    isPageTargetCallback: (targetInfo: Protocol.Target.TargetInfo) => boolean,
  }): Promise<{
    page: puppeteer.Page | null,
    browser: puppeteer.Browser,
    puppeteerConnection: puppeteer.Connection,
  }> {
    const {connection, targetId, sessionId, isPageTargetCallback} = options;
    const puppeteerConnection = new PuppeteerConnectionAdapter(connection, sessionId);
    const browserPromise = puppeteer.Browser._create(
        puppeteerConnection,
        [] /* contextIds */,
        false /* ignoreHTTPSErrors */,
        undefined /* defaultViewport */,
        undefined /* DownloadBehavior */,
        undefined /* process */,
        undefined /* closeCallback */,
        undefined /* targetFilterCallback */,
        target => isPageTargetCallback((target as puppeteer.Target)._getTargetInfo()),
        false /* waitForInitiallyDiscoveredTargets */,
    );

    const [, browser] = await Promise.all([
      puppeteerConnection._createSession({targetId}, /* emulateAutoAttach= */ true),
      browserPromise,
    ]);

    await browser.waitForTarget(t => t.type() === 'page');

    const pages = await browser.pages();

    return {page: pages[0] as puppeteer.Page, browser, puppeteerConnection};
  }
}
