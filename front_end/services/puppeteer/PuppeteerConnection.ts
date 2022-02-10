// Copyright (c) 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as puppeteer from '../../third_party/puppeteer/puppeteer.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as SDK from '../../core/sdk/sdk.js';

export class Transport implements puppeteer.ConnectionTransport {
  #connection: SDK.Connections.ParallelConnectionInterface;
  #knownIds = new Set<number>();

  constructor(connection: SDK.Connections.ParallelConnectionInterface) {
    this.#connection = connection;
  }

  send(message: string): void {
    const data = JSON.parse(message);
    this.#knownIds.add(data.id);
    this.#connection.sendRawMessage(JSON.stringify(data));
  }

  close(): void {
    void this.#connection.disconnect();
  }

  set onmessage(cb: (message: string) => void) {
    this.#connection.setOnMessage((message: Object) => {
      if (!cb) {
        return;
      }
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

export class PuppeteerConnection extends puppeteer.Connection {
  // Overriding Puppeteer's API here.
  // eslint-disable-next-line rulesdir/no_underscored_properties
  async _onMessage(message: string): Promise<void> {
    const msgObj = JSON.parse(message) as {id: number, method: string, params: unknown, sessionId?: string};
    if (msgObj.sessionId && !this._sessions.has(msgObj.sessionId)) {
      return;
    }
    void super._onMessage(message);
  }
}

export async function getPuppeteerConnection(
    rawConnection: SDK.Connections.ParallelConnectionInterface,
    mainFrameId: string,
    mainTargetId: string,
    ): Promise<{page: puppeteer.Page | null, browser: puppeteer.Browser}> {
  const transport = new Transport(rawConnection);

  // url is an empty string in this case parallel to:
  // https://github.com/puppeteer/puppeteer/blob/f63a123ecef86693e6457b07437a96f108f3e3c5/src/common/BrowserConnector.ts#L72
  const connection = new PuppeteerConnection('', transport);

  const targetFilterCallback = (targetInfo: Protocol.Target.TargetInfo): boolean => {
    if (targetInfo.type !== 'page' && targetInfo.type !== 'iframe') {
      return false;
    }
    // TODO only connect to iframes that are related to the main target. This requires refactoring in Puppeteer: https://github.com/puppeteer/puppeteer/issues/3667.
    return targetInfo.targetId === mainTargetId || targetInfo.openerId === mainTargetId || targetInfo.type === 'iframe';
  };

  const browser = await puppeteer.Browser.create(
      connection,
      [] /* contextIds */,
      false /* ignoreHTTPSErrors */,
      undefined /* defaultViewport */,
      undefined /* process */,
      undefined /* closeCallback */,
      targetFilterCallback,
  );

  const pages = await browser.pages();
  const page = pages.find(p => p.mainFrame()._id === mainFrameId) || null;

  return {page, browser};
}
