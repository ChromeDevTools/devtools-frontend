// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const path = require('path');
const {createCoverageMap} = require('istanbul-lib-coverage');
const report = require('istanbul-lib-report');
const reports = require('istanbul-reports');

const mergedMap = createCoverageMap(require(path.join('..', '..', 'karma-coverage', 'coverage-final.json')));

mergedMap.merge(require(path.join('..', '..', 'interactions-coverage', 'coverage-final.json')));

const context = report.createContext({
  dir: 'test',
  coverageMap: mergedMap,
  defaultSummarizer: 'nested',
});
reports.create('json-summary').execute(context);
reports.create('text', {file: 'coverage.txt'}).execute(context);
