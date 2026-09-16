// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Root from '../core/root/root.js';
import * as SDK from '../core/sdk/sdk.js';

describe('Universe API Test', () => {
  describe('ConsoleModel', () => {
    setup({
      targetUrl: 'data:text/html,<!DOCTYPE%20html><h1>DevTools%20API%20Test%20Page</h1>',
    });

    it('receives console messages emitted from inspected page in universe ConsoleModel',
       async ({inspectedPage, universe}) => {
         assert.isNotNull(universe);

         const primaryTarget = universe.targetManager.primaryPageTarget();
         assert.isNotNull(primaryTarget, 'Primary page target should exist in target manager');

         const consoleModel = primaryTarget?.model(SDK.ConsoleModel.ConsoleModel);
         assert.isNotNull(consoleModel, 'ConsoleModel should exist on primary page target');

         const messageAddedPromise = consoleModel?.once(SDK.ConsoleModel.Events.MessageAdded);

         // eslint-disable-next-line no-console
         await inspectedPage.evaluate(() => console.log('Hello from Universe API Test!'));

         const existingMessage =
             consoleModel?.messages().find(msg => msg.messageText === 'Hello from Universe API Test!');
         const consoleMessage = existingMessage ?? await messageAddedPromise;
         assert.isDefined(consoleMessage);
         assert.strictEqual(
             consoleMessage?.messageText,
             'Hello from Universe API Test!',
             'Console message should be received by universe ConsoleModel',
         );
       });
  });

  describe('Suite with setup configuration', () => {
    setup({
      creationOptions: {
        hostConfig: {
          devToolsConsoleInsights: {
            enabled: true,
            modelId: 'test-model',
            temperature: 0.7,
          },
        },
      },
    });

    it('applies hostConfig from setup creationOptions globally and to Universe', async ({universe}) => {
      assert.isNotNull(universe);
      assert.isTrue(Root.Runtime.hostConfig.devToolsConsoleInsights?.enabled);
      assert.strictEqual(Root.Runtime.hostConfig.devToolsConsoleInsights?.modelId, 'test-model');
    });
  });

  describe('Suite with targetUrl configuration', () => {
    setup({
      targetUrl: 'data:text/html,<!DOCTYPE%20html><h1>Target%20URL%20Test</h1>',
    });

    it('navigates to targetUrl before attaching universe', async ({inspectedPage}) => {
      const heading = await inspectedPage.evaluate(() => document.querySelector('h1')?.textContent);
      assert.strictEqual(heading, 'Target URL Test');
    });
  });

  describe('Suite without custom setup', () => {
    it('restores default hostConfig after previous test suite cleaned up', async () => {
      assert.isUndefined(Root.Runtime.hostConfig.devToolsConsoleInsights?.modelId);
    });
  });
});
