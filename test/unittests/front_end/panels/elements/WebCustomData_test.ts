// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as Elements from '../../../../../front_end/panels/elements/elements.js';

describe('WebCustomData', () => {
  let fetchStub: sinon.SinonStub;
  let fetchResolve: (value: object) => void;
  let fetchReject: (error: unknown) => void;

  beforeEach(() => {
    fetchStub = sinon.stub(window, 'fetch');
    fetchStub.returns(new Promise((res, rej) => {
      fetchReject = rej;
      // Allow users to provide the plain JSON. We turn it into a response.
      fetchResolve = (value: object) => res(new Response(JSON.stringify(value), {
        status: 200,
        headers: {'Content-type': 'application/json'},
      }));
    }));
  });

  afterEach(() => {
    fetchResolve({});  // Resolve for our pending promise detection.
    fetchStub.restore();
  });

  describe('findCssProperty', () => {
    it('returns the correct info', async () => {
      const webCustomData = new Elements.WebCustomData.WebCustomData('http://does-not-matter.com/');
      fetchResolve({
        properties: [
          {name: 'display', description: 'In combiniation with \'float\' ...'},
        ],
      });
      await webCustomData.fetchPromiseForTest;

      const property = webCustomData.findCssProperty('display');

      assertNotNullOrUndefined(property);
      assert.strictEqual(property.name, 'display');
      assert.strictEqual(property.description, 'In combiniation with \'float\' ...');
    });

    it('returns undefined while the .json is loading', async () => {
      const webCustomData = new Elements.WebCustomData.WebCustomData('http://does-not-matter.com/');

      assert.isUndefined(webCustomData.findCssProperty('display'));
    });

    it('returns undefined if the .json loading failed', async () => {
      const webCustomData = new Elements.WebCustomData.WebCustomData('http://does-not-matter.com/');
      fetchReject(new Error('failed to load'));
      try {
        await webCustomData.fetchPromiseForTest;
        assert.isTrue(false, 'Expected await to throw');
      } catch (e) {
      }

      assert.isUndefined(webCustomData.findCssProperty('display'));
    });

    it('returns undefind if the CSS property was not found', async () => {
      const webCustomData = new Elements.WebCustomData.WebCustomData('http://does-not-matter.com/');
      fetchResolve({
        properties: [
          {name: 'display'},
          {name: 'flex'},
        ],
      });
      await webCustomData.fetchPromiseForTest;

      assert.isUndefined(webCustomData.findCssProperty('funky-prop'));
    });
  });
});
