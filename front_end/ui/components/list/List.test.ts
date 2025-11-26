// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  dispatchClickEvent,
  getEventPromise,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import * as Lit from '../../lit/lit.js';
import * as RenderCoordinator from '../render_coordinator/render_coordinator.js';

import type {ItemEditEvent, ItemRemoveEvent} from './List.js';
import * as List from './lists.js';  // eslint-disable-line @devtools/es-modules-import

const {html, render} = Lit;

async function renderListComponent(
    items: Lit.TemplateResult, editable?: boolean, deletable?: boolean): Promise<List.List.List> {
  const component = new List.List.List();
  if (editable) {
    component.editable = true;
  }
  if (deletable) {
    component.deletable = true;
  }
  render(items, component);
  renderElementIntoDOM(component);
  await RenderCoordinator.done();
  return component;
}

describe('List', () => {
  setupLocaleHooks();

  it('renders items from light DOM and assigns slot attributes', async () => {
    const component = await renderListComponent(html`
      <p>Item 1</p>
      <div>Item 2</div>
    `);
    assert.isNotNull(component.shadowRoot);

    const listItems = component.shadowRoot.querySelectorAll('li[role="listitem"]');
    assert.lengthOf(listItems, 2, 'Should render two list items');

    const item1Child = component.querySelector('p');
    const item2Child = component.querySelector('div');
    assert.strictEqual(item1Child?.getAttribute('slot'), 'slot-0', 'First child must have slot="slot-0"');
    assert.strictEqual(item2Child?.getAttribute('slot'), 'slot-1', 'Second child must have slot="slot-1"');

    assert.strictEqual(listItems[0].querySelector('slot')?.assignedNodes()[0].textContent, 'Item 1');
    assert.strictEqual(listItems[1].querySelector('slot')?.assignedNodes()[0].textContent, 'Item 2');
  });

  it('shows no control buttons per default', async () => {
    const component = await renderListComponent(html`
      <p>Item 1</p>
    `);
    assert.isNotNull(component.shadowRoot);

    const buttons = component.shadowRoot.querySelectorAll('devtools-button');
    assert.lengthOf(buttons, 0, 'No buttons should be rendered by default');
  });

  it('renders li items with tabindex=0 per default for keyboard navigation', async () => {
    const component = await renderListComponent(html`<p>Item 1</p>`);
    assert.isNotNull(component.shadowRoot);

    const listItem = component.shadowRoot.querySelector('li[role="listitem"]');
    assert.isNotNull(listItem, 'List item wrapper should exist');
    assert.strictEqual(listItem.getAttribute('tabindex'), '0', 'List item should be focusable by default');
  });

  it('shows only the edit button when editable is set', async () => {
    const component = await renderListComponent(
        html`
      <p>Item 1</p>
    `,
        true);
    assert.isNotNull(component.shadowRoot);

    const buttons = component.shadowRoot.querySelectorAll('devtools-button');
    assert.lengthOf(buttons, 1, 'Exactly one button should be rendered');

    const editButton = component.shadowRoot.querySelector('devtools-button[title="Edit"]');
    assert.isNotNull(editButton, 'Edit button should be present');
  });

  it('shows only the remove button when deletable is set', async () => {
    const component = await renderListComponent(
        html`
      <p>Item 1</p>
    `,
        undefined, true);
    assert.isNotNull(component.shadowRoot);

    const buttons = component.shadowRoot.querySelectorAll('devtools-button');
    assert.lengthOf(buttons, 1, 'Exactly one button should be rendered');

    const removeButton = component.shadowRoot.querySelector('devtools-button[title="Remove"]');
    assert.isNotNull(removeButton, 'Remove button should be present');
  });

  it('omits tabindex when list item focus is disabled via attribute', async () => {
    const component = await renderListComponent(html`<p>Item 1</p>`);
    assert.isNotNull(component.shadowRoot);

    let listItem = component.shadowRoot.querySelector('li[role="listitem"]');
    assert.strictEqual(listItem?.getAttribute('tabindex'), '0', 'Initial state must be focusable');

    component.setAttribute('disable-li-focus', 'true');
    await RenderCoordinator.done();

    listItem = component.shadowRoot.querySelector('li[role="listitem"]');
    assert.strictEqual(listItem?.getAttribute('tabindex'), '-1', 'Tabindex must be -1 when attribute is set');

    component.removeAttribute('disable-li-focus');
    await RenderCoordinator.done();

    listItem = component.shadowRoot.querySelector('li[role="listitem"]');
    assert.strictEqual(listItem?.getAttribute('tabindex'), '0', 'Tabindex must return when attribute is removed');
  });

  it('shows both edit and remove buttons when both flags are set', async () => {
    const component = await renderListComponent(html`<p>Item 1</p>`, true, true);
    assert.isNotNull(component.shadowRoot);

    const buttons = component.shadowRoot.querySelectorAll('devtools-button');
    assert.lengthOf(buttons, 2, 'Exactly two buttons should be rendered');
    assert.isNotNull(component.shadowRoot.querySelector('devtools-button[title="Edit"]'));
    assert.isNotNull(component.shadowRoot.querySelector('devtools-button[title="Remove"]'));
  });

  it('dispatches an "edit" event when the edit button is clicked', async () => {
    const component = await renderListComponent(
        html`
      <p>Item 1</p>
      <p>Item 2</p>
    `,
        true, false);
    assert.isNotNull(component.shadowRoot);

    const listItems = component.shadowRoot.querySelectorAll('li');
    const secondItem = listItems[1];

    const editButton = secondItem.querySelector<HTMLElement>('devtools-button[title="Edit"]');
    assert.instanceOf(editButton, HTMLElement);

    const eventPromise = getEventPromise<ItemEditEvent>(component, 'edit');
    dispatchClickEvent(editButton);

    const event = await eventPromise;
    assert.deepEqual(event.detail, {index: 1});
  });

  it('dispatches a "delete" event when the remove button is clicked', async () => {
    const component = await renderListComponent(
        html`
      <p>Item 1</p>
      <p>Item 2</p>
    `,
        false, true);
    assert.isNotNull(component.shadowRoot);

    const listItems = component.shadowRoot.querySelectorAll('li');
    const firstItem = listItems[0];

    const removeButton = firstItem.querySelector<HTMLElement>('devtools-button[title="Remove"]');
    assert.instanceOf(removeButton, HTMLElement);

    const eventPromise = getEventPromise<ItemRemoveEvent>(component, 'delete');
    dispatchClickEvent(removeButton);

    const event = await eventPromise;
    assert.deepEqual(event.detail, {index: 0});
  });

  it('adds an item when a new child is appended', async () => {
    const component = await renderListComponent(html`
      <p>Item 1</p>
    `);
    assert.isNotNull(component.shadowRoot);

    let listItems = component.shadowRoot.querySelectorAll('li');
    assert.lengthOf(listItems, 1);

    const newItem = document.createElement('p');
    newItem.textContent = 'Item 2';
    component.appendChild(newItem);

    await RenderCoordinator.done();

    listItems = component.shadowRoot.querySelectorAll('li');
    assert.lengthOf(listItems, 2, 'Should have two items after adding one');
    assert.strictEqual(listItems[1].querySelector('slot')?.assignedNodes()[0].textContent, 'Item 2');
  });

  it('removes an item when a child is removed', async () => {
    const component = await renderListComponent(html`
      <p>Item 1</p>
      <p>Item 2</p>
    `);
    assert.isNotNull(component.shadowRoot);

    let listItems = component.shadowRoot.querySelectorAll('li');
    assert.lengthOf(listItems, 2);

    const itemToRemove = component.querySelector('p:last-child');
    assert.instanceOf(itemToRemove, HTMLParagraphElement);
    itemToRemove.remove();

    await RenderCoordinator.done();

    listItems = component.shadowRoot.querySelectorAll('li');
    assert.lengthOf(listItems, 1, 'Should have one item after removing one');
    assert.strictEqual(listItems[0].querySelector('slot')?.assignedNodes()[0].textContent, 'Item 1');
  });
});
