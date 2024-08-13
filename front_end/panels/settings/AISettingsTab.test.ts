// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as Switch from '../../ui/components/switch/switch.js';

import * as Settings from './settings.js';

describeWithEnvironment('AISettingsTab', () => {
  function isExpanded(details: Element): boolean {
    return details.classList.contains('open');
  }

  async function renderAISettings(): Promise<{
    switches: Element[],
    details: Element[],
    dropdownButtons: Element[],
  }> {
    Common.Settings.moduleSetting('console-insights-enabled').set(false);
    Common.Settings.moduleSetting('freestyler-enabled').set(true);

    const view = new Settings.AISettingsTab.AISettingsTab();
    renderElementIntoDOM(view);
    await view.render();
    assert.isNotNull(view.shadowRoot);

    const switches = Array.from(view.shadowRoot.querySelectorAll('devtools-switch'));
    assert.strictEqual(switches.length, 2);
    const details = Array.from(view.shadowRoot.querySelectorAll('.whole-row'));
    assert.strictEqual(details.length, 2);
    const dropdownButtons = Array.from(view.shadowRoot.querySelectorAll('.dropdown devtools-button'));
    assert.strictEqual(dropdownButtons.length, 2);
    return {switches, details, dropdownButtons};
  }

  it('renders', async () => {
    Common.Settings.moduleSetting('console-insights-enabled').set(true);
    Common.Settings.moduleSetting('freestyler-enabled').set(true);

    const view = new Settings.AISettingsTab.AISettingsTab();
    renderElementIntoDOM(view);
    await view.render();
    assert.isNotNull(view.shadowRoot);

    const sharedDisclaimerHeader = view.shadowRoot.querySelector('.shared-disclaimer h2');
    assert.strictEqual(sharedDisclaimerHeader?.textContent, 'Boost your productivity with Chrome AI');

    const settingCards = view.shadowRoot.querySelectorAll('.setting-card div:first-child');
    const settingNames = Array.from(settingCards).map(element => element.textContent);
    assert.deepEqual(settingNames, ['Console Insights', 'Freestyler']);
  });

  it('can turn feature on, which automatically expands it', async () => {
    const {switches, details} = await renderAISettings();
    assert.isFalse(Common.Settings.moduleSetting('console-insights-enabled').get());
    assert.isFalse(isExpanded(details[0]));

    switches[0].dispatchEvent(new Switch.Switch.SwitchChangeEvent(true));
    assert.isTrue(Common.Settings.moduleSetting('console-insights-enabled').get());
    assert.isTrue(isExpanded(details[0]));
  });

  it('can expand and collaps details via click', async () => {
    const {details, dropdownButtons} = await renderAISettings();
    assert.isFalse(isExpanded(details[0]));
    assert.isFalse(Common.Settings.moduleSetting('console-insights-enabled').get());

    (dropdownButtons[0] as HTMLElement).click();
    assert.isTrue(isExpanded(details[0]));
    assert.isFalse(Common.Settings.moduleSetting('console-insights-enabled').get());

    (dropdownButtons[0] as HTMLElement).click();
    assert.isFalse(isExpanded(details[0]));
    assert.isFalse(Common.Settings.moduleSetting('console-insights-enabled').get());
  });

  it('can turn feature off without collapsing it', async () => {
    const {switches, details, dropdownButtons} = await renderAISettings();
    (dropdownButtons[1] as HTMLElement).click();
    assert.isTrue(Common.Settings.moduleSetting('freestyler-enabled').get());
    assert.isTrue(isExpanded(details[1]));

    (switches[1].parentElement as HTMLElement).click();
    assert.isFalse(Common.Settings.moduleSetting('freestyler-enabled').get());
    assert.isTrue(isExpanded(details[1]));
  });
});
