// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ElementsModule from '../../../../front_end/elements/elements.js';
import {assertElement, assertElements, assertShadowRoot, dispatchClickEvent, doubleRaf, renderElementIntoDOM, waitForScrollLeft} from '../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../helpers/EnvironmentHelpers.js';
import {withNoMutations} from '../helpers/MutationHelpers.js';

const {assert} = chai;


interface MakeCrumbOptions extends Partial<ElementsModule.ElementsBreadcrumbsUtils.DOMNode> {
  attributes?: {[x: string]: string};
}

const makeCrumb = (overrides: MakeCrumbOptions = {}) => {
  const attributes = overrides.attributes || {};
  const newCrumb: ElementsModule.ElementsBreadcrumbsUtils.DOMNode = {
    parentNode: null,
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

describeWithEnvironment('ElementsBreadcrumbs', () => {
  let Elements: typeof ElementsModule;
  before(async () => {
    Elements = await import('../../../../front_end/elements/elements.js');
  });

  describe('#determineElementTitle', () => {
    it('returns (text) for text nodes', () => {
      const node = makeCrumb({nodeType: Node.TEXT_NODE});
      const title = Elements.ElementsBreadcrumbsUtils.determineElementTitle(node);
      assert.deepEqual(title, {
        main: '(text)',
        extras: {},
      });
    });

    it('returns <!--> for comments', () => {
      const node = makeCrumb({nodeType: Node.COMMENT_NODE});
      const title = Elements.ElementsBreadcrumbsUtils.determineElementTitle(node);
      assert.deepEqual(title, {main: '<!-->', extras: {}});
    });

    it('returns <!doctype> for doctypes', () => {
      const node = makeCrumb({nodeType: Node.DOCUMENT_TYPE_NODE});
      const title = Elements.ElementsBreadcrumbsUtils.determineElementTitle(node);
      assert.deepEqual(title, {main: '<!doctype>', extras: {}});
    });

    describe('for DOCUMENT_FRAGMENT_NODE types', () => {
      it('shows the shadowRoot if the document is a shadowRootType', () => {
        const node = makeCrumb({
          nodeType: Node.DOCUMENT_FRAGMENT_NODE,
          shadowRootType: 'shadowRoot',
          nodeNameNicelyCased: 'test-elem',
        });
        const title = Elements.ElementsBreadcrumbsUtils.determineElementTitle(node);
        assert.deepEqual(title, {main: '#shadow-root', extras: {}});
      });

      it('shows the nice name if there is not a shadow root', () => {
        const node = makeCrumb({
          nodeType: Node.DOCUMENT_FRAGMENT_NODE,
          shadowRootType: undefined,
          nodeNameNicelyCased: 'test-elem',
        });
        const title = Elements.ElementsBreadcrumbsUtils.determineElementTitle(node);
        assert.deepEqual(title, {main: 'test-elem', extras: {}});
      });
    });

    describe('for element nodes', () => {
      it('takes the nicely cased node name by default', () => {
        const node = makeCrumb({nodeType: Node.ELEMENT_NODE, nodeNameNicelyCased: 'div'});
        const title = Elements.ElementsBreadcrumbsUtils.determineElementTitle(node);
        assert.deepEqual(title, {main: 'div', extras: {}});
      });

      it('uses the pseudoType if that is passed', () => {
        const node = makeCrumb({nodeType: Node.ELEMENT_NODE, pseudoType: 'test'});
        const title = Elements.ElementsBreadcrumbsUtils.determineElementTitle(node);
        assert.deepEqual(title, {main: '::test', extras: {}});
      });

      it('adds the ID as an extra if present', () => {
        const node = makeCrumb({nodeType: Node.ELEMENT_NODE, nodeNameNicelyCased: 'div', attributes: {id: 'test'}});
        const title = Elements.ElementsBreadcrumbsUtils.determineElementTitle(node);
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
        const title = Elements.ElementsBreadcrumbsUtils.determineElementTitle(node);
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
      const title = Elements.ElementsBreadcrumbsUtils.determineElementTitle(node);
      assert.deepEqual(title, {
        main: 'not-special-cased-node-type',
        extras: {},
      });
    });
  });

  describe('crumbsToRender', () => {
    it('returns an empty array when there is no selected node', () => {
      const result = Elements.ElementsBreadcrumbsUtils.crumbsToRender([], null);
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

      const result = Elements.ElementsBreadcrumbsUtils.crumbsToRender([documentCrumb, bodyCrumb], bodyCrumb);

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
      const component = new Elements.ElementsBreadcrumbs.ElementsBreadcrumbs();
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
      const component = new Elements.ElementsBreadcrumbs.ElementsBreadcrumbs();
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

    it('updates the text if a crumb\'s title changes', async () => {
      const component = new Elements.ElementsBreadcrumbs.ElementsBreadcrumbs();
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
      await withNoMutations(component.shadowRoot, shadowRoot => {
        const newDiv: ElementsModule.ElementsBreadcrumbsUtils
            .DOMNode = {...divCrumb, nodeName: 'span', nodeNameNicelyCased: 'span'};
        component.data = {
          crumbs: [newDiv, bodyCrumb],
          selectedNode: bodyCrumb,
        };

        const renderedTextForUpdatedCrumb = shadowRoot.querySelector('.crumb:last-child devtools-node-text');
        assertElement(renderedTextForUpdatedCrumb, HTMLElement);
        assert.strictEqual(renderedTextForUpdatedCrumb.dataset.nodeTitle, 'span');
      });
    });

    describe('when the breadcrumbs overflow', () => {
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

      it('shows the scrolling icons if the crumbs do not fit in their container', () => {
        const thinWrapper = document.createElement('div');
        thinWrapper.style.width = '400px';

        const component = new Elements.ElementsBreadcrumbs.ElementsBreadcrumbs();
        thinWrapper.appendChild(component);

        renderElementIntoDOM(thinWrapper);

        component.data = {
          crumbs: [divCrumb, bodyCrumb],
          selectedNode: bodyCrumb,
        };

        assertShadowRoot(component.shadowRoot);

        const scrollButtons = component.shadowRoot.querySelectorAll('button.overflow');
        assertElements(scrollButtons, HTMLButtonElement);

        assert.strictEqual(scrollButtons.length, 2, 'there are two scroll buttons');
        const leftButton = scrollButtons[0];
        const rightButton = scrollButtons[1];

        assert.isTrue(leftButton.disabled);
        assert.isFalse(rightButton.disabled);
      });

      it('disables the right button once the user has scrolled to the end', async () => {
        const thinWrapper = document.createElement('div');
        thinWrapper.style.width = '400px';

        const component = new Elements.ElementsBreadcrumbs.ElementsBreadcrumbs();
        thinWrapper.appendChild(component);

        renderElementIntoDOM(thinWrapper);

        component.data = {
          crumbs: [divCrumb, bodyCrumb],
          selectedNode: bodyCrumb,
        };

        assertShadowRoot(component.shadowRoot);

        const rightButton = component.shadowRoot.querySelector('button.overflow.right');
        assertElement(rightButton, HTMLButtonElement);

        assert.isFalse(rightButton.disabled);

        await withNoMutations(component.shadowRoot, async shadowRoot => {
          dispatchClickEvent(rightButton);
          const scrollWrapper = shadowRoot.querySelector('.crumbs-window');
          assertElement(scrollWrapper, HTMLDivElement);
          await waitForScrollLeft(scrollWrapper, 170);
          assert.isTrue(rightButton.disabled);
        });
      });

      it('hides the overflow buttons should the user resize the window to be large enough', async () => {
        const thinWrapper = document.createElement('div');
        thinWrapper.style.width = '400px';

        const component = new Elements.ElementsBreadcrumbs.ElementsBreadcrumbs();
        thinWrapper.appendChild(component);

        renderElementIntoDOM(thinWrapper);

        component.data = {
          crumbs: [divCrumb, bodyCrumb],
          selectedNode: bodyCrumb,
        };

        assertShadowRoot(component.shadowRoot);

        const leftButton = component.shadowRoot.querySelector('button.overflow.left');
        assertElement(leftButton, HTMLButtonElement);
        const rightButton = component.shadowRoot.querySelector('button.overflow.right');
        assertElement(rightButton, HTMLButtonElement);

        assert.isFalse(leftButton.classList.contains('hidden'));
        assert.isFalse(rightButton.classList.contains('hidden'));

        thinWrapper.style.width = '800px';
        // So the browser has time to paint
        await doubleRaf();

        assert.isTrue(leftButton.classList.contains('hidden'));
        assert.isTrue(rightButton.classList.contains('hidden'));
      });

      it('shows the overflow buttons should the user resize the window down to be small', async () => {
        const thinWrapper = document.createElement('div');
        thinWrapper.style.width = '800px';

        const component = new Elements.ElementsBreadcrumbs.ElementsBreadcrumbs();
        thinWrapper.appendChild(component);

        renderElementIntoDOM(thinWrapper);

        component.data = {
          crumbs: [divCrumb, bodyCrumb],
          selectedNode: bodyCrumb,
        };

        assertShadowRoot(component.shadowRoot);

        const leftButton = component.shadowRoot.querySelector('button.overflow.left');
        assertElement(leftButton, HTMLButtonElement);
        const rightButton = component.shadowRoot.querySelector('button.overflow.right');
        assertElement(rightButton, HTMLButtonElement);

        assert.isTrue(leftButton.classList.contains('hidden'));
        assert.isTrue(rightButton.classList.contains('hidden'));

        thinWrapper.style.width = '400px';
        // So the browser has time to paint
        await doubleRaf();

        assert.isFalse(leftButton.classList.contains('hidden'));
        assert.isFalse(rightButton.classList.contains('hidden'));
      });
    });
  });
});
