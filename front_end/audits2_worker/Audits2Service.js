// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {Service}
 */
function Audits2Service()
{
}

Audits2Service.prototype = {
    /**
     * @return {!Promise}
     */
    start: function()
    {
        console.error("WORKER START");
        return Promise.resolve();
    },

    /**
     * @return {!Promise}
     */
    stop: function()
    {
        console.error("WORKER STOP");
        return Promise.resolve();
    },

    /**
     * @override
     */
    dispose: function()
    {
        console.error("WORKER DISPOSE");
    }
}

initializeWorkerService("Audits2Service", Audits2Service);
