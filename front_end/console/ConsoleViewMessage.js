/*
 * Copyright (C) 2011 Google Inc.  All rights reserved.
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
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
 * @constructor
 * @implements {WebInspector.ViewportElement}
 * @param {!WebInspector.ConsoleMessage} consoleMessage
 * @param {!WebInspector.Linkifier} linkifier
 * @param {number} nestingLevel
 */
WebInspector.ConsoleViewMessage = function(consoleMessage, linkifier, nestingLevel)
{
    this._message = consoleMessage;
    this._linkifier = linkifier;
    this._repeatCount = 1;
    this._closeGroupDecorationCount = 0;
    this._nestingLevel = nestingLevel;

    /** @type {!Array.<!WebInspector.DataGrid>} */
    this._dataGrids = [];

    /** @type {!Object.<string, function(!WebInspector.RemoteObject, !Element, boolean=)>} */
    this._customFormatters = {
        "array": this._formatParameterAsArray,
        "typedarray": this._formatParameterAsArray,
        "error": this._formatParameterAsError,
        "function": this._formatParameterAsFunction,
        "generator": this._formatParameterAsObject,
        "iterator": this._formatParameterAsObject,
        "map": this._formatParameterAsObject,
        "node": this._formatParameterAsNode,
        "object": this._formatParameterAsObject,
        "promise": this._formatParameterAsObject,
        "proxy": this._formatParameterAsObject,
        "set": this._formatParameterAsObject,
        "string": this._formatParameterAsString
    };
    this._previewFormatter = new WebInspector.RemoteObjectPreviewFormatter();
    this._searchRegex = null;
}

