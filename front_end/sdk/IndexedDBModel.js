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
 * @extends {WebInspector.SDKModel}
 */
WebInspector.IndexedDBModel = function(target)
{
    WebInspector.SDKModel.call(this, WebInspector.IndexedDBModel, target);
    this._agent = target.indexedDBAgent();

    /** @type {!Map.<!WebInspector.IndexedDBModel.DatabaseId, !WebInspector.IndexedDBModel.Database>} */
    this._databases = new Map();
    /** @type {!Object.<string, !Array.<string>>} */
    this._databaseNamesBySecurityOrigin = {};
}

WebInspector.IndexedDBModel.KeyTypes = {
    NumberType:  "number",
    StringType:  "string",
    DateType:    "date",
    ArrayType:   "array"
};

WebInspector.IndexedDBModel.KeyPathTypes = {
    NullType:    "null",
    StringType:  "string",
    ArrayType:   "array"
};

/**
 * @param {*} idbKey
 * @return {?Object}
 */
WebInspector.IndexedDBModel.keyFromIDBKey = function(idbKey)
{
    if (typeof(idbKey) === "undefined" || idbKey === null)
        return null;

    var key = {};
    switch (typeof(idbKey)) {
    case "number":
        key.number = idbKey;
        key.type = WebInspector.IndexedDBModel.KeyTypes.NumberType;
        break;
    case "string":
        key.string = idbKey;
        key.type = WebInspector.IndexedDBModel.KeyTypes.StringType;
        break;
    case "object":
        if (idbKey instanceof Date) {
            key.date = idbKey.getTime();
            key.type = WebInspector.IndexedDBModel.KeyTypes.DateType;
        } else if (Array.isArray(idbKey)) {
            key.array = [];
            for (var i = 0; i < idbKey.length; ++i)
                key.array.push(WebInspector.IndexedDBModel.keyFromIDBKey(idbKey[i]));
            key.type = WebInspector.IndexedDBModel.KeyTypes.ArrayType;
        }
        break;
    default:
        return null;
    }
    return key;
}

/**
 * @param {?IDBKeyRange=} idbKeyRange
 * @return {?{lower: ?Object, upper: ?Object, lowerOpen: *, upperOpen: *}}
 */
WebInspector.IndexedDBModel.keyRangeFromIDBKeyRange = function(idbKeyRange)
{
    if (typeof idbKeyRange === "undefined" || idbKeyRange === null)
        return null;

    var keyRange = {};
    keyRange.lower = WebInspector.IndexedDBModel.keyFromIDBKey(idbKeyRange.lower);
    keyRange.upper = WebInspector.IndexedDBModel.keyFromIDBKey(idbKeyRange.upper);
    keyRange.lowerOpen = idbKeyRange.lowerOpen;
    keyRange.upperOpen = idbKeyRange.upperOpen;
    return keyRange;
}

/**
 * @param {!IndexedDBAgent.KeyPath} keyPath
 * @return {?string|!Array.<string>|undefined}
 */
WebInspector.IndexedDBModel.idbKeyPathFromKeyPath = function(keyPath)
{
    var idbKeyPath;
    switch (keyPath.type) {
    case WebInspector.IndexedDBModel.KeyPathTypes.NullType:
        idbKeyPath = null;
        break;
    case WebInspector.IndexedDBModel.KeyPathTypes.StringType:
        idbKeyPath = keyPath.string;
        break;
    case WebInspector.IndexedDBModel.KeyPathTypes.ArrayType:
        idbKeyPath = keyPath.array;
        break;
    }
    return idbKeyPath;
}

/**
 * @param {?string|!Array.<string>|undefined} idbKeyPath
 * @return {?string}
 */
WebInspector.IndexedDBModel.keyPathStringFromIDBKeyPath = function(idbKeyPath)
{
    if (typeof idbKeyPath === "string")
        return "\"" + idbKeyPath + "\"";
    if (idbKeyPath instanceof Array)
        return "[\"" + idbKeyPath.join("\", \"") + "\"]";
    return null;
}

WebInspector.IndexedDBModel.EventTypes = {
    DatabaseAdded: "DatabaseAdded",
    DatabaseRemoved: "DatabaseRemoved",
    DatabaseLoaded: "DatabaseLoaded"
}

