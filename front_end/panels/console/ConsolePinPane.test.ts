// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Console from './console.js';

describeWithEnvironment('ConsolePinPane', () => {
  it('correctly deletes the second pin when three pins exist', async () => {
    const consolePinPane = new Console.ConsolePinPane.ConsolePinPane(() => {});
    renderElementIntoDOM(consolePinPane);
    consolePinPane.wasShown();

    consolePinPane.addPin('1');
    consolePinPane.addPin('2');
    consolePinPane.addPin('3');

    await UI.Widget.Widget.allUpdatesComplete;

    const pins = consolePinPane.element.shadowRoot?.querySelectorAll('.console-pin');
    assert.strictEqual(pins?.length, 3, 'There should be 3 pins');

    const secondPinDeleteButton = pins?.[1].querySelector('.close-button');
    assert.exists(secondPinDeleteButton, 'Second pin should have a delete button');

    (secondPinDeleteButton as HTMLElement).click();

    await UI.Widget.Widget.allUpdatesComplete;

    const remainingPins = consolePinPane.element.shadowRoot?.querySelectorAll('.console-pin');
    assert.strictEqual(remainingPins?.length, 2, 'There should be 2 pins remaining');

    const pinTexts = Array.from(remainingPins || []).map(p => {
      return p.querySelector('devtools-text-editor')?.state.doc.toString();
    });
    assert.deepEqual(pinTexts, ['1', '3'], 'Remaining pins should have expressions "1" and "3"');
  });
});