WebInspector.ConsoleViewMessage.prototype = {
    /**
     * @return {?WebInspector.Target}
     */
    _target: function()
    {
        return this.consoleMessage().target();
    },

    /**
     * @override
     * @return {!Element}
     */
    element: function()
    {
        return this.toMessageElement();
    },

    /**
     * @override
     */
    wasShown: function()
    {
        for (var i = 0; this._dataGrids && i < this._dataGrids.length; ++i)
            this._dataGrids[i].updateWidths();
        this._isVisible = true;
    },

    onResize: function()
    {
        if (!this._isVisible)
            return;
        for (var i = 0; this._dataGrids && i < this._dataGrids.length; ++i)
            this._dataGrids[i].onResize();
    },

    /**
     * @override
     */
    willHide: function()
    {
        this._isVisible = false;
        this._cachedHeight = this.contentElement().offsetHeight;
    },

    /**
     * @return {number}
     */
    fastHeight: function()
    {
        if (this._cachedHeight)
            return this._cachedHeight;
        // This value reflects the 18px min-height of .console-message, plus the
        // 1px border of .console-message-wrapper. Keep in sync with consoleView.css.
        const defaultConsoleRowHeight = 19;
        if (this._message.type === WebInspector.ConsoleMessage.MessageType.Table) {
            var table = this._message.parameters[0];
            if (table && table.preview)
                return defaultConsoleRowHeight * table.preview.properties.length;
        }
        return defaultConsoleRowHeight;
    },

    /**
     * @return {!WebInspector.ConsoleMessage}
     */
    consoleMessage: function()
    {
        return this._message;
    },

    /**
     * @return {!Element}
     */
    _formatMessage: function()
    {
        var formattedMessage = createElement("span");
        WebInspector.appendStyle(formattedMessage, "components/objectValue.css");
        formattedMessage.className = "console-message-text source-code";

        /**
         * @param {string} title
         * @return {!Element}
         * @this {WebInspector.ConsoleMessage}
         */
        function linkifyRequest(title)
        {
            return WebInspector.Linkifier.linkifyUsingRevealer(/** @type {!WebInspector.NetworkRequest} */ (this.request), title, this.request.url);
        }

        var consoleMessage = this._message;
        var anchorElement;
        var messageElement;
        if (consoleMessage.source === WebInspector.ConsoleMessage.MessageSource.ConsoleAPI) {
            switch (consoleMessage.type) {
            case WebInspector.ConsoleMessage.MessageType.Trace:
                messageElement = this._format(consoleMessage.parameters || ["console.trace"]);
                break;
            case WebInspector.ConsoleMessage.MessageType.Clear:
                messageElement = createTextNode(WebInspector.UIString("Console was cleared"));
                formattedMessage.classList.add("console-info");
                break;
            case WebInspector.ConsoleMessage.MessageType.Assert:
                var args = [WebInspector.UIString("Assertion failed:")];
                if (consoleMessage.parameters)
                    args = args.concat(consoleMessage.parameters);
                messageElement = this._format(args);
                break;
            case WebInspector.ConsoleMessage.MessageType.Dir:
                var obj = consoleMessage.parameters ? consoleMessage.parameters[0] : undefined;
                var args = ["%O", obj];
                messageElement = this._format(args);
                break;
            case WebInspector.ConsoleMessage.MessageType.Profile:
            case WebInspector.ConsoleMessage.MessageType.ProfileEnd:
                messageElement = this._format([consoleMessage.messageText]);
                break;
            default:
                if (consoleMessage.parameters && consoleMessage.parameters.length === 1 && consoleMessage.parameters[0].type === "string")
                    messageElement = this._tryFormatAsError(/** @type {string} */(consoleMessage.parameters[0].value));
                var args = consoleMessage.parameters || [consoleMessage.messageText];
                messageElement = messageElement || this._format(args);
            }
        } else if (consoleMessage.source === WebInspector.ConsoleMessage.MessageSource.Network) {
            if (consoleMessage.request) {
                messageElement = createElement("span");
                if (consoleMessage.level === WebInspector.ConsoleMessage.MessageLevel.Error || consoleMessage.level === WebInspector.ConsoleMessage.MessageLevel.RevokedError) {
                    messageElement.createTextChildren(consoleMessage.request.requestMethod, " ");
                    messageElement.appendChild(WebInspector.Linkifier.linkifyUsingRevealer(consoleMessage.request, consoleMessage.request.url, consoleMessage.request.url));
                    if (consoleMessage.request.failed)
                        messageElement.createTextChildren(" ", consoleMessage.request.localizedFailDescription);
                    else
                        messageElement.createTextChildren(" ", String(consoleMessage.request.statusCode), " (", consoleMessage.request.statusText, ")");
                } else {
                    var fragment = WebInspector.linkifyStringAsFragmentWithCustomLinkifier(consoleMessage.messageText, linkifyRequest.bind(consoleMessage));
                    messageElement.appendChild(fragment);
                }
            } else {
                var url = consoleMessage.url;
                if (url) {
                    var isExternal = !WebInspector.resourceForURL(url) && !WebInspector.networkMapping.uiSourceCodeForURLForAnyTarget(url);
                    anchorElement = WebInspector.linkifyURLAsNode(url, url, "console-message-url", isExternal);
                }
                messageElement = this._format([consoleMessage.messageText]);
            }
        } else {
            var args = consoleMessage.parameters || [consoleMessage.messageText];
            messageElement = this._format(args);
        }

        if (consoleMessage.source !== WebInspector.ConsoleMessage.MessageSource.Network || consoleMessage.request) {
            if (consoleMessage.scriptId) {
                anchorElement = this._linkifyScriptId(consoleMessage.scriptId, consoleMessage.url || "", consoleMessage.line, consoleMessage.column);
            } else {
                if (consoleMessage.stackTrace && consoleMessage.stackTrace.callFrames.length)
                    anchorElement = this._linkifyStackTraceTopFrame(consoleMessage.stackTrace);
                else if (consoleMessage.url && consoleMessage.url !== "undefined")
                    anchorElement = this._linkifyLocation(consoleMessage.url, consoleMessage.line, consoleMessage.column);
            }
        }

        formattedMessage.appendChild(messageElement);
        if (anchorElement) {
            // Append a space to prevent the anchor text from being glued to the console message when the user selects and copies the console messages.
            anchorElement.appendChild(createTextNode(" "));
            formattedMessage.insertBefore(anchorElement, formattedMessage.firstChild);
        }

        var dumpStackTrace = !!consoleMessage.stackTrace && (consoleMessage.source === WebInspector.ConsoleMessage.MessageSource.Network || consoleMessage.level === WebInspector.ConsoleMessage.MessageLevel.Error || consoleMessage.level === WebInspector.ConsoleMessage.MessageLevel.RevokedError || consoleMessage.type === WebInspector.ConsoleMessage.MessageType.Trace || consoleMessage.level === WebInspector.ConsoleMessage.MessageLevel.Warning);
        var target = this._target();
        if (dumpStackTrace && target) {
            var toggleElement = createElementWithClass("div", "console-message-stack-trace-toggle");
            var triangleElement = toggleElement.createChild("div", "console-message-stack-trace-triangle");
            var contentElement = toggleElement.createChild("div", "console-message-stack-trace-wrapper");

            var clickableElement = contentElement.createChild("div");
            clickableElement.appendChild(formattedMessage);
            var stackTraceElement = contentElement.createChild("div");
            stackTraceElement.appendChild(WebInspector.DOMPresentationUtils.buildStackTracePreviewContents(target, this._linkifier, this._message.stackTrace));
            stackTraceElement.classList.add("hidden");

            /**
             * @param {boolean} expand
             */
            function expandStackTrace(expand)
            {
                stackTraceElement.classList.toggle("hidden", !expand);
                toggleElement.classList.toggle("expanded", expand);
            }

            /**
             * @param {?Event} event
             */
            function toggleStackTrace(event)
            {
                if (event.target.hasSelection())
                    return;
                expandStackTrace(stackTraceElement.classList.contains("hidden"));
                event.consume();
            }

            clickableElement.addEventListener("click", toggleStackTrace, false);
            triangleElement.addEventListener("click", toggleStackTrace, false);
            if (consoleMessage.type === WebInspector.ConsoleMessage.MessageType.Trace)
                expandStackTrace(true);

            toggleElement._expandStackTraceForTest = expandStackTrace.bind(null, true);
            formattedMessage = toggleElement;
        }

        return formattedMessage;
    },

    /**
     * @param {string} url
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?Element}
     */
    _linkifyLocation: function(url, lineNumber, columnNumber)
    {
        var target = this._target();
        if (!target)
            return null;
        return this._linkifier.linkifyScriptLocation(target, null, url, lineNumber, columnNumber, "console-message-url");
    },

    /**
     * @param {!RuntimeAgent.StackTrace} stackTrace
     * @return {?Element}
     */
    _linkifyStackTraceTopFrame: function(stackTrace)
    {
        var target = this._target();
        if (!target)
            return null;
        return this._linkifier.linkifyStackTraceTopFrame(target, stackTrace, "console-message-url");
    },

    /**
     * @param {string} scriptId
     * @param {string} url
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?Element}
     */
    _linkifyScriptId: function(scriptId, url, lineNumber, columnNumber)
    {
        var target = this._target();
        if (!target)
            return null;
        return this._linkifier.linkifyScriptLocation(target, scriptId, url, lineNumber, columnNumber, "console-message-url");
    },

    _format: function(parameters)
    {
        // This node is used like a Builder. Values are continually appended onto it.
        var formattedResult = createElement("span");
        if (!parameters.length)
            return formattedResult;

        var target = this._target();

        // Formatting code below assumes that parameters are all wrappers whereas frontend console
        // API allows passing arbitrary values as messages (strings, numbers, etc.). Wrap them here.
        for (var i = 0; i < parameters.length; ++i) {
            // FIXME: Only pass runtime wrappers here.
            if (parameters[i] instanceof WebInspector.RemoteObject)
                continue;

            if (!target) {
                parameters[i] = WebInspector.RemoteObject.fromLocalObject(parameters[i]);
                continue;
            }

            if (typeof parameters[i] === "object")
                parameters[i] = target.runtimeModel.createRemoteObject(parameters[i]);
            else
                parameters[i] = target.runtimeModel.createRemoteObjectFromPrimitiveValue(parameters[i]);
        }

        // There can be string log and string eval result. We distinguish between them based on message type.
        var shouldFormatMessage = WebInspector.RemoteObject.type(parameters[0]) === "string" && (this._message.type !== WebInspector.ConsoleMessage.MessageType.Result || this._message.level === WebInspector.ConsoleMessage.MessageLevel.Error || this._message.level === WebInspector.ConsoleMessage.MessageLevel.RevokedError);

        // Multiple parameters with the first being a format string. Save unused substitutions.
        if (shouldFormatMessage) {
            // Multiple parameters with the first being a format string. Save unused substitutions.
            var result = this._formatWithSubstitutionString(parameters[0].description, parameters.slice(1), formattedResult);
            parameters = result.unusedSubstitutions;
            if (parameters.length)
                formattedResult.createTextChild(" ");
        }

        if (this._message.type === WebInspector.ConsoleMessage.MessageType.Table) {
            formattedResult.appendChild(this._formatParameterAsTable(parameters));
            return formattedResult;
        }

        // Single parameter, or unused substitutions from above.
        for (var i = 0; i < parameters.length; ++i) {
            // Inline strings when formatting.
            if (shouldFormatMessage && parameters[i].type === "string")
                formattedResult.appendChild(WebInspector.linkifyStringAsFragment(parameters[i].description));
            else
                formattedResult.appendChild(this._formatParameter(parameters[i], false, true));
            if (i < parameters.length - 1)
                formattedResult.createTextChild(" ");
        }
        return formattedResult;
    },

    /**
     * @param {!WebInspector.RemoteObject} output
     * @param {boolean=} forceObjectFormat
     * @param {boolean=} includePreview
     * @return {!Element}
     */
    _formatParameter: function(output, forceObjectFormat, includePreview)
    {
        if (output.customPreview()) {
            return (new WebInspector.CustomPreviewComponent(output)).element;
        }

        var type = forceObjectFormat ? "object" : (output.subtype || output.type);
        var formatter = this._customFormatters[type] || this._formatParameterAsValue;
        var span = createElement("span");
        span.className = "object-value-" + type + " source-code";
        formatter.call(this, output, span, includePreview);
        return span;
    },

    /**
     * @param {!WebInspector.RemoteObject} obj
     * @param {!Element} elem
     */
    _formatParameterAsValue: function(obj, elem)
    {
        elem.createTextChild(obj.description || "");
        if (obj.objectId)
            elem.addEventListener("contextmenu", this._contextMenuEventFired.bind(this, obj), false);
    },

    /**
     * @param {!WebInspector.RemoteObject} obj
     * @param {!Element} elem
     * @param {boolean=} includePreview
     */
    _formatParameterAsObject: function(obj, elem, includePreview)
    {
        this._formatParameterAsArrayOrObject(obj, elem, includePreview);
    },

    /**
     * @param {!WebInspector.RemoteObject} obj
     * @param {!Element} elem
     * @param {boolean=} includePreview
     */
    _formatParameterAsArrayOrObject: function(obj, elem, includePreview)
    {
        var titleElement = createElement("span");
        if (includePreview && obj.preview) {
            titleElement.classList.add("console-object-preview");
            this._previewFormatter.appendObjectPreview(titleElement, obj.preview);
        } else {
            if (obj.type === "function") {
                WebInspector.ObjectPropertiesSection.formatObjectAsFunction(obj, titleElement, false);
                titleElement.classList.add("object-value-function");
            } else {
                titleElement.createTextChild(obj.description || "");
            }
        }

        var section = new WebInspector.ObjectPropertiesSection(obj, titleElement, this._linkifier);
        section.element.classList.add("console-view-object-properties-section");
        section.enableContextMenu();
        elem.appendChild(section.element);
    },

    /**
     * @param {!WebInspector.RemoteObject} func
     * @param {!Element} element
     * @param {boolean=} includePreview
     */
    _formatParameterAsFunction: function(func, element, includePreview)
    {
        WebInspector.RemoteFunction.objectAsFunction(func).targetFunction().then(formatTargetFunction.bind(this));

        /**
         * @param {!WebInspector.RemoteObject} targetFunction
         * @this {WebInspector.ConsoleViewMessage}
         */
        function formatTargetFunction(targetFunction)
        {
            var functionElement = createElement("span");
            WebInspector.ObjectPropertiesSection.formatObjectAsFunction(targetFunction, functionElement, true, includePreview);
            element.appendChild(functionElement);
            if (targetFunction !== func) {
                var note = element.createChild("span", "object-info-state-note");
                note.title = WebInspector.UIString("Function was resolved from bound function.");
            }
            element.addEventListener("contextmenu", this._contextMenuEventFired.bind(this, targetFunction), false);
        }
    },

    /**
     * @param {!WebInspector.RemoteObject} obj
     * @param {!Event} event
     */
    _contextMenuEventFired: function(obj, event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendApplicableItems(obj);
        contextMenu.show();
    },

    /**
     * @param {?WebInspector.RemoteObject} object
     * @param {!Array.<!RuntimeAgent.PropertyPreview>} propertyPath
     * @return {!Element}
     */
    _renderPropertyPreviewOrAccessor: function(object, propertyPath)
    {
        var property = propertyPath.peekLast();
        if (property.type === "accessor")
            return this._formatAsAccessorProperty(object, propertyPath.map(property => property.name), false);
        return this._previewFormatter.renderPropertyPreview(property.type, /** @type {string} */ (property.subtype), property.value);
    },

    /**
     * @param {!WebInspector.RemoteObject} object
     * @param {!Element} elem
     */
    _formatParameterAsNode: function(object, elem)
    {
        WebInspector.Renderer.renderPromise(object).then(appendRenderer.bind(this), failedToRender.bind(this));
        /**
         * @param {!Element} rendererElement
         * @this {WebInspector.ConsoleViewMessage}
         */
        function appendRenderer(rendererElement)
        {
            elem.appendChild(rendererElement);
            this._formattedParameterAsNodeForTest();
        }

        /**
         * @this {WebInspector.ConsoleViewMessage}
         */
        function failedToRender()
        {
            this._formatParameterAsObject(object, elem, false);
        }
    },

    _formattedParameterAsNodeForTest: function()
    {
    },

    /**
     * @param {!WebInspector.RemoteObject} array
     * @return {boolean}
     */
    useArrayPreviewInFormatter: function(array)
    {
        return this._message.type !== WebInspector.ConsoleMessage.MessageType.DirXML;
    },

    /**
     * @param {!WebInspector.RemoteObject} array
     * @param {!Element} elem
     */
    _formatParameterAsArray: function(array, elem)
    {
        var maxFlatArrayLength = 100;
        if (this.useArrayPreviewInFormatter(array) || array.arrayLength() > maxFlatArrayLength)
            this._formatParameterAsArrayOrObject(array, elem, this.useArrayPreviewInFormatter(array) || array.arrayLength() <= maxFlatArrayLength);
        else
            array.getAllProperties(false, this._printArrayResult.bind(this, array, elem));
    },

    /**
     * @param {!Array.<!WebInspector.RemoteObject>} parameters
     * @return {!Element}
     */
    _formatParameterAsTable: function(parameters)
    {
        var element = createElementWithClass("div", "console-message-formatted-table");
        var table = parameters[0];
        if (!table || !table.preview)
            return element;

        var columnNames = [];
        var preview = table.preview;
        var rows = [];
        for (var i = 0; i < preview.properties.length; ++i) {
            var rowProperty = preview.properties[i];
            var rowPreview = rowProperty.valuePreview;
            if (!rowPreview)
                continue;

            var rowValue = {};
            const maxColumnsToRender = 20;
            for (var j = 0; j < rowPreview.properties.length; ++j) {
                var cellProperty = rowPreview.properties[j];
                var columnRendered = columnNames.indexOf(cellProperty.name) !== -1;
                if (!columnRendered) {
                    if (columnNames.length === maxColumnsToRender)
                        continue;
                    columnRendered = true;
                    columnNames.push(cellProperty.name);
                }

                if (columnRendered) {
                    var cellElement = this._renderPropertyPreviewOrAccessor(table, [rowProperty, cellProperty]);
                    cellElement.classList.add("console-message-nowrap-below");
                    rowValue[cellProperty.name] = cellElement;
                }
            }
            rows.push([rowProperty.name, rowValue]);
        }

        var flatValues = [];
        for (var i = 0; i < rows.length; ++i) {
            var rowName = rows[i][0];
            var rowValue = rows[i][1];
            flatValues.push(rowName);
            for (var j = 0; j < columnNames.length; ++j)
                flatValues.push(rowValue[columnNames[j]]);
        }

        var dataGridContainer = element.createChild("span");
        element.appendChild(this._formatParameter(table, true, false));
        if (!flatValues.length)
            return element;

        columnNames.unshift(WebInspector.UIString("(index)"));
        var dataGrid = WebInspector.SortableDataGrid.create(columnNames, flatValues);
        dataGrid.renderInline();
        dataGridContainer.appendChild(dataGrid.element);
        this._dataGrids.push(dataGrid);
        return element;
    },

    /**
     * @param {!WebInspector.RemoteObject} output
     * @param {!Element} elem
     */
    _formatParameterAsString: function(output, elem)
    {
        var span = createElement("span");
        span.className = "object-value-string source-code";
        span.appendChild(WebInspector.linkifyStringAsFragment(output.description || ""));

        // Make black quotes.
        elem.classList.remove("object-value-string");
        elem.createTextChild("\"");
        elem.appendChild(span);
        elem.createTextChild("\"");
    },

    /**
     * @param {!WebInspector.RemoteObject} output
     * @param {!Element} elem
     */
    _formatParameterAsError: function(output, elem)
    {
        var span = elem.createChild("span", "object-value-error source-code");
        var errorSpan = this._tryFormatAsError(output.description || "");
        span.appendChild(errorSpan ? errorSpan : WebInspector.linkifyStringAsFragment(output.description || ""));
    },

    /**
     * @param {!WebInspector.RemoteObject} array
     * @param {!Element} elem
     * @param {?Array.<!WebInspector.RemoteObjectProperty>} properties
     */
    _printArrayResult: function(array, elem, properties)
    {
        if (!properties) {
            this._formatParameterAsObject(array, elem, false);
            return;
        }

        var titleElement = createElement("span");
        var elements = {};
        for (var i = 0; i < properties.length; ++i) {
            var property = properties[i];
            var name = property.name;
            if (isNaN(name))
                continue;
            if (property.getter)
                elements[name] = this._formatAsAccessorProperty(array, [name], true);
            else if (property.value)
                elements[name] = this._formatAsArrayEntry(property.value);
        }

        titleElement.createTextChild("[");
        var lastNonEmptyIndex = -1;

        function appendUndefined(titleElement, index)
        {
            if (index - lastNonEmptyIndex <= 1)
                return;
            var span = titleElement.createChild("span", "object-value-undefined");
            span.textContent = WebInspector.UIString("undefined × %d", index - lastNonEmptyIndex - 1);
        }

        var length = array.arrayLength();
        for (var i = 0; i < length; ++i) {
            var element = elements[i];
            if (!element)
                continue;

            if (i - lastNonEmptyIndex > 1) {
                appendUndefined(titleElement, i);
                titleElement.createTextChild(", ");
            }

            titleElement.appendChild(element);
            lastNonEmptyIndex = i;
            if (i < length - 1)
                titleElement.createTextChild(", ");
        }
        appendUndefined(titleElement, length);

        titleElement.createTextChild("]");

        var section = new WebInspector.ObjectPropertiesSection(array, titleElement, this._linkifier);
        section.element.classList.add("console-view-object-properties-section");
        section.enableContextMenu();
        elem.appendChild(section.element);
    },

    /**
     * @param {!WebInspector.RemoteObject} output
     * @return {!Element}
     */
    _formatAsArrayEntry: function(output)
    {
        return this._previewFormatter.renderPropertyPreview(output.type, output.subtype, output.description);
    },

    /**
     * @param {?WebInspector.RemoteObject} object
     * @param {!Array.<string>} propertyPath
     * @param {boolean} isArrayEntry
     * @return {!Element}
     */
    _formatAsAccessorProperty: function(object, propertyPath, isArrayEntry)
    {
        var rootElement = WebInspector.ObjectPropertyTreeElement.createRemoteObjectAccessorPropertySpan(object, propertyPath, onInvokeGetterClick.bind(this));

        /**
         * @param {?WebInspector.RemoteObject} result
         * @param {boolean=} wasThrown
         * @this {WebInspector.ConsoleViewMessage}
         */
        function onInvokeGetterClick(result, wasThrown)
        {
            if (!result)
                return;
            rootElement.removeChildren();
            if (wasThrown) {
                var element = rootElement.createChild("span");
                element.textContent = WebInspector.UIString("<exception>");
                element.title = /** @type {string} */ (result.description);
            } else if (isArrayEntry) {
                rootElement.appendChild(this._formatAsArrayEntry(result));
            } else {
                // Make a PropertyPreview from the RemoteObject similar to the backend logic.
                const maxLength = 100;
                var type = result.type;
                var subtype = result.subtype;
                var description = "";
                if (type !== "function" && result.description) {
                    if (type === "string" || subtype === "regexp")
                        description = result.description.trimMiddle(maxLength);
                    else
                        description = result.description.trimEnd(maxLength);
                }
                rootElement.appendChild(this._previewFormatter.renderPropertyPreview(type, subtype, description));
            }
        }

        return rootElement;
    },

    /**
     * @param {string} format
     * @param {!Array.<string>} parameters
     * @param {!Element} formattedResult
     */
    _formatWithSubstitutionString: function(format, parameters, formattedResult)
    {
        var formatters = {};

        /**
         * @param {boolean} force
         * @param {!WebInspector.RemoteObject} obj
         * @return {!Element}
         * @this {WebInspector.ConsoleViewMessage}
         */
        function parameterFormatter(force, obj)
        {
            return this._formatParameter(obj, force, false);
        }

        function stringFormatter(obj)
        {
            return obj.description;
        }

        function floatFormatter(obj)
        {
            if (typeof obj.value !== "number")
                return "NaN";
            return obj.value;
        }

        function integerFormatter(obj)
        {
            if (typeof obj.value !== "number")
                return "NaN";
            return Math.floor(obj.value);
        }

        function bypassFormatter(obj)
        {
            return (obj instanceof Node) ? obj : "";
        }

        var currentStyle = null;
        function styleFormatter(obj)
        {
            currentStyle = {};
            var buffer = createElement("span");
            buffer.setAttribute("style", obj.description);
            for (var i = 0; i < buffer.style.length; i++) {
                var property = buffer.style[i];
                if (isWhitelistedProperty(property))
                    currentStyle[property] = buffer.style[property];
            }
        }

        function isWhitelistedProperty(property)
        {
            var prefixes = ["background", "border", "color", "font", "line", "margin", "padding", "text", "-webkit-background", "-webkit-border", "-webkit-font", "-webkit-margin", "-webkit-padding", "-webkit-text"];
            for (var i = 0; i < prefixes.length; i++) {
                if (property.startsWith(prefixes[i]))
                    return true;
            }
            return false;
        }

        // Firebug uses %o for formatting objects.
        formatters.o = parameterFormatter.bind(this, false);
        formatters.s = stringFormatter;
        formatters.f = floatFormatter;
        // Firebug allows both %i and %d for formatting integers.
        formatters.i = integerFormatter;
        formatters.d = integerFormatter;

        // Firebug uses %c for styling the message.
        formatters.c = styleFormatter;

        // Support %O to force object formatting, instead of the type-based %o formatting.
        formatters.O = parameterFormatter.bind(this, true);

        formatters._ = bypassFormatter;

        function append(a, b)
        {
            if (b instanceof Node)
                a.appendChild(b);
            else if (typeof b !== "undefined") {
                var toAppend = WebInspector.linkifyStringAsFragment(String(b));
                if (currentStyle) {
                    var wrapper = createElement("span");
                    wrapper.appendChild(toAppend);
                    applyCurrentStyle(wrapper);
                    for (var i = 0; i < wrapper.children.length; ++i)
                        applyCurrentStyle(wrapper.children[i]);
                    toAppend = wrapper;
                }
                a.appendChild(toAppend);
            }
            return a;
        }

        /**
         * @param {!Element} element
         */
        function applyCurrentStyle(element)
        {
            for (var key in currentStyle)
                element.style[key] = currentStyle[key];
        }

        // String.format does treat formattedResult like a Builder, result is an object.
        return String.format(format, parameters, formatters, formattedResult, append);
    },

    /**
     * @return {boolean}
     */
    matchesFilterRegex: function(regexObject)
    {
        regexObject.lastIndex = 0;
        var text = this.contentElement().deepTextContent();
        return regexObject.test(text);
    },

    /**
     * @param {boolean} show
     */
    updateTimestamp: function(show)
    {
        if (!this._contentElement)
            return;

        if (show && !this.timestampElement) {
            this.timestampElement = createElementWithClass("span", "console-timestamp");
            this.timestampElement.textContent = (new Date(this._message.timestamp)).toConsoleTime() + " ";
            this._contentElement.insertBefore(this.timestampElement, this._contentElement.firstChild);
            return;
        }

        if (!show && this.timestampElement) {
            this.timestampElement.remove();
            delete this.timestampElement;
        }
    },

    /**
     * @return {number}
     */
    nestingLevel: function()
    {
        return this._nestingLevel;
    },

    resetCloseGroupDecorationCount: function()
    {
        if (!this._closeGroupDecorationCount)
            return;
        this._closeGroupDecorationCount = 0;
        this._updateCloseGroupDecorations();
    },

    incrementCloseGroupDecorationCount: function()
    {
        ++this._closeGroupDecorationCount;
        this._updateCloseGroupDecorations();
    },

    _updateCloseGroupDecorations: function()
    {
        if (!this._nestingLevelMarkers)
            return;
        for (var i = 0, n = this._nestingLevelMarkers.length; i < n; ++i) {
            var marker = this._nestingLevelMarkers[i];
            marker.classList.toggle("group-closed", n - i <= this._closeGroupDecorationCount);
        }
    },

    /**
     * @return {!Element}
     */
    contentElement: function()
    {
        if (this._contentElement)
            return this._contentElement;

        var contentElement = createElementWithClass("div", "console-message");
        this._contentElement = contentElement;

        if (this._message.type === WebInspector.ConsoleMessage.MessageType.StartGroup || this._message.type === WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed)
            contentElement.classList.add("console-group-title");

        contentElement.appendChild(this._formatMessage());

        this.updateTimestamp(WebInspector.moduleSetting("consoleTimestampsEnabled").get());

        return this._contentElement;
    },

    /**
     * @return {!Element}
     */
    toMessageElement: function()
    {
        if (this._element)
            return this._element;

        this._element = createElement("div");
        this.updateMessageElement();
        return this._element;
    },

    updateMessageElement: function()
    {
        if (!this._element)
            return;

        this._element.className = "console-message-wrapper";
        this._element.removeChildren();

        this._nestingLevelMarkers = [];
        for (var i = 0; i < this._nestingLevel; ++i)
            this._nestingLevelMarkers.push(this._element.createChild("div", "nesting-level-marker"));
        this._updateCloseGroupDecorations();
        this._element.message = this;

        switch (this._message.level) {
        case WebInspector.ConsoleMessage.MessageLevel.Log:
            this._element.classList.add("console-log-level");
            break;
        case WebInspector.ConsoleMessage.MessageLevel.Debug:
            this._element.classList.add("console-debug-level");
            break;
        case WebInspector.ConsoleMessage.MessageLevel.Warning:
            this._element.classList.add("console-warning-level");
            break;
        case WebInspector.ConsoleMessage.MessageLevel.Error:
            this._element.classList.add("console-error-level");
            break;
        case WebInspector.ConsoleMessage.MessageLevel.RevokedError:
            this._element.classList.add("console-revokedError-level");
            break;
        case WebInspector.ConsoleMessage.MessageLevel.Info:
            this._element.classList.add("console-info-level");
            break;
        }

        this._element.appendChild(this.contentElement());
        if (this._repeatCount > 1)
            this._showRepeatCountElement();
    },

    /**
     * @return {number}
     */
    repeatCount: function()
    {
        return this._repeatCount || 1;
    },

    resetIncrementRepeatCount: function()
    {
        this._repeatCount = 1;
        if (!this._repeatCountElement)
            return;

        this._repeatCountElement.remove();
        delete this._repeatCountElement;
    },

    incrementRepeatCount: function()
    {
        this._repeatCount++;
        this._showRepeatCountElement();
    },

    _showRepeatCountElement: function()
    {
        if (!this._contentElement)
            return;

        if (!this._repeatCountElement) {
            this._repeatCountElement = createElementWithClass("label", "console-message-repeat-count", "dt-small-bubble");
            switch (this._message.level) {
            case WebInspector.ConsoleMessage.MessageLevel.Warning:
                this._repeatCountElement.type = "warning";
                break;
            case WebInspector.ConsoleMessage.MessageLevel.Error:
                this._repeatCountElement.type = "error";
                break;
            case WebInspector.ConsoleMessage.MessageLevel.Debug:
                this._repeatCountElement.type = "debug";
                break;
            default:
                this._repeatCountElement.type = "info";
            }
            this._element.insertBefore(this._repeatCountElement, this._contentElement);
            this._contentElement.classList.add("repeated-message");
        }
        this._repeatCountElement.textContent = this._repeatCount;
    },

    get text()
    {
        return this._message.messageText;
    },

    /**
     * @param {?RegExp} regex
     */
    setSearchRegex: function(regex)
    {
        if (this._searchHiglightNodeChanges && this._searchHiglightNodeChanges.length)
            WebInspector.revertDomChanges(this._searchHiglightNodeChanges);
        this._searchRegex = regex;
        this._searchHighlightNodes = [];
        this._searchHiglightNodeChanges = [];
        if (!this._searchRegex)
            return;

        var text = this.contentElement().deepTextContent();
        var match;
        this._searchRegex.lastIndex = 0;
        var sourceRanges = [];
        while ((match = this._searchRegex.exec(text)) && match[0])
            sourceRanges.push(new WebInspector.SourceRange(match.index, match[0].length));

        if (sourceRanges.length)
            this._searchHighlightNodes = WebInspector.highlightSearchResults(this.contentElement(), sourceRanges, this._searchHiglightNodeChanges);
    },

    /**
     * @return {?RegExp}
     */
    searchRegex: function()
    {
        return this._searchRegex;
    },

    /**
     * @return {number}
     */
    searchCount: function()
    {
        return this._searchHighlightNodes.length;
    },

    /**
     * @return {!Element}
     */
    searchHighlightNode: function(index)
    {
        return this._searchHighlightNodes[index];
    },

    /**
     * @param {string} string
     * @return {?Element}
     */
    _tryFormatAsError: function(string)
    {
        /**
         * @param {string} prefix
         */
        function startsWith(prefix)
        {
            return string.startsWith(prefix);
        }

        var errorPrefixes = ["EvalError", "ReferenceError", "SyntaxError", "TypeError", "RangeError", "Error", "URIError"];
        var target = this._target();
        if (!target || !errorPrefixes.some(startsWith))
            return null;
        var debuggerModel = WebInspector.DebuggerModel.fromTarget(target);
        if (!debuggerModel)
            return null;

        var lines = string.split("\n");
        var links = [];
        var position = 0;
        for (var i = 0; i < lines.length; ++i) {
            position += i > 0 ? lines[i - 1].length + 1 : 0;
            var isCallFrameLine = /^\s*at\s/.test(lines[i]);
            if (!isCallFrameLine && links.length)
                return null;

            if (!isCallFrameLine)
                continue;

            var openBracketIndex = -1;
            var closeBracketIndex = -1;
            var match = /\([^\)\(]+\)/.exec(lines[i]);
            if (match) {
                openBracketIndex = match.index;
                closeBracketIndex = match.index + match[0].length - 1;
            }
            var hasOpenBracket = openBracketIndex !== -1;
            var left = hasOpenBracket ? openBracketIndex + 1 : lines[i].indexOf("at") + 3;
            var right = hasOpenBracket ? closeBracketIndex : lines[i].length;
            var linkCandidate = lines[i].substring(left, right);
            var splitResult = WebInspector.ParsedURL.splitLineAndColumn(linkCandidate);
            if (!splitResult)
                return null;

            var parsed = splitResult.url.asParsedURL();
            var url;
            if (parsed)
                url = parsed.url;
            else if (debuggerModel.scriptsForSourceURL(splitResult.url).length)
                url = splitResult.url;
            else if (splitResult.url === "<anonymous>")
                continue;
            else
                return null;

            links.push({url: url, positionLeft: position + left, positionRight: position + right, lineNumber: splitResult.lineNumber, columnNumber: splitResult.columnNumber});
        }

        if (!links.length)
            return null;

        var formattedResult = createElement("span");
        var start = 0;
        for (var i = 0; i < links.length; ++i) {
            formattedResult.appendChild(WebInspector.linkifyStringAsFragment(string.substring(start, links[i].positionLeft)));
            formattedResult.appendChild(this._linkifier.linkifyScriptLocation(target, null, links[i].url, links[i].lineNumber, links[i].columnNumber));
            start = links[i].positionRight;
        }

        if (start !== string.length)
            formattedResult.appendChild(WebInspector.linkifyStringAsFragment(string.substring(start)));

        return formattedResult;
    }
}

