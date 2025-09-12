// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {
  editQueryRuleText,
  expandSelectedNodeRecursively,
  focusCSSPropertyValue,
  getComputedStylesForDomNode,
  getCSSPropertyInRule,
  getDisplayedCSSDeclarations,
  getDisplayedCSSPropertyNames,
  getDisplayedStyleRules,
  getDisplayedStyleRulesCompact,
  getStyleRule,
  getStyleSectionSubtitles,
  goToResourceAndWaitForStyleSection,
  waitForAndClickTreeElementWithPartialText,
  waitForContentOfSelectedElementsNode,
  waitForCSSPropertyValue,
  waitForElementsStyleSection,
  waitForPropertyToHighlight,
  waitForStyleRule,
} from '../../e2e/helpers/elements-helpers.js';
import {openPanelViaMoreTools} from '../../e2e/helpers/settings-helpers.js';
import {expectVeEvents, veImpression, veImpressionsUnder} from '../../e2e/helpers/visual-logging-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

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

const prepareElementsTab = async (devToolsPage: DevToolsPage) => {
  await waitForElementsStyleSection(null, devToolsPage);
  await expandSelectedNodeRecursively(devToolsPage);
};

const deletePropertyByBackspace =
    async (devToolsPage: DevToolsPage, selector: string, root?: puppeteer.ElementHandle<Element>) => {
  await devToolsPage.click(selector, {root});
  await devToolsPage.page.keyboard.press('Backspace');
  await devToolsPage.page.keyboard.press('Tab');
  await devToolsPage.waitFor('.tree-outline .child-editing', root);
};

