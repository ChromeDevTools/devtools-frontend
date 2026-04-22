// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as Lit from '../../ui/lit/lit.js';
import * as RenderCoordinator from '../components/render_coordinator/render_coordinator.js';

import * as UI from './legacy.js';

const {html} = Lit;
const {Widget} = UI.Widget;

function checkFocus(id: string) {
  const focused = UI.DOMUtilities.deepActiveElement(document);
  const focusedId = focused ? focused.id : '';
  assert.strictEqual(focusedId, id);
}

describeWithEnvironment('Widget', () => {
  it('monkey-patches `Element#appendChild()` to sanity-check that widgets are properly attached', () => {
    const div = document.createElement('div');
    renderElementIntoDOM(div);

    const widget = new Widget();
    widget.markAsRoot();

    assert.throws(
        () => div.appendChild(widget.element), /Attempt to modify widget with native DOM method `appendChild`/);
  });

  it('monkey-patches `Element#insertBefore()` to sanity-check that widgets are properly attached', () => {
    const div = document.createElement('div');
    renderElementIntoDOM(div);
    const child = document.createElement('span');
    div.appendChild(child);

    const widget = new Widget();
    widget.markAsRoot();

    assert.throws(
        () => div.insertBefore(widget.element, child),
        /Attempt to modify widget with native DOM method `insertBefore`/);
  });

  it('monkey-patches `Element#removeChild()` to sanity-check that widgets are properly detached', () => {
    const div = document.createElement('div');
    renderElementIntoDOM(div);

    const widget = new Widget();
    widget.markAsRoot();
    widget.show(div);

    assert.throws(
        () => div.removeChild(widget.element), /Attempt to modify widget with native DOM method `removeChild`/);
  });

  it('monkey-patches `Element#removeChildren()` to sanity-check that widgets are properly detached', () => {
    const div = document.createElement('div');
    renderElementIntoDOM(div);

    const widget = new Widget();
    widget.markAsRoot();
    widget.show(div);

    assert.throws(() => div.removeChildren(), /Attempt to modify widget with native DOM method `removeChildren`/);
  });

  describe('constructor', () => {
    it('doesn\'t create a shadow DOM if `useShadowDom` is set to `false`', () => {
      const widget = new Widget({useShadowDom: false});

      assert.isNull(widget.element.shadowRoot);
      assert.strictEqual(widget.element, widget.contentElement);
    });

    it('doesn\'t create a shadow DOM if `useShadowDom` is unspecified', () => {
      const widget = new Widget();

      assert.isNull(widget.element.shadowRoot);
      assert.strictEqual(widget.element, widget.contentElement);
    });

    it('correctly sets the `jslog` attribute of the `contentElement`', () => {
      const widget = new Widget({jslog: 'Panel; context: foo'});

      assert.strictEqual(
          widget.contentElement.getAttribute('jslog'),
          'Panel; context: foo',
      );
    });

    it('correctly sets the `jslog` attribute of the `contentElement` in the presence of Shadow DOM', () => {
      const widget = new Widget({jslog: 'Section; context: bar', useShadowDom: true});

      assert.isNull(widget.contentElement.getAttribute('jslog'));
      assert.strictEqual(
          widget.element.getAttribute('jslog'),
          'Section; context: bar',
      );
    });
  });

  describe('parentWidget', () => {
    it('returns the immediate parent widget', () => {
      const parentWidget = new Widget();
      const childWidget = new Widget();
      childWidget.show(parentWidget.contentElement);
      assert.strictEqual(childWidget.parentWidget(), parentWidget);
    });

    it('returns the distant parent widget', () => {
      const parentWidget = new Widget();
      const div = document.createElement('div');
      parentWidget.contentElement.appendChild(div);
      const childWidget = new Widget();
      childWidget.show(div);
      assert.strictEqual(childWidget.parentWidget(), parentWidget);
    });
  });

  describe('show', () => {
    it('calls `wasShown` and `onResize` in order', () => {
      const parentWidget = new Widget();
      const parentOnResize = sinon.spy(parentWidget, 'onResize');
      const parentWasShown = sinon.spy(parentWidget, 'wasShown');
      const childWidget = new Widget();
      const childOnResize = sinon.spy(childWidget, 'onResize');
      const childWasShown = sinon.spy(childWidget, 'wasShown');
      childWidget.show(parentWidget.contentElement);
      const div = document.createElement('div');
      renderElementIntoDOM(div);
      parentWidget.markAsRoot();

      parentWidget.show(div);

      sinon.assert.callOrder(parentWasShown, childWasShown, parentOnResize, childOnResize);
      sinon.assert.calledOnce(childWasShown);
      sinon.assert.calledOnce(parentWasShown);
      sinon.assert.calledOnce(childOnResize);
      sinon.assert.calledOnce(parentOnResize);
    });

    it('automatically detaches from any previous parent', () => {
      const parentWidget1 = new Widget();
      const parentWidget2 = new Widget();
      const childWidget = new Widget();
      const childWidgetOnDetach = sinon.spy(childWidget, 'onDetach');
      const div = document.createElement('div');
      renderElementIntoDOM(div);
      parentWidget1.markAsRoot();
      parentWidget1.show(div);
      parentWidget2.markAsRoot();
      parentWidget2.show(div);
      childWidget.show(parentWidget1.contentElement);

      childWidget.show(parentWidget2.contentElement);

      sinon.assert.calledOnce(childWidgetOnDetach);
    });
  });

  describe('detach', () => {
    it('calls `willHide`, `onDetach`, and `wasHidden` in order', () => {
      const parentWidget = new Widget();
      const parentOnDetach = sinon.spy(parentWidget, 'onDetach');
      const parentWillHide = sinon.spy(parentWidget, 'willHide');
      const parentWasHidden = sinon.spy(parentWidget, 'wasHidden');
      const childWidget = new Widget();
      const childOnDetach = sinon.spy(childWidget, 'onDetach');
      const childWillHide = sinon.spy(childWidget, 'willHide');
      const childWasHidden = sinon.spy(childWidget, 'wasHidden');
      childWidget.show(parentWidget.contentElement);
      const div = document.createElement('div');
      renderElementIntoDOM(div);
      parentWidget.markAsRoot();
      parentWidget.show(div);

      parentWidget.detach();

      sinon.assert.callOrder(childWillHide, parentWillHide, parentOnDetach, childWasHidden, parentWasHidden);
      sinon.assert.notCalled(childOnDetach);
      sinon.assert.calledOnce(childWasHidden);
      sinon.assert.calledOnce(childWillHide);
      sinon.assert.calledOnce(parentOnDetach);
      sinon.assert.calledOnce(parentWasHidden);
      sinon.assert.calledOnce(parentWillHide);
    });

    it('cancels pending updates', async () => {
      const widget = new Widget();
      const performUpdate = sinon.spy(widget, 'performUpdate');
      widget.markAsRoot();
      widget.show(renderElementIntoDOM(document.createElement('main')));
      widget.requestUpdate();

      widget.detach();

      await widget.updateComplete;
      assert.strictEqual(performUpdate.callCount, 0, 'Expected no calls to `performUpdate`');
    });
  });

  describe('performUpdate', () => {
    it('passes an AbortSignal that is aborted on a subsequent requestUpdate()', async () => {
      let capturedSignal: AbortSignal|undefined;
      const widget = new (class extends Widget {
        override async performUpdate(signal?: AbortSignal): Promise<void> {
          capturedSignal = signal;
        }
      })();
      widget.markAsRoot();
      widget.show(renderElementIntoDOM(document.createElement('main')));

      widget.requestUpdate();
      await widget.updateComplete;

      assert.isDefined(capturedSignal);
      assert.isFalse(capturedSignal?.aborted);

      widget.requestUpdate();
      assert.isTrue(capturedSignal?.aborted);
    });

    it('passes an AbortSignal that is aborted when the widget is detached', async () => {
      let capturedSignal: AbortSignal|undefined;
      const widget = new (class extends Widget {
        override async performUpdate(signal?: AbortSignal): Promise<void> {
          capturedSignal = signal;
        }
      })();
      widget.markAsRoot();
      widget.show(renderElementIntoDOM(document.createElement('main')));

      widget.requestUpdate();
      await widget.updateComplete;

      assert.isDefined(capturedSignal);
      assert.isFalse(capturedSignal?.aborted);

      widget.detach();
      assert.isTrue(capturedSignal?.aborted);
    });

    it('can safely use the `RenderCoordinator` primitives', async () => {
      const widget = new (class extends Widget {
        override async performUpdate(): Promise<void> {
          const clientHeight = await RenderCoordinator.read(() => this.contentElement.clientHeight);
          const clientWidth = await RenderCoordinator.read(() => this.contentElement.clientWidth);
          await RenderCoordinator.write(() => {
            this.contentElement.style.width = `${clientWidth + 1}px`;
            this.contentElement.style.height = `${clientHeight + 1}px`;
          });
        }
      })();
      widget.markAsRoot();
      widget.show(renderElementIntoDOM(document.createElement('main')));

      widget.requestUpdate();

      await widget.updateComplete;
    });
  });

  describe('requestUpdate', () => {
    it('deduplicates subsequent update requests', async () => {
      const widget = new Widget();
      const performUpdate = sinon.stub(widget, 'performUpdate');

      widget.requestUpdate();
      widget.requestUpdate();
      await widget.updateComplete;

      assert.strictEqual(performUpdate.callCount, 1, 'Expected exactly one call to `performUpdate`');
    });

    it('runs nested updates in the same update cycle', async () => {
      const parentWidget = new Widget();
      const childWidget = new Widget();
      childWidget.show(parentWidget.contentElement);

      const parentPerformUpdate = sinon.stub(parentWidget, 'performUpdate');
      parentPerformUpdate.callsFake(childWidget.requestUpdate.bind(childWidget));
      const childPerformUpdate = sinon.stub(childWidget, 'performUpdate');

      const animationFrame = sinon.spy();
      requestAnimationFrame(animationFrame);

      parentWidget.requestUpdate();
      await parentWidget.updateComplete;

      assert.strictEqual(parentPerformUpdate.callCount, 1, 'Expected exactly one call to `parentWidget.performUpdate`');
      assert.strictEqual(childPerformUpdate.callCount, 1, 'Expected exactly one call to `childWidget.performUpdate`');
      assert.strictEqual(animationFrame.callCount, 1, 'Expected exactly one call to `requestAnimationFrame`');
    });

    it('runs microtask updates in the same update cycle', async () => {
      const parentWidget = new Widget();
      const childWidget = new Widget();
      childWidget.show(parentWidget.contentElement);

      const parentPerformUpdate = sinon.stub(parentWidget, 'performUpdate');
      parentPerformUpdate.callsFake(() => {
        queueMicrotask(childWidget.requestUpdate.bind(childWidget));
      });
      const childPerformUpdate = sinon.stub(childWidget, 'performUpdate');

      const animationFrame = sinon.spy();
      requestAnimationFrame(animationFrame);

      parentWidget.requestUpdate();
      await parentWidget.updateComplete;

      assert.strictEqual(parentPerformUpdate.callCount, 1, 'Expected exactly one call to `parentWidget.performUpdate`');
      assert.strictEqual(childPerformUpdate.callCount, 1, 'Expected exactly one call to `childWidget.performUpdate`');
      assert.strictEqual(animationFrame.callCount, 1, 'Expected exactly one call to `requestAnimationFrame`');
    });
  });

  describe('updateComplete', () => {
    it('resolves to `true` when there\'s no pending update', async () => {
      const widget = new Widget();

      await widget.updateComplete;
    });

    it('resolves to `true` when update cycles ends without scheduling another update', async () => {
      const widget = new Widget();

      widget.requestUpdate();

      await widget.updateComplete;
    });

    it('resolves when another update is requested during an update cycle', async () => {
      const widget = new Widget();
      sinon.stub(widget, 'performUpdate').onFirstCall().callsFake(widget.requestUpdate.bind(widget));

      widget.requestUpdate();

      await widget.updateComplete;
      await widget.updateComplete;
    });

    it('yields the same promise for the same update cycle', async () => {
      const widget = new Widget();

      widget.requestUpdate();
      const updateComplete = widget.updateComplete;
      widget.requestUpdate();

      assert.strictEqual(updateComplete, widget.updateComplete);
      await widget.updateComplete;
    });

    it('yields a new promise for each update cycle', async () => {
      const widget = new Widget();

      widget.requestUpdate();
      const updateComplete = widget.updateComplete;
      await updateComplete;
      widget.requestUpdate();

      assert.notStrictEqual(updateComplete, widget.updateComplete);
      await widget.updateComplete;
    });

    it('resolves when performUpdate throws an error', async () => {
      const widget = new (class extends Widget {
        override async performUpdate(): Promise<void> {
          throw new Error('AbortError');
        }
      })();

      // Prevent the test from failing due to the unhandled rejection
      const originalHandler = window.onunhandledrejection;
      window.onunhandledrejection = e => {
        if (e.reason?.message === 'AbortError') {
          e.preventDefault();
        }
      };

      try {
        widget.requestUpdate();
        // This should not hang
        await widget.updateComplete;
      } finally {
        window.onunhandledrejection = originalHandler;
      }
    });
  });

  describe('focus', () => {
    it('does nothing if the widget is not showing', () => {
      const div = document.createElement('div');
      renderElementIntoDOM(div);
      const widget = new Widget();
      const input = document.createElement('input');
      widget.setDefaultFocusedElement(input);
      widget.contentElement.appendChild(input);
      widget.markAsRoot();

      widget.focus();

      assert.notStrictEqual(document.activeElement, input);
    });

    it('gives focus to the default focused element', () => {
      const div = document.createElement('div');
      renderElementIntoDOM(div);
      const widget = new Widget();
      const input = document.createElement('input');
      widget.setDefaultFocusedElement(input);
      widget.contentElement.appendChild(input);
      widget.markAsRoot();
      widget.show(div);

      widget.focus();

      assert.strictEqual(document.activeElement, input);
    });

    it('gives focus to the default focused child widget', () => {
      const div = document.createElement('div');
      renderElementIntoDOM(div);
      const parent = new Widget();
      const child = new Widget();
      child.show(parent.contentElement);
      const input = document.createElement('input');
      child.setDefaultFocusedElement(input);
      child.contentElement.appendChild(input);
      parent.setDefaultFocusedChild(child);
      parent.markAsRoot();
      parent.show(div);
      child.show(parent.contentElement);

      parent.focus();

      assert.strictEqual(document.activeElement, input);
    });

    it('gives focus to the first visible child if no default is set', () => {
      const div = document.createElement('div');
      renderElementIntoDOM(div);
      const parent = new Widget();
      const child1 = new Widget();
      const input1 = document.createElement('input');
      child1.setDefaultFocusedElement(input1);
      child1.contentElement.appendChild(input1);
      const child2 = new Widget();
      const input2 = document.createElement('input');
      child2.setDefaultFocusedElement(input2);
      child2.contentElement.appendChild(input2);
      parent.markAsRoot();
      parent.show(div);
      child1.show(parent.contentElement);
      child2.show(parent.contentElement);

      parent.focus();

      assert.strictEqual(document.activeElement, input1);
    });

    it('gives focus to its own element with an autofocus attribute', () => {
      const div = document.createElement('div');
      renderElementIntoDOM(div);
      const parent = new Widget();
      const parentInput = document.createElement('input');
      parentInput.setAttribute('autofocus', '');
      parent.contentElement.appendChild(parentInput);

      const child = new Widget();
      const childInput = document.createElement('input');
      child.setDefaultFocusedElement(childInput);
      child.contentElement.appendChild(childInput);

      parent.markAsRoot();
      parent.show(div);
      child.show(parent.contentElement);

      parent.focus();

      // parent.getDefaultFocusedElement() should find parentInput and focus it,
      // ignoring the child.
      assert.strictEqual(document.activeElement, parentInput);
    });

    it('does not directly focus an autofocus element in a child widget', () => {
      const div = document.createElement('div');
      renderElementIntoDOM(div);
      const parent = new Widget();
      const child1 = new Widget();
      const child1Input = document.createElement('input');
      child1.setDefaultFocusedElement(child1Input);
      child1.contentElement.appendChild(child1Input);

      const child2 = new Widget();
      const child2Input = document.createElement('input');
      child2.contentElement.appendChild(child2Input);

      parent.markAsRoot();
      parent.show(div);
      child1.show(parent.contentElement);
      child2.show(parent.contentElement);

      parent.focus();

      // parent.getDefaultFocusedElement() should be null because child2's autofocus
      // is not its own. Then it should focus the first child (child1).
      // child1 will then focus its default element.
      assert.strictEqual(document.activeElement, child1Input);
    });

    it('should remember focus correctly on widgets.', () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);

      const outerInput = document.createElement('input');
      outerInput.id = 'Outer';
      const input1 = document.createElement('input');
      input1.id = 'Input1';
      const input2 = document.createElement('input');
      input2.id = 'Input2';
      const input3 = document.createElement('input');
      input3.id = 'Input3';
      const input4 = document.createElement('input');
      input4.id = 'Input4';

      container.appendChild(outerInput);

      const mainWidget = new Widget();
      mainWidget.markAsRoot();
      mainWidget.show(container);

      const widget1 = new Widget();
      widget1.show(mainWidget.element);
      widget1.element.appendChild(input1);
      widget1.setDefaultFocusedElement(input1);

      const widget2 = new Widget();
      widget2.show(mainWidget.element);
      widget2.element.appendChild(input2);
      widget2.setDefaultFocusedElement(input2);

      outerInput.focus();
      checkFocus(outerInput.id);

      widget1.focus();
      checkFocus(input1.id);

      input2.focus();
      checkFocus(input2.id);

      outerInput.focus();
      checkFocus(outerInput.id);

      mainWidget.focus();
      checkFocus(input2.id);

      outerInput.focus();
      checkFocus(outerInput.id);

      widget2.hideWidget();
      mainWidget.focus();
      checkFocus(input1.id);

      const splitWidget = new UI.SplitWidget.SplitWidget(false, false);
      splitWidget.show(mainWidget.element);

      const widget3 = new Widget();
      widget3.element.appendChild(input3);
      widget3.setDefaultFocusedElement(input3);
      splitWidget.setSidebarWidget(widget3);

      const widget4 = new Widget();
      widget4.element.appendChild(input4);
      widget4.setDefaultFocusedElement(input4);
      splitWidget.setMainWidget(widget4);
      splitWidget.setDefaultFocusedChild(widget4);

      splitWidget.focus();
      checkFocus(input4.id);

      widget3.focus();
      checkFocus(input3.id);

      mainWidget.focus();
      checkFocus(input3.id);
    });

    it('gives focus an autofocus element of a child widget', () => {
      const parent = new Widget();
      const child1 = new Widget();
      const child1Input = document.createElement('input');
      child1.setDefaultFocusedElement(child1Input);
      child1.contentElement.appendChild(child1Input);

      const child2 = new Widget();
      child2.element.setAttribute('autofocus', '');
      child2.element.tabIndex = 0;

      renderElementIntoDOM(parent);
      child1.show(parent.contentElement);
      child2.show(parent.contentElement);

      parent.focus();

      assert.strictEqual(document.activeElement, child2.element);
    });

    it('does not recursively call focus when the widget element has autofocus', () => {
      class FocusableWidget extends UI.Widget.Widget {
        override performUpdate(): void {
          // no-op
        }
      }

      const container = document.createElement('div');
      renderElementIntoDOM(container);
      Lit.render(
          html`<devtools-widget autofocus tabindex="-1" ${UI.Widget.widget(FocusableWidget)}></devtools-widget>`,
          container);

      const widgetElement = container.querySelector('devtools-widget') as UI.Widget.WidgetElement<FocusableWidget>;

      const widget = widgetElement.getWidget();
      assert.exists(widget);

      widget!.focus();

      assert.strictEqual(document.activeElement, widgetElement);
    });
  });

  describe('WidgetDirective', () => {
    let attachedCount = 0;
    let detachedCount = 0;
    let fooSetterCount = 0;
    let barSetterCount = 0;

    class TestWidget extends UI.Widget.Widget {
      params?: {foo: string};

      override wasShown(): void {
        super.wasShown();
        attachedCount++;
      }

      override wasHidden(): void {
        detachedCount++;
      }

      set foo(_value: string) {
        fooSetterCount++;
      }

      set bar(_value: string) {
        barSetterCount++;
      }
    }

    beforeEach(() => {
      attachedCount = 0;
      detachedCount = 0;
      fooSetterCount = 0;
      barSetterCount = 0;
    });

    it('creates a new Widget when the widget class changes in a ternary operator', () => {
      class WidgetA extends UI.Widget.Widget {}
      class WidgetB extends UI.Widget.Widget {}

      const container = document.createElement('div');
      renderElementIntoDOM(container);

      const renderTernary = (condition: boolean) =>
          Lit.render(html`${condition ? UI.Widget.widget(WidgetA) : UI.Widget.widget(WidgetB)}`, container);

      renderTernary(true);
      const widgetElement1 = container.querySelector('devtools-widget') as UI.Widget.WidgetElement<WidgetA>;
      const widget1 = widgetElement1.getWidget();
      assert.instanceOf(widget1, WidgetA);

      renderTernary(false);
      const widgetElement2 = container.querySelector('devtools-widget') as UI.Widget.WidgetElement<WidgetB>;
      const widget2 = widgetElement2.getWidget();
      assert.instanceOf(widget2, WidgetB);
      assert.notStrictEqual(widgetElement1, widgetElement2);
    });

    it('instantiates widget on a child directive', async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);

      Lit.render(html`${UI.Widget.widget(TestWidget)}`, container);
      await new Promise(resolve => setTimeout(resolve, 0));

      assert.strictEqual(attachedCount, 1);
      const widget = UI.Widget.Widget.get(container.firstElementChild!);
      assert.instanceOf(widget, TestWidget);
    });

    it('instantiates widget on an element directive', async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);

      Lit.render(html`<devtools-widget ${UI.Widget.widget(TestWidget)}></devtools-widget>`, container);
      await new Promise(resolve => setTimeout(resolve, 0));

      assert.strictEqual(attachedCount, 1);
      const devtoolsWidget = container.querySelector('devtools-widget');
      assert.exists(devtoolsWidget);
      const widget = UI.Widget.Widget.get(devtoolsWidget!);
      assert.instanceOf(widget, TestWidget);
    });

    it('passes and updates widget parameters', async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);

      Lit.render(
          html`<devtools-widget ${UI.Widget.widget(TestWidget, {params: {foo: 'bar'}})}></devtools-widget>`, container);
      await new Promise(resolve => setTimeout(resolve, 0));

      const devtoolsWidget = container.querySelector('devtools-widget');
      assert.exists(devtoolsWidget);
      const widget = UI.Widget.Widget.get(devtoolsWidget!) as TestWidget;
      assert.deepEqual(widget.params, {foo: 'bar'});

      Lit.render(
          html`<devtools-widget ${UI.Widget.widget(TestWidget, {params: {foo: 'baz'}})}></devtools-widget>`, container);
      await new Promise(resolve => setTimeout(resolve, 0));

      const devtoolsWidget2 = container.querySelector('devtools-widget');
      const widget2 = UI.Widget.Widget.get(devtoolsWidget2!) as TestWidget;
      assert.deepEqual(widget2.params, {foo: 'baz'});
    });

    it('detaches the widget when the Lit template re-renders and removes it', async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);

      Lit.render(html`<devtools-widget ${UI.Widget.widget(TestWidget)}></devtools-widget>`, container);
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.strictEqual(attachedCount, 1);
      assert.strictEqual(detachedCount, 0);

      Lit.render(html`<div></div>`, container);
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.strictEqual(detachedCount, 1);
    });

    it('only calls setters for changed widget parameters', async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);

      const renderWidget = (foo: string, bar: string) => {
        Lit.render(html`<devtools-widget ${UI.Widget.widget(TestWidget, {foo, bar})}></devtools-widget>`, container);
      };

      renderWidget('1', '1');
      await new Promise(resolve => setTimeout(resolve, 0));

      assert.strictEqual(fooSetterCount, 1, 'fooSetterCount 1st');
      assert.strictEqual(barSetterCount, 1, 'barSetterCount 1st');

      renderWidget('2', '1');
      await new Promise(resolve => setTimeout(resolve, 0));

      assert.strictEqual(fooSetterCount, 2, 'fooSetterCount 2nd');
    });
  });

  describe('WidgetElement', () => {
    it('renders WidgetElement into DOM without a root element', async () => {
      class WidgetInstance extends UI.Widget.Widget {
        override performUpdate(): void {
          // no-op
        }
      }
      const container = document.createElement('div');
      Lit.render(html`<devtools-widget ${UI.Widget.widget(WidgetInstance)}></devtools-widget>`, container);

      const devtoolsWidget = container.firstElementChild as UI.Widget.WidgetElement<WidgetInstance>;
      assert.exists(devtoolsWidget);
      renderElementIntoDOM(devtoolsWidget);
    });
  });

  describe('WidgetDirective (non-devtools-widget elements)', () => {
    let attachedCount = 0;
    let detachedCount = 0;
    let fooSetterCount = 0;
    let barSetterCount = 0;

    class TestWidget extends UI.Widget.Widget {
      params?: {foo: string};

      override wasShown(): void {
        super.wasShown();
        attachedCount++;
      }

      override wasHidden(): void {
        detachedCount++;
      }

      set foo(_value: string) {
        fooSetterCount++;
      }

      set bar(_value: string) {
        barSetterCount++;
      }
    }

    beforeEach(() => {
      attachedCount = 0;
      detachedCount = 0;
      fooSetterCount = 0;
      barSetterCount = 0;
    });

    it('instantiates widget on a child directive', async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);

      Lit.render(html`${UI.Widget.widget(TestWidget)}`, container);

      assert.strictEqual(attachedCount, 1);
      const widget = UI.Widget.Widget.get(container.firstElementChild!);
      assert.instanceOf(widget, TestWidget);
    });

    it('instantiates widget on an element directive', async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);

      Lit.render(html`<span ${UI.Widget.widget(TestWidget)}></span>`, container);

      assert.strictEqual(attachedCount, 1);
      const span = container.querySelector('span');
      assert.exists(span);
      const widget = UI.Widget.Widget.get(span!);
      assert.instanceOf(widget, TestWidget);
    });

    it('passes and updates widget parameters', async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);

      Lit.render(html`<span ${UI.Widget.widget(TestWidget, {params: {foo: 'bar'}})}></span>`, container);

      const span = container.querySelector('span');
      assert.exists(span);
      const widget = UI.Widget.Widget.get(span!) as TestWidget;
      assert.deepEqual(widget.params, {foo: 'bar'});

      Lit.render(html`<span ${UI.Widget.widget(TestWidget, {params: {foo: 'baz'}})}></span>`, container);

      const span2 = container.querySelector('span');
      const widget2 = UI.Widget.Widget.get(span2!) as TestWidget;
      assert.deepEqual(widget2.params, {foo: 'baz'});
    });

    it('detaches the widget when the Lit template re-renders and removes it', async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);

      Lit.render(html`<span ${UI.Widget.widget(TestWidget)}></span>`, container);
      assert.strictEqual(attachedCount, 1);
      assert.strictEqual(detachedCount, 0);

      Lit.render(html`<div></div>`, container);
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.strictEqual(detachedCount, 1);
    });

    it('only calls setters for changed widget parameters', async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);

      const renderWidget = (foo: string, bar: string) => {
        Lit.render(html`<span ${UI.Widget.widget(TestWidget, {foo, bar})}></span>`, container);
      };

      renderWidget('1', '1');

      assert.strictEqual(fooSetterCount, 1, 'fooSetterCount 1st');
      assert.strictEqual(barSetterCount, 1, 'barSetterCount 1st');

      renderWidget('2', '1');

      assert.strictEqual(fooSetterCount, 2, 'fooSetterCount 2nd');
      assert.strictEqual(barSetterCount, 1, 'barSetterCount 2nd');
    });

    it('detaches the widget when an ancestor is imperatively removed from the DOM', async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);

      // Create a legacy widget hierarchy
      const legacyParent = new UI.Widget.Widget();
      legacyParent.markAsRoot();
      legacyParent.show(container);

      // Render a lit template inside the legacy widget
      Lit.render(html`<span ${UI.Widget.widget(TestWidget)}></span>`, legacyParent.contentElement);

      assert.strictEqual(attachedCount, 1);
      assert.strictEqual(detachedCount, 0);

      // Imperatively detach the legacy parent, which removes the DOM nodes outside of Lit's knowledge
      legacyParent.detach();

      // The tracker should trigger disconnectedCallback and a setTimeout

      assert.strictEqual(detachedCount, 1);
    });

    it('detaches the widget in a shadow root when the owner element is removed', async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);

      const ownerElement = document.createElement('div');
      const shadowRoot = ownerElement.attachShadow({mode: 'open'});
      container.appendChild(ownerElement);

      Lit.render(html`<span ${UI.Widget.widget(TestWidget)}></span>`, shadowRoot);

      assert.strictEqual(attachedCount, 1);
      assert.strictEqual(detachedCount, 0);

      // The owner element is removed, which removes the shadow root containing the lit template
      ownerElement.remove();

      // The tracker should trigger disconnectedCallback and a setTimeout
      await new Promise(resolve => setTimeout(resolve, 0));

      assert.strictEqual(detachedCount, 1);

      // Remove the container before teardown.
      // Since ownerElement was removed *before* detach, decrementWidgetCounter couldn't reach `container`.
      // By resetting the container's innerHTML manually here, we prevent the removeChildren() check from failing in teardown.
      container.innerHTML = '';
      container.remove();
    });

    it('dispatches DOM events through eventMixin', async () => {
      interface EventTypes {
        'test-event': string;
      }

      class EventWidget extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.Widget>(UI.Widget.Widget) {
        trigger() {
          this.dispatchEventToListeners('test-event', 'payload');
        }
      }

      const container = document.createElement('div');
      renderElementIntoDOM(container);

      const stub = sinon.stub();

      Lit.render(
          html`<devtools-widget ${UI.Widget.widget(EventWidget)} @test-event=${stub}></devtools-widget>`, container);

      const widget = (container.firstElementChild as unknown as UI.Widget.WidgetElement<EventWidget>)?.getWidget();
      assert.isOk(widget);

      widget.trigger();
      sinon.assert.calledOnce(stub);
      assert.strictEqual(stub.firstCall.firstArg.detail, 'payload');
    });
  });

  describe('Shadow DOM', () => {
    it('throws error when using DocumentFragment.appendChild with a widget', () => {
      const fragment = document.createDocumentFragment();
      const widget = new Widget();
      widget.markAsRoot();
      assert.throws(
          () => fragment.appendChild(widget.element), /Attempt to modify widget with native DOM method `appendChild`/);
    });

    it('keeps child widget in the Shadow Root when using pure shadow DOM', () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);

      const parentWidget = new Widget<ShadowRoot>({useShadowDom: 'pure'});
      parentWidget.markAsRoot();
      parentWidget.show(container);

      const childWidget = new Widget();
      const shadowRoot = parentWidget.contentElement;
      assert.instanceOf(shadowRoot, ShadowRoot);

      childWidget.show(shadowRoot);

      assert.strictEqual(
          childWidget.element.parentNode, shadowRoot, 'Child widget should be a child of the Shadow Root');
      assert.isNull(
          childWidget.element.parentElement,
          'Child widget should have no parentElement (since it is in a Shadow Root)');
    });

    it('keeps child widget in the Shadow Root when attached via WidgetDirective', async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);

      class ParentWidget extends Widget<ShadowRoot> {
        constructor() {
          super({useShadowDom: 'pure'});
        }
      }

      class ChildWidget extends Widget {
        constructor(element?: HTMLElement) {
          super(element);
          this.element.classList.add('child-widget');
        }

        override performUpdate(): void {
        }
      }

      const parentWidget = new ParentWidget();
      parentWidget.markAsRoot();
      parentWidget.show(container);

      const shadowRoot = parentWidget.contentElement;

      Lit.render(html`<devtools-widget ${UI.Widget.widget(ChildWidget)}></devtools-widget>`, shadowRoot);

      // Give some time for connectedCallback and potential microtasks
      await new Promise(resolve => setTimeout(resolve, 0));

      const childElement = shadowRoot.querySelector('devtools-widget');
      assert.exists(childElement, 'Child widget element should exist in the Shadow Root');
      assert.strictEqual(childElement?.parentNode, shadowRoot, 'Widget element should remain in the Shadow Root');
      assert.isNull(childElement?.parentElement, 'Widget element should not be moved to the host (Light DOM)');
    });
  });
});
