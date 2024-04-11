// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../../core/sdk/sdk.js';
import {
  assertElements,
  dispatchClickEvent,
  doubleRaf,
  renderElementIntoDOM,
  waitForScrollLeft,
} from '../../../testing/DOMHelpers.js';
import {
  deinitializeGlobalVars,
  initializeGlobalVars,
} from '../../../testing/EnvironmentHelpers.js';
import {withNoMutations} from '../../../testing/MutationHelpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as ElementsComponents from './components.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

interface MakeCrumbOptions extends Partial<ElementsComponents.Helper.DOMNode> {
  attributes?: {[x: string]: string};
}

/*
 * This very clearly is not a real legacy SDK DOMNode, but for the purposes of
 * the test we just need something that presents as one, and doesn't need to
 * implement anything */
const FAKE_LEGACY_SDK_DOM_NODE = {} as unknown as SDK.DOMModel.DOMNode;

const makeCrumb = (overrides: MakeCrumbOptions = {}) => {
  const attributes = overrides.attributes || {};
  const newCrumb: ElementsComponents.Helper.DOMNode = {
    parentNode: null,
    nodeType: Node.ELEMENT_NODE,
    id: 1,
    pseudoType: '',
    shadowRootType: '',
    nodeName: 'body',
    nodeNameNicelyCased: 'body',
    legacyDomNode: FAKE_LEGACY_SDK_DOM_NODE,
    highlightNode: () => {},
    clearHighlight: () => {},
    getAttribute: x => attributes[x] || '',
    ...overrides,
  };
  return newCrumb;
};

