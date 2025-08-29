// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getStyleRule,
  goToResourceAndWaitForStyleSection,
  SECTION_SUBTITLE_SELECTOR,
  STYLE_PROPERTIES_SELECTOR,
  waitForAndClickTreeElementWithPartialText,
  waitForStyleRule,
} from '../../e2e/helpers/elements-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

async function getStyleRuleProperties(selector: string, count: number, devToolsPage: DevToolsPage) {
  const rule = await getStyleRule(selector, devToolsPage);
  const propertyElements =
      await devToolsPage.waitForMany(STYLE_PROPERTIES_SELECTOR + ' .webkit-css-property', count, rule);
  const properties = await Promise.all(propertyElements.map(e => e.evaluate(e => e.textContent)));
  properties.sort();
  const subtitle =
      await devToolsPage.waitFor(SECTION_SUBTITLE_SELECTOR, rule).then(e => e.evaluate(e => e.textContent));

  return {properties, subtitle};
}

describe('The styles pane', () => {
  it('shows css functions', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/at-function.html', devToolsPage, inspectedPage);
    await waitForStyleRule('body', devToolsPage);
    await waitForAndClickTreeElementWithPartialText('id=\u200B"test1"', devToolsPage);
    await waitForStyleRule('#test1', devToolsPage);

    assert.deepEqual(await getStyleRuleProperties('--f(--x)', 4, devToolsPage), {
      properties: ['--myVar', '--y', '--y', 'result'],
      subtitle: '<style>',
    });
  });

  it('shows a foldable @function section when there are 5 or less functions', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/at-function.html', devToolsPage, inspectedPage);
    await waitForStyleRule('body', devToolsPage);
    await waitForAndClickTreeElementWithPartialText('id=\u200B"test1"', devToolsPage);
    await waitForStyleRule('#test1', devToolsPage);

    const stylesPane = await devToolsPage.waitFor('div.styles-pane');
    {
      const section = await devToolsPage.waitForElementWithTextContent('@function', stylesPane);
      assert.deepEqual(await section.evaluate(e => e.ariaExpanded), 'true');
      const rule = await getStyleRule('--f(--x)', devToolsPage);
      assert.isTrue(await rule.evaluate(e => !e.classList.contains('hidden')));
    }

    {
      const section = await devToolsPage.click('pierceShadowText/@function', {root: stylesPane});
      await devToolsPage.waitForFunction(async () => 'false' === await section.evaluate(e => e.ariaExpanded));
      const rule = await getStyleRule('--f(--x)', devToolsPage);
      await devToolsPage.waitForFunction(() => rule.evaluate(e => e.classList.contains('hidden')));
    }
  });

  it('shows a collapsed @function section when there are more than 5 functions',
     async ({devToolsPage, inspectedPage}) => {
       await goToResourceAndWaitForStyleSection('elements/at-function.html', devToolsPage, inspectedPage);
       await waitForStyleRule('body', devToolsPage);
       await waitForAndClickTreeElementWithPartialText('id=\u200B"test3"', devToolsPage);
       await waitForStyleRule('#test3', devToolsPage);

       const stylesPane = await devToolsPage.waitFor('div.styles-pane');
       {
         const section = await devToolsPage.waitForElementWithTextContent('@function', stylesPane);
         assert.deepEqual(await section.evaluate(e => e.ariaExpanded), 'false');
         // Pick the style rule added last to ensure the sections are fully drawn
         const rule = await getStyleRule('--inner1(--x)', devToolsPage);
         assert.isTrue(await rule.evaluate(e => e.classList.contains('hidden')));
       }

       await devToolsPage.waitForFunction(async () => {
         const section = await devToolsPage.click('pierceShadowText/@function', {root: stylesPane});
         await devToolsPage.waitForFunction(async () => 'true' === await section.evaluate(e => e.ariaExpanded));
         const rule = await getStyleRule('--inner1(--x)', devToolsPage);
         return await rule.evaluate(e => !e.classList.contains('hidden'));
       });
     });

  it('expands @function section when a function link is clicked', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/at-function.html', devToolsPage, inspectedPage);
    await waitForStyleRule('body', devToolsPage);
    await waitForAndClickTreeElementWithPartialText('id=\u200B"test3"', devToolsPage);
    await waitForStyleRule('#test3', devToolsPage);

    const stylesPane = await devToolsPage.waitFor('div.styles-pane');
    const section = await devToolsPage.waitForElementWithTextContent('@function', stylesPane);
    {
      assert.deepEqual(await section.evaluate(e => e.ariaExpanded), 'false');
      // Pick the style rule added last to ensure the sections are fully drawn
      const rule = await getStyleRule('--inner1(--x)', devToolsPage);
      assert.isTrue(await rule.evaluate(e => e.classList.contains('hidden')));
    }

    await devToolsPage.waitForFunction(async () => {
      await devToolsPage.click('[aria-label="CSS property value: --outer(yellow)"] button[role="link"]');
      await devToolsPage.waitForFunction(async () => 'true' === await section.evaluate(e => e.ariaExpanded));
      const rule = await getStyleRule('--inner1(--x)', devToolsPage);
      return await rule.evaluate(e => !e.classList.contains('hidden'));
    });
  });
});
