// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as RenderCoordinator from '../../../../front_end/render_coordinator/render_coordinator.js';

describe('Render Coordinator', () => {
  let coordinator: RenderCoordinator.RenderCoordinator.RenderCoordinator;
  beforeEach(() => {
    coordinator = RenderCoordinator.RenderCoordinator.RenderCoordinator.instance({forceNew: true});
    coordinator.observe = true;
  });

  async function validateRecords(expected: string[]) {
    await coordinator.done();
    const records = coordinator.takeRecords();
    assert.deepEqual(records.map(r => r.value), expected, 'render coordinator messages are out of order');
  }

  it('groups interleaved reads and writes', async () => {
    const expected = [
      '[New frame]',
      '[Read]: Read 1',
      '[Read]: Read 2',
      '[Read]: Read 3',
      '[Write]: Write 1',
      '[Write]: Write 2',
      '[Queue empty]',
    ];

    coordinator.write('Write 1', () => {});
    coordinator.read('Read 1', () => {});
    coordinator.read('Read 2', () => {});
    coordinator.write('Write 2', () => {});
    coordinator.read('Read 3', () => {});

    await validateRecords(expected);
  });

  it('handles nested reads and writes', async () => {
    const expected = [
      '[New frame]',
      '[Read]: Read 1',
      '[Read]: Read 2',
      '[New frame]',
      '[Read]: Read 3',
      '[Write]: Write 1',
      '[Write]: Write 2',
      '[New frame]',
      '[Write]: Write 3',
      '[Queue empty]',
    ];

    coordinator.read('Read 1', () => {
      coordinator.write('Write 1', () => {});
    });

    coordinator.read('Read 2', () => {
      coordinator.write('Write 2', () => {
        coordinator.write('Write 3', () => {});
      });
      coordinator.read('Read 3', () => {});
    });

    await validateRecords(expected);
  });

  it('completes work added while evaluating the last item in the queue', async () => {
    const expected = [
      '[New frame]',
      '[Read]: Read',
      '[New frame]',
      '[Write]: Write at end',
      '[Queue empty]',
    ];
    coordinator.read('Read', () => {
      // This write is added when we are evaluating the last item in the queue,
      // and it should be enqueued correctly for the test to pass.
      coordinator.write('Write at end', () => {});
    });

    await coordinator.done();

    const records = coordinator.takeRecords();
    assert.deepEqual(records.map(r => r.value), expected);
  });

  it('returns values', async () => {
    const element = document.createElement('div');
    element.style.height = '800px';
    document.body.appendChild(element);

    const height = await coordinator.read(() => element.clientHeight);
    await coordinator.done();

    element.remove();
    assert.strictEqual(height, 800);
  });

  describe('Logger', () => {
    it('only logs by default when provided with names', async () => {
      const expected = [
        '[New frame]',
        '[Read]: Named Read',
        '[Queue empty]',
      ];

      coordinator.read('Named Read', () => {});
      coordinator.write(() => {});

      await validateRecords(expected);
    });

    it('allow logging of unnamed tasks', async () => {
      const expected = [
        '[New frame]',
        '[Read]: Named Read',
        '[Write]: Unnamed write',
        '[Queue empty]',
      ];

      coordinator.observeOnlyNamed = false;
      coordinator.read('Named Read', () => {});
      coordinator.write(() => {});

      await validateRecords(expected);
    });

    it('tracks only the last 100 items', async () => {
      const expected = new Array(99).fill('[Read]: Named read');
      expected.push('[Queue empty]');

      for (let i = 0; i < 150; i++) {
        coordinator.read('Named read', () => {});
      }

      await validateRecords(expected);
    });

    it('supports different log sizes', async () => {
      coordinator.recordStorageLimit = 10;
      const expected = new Array(9).fill('[Write]: Named write');
      expected.push('[Queue empty]');

      for (let i = 0; i < 50; i++) {
        coordinator.write('Named write', () => {});
      }

      await validateRecords(expected);
    });
  });
});
