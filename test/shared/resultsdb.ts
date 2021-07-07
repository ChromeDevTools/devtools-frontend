// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'fs';
import * as http from 'http';

// This type mirrors test_result.proto.
// https://source.chromium.org/chromium/infra/infra/+/main:recipes-py/recipe_proto/go.chromium.org/luci/resultdb/proto/sink/v1/test_result.proto
export interface TestResult {
  testId: SanitizedTestId;
  expected?: boolean;
  status?: 'PASS'|'FAIL'|'SKIP';
  summaryHtml?: string;
  duration?: string;
  tags?: {key: string, value: string}[];
}

class SanitizedTestIdTag {
  private sanitizedTag: (string|undefined);
}
export type SanitizedTestId = string&SanitizedTestIdTag;

// ResultSink checks the testId against the regex /^[[print]]{1,512}$/:
// https://source.chromium.org/chromium/infra/infra/+/main:go/src/go.chromium.org/luci/resultdb/pbutil/test_result.go;l=43;drc=7ba090da753a71be5a0f37785558e9102e57fa10
//
// This function removees non-printable characters and truncates the string
// to the max allowed length.
export function sanitizedTestId(rawTestId: string): SanitizedTestId {
  return rawTestId.replace(/[^\x20-\x7E]/g, '').substr(0, 512) as SanitizedTestId;
}

let collectedTestResults: TestResult[] = [];

export function recordTestResult(testResult: TestResult): void {
  collectedTestResults.push(testResult);
}

// Call at the end of a test suite. Will send all `TestResult`s collected via
// `recordTestResult` to the ResultSink endpoint (only if available).
export function sendCollectedTestResultsIfSinkIsAvailable() {
  if (!process.env.LUCI_CONTEXT || !fs.existsSync(process.env.LUCI_CONTEXT)) {
    return;
  }

  const luciConfig = fs.readFileSync(process.env.LUCI_CONTEXT, 'utf8');
  const sink = JSON.parse(luciConfig)['result_sink'];
  // LUCI_CONTEXT will not have a result_sink configuration when
  // ResultSink is unavailable.
  if (!sink) {
    return;
  }

  const url = `http://${sink.address}/prpc/luci.resultsink.v1.Sink/ReportTestResults`;

  const postOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `ResultSink ${sink.auth_token}`,
    },
  };

  // As per ResultSink documentation, this will always be a localhost connection
  // and can be treated as reliable as a local file write.
  const request = http.request(url, postOptions, () => {});

  const data = JSON.stringify({testResults: collectedTestResults});
  request.write(data);
  request.end();

  collectedTestResults = [];
}
