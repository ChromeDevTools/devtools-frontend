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
 * @constructor
 */
function SourceMapV3()
{
    /** @type {number} */ this.version;
    /** @type {string|undefined} */ this.file;
    /** @type {!Array.<string>} */ this.sources;
    /** @type {!Array.<!SourceMapV3.Section>|undefined} */ this.sections;
    /** @type {string} */ this.mappings;
    /** @type {string|undefined} */ this.sourceRoot;
    /** @type {!Array.<string>|undefined} */ this.names;
}

/**
 * @constructor
 */
SourceMapV3.Section = function()
{
    /** @type {!SourceMapV3} */ this.map;
    /** @type {!SourceMapV3.Offset} */ this.offset;
}

/**
 * @constructor
 */
SourceMapV3.Offset = function()
{
    /** @type {number} */ this.line;
    /** @type {number} */ this.column;
}

/**
 * @constructor
 * @param {number} lineNumber
 * @param {number} columnNumber
 * @param {string=} sourceURL
 * @param {number=} sourceLineNumber
 * @param {number=} sourceColumnNumber
 * @param {string=} name
 */
WebInspector.SourceMapEntry = function(lineNumber, columnNumber, sourceURL, sourceLineNumber, sourceColumnNumber, name)
{
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber;
    this.sourceURL = sourceURL;
    this.sourceLineNumber = sourceLineNumber;
    this.sourceColumnNumber = sourceColumnNumber;
    this.name = name;
}

/**
 * @interface
 */
WebInspector.SourceMap = function() { }

WebInspector.SourceMap.prototype = {
    /**
     * @return {string}
     */
    compiledURL: function() { },

    /**
     * @return {string}
     */
    url: function() { },

    /**
     * @return {!Array<string>}
     */
    sourceURLs: function() { },

    /**
     * @param {string} sourceURL
     * @param {!WebInspector.ResourceType} contentType
     * @return {!WebInspector.ContentProvider}
     */
    sourceContentProvider: function(sourceURL, contentType) { },

    /**
     * @param {number} lineNumber in compiled resource
     * @param {number} columnNumber in compiled resource
     * @return {?WebInspector.SourceMapEntry}
     */
    findEntry: function(lineNumber, columnNumber) { },

    /**
     * @return {boolean}
     */
    editable: function() { },

    /**
     * @param {!Array<!WebInspector.TextRange>} ranges
     * @param {!Array<string>} texts
     * @return {!Promise<?WebInspector.SourceMap.EditResult>}
     */
    editCompiled: function(ranges, texts) { },
}

/**
 * @constructor
 * @param {!WebInspector.SourceMap} map
 * @param {!Array<!WebInspector.SourceEdit>} compiledEdits
 * @param {!Map<string, string>} newSources
 */
WebInspector.SourceMap.EditResult = function(map, compiledEdits, newSources)
{
    this.map = map;
    this.compiledEdits = compiledEdits;
    this.newSources = newSources;
}

/**
 * @interface
 */
WebInspector.SourceMapFactory = function() { }

WebInspector.SourceMapFactory.prototype = {
    /**
     * @param {!WebInspector.Target} target
     * @param {!WebInspector.SourceMap} sourceMap
     * @return {!Promise<?WebInspector.SourceMap>}
     */
    editableSourceMap: function(target, sourceMap) { },
}

/**
 * Implements Source Map V3 model. See https://github.com/google/closure-compiler/wiki/Source-Maps
 * for format description.
 * @constructor
 * @implements {WebInspector.SourceMap}
 * @param {string} compiledURL
 * @param {string} sourceMappingURL
 * @param {!SourceMapV3} payload
 */
WebInspector.TextSourceMap = function(compiledURL, sourceMappingURL, payload)
{
    if (!WebInspector.TextSourceMap.prototype._base64Map) {
        const base64Digits = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        WebInspector.TextSourceMap.prototype._base64Map = {};
        for (var i = 0; i < base64Digits.length; ++i)
            WebInspector.TextSourceMap.prototype._base64Map[base64Digits.charAt(i)] = i;
    }

    this._json = payload;
    this._compiledURL = compiledURL;
    this._sourceMappingURL = sourceMappingURL;
    /** @type {?Array<!WebInspector.SourceMapEntry>} */
    this._mappings = null;
    /** @type {!Map<string, !WebInspector.TextSourceMap.SourceInfo>} */
    this._sourceInfos = new Map();
    this._eachSection(this._parseSources.bind(this));
}

