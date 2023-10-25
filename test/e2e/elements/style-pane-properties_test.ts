// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {
  $$,
  assertNotNullOrUndefined,
  click,
  getBrowserAndPages,
  waitFor,
  clickElement,
  waitForFunction,
  hover,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  editQueryRuleText,
  getComputedStylesForDomNode,
  getDisplayedCSSPropertyNames,
  getDisplayedCSSDeclarations,
  getDisplayedStyleRules,
  getDisplayedStyleRulesCompact,
  getStyleRule,
  getStyleSectionSubtitles,
  goToResourceAndWaitForStyleSection,
  waitForContentOfSelectedElementsNode,
  waitForPropertyToHighlight,
  waitForStyleRule,
  expandSelectedNodeRecursively,
  waitForAndClickTreeElementWithPartialText,
  focusCSSPropertyValue,
  waitForCSSPropertyValue,
} from '../helpers/elements-helpers.js';

const PROPERTIES_TO_DELETE_SELECTOR = '#properties-to-delete';
const PROPERTIES_TO_INSPECT_SELECTOR = '#properties-to-inspect';
const KEYFRAMES_100_PERCENT_RULE_SELECTOR = '100%';
const FIRST_PROPERTY_NAME_SELECTOR = '.tree-outline li:nth-of-type(1) > .webkit-css-property';
const SECOND_PROPERTY_NAME_SELECTOR = '.tree-outline li:nth-of-type(2) > .webkit-css-property';
const FIRST_PROPERTY_VALUE_SELECTOR = '.tree-outline li:nth-of-type(1) > .value';
const RULE1_SELECTOR = '.rule1';
const RULE2_SELECTOR = '.rule2';
const LAYER_SEPARATOR_SELECTOR = '.layer-separator';
const SIDEBAR_SEPARATOR_SELECTOR = '.sidebar-separator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deletePropertyByBackspace = async (selector: string, root?: puppeteer.ElementHandle<Element>) => {
  const {frontend} = getBrowserAndPages();
  await click(selector, {root});
  await frontend.keyboard.press('Backspace');
  await frontend.keyboard.press('Tab');
  await waitFor('.tree-outline .child-editing', root);
};

