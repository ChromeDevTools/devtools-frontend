// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {number} timeout
 */
WebInspector.Throttler = function(timeout)
{
    this._timeout = timeout;
    this._isRunningProcess = false;
    this._asSoonAsPossible = false;
    /** @type {?function():(!Promise.<?>)} */
    this._process = null;
    this._lastCompleteTime = 0;
};

WebInspector.Throttler.prototype = {
    _processCompleted: function()
    {
        this._lastCompleteTime = window.performance.now();
        this._isRunningProcess = false;
        if (this._process)
            this._innerSchedule(false);
        this._processCompletedForTests();
    },

    _processCompletedForTests: function()
    {
        // For sniffing in tests.
    },

    _onTimeout: function()
    {
        delete this._processTimeout;
        this._asSoonAsPossible = false;
        this._isRunningProcess = true;

        Promise.resolve()
            .then(this._process)
            .catch(console.error.bind(console))
            .then(this._processCompleted.bind(this));
        this._process = null;
    },

    /**
     * @param {function():(!Promise.<?>)} process
     * @param {boolean=} asSoonAsPossible
     */
    schedule: function(process, asSoonAsPossible)
    {
        // Deliberately skip previous process.
        this._process = process;

        // Run the first scheduled task instantly.
        var hasScheduledTasks = !!this._processTimeout || this._isRunningProcess;
        var okToFire = window.performance.now() - this._lastCompleteTime > this._timeout;
        asSoonAsPossible = !!asSoonAsPossible || (!hasScheduledTasks && okToFire);

        var forceTimerUpdate = asSoonAsPossible && !this._asSoonAsPossible;
        this._asSoonAsPossible = this._asSoonAsPossible || asSoonAsPossible;

        this._innerSchedule(forceTimerUpdate);
    },

    flush: function()
    {
        if (this._process)
            this._onTimeout();
    },

    /**
     * @param {boolean} forceTimerUpdate
     */
    _innerSchedule: function(forceTimerUpdate)
    {
        if (this._isRunningProcess)
            return;
        if (this._processTimeout && !forceTimerUpdate)
            return;
        if (this._processTimeout)
            this._clearTimeout(this._processTimeout);

        var timeout = this._asSoonAsPossible ? 0 : this._timeout;
        this._processTimeout = this._setTimeout(this._onTimeout.bind(this), timeout);
    },

    /**
     *  @param {number} timeoutId
     */
    _clearTimeout: function(timeoutId)
    {
        clearTimeout(timeoutId);
    },

    /**
     * @param {function()} operation
     * @param {number} timeout
     * @return {number}
     */
    _setTimeout: function(operation, timeout)
    {
        return setTimeout(operation, timeout);
    }
};

/** @typedef {function(!Error=)} */
WebInspector.Throttler.FinishCallback;