WebInspector.IndexedDBModel.prototype = {
    enable: function()
    {
        if (this._enabled)
            return;

        this._agent.enable();

        this.target().resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.SecurityOriginAdded, this._securityOriginAdded, this);
        this.target().resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.SecurityOriginRemoved, this._securityOriginRemoved, this);

        var securityOrigins = this.target().resourceTreeModel.securityOrigins();
        for (var i = 0; i < securityOrigins.length; ++i)
            this._addOrigin(securityOrigins[i]);

        this._enabled = true;
    },

    refreshDatabaseNames: function()
    {
        for (var securityOrigin in this._databaseNamesBySecurityOrigin)
            this._loadDatabaseNames(securityOrigin);
    },

    /**
     * @param {!WebInspector.IndexedDBModel.DatabaseId} databaseId
     */
    refreshDatabase: function(databaseId)
    {
        this._loadDatabase(databaseId);
    },

    /**
     * @param {!WebInspector.IndexedDBModel.DatabaseId} databaseId
     * @param {string} objectStoreName
     * @param {function()} callback
     */
    clearObjectStore: function(databaseId, objectStoreName, callback)
    {
        this._agent.clearObjectStore(databaseId.securityOrigin, databaseId.name, objectStoreName, callback);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _securityOriginAdded: function(event)
    {
        var securityOrigin = /** @type {string} */ (event.data);
        this._addOrigin(securityOrigin);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _securityOriginRemoved: function(event)
    {
        var securityOrigin = /** @type {string} */ (event.data);
        this._removeOrigin(securityOrigin);
    },

    /**
     * @param {string} securityOrigin
     */
    _addOrigin: function(securityOrigin)
    {
        console.assert(!this._databaseNamesBySecurityOrigin[securityOrigin]);
        this._databaseNamesBySecurityOrigin[securityOrigin] = [];
        this._loadDatabaseNames(securityOrigin);
    },

    /**
     * @param {string} securityOrigin
     */
    _removeOrigin: function(securityOrigin)
    {
        console.assert(this._databaseNamesBySecurityOrigin[securityOrigin]);
        for (var i = 0; i < this._databaseNamesBySecurityOrigin[securityOrigin].length; ++i)
            this._databaseRemoved(securityOrigin, this._databaseNamesBySecurityOrigin[securityOrigin][i]);
        delete this._databaseNamesBySecurityOrigin[securityOrigin];
    },

    /**
     * @param {string} securityOrigin
     * @param {!Array.<string>} databaseNames
     */
    _updateOriginDatabaseNames: function(securityOrigin, databaseNames)
    {
        var newDatabaseNames = databaseNames.keySet();
        var oldDatabaseNames = this._databaseNamesBySecurityOrigin[securityOrigin].keySet();

        this._databaseNamesBySecurityOrigin[securityOrigin] = databaseNames;

        for (var databaseName in oldDatabaseNames) {
            if (!newDatabaseNames[databaseName])
                this._databaseRemoved(securityOrigin, databaseName);
        }
        for (var databaseName in newDatabaseNames) {
            if (!oldDatabaseNames[databaseName])
                this._databaseAdded(securityOrigin, databaseName);
        }
    },

    /**
     * @return {!Array.<!WebInspector.IndexedDBModel.DatabaseId>}
     */
    databases: function()
    {
        var result = [];
        for (var securityOrigin in this._databaseNamesBySecurityOrigin) {
            var databaseNames = this._databaseNamesBySecurityOrigin[securityOrigin];
            for (var i = 0; i < databaseNames.length; ++i) {
                result.push(new WebInspector.IndexedDBModel.DatabaseId(securityOrigin, databaseNames[i]));
            }
        }
        return result;
    },

    /**
     * @param {string} securityOrigin
     * @param {string} databaseName
     */
    _databaseAdded: function(securityOrigin, databaseName)
    {
        var databaseId = new WebInspector.IndexedDBModel.DatabaseId(securityOrigin, databaseName);
        this.dispatchEventToListeners(WebInspector.IndexedDBModel.EventTypes.DatabaseAdded, databaseId);
    },

    /**
     * @param {string} securityOrigin
     * @param {string} databaseName
     */
    _databaseRemoved: function(securityOrigin, databaseName)
    {
        var databaseId = new WebInspector.IndexedDBModel.DatabaseId(securityOrigin, databaseName);
        this.dispatchEventToListeners(WebInspector.IndexedDBModel.EventTypes.DatabaseRemoved, databaseId);
    },

    /**
     * @param {string} securityOrigin
     */
    _loadDatabaseNames: function(securityOrigin)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {!Array.<string>} databaseNames
         * @this {WebInspector.IndexedDBModel}
         */
        function callback(error, databaseNames)
        {
            if (error) {
                console.error("IndexedDBAgent error: " + error);
                return;
            }

            if (!this._databaseNamesBySecurityOrigin[securityOrigin])
                return;
            this._updateOriginDatabaseNames(securityOrigin, databaseNames);
        }

        this._agent.requestDatabaseNames(securityOrigin, callback.bind(this));
    },

    /**
     * @param {!WebInspector.IndexedDBModel.DatabaseId} databaseId
     */
    _loadDatabase: function(databaseId)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {!IndexedDBAgent.DatabaseWithObjectStores} databaseWithObjectStores
         * @this {WebInspector.IndexedDBModel}
         */
        function callback(error, databaseWithObjectStores)
        {
            if (error) {
                console.error("IndexedDBAgent error: " + error);
                return;
            }

            if (!this._databaseNamesBySecurityOrigin[databaseId.securityOrigin])
                return;
            var databaseModel = new WebInspector.IndexedDBModel.Database(databaseId, databaseWithObjectStores.version, databaseWithObjectStores.intVersion);
            this._databases.set(databaseId, databaseModel);
            for (var i = 0; i < databaseWithObjectStores.objectStores.length; ++i) {
                var objectStore = databaseWithObjectStores.objectStores[i];
                var objectStoreIDBKeyPath = WebInspector.IndexedDBModel.idbKeyPathFromKeyPath(objectStore.keyPath);
                var objectStoreModel = new WebInspector.IndexedDBModel.ObjectStore(objectStore.name, objectStoreIDBKeyPath, objectStore.autoIncrement);
                for (var j = 0; j < objectStore.indexes.length; ++j) {
                     var index = objectStore.indexes[j];
                     var indexIDBKeyPath = WebInspector.IndexedDBModel.idbKeyPathFromKeyPath(index.keyPath);
                     var indexModel = new WebInspector.IndexedDBModel.Index(index.name, indexIDBKeyPath, index.unique, index.multiEntry);
                     objectStoreModel.indexes[indexModel.name] = indexModel;
                }
                databaseModel.objectStores[objectStoreModel.name] = objectStoreModel;
            }

            this.dispatchEventToListeners(WebInspector.IndexedDBModel.EventTypes.DatabaseLoaded, databaseModel);
        }

        this._agent.requestDatabase(databaseId.securityOrigin, databaseId.name, callback.bind(this));
    },

    /**
     * @param {!WebInspector.IndexedDBModel.DatabaseId} databaseId
     * @param {string} objectStoreName
     * @param {?IDBKeyRange} idbKeyRange
     * @param {number} skipCount
     * @param {number} pageSize
     * @param {function(!Array.<!WebInspector.IndexedDBModel.Entry>, boolean)} callback
     */
    loadObjectStoreData: function(databaseId, objectStoreName, idbKeyRange, skipCount, pageSize, callback)
    {
        this._requestData(databaseId, databaseId.name, objectStoreName, "", idbKeyRange, skipCount, pageSize, callback);
    },

    /**
     * @param {!WebInspector.IndexedDBModel.DatabaseId} databaseId
     * @param {string} objectStoreName
     * @param {string} indexName
     * @param {?IDBKeyRange} idbKeyRange
     * @param {number} skipCount
     * @param {number} pageSize
     * @param {function(!Array.<!WebInspector.IndexedDBModel.Entry>, boolean)} callback
     */
    loadIndexData: function(databaseId, objectStoreName, indexName, idbKeyRange, skipCount, pageSize, callback)
    {
        this._requestData(databaseId, databaseId.name, objectStoreName, indexName, idbKeyRange, skipCount, pageSize, callback);
    },

    /**
     * @param {!WebInspector.IndexedDBModel.DatabaseId} databaseId
     * @param {string} databaseName
     * @param {string} objectStoreName
     * @param {string} indexName
     * @param {?IDBKeyRange} idbKeyRange
     * @param {number} skipCount
     * @param {number} pageSize
     * @param {function(!Array.<!WebInspector.IndexedDBModel.Entry>, boolean)} callback
     */
    _requestData: function(databaseId, databaseName, objectStoreName, indexName, idbKeyRange, skipCount, pageSize, callback)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {!Array.<!IndexedDBAgent.DataEntry>} dataEntries
         * @param {boolean} hasMore
         * @this {WebInspector.IndexedDBModel}
         */
        function innerCallback(error, dataEntries, hasMore)
        {
            if (error) {
                console.error("IndexedDBAgent error: " + error);
                return;
            }

            if (!this._databaseNamesBySecurityOrigin[databaseId.securityOrigin])
                return;
            var entries = [];
            for (var i = 0; i < dataEntries.length; ++i) {
                var key = WebInspector.RemoteObject.fromLocalObject(JSON.parse(dataEntries[i].key));
                var primaryKey = WebInspector.RemoteObject.fromLocalObject(JSON.parse(dataEntries[i].primaryKey));
                var value = WebInspector.RemoteObject.fromLocalObject(JSON.parse(dataEntries[i].value));
                entries.push(new WebInspector.IndexedDBModel.Entry(key, primaryKey, value));
            }
            callback(entries, hasMore);
        }

        var keyRange = WebInspector.IndexedDBModel.keyRangeFromIDBKeyRange(idbKeyRange);
        this._agent.requestData(databaseId.securityOrigin, databaseName, objectStoreName, indexName, skipCount, pageSize, keyRange ? keyRange : undefined, innerCallback.bind(this));
    },

    __proto__: WebInspector.SDKModel.prototype
}

