// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  click,
  getBrowserAndPages,
  hover,
  waitFor,
  waitForAria,
  waitForElementWithTextContent,
  waitForFunction,
  waitForMany,
  waitForNone,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  ELEMENTS_PANEL_SELECTOR,
  getStyleRule,
  goToResourceAndWaitForStyleSection,
  SECTION_SUBTITLE_SELECTOR,
  STYLE_PROPERTIES_SELECTOR,
} from '../helpers/elements-helpers.js';

async function getStyleRuleProperties(selector: string, count: number) {
  const rule = await getStyleRule(selector);
  const propertyElements = await waitForMany(STYLE_PROPERTIES_SELECTOR, count, rule);
  const properties = await Promise.all(propertyElements.map(e => e.evaluate(e => e.textContent)));
  properties.sort();
  const subtitle = await waitFor(SECTION_SUBTITLE_SELECTOR, rule).then(e => e.evaluate(e => e.textContent));

  return {properties, subtitle};
}

describe('The styles pane', () => {
  it('shows syntax mismatches as invalid properties', async () => {
    await goToResourceAndWaitForStyleSection('elements/at-property.html');
    await waitFor('.invalid-property-value:has(> [aria-label="CSS property name: --my-color"])');
  });

  it('shows a parser error message popover on syntax mismatches', async () => {
    await goToResourceAndWaitForStyleSection('elements/at-property.html');
    await hover('.invalid-property-value:has(> [aria-label="CSS property name: --my-color"]) .exclamation-mark');

    const popover = await waitFor('.variable-value-popup-wrapper');
    const popoverContents = (await popover.evaluate(e => e.textContent))?.trim()?.replaceAll(/\s\s+/g, ', ');

    assert.deepEqual(popoverContents, 'Invalid property value, expected type "<color>", View registered property');
  });

  it('correctly determines the computed value for non-overriden properties', async () => {
    await goToResourceAndWaitForStyleSection('elements/at-property.html');
    const myColorProp = await waitForAria('CSS property value: var(--my-cssom-color)');
    await waitFor('.link-swatch-link[data-title="orange"]', myColorProp);
  });

  it('shows registered properties', async () => {
    await goToResourceAndWaitForStyleSection('elements/at-property.html');
    assert.deepStrictEqual(await getStyleRuleProperties('--my-color', 3), {
      properties: ['    inherits: false;', '    initial-value: red;', '    syntax: "<color>";'],
      subtitle: '<style>',
    });
    assert.deepStrictEqual(await getStyleRuleProperties('--my-color2', 3), {
      properties: ['    inherits: false;', '    initial-value: #c0ffee;', '    syntax: "<color>";'],
      subtitle: '<style>',
    });
    assert.deepStrictEqual(await getStyleRuleProperties('--my-cssom-color', 3), {
      properties: ['    inherits: false;', '    initial-value: orange;', '    syntax: "<color>";'],
      subtitle: 'CSS.registerProperty',
    });
  });

  it('shows a foldable @property section when there are 5 or less registered properties', async () => {
    await goToResourceAndWaitForStyleSection('elements/at-property.html');

    const stylesPane = await waitFor('div.styles-pane');
    {
      const section = await waitForElementWithTextContent('@property', stylesPane);
      assert.deepStrictEqual(await section.evaluate(e => e.ariaExpanded), 'true');
      const rule = await getStyleRule('--my-color');
      assert.isTrue(await rule.evaluate(e => !e.classList.contains('hidden')));
    }

    {
      const section = await click('pierceShadowText/@property', {root: stylesPane});
      await waitForFunction(async () => 'false' === await section.evaluate(e => e.ariaExpanded));
      const rule = await getStyleRule('--my-color');
      await waitForFunction(() => rule.evaluate(e => e.classList.contains('hidden')));
    }
  });

  it('shows a collapsed @property section when there are more than 5 registered properties', async () => {
    await goToResourceAndWaitForStyleSection('elements/at-property.html');
    const {target, frontend} = getBrowserAndPages();

    // Add some properties to go above the threshold
    await target.evaluate(() => {
      for (let n = 0; n < 5; ++n) {
        CSS.registerProperty({name: `--custom-prop-${n}`, inherits: false, syntax: '<length>', initialValue: '0px'});
      }
    });

    await frontend.reload();

    const stylesPane = await waitFor('div.styles-pane');
    {
      const section = await waitForElementWithTextContent('@property', stylesPane);
      assert.deepStrictEqual(await section.evaluate(e => e.ariaExpanded), 'false');
      const rule = await getStyleRule('--my-color');
      assert.isTrue(await rule.evaluate(e => e.classList.contains('hidden')));
    }

    {
      const section = await click('pierceShadowText/@property', {root: stylesPane});
      await waitForFunction(async () => 'true' === await section.evaluate(e => e.ariaExpanded));
      const rule = await getStyleRule('--my-color');
      await waitForFunction(() => rule.evaluate(e => !e.classList.contains('hidden')));
    }
  });

  it('shows registration information in a variable popover', async () => {
    async function hoverVariable(label: string) {
      const isValue = label.startsWith('var(');
      if (isValue) {
        const prop = await waitForAria(`CSS property value: ${label}`);
        await hover('.link-swatch-link', {root: prop});
      } else {
        await hover(`aria/CSS property name: ${label}`);
      }

      const firstSection = await waitFor('.variable-value-popup-wrapper');
      const textContent = await firstSection.evaluate((e: Element|null) => {
        const results = [];
        while (e) {
          results.push(e.textContent);
          e = e.nextElementSibling;
        }
        return results;
      });
      const popoverContents = textContent.join(' ').trim().replaceAll(/\s\s+/g, ', ');

      await hover(ELEMENTS_PANEL_SELECTOR);
      await waitForNone('.variable-value-popup-wrapper');

      return popoverContents;
    }
    await goToResourceAndWaitForStyleSection('elements/at-property.html');

    assert.strictEqual(
        await hoverVariable('var(--my-cssom-color)'),
        'orange, syntax: "<color>", inherits: false, initial-value: orange, View registered property');

    assert.strictEqual(
        await hoverVariable('--my-color'),
        'red, syntax: "<color>", inherits: false, initial-value: red, View registered property');
    assert.strictEqual(
        await hoverVariable('var(--my-color)'),
        'red, syntax: "<color>", inherits: false, initial-value: red, View registered property');

    assert.strictEqual(
        await hoverVariable('--my-color2'),
        'gray, syntax: "<color>", inherits: false, initial-value: #c0ffee, View registered property');
    assert.strictEqual(
        await hoverVariable('var(--my-color2)'),
        'gray, syntax: "<color>", inherits: false, initial-value: #c0ffee, View registered property');

    assert.strictEqual(await hoverVariable('--my-other-color'), 'green');
    assert.strictEqual(await hoverVariable('var(--my-other-color)'), 'green');
  });
});
