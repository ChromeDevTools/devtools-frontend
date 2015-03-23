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
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.IndexedDBModel.Database} database
 */
WebInspector.IDBDatabaseView = function(database)
{
    WebInspector.VBox.call(this);
    this.registerRequiredCSS("resources/indexedDBViews.css");

    this.element.classList.add("indexed-db-database-view");
    this.element.classList.add("storage-view");

    this._headersTreeOutline = new TreeOutline();
    this._headersTreeOutline.element.classList.add("outline-disclosure");
    this.element.appendChild(this._headersTreeOutline.element);
    this._headersTreeOutline.expandTreeElementsWhenArrowing = true;

    this._securityOriginTreeElement = new TreeElement();
    this._securityOriginTreeElement.selectable = false;
    this._headersTreeOutline.appendChild(this._securityOriginTreeElement);

    this._nameTreeElement = new TreeElement();
    this._nameTreeElement.selectable = false;
    this._headersTreeOutline.appendChild(this._nameTreeElement);

    this._intVersionTreeElement = new TreeElement();
    this._intVersionTreeElement.selectable = false;
    this._headersTreeOutline.appendChild(this._intVersionTreeElement);

    this._stringVersionTreeElement = new TreeElement();
    this._stringVersionTreeElement.selectable = false;
    this._headersTreeOutline.appendChild(this._stringVersionTreeElement);

    this.update(database);
}

WebInspector.IDBDatabaseView.prototype = {
    /**
     * @return {!Array.<!WebInspector.StatusBarItem>}
     */
    statusBarItems: function()
    {
        return [];
    },

    /**
     * @param {string} name
     * @param {string} value
     */
    _formatHeader: function(name, value)
    {
        var fragment = createDocumentFragment();
        fragment.createChild("div", "attribute-name").textContent = name + ":";
        fragment.createChild("div", "attribute-value source-code").textContent = value;

        return fragment;
    },

    _refreshDatabase: function()
    {
        this._securityOriginTreeElement.title = this._formatHeader(WebInspector.UIString("Security origin"), this._database.databaseId.securityOrigin);
        this._nameTreeElement.title = this._formatHeader(WebInspector.UIString("Name"), this._database.databaseId.name);
        this._stringVersionTreeElement.title = this._formatHeader(WebInspector.UIString("String Version"), this._database.version);
        this._intVersionTreeElement.title = this._formatHeader(WebInspector.UIString("Integer Version"), this._database.intVersion);
    },

    /**
     * @param {!WebInspector.IndexedDBModel.Database} database
     */
    update: function(database)
    {
        this._database = database;
        this._refreshDatabase();
    },

    __proto__: WebInspector.VBox.prototype
}


/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.IndexedDBModel} model
 * @param {!WebInspector.IndexedDBModel.DatabaseId} databaseId
 * @param {!WebInspector.IndexedDBModel.ObjectStore} objectStore
 * @param {?WebInspector.IndexedDBModel.Index} index
 */
WebInspector.IDBDataView = function(model, databaseId, objectStore, index)
{
    WebInspector.VBox.call(this);
    this.registerRequiredCSS("resources/indexedDBViews.css");

    this._model = model;
    this._databaseId = databaseId;
    this._isIndex = !!index;

    this.element.classList.add("indexed-db-data-view");

    this._createEditorToolbar();

    this._refreshButton = new WebInspector.StatusBarButton(WebInspector.UIString("Refresh"), "refresh-status-bar-item");
    this._refreshButton.addEventListener("click", this._refreshButtonClicked, this);

    this._clearButton = new WebInspector.StatusBarButton(WebInspector.UIString("Clear object store"), "clear-status-bar-item");
    this._clearButton.addEventListener("click", this._clearButtonClicked, this);

    this._pageSize = 50;
    this._skipCount = 0;

    this.update(objectStore, index);
    this._entries = [];
}

