// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';
import * as Platform from '../platform/platform.js';

import * as SDK from './sdk.js';

describeWithLocale('SDK.ServerTiming.ServerTiming.createFromHeaderValue', () => {
  it('parses headers correctly', () => {
    // A real-world-like example with some edge cases.
    const actual = SDK.ServerTiming.ServerTiming.createFromHeaderValue(
        'lb; desc = "Load bala\\ncer" ; dur= 42,sql-1 ;desc="MySQL lookup server";dur=100,sql-2;dur ="900.1";desc="MySQL shard server #1",fs;\tdur=600;desc="FileSystem",\tcache;dur=300;desc="",other;dur=200;desc="Database write",other;dur=110;desc="Database read",cpu;dur=1230;desc="Total CPU"');
    const expected = [
      {
        name: 'lb',
        desc: 'Load balancer',
        dur: 42,
      },
      {
        name: 'sql-1',
        desc: 'MySQL lookup server',
        dur: 100,
      },
      {
        name: 'sql-2',
        dur: 900.1,
        desc: 'MySQL shard server #1',
      },
      {
        name: 'fs',
        dur: 600,
        desc: 'FileSystem',
      },
      {
        name: 'cache',
        dur: 300,
        desc: '',
      },
      {
        name: 'other',
        dur: 200,
        desc: 'Database write',
      },
      {
        name: 'other',
        dur: 110,
        desc: 'Database read',
      },
      {
        name: 'cpu',
        dur: 1230,
        desc: 'Total CPU',
      },
    ];
    assert.deepEqual(actual, expected);
  });

  it('handles duplicate entry names correctly', () => {
    // Note: also see the tests below that checks for warnings.
    assert.deepEqual(
        SDK.ServerTiming.ServerTiming.createFromHeaderValue(
            'metric;dur=12.3;desc=description1,metric;dur=45.6;desc=description2'),
        [
          {name: 'metric', dur: 12.3, desc: 'description1'},
          {name: 'metric', dur: 45.6, desc: 'description2'},
        ]);
  });

  it('handles non-numeric durations correctly', () => {
    // Non-numeric durations.
    // Note: also see the tests below that checks for warnings.
    assert.deepEqual(SDK.ServerTiming.ServerTiming.createFromHeaderValue('metric;dur=foo'), [{name: 'metric', dur: 0}]);
    assert.deepEqual(
        SDK.ServerTiming.ServerTiming.createFromHeaderValue('metric;dur="foo"'), [{name: 'metric', dur: 0}]);
  });

  it('handles incomplete parameters correctly', () => {
    // Note: also see the tests below that checks for warnings.
    assert.deepEqual(SDK.ServerTiming.ServerTiming.createFromHeaderValue('metric;dur;dur=123.4;desc=description'), [
      {name: 'metric', dur: 0, desc: 'description'},
    ]);
    assert.deepEqual(SDK.ServerTiming.ServerTiming.createFromHeaderValue('metric;dur=;dur=123.4;desc=description'), [
      {name: 'metric', dur: 0, desc: 'description'},
    ]);
    assert.deepEqual(SDK.ServerTiming.ServerTiming.createFromHeaderValue('metric;desc;desc=description;dur=123.4'), [
      {name: 'metric', desc: '', dur: 123.4},
    ]);
    assert.deepEqual(SDK.ServerTiming.ServerTiming.createFromHeaderValue('metric;desc=;desc=description;dur=123.4'), [
      {name: 'metric', desc: '', dur: 123.4},
    ]);
  });

  it('handles extraneous characters after parameter values correctly', () => {
    // Note: also see the tests below that checks for warnings.
    assert.deepEqual(SDK.ServerTiming.ServerTiming.createFromHeaderValue('metric;desc=d1 d2;dur=123.4'), [
      {name: 'metric', desc: 'd1', dur: 123.4},
    ]);
    assert.deepEqual(SDK.ServerTiming.ServerTiming.createFromHeaderValue('metric1;desc=d1 d2,metric2'), [
      {name: 'metric1', desc: 'd1'},
      {name: 'metric2'},
    ]);
  });

  it('handles extraneous characters after RFC7230 quoted-string parameter values correctly', () => {
    // Note: also see the tests below that checks for warnings.
    assert.deepEqual(SDK.ServerTiming.ServerTiming.createFromHeaderValue('metric;desc="d1" d2;dur=123.4'), [
      {name: 'metric', desc: 'd1', dur: 123.4},
    ]);
    assert.deepEqual(SDK.ServerTiming.ServerTiming.createFromHeaderValue('metric1;desc="d1" d2,metric2'), [
      {name: 'metric1', desc: 'd1'},
      {name: 'metric2'},
    ]);
  });

  it('handles extraneous characters after entry name token correctly', () => {
    // Note: also see the tests below that checks for warnings.
    assert.deepEqual(
        SDK.ServerTiming.ServerTiming.createFromHeaderValue('metric==   ""foo;dur=123.4'), [{name: 'metric'}]);
    assert.deepEqual(
        SDK.ServerTiming.ServerTiming.createFromHeaderValue('metric1==   ""foo,metric2'), [{name: 'metric1'}]);
  });

  it('handles extraneous characters after parameter name token correctly', () => {
    // Note: also see the tests below that checks for warnings.
    assert.deepEqual(
        SDK.ServerTiming.ServerTiming.createFromHeaderValue('metric;dur foo=12'), [{name: 'metric', dur: 0}]);
    assert.deepEqual(SDK.ServerTiming.ServerTiming.createFromHeaderValue('metric;foo dur=12'), [{name: 'metric'}]);
  });

  it('handles bad input resulting in zero entries correctly', () => {
    assert.deepEqual(SDK.ServerTiming.ServerTiming.createFromHeaderValue(' '), []);
    assert.deepEqual(SDK.ServerTiming.ServerTiming.createFromHeaderValue('='), []);
    assert.deepEqual(SDK.ServerTiming.ServerTiming.createFromHeaderValue(';'), []);
    assert.deepEqual(SDK.ServerTiming.ServerTiming.createFromHeaderValue(','), []);
    assert.deepEqual(SDK.ServerTiming.ServerTiming.createFromHeaderValue('=;'), []);
    assert.deepEqual(SDK.ServerTiming.ServerTiming.createFromHeaderValue(';='), []);
    assert.deepEqual(SDK.ServerTiming.ServerTiming.createFromHeaderValue('=,'), []);
    assert.deepEqual(SDK.ServerTiming.ServerTiming.createFromHeaderValue(',='), []);
    assert.deepEqual(SDK.ServerTiming.ServerTiming.createFromHeaderValue(';,'), []);
    assert.deepEqual(SDK.ServerTiming.ServerTiming.createFromHeaderValue(',;'), []);
  });

  it('triggers warnings when needed', () => {
    // TODO: These tests require mocking `Common.console.warn`.
    // For now, we override `SDK.ServerTiming.ServerTiming.showWarning` to throw an
    // exception instead of logging it.
    Platform.ServerTiming.ServerTiming.showWarning = message => {
      throw new Error(message);
    };

    assert.throws(() => {
      SDK.ServerTiming.ServerTiming.createFromHeaderValue('lb=42; "Load balancer"');
    }, /Deprecated syntax found/, 'legacy header syntax should trigger a warning');
    assert.throws(() => {
      SDK.ServerTiming.ServerTiming.createFromHeaderValue('sql;desc="MySQL";dur=100;dur=200');
    }, /Duplicate parameter/, 'duplicate parameters should trigger a warning');
    assert.throws(() => {
      SDK.ServerTiming.ServerTiming.createFromHeaderValue('sql;desc;dur=100');
    }, /No value found for parameter/, 'parameters without a value should trigger a warning');
    assert.throws(() => {
      SDK.ServerTiming.ServerTiming.createFromHeaderValue('sql;desc="MySQL";dur=abc');
    }, /Unable to parse/, 'duration values that cannot be converted to floats should trigger a warning');
    assert.throws(() => {
      SDK.ServerTiming.ServerTiming.createFromHeaderValue('sql;desc="MySQL";dur=100;invalid=lol');
    }, /Unrecognized parameter/, 'invalid parameters should trigger a warning');
  });
});
