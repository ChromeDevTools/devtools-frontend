// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  checkCommandResultFunction,
  navigateToConsoleTab,
} from '../../e2e/helpers/console-helpers.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import type {InspectedPage} from '../../e2e_non_hosted/shared/target-helper.js';
import {goToResource} from '../../shared/helper.js';

async function openConsoleOnTestPage(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
  await goToResource('../resources/console/command-line-api.html', {inspectedPage});
  await navigateToConsoleTab(devToolsPage);
}

describe('The Console Tab', () => {
  describe('provides a command line API', () => {
    describe('getEventListeners', () => {
      const checkCommand = checkCommandResultFunction(0);

      it('which yields inner listeners correctly', async ({devToolsPage, inspectedPage}) => {
        await openConsoleOnTestPage(devToolsPage, inspectedPage);
        await checkCommand(
            'innerListeners();',
            '{keydown: Array(2), wheel: Array(1)}',
            undefined,
            devToolsPage,
        );
      });

      it('which yields inner listeners correctly after removal', async ({devToolsPage, inspectedPage}) => {
        await openConsoleOnTestPage(devToolsPage, inspectedPage);
        await checkCommand(
            'removeInnerListeners(); getEventListeners(innerElement());',
            '{keydown: Array(1)}',
            undefined,
            devToolsPage,
        );
      });

      it('which yields the correct event listeners for an element', async ({devToolsPage, inspectedPage}) => {
        await openConsoleOnTestPage(devToolsPage, inspectedPage);
        await checkCommand(
            'getEventListeners(document.getElementById("outer"));',
            '{mousemove: Array(1), mousedown: Array(1), keydown: Array(1), keyup: Array(1)}',
            undefined,
            devToolsPage,
        );
      });

      it('which yields the correct event listeners for a button', async ({devToolsPage, inspectedPage}) => {
        await openConsoleOnTestPage(devToolsPage, inspectedPage);
        await checkCommand(
            'getEventListeners(document.getElementById("button"));',
            '{click: Array(1), mouseover: Array(1)}',
            undefined,
            devToolsPage,
        );
      });

      it('which yields the correct event listeners for the window object', async ({devToolsPage, inspectedPage}) => {
        await openConsoleOnTestPage(devToolsPage, inspectedPage);
        await checkCommand(
            'getEventListeners(window);',
            '{popstate: Array(1)}',
            undefined,
            devToolsPage,
        );
      });

      it('which yields the correct event listeners for an empty element', async ({devToolsPage, inspectedPage}) => {
        await openConsoleOnTestPage(devToolsPage, inspectedPage);
        await checkCommand('getEventListeners(document.getElementById("empty"));', '{}', undefined, devToolsPage);
      });

      it('which yields the correct event listeners for an invalid element', async ({devToolsPage, inspectedPage}) => {
        await openConsoleOnTestPage(devToolsPage, inspectedPage);
        await checkCommand('getEventListeners(document.getElementById("invalid"));', '{}', undefined, devToolsPage);
      });

      it('which yields the correct event listeners for an empty object', async ({devToolsPage, inspectedPage}) => {
        await openConsoleOnTestPage(devToolsPage, inspectedPage);
        await checkCommand('getEventListeners({});', '{}', undefined, devToolsPage);
      });

      it('which yields the correct event listeners are for a null and undefined values',
         async ({devToolsPage, inspectedPage}) => {
           await openConsoleOnTestPage(devToolsPage, inspectedPage);
           await checkCommand('getEventListeners(null);', '{}', undefined, devToolsPage);
           await checkCommand('getEventListeners(undefined);', '{}', undefined, devToolsPage);
         });
    });
  });
});