WebInspector.IDBDataView.prototype = {
    /**
     * @return {!WebInspector.DataGrid}
     */
    _createDataGrid: function()
    {
        var keyPath = this._isIndex ? this._index.keyPath : this._objectStore.keyPath;

        var columns = [];
        columns.push({id: "number", title: WebInspector.UIString("#"), width: "50px"});
        columns.push({id: "key", titleDOMFragment: this._keyColumnHeaderFragment(WebInspector.UIString("Key"), keyPath)});
        if (this._isIndex)
            columns.push({id: "primaryKey", titleDOMFragment: this._keyColumnHeaderFragment(WebInspector.UIString("Primary key"), this._objectStore.keyPath)});
        columns.push({id: "value", title: WebInspector.UIString("Value")});

        var dataGrid = new WebInspector.DataGrid(columns);
        return dataGrid;
    },

    /**
     * @param {string} prefix
     * @param {*} keyPath
     * @return {!DocumentFragment}
     */
    _keyColumnHeaderFragment: function(prefix, keyPath)
    {
        var keyColumnHeaderFragment = createDocumentFragment();
        keyColumnHeaderFragment.createTextChild(prefix);
        if (keyPath === null)
            return keyColumnHeaderFragment;

        keyColumnHeaderFragment.createTextChild(" (" + WebInspector.UIString("Key path: "));
        if (Array.isArray(keyPath)) {
            keyColumnHeaderFragment.createTextChild("[");
            for (var i = 0; i < keyPath.length; ++i) {
                if (i != 0)
                    keyColumnHeaderFragment.createTextChild(", ");
                keyColumnHeaderFragment.appendChild(this._keyPathStringFragment(keyPath[i]));
            }
            keyColumnHeaderFragment.createTextChild("]");
        } else {
            var keyPathString = /** @type {string} */ (keyPath);
            keyColumnHeaderFragment.appendChild(this._keyPathStringFragment(keyPathString));
        }
        keyColumnHeaderFragment.createTextChild(")");
        return keyColumnHeaderFragment;
    },

    /**
     * @param {string} keyPathString
     * @return {!DocumentFragment}
     */
    _keyPathStringFragment: function(keyPathString)
    {
        var keyPathStringFragment = createDocumentFragment();
        keyPathStringFragment.createTextChild("\"");
        var keyPathSpan = keyPathStringFragment.createChild("span", "source-code indexed-db-key-path");
        keyPathSpan.textContent = keyPathString;
        keyPathStringFragment.createTextChild("\"");
        return keyPathStringFragment;
    },

    _createEditorToolbar: function()
    {
        var editorToolbar = new WebInspector.StatusBar(this.element);
        editorToolbar.element.classList.add("data-view-toolbar");

        this._pageBackButton = new WebInspector.StatusBarButton(WebInspector.UIString("Show previous page."), "play-backwards-status-bar-item");
        this._pageBackButton.addEventListener("click", this._pageBackButtonClicked, this);
        editorToolbar.appendStatusBarItem(this._pageBackButton);

        this._pageForwardButton = new WebInspector.StatusBarButton(WebInspector.UIString("Show next page."), "play-status-bar-item");
        this._pageForwardButton.setEnabled(false);
        this._pageForwardButton.addEventListener("click", this._pageForwardButtonClicked, this);
        editorToolbar.appendStatusBarItem(this._pageForwardButton);

        this._keyInputElement = editorToolbar.element.createChild("input", "key-input");
        this._keyInputElement.placeholder = WebInspector.UIString("Start from key");
        this._keyInputElement.addEventListener("paste", this._keyInputChanged.bind(this), false);
        this._keyInputElement.addEventListener("cut", this._keyInputChanged.bind(this), false);
        this._keyInputElement.addEventListener("keypress", this._keyInputChanged.bind(this), false);
        this._keyInputElement.addEventListener("keydown", this._keyInputChanged.bind(this), false);
    },

    _pageBackButtonClicked: function()
    {
        this._skipCount = Math.max(0, this._skipCount - this._pageSize);
        this._updateData(false);
    },

    _pageForwardButtonClicked: function()
    {
        this._skipCount = this._skipCount + this._pageSize;
        this._updateData(false);
    },

    _keyInputChanged: function()
    {
        window.setTimeout(this._updateData.bind(this, false), 0);
    },

    /**
     * @param {!WebInspector.IndexedDBModel.ObjectStore} objectStore
     * @param {?WebInspector.IndexedDBModel.Index} index
     */
    update: function(objectStore, index)
    {
        this._objectStore = objectStore;
        this._index = index;

        if (this._dataGrid)
            this._dataGrid.detach();
        this._dataGrid = this._createDataGrid();
        this._dataGrid.show(this.element);

        this._skipCount = 0;
        this._updateData(true);
    },

    /**
     * @param {string} keyString
     */
    _parseKey: function(keyString)
    {
        var result;
        try {
            result = JSON.parse(keyString);
        } catch (e) {
            result = keyString;
        }
        return result;
    },

    /**
     * @param {boolean} force
     */
    _updateData: function(force)
    {
        var key = this._parseKey(this._keyInputElement.value);
        var pageSize = this._pageSize;
        var skipCount = this._skipCount;
        this._refreshButton.setEnabled(false);
        this._clearButton.setEnabled(!this._isIndex);

        if (!force && this._lastKey === key && this._lastPageSize === pageSize && this._lastSkipCount === skipCount)
            return;

        if (this._lastKey !== key || this._lastPageSize !== pageSize) {
            skipCount = 0;
            this._skipCount = 0;
        }
        this._lastKey = key;
        this._lastPageSize = pageSize;
        this._lastSkipCount = skipCount;

        /**
         * @param {!Array.<!WebInspector.IndexedDBModel.Entry>} entries
         * @param {boolean} hasMore
         * @this {WebInspector.IDBDataView}
         */
        function callback(entries, hasMore)
        {
            this._refreshButton.setEnabled(true);
            this.clear();
            this._entries = entries;
            for (var i = 0; i < entries.length; ++i) {
                var data = {};
                data["number"] = i + skipCount;
                data["key"] = entries[i].key;
                data["primaryKey"] = entries[i].primaryKey;
                data["value"] = entries[i].value;

                var node = new WebInspector.IDBDataGridNode(data);
                this._dataGrid.rootNode().appendChild(node);
            }

            this._pageBackButton.setEnabled(!!skipCount);
            this._pageForwardButton.setEnabled(hasMore);
        }

        var idbKeyRange = key ? window.IDBKeyRange.lowerBound(key) : null;
        if (this._isIndex)
            this._model.loadIndexData(this._databaseId, this._objectStore.name, this._index.name, idbKeyRange, skipCount, pageSize, callback.bind(this));
        else
            this._model.loadObjectStoreData(this._databaseId, this._objectStore.name, idbKeyRange, skipCount, pageSize, callback.bind(this));
    },

    _refreshButtonClicked: function(event)
    {
        this._updateData(true);
    },

    _clearButtonClicked: function(event)
    {
        /**
         * @this {WebInspector.IDBDataView}
         */
        function cleared() {
            this._clearButton.setEnabled(true);
            this._updateData(true);
        }
        this._clearButton.setEnabled(false);
        this._model.clearObjectStore(this._databaseId, this._objectStore.name, cleared.bind(this));
    },

    /**
     * @return {!Array.<!WebInspector.StatusBarItem>}
     */
    statusBarItems: function()
    {
        return [this._refreshButton, this._clearButton];
    },

    clear: function()
    {
        this._dataGrid.rootNode().removeChildren();
        this._entries = [];
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.DataGridNode}
 * @param {!Object.<string, *>} data
 */
WebInspector.IDBDataGridNode = function(data)
{
    WebInspector.DataGridNode.call(this, data, false);
    this.selectable = false;
}

WebInspector.IDBDataGridNode.prototype = {
    /**
     * @override
     * @return {!Element}
     */
    createCell: function(columnIdentifier)
    {
        var cell = WebInspector.DataGridNode.prototype.createCell.call(this, columnIdentifier);
        var value = this.data[columnIdentifier];

        switch (columnIdentifier) {
        case "value":
        case "key":
        case "primaryKey":
            cell.removeChildren();
            this._formatValue(cell, value);
            break;
        default:
        }

        return cell;
    },

    _formatValue: function(cell, value)
    {
        var valueElement = WebInspector.ObjectPropertiesSection.createValueElement(value, false, cell);
        valueElement.classList.add("source-code");
        if (value.type === "object") {
            var section = new WebInspector.ObjectPropertiesSection(value, valueElement);
            section.editable = false;
            section.skipProto();
            cell.appendChild(section.element);
        } else {
            valueElement.classList.add("primitive-value");
            cell.appendChild(valueElement);
        }
    },

    __proto__: WebInspector.DataGridNode.prototype
}
