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

describe('The Console Tab', async function() {
  beforeEach(async () => {
    await goToResource('../resources/console/command-line-api-getEventListeners.html');
    await navigateToConsoleTab();
  });

  it('inner listeners are displayed correctly', async () => {
    await checkCommandResult(
        'innerListeners();',
        '{keydown: Array(2), wheel: Array(1)}',
    );
  });

  it('inner listeners are displayed correctly after removal', async () => {
    await checkCommandResult(
        'removeInnerListeners(); getEventListeners(innerElement());',
        '{keydown: Array(1)}',
    );
  });

  it('Event listeners are gotten correctly for an element', async () => {
    await checkCommandResult(
        'getEventListeners(document.getElementById("outer"));',
        '{mousemove: Array(1), mousedown: Array(1), keydown: Array(1), keyup: Array(1)}',
    );
  });

  it('Event listeners are gotten correctly for a button', async () => {
    await checkCommandResult(
        'getEventListeners(document.getElementById("button"));',
        '{click: Array(1), mouseover: Array(1)}',
    );
  });

  it('Event listeners are gotten correctly for a window', async () => {
    await checkCommandResult(
        'getEventListeners(window);',
        '{popstate: Array(1)}',
    );
  });

  it('Event listeners are gotten correctly for an empty element', async () => {
    await checkCommandResult(
        'getEventListeners(document.getElementById("empty"));',
        '{}',
    );
  });

  it('Event listeners are gotten correctly for an invalid element', async () => {
    await checkCommandResult(
        'getEventListeners(document.getElementById("invalid"));',
        '{}',
    );
  });

  it('Event listeners are gotten correctly for an empty map', async () => {
    await checkCommandResult(
        'getEventListeners({});',
        '{}',
    );
  });

  it('Event listeners are gotten correctly for a null value', async () => {
    await checkCommandResult(
        'getEventListeners(null);',
        '{}',
    );
  });

  it('Event listeners are gotten correctly for an undefined value', async () => {
    await checkCommandResult(
        'getEventListeners(undefined);',
        '{}',
    );
  });
});
