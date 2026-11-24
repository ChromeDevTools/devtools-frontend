// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import type * as UI from '../../ui/legacy/legacy.js';
import * as SettingsUI from '../../ui/settings/settings.js';

import type * as LighthouseModule from './lighthouse.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('LighthouseStartView', () => {
  let lighthouse: typeof LighthouseModule;

  beforeEach(async () => {
    lighthouse = await import('./lighthouse.js');
    lighthouse.LighthouseController.clearSettingsCacheForTest();
  });

  function createStartView(): LighthouseModule.LighthouseStartView.StartView {
    const controller = {
      getFlags: () => ({mode: 'navigation'}),
      recomputePageAuditability: () => {},
    } as unknown as LighthouseModule.LighthouseController.LighthouseController;

    const panel = {
      handleTimespanStart: () => {},
      handleCompleteRun: () => {},
    } as unknown as LighthouseModule.LighthousePanel.LighthousePanel;

    return new lighthouse.LighthouseStartView.StartView(controller, panel);
  }

  it('renders correctly', async () => {
    const view = createStartView();
    renderElementIntoDOM(view, {includeCommonStyles: true});

    await assertScreenshot('lighthouse/LighthouseStartView.png');
  });

  it('renders the title as a level-1 heading for accessibility', () => {
    const view = createStartView();
    renderElementIntoDOM(view);

    const heading = view.contentElement.querySelector('h1.lighthouse-title');
    assert.isOk(heading);
    assert.strictEqual(heading.textContent?.trim(), 'Generate a Lighthouse report');
  });

  describe('renderSettingsToolbarInto', () => {
    it('builds checkbox and dropdown inputs from runtime settings', () => {
      const checkboxes = lighthouse.LighthouseStartView.TOOLBAR_CHECKBOX_SETTINGS.map(
          lighthouse.LighthouseStartView.getToolbarCheckboxInput);
      assert.deepEqual(checkboxes.map(c => c.setting.name), [
        'lighthouse.clear-storage',
        'lighthouse.enable-sampling',
      ]);
      const [throttling] = lighthouse.LighthouseStartView.TOOLBAR_DROPDOWN_SETTINGS.map(
          lighthouse.LighthouseStartView.getToolbarDropdownInput);
      assert.strictEqual(throttling.name, 'lighthouse.throttling');
      assert.deepEqual(throttling.options.map(o => o.value), ['simulate', 'devtools']);
      throttling.onChange('devtools');
      assert.strictEqual(
          Common.Settings.Settings.instance().resolve(SettingsUI.LighthouseSettings.throttlingSettingDescriptor).get(),
          'devtools');
    });

    it('renders checkboxes, dropdown options, and learn-more links in a toolbar', () => {
      const settings = Common.Settings.Settings.instance();
      const onChange = sinon.stub();
      const toolbar = document.createElement('devtools-toolbar');
      renderElementIntoDOM(toolbar);
      lighthouse.LighthouseStartView.renderSettingsToolbarInto({
        checkboxes: [{
          setting: settings.createSetting('test-clear-storage', true, Common.Settings.SettingStorageType.LOCAL),
          title: 'Clear storage' as Platform.UIString.LocalizedString,
          description: 'Clear storage description' as Platform.UIString.LocalizedString,
        }],
        dropdowns: [{
          name: 'test-throttling',
          title: 'Throttling method' as Platform.UIString.LocalizedString,
          description: 'Throttling description' as Platform.UIString.LocalizedString,
          options: [
            {label: 'Simulated' as Platform.UIString.LocalizedString, value: 'simulate'},
            {label: 'DevTools' as Platform.UIString.LocalizedString, value: 'devtools'},
          ],
          value: 'devtools',
          learnMore: urlString`https://example.com/throttling`,
          onChange,
        }],
      },
                                                               undefined, toolbar);

      assert.isTrue(toolbar.classList.contains('lighthouse-settings-toolbar'));
      const checkbox = toolbar.querySelector<UI.UIUtils.CheckboxLabel>('devtools-checkbox');
      assert.isOk(checkbox);
      assert.strictEqual(checkbox.textContent?.trim(), 'Clear storage');
      assert.isTrue(checkbox.checked);
      const select = toolbar.querySelector('select');
      assert.isOk(select);
      assert.strictEqual(select.getAttribute('aria-label'), 'Throttling method');
      assert.strictEqual(select.getAttribute('title'), 'Throttling description');
      assert.strictEqual(select.value, 'devtools');
      assert.strictEqual(toolbar.querySelector('devtools-link')?.getAttribute('href'),
                         'https://example.com/throttling');
      select.value = 'simulate';
      select.dispatchEvent(new Event('change'));
      sinon.assert.calledOnceWithExactly(onChange, 'simulate');
    });
  });
});
