// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  createAndStartRecording,
  enableAndOpenRecorderPanel,
  record,
  stopRecording,
} from '../../e2e/helpers/recorder-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

describe('Recorder', function() {
  if (this.timeout() !== 0) {
    this.timeout(40000);
  }

  describe('Export', () => {
    // Mock the extension integration part and provide a test impl using RecorderPluginManager.
    async function createExtension(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
      await devToolsPage.evaluate(`
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
      await enableAndOpenRecorderPanel('recorder/recorder.html', devToolsPage, inspectedPage);
      await createAndStartRecording('Test', undefined, devToolsPage);
      await record(devToolsPage, inspectedPage);
      await stopRecording(devToolsPage);
    }

    const tests = [
      ['JSON', 'Test.json', '"type": "click"'],
      ['@puppeteer/replay', 'Test.js', '\'@puppeteer/replay\''],
      ['Puppeteer', 'Test.js', '\'puppeteer\''],
      ['Puppeteer (including Lighthouse analysis)', 'Test.js', '\'puppeteer\''],
      ['TestExtension', 'Test.js', 'stringified'],
    ];

    for (const [button, filename, expectedSubstring] of tests) {
      it(`should ${button.toLowerCase()}`, async ({inspectedPage, devToolsPage}) => {
        await createExtension(devToolsPage, inspectedPage);
        const exportButton = await devToolsPage.waitForAria('Export recording');
        await exportButton.click();
        const exportMenuItem = await devToolsPage.waitForAria(button);
        await devToolsPage.evaluate(`
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
        const suggestedName = await devToolsPage.waitForFunction(async () => {
          return await devToolsPage.evaluate('window.__suggestedFilename');
        });
        const content = (await devToolsPage.evaluate(
                            'window.__writtenFile',
                            )) as string;
        assert.strictEqual(suggestedName, filename);
        assert.isTrue(content.includes(expectedSubstring));
      });
    }
  });
});
