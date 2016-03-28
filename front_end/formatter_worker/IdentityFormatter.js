// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.FormattedContentBuilder} builder
 */
WebInspector.IdentityFormatter = function(builder)
{
    this._builder = builder;
}

WebInspector.IdentityFormatter.prototype = {
    /**
     * @param {string} text
     * @param {!Array<number>} lineEndings
     * @param {number} fromOffset
     * @param {number} toOffset
     */
    format: function(text, lineEndings, fromOffset, toOffset)
    {
        var content = text.substring(fromOffset, toOffset);
        this._builder.addToken(content, fromOffset);
    }
}

