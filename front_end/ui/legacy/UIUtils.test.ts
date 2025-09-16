// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import type * as Root from '../../core/root/root.js';
import {raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import type * as Buttons from '../components/buttons/buttons.js';
import * as Lit from '../lit/lit.js';

import * as UI from './legacy.js';

const {html} = Lit;

const {urlString} = Platform.DevToolsPath;

describe('UIUtils', () => {
  describe('openInNewTab', () => {
    const {openInNewTab} = UI.UIUtils;
    const {InspectorFrontendHostInstance} = Host.InspectorFrontendHost;

    it('throws a TypeError if the URL is invalid', () => {
      assert.throws(() => openInNewTab('ThisIsNotAValidURL'), TypeError);
    });

    it('opens URLs via host bindings', () => {
      const stub = sinon.stub(InspectorFrontendHostInstance, 'openInNewTab');

      openInNewTab('https://www.google.com/');

      sinon.assert.callCount(stub, 1);
      assert.deepEqual(stub.args[0], ['https://www.google.com/']);
    });

    it('doesn\'t override existing `utm_source` search parameters', () => {
      const URLs = [
        'http://developer.chrome.com/docs/devtools/workspaces/?utm_source=unittests',
        'http://developers.google.com/learn/?utm_source=unittests',
        'http://web.dev/?utm_source=unittests',
        'http://www.google.com/?utm_source=unittests',
        'https://developer.chrome.com/docs/devtools/?utm_source=unittests',
        'https://developers.google.com/community/?utm_source=unittests',
        'https://www.google.com/?utm_source=unittests',
        'https://web.dev/baseline/?utm_source=unittests',
      ];
      for (const url of URLs) {
        const stub = sinon.stub(InspectorFrontendHostInstance, 'openInNewTab');

        openInNewTab(url);

        sinon.assert.calledOnceWithExactly(stub, urlString`${url}`);
        stub.restore();
      }
    });

    it('adds `utm_source` search parameter to Google documentation set links', () => {
      const URLs = [
        'http://developer.chrome.com/docs/devtools/workspaces/',
        'http://developers.google.com/learn/',
        'http://web.dev/',
        'https://developer.chrome.com/docs/devtools/',
        'https://developers.google.com/community/',
        'https://web.dev/baseline/',
      ];
      for (const url of URLs) {
        const stub = sinon.stub(InspectorFrontendHostInstance, 'openInNewTab');

        openInNewTab(url);

        sinon.assert.calledOnce(stub);
        assert.strictEqual(new URL(stub.args[0][0]).searchParams.get('utm_source'), 'devtools');
        stub.restore();
      }
    });

    it('adds `utm_campaign` search parameter to Google documentation set links', () => {
      const CHANNELS: Array<typeof Root.Runtime.hostConfig.channel> = [
        'stable',
        'beta',
        'dev',
        'canary',
      ];
      const URLs = [
        'http://developer.chrome.com/docs/devtools/workspaces/',
        'http://developers.google.com/learn/',
        'http://web.dev/',
        'https://developer.chrome.com/docs/devtools/',
        'https://developers.google.com/community/',
        'https://web.dev/baseline/',
      ];
      for (const channel of CHANNELS) {
        updateHostConfig({channel});

        for (const url of URLs) {
          const stub = sinon.stub(InspectorFrontendHostInstance, 'openInNewTab');

          openInNewTab(url);

          sinon.assert.calledOnce(stub);
          assert.strictEqual(new URL(stub.args[0][0]).searchParams.get('utm_campaign'), channel);
          stub.restore();
        }
      }
    });

    it('correctly preserves anchors', () => {
      updateHostConfig({channel: 'stable'});
      const stub = sinon.stub(InspectorFrontendHostInstance, 'openInNewTab');

      openInNewTab('https://developer.chrome.com/docs/devtools/settings/ignore-list/#skip-third-party');

      sinon.assert.calledOnce(stub);
      const url = new URL(stub.args[0][0]);
      assert.strictEqual(url.hash, '#skip-third-party');
      assert.strictEqual(url.searchParams.get('utm_campaign'), 'stable');
      assert.strictEqual(url.searchParams.get('utm_source'), 'devtools');
    });

    it('correctly preserves other search params', () => {
      updateHostConfig({channel: 'stable'});
      const stub = sinon.stub(InspectorFrontendHostInstance, 'openInNewTab');

      openInNewTab('http://web.dev/route?foo=bar&baz=devtools');

      sinon.assert.calledOnce(stub);
      const url = new URL(stub.args[0][0]);
      assert.strictEqual(url.searchParams.get('baz'), 'devtools');
      assert.strictEqual(url.searchParams.get('foo'), 'bar');
      assert.strictEqual(url.searchParams.get('utm_campaign'), 'stable');
      assert.strictEqual(url.searchParams.get('utm_source'), 'devtools');
    });
  });

  describe('LongClickController', () => {
    it('does not invoke callback when disposed', () => {
      const clock = sinon.useFakeTimers({toFake: ['setTimeout']});
      const el = document.createElement('div');
      const callback = sinon.spy();
      const controller = new UI.UIUtils.LongClickController(el, callback);

      el.dispatchEvent(new PointerEvent('pointerdown'));
      clock.runAll();
      sinon.assert.calledOnce(callback);

      controller.dispose();

      el.dispatchEvent(new PointerEvent('pointerdown'));
      sinon.assert.calledOnce(callback);
      clock.restore();
    });
  });

  describe('measuredScrollbarWidth', () => {
    let style: HTMLStyleElement;
    before(() => {
      UI.UIUtils.resetMeasuredScrollbarWidthForTest();
    });
    after(() => {
      style.remove();
    });

    it('provides a default value', () => {
      const expectedDefaultWidth = 16;
      assert.strictEqual(UI.UIUtils.measuredScrollbarWidth(), expectedDefaultWidth);
    });

    it('calculates specific widths correctly', () => {
      const width = 20;

      // Enforce custom width on scrollbars to test.
      style = document.createElement('style');
      style.textContent = `::-webkit-scrollbar {
        appearance: none;
        width: ${width}px;
      }`;
      document.head.appendChild(style);
      assert.strictEqual(UI.UIUtils.measuredScrollbarWidth(document), width);

      // Remove the styles and try again to detect that cached values are used.
      style.remove();
      assert.strictEqual(UI.UIUtils.measuredScrollbarWidth(document), width);
    });
  });

  describe('createFileSelectorElement', () => {
    it('by default it accepts any file types', async () => {
      const callback = () => {};
      const inputElement = UI.UIUtils.createFileSelectorElement(callback);
      assert.isNull(inputElement.getAttribute('accept'));
    });

    it('can set the accept attribute on the input', async () => {
      const callback = () => {};
      const inputElement = UI.UIUtils.createFileSelectorElement(callback, '.json');
      assert.strictEqual(inputElement.getAttribute('accept'), '.json');
    });
  });

  describe('bindToAction', () => {
    const actionId = 'mock.action.bind.to.action';

    before(() => {
      const mockHandleAction = sinon.stub();
      UI.ActionRegistration.registerActionExtension({
        actionId,
        category: UI.ActionRegistration.ActionCategory.GLOBAL,
        title: i18n.i18n.lockedLazyString('Mock action for bindToAction'),
        loadActionDelegate: async () => ({handleAction: mockHandleAction}),
      });
    });

    function setup() {
      const {bindToAction} = UI.UIUtils;
      const container = document.createElement('div');
      renderElementIntoDOM(container);
      const buttonRef = Lit.Directives.createRef<Buttons.Button.Button>();
      Lit.render(
          html`<devtools-button ${Lit.Directives.ref(buttonRef)} ${bindToAction(actionId)}></devtools-button>`,
          container);

      const button = buttonRef.value;
      assert.exists(button);
      const action = UI.ActionRegistry.ActionRegistry.instance().getAction(actionId);
      return {button, container, action};
    }

    it('sets button properties from the action', () => {
      const {button, action} = setup();
      const innerButton = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
      assert.strictEqual(innerButton.title, action.title());
      assert.strictEqual(button.disabled, !action.enabled());
    });

    it('updates the button when the action\'s enabled state changes', () => {
      const {button, action} = setup();

      action.setEnabled(false);
      assert.isTrue(button.disabled);

      action.setEnabled(true);
      assert.isFalse(button.disabled);
    });

    it('removes the change listener when the button is removed from the DOM', () => {
      const {button, container, action} = setup();
      const spy = sinon.spy(action, 'removeEventListener');

      Lit.render(html``, container);

      assert.isFalse(button.isConnected);
      sinon.assert.calledWith(spy, UI.ActionRegistration.Events.ENABLED);
    });
  });

  describe('HTMLElementWithLightDOMTemplate', () => {
    class TestElement extends UI.UIUtils.HTMLElementWithLightDOMTemplate {
      updates: Array<{node: string, attributeName: string|null}> = [];
      additions: Node[] = [];
      removals: Node[] = [];

      clear() {
        this.updates.splice(0);
        this.additions.splice(0);
        this.removals.splice(0);
      }
      override updateNode(node: Node, attributeName: string|null): void {
        this.updates.push({node: node.nodeName, attributeName});
      }

      override addNodes(nodes: NodeList|Node[]): void {
        this.additions.push(...nodes);
      }

      override removeNodes(nodes: NodeList): void {
        this.removals.push(...nodes);
      }
    }
    customElements.define('test-element', TestElement);

    it('renders its input into a template', async () => {
      const container = document.createElement('div');
      Lit.render(
          html`
        <test-element
          .template=${html`
            <button id=button>button</button>
          `}></test-element>`,
          container);
      const element = container.firstElementChild;
      assert.instanceOf(element, TestElement);
      assert.lengthOf(element.children, 1);
      const template = element.firstChild;
      assert.instanceOf(template, HTMLTemplateElement);
      const button = template.content.firstElementChild;
      assert.instanceOf(button, HTMLButtonElement);
      assert.strictEqual(button.id, 'button');
      assert.strictEqual(button.textContent, 'button');
    });

    it('observes its contents for modifications', async () => {
      const container = document.createElement('test-element');
      renderElementIntoDOM(container);
      assert.instanceOf(container, TestElement);

      const nodeContents = (nodes: Node[]) =>
          nodes.filter(node => node.nodeName !== '#comment').map(({nodeName,
                                                                   textContent}) => ({[nodeName]: textContent}));

      container.clear();
      Lit.render(html`<div>add</div>`, container);
      await raf();
      assert.deepEqual(nodeContents(container.additions), [{DIV: 'add'}]);
      assert.deepEqual(nodeContents(container.removals), []);
      assert.deepEqual(
          container.updates,
          [{node: 'TEST-ELEMENT', attributeName: null}, {node: 'TEST-ELEMENT', attributeName: null}]);

      container.clear();
      Lit.render(html`<div attribute>add</div>`, container);
      await raf();
      assert.deepEqual(nodeContents(container.additions), [{DIV: 'add'}]);
      assert.deepEqual(nodeContents(container.removals), [{DIV: 'add'}]);
      assert.deepEqual(
          container.updates,
          [{node: 'TEST-ELEMENT', attributeName: null}, {node: 'TEST-ELEMENT', attributeName: null}]);

      container.clear();
      Lit.render(html`<div attribute><p>inner</p></div>`, container);
      await raf();
      assert.deepEqual(nodeContents(container.additions), [{DIV: 'inner'}]);
      assert.deepEqual(nodeContents(container.removals), [{DIV: 'add'}]);
      assert.deepEqual(
          container.updates,
          [{node: 'TEST-ELEMENT', attributeName: null}, {node: 'TEST-ELEMENT', attributeName: null}]);

      container.clear();
      Lit.render(html``, container);
      await raf();
      assert.deepEqual(nodeContents(container.additions), []);
      assert.deepEqual(nodeContents(container.removals), [{DIV: 'inner'}]);
      assert.deepEqual(
          container.updates,
          [{node: 'TEST-ELEMENT', attributeName: null}, {node: 'TEST-ELEMENT', attributeName: null}]);
    });

    it('observes its attributes for modifications', async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);

      Lit.render(
          html`
        <test-element ?attribute=${false}>
        </test-element>`,
          container);

      await raf();
      {
        const element = container.querySelector('test-element');
        assert.instanceOf(element, TestElement);
        assert.deepEqual(element.additions, []);
        assert.deepEqual(element.removals, []);
        assert.deepEqual(element.updates, []);
      }

      Lit.render(
          html`
        <test-element ?attribute=${true}>
        </test-element>`,
          container);

      await raf();
      {
        const element = container.querySelector('test-element');
        assert.instanceOf(element, TestElement);
        assert.deepEqual(element.additions, []);
        assert.deepEqual(element.removals, []);
        assert.deepEqual(element.updates, [{node: 'TEST-ELEMENT', attributeName: 'attribute'}]);
      }
    });

    it('uses InterceptBindingDirective', async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);

      const onClick = () => {};

      const interception = sinon.stub(UI.UIUtils.InterceptBindingDirective.prototype, 'render');

      Lit.render(
          html`
        <test-element
          .template=${html`<button @click=${onClick}>button</button>`}
        </test-element>`,
          container);

      await raf();

      sinon.assert.calledOnceWithExactly(interception, onClick);
    });

    describe('InterceptBindingDirective', () => {
      const interceptBinding = Lit.Directive.directive(UI.UIUtils.InterceptBindingDirective);
      it('attaches event handlers to clones', () => {
        const container = document.createElement('div');
        const clickHandler = sinon.spy();
        Lit.render(html`<button @click=${interceptBinding(clickHandler)}></button>`, container);
        const templateButton = container.firstElementChild;
        assert.instanceOf(templateButton, HTMLButtonElement);
        templateButton.click();
        sinon.assert.notCalled(clickHandler);

        const clonedButton = UI.UIUtils.HTMLElementWithLightDOMTemplate.cloneNode(templateButton);
        assert.instanceOf(clonedButton, HTMLButtonElement);

        clonedButton.click();
        sinon.assert.calledOnce(clickHandler);
      });

      it('attaches multiple event handlers to the same element', () => {
        const container = document.createElement('div');
        const clickHandler = sinon.spy();
        const mousedownHandler = sinon.spy();
        Lit.render(
            html`<button @click=${interceptBinding(clickHandler)} @mousedown=${
                interceptBinding(mousedownHandler)}></button>`,
            container);
        const templateButton = container.firstElementChild;
        assert.instanceOf(templateButton, HTMLButtonElement);

        const clonedButton = UI.UIUtils.HTMLElementWithLightDOMTemplate.cloneNode(templateButton);
        assert.instanceOf(clonedButton, HTMLButtonElement);

        clonedButton.dispatchEvent(new MouseEvent('mousedown'));
        sinon.assert.notCalled(clickHandler);
        sinon.assert.calledOnce(mousedownHandler);
        clonedButton.click();
        sinon.assert.calledOnce(clickHandler);
        sinon.assert.calledOnce(mousedownHandler);
      });

      it('attaches event handlers to nested elements', () => {
        const container = document.createElement('div');
        const buttonClickHandler = sinon.spy();
        const divClickHandler = sinon.spy();
        Lit.render(
            html`<div @click=${interceptBinding(divClickHandler)}><button @click=${
                interceptBinding(buttonClickHandler)}></button></div>`,
            container);
        const templateDiv = container.firstElementChild;
        assert.instanceOf(templateDiv, HTMLDivElement);

        const clonedDiv = UI.UIUtils.HTMLElementWithLightDOMTemplate.cloneNode(templateDiv);
        assert.instanceOf(clonedDiv, HTMLDivElement);

        const clonedButton = clonedDiv.querySelector('button');
        assert.instanceOf(clonedButton, HTMLButtonElement);

        clonedButton.click();
        sinon.assert.calledOnce(buttonClickHandler);
        sinon.assert.calledOnce(divClickHandler);
      });
    });
  });
});
