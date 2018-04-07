// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var dispatcher = require("./dispatcher.js");
var terminal = require("./terminal.js");

var d = new dispatcher.Dispatcher();
d.registerObject("Terminal", terminal.Terminal);
d.start(9022);

console.log("Run chrome as `chrome --devtools-flags='service-backend=ws://localhost:9022/endpoint'`");
