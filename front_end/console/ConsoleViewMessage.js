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
 * @implements {UI.ViewportElement}
 * @unrestricted
 */
Console.ConsoleViewMessage = class {
  /**
   * @param {!SDK.ConsoleMessage} consoleMessage
   * @param {!Components.Linkifier} linkifier
   * @param {number} nestingLevel
   */
  constructor(consoleMessage, linkifier, nestingLevel) {
    this._message = consoleMessage;
    this._linkifier = linkifier;
    this._repeatCount = 1;
    this._closeGroupDecorationCount = 0;
    this._nestingLevel = nestingLevel;

    /** @type {?UI.DataGrid} */
    this._dataGrid = null;
    this._previewFormatter = new Components.RemoteObjectPreviewFormatter();
    this._searchRegex = null;
  }

  /**
   * @return {?SDK.Target}
   */
  _target() {
    return this.consoleMessage().target();
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
    if (this._message.type === SDK.ConsoleMessage.MessageType.Table) {
      var table = this._message.parameters[0];
      if (table && table.preview)
        return defaultConsoleRowHeight * table.preview.properties.length;
    }
    return defaultConsoleRowHeight;
  }

  /**
   * @return {!SDK.ConsoleMessage}
   */
  consoleMessage() {
    return this._message;
  }

  /**
   * @param {!SDK.ConsoleMessage} consoleMessage
   * @return {!Element}
   */
  _buildTableMessage(consoleMessage) {
    var formattedMessage = createElement('span');
    UI.appendStyle(formattedMessage, 'components/objectValue.css');
    formattedMessage.className = 'source-code';
    var anchorElement = this._buildMessageAnchor(consoleMessage);
    if (anchorElement)
      formattedMessage.appendChild(anchorElement);

    var table = consoleMessage.parameters && consoleMessage.parameters.length ? consoleMessage.parameters[0] : null;
    if (table)
      table = this._parameterToRemoteObject(table, this._target());
    if (!table || !table.preview)
      return formattedMessage;

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

    if (flatValues.length) {
      this._dataGrid = UI.SortableDataGrid.create(columnNames, flatValues);

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
   * @param {!SDK.ConsoleMessage} consoleMessage
   * @return {!Element}
   */
  _buildMessage(consoleMessage) {
    var messageElement;
    var messageText = consoleMessage.messageText;
    if (consoleMessage.source === SDK.ConsoleMessage.MessageSource.ConsoleAPI) {
      switch (consoleMessage.type) {
        case SDK.ConsoleMessage.MessageType.Trace:
          messageElement = this._format(consoleMessage.parameters || ['console.trace']);
          break;
        case SDK.ConsoleMessage.MessageType.Clear:
          messageElement = createElementWithClass('span', 'console-info');
          messageElement.textContent = Common.UIString('Console was cleared');
          break;
        case SDK.ConsoleMessage.MessageType.Assert:
          var args = [Common.UIString('Assertion failed:')];
          if (consoleMessage.parameters)
            args = args.concat(consoleMessage.parameters);
          messageElement = this._format(args);
          break;
        case SDK.ConsoleMessage.MessageType.Dir:
          var obj = consoleMessage.parameters ? consoleMessage.parameters[0] : undefined;
          var args = ['%O', obj];
          messageElement = this._format(args);
          break;
        case SDK.ConsoleMessage.MessageType.Profile:
        case SDK.ConsoleMessage.MessageType.ProfileEnd:
          messageElement = this._format([messageText]);
          break;
        default:
          if (consoleMessage.parameters && consoleMessage.parameters.length === 1 &&
              consoleMessage.parameters[0].type === 'string')
            messageElement = this._tryFormatAsError(/** @type {string} */ (consoleMessage.parameters[0].value));
          var args = consoleMessage.parameters || [messageText];
          messageElement = messageElement || this._format(args);
      }
    } else if (consoleMessage.source === SDK.ConsoleMessage.MessageSource.Network) {
      if (consoleMessage.request) {
        messageElement = createElement('span');
        if (consoleMessage.level === SDK.ConsoleMessage.MessageLevel.Error ||
            consoleMessage.level === SDK.ConsoleMessage.MessageLevel.RevokedError) {
          messageElement.createTextChild(consoleMessage.request.requestMethod + ' ');
          messageElement.appendChild(Components.Linkifier.linkifyRevealable(
              consoleMessage.request, consoleMessage.request.url, consoleMessage.request.url));
          if (consoleMessage.request.failed) {
            messageElement.createTextChildren(' ', consoleMessage.request.localizedFailDescription);
          } else {
            messageElement.createTextChildren(
                ' ', String(consoleMessage.request.statusCode), ' (', consoleMessage.request.statusText, ')');
          }
        } else {
          var fragment =
              Components.linkifyStringAsFragmentWithCustomLinkifier(messageText, linkifyRequest.bind(consoleMessage));
          messageElement.appendChild(fragment);
        }
      } else {
        messageElement = this._format([messageText]);
      }
    } else {
      if (consoleMessage.source === SDK.ConsoleMessage.MessageSource.Violation)
        messageText = Common.UIString('[Violation] %s', messageText);
      var args = consoleMessage.parameters || [messageText];
      messageElement = this._format(args);
    }
    messageElement.classList.add('console-message-text');

    var formattedMessage = createElement('span');
    UI.appendStyle(formattedMessage, 'components/objectValue.css');
    formattedMessage.className = 'source-code';

    var anchorElement = this._buildMessageAnchor(consoleMessage);
    if (anchorElement)
      formattedMessage.appendChild(anchorElement);
    formattedMessage.appendChild(messageElement);
    return formattedMessage;

    /**
     * @param {string} title
     * @return {!Element}
     * @this {SDK.ConsoleMessage}
     */
    function linkifyRequest(title) {
      return Components.Linkifier.linkifyRevealable(
          /** @type {!SDK.NetworkRequest} */ (this.request), title, this.request.url);
    }
  }

  /**
   * @param {!SDK.ConsoleMessage} consoleMessage
   * @return {?Element}
   */
  _buildMessageAnchor(consoleMessage) {
    var anchorElement = null;
    if (consoleMessage.source !== SDK.ConsoleMessage.MessageSource.Network || consoleMessage.request) {
      if (consoleMessage.scriptId) {
        anchorElement = this._linkifyScriptId(
            consoleMessage.scriptId, consoleMessage.url || '', consoleMessage.line, consoleMessage.column);
      } else if (consoleMessage.stackTrace && consoleMessage.stackTrace.callFrames.length) {
        anchorElement = this._linkifyStackTraceTopFrame(consoleMessage.stackTrace);
      } else if (consoleMessage.url && consoleMessage.url !== 'undefined') {
        anchorElement = this._linkifyLocation(consoleMessage.url, consoleMessage.line, consoleMessage.column);
      }
    } else if (consoleMessage.url) {
      anchorElement = Components.Linkifier.linkifyURL(consoleMessage.url, undefined, 'console-message-url');
    }

    // Append a space to prevent the anchor text from being glued to the console message when the user selects and copies the console messages.
    if (anchorElement)
      anchorElement.appendChild(createTextNode(' '));
    return anchorElement;
  }

  /**
   * @param {!SDK.ConsoleMessage} consoleMessage
   * @param {!SDK.Target} target
   * @param {!Components.Linkifier} linkifier
   * @return {!Element}
   */
  _buildMessageWithStackTrace(consoleMessage, target, linkifier) {
    var toggleElement = createElementWithClass('div', 'console-message-stack-trace-toggle');
    var contentElement = toggleElement.createChild('div', 'console-message-stack-trace-wrapper');

    var messageElement = this._buildMessage(consoleMessage);
    var clickableElement = contentElement.createChild('div');
    clickableElement.appendChild(messageElement);
    var stackTraceElement = contentElement.createChild('div');
    var stackTracePreview =
        Components.DOMPresentationUtils.buildStackTracePreviewContents(target, linkifier, consoleMessage.stackTrace);
    stackTraceElement.appendChild(stackTracePreview);
    stackTraceElement.classList.add('hidden');

    /**
     * @param {boolean} expand
     */
    function expandStackTrace(expand) {
      stackTraceElement.classList.toggle('hidden', !expand);
      toggleElement.classList.toggle('expanded', expand);
    }

    /**
     * @param {?Event} event
     */
    function toggleStackTrace(event) {
      var linkClicked = event.target && event.target.enclosingNodeOrSelfWithNodeName('a');
      if (event.target.hasSelection() || linkClicked)
        return;
      expandStackTrace(stackTraceElement.classList.contains('hidden'));
      event.consume();
    }

    clickableElement.addEventListener('click', toggleStackTrace, false);
    if (consoleMessage.type === SDK.ConsoleMessage.MessageType.Trace)
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
    var target = this._target();
    if (!target)
      return null;
    return this._linkifier.linkifyScriptLocation(target, null, url, lineNumber, columnNumber, 'console-message-url');
  }

  /**
   * @param {!Protocol.Runtime.StackTrace} stackTrace
   * @return {?Element}
   */
  _linkifyStackTraceTopFrame(stackTrace) {
    var target = this._target();
    if (!target)
      return null;
    return this._linkifier.linkifyStackTraceTopFrame(target, stackTrace, 'console-message-url');
  }

  /**
   * @param {string} scriptId
   * @param {string} url
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?Element}
   */
  _linkifyScriptId(scriptId, url, lineNumber, columnNumber) {
    var target = this._target();
    if (!target)
      return null;
    return this._linkifier.linkifyScriptLocation(
        target, scriptId, url, lineNumber, columnNumber, 'console-message-url');
  }

  /**
   * @param {!SDK.RemoteObject|!Object|string} parameter
   * @param {?SDK.Target} target
   * @return {!SDK.RemoteObject}
   */
  _parameterToRemoteObject(parameter, target) {
    if (parameter instanceof SDK.RemoteObject)
      return parameter;
    if (!target)
      return SDK.RemoteObject.fromLocalObject(parameter);
    if (typeof parameter === 'object')
      return target.runtimeModel.createRemoteObject(parameter);
    return target.runtimeModel.createRemoteObjectFromPrimitiveValue(parameter);
  }

  /**
   * @param {!Array.<!SDK.RemoteObject|string>} parameters
   * @return {!Element}
   */
  _format(parameters) {
    // This node is used like a Builder. Values are continually appended onto it.
    var formattedResult = createElement('span');
    if (!parameters.length)
      return formattedResult;

    // Formatting code below assumes that parameters are all wrappers whereas frontend console
    // API allows passing arbitrary values as messages (strings, numbers, etc.). Wrap them here.
    // FIXME: Only pass runtime wrappers here.
    for (var i = 0; i < parameters.length; ++i)
      parameters[i] = this._parameterToRemoteObject(parameters[i], this._target());

    // There can be string log and string eval result. We distinguish between them based on message type.
    var shouldFormatMessage =
        SDK.RemoteObject.type((/** @type {!Array.<!SDK.RemoteObject>} **/ (parameters))[0]) === 'string' &&
        (this._message.type !== SDK.ConsoleMessage.MessageType.Result ||
         this._message.level === SDK.ConsoleMessage.MessageLevel.Error ||
         this._message.level === SDK.ConsoleMessage.MessageLevel.RevokedError);

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
        formattedResult.appendChild(Components.linkifyStringAsFragment(parameters[i].description));
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
      return (new Components.CustomPreviewComponent(output)).element;

    var type = forceObjectFormat ? 'object' : (output.subtype || output.type);
    var element;
    switch (type) {
      case 'array':
      case 'typedarray':
        element = this._formatParameterAsArray(output);
        break;
      case 'error':
        element = this._formatParameterAsError(output);
        break;
      case 'function':
      case 'generator':
        element = this._formatParameterAsFunction(output, includePreview);
        break;
      case 'iterator':
      case 'map':
      case 'object':
      case 'promise':
      case 'proxy':
      case 'set':
        element = this._formatParameterAsObject(output, includePreview);
        break;
      case 'node':
        element = this._formatParameterAsNode(output);
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
      this._previewFormatter.appendObjectPreview(titleElement, obj.preview);
    } else if (obj.type === 'function') {
      Components.ObjectPropertiesSection.formatObjectAsFunction(obj, titleElement, false);
      titleElement.classList.add('object-value-function');
    } else {
      titleElement.createTextChild(obj.description || '');
    }

    var section = new Components.ObjectPropertiesSection(obj, titleElement, this._linkifier);
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
      Components.ObjectPropertiesSection.formatObjectAsFunction(targetFunction, functionElement, true, includePreview);
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
   * @param {!SDK.RemoteObject} object
   * @return {!Element}
   */
  _formatParameterAsNode(object) {
    var result = createElement('span');
    Common.Renderer.renderPromise(object).then(appendRenderer.bind(this), failedToRender.bind(this));
    return result;

    /**
     * @param {!Element} rendererElement
     * @this {Console.ConsoleViewMessage}
     */
    function appendRenderer(rendererElement) {
      result.appendChild(rendererElement);
      this._formattedParameterAsNodeForTest();
    }

    /**
     * @this {Console.ConsoleViewMessage}
     */
    function failedToRender() {
      result.appendChild(this._formatParameterAsObject(object, false));
    }
  }

  _formattedParameterAsNodeForTest() {
  }

  /**
   * @param {!SDK.RemoteObject} array
   * @return {!Element}
   */
  _formatParameterAsArray(array) {
    var usePrintedArrayFormat = this._message.type !== SDK.ConsoleMessage.MessageType.DirXML &&
        this._message.type !== SDK.ConsoleMessage.MessageType.Result;
    var isLongArray = array.arrayLength() > 100;
    if (usePrintedArrayFormat || isLongArray)
      return this._formatParameterAsObject(array, usePrintedArrayFormat || !isLongArray);
    var result = createElement('span');
    array.getAllProperties(false, printArrayResult.bind(this));
    return result;

    /**
     * @param {?Array.<!SDK.RemoteObjectProperty>} properties
     * @this {!Console.ConsoleViewMessage}
     */
    function printArrayResult(properties) {
      if (!properties) {
        result.appendChild(this._formatParameterAsObject(array, false));
        return;
      }

      var titleElement = createElementWithClass('span', 'console-object-preview');
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

      titleElement.createTextChild('[');
      var lastNonEmptyIndex = -1;

      function appendUndefined(titleElement, index) {
        if (index - lastNonEmptyIndex <= 1)
          return;
        var span = titleElement.createChild('span', 'object-value-undefined');
        span.textContent = Common.UIString('undefined × %d', index - lastNonEmptyIndex - 1);
      }

      var length = array.arrayLength();
      for (var i = 0; i < length; ++i) {
        var element = elements[i];
        if (!element)
          continue;

        if (i - lastNonEmptyIndex > 1) {
          appendUndefined(titleElement, i);
          titleElement.createTextChild(', ');
        }

        titleElement.appendChild(element);
        lastNonEmptyIndex = i;
        if (i < length - 1)
          titleElement.createTextChild(', ');
      }
      appendUndefined(titleElement, length);

      titleElement.createTextChild(']');

      var section = new Components.ObjectPropertiesSection(array, titleElement, this._linkifier);
      section.element.classList.add('console-view-object-properties-section');
      section.enableContextMenu();
      result.appendChild(section.element);
    }
  }

  /**
   * @param {!SDK.RemoteObject} output
   * @return {!Element}
   */
  _formatParameterAsString(output) {
    var span = createElement('span');
    span.appendChild(Components.linkifyStringAsFragment(output.description || ''));

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
    result.appendChild(errorSpan ? errorSpan : Components.linkifyStringAsFragment(output.description || ''));
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
    var rootElement = Components.ObjectPropertyTreeElement.createRemoteObjectAccessorPropertySpan(
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
     * @param {!SDK.RemoteObject} obj
     * @return {!Element}
     * @this {Console.ConsoleViewMessage}
     */
    function parameterFormatter(force, obj) {
      return this._formatParameter(obj, force, false);
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

    function append(a, b) {
      if (b instanceof Node) {
        a.appendChild(b);
      } else if (typeof b !== 'undefined') {
        var toAppend = Components.linkifyStringAsFragment(String(b));
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
   * @param {boolean} show
   */
  updateTimestamp(show) {
    if (!this._contentElement)
      return;

    if (show && !this.timestampElement) {
      this.timestampElement = createElementWithClass('span', 'console-timestamp');
      this.timestampElement.textContent = (new Date(this._message.timestamp)).toConsoleTime() + ' ';
      this._contentElement.insertBefore(this.timestampElement, this._contentElement.firstChild);
      return;
    }

    if (!show && this.timestampElement) {
      this.timestampElement.remove();
      delete this.timestampElement;
    }
  }

  /**
   * @return {number}
   */
  nestingLevel() {
    return this._nestingLevel;
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
    this._contentElement = contentElement;
    if (this._message.type === SDK.ConsoleMessage.MessageType.StartGroup ||
        this._message.type === SDK.ConsoleMessage.MessageType.StartGroupCollapsed)
      contentElement.classList.add('console-group-title');

    var formattedMessage;
    var consoleMessage = this._message;
    var target = consoleMessage.target();
    var shouldIncludeTrace =
        !!consoleMessage.stackTrace && (consoleMessage.source === SDK.ConsoleMessage.MessageSource.Network ||
                                        consoleMessage.level === SDK.ConsoleMessage.MessageLevel.Error ||
                                        consoleMessage.level === SDK.ConsoleMessage.MessageLevel.RevokedError ||
                                        consoleMessage.type === SDK.ConsoleMessage.MessageType.Trace ||
                                        consoleMessage.level === SDK.ConsoleMessage.MessageLevel.Warning);
    if (target && shouldIncludeTrace)
      formattedMessage = this._buildMessageWithStackTrace(consoleMessage, target, this._linkifier);
    else if (this._message.type === SDK.ConsoleMessage.MessageType.Table)
      formattedMessage = this._buildTableMessage(this._message);
    else
      formattedMessage = this._buildMessage(consoleMessage);
    contentElement.appendChild(formattedMessage);

    this.updateTimestamp(Common.moduleSetting('consoleTimestampsEnabled').get());
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

    this._nestingLevelMarkers = [];
    for (var i = 0; i < this._nestingLevel; ++i)
      this._nestingLevelMarkers.push(this._element.createChild('div', 'nesting-level-marker'));
    this._updateCloseGroupDecorations();
    this._element.message = this;

    switch (this._message.level) {
      case SDK.ConsoleMessage.MessageLevel.Log:
        this._element.classList.add('console-log-level');
        break;
      case SDK.ConsoleMessage.MessageLevel.Debug:
        this._element.classList.add('console-debug-level');
        break;
      case SDK.ConsoleMessage.MessageLevel.Warning:
        this._element.classList.add('console-warning-level');
        break;
      case SDK.ConsoleMessage.MessageLevel.Error:
        this._element.classList.add('console-error-level');
        break;
      case SDK.ConsoleMessage.MessageLevel.RevokedError:
        this._element.classList.add('console-revokedError-level');
        break;
      case SDK.ConsoleMessage.MessageLevel.Info:
        this._element.classList.add('console-info-level');
        break;
    }

    this._element.appendChild(this.contentElement());
    if (this._repeatCount > 1)
      this._showRepeatCountElement();
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
    delete this._repeatCountElement;
  }

  incrementRepeatCount() {
    this._repeatCount++;
    this._showRepeatCountElement();
  }

  _showRepeatCountElement() {
    if (!this._contentElement)
      return;

    if (!this._repeatCountElement) {
      this._repeatCountElement = createElementWithClass('label', 'console-message-repeat-count', 'dt-small-bubble');
      switch (this._message.level) {
        case SDK.ConsoleMessage.MessageLevel.Warning:
          this._repeatCountElement.type = 'warning';
          break;
        case SDK.ConsoleMessage.MessageLevel.Error:
          this._repeatCountElement.type = 'error';
          break;
        case SDK.ConsoleMessage.MessageLevel.Debug:
          this._repeatCountElement.type = 'debug';
          break;
        default:
          this._repeatCountElement.type = 'info';
      }
      this._element.insertBefore(this._repeatCountElement, this._contentElement);
      this._contentElement.classList.add('repeated-message');
    }
    this._repeatCountElement.textContent = this._repeatCount;
  }

  get text() {
    return this._message.messageText;
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
      sourceRanges.push(new Common.SourceRange(match.index, match[0].length));

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
    var target = this._target();
    if (!target || !errorPrefixes.some(startsWith))
      return null;
    var debuggerModel = SDK.DebuggerModel.fromTarget(target);
    if (!debuggerModel)
      return null;

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
      formattedResult.appendChild(Components.linkifyStringAsFragment(string.substring(start, links[i].positionLeft)));
      formattedResult.appendChild(this._linkifier.linkifyScriptLocation(
          target, null, links[i].url, links[i].lineNumber, links[i].columnNumber));
      start = links[i].positionRight;
    }

    if (start !== string.length)
      formattedResult.appendChild(Components.linkifyStringAsFragment(string.substring(start)));

    return formattedResult;
  }
};

/**
 * @unrestricted
 */
Console.ConsoleGroupViewMessage = class extends Console.ConsoleViewMessage {
  /**
   * @param {!SDK.ConsoleMessage} consoleMessage
   * @param {!Components.Linkifier} linkifier
   * @param {number} nestingLevel
   */
  constructor(consoleMessage, linkifier, nestingLevel) {
    console.assert(consoleMessage.isGroupStartMessage());
    super(consoleMessage, linkifier, nestingLevel);
    this.setCollapsed(consoleMessage.type === SDK.ConsoleMessage.MessageType.StartGroupCollapsed);
  }

  /**
   * @param {boolean} collapsed
   */
  setCollapsed(collapsed) {
    this._collapsed = collapsed;
    if (this._element)
      this._element.classList.toggle('collapsed', this._collapsed);
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
      this._element.classList.toggle('collapsed', this._collapsed);
    }
    return this._element;
  }
};
