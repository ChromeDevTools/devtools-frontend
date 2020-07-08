// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as IssuesManager from './IssuesManager.js';
import * as LogManager from './LogManager.js';
import * as RelatedIssue from './RelatedIssue.js';

export const logManager = new LogManager.LogManager();
// We need to force creation of the IssueManager early to make sure no issues are missed.
IssuesManager.IssuesManager.instance();

export {LogManager, IssuesManager, RelatedIssue};
