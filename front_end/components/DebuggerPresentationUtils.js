// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

WebInspector.DebuggerPresentationUtils = {}

/**
 * @param {?WebInspector.DebuggerModel} debuggerModel
 * @param {!RuntimeAgent.StackTrace=} stackTrace
 * @param {boolean=} showBlackboxed
 * @return {?RuntimeAgent.CallFrame}
 */
WebInspector.DebuggerPresentationUtils.callFrameAnchorFromStackTrace = function(debuggerModel, stackTrace, showBlackboxed)
{
    /**
     * @param {!Array.<!RuntimeAgent.CallFrame>} callFrames
     * @return {?RuntimeAgent.CallFrame}
     */
    function innerCallFrameAnchorFromStackTrace(callFrames)
    {
        if (!callFrames.length)
            return null;
        if (showBlackboxed)
            return callFrames[0];
        for (var i = 0; i < callFrames.length; ++i) {
            var script = debuggerModel && debuggerModel.scriptForId(callFrames[i].scriptId);
            var blackboxed = script ?
                WebInspector.BlackboxSupport.isBlackboxed(script.sourceURL, script.isContentScript()) :
                WebInspector.BlackboxSupport.isBlackboxedURL(callFrames[i].url);
            if (!blackboxed)
                return callFrames[i];
        }
        return null;
    }

    var asyncStackTrace = stackTrace;
    while (asyncStackTrace) {
        var callFrame = innerCallFrameAnchorFromStackTrace(asyncStackTrace.callFrames);
        if (callFrame)
            return callFrame;
        asyncStackTrace = asyncStackTrace.parent;
    }
    return stackTrace && stackTrace.callFrames.length ? stackTrace.callFrames[0] : null;
}
