// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'fs';
import * as http from 'http';

import type {ArtifactGroup} from './screenshot-error.js';

// This type mirrors test_result.proto but it might fall behind.
// TODO(liviurau): Update at convenient times.
// https://source.chromium.org/chromium/infra/infra/+/main:go/src/go.chromium.org/luci/resultdb/sink/proto/v1/test_result.proto
export interface TestResult {
  testId: SanitizedTestId;
  expected?: boolean;
  status?: 'PASS'|'FAIL'|'SKIP';
  summaryHtml?: string;
  duration?: string;
  tags?: Array<{key: string, value: string}>;
  artifacts?: ArtifactGroup;
}

export type SanitizedTestId = string&{
  _sanitizedTag?: string,
};

// ResultSink checks the testId against the regex /^[[print]]{1,512}$/:
// https://source.chromium.org/chromium/infra/infra/+/main:go/src/go.chromium.org/luci/resultdb/pbutil/test_result.go;l=43;drc=7ba090da753a71be5a0f37785558e9102e57fa10
//
// This function removees non-printable characters and truncates the string
// to the max allowed length.
export function sanitizedTestId(rawTestId: string): SanitizedTestId {
  return rawTestId.replace(/[^\x20-\x7E]/g, '').substring(0, 512) as SanitizedTestId;
}

interface SinkData {
  url: string|undefined;
  authToken?: string;
}
let resolvedSinkData: SinkData|undefined = undefined;

function getSinkData(): SinkData {
  if (resolvedSinkData !== undefined) {
    return resolvedSinkData;
  }
  resolvedSinkData = {url: undefined};
  if (!process.env.LUCI_CONTEXT || !fs.existsSync(process.env.LUCI_CONTEXT)) {
    return resolvedSinkData;
  }

  const luciConfig = fs.readFileSync(process.env.LUCI_CONTEXT, 'utf8');
  const sink = JSON.parse(luciConfig)['result_sink'];
  // LUCI_CONTEXT will not have a result_sink configuration when
  // ResultSink is unavailable.
  if (!sink) {
    return resolvedSinkData;
  }
  resolvedSinkData = {
    url: `http://${sink.address}/prpc/luci.resultsink.v1.Sink/ReportTestResults`,
    authToken: sink.auth_token,
  };
  return resolvedSinkData;
}

export function available(): boolean {
  const sinkData = getSinkData();
  return sinkData.url !== undefined;
}

// Call at the end of a test suite. Will send all `TestResult`s collected via
// `recordTestResult` to the ResultSink endpoint (only if available).
export function sendTestResult(results: TestResult): void {
  const sinkData = getSinkData();
  if (sinkData.url === undefined) {
    return;
  }

  const postOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `ResultSink ${sinkData.authToken}`,
    },
  };

  // As per ResultSink documentation, this will always be a localhost connection
  // and can be treated as reliable as a local file write.
  const request = http.request(sinkData.url, postOptions);

  const data = JSON.stringify({testResults: [results]});
  request.write(data);
  request.end();
}