describe('The Styles pane', async () => {
  it(
      'can display the CSS properties of the selected element', async () => {
        await goToResourceAndWaitForStyleSection('elements/simple-styled-page.html');

        const onH1RuleAppeared = waitForStyleRule('h1');

        await waitForAndClickTreeElementWithPartialText('<h1>');
        await onH1RuleAppeared;

        await waitForFunction(async () => (await getDisplayedStyleRules()).length === 4);
        const h1Rules = await getDisplayedStyleRules();
        // Waiting for the first h1 rule, that's the authored rule, right after the element style.
        assert.deepEqual(h1Rules[1], {
          selectorText: 'body h1',
          propertyData: [{propertyName: 'color', isOverLoaded: false, isInherited: false}],
        });

        const onH2RuleAppeared = waitForStyleRule('h2');
        await waitForAndClickTreeElementWithPartialText('<h2>');
        await onH2RuleAppeared;

        await waitForFunction(async () => (await getDisplayedStyleRules()).length === 3);
        // Waiting for the first h2 rule, that's the authored rule, right after the element style.
        const h2Rules = await getDisplayedStyleRules();
        assert.deepEqual(h2Rules[1], {
          selectorText: 'h2',
          propertyData: [
            {propertyName: 'background-color', isOverLoaded: false, isInherited: false},
            {propertyName: 'color', isOverLoaded: false, isInherited: false},
          ],
        });
      });

  it('can jump to a CSS variable definition', async () => {
    await goToResourceAndWaitForStyleSection('elements/css-variables.html');

    // Select div that we will inspect the CSS variables for
    await waitForAndClickTreeElementWithPartialText('properties-to-inspect');
    await waitForContentOfSelectedElementsNode('<div id=\u200B"properties-to-inspect">\u200B</div>\u200B');

    const testElementRule = await getStyleRule(PROPERTIES_TO_INSPECT_SELECTOR);
    await click('.link-swatch-link', {root: testElementRule});

    await waitForPropertyToHighlight('html', '--title-color');
  });

  it('can jump to an unexpanded CSS variable definition', async () => {
    await goToResourceAndWaitForStyleSection('elements/css-variables-many.html');

    // Select div that we will inspect the CSS variables for
    await waitForAndClickTreeElementWithPartialText('properties-to-inspect');
    await waitForContentOfSelectedElementsNode('<div id=\u200B"properties-to-inspect">\u200B</div>\u200B');

    const testElementRule = await getStyleRule(PROPERTIES_TO_INSPECT_SELECTOR);
    await click('.link-swatch-link', {root: testElementRule});

    await waitForPropertyToHighlight('html', '--color56');
  });

  it('displays the correct value when editing CSS var() functions', async () => {
    await goToResourceAndWaitForStyleSection('elements/css-variables.html');

    // Select div that we will inspect the CSS variables for
    await waitForAndClickTreeElementWithPartialText('properties-to-inspect');
    await waitForContentOfSelectedElementsNode('<div id=\u200B"properties-to-inspect">\u200B</div>\u200B');

    const propertiesSection = await getStyleRule(PROPERTIES_TO_INSPECT_SELECTOR);

    const propertyValue = await waitFor(FIRST_PROPERTY_VALUE_SELECTOR, propertiesSection);
    // Specifying 10px from the left of the value to click on the word var rather than in the middle which would jump to
    // the property definition.
    await propertyValue.click();
    const editedValueText = await propertyValue.evaluate(node => node.textContent);
    assert.strictEqual(editedValueText, 'var(--title-color)', 'The value is incorrect when being edited');
  });

  it('generates links inside var() functions for defined properties', async () => {
    await goToResourceAndWaitForStyleSection('elements/css-variables.html');

    // Select div that we will inspect the CSS variables for
    await waitForAndClickTreeElementWithPartialText('properties-to-inspect');
    await waitForContentOfSelectedElementsNode('<div id=\u200B"properties-to-inspect">\u200B</div>\u200B');

    const propertiesSection = await getStyleRule(PROPERTIES_TO_INSPECT_SELECTOR);
    const propertyValue = await waitFor(FIRST_PROPERTY_VALUE_SELECTOR, propertiesSection);
    const link = await $$('.link-swatch-link', propertyValue);
    assert.strictEqual(link.length, 1, 'The expected var link was not created');
  });

  it('renders computed CSS variables in @keyframes rules', async () => {
    await goToResourceAndWaitForStyleSection('elements/css-variables.html');

    // Select div that we will inspect the CSS variables for
    await waitForAndClickTreeElementWithPartialText('keyframes-rule');
    await waitForContentOfSelectedElementsNode('<div id=\u200B"keyframes-rule">\u200B</div>\u200B');

    const propertiesSection = await getStyleRule(KEYFRAMES_100_PERCENT_RULE_SELECTOR);
    const propertyValue = await waitFor(FIRST_PROPERTY_VALUE_SELECTOR, propertiesSection);
    const propertyValueText = await propertyValue.evaluate(node => node.textContent);
    assert.strictEqual(
        propertyValueText, 'var( --move-final-width)', 'CSS variable in @keyframes rule is not correctly rendered');
  });

  it('can remove a CSS property when its name or value is deleted', async () => {
    await goToResourceAndWaitForStyleSection('elements/style-pane-properties.html');

    // Select div that we will remove the CSS properties from
    await waitForAndClickTreeElementWithPartialText('properties-to-delete');
    await waitForContentOfSelectedElementsNode('<div id=\u200B"properties-to-delete">\u200B</div>\u200B');

    const propertiesSection = await getStyleRule(PROPERTIES_TO_DELETE_SELECTOR);
    {
      const displayedNames = await getDisplayedCSSPropertyNames(propertiesSection);
      assert.deepEqual(
          displayedNames,
          [
            'height',
            'width',
          ],
          'incorrectly displayed style after initialization');
    }

    // select second property's name and delete
    await deletePropertyByBackspace(SECOND_PROPERTY_NAME_SELECTOR, propertiesSection);

    // verify the second CSS property entry has been removed
    {
      const displayedNames = await getDisplayedCSSPropertyNames(propertiesSection);
      assert.deepEqual(
          displayedNames,
          [
            'height',
          ],
          'incorrectly displayed style after removing second property\'s value');
    }

    // select first property's name and delete
    await deletePropertyByBackspace(FIRST_PROPERTY_NAME_SELECTOR, propertiesSection);

    // verify the first CSS property entry has been removed
    {
      const displayedValues = await getDisplayedCSSPropertyNames(propertiesSection);
      assert.deepEqual(displayedValues, [], 'incorrectly displayed style after removing first property\'s name');
    }
  });

  it('can display the source names for stylesheets', async () => {
    await goToResourceAndWaitForStyleSection('elements/stylesheets-with-various-sources.html');

    // Select the div element by pressing down, since <body> is the default selected element.
    const onDivRuleAppeared = waitForStyleRule('div');

    await waitForAndClickTreeElementWithPartialText('<div');
    await onDivRuleAppeared;

    const subtitles = await getStyleSectionSubtitles();
    assert.sameDeepMembers(
        subtitles,
        [
          '',
          'css-module.css:1',
          'constructed stylesheet',
          'stylesheets…ces.html:10',
          'stylesheets…rces.html:7',
          'user agent stylesheet',
        ],
        'incorrectly displayed style sources');

    const divRules = await getDisplayedStyleRules();
    assert.deepEqual(
        divRules,
        [
          {selectorText: 'element.style', propertyData: []},
          {
            selectorText: '#properties-to-inspect',
            propertyData: [{propertyName: 'height', isOverLoaded: false, isInherited: false}],
          },
          {
            selectorText: '#properties-to-inspect',
            propertyData: [{propertyName: 'color', isOverLoaded: false, isInherited: false}],
          },
          {
            selectorText: '#properties-to-inspect',
            propertyData: [{propertyName: 'text-align', isOverLoaded: false, isInherited: false}],
          },
          {
            selectorText: '#properties-to-inspect',
            propertyData: [{propertyName: 'width', isOverLoaded: false, isInherited: false}],
          },
          {selectorText: 'div', propertyData: [{propertyName: 'display', isOverLoaded: false, isInherited: false}]},
        ],
        'The correct rule is displayed');
  });

  it('can edit multiple constructed stylesheets', async () => {
    await goToResourceAndWaitForStyleSection('elements/multiple-constructed-stylesheets.html');

    // Select div that we will remove a CSS property from.
    await waitForAndClickTreeElementWithPartialText('<div class=\u200B"rule1 rule2">\u200B</div>\u200B');
    await waitForContentOfSelectedElementsNode('<div class=\u200B"rule1 rule2">\u200B</div>\u200B');

    // Verify that initial CSS properties correspond to the ones in the test file.
    const rule1PropertiesSection = await getStyleRule(RULE1_SELECTOR);
    const rule2PropertiesSection = await getStyleRule(RULE2_SELECTOR);
    {
      const displayedNames = await getDisplayedCSSPropertyNames(rule1PropertiesSection);
      assert.deepEqual(
          displayedNames,
          [
            'background-color',
          ],
          'incorrectly displayed style after initialization');
    }
    {
      const displayedNames = await getDisplayedCSSPropertyNames(rule2PropertiesSection);
      assert.deepEqual(
          displayedNames,
          [
            'background-color',
            'color',
          ],
          'incorrectly displayed style after initialization');
    }

    // Select the first property's name of .rule2 (background-color) and delete.
    await deletePropertyByBackspace(FIRST_PROPERTY_NAME_SELECTOR, rule2PropertiesSection);

    // Verify that .rule1 has background-color.
    {
      const displayedNames = await getDisplayedCSSPropertyNames(rule1PropertiesSection);
      assert.deepEqual(
          displayedNames,
          [
            'background-color',
          ],
          'incorrectly displayed style after property removal');
    }

    // Verify that .rule2 has background-color removed and only color remains.
    {
      const displayedNames = await getDisplayedCSSPropertyNames(rule2PropertiesSection);
      assert.deepEqual(
          displayedNames,
          [
            'color',
          ],
          'incorrectly displayed style after property removal');
    }

    // Verify that computed styles correspond to the changes made.
    const computedStyles = [
      await getComputedStylesForDomNode(RULE1_SELECTOR, 'color'),
      await getComputedStylesForDomNode(RULE1_SELECTOR, 'backgroundColor'),
    ];
    assert.deepEqual(computedStyles, ['rgb(255, 0, 0)', 'rgb(255, 0, 0)'], 'Styles are not correct after the update');
  });

  it('can display and edit container queries', async () => {
    await goToResourceAndWaitForStyleSection('elements/css-container-queries.html');

    // Select the child that has container queries.
    await waitForAndClickTreeElementWithPartialText('<div class=\u200B"rule1 rule2">\u200B</div>\u200B');
    await waitForContentOfSelectedElementsNode('<div class=\u200B"rule1 rule2">\u200B</div>\u200B');

    // Verify that initial CSS properties correspond to the ones in the test file.
    const rule1PropertiesSection = await getStyleRule(RULE1_SELECTOR);
    const rule2PropertiesSection = await getStyleRule(RULE2_SELECTOR);
    {
      const displayedNames = await getDisplayedCSSPropertyNames(rule1PropertiesSection);
      assert.deepEqual(
          displayedNames,
          [
            'width',
          ],
          'incorrectly displayed style after initialization');
    }
    {
      const displayedNames = await getDisplayedCSSPropertyNames(rule2PropertiesSection);
      assert.deepEqual(
          displayedNames,
          [
            'height',
          ],
          'incorrectly displayed style after initialization');
    }

    await editQueryRuleText(rule1PropertiesSection, '(min-width: 300px)');
    await editQueryRuleText(rule2PropertiesSection, '(max-width: 300px)');

    // Verify that computed styles correspond to the changes made.
    const computedStyles = [
      await getComputedStylesForDomNode(RULE1_SELECTOR, 'width'),
      await getComputedStylesForDomNode(RULE2_SELECTOR, 'height'),
    ];
    assert.deepEqual(computedStyles, ['0px', '10px'], 'Styles are not correct after the update');
  });

  it('can display container link', async () => {
    await goToResourceAndWaitForStyleSection('elements/css-container-queries.html');

    // Select the child that has container queries.
    await waitForAndClickTreeElementWithPartialText('<div class=\u200B"rule1 rule2">\u200B</div>\u200B');
    await waitForContentOfSelectedElementsNode('<div class=\u200B"rule1 rule2">\u200B</div>\u200B');

    const rule1PropertiesSection = await getStyleRule(RULE1_SELECTOR);
    const containerLink = await waitFor('.container-link', rule1PropertiesSection);
    const nodeLabelName = await waitFor('.node-label-name', containerLink);
    const nodeLabelNameContent = await nodeLabelName.evaluate(node => node.textContent as string);
    assert.strictEqual(nodeLabelNameContent, 'body', 'container link name does not match');
    containerLink.hover();
    const queriedSizeDetails = await waitFor('.queried-size-details');
    const queriedSizeDetailsContent =
        await queriedSizeDetails.evaluate(node => (node as HTMLElement).innerText as string);
    assert.strictEqual(
        queriedSizeDetailsContent, '(size) width: 200px height: 0px', 'container queried details does not match');
  });

  it('can display @supports at-rules', async () => {
    await goToResourceAndWaitForStyleSection('elements/css-supports.html');

    // Select the child that has @supports rules.
    await waitForAndClickTreeElementWithPartialText('<div class=\u200B"rule1">\u200B</div>\u200B');
    await waitForContentOfSelectedElementsNode('<div class=\u200B"rule1">\u200B</div>\u200B');

    const rule1PropertiesSection = await getStyleRule(RULE1_SELECTOR);
    const supportsQuery = await waitFor('.query.editable', rule1PropertiesSection);
    const supportsQueryText = await supportsQuery.evaluate(node => (node as HTMLElement).innerText as string);
    assert.deepEqual(supportsQueryText, '@supports (width: 10px)', 'incorrectly displayed @supports rule');
  });

  it('can display @layer separators', async () => {
    await goToResourceAndWaitForStyleSection('elements/css-layers.html');

    // Select the child that has @layer rules.
    await waitForAndClickTreeElementWithPartialText('<div class=\u200B"rule1">\u200B</div>\u200B');
    await waitForContentOfSelectedElementsNode('<div class=\u200B"rule1">\u200B</div>\u200B');

    const layerSeparators = await waitForFunction(async () => {
      const layers = await $$(LAYER_SEPARATOR_SELECTOR);
      return layers.length === 6 ? layers : null;
    });
    assertNotNullOrUndefined(layerSeparators);

    const layerText = await Promise.all(layerSeparators.map(element => element.evaluate(node => node.textContent)));
    assert.deepEqual(layerText, [
      'Layer<anonymous>',
      'Layerimportant',
      'Layeroverrule',
      'Layeroverrule.<anonymous>',
      'Layerbase',
      'Layer\xa0user\xa0agent\xa0stylesheet',
    ]);
  });

  it('can click @layer separators to open layer tree', async () => {
    await goToResourceAndWaitForStyleSection('elements/css-layers.html');

    // Select the child that has @layer rules.
    await waitForAndClickTreeElementWithPartialText('<div class=\u200B"rule1">\u200B</div>\u200B');
    await waitForContentOfSelectedElementsNode('<div class=\u200B"rule1">\u200B</div>\u200B');

    await click('aria/overrule[role="button"]');

    const treeElement = await waitFor('[data-node-key="2: overrule"]');
    assertNotNullOrUndefined(treeElement);
  });

  it('can display inherited CSS highlight pseudo styles', async () => {
    await goToResourceAndWaitForStyleSection('elements/highlight-pseudo-inheritance.html');

    const onH1RuleAppeared = waitForStyleRule('h1');

    // Select the h1 for which we will inspect the pseudo styles
    await waitForAndClickTreeElementWithPartialText('<h1');

    await onH1RuleAppeared;

    const h1Rules = await getDisplayedStyleRules();
    // The 12 rule blocks for the h1 are:
    // 1. Inline styles from the style attribute
    // 2. The h1's user agent styles
    // 3. Styles that the h1 inherits from the body
    // 4. The h1's own ::before pseudo
    // 5. The h1's own ::after pseudo
    // 6-7. The h1's own highlight(bar) pseudo
    // 8. The h1's inherited highlight(bar) pseudo
    // 9-10. The h1's own highlight(foo) pseudo
    // 11. The h1's own selection pseudo
    // 12. The h1's inherited selection pseudo
    // And there is no 13th block for the ::first-letter style, since only
    // highlight pseudos are inherited.
    assert.strictEqual(h1Rules.length, 12, 'The h1 should have 12 style rule blocks');
    assert.deepEqual(
        h1Rules[2], {
          selectorText: 'body',
          propertyData: [
            {propertyName: 'color', isOverLoaded: false, isInherited: false},
            {propertyName: 'background-color', isOverLoaded: false, isInherited: true},
          ],
        },
        'The inherited styles from the body are displayed');
    assert.deepEqual(
        h1Rules[3], {
          selectorText: 'h1::before',
          propertyData: [{propertyName: 'content', isOverLoaded: false, isInherited: false}],
        },
        'The h1\'s own ::before pseudo is displayed');
    assert.deepEqual(
        h1Rules[4], {
          selectorText: 'h1::after',
          propertyData: [{propertyName: 'content', isOverLoaded: false, isInherited: false}],
        },
        'The h1\'s own ::after pseudo is displayed');
    assert.deepEqual(
        h1Rules[5], {
          selectorText: 'h1::highlight(bar)',
          propertyData: [{propertyName: 'background-color', isOverLoaded: false, isInherited: false}],
        },
        'The h1\'s own highlight(bar) pseudo is displayed (1)');
    assert.deepEqual(
        h1Rules[6], {
          selectorText: 'h1::highlight(foo), h1::highlight(bar)',
          propertyData: [{propertyName: 'color', isOverLoaded: false, isInherited: false}],
        },
        'The h1\'s own highlight(bar) pseudo is displayed (2)');
    assert.deepEqual(
        h1Rules[7], {
          selectorText: 'body::highlight(bar)',
          propertyData: [
            {propertyName: 'color', isOverLoaded: true, isInherited: false},
            {propertyName: 'background-color', isOverLoaded: true, isInherited: false},
          ],
        },
        'The h1\'s inherited highlight(bar) pseudo is displayed');
    assert.deepEqual(
        h1Rules[8], {
          selectorText: 'h1::highlight(foo)',
          propertyData: [{propertyName: 'background-color', isOverLoaded: false, isInherited: false}],
        },
        'The h1\'s own highlight(foo) pseudo is displayed (1)');
    assert.deepEqual(
        h1Rules[9], {
          selectorText: 'h1::highlight(foo), h1::highlight(bar)',
          propertyData: [{propertyName: 'color', isOverLoaded: false, isInherited: false}],
        },
        'The h1\'s own highlight(foo) pseudo is displayed (2)');
    assert.deepEqual(
        h1Rules[10], {
          selectorText: 'h1::selection',
          propertyData: [{propertyName: 'background-color', isOverLoaded: false, isInherited: false}],
        },
        'The h1\'s own selection pseudo is displayed');
    assert.deepEqual(
        h1Rules[11], {
          selectorText: 'body::selection',
          propertyData: [
            {propertyName: 'text-shadow', isOverLoaded: false, isInherited: false},
            {propertyName: 'background-color', isOverLoaded: true, isInherited: false},
          ],
        },
        'The h1\'s inherited selection pseudo is displayed');

    const sidebarSeparators = await waitForFunction(async () => {
      const separators = await $$(SIDEBAR_SEPARATOR_SELECTOR);
      return separators.length === 8 ? separators : null;
    });
    assertNotNullOrUndefined(sidebarSeparators);

    const layerText = await Promise.all(sidebarSeparators.map(element => element.evaluate(node => node.textContent)));
    assert.deepEqual(layerText, [
      'Inherited from ',
      'Pseudo ::before element',
      'Pseudo ::after element',
      'Pseudo ::highlight(bar) element',
      'Inherited from ::highlight(bar) pseudo of ',
      'Pseudo ::highlight(foo) element',
      'Pseudo ::selection element',
      'Inherited from ::selection pseudo of ',
    ]);
  });

  it('can show styles properly (ported layout test)', async () => {
    await goToResourceAndWaitForStyleSection('elements/elements-panel-styles.html');
    await waitForAndClickTreeElementWithPartialText('#container');
    await waitForStyleRule('#container');
    await waitForAndClickTreeElementWithPartialText('class="foo"');
    await waitForStyleRule('.foo');
    const fooRules = await getDisplayedStyleRules();
    const expected = [
      {
        'selectorText': 'element.style',
        'propertyData': [
          {'propertyName': 'display', 'isOverLoaded': true, 'isInherited': false},
          {'propertyName': '-webkit-font-smoothing', 'isOverLoaded': false, 'isInherited': false},
        ],
      },
      {
        'selectorText': '#container .foo',
        'propertyData': [{'propertyName': 'font-style', 'isOverLoaded': false, 'isInherited': false}],
      },
      {
        'selectorText': 'body .foo',
        'propertyData': [{'propertyName': 'text-indent', 'isOverLoaded': true, 'isInherited': false}],
      },
      {'selectorText': '.foo', 'propertyData': []},
      {
        'selectorText': '.foo, .foo::before',
        'propertyData': [
          {'propertyName': 'content', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'color', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'display', 'isOverLoaded': false, 'isInherited': false},
        ],
      },
      {
        'selectorText': '.foo',
        'propertyData': [
          {'propertyName': 'display', 'isOverLoaded': true, 'isInherited': false},
          {'propertyName': 'color', 'isOverLoaded': true, 'isInherited': false},
          {'propertyName': 'margin-left', 'isOverLoaded': true, 'isInherited': false},
          {'propertyName': 'margin', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'margin-top', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'margin-right', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'margin-bottom', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'margin-left', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-radius', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-top-left-radius', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-top-right-radius', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-bottom-right-radius', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-bottom-left-radius', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'font-style', 'isOverLoaded': true, 'isInherited': false},
          {'propertyName': 'font-weight', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'font-weight', 'isOverLoaded': true, 'isInherited': false},
          {'propertyName': 'padding', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'padding-top', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'padding-right', 'isOverLoaded': true, 'isInherited': false},
          {'propertyName': 'padding-bottom', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'padding-left', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'padding-right', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'text-indent', 'isOverLoaded': false, 'isInherited': false},
        ],
      },
      {
        'selectorText': 'div[Attributes Style]',
        'propertyData': [{'propertyName': 'text-align', 'isOverLoaded': false, 'isInherited': false}],
      },
      {
        'selectorText': 'div',
        'propertyData': [{'propertyName': 'display', 'isOverLoaded': true, 'isInherited': false}],
      },
      {
        'selectorText': '#container',
        'propertyData': [
          {'propertyName': 'font-family', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'font-size', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'color', 'isOverLoaded': true, 'isInherited': false},
          {'propertyName': 'padding', 'isOverLoaded': false, 'isInherited': true},
          {'propertyName': 'padding-top', 'isOverLoaded': false, 'isInherited': true},
          {'propertyName': 'padding-right', 'isOverLoaded': false, 'isInherited': true},
          {'propertyName': 'padding-bottom', 'isOverLoaded': false, 'isInherited': true},
          {'propertyName': 'padding-left', 'isOverLoaded': false, 'isInherited': true},
        ],
      },
      {
        'selectorText': 'body',
        'propertyData': [
          {'propertyName': 'font-size', 'isOverLoaded': true, 'isInherited': false},
          {'propertyName': 'text-indent', 'isOverLoaded': true, 'isInherited': false},
        ],
      },
      {'selectorText': 'html', 'propertyData': [{'propertyName': 'color', 'isOverLoaded': true, 'isInherited': false}]},
      {'selectorText': '.foo::before', 'propertyData': []},
      {
        'selectorText': '.foo::before',
        'propertyData': [{'propertyName': 'color', 'isOverLoaded': false, 'isInherited': false}],
      },
      {
        'selectorText': '.foo, .foo::before',
        'propertyData': [
          {'propertyName': 'content', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'color', 'isOverLoaded': true, 'isInherited': false},
          {'propertyName': 'display', 'isOverLoaded': false, 'isInherited': false},
        ],
      },
      {
        'selectorText': '.foo::after',
        'propertyData': [
          {'propertyName': 'font-family', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'content', 'isOverLoaded': false, 'isInherited': false},
        ],
      },
      {
        'selectorText': '.foo::after',
        'propertyData': [
          {'propertyName': 'content', 'isOverLoaded': true, 'isInherited': false},
          {'propertyName': 'color', 'isOverLoaded': false, 'isInherited': false},
        ],
      },
      {
        'selectorText': '.foo::marker',
        'propertyData': [
          {'propertyName': 'content', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'color', 'isOverLoaded': false, 'isInherited': false},
        ],
      },
    ];
    assert.deepEqual(fooRules, expected);
  });

  it('can show overridden shorthands as inactive (ported layout test)', async () => {
    await goToResourceAndWaitForStyleSection('elements/css-shorthand-override.html');
    await waitForStyleRule('body');

    await waitForAndClickTreeElementWithPartialText('#inspected1');
    await waitForStyleRule('#inspected1');
    const inspected1Rules = await getDisplayedStyleRules();
    const expectedInspected1Rules = [
      {'selectorText': 'element.style', 'propertyData': []},
      {
        'selectorText': '#inspected1',
        'propertyData': [
          {'propertyName': 'margin-top', 'isOverLoaded': true, 'isInherited': false},
          {'propertyName': 'margin', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'margin-top', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'margin-right', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'margin-bottom', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'margin-left', 'isOverLoaded': false, 'isInherited': false},
        ],
      },
      {
        'selectorText': 'div',
        'propertyData': [{'propertyName': 'display', 'isOverLoaded': false, 'isInherited': false}],
      },
    ];
    assert.deepEqual(inspected1Rules, expectedInspected1Rules);

    await waitForAndClickTreeElementWithPartialText('#inspected2');
    await waitForStyleRule('#inspected2');
    const inspected2Rules = await getDisplayedStyleRules();

    const expectedInspected2Rules = [
      {'selectorText': 'element.style', 'propertyData': []},
      {
        'selectorText': '#inspected2',
        'propertyData': [
          {'propertyName': 'padding', 'isOverLoaded': true, 'isInherited': false},
          {'propertyName': 'padding-top', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'padding-right', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'padding-bottom', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'padding-left', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'padding', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'padding-top', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'padding-right', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'padding-bottom', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'padding-left', 'isOverLoaded': false, 'isInherited': false},
        ],
      },
      {
        'selectorText': 'div',
        'propertyData': [{'propertyName': 'display', 'isOverLoaded': false, 'isInherited': false}],
      },
    ];
    assert.deepEqual(inspected2Rules, expectedInspected2Rules);

    await waitForAndClickTreeElementWithPartialText('#inspected3');
    await waitForStyleRule('#inspected3');
    const inspected3Rules = await getDisplayedStyleRules();
    const expectedInspected3Rules = [
      {'selectorText': 'element.style', 'propertyData': []},
      {
        'selectorText': '#inspected3',
        'propertyData': [
          {'propertyName': 'border-width', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-top-width', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-right-width', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-bottom-width', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-left-width', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-top-color', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-top-style', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-top-width', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-right-color', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-right-style', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-right-width', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-bottom-color', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-bottom-style', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-bottom-width', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-left-color', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-left-style', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-left-width', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-image-source', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-image-slice', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-image-width', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-image-outset', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'border-image-repeat', 'isOverLoaded': false, 'isInherited': false},
        ],
      },
      {
        'selectorText': 'div',
        'propertyData': [{'propertyName': 'display', 'isOverLoaded': false, 'isInherited': false}],
      },
    ];
    assert.deepEqual(inspected3Rules, expectedInspected3Rules);
  });

  it('shows longhands overridden by shorthands with var() as inactive (ported layout test)', async () => {
    await goToResourceAndWaitForStyleSection('elements/css-longhand-override.html');
    await waitForStyleRule('body');

    await waitForAndClickTreeElementWithPartialText('#inspected');
    await waitForStyleRule('#inspected');
    const inspectedRules = await getDisplayedStyleRules();
    const expectedInspected1Rules = [
      {'selectorText': 'element.style', 'propertyData': []},
      {
        'selectorText': '#inspected',
        'propertyData': [
          {'propertyName': 'margin', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'margin-top', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'margin-right', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'margin-bottom', 'isOverLoaded': false, 'isInherited': false},
          {'propertyName': 'margin-left', 'isOverLoaded': false, 'isInherited': false},
        ],
      },
      {
        'selectorText': 'div',
        'propertyData': [{'propertyName': 'margin-top', 'isOverLoaded': true, 'isInherited': false}],
      },
      {
        'selectorText': 'div',
        'propertyData': [{'propertyName': 'display', 'isOverLoaded': false, 'isInherited': false}],
      },
    ];
    assert.deepEqual(inspectedRules, expectedInspected1Rules);
  });

  it('shows longhands with parsed values under a shorthand', async () => {
    await goToResourceAndWaitForStyleSection('elements/css-shorthand-override.html');
    await waitForStyleRule('body');

    await waitForAndClickTreeElementWithPartialText('inspected4');
    await waitForStyleRule('#inspected4');

    const inspectedRules = await getDisplayedCSSDeclarations();
    assert.deepStrictEqual(inspectedRules, [
      'margin: 10px;',
      'margin-top: 10px;',
      'margin-right: 10px;',
      'margin-bottom: 10px;',
      'margin-left: 10px;',
      'margin-left: 20px;',
      'display: block;',
    ]);
  });

  it('shows overridden properties as inactive (ported layout test)', async () => {
    await goToResourceAndWaitForStyleSection('elements/css-override.html');
    await waitForStyleRule('body');

    await waitForAndClickTreeElementWithPartialText('<div');
    await waitForStyleRule('div');
    await waitForAndClickTreeElementWithPartialText('#inspected');
    await waitForStyleRule('#inspected');
    const inspectedRules = await getDisplayedStyleRules();
    const expectedInspected1Rules = [
      {
        'selectorText': 'element.style',
        'propertyData': [],
      },
      {
        'selectorText': '#inspected',
        'propertyData': [
          {
            'propertyName': 'text-align',
            'isOverLoaded': true,
            'isInherited': false,
          },
          {
            'propertyName': 'text-align',
            'isOverLoaded': true,
            'isInherited': false,
          },
          {
            'propertyName': 'text-align',
            'isOverLoaded': false,
            'isInherited': false,
          },
        ],
      },
      {
        'selectorText': 'div[Attributes Style]',
        'propertyData': [{
          'propertyName': 'text-align',
          'isOverLoaded': true,
          'isInherited': false,
        }],
      },
      {
        'selectorText': 'div',
        'propertyData': [{
          'propertyName': 'display',
          'isOverLoaded': false,
          'isInherited': false,
        }],
      },
    ];
    assert.deepEqual(inspectedRules, expectedInspected1Rules);
  });

  it('shows non-standard mixed-cased properties correctly (ported layout test)', async () => {
    await goToResourceAndWaitForStyleSection('elements/css-mixed-case.html');
    await waitForStyleRule('body');

    await waitForAndClickTreeElementWithPartialText('#container');
    await waitForStyleRule('#container');
    await waitForAndClickTreeElementWithPartialText('#nested');
    await waitForStyleRule('#nested');
    const inspectedRules = await getDisplayedStyleRules();
    const expectedInspected1Rules = [
      {
        'selectorText': 'element.style',
        'propertyData': [],
      },
      {
        'selectorText': '#nested',
        'propertyData': [{
          'propertyName': 'color',
          'isOverLoaded': false,
          'isInherited': false,
        }],
      },
      {
        'selectorText': 'div',
        'propertyData': [{
          'propertyName': 'display',
          'isOverLoaded': false,
          'isInherited': false,
        }],
      },
      {
        'selectorText': 'style attribute',
        'propertyData': [{
          'propertyName': 'CoLoR',
          'isOverLoaded': true,
          'isInherited': false,
        }],
      },
      {
        'selectorText': '#container',
        'propertyData': [{
          'propertyName': '-webkit-FONT-smoothing',
          'isOverLoaded': false,
          'isInherited': false,
        }],
      },
    ];
    assert.deepEqual(inspectedRules, expectedInspected1Rules);
  });

  it('shows styles from injected user stylesheets (ported layout test)', async () => {
    const {target} = getBrowserAndPages();
    await goToResourceAndWaitForStyleSection('elements/css-inject-stylesheet.html');
    await waitForStyleRule('body');
    await target.addScriptTag({
      content: `
      function injectStyleSheet(context) {
          const styleSheet = "#main { color: red; border-style: solid; -webkit-border-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAiElEQVR42r2RsQrDMAxEBRdl8SDcX8lQPGg1GBI6lvz/h7QyRRXV0qUULwfvwZ1tenw5PxToRPWMC52eA9+WDnlh3HFQ/xBQl86NFYJqeGflkiogrOvVlIFhqURFVho3x1moGAa3deMs+LS30CAhBN5nNxeT5hbJ1zwmji2k+aF6NENIPf/hs54f0sZFUVAMigAAAABJRU5ErkJggg==) }  #iframeBody { background: red }";
          const style = document.createElement('style');
          style.textContent = styleSheet;
          context.document.head.append(style);
      }

      injectStyleSheet(window);
      function loadIframe() {
          var iframe = document.createElement("iframe");
          iframe.src = "css-inject-stylesheet-iframe-data.html";
          document.getElementById("main").appendChild(iframe);
      }`,
    });

    await waitForAndClickTreeElementWithPartialText('#main');
    await waitForStyleRule('#main');
    const inspectedRulesBefore = await getDisplayedStyleRulesCompact();
    const expectedInspectedRulesBefore = [
      {
        'selectorText': 'element.style',
        'propertyNames': [],
      },
      {
        'selectorText': '#main',
        'propertyNames': [
          'color',
          'border-style',
          'border-top-style',
          'border-right-style',
          'border-bottom-style',
          'border-left-style',
          '-webkit-border-image',
        ],
      },
      {
        'selectorText': '#main',
        'propertyNames': [
          'background',
          'background-image',
          'background-position-x',
          'background-position-y',
          'background-size',
          'background-repeat-x',
          'background-repeat-y',
          'background-attachment',
          'background-origin',
          'background-clip',
          'background-color',
        ],
      },
      {
        'selectorText': 'div',
        'propertyNames': ['display'],
      },
    ];
    assert.deepEqual(inspectedRulesBefore, expectedInspectedRulesBefore);
    await target.evaluate('loadIframe()');
    await expandSelectedNodeRecursively();
    const iframeBody = await waitFor('onload', undefined, undefined, 'pierceShadowText');
    await clickElement(iframeBody);
    await waitForStyleRule('#iframeBody');
    const inspectedRulesAfter = await getDisplayedStyleRulesCompact();
    const expectedInspectedRulesAfter = [
      {
        'selectorText': 'element.style',
        'propertyNames': [],
      },
      {
        'selectorText': '#iframeBody',
        'propertyNames': [
          'background',
          'background-image',
          'background-position-x',
          'background-position-y',
          'background-size',
          'background-repeat-x',
          'background-repeat-y',
          'background-attachment',
          'background-origin',
          'background-clip',
          'background-color',
        ],
      },
      {
        'selectorText': 'body',
        'propertyNames': [
          'background',
          'background-image',
          'background-position-x',
          'background-position-y',
          'background-size',
          'background-repeat-x',
          'background-repeat-y',
          'background-attachment',
          'background-origin',
          'background-clip',
          'background-color',
        ],
      },
      {
        'selectorText': 'body',
        'propertyNames': ['display', 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
      },
    ];
    assert.deepEqual(inspectedRulesAfter, expectedInspectedRulesAfter);
  });

  it('can parse webkit css region styling (ported layout test)', async () => {
    await goToResourceAndWaitForStyleSection('elements/css-webkit-region.html');
    await waitForStyleRule('body');
    await waitForAndClickTreeElementWithPartialText('#article1');
    await waitForStyleRule('#article1');
    await waitForAndClickTreeElementWithPartialText('#p1');
    await waitForStyleRule('#p1');
    const inspectedRules = await getDisplayedStyleRulesCompact();
    const expectedInspectedRules = [
      {
        'selectorText': 'element.style',
        'propertyNames': [],
      },
      {
        'selectorText': '#p1',
        'propertyNames': ['color'],
      },
      {
        'selectorText': 'p',
        'propertyNames':
            ['display', 'margin-block-start', 'margin-block-end', 'margin-inline-start', 'margin-inline-end'],
      },
    ];
    assert.deepEqual(inspectedRules, expectedInspectedRules);
  });

  it('can display @scope at-rules', async () => {
    await goToResourceAndWaitForStyleSection('elements/css-scope.html');

    // Select the child that has @scope rules.
    await waitForAndClickTreeElementWithPartialText('<div class=\u200B"rule1">\u200B</div>\u200B');
    await waitForContentOfSelectedElementsNode('<div class=\u200B"rule1">\u200B</div>\u200B');

    const rule1PropertiesSection = await getStyleRule(RULE1_SELECTOR);
    const scopeQuery = await waitFor('.query.editable', rule1PropertiesSection);
    const scopeQueryText = await scopeQuery.evaluate(node => (node as HTMLElement).innerText as string);
    assert.deepEqual(scopeQueryText, '@scope (body)', 'incorrectly displayed @supports rule');
  });

  it('shows an infobox with specificity information when hovering a selector', async () => {
    await goToResourceAndWaitForStyleSection('elements/css-specificity.html');

    // Select the child that has a style rule attached
    await waitForAndClickTreeElementWithPartialText('properties-to-inspect');
    await waitForContentOfSelectedElementsNode('<div id=\u200B"properties-to-inspect">\u200B</div>\u200B');

    // Hover the selector in the Styles pane
    const testElementRule = await getStyleRule(PROPERTIES_TO_INSPECT_SELECTOR);
    await hover('.selector-matches', {root: testElementRule});

    // Check if an infobox is shown or not. If not, this will throw
    const infobox = await waitFor('body > .vbox.flex-auto');

    // Make sure it’s the specificity infobox
    const innerText = await infobox.evaluate(node => {
      return node.shadowRoot?.querySelector('span')?.innerText;
    });
    assert.strictEqual(innerText?.toLowerCase().startsWith('specificity'), true);
  });

  describe('Editing', () => {
    let frontend: puppeteer.Page;
    let target: puppeteer.Page;

    beforeEach(() => {
      const browserAndPages = getBrowserAndPages();
      frontend = browserAndPages.frontend;
      target = browserAndPages.target;
    });

    async function assertBodyColor(expected: string) {
      assert.strictEqual(
          await target.evaluate(() => {
            return getComputedStyle(document.body).color;
          }),
          expected);
    }

    async function assertIsEditing(isEditing: boolean) {
      // .child-editing class is added by StylePropertyTreeElement when user edits a value.
      assert.lengthOf(await frontend.$$('pierce/.child-editing'), isEditing ? 1 : 0);
    }

    const green = 'rgb(0, 255, 0)';
    const blue = 'rgb(0, 0, 255)';

    it('cancels editing if the page is reloaded', async () => {
      await goToResourceAndWaitForStyleSection('elements/simple-body-color.html');
      await assertBodyColor(green);

      // Start editing.
      await focusCSSPropertyValue('body', 'color');
      await frontend.keyboard.type(blue, {delay: 100});
      await assertBodyColor(blue);
      await assertIsEditing(true);

      // Reload and wait for styles.
      await goToResourceAndWaitForStyleSection('elements/simple-body-color.html');

      // Expect the editing to be discarded and the editing mode turned off.
      await waitForCSSPropertyValue('body', 'color', green);
      await assertBodyColor(green);
      await assertIsEditing(false);
    });

    it('cancels editing on Esc', async () => {
      await goToResourceAndWaitForStyleSection('elements/simple-body-color.html');
      await assertBodyColor(green);

      // Start editing.
      await focusCSSPropertyValue('body', 'color');
      await frontend.keyboard.type(blue, {delay: 100});
      await assertBodyColor(blue);
      await assertIsEditing(true);
      await frontend.keyboard.press('Escape');

      // Expect the editing to be discarded and the editing mode turned off.
      await waitForCSSPropertyValue('body', 'color', green);
      await assertBodyColor(green);
      await assertIsEditing(false);
    });
  });
});
