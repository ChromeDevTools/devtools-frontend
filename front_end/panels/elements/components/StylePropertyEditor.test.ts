// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  getEventPromise,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';

import * as ElementsComponents from './components.js';

describeWithLocale('StylePropertyEditor', () => {
  function assertValues(component: HTMLElement, values: string[]) {
    const propertyElements = component.shadowRoot!.querySelectorAll('.property');
    const properties = [];
    for (const propElement of propertyElements) {
      properties.push(propElement.textContent?.trim());
    }
    assert.deepEqual(properties, values);
  }

  describe('FlexboxEditor', () => {
    it('renders the editor', async () => {
      const component = new ElementsComponents.StylePropertyEditor.FlexboxEditor();
      renderElementIntoDOM(component);
      component.data = {
        authoredProperties: new Map([
          ['flex-direction', 'row'],
          ['flex-wrap', 'wrap'],
          ['align-content', 'flex-end'],
          ['justify-content', 'flex-start'],
          ['align-items', 'flex-start'],
        ]),
        computedProperties: new Map(),
      };
      assertValues(component, [
        'flex-direction: row',
        'flex-wrap: wrap',
        'align-content: flex-end',
        'justify-content: flex-start',
        'align-items: flex-start',
      ]);
      component.data = {
        authoredProperties: new Map(),
        computedProperties: new Map([
          ['flex-direction', 'row'],
          ['flex-wrap', 'wrap'],
          ['align-content', 'flex-end'],
          ['justify-content', 'flex-start'],
          ['align-items', 'flex-start'],
        ]),
      };
      assertValues(component, [
        'flex-direction: row',
        'flex-wrap: wrap',
        'align-content: flex-end',
        'justify-content: flex-start',
        'align-items: flex-start',
      ]);
      component.data = {
        authoredProperties: new Map(),
        computedProperties: new Map(),
      };
      assertValues(component, ['flex-direction:', 'flex-wrap:', 'align-content:', 'justify-content:', 'align-items:']);
    });

    it('allows selecting a property value', async () => {
      const component = new ElementsComponents.StylePropertyEditor.FlexboxEditor();
      renderElementIntoDOM(component);
      component.data = {
        authoredProperties: new Map([
          ['flex-direction', 'row'],
        ]),
        computedProperties: new Map(),
      };
      assertValues(
          component, ['flex-direction: row', 'flex-wrap:', 'align-content:', 'justify-content:', 'align-items:']);
      const eventPromise =
          getEventPromise<ElementsComponents.StylePropertyEditor.PropertySelectedEvent>(component, 'propertyselected');
      const flexDirectionColumnButton = component.shadowRoot!.querySelector('.row .buttons .button:nth-child(2)');
      assert.instanceOf(flexDirectionColumnButton, HTMLButtonElement);
      flexDirectionColumnButton.click();
      const event = await eventPromise;
      assert.deepEqual(event.data, {name: 'flex-direction', value: 'column'});
    });

    it('allows deselecting a property value', async () => {
      const component = new ElementsComponents.StylePropertyEditor.FlexboxEditor();
      renderElementIntoDOM(component);
      component.data = {
        authoredProperties: new Map([
          ['flex-direction', 'column'],
        ]),
        computedProperties: new Map(),
      };
      assertValues(
          component, ['flex-direction: column', 'flex-wrap:', 'align-content:', 'justify-content:', 'align-items:']);
      const eventPromise = getEventPromise<ElementsComponents.StylePropertyEditor.PropertyDeselectedEvent>(
          component, 'propertydeselected');
      const flexDirectionColumnButton = component.shadowRoot!.querySelector('.row .buttons .button:nth-child(2)');
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
      component.data = {
        authoredProperties: new Map([
          ['align-content', 'end'],
          ['justify-content', 'start'],
          ['align-items', 'start'],
          ['justify-items', 'center'],
        ]),
        computedProperties: new Map(),
      };
      assertValues(component, [
        'align-content: end',
        'justify-content: start',
        'align-items: start',
        'justify-items: center',
      ]);
      component.data = {
        authoredProperties: new Map(),
        computedProperties: new Map([
          ['align-content', 'end'],
          ['justify-content', 'start'],
          ['align-items', 'start'],
          ['justify-items', 'center'],
        ]),
      };
      assertValues(component, [
        'align-content: end',
        'justify-content: start',
        'align-items: start',
        'justify-items: center',
      ]);
      component.data = {
        authoredProperties: new Map(),
        computedProperties: new Map(),
      };
      assertValues(component, ['align-content:', 'justify-content:', 'align-items:', 'justify-items:']);
    });

    it('allows selecting a property value', async () => {
      const component = new ElementsComponents.StylePropertyEditor.GridEditor();
      renderElementIntoDOM(component);
      component.data = {
        authoredProperties: new Map(),
        computedProperties: new Map([
          ['justify-items', 'normal'],
        ]),
      };
      assertValues(component, ['align-content:', 'justify-content:', 'align-items:', 'justify-items: normal']);
      const eventPromise =
          getEventPromise<ElementsComponents.StylePropertyEditor.PropertySelectedEvent>(component, 'propertyselected');
      const justifyItemsButton = component.shadowRoot!.querySelector('.row:nth-child(4) .buttons .button:nth-child(1)');
      assert.instanceOf(justifyItemsButton, HTMLButtonElement);
      justifyItemsButton.click();
      const event = await eventPromise;
      assert.deepEqual(event.data, {name: 'justify-items', value: 'center'});
    });

    it('allows deselecting a property value', async () => {
      const component = new ElementsComponents.StylePropertyEditor.GridEditor();
      renderElementIntoDOM(component);
      component.data = {
        authoredProperties: new Map([
          ['justify-items', 'center'],
        ]),
        computedProperties: new Map(),
      };
      assertValues(component, ['align-content:', 'justify-content:', 'align-items:', 'justify-items: center']);
      const eventPromise = getEventPromise<ElementsComponents.StylePropertyEditor.PropertyDeselectedEvent>(
          component, 'propertydeselected');
      const justifyItemsButton = component.shadowRoot!.querySelector('.row:nth-child(4) .buttons .button:nth-child(1)');
      assert.instanceOf(justifyItemsButton, HTMLButtonElement);
      justifyItemsButton.click();
      const event = await eventPromise;
      assert.deepEqual(event.data, {name: 'justify-items', value: 'center'});
    });
  });
});
