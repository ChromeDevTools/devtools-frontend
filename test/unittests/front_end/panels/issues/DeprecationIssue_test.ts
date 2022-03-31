// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as IssuesManager from '../../../../../front_end/models/issues_manager/issues_manager.js';
import type * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import {MockIssuesModel} from '../../models/issues_manager/MockIssuesModel.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import {describeWithLocale} from '../../helpers/EnvironmentHelpers.js';

describeWithLocale('DeprecationIssue', async () => {
  const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;

  function createDeprecationIssueDetails(
      message: string, deprecationType: string,
      type: Protocol.Audits.DeprecationIssueType): Protocol.Audits.InspectorIssue {
    return {
      code: Protocol.Audits.InspectorIssueCode.DeprecationIssue,
      details: {
        deprecationIssueDetails: {
          sourceCodeLocation: {
            url: 'empty.html',
            lineNumber: 1,
            columnNumber: 1,
          },
          message,
          deprecationType,
          type,
        },
      },
    };
  }

  it('deprecation issue with good translated details works', () => {
    const details = createDeprecationIssueDetails('', '', Protocol.Audits.DeprecationIssueType.DeprecationExample);
    const issue = IssuesManager.DeprecationIssue.DeprecationIssue.fromInspectorIssue(mockModel, details);
    assert.isNotEmpty(issue);
  });

  it('deprecation issue with bad translated details fails', () => {
    const details =
        createDeprecationIssueDetails('Test', 'Test', Protocol.Audits.DeprecationIssueType.DeprecationExample);
    const issue = IssuesManager.DeprecationIssue.DeprecationIssue.fromInspectorIssue(mockModel, details);
    assert.isEmpty(issue);
  });

  it('deprecation issue with good untranslated details works', () => {
    const details = createDeprecationIssueDetails('Test', 'Test', Protocol.Audits.DeprecationIssueType.Untranslated);
    const issue = IssuesManager.DeprecationIssue.DeprecationIssue.fromInspectorIssue(mockModel, details);
    assert.isNotEmpty(issue);
  });

  it('deprecation issue with bad untranslated details fails', () => {
    const details = createDeprecationIssueDetails('', '', Protocol.Audits.DeprecationIssueType.Untranslated);
    const issue = IssuesManager.DeprecationIssue.DeprecationIssue.fromInspectorIssue(mockModel, details);
    assert.isEmpty(issue);
  });
});
