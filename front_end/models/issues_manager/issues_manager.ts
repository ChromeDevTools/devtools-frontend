// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ContrastCheckTrigger from './ContrastCheckTrigger.js';
import * as IssuesManager from './IssuesManager.js';
import * as RelatedIssue from './RelatedIssue.js';
import * as SourceFrameIssuesManager from './SourceFrameIssuesManager.js';

// We need to force creation of the IssueManager early to make sure no issues are missed.
IssuesManager.IssuesManager.instance();
// Force creation of ContrastCheckTrigger early so that contrast issues are reported
// as soon as possible without dependencies on any UI.
ContrastCheckTrigger.ContrastCheckTrigger.instance();

export {IssuesManager, RelatedIssue, SourceFrameIssuesManager};
