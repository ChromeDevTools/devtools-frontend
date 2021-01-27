// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import * as RenderCoordinator from '../../../../front_end/render_coordinator/render_coordinator.js';

describe('Render Coordinator', () => {
  let coordinator: RenderCoordinator.RenderCoordinator.RenderCoordinator;
  before(() => {
    coordinator = RenderCoordinator.RenderCoordinator.RenderCoordinator.instance({forceNew: true});
  });

  it('groups interleaved reads and writes', done => {
    const expected = [
      'Read 1',
      'Read 2',
      'Read 3',
      'Write 1',
      'Write 2',
    ];
    const actual: string[] = [];

    coordinator.write(() => actual.push('Write 1'));
    coordinator.read(() => actual.push('Read 1'));
    coordinator.read(() => actual.push('Read 2'));
    coordinator.write(() => actual.push('Write 2'));
    coordinator.read(() => actual.push('Read 3'));

    coordinator.addEventListener('queueempty', () => {
      assert.deepEqual(actual, expected, 'render coordinator messages are out of order');
      done();
    }, {once: true});
  });

  it('handles nested reads and writes', done => {
    const expected = [
      '[New frame]',  // Frame boundary.
      'Read 1',
      'Read 2',
      '[New frame]',  // Frame boundary.
      'Read 3',
      'Write 1',
      'Write 2',
      '[New frame]',  // Frame boundary.
      'Write 3',
    ];
    const actual: string[] = [];

    // Ensure frame boundaries are observed so we can log them.
    coordinator.addEventListener('newframe', () => actual.push('[New frame]'));

    coordinator.read(() => {
      actual.push('Read 1');
      coordinator.write(() => actual.push('Write 1'));
    });

    coordinator.read(() => {
      actual.push('Read 2');
      coordinator.write(() => {
        actual.push('Write 2');
        coordinator.write(() => {
          actual.push('Write 3');
        });
      });
      coordinator.read(() => actual.push('Read 3'));
    });

    coordinator.addEventListener('queueempty', () => {
      assert.deepEqual(actual, expected, 'render coordinator messages are out of order');
      done();
    }, {once: true});
  });

  it('returns values', async () => {
    const element = document.createElement('div');
    element.style.height = '800px';
    document.body.appendChild(element);

    const height = await coordinator.read(() => element.clientHeight);

    element.remove();
    assert.strictEqual(height, 800);
  });
});
