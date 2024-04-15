// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  assertElements,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';

import * as IconButton from './icon_button.js';

const renderIconButton = (data: IconButton.IconButton.IconButtonData):
    {component: IconButton.IconButton.IconButton, shadowRoot: ShadowRoot} => {
      const component = new IconButton.IconButton.IconButton();
      component.data = data;
      renderElementIntoDOM(component);
      assert.isNotNull(component.shadowRoot);
      return {component, shadowRoot: component.shadowRoot};
    };

const defaultIcon: IconButton.IconButton.IconWithTextData = {
  iconName: 'cross-circle',
  iconColor: 'var(--icon-error)',
  text: '1',
};

export const extractIconGroups = (shadowRoot: ShadowRoot) => {
  const icons = shadowRoot.querySelectorAll('.status-icon');
  assertElements(icons, IconButton.Icon.Icon);
  const labels = shadowRoot.querySelectorAll('.icon-button-title');
  assertElements(labels, HTMLSpanElement);
  assert(icons.length === labels.length, 'Expected icons and labels to appear in pairs');
  const iconGroups = [];
  for (let i = 0; i < icons.length; ++i) {
    const labelElement = labels[i];
    const label = window.getComputedStyle(labelElement).display === 'none' ? null : labelElement.textContent;
    iconGroups.push({iconData: icons[i].data, label});
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
    assert.deepEqual(iconNames, ['cross-circle']);
  });

  it('renders correctly with two icons', () => {
    const {shadowRoot} = renderIconButton({
      clickHandler: () => {},
      groups: [
        defaultIcon,
        {
          iconName: 'warning',
          iconColor: 'var(--icon-warning)',
          text: '12',
        },
      ],
    });

    const icons = extractIconGroups(shadowRoot);
    assert.strictEqual(icons.length, 2);
    assert.deepEqual(icons.map(c => c.label), ['1', '12']);
    const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
    assert.deepEqual(iconNames, ['cross-circle', 'warning']);
  });

  describe('compact mode', () => {
    it('renders correctly with one icon', () => {
      const {shadowRoot} = renderIconButton({clickHandler: () => {}, groups: [defaultIcon], compact: true});

      const icons = extractIconGroups(shadowRoot);
      assert.strictEqual(icons.length, 1);
      assert.deepEqual(icons.map(c => c.label), [null]);
      const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
      assert.deepEqual(iconNames, ['cross-circle']);
    });

    it('renders correctly with two icons', () => {
      const {shadowRoot} = renderIconButton({
        clickHandler: () => {},
        groups: [
          defaultIcon,
          {
            iconName: 'warning',
            iconColor: 'var(--icon-warning)',
            text: '12',
          },
        ],
        compact: true,
      });

      const icons = extractIconGroups(shadowRoot);
      assert.strictEqual(icons.length, 1);
      assert.deepEqual(icons.map(c => c.label), [null]);
      const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
      assert.deepEqual(iconNames, ['cross-circle']);
    });
  });

  it('renders correctly with two icons where one text is undefined', () => {
    const {shadowRoot} = renderIconButton({
      clickHandler: () => {},
      groups: [
        {
          iconName: 'warning',
          iconColor: 'var(--icon-warning)',
          text: undefined,
        },
        defaultIcon,
      ],
    });

    const icons = extractIconGroups(shadowRoot);
    assert.strictEqual(icons.length, 1);
    assert.deepEqual(icons.map(c => c.label), ['1']);
    const iconNames = icons.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
    assert.deepEqual(iconNames, ['cross-circle']);
  });

  it('renders correctly with a customly sized icon', () => {
    const {shadowRoot} = renderIconButton({
      clickHandler: () => {},
      groups: [
        {
          iconName: 'warning',
          iconColor: 'var(--icon-warning)',
          text: 'Text',
          iconHeight: '2ex',
          iconWidth: '3ex',
        },
      ],
    });

    const icons = extractIconGroups(shadowRoot);
    assert.strictEqual(icons.length, 1);
    const icon = icons[0];
    assert.strictEqual(icon.iconData.height, '2ex');
    assert.strictEqual(icon.iconData.width, '3ex');
  });

  describe('data getter and setter', () => {
    it('renders correctly with two icons', () => {
      const {component, shadowRoot} = renderIconButton({
        clickHandler: () => {},
        groups: [
          defaultIcon,
          {
            iconName: 'warning',
            iconColor: 'var(--icon-warning)',
            text: '31',
          },
        ],
      });

      const iconsBefore = extractIconGroups(shadowRoot);
      assert.strictEqual(iconsBefore.length, 2);
      assert.deepEqual(iconsBefore.map(c => c.label), ['1', '31']);
      const iconNamesBefore = iconsBefore.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
      assert.deepEqual(iconNamesBefore, ['cross-circle', 'warning']);

      const data = component.data;
      component.data = {...data, groups: data.groups.map((group, index) => ({...group, text: `${index}`}))};

      const iconsAfter = extractIconGroups(shadowRoot);
      assert.strictEqual(iconsAfter.length, 2);
      assert.deepEqual(iconsAfter.map(c => c.label), ['0', '1']);
      const iconNamesAfter = iconsAfter.map(c => 'iconName' in c.iconData ? c.iconData.iconName : undefined);
      assert.deepEqual(iconNamesAfter, ['cross-circle', 'warning']);
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
      assert.instanceOf(icon, IconButton.Icon.Icon);
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
      assert.instanceOf(icon, HTMLButtonElement);
      icon.click();
      await clicked;
    });
  });

  describe('border', () => {
    it('is rendered when there is a click handler', async () => {
      const {shadowRoot} = renderIconButton({clickHandler: () => {}, groups: [defaultIcon]});
      const button = shadowRoot.querySelector('.icon-button');
      assert.instanceOf(button, HTMLButtonElement);
      assert.isTrue(button.classList.contains('with-click-handler'));
    });

    it('is omitted when requested', async () => {
      const {shadowRoot} = renderIconButton({groups: [defaultIcon]});
      const button = shadowRoot.querySelector('.icon-button');
      assert.instanceOf(button, HTMLButtonElement);
      assert.isFalse(button.classList.contains('with-click-handler'));
    });
  });

  describe('leading text', () => {
    it('is rendered if provided', async () => {
      const {shadowRoot} = renderIconButton({clickHandler: () => {}, groups: [defaultIcon], leadingText: 'LEAD'});
      const texts = Array.from(shadowRoot.querySelectorAll('.icon-button-title'));
      assert.deepEqual(texts.map(x => x.textContent), ['LEAD', '1']);
    });

    it('is omitted in compact mode even if provided', async () => {
      const {shadowRoot} =
          renderIconButton({clickHandler: () => {}, groups: [defaultIcon], leadingText: 'LEAD', compact: true});
      const texts = Array.from(shadowRoot.querySelectorAll('.icon-button-title'));
      assert.deepEqual(texts.map(x => x.textContent), ['1']);
    });

    it('is omitted if not provided', async () => {
      const {shadowRoot} = renderIconButton({clickHandler: () => {}, groups: [defaultIcon]});
      const texts = Array.from(shadowRoot.querySelectorAll('.icon-button-title'));
      assert.deepEqual(texts.map(x => x.textContent), ['1']);
    });
  });

  describe('trailing text', () => {
    it('is rendered if provided', async () => {
      const {shadowRoot} = renderIconButton({clickHandler: () => {}, groups: [defaultIcon], trailingText: 'TRAIL'});
      const texts = Array.from(shadowRoot.querySelectorAll('.icon-button-title'));
      assert.deepEqual(texts.map(x => x.textContent), ['1', 'TRAIL']);
    });

    it('is omitted in compact mode even if provided', async () => {
      const {shadowRoot} =
          renderIconButton({clickHandler: () => {}, groups: [defaultIcon], trailingText: 'TRAIL', compact: true});
      const texts = Array.from(shadowRoot.querySelectorAll('.icon-button-title'));
      assert.deepEqual(texts.map(x => x.textContent), ['1']);
    });

    it('is omitted if not provided', async () => {
      const {shadowRoot} = renderIconButton({clickHandler: () => {}, groups: [defaultIcon]});
      const texts = Array.from(shadowRoot.querySelectorAll('.icon-button-title'));
      assert.deepEqual(texts.map(x => x.textContent), ['1']);
    });
  });

  describe('accessible name', () => {
    it('is rendered if provided', () => {
      const expectedAccessibleName = 'AccessibleName';
      const {shadowRoot} =
          renderIconButton({clickHandler: () => {}, groups: [defaultIcon], accessibleName: expectedAccessibleName});
      const accessibleName = shadowRoot.querySelector('button')!.getAttribute('aria-label');
      assert.deepEqual(accessibleName, expectedAccessibleName);
    });

    it('is omitted if not provided', () => {
      const {shadowRoot} = renderIconButton({clickHandler: () => {}, groups: [defaultIcon]});
      const accessibleName = shadowRoot.querySelector('button')!.getAttribute('aria-label');
      assert.isNull(accessibleName);
    });
  });
});
