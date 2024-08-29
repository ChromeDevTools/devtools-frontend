// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getBrowserAndPages,
  waitForAria,
  waitForFunction,
} from '../../../test/shared/helper.js';
import {
  createAndStartRecording,
  enableAndOpenRecorderPanel,
  stopRecording,
} from './helpers.js';

describe('Recorder', function() {
  if (this.timeout() !== 0) {
    this.timeout(40000);
  }

  async function record() {
    const {target, frontend} = getBrowserAndPages();
    await target.bringToFront();
    await frontend.bringToFront();
    await frontend.waitForSelector('pierce/.settings');
    await target.bringToFront();
    const element = await target.waitForSelector('a[href="recorder2.html"]');
    await element?.click();
    await frontend.bringToFront();
  }

  describe('Export', () => {
    beforeEach(async () => {
      const {frontend} = getBrowserAndPages();
      // Mock the extension integration part and provide a test impl using RecorderPluginManager.
      await frontend.evaluate(`
        (async function () {
          const Extensions = await import('./models/extensions/extensions.js');
          const manager = Extensions.RecorderPluginManager.RecorderPluginManager.instance();
          manager.addPlugin({
            getName() {
              return 'TestExtension';
            },
            getMediaType() {
              return 'text/javascript';
            },
            stringify() {
              return Promise.resolve('stringified');
            },
            getCapabilities() {
              return ['export'];
            }
          })
        })();
      `);
      await enableAndOpenRecorderPanel('recorder/recorder.html');
      await createAndStartRecording('Test');
      await record();
      await stopRecording();
    });

    const tests = [
      ['JSON', 'Test.json', '"type": "click"'],
      ['@puppeteer/replay', 'Test.js', '\'@puppeteer/replay\''],
      ['Puppeteer', 'Test.js', '\'puppeteer\''],
      ['Puppeteer (including Lighthouse analysis)', 'Test.js', '\'puppeteer\''],
      ['TestExtension', 'Test.js', 'stringified'],
    ];

    for (const [button, filename, expectedSubstring] of tests) {
      it(`should ${button.toLowerCase()}`, async () => {
        const {frontend} = getBrowserAndPages();
        const exportButton = await waitForAria('Export');
        await exportButton.click();
        const exportMenuItem = await waitForAria(button);
        await frontend.evaluate(`
          window.showSaveFilePicker = (opts) => {
            window.__suggestedFilename = opts.suggestedName;
            return {
              async createWritable() {
                let data = '';
                return {
                  write(part) {
                    data += part;
                  },
                  close() {
                    window.__writtenFile = data;
                  }
                }
              }
            };
          }
        `);
        await exportMenuItem.click();
        const suggestedName = await waitForFunction(async () => {
          return await frontend.evaluate('window.__suggestedFilename');
        });
        const content = (await frontend.evaluate(
                            'window.__writtenFile',
                            )) as string;
        assert.strictEqual(suggestedName, filename);
        assert.isTrue(content.includes(expectedSubstring));
      });
    }
  });
});
