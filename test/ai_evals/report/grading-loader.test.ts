// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, describe, it} from 'mocha';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  EXPECTATIONS_FILE,
  GradingConfigError,
  loadTaskGrading,
  WEIGHTS_FILE,
} from './grading-loader.js';

function writeGradingFiles(
    dir: string,
    expectations: Record<string, unknown>,
    weights: Record<string, unknown>,
    ): void {
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, EXPECTATIONS_FILE), JSON.stringify(expectations, null, 2));
  fs.writeFileSync(path.join(dir, WEIGHTS_FILE), JSON.stringify(weights, null, 2));
}

describe('grading-loader', () => {
  const tempDirs: string[] = [];

  function makeTempEvalsDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grading-loader-test-'));
    tempDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    while (tempDirs.length) {
      const dir = tempDirs.pop();
      if (dir && fs.existsSync(dir)) {
        fs.rmSync(dir, {recursive: true, force: true});
      }
    }
  });

  it('loads general, domain, and test grading levels in order', () => {
    const evalsDir = makeTempEvalsDir();
    writeGradingFiles(
        path.join(evalsDir, 'grading'),
        {generic_lecture: 'Generic lecture.'},
        {penalties: {generic_lecture: -2}},
    );
    writeGradingFiles(
        path.join(evalsDir, 'grading', 'performance'),
        {perf_inspected_data: 'Inspected perf data.'},
        {expectations: {perf_inspected_data: 3}},
    );
    writeGradingFiles(
        path.join(evalsDir, 'cls-unsized-image', 'grading'),
        {names_image: 'Names the image.'},
        {expectations: {names_image: 5}},
    );

    const result = loadTaskGrading(evalsDir, 'cls-unsized-image', 'performance');
    assert.isNotNull(result);
    assert.deepEqual(result.gradingDirs, [
      path.join(evalsDir, 'grading'),
      path.join(evalsDir, 'grading', 'performance'),
      path.join(evalsDir, 'cls-unsized-image', 'grading'),
    ]);
    assert.deepEqual(
        result.items.map(item => ({id: item.id, level: item.level, weight: item.weight})),
        [
          {id: 'generic_lecture', level: 'general', weight: -2},
          {id: 'perf_inspected_data', level: 'domain', weight: 3},
          {id: 'names_image', level: 'test', weight: 5},
        ],
    );
  });

  it('returns null when test-level expectations are absent even if general and domain expectations exist', () => {
    const evalsDir = makeTempEvalsDir();
    writeGradingFiles(
        path.join(evalsDir, 'grading'),
        {generic_lecture: 'Generic lecture.'},
        {penalties: {generic_lecture: -2}},
    );
    writeGradingFiles(
        path.join(evalsDir, 'grading', 'sources'),
        {sources_inspected_code: 'Inspected source code.'},
        {expectations: {sources_inspected_code: 3}},
    );

    assert.isNull(loadTaskGrading(evalsDir, 'unmigrated-sources-task', 'sources'));
  });

  it('skips missing optional general and domain directories', () => {
    const evalsDir = makeTempEvalsDir();
    writeGradingFiles(
        path.join(evalsDir, 'network-500-server-error', 'grading'),
        {names_status: 'Names HTTP 500.'},
        {expectations: {names_status: 3}},
    );

    const result = loadTaskGrading(evalsDir, 'network-500-server-error', 'network');
    assert.isNotNull(result);
    assert.deepEqual(result.gradingDirs, [
      path.join(evalsDir, 'network-500-server-error', 'grading'),
    ]);
    assert.deepEqual(result.items.map(item => item.id), ['names_status']);
  });

  it('throws GradingConfigError on duplicate expectation ids across domain and test levels', () => {
    const evalsDir = makeTempEvalsDir();
    writeGradingFiles(
        path.join(evalsDir, 'grading', 'performance'),
        {shared_id: 'Domain expectation.'},
        {expectations: {shared_id: 2}},
    );
    writeGradingFiles(
        path.join(evalsDir, 'cls-unsized-image', 'grading'),
        {shared_id: 'Test expectation.'},
        {expectations: {shared_id: 3}},
    );

    assert.throws(
        () => loadTaskGrading(evalsDir, 'cls-unsized-image', 'performance'),
        GradingConfigError,
        /defined at both the domain and the test level/,
    );
  });
});
