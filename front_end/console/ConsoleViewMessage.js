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
 * @implements {Console.ConsoleViewportElement}
 * @unrestricted
 */
Console.ConsoleViewMessage = class {
  /**
   * @param {!ConsoleModel.ConsoleMessage} consoleMessage
   * @param {!Components.Linkifier} linkifier
   * @param {!ProductRegistry.BadgePool} badgePool
   * @param {number} nestingLevel
   */
  constructor(consoleMessage, linkifier, badgePool, nestingLevel) {
    this._message = consoleMessage;
    this._linkifier = linkifier;
    this._badgePool = badgePool;
    this._repeatCount = 1;
    this._closeGroupDecorationCount = 0;
    this._nestingLevel = nestingLevel;

    /** @type {?DataGrid.DataGrid} */
    this._dataGrid = null;
    this._previewFormatter = new ObjectUI.RemoteObjectPreviewFormatter();
    this._searchRegex = null;
    /** @type {?UI.Icon} */
    this._messageLevelIcon = null;
  }

  /**
   * @override
   * @return {!Element}
   */
  element() {
    return this.toMessageElement();
  }

  /**
   * @override
   */
  wasShown() {
    if (this._dataGrid)
      this._dataGrid.updateWidths();
    this._isVisible = true;
  }

  onResize() {
    if (!this._isVisible)
      return;
    if (this._dataGrid)
      this._dataGrid.onResize();
  }

  /**
   * @override
   */
  willHide() {
    this._isVisible = false;
    this._cachedHeight = this.contentElement().offsetHeight;
  }

  /**
   * @return {number}
   */
  fastHeight() {
    if (this._cachedHeight)
      return this._cachedHeight;
    // This value reflects the 18px min-height of .console-message, plus the
    // 1px border of .console-message-wrapper. Keep in sync with consoleView.css.
    const defaultConsoleRowHeight = 19;
    if (this._message.type === ConsoleModel.ConsoleMessage.MessageType.Table) {
      var table = this._message.parameters[0];
      if (table && table.preview)
        return defaultConsoleRowHeight * table.preview.properties.length;
    }
    return defaultConsoleRowHeight;
  }

  /**
   * @return {!ConsoleModel.ConsoleMessage}
   */
  consoleMessage() {
    return this._message;
  }

  /**
   * @return {!Element}
   */
  _buildTableMessage() {
    var formattedMessage = createElement('span');
    UI.appendStyle(formattedMessage, 'object_ui/objectValue.css');
    formattedMessage.className = 'source-code';
    var anchorElement = this._buildMessageAnchor();
    if (anchorElement)
      formattedMessage.appendChild(anchorElement);
    var badgeElement = this._buildMessageBadge();
    if (badgeElement)
      formattedMessage.appendChild(badgeElement);

    var table = this._message.parameters && this._message.parameters.length ? this._message.parameters[0] : null;
    if (table)
      table = this._parameterToRemoteObject(table);
    if (!table || !table.preview)
      return formattedMessage;

    var rawValueColumnSymbol = Symbol('rawValueColumn');
    var columnNames = [];
    var preview = table.preview;
    var rows = [];
    for (var i = 0; i < preview.properties.length; ++i) {
      var rowProperty = preview.properties[i];
      var rowSubProperties;
      if (rowProperty.valuePreview)
        rowSubProperties = rowProperty.valuePreview.properties;
      else if (rowProperty.value)
        rowSubProperties = [{name: rawValueColumnSymbol, type: rowProperty.type, value: rowProperty.value}];
      else
        continue;

      var rowValue = {};
      const maxColumnsToRender = 20;
      for (var j = 0; j < rowSubProperties.length; ++j) {
        var cellProperty = rowSubProperties[j];
        var columnRendered = columnNames.indexOf(cellProperty.name) !== -1;
        if (!columnRendered) {
          if (columnNames.length === maxColumnsToRender)
            continue;
          columnRendered = true;
          columnNames.push(cellProperty.name);
        }

        if (columnRendered) {
          var cellElement = this._renderPropertyPreviewOrAccessor(table, [rowProperty, cellProperty]);
          cellElement.classList.add('console-message-nowrap-below');
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
    columnNames.unshift(Common.UIString('(index)'));
    var columnDisplayNames = columnNames.map(name => name === rawValueColumnSymbol ? Common.UIString('Value') : name);

    if (flatValues.length) {
      this._dataGrid = DataGrid.SortableDataGrid.create(columnDisplayNames, flatValues);
      this._dataGrid.setStriped(true);

      var formattedResult = createElementWithClass('span', 'console-message-text');
      var tableElement = formattedResult.createChild('div', 'console-message-formatted-table');
      var dataGridContainer = tableElement.createChild('span');
      tableElement.appendChild(this._formatParameter(table, true, false));
      dataGridContainer.appendChild(this._dataGrid.element);
      formattedMessage.appendChild(formattedResult);
      this._dataGrid.renderInline();
    }
    return formattedMessage;
  }

  /**
   * @return {!Element}
   */
  _buildMessage() {
    var messageElement;
    var messageText = this._message.messageText;
    if (this._message.source === ConsoleModel.ConsoleMessage.MessageSource.ConsoleAPI) {
      switch (this._message.type) {
        case ConsoleModel.ConsoleMessage.MessageType.Trace:
          messageElement = this._format(this._message.parameters || ['console.trace']);
          break;
        case ConsoleModel.ConsoleMessage.MessageType.Clear:
          messageElement = createElementWithClass('span', 'console-info');
          if (Common.moduleSetting('preserveConsoleLog').get())
            messageElement.textContent = Common.UIString('console.clear() was prevented due to \'Preserve log\'');
          else
            messageElement.textContent = Common.UIString('Console was cleared');
          messageElement.title =
              Common.UIString('Clear all messages with ' + UI.shortcutRegistry.shortcutTitleForAction('console.clear'));
          break;
        case ConsoleModel.ConsoleMessage.MessageType.Assert:
          var args = [Common.UIString('Assertion failed:')];
          if (this._message.parameters)
            args = args.concat(this._message.parameters);
          messageElement = this._format(args);
          break;
        case ConsoleModel.ConsoleMessage.MessageType.Dir:
          var obj = this._message.parameters ? this._message.parameters[0] : undefined;
          var args = ['%O', obj];
          messageElement = this._format(args);
          break;
        case ConsoleModel.ConsoleMessage.MessageType.Profile:
        case ConsoleModel.ConsoleMessage.MessageType.ProfileEnd:
          messageElement = this._format([messageText]);
          break;
        default:
          if (this._message.parameters && this._message.parameters.length === 1 &&
              this._message.parameters[0].type === 'string')
            messageElement = this._tryFormatAsError(/** @type {string} */ (this._message.parameters[0].value));
          var args = this._message.parameters || [messageText];
          messageElement = messageElement || this._format(args);
      }
    } else if (this._message.source === ConsoleModel.ConsoleMessage.MessageSource.Network) {
      var request = this._message.request;
      if (request) {
        messageElement = createElement('span');
        if (this._message.level === ConsoleModel.ConsoleMessage.MessageLevel.Error) {
          messageElement.createTextChild(request.requestMethod + ' ');
          messageElement.appendChild(Components.Linkifier.linkifyRevealable(request, request.url(), request.url()));
          if (request.failed)
            messageElement.createTextChildren(' ', request.localizedFailDescription);
          else
            messageElement.createTextChildren(' ', String(request.statusCode), ' (', request.statusText, ')');

        } else {
          var fragment = Console.ConsoleViewMessage._linkifyWithCustomLinkifier(
              messageText,
              title => Components.Linkifier.linkifyRevealable(
                  /** @type {!SDK.NetworkRequest} */ (request), title, request.url()));
          messageElement.appendChild(fragment);
        }
      } else {
        messageElement = this._format([messageText]);
      }
    } else {
      var messageInParameters =
          this._message.parameters && messageText === /** @type {string} */ (this._message.parameters[0]);
      if (this._message.source === ConsoleModel.ConsoleMessage.MessageSource.Violation)
        messageText = Common.UIString('[Violation] %s', messageText);
      else if (this._message.source === ConsoleModel.ConsoleMessage.MessageSource.Intervention)
        messageText = Common.UIString('[Intervention] %s', messageText);
      else if (this._message.source === ConsoleModel.ConsoleMessage.MessageSource.Deprecation)
        messageText = Common.UIString('[Deprecation] %s', messageText);
      var args = this._message.parameters || [messageText];
      if (messageInParameters)
        args[0] = messageText;
      messageElement = this._format(args);
    }
    messageElement.classList.add('console-message-text');

    var formattedMessage = createElement('span');
    UI.appendStyle(formattedMessage, 'object_ui/objectValue.css');
    formattedMessage.className = 'source-code';

    var anchorElement = this._buildMessageAnchor();
    if (anchorElement)
      formattedMessage.appendChild(anchorElement);
    var badgeElement = this._buildMessageBadge();
    if (badgeElement)
      formattedMessage.appendChild(badgeElement);
    formattedMessage.appendChild(messageElement);
    return formattedMessage;
  }

  /**
   * @return {?Element}
   */
  _buildMessageAnchor() {
    var anchorElement = null;
    if (this._message.source !== ConsoleModel.ConsoleMessage.MessageSource.Network || this._message.request) {
      if (this._message.scriptId) {
        anchorElement = this._linkifyScriptId(
            this._message.scriptId, this._message.url || '', this._message.line, this._message.column);
      } else if (this._message.stackTrace && this._message.stackTrace.callFrames.length) {
        anchorElement = this._linkifyStackTraceTopFrame(this._message.stackTrace);
      } else if (this._message.url && this._message.url !== 'undefined') {
        anchorElement = this._linkifyLocation(this._message.url, this._message.line, this._message.column);
      }
    } else if (this._message.url) {
      anchorElement =
          Components.Linkifier.linkifyURL(this._message.url, {maxLength: Console.ConsoleViewMessage.MaxLengthForLinks});
    }

    // Append a space to prevent the anchor text from being glued to the console message when the user selects and copies the console messages.
    if (anchorElement) {
      var anchorWrapperElement = createElementWithClass('span', 'console-message-anchor');
      anchorWrapperElement.appendChild(anchorElement);
      anchorWrapperElement.createTextChild(' ');
      return anchorWrapperElement;
    }
    return null;
  }

  /**
   * @return {?Element}
   */
  _buildMessageBadge() {
    var badgeElement = this._badgeElement();
    if (!badgeElement)
      return null;
    badgeElement.classList.add('console-message-badge');
    return badgeElement;
  }

  /**
   * @return {?Element}
   */
  _badgeElement() {
    if (this._message._url)
      return this._badgePool.badgeForURL(new Common.ParsedURL(this._message._url));
    if (this._message.stackTrace) {
      var stackTrace = this._message.stackTrace;
      while (stackTrace) {
        for (var callFrame of this._message.stackTrace.callFrames) {
          if (callFrame.url)
            return this._badgePool.badgeForURL(new Common.ParsedURL(callFrame.url));
        }
        stackTrace = stackTrace.parent;
      }
    }
    if (!this._message.executionContextId)
      return null;
    var runtimeModel = this._message.runtimeModel();
    if (!runtimeModel)
      return null;
    var executionContext = runtimeModel.executionContext(this._message.executionContextId);
    if (!executionContext || !executionContext.frameId)
      return null;
    var resourceTreeModel = executionContext.target().model(SDK.ResourceTreeModel);
    if (!resourceTreeModel)
      return null;
    var frame = resourceTreeModel.frameForId(executionContext.frameId);
    if (!frame || !frame.parentFrame)
      return null;
    return this._badgePool.badgeForFrame(frame);
  }

  /**
   * @return {!Element}
   */
  _buildMessageWithStackTrace() {
    var toggleElement = createElementWithClass('div', 'console-message-stack-trace-toggle');
    var contentElement = toggleElement.createChild('div', 'console-message-stack-trace-wrapper');

    var messageElement = this._buildMessage();
    var icon = UI.Icon.create('smallicon-triangle-right', 'console-message-expand-icon');
    var clickableElement = contentElement.createChild('div');
    clickableElement.appendChild(icon);

    clickableElement.appendChild(messageElement);
    var stackTraceElement = contentElement.createChild('div');
    var stackTracePreview = Components.DOMPresentationUtils.buildStackTracePreviewContents(
        this._message.runtimeModel().target(), this._linkifier, this._message.stackTrace);
    stackTraceElement.appendChild(stackTracePreview);
    stackTraceElement.classList.add('hidden');

    /**
     * @param {boolean} expand
     */
    function expandStackTrace(expand) {
      icon.setIconType(expand ? 'smallicon-triangle-down' : 'smallicon-triangle-right');
      stackTraceElement.classList.toggle('hidden', !expand);
    }

    /**
     * @param {?Event} event
     */
    function toggleStackTrace(event) {
      if (event.target.hasSelection())
        return;
      expandStackTrace(stackTraceElement.classList.contains('hidden'));
      event.consume();
    }

    clickableElement.addEventListener('click', toggleStackTrace, false);
    if (this._message.type === ConsoleModel.ConsoleMessage.MessageType.Trace)
      expandStackTrace(true);

    toggleElement._expandStackTraceForTest = expandStackTrace.bind(null, true);
    return toggleElement;
  }

  /**
   * @param {string} url
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?Element}
   */
  _linkifyLocation(url, lineNumber, columnNumber) {
    if (!this._message.runtimeModel())
      return null;
    return this._linkifier.linkifyScriptLocation(
        this._message.runtimeModel().target(), null, url, lineNumber, columnNumber);
  }

  /**
   * @param {!Protocol.Runtime.StackTrace} stackTrace
   * @return {?Element}
   */
  _linkifyStackTraceTopFrame(stackTrace) {
    if (!this._message.runtimeModel())
      return null;
    return this._linkifier.linkifyStackTraceTopFrame(this._message.runtimeModel().target(), stackTrace);
  }

  /**
   * @param {string} scriptId
   * @param {string} url
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?Element}
   */
  _linkifyScriptId(scriptId, url, lineNumber, columnNumber) {
    if (!this._message.runtimeModel())
      return null;
    return this._linkifier.linkifyScriptLocation(
        this._message.runtimeModel().target(), scriptId, url, lineNumber, columnNumber);
  }

  /**
   * @param {!SDK.RemoteObject|!Protocol.Runtime.RemoteObject|string} parameter
   * @return {!SDK.RemoteObject}
   */
  _parameterToRemoteObject(parameter) {
    if (parameter instanceof SDK.RemoteObject)
      return parameter;
    var runtimeModel = this._message.runtimeModel();
    if (!runtimeModel)
      return SDK.RemoteObject.fromLocalObject(parameter);
    if (typeof parameter === 'object')
      return runtimeModel.createRemoteObject(parameter);
    return runtimeModel.createRemoteObjectFromPrimitiveValue(parameter);
  }

  /**
   * @param {!Array.<!SDK.RemoteObject|string>} rawParameters
   * @return {!Element}
   */
  _format(rawParameters) {
    // This node is used like a Builder. Values are continually appended onto it.
    var formattedResult = createElement('span');
    if (!rawParameters.length)
      return formattedResult;

    // Formatting code below assumes that parameters are all wrappers whereas frontend console
    // API allows passing arbitrary values as messages (strings, numbers, etc.). Wrap them here.
    // FIXME: Only pass runtime wrappers here.
    var parameters = [];
    for (var i = 0; i < rawParameters.length; ++i)
      parameters[i] = this._parameterToRemoteObject(rawParameters[i]);

    // There can be string log and string eval result. We distinguish between them based on message type.
    var shouldFormatMessage =
        SDK.RemoteObject.type((/** @type {!Array.<!SDK.RemoteObject>} **/ (parameters))[0]) === 'string' &&
        (this._message.type !== ConsoleModel.ConsoleMessage.MessageType.Result ||
         this._message.level === ConsoleModel.ConsoleMessage.MessageLevel.Error);

    // Multiple parameters with the first being a format string. Save unused substitutions.
    if (shouldFormatMessage) {
      var result = this._formatWithSubstitutionString(
          /** @type {string} **/ (parameters[0].description), parameters.slice(1), formattedResult);
      parameters = result.unusedSubstitutions;
      if (parameters.length)
        formattedResult.createTextChild(' ');
    }

    // Single parameter, or unused substitutions from above.
    for (var i = 0; i < parameters.length; ++i) {
      // Inline strings when formatting.
      if (shouldFormatMessage && parameters[i].type === 'string')
        formattedResult.appendChild(Console.ConsoleViewMessage._linkifyStringAsFragment(parameters[i].description));
      else
        formattedResult.appendChild(this._formatParameter(parameters[i], false, true));
      if (i < parameters.length - 1)
        formattedResult.createTextChild(' ');
    }
    return formattedResult;
  }

  /**
   * @param {!SDK.RemoteObject} output
   * @param {boolean=} forceObjectFormat
   * @param {boolean=} includePreview
   * @return {!Element}
   */
  _formatParameter(output, forceObjectFormat, includePreview) {
    if (output.customPreview())
      return (new ObjectUI.CustomPreviewComponent(output)).element;

    var type = forceObjectFormat ? 'object' : (output.subtype || output.type);
    var element;
    switch (type) {
      case 'error':
        element = this._formatParameterAsError(output);
        break;
      case 'function':
        element = this._formatParameterAsFunction(output, includePreview);
        break;
      case 'array':
      case 'arraybuffer':
      case 'blob':
      case 'dataview':
      case 'generator':
      case 'iterator':
      case 'map':
      case 'object':
      case 'promise':
      case 'proxy':
      case 'set':
      case 'typedarray':
      case 'weakmap':
      case 'weakset':
        element = this._formatParameterAsObject(output, includePreview);
        break;
      case 'node':
        element = output.isNode() ? this._formatParameterAsNode(output) : this._formatParameterAsObject(output, false);
        break;
      case 'string':
        element = this._formatParameterAsString(output);
        break;
      case 'boolean':
      case 'date':
      case 'null':
      case 'number':
      case 'regexp':
      case 'symbol':
      case 'undefined':
        element = this._formatParameterAsValue(output);
        break;
      default:
        element = this._formatParameterAsValue(output);
        console.error('Tried to format remote object of unknown type.');
    }
    element.classList.add('object-value-' + type);
    element.classList.add('source-code');
    return element;
  }

  /**
   * @param {!SDK.RemoteObject} obj
   * @return {!Element}
   */
  _formatParameterAsValue(obj) {
    var result = createElement('span');
    result.createTextChild(obj.description || '');
    if (obj.objectId)
      result.addEventListener('contextmenu', this._contextMenuEventFired.bind(this, obj), false);
    return result;
  }

  /**
   * @param {!SDK.RemoteObject} obj
   * @param {boolean=} includePreview
   * @return {!Element}
   */
  _formatParameterAsObject(obj, includePreview) {
    var titleElement = createElement('span');
    if (includePreview && obj.preview) {
      titleElement.classList.add('console-object-preview');
      this._previewFormatter.appendObjectPreview(titleElement, obj.preview, false /* isEntry */);
    } else if (obj.type === 'function') {
      ObjectUI.ObjectPropertiesSection.formatObjectAsFunction(obj, titleElement, false);
      titleElement.classList.add('object-value-function');
    } else {
      titleElement.createTextChild(obj.description || '');
    }

    if (!obj.hasChildren || obj.customPreview())
      return titleElement;

    var note = titleElement.createChild('span', 'object-state-note');
    note.classList.add('info-note');
    note.title = Common.UIString('Value below was evaluated just now.');

    var section = new ObjectUI.ObjectPropertiesSection(obj, titleElement, this._linkifier);
    section.element.classList.add('console-view-object-properties-section');
    section.enableContextMenu();
    return section.element;
  }

  /**
   * @param {!SDK.RemoteObject} func
   * @param {boolean=} includePreview
   * @return {!Element}
   */
  _formatParameterAsFunction(func, includePreview) {
    var result = createElement('span');
    SDK.RemoteFunction.objectAsFunction(func).targetFunction().then(formatTargetFunction.bind(this));
    return result;

    /**
     * @param {!SDK.RemoteObject} targetFunction
     * @this {Console.ConsoleViewMessage}
     */
    function formatTargetFunction(targetFunction) {
      var functionElement = createElement('span');
      ObjectUI.ObjectPropertiesSection.formatObjectAsFunction(targetFunction, functionElement, true, includePreview);
      result.appendChild(functionElement);
      if (targetFunction !== func) {
        var note = result.createChild('span', 'object-info-state-note');
        note.title = Common.UIString('Function was resolved from bound function.');
      }
      result.addEventListener('contextmenu', this._contextMenuEventFired.bind(this, targetFunction), false);
    }
  }

  /**
   * @param {!SDK.RemoteObject} obj
   * @param {!Event} event
   */
  _contextMenuEventFired(obj, event) {
    var contextMenu = new UI.ContextMenu(event);
    contextMenu.appendApplicableItems(obj);
    contextMenu.show();
  }

  /**
   * @param {?SDK.RemoteObject} object
   * @param {!Array.<!Protocol.Runtime.PropertyPreview>} propertyPath
   * @return {!Element}
   */
  _renderPropertyPreviewOrAccessor(object, propertyPath) {
    var property = propertyPath.peekLast();
    if (property.type === 'accessor')
      return this._formatAsAccessorProperty(object, propertyPath.map(property => property.name), false);
    return this._previewFormatter.renderPropertyPreview(
        property.type, /** @type {string} */ (property.subtype), property.value);
  }

  /**
   * @param {!SDK.RemoteObject} remoteObject
   * @return {!Element}
   */
  _formatParameterAsNode(remoteObject) {
    var result = createElement('span');

    var domModel = remoteObject.runtimeModel().target().model(SDK.DOMModel);
    if (!domModel)
      return result;
    domModel.pushObjectAsNodeToFrontend(remoteObject).then(node => {
      if (!node) {
        result.appendChild(this._formatParameterAsObject(remoteObject, false));
        return;
      }
      Common.Renderer.renderPromise(node).then(rendererElement => {
        result.appendChild(rendererElement);
        this._formattedParameterAsNodeForTest();
      });
    });

    return result;
  }

  _formattedParameterAsNodeForTest() {
  }

  /**
   * @param {!SDK.RemoteObject} output
   * @return {!Element}
   */
  _formatParameterAsString(output) {
    var span = createElement('span');
    span.appendChild(Console.ConsoleViewMessage._linkifyStringAsFragment(output.description || ''));

    var result = createElement('span');
    result.createChild('span', 'object-value-string-quote').textContent = '"';
    result.appendChild(span);
    result.createChild('span', 'object-value-string-quote').textContent = '"';
    return result;
  }

  /**
   * @param {!SDK.RemoteObject} output
   * @return {!Element}
   */
  _formatParameterAsError(output) {
    var result = createElement('span');
    var errorSpan = this._tryFormatAsError(output.description || '');
    result.appendChild(
        errorSpan ? errorSpan : Console.ConsoleViewMessage._linkifyStringAsFragment(output.description || ''));
    return result;
  }

  /**
   * @param {!SDK.RemoteObject} output
   * @return {!Element}
   */
  _formatAsArrayEntry(output) {
    return this._previewFormatter.renderPropertyPreview(output.type, output.subtype, output.description);
  }

  /**
   * @param {?SDK.RemoteObject} object
   * @param {!Array.<string>} propertyPath
   * @param {boolean} isArrayEntry
   * @return {!Element}
   */
  _formatAsAccessorProperty(object, propertyPath, isArrayEntry) {
    var rootElement = ObjectUI.ObjectPropertyTreeElement.createRemoteObjectAccessorPropertySpan(
        object, propertyPath, onInvokeGetterClick.bind(this));

    /**
     * @param {?SDK.RemoteObject} result
     * @param {boolean=} wasThrown
     * @this {Console.ConsoleViewMessage}
     */
    function onInvokeGetterClick(result, wasThrown) {
      if (!result)
        return;
      rootElement.removeChildren();
      if (wasThrown) {
        var element = rootElement.createChild('span');
        element.textContent = Common.UIString('<exception>');
        element.title = /** @type {string} */ (result.description);
      } else if (isArrayEntry) {
        rootElement.appendChild(this._formatAsArrayEntry(result));
      } else {
        // Make a PropertyPreview from the RemoteObject similar to the backend logic.
        const maxLength = 100;
        var type = result.type;
        var subtype = result.subtype;
        var description = '';
        if (type !== 'function' && result.description) {
          if (type === 'string' || subtype === 'regexp')
            description = result.description.trimMiddle(maxLength);
          else
            description = result.description.trimEnd(maxLength);
        }
        rootElement.appendChild(this._previewFormatter.renderPropertyPreview(type, subtype, description));
      }
    }

    return rootElement;
  }

  /**
   * @param {string} format
   * @param {!Array.<!SDK.RemoteObject>} parameters
   * @param {!Element} formattedResult
   */
  _formatWithSubstitutionString(format, parameters, formattedResult) {
    var formatters = {};

    /**
     * @param {boolean} force
     * @param {boolean} includePreview
     * @param {!SDK.RemoteObject} obj
     * @return {!Element}
     * @this {Console.ConsoleViewMessage}
     */
    function parameterFormatter(force, includePreview, obj) {
      return this._formatParameter(obj, force, includePreview);
    }

    function stringFormatter(obj) {
      return obj.description;
    }

    function floatFormatter(obj) {
      if (typeof obj.value !== 'number')
        return 'NaN';
      return obj.value;
    }

    function integerFormatter(obj) {
      if (typeof obj.value !== 'number')
        return 'NaN';
      return Math.floor(obj.value);
    }

    function bypassFormatter(obj) {
      return (obj instanceof Node) ? obj : '';
    }

    var currentStyle = null;
    function styleFormatter(obj) {
      currentStyle = {};
      var buffer = createElement('span');
      buffer.setAttribute('style', obj.description);
      for (var i = 0; i < buffer.style.length; i++) {
        var property = buffer.style[i];
        if (isWhitelistedProperty(property))
          currentStyle[property] = buffer.style[property];
      }
    }

    function isWhitelistedProperty(property) {
      var prefixes = [
        'background', 'border', 'color', 'font', 'line', 'margin', 'padding', 'text', '-webkit-background',
        '-webkit-border', '-webkit-font', '-webkit-margin', '-webkit-padding', '-webkit-text'
      ];
      for (var i = 0; i < prefixes.length; i++) {
        if (property.startsWith(prefixes[i]))
          return true;
      }
      return false;
    }

    // Firebug uses %o for formatting objects.
    formatters.o = parameterFormatter.bind(this, false /* force */, true /* includePreview */);
    formatters.s = stringFormatter;
    formatters.f = floatFormatter;
    // Firebug allows both %i and %d for formatting integers.
    formatters.i = integerFormatter;
    formatters.d = integerFormatter;

    // Firebug uses %c for styling the message.
    formatters.c = styleFormatter;

    // Support %O to force object formatting, instead of the type-based %o formatting.
    formatters.O = parameterFormatter.bind(this, true /* force */, false /* includePreview */);

    formatters._ = bypassFormatter;

    function append(a, b) {
      if (b instanceof Node) {
        a.appendChild(b);
      } else if (typeof b !== 'undefined') {
        var toAppend = Console.ConsoleViewMessage._linkifyStringAsFragment(String(b));
        if (currentStyle) {
          var wrapper = createElement('span');
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
    function applyCurrentStyle(element) {
      for (var key in currentStyle)
        element.style[key] = currentStyle[key];
    }

    // String.format does treat formattedResult like a Builder, result is an object.
    return String.format(format, parameters, formatters, formattedResult, append);
  }

  /**
   * @return {boolean}
   */
  matchesFilterRegex(regexObject) {
    regexObject.lastIndex = 0;
    var text = this.contentElement().deepTextContent();
    return regexObject.test(text);
  }

  /**
   * @param {string} filter
   * @return {boolean}
   */
  matchesFilterText(filter) {
    var text = this.contentElement().deepTextContent();
    return text.toLowerCase().includes(filter.toLowerCase());
  }

  updateTimestamp() {
    if (!this._contentElement)
      return;

    if (Common.moduleSetting('consoleTimestampsEnabled').get()) {
      if (!this._timestampElement)
        this._timestampElement = createElementWithClass('span', 'console-timestamp');
      this._timestampElement.textContent = formatTimestamp(this._message.timestamp, false) + ' ';
      this._timestampElement.title = formatTimestamp(this._message.timestamp, true);
      this._contentElement.insertBefore(this._timestampElement, this._contentElement.firstChild);
    } else if (this._timestampElement) {
      this._timestampElement.remove();
      delete this._timestampElement;
    }

    /**
     * @param {number} timestamp
     * @param {boolean} full
     * @return {string}
     */
    function formatTimestamp(timestamp, full) {
      var date = new Date(timestamp);
      var yymmdd = date.getFullYear() + '-' + leadZero(date.getMonth() + 1, 2) + '-' + leadZero(date.getDate(), 2);
      var hhmmssfff = leadZero(date.getHours(), 2) + ':' + leadZero(date.getMinutes(), 2) + ':' +
          leadZero(date.getSeconds(), 2) + '.' + leadZero(date.getMilliseconds(), 3);
      return full ? (yymmdd + ' ' + hhmmssfff) : hhmmssfff;

      /**
       * @param {number} value
       * @param {number} length
       * @return {string}
       */
      function leadZero(value, length) {
        var valueString = value.toString();
        var padding = length - valueString.length;
        return padding <= 0 ? valueString : '0'.repeat(padding) + valueString;
      }
    }
  }

  /**
   * @return {number}
   */
  nestingLevel() {
    return this._nestingLevel;
  }

  /**
   * @param {boolean} inSimilarGroup
   * @param {boolean=} isLast
   */
  setInSimilarGroup(inSimilarGroup, isLast) {
    this._inSimilarGroup = inSimilarGroup;
    this._lastInSimilarGroup = inSimilarGroup && !!isLast;
    if (this._similarGroupMarker && !inSimilarGroup) {
      this._similarGroupMarker.remove();
      this._similarGroupMarker = null;
    } else if (this._element && !this._similarGroupMarker && inSimilarGroup) {
      this._similarGroupMarker = createElementWithClass('div', 'nesting-level-marker');
      this._element.insertBefore(this._similarGroupMarker, this._element.firstChild);
      this._similarGroupMarker.classList.toggle('group-closed', this._lastInSimilarGroup);
    }
  }

  /**
   * @return {boolean}
   */
  isLastInSimilarGroup() {
    return this._inSimilarGroup && this._lastInSimilarGroup;
  }

  resetCloseGroupDecorationCount() {
    if (!this._closeGroupDecorationCount)
      return;
    this._closeGroupDecorationCount = 0;
    this._updateCloseGroupDecorations();
  }

  incrementCloseGroupDecorationCount() {
    ++this._closeGroupDecorationCount;
    this._updateCloseGroupDecorations();
  }

  _updateCloseGroupDecorations() {
    if (!this._nestingLevelMarkers)
      return;
    for (var i = 0, n = this._nestingLevelMarkers.length; i < n; ++i) {
      var marker = this._nestingLevelMarkers[i];
      marker.classList.toggle('group-closed', n - i <= this._closeGroupDecorationCount);
    }
  }

  /**
   * @return {!Element}
   */
  contentElement() {
    if (this._contentElement)
      return this._contentElement;

    var contentElement = createElementWithClass('div', 'console-message');
    if (this._messageLevelIcon)
      contentElement.appendChild(this._messageLevelIcon);
    this._contentElement = contentElement;
    if (this._message.type === ConsoleModel.ConsoleMessage.MessageType.StartGroup ||
        this._message.type === ConsoleModel.ConsoleMessage.MessageType.StartGroupCollapsed)
      contentElement.classList.add('console-group-title');

    var formattedMessage;
    var shouldIncludeTrace = !!this._message.stackTrace &&
        (this._message.source === ConsoleModel.ConsoleMessage.MessageSource.Network ||
         this._message.source === ConsoleModel.ConsoleMessage.MessageSource.Violation ||
         this._message.level === ConsoleModel.ConsoleMessage.MessageLevel.Error ||
         this._message.level === ConsoleModel.ConsoleMessage.MessageLevel.Warning ||
         this._message.type === ConsoleModel.ConsoleMessage.MessageType.Trace);
    if (this._message.runtimeModel() && shouldIncludeTrace)
      formattedMessage = this._buildMessageWithStackTrace();
    else if (this._message.type === ConsoleModel.ConsoleMessage.MessageType.Table)
      formattedMessage = this._buildTableMessage();
    else
      formattedMessage = this._buildMessage();
    contentElement.appendChild(formattedMessage);

    this.updateTimestamp();
    return this._contentElement;
  }

  /**
   * @return {!Element}
   */
  toMessageElement() {
    if (this._element)
      return this._element;

    this._element = createElement('div');
    this.updateMessageElement();
    return this._element;
  }

  updateMessageElement() {
    if (!this._element)
      return;

    this._element.className = 'console-message-wrapper';
    this._element.removeChildren();

    if (this._inSimilarGroup) {
      this._similarGroupMarker = this._element.createChild('div', 'nesting-level-marker');
      this._similarGroupMarker.classList.toggle('group-closed', this._lastInSimilarGroup);
    }

    this._nestingLevelMarkers = [];
    for (var i = 0; i < this._nestingLevel; ++i)
      this._nestingLevelMarkers.push(this._element.createChild('div', 'nesting-level-marker'));
    this._updateCloseGroupDecorations();
    this._element.message = this;

    switch (this._message.level) {
      case ConsoleModel.ConsoleMessage.MessageLevel.Verbose:
        this._element.classList.add('console-verbose-level');
        this._updateMessageLevelIcon('');
        break;
      case ConsoleModel.ConsoleMessage.MessageLevel.Info:
        this._element.classList.add('console-info-level');
        break;
      case ConsoleModel.ConsoleMessage.MessageLevel.Warning:
        this._element.classList.add('console-warning-level');
        this._updateMessageLevelIcon('smallicon-warning');
        break;
      case ConsoleModel.ConsoleMessage.MessageLevel.Error:
        this._element.classList.add('console-error-level');
        this._updateMessageLevelIcon('smallicon-error');
        break;
    }
    if (this._shouldRenderAsWarning())
      this._element.classList.add('console-warning-level');

    this._element.appendChild(this.contentElement());
    if (this._repeatCount > 1)
      this._showRepeatCountElement();
  }

  /**
   * @return {boolean}
   */
  _shouldRenderAsWarning() {
    return (this._message.level === ConsoleModel.ConsoleMessage.MessageLevel.Verbose ||
            this._message.level === ConsoleModel.ConsoleMessage.MessageLevel.Info) &&
        (this._message.source === ConsoleModel.ConsoleMessage.MessageSource.Violation ||
         this._message.source === ConsoleModel.ConsoleMessage.MessageSource.Deprecation ||
         this._message.source === ConsoleModel.ConsoleMessage.MessageSource.Intervention ||
         this._message.source === ConsoleModel.ConsoleMessage.MessageSource.Recommendation);
  }

  /**
   * @param {string} iconType
   */
  _updateMessageLevelIcon(iconType) {
    if (!iconType && !this._messageLevelIcon)
      return;
    if (iconType && !this._messageLevelIcon) {
      this._messageLevelIcon = UI.Icon.create('', 'message-level-icon');
      if (this._contentElement)
        this._contentElement.insertBefore(this._messageLevelIcon, this._contentElement.firstChild);
    }
    this._messageLevelIcon.setIconType(iconType);
  }

  /**
   * @return {number}
   */
  repeatCount() {
    return this._repeatCount || 1;
  }

  resetIncrementRepeatCount() {
    this._repeatCount = 1;
    if (!this._repeatCountElement)
      return;

    this._repeatCountElement.remove();
    if (this._contentElement)
      this._contentElement.classList.remove('repeated-message');
    delete this._repeatCountElement;
  }

  incrementRepeatCount() {
    this._repeatCount++;
    this._showRepeatCountElement();
  }

  /**
   * @param {number} repeatCount
   */
  setRepeatCount(repeatCount) {
    this._repeatCount = repeatCount;
    this._showRepeatCountElement();
  }

  _showRepeatCountElement() {
    if (!this._element)
      return;

    if (!this._repeatCountElement) {
      this._repeatCountElement = createElementWithClass('label', 'console-message-repeat-count', 'dt-small-bubble');
      switch (this._message.level) {
        case ConsoleModel.ConsoleMessage.MessageLevel.Warning:
          this._repeatCountElement.type = 'warning';
          break;
        case ConsoleModel.ConsoleMessage.MessageLevel.Error:
          this._repeatCountElement.type = 'error';
          break;
        case ConsoleModel.ConsoleMessage.MessageLevel.Verbose:
          this._repeatCountElement.type = 'verbose';
          break;
        default:
          this._repeatCountElement.type = 'info';
      }
      if (this._shouldRenderAsWarning())
        this._repeatCountElement.type = 'warning';

      this._element.insertBefore(this._repeatCountElement, this._contentElement);
      this._contentElement.classList.add('repeated-message');
    }
    this._repeatCountElement.textContent = this._repeatCount;
  }

  get text() {
    return this._message.messageText;
  }

  /**
   * @return {string}
   */
  toExportString() {
    var lines = [];
    var nodes = this.contentElement().childTextNodes();
    var messageContent = nodes.map(Components.Linkifier.untruncatedNodeText).join('');
    for (var i = 0; i < this.repeatCount(); ++i)
      lines.push(messageContent);
    return lines.join('\n');
  }

  /**
   * @param {?RegExp} regex
   */
  setSearchRegex(regex) {
    if (this._searchHiglightNodeChanges && this._searchHiglightNodeChanges.length)
      UI.revertDomChanges(this._searchHiglightNodeChanges);
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
      sourceRanges.push(new TextUtils.SourceRange(match.index, match[0].length));

    if (sourceRanges.length) {
      this._searchHighlightNodes =
          UI.highlightSearchResults(this.contentElement(), sourceRanges, this._searchHiglightNodeChanges);
    }
  }

  /**
   * @return {?RegExp}
   */
  searchRegex() {
    return this._searchRegex;
  }

  /**
   * @return {number}
   */
  searchCount() {
    return this._searchHighlightNodes.length;
  }

  /**
   * @return {!Element}
   */
  searchHighlightNode(index) {
    return this._searchHighlightNodes[index];
  }

  /**
   * @param {string} string
   * @return {?Element}
   */
  _tryFormatAsError(string) {
    /**
     * @param {string} prefix
     */
    function startsWith(prefix) {
      return string.startsWith(prefix);
    }

    var errorPrefixes = ['EvalError', 'ReferenceError', 'SyntaxError', 'TypeError', 'RangeError', 'Error', 'URIError'];
    if (!this._message.runtimeModel() || !errorPrefixes.some(startsWith))
      return null;
    var debuggerModel = this._message.runtimeModel().debuggerModel();

    var lines = string.split('\n');
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
      var left = hasOpenBracket ? openBracketIndex + 1 : lines[i].indexOf('at') + 3;
      var right = hasOpenBracket ? closeBracketIndex : lines[i].length;
      var linkCandidate = lines[i].substring(left, right);
      var splitResult = Common.ParsedURL.splitLineAndColumn(linkCandidate);
      if (!splitResult)
        return null;

      var parsed = splitResult.url.asParsedURL();
      var url;
      if (parsed)
        url = parsed.url;
      else if (debuggerModel.scriptsForSourceURL(splitResult.url).length)
        url = splitResult.url;
      else if (splitResult.url === '<anonymous>')
        continue;
      else
        return null;

      links.push({
        url: url,
        positionLeft: position + left,
        positionRight: position + right,
        lineNumber: splitResult.lineNumber,
        columnNumber: splitResult.columnNumber
      });
    }

    if (!links.length)
      return null;

    var formattedResult = createElement('span');
    var start = 0;
    for (var i = 0; i < links.length; ++i) {
      formattedResult.appendChild(
          Console.ConsoleViewMessage._linkifyStringAsFragment(string.substring(start, links[i].positionLeft)));
      formattedResult.appendChild(this._linkifier.linkifyScriptLocation(
          debuggerModel.target(), null, links[i].url, links[i].lineNumber, links[i].columnNumber));
      start = links[i].positionRight;
    }

    if (start !== string.length)
      formattedResult.appendChild(Console.ConsoleViewMessage._linkifyStringAsFragment(string.substring(start)));

    return formattedResult;
  }

  /**
   * @param {string} string
   * @param {function(string,string,number=,number=):!Node} linkifier
   * @return {!DocumentFragment}
   */
  static _linkifyWithCustomLinkifier(string, linkifier) {
    var container = createDocumentFragment();
    var tokens = this._tokenizeMessageText(string);
    for (var token of tokens) {
      switch (token.type) {
        case 'url': {
          var realURL = (token.text.startsWith('www.') ? 'http://' + token.text : token.text);
          var splitResult = Common.ParsedURL.splitLineAndColumn(realURL);
          var linkNode;
          if (splitResult)
            linkNode = linkifier(token.text, splitResult.url, splitResult.lineNumber, splitResult.columnNumber);
          else
            linkNode = linkifier(token.text, token.value);
          container.appendChild(linkNode);
          break;
        }
        default:
          container.appendChild(createTextNode(token.text));
          break;
      }
    }
    return container;
  }

  /**
   * @param {string} string
   * @return {!DocumentFragment}
   */
  static _linkifyStringAsFragment(string) {
    return Console.ConsoleViewMessage._linkifyWithCustomLinkifier(string, (text, url, lineNumber, columnNumber) => {
      return Components.Linkifier.linkifyURL(url, {text, lineNumber, columnNumber});
    });
  }

  /**
   * @param {string} string
   * @return {!Array<{type: string, text: string}>}
   */
  static _tokenizeMessageText(string) {
    if (!Console.ConsoleViewMessage._tokenizerRegexes) {
      var linkStringRegex =
          /(?:[a-zA-Z][a-zA-Z0-9+.-]{2,}:\/\/|data:|www\.)[\w$\-_+*'=\|\/\\(){}[\]^%@&#~,:;.!?]{2,}[\w$\-_+*=\|\/\\({^%@&#~]/;
      var pathLineRegex = /(?:\/[\w\.-]*)+\:[\d]+/;
      var timeRegex = /took [\d]+ms/;
      var eventRegex = /'\w+' event/;
      var milestoneRegex = /\sM[6-7]\d/;
      var autofillRegex = /\(suggested: \"[\w-]+\"\)/;
      var handlers = new Map();
      handlers.set(linkStringRegex, 'url');
      handlers.set(pathLineRegex, 'url');
      handlers.set(timeRegex, 'time');
      handlers.set(eventRegex, 'event');
      handlers.set(milestoneRegex, 'milestone');
      handlers.set(autofillRegex, 'autofill');
      Console.ConsoleViewMessage._tokenizerRegexes = Array.from(handlers.keys());
      Console.ConsoleViewMessage._tokenizerTypes = Array.from(handlers.values());
    }

    var results = TextUtils.TextUtils.splitStringByRegexes(string, Console.ConsoleViewMessage._tokenizerRegexes);
    return results.map(
        result => ({text: result.value, type: Console.ConsoleViewMessage._tokenizerTypes[result.regexIndex]}));
  }

  /**
   * @return {string}
   */
  groupKey() {
    if (!this._groupKey)
      this._groupKey = [this._message.source, this._message.level, this._message.type, this.groupTitle()].join(':');

    return this._groupKey;
  }

  /**
   * @return {string}
   */
  groupTitle() {
    var tokens = Console.ConsoleViewMessage._tokenizeMessageText(this._message.messageText);
    var result = tokens.reduce((acc, token) => {
      var text = token.text;
      if (token.type === 'url')
        text = Common.UIString('<URL>');
      else if (token.type === 'time')
        text = Common.UIString('took <N>ms');
      else if (token.type === 'event')
        text = Common.UIString('<some> event');
      else if (token.type === 'milestone')
        text = Common.UIString('M<XX>');
      else if (token.type === 'autofill')
        text = Common.UIString('<attribute>');
      return acc + text;
    }, '');
    return result.replace(/[%]o/g, '');
  }
};

/**
 * @unrestricted
 */
Console.ConsoleGroupViewMessage = class extends Console.ConsoleViewMessage {
  /**
   * @param {!ConsoleModel.ConsoleMessage} consoleMessage
   * @param {!Components.Linkifier} linkifier
   * @param {!ProductRegistry.BadgePool} badgePool
   * @param {number} nestingLevel
   */
  constructor(consoleMessage, linkifier, badgePool, nestingLevel) {
    console.assert(consoleMessage.isGroupStartMessage());
    super(consoleMessage, linkifier, badgePool, nestingLevel);
    this._collapsed = consoleMessage.type === ConsoleModel.ConsoleMessage.MessageType.StartGroupCollapsed;
    /** @type {?UI.Icon} */
    this._expandGroupIcon = null;
  }

  /**
   * @param {boolean} collapsed
   */
  setCollapsed(collapsed) {
    this._collapsed = collapsed;
    if (this._expandGroupIcon)
      this._expandGroupIcon.setIconType(this._collapsed ? 'smallicon-triangle-right' : 'smallicon-triangle-down');
  }

  /**
   * @return {boolean}
   */
  collapsed() {
    return this._collapsed;
  }

  /**
   * @override
   * @return {!Element}
   */
  toMessageElement() {
    if (!this._element) {
      super.toMessageElement();
      this._expandGroupIcon = UI.Icon.create('', 'expand-group-icon');
      this._element.insertBefore(this._expandGroupIcon, this._repeatCountElement || this._contentElement);
      this.setCollapsed(this._collapsed);
    }
    return this._element;
  }
};

/**
 * @const
 * @type {number}
 */
Console.ConsoleViewMessage.MaxLengthForLinks = 40;
