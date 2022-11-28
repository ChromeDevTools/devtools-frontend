// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Elements from '../../../../../front_end/panels/elements/elements.js';
import * as InlineEditor from '../../../../../front_end/ui/legacy/components/inline_editor/inline_editor.js';
import {renderElementIntoDOM} from '../../helpers/DOMHelpers.js';
import {describeWithEnvironment, describeWithLocale} from '../../helpers/EnvironmentHelpers.js';

const CSSPropertyPrompt = Elements.StylesSidebarPane.CSSPropertyPrompt;

const CSS_VARIABLES_FOR_TEST: Record<string, string> = {
  '--rgb-color': 'rgb(0 0 0)',
  '--wide-gamut-color': 'lch(0 0 0)',
};

const mockTreeItem = {
  property: {
    name: 'color',
  },
  node() {
    return {
      isSVGNode() {
        return false;
      },
      domModel() {
        return {
          cssModel() {
            return {
              getComputedStyle() {
                return new Map<string, string>();
              },
            };
          },
        };
      },
    };
  },
  matchedStyles() {
    return {
      availableCSSVariables(): string[] {
        return ['--rgb-color', '--wide-gamut-color'];
      },
      computeCSSVariable(_: unknown, completion: string): string |
          undefined {
            return CSS_VARIABLES_FOR_TEST[completion];
          },
    };
  },
} as unknown as Elements.StylePropertyTreeElement.StylePropertyTreeElement;

const noop = () => {};

describeWithLocale('CSSPropertyPrompt', () => {
  describeWithEnvironment('value autocompletion', () => {
    it('shows autocomplete item with color swatch for CSS variables with RGB color', async () => {
      const attachedElement = document.createElement('div');
      renderElementIntoDOM(attachedElement);
      const cssPropertyPrompt = new CSSPropertyPrompt(mockTreeItem, false);

      cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);
      const spyObj = sinon.spy(cssPropertyPrompt.suggestBoxForTest());
      cssPropertyPrompt.setText('var(--rgb');
      await cssPropertyPrompt.complete(true);

      const colorCompletions = spyObj?.updateSuggestions.firstCall.args[1];
      const renderedElement = colorCompletions?.[0].subtitleRenderer?.();
      assert.instanceOf(renderedElement, InlineEditor.ColorSwatch.ColorSwatch);
    });

    it('shows autocomplete item with color swatch for CSS variables with wide gamut color', async () => {
      const attachedElement = document.createElement('div');
      renderElementIntoDOM(attachedElement);
      const cssPropertyPrompt = new CSSPropertyPrompt(mockTreeItem, false);

      cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);
      const spyObj = sinon.spy(cssPropertyPrompt.suggestBoxForTest());
      cssPropertyPrompt.setText('var(--wide');
      await cssPropertyPrompt.complete(true);

      const colorCompletions = spyObj?.updateSuggestions.firstCall.args[1];
      const renderedElement = colorCompletions?.[0].subtitleRenderer?.();
      assert.instanceOf(renderedElement, InlineEditor.ColorSwatch.ColorSwatch);
    });

    it('shows autocomplete property names for CSS aliases', async () => {
      const attachedElement = document.createElement('div');
      renderElementIntoDOM(attachedElement);
      const cssPropertyPrompt = new CSSPropertyPrompt(mockTreeItem, true);

      cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);
      const spyObj = sinon.spy(cssPropertyPrompt.suggestBoxForTest());
      cssPropertyPrompt.setText('word-wra');
      await cssPropertyPrompt.complete(true);
      const completions = spyObj?.updateSuggestions.firstCall.args[1];
      assert.strictEqual(completions?.[0].text, 'word-wrap');
      assert.strictEqual(completions?.[1].text, 'overflow-wrap');
      assert.strictEqual(completions?.[1].subtitle, '= word-wrap');
    });
  });
});
