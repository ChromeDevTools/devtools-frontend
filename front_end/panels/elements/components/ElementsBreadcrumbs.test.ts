// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {after, before, describe, it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import {
  dispatchClickEvent,
  doubleRaf,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {
  deinitializeGlobalVars,
  initializeGlobalVars,
} from '../../../testing/EnvironmentHelpers.js';
import {withNoMutations} from '../../../testing/MutationHelpers.js';
import {createViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';
import * as UI from '../../../ui/legacy/legacy.js';

import * as ElementsComponents from './components.js';

interface MakeCrumbOptions {
  nodeType?: number;
  id?: number;
  pseudoType?: string;
  shadowRootType?: string;
  nodeName?: string;
  nodeNameNicelyCased?: string;
  attributes?: Record<string, string>;
  parentNode?: SDK.DOMModel.DOMNode|null;
}

const makeCrumb = (overrides: MakeCrumbOptions = {}) => {
  const attributes = overrides.attributes || {};
  const newCrumb = {
    id: (overrides.id || 1) as Protocol.DOM.NodeId,
    parentNode: overrides.parentNode ?? null,
    nodeType: () => overrides.nodeType ?? Node.ELEMENT_NODE,
    pseudoType: () => overrides.pseudoType ?? '',
    shadowRootType: () => overrides.shadowRootType ?? '',
    nodeName: () => overrides.nodeName ?? 'body',
    nodeNameInCorrectCase: () => overrides.nodeNameNicelyCased ?? 'body',
    getAttribute: (x: string) => attributes[x] || '',
    highlight: () => {},
  } as unknown as SDK.DOMModel.DOMNode;
  return newCrumb;
};

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
  parentNode: documentCrumb,
});

const divCrumb = makeCrumb({
  nodeType: Node.ELEMENT_NODE,
  id: 3,
  nodeName: 'div',
  nodeNameNicelyCased: 'div',
  attributes: {
    id: 'test-id',
  },
  parentNode: bodyCrumb,
});

/**
 * Resolves once the (smooth) scroll of `element` has fully finished. Polling
 * `scrollLeft` is not reliable here: on slow bots a smooth scroll can stall
 * between two polls and look finished while it is still moving.
 */
