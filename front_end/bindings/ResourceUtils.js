/*
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2007 Matt Lilek (pewtermoose@gmail.com).
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @param {string} url
 * @return {?WebInspector.Resource}
 */
WebInspector.resourceForURL = function(url)
{
    var targets = WebInspector.targetManager.targets(WebInspector.Target.Capability.DOM);
    for (var i = 0; i < targets.length; ++i) {
        var resource = WebInspector.ResourceTreeModel.fromTarget(targets[i]).resourceForURL(url);
        if (resource)
            return resource;
    }
    return null;
};

/**
 * @param {function(!WebInspector.Resource)} callback
 */
WebInspector.forAllResources = function(callback)
{
    var targets = WebInspector.targetManager.targets(WebInspector.Target.Capability.DOM);
    for (var i = 0; i < targets.length; ++i)
        WebInspector.ResourceTreeModel.fromTarget(targets[i]).forAllResources(callback);
};

/**
 * @param {string} url
 * @return {string}
 */
WebInspector.displayNameForURL = function(url)
{
    if (!url)
        return "";

    var resource = WebInspector.resourceForURL(url);
    if (resource)
        return resource.displayName;

    var uiSourceCode = WebInspector.networkMapping.uiSourceCodeForURLForAnyTarget(url);
    if (uiSourceCode)
        return uiSourceCode.displayName();

    var mainTarget = WebInspector.targetManager.mainTarget();
    var inspectedURL = mainTarget && mainTarget.inspectedURL();
    if (!inspectedURL)
        return url.trimURL("");

    var parsedURL = inspectedURL.asParsedURL();
    var lastPathComponent = parsedURL ? parsedURL.lastPathComponent : parsedURL;
    var index = inspectedURL.indexOf(lastPathComponent);
    if (index !== -1 && index + lastPathComponent.length === inspectedURL.length) {
        var baseURL = inspectedURL.substring(0, index);
        if (url.startsWith(baseURL))
            return url.substring(index);
    }

    if (!parsedURL)
        return url;

    var displayName = url.trimURL(parsedURL.host);
    return displayName === "/" ? parsedURL.host + "/" : displayName;
};
