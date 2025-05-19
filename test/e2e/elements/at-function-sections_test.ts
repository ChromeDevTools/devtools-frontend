// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  click,
  waitFor,
  waitForElementWithTextContent,
  waitForFunction,
  waitForMany,
} from '../../shared/helper.js';
import {
  getStyleRule,
  goToResourceAndWaitForStyleSection,
  SECTION_SUBTITLE_SELECTOR,
  STYLE_PROPERTIES_SELECTOR,
  waitForAndClickTreeElementWithPartialText,
  waitForStyleRule,
} from '../helpers/elements-helpers.js';

async function getStyleRuleProperties(selector: string, count: number) {
  const rule = await getStyleRule(selector);
  const propertyElements = await waitForMany(STYLE_PROPERTIES_SELECTOR + ' .webkit-css-property', count, rule);
  const properties = await Promise.all(propertyElements.map(e => e.evaluate(e => e.textContent)));
  properties.sort();
  const subtitle = await waitFor(SECTION_SUBTITLE_SELECTOR, rule).then(e => e.evaluate(e => e.textContent));

  return {properties, subtitle};
}

describe('The styles pane', () => {
  it('shows css functions', async () => {
    await goToResourceAndWaitForStyleSection('elements/at-function.html');
    await waitForStyleRule('body');
    await waitForAndClickTreeElementWithPartialText('id=\u200B"test1"');
    await waitForStyleRule('#test1');

    assert.deepEqual(await getStyleRuleProperties('--f(--x)', 4), {
      properties: ['--myVar', '--y', '--y', 'result'],
      subtitle: '<style>',
    });
  });

  it('shows a foldable @function section when there are 5 or less functions', async () => {
    await goToResourceAndWaitForStyleSection('elements/at-function.html');
    await waitForStyleRule('body');
    await waitForAndClickTreeElementWithPartialText('id=\u200B"test1"');
    await waitForStyleRule('#test1');

    const stylesPane = await waitFor('div.styles-pane');
    {
      const section = await waitForElementWithTextContent('@function', stylesPane);
      assert.deepEqual(await section.evaluate(e => e.ariaExpanded), 'true');
      const rule = await getStyleRule('--f(--x)');
      assert.isTrue(await rule.evaluate(e => !e.classList.contains('hidden')));
    }

    {
      const section = await click('pierceShadowText/@function', {root: stylesPane});
      await waitForFunction(async () => 'false' === await section.evaluate(e => e.ariaExpanded));
      const rule = await getStyleRule('--f(--x)');
      await waitForFunction(() => rule.evaluate(e => e.classList.contains('hidden')));
    }
  });

  it('shows a collapsed @function section when there are more than 5 functions', async () => {
    await goToResourceAndWaitForStyleSection('elements/at-function.html');
    await waitForStyleRule('body');
    await waitForAndClickTreeElementWithPartialText('id=\u200B"test3"');
    await waitForStyleRule('#test3');

    const stylesPane = await waitFor('div.styles-pane');
    {
      const section = await waitForElementWithTextContent('@function', stylesPane);
      assert.deepEqual(await section.evaluate(e => e.ariaExpanded), 'false');
      // Pick the style rule added last to ensure the sections are fully drawn
      const rule = await getStyleRule('--inner1(--x)');
      assert.isTrue(await rule.evaluate(e => e.classList.contains('hidden')));
    }

    await waitForFunction(async () => {
      const section = await click('pierceShadowText/@function', {root: stylesPane});
      await waitForFunction(async () => 'true' === await section.evaluate(e => e.ariaExpanded));
      const rule = await getStyleRule('--inner1(--x)');
      return await rule.evaluate(e => !e.classList.contains('hidden'));
    });
  });

  it('expands @function section when a function link is clicked', async () => {
    await goToResourceAndWaitForStyleSection('elements/at-function.html');
    await waitForStyleRule('body');
    await waitForAndClickTreeElementWithPartialText('id=\u200B"test3"');
    await waitForStyleRule('#test3');

    const stylesPane = await waitFor('div.styles-pane');
    const section = await waitForElementWithTextContent('@function', stylesPane);
    {
      assert.deepEqual(await section.evaluate(e => e.ariaExpanded), 'false');
      // Pick the style rule added last to ensure the sections are fully drawn
      const rule = await getStyleRule('--inner1(--x)');
      assert.isTrue(await rule.evaluate(e => e.classList.contains('hidden')));
    }

    await waitForFunction(async () => {
      await click('[aria-label="CSS property value: --outer(yellow)"] button[role="link"]');
      await waitForFunction(async () => 'true' === await section.evaluate(e => e.ariaExpanded));
      const rule = await getStyleRule('--inner1(--x)');
      return await rule.evaluate(e => !e.classList.contains('hidden'));
    });
  });
});