/**
 * @constructor
 * @param {!WebInspector.RemoteObject} key
 * @param {!WebInspector.RemoteObject} primaryKey
 * @param {!WebInspector.RemoteObject} value
 */
WebInspector.IndexedDBModel.Entry = function(key, primaryKey, value)
{
    this.key = key;
    this.primaryKey = primaryKey;
    this.value = value;
}

/**
 * @constructor
 * @param {string} securityOrigin
 * @param {string} name
 */
WebInspector.IndexedDBModel.DatabaseId = function(securityOrigin, name)
{
    this.securityOrigin = securityOrigin;
    this.name = name;
}

WebInspector.IndexedDBModel.DatabaseId.prototype = {
    /**
     * @param {!WebInspector.IndexedDBModel.DatabaseId} databaseId
     * @return {boolean}
     */
    equals: function(databaseId)
    {
        return this.name === databaseId.name && this.securityOrigin === databaseId.securityOrigin;
    },
}
/**
 * @constructor
 * @param {!WebInspector.IndexedDBModel.DatabaseId} databaseId
 * @param {string} version
 * @param {number} intVersion
 */
WebInspector.IndexedDBModel.Database = function(databaseId, version, intVersion)
{
    this.databaseId = databaseId;
    this.version = version;
    this.intVersion = intVersion;
    this.objectStores = {};
}

/**
 * @constructor
 * @param {string} name
 * @param {*} keyPath
 * @param {boolean} autoIncrement
 */
WebInspector.IndexedDBModel.ObjectStore = function(name, keyPath, autoIncrement)
{
    this.name = name;
    this.keyPath = keyPath;
    this.autoIncrement = autoIncrement;
    this.indexes = {};
}

WebInspector.IndexedDBModel.ObjectStore.prototype = {
    /**
     * @type {string}
     */
    get keyPathString()
    {
        return WebInspector.IndexedDBModel.keyPathStringFromIDBKeyPath(this.keyPath);
    }
}

/**
 * @constructor
 * @param {string} name
 * @param {*} keyPath
 * @param {boolean} unique
 * @param {boolean} multiEntry
 */
WebInspector.IndexedDBModel.Index = function(name, keyPath, unique, multiEntry)
{
    this.name = name;
    this.keyPath = keyPath;
    this.unique = unique;
    this.multiEntry = multiEntry;
}

WebInspector.IndexedDBModel.Index.prototype = {
    /**
     * @type {string}
     */
    get keyPathString()
    {
        return WebInspector.IndexedDBModel.keyPathStringFromIDBKeyPath(this.keyPath);
    }
}
