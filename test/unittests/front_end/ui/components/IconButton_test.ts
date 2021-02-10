// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UIComponents from '../../../../../front_end/ui/components/components.js';

import {assertElement, assertElements, assertShadowRoot, renderElementIntoDOM} from '../../helpers/DOMHelpers.js';

const {assert} = chai;

const renderIconButton = (data: UIComponents.IconButton.IconButtonData):
    {component: UIComponents.IconButton.IconButton, shadowRoot: ShadowRoot} => {
      const component = new UIComponents.IconButton.IconButton();
      component.data = data;
      renderElementIntoDOM(component);
      assertShadowRoot(component.shadowRoot);
      return {component, shadowRoot: component.shadowRoot};
    };

const defaultIcon: UIComponents.IconButton.IconWithTextData = {
  iconName: 'error_icon',
  iconColor: '#1a73e8',
  text: '1',
};

export const extractIconGroups =
    (shadowRoot: ShadowRoot): {iconData: UIComponents.Icon.IconData, label: string|null}[] => {
      const icons = shadowRoot.querySelectorAll('.status-icon');
      assertElements(icons, UIComponents.Icon.Icon);
      const labels = shadowRoot.querySelectorAll('.icon-button-title');
      assertElements(labels, HTMLSpanElement);
      assert(icons.length === labels.length, 'Expected icons and labels to appear in pairs');
      const iconGroups = [];
      for (let i = 0; i < icons.length; ++i) {
        iconGroups.push({iconData: icons[i].data, label: labels[i].textContent});
      }
      return iconGroups;
    };

describe('IconButton', () => {
  it('renders correctly with one icon', () => {
    const {shadowRoot} = renderIconButton({clickHandler: () => {}, groups: [defaultIcon]});

    const icons = extractIconGroups(shadowRoot);
    assert.strictEqual(icons.length, 1);
    assert.deepEqual(icons.map(c => c.label), ['1']);
    const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
    assert.deepEqual(iconNames, ['error_icon']);
  });

  it('renders correctly with two icons', () => {
    const {shadowRoot} = renderIconButton({
      clickHandler: () => {},
      groups: [
        defaultIcon,
        {
          iconName: 'warning_icon',
          iconColor: '#1a73e8',
          text: '12',
        },
      ],
    });

    const icons = extractIconGroups(shadowRoot);
    assert.strictEqual(icons.length, 2);
    assert.deepEqual(icons.map(c => c.label), ['1', '12']);
    const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
    assert.deepEqual(iconNames, ['error_icon', 'warning_icon']);
  });

  it('renders correctly with two icons where one text is undefined', () => {
    const {shadowRoot} = renderIconButton({
      clickHandler: () => {},
      groups: [
        {
          iconName: 'warning_icon',
          iconColor: '#1a73e8',
          text: undefined,
        },
        defaultIcon,
      ],
    });

    const icons = extractIconGroups(shadowRoot);
    assert.strictEqual(icons.length, 1);
    assert.deepEqual(icons.map(c => c.label), ['1']);
    const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
    assert.deepEqual(iconNames, ['error_icon']);
  });

  describe('setCounts', () => {
    it('renders correctly with two icons', () => {
      const {component, shadowRoot} = renderIconButton({
        clickHandler: () => {},
        groups: [
          {
            iconName: 'warning_icon',
            iconColor: '#1a73e8',
            text: undefined,
          },
          defaultIcon,
        ],
      });
      component.setTexts(['31', '32']);

      const icons = extractIconGroups(shadowRoot);
      assert.strictEqual(icons.length, 2);
      assert.deepEqual(icons.map(c => c.label), ['31', '32']);
      const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
      assert.deepEqual(iconNames, ['warning_icon', 'error_icon']);
    });
  });

  describe('click event', () => {
    it('is dispatched from button', async () => {
      let clickHandler: () => void = () => {};
      const clicked = new Promise<void>(r => {
        clickHandler = r;
      });
      const {shadowRoot} = renderIconButton({clickHandler, groups: [defaultIcon]});
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
      const {shadowRoot} = renderIconButton({clickHandler, groups: [defaultIcon]});
      const icon = shadowRoot.querySelector('.icon-button');
      assertElement(icon, HTMLButtonElement);
      icon.click();
      await clicked;
    });
  });
});
