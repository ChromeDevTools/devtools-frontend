// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import type * as LighthouseModule from './lighthouse.js';

describeWithEnvironment('RadioSetting', () => {
  let lighthouse: typeof LighthouseModule;
  let setting: Common.Settings.Setting<string>;
  const options = [
    {value: 'a', label: () => 'Option A' as Common.UIString.LocalizedString},
    {
      value: 'b',
      label: () => 'Option B' as Common.UIString.LocalizedString,
      tooltip: () => 'Option B tooltip' as Common.UIString.LocalizedString,
    },
    {value: 'c', label: () => 'Option C' as Common.UIString.LocalizedString},
  ];

  beforeEach(async () => {
    lighthouse = await import('./lighthouse.js');
    setting = Common.Settings.Settings.instance().createSetting('test-radio-setting', 'b',
                                                                Common.Settings.SettingStorageType.LOCAL);
    setting.set('b');
  });

  it('renders correctly', async () => {
    const radioSetting = new lighthouse.RadioSetting.RadioSetting();
    radioSetting.options = options;
    radioSetting.setting = setting;
    radioSetting.description = 'Test Radio Setting';
    renderElementIntoDOM(radioSetting, {includeCommonStyles: true});
    await radioSetting.updateComplete;

    await assertScreenshot('lighthouse/RadioSetting.png');
  });

  describe('presenter', () => {
    async function createPresenter() {
      const view = createViewFunctionStub(lighthouse.RadioSetting.RadioSetting);
      const radioSetting = new lighthouse.RadioSetting.RadioSetting(undefined, view);
      radioSetting.options = options;
      radioSetting.setting = setting;
      radioSetting.description = 'Test Radio Setting';
      radioSetting.label = 'Test label';
      renderElementIntoDOM(radioSetting);
      const input = await view.nextInput;
      return {view, radioSetting, input};
    }

    it('passes the options and the current setting value to the view', async () => {
      const {input} = await createPresenter();

      assert.strictEqual(input.options, options);
      assert.strictEqual(input.name, 'test-radio-setting');
      assert.strictEqual(input.value, 'b');
      assert.strictEqual(input.description, 'Test Radio Setting');
      assert.strictEqual(input.label, 'Test label');
    });

    it('updates the setting when an option is selected', async () => {
      const {view, input} = await createPresenter();

      input.onChange('c');

      assert.strictEqual(setting.get(), 'c');
      assert.strictEqual((await view.nextInput).value, 'c');
    });

    it('re-renders when the setting changes', async () => {
      const {view} = await createPresenter();

      setting.set('a');

      assert.strictEqual((await view.nextInput).value, 'a');
    });

    it('stops listening to the setting when hidden', async () => {
      const {view, radioSetting} = await createPresenter();
      const callCount = view.callCount;

      radioSetting.detach();
      setting.set('a');
      await radioSetting.updateComplete;

      sinon.assert.callCount(view, callCount);
    });

    it('does not render without a setting', async () => {
      const view = createViewFunctionStub(lighthouse.RadioSetting.RadioSetting);
      const radioSetting = new lighthouse.RadioSetting.RadioSetting(undefined, view);
      renderElementIntoDOM(radioSetting);
      await radioSetting.updateComplete;

      sinon.assert.notCalled(view);
    });
  });

  describe('view', () => {
    function renderView(onChange = sinon.stub()): HTMLElement {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      const input: LighthouseModule.RadioSetting.ViewInput = {
        options,
        name: 'test-radio-setting',
        value: 'b',
        description: 'Test Radio Setting',
        label: 'Test label',
        onChange,
      };
      lighthouse.RadioSetting.DEFAULT_VIEW(input, undefined, target);
      return target;
    }

    it('renders a radio group with one radio button per option', () => {
      const target = renderView();

      assert.strictEqual(target.getAttribute('role'), 'radiogroup');
      assert.strictEqual(target.getAttribute('aria-label'), 'Test label');
      assert.strictEqual(target.getAttribute('aria-description'), 'Test Radio Setting');
      const radios = [...target.querySelectorAll<HTMLInputElement>('.lighthouse-radio input[type="radio"]')];
      assert.deepEqual(radios.map(radio => radio.value), ['a', 'b', 'c']);
      assert.deepEqual(radios.map(radio => radio.name), [
        'test-radio-setting',
        'test-radio-setting',
        'test-radio-setting',
      ]);
      assert.deepEqual(radios.map(radio => radio.checked), [false, true, false]);
      assert.deepEqual(radios.map(radio => radio.title),
                       ['Test Radio Setting', 'Option B tooltip', 'Test Radio Setting']);
      const labels = [...target.querySelectorAll('.lighthouse-radio-text')];
      assert.deepEqual(labels.map(label => label.textContent), ['Option A', 'Option B', 'Option C']);
    });

    it('calls onChange with the value of the selected option', () => {
      const onChange = sinon.stub();
      const target = renderView(onChange);

      const radio = target.querySelector<HTMLInputElement>('input[value="c"]');
      assert.isOk(radio);
      radio.click();

      sinon.assert.calledOnceWithExactly(onChange, 'c');
    });
  });
});
