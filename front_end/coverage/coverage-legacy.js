// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CoverageModule from './coverage.js';

self.Coverage = self.Coverage || {};
Coverage = Coverage || {};

/**
 * @constructor
 */
Coverage.CoverageDecorationManager = CoverageModule.CoverageDecorationManager.CoverageDecorationManager;

/**
 * @constructor
 */
Coverage.CoverageListView = CoverageModule.CoverageListView.CoverageListView;

/**
 * @constructor
 */
Coverage.CoverageModel = CoverageModule.CoverageModel.CoverageModel;

/** @enum {symbol} */
Coverage.CoverageModel.Events = CoverageModule.CoverageModel.Events;

/**
 * @enum {number}
 */
Coverage.CoverageType = CoverageModule.CoverageModel.CoverageType;

/**
 * @constructor
 */
Coverage.URLCoverageInfo = CoverageModule.CoverageModel.URLCoverageInfo;

/**
 * @constructor
 */
Coverage.CoverageInfo = CoverageModule.CoverageModel.CoverageInfo;

/**
 * @constructor
 */
Coverage.CoverageView = CoverageModule.CoverageView.CoverageView;

/**
 * @constructor
 */
Coverage.CoverageView.LineDecorator = CoverageModule.CoverageView.LineDecorator;

/**
 * @constructor
 */
Coverage.CoverageView.ActionDelegate = CoverageModule.CoverageView.ActionDelegate;

/**
 * @typedef {!{
 *    id: string,
 *    contentProvider: !Common.ContentProvider,
 *    line: number,
 *    column: number
 * }}
 */
Coverage.RawLocation;

// Copyright (c) 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/** @typedef {{startOffset: number, endOffset: number, count: number}} */
Coverage.RangeUseCount;

/** @typedef {{end: number, count: (number|undefined)}} */
Coverage.CoverageSegment;
