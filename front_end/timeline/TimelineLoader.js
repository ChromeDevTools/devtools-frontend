// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.OutputStream}
 * @implements {WebInspector.OutputStreamDelegate}
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.Progress} progress
 */
WebInspector.TimelineLoader = function(model, progress)
{
    this._model = model;

    /** @type {?function()} */
    this._canceledCallback = null;
    this._progress = progress;
    this._progress.setTitle(WebInspector.UIString("Loading"));
    this._progress.setTotalWork(WebInspector.TimelineLoader._totalProgress);  // Unknown, will loop the values.

    this._state = WebInspector.TimelineLoader.State.Initial;
    this._buffer = "";
    this._firstChunk = true;
    this._wasCanceledOnce = false;

    this._loadedBytes = 0;
    /** @type {number} */
    this._totalSize;
    this._jsonTokenizer = new WebInspector.TextUtils.BalancedJSONTokenizer(this._writeBalancedJSON.bind(this), true);
}

/**
 * @param {!WebInspector.TimelineModel} model
 * @param {!File} file
 * @param {!WebInspector.Progress} progress
 */
WebInspector.TimelineLoader.loadFromFile = function(model, file, progress)
{
    var loader = new WebInspector.TimelineLoader(model, progress);
    var fileReader = WebInspector.TimelineLoader._createFileReader(file, loader);
    loader._canceledCallback = fileReader.cancel.bind(fileReader);
    loader._totalSize = file.size;
    progress.setTotalWork(loader._totalSize);
    fileReader.start(loader);
}

/**
 * @param {!WebInspector.TimelineModel} model
 * @param {string} url
 * @param {!WebInspector.Progress} progress
 */
WebInspector.TimelineLoader.loadFromURL = function(model, url, progress)
{
    var stream = new WebInspector.TimelineLoader(model, progress);
    WebInspector.ResourceLoader.loadAsStream(url, null, stream);
}

/**
 * @param {!File} file
 * @param {!WebInspector.OutputStreamDelegate} delegate
 * @return {!WebInspector.ChunkedReader}
 */
WebInspector.TimelineLoader._createFileReader = function(file, delegate)
{
    return new WebInspector.ChunkedFileReader(file, WebInspector.TimelineModel.TransferChunkLengthBytes, delegate);
}


WebInspector.TimelineLoader._totalProgress = 100000;

WebInspector.TimelineLoader.State = {
    Initial: "Initial",
    LookingForEvents: "LookingForEvents",
    ReadingEvents: "ReadingEvents"
}

WebInspector.TimelineLoader.prototype = {
    /**
     * @override
     * @param {string} chunk
     */
    write: function(chunk)
    {
        this._loadedBytes += chunk.length;
        if (this._progress.isCanceled() && !this._wasCanceledOnce) {
            this._wasCanceled = true;
            this._reportErrorAndCancelLoading();
            return;
        }
        if (this._firstChunk)
            this._progress.setTitle(WebInspector.UIString("Loading\u2026"));
        if (this._totalSize) {
            this._progress.setWorked(this._loadedBytes);
        } else {
            this._progress.setWorked(this._loadedBytes % WebInspector.TimelineLoader._totalProgress,
                                     WebInspector.UIString("Loaded %s", Number.bytesToString(this._loadedBytes)));
        }
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

        this._jsonTokenizer.write(chunk);
    },

    /**
     * @param {string} data
     */
    _writeBalancedJSON: function(data)
    {
        var json = data + "]";

        if (this._firstChunk) {
            this._model.startCollectingTraceEvents(true);
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
            if (this._looksLikeAppVersion(items[0])) {
                this._reportErrorAndCancelLoading(WebInspector.UIString("Legacy Timeline format is not supported."));
                return;
            }
        }

        try {
            this._model.traceEventsCollected(items);
        } catch(e) {
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
        this._model.tracingComplete();
        this._model.reset();
        if (this._canceledCallback)
            this._canceledCallback();
        this._progress.done();
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
        this._model._loadedFromFile = true;
        this._model.tracingComplete();
        this._progress.done();
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
        switch (event.target.error.code) {
        case FileError.NOT_FOUND_ERR:
            this._reportErrorAndCancelLoading(WebInspector.UIString("File \"%s\" not found.", reader.fileName()));
            break;
        case FileError.NOT_READABLE_ERR:
            this._reportErrorAndCancelLoading(WebInspector.UIString("File \"%s\" is not readable", reader.fileName()));
            break;
        case FileError.ABORT_ERR:
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
