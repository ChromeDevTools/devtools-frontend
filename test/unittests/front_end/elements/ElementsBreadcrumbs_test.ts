// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ElementsBreadcrumbs} from '../../../../front_end/elements/ElementsBreadcrumbs.js';
import {crumbsToRender, determineElementTitle, DOMNode} from '../../../../front_end/elements/ElementsBreadcrumbsUtils.js';
import {assertElements, assertShadowRoot, renderElementIntoDOM} from '../helpers/DOMHelpers.js';

const {assert} = chai;

interface MakeCrumbOptions extends Partial<DOMNode> {
  attributes?: {[x: string]: string}
}

const makeCrumb = (overrides: MakeCrumbOptions = {}) => {
  const attributes = overrides.attributes || {};
  const newCrumb: DOMNode = {
    nodeType: Node.ELEMENT_NODE,
    id: 1,
    pseudoType: '',
    shadowRootType: '',
    nodeName: 'body',
    nodeNameNicelyCased: 'body',
    legacyDomNode: {},
    highlightNode: () => {},
    clearHighlight: () => {},
    getAttribute: x => attributes[x] || '',
    ...overrides,
  };
  return newCrumb;
};

describe('ElementsBreadcrumbs', () => {
  describe('#determineElementTitle', () => {
    it('returns (text) for text nodes', () => {
      const node = makeCrumb({nodeType: Node.TEXT_NODE});
      const title = determineElementTitle(node);
      assert.deepEqual(title, {
        main: '(text)',
        extras: {},
      });
    });

    it('returns <!--> for comments', () => {
      const node = makeCrumb({nodeType: Node.COMMENT_NODE});
      const title = determineElementTitle(node);
      assert.deepEqual(title, {main: '<!-->', extras: {}});
    });

    it('returns <!doctype> for doctypes', () => {
      const node = makeCrumb({nodeType: Node.DOCUMENT_TYPE_NODE});
      const title = determineElementTitle(node);
      assert.deepEqual(title, {main: '<!doctype>', extras: {}});
    });

    describe('for DOCUMENT_FRAGMENT_NODE types', () => {
      it('shows the shadowRoot if the document is a shadowRootType', () => {
        const node = makeCrumb({
          nodeType: Node.DOCUMENT_FRAGMENT_NODE,
          shadowRootType: 'shadowRoot',
          nodeNameNicelyCased: 'test-elem',
        });
        const title = determineElementTitle(node);
        assert.deepEqual(title, {main: '#shadow-root', extras: {}});
      });

      it('shows the nice name if there is not a shadow root', () => {
        const node = makeCrumb({
          nodeType: Node.DOCUMENT_FRAGMENT_NODE,
          shadowRootType: undefined,
          nodeNameNicelyCased: 'test-elem',
        });
        const title = determineElementTitle(node);
        assert.deepEqual(title, {main: 'test-elem', extras: {}});
      });
    });

    describe('for element nodes', () => {
      it('takes the nicely cased node name by default', () => {
        const node = makeCrumb({nodeType: Node.ELEMENT_NODE, nodeNameNicelyCased: 'div'});
        const title = determineElementTitle(node);
        assert.deepEqual(title, {main: 'div', extras: {}});
      });

      it('uses the pseudoType if that is passed', () => {
        const node = makeCrumb({nodeType: Node.ELEMENT_NODE, pseudoType: 'test'});
        const title = determineElementTitle(node);
        assert.deepEqual(title, {main: '::test', extras: {}});
      });

      it('adds the ID as an extra if present', () => {
        const node = makeCrumb({nodeType: Node.ELEMENT_NODE, nodeNameNicelyCased: 'div', attributes: {id: 'test'}});
        const title = determineElementTitle(node);
        assert.deepEqual(title, {
          main: 'div',
          extras: {
            id: 'test',
          },
        });
      });

      it('adds classes as extras if present', () => {
        const node = makeCrumb({
          nodeType: Node.ELEMENT_NODE,
          nodeNameNicelyCased: 'div',
          attributes: {class: 'class1 class2'},
        });
        const title = determineElementTitle(node);
        assert.deepEqual(title, {
          main: 'div',
          extras: {
            classes: ['class1', 'class2'],
          },
        });
      });
    });

    it('falls back to the nicely cased name if the node is any other type', () => {
      const node = makeCrumb({
        nodeType: Node.CDATA_SECTION_NODE,
        nodeNameNicelyCased: 'not-special-cased-node-type',
      });
      const title = determineElementTitle(node);
      assert.deepEqual(title, {
        main: 'not-special-cased-node-type',
        extras: {},
      });
    });
  });

  describe('crumbsToRender', () => {
    it('returns an empty array when there is no selected node', () => {
      const result = crumbsToRender([], null);
      assert.deepEqual(result, []);
    });

    it('excludes the document node', () => {
      const documentCrumb = makeCrumb({
        nodeType: Node.DOCUMENT_NODE,
        id: 1,
        nodeName: 'document',
        nodeNameNicelyCased: 'document',
      });

      const bodyCrumb = makeCrumb({
        nodeType: Node.ELEMENT_NODE,
        id: 2,
        nodeName: 'body',
        nodeNameNicelyCased: 'body',
      });

      const result = crumbsToRender([documentCrumb, bodyCrumb], bodyCrumb);

      assert.deepEqual(result, [
        {
          title: {
            main: 'body',
            extras: {},
          },
          selected: true,
          node: bodyCrumb,
          originalNode: bodyCrumb.legacyDomNode,
        },
      ]);
    });
  });

  describe('rendering breadcrumbs', () => {
    it('renders all the breadcrumbs provided', () => {
      const component = new ElementsBreadcrumbs();
      renderElementIntoDOM(component);

      const bodyCrumb = makeCrumb({
        nodeType: Node.ELEMENT_NODE,
        id: 2,
        nodeName: 'body',
        nodeNameNicelyCased: 'body',
      });

      const divCrumb = makeCrumb({
        nodeType: Node.ELEMENT_NODE,
        id: 3,
        nodeName: 'div',
        nodeNameNicelyCased: 'div',
        attributes: {
          id: 'test-id',
        },
      });

      component.data = {
        crumbs: [divCrumb, bodyCrumb],
        selectedNode: bodyCrumb,
      };

      assertShadowRoot(component.shadowRoot);

      const crumbs = Array.from(component.shadowRoot.querySelectorAll('[data-crumb]'));

      assert.lengthOf(crumbs, 2);
    });

    it('highlights the active breadcrumb', () => {
      const component = new ElementsBreadcrumbs();
      renderElementIntoDOM(component);

      const bodyCrumb = makeCrumb({
        nodeType: Node.ELEMENT_NODE,
        id: 2,
        nodeName: 'body',
        nodeNameNicelyCased: 'body',
      });

      const divCrumb = makeCrumb({
        nodeType: Node.ELEMENT_NODE,
        id: 3,
        nodeName: 'div',
        nodeNameNicelyCased: 'div',
        attributes: {
          id: 'test-id',
        },
      });

      component.data = {
        crumbs: [divCrumb, bodyCrumb],
        selectedNode: bodyCrumb,
      };

      assertShadowRoot(component.shadowRoot);

      const activeCrumbs = component.shadowRoot.querySelectorAll('.crumb.selected');
      assert.lengthOf(activeCrumbs, 1);
    });

    it('shows the scrolling icons if the crumbs do not fit in their container', () => {
      const thinWrapper = document.createElement('div');
      thinWrapper.style.width = '100px';

      const component = new ElementsBreadcrumbs();
      thinWrapper.appendChild(component);

      renderElementIntoDOM(thinWrapper);

      const bodyCrumb = makeCrumb({
        nodeType: Node.ELEMENT_NODE,
        id: 2,
        nodeName: 'body',
        nodeNameNicelyCased: 'body',
        attributes: {
          class: 'test-class-1 test-class-2 test-class-3',
        },
      });

      const divCrumb = makeCrumb({
        nodeType: Node.ELEMENT_NODE,
        id: 3,
        nodeName: 'div',
        nodeNameNicelyCased: 'div',
        attributes: {
          id: 'test-id-with-a-really-long-name',
        },
      });

      component.data = {
        crumbs: [divCrumb, bodyCrumb],
        selectedNode: bodyCrumb,
      };

      assertShadowRoot(component.shadowRoot);

      const scrollButtons = component.shadowRoot.querySelectorAll('button.overflow');
      assertElements(scrollButtons, HTMLButtonElement);

      if (!scrollButtons) {
        assert.fail('Expected to find some scrollButtons');
        return;
      }

      assert.strictEqual(scrollButtons.length, 2, 'there are two scroll buttons');

      const leftButton = scrollButtons[0];
      const rightButton = scrollButtons[1];

      assert.isTrue(leftButton.disabled);
      assert.isFalse(rightButton.disabled);
    });
  });
});
