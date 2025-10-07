// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './data_grid.js';

import {raf, renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as UI from '../../legacy.js';

const {render, html} = Lit;

function getFocusedElement(): HTMLElement {
  let root: Document|ShadowRoot = document;
  while (root.activeElement?.shadowRoot?.activeElement) {
    root = root.activeElement.shadowRoot;
  }
  return root.activeElement as HTMLElement;
}

function sendKeydown(element: HTMLElement, key: string): void {
  element.focus();
  getFocusedElement().dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        composed: true,
      }),
  );
}

describeWithEnvironment('DataGrid', () => {
  let container!: HTMLElement;
  let liveAnnouncerAlertStub: sinon.SinonStub;

  function getAlertAnnouncement(element: HTMLElement): string {
    element.blur();
    element.focus();
    assert.isTrue(liveAnnouncerAlertStub.called, 'Expected UI.ARIAUtils.LiveAnnouncer.alert to be called');
    return liveAnnouncerAlertStub.lastCall.args[0];
  }

  beforeEach(() => {
    liveAnnouncerAlertStub = sinon.stub(UI.ARIAUtils.LiveAnnouncer, 'alert').returns();

    container = document.createElement('div');
    container.style.display = 'flex';
    container.style.width = '640px';
    container.style.height = '480px';
    renderElementIntoDOM(container);
  });

  async function renderDataGrid(template: Lit.TemplateResult): Promise<HTMLElement> {
    render(template, container, {host: {}});
    await RenderCoordinator.done({waitForWork: true});
    return container.querySelector('devtools-data-grid')!;
  }

  async function renderDataGridContent(template: Lit.TemplateResult): Promise<HTMLElement> {
    return await renderDataGrid(
        html`<devtools-data-grid striped name="Display Name" .template=${template}></devtools-data-grid>`);
  }

  async function renderDataGridWithData(columns: Lit.TemplateResult, rows: Lit.TemplateResult): Promise<HTMLElement> {
    return await renderDataGridContent(html`<table>${columns}${rows}</table>`);
  }

  it('can be configured from template', async () => {
    const element = await renderDataGrid(html`
        <devtools-data-grid .striped=${true} .displayName=${'Display Name'}>
        </devtools-data-grid>`);
    assert.isTrue(getAlertAnnouncement(element).startsWith('Display Name Rows: 0'));
  });

  it('can initialize data from template', async () => {
    const element = await renderDataGrid(html`
        <devtools-data-grid striped name=${'Display Name'}>
          <table>
            <tr>
              <th id="column-1">Column 1</th>
              <th id="column-2">Column 2</th>
            </tr>
            <tr>
              <td>Value 1</td>
              <td>Value 2</td>
            </tr>
          </table>
        </devtools-data-grid>`);
    sendKeydown(element, 'ArrowDown');
    assert.strictEqual(getAlertAnnouncement(element), 'Display Name Row  Column 1: Value 1, Column 2: Value 2');
  });

  it('can update data from template', async () => {
    await renderDataGridWithData(
        html`
            <tr>
              <th id="column-1">Column 1</th>
              <th id="column-2">Column 2</th>
            </tr>`,
        html`
            <tr>
              <td>Value 1</td>
              <td>Value 2</td>
            </tr>
          </table>
        </devtools-data-grid>`);
    const element = await renderDataGridWithData(
        html`
            <tr>
              <th id="column-3">Column 3</th>
              <th id="column-4">Column 4</th>
            </tr>`,
        html`
            <tr>
              <td>Value 3</td>
              <td>Value 4</td>
            </tr>
          </table>
        </devtools-data-grid>`);
    sendKeydown(element, 'ArrowDown');
    assert.strictEqual(getAlertAnnouncement(element), 'Display Name Row  Column 3: Value 3, Column 4: Value 4');
  });

  it('can filter data', async () => {
    await renderDataGrid(html`
        <devtools-data-grid striped name=${'Display Name'}>
          <table>
            <tr>
              <th id="column-1">Column 1</th>
              <th id="column-2">Column 2</th>
            </tr>
            <tr>
              <td>Value 1</td>
              <td>Value 2</td>
            </tr>
            <tr>
              <td>Value 3</td>
              <td>Value 4</td>
            </tr>
          </table>
        </devtools-data-grid>`);
    // clang-format off
    const element = await renderDataGrid(html`
        <devtools-data-grid
            striped name=${'Display Name'}
            .filters=${[{key: 'column-1', text: '3',  negative: false}]}>
          <table>
            <tr>
              <th id="column-1">Column 1</th>
              <th id="column-2">Column 2</th>
            </tr>
            <tr>
              <td>Value 1</td>
              <td>Value 2</td>
            </tr>
            <tr>
              <td>Value 3</td>
              <td>Value 4</td>
            </tr>
          </table>
        </devtools-data-grid>`);
    // clang-format on
    assert.isTrue(getAlertAnnouncement(element).startsWith('Display Name Rows: 1'));
    sendKeydown(element, 'ArrowDown');
    assert.strictEqual(getAlertAnnouncement(element), 'Display Name Row  Column 1: Value 3, Column 2: Value 4');
  });

  it('can set selection from template', async () => {
    let element = await renderDataGrid(html`
        <devtools-data-grid striped name=${'Display Name'}>
          <table>
            <tr>
              <th id="column-1">Column 1</th>
              <th id="column-2">Column 2</th>
            </tr>
            <tr>
              <td>Value 1</td>
              <td>Value 2</td>
            </tr>
            <tr selected>
              <td>Value 3</td>
              <td>Value 4</td>
            </tr>
          </table>
        </devtools-data-grid>`);
    // clang-format off
    assert.strictEqual(getAlertAnnouncement(element), 'Display Name Row  Column 1: Value 3, Column 2: Value 4');

    element = await renderDataGrid(html`
        <devtools-data-grid striped name=${'Display Name'}>
          <table>
            <tr>
              <th id="column-1">Column 1</th>
              <th id="column-2">Column 2</th>
            </tr>
            <tr>
              <td>Value 1</td>
              <td>Value 2</td>
            </tr>
            <tr selected="false">
              <td>Value 3</td>
              <td>Value 4</td>
            </tr>
          </table>
        </devtools-data-grid>`);
    // clang-format off
    assert.isTrue(getAlertAnnouncement(element).startsWith('Display Name Rows: 2'));
  });

  it('supports editable columns', async () => {
    const editCallback = sinon.stub();
    const element = await renderDataGrid(html`
        <devtools-data-grid striped name=${'Display Name'}>
          <table>
            <tr>
              <th id="column-1" editable>Column 1</th>
              <th id="column-2">Column 2</th>
            </tr>
            <tr @edit=${editCallback as () => void}>
              <td>Value 1</td>
              <td>Value 2</td>
            </tr>
          </table>
        </devtools-data-grid>`);
    sendKeydown(element, 'ArrowDown');
    sendKeydown(element, 'Enter');
    getFocusedElement().textContent = 'New Value';
    sendKeydown(element, 'Enter');
    sinon.assert.calledOnce(editCallback);
    assert.isTrue(editCallback.firstCall.args[0].target.textContent.includes('Value 1'));
    assert.isTrue(editCallback.firstCall.args[0].target.textContent.includes('Value 2'));
    assert.strictEqual(editCallback.firstCall.args[0].detail.columnId, 'column-1');
    assert.strictEqual(editCallback.firstCall.args[0].detail.valueBeforeEditing, 'Value 1');
    assert.strictEqual(editCallback.firstCall.args[0].detail.newText, 'New Value');
  });

  it('supports creation node', async () => {
    const createCallback = sinon.stub();
    const editCallback = sinon.stub();
    const element = await renderDataGrid(html`
        <devtools-data-grid striped name=${'Display Name'}
                            @create=${createCallback as () => void}>
          <table>
            <tr>
              <th id="column-1" editable>Column 1</th>
              <th id="column-2" editable>Column 2</th>
            </tr>
            <tr @edit=${editCallback as () => void}>
              <td>Value 1</td>
              <td>Value 2</td>
            </tr>
            <tr placeholder @edit=${editCallback as () => void}>
            </tr>
          </table>
        </devtools-data-grid>`);
    sendKeydown(element, 'ArrowDown');
    sendKeydown(element, 'ArrowDown');
    sendKeydown(element, 'Enter');
    getFocusedElement().textContent = 'New Value 1';
    sendKeydown(element, 'Tab');
    sinon.assert.notCalled(editCallback);
    sinon.assert.notCalled(createCallback);
    getFocusedElement().textContent = 'New Value 2';
    sendKeydown(element, 'Tab');
    sinon.assert.notCalled(editCallback);
    sinon.assert.calledOnce(createCallback);
    assert.deepEqual(
        createCallback.firstCall.args[0].detail, {'column-1': 'New Value 1', 'column-2': 'New Value 2'});
  });

  it('can display nested nodes', async () => {
    const element = await renderDataGrid(html`
        <devtools-data-grid striped name=${'Display Name'}>
          <table>
            <tr>
              <th id="column-1">Column 1</th>
              <th id="column-2">Column 2</th>
            </tr>
            <tr>
              <td>Parent Value 1</td>
              <td>Parent Value 2</td>
              <td>
                <table>
                  <tr>
                    <td>Child Value 1</td>
                    <td>Child Value 2</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </devtools-data-grid>`);

    // Navigate to parent row.
    sendKeydown(element, 'ArrowDown');
    // It should identify it as a parent and collapsed.
    assert.strictEqual(
        getAlertAnnouncement(element),
        'Display Name Row collapsed level 1, Column 1: Parent Value 1, Column 2: Parent Value 2');

    // Expand parent row.
    sendKeydown(element, 'ArrowRight');
    assert.strictEqual(
        getAlertAnnouncement(element),
        'Display Name Row expanded level 1, Column 1: Parent Value 1, Column 2: Parent Value 2');

    await raf();

    // Navigate to child row.
    sendKeydown(element, 'ArrowDown');
    assert.strictEqual(
        getAlertAnnouncement(element),
        'Display Name Row  level 2, Column 1: Child Value 1, Column 2: Child Value 2');
  });

  it('dispatches open event on expanding', async () => {
    const openCallback = sinon.stub();
    const element = await renderDataGrid(html`
        <devtools-data-grid striped name=${'Display Name'}>
          <table>
            <tr>
              <th id="column-1">Column 1</th>
            </tr>
            <tr @open=${openCallback as () => void}>
              <td>Parent Value 1</td>
              <td>
                <table>
                  <tr>
                    <td>Child Value 1</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </devtools-data-grid>`);

    // Navigate to parent row.
    sendKeydown(element, 'ArrowDown');
    // Expand parent row.
    sendKeydown(element, 'Enter');

    sinon.assert.calledOnce(openCallback);
  });

  it('can set initial sort order from template', async () => {
    const element = await renderDataGrid(html`
        <devtools-data-grid striped name=${'Display Name'}>
          <table>
            <tr>
              <th id="column-1" sort="descending">Column 1</th>
            </tr>
            <tr><td>Value B</td></tr>
            <tr><td>Value A</td></tr>
            <tr><td>Value C</td></tr>
          </table>
        </devtools-data-grid>`);
    // After initial render, rows should be sorted descending by column-1.
    // So C, B, A.
    sendKeydown(element, 'ArrowDown');
    assert.strictEqual(getAlertAnnouncement(element), 'Display Name Row  Column 1: Value C');
    sendKeydown(element, 'ArrowDown');
    assert.strictEqual(getAlertAnnouncement(element), 'Display Name Row  Column 1: Value B');
    sendKeydown(element, 'ArrowDown');
    assert.strictEqual(getAlertAnnouncement(element), 'Display Name Row  Column 1: Value A');
  });

  it('can be styled with a style tag', async () => {
    const element = await renderDataGrid(html`
        <devtools-data-grid .template=${html`
          <table>
            <style>
              .test-class {
                color: red;
              }
            </style>
            <tr><th id="column-1">Column</th></tr>
            <tr><td class="test-class">Value</td></tr>
          </table>`}>
        </devtools-data-grid>`);

    const cell = element.shadowRoot?.querySelector('.test-class');
    assert.instanceOf(cell, HTMLTableCellElement);
    const cellStyle = window.getComputedStyle(cell);
    assert.strictEqual(cellStyle.color, 'rgb(255, 0, 0)');
  });

  it('resorts when a node is updated', async () => {
    const element = await renderDataGrid(html`
        <devtools-data-grid striped name=${'Display Name'}>
          <table>
            <tr>
              <th id="column-1" sortable sort="ascending">Column 1</th>
            </tr>
            <tr><td data-value="1">Value 1</td></tr>
            <tr><td data-value="3">Value 3</td></tr>
          </table>
        </devtools-data-grid>`);

    sendKeydown(element, 'ArrowDown');
    assert.strictEqual(getAlertAnnouncement(element), 'Display Name Row  Column 1: Value 1');
    sendKeydown(element, 'ArrowDown');
    assert.strictEqual(getAlertAnnouncement(element), 'Display Name Row  Column 1: Value 3');

    // Update the first row's value to something that should make it go last.
    const rowToUpdate = element.querySelector('tr:nth-child(2)');  // this is the first data row
    assert.instanceOf(rowToUpdate, HTMLTableRowElement);
    const cellToUpdate = rowToUpdate.querySelector('td');
    assert.instanceOf(cellToUpdate, HTMLTableCellElement);
    cellToUpdate.setAttribute('data-value', '5');
    cellToUpdate.textContent = 'Value 5';

    // wait for mutation observer to pick it up and re-render
    await RenderCoordinator.done({waitForWork: true});

    // After re-sort, order is Value 3, Value 5. Selection was on "Value 3".
    // It remains on it, which is now the first row.
    assert.strictEqual(getAlertAnnouncement(element), 'Display Name Row  Column 1: Value 3');
    sendKeydown(element, 'ArrowDown');
    assert.strictEqual(getAlertAnnouncement(element), 'Display Name Row  Column 1: Value 5');
  });
});
