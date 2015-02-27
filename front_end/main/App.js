// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @interface
 */
WebInspector.App = function()
{
};

WebInspector.App.prototype = {
    /**
     * @param {!Document} document
     */
    presentUI: function(document)
    {
    }
};

/**
 * @type {!WebInspector.App}
 */
WebInspector.app;
