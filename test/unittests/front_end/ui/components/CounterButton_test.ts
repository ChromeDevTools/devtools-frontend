// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UIComponents from '../../../../../front_end/ui/components/components.js';

import {assertElement, assertElements, assertShadowRoot, renderElementIntoDOM} from '../../helpers/DOMHelpers.js';

const {assert} = chai;

const renderCounterButton = (data: UIComponents.CounterButton.CounterButtonData):
    {component: UIComponents.CounterButton.CounterButton, shadowRoot: ShadowRoot} => {
      const component = new UIComponents.CounterButton.CounterButton();
      component.data = data;
      renderElementIntoDOM(component);
      assertShadowRoot(component.shadowRoot);
      return {component, shadowRoot: component.shadowRoot};
    };

const defaultCounter: UIComponents.CounterButton.CounterData = {
  iconName: 'error_icon',
  iconColor: '#1a73e8',
  count: 1,
};

export const extractCounters =
    (shadowRoot: ShadowRoot): {iconData: UIComponents.Icon.IconData, label: string|null}[] => {
      const icons = shadowRoot.querySelectorAll('.status-icon');
      assertElements(icons, UIComponents.Icon.Icon);
      const labels = shadowRoot.querySelectorAll('.counter-button-title');
      assertElements(labels, HTMLSpanElement);
      assert(icons.length === labels.length, 'Expected icons and labels to appear in pairs');
      const counters = [];
      for (let i = 0; i < icons.length; ++i) {
        counters.push({iconData: icons[i].data, label: labels[i].textContent});
      }
      return counters;
    };

describe('CounterButton', () => {
  it('renders correctly with one counter', () => {
    const {shadowRoot} = renderCounterButton({clickHandler: () => {}, counters: [defaultCounter]});

    const counters = extractCounters(shadowRoot);
    assert.strictEqual(counters.length, 1);
    assert.deepEqual(counters.map(c => c.label), ['1']);
    const iconNames = counters.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
    assert.deepEqual(iconNames, ['error_icon']);
  });

  it('renders correctly with two counters', () => {
    const {shadowRoot} = renderCounterButton({
      clickHandler: () => {},
      counters: [
        defaultCounter,
        {
          iconName: 'warning_icon',
          iconColor: '#1a73e8',
          count: 12,
        },
      ],
    });

    const counters = extractCounters(shadowRoot);
    assert.strictEqual(counters.length, 2);
    assert.deepEqual(counters.map(c => c.label), ['1', '12']);
    const iconNames = counters.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
    assert.deepEqual(iconNames, ['error_icon', 'warning_icon']);
  });

  it('renders correctly with two counters where one is zero', () => {
    const {shadowRoot} = renderCounterButton({
      clickHandler: () => {},
      counters: [
        {
          iconName: 'warning_icon',
          iconColor: '#1a73e8',
          count: 0,
        },
        defaultCounter,
      ],
    });

    const counters = extractCounters(shadowRoot);
    assert.strictEqual(counters.length, 1);
    assert.deepEqual(counters.map(c => c.label), ['1']);
    const iconNames = counters.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
    assert.deepEqual(iconNames, ['error_icon']);
  });

  describe('setCounts', () => {
    it('renders correctly with two counters', () => {
      const {component, shadowRoot} = renderCounterButton({
        clickHandler: () => {},
        counters: [
          {
            iconName: 'warning_icon',
            iconColor: '#1a73e8',
            count: 0,
          },
          defaultCounter,
        ],
      });
      component.setCounts([31, 32]);

      const counters = extractCounters(shadowRoot);
      assert.strictEqual(counters.length, 2);
      assert.deepEqual(counters.map(c => c.label), ['31', '32']);
      const iconNames = counters.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
      assert.deepEqual(iconNames, ['warning_icon', 'error_icon']);
    });
  });

  describe('click event', () => {
    it('is dispatched from button', async () => {
      let clickHandler: () => void = () => {};
      const clicked = new Promise<void>(r => {
        clickHandler = r;
      });
      const {shadowRoot} = renderCounterButton({clickHandler, counters: [defaultCounter]});
      const icon = shadowRoot.querySelector('.status-icon');
      assertElement(icon, UIComponents.Icon.Icon);
      icon.click();
      await clicked;
    });

    it('is dispatched from child of button', async () => {
      let clickHandler: () => void = () => {};
      const clicked = new Promise<void>(r => {
        clickHandler = r;
      });
      const {shadowRoot} = renderCounterButton({clickHandler, counters: [defaultCounter]});
      const icon = shadowRoot.querySelector('.counter-button');
      assertElement(icon, HTMLButtonElement);
      icon.click();
      await clicked;
    });
  });
});
