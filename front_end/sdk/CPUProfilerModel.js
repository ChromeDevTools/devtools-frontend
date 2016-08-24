/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * 1. Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY GOOGLE INC. AND ITS CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GOOGLE INC.
 * OR ITS CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.SDKModel}
 * @param {!WebInspector.Target} target
 * @implements {ProfilerAgent.Dispatcher}
 */
WebInspector.CPUProfilerModel = function(target)
{
    WebInspector.SDKModel.call(this, WebInspector.CPUProfilerModel, target);
    this._isRecording = false;
    target.registerProfilerDispatcher(this);
    target.profilerAgent().enable();

    this._configureCpuProfilerSamplingInterval();
    WebInspector.moduleSetting("highResolutionCpuProfiling").addChangeListener(this._configureCpuProfilerSamplingInterval, this);
}

/** @enum {symbol} */
WebInspector.CPUProfilerModel.Events = {
    ConsoleProfileStarted: Symbol("ConsoleProfileStarted"),
    ConsoleProfileFinished: Symbol("ConsoleProfileFinished")
};

/** @typedef {!{id: string, scriptLocation: !WebInspector.DebuggerModel.Location, title: (string|undefined), cpuProfile: (!ProfilerAgent.Profile|undefined)}} */
WebInspector.CPUProfilerModel.EventData;

WebInspector.CPUProfilerModel.prototype = {
    _configureCpuProfilerSamplingInterval: function()
    {
        var intervalUs = WebInspector.moduleSetting("highResolutionCpuProfiling").get() ? 100 : 1000;
        this.target().profilerAgent().setSamplingInterval(intervalUs);
    },

    /**
     * @override
     * @param {string} id
     * @param {!DebuggerAgent.Location} scriptLocation
     * @param {string=} title
     */
    consoleProfileStarted: function(id, scriptLocation, title)
    {
        this._dispatchProfileEvent(WebInspector.CPUProfilerModel.Events.ConsoleProfileStarted, id, scriptLocation, title);
    },

    /**
     * @override
     * @param {string} id
     * @param {!DebuggerAgent.Location} scriptLocation
     * @param {!ProfilerAgent.Profile} cpuProfile
     * @param {string=} title
     */
    consoleProfileFinished: function(id, scriptLocation, cpuProfile, title)
    {
        this._dispatchProfileEvent(WebInspector.CPUProfilerModel.Events.ConsoleProfileFinished, id, scriptLocation, title, cpuProfile);
    },

    /**
     * @param {symbol} eventName
     * @param {string} id
     * @param {!DebuggerAgent.Location} scriptLocation
     * @param {string=} title
     * @param {!ProfilerAgent.Profile=} cpuProfile
     */
    _dispatchProfileEvent: function(eventName, id, scriptLocation, title, cpuProfile)
    {
        // Make sure ProfilesPanel is initialized and CPUProfileType is created.
        self.runtime.loadModulePromise("profiler").then(_ => {
            var debuggerModel = /** @type {!WebInspector.DebuggerModel} */ (WebInspector.DebuggerModel.fromTarget(this.target()));
            var debuggerLocation = WebInspector.DebuggerModel.Location.fromPayload(debuggerModel, scriptLocation);
            var globalId = this.target().id() + "." + id;
            var data = /** @type {!WebInspector.CPUProfilerModel.EventData} */ ({id: globalId, scriptLocation: debuggerLocation, cpuProfile: cpuProfile, title: title});
            this.dispatchEventToListeners(eventName, data);
        });
    },

    /**
      * @return {boolean}
      */
    isRecordingProfile: function()
    {
        return this._isRecording;
    },

    startRecording: function()
    {
        this._isRecording = true;
        this.target().profilerAgent().start();
        WebInspector.userMetrics.actionTaken(WebInspector.UserMetrics.Action.ProfilesCPUProfileTaken);
    },

    /**
     * @return {!Promise.<?ProfilerAgent.Profile>}
     */
    stopRecording: function()
    {
        /**
         * @param {?Protocol.Error} error
         * @param {?ProfilerAgent.Profile} profile
         * @return {?ProfilerAgent.Profile}
         */
        function extractProfile(error, profile)
        {
            return !error && profile ? profile : null;
        }
        this._isRecording = false;
        return this.target().profilerAgent().stop(extractProfile);
    },

    dispose: function()
    {
        WebInspector.moduleSetting("highResolutionCpuProfiling").removeChangeListener(this._configureCpuProfilerSamplingInterval, this);
    },

    __proto__: WebInspector.SDKModel.prototype
}
