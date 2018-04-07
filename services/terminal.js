// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var pty = require("pty.js");

function Terminal(notify)
{
    this._notify = notify;
}

Terminal.prototype = {
    init: function(params)
    {
        this._term = pty.spawn(process.platform === "win32" ? "cmd.exe" : "bash", [], {
            name: "xterm-color",
            cols: params.cols || 80,
            rows: params.rows || 24,
            cwd: process.env.PWD,
            env: process.env
        });

        this._term.on("data", data => {
            if (this._notify)
                this._notify("data", { data: data });
        });
        return Promise.resolve({});
    },

    resize: function(params)
    {
        if (this._term)
            this._term.resize(params.cols, params.rows);
        return Promise.resolve({});
    },

    write: function(params)
    {
        this._term.write(params.data);
        return Promise.resolve({});
    },

    dispose: function(params)
    {
        this._notify = null;
        if (this._term)
            process.kill(this._term.pid);
        return Promise.resolve({});
    },
}

exports.Terminal = Terminal;
