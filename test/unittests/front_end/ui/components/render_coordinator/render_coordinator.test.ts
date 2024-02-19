// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as RenderCoordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';

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

    void coordinator.write('Write 1', () => {});
    void coordinator.read('Read 1', () => {});
    void coordinator.read('Read 2', () => {});
    void coordinator.write('Write 2', () => {});
    void coordinator.read('Read 3', () => {});

    await validateRecords(expected);
  });

  it('deduplicates named tasks', async () => {
    const expected = [
      '[New frame]',
      '[Read]: Named Read',
      '[Write]: Unnamed write',
      '[Write]: Named Write',
      '[Write]: Unnamed write',
      '[Queue empty]',
    ];

    coordinator.observeOnlyNamed = false;
    void coordinator.read('Named Read', () => {});
    void coordinator.write(() => {});
    void coordinator.write('Named Write', () => {});
    void coordinator.write(() => {});
    void coordinator.write('Named Write', () => {});

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

    void coordinator.read('Read 1', () => {
      void coordinator.write('Write 1', () => {});
    });

    void coordinator.read('Read 2', () => {
      void coordinator.write('Write 2', () => {
        void coordinator.write('Write 3', () => {});
      });
      void coordinator.read('Read 3', () => {});
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
    void coordinator.read('Read', () => {
      // This write is added when we are evaluating the last item in the queue,
      // and it should be enqueued correctly for the test to pass.
      void coordinator.write('Write at end', () => {});
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

  it('awaits async callbacks', async () => {
    const expected = 100;
    let targetValue = 0;
    const delayedSet = (value: number, timeout: number): Promise<void> => {
      return new Promise(resolve => setTimeout(() => {
                           targetValue = value;
                           resolve();
                         }, timeout));
    };

    void coordinator.write(async () => delayedSet(expected, 100));
    await coordinator.done();

    assert.strictEqual(targetValue, expected);
  });

  it('throws if there is a read-write deadlock (blocked on read)', async () => {
    const read = () => {};
    try {
      await coordinator.write(async () => {
        // Awaiting a read block within a write should block because
        // this write can't proceed until the read has completed, but
        // the read won't start until this write has completed.
        await coordinator.read(read);
      });
    } catch (err) {
      assert.strictEqual(err.toString(), new Error('Writers took over 1500ms. Possible deadlock?').toString());
    }
    coordinator.cancelPending();
  });

  it('throws if there is a write deadlock (blocked on write)', async () => {
    const write = () => {};
    try {
      await coordinator.read(async () => {
        // Awaiting a write block within a read should block because
        // this read can't proceed until the write has completed, but
        // the write won't start until this read has completed.
        await coordinator.write(write);
      });
    } catch (err) {
      assert.strictEqual(err.toString(), new Error('Readers took over 1500ms. Possible deadlock?').toString());
    }
    coordinator.cancelPending();
  });

  it('exposes the presence of pending work', async () => {
    const readDonePromise = coordinator.read('Named Read', () => {});
    assert.isTrue(coordinator.hasPendingWork());
    await readDonePromise;
    assert.isFalse(coordinator.hasPendingWork());
  });

  it('exposes the pending work count globally for interaction/e2e tests', async () => {
    const readDonePromise = coordinator.read('Named Read', () => {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assert.strictEqual((globalThis as any).__getRenderCoordinatorPendingFrames(), 1);
    await readDonePromise;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assert.strictEqual((globalThis as any).__getRenderCoordinatorPendingFrames(), 0);
  });

  describe('Logger', () => {
    it('only logs by default when provided with names', async () => {
      const expected = [
        '[New frame]',
        '[Read]: Named Read',
        '[Queue empty]',
      ];

      void coordinator.read('Named Read', () => {});
      void coordinator.write(() => {});

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
      void coordinator.read('Named Read', () => {});
      void coordinator.write(() => {});

      await validateRecords(expected);
    });

    it('tracks only the last 100 items', async () => {
      const expected = [];
      for (let i = 51; i < 150; i++) {
        expected.push(`[Read]: Named read ${i}`);
      }
      expected.push('[Queue empty]');

      for (let i = 0; i < 150; i++) {
        void coordinator.read(`Named read ${i}`, () => {});
      }

      await validateRecords(expected);
    });

    it('supports different log sizes', async () => {
      coordinator.recordStorageLimit = 10;
      const expected = [];
      for (let i = 41; i < 50; i++) {
        expected.push(`[Write]: Named write ${i}`);
      }
      expected.push('[Queue empty]');

      for (let i = 0; i < 50; i++) {
        void coordinator.write(`Named write ${i}`, () => {});
      }

      await validateRecords(expected);
    });
  });
});
