// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.RequestAppBannerActionDelegate = function()
{
}

WebInspector.RequestAppBannerActionDelegate.prototype = {
    /**
     * @override
     * @param {!WebInspector.Context} context
     * @param {string} actionId
     * @return {boolean}
     */
    handleAction: function(context, actionId)
    {
        var target = WebInspector.targetManager.mainTarget();
        if (target && target.isPage()) {
            target.pageAgent().requestAppBanner();
            WebInspector.console.show();
        }
        return true;
    }
}