function waitForScrollEnd(element: HTMLElement): Promise<void> {
  return new Promise(resolve => element.addEventListener('scrollend', () => resolve(), {once: true}));
}

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
      const result = ElementsComponents.ElementsBreadcrumbsUtils.crumbsToRender([documentCrumb, bodyCrumb], bodyCrumb);

      assert.deepEqual(result, [
        {
          title: {
            main: 'body',
            extras: {},
          },
          selected: true,
          node: bodyCrumb,
        },
      ]);
    });
  });

  describe('presenter', () => {
    function createPresenter() {
      const view = createViewFunctionStub(ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs);
      const component = new ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs(undefined, view);
      return {view, component};
    }

    it('derives the crumbs from the selected node and its ancestors', async () => {
      const {view, component} = createPresenter();

      component.selectedNode = divCrumb;
      await view.nextInput;

      // The document node is excluded, and the crumbs are ordered from the root down.
      assert.lengthOf(view.input.crumbs, 2);
      assert.strictEqual(view.input.crumbs[0].node, bodyCrumb);
      assert.isFalse(view.input.crumbs[0].selected);
      assert.strictEqual(view.input.crumbs[1].node, divCrumb);
      assert.isTrue(view.input.crumbs[1].selected);
    });

    it('dispatches NodeSelectedEvent when a crumb is clicked', async () => {
      const {view, component} = createPresenter();
      component.selectedNode = divCrumb;
      await view.nextInput;

      let selectedNode: SDK.DOMModel.DOMNode|null = null;
      component.element.addEventListener('breadcrumbsnodeselected', event => {
        selectedNode = event.node;
      });

      view.input.onCrumbClick(bodyCrumb);
      assert.strictEqual(selectedNode, bodyCrumb);
    });

    it('highlights and hides highlight on mouse/focus events', async () => {
      const {view, component} = createPresenter();
      const highlightSpy = sinon.spy(bodyCrumb, 'highlight');
      const hideHighlightSpy = sinon.spy(SDK.OverlayModel.OverlayModel, 'hideDOMNodeHighlight');

      component.selectedNode = bodyCrumb;
      await view.nextInput;

      view.input.onCrumbMouseMove(bodyCrumb);
      sinon.assert.calledOnce(highlightSpy);

      view.input.onCrumbMouseLeave();
      sinon.assert.calledOnce(hideHighlightSpy);

      view.input.onCrumbFocus(bodyCrumb);
      sinon.assert.calledTwice(highlightSpy);

      view.input.onCrumbBlur();
      sinon.assert.calledTwice(hideHighlightSpy);
    });

    it('computes the overflow and scroll button state from the viewport', async () => {
      const {view, component} = createPresenter();
      component.selectedNode = divCrumb;
      await view.nextInput;
      assert.isFalse(view.input.overflowing);

      view.input.onViewportChange({windowWidth: 100, contentWidth: 300, scrollLeft: 0});
      let input = await view.nextInput;
      assert.isTrue(input.overflowing);
      assert.isFalse(input.canScrollLeft);
      assert.isTrue(input.canScrollRight);

      view.input.onViewportChange({windowWidth: 100, contentWidth: 300, scrollLeft: 200});
      input = await view.nextInput;
      assert.isTrue(input.canScrollLeft);
      assert.isFalse(input.canScrollRight);
    });

    it('only asks to scroll to the selected crumb when the selection changes or the crumbs start to overflow',
       async () => {
         const {view, component} = createPresenter();

         component.selectedNode = divCrumb;
         assert.isTrue((await view.nextInput).scrollSelectedCrumbIntoView);

         // A DOM tree update re-renders with the same selection.
         component.requestUpdate();
         assert.isFalse((await view.nextInput).scrollSelectedCrumbIntoView);

         view.input.onViewportChange({windowWidth: 100, contentWidth: 300, scrollLeft: 0});
         assert.isTrue((await view.nextInput).scrollSelectedCrumbIntoView);

         // Scrolling keeps the overflow state, so it does not trigger another auto-scroll.
         view.input.onViewportChange({windowWidth: 100, contentWidth: 300, scrollLeft: 50});
         assert.isFalse((await view.nextInput).scrollSelectedCrumbIntoView);
       });

    it('treats the end of a short scroll range as the end', async () => {
      const {view, component} = createPresenter();
      component.selectedNode = divCrumb;
      await view.nextInput;

      // The content only overflows by 5px, and the user scrolled all the way.
      view.input.onViewportChange({windowWidth: 100, contentWidth: 105, scrollLeft: 5});
      const input = await view.nextInput;
      assert.isTrue(input.canScrollLeft);
      assert.isFalse(input.canScrollRight);
    });

    it('keeps the overflow state and scrolls to the selected crumb in the first render after re-show', async () => {
      const view = createViewFunctionStub(ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs);
      const component = new ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs(undefined, view);
      const wrapper = renderElementIntoDOM(document.createElement('div'));
      component.markAsRoot();
      component.show(wrapper);
      component.selectedNode = divCrumb;
      await view.nextInput;
      view.input.onViewportChange({windowWidth: 100, contentWidth: 300, scrollLeft: 200});
      assert.isTrue((await view.nextInput).overflowing);

      component.detach();
      component.show(wrapper);

      // A single render settles the re-show: the overflow buttons stay visible,
      // and the view scrolls straight to the selected crumb.
      const input = await view.nextInput;
      assert.isTrue(input.overflowing);
      assert.isTrue(input.scrollSelectedCrumbIntoView);
    });

    it('does not overflow when the crumbs are empty or hidden', async () => {
      const {view, component} = createPresenter();
      component.selectedNode = divCrumb;
      await view.nextInput;
      view.input.onViewportChange({windowWidth: 100, contentWidth: 300, scrollLeft: 0});
      await view.nextInput;

      view.input.onViewportChange({windowWidth: 0, contentWidth: 0, scrollLeft: 0});
      const input = await view.nextInput;
      assert.isFalse(input.overflowing);
      assert.isFalse(input.canScrollLeft);
      assert.isFalse(input.canScrollRight);
    });
  });

  describe('rendering breadcrumbs', () => {
    /**
     * Waits until the widget has rendered and reacted to the ResizeObserver
     * and scroll notifications that the rendering triggers.
     */
    async function settle(component: ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs): Promise<void> {
      for (let i = 0; i < 2; i++) {
        await component.updateComplete;
        await doubleRaf();
      }
      await component.updateComplete;
    }

    async function renderBreadcrumbs(selectedNode: SDK.DOMModel.DOMNode, width?: string):
        Promise<{component: ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs, wrapper: HTMLElement}> {
      const wrapper = document.createElement('div');
      if (width) {
        wrapper.style.width = width;
      }
      renderElementIntoDOM(wrapper);

      const component = new ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs();
      component.markAsRoot();
      component.show(wrapper);
      component.selectedNode = selectedNode;
      await settle(component);
      return {component, wrapper};
    }

    function getOverflowButtons(component: ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs):
        {leftButton: HTMLButtonElement, rightButton: HTMLButtonElement} {
      const leftButton = component.contentElement.querySelector('button.overflow.left');
      assert.instanceOf(leftButton, HTMLButtonElement);
      const rightButton = component.contentElement.querySelector('button.overflow.right');
      assert.instanceOf(rightButton, HTMLButtonElement);
      return {leftButton, rightButton};
    }

    it('renders as soon as it is shown', async () => {
      const wrapper = document.createElement('div');
      renderElementIntoDOM(wrapper);
      const component = new ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs();
      component.markAsRoot();

      component.show(wrapper);
      await component.updateComplete;

      assert.isNotNull(component.contentElement.querySelector('nav.crumbs'));
    });

    it('renders all the breadcrumbs', async () => {
      const {component} = await renderBreadcrumbs(divCrumb);

      const crumbs = component.contentElement.querySelectorAll('[data-crumb]');
      assert.lengthOf(crumbs, 2);
    });

    it('highlights the active breadcrumb', async () => {
      const {component} = await renderBreadcrumbs(divCrumb);

      const activeCrumbs = component.contentElement.querySelectorAll('.crumb.selected');
      assert.lengthOf(activeCrumbs, 1);
      assert.strictEqual(activeCrumbs[0].getAttribute('data-node-id'), String(divCrumb.id));
    });

    it('updates the text if a crumb\'s title changes', async () => {
      const options = {id: 4, nodeName: 'div', nodeNameNicelyCased: 'div', parentNode: bodyCrumb};
      const node = makeCrumb(options);
      const {component} = await renderBreadcrumbs(node);

      await withNoMutations(component.contentElement, async contentElement => {
        // ElementsPanel calls requestUpdate() when the DOM tree changes while the selection stays the same.
        options.nodeNameNicelyCased = 'span';
        component.requestUpdate();
        await component.updateComplete;

        const renderedTextForUpdatedCrumb = contentElement.querySelector('.crumb:last-child devtools-node-text');
        assert.instanceOf(renderedTextForUpdatedCrumb, HTMLElement);
        assert.strictEqual(renderedTextForUpdatedCrumb.dataset.nodeTitle, 'span');
      });
    });

    describe('when the breadcrumbs overflow', () => {
      const longBodyCrumb = makeCrumb({
        nodeType: Node.ELEMENT_NODE,
        id: 2,
        nodeName: 'body',
        nodeNameNicelyCased: 'body',
        attributes: {
          class: 'test-class-1 test-class-2 test-class-3',
        },
      });

      const longDivCrumb = makeCrumb({
        nodeType: Node.ELEMENT_NODE,
        id: 3,
        nodeName: 'div',
        nodeNameNicelyCased: 'div',
        attributes: {
          id: 'test-id-with-a-really-long-name',
        },
        parentNode: longBodyCrumb,
      });

      it('shows the overflow buttons and scrolls the selected crumb into view', async () => {
        const {component} = await renderBreadcrumbs(longDivCrumb, '400px');

        const {leftButton, rightButton} = getOverflowButtons(component);
        assert.isFalse(leftButton.classList.contains('hidden'));
        assert.isFalse(rightButton.classList.contains('hidden'));
        // The selected node is the last crumb, so the crumbs are scrolled to the end.
        assert.isFalse(leftButton.disabled);
        assert.isTrue(rightButton.disabled);
      });

      it('disables the left button once the user has scrolled to the start', async () => {
        const {component} = await renderBreadcrumbs(longDivCrumb, '400px');
        const {leftButton, rightButton} = getOverflowButtons(component);
        const crumbsWindow = component.contentElement.querySelector('.crumbs-window');
        assert.instanceOf(crumbsWindow, HTMLDivElement);

        await withNoMutations(component.contentElement, async () => {
          const scrollEnd = waitForScrollEnd(crumbsWindow);
          dispatchClickEvent(leftButton);
          await scrollEnd;
          await component.updateComplete;
          assert.isTrue(leftButton.disabled);
          assert.isFalse(rightButton.disabled);
        });
      });

      it('keeps the manual scroll position when the DOM tree updates', async () => {
        const {component} = await renderBreadcrumbs(longDivCrumb, '400px');
        const {leftButton} = getOverflowButtons(component);
        const crumbsWindow = component.contentElement.querySelector('.crumbs-window');
        assert.instanceOf(crumbsWindow, HTMLDivElement);

        const scrollEnd = waitForScrollEnd(crumbsWindow);
        dispatchClickEvent(leftButton);
        await scrollEnd;
        const scrollLeftAfterManualScroll = crumbsWindow.scrollLeft;

        // ElementsPanel re-renders the crumbs on every DOM tree update, while the selection stays the same.
        component.selectedNode = longDivCrumb;
        component.requestUpdate();
        await settle(component);

        assert.strictEqual(crumbsWindow.scrollLeft, scrollLeftAfterManualScroll);
      });

      it('scrolls the selected crumb into view again after a parent widget is detached and re-attached', async () => {
        const wrapper = document.createElement('div');
        wrapper.style.width = '400px';
        renderElementIntoDOM(wrapper);
        const parentWidget = new UI.Widget.Widget();
        parentWidget.markAsRoot();
        parentWidget.show(wrapper);

        const component = new ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs();
        component.show(parentWidget.contentElement);
        component.selectedNode = longDivCrumb;
        await settle(component);
        // The selected node is the last crumb, so the crumbs start scrolled to the end.
        assert.isTrue(getOverflowButtons(component).rightButton.disabled);

        // Like switching panels: the ancestor is removed from the DOM, which resets
        // the scroll position, and the breadcrumbs only get willHide()/wasShown().
        parentWidget.detach();
        parentWidget.show(wrapper);
        await settle(component);

        const crumbsWindow = component.contentElement.querySelector('.crumbs-window');
        assert.instanceOf(crumbsWindow, HTMLDivElement);
        assert.isAbove(crumbsWindow.scrollLeft, 0);
        assert.isTrue(getOverflowButtons(component).rightButton.disabled);
      });

      it('does not hide or toggle the overflow buttons when a parent widget is re-shown', async () => {
        const wrapper = document.createElement('div');
        wrapper.style.width = '400px';
        renderElementIntoDOM(wrapper);
        const parentWidget = new UI.Widget.Widget();
        parentWidget.markAsRoot();
        parentWidget.show(wrapper);

        const component = new ElementsComponents.ElementsBreadcrumbs.ElementsBreadcrumbs();
        component.show(parentWidget.contentElement);
        component.selectedNode = longDivCrumb;
        await settle(component);

        const {leftButton, rightButton} = getOverflowButtons(component);
        const changedAttributes: Array<string|null> = [];
        const observer = new MutationObserver(records => {
          changedAttributes.push(...records.map(record => record.attributeName));
        });
        for (const button of [leftButton, rightButton]) {
          observer.observe(button, {attributes: true, attributeFilter: ['class', 'disabled']});
        }

        parentWidget.detach();
        parentWidget.show(wrapper);
        await settle(component);
        changedAttributes.push(...observer.takeRecords().map(record => record.attributeName));
        observer.disconnect();

        assert.deepEqual(changedAttributes, []);
      });

      it('does not keep re-rendering once the overflow state has settled', async () => {
        const {component} = await renderBreadcrumbs(longDivCrumb, '400px');

        const performUpdateSpy = sinon.spy(component, 'performUpdate');
        await doubleRaf();
        await doubleRaf();
        sinon.assert.notCalled(performUpdateSpy);
      });

      it('hides the overflow buttons should the user resize the window to be large enough', async () => {
        const {component, wrapper} = await renderBreadcrumbs(longDivCrumb, '400px');
        const {leftButton, rightButton} = getOverflowButtons(component);
        assert.isFalse(leftButton.classList.contains('hidden'));
        assert.isFalse(rightButton.classList.contains('hidden'));

        wrapper.style.width = '800px';
        await settle(component);

        assert.isTrue(leftButton.classList.contains('hidden'));
        assert.isTrue(rightButton.classList.contains('hidden'));
      });

      it('hides the overflow buttons should the selection change so the crumbs no longer overflow', async () => {
        const {component} = await renderBreadcrumbs(longDivCrumb, '400px');
        const {leftButton, rightButton} = getOverflowButtons(component);
        assert.isFalse(leftButton.classList.contains('hidden'));
        assert.isFalse(rightButton.classList.contains('hidden'));

        component.selectedNode = longBodyCrumb;
        await settle(component);

        assert.isTrue(leftButton.classList.contains('hidden'));
        assert.isTrue(rightButton.classList.contains('hidden'));
      });

      it('shows the overflow buttons should the user resize the window down to be small', async () => {
        const {component, wrapper} = await renderBreadcrumbs(longDivCrumb, '800px');
        const {leftButton, rightButton} = getOverflowButtons(component);
        assert.isTrue(leftButton.classList.contains('hidden'));
        assert.isTrue(rightButton.classList.contains('hidden'));

        wrapper.style.width = '400px';
        await settle(component);

        assert.isFalse(leftButton.classList.contains('hidden'));
        assert.isFalse(rightButton.classList.contains('hidden'));
      });
    });
  });
});
