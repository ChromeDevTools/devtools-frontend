// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../components/render_coordinator/render_coordinator.js';

import * as UI from './legacy.js';

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

      assert.isNull(widget.element.getAttribute('jslog'));
      assert.strictEqual(
          widget.contentElement.getAttribute('jslog'),
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
  });

  describe('WidgetElement', () => {
    it('renders WidgetElement into DOM without a root element', async () => {
      const widget = new UI.Widget.WidgetElement();
      class WidgetInstance extends UI.Widget.Widget {
        override performUpdate(): void {
          // no-op
        }
      }
      widget.widgetConfig = UI.Widget.widgetConfig(WidgetInstance);
      renderElementIntoDOM(widget);
    });
  });
});
