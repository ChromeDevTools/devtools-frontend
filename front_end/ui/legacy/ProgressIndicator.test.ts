// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, describe, it} from 'mocha';
import sinon from 'sinon';

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';

import * as UI from './legacy.js';

describe('ProgressIndicator', () => {
  setupLocaleHooks();
  let indicator: UI.ProgressIndicator.ProgressIndicator|undefined;

  afterEach(() => {
    indicator?.remove();
    indicator = undefined;
  });

  it('sets canceled and dispatches canceled event when stop button is clicked', () => {
    indicator = new UI.ProgressIndicator.ProgressIndicator();
    renderElementIntoDOM(indicator);
    const onCanceled = sinon.spy();
    indicator.addEventListener('canceled', onCanceled);

    const stopButton = indicator.shadowRoot?.querySelector<HTMLElement>('.progress-indicator-shadow-stop-button');
    assert.exists(stopButton);
    stopButton.click();

    assert.isTrue(indicator.canceled);
    sinon.assert.calledOnce(onCanceled);
  });
});
