// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../../core/sdk/sdk.js';
import * as PanelsCommon from '../../../panels/common/common.js';
import * as MobileThrottling from '../../../panels/mobile_throttling/mobile_throttling.js';
import {assertScreenshot, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';

import * as Components from './components.js';

const {CPUThrottlingSelector, DEFAULT_VIEW} = Components.CPUThrottlingSelector;

const DEFAULT_INPUT: Parameters<typeof DEFAULT_VIEW>[0] = {
  groups: [
    {
      name: 'first group',
      items: [
        PanelsCommon.CPUThrottlingOption.NoThrottlingOption,
        PanelsCommon.CPUThrottlingOption.MidTierThrottlingOption,
        PanelsCommon.CPUThrottlingOption.LowTierThrottlingOption,
        PanelsCommon.CPUThrottlingOption.ExtraSlowThrottlingOption,
      ],
    },
    {
      name: 'second group',
      items: [
        PanelsCommon.CPUThrottlingOption.CalibratedLowTierMobileThrottlingOption,
        PanelsCommon.CPUThrottlingOption.CalibratedMidTierMobileThrottlingOption,
      ],
    },
  ],
  currentOption: PanelsCommon.CPUThrottlingOption.NoThrottlingOption,
  recommendedOption: null,
  throttling: {},
  onMenuItemSelected: () => {},
  onCalibrateClick: () => {},
} as const;

describeWithEnvironment('CPUThrottlingSelector view', () => {
  it('renders all CPU throttling options', async () => {
    const element = document.createElement('div');
    renderElementIntoDOM(element);

    DEFAULT_VIEW(DEFAULT_INPUT, undefined, element);

    const menuItems = element.querySelectorAll('option');

    assert.lengthOf(menuItems, 6);

    assert.strictEqual(menuItems[0].value, '1');
    assert.isTrue(menuItems[0].selected);
    assert.match(menuItems[0].innerText, /No throttling/);

    assert.strictEqual(menuItems[1].value, '4');
    assert.isFalse(menuItems[1].selected);
    assert.match(menuItems[1].innerText, /4× slowdown/);

    assert.strictEqual(menuItems[2].value, '6');
    assert.isFalse(menuItems[2].selected);
    assert.match(menuItems[2].innerText, /6× slowdown/);

    assert.strictEqual(menuItems[3].value, '20');
    assert.isFalse(menuItems[3].selected);
    assert.match(menuItems[3].innerText, /20× slowdown/);

    assert.strictEqual(menuItems[4].value, 'low-tier-mobile');
    assert.isFalse(menuItems[4].selected);
    assert.match(menuItems[4].innerText, /Low-tier mobile/);

    assert.strictEqual(menuItems[5].value, 'mid-tier-mobile');
    assert.isFalse(menuItems[5].selected);
    assert.match(menuItems[5].innerText, /Mid-tier mobile/);
  });

  it('marks current option as selected', async () => {
    const element = document.createElement('div');
    renderElementIntoDOM(element);

    DEFAULT_VIEW({...DEFAULT_INPUT, currentOption: PanelsCommon.CPUThrottlingOption.MidTierThrottlingOption}, undefined,
                 element);

    const menuItems = element.querySelectorAll('option');

    assert.strictEqual(menuItems[0].value, '1');
    assert.isFalse(menuItems[0].selected);

    assert.strictEqual(menuItems[1].value, '4');
    assert.isTrue(menuItems[1].selected);

    assert.strictEqual(menuItems[2].value, '6');
    assert.isFalse(menuItems[2].selected);
  });

  it('renders recommended option if present', async () => {
    const element = document.createElement('div');
    renderElementIntoDOM(element);

    DEFAULT_VIEW({...DEFAULT_INPUT, recommendedOption: PanelsCommon.CPUThrottlingOption.MidTierThrottlingOption},
                 undefined, element);

    const menuItems = element.querySelectorAll('option');

    assert.strictEqual(menuItems[0].value, '1');
    assert.isTrue(menuItems[0].selected);
    assert.notMatch(menuItems[0].innerText, /recommended/);

    assert.strictEqual(menuItems[1].value, '4');
    assert.isFalse(menuItems[1].selected);
    assert.match(menuItems[1].innerText, /recommended/);

    assert.strictEqual(menuItems[2].value, '6');
    assert.isFalse(menuItems[2].selected);
    assert.notMatch(menuItems[2].innerText, /recommended/);

    assert.strictEqual(menuItems[3].value, '20');
    assert.isFalse(menuItems[3].selected);
    assert.notMatch(menuItems[3].innerText, /recommended/);
  });

  function testCalibrationItem(throttling: PanelsCommon.CPUThrottlingOption.CalibratedCPUThrottling,
                               expectedPattern: RegExp) {
    const element = document.createElement('div');
    const onCalibrateClick = sinon.spy();
    renderElementIntoDOM(element);

    DEFAULT_VIEW({
      recommendedOption: null,
      currentOption: PanelsCommon.CPUThrottlingOption.NoThrottlingOption,
      groups: [
        {
          name: 'first group',
          items: [PanelsCommon.CPUThrottlingOption.NoThrottlingOption],
        },
        {
          name: 'Calibrated presets',
          items: [
            PanelsCommon.CPUThrottlingOption.CalibratedLowTierMobileThrottlingOption,
            PanelsCommon.CPUThrottlingOption.CalibratedMidTierMobileThrottlingOption,
          ],
        },
        {
          name: 'last group',
          items: [PanelsCommon.CPUThrottlingOption.MidTierThrottlingOption],
        },
      ],
      throttling,
      onMenuItemSelected: () => {},
      onCalibrateClick,
    },
                 undefined, element);

    const menuItems = element.querySelectorAll('option');
    assert.lengthOf(menuItems, 5);
    const calibrateMenuItem = menuItems[3];

    assert.strictEqual(calibrateMenuItem.value, '-1');
    assert.isFalse(calibrateMenuItem.selected);
    assert.match(calibrateMenuItem.innerText, expectedPattern);

    calibrateMenuItem.click();
    sinon.assert.calledOnce(onCalibrateClick);
  }

  it('renders calibration item after calibrated presets', async () => {
    testCalibrationItem({}, /Calibrate/);
  });

  it('uses recalibrate wording when throttling is present', async () => {
    testCalibrationItem({low: 4, mid: 6}, /Recalibrate/);
  });

  const containerCss = `
      box-sizing: border-box;
      background-color: aqua;
    `;

  it('renders hint correctly', async () => {
    const container = document.createElement('div');
    container.style.cssText = containerCss;
    renderElementIntoDOM(container, {includeCommonStyles: true});
    DEFAULT_VIEW(
        {...DEFAULT_INPUT, recommendedOption: PanelsCommon.CPUThrottlingOption.LowTierThrottlingOption},
        undefined,
        container,
    );

    await assertScreenshot('timeline/cpu_throttling_selector_recommendation.png');
  });
});

describeWithEnvironment('CPUThrottlingSelector', () => {
  let cpuThrottlingManager: SDK.CPUThrottlingManager.CPUThrottlingManager;

  async function createWidget(recommendedOption: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption|null = null) {
    const view = createViewFunctionStub(CPUThrottlingSelector);
    const widget = new CPUThrottlingSelector(undefined, view);
    widget.markAsRoot();
    renderElementIntoDOM(widget);
    widget.recommendedOption = recommendedOption;
    await view.nextInput;
    return {view, widget};
  }

  beforeEach(() => {
    cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance({forceNew: true});
    MobileThrottling.ThrottlingManager.ThrottlingManager.instance({forceNew: true});
  });

  describe('updates CPU throttling manager on change', () => {
    let setOptionSpy: sinon.SinonSpy;

    beforeEach(() => {
      setOptionSpy =
          sinon.spy(MobileThrottling.ThrottlingManager.ThrottlingManager.instance(), 'setCPUThrottlingOption');
    });

    it('with preset option', async () => {
      const {view, widget} = await createWidget();

      view.input.onMenuItemSelected({target: {value: '4'}} as unknown as Event);

      sinon.assert.calledOnceWithExactly(setOptionSpy, PanelsCommon.CPUThrottlingOption.MidTierThrottlingOption);

      widget.detach();
    });

    it('with calibrated option', async () => {
      const {view, widget} = await createWidget();

      view.input.onMenuItemSelected({target: {value: 'low-tier-mobile'}} as unknown as Event);

      sinon.assert.calledOnceWithExactly(setOptionSpy,
                                         PanelsCommon.CPUThrottlingOption.CalibratedLowTierMobileThrottlingOption);

      widget.detach();
    });
  });

  it('reacts to changes in CPU throttling manager', async () => {
    cpuThrottlingManager.setCPUThrottlingRate(1);
    const {view, widget} = await createWidget();

    assert.strictEqual(view.input.currentOption, PanelsCommon.CPUThrottlingOption.NoThrottlingOption);

    cpuThrottlingManager.setCPUThrottlingRate(6);
    await view.nextInput;

    assert.strictEqual(view.input.currentOption, PanelsCommon.CPUThrottlingOption.LowTierThrottlingOption);

    widget.detach();
  });

  it('reacts to changes in CPU throttling manager when it is unmounted and then remounted', async () => {
    // Change the conditions before the component is put into the DOM.
    cpuThrottlingManager.setCPUThrottlingRate(6);
    const {view, widget} = await createWidget();

    // Ensure that the component picks up the new changes and has selected the right throttling setting
    assert.strictEqual(view.input.currentOption, PanelsCommon.CPUThrottlingOption.LowTierThrottlingOption);

    widget.detach();
  });
});
