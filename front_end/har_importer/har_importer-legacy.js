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
HARImporter.Importer = HARImporterModule.HARImporter.Importer;
