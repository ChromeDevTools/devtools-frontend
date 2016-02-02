// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.BlackboxManager = function()
{
    WebInspector.targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.ParsedScriptSource, this._parsedScriptSource, this);
    WebInspector.moduleSetting("skipStackFramesPattern").addChangeListener(this._patternChanged.bind(this));
    WebInspector.moduleSetting("skipContentScripts").addChangeListener(this._patternChanged.bind(this));
}

WebInspector.BlackboxManager.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _parsedScriptSource: function(event)
    {
        var script = /** @type {!WebInspector.Script} */ (event.data);
        this._blackboxScriptIfNeeded(script);
    },

    _patternChanged: function()
    {
        for (var debuggerModel of WebInspector.DebuggerModel.instances()) {
            for (var scriptId in debuggerModel.scripts)
                this._blackboxScriptIfNeeded(debuggerModel.scripts[scriptId]);
        }
    },

    /**
     * @param {!WebInspector.Script} script
     */
    _blackboxScriptIfNeeded: function(script)
    {
        if (WebInspector.BlackboxSupport.isBlackboxed(script.sourceURL, script.isContentScript()))
            script.setBlackboxedRanges([ { line: 0, column: 0 } ]);
        else
            script.setBlackboxedRanges([]);
    }
}

WebInspector.BlackboxSupport = {}

/**
 * @param {string} url
 * @return {string}
 */
WebInspector.BlackboxSupport._urlToRegExpString = function(url)
{
    var parsedURL = new WebInspector.ParsedURL(url);
    if (parsedURL.isAboutBlank() || parsedURL.isDataURL())
        return "";
    if (!parsedURL.isValid)
        return "^" + url.escapeForRegExp() + "$";
    var name = parsedURL.lastPathComponent;
    if (name)
        name = "/" + name;
    else if (parsedURL.folderPathComponents)
        name = parsedURL.folderPathComponents + "/";
    if (!name)
        name = parsedURL.host;
    if (!name)
        return "";
    var scheme = parsedURL.scheme;
    var prefix = "";
    if (scheme && scheme !== "http" && scheme !== "https") {
        prefix = "^" + scheme + "://";
        if (scheme === "chrome-extension")
            prefix += parsedURL.host + "\\b";
        prefix += ".*";
    }
    return prefix + name.escapeForRegExp() + (url.endsWith(name) ? "$" : "\\b");
}

/**
 * @param {string} url
 * @return {boolean}
 */
WebInspector.BlackboxSupport.canBlackboxURL = function(url)
{
    return !!WebInspector.BlackboxSupport._urlToRegExpString(url);
}

/**
 * @param {string} url
 */
WebInspector.BlackboxSupport.blackboxURL = function(url)
{
    var regexPatterns = WebInspector.moduleSetting("skipStackFramesPattern").getAsArray();
    var regexValue = WebInspector.BlackboxSupport._urlToRegExpString(url);
    if (!regexValue)
        return;
    var found = false;
    for (var i = 0; i < regexPatterns.length; ++i) {
        var item = regexPatterns[i];
        if (item.pattern === regexValue) {
            item.disabled = false;
            found = true;
            break;
        }
    }
    if (!found)
        regexPatterns.push({ pattern: regexValue });
    WebInspector.moduleSetting("skipStackFramesPattern").setAsArray(regexPatterns);
}

/**
 * @param {string} url
 * @param {boolean} isContentScript
 */
WebInspector.BlackboxSupport.unblackbox = function(url, isContentScript)
{
    if (isContentScript)
        WebInspector.moduleSetting("skipContentScripts").set(false);

    var regexPatterns = WebInspector.moduleSetting("skipStackFramesPattern").getAsArray();
    var regexValue = WebInspector.BlackboxSupport._urlToRegExpString(url);
    if (!regexValue)
        return;
    regexPatterns = regexPatterns.filter(function(item) {
        return item.pattern !== regexValue;
    });
    for (var i = 0; i < regexPatterns.length; ++i) {
        var item = regexPatterns[i];
        if (item.disabled)
            continue;
        try {
            var regex = new RegExp(item.pattern);
            if (regex.test(url))
                item.disabled = true;
        } catch (e) {
        }
    }
    WebInspector.moduleSetting("skipStackFramesPattern").setAsArray(regexPatterns);
}

/**
 * @param {string} url
 * @return {boolean}
 */
WebInspector.BlackboxSupport.isBlackboxedURL = function(url)
{
    var regex = WebInspector.moduleSetting("skipStackFramesPattern").asRegExp();
    return regex && regex.test(url);
}

/**
 * @param {string} url
 * @param {boolean} isContentScript
 * @return {boolean}
 */
WebInspector.BlackboxSupport.isBlackboxed = function(url, isContentScript)
{
    if (isContentScript && WebInspector.moduleSetting("skipContentScripts").get())
        return true;
    return WebInspector.BlackboxSupport.isBlackboxedURL(url);
}

/**
 * @param {function(!WebInspector.Event)} listener
 * @param {!Object=} thisObject
 */
WebInspector.BlackboxSupport.addChangeListener = function(listener, thisObject)
{
    WebInspector.moduleSetting("skipStackFramesPattern").addChangeListener(listener, thisObject);
}

/**
 * @param {function(!WebInspector.Event)} listener
 * @param {!Object=} thisObject
 */
WebInspector.BlackboxSupport.removeChangeListener = function(listener, thisObject)
{
    WebInspector.moduleSetting("skipStackFramesPattern").removeChangeListener(listener, thisObject);
}
