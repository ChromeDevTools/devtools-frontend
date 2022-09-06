// Copyright (c) 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as puppeteer from '../../third_party/puppeteer/puppeteer.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as SDK from '../../core/sdk/sdk.js';

class Transport implements puppeteer.ConnectionTransport {
  #connection: SDK.Connections.ParallelConnectionInterface;
  #knownIds = new Set<number>();

  constructor(connection: SDK.Connections.ParallelConnectionInterface) {
    this.#connection = connection;
  }

  send(data: string): void {
    const message = JSON.parse(data);
    this.#knownIds.add(message.id);
    this.#connection.sendRawMessage(data);
  }

  close(): void {
    void this.#connection.disconnect();
  }

  set onmessage(cb: (message: string) => void) {
    this.#connection.setOnMessage((message: Object) => {
      const data = (message) as {id: number, method: string, params: unknown, sessionId?: string};
      if (data.id && !this.#knownIds.has(data.id)) {
        return;
      }
      this.#knownIds.delete(data.id);
      if (!data.sessionId) {
        return;
      }
      return cb(JSON.stringify({
        ...data,
        // Puppeteer is expecting to use the default session, but we give it a non-default session in #connection.
        // Replace that sessionId with undefined so Puppeteer treats it as default.
        sessionId: data.sessionId === this.#connection.getSessionId() ? undefined : data.sessionId,
      }));
    });
  }

  set onclose(cb: () => void) {
    const prev = this.#connection.getOnDisconnect();
    this.#connection.setOnDisconnect(reason => {
      if (prev) {
        prev(reason);
      }
      if (cb) {
        cb();
      }
    });
  }
}

class PuppeteerConnection extends puppeteer.Connection {
  override async onMessage(message: string): Promise<void> {
    const msgObj = JSON.parse(message) as {id: number, method: string, params: unknown, sessionId?: string};
    if (msgObj.sessionId && !this._sessions.has(msgObj.sessionId)) {
      return;
    }
    void super.onMessage(message);
  }
}

export class PuppeteerConnectionHelper {
  static async connectPuppeteerToConnection(options: {
    connection: SDK.Connections.ParallelConnectionInterface,
    mainFrameId: string,
    targetInfos: Protocol.Target.TargetInfo[],
    targetFilterCallback: (targetInfo: Protocol.Target.TargetInfo) => boolean,
    isPageTargetCallback: (targetInfo: Protocol.Target.TargetInfo) => boolean,
  }): Promise<{
    page: puppeteer.Page | null,
    browser: puppeteer.Browser,
    puppeteerConnection: puppeteer.Connection,
  }> {
    const {connection, mainFrameId, targetInfos, targetFilterCallback, isPageTargetCallback} = options;
    // Pass an empty message handler because it will be overwritten by puppeteer anyways.
    const transport = new Transport(connection);

    // url is an empty string in this case parallel to:
    // https://github.com/puppeteer/puppeteer/blob/f63a123ecef86693e6457b07437a96f108f3e3c5/src/common/BrowserConnector.ts#L72
    const puppeteerConnection = new PuppeteerConnection('', transport);
    const targetIdsForAutoAttachEmulation = targetInfos.filter(targetFilterCallback).map(t => t.targetId);

    const browserPromise = puppeteer.Browser._create(
        'chrome',
        puppeteerConnection,
        [] /* contextIds */,
        false /* ignoreHTTPSErrors */,
        undefined /* defaultViewport */,
        undefined /* process */,
        undefined /* closeCallback */,
        targetFilterCallback,
        isPageTargetCallback,
    );

    const [, browser] = await Promise.all([
      Promise.all(targetIdsForAutoAttachEmulation.map(
          targetId => puppeteerConnection._createSession({targetId}, /* emulateAutoAttach= */ true))),
      browserPromise,
    ]);

    // TODO: replace this with browser.pages() once the Puppeteer version is rolled.
    const pages =
        await Promise.all(browser.browserContexts()
                              .map(ctx => ctx.targets())
                              .flat()
                              .filter(target => target.type() === 'page' || target.url().startsWith('devtools://'))
                              .map(target => target.page()));
    const page =
        pages.filter((p): p is puppeteer.Page => p !== null).find(p => p.mainFrame()._id === mainFrameId) || null;

    return {page, browser, puppeteerConnection};
  }
}
