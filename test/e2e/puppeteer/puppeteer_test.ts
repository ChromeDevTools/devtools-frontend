// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {getBrowserAndPages} from '../../shared/helper.js';


describe('Puppeteer', () => {
  it('should connect to the browser via DevTools own connection', async () => {
    const {frontend, browser} = getBrowserAndPages();

    const version = await browser.version();
    const result = await frontend.evaluate(`(async () => {
      const puppeteer = await import('./third_party/puppeteer/puppeteer.js');
      const SDK = await import('./sdk/sdk.js');

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
            if (data.sessionId === this._connection._sessionId) {
              delete data.sessionId;
            }
            cb(typeof data === 'string' ? data : JSON.stringify(data));
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

      const childTargetManager =
        SDK.SDKModel.TargetManager.instance().mainTarget().model(SDK.ChildTargetManager.ChildTargetManager);
      const rawConnection = await childTargetManager.createParallelConnection();

      const transport = new Transport(rawConnection);

      // url is an empty string in this case parallel to:
      // https://github.com/puppeteer/puppeteer/blob/f63a123ecef86693e6457b07437a96f108f3e3c5/src/common/BrowserConnector.ts#L72
      const connection = new puppeteer.Connection('', transport);
      const browser = await puppeteer.Browser.create(connection, [], false);
      return browser.version();
    })()`);

    assert.deepEqual(version, result);
  });
});
