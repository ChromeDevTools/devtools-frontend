// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file is intentionally left empty, as cm_web_modes needs to both operate
// on cm_headless and cm. We can't know statically which file to import.
// Instead, if you need to depend on cm_web_modes, you need to import either
// cm_web_modes_cm.js or cm_web_modes_headless.js
export default {}
