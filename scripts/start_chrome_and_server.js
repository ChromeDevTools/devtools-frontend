// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var childProcess = require("child_process");
var path = require("path");

childProcess.fork(path.join(__dirname, "chrome_debug_launcher/launch_chrome.js"));
childProcess.fork(path.join(__dirname, "hosted_mode/server.js"));
