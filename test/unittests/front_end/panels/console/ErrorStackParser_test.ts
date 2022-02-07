// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Console from '../../../../../front_end/panels/console/console.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';

const {assert} = chai;
const {parseSourcePositionsFromErrorStack} = Console.ErrorStackParser;

describe('ErrorStackParser', () => {
  let runtimeModel;
  let parseErrorStack: (stack: string) => Console.ErrorStackParser.ParsedErrorFrame[] | null;

  beforeEach(() => {
    // TODO(crbug/1280141): Remove complicated stubbing code once `parseSourcePositionsFromErrorStack`
    //                      no longer needs a RuntimeModel.
    runtimeModel = sinon.createStubInstance(SDK.RuntimeModel.RuntimeModel, {
      target: sinon.createStubInstance(SDK.Target.Target, {
        inspectedURL: 'http://www.example.org',
      }),
      debuggerModel: sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel, {
        scriptsForSourceURL: [],
      }),
    });
    parseErrorStack = parseSourcePositionsFromErrorStack.bind(null, runtimeModel);
  });

  it('returns null for invalid strings', () => {
    assert.isNull(parseErrorStack(''));
    assert.isNull(parseErrorStack('foobar'));
  });

  it('returns null if the first word does not end in "Error"', () => {
    assert.isNull(parseErrorStack('CustomFoo: bar'));
  });

  it('accepts stacks with any "*Error" as its first word', () => {
    assert.isNotNull(parseErrorStack('Error: standard error'));
    assert.isNotNull(parseErrorStack('ReferenceError: unknown variable'));
    assert.isNotNull(parseErrorStack('CustomError: foobar'));
  });

  it('omits position information for frames it cannot parse', () => {
    const frames = parseErrorStack(`Error: standard error
        not a valid line
        at file:///testing.js:42:5`);

    assertNotNullOrUndefined(frames);
    assert.strictEqual(frames[1].line, '        not a valid line');
    assert.isUndefined(frames[1].link);
  });

  it('returns null when encountering an invalid frame after a valid one', () => {
    const frames = parseErrorStack(`Error: standard error
        at foo (file:///testing.js:20:3)
        not a valid line
        at file:///testing.js:42:5`);

    assert.isNull(frames);
  });

  it('returns null for invalid frame URLs', () => {
    const frames = parseErrorStack(`Error: standard error
        at foo (schemeWithColon::20:3)`);

    assert.isNull(frames);
  });

  it('omits position information for anonymous scripts', () => {
    const frames = parseErrorStack(`Error: standard error
        at foo (<anonymous>:10:3)`);

    assertNotNullOrUndefined(frames);
    assert.strictEqual(frames[1].line, '        at foo (<anonymous>:10:3)');
    assert.isUndefined(frames[1].link);
  });

  it('detects URLs with line and column information in braces', () => {
    const frames = parseErrorStack(`Error: standard error
        at foo (file:///testing.js:10:3)`);

    assertNotNullOrUndefined(frames);
    assert.deepStrictEqual(frames[1].link, {
      url: 'file:///testing.js',
      prefix: '        at foo (',
      suffix: ')',
      lineNumber: 9,    // 0-based.
      columnNumber: 2,  // 0-based.
      enclosedInBraces: true,
    });
  });

  it('detects URLs without line or column information in braces', () => {
    const frames = parseErrorStack(`Error: standard error
        at foo (file:///testing.js)`);

    assertNotNullOrUndefined(frames);
    assert.deepStrictEqual(frames[1].link, {
      url: 'file:///testing.js',
      prefix: '        at foo (',
      suffix: ')',
      lineNumber: undefined,
      columnNumber: undefined,
      enclosedInBraces: true,
    });
  });

  it('detects URLs with line and column information without braces', () => {
    const frames = parseErrorStack(`Error: standard error
        at file:///testing.js:42:3`);

    assertNotNullOrUndefined(frames);
    assert.deepStrictEqual(frames[1].link, {
      url: 'file:///testing.js',
      prefix: '        at ',
      suffix: '',
      lineNumber: 41,   // 0-based.
      columnNumber: 2,  // 0-based.
      enclosedInBraces: false,
    });
  });

  it('detects URLs without braces with the "async" keyword present', () => {
    const frames = parseErrorStack(`Error: standard error
        at async file:///testing.js:42:3`);

    assertNotNullOrUndefined(frames);
    assert.deepStrictEqual(frames[1].link, {
      url: 'file:///testing.js',
      prefix: '        at async ',
      suffix: '',
      lineNumber: 41,   // 0-based.
      columnNumber: 2,  // 0-based.
      enclosedInBraces: false,
    });
  });

  it('uses the inspected target URL to complete relative URLs', () => {
    const frames = parseErrorStack(`Error: standard error
        at foo (testing.js:10:3)`);

    assertNotNullOrUndefined(frames);
    assert.strictEqual(frames[1].link?.url, 'http://www.example.org/testing.js');
  });

  describe('augmentErrorStackWithScriptIds', () => {
    const sid = (id: string) => id as Protocol.Runtime.ScriptId;

    it('sets the scriptId for matching frames', () => {
      const parsedFrames = parseErrorStack(`Error: some error
          at foo (http://example.com/a.js:6:3)
          at bar (http://example.com/b.js:43:14)`);
      assertNotNullOrUndefined(parsedFrames);
      const protocolFrames: Protocol.Runtime.CallFrame[] = [
        {
          url: 'http://example.com/a.js',
          scriptId: sid('25'),
          lineNumber: 5,
          columnNumber: 2,
          functionName: 'foo',
        },
        {
          url: 'http://example.com/b.js',
          scriptId: sid('30'),
          lineNumber: 42,
          columnNumber: 13,
          functionName: 'bar',
        },
      ];

      Console.ErrorStackParser.augmentErrorStackWithScriptIds(parsedFrames, {callFrames: protocolFrames});

      assert.strictEqual(parsedFrames[1].link?.scriptId, sid('25'));
      assert.strictEqual(parsedFrames[2].link?.scriptId, sid('30'));
    });

    it('omits the scriptId for non-matching frames', () => {
      const parsedFrames = parseErrorStack(`Error: some error
        at http://example.com/a.js:6:3`);
      assertNotNullOrUndefined(parsedFrames);
      const protocolFrames: Protocol.Runtime.CallFrame[] = [{
        url: 'http://example.com/a.js',
        scriptId: sid('25'),
        lineNumber: 10,
        columnNumber: 4,
        functionName: 'foo',
      }];

      Console.ErrorStackParser.augmentErrorStackWithScriptIds(parsedFrames, {callFrames: protocolFrames});

      assertNotNullOrUndefined(parsedFrames[1].link);
      assert.isUndefined(parsedFrames[1].link.scriptId);
    });

    it('handles different number or frames', () => {
      const parsedFrames = parseErrorStack(`Error: some error
        at foo (http://example.com/a.js:6:3)
        at Array.forEach (<anonymous>)
        at bar (http://example.com/b.js:43:14)`);
      assertNotNullOrUndefined(parsedFrames);
      const protocolFrames: Protocol.Runtime.CallFrame[] = [
        {
          url: 'http://example.com/a.js',
          scriptId: sid('25'),
          lineNumber: 5,
          columnNumber: 2,
          functionName: 'foo',
        },
        {
          url: 'http://example.com/b.js',
          scriptId: sid('30'),
          lineNumber: 42,
          columnNumber: 13,
          functionName: 'bar',
        },
      ];

      Console.ErrorStackParser.augmentErrorStackWithScriptIds(parsedFrames, {callFrames: protocolFrames});

      assert.strictEqual(parsedFrames[1].link?.scriptId, sid('25'));
      assert.isUndefined(parsedFrames[2].link);
      assert.strictEqual(parsedFrames[3].link?.scriptId, sid('30'));
    });
  });
});
