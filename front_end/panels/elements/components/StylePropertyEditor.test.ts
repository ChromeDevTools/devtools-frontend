// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import * as sinon from 'sinon';

import {
  getEventPromise,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';

import * as ElementsComponents from './components.js';

describe('StylePropertyEditor', () => {
  setupLocaleHooks();
  function assertValues(component: ElementsComponents.StylePropertyEditor.StylePropertyEditor, values: string[]) {
    const propertyElements = component.contentElement.querySelectorAll('.property');
    const properties = [];
    for (const propElement of propertyElements) {
      properties.push(propElement.textContent?.trim());
    }
    assert.deepEqual(properties, values);
  }

  describe('DEFAULT_VIEW', () => {
    it('renders the view and triggers button click callback', () => {
      const target = document.createElement('div');
      let clickedProperty = '';
      let clickedValue = '';
      const input: ElementsComponents.StylePropertyEditor.ViewInput = {
        authoredProperties: new Map([['flex-direction', 'row']]),
        computedProperties: new Map(),
        editableProperties: ElementsComponents.StylePropertyEditor.FlexboxEditableProperties,
        containerClass: 'flexbox-editor',
        findIcon: () => ({iconName: 'flex-direction', rotate: 0, scaleX: 1, scaleY: 1}),
        onButtonClick: (propertyName, propertyValue) => {
          clickedProperty = propertyName;
          clickedValue = propertyValue;
        },
        onDenseCheckboxChange: () => {},
      };
      ElementsComponents.StylePropertyEditor.DEFAULT_VIEW(input, undefined, target);
      assert.isTrue(target.classList.contains('flexbox-editor'));
      const propertyElements = target.querySelectorAll('.property');
      assert.isNotEmpty(propertyElements);
      const button = target.querySelector<HTMLButtonElement>('.row .buttons .button');
      assert.exists(button);
      button.click();
      assert.strictEqual(clickedProperty, 'flex-direction');
      assert.strictEqual(clickedValue, 'row');
    });

    it('renders dense checkbox and triggers semantic change callback', () => {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      let reportedChecked: boolean|undefined;
      let reportedIsRow: boolean|undefined;
      let reportedIsColumn: boolean|undefined;
      const input: ElementsComponents.StylePropertyEditor.ViewInput = {
        authoredProperties: new Map([['grid-auto-flow', 'row']]),
        computedProperties: new Map(),
        editableProperties: ElementsComponents.StylePropertyEditor.GridEditableProperties,
        findIcon: () => ({iconName: 'flex-direction', rotate: 0, scaleX: 1, scaleY: 1}),
        onButtonClick: () => {},
        onDenseCheckboxChange: (checked, isRow, isColumn) => {
          reportedChecked = checked;
          reportedIsRow = isRow;
          reportedIsColumn = isColumn;
        },
      };
      ElementsComponents.StylePropertyEditor.DEFAULT_VIEW(input, undefined, target);
      const checkbox = target.querySelector('devtools-checkbox');
      assert.exists(checkbox);
      checkbox.click();
      assert.isTrue(reportedChecked);
      assert.isTrue(reportedIsRow);
      assert.isFalse(reportedIsColumn);
    });
  });

  describe('FlexboxEditor', () => {
    it('renders the editor and skips redundant updates for identical property maps', async () => {
      const viewSpy = sinon.spy(ElementsComponents.StylePropertyEditor.DEFAULT_VIEW);
      const component = new ElementsComponents.StylePropertyEditor.FlexboxEditor(undefined, viewSpy);
      renderElementIntoDOM(component);
      const authored = new Map([
        ['flex-direction', 'row'],
        ['flex-wrap', 'wrap'],
        ['align-content', 'flex-end'],
        ['justify-content', 'flex-start'],
        ['align-items', 'flex-start'],
      ]);
      const emptyMap = new Map<string, string>();
      component.authoredProperties = authored;
      component.computedProperties = emptyMap;
      await component.updateComplete;
      assertValues(component, [
        'flex-direction: row',
        'flex-wrap: wrap',
        'align-content: flex-end',
        'justify-content: flex-start',
        'align-items: flex-start',
      ]);

      const callCountAfterFirstRender = viewSpy.callCount;
      component.authoredProperties = authored;
      component.computedProperties = emptyMap;
      await component.updateComplete;
      sinon.assert.callCount(viewSpy, callCountAfterFirstRender);

      component.authoredProperties = new Map();
      component.computedProperties = new Map([
        ['flex-direction', 'row'],
        ['flex-wrap', 'wrap'],
        ['align-content', 'flex-end'],
        ['justify-content', 'flex-start'],
        ['align-items', 'flex-start'],
      ]);
      await component.updateComplete;
      assertValues(component, [
        'flex-direction: row',
        'flex-wrap: wrap',
        'align-content: flex-end',
        'justify-content: flex-start',
        'align-items: flex-start',
      ]);
      component.authoredProperties = new Map();
      component.computedProperties = new Map();
      await component.updateComplete;
      assertValues(component, ['flex-direction:', 'flex-wrap:', 'align-content:', 'justify-content:', 'align-items:']);
    });

    it('allows selecting a property value', async () => {
      const component = new ElementsComponents.StylePropertyEditor.FlexboxEditor();
      renderElementIntoDOM(component);
      component.authoredProperties = new Map([
        ['flex-direction', 'row'],
      ]);
      component.computedProperties = new Map();
      await component.updateComplete;
      assertValues(
          component, ['flex-direction: row', 'flex-wrap:', 'align-content:', 'justify-content:', 'align-items:']);
      const eventPromise = getEventPromise<ElementsComponents.StylePropertyEditor.PropertySelectedEvent>(
          component.element, 'propertyselected');
      const flexDirectionColumnButton = component.contentElement.querySelector('.row .buttons .button:nth-child(2)');
      assert.instanceOf(flexDirectionColumnButton, HTMLButtonElement);
      flexDirectionColumnButton.click();
      const event = await eventPromise;
      assert.deepEqual(event.data, {name: 'flex-direction', value: 'column'});
    });

    it('allows deselecting a property value', async () => {
      const component = new ElementsComponents.StylePropertyEditor.FlexboxEditor();
      renderElementIntoDOM(component);
      component.authoredProperties = new Map([
        ['flex-direction', 'column'],
      ]);
      component.computedProperties = new Map();
      await component.updateComplete;
      assertValues(
          component, ['flex-direction: column', 'flex-wrap:', 'align-content:', 'justify-content:', 'align-items:']);
      const eventPromise = getEventPromise<ElementsComponents.StylePropertyEditor.PropertyDeselectedEvent>(
          component.element, 'propertydeselected');
      const flexDirectionColumnButton = component.contentElement.querySelector('.row .buttons .button:nth-child(2)');
      assert.instanceOf(flexDirectionColumnButton, HTMLButtonElement);
      flexDirectionColumnButton.click();
      const event = await eventPromise;
      assert.deepEqual(event.data, {name: 'flex-direction', value: 'column'});
    });
  });

  describe('GridEditor', () => {
    it('renders the editor', async () => {
      const component = new ElementsComponents.StylePropertyEditor.GridEditor();
      renderElementIntoDOM(component);
      component.authoredProperties = new Map([
        ['grid-auto-flow', 'column'],
        ['align-content', 'end'],
        ['justify-content', 'start'],
        ['align-items', 'start'],
        ['justify-items', 'center'],
      ]);
      component.computedProperties = new Map();
      await component.updateComplete;
      assertValues(component, [
        'grid-auto-flow: column',
        'align-content: end',
        'justify-content: start',
        'align-items: start',
        'justify-items: center',
      ]);
      component.authoredProperties = new Map();
      component.computedProperties = new Map([
        ['grid-auto-flow', 'row dense'],
        ['align-content', 'end'],
        ['justify-content', 'start'],
        ['align-items', 'start'],
        ['justify-items', 'center'],
      ]);
      await component.updateComplete;
      assertValues(component, [
        'grid-auto-flow: row dense',
        'align-content: end',
        'justify-content: start',
        'align-items: start',
        'justify-items: center',
      ]);
      component.authoredProperties = new Map();
      component.computedProperties = new Map();
      await component.updateComplete;
      assertValues(
          component, ['grid-auto-flow:', 'align-content:', 'justify-content:', 'align-items:', 'justify-items:']);
    });

    it('allows selecting a grid-auto-flow property value', async () => {
      const component = new ElementsComponents.StylePropertyEditor.GridEditor();
      renderElementIntoDOM(component);
      component.authoredProperties = new Map();
      component.computedProperties = new Map([
        ['grid-auto-flow', 'row'],
      ]);
      await component.updateComplete;
      assertValues(component, [
        'grid-auto-flow: row',
        'align-content:',
        'justify-content:',
        'align-items:',
        'justify-items:',
      ]);
      const eventPromise = getEventPromise<ElementsComponents.StylePropertyEditor.PropertySelectedEvent>(
          component.element, 'propertyselected');
      const gridAutoFlowColumnButton =
          component.contentElement.querySelector('.row:nth-child(1) .buttons .button:nth-child(2)');
      assert.instanceOf(gridAutoFlowColumnButton, HTMLButtonElement);
      gridAutoFlowColumnButton.click();
      const event = await eventPromise;
      assert.deepEqual(event.data, {name: 'grid-auto-flow', value: 'column'});
    });

    it('allows toggling dense checkbox with direction selected', async () => {
      const component = new ElementsComponents.StylePropertyEditor.GridEditor();
      renderElementIntoDOM(component);
      component.authoredProperties = new Map([
        ['grid-auto-flow', 'row'],
      ]);
      component.computedProperties = new Map();
      await component.updateComplete;
      const eventPromise = getEventPromise<ElementsComponents.StylePropertyEditor.PropertySelectedEvent>(
          component.element, 'propertyselected');
      const denseCheckbox = component.contentElement.querySelector('.row:nth-child(1) .buttons devtools-checkbox');
      assert.instanceOf(denseCheckbox, HTMLElement);
      denseCheckbox.click();
      const event = await eventPromise;
      assert.deepEqual(event.data, {name: 'grid-auto-flow', value: 'row dense'});
    });

    it('allows toggling dense checkbox without direction selected', async () => {
      const component = new ElementsComponents.StylePropertyEditor.GridEditor();
      renderElementIntoDOM(component);
      component.authoredProperties = new Map();
      component.computedProperties = new Map([
        ['grid-auto-flow', 'row'],
      ]);
      await component.updateComplete;
      const eventPromise = getEventPromise<ElementsComponents.StylePropertyEditor.PropertySelectedEvent>(
          component.element, 'propertyselected');
      const denseCheckbox = component.contentElement.querySelector('.row:nth-child(1) .buttons devtools-checkbox');
      assert.instanceOf(denseCheckbox, HTMLElement);
      denseCheckbox.click();
      const event = await eventPromise;
      assert.deepEqual(event.data, {name: 'grid-auto-flow', value: 'dense'});
    });

    it('allows selecting a property value', async () => {
      const component = new ElementsComponents.StylePropertyEditor.GridEditor();
      renderElementIntoDOM(component);
      component.authoredProperties = new Map();
      component.computedProperties = new Map([
        ['justify-items', 'normal'],
      ]);
      await component.updateComplete;
      assertValues(
          component,
          ['grid-auto-flow:', 'align-content:', 'justify-content:', 'align-items:', 'justify-items: normal']);
      const eventPromise = getEventPromise<ElementsComponents.StylePropertyEditor.PropertySelectedEvent>(
          component.element, 'propertyselected');
      const justifyItemsButton =
          component.contentElement.querySelector('.row:nth-child(5) .buttons .button:nth-child(1)');
      assert.instanceOf(justifyItemsButton, HTMLButtonElement);
      justifyItemsButton.click();
      const event = await eventPromise;
      assert.deepEqual(event.data, {name: 'justify-items', value: 'center'});
    });

    it('allows deselecting a property value', async () => {
      const component = new ElementsComponents.StylePropertyEditor.GridEditor();
      renderElementIntoDOM(component);
      component.authoredProperties = new Map([
        ['justify-items', 'center'],
      ]);
      component.computedProperties = new Map();
      await component.updateComplete;
      assertValues(
          component,
          ['grid-auto-flow:', 'align-content:', 'justify-content:', 'align-items:', 'justify-items: center']);
      const eventPromise = getEventPromise<ElementsComponents.StylePropertyEditor.PropertyDeselectedEvent>(
          component.element, 'propertydeselected');
      const justifyItemsButton =
          component.contentElement.querySelector('.row:nth-child(5) .buttons .button:nth-child(1)');
      assert.instanceOf(justifyItemsButton, HTMLButtonElement);
      justifyItemsButton.click();
      const event = await eventPromise;
      assert.deepEqual(event.data, {name: 'justify-items', value: 'center'});
    });
  });

  describe('GridLanesEditor', () => {
    it('renders the editor', async () => {
      const component = new ElementsComponents.StylePropertyEditor.GridLanesEditor();
      renderElementIntoDOM(component);
      component.authoredProperties = new Map([
        ['align-content', 'end'],
        ['justify-content', 'start'],
        ['align-items', 'start'],
        ['justify-items', 'center'],
      ]);
      component.computedProperties = new Map();
      await component.updateComplete;
      assertValues(component, [
        'align-content: end',
        'justify-content: start',
        'align-items: start',
        'justify-items: center',
      ]);
      component.authoredProperties = new Map();
      component.computedProperties = new Map([
        ['align-content', 'start'],
        ['justify-content', 'end'],
        ['align-items', 'start'],
        ['justify-items', 'center'],
      ]);
      await component.updateComplete;
      assertValues(component, [
        'align-content: start',
        'justify-content: end',
        'align-items: start',
        'justify-items: center',
      ]);
      component.authoredProperties = new Map();
      component.computedProperties = new Map();
      await component.updateComplete;
      assertValues(component, ['align-content:', 'justify-content:', 'align-items:', 'justify-items:']);
    });

    it('allows selecting a property value', async () => {
      const component = new ElementsComponents.StylePropertyEditor.GridLanesEditor();
      renderElementIntoDOM(component);
      component.authoredProperties = new Map();
      component.computedProperties = new Map([
        ['justify-items', 'end'],
      ]);
      await component.updateComplete;
      assertValues(component, ['align-content:', 'justify-content:', 'align-items:', 'justify-items: end']);
      const eventPromise = getEventPromise<ElementsComponents.StylePropertyEditor.PropertySelectedEvent>(
          component.element, 'propertyselected');
      const justifyItemsButton =
          component.contentElement.querySelector('.row:nth-child(4) .buttons .button:nth-child(3)');
      assert.instanceOf(justifyItemsButton, HTMLButtonElement);
      justifyItemsButton.click();
      const event = await eventPromise;
      assert.deepEqual(event.data, {name: 'justify-items', value: 'end'});
    });

    it('allows deselecting a property value', async () => {
      const component = new ElementsComponents.StylePropertyEditor.GridLanesEditor();
      renderElementIntoDOM(component);
      component.authoredProperties = new Map([
        ['align-items', 'start'],
      ]);
      component.computedProperties = new Map();
      await component.updateComplete;
      assertValues(component, ['align-content:', 'justify-content:', 'align-items: start', 'justify-items:']);
      const eventPromise = getEventPromise<ElementsComponents.StylePropertyEditor.PropertyDeselectedEvent>(
          component.element, 'propertydeselected');
      const justifyItemsButton =
          component.contentElement.querySelector('.row:nth-child(3) .buttons .button:nth-child(2)');
      assert.instanceOf(justifyItemsButton, HTMLButtonElement);
      justifyItemsButton.click();
      const event = await eventPromise;
      assert.deepEqual(event.data, {name: 'align-items', value: 'start'});
    });
  });
});
