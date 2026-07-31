// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';

import * as EmulationSettings from './emulation.js';

describeWithEnvironment('DevicesSettingsTab', () => {
  it('instantiates and renders categorized device groups without orphan node errors', () => {
    const tab = new EmulationSettings.DevicesSettingsTab.DevicesSettingsTab();
    tab.markAsRoot();
    renderElementIntoDOM(tab);

    const groupTitles = tab.contentElement.querySelectorAll('.device-group-title');
    const titles = [...groupTitles].map(el => el.textContent);
    assert.include(titles, 'Mobile');
    assert.include(titles, 'Foldables');
    assert.include(titles, 'Tablets & Desktops');
    assert.include(titles, 'Smart Displays');

    tab.detach();
  });
});
