// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {goToResource} from '../../shared/helper.js';

import {checkCommandResultFunction, navigateToConsoleTab} from '../helpers/console-helpers.js';

describe('The Console Tab', () => {
  describe('provides a command line API', () => {
    beforeEach(async () => {
      await goToResource('../resources/console/command-line-api.html');
      await navigateToConsoleTab();
    });

    describe('getEventListeners', () => {
      const checkCommandResult = checkCommandResultFunction(0);

      it('which yields inner listeners correctly', async () => {
        await checkCommandResult(
            'innerListeners();',
            '{keydown: Array(2), wheel: Array(1)}',
        );
      });

      it('which yields inner listeners correctly after removal', async () => {
        await checkCommandResult(
            'removeInnerListeners(); getEventListeners(innerElement());',
            '{keydown: Array(1)}',
        );
      });

      it('which yields the correct event listeners for an element', async () => {
        await checkCommandResult(
            'getEventListeners(document.getElementById("outer"));',
            '{mousemove: Array(1), mousedown: Array(1), keydown: Array(1), keyup: Array(1)}',
        );
      });

      it('which yields the correct event listeners for a button', async () => {
        await checkCommandResult(
            'getEventListeners(document.getElementById("button"));',
            '{click: Array(1), mouseover: Array(1)}',
        );
      });

      it('which yields the correct event listeners for the window object', async () => {
        await checkCommandResult(
            'getEventListeners(window);',
            '{popstate: Array(1)}',
        );
      });

      it('which yields the correct event listeners for an empty element', async () => {
        await checkCommandResult('getEventListeners(document.getElementById("empty"));', '{}');
      });

      it('which yields the correct event listeners for an invalid element', async () => {
        await checkCommandResult('getEventListeners(document.getElementById("invalid"));', '{}');
      });

      it('which yields the correct event listeners for an empty object', async () => {
        await checkCommandResult('getEventListeners({});', '{}');
      });

      it('which yields the correct event listeners are for a null and undefined values', async () => {
        await checkCommandResult('getEventListeners(null);', '{}');
        await checkCommandResult('getEventListeners(undefined);', '{}');
      });
    });
  });
});
