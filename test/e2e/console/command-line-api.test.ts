// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  checkCommandResultFunction,
  navigateToConsoleTab,
} from '../helpers/console-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

async function openConsoleOnTestPage(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
  await inspectedPage.goToResource('../resources/console/command-line-api.html');
  await navigateToConsoleTab(devToolsPage);
}

describe('The Console Tab', () => {
  describe('provides a command line API', () => {
    describe('getEventListeners', () => {
      const checkCommand = checkCommandResultFunction(0);

      it('which yields inner listeners correctly', async ({devToolsPage, inspectedPage}) => {
        await openConsoleOnTestPage(devToolsPage, inspectedPage);
        await checkCommand(devToolsPage, 'innerListeners();', '{keydown: Array(2), wheel: Array(1)}', undefined);
      });

      it('which yields inner listeners correctly after removal', async ({devToolsPage, inspectedPage}) => {
        await openConsoleOnTestPage(devToolsPage, inspectedPage);
        await checkCommand(devToolsPage, 'removeInnerListeners(); getEventListeners(innerElement());',
                           '{keydown: Array(1)}', undefined);
      });

      it('which yields the correct event listeners for an element', async ({devToolsPage, inspectedPage}) => {
        await openConsoleOnTestPage(devToolsPage, inspectedPage);
        await checkCommand(devToolsPage, 'getEventListeners(document.getElementById("outer"));',
                           '{mousemove: Array(1), mousedown: Array(1), keydown: Array(1), keyup: Array(1)}', undefined);
      });

      it('which yields the correct event listeners for a button', async ({devToolsPage, inspectedPage}) => {
        await openConsoleOnTestPage(devToolsPage, inspectedPage);
        await checkCommand(devToolsPage, 'getEventListeners(document.getElementById("button"));',
                           '{click: Array(1), mouseover: Array(1)}', undefined);
      });

      it('which yields the correct event listeners for the window object', async ({devToolsPage, inspectedPage}) => {
        await openConsoleOnTestPage(devToolsPage, inspectedPage);
        await checkCommand(devToolsPage, 'getEventListeners(window);', '{popstate: Array(1)}', undefined);
      });

      it('which yields the correct event listeners for an empty element', async ({devToolsPage, inspectedPage}) => {
        await openConsoleOnTestPage(devToolsPage, inspectedPage);
        await checkCommand(devToolsPage, 'getEventListeners(document.getElementById("empty"));', '{}', undefined);
      });

      it('which yields the correct event listeners for an invalid element', async ({devToolsPage, inspectedPage}) => {
        await openConsoleOnTestPage(devToolsPage, inspectedPage);
        await checkCommand(devToolsPage, 'getEventListeners(document.getElementById("invalid"));', '{}', undefined);
      });

      it('which yields the correct event listeners for an empty object', async ({devToolsPage, inspectedPage}) => {
        await openConsoleOnTestPage(devToolsPage, inspectedPage);
        await checkCommand(devToolsPage, 'getEventListeners({});', '{}', undefined);
      });

      it('which yields the correct event listeners are for a null and undefined values',
         async ({devToolsPage, inspectedPage}) => {
           await openConsoleOnTestPage(devToolsPage, inspectedPage);
           await checkCommand(devToolsPage, 'getEventListeners(null);', '{}', undefined);
           await checkCommand(devToolsPage, 'getEventListeners(undefined);', '{}', undefined);
         });
    });
  });
});
