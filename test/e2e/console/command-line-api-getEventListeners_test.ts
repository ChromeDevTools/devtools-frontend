// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  goToResource,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  checkCommandResultFunction,
  navigateToConsoleTab,
} from '../helpers/console-helpers.js';

const checkCommandResult = checkCommandResultFunction(0);

describe('The Console Tab', async () => {
  it('returns the correct values when using the getEventListeners method', async () => {
    await goToResource('../resources/console/command-line-api-getEventListeners.html');
    await navigateToConsoleTab();

    await checkCommandResult(
        'innerListeners();',
        '{keydown: Array(2), wheel: Array(1)}',
        'inner listeners are not displayed correctly',
    );

    await checkCommandResult(
        'removeInnerListeners(); getEventListeners(innerElement());',
        '{keydown: Array(1)}',
        'inner listeners after removal are not displayed correctly',
    );

    await checkCommandResult(
        'getEventListeners(document.getElementById("outer"));',
        '{mousemove: Array(1), mousedown: Array(1), keydown: Array(1), keyup: Array(1)}',
        'outer listeners are not displayed correctly',
    );

    await checkCommandResult(
        'getEventListeners(document.getElementById("button"));',
        '{click: Array(1), mouseover: Array(1)}',
        'attribute event listeners are not displayed correctly',
    );

    await checkCommandResult(
        'getEventListeners(window);',
        '{popstate: Array(1)}',
        'window listeners are not displayed correctly',
    );

    await checkCommandResult(
        'getEventListeners(document.getElementById("empty"));',
        '{}',
        'empty listeners are not displayed correctly',
    );

    await checkCommandResult(
        'getEventListeners(document.getElementById("invalid"));',
        '{}',
        'invalid listeners are not displayed correctly',
    );

    await checkCommandResult(
        'getEventListeners({});',
        '{}',
        'object listeners are not displayed correctly',
    );

    await checkCommandResult(
        'getEventListeners(null);',
        '{}',
        'null listeners are not displayed correctly',
    );

    await checkCommandResult(
        'getEventListeners(undefined);',
        '{}',
        'undefined listeners are not displayed correctly',
    );
  });
});
