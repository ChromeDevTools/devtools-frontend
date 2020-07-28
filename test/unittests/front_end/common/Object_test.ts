// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../front_end/common/common.js';

const ObjectWrapper = Common.ObjectWrapper.ObjectWrapper;

describe('ObjectWrapper', () => {
  let obj: Common.ObjectWrapper.ObjectWrapper;
  beforeEach(() => {
    obj = new ObjectWrapper();
  });

  describe('event listeners', () => {
    it('adds event listeners', done => {
      obj.addEventListener('foo', () => {
        done();
      });

      obj.dispatchEventToListeners('foo');
    });

    it('reports event listeners correctly', () => {
      const callback = () => {};

      obj.addEventListener('foo', callback);
      assert.isTrue(obj.hasEventListeners('foo'));

      obj.removeEventListener('foo', callback);
      assert.isFalse(obj.hasEventListeners('foo'));
    });

    it('fires event listeners once', async () => {
      const fireOnce = obj.once('foo');
      obj.dispatchEventToListeners('foo');
      await fireOnce;

      assert.isFalse(obj.hasEventListeners('foo'));
    });

    it('fires event listeners multiple times', () => {
      let count = 0;
      const callback = () => {
        count++;
      };

      obj.addEventListener('foo', callback);
      obj.dispatchEventToListeners('foo');
      obj.dispatchEventToListeners('foo');
      assert.strictEqual(count, 2);
    });

    it('fires event listeners with data', done => {
      const count = 0;
      const callback = (evt: {data: {bar: string}}) => {
        assert.strictEqual(evt.data.bar, 'baz');
        done();
      };

      obj.addEventListener('foo', callback);
      obj.dispatchEventToListeners('foo', {bar: 'baz'});
      assert.strictEqual(count, 2);
    });

    it('handles removal of non-existent listener', () => {
      assert.doesNotThrow(() => {
        obj.removeEventListener('foo', () => {});
      });
    });

    it('handles dispatch of events with zero listeners', () => {
      assert.doesNotThrow(() => {
        obj.dispatchEventToListeners('foo');
      });
    });
  });
});
