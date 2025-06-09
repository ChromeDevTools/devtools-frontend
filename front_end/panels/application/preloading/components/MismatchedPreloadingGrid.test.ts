// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Protocol from '../../../../generated/protocol.js';
import {
  assertGridContents,
  getCellByIndexes,
} from '../../../../testing/DataGridHelpers.js';
import {
  renderElementIntoDOM,
} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';

import * as PreloadingComponents from './components.js';

const {urlString} = Platform.DevToolsPath;
const zip2 = <T, S>(xs: T[], ys: S[]): Array<[T, S]> => {
  assert.strictEqual(xs.length, ys.length);

  return Array.from(xs.map((_, i) => [xs[i], ys[i]]));
};

async function renderMismatchedPreloadingGrid(
    data: PreloadingComponents.MismatchedPreloadingGrid.MismatchedPreloadingGridData): Promise<HTMLElement> {
  const component = new PreloadingComponents.MismatchedPreloadingGrid.MismatchedPreloadingGrid();
  component.data = data;
  renderElementIntoDOM(component);
  assert.isNotNull(component.shadowRoot);
  await RenderCoordinator.done();

  return component;
}

function assertDiff(
    gridComponent: HTMLElement, cellIndex: {row: number, column: number},
    spansExpected: Array<{textContent: string, partOfStyle: string}>) {
  const grid = gridComponent.shadowRoot!.querySelector('devtools-data-grid')!;
  assert.isNotNull(grid.shadowRoot);
  const cell = getCellByIndexes(grid.shadowRoot, cellIndex);
  const spans = cell.querySelectorAll('div span');

  for (const [got, expected] of zip2(Array.from(spans), spansExpected)) {
    assert.strictEqual(got.textContent, expected.textContent);
    assert.include(got.getAttribute('style') || '', expected.partOfStyle);
  }
}

const FG_GREEN = 'color:var(--sys-color-green);text-decoration:line-through';
const FG_RED = 'color:var(--sys-color-error);';

describeWithEnvironment('MismatchedPreloadingGrid', () => {
  it('renderes no diff in URL', async function() {
    const data: PreloadingComponents.MismatchedPreloadingGrid.MismatchedPreloadingGridData = {
      pageURL: urlString`https://example.com/prefetched.html`,
      rows: [{
        url: 'https://example.com/prefetched.html',
        action: Protocol.Preload.SpeculationAction.Prefetch,
        status: SDK.PreloadingModel.PreloadingStatus.FAILURE,
      }],
    };

    const component = await renderMismatchedPreloadingGrid(data);
    assert.isNotNull(component.shadowRoot);

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
      pageURL: urlString`https://example.com/prefetched.html?q=1`,
      rows: [{
        url: 'https://example.com/prefetched.html?q=2',
        action: Protocol.Preload.SpeculationAction.Prefetch,
        status: SDK.PreloadingModel.PreloadingStatus.READY,
      }],
    };

    const component = await renderMismatchedPreloadingGrid(data);
    assert.isNotNull(component.shadowRoot);

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
      pageURL: urlString`https://example.com/prefetched.html?q=1`,
      rows: [{
        url: 'https://example.com/prefetched.html',
        action: Protocol.Preload.SpeculationAction.Prefetch,
        status: SDK.PreloadingModel.PreloadingStatus.READY,
      }],
    };

    const component = await renderMismatchedPreloadingGrid(data);
    assert.isNotNull(component.shadowRoot);

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
      pageURL: urlString`https://example.com/prefetched.html`,
      rows: [{
        url: 'https://example.com/prefetched.html?q=1',
        action: Protocol.Preload.SpeculationAction.Prefetch,
        status: SDK.PreloadingModel.PreloadingStatus.READY,
      }],
    };

    const component = await renderMismatchedPreloadingGrid(data);
    assert.isNotNull(component.shadowRoot);

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
      pageURL: urlString`https://example.com/prefetched.html?q=1`,
      rows: [{
        url: 'https://example.com/prerendered.html?x=1',
        action: Protocol.Preload.SpeculationAction.Prerender,
        status: SDK.PreloadingModel.PreloadingStatus.READY,
      }],
    };

    const component = await renderMismatchedPreloadingGrid(data);
    assert.isNotNull(component.shadowRoot);

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