/**
 * @param {string} sourceMapURL
 * @param {string} compiledURL
 * @return {!Promise<?WebInspector.TextSourceMap>}
 * @this {WebInspector.TextSourceMap}
 */
WebInspector.TextSourceMap.load = function(sourceMapURL, compiledURL)
{
    var callback;
    var promise = new Promise(fulfill => callback = fulfill);
    WebInspector.multitargetNetworkManager.loadResource(sourceMapURL, contentLoaded);
    return promise;

    /**
     * @param {number} statusCode
     * @param {!Object.<string, string>} headers
     * @param {string} content
     */
    function contentLoaded(statusCode, headers, content)
    {
        if (!content || statusCode >= 400) {
            callback(null);
            return;
        }

        if (content.slice(0, 3) === ")]}")
            content = content.substring(content.indexOf("\n"));
        try {
            var payload = /** @type {!SourceMapV3} */ (JSON.parse(content));
            var baseURL = sourceMapURL.startsWith("data:") ? compiledURL : sourceMapURL;
            callback(new WebInspector.TextSourceMap(compiledURL, baseURL, payload));
        } catch (e) {
            console.error(e);
            WebInspector.console.warn("DevTools failed to parse SourceMap: " + sourceMapURL);
            callback(null);
        }
    }
}

WebInspector.TextSourceMap.prototype = {
    /**
     * @override
     * @return {string}
     */
    compiledURL: function()
    {
        return this._compiledURL;
    },

    /**
     * @override
     * @return {string}
     */
    url: function()
    {
        return this._sourceMappingURL;
    },

    /**
     * @override
     * @return {!Array.<string>}
     */
    sourceURLs: function()
    {
        return this._sourceInfos.keysArray();
    },

    /**
     * @override
     * @param {string} sourceURL
     * @param {!WebInspector.ResourceType} contentType
     * @return {!WebInspector.ContentProvider}
     */
    sourceContentProvider: function(sourceURL, contentType)
    {
        var info = this._sourceInfos.get(sourceURL);
        if (info.content)
            return WebInspector.StaticContentProvider.fromString(sourceURL, contentType, info.content);
        return new WebInspector.CompilerSourceMappingContentProvider(sourceURL, contentType);
    },

    /**
     * @override
     * @return {boolean}
     */
    editable: function()
    {
        return false;
    },

    /**
     * @override
     * @param {!Array<!WebInspector.TextRange>} ranges
     * @param {!Array<string>} texts
     * @return {!Promise<?WebInspector.SourceMap.EditResult>}
     */
    editCompiled: function(ranges, texts)
    {
        return Promise.resolve(/** @type {?WebInspector.SourceMap.EditResult} */(null));
    },

    /**
     * @override
     * @param {number} lineNumber in compiled resource
     * @param {number} columnNumber in compiled resource
     * @return {?WebInspector.SourceMapEntry}
     */
    findEntry: function(lineNumber, columnNumber)
    {
        var first = 0;
        var mappings = this.mappings();
        var count = mappings.length;
        while (count > 1) {
            var step = count >> 1;
            var middle = first + step;
            var mapping = mappings[middle];
            if (lineNumber < mapping.lineNumber || (lineNumber === mapping.lineNumber && columnNumber < mapping.columnNumber)) {
                count = step;
            } else {
                first = middle;
                count -= step;
            }
        }
        var entry = mappings[first];
        if (!first && entry && (lineNumber < entry.lineNumber || (lineNumber === entry.lineNumber && columnNumber < entry.columnNumber)))
            return null;
        return entry;
    },

    /**
     * @param {string} sourceURL
     * @param {number} lineNumber
     * @return {?WebInspector.SourceMapEntry}
     */
    firstSourceLineMapping: function(sourceURL, lineNumber)
    {
        var mappings = this._reversedMappings(sourceURL);
        var index = mappings.lowerBound(lineNumber, lineComparator);
        if (index >= mappings.length || mappings[index].sourceLineNumber !== lineNumber)
            return null;
        return mappings[index];

        /**
         * @param {number} lineNumber
         * @param {!WebInspector.SourceMapEntry} mapping
         * @return {number}
         */
        function lineComparator(lineNumber, mapping)
        {
            return lineNumber - mapping.sourceLineNumber;
        }
    },

    /**
     * @return {!Array<!WebInspector.SourceMapEntry>}
     */
    mappings: function()
    {
        if (this._mappings === null) {
            this._mappings = [];
            this._eachSection(this._parseMap.bind(this));
            this._json = null;
        }
        return /** @type {!Array<!WebInspector.SourceMapEntry>} */ (this._mappings);
    },

    /**
     * @param {string} sourceURL
     * @return {!Array.<!WebInspector.SourceMapEntry>}
     */
    _reversedMappings: function(sourceURL)
    {
        if (!this._sourceInfos.has(sourceURL))
            return [];
        var mappings = this.mappings();
        var info = this._sourceInfos.get(sourceURL);
        if (info.reverseMappings === null)
            info.reverseMappings = mappings.filter((mapping) => mapping.sourceURL === sourceURL).sort(sourceMappingComparator);
        return info.reverseMappings;

        /**
         * @param {!WebInspector.SourceMapEntry} a
         * @param {!WebInspector.SourceMapEntry} b
         * @return {number}
         */
        function sourceMappingComparator(a, b)
        {
            if (a.sourceLineNumber !== b.sourceLineNumber)
                return a.sourceLineNumber - b.sourceLineNumber;
            if (a.sourceColumnNumber !== b.sourceColumnNumber)
                return a.sourceColumnNumber - b.sourceColumnNumber;

            if (a.lineNumber !== b.lineNumber)
                return a.lineNumber - b.lineNumber;

            return a.columnNumber - b.columnNumber;
        }
    },

    /**
     * @param {function(!SourceMapV3, number, number)} callback
     */
    _eachSection: function(callback) {
        if (!this._json.sections) {
            callback(this._json, 0, 0);
            return;
        }
        for (var section of this._json.sections)
            callback(section.map, section.offset.line, section.offset.column);
    },

    /**
     * @param {!SourceMapV3} sourceMap
     */
    _parseSources: function(sourceMap) {
        var sourcesList = [];
        var sourceRoot = sourceMap.sourceRoot || "";
        if (sourceRoot && !sourceRoot.endsWith("/"))
            sourceRoot += "/";
        for (var i = 0; i < sourceMap.sources.length; ++i) {
            var href = sourceRoot + sourceMap.sources[i];
            var url = WebInspector.ParsedURL.completeURL(this._sourceMappingURL, href) || href;
            var source = sourceMap.sourcesContent && sourceMap.sourcesContent[i];
            if (url === this._compiledURL && source)
                url += WebInspector.UIString(" [sm]");
            this._sourceInfos.set(url, new WebInspector.TextSourceMap.SourceInfo(source, null));
            sourcesList.push(url);
        }
        sourceMap[WebInspector.TextSourceMap._sourcesListSymbol] = sourcesList;
    },

    /**
     * @param {!SourceMapV3} map
     * @param {number} lineNumber
     * @param {number} columnNumber
     */
    _parseMap: function(map, lineNumber, columnNumber)
    {
        var sourceIndex = 0;
        var sourceLineNumber = 0;
        var sourceColumnNumber = 0;
        var nameIndex = 0;
        var sources = map[WebInspector.TextSourceMap._sourcesListSymbol];
        var names = map.names || [];
        var stringCharIterator = new WebInspector.TextSourceMap.StringCharIterator(map.mappings);
        var sourceURL = sources[sourceIndex];

        while (true) {
            if (stringCharIterator.peek() === ",")
                stringCharIterator.next();
            else {
                while (stringCharIterator.peek() === ";") {
                    lineNumber += 1;
                    columnNumber = 0;
                    stringCharIterator.next();
                }
                if (!stringCharIterator.hasNext())
                    break;
            }

            columnNumber += this._decodeVLQ(stringCharIterator);
            if (!stringCharIterator.hasNext() || this._isSeparator(stringCharIterator.peek())) {
                this._mappings.push(new WebInspector.SourceMapEntry(lineNumber, columnNumber));
                continue;
            }

            var sourceIndexDelta = this._decodeVLQ(stringCharIterator);
            if (sourceIndexDelta) {
                sourceIndex += sourceIndexDelta;
                sourceURL = sources[sourceIndex];
            }
            sourceLineNumber += this._decodeVLQ(stringCharIterator);
            sourceColumnNumber += this._decodeVLQ(stringCharIterator);

            if (!stringCharIterator.hasNext() || this._isSeparator(stringCharIterator.peek())) {
                this._mappings.push(new WebInspector.SourceMapEntry(lineNumber, columnNumber, sourceURL, sourceLineNumber, sourceColumnNumber));
                continue;
            }

            nameIndex += this._decodeVLQ(stringCharIterator);
            this._mappings.push(new WebInspector.SourceMapEntry(lineNumber, columnNumber, sourceURL, sourceLineNumber, sourceColumnNumber, names[nameIndex]));
        }
    },

    /**
     * @param {string} char
     * @return {boolean}
     */
    _isSeparator: function(char)
    {
        return char === "," || char === ";";
    },

    /**
     * @param {!WebInspector.TextSourceMap.StringCharIterator} stringCharIterator
     * @return {number}
     */
    _decodeVLQ: function(stringCharIterator)
    {
        // Read unsigned value.
        var result = 0;
        var shift = 0;
        do {
            var digit = this._base64Map[stringCharIterator.next()];
            result += (digit & this._VLQ_BASE_MASK) << shift;
            shift += this._VLQ_BASE_SHIFT;
        } while (digit & this._VLQ_CONTINUATION_MASK);

        // Fix the sign.
        var negative = result & 1;
        result >>= 1;
        return negative ? -result : result;
    },

    /**
     * @param {string} url
     * @param {!WebInspector.TextRange} textRange
     * @return {!WebInspector.TextRange}
     */
    reverseMapTextRange: function(url, textRange)
    {
        /**
         * @param {!{lineNumber: number, columnNumber: number}} position
         * @param {!WebInspector.SourceMapEntry} mapping
         * @return {number}
         */
        function comparator(position, mapping)
        {
            if (position.lineNumber !== mapping.sourceLineNumber)
                return position.lineNumber - mapping.sourceLineNumber;

            return position.columnNumber - mapping.sourceColumnNumber;
        }

        var mappings = this._reversedMappings(url);
        var startIndex = mappings.lowerBound({lineNumber: textRange.startLine, columnNumber: textRange.startColumn}, comparator);
        var endIndex = mappings.upperBound({lineNumber: textRange.endLine, columnNumber: textRange.endColumn}, comparator);

        var startMapping = mappings[startIndex];
        var endMapping = mappings[endIndex];
        return new WebInspector.TextRange(startMapping.lineNumber, startMapping.columnNumber, endMapping.lineNumber, endMapping.columnNumber);
    },

    _VLQ_BASE_SHIFT: 5,
    _VLQ_BASE_MASK: (1 << 5) - 1,
    _VLQ_CONTINUATION_MASK: 1 << 5
}

/**
 * @constructor
 * @param {string} string
 */
WebInspector.TextSourceMap.StringCharIterator = function(string)
{
    this._string = string;
    this._position = 0;
}

WebInspector.TextSourceMap.StringCharIterator.prototype = {
    /**
     * @return {string}
     */
    next: function()
    {
        return this._string.charAt(this._position++);
    },

    /**
     * @return {string}
     */
    peek: function()
    {
        return this._string.charAt(this._position);
    },

    /**
     * @return {boolean}
     */
    hasNext: function()
    {
        return this._position < this._string.length;
    }
}

/**
 * @constructor
 * @param {?string} content
 * @param {?Array<!WebInspector.SourceMapEntry>} reverseMappings
 */
WebInspector.TextSourceMap.SourceInfo = function(content, reverseMappings) {
    this.content = content;
    this.reverseMappings = reverseMappings;
}

WebInspector.TextSourceMap._sourcesListSymbol = Symbol("sourcesList");