describe('The Styles pane', () => {
  it('can show overridden shorthands as inactive (ported layout test)', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/css-shorthand-override.html', devToolsPage, inspectedPage);
    await prepareElementsTab(devToolsPage);
    await waitForStyleRule('body', devToolsPage);

    await waitForAndClickTreeElementWithPartialText('id=\u200B"inspected1"', devToolsPage);
    await waitForStyleRule('#inspected1', devToolsPage);
    const inspected1Rules = await getDisplayedStyleRules(devToolsPage);
    const expectedInspected1Rules = [
      {selectorText: 'element.style', propertyData: []},
      {
        selectorText: '#inspected1',
        propertyData: [
          {propertyName: 'margin-top', isOverLoaded: true, isInherited: false},
          {propertyName: 'margin', isOverLoaded: false, isInherited: false},
          {propertyName: 'margin-top', isOverLoaded: false, isInherited: false},
          {propertyName: 'margin-right', isOverLoaded: false, isInherited: false},
          {propertyName: 'margin-bottom', isOverLoaded: false, isInherited: false},
          {propertyName: 'margin-left', isOverLoaded: false, isInherited: false},
        ],
      },
      {
        selectorText: 'div',
        propertyData: [
          {propertyName: 'display', isOverLoaded: false, isInherited: false},
          {propertyName: 'unicode-bidi', isOverLoaded: false, isInherited: false},
        ],
      },
    ];
    assert.deepEqual(inspected1Rules, expectedInspected1Rules);

    await waitForAndClickTreeElementWithPartialText('id=\u200B"inspected2"', devToolsPage);
    await waitForStyleRule('#inspected2', devToolsPage);
    const inspected2Rules = await getDisplayedStyleRules(devToolsPage);

    const expectedInspected2Rules = [
      {selectorText: 'element.style', propertyData: []},
      {
        selectorText: '#inspected2',
        propertyData: [
          {propertyName: 'padding', isOverLoaded: true, isInherited: false},
          {propertyName: 'padding-top', isOverLoaded: false, isInherited: false},
          {propertyName: 'padding-right', isOverLoaded: false, isInherited: false},
          {propertyName: 'padding-bottom', isOverLoaded: false, isInherited: false},
          {propertyName: 'padding-left', isOverLoaded: false, isInherited: false},
          {propertyName: 'padding', isOverLoaded: false, isInherited: false},
          {propertyName: 'padding-top', isOverLoaded: false, isInherited: false},
          {propertyName: 'padding-right', isOverLoaded: false, isInherited: false},
          {propertyName: 'padding-bottom', isOverLoaded: false, isInherited: false},
          {propertyName: 'padding-left', isOverLoaded: false, isInherited: false},
        ],
      },
      {
        selectorText: 'div',
        propertyData: [
          {propertyName: 'display', isOverLoaded: false, isInherited: false},
          {propertyName: 'unicode-bidi', isOverLoaded: false, isInherited: false},
        ],
      },
    ];
    assert.deepEqual(inspected2Rules, expectedInspected2Rules);
    await waitForAndClickTreeElementWithPartialText('id=\u200B"inspected3"', devToolsPage);
    await waitForStyleRule('#inspected3', devToolsPage);
    const inspected3Rules = await getDisplayedStyleRules(devToolsPage);
    const expectedInspected3Rules = [
      {
        selectorText: 'element.style',
        propertyData: [],
      },
      {
        selectorText: '#inspected3',
        propertyData: [
          {
            propertyName: 'border-width',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-top-width',
            isOverLoaded: true,
            isInherited: false,
          },
          {
            propertyName: 'border-right-width',
            isOverLoaded: true,
            isInherited: false,
          },
          {
            propertyName: 'border-bottom-width',
            isOverLoaded: true,
            isInherited: false,
          },
          {
            propertyName: 'border-left-width',
            isOverLoaded: true,
            isInherited: false,
          },
          {
            propertyName: 'border',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-top-width',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-right-width',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-bottom-width',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-left-width',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-top-style',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-right-style',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-bottom-style',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-left-style',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-top-color',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-right-color',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-bottom-color',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-left-color',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-image-source',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-image-slice',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-image-width',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-image-outset',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-image-repeat',
            isOverLoaded: false,
            isInherited: false,
          },
        ],
      },
      {
        selectorText: 'div',
        propertyData: [
          {
            propertyName: 'display',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'unicode-bidi',
            isOverLoaded: false,
            isInherited: false,
          },
        ],
      },
    ];
    assert.deepEqual(inspected3Rules, expectedInspected3Rules);
  });

  it('can display the CSS properties of the selected element', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/simple-styled-page.html', devToolsPage, inspectedPage);
    await prepareElementsTab(devToolsPage);

    const onH1RuleAppeared = waitForStyleRule('h1', devToolsPage);

    await waitForAndClickTreeElementWithPartialText('<h1>', devToolsPage);
    await onH1RuleAppeared;

    await devToolsPage.waitForFunction(async () => (await getDisplayedStyleRules(devToolsPage)).length === 4);
    const h1Rules = await getDisplayedStyleRules(devToolsPage);
    // Waiting for the first h1 rule, that's the authored rule, right after the element style.
    assert.deepEqual(h1Rules[1], {
      selectorText: 'body h1',
      propertyData: [{propertyName: 'color', isOverLoaded: false, isInherited: false}],
    });

    const onH2RuleAppeared = waitForStyleRule('h2', devToolsPage);
    await waitForAndClickTreeElementWithPartialText('<h2>', devToolsPage);
    await onH2RuleAppeared;

    await devToolsPage.waitForFunction(async () => (await getDisplayedStyleRules(devToolsPage)).length === 3);
    // Waiting for the first h2 rule, that's the authored rule, right after the element style.
    const h2Rules = await getDisplayedStyleRules(devToolsPage);
    assert.deepEqual(h2Rules[1], {
      selectorText: 'h2',
      propertyData: [
        {propertyName: 'background-color', isOverLoaded: false, isInherited: false},
        {propertyName: 'color', isOverLoaded: false, isInherited: false},
      ],
    });
  });

  it('can jump to a CSS variable definition', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.enableAnimations();
    await goToResourceAndWaitForStyleSection('elements/css-variables.html', devToolsPage, inspectedPage);

    // Select div that we will inspect the CSS variables for
    await waitForAndClickTreeElementWithPartialText('properties-to-inspect', devToolsPage);
    await waitForContentOfSelectedElementsNode(
        '<div id=\u200B"properties-to-inspect">\u200B</div>\u200B', devToolsPage);

    const testElementRule = await getStyleRule(PROPERTIES_TO_INSPECT_SELECTOR, devToolsPage);
    await devToolsPage.click('.link-swatch-link', {root: testElementRule});

    await waitForPropertyToHighlight('html', '--title-color', devToolsPage);
  });

  it('can jump to an unexpanded CSS variable definition', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.enableAnimations();
    await goToResourceAndWaitForStyleSection('elements/css-variables-many.html', devToolsPage, inspectedPage);

    // Select div that we will inspect the CSS variables for
    await waitForAndClickTreeElementWithPartialText('properties-to-inspect', devToolsPage);
    await waitForContentOfSelectedElementsNode(
        '<div id=\u200B"properties-to-inspect">\u200B</div>\u200B', devToolsPage);

    const testElementRule = await getStyleRule(PROPERTIES_TO_INSPECT_SELECTOR, devToolsPage);
    await devToolsPage.click('.link-swatch-link', {root: testElementRule});

    await waitForPropertyToHighlight('html', '--color56', devToolsPage);
  });

  it('displays the correct value when editing CSS var() functions', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/css-variables.html', devToolsPage, inspectedPage);

    // Select div that we will inspect the CSS variables for
    await waitForAndClickTreeElementWithPartialText('properties-to-inspect', devToolsPage);
    await waitForContentOfSelectedElementsNode(
        '<div id=\u200B"properties-to-inspect">\u200B</div>\u200B', devToolsPage);

    const propertiesSection = await getStyleRule(PROPERTIES_TO_INSPECT_SELECTOR, devToolsPage);

    const propertyValue = await devToolsPage.waitFor(FIRST_PROPERTY_VALUE_SELECTOR, propertiesSection);
    // Specifying 10px from the left of the value to click on the word var rather than in the middle which would jump to
    // the property definition.
    await propertyValue.click();
    const editedValueText = await propertyValue.evaluate(node => (node as HTMLElement).innerText);
    assert.strictEqual(editedValueText, 'var(--title-color)', 'The value is incorrect when being edited');
  });

  it('generates links inside var() functions for defined properties', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/css-variables.html', devToolsPage, inspectedPage);

    // Select div that we will inspect the CSS variables for
    await waitForAndClickTreeElementWithPartialText('properties-to-inspect', devToolsPage);
    await waitForContentOfSelectedElementsNode(
        '<div id=\u200B"properties-to-inspect">\u200B</div>\u200B', devToolsPage);

    const propertiesSection = await getStyleRule(PROPERTIES_TO_INSPECT_SELECTOR, devToolsPage);
    const propertyValue = await devToolsPage.waitFor(FIRST_PROPERTY_VALUE_SELECTOR, propertiesSection);
    const link = await devToolsPage.$$('.link-swatch-link', propertyValue);
    assert.lengthOf(link, 1, 'The expected var link was not created');
  });

  it('renders computed CSS variables in @keyframes rules', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/css-variables.html', devToolsPage, inspectedPage);

    // Select div that we will inspect the CSS variables for
    await waitForAndClickTreeElementWithPartialText('keyframes-rule', devToolsPage);
    await waitForContentOfSelectedElementsNode('<div id=\u200B"keyframes-rule">\u200B</div>\u200B', devToolsPage);

    const propertiesSection = await getStyleRule(KEYFRAMES_100_PERCENT_RULE_SELECTOR, devToolsPage);
    const propertyValue = await devToolsPage.waitFor(FIRST_PROPERTY_VALUE_SELECTOR, propertiesSection);
    const propertyValueText = await propertyValue.evaluate(node => (node as HTMLElement).innerText);
    assert.strictEqual(
        propertyValueText, 'var(--move-final-width)', 'CSS variable in @keyframes rule is not correctly rendered');
  });

  it('Shows a CSS hint popover', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToHtml(`
       <style>
         body {
           grid-column-gap: 4px;
         }
       </style>`);
    await waitForElementsStyleSection(undefined, devToolsPage);

    await devToolsPage.hover('.hint-wrapper');

    const infobox = await devToolsPage.waitFor(':popover-open');
    const textContent: string = await infobox.evaluate(e => e.deepInnerText());
    assert.strictEqual(
        textContent,
        'The display: block property prevents grid-column-gap from having an effect.\nTry setting display to something other than block.');
    await expectVeEvents(
        [veImpressionsUnder(
            'Panel: elements > Pane: styles > Section: style-properties > Tree > TreeItem: grid-column-gap',
            [veImpression('Popover', 'elements.css-hint')])],
        undefined, devToolsPage);
  });

  it('Shows a syntax error popover for registered property', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToHtml(`
         <style>
           body {
             --color: 2px;
           }
           @property --color {
             syntax: "<color>";
             inherits: false;
             initial-value: green;
           }
         </style>`);
    await waitForElementsStyleSection(undefined, devToolsPage);

    await devToolsPage.hover('.exclamation-mark');

    const infobox = await devToolsPage.waitFor(':popover-open');
    const textContent: string = await infobox.evaluate(e => e.deepInnerText());
    assert.strictEqual(
        textContent.replaceAll(/\s+/g, ' ').trim(),
        'Invalid property value, expected type "<color>" View registered property');
    await expectVeEvents(
        [veImpressionsUnder(
            'Panel: elements > Pane: styles > Section: style-properties > Tree > TreeItem: custom-property',
            [veImpression('Popover', 'elements.invalid-property-decl-popover')])],
        undefined, devToolsPage);
  });

  it('shows variable values in a popover for property values', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/css-variables.html', devToolsPage, inspectedPage);

    // Select div that we will inspect the CSS variables for
    await waitForAndClickTreeElementWithPartialText('properties-to-inspect', devToolsPage);
    await waitForContentOfSelectedElementsNode(
        '<div id=\u200B"properties-to-inspect">\u200B</div>\u200B', devToolsPage);

    const testElementRule = await getStyleRule(PROPERTIES_TO_INSPECT_SELECTOR, devToolsPage);
    await devToolsPage.hover('.link-swatch-link', {root: testElementRule});

    const infobox = await devToolsPage.waitFor('[aria-label="CSS property value: var(--title-color)"] :popover-open');
    const textContent = await infobox.evaluate(e => e.deepInnerText());
    assert.strictEqual(textContent.trim(), 'black');
    await expectVeEvents(
        [veImpressionsUnder(
            'Panel: elements > Pane: styles > Section: style-properties > Tree > TreeItem: color > Value > Link: css-variable',
            [veImpression('Popover', 'elements.css-var')])],
        undefined, devToolsPage);
  });

  it('shows variable values in a popover for property names', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToHtml(`
         <style>
           body {
             --color: red;
           }
         </style>`);
    await waitForElementsStyleSection(undefined, devToolsPage);

    await devToolsPage.hover('aria/CSS property name: --color');

    const infobox = await devToolsPage.waitFor('.tree-outline :popover-open');
    const textContent = await infobox.evaluate(e => e.deepInnerText());
    assert.strictEqual(textContent.trim(), 'red');
    await expectVeEvents(
        [veImpressionsUnder(
            'Panel: elements > Pane: styles > Section: style-properties > Tree > TreeItem: custom-property > Key',
            [veImpression('Popover', 'elements.css-var')])],
        undefined, devToolsPage);
  });

  it('shows mixed colors in a popover', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToHtml(`
         <style>
           body {
             color: color-mix(in srgb, red, blue);
           }
         </style>`);
    await waitForElementsStyleSection(undefined, devToolsPage);

    await devToolsPage.hover('devtools-color-mix-swatch');

    const infobox =
        await devToolsPage.waitFor('[aria-label="CSS property value: color-mix(in srgb, red, blue)"] :popover-open');
    const textContent = await infobox.evaluate(e => e.deepInnerText());
    assert.strictEqual(textContent.trim(), '#800080');
    await expectVeEvents(
        [veImpressionsUnder(
            'Panel: elements > Pane: styles > Section: style-properties > Tree > TreeItem: color > Value',
            [veImpression('Popover', 'elements.css-color-mix')])],
        undefined, devToolsPage);
  });

  it('shows absolute length units in a popover', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToHtml(`
         <style>
           body {
             width: 1em;
           }
         </style>`);
    await waitForElementsStyleSection(undefined, devToolsPage);

    await devToolsPage.hover('text/1em', {root: await devToolsPage.waitForAria('CSS property value: 1em')});

    const infobox = await devToolsPage.waitFor('[aria-label="CSS property value: 1em"] :popover-open');
    const textContent = await infobox.evaluate(e => e.deepInnerText());
    assert.strictEqual(textContent.trim(), '16px');
    await expectVeEvents(
        [veImpressionsUnder(
            'Panel: elements > Pane: styles > Section: style-properties > Tree > TreeItem: width > Value',
            [veImpression('Popover', 'length-popover')])],
        undefined, devToolsPage);
  });

  it('can remove a CSS property when its name or value is deleted', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/style-pane-properties.html', devToolsPage, inspectedPage);

    // Select div that we will remove the CSS properties from
    await waitForAndClickTreeElementWithPartialText('properties-to-delete', devToolsPage);
    await waitForContentOfSelectedElementsNode('<div id=\u200B"properties-to-delete">\u200B</div>\u200B', devToolsPage);

    const propertiesSection = await getStyleRule(PROPERTIES_TO_DELETE_SELECTOR, devToolsPage);
    {
      const displayedNames = await getDisplayedCSSPropertyNames(propertiesSection, devToolsPage);
      assert.deepEqual(
          displayedNames,
          [
            'height',
            'width',
          ],
          'incorrectly displayed style after initialization');
    }

    // select second property's name and delete
    await deletePropertyByBackspace(devToolsPage, SECOND_PROPERTY_NAME_SELECTOR, propertiesSection);

    // verify the second CSS property entry has been removed
    {
      const displayedNames = await getDisplayedCSSPropertyNames(propertiesSection, devToolsPage);
      assert.deepEqual(
          displayedNames,
          [
            'height',
          ],
          'incorrectly displayed style after removing second property\'s value');
    }

    // select first property's name and delete
    await deletePropertyByBackspace(devToolsPage, FIRST_PROPERTY_NAME_SELECTOR, propertiesSection);

    // verify the first CSS property entry has been removed
    {
      const displayedValues = await getDisplayedCSSPropertyNames(propertiesSection, devToolsPage);
      assert.deepEqual(displayedValues, [], 'incorrectly displayed style after removing first property\'s name');
    }
  });

  it('can display the source names for stylesheets', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection(
        'elements/stylesheets-with-various-sources.html', devToolsPage, inspectedPage);

    // Select the div element by pressing down, since <body> is the default selected element.
    const onDivRuleAppeared = waitForStyleRule('div', devToolsPage);

    await waitForAndClickTreeElementWithPartialText('<div', devToolsPage);
    await onDivRuleAppeared;

    const subtitles = await getStyleSectionSubtitles(devToolsPage);
    assert.sameDeepMembers(
        subtitles,
        [
          '',
          'css-module.css:7',
          'constructed stylesheet',
          'stylesheets…ces.html:10',
          'stylesheets…rces.html:7',
          'user agent stylesheet',
        ],
        'incorrectly displayed style sources');

    const divRules = await getDisplayedStyleRules(devToolsPage);
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
          {
            selectorText: 'div',
            propertyData: [
              {propertyName: 'display', isOverLoaded: false, isInherited: false},
              {propertyName: 'unicode-bidi', isOverLoaded: false, isInherited: false},
            ],
          },
        ],
        'The correct rule is displayed');
  });

  it('can edit multiple constructed stylesheets', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection(
        'elements/multiple-constructed-stylesheets.html', devToolsPage, inspectedPage);

    // Select div that we will remove a CSS property from.
    await waitForAndClickTreeElementWithPartialText('<div class=\u200B"rule1 rule2">\u200B</div>\u200B', devToolsPage);
    await waitForContentOfSelectedElementsNode('<div class=\u200B"rule1 rule2">\u200B</div>\u200B', devToolsPage);

    // Verify that initial CSS properties correspond to the ones in the test file.
    const rule1PropertiesSection = await getStyleRule(RULE1_SELECTOR, devToolsPage);
    const rule2PropertiesSection = await getStyleRule(RULE2_SELECTOR, devToolsPage);
    {
      const displayedNames = await getDisplayedCSSPropertyNames(rule1PropertiesSection, devToolsPage);
      assert.deepEqual(
          displayedNames,
          [
            'background-color',
          ],
          'incorrectly displayed style after initialization');
    }
    {
      const displayedNames = await getDisplayedCSSPropertyNames(rule2PropertiesSection, devToolsPage);
      assert.deepEqual(
          displayedNames,
          [
            'background-color',
            'color',
          ],
          'incorrectly displayed style after initialization');
    }

    // Select the first property's name of .rule2 (background-color) and delete.
    await deletePropertyByBackspace(devToolsPage, FIRST_PROPERTY_NAME_SELECTOR, rule2PropertiesSection);

    // Verify that .rule1 has background-color.
    {
      const displayedNames = await getDisplayedCSSPropertyNames(rule1PropertiesSection, devToolsPage);
      assert.deepEqual(
          displayedNames,
          [
            'background-color',
          ],
          'incorrectly displayed style after property removal');
    }

    // Verify that .rule2 has background-color removed and only color remains.
    {
      const displayedNames = await getDisplayedCSSPropertyNames(rule2PropertiesSection, devToolsPage);
      assert.deepEqual(
          displayedNames,
          [
            'color',
          ],
          'incorrectly displayed style after property removal');
    }

    // Verify that computed styles correspond to the changes made.
    const computedStyles = [
      await getComputedStylesForDomNode(RULE1_SELECTOR, 'color', inspectedPage),
      await getComputedStylesForDomNode(RULE1_SELECTOR, 'backgroundColor', inspectedPage),
    ];
    assert.deepEqual(computedStyles, ['rgb(255, 0, 0)', 'rgb(255, 0, 0)'], 'Styles are not correct after the update');
  });

  it('can display and edit container queries', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/css-container-queries.html', devToolsPage, inspectedPage);

    // Select the child that has container queries.
    await waitForAndClickTreeElementWithPartialText('<div class=\u200B"rule1 rule2">\u200B</div>\u200B', devToolsPage);
    await waitForContentOfSelectedElementsNode('<div class=\u200B"rule1 rule2">\u200B</div>\u200B', devToolsPage);

    // Verify that initial CSS properties correspond to the ones in the test file.
    const rule1PropertiesSection = await getStyleRule(RULE1_SELECTOR, devToolsPage);
    const rule2PropertiesSection = await getStyleRule(RULE2_SELECTOR, devToolsPage);
    {
      const displayedNames = await getDisplayedCSSPropertyNames(rule1PropertiesSection, devToolsPage);
      assert.deepEqual(
          displayedNames,
          [
            'width',
          ],
          'incorrectly displayed style after initialization');
    }
    {
      const displayedNames = await getDisplayedCSSPropertyNames(rule2PropertiesSection, devToolsPage);
      assert.deepEqual(
          displayedNames,
          [
            'height',
          ],
          'incorrectly displayed style after initialization');
    }

    await editQueryRuleText(rule1PropertiesSection, '(min-width: 300px)', devToolsPage);
    await editQueryRuleText(rule2PropertiesSection, '(max-width: 300px)', devToolsPage);

    // Verify that computed styles correspond to the changes made.
    const computedStyles = [
      await getComputedStylesForDomNode(RULE1_SELECTOR, 'width', inspectedPage),
      await getComputedStylesForDomNode(RULE2_SELECTOR, 'height', inspectedPage),
    ];
    assert.deepEqual(computedStyles, ['0px', '10px'], 'Styles are not correct after the update');
  });

  it('can display container link', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/css-container-queries.html', devToolsPage, inspectedPage);

    // Select the child that has container queries.
    await waitForAndClickTreeElementWithPartialText('<div class=\u200B"rule1 rule2">\u200B</div>\u200B', devToolsPage);
    await waitForContentOfSelectedElementsNode('<div class=\u200B"rule1 rule2">\u200B</div>\u200B', devToolsPage);

    const rule1PropertiesSection = await getStyleRule(RULE1_SELECTOR, devToolsPage);
    const containerLink = await devToolsPage.waitFor('.container-link', rule1PropertiesSection);
    const nodeLabelName = await devToolsPage.waitFor('.node-label-name', containerLink);
    const nodeLabelNameContent = await nodeLabelName.evaluate(node => node.textContent as string);
    assert.strictEqual(nodeLabelNameContent, 'body', 'container link name does not match');
    await containerLink.hover();
    const queriedSizeDetails = await devToolsPage.waitFor('.queried-size-details');
    const queriedSizeDetailsContent = await queriedSizeDetails.evaluate(node => (node as HTMLElement).innerText);
    assert.strictEqual(
        queriedSizeDetailsContent, '(size) width: 200px height: 0px', 'container queried details does not match');
  });

  it('can display @supports at-rules', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/css-supports.html', devToolsPage, inspectedPage);

    // Select the child that has @supports rules.
    await waitForAndClickTreeElementWithPartialText('<div class=\u200B"rule1">\u200B</div>\u200B', devToolsPage);
    await waitForContentOfSelectedElementsNode('<div class=\u200B"rule1">\u200B</div>\u200B', devToolsPage);

    const rule1PropertiesSection = await getStyleRule(RULE1_SELECTOR, devToolsPage);
    const supportsQuery = await devToolsPage.waitFor('.query.editable', rule1PropertiesSection);
    const supportsQueryText = await supportsQuery.evaluate(node => (node as HTMLElement).innerText);
    assert.deepEqual(supportsQueryText, '@supports (width: 10px) {', 'incorrectly displayed @supports rule');
  });

  it('can display @layer separators', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/css-layers.html', devToolsPage, inspectedPage);

    // Select the child that has @layer rules.
    await waitForAndClickTreeElementWithPartialText('<div class=\u200B"rule1">\u200B</div>\u200B', devToolsPage);
    await waitForContentOfSelectedElementsNode('<div class=\u200B"rule1">\u200B</div>\u200B', devToolsPage);

    const layerSeparators = await devToolsPage.waitForFunction(async () => {
      const layers = await devToolsPage.$$(LAYER_SEPARATOR_SELECTOR);
      return layers.length === 6 ? layers : null;
    });

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

  it('can click @layer separators to open layer tree', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/css-layers.html', devToolsPage, inspectedPage);

    // Select the child that has @layer rules.
    await waitForAndClickTreeElementWithPartialText('<div class=\u200B"rule1">\u200B</div>\u200B', devToolsPage);
    await waitForContentOfSelectedElementsNode('<div class=\u200B"rule1">\u200B</div>\u200B', devToolsPage);

    await devToolsPage.click('aria/overrule[role="button"]');

    const treeElement = await devToolsPage.waitFor('[data-node-key="2: overrule"]');
    assert.isOk(treeElement);
  });

  it('can display inherited CSS highlight pseudo styles', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/highlight-pseudo-inheritance.html', devToolsPage, inspectedPage);

    const onH1RuleAppeared = waitForStyleRule('h1', devToolsPage);

    // Select the h1 for which we will inspect the pseudo styles
    await waitForAndClickTreeElementWithPartialText('<h1', devToolsPage);

    await onH1RuleAppeared;

    const h1Rules = await getDisplayedStyleRules(devToolsPage);
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
    assert.lengthOf(h1Rules, 12, 'The h1 should have 12 style rule blocks');
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

    const sidebarSeparators = await devToolsPage.waitForFunction(async () => {
      const separators = await devToolsPage.$$(SIDEBAR_SEPARATOR_SELECTOR);
      return separators.length === 8 ? separators : null;
    });

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

  it('can show styles properly (ported layout test)', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/elements-panel-styles.html', devToolsPage, inspectedPage);
    await prepareElementsTab(devToolsPage);
    await waitForAndClickTreeElementWithPartialText('id=\u200B"container"', devToolsPage);
    await waitForStyleRule('#container', devToolsPage);
    await waitForAndClickTreeElementWithPartialText('id=\u200B"foo"', devToolsPage);
    await waitForStyleRule('.foo', devToolsPage);
    const fooRules = await getDisplayedStyleRules(devToolsPage);
    const expected = [
      {
        selectorText: 'element.style',
        propertyData: [
          {propertyName: 'display', isOverLoaded: true, isInherited: false},
          {propertyName: '-webkit-font-smoothing', isOverLoaded: false, isInherited: false},
        ],
      },
      {
        selectorText: '#container .foo',
        propertyData: [{propertyName: 'font-style', isOverLoaded: false, isInherited: false}],
      },
      {
        selectorText: 'body .foo',
        propertyData: [{propertyName: 'text-indent', isOverLoaded: true, isInherited: false}],
      },
      {selectorText: '.foo', propertyData: []},
      {
        selectorText: '.foo, .foo::before',
        propertyData: [
          {propertyName: 'content', isOverLoaded: false, isInherited: false},
          {propertyName: 'color', isOverLoaded: false, isInherited: false},
          {propertyName: 'display', isOverLoaded: false, isInherited: false},
        ],
      },
      {
        selectorText: '.foo',
        propertyData: [
          {propertyName: 'display', isOverLoaded: true, isInherited: false},
          {propertyName: 'color', isOverLoaded: true, isInherited: false},
          {propertyName: 'margin-left', isOverLoaded: true, isInherited: false},
          {propertyName: 'margin', isOverLoaded: false, isInherited: false},
          {propertyName: 'margin-top', isOverLoaded: false, isInherited: false},
          {propertyName: 'margin-right', isOverLoaded: false, isInherited: false},
          {propertyName: 'margin-bottom', isOverLoaded: false, isInherited: false},
          {propertyName: 'margin-left', isOverLoaded: false, isInherited: false},
          {propertyName: 'border-radius', isOverLoaded: false, isInherited: false},
          {propertyName: 'border-top-left-radius', isOverLoaded: false, isInherited: false},
          {propertyName: 'border-top-right-radius', isOverLoaded: false, isInherited: false},
          {propertyName: 'border-bottom-right-radius', isOverLoaded: false, isInherited: false},
          {propertyName: 'border-bottom-left-radius', isOverLoaded: false, isInherited: false},
          {propertyName: 'font-style', isOverLoaded: true, isInherited: false},
          {propertyName: 'font-weight', isOverLoaded: false, isInherited: false},
          {propertyName: 'font-weight', isOverLoaded: true, isInherited: false},
          {propertyName: 'padding', isOverLoaded: false, isInherited: false},
          {propertyName: 'padding-top', isOverLoaded: false, isInherited: false},
          {propertyName: 'padding-right', isOverLoaded: true, isInherited: false},
          {propertyName: 'padding-bottom', isOverLoaded: false, isInherited: false},
          {propertyName: 'padding-left', isOverLoaded: false, isInherited: false},
          {propertyName: 'padding-right', isOverLoaded: false, isInherited: false},
          {propertyName: 'text-indent', isOverLoaded: false, isInherited: false},
        ],
      },
      {
        selectorText: 'div[Attributes Style]',
        propertyData: [{propertyName: 'text-align', isOverLoaded: false, isInherited: false}],
      },
      {
        selectorText: 'div',
        propertyData: [
          {propertyName: 'display', isOverLoaded: true, isInherited: false},
          {propertyName: 'unicode-bidi', isOverLoaded: false, isInherited: false},
        ],
      },
      {
        selectorText: '#container',
        propertyData: [
          {propertyName: 'font-family', isOverLoaded: false, isInherited: false},
          {propertyName: 'font-size', isOverLoaded: false, isInherited: false},
          {propertyName: 'color', isOverLoaded: true, isInherited: false},
          {propertyName: 'padding', isOverLoaded: false, isInherited: true},
          {propertyName: 'padding-top', isOverLoaded: false, isInherited: true},
          {propertyName: 'padding-right', isOverLoaded: false, isInherited: true},
          {propertyName: 'padding-bottom', isOverLoaded: false, isInherited: true},
          {propertyName: 'padding-left', isOverLoaded: false, isInherited: true},
        ],
      },
      {
        selectorText: 'body',
        propertyData: [
          {propertyName: 'font-size', isOverLoaded: true, isInherited: false},
          {propertyName: 'text-indent', isOverLoaded: true, isInherited: false},
        ],
      },
      {selectorText: 'html', propertyData: [{propertyName: 'color', isOverLoaded: true, isInherited: false}]},
      {selectorText: '.foo::before', propertyData: []},
      {
        selectorText: '.foo::before',
        propertyData: [{propertyName: 'color', isOverLoaded: false, isInherited: false}],
      },
      {
        selectorText: '.foo, .foo::before',
        propertyData: [
          {propertyName: 'content', isOverLoaded: false, isInherited: false},
          {propertyName: 'color', isOverLoaded: true, isInherited: false},
          {propertyName: 'display', isOverLoaded: false, isInherited: false},
        ],
      },
      {
        selectorText: '.foo::after',
        propertyData: [
          {propertyName: 'font-family', isOverLoaded: false, isInherited: false},
          {propertyName: 'content', isOverLoaded: false, isInherited: false},
        ],
      },
      {
        selectorText: '.foo::after',
        propertyData: [
          {propertyName: 'content', isOverLoaded: true, isInherited: false},
          {propertyName: 'color', isOverLoaded: false, isInherited: false},
        ],
      },
      {
        selectorText: '.foo::marker',
        propertyData: [
          {propertyName: 'content', isOverLoaded: false, isInherited: false},
          {propertyName: 'color', isOverLoaded: false, isInherited: false},
        ],
      },
    ];
    assert.deepEqual(fooRules, expected);
  });

  it('shows longhands overridden by shorthands with var() as inactive (ported layout test)',
     async ({devToolsPage, inspectedPage}) => {
       await goToResourceAndWaitForStyleSection('elements/css-longhand-override.html', devToolsPage, inspectedPage);
       await prepareElementsTab(devToolsPage);
       await waitForStyleRule('body', devToolsPage);

       await waitForAndClickTreeElementWithPartialText('id=\u200B"inspected"', devToolsPage);
       await waitForStyleRule('#inspected', devToolsPage);
       const inspectedRules = await getDisplayedStyleRules(devToolsPage);
       const expectedInspected1Rules = [
         {selectorText: 'element.style', propertyData: []},
         {
           selectorText: '#inspected',
           propertyData: [
             {propertyName: 'margin', isOverLoaded: false, isInherited: false},
             {propertyName: 'margin-top', isOverLoaded: false, isInherited: false},
             {propertyName: 'margin-right', isOverLoaded: false, isInherited: false},
             {propertyName: 'margin-bottom', isOverLoaded: false, isInherited: false},
             {propertyName: 'margin-left', isOverLoaded: false, isInherited: false},
           ],
         },
         {
           selectorText: 'div',
           propertyData: [{propertyName: 'margin-top', isOverLoaded: true, isInherited: false}],
         },
         {
           selectorText: 'div',
           propertyData: [
             {propertyName: 'display', isOverLoaded: false, isInherited: false},
             {propertyName: 'unicode-bidi', isOverLoaded: false, isInherited: false},
           ],
         },
       ];
       assert.deepEqual(inspectedRules, expectedInspected1Rules);
     });

  it('shows longhands with parsed values under a shorthand', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/css-shorthand-override.html', devToolsPage, inspectedPage);
    await waitForStyleRule('body', devToolsPage);

    await waitForAndClickTreeElementWithPartialText('inspected4', devToolsPage);
    await waitForStyleRule('#inspected4', devToolsPage);

    const inspectedRules = await getDisplayedCSSDeclarations(devToolsPage);
    assert.deepEqual(inspectedRules, [
      'margin: 10px;',
      'margin-top: 10px;',
      'margin-right: 10px;',
      'margin-bottom: 10px;',
      'margin-left: 10px;',
      'margin-left: 20px;',
      'display: block;',
      'unicode-bidi: isolate;',
    ]);
  });

  it('shows overridden properties as inactive (ported layout test)', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/css-override.html', devToolsPage, inspectedPage);
    await prepareElementsTab(devToolsPage);
    await waitForStyleRule('body', devToolsPage);

    await waitForAndClickTreeElementWithPartialText('<div', devToolsPage);
    await waitForStyleRule('div', devToolsPage);
    await waitForAndClickTreeElementWithPartialText('id=\u200B"inspected"', devToolsPage);
    await waitForStyleRule('#inspected', devToolsPage);
    const inspectedRules = await getDisplayedStyleRules(devToolsPage);
    const expectedInspected1Rules = [
      {
        selectorText: 'element.style',
        propertyData: [],
      },
      {
        selectorText: '#inspected',
        propertyData: [
          {
            propertyName: 'text-align',
            isOverLoaded: true,
            isInherited: false,
          },
          {
            propertyName: 'text-align',
            isOverLoaded: true,
            isInherited: false,
          },
          {
            propertyName: 'text-align',
            isOverLoaded: false,
            isInherited: false,
          },
        ],
      },
      {
        selectorText: 'div[Attributes Style]',
        propertyData: [{
          propertyName: 'text-align',
          isOverLoaded: true,
          isInherited: false,
        }],
      },
      {
        selectorText: 'div',
        propertyData: [
          {
            propertyName: 'display',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'unicode-bidi',
            isOverLoaded: false,
            isInherited: false,
          },
        ],
      },
    ];
    assert.deepEqual(inspectedRules, expectedInspected1Rules);
  });

  it('shows non-standard mixed-cased properties correctly (ported layout test)',
     async ({devToolsPage, inspectedPage}) => {
       await goToResourceAndWaitForStyleSection('elements/css-mixed-case.html', devToolsPage, inspectedPage);
       await prepareElementsTab(devToolsPage);
       await waitForStyleRule('body', devToolsPage);

       await waitForAndClickTreeElementWithPartialText('id=\u200B"container"', devToolsPage);
       await waitForStyleRule('#container', devToolsPage);
       await waitForAndClickTreeElementWithPartialText('id=\u200B"nested"', devToolsPage);
       await waitForStyleRule('#nested', devToolsPage);
       const inspectedRules = await getDisplayedStyleRules(devToolsPage);
       const expectedInspected1Rules = [
         {
           selectorText: 'element.style',
           propertyData: [],
         },
         {
           selectorText: '#nested',
           propertyData: [{
             propertyName: 'color',
             isOverLoaded: false,
             isInherited: false,
           }],
         },
         {
           selectorText: 'div',
           propertyData: [
             {
               propertyName: 'display',
               isOverLoaded: false,
               isInherited: false,
             },
             {
               propertyName: 'unicode-bidi',
               isOverLoaded: false,
               isInherited: false,
             },
           ],
         },
         {
           selectorText: 'style attribute',
           propertyData: [{
             propertyName: 'CoLoR',
             isOverLoaded: true,
             isInherited: false,
           }],
         },
         {
           selectorText: '#container',
           propertyData: [{
             propertyName: '-webkit-FONT-smoothing',
             isOverLoaded: false,
             isInherited: false,
           }],
         },
       ];
       assert.deepEqual(inspectedRules, expectedInspected1Rules);
     });

  it('shows styles from injected user stylesheets (ported layout test)', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/css-inject-stylesheet.html', devToolsPage, inspectedPage);
    await prepareElementsTab(devToolsPage);

    await inspectedPage.evaluate(async () => {
      const style = document.createElement('style');
      style.textContent =
          '#main { color: red; border-style: solid; -webkit-border-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAiElEQVR42r2RsQrDMAxEBRdl8SDcX8lQPGg1GBI6lvz/h7QyRRXV0qUULwfvwZ1tenw5PxToRPWMC52eA9+WDnlh3HFQ/xBQl86NFYJqeGflkiogrOvVlIFhqURFVho3x1moGAa3deMs+LS30CAhBN5nNxeT5hbJ1zwmji2k+aF6NENIPf/hs54f0sZFUVAMigAAAABJRU5ErkJggg==) }';
      document.head.append(style);
    });

    await waitForAndClickTreeElementWithPartialText('id=\u200B"main"', devToolsPage);
    await waitForStyleRule('#main', devToolsPage);
    const inspectedRulesBefore = await getDisplayedStyleRulesCompact(devToolsPage);
    const expectedInspectedRulesBefore = [
      {
        selectorText: 'element.style',
        propertyNames: [],
      },
      {
        selectorText: '#main',
        propertyNames: [
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
        selectorText: '#main',
        propertyNames: [
          'background',
          'background-image',
          'background-position-x',
          'background-position-y',
          'background-size',
          'background-repeat',
          'background-attachment',
          'background-origin',
          'background-clip',
          'background-color',
        ],
      },
      {
        selectorText: 'div',
        propertyNames: ['display', 'unicode-bidi'],
      },
    ];
    assert.deepEqual(inspectedRulesBefore, expectedInspectedRulesBefore);
  });

  it('shows styles from injected user stylesheets for a injected iframe (ported layout test)',
     async ({devToolsPage, inspectedPage}) => {
       await goToResourceAndWaitForStyleSection('elements/css-inject-stylesheet.html', devToolsPage, inspectedPage);
       await prepareElementsTab(devToolsPage);

       await inspectedPage.evaluate(async () => {
         const iframe = document.createElement('iframe');
         iframe.src = 'css-inject-stylesheet-iframe-data.html';
         document.getElementById('main')?.appendChild(iframe);
       });

       await expandSelectedNodeRecursively(devToolsPage);
       await inspectedPage.evaluate(async () => {
         const iframe = document.querySelector('iframe');
         if (!iframe?.contentDocument) {
           return;
         }
         const style = iframe.contentDocument.createElement('style');
         style.textContent = '#iframeBody { background: red }';
         iframe.contentDocument.head.append(style);
       });

       await waitForAndClickTreeElementWithPartialText('id=\u200B"iframeBody"', devToolsPage);
       await waitForStyleRule('#iframeBody', devToolsPage);
       const inspectedRulesAfter = await getDisplayedStyleRulesCompact(devToolsPage);
       const expectedInspectedRulesAfter = [
         {
           selectorText: 'element.style',
           propertyNames: [],
         },
         {
           selectorText: '#iframeBody',
           propertyNames: [
             'background',
             'background-image',
             'background-position-x',
             'background-position-y',
             'background-size',
             'background-repeat',
             'background-attachment',
             'background-origin',
             'background-clip',
             'background-color',
           ],
         },
         {
           selectorText: 'body',
           propertyNames: [
             'background',
             'background-image',
             'background-position-x',
             'background-position-y',
             'background-size',
             'background-repeat',
             'background-attachment',
             'background-origin',
             'background-clip',
             'background-color',
           ],
         },
         {
           selectorText: 'body',
           propertyNames: ['display', 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
         },
       ];
       assert.deepEqual(inspectedRulesAfter, expectedInspectedRulesAfter);
     });

  it('can parse webkit css region styling (ported layout test)', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/css-webkit-region.html', devToolsPage, inspectedPage);
    await prepareElementsTab(devToolsPage);
    await waitForStyleRule('body', devToolsPage);
    await waitForAndClickTreeElementWithPartialText('id=\u200B"article1"', devToolsPage);
    await waitForStyleRule('#article1', devToolsPage);
    await waitForAndClickTreeElementWithPartialText('id=\u200B"p1"', devToolsPage);
    await waitForStyleRule('#p1', devToolsPage);
    const inspectedRules = await getDisplayedStyleRulesCompact(devToolsPage);
    const expectedInspectedRules = [
      {
        selectorText: 'element.style',
        propertyNames: [],
      },
      {
        selectorText: '#p1',
        propertyNames: ['color'],
      },
      {
        selectorText: 'p',
        propertyNames: [
          'display',
          'margin-block-start',
          'margin-block-end',
          'margin-inline-start',
          'margin-inline-end',
          'unicode-bidi',
        ],
      },
    ];
    assert.deepEqual(inspectedRules, expectedInspectedRules);
  });

  it('can display @scope at-rules', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/css-scopes.html', devToolsPage, inspectedPage);

    // Select the child that has @scope rules.
    await waitForAndClickTreeElementWithPartialText('<div class=\u200B"rule1">\u200B</div>\u200B', devToolsPage);
    await waitForContentOfSelectedElementsNode('<div class=\u200B"rule1">\u200B</div>\u200B', devToolsPage);

    const rule1PropertiesSection = await getStyleRule(RULE1_SELECTOR, devToolsPage);
    const scopeQuery = await devToolsPage.waitFor('.query.editable', rule1PropertiesSection);
    const scopeQueryText = await scopeQuery.evaluate(node => (node as HTMLElement).innerText);
    assert.deepEqual(scopeQueryText, '@scope (body) {', 'incorrectly displayed @supports rule');
  });

  it('shows an infobox with specificity information when hovering a selector',
     async ({devToolsPage, inspectedPage}) => {
       await goToResourceAndWaitForStyleSection('elements/css-specificity.html', devToolsPage, inspectedPage);

       // Select the child that has a style rule attached
       await waitForAndClickTreeElementWithPartialText('properties-to-inspect', devToolsPage);
       await waitForContentOfSelectedElementsNode(
           '<div id=\u200B"properties-to-inspect">\u200B</div>\u200B', devToolsPage);

       // Hover the selector in the Styles pane
       const testElementRule = await getStyleRule(PROPERTIES_TO_INSPECT_SELECTOR, devToolsPage);
       await devToolsPage.hover('.selector-matches', {root: testElementRule});

       // Check if an infobox is shown or not. If not, this will throw
       const infobox = await devToolsPage.waitFor('.styles-selector :popover-open');
       await expectVeEvents(
           [veImpressionsUnder(
               'Panel: elements > Pane: styles > Section: style-properties > CSSRuleHeader: selector',
               [veImpression('Popover', 'elements.css-selector-specificity')])],
           undefined, devToolsPage);

       // Make sure it’s the specificity infobox
       const innerText = await infobox.evaluate(node => (node as HTMLElement).innerText);
       assert.isTrue(innerText?.toLowerCase().startsWith('specificity'));
     });

  describe('Editing', () => {
    async function assertBodyColor(expected: string, inspectedPage: InspectedPage) {
      assert.strictEqual(
          await inspectedPage.evaluate(() => {
            return getComputedStyle(document.body).color;
          }),
          expected);
    }

    async function assertIsEditing(isEditing: boolean, devToolsPage: DevToolsPage) {
      // .child-editing class is added by StylePropertyTreeElement when user edits a value.
      assert.lengthOf(await devToolsPage.$$('.child-editing'), isEditing ? 1 : 0);
    }

    const green = 'rgb(0, 255, 0)';
    const blue = 'rgb(0, 0, 255)';

    it('cancels editing if the page is reloaded', async ({devToolsPage, inspectedPage}) => {
      await goToResourceAndWaitForStyleSection('elements/simple-body-color.html', devToolsPage, inspectedPage);
      await assertBodyColor(green, inspectedPage);

      // Start editing.
      await focusCSSPropertyValue('body', 'color', devToolsPage);
      await devToolsPage.page.keyboard.type(blue, {delay: 100});
      await assertBodyColor(blue, inspectedPage);
      await assertIsEditing(true, devToolsPage);

      // Reload and wait for styles.
      await goToResourceAndWaitForStyleSection('elements/simple-body-color.html', devToolsPage, inspectedPage);

      // Expect the editing to be discarded and the editing mode turned off.
      await waitForCSSPropertyValue('body', 'color', green, undefined, devToolsPage);
      await assertBodyColor(green, inspectedPage);
      await assertIsEditing(false, devToolsPage);
    });

    it('cancels editing on Esc', async ({devToolsPage, inspectedPage}) => {
      await goToResourceAndWaitForStyleSection('elements/simple-body-color.html', devToolsPage, inspectedPage);
      await assertBodyColor(green, inspectedPage);

      // Start editing.
      await focusCSSPropertyValue('body', 'color', devToolsPage);
      await devToolsPage.page.keyboard.type(blue, {delay: 100});
      await assertBodyColor(blue, inspectedPage);
      await assertIsEditing(true, devToolsPage);
      await devToolsPage.page.keyboard.press('Escape');

      // Expect the editing to be discarded and the editing mode turned off.
      await waitForCSSPropertyValue('body', 'color', green, undefined, devToolsPage);
      await assertBodyColor(green, inspectedPage);
      await assertIsEditing(false, devToolsPage);
    });
  });

  it('correctly renders and updates light-dark properties using UA color scheme',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToHtml(`
       <style>
       body {
         color-scheme: light dark;
         color: light-dark(red, blue);
       }
       </style>`);
       await waitForElementsStyleSection(undefined, devToolsPage);

       const color = await inspectedPage.evaluate(() => {
         return getComputedStyle(document.body).color;
       });

       const red = 'rgb(255, 0, 0)';
       const blue = 'rgb(0, 0, 255)';
       assert.isTrue(color === red || color === blue, 'light-dark color is neither red nor blue');

       await openPanelViaMoreTools('Rendering', devToolsPage);

       let isLight = color === red;

       await waitForLightDark(isLight);
       isLight = await toggleColorScheme(!isLight);
       await waitForLightDark(isLight);
       isLight = await toggleColorScheme(!isLight);
       await waitForLightDark(isLight);
       isLight = await toggleColorScheme(!isLight);
       await waitForLightDark(isLight);

       async function toggleColorScheme(isLight: boolean): Promise<boolean> {
         const select = await devToolsPage.waitFor('select:has(> option[value="light"])');
         return await select.evaluate((select, isLight) => {
           (select as HTMLSelectElement).selectedIndex = isLight ? 2 : 1;
           return !isLight;
         }, isLight);
       }

       async function waitForLightDark(isLight: boolean): Promise<void> {
         await devToolsPage.waitForFunction(async () => {
           const property = await getCSSPropertyInRule('body', 'color', undefined, devToolsPage);
           if (!property) {
             return undefined;
           }
           const swatches = await devToolsPage.waitForMany('.color-swatch-inner', 3);
           const swatchColors = await Promise.all(
               swatches.map(swatch => swatch.evaluate(swatch => getComputedStyle(swatch).backgroundColor)));
           assert.deepEqual(swatchColors.slice(1), [red, blue]);

           return isLight ? swatchColors[0] === red : swatchColors[0] === blue;
         });
       }
     });
});
