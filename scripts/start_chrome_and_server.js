// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var childProcess = require('child_process');
var path = require('path');

var chrome = childProcess.fork(path.join(__dirname, 'chrome_debug_launcher/launch_chrome.js'), process.argv.slice(2));
var server = childProcess.fork(path.join(__dirname, 'hosted_mode/server.js'));

chrome.on('exit', function() {
  server.kill();
});
