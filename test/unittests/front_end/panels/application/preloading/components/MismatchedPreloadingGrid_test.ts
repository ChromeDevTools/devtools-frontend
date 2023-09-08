// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../../../../front_end/core/platform/platform.js';

import * as Protocol from '../../../../../../../front_end/generated/protocol.js';
import {assertNotNullOrUndefined} from '../../../../../../../front_end/core/platform/platform.js';
import * as PreloadingComponents from '../../../../../../../front_end/panels/application/preloading/components/components.js';
import * as SDK from '../../../../../../../front_end/core/sdk/sdk.js';
import * as Coordinator from '../../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import * as DataGrid from '../../../../../../../front_end/ui/components/data_grid/data_grid.js';
import {
  assertShadowRoot,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../helpers/EnvironmentHelpers.js';
import {
  getHeaderCells,
  getValuesOfAllBodyRows,
  getCellByIndexes,
} from '../../../../ui/components/DataGridHelpers.js';

const {assert} = chai;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const zip2 = <T, S>(xs: T[], ys: S[]): [T, S][] => {
  assert.strictEqual(xs.length, ys.length);

  return Array.from(xs.map((_, i) => [xs[i], ys[i]]));
};

async function renderMismatchedPreloadingGrid(
    data: PreloadingComponents.MismatchedPreloadingGrid.MismatchedPreloadingGridData): Promise<HTMLElement> {
  const component = new PreloadingComponents.MismatchedPreloadingGrid.MismatchedPreloadingGrid();
  component.data = data;
  renderElementIntoDOM(component);
  assertShadowRoot(component.shadowRoot);
  await coordinator.done();

  return component;
}

function assertGridContents(gridComponent: HTMLElement, headerExpected: string[], rowsExpected: string[][]) {
  const controller = getElementWithinComponent(
      gridComponent, 'devtools-data-grid-controller', DataGrid.DataGridController.DataGridController);
  const grid = getElementWithinComponent(controller, 'devtools-data-grid', DataGrid.DataGrid.DataGrid);
  assertShadowRoot(grid.shadowRoot);

  const headerGot = Array.from(getHeaderCells(grid.shadowRoot), cell => {
    assertNotNullOrUndefined(cell.textContent);
    return cell.textContent.trim();
  });
  const rowsGot = getValuesOfAllBodyRows(grid.shadowRoot);

  assert.deepEqual([headerGot, rowsGot], [headerExpected, rowsExpected]);
}

function assertDiff(
    gridComponent: HTMLElement, cellIndex: {row: number, column: number},
    spansExpected: {textContent: string, partOfStyle: string}[]) {
  const controller = getElementWithinComponent(
      gridComponent, 'devtools-data-grid-controller', DataGrid.DataGridController.DataGridController);
  const grid = getElementWithinComponent(controller, 'devtools-data-grid', DataGrid.DataGrid.DataGrid);
  assertShadowRoot(grid.shadowRoot);
  const cell = getCellByIndexes(grid.shadowRoot, cellIndex);
  const spans = cell.querySelectorAll('div span');

  for (const [got, expected] of zip2(Array.from(spans), spansExpected)) {
    assert.strictEqual(got.textContent, expected.textContent);
    assert.include(got.getAttribute('style'), expected.partOfStyle);
  }
}

const FG_GREEN = 'color: var(--sys-color-green); text-decoration: line-through';
const FG_RED = 'color: var(--sys-color-error);';

describeWithEnvironment('MismatchedPreloadingGrid', async () => {
  // Disabled due to flakiness
  it.skip('[crbug.com/1473557]: renderes no diff in URL', async function() {
    if (this.timeout() > 0) {
      this.timeout(10000);
    }

    const data: PreloadingComponents.MismatchedPreloadingGrid.MismatchedPreloadingGridData = {
      pageURL: 'https://example.com/prefetched.html' as Platform.DevToolsPath.UrlString,
      rows: [{
        url: 'https://example.com/prefetched.html',
        action: Protocol.Preload.SpeculationAction.Prefetch,
        status: SDK.PreloadingModel.PreloadingStatus.Failure,
      }],
    };

    const component = await renderMismatchedPreloadingGrid(data);
    assertShadowRoot(component.shadowRoot);

    assertGridContents(
        component,
        ['URL', 'Action', 'Status'],
        [
          ['https://example.com/prefetched.html', 'Prefetch', 'Failure'],
        ],
    );
  });

  it('renderes edit diff', async () => {
    const data: PreloadingComponents.MismatchedPreloadingGrid.MismatchedPreloadingGridData = {
      pageURL: 'https://example.com/prefetched.html?q=1' as Platform.DevToolsPath.UrlString,
      rows: [{
        url: 'https://example.com/prefetched.html?q=2',
        action: Protocol.Preload.SpeculationAction.Prefetch,
        status: SDK.PreloadingModel.PreloadingStatus.Ready,
      }],
    };

    const component = await renderMismatchedPreloadingGrid(data);
    assertShadowRoot(component.shadowRoot);

    assertGridContents(
        component,
        ['URL', 'Action', 'Status'],
        [
          ['https://example.com/prefetched.html?q=21', 'Prefetch', 'Ready'],
        ],
    );

    assertDiff(component, {row: 1, column: 0}, [
      {textContent: 'https://example.com/prefetched.html?q=', partOfStyle: ''},
      {textContent: '2', partOfStyle: FG_RED},
      {textContent: '1', partOfStyle: FG_GREEN},
    ]);
  });

  it('renderes add diff', async () => {
    const data: PreloadingComponents.MismatchedPreloadingGrid.MismatchedPreloadingGridData = {
      pageURL: 'https://example.com/prefetched.html?q=1' as Platform.DevToolsPath.UrlString,
      rows: [{
        url: 'https://example.com/prefetched.html',
        action: Protocol.Preload.SpeculationAction.Prefetch,
        status: SDK.PreloadingModel.PreloadingStatus.Ready,
      }],
    };

    const component = await renderMismatchedPreloadingGrid(data);
    assertShadowRoot(component.shadowRoot);

    assertGridContents(
        component,
        ['URL', 'Action', 'Status'],
        [
          ['https://example.com/prefetched.html?q=1', 'Prefetch', 'Ready'],
        ],
    );

    assertDiff(component, {row: 1, column: 0}, [
      {textContent: 'https://example.com/prefetched.html', partOfStyle: ''},
      {textContent: '?q=1', partOfStyle: FG_GREEN},
    ]);
  });

  it('renderes delete diff', async () => {
    const data: PreloadingComponents.MismatchedPreloadingGrid.MismatchedPreloadingGridData = {
      pageURL: 'https://example.com/prefetched.html' as Platform.DevToolsPath.UrlString,
      rows: [{
        url: 'https://example.com/prefetched.html?q=1',
        action: Protocol.Preload.SpeculationAction.Prefetch,
        status: SDK.PreloadingModel.PreloadingStatus.Ready,
      }],
    };

    const component = await renderMismatchedPreloadingGrid(data);
    assertShadowRoot(component.shadowRoot);

    assertGridContents(
        component,
        ['URL', 'Action', 'Status'],
        [
          ['https://example.com/prefetched.html?q=1', 'Prefetch', 'Ready'],
        ],
    );

    assertDiff(component, {row: 1, column: 0}, [
      {textContent: 'https://example.com/prefetched.html', partOfStyle: ''},
      {textContent: '?q=1', partOfStyle: FG_RED},
    ]);
  });

  it('renderes complex diff', async () => {
    const data: PreloadingComponents.MismatchedPreloadingGrid.MismatchedPreloadingGridData = {
      pageURL: 'https://example.com/prefetched.html?q=1' as Platform.DevToolsPath.UrlString,
      rows: [{
        url: 'https://example.com/prerendered.html?x=1',
        action: Protocol.Preload.SpeculationAction.Prerender,
        status: SDK.PreloadingModel.PreloadingStatus.Ready,
      }],
    };

    const component = await renderMismatchedPreloadingGrid(data);
    assertShadowRoot(component.shadowRoot);

    assertGridContents(
        component,
        ['URL', 'Action', 'Status'],
        [
          ['https://example.com/prerfendertched.html?xq=1', 'Prerender', 'Ready'],
        ],
    );

    assertDiff(component, {row: 1, column: 0}, [
      {textContent: 'https://example.com/pre', partOfStyle: ''},
      {textContent: 'r', partOfStyle: FG_RED},
      {textContent: 'f', partOfStyle: FG_GREEN},
      {textContent: 'e', partOfStyle: ''},
      {textContent: 'nder', partOfStyle: FG_RED},
      {textContent: 'tch', partOfStyle: FG_GREEN},
      {textContent: 'ed.html?', partOfStyle: ''},
      {textContent: 'x', partOfStyle: FG_RED},
      {textContent: 'q', partOfStyle: FG_GREEN},
      {textContent: '=1', partOfStyle: ''},
    ]);
  });
});
