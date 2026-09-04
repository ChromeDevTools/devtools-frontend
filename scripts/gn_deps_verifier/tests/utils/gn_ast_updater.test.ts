// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import {GnAstExtractor} from '../../extractors/gn_ast_extractor.ts';
import {TypeScriptAnalyzer} from '../../extractors/typescript_analyzer.ts';
import type {GnBuildFile} from '../../gn_ast/gn_ast.ts';
import type {AstTargetInfo} from '../../gn_ast/gn_ast_types.ts';
import {updateBuildGnFiles} from '../../utils/gn_ast_updater.ts';

describe('gn_ast_updater', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    GnAstExtractor.clearCacheForTesting();
  });

  it('ignores targets with matching ignored substrings', async () => {
    const gnBuildMock = {
      targets: new Map<string, AstTargetInfo>([
        [
          '//test:Images',
          {
            templateName: 'devtools_module',
            label: '//test:Images',
          } as AstTargetInfo,
        ],
        [
          '//test:legacy_test_runner_target',
          {
            templateName: 'devtools_module',
            label: '//test:legacy_test_runner_target',
          } as AstTargetInfo,
        ],
      ]),
    } as GnBuildFile;

    const extractorStub = {
      buildFiles: new Map([['test_file', Promise.resolve(gnBuildMock)]]),
    };
    sandbox.stub(GnAstExtractor, 'create').returns(extractorStub as unknown as GnAstExtractor);
    const computeDepsSpy = sandbox.spy(
        TypeScriptAnalyzer,
        'computeTargetDepsDiff',
    );

    const requiredDeps = new Map([
      ['//test:Images', new Set(['dep1'])],
      ['//test:legacy_test_runner_target', new Set(['dep1'])],
    ]);

    await updateBuildGnFiles(requiredDeps, '/root');

    assert.isTrue(computeDepsSpy.notCalled);
  });

  it('ignores group and devtools_pre_built template targets', async () => {
    const gnBuildMock = {
      targets: new Map<string, AstTargetInfo>([
        [
          '//test:group_target',
          {
            templateName: 'group',
            label: '//test:group_target',
          } as AstTargetInfo,
        ],
        [
          '//test:prebuilt',
          {
            templateName: 'devtools_pre_built',
            label: '//test:prebuilt',
          } as AstTargetInfo,
        ],
      ]),
    } as GnBuildFile;

    const extractorStub = {
      buildFiles: new Map([['test_file', Promise.resolve(gnBuildMock)]]),
    };
    sandbox.stub(GnAstExtractor, 'create').returns(extractorStub as unknown as GnAstExtractor);
    const computeDepsSpy = sandbox.spy(
        TypeScriptAnalyzer,
        'computeTargetDepsDiff',
    );

    const requiredDeps = new Map([
      ['//test:group_target', new Set(['dep1'])],
      ['//test:prebuilt', new Set(['dep1'])],
    ]);

    await updateBuildGnFiles(requiredDeps, '/root');

    assert.isTrue(computeDepsSpy.notCalled);
  });

  it('does nothing if no missing or unused deps are found', async () => {
    const gnBuildMock = {
      targets: new Map<string, AstTargetInfo>([
        [
          '//test:target',
          {
            templateName: 'devtools_module',
            label: '//test:target',
          } as AstTargetInfo,
        ],
      ]),
    } as GnBuildFile;

    const extractorStub = {
      buildFiles: new Map([['test_file', Promise.resolve(gnBuildMock)]]),
    };
    sandbox.stub(GnAstExtractor, 'create').returns(extractorStub as unknown as GnAstExtractor);
    sandbox.stub(TypeScriptAnalyzer, 'computeTargetDepsDiff').returns({missingDeps: [], unusedDeps: []});

    const requiredDeps = new Map([['//test:target', new Set(['dep1'])]]);

    await updateBuildGnFiles(requiredDeps, '/root');
  });

  it('filters out ignored missing and unused deps and does not update AST if nothing remains', async () => {
    const gnBuildMock = {
      targets: new Map<string, AstTargetInfo>([
        [
          '//test:target',
          {
            templateName: 'devtools_module',
            label: '//test:target',
          } as AstTargetInfo,
        ],
      ]),
      updateTargetDeps: sandbox.stub().returns(true),
    } as unknown as GnBuildFile;

    const extractorStub = {
      buildFiles: new Map([['test_file', Promise.resolve(gnBuildMock)]]),
    };
    sandbox.stub(GnAstExtractor, 'create').returns(extractorStub as unknown as GnAstExtractor);

    // Provide unused and missing deps that match IGNORED_TARGET_SUBSTRINGS
    sandbox.stub(TypeScriptAnalyzer, 'computeTargetDepsDiff').returns({
      missingDeps: ['//other:Images'],
      unusedDeps: ['//other:Images', '//foo/legacy_test_runner/bar:target'],
    });

    const requiredDeps = new Map([['//test:target', new Set(['dep1'])]]);

    await updateBuildGnFiles(requiredDeps, '/root');
    sinon.assert.notCalled(gnBuildMock.updateTargetDeps as sinon.SinonStub);
  });

  it('filters out ignored missing and unused deps and updates AST with remaining deps', async () => {
    const gnBuildMock = {
      filePath: '/root/BUILD.gn',
      targets: new Map<string, AstTargetInfo>([
        [
          '//test:target',
          {
            templateName: 'devtools_module',
            label: '//test:target',
          } as AstTargetInfo,
        ],
      ]),
      updateTargetDeps: sandbox.stub().returns(true),
      writeGnFile: sandbox.stub().resolves(true),
    } as unknown as GnBuildFile;

    const extractorStub = {
      buildFiles: new Map([['test_file', Promise.resolve(gnBuildMock)]]),
    };
    sandbox.stub(GnAstExtractor, 'create').returns(extractorStub as unknown as GnAstExtractor);

    sandbox.stub(TypeScriptAnalyzer, 'computeTargetDepsDiff').returns({
      missingDeps: ['//new:dep', '//other:Images'],
      unusedDeps: ['//old:dep', '//foo/legacy_test_runner/bar:target'],
    });

    const requiredDeps = new Map([['//test:target', new Set(['dep1'])]]);

    await updateBuildGnFiles(requiredDeps, '/root');

    sinon.assert.calledWith(
        gnBuildMock.updateTargetDeps as sinon.SinonStub,
        'target',
        {
          unusedDeps: ['//old:dep'],
          missingDeps: ['//new:dep'],
        },
    );
    sinon.assert.calledOnce(gnBuildMock.writeGnFile as sinon.SinonStub);
  });

  it('updates AST and writes changes when missing and unused deps are found', async () => {
    const gnBuildMock = {
      filePath: '/root/BUILD.gn',
      targets: new Map<string, AstTargetInfo>([
        [
          '//test:target',
          {
            templateName: 'devtools_module',
            label: '//test:target',
          } as AstTargetInfo,
        ],
      ]),
      updateTargetDeps: sandbox.stub().returns(true),
      writeGnFile: sandbox.stub().resolves(true),
    } as unknown as GnBuildFile;

    const extractorStub = {
      buildFiles: new Map([['test_file', Promise.resolve(gnBuildMock)]]),
    };
    sandbox.stub(GnAstExtractor, 'create').returns(extractorStub as unknown as GnAstExtractor);

    sandbox.stub(TypeScriptAnalyzer, 'computeTargetDepsDiff').returns({
      missingDeps: ['//new:dep'],
      unusedDeps: ['//old:dep'],
    });

    const requiredDeps = new Map([['//test:target', new Set(['dep1'])]]);

    await updateBuildGnFiles(requiredDeps, '/root');

    sinon.assert.calledWith(
        gnBuildMock.updateTargetDeps as sinon.SinonStub,
        'target',
        {
          unusedDeps: ['//old:dep'],
          missingDeps: ['//new:dep'],
        },
    );
    sinon.assert.calledOnce(gnBuildMock.writeGnFile as sinon.SinonStub);
  });

  it('logs failure if writeGnFile returns false', async () => {
    const gnBuildMock = {
      filePath: '/root/BUILD.gn',
      targets: new Map<string, AstTargetInfo>([
        [
          '//test:target',
          {
            templateName: 'devtools_module',
            label: '//test:target',
          } as AstTargetInfo,
        ],
      ]),
      updateTargetDeps: sandbox.stub().returns(true),
      writeGnFile: sandbox.stub().resolves(false),
    } as unknown as GnBuildFile;

    const extractorStub = {
      buildFiles: new Map([['test_file', Promise.resolve(gnBuildMock)]]),
    };
    sandbox.stub(GnAstExtractor, 'create').returns(extractorStub as unknown as GnAstExtractor);
    sandbox.stub(TypeScriptAnalyzer, 'computeTargetDepsDiff').returns({
      missingDeps: ['//new:dep'],
      unusedDeps: [],
    });

    const requiredDeps = new Map([['//test:target', new Set(['dep1'])]]);

    await updateBuildGnFiles(requiredDeps, '/root');

    sinon.assert.calledOnce(gnBuildMock.writeGnFile as sinon.SinonStub);
  });

  it('logs failure if writeGnFile throws exception', async () => {
    const gnBuildMock = {
      filePath: '/root/BUILD.gn',
      targets: new Map<string, AstTargetInfo>([
        [
          '//test:target',
          {
            templateName: 'devtools_module',
            label: '//test:target',
          } as AstTargetInfo,
        ],
      ]),
      updateTargetDeps: sandbox.stub().returns(true),
      writeGnFile: sandbox.stub().rejects(new Error('I/O error')),
    } as unknown as GnBuildFile;

    const extractorStub = {
      buildFiles: new Map([['test_file', Promise.resolve(gnBuildMock)]]),
    };
    sandbox.stub(GnAstExtractor, 'create').returns(extractorStub as unknown as GnAstExtractor);
    sandbox.stub(TypeScriptAnalyzer, 'computeTargetDepsDiff').returns({
      missingDeps: ['//new:dep'],
      unusedDeps: [],
    });

    const requiredDeps = new Map([['//test:target', new Set(['dep1'])]]);

    await updateBuildGnFiles(requiredDeps, '/root');

    sinon.assert.calledOnce(gnBuildMock.writeGnFile as sinon.SinonStub);
  });
});
