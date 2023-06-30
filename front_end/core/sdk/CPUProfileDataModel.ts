// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CPUProfile from '../../models/cpu_profile/cpu_profile.js';

// This is a temporary approach to prevent Profiler panel layout tests
// failures. These tests depend on this class being defined under SDK.
// However in order to use this library in the reconciled performance
// panel, we have extracted it out to models/. Given that the profiler
// panel is deprecated and it (and its tests) will be removed soon,
// these tests are not ported to unit tests, instead we use this
// workaround to prevent failures. Once the panel is gone, this file can
// be removed.
// TODO(crbug.com/1354548): remove this file once the Profiler Panel
// and its tests are removed.
export class CPUProfileDataModel extends CPUProfile.CPUProfileDataModel.CPUProfileDataModel {}
