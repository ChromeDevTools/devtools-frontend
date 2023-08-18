// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as LitHtml from '../../../../../front_end/ui/lit-html/lit-html.js';
import * as i18n from '../../../../../front_end/core/i18n/i18n.js';
import * as i18nRaw from '../../../../../front_end/third_party/i18n/i18n.js';

const templateArray = (value: string[]): TemplateStringsArray => {
  // We assume here it's okay to lose the `raw` value from the TemplateStringsArray
  // for the purposes of testing.
  return value as unknown as TemplateStringsArray;
};

describe('Static', () => {
  describe('flattenTemplate', () => {
    it('does not flatten template strings with no statics or values', () => {
      const content = LitHtml.flattenTemplate`No update needed`;
      assert.deepStrictEqual(content.strings, templateArray(['No update needed']));
      assert.deepStrictEqual(content.valueMap, []);
    });

    it('does not flatten template strings with just values', () => {
      const content = LitHtml.flattenTemplate`Just ${1} value`;
      assert.deepStrictEqual(content.strings, templateArray(['Just ', ' value']));
      assert.deepStrictEqual(content.valueMap, [true]);
    });

    it('does flatten template strings with statics', () => {
      const tag = LitHtml.literal`div`;
      const content = LitHtml.flattenTemplate`<${tag}>Foo</${tag}>`;
      assert.deepStrictEqual(content.strings, templateArray(['<div>Foo</div>']));
      assert.deepStrictEqual(content.valueMap, [false, false]);
    });

    it('does flatten template strings with statics but leaves values alone', () => {
      const tag = LitHtml.literal`div`;
      const name = 'Everyone!';
      const content = LitHtml.flattenTemplate`<${tag}>Hello, ${name}!</${tag}>`;
      assert.deepStrictEqual(content.strings, templateArray(['<div>Hello, ', '!</div>']));
      assert.deepStrictEqual(content.valueMap, [false, true, false]);
    });

    it('ignores data values', () => {
      const tag = LitHtml.literal`div`;
      const name = 'everyone!';
      const content = LitHtml.flattenTemplate`<${tag} .data={{x: 1}}>Hello, ${name}!</${tag}>`;
      assert.deepStrictEqual(content.strings, templateArray(['<div .data={{x: 1}}>Hello, ', '!</div>']));
      assert.deepStrictEqual(content.valueMap, [false, true, false]);
    });

    it('flattens multiple values', () => {
      const tag = LitHtml.literal`div`;
      const message = 'Hello, everyone!';
      const content = LitHtml.flattenTemplate`<${tag}>${1}${2}${3}, ${message}! ${'Static value'}!</${tag}>`;
      assert.deepStrictEqual(content.strings, templateArray(['<div>', '', '', ', ', '! ', '!</div>']));
      assert.deepStrictEqual(content.valueMap, [false, true, true, true, true, true, false]);
    });
  });

  describe('rendering', () => {
    it('renders non-statics', () => {
      const tmpl = LitHtml.html`Hello, world ${123}!`;
      const target = document.createElement('div');
      LitHtml.render(tmpl, target);

      assert.strictEqual(target.innerText, 'Hello, world 123!');
    });

    it('renders static tags', () => {
      const tag = LitHtml.literal`div`;
      const tmpl = LitHtml.html`<${tag}>Hello, world!</${tag}>`;
      const target = document.createElement('section');
      LitHtml.render(tmpl, target);

      assert.strictEqual(target.innerText, 'Hello, world!');
      assert.isNotNull(target.querySelector('div'));
    });

    it('renders multiple', () => {
      const tag = LitHtml.literal`div`;
      const message = 'Hello, everyone!';
      const tmpl = LitHtml.html`<${tag} .data={{x: 1}}>${1}${2}${3}, ${message}! ${'Static value'}!</${tag}>`;

      const target = document.createElement('div');
      LitHtml.render(tmpl, target);

      assert.strictEqual(target.innerText, '123, Hello, everyone!! Static value!');
      assert.isNotNull(target.querySelector('div'));
    });
  });

  describe('i18nTemplate', () => {
    const uiStrings = {placeholder: 'a message with a {string} and {template} placeholder'};
    let i18nInstance: i18nRaw.I18n.I18n;

    beforeEach(() => {
      i18nInstance = new i18nRaw.I18n.I18n(['en-US'], 'en-US');
      i18nInstance.registerLocaleData('en-US', {});
    });

    function setLocale(locale: string) {
      i18n.DevToolsLocale.DevToolsLocale.instance({
        create: true,
        data: {
          settingLanguage: locale,
          navigatorLanguage: locale,
          lookupClosestDevToolsLocale: l => l,
        },
      });
    }

    it('localizes lit templates', () => {
      const strings = i18nInstance.registerFileStrings('test.ts', uiStrings);
      setLocale('en-US');

      const result =
          LitHtml.i18nTemplate(strings, uiStrings.placeholder, {string: 'STRING', template: LitHtml.html`TEMPLATE`});
      const element = LitHtml.render(result, document.createElement('div'));
      assert.deepStrictEqual(
          (element.parentNode as HTMLDivElement).innerText, 'a message with a STRING and TEMPLATE placeholder');
    });

    it('localizes lit templates with translations', () => {
      i18nInstance.registerLocaleData(
          'de', {'test.ts | placeholder': {message: 'a message with a {template} and {string} placeholder'}});
      const strings = i18nInstance.registerFileStrings('test.ts', uiStrings);
      setLocale('de');

      const result =
          LitHtml.i18nTemplate(strings, uiStrings.placeholder, {string: 'STRING', template: LitHtml.html`TEMPLATE`});
      const element = LitHtml.render(result, document.createElement('div'));
      assert.deepStrictEqual(
          (element.parentNode as HTMLDivElement).innerText, 'a message with a TEMPLATE and STRING placeholder');
    });
  });
});
