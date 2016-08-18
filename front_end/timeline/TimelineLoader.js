// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.OutputStream}
 * @implements {WebInspector.OutputStreamDelegate}
 * @param {!WebInspector.TracingModel} model
 * @param {!WebInspector.TimelineLifecycleDelegate} delegate
 */
WebInspector.TimelineLoader = function(model, delegate)
{
    this._model = model;
    this._delegate = delegate;

    /** @type {?function()} */
    this._canceledCallback = null;

    this._state = WebInspector.TimelineLoader.State.Initial;
    this._buffer = "";
    this._firstChunk = true;

    this._loadedBytes = 0;
    /** @type {number} */
    this._totalSize;
    this._jsonTokenizer = new WebInspector.TextUtils.BalancedJSONTokenizer(this._writeBalancedJSON.bind(this), true);
}

/**
 * @param {!WebInspector.TracingModel} model
 * @param {!File} file
 * @param {!WebInspector.TimelineLifecycleDelegate} delegate
 * @return {!WebInspector.TimelineLoader}
 */
WebInspector.TimelineLoader.loadFromFile = function(model, file, delegate)
{
    var loader = new WebInspector.TimelineLoader(model, delegate);
    var fileReader = WebInspector.TimelineLoader._createFileReader(file, loader);
    loader._canceledCallback = fileReader.cancel.bind(fileReader);
    loader._totalSize = file.size;
    fileReader.start(loader);
    return loader;
}

/**
 * @param {!WebInspector.TracingModel} model
 * @param {string} url
 * @param {!WebInspector.TimelineLifecycleDelegate} delegate
 * @return {!WebInspector.TimelineLoader}
 */
WebInspector.TimelineLoader.loadFromURL = function(model, url, delegate)
{
    var stream = new WebInspector.TimelineLoader(model, delegate);
    WebInspector.ResourceLoader.loadAsStream(url, null, stream);
    return stream;
}

WebInspector.TimelineLoader.TransferChunkLengthBytes = 5000000;

/**
 * @param {!File} file
 * @param {!WebInspector.OutputStreamDelegate} delegate
 * @return {!WebInspector.ChunkedReader}
 */
WebInspector.TimelineLoader._createFileReader = function(file, delegate)
{
    return new WebInspector.ChunkedFileReader(file, WebInspector.TimelineLoader.TransferChunkLengthBytes, delegate);
}

/**
 * @enum {symbol}
 */
WebInspector.TimelineLoader.State = {
    Initial: Symbol("Initial"),
    LookingForEvents: Symbol("LookingForEvents"),
    ReadingEvents: Symbol("ReadingEvents"),
    SkippingTail: Symbol("SkippingTail")
}

