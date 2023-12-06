// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../../../../front_end/core/root/root.js';
import * as Explain from '../../../../../front_end/panels/explain/explain.js';

const {assert} = chai;

describe('InsightProvider', () => {
  it('adds no model temperature if there is no aidaTemperature query param', () => {
    const stub = sinon.stub(Root.Runtime.Runtime, 'queryParam');
    stub.withArgs('aidaTemperature').returns(null);
    const request = Explain.InsightProvider.buildApiRequest('foo');
    assert.deepStrictEqual(request, {
      input: 'foo',
      client: 'CHROME_DEVTOOLS',
    });
    stub.restore();
  });

  it('adds a model temperature', () => {
    const stub = sinon.stub(Root.Runtime.Runtime, 'queryParam');
    stub.withArgs('aidaTemperature').returns('0.5');
    const request = Explain.InsightProvider.buildApiRequest('foo');
    assert.deepStrictEqual(request, {
      input: 'foo',
      client: 'CHROME_DEVTOOLS',
      options: {
        temperature: 0.5,
      },
    });
    stub.restore();
  });

  it('adds a model temperature of 0', () => {
    const stub = sinon.stub(Root.Runtime.Runtime, 'queryParam');
    stub.withArgs('aidaTemperature').returns('0');
    const request = Explain.InsightProvider.buildApiRequest('foo');
    assert.deepStrictEqual(request, {
      input: 'foo',
      client: 'CHROME_DEVTOOLS',
      options: {
        temperature: 0,
      },
    });
    stub.restore();
  });

  it('adds no model temperature if the aidaTemperature query param cannot be parsed into a float', () => {
    const stub = sinon.stub(Root.Runtime.Runtime, 'queryParam');
    stub.withArgs('aidaTemperature').returns('not a number');
    const request = Explain.InsightProvider.buildApiRequest('foo');
    assert.deepStrictEqual(request, {
      input: 'foo',
      client: 'CHROME_DEVTOOLS',
    });
    stub.restore();
  });
});
