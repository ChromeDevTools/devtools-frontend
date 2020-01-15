// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ServicesModule from './services.js';

self.Services = self.Services || {};
Services = Services || {};

/** @constructor */
Services.ServiceManager = ServicesModule.ServiceManager.ServiceManager;

/** @constructor */
Services.ServiceManager.Service = ServicesModule.ServiceManager.Service;

Services.serviceManager = ServicesModule.serviceManager;
