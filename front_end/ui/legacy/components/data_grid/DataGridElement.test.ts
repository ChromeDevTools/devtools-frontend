// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './data_grid.js';

import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as UI from '../../legacy.js';

const {render, html} = Lit;

function getAccessibleText(element: HTMLElement): string {
  element.blur();
  element.focus();
  const alertElements = UI.ARIAUtils.getOrCreateAlertElements();
  const alertElement = alertElements.alertToggle ? alertElements.one : alertElements.two;
  return alertElement.textContent || '';
}

function getFocusedElement(): HTMLElement {
  let root: Document|ShadowRoot = document;
  while (root.activeElement?.shadowRoot?.activeElement) {
    root = root.activeElement.shadowRoot;
  }
  return root.activeElement as HTMLElement;
}

function sendKeydown(element: HTMLElement, key: string): void {
  element.focus();
  getFocusedElement()!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        composed: true,
      }),
  );
}

describeWithEnvironment('DataGrid', () => {
  let container!: HTMLElement;
  beforeEach(() => {
    container = document.createElement('div');
    container.style.display = 'flex';
    container.style.width = '640px';
    container.style.height = '480px';
    renderElementIntoDOM(container);
  });

  async function renderDataGrid(template: Lit.TemplateResult): Promise<HTMLElement> {
    container.style.display = 'flex';
    container.style.width = '640px';
    container.style.height = '480px';
    render(template, container, {host: {}});  // eslint-disable-line rulesdir/lit-host-this
    await RenderCoordinator.done({waitForWork: true});
    return container.querySelector('devtools-data-grid') as HTMLElement;
  }

  it('can be configured from template', async () => {
    const element = await renderDataGrid(html`
        <devtools-data-grid .striped=${true} .displayName=${'Display Name'}>
        </devtools-data-grid>`);
    assert.isTrue(getAccessibleText(element).startsWith('Display Name Rows: 0'));
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
    assert.strictEqual(getAccessibleText(element), 'Display Name Row  Column 1: Value 1, Column 2: Value 2');
  });

  it('can update data from template', async () => {
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
          </table>
        </devtools-data-grid>`);
    const element = await renderDataGrid(html`
        <devtools-data-grid striped name=${'Display Name'}>
          <table>
            <tr>
              <th id="column-3">Column 3</th>
              <th id="column-4">Column 4</th>
            </tr>
            <tr>
              <td>Value 3</td>
              <td>Value 4</td>
            </tr>
          </table>
        </devtools-data-grid>`);
    sendKeydown(element, 'ArrowDown');
    assert.strictEqual(getAccessibleText(element), 'Display Name Row  Column 3: Value 3, Column 4: Value 4');
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
    assert.isTrue(getAccessibleText(element).startsWith('Display Name Rows: 1'));
    sendKeydown(element, 'ArrowDown');
    assert.strictEqual(getAccessibleText(element), 'Display Name Row  Column 1: Value 3, Column 2: Value 4');
  });
});
