// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-manual-sinon-restore.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-manual-sinon-restore', rule, {
  valid: [
    {
      name: 'allows targeted stub.restore() inside it()',
      code: `it('handles targeted reset and re-stub', () => {
  const stub = sinon.stub(foo, 'bar');
  stub.restore();
  sinon.stub(foo, 'bar').returns(42);
});`,
      filename: 'front_end/panels/my-panel/my-panel.test.ts',
    },
    {
      name: 'allows mid-test stub.restore() inside it()',
      code: `it('handles mid-test stub restore', () => {
  const stub = sinon.stub(foo, 'bar');
  stub.restore();
  assert.strictEqual(foo.bar(), 'real');
});`,
      filename: 'front_end/panels/my-panel/my-panel.test.ts',
    },
    {
      name: 'allows afterEach() without restore() calls',
      code: `afterEach(() => {
  cleanupSomething();
});`,
      filename: 'front_end/panels/my-panel/my-panel.test.ts',
    },
    {
      name: 'allows non-Sinon restore(arg) with arguments in afterEach()',
      code: `afterEach(() => {
  stateManager.restore(savedState);
});`,
      filename: 'front_end/panels/my-panel/my-panel.test.ts',
    },
    {
      name: 'allows custom sandbox.restore() and canvas ctx.restore() in afterEach()',
      code: `afterEach(() => {
  sandbox.restore();
  this.sandbox.restore();
  ctx.restore();
  this.ctx.restore();
});`,
      filename: 'front_end/panels/my-panel/my-panel.test.ts',
    },
  ],
  invalid: [
    {
      name: 'disallows sinon.restore() inside it() block',
      code: `it('handles mid-test restore and re-stub', () => {
  sinon.stub(foo, 'bar');
  sinon.restore();
  sinon.stub(foo, 'bar').returns(42);
});`,
      filename: 'front_end/panels/my-panel/my-panel.test.ts',
      errors: [{messageId: 'noManualSinonRestore'}],
    },
    {
      name: 'disallows sinon.restore() inside beforeEach() hook',
      code: `beforeEach(() => {
  sinon.restore();
});`,
      filename: 'front_end/panels/my-panel/my-panel.test.ts',
      errors: [{messageId: 'noManualSinonRestore'}],
    },
    {
      name: 'disallows sinon.restore() as only statement in afterEach() and removes afterEach',
      code: `describe('suite', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('test', () => {});
});`,
      filename: 'front_end/panels/my-panel/my-panel.test.ts',
      errors: [{messageId: 'noManualSinonRestore'}],
      output: `describe('suite', () => {
  it('test', () => {});
});`,
    },
    {
      name: 'disallows sinon.restore() in after() and removes after()',
      code: `describe('suite', () => {
  after(() => {
    sinon.restore();
  });

  it('test', () => {});
});`,
      filename: 'front_end/panels/my-panel/my-panel.test.ts',
      errors: [{messageId: 'noManualSinonRestore'}],
      output: `describe('suite', () => {
  it('test', () => {});
});`,
    },
    {
      name: 'disallows concise arrow afterEach(() => sinon.restore()) and removes afterEach',
      code: `describe('suite', () => {
  afterEach(() => sinon.restore());

  it('test', () => {});
});`,
      filename: 'front_end/panels/my-panel/my-panel.test.ts',
      errors: [{messageId: 'noManualSinonRestore'}],
      output: `describe('suite', () => {
  it('test', () => {});
});`,
    },
    {
      name: 'disallows clock.restore() in afterEach() without blindly autofixing non-sinon identifiers',
      code: `describe('suite', () => {
  afterEach(() => {
    clock.restore();
  });

  it('test', () => {});
});`,
      filename: 'front_end/panels/my-panel/my-panel.test.ts',
      errors: [{messageId: 'noManualSinonRestoreInAfterEach'}],
    },
    {
      name: 'disallows stub.restore() in after() hook without blindly autofixing non-sinon identifiers',
      code: `describe('suite', () => {
  after(() => {
    stub.restore();
  });

  it('test', () => {});
});`,
      filename: 'front_end/panels/my-panel/my-panel.test.ts',
      errors: [{messageId: 'noManualSinonRestoreInAfterEach'}],
    },
    {
      name: 'disallows point-free afterEach(sinon.restore) and removes afterEach',
      code: `describe('suite', () => {
  afterEach(sinon.restore);

  it('test', () => {});
});`,
      filename: 'front_end/panels/my-panel/my-panel.test.ts',
      errors: [{messageId: 'noManualSinonRestore'}],
      output: `describe('suite', () => {
  it('test', () => {});
});`,
    },
    {
      name: 'disallows point-free beforeEach(sinon.restore) without autofix',
      code: `describe('suite', () => {
  beforeEach(sinon.restore);

  it('test', () => {});
});`,
      filename: 'front_end/panels/my-panel/my-panel.test.ts',
      errors: [{messageId: 'noManualSinonRestore'}],
    },
    {
      name: 'disallows sinon.restore() with other statements in afterEach() and removes only restore call',
      code: `describe('suite', () => {
  afterEach(async () => {
    sinon.restore();
    await deinitializeGlobalVars();
  });

  it('test', () => {});
});`,
      filename: 'front_end/panels/my-panel/my-panel.test.ts',
      errors: [{messageId: 'noManualSinonRestore'}],
      output: `describe('suite', () => {
  afterEach(async () => {
    await deinitializeGlobalVars();
  });

  it('test', () => {});
});`,
    },
    {
      name: 'disallows sinon.restore() when placed after other statements in afterEach()',
      code: `describe('suite', () => {
  afterEach(async () => {
    await deinitializeGlobalVars();
    sinon.restore();
  });

  it('test', () => {});
});`,
      filename: 'front_end/panels/my-panel/my-panel.test.ts',
      errors: [{messageId: 'noManualSinonRestore'}],
      output: `describe('suite', () => {
  afterEach(async () => {
    await deinitializeGlobalVars();
  });

  it('test', () => {});
});`,
    },
    {
      name: 'does not autofix when sinon.restore() is nested inside a compound statement in afterEach()',
      code: `describe('suite', () => {
  afterEach(() => {
    if (shouldRestore) {
      sinon.restore();
      otherCleanup();
    }
  });

  it('test', () => {});
});`,
      filename: 'front_end/panels/my-panel/my-panel.test.ts',
      errors: [{messageId: 'noManualSinonRestore'}],
    },
    {
      name: 'preserves line indentation when another statement is on the same line in afterEach()',
      code: `describe('suite', () => {
  afterEach(() => {
    sinon.restore(); otherCleanup();
  });

  it('test', () => {});
});`,
      filename: 'front_end/panels/my-panel/my-panel.test.ts',
      errors: [{messageId: 'noManualSinonRestore'}],
      output: `describe('suite', () => {
  afterEach(() => {
     otherCleanup();
  });

  it('test', () => {});
});`,
    },
  ],
});
