
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Protocol from '../../generated/protocol.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import * as EnhancedTraces from './EnhancedTracesParser.js';
import type {RehydratingExecutionContext, RehydratingScript, RehydratingTarget} from './RehydratingObject.js';

describe('EnhancedTracesParser', () => {
  let enhancedTracesParser: EnhancedTraces.EnhancedTracesParser;
  const target1: RehydratingTarget = {
    targetId: '21D58E83A5C17916277166140F6A464B' as Protocol.Target.TargetID,
    type: 'page',
    pid: 8050,
    url: 'http://localhost:8080/index.html',
  };
  const target2: RehydratingTarget = {
    targetId: '3E1717BE677B75D0536E292E00D6A34A' as Protocol.Target.TargetID,
    type: 'iframe',
    pid: 8051,
    url: 'http://localhost:8080/test.html',
  };
  const target3: RehydratingTarget = {
    targetId: '6A7611591E1EBABAACBAB2B23F0AEC93' as Protocol.Target.TargetID,
    type: 'iframe',
    pid: 8052,
    url: 'test1',
  };

  const executionContext1: RehydratingExecutionContext = {
    id: 1 as Protocol.Runtime.ExecutionContextId,
    origin: 'http://localhost:8080',
    v8Context: 'example context 1',
    auxData: {
      frameId: '21D58E83A5C17916277166140F6A464B' as Protocol.Page.FrameId,
      isDefault: true,
      type: 'type',
    },
    isolate: '12345',
  };

  const executionContext2: RehydratingExecutionContext = {
    id: 2 as Protocol.Runtime.ExecutionContextId,
    origin: 'http://localhost:8080',
    v8Context: 'example context 2',
    auxData: {
      frameId: '21D58E83A5C17916277166140F6A464B' as Protocol.Page.FrameId,
      isDefault: true,
      type: 'type',
    },
    isolate: '12345',
  };

  const executionContext3: RehydratingExecutionContext = {
    id: 1 as Protocol.Runtime.ExecutionContextId,
    origin: 'http://localhost:8080',
    v8Context: 'example context 3',
    auxData: {
      frameId: '3E1717BE677B75D0536E292E00D6A34A' as Protocol.Page.FrameId,
      isDefault: true,
      type: 'type',
    },
    isolate: '6789',
  };

  const executionContext4: RehydratingExecutionContext = {
    id: 1 as Protocol.Runtime.ExecutionContextId,
    origin: '',
    v8Context: '',
    auxData: {
      frameId: '6A7611591E1EBABAACBAB2B23F0AEC93' as Protocol.Page.FrameId,
      isDefault: false,
      type: 'type',
    },
    isolate: '1357',
  };

  const script1: RehydratingScript = {
    scriptId: '1' as Protocol.Runtime.ScriptId,
    isolate: '12345',
    executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
    startLine: 0,
    startColumn: 0,
    endLine: 1,
    endColumn: 10,
    hash: '',
    isModule: false,
    url: 'http://localhost:8080/index.html',
    hasSourceURL: false,
    sourceURL: undefined,
    sourceMapURL: 'http://localhost:8080/source.map.json',
    length: 13,
    pid: 8050,
    sourceText: 'source text 1',
    auxData: {
      frameId: '21D58E83A5C17916277166140F6A464B' as Protocol.Page.FrameId,
      isDefault: true,
      type: 'type',
    },
  };

  const script2: RehydratingScript = {
    scriptId: '2' as Protocol.Runtime.ScriptId,
    isolate: '12345',
    executionContextId: 2 as Protocol.Runtime.ExecutionContextId,
    startLine: 0,
    startColumn: 0,
    endLine: 1,
    endColumn: 10,
    hash: '',
    isModule: false,
    url: 'http://localhost:8080/index.html',
    hasSourceURL: false,
    sourceURL: undefined,
    sourceMapURL: undefined,
    length: 13,
    pid: 8050,
    sourceText: 'source text 2',
    auxData: {
      frameId: '21D58E83A5C17916277166140F6A464B' as Protocol.Page.FrameId,
      isDefault: true,
      type: 'type',
    },
  };

  const script3: RehydratingScript = {
    scriptId: '1' as Protocol.Runtime.ScriptId,
    isolate: '6789',
    executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
    startLine: 0,
    startColumn: 0,
    endLine: 1,
    endColumn: 10,
    hash: '',
    isModule: false,
    url: 'http://localhost:8080/index.html',
    hasSourceURL: false,
    sourceURL: undefined,
    sourceMapURL: undefined,
    length: 13,
    pid: 8051,
    sourceText: 'source text 3',
    auxData: {
      frameId: '3E1717BE677B75D0536E292E00D6A34A' as Protocol.Page.FrameId,
      isDefault: true,
      type: 'type',
    },
  };

  const script4: RehydratingScript = {
    scriptId: '3' as Protocol.Runtime.ScriptId,
    isolate: '12345',
    executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
    startLine: 0,
    startColumn: 0,
    endLine: 1,
    endColumn: 10,
    hash: '',
    isModule: false,
    url: 'http://localhost:8080/index.html',
    hasSourceURL: false,
    sourceURL: undefined,
    sourceMapURL: 'http://localhost:8080/source.map.json',
    pid: 8050,
    auxData: {
      frameId: '21D58E83A5C17916277166140F6A464B' as Protocol.Page.FrameId,
      isDefault: true,
      type: 'type',
    },
  };

  const script5: RehydratingScript = {
    scriptId: '4' as Protocol.Runtime.ScriptId,
    isolate: '12345',
    executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
    startLine: 0,
    startColumn: 0,
    endLine: 1,
    endColumn: 10,
    hash: '',
    isModule: false,
    url: 'http://localhost:8080/index.html',
    hasSourceURL: false,
    sourceURL: undefined,
    sourceMapURL: 'http://localhost:8080/source.map.json',
    pid: 8050,
    auxData: {
      frameId: '21D58E83A5C17916277166140F6A464B' as Protocol.Page.FrameId,
      isDefault: true,
      type: 'type',
    },
  };

  const script6: RehydratingScript = {
    scriptId: '1' as Protocol.Runtime.ScriptId,
    isolate: '1357',
    executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
    startLine: 0,
    startColumn: 0,
    endLine: 1,
    endColumn: 10,
    hash: '',
    isModule: false,
    url: 'http://localhost:8080/index.html',
    hasSourceURL: false,
    sourceURL: undefined,
    sourceMapURL: 'http://localhost:8080/source.map.json',
    pid: 8052,
  };

  beforeEach(async function() {
    const events = await TraceLoader.rawEvents(this, 'enhanced-traces.json.gz');
    enhancedTracesParser = new EnhancedTraces.EnhancedTracesParser({traceEvents: events as object[], metadata: {}});
  });

  it('captures correct targets', async function() {
    const data = enhancedTracesParser.data();
    const targets: RehydratingTarget[] = [];
    for (const hydrationData of data) {
      const target = hydrationData.target;
      targets.push(target);
      if (target.pid === 8050) {
        assert.deepEqual(target, target1);
      } else if (target.pid === 8051) {
        assert.deepEqual(target, target2);
      } else if (target.pid === 8052) {
        assert.deepEqual(target, target3);
      }
    }
    assert.lengthOf(targets, 3);
  });

  it('captures execution context info', async function() {
    const data = enhancedTracesParser.data();
    let executionContexts: RehydratingExecutionContext[] = [];
    for (const hydrationData of data) {
      executionContexts = [...executionContexts, ...hydrationData.executionContexts];
    }
    assert.lengthOf(executionContexts, 4);
    for (const executionContext of executionContexts) {
      if (executionContext.id === 1 && executionContext.isolate === '12345') {
        assert.deepEqual(executionContext, executionContext1);
      } else if (executionContext.id === 2 && executionContext.isolate === '12345') {
        assert.deepEqual(executionContext, executionContext2);
      } else if (executionContext.id === 1 && executionContext.isolate === '6789') {
        assert.deepEqual(executionContext, executionContext3);
      }
    }
  });

  it('captures script info and source text', async function() {
    const data = enhancedTracesParser.data();
    let scripts: RehydratingScript[] = [];
    for (const hydrationData of data) {
      scripts = [...scripts, ...hydrationData.scripts];
    }
    assert.lengthOf(scripts, 6);
    for (const script of scripts) {
      if (script.scriptId === '1' && script.isolate === '12345') {
        assert.deepEqual(script, script1);
      } else if (script.scriptId === '2' && script.isolate === '12345') {
        assert.deepEqual(script, script2);
      } else if (script.scriptId === '1' && script.isolate === '6789') {
        assert.deepEqual(script, script3);
      }
    }
  });

  it('groups contexts and scripts under the right target', async function() {
    const data = enhancedTracesParser.data();
    for (const hydrationData of data) {
      const target = hydrationData.target;
      const executionContexts = hydrationData.executionContexts;
      const scripts = hydrationData.scripts;
      if (target.pid === 8050) {
        assert.lengthOf(executionContexts, 2);
        for (const executionContext of executionContexts) {
          // We should be able to get the correct execution context without specifying isolate
          // as the contexts and scripts are grouped under its respective target already.
          if (executionContext.id === 1) {
            assert.deepEqual(executionContext, executionContext1);
          } else if (executionContext.id === 2) {
            assert.deepEqual(executionContext, executionContext2);
          }
        }
        assert.lengthOf(scripts, 4);
        for (const script of scripts) {
          if (script.scriptId === '1') {
            assert.deepEqual(script, script1);
          } else if (script.scriptId === '2') {
            assert.deepEqual(script, script2);
          } else if (script.scriptId === '3') {
            // This script should be grouped under this target given the clue from FunctionCall
            // trace event.
            assert.deepEqual(script, script4);
          } else if (script.scriptId === '4') {
            // This script should be grouped under this target given the execution context @
            // isoalte info.
            assert.deepEqual(script, script5);
          }
        }
      } else if (target.pid === 8051) {
        assert.lengthOf(executionContexts, 1);
        assert.lengthOf(scripts, 1);
        assert.deepEqual(executionContexts[0], executionContext3);
        assert.deepEqual(scripts[0], script3);
      } else if (target.pid === 8052) {
        assert.lengthOf(executionContexts, 1);
        assert.lengthOf(scripts, 1);
        assert.deepEqual(executionContexts[0], executionContext4);
        // This script should be grouped under this target given the PID info.
        assert.deepEqual(scripts[0], script6);
      }
    }
  });
});
