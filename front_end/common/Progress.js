/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @interface
 * @extends {WebInspector.EventTarget}
 */
WebInspector.Progress = function()
{
}

WebInspector.Progress.Events = {
    Canceled: "Canceled",
    Done: "Done"
}

WebInspector.Progress.prototype = {
    /**
     * @param {number} totalWork
     */
    setTotalWork: function(totalWork) { },

    /**
     * @param {string} title
     */
    setTitle: function(title) { },

    /**
     * @param {number} worked
     * @param {string=} title
     */
    setWorked: function(worked, title) { },

    /**
     * @param {number=} worked
     */
    worked: function(worked) { },

    done: function() { },

    /**
     * @return {boolean}
     */
    isCanceled: function() { return false; },

    /**
     * @param {string} eventType
     * @param {function(!WebInspector.Event)} listener
     * @param {!Object=} thisObject
     */
    addEventListener: function(eventType, listener, thisObject) { }
}

/**
 * @constructor
 * @param {!WebInspector.Progress} parent
 * @extends {WebInspector.Object}
 */
WebInspector.CompositeProgress = function(parent)
{
    this._parent = parent;
    this._children = [];
    this._childrenDone = 0;
    this._parent.setTotalWork(1);
    this._parent.setWorked(0);
    // FIXME: there should be no "progress events"
    parent.addEventListener(WebInspector.Progress.Events.Canceled, this._parentCanceled.bind(this));
}

WebInspector.CompositeProgress.prototype = {
    _childDone: function()
    {
        if (++this._childrenDone !== this._children.length)
            return;
        this.dispatchEventToListeners(WebInspector.Progress.Events.Done);
        this._parent.done();
    },

    _parentCanceled: function()
    {
        // FIXME: there should be no "progress events"
        this.dispatchEventToListeners(WebInspector.Progress.Events.Canceled);
        for (var i = 0; i < this._children.length; ++i) {
            this._children[i].dispatchEventToListeners(WebInspector.Progress.Events.Canceled);
        }
    },

    /**
     * @param {number=} weight
     * @return {!WebInspector.SubProgress}
     */
    createSubProgress: function(weight)
    {
        var child = new WebInspector.SubProgress(this, weight);
        this._children.push(child);
        return child;
    },

    _update: function()
    {
        var totalWeights = 0;
        var done = 0;

        for (var i = 0; i < this._children.length; ++i) {
            var child = this._children[i];
            if (child._totalWork)
                done += child._weight * child._worked / child._totalWork;
            totalWeights += child._weight;
        }
        this._parent.setWorked(done / totalWeights);
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @implements {WebInspector.Progress}
 * @extends {WebInspector.Object}
 * @param {!WebInspector.CompositeProgress} composite
 * @param {number=} weight
 */
WebInspector.SubProgress = function(composite, weight)
{
    this._composite = composite;
    this._weight = weight || 1;
    this._worked = 0;
}

WebInspector.SubProgress.prototype = {
    /**
     * @override
     * @return {boolean}
     */
    isCanceled: function()
    {
        return this._composite._parent.isCanceled();
    },

    /**
     * @override
     * @param {string} title
     */
    setTitle: function(title)
    {
        this._composite._parent.setTitle(title);
    },

    /**
     * @override
     */
    done: function()
    {
        this.setWorked(this._totalWork);
        this._composite._childDone();
        // FIXME: there should be no "progress events"
        this.dispatchEventToListeners(WebInspector.Progress.Events.Done);
    },

    /**
     * @override
     * @param {number} totalWork
     */
    setTotalWork: function(totalWork)
    {
        this._totalWork = totalWork;
        this._composite._update();
    },

    /**
     * @override
     * @param {number} worked
     * @param {string=} title
     */
    setWorked: function(worked, title)
    {
        this._worked = worked;
        if (typeof title !== "undefined")
            this.setTitle(title);
        this._composite._update();
    },

    /**
     * @override
     * @param {number=} worked
     */
    worked: function(worked)
    {
        this.setWorked(this._worked + (worked || 1));
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @extends {WebInspector.Object}
 * @implements {WebInspector.Progress}
 */
WebInspector.ProgressStub = function()
{
}

WebInspector.ProgressStub.prototype = {
    /**
     * @override
     * @return {boolean}
     */
    isCanceled: function()
    {
        return false;
    },

    /**
     * @override
     * @param {string} title
     */
    setTitle: function(title)
    {
    },

    /**
     * @override
     */
    done: function()
    {
    },

    /**
     * @override
     * @param {number} totalWork
     */
    setTotalWork: function(totalWork)
    {
    },

    /**
     * @override
     * @param {number} worked
     * @param {string=} title
     */
    setWorked: function(worked, title)
    {
    },

    /**
     * @override
     * @param {number=} worked
     */
    worked: function(worked)
    {
    },

    __proto__: WebInspector.Object.prototype
}
