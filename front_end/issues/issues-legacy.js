// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as IssuesModule from './issues.js';

self.Issues = self.Issues || {};
Issues = Issues || {};

/**
 * @constructor
 */
Issues.IssuesPane = IssuesModule.IssuesPane.IssuesPaneImpl;

Issues.IssueRevealer = IssuesModule.IssueRevealer.IssueRevealer;
