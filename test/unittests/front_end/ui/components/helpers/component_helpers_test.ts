// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../../../../front_end/ui/components/helpers/helpers.js';
import * as ThemeSupport from '../../../../../../front_end/ui/legacy/theme_support/theme_support.js';
import * as LitHtml from '../../../../../../front_end/ui/lit-html/lit-html.js';

const {assert} = chai;

describe('ComponentHelpers', () => {
  describe('getStylesheets', () => {
    it('returns a single stylesheet with the contents of the resource', () => {
      const sheets = ComponentHelpers.GetStylesheet.getStyleSheets('ui/legacy/inspectorCommon.css');
      assert.lengthOf(sheets, 1);
      assert.instanceOf(sheets[0], CSSStyleSheet);
    });

    it('caches the stylesheet rather than constructing it every time', () => {
      const firstCallSheet = ComponentHelpers.GetStylesheet.getStyleSheets('ui/legacy/inspectorCommon.css')[0];
      const secondCallSheet = ComponentHelpers.GetStylesheet.getStyleSheets('ui/legacy/inspectorCommon.css')[0];
      assert.strictEqual(firstCallSheet, secondCallSheet);
    });

    describe('patching stylesheets', () => {
      beforeEach(() => {
        // Patch theme support to return a patch in all cases, necessary for testing these
        // particular set of behaviors.
        ThemeSupport.ThemeSupport.instance().themeStyleSheet = () => {
          return 'p { color: red; }';
        };
      });

      it('returns the original and the patched stylesheet if there is a themed stylesheet and the option is set',
         () => {
           const sheets = ComponentHelpers.GetStylesheet.getStyleSheets(
               'ui/legacy/inspectorCommon.css', {enableLegacyPatching: true});
           assert.lengthOf(sheets, 2);
           assert.instanceOf(sheets[0], CSSStyleSheet);
           assert.instanceOf(sheets[1], CSSStyleSheet);
         });

      it('does not patch by default', () => {
        const sheets = ComponentHelpers.GetStylesheet.getStyleSheets('ui/legacy/inspectorCommon.css');
        assert.lengthOf(sheets, 1);
        assert.instanceOf(sheets[0], CSSStyleSheet);
      });
    });
  });

  describe('setCSSProperty', () => {
    it('sets a property on the shadow root host element', () => {
      class TestComponent extends HTMLElement {
        shadow = this.attachShadow({mode: 'open'});

        constructor() {
          super();
          ComponentHelpers.SetCSSProperty.set(this, '--test-var', 'blue');
        }
      }

      customElements.define('set-css-property-test-component', TestComponent);

      const instance = new TestComponent();
      assert.strictEqual(instance.style.getPropertyValue('--test-var'), 'blue');
    });
  });

  describe('Directives', () => {
    describe('nodeRenderedCallback', () => {
      it('runs when any node is rendered', () => {
        const targetDiv = document.createElement('div');
        const callback = sinon.spy();
        function fakeComponentRender() {
          // clang-format off
          const html = LitHtml.html`
          <span on-render=${ComponentHelpers.Directives.nodeRenderedCallback(callback)}>
           hello world
          </span>`;
          // clang-format on
          LitHtml.render(html, targetDiv);
        }
        fakeComponentRender();
        assert.isNotEmpty(targetDiv.innerHTML);
        assert.strictEqual(callback.callCount, 1);
      });

      it('runs again when Lit re-renders', () => {
        const targetDiv = document.createElement('div');
        const callback = sinon.spy();
        function fakeComponentRender(output: string) {
          // clang-format off
          const html = LitHtml.html`
          <span on-render=${ComponentHelpers.Directives.nodeRenderedCallback(callback)}>
           ${output}
          </span>`;
          // clang-format on
          LitHtml.render(html, targetDiv);
        }
        fakeComponentRender('render one');
        assert.strictEqual(callback.callCount, 1);
        fakeComponentRender('render two');
        assert.strictEqual(callback.callCount, 2);
      });
    });
  });
});
