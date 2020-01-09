// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as HARImporterModule from './har_importer.js';

self.HARImporter = self.HARImporter || {};
HARImporter = HARImporter || {};

/**
 * @constructor
 */
HARImporter.HARRoot = HARImporterModule.HARFormat.HARRoot;

/**
 * @constructor
 */
HARImporter.HARLog = HARImporterModule.HARFormat.HARLog;

/**
 * @constructor
 */
HARImporter.HARPage = HARImporterModule.HARFormat.HARPage;

/**
 * @constructor
 */
HARImporter.HAREntry = HARImporterModule.HARFormat.HAREntry;

/**
 * @constructor
 */
HARImporter.HARParam = HARImporterModule.HARFormat.HARParam;

/**
 * @constructor
 */
HARImporter.HARTimings = HARImporterModule.HARFormat.HARTimings;

/**
 * @constructor
 */
HARImporter.HARInitiator = HARImporterModule.HARFormat.HARInitiator;

/**
 * @constructor
 */
HARImporter.Importer = HARImporterModule.HARImporter.Importer;