/**
 * @constructor
 * @extends {WebInspector.ConsoleViewMessage}
 * @param {!WebInspector.ConsoleMessage} consoleMessage
 * @param {!WebInspector.Linkifier} linkifier
 * @param {number} nestingLevel
 */
WebInspector.ConsoleGroupViewMessage = function(consoleMessage, linkifier, nestingLevel)
{
    console.assert(consoleMessage.isGroupStartMessage());
    WebInspector.ConsoleViewMessage.call(this, consoleMessage, linkifier, nestingLevel);
    this.setCollapsed(consoleMessage.type === WebInspector.ConsoleMessage.MessageType.StartGroupCollapsed);
}

WebInspector.ConsoleGroupViewMessage.prototype = {
    /**
     * @param {boolean} collapsed
     */
    setCollapsed: function(collapsed)
    {
        this._collapsed = collapsed;
        if (this._element)
            this._element.classList.toggle("collapsed", this._collapsed);
    },

    /**
     * @return {boolean}
     */
    collapsed: function()
    {
        return this._collapsed;
    },

    /**
     * @override
     * @return {!Element}
     */
    toMessageElement: function()
    {
        if (!this._element) {
            WebInspector.ConsoleViewMessage.prototype.toMessageElement.call(this);
            this._element.classList.toggle("collapsed", this._collapsed);
        }
        return this._element;
    },

    __proto__: WebInspector.ConsoleViewMessage.prototype
}