describe('ElementsBreadcrumbs', () => {
  before(async () => {
    await initializeGlobalVars();
  });
  after(async () => {
    await deinitializeGlobalVars();
  });
  describe('#determineElementTitle', () => {
    it('returns (text) for text nodes', () => {
      const node = makeCrumb({nodeType: Node.TEXT_NODE});
      const title = ElementsComponents.ElementsBreadcrumbsUtils.determineElementTitle(node);
      assert.deepEqual(title, {
        main: '(text)',
        extras: {},
      });
    });

    it('returns <!--> for comments', () => {
      const node = makeCrumb({nodeType: Node.COMMENT_NODE});
      const title = ElementsComponents.ElementsBreadcrumbsUtils.determineElementTitle(node);
      assert.deepEqual(title, {main: '<!-->', extras: {}});
    });

    it('returns <!doctype> for doctypes', () => {
      const node = makeCrumb({nodeType: Node.DOCUMENT_TYPE_NODE});
      const title = ElementsComponents.ElementsBreadcrumbsUtils.determineElementTitle(node);
      assert.deepEqual(title, {main: '<!doctype>', extras: {}});
    });

    describe('for DOCUMENT_FRAGMENT_NODE types', () => {
      it('shows the shadowRoot if the document is a shadowRootType', () => {
        const node = makeCrumb({
          nodeType: Node.DOCUMENT_FRAGMENT_NODE,
          shadowRootType: 'shadowRoot',
          nodeNameNicelyCased: 'test-elem',
        });
        const title = ElementsComponents.ElementsBreadcrumbsUtils.determineElementTitle(node);
        assert.deepEqual(title, {main: '#shadow-root', extras: {}});
      });

      it('shows the nice name if there is not a shadow root', () => {
        const node = makeCrumb({
          nodeType: Node.DOCUMENT_FRAGMENT_NODE,
          shadowRootType: undefined,
          nodeNameNicelyCased: 'test-elem',
        });
        const title = ElementsComponents.ElementsBreadcrumbsUtils.determineElementTitle(node);
        assert.deepEqual(title, {main: 'test-elem', extras: {}});
      });
    });

    describe('for element nodes', () => {
      it('takes the nicely cased node name by default', () => {
        const node = makeCrumb({nodeType: Node.ELEMENT_NODE, nodeNameNicelyCased: 'div'});
        const title = ElementsComponents.ElementsBreadcrumbsUtils.determineElementTitle(node);
        assert.deepEqual(title, {main: 'div', extras: {}});
      });

      it('uses the pseudoType if that is passed', () => {
        const node = makeCrumb({nodeType: Node.ELEMENT_NODE, pseudoType: 'test'});
        const title = ElementsComponents.ElementsBreadcrumbsUtils.determineElementTitle(node);
        assert.deepEqual(title, {main: '::test', extras: {}});
      });

      it('adds the ID as an extra if present', () => {
        const node = makeCrumb({nodeType: Node.ELEMENT_NODE, nodeNameNicelyCased: 'div', attributes: {id: 'test'}});
        const title = ElementsComponents.ElementsBreadcrumbsUtils.determineElementTitle(node);
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
        const title = ElementsComponents.ElementsBreadcrumbsUtils.determineElementTitle(node);
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
      const title = ElementsComponents.ElementsBreadcrumbsUtils.determineElementTitle(node);
      assert.deepEqual(title, {
        main: 'not-special-cased-node-type',
        extras: {},
      });
    });
  });

  describe('crumbsToRender', () => {
    it('returns an empty array when there is no selected node', () => {
      const result = ElementsComponents.ElementsBreadcrumbsUtils.crumbsToRender([], null);
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

      const result = ElementsComponents.ElementsBreadcrumbsUtils.crumbsToRender([documentCrumb, bodyCrumb], bodyCrumb);

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
    async function renderBreadcrumbs(data: ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbsData): Promise<{
      component: ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs,
      shadowRoot: ShadowRoot,
    }> {
      const component = new ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs();
      renderElementIntoDOM(component);
      component.data = data;

      await coordinator.done();
      assert.isNotNull(component.shadowRoot);
      return {
        component,
        shadowRoot: component.shadowRoot,
      };
    }

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

    it('renders all the breadcrumbs provided', async () => {
      const {shadowRoot} = await renderBreadcrumbs({
        crumbs: [divCrumb, bodyCrumb],
        selectedNode: bodyCrumb,
      });

      const crumbs = Array.from(shadowRoot.querySelectorAll('[data-crumb]'));
      assert.lengthOf(crumbs, 2);
    });

    it('highlights the active breadcrumb', async () => {
      const {shadowRoot} = await renderBreadcrumbs({
        crumbs: [divCrumb, bodyCrumb],
        selectedNode: bodyCrumb,
      });
      const activeCrumbs = shadowRoot.querySelectorAll('.crumb.selected');
      assert.lengthOf(activeCrumbs, 1);
    });

    it('updates the text if a crumb\'s title changes', async () => {
      const {component, shadowRoot} = await renderBreadcrumbs({
        crumbs: [divCrumb, bodyCrumb],
        selectedNode: bodyCrumb,
      });

      await withNoMutations(shadowRoot, async shadowRoot => {
        const newDiv: ElementsComponents.Helper.DOMNode = {...divCrumb, nodeName: 'span', nodeNameNicelyCased: 'span'};
        component.data = {
          crumbs: [newDiv, bodyCrumb],
          selectedNode: bodyCrumb,
        };

        await coordinator.done();

        const renderedTextForUpdatedCrumb = shadowRoot.querySelector('.crumb:last-child devtools-node-text');
        assert.instanceOf(renderedTextForUpdatedCrumb, HTMLElement);
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

      it('shows the scrolling icons if the crumbs do not fit in their container', async () => {
        const thinWrapper = document.createElement('div');
        thinWrapper.style.width = '400px';

        const component = new ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs();
        thinWrapper.appendChild(component);
        renderElementIntoDOM(thinWrapper);
        component.data = {
          crumbs: [divCrumb, bodyCrumb],
          selectedNode: bodyCrumb,
        };
        await coordinator.done();
        assert.isNotNull(component.shadowRoot);

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
        const component = new ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs();
        thinWrapper.appendChild(component);
        renderElementIntoDOM(thinWrapper);
        component.data = {
          crumbs: [divCrumb, bodyCrumb],
          selectedNode: bodyCrumb,
        };
        await coordinator.done();

        assert.isNotNull(component.shadowRoot);

        const rightButton = component.shadowRoot.querySelector('button.overflow.right');
        assert.instanceOf(rightButton, HTMLButtonElement);
        assert.isFalse(rightButton.disabled);

        await withNoMutations(component.shadowRoot, async shadowRoot => {
          dispatchClickEvent(rightButton);
          const scrollWrapper = shadowRoot.querySelector('.crumbs-window');
          assert.instanceOf(scrollWrapper, HTMLDivElement);
          await waitForScrollLeft(scrollWrapper, 100);
          await coordinator.done();
          assert.isTrue(rightButton.disabled);
        });
      });

      it('hides the overflow buttons should the user resize the window to be large enough', async () => {
        const thinWrapper = document.createElement('div');
        thinWrapper.style.width = '400px';
        const component = new ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs();
        thinWrapper.appendChild(component);
        renderElementIntoDOM(thinWrapper);
        component.data = {
          crumbs: [divCrumb, bodyCrumb],
          selectedNode: bodyCrumb,
        };
        await coordinator.done();

        assert.isNotNull(component.shadowRoot);

        const leftButton = component.shadowRoot.querySelector('button.overflow.left');
        assert.instanceOf(leftButton, HTMLButtonElement);
        const rightButton = component.shadowRoot.querySelector('button.overflow.right');
        assert.instanceOf(rightButton, HTMLButtonElement);

        assert.isFalse(leftButton.classList.contains('hidden'));
        assert.isFalse(rightButton.classList.contains('hidden'));

        thinWrapper.style.width = '800px';
        // Changing the width should trigger the resize observer, so we need to wait for that to happen.
        await doubleRaf();
        await coordinator.done();

        assert.isTrue(leftButton.classList.contains('hidden'));
        assert.isTrue(rightButton.classList.contains('hidden'));
      });

      it('hides the overflow should the list of nodes change so the crumbs no longer overflow', async () => {
        const thinWrapper = document.createElement('div');
        thinWrapper.style.width = '400px';

        const component = new ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs();
        thinWrapper.appendChild(component);
        renderElementIntoDOM(thinWrapper);
        component.data = {
          crumbs: [divCrumb, bodyCrumb],
          selectedNode: bodyCrumb,
        };
        await coordinator.done();
        assert.isNotNull(component.shadowRoot);
        const leftButton = component.shadowRoot.querySelector('button.overflow.left');
        assert.instanceOf(leftButton, HTMLButtonElement);
        const rightButton = component.shadowRoot.querySelector('button.overflow.right');
        assert.instanceOf(rightButton, HTMLButtonElement);

        // Ensure the buttons are visible now
        assert.isFalse(leftButton.classList.contains('hidden'));
        assert.isFalse(rightButton.classList.contains('hidden'));

        component.data = {
          crumbs: [bodyCrumb],
          selectedNode: bodyCrumb,
        };
        await coordinator.done();
        // The buttons are hidden now the list is no longer overflowing
        assert.isTrue(leftButton.classList.contains('hidden'));
        assert.isTrue(rightButton.classList.contains('hidden'));
      });

      it('shows the overflow buttons should the user resize the window down to be small', async () => {
        const thinWrapper = document.createElement('div');
        thinWrapper.style.width = '800px';
        const component = new ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs();
        thinWrapper.appendChild(component);
        renderElementIntoDOM(thinWrapper);

        component.data = {
          crumbs: [divCrumb, bodyCrumb],
          selectedNode: bodyCrumb,
        };
        await coordinator.done();
        assert.isNotNull(component.shadowRoot);

        const leftButton = component.shadowRoot.querySelector('button.overflow.left');
        assert.instanceOf(leftButton, HTMLButtonElement);
        const rightButton = component.shadowRoot.querySelector('button.overflow.right');
        assert.instanceOf(rightButton, HTMLButtonElement);

        assert.isTrue(leftButton.classList.contains('hidden'));
        assert.isTrue(rightButton.classList.contains('hidden'));

        thinWrapper.style.width = '400px';
        // Give the resize observer time to fire.
        await doubleRaf();
        await coordinator.done();

        assert.isFalse(leftButton.classList.contains('hidden'));
        assert.isFalse(rightButton.classList.contains('hidden'));
      });
    });
  });
});
