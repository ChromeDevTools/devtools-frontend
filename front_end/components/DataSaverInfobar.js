// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.Infobar}
 */
WebInspector.DataSaverInfobar = function()
{
    WebInspector.Infobar.call(this, WebInspector.Infobar.Type.Warning, WebInspector.UIString("Consider disabling Chrome Data Saver while debugging."), WebInspector.settings.moduleSetting("disableDataSaverInfobar"));
    var message = this.createDetailsRowMessage();
    message.createTextChild("More information about  ");
    message.appendChild(WebInspector.linkifyURLAsNode("https://support.google.com/chrome/answer/2392284?hl=en", "Chrome Data Saver", undefined, true));
    message.createTextChild(".");
}

WebInspector.DataSaverInfobar._infobars = [];

/**
 * @param {!WebInspector.Panel} panel
 */
WebInspector.DataSaverInfobar.maybeShowInPanel = function(panel)
{
    if (Runtime.queryParam("remoteFrontend")) {
        var infobar = new WebInspector.DataSaverInfobar();
        WebInspector.DataSaverInfobar._infobars.push(infobar);
        panel.showInfobar(infobar);
    }
}

WebInspector.DataSaverInfobar.prototype = {
    /**
     * @override
     */
    dispose: function()
    {
        for (var infobar of WebInspector.DataSaverInfobar._infobars)
            WebInspector.Infobar.prototype.dispose.call(infobar);
    },

    __proto__: WebInspector.Infobar.prototype
}
