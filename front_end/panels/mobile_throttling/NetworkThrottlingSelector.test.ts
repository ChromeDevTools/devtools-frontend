// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as MobileThrottling from './mobile_throttling.js';

const optGroupsToObject = (groups: NodeListOf<HTMLOptGroupElement>) => {
  return groups.values()
      .map(
          group => ({[group.label]: group.querySelectorAll('option').values().map(node => node.textContent).toArray()}))
      .toArray();
};

describeWithEnvironment('NetworkThrottlingSelector', () => {
  it('renders the global throttling variant', async () => {
    const widget = new MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelectorWidget();
    widget.variant = MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelect.Variant.GLOBAL_CONDITIONS;

    const select = widget.contentElement.querySelector('select');
    assert.isNotNull(select);

    const optgroups = select.querySelectorAll('optgroup');
    assert.deepEqual(optGroupsToObject(optgroups), [
      {
        Disabled: [
          'No throttling',
        ]
      },
      {
        Presets: [
          'Fast 4G',
          'Slow 4G',
          '3G',
          'Offline',
        ]
      },
      {
        Custom: [
          'Add…',
        ]
      },
    ]);
  });

  it('renders the individual request variant', async () => {
    const widget = new MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelectorWidget();
    widget.variant =
        MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelect.Variant.INDIVIDUAL_REQUEST_CONDITIONS;

    const select = widget.contentElement.querySelector('select');
    assert.isNotNull(select);

    const optgroups = select.querySelectorAll('optgroup');
    assert.deepEqual(optGroupsToObject(optgroups), [
      {
        Blocking: [
          'Block',
        ]
      },
      {
        Presets: [
          'Fast 4G',
          'Slow 4G',
          '3G',
        ]
      },
      {
        Custom: [
          'Add…',
        ]
      },
    ]);
  });

  it('sets the current conditions', async () => {
    const widget = new MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelectorWidget();
    widget.variant = MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelect.Variant.GLOBAL_CONDITIONS;
    widget.currentConditions = SDK.NetworkManager.Slow3GConditions;

    const select = widget.contentElement.querySelector('select');
    assert.isNotNull(select);

    assert.strictEqual(select.value, '3G');
  });

  it('observes change events', async () => {
    const widget = new MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelectorWidget();
    widget.variant = MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelect.Variant.GLOBAL_CONDITIONS;

    const select = widget.contentElement.querySelector('select');
    assert.isNotNull(select);

    const onConditionsChanged = sinon.stub<[SDK.NetworkManager.ThrottlingConditions]>();
    widget.onConditionsChanged = onConditionsChanged;

    select.selectedIndex = 2;
    select.dispatchEvent(new Event('change'));

    sinon.assert.calledOnceWithExactly(onConditionsChanged, SDK.NetworkManager.Slow4GConditions);
  });
});
