// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Copyright 2021 Google LLC. All rights reserved.

import {assert} from 'chai';

import {getBrowserAndPages} from '../../shared/helper.js';

describe('Puppeteer', () => {
  it('should connect to the browser via DevTools own connection', async () => {
    const {frontend, browser} = getBrowserAndPages();

    const version = await browser.version();
    const result = await frontend.evaluate(`(async () => {
      const puppeteer = await import('./third_party/puppeteer/puppeteer.js');
      const SDK = await import('./core/sdk/sdk.js');

      class Transport {

        /**
         *
         * @param {ProtocolClient.InspectorBackend.Connection} connection
         */
        constructor(connection) {
          this._connection = connection;
        }
        /**
         *
         * @param {*} string
         */
        send(string) {
          this._connection.sendRawMessage(string);
        }

        close() {
          this._connection.disconnect();
        }

        /**
         * @param {function(string): void} cb
         */
        set onmessage(cb) {
          this._connection.setOnMessage((data) => {
            if (data.sessionId === this._connection.getSessionId()) {
              delete data.sessionId;
            }
            cb(JSON.stringify(data));
            // TODO: DevTools should stop processing this message. This is achieved by using a wrong sessionId.
            data.sessionId = 'unknown';
          });
        }

        /**
         * @param {() => void} cb
         */
        set onclose(cb) {
          this._connection.setOnDisconnect(() => {
            cb()
          });
        }
      }

      const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      if (!mainTarget) {
        throw new Error('Could not find main target');
      }
      const childTargetManager = mainTarget.model(SDK.ChildTargetManager.ChildTargetManager);
      const { connection: rawConnection } = await childTargetManager.createParallelConnection();
      const mainTargetId = await childTargetManager.getParentTargetId();

      const transport = new Transport(rawConnection);

      // url is an empty string in this case parallel to:
      // https://github.com/puppeteer/puppeteer/blob/f63a123ecef86693e6457b07437a96f108f3e3c5/src/common/BrowserConnector.ts#L72
      const connection = new puppeteer.Connection('', transport);
      const browserPromise = puppeteer.Browser._create(
        'chrome',
        connection,
        [],
        false,
        undefined,
        undefined,
        undefined,
        (target) => target.targetId === mainTargetId
      );
      const [, browser] = await Promise.all([
        connection._createSession({ targetId: mainTargetId }, true),
        browserPromise
      ]);
      const version = await browser.version();
      browser.disconnect();
      return version;
    })()`);

    assert.deepEqual(version, result);
  });
});