WebInspector.TimelineLoader.prototype = {
    cancel: function()
    {
        this._model.reset();
        this._delegate.loadingComplete(false);
        this._delegate = null;
        if (this._canceledCallback)
            this._canceledCallback();
    },

    /**
     * @override
     * @param {string} chunk
     */
    write: function(chunk)
    {
        if (!this._delegate)
            return;
        this._loadedBytes += chunk.length;
        if (!this._firstChunk)
            this._delegate.loadingProgress(this._totalSize ? this._loadedBytes / this._totalSize : undefined);

        if (this._state === WebInspector.TimelineLoader.State.Initial) {
            if (chunk[0] === "{")
                this._state = WebInspector.TimelineLoader.State.LookingForEvents;
            else if (chunk[0] === "[")
                this._state = WebInspector.TimelineLoader.State.ReadingEvents;
            else {
                this._reportErrorAndCancelLoading(WebInspector.UIString("Malformed timeline data: Unknown JSON format"));
                return;
            }
        }

        if (this._state === WebInspector.TimelineLoader.State.LookingForEvents) {
            var objectName = "\"traceEvents\":";
            var startPos = this._buffer.length - objectName.length;
            this._buffer += chunk;
            var pos = this._buffer.indexOf(objectName, startPos);
            if (pos === -1)
                return;
            chunk = this._buffer.slice(pos + objectName.length)
            this._state = WebInspector.TimelineLoader.State.ReadingEvents;
        }

        if (this._state !== WebInspector.TimelineLoader.State.ReadingEvents)
            return;
        if (this._jsonTokenizer.write(chunk))
            return;
        this._state = WebInspector.TimelineLoader.State.SkippingTail;
        if (this._firstChunk) {
            this._reportErrorAndCancelLoading(WebInspector.UIString("Malformed timeline input, wrong JSON brackets balance"));
            return;
        }
    },

    /**
     * @param {string} data
     */
    _writeBalancedJSON: function(data)
    {
        var json = data + "]";

        if (this._firstChunk) {
            this._delegate.loadingStarted();
        } else {
            var commaIndex = json.indexOf(",");
            if (commaIndex !== -1)
                json = json.slice(commaIndex + 1);
            json = "[" + json;
        }

        var items;
        try {
            items = /** @type {!Array.<!WebInspector.TracingManager.EventPayload>} */ (JSON.parse(json));
        } catch (e) {
            this._reportErrorAndCancelLoading(WebInspector.UIString("Malformed timeline data: %s", e.toString()));
            return;
        }

        if (this._firstChunk) {
            this._firstChunk = false;
            this._model.reset();
            if (this._looksLikeAppVersion(items[0])) {
                this._reportErrorAndCancelLoading(WebInspector.UIString("Legacy Timeline format is not supported."));
                return;
            }
        }

        try {
            this._model.addEvents(items);
        } catch (e) {
            this._reportErrorAndCancelLoading(WebInspector.UIString("Malformed timeline data: %s", e.toString()));
            return;
        }
    },

    /**
     * @param {string=} message
     */
    _reportErrorAndCancelLoading: function(message)
    {
        if (message)
            WebInspector.console.error(message);
        this.cancel();
    },

    /**
     * @param {*} item
     * @return {boolean}
     */
    _looksLikeAppVersion: function(item)
    {
        return typeof item === "string" && item.indexOf("Chrome") !== -1;
    },

    /**
     * @override
     */
    close: function()
    {
        this._model.tracingComplete();
        if (this._delegate)
            this._delegate.loadingComplete(true);
    },

    /**
     * @override
     */
    onTransferStarted: function() {},

    /**
     * @override
     * @param {!WebInspector.ChunkedReader} reader
     */
    onChunkTransferred: function(reader) {},

    /**
     * @override
     */
    onTransferFinished: function() {},

    /**
     * @override
     * @param {!WebInspector.ChunkedReader} reader
     * @param {!Event} event
     */
    onError: function(reader, event)
    {
        switch (event.target.error.name) {
        case "NotFoundError":
            this._reportErrorAndCancelLoading(WebInspector.UIString("File \"%s\" not found.", reader.fileName()));
            break;
        case "NotReadableError":
            this._reportErrorAndCancelLoading(WebInspector.UIString("File \"%s\" is not readable", reader.fileName()));
            break;
        case "AbortError":
            break;
        default:
            this._reportErrorAndCancelLoading(WebInspector.UIString("An error occurred while reading the file \"%s\"", reader.fileName()));
        }
    }
}

/**
 * @constructor
 * @implements {WebInspector.OutputStreamDelegate}
 */
WebInspector.TracingTimelineSaver = function()
{
}

WebInspector.TracingTimelineSaver.prototype = {
    /**
     * @override
     */
    onTransferStarted: function() { },

    /**
     * @override
     */
    onTransferFinished: function() { },

    /**
     * @override
     * @param {!WebInspector.ChunkedReader} reader
     */
    onChunkTransferred: function(reader) { },

    /**
     * @override
     * @param {!WebInspector.ChunkedReader} reader
     * @param {!Event} event
     */
    onError: function(reader, event)
    {
        var error = event.target.error;
        WebInspector.console.error(WebInspector.UIString("Failed to save timeline: %s (%s, %s)", error.message, error.name, error.code));
    }
}
