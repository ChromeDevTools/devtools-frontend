// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.ASTService = function()
{
    this._sassInitPromise = self.runtime.instancePromise(WebInspector.TokenizerFactory);
    this._terminated = false;
}

WebInspector.ASTService.prototype = {
    /**
     * @param {string} url
     * @param {string} text
     * @return {!Promise<!WebInspector.SASSSupport.AST>}
     */
    parseCSS: function(url, text)
    {
        console.assert(!this._terminated, "Illegal call parseCSS on terminated ASTService.");
        return WebInspector.SASSSupport.parseCSS(url, text);
    },

    /**
     * @param {string} url
     * @param {string} text
     * @return {!Promise<!WebInspector.SASSSupport.AST>}
     */
    parseSCSS: function(url, text)
    {
        console.assert(!this._terminated, "Illegal call parseSCSS on terminated ASTService.");
        return this._sassInitPromise.then(tokenizer => WebInspector.SASSSupport.parseSCSS(tokenizer, url, text));
    },
}
