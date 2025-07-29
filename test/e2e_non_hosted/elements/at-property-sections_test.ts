// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  ELEMENTS_PANEL_SELECTOR,
  getStyleRule,
  goToResourceAndWaitForStyleSection,
  SECTION_SUBTITLE_SELECTOR,
  STYLE_PROPERTIES_SELECTOR,
} from '../../e2e/helpers/elements-helpers.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';

async function getStyleRuleProperties(selector: string, count: number, devToolsPage: DevToolsPage) {
  const rule = await getStyleRule(selector, devToolsPage);
  const propertyElements = await devToolsPage.waitForMany(STYLE_PROPERTIES_SELECTOR, count, rule);
  const properties = await Promise.all(propertyElements.map(e => e.evaluate(e => e.textContent)));
  properties.sort();
  const subtitle = await (await devToolsPage.waitFor(SECTION_SUBTITLE_SELECTOR, rule)).evaluate(e => e.textContent);

  return {properties, subtitle};
}

describe('The styles pane', () => {
  it('shows syntax mismatches as invalid properties', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/at-property.html', devToolsPage, inspectedPage);
    await devToolsPage.waitFor('.invalid-property-value:has(> [aria-label="CSS property name: --my-color"])');
  });

  it('shows a parser error message popover on syntax mismatches', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/at-property.html', devToolsPage, inspectedPage);
    await devToolsPage.hover(
        '.invalid-property-value:has(> [aria-label="CSS property name: --my-color"]) .exclamation-mark');

    const popover = await devToolsPage.waitFor(':popover-open devtools-css-variable-parser-error');
    const firstSection = await devToolsPage.waitFor('.variable-value-popup-wrapper', popover);
    const popoverContents = await firstSection.evaluate(e => e.deepInnerText());

    assert.deepEqual(popoverContents, 'Invalid property value, expected type "<color>"\nView registered property');
  });

  it('shows registered properties', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/at-property.html', devToolsPage, inspectedPage);
    assert.deepEqual(await getStyleRuleProperties('--my-color', 3, devToolsPage), {
      properties: ['    inherits: false;', '    initial-value: red;', '    syntax: "<color>";'],
      subtitle: '<style>',
    });
    assert.deepEqual(await getStyleRuleProperties('--my-color2', 3, devToolsPage), {
      properties: ['    inherits: false;', '    initial-value: #c0ffee;', '    syntax: "<color>";'],
      subtitle: '<style>',
    });
    assert.deepEqual(await getStyleRuleProperties('--my-cssom-color', 3, devToolsPage), {
      properties: ['    inherits: false;', '    initial-value: orange;', '    syntax: "<color>";'],
      subtitle: 'CSS.registerProperty',
    });
  });

  it('shows a foldable @property section when there are 5 or less registered properties',
     async ({devToolsPage, inspectedPage}) => {
       await goToResourceAndWaitForStyleSection('elements/at-property.html', devToolsPage, inspectedPage);

       const stylesPane = await devToolsPage.waitFor('div.styles-pane');
       {
         const section = await devToolsPage.waitForElementWithTextContent('@property', stylesPane);
         assert.deepEqual(await section.evaluate(e => e.ariaExpanded), 'true');
         const rule = await getStyleRule('--my-color', devToolsPage);
         assert.isTrue(await rule.evaluate(e => !e.classList.contains('hidden')));
       }

       {
         const section = await devToolsPage.click('pierceShadowText/@property', {root: stylesPane});
         await devToolsPage.waitForFunction(async () => 'false' === await section.evaluate(e => e.ariaExpanded));
         const rule = await getStyleRule('--my-color', devToolsPage);
         await devToolsPage.waitForFunction(() => rule.evaluate(e => e.classList.contains('hidden')));
       }
     });

  it('shows a collapsed @property section when there are more than 5 registered properties',
     async ({devToolsPage, inspectedPage}) => {
       await goToResourceAndWaitForStyleSection('elements/at-property.html', devToolsPage, inspectedPage);

       // Add some properties to go above the threshold
       await inspectedPage.evaluate(() => {
         for (let n = 0; n < 5; ++n) {
           CSS.registerProperty({name: `--custom-prop-${n}`, inherits: false, syntax: '<length>', initialValue: '0px'});
         }
       });

       await devToolsPage.reload();

       const stylesPane = await devToolsPage.waitFor('div.styles-pane');
       {
         const section = await devToolsPage.waitForElementWithTextContent('@property', stylesPane);
         assert.deepEqual(await section.evaluate(e => e.ariaExpanded), 'false');
         // Pick the style rule added last to ensure the sections are fully drawn
         const rule = await getStyleRule('--custom-prop-4', devToolsPage);
         assert.isTrue(await rule.evaluate(e => e.classList.contains('hidden')));
       }

       await devToolsPage.waitForFunction(async () => {
         const section = await devToolsPage.click('pierceShadowText/@property', {root: stylesPane});
         await devToolsPage.waitForFunction(async () => 'true' === await section.evaluate(e => e.ariaExpanded));
         const rule = await getStyleRule('--custom-prop-4', devToolsPage);
         return await rule.evaluate(e => !e.classList.contains('hidden'));
       });
     });

  it('shows registration information in a variable popover', async ({devToolsPage, inspectedPage}) => {
    async function hoverVariable(label: string, devToolsPage: DevToolsPage) {
      const isValue = label.startsWith('var(');
      if (isValue) {
        const prop = await devToolsPage.waitForAria(`CSS property value: ${label}`);
        await devToolsPage.hover('.link-swatch-link', {root: prop});
      } else {
        await devToolsPage.hover(`aria/CSS property name: ${label}`);
      }

      const popover = await devToolsPage.waitFor(':popover-open devtools-css-variable-value-view');
      const popoverContents = await popover.evaluate(e => {
        return e.deepInnerText();
      });

      await devToolsPage.hover(ELEMENTS_PANEL_SELECTOR);
      await devToolsPage.waitForNone(':popover-open devtools-css-variable-value-view');

      return popoverContents;
    }
    await goToResourceAndWaitForStyleSection('elements/at-property.html', devToolsPage, inspectedPage);

    assert.strictEqual(
        await hoverVariable('var(--my-cssom-color)', devToolsPage),
        'orange\nsyntax: "<color>"\ninherits: false\ninitial-value: orange\nView registered property');

    assert.strictEqual(
        await hoverVariable('--my-color', devToolsPage),
        'red\nsyntax: "<color>"\ninherits: false\ninitial-value: red\nView registered property');
    assert.strictEqual(
        await hoverVariable('var(--my-color)', devToolsPage),
        'red\nsyntax: "<color>"\ninherits: false\ninitial-value: red\nView registered property');

    assert.strictEqual(
        await hoverVariable('--my-color2', devToolsPage),
        'gray\nsyntax: "<color>"\ninherits: false\ninitial-value: #c0ffee\nView registered property');
    assert.strictEqual(
        await hoverVariable('var(--my-color2)', devToolsPage),
        'gray\nsyntax: "<color>"\ninherits: false\ninitial-value: #c0ffee\nView registered property');

    assert.strictEqual(await hoverVariable('--my-other-color', devToolsPage), 'green');
    assert.strictEqual(await hoverVariable('var(--my-other-color)', devToolsPage), 'green');
  });
});
