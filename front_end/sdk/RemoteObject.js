/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
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
 * @typedef {{object: ?SDK.RemoteObject, wasThrown: (boolean|undefined)}}
 */
SDK.CallFunctionResult;

SDK.RemoteObject = class {
  /**
   * This may not be an interface due to "instanceof SDK.RemoteObject" checks in the code.
   */

  /**
   * @param {*} value
   * @return {!SDK.RemoteObject}
   */
  static fromLocalObject(value) {
    return new SDK.LocalJSONObject(value);
  }

  /**
   * @param {!SDK.RemoteObject} remoteObject
   * @return {string}
   */
  static type(remoteObject) {
    if (remoteObject === null)
      return 'null';

    var type = typeof remoteObject;
    if (type !== 'object' && type !== 'function')
      return type;

    return remoteObject.type;
  }

  /**
   * @param {string} description
   * @return {string}
   */
  static arrayNameFromDescription(description) {
    return description.replace(SDK.RemoteObject._descriptionLengthParenRegex, '')
        .replace(SDK.RemoteObject._descriptionLengthSquareRegex, '');
  }

  /**
   * @param {!SDK.RemoteObject|!Protocol.Runtime.RemoteObject|!Protocol.Runtime.ObjectPreview} object
   * @return {number}
   */
  static arrayLength(object) {
    if (object.subtype !== 'array' && object.subtype !== 'typedarray')
      return 0;
    // Array lengths in V8-generated descriptions switched from square brackets to parentheses.
    // Both formats are checked in case the front end is dealing with an old version of V8.
    var parenMatches = object.description.match(SDK.RemoteObject._descriptionLengthParenRegex);
    var squareMatches = object.description.match(SDK.RemoteObject._descriptionLengthSquareRegex);
    return parenMatches ? parseInt(parenMatches[1], 10) : (squareMatches ? parseInt(squareMatches[1], 10) : 0);
  }

  /**
   * @param {!Protocol.Runtime.RemoteObject|!SDK.RemoteObject|number|string|boolean|undefined|null} object
   * @return {!Protocol.Runtime.CallArgument}
   */
  static toCallArgument(object) {
    var type = typeof object;
    if (type === 'undefined')
      return {};
    if (type === 'number') {
      var description = String(object);
      if (object === 0 && 1 / object < 0)
        return {unserializableValue: Protocol.Runtime.UnserializableValue.Negative0};
      if (description === 'NaN')
        return {unserializableValue: Protocol.Runtime.UnserializableValue.NaN};
      if (description === 'Infinity')
        return {unserializableValue: Protocol.Runtime.UnserializableValue.Infinity};
      if (description === '-Infinity')
        return {unserializableValue: Protocol.Runtime.UnserializableValue.NegativeInfinity};
      return {value: object};
    }
    if (type === 'string' || type === 'boolean')
      return {value: object};

    if (!object)
      return {value: null};

    if (typeof object.unserializableValue !== 'undefined')
      return {unserializableValue: object.unserializableValue};
    if (object instanceof SDK.RemoteObjectImpl && typeof object._unserializableValue !== 'undefined')
      return {unserializableValue: object._unserializableValue};

    if (typeof object.objectId !== 'undefined')
      return {objectId: object.objectId};

    return {value: object.value};
  }

  /**
   * @param {!SDK.RemoteObject} object
   * @param {boolean} generatePreview
   * @param {function(?Array.<!SDK.RemoteObjectProperty>, ?Array.<!SDK.RemoteObjectProperty>)} callback
   */
  static loadFromObjectPerProto(object, generatePreview, callback) {
    // Combines 2 asynch calls. Doesn't rely on call-back orders (some calls may be loop-back).
    var savedOwnProperties;
    var savedAccessorProperties;
    var savedInternalProperties;
    var resultCounter = 2;

    function processCallback() {
      if (--resultCounter)
        return;
      if (savedOwnProperties && savedAccessorProperties) {
        var propertiesMap = new Map();
        var propertySymbols = [];
        for (var i = 0; i < savedAccessorProperties.length; i++) {
          var property = savedAccessorProperties[i];
          if (property.symbol)
            propertySymbols.push(property);
          else
            propertiesMap.set(property.name, property);
        }
        for (var i = 0; i < savedOwnProperties.length; i++) {
          var property = savedOwnProperties[i];
          if (property.isAccessorProperty())
            continue;
          if (property.symbol)
            propertySymbols.push(property);
          else
            propertiesMap.set(property.name, property);
        }
        return callback(
            propertiesMap.valuesArray().concat(propertySymbols),
            savedInternalProperties ? savedInternalProperties : null);
      } else {
        callback(null, null);
      }
    }

    /**
     * @param {?Array.<!SDK.RemoteObjectProperty>} properties
     * @param {?Array.<!SDK.RemoteObjectProperty>} internalProperties
     */
    function allAccessorPropertiesCallback(properties, internalProperties) {
      savedAccessorProperties = properties;
      processCallback();
    }

    /**
     * @param {?Array.<!SDK.RemoteObjectProperty>} properties
     * @param {?Array.<!SDK.RemoteObjectProperty>} internalProperties
     */
    function ownPropertiesCallback(properties, internalProperties) {
      savedOwnProperties = properties;
      savedInternalProperties = internalProperties;
      processCallback();
    }

    object.getAllProperties(true /* accessorPropertiesOnly */, generatePreview, allAccessorPropertiesCallback);
    object.getOwnProperties(generatePreview, ownPropertiesCallback);
  }

  /**
   * @return {?Protocol.Runtime.CustomPreview}
   */
  customPreview() {
    return null;
  }

  /** @return {!Protocol.Runtime.RemoteObjectId|undefined} */
  get objectId() {
    return 'Not implemented';
  }

  /** @return {string} */
  get type() {
    throw 'Not implemented';
  }

  /** @return {string|undefined} */
  get subtype() {
    throw 'Not implemented';
  }

  /** @return {*} */
  get value() {
    throw 'Not implemented';
  }

  /** @return {string|undefined} */
  get description() {
    throw 'Not implemented';
  }

  /** @return {boolean} */
  get hasChildren() {
    throw 'Not implemented';
  }

  /**
   * @return {!Protocol.Runtime.ObjectPreview|undefined}
   */
  get preview() {
    return undefined;
  }

  /**
   * @return {number}
   */
  arrayLength() {
    throw 'Not implemented';
  }

  /**
   * @param {boolean} generatePreview
   * @param {function(?Array.<!SDK.RemoteObjectProperty>, ?Array.<!SDK.RemoteObjectProperty>)} callback
   */
  getOwnProperties(generatePreview, callback) {
    throw 'Not implemented';
  }

  /**
   * @param {boolean} generatePreview
   * @return {!Promise<!{properties: ?Array.<!SDK.RemoteObjectProperty>, internalProperties: ?Array.<!SDK.RemoteObjectProperty>}>}
   */
  getOwnPropertiesPromise(generatePreview) {
    return new Promise(promiseConstructor.bind(this));

    /**
     * @param {function(!{properties: ?Array.<!SDK.RemoteObjectProperty>, internalProperties: ?Array.<!SDK.RemoteObjectProperty>})} success
     * @this {SDK.RemoteObject}
     */
    function promiseConstructor(success) {
      this.getOwnProperties(!!generatePreview, getOwnPropertiesCallback.bind(null, success));
    }

    /**
     * @param {function(!{properties: ?Array.<!SDK.RemoteObjectProperty>, internalProperties: ?Array.<!SDK.RemoteObjectProperty>})} callback
     * @param {?Array.<!SDK.RemoteObjectProperty>} properties
     * @param {?Array.<!SDK.RemoteObjectProperty>} internalProperties
     */
    function getOwnPropertiesCallback(callback, properties, internalProperties) {
      callback({properties: properties, internalProperties: internalProperties});
    }
  }

  /**
   * @param {boolean} accessorPropertiesOnly
   * @param {boolean} generatePreview
   * @param {function(?Array<!SDK.RemoteObjectProperty>, ?Array<!SDK.RemoteObjectProperty>)} callback
   */
  getAllProperties(accessorPropertiesOnly, generatePreview, callback) {
    throw 'Not implemented';
  }

  /**
   * @param {boolean} accessorPropertiesOnly
   * @param {boolean} generatePreview
   * @return {!Promise<!{properties: ?Array<!SDK.RemoteObjectProperty>, internalProperties: ?Array<!SDK.RemoteObjectProperty>}>}
   */
  getAllPropertiesPromise(accessorPropertiesOnly, generatePreview) {
    return new Promise(promiseConstructor.bind(this));

    /**
     * @param {function(!{properties: ?Array<!SDK.RemoteObjectProperty>, internalProperties: ?Array.<!SDK.RemoteObjectProperty>})} success
     * @this {SDK.RemoteObject}
     */
    function promiseConstructor(success) {
      this.getAllProperties(accessorPropertiesOnly, generatePreview, getAllPropertiesCallback.bind(null, success));
    }

    /**
     * @param {function(!{properties: ?Array<!SDK.RemoteObjectProperty>, internalProperties: ?Array<!SDK.RemoteObjectProperty>})} callback
     * @param {?Array<!SDK.RemoteObjectProperty>} properties
     * @param {?Array<!SDK.RemoteObjectProperty>} internalProperties
     */
    function getAllPropertiesCallback(callback, properties, internalProperties) {
      callback({properties: properties, internalProperties: internalProperties});
    }
  }

  /**
   * @param {!Array.<string>} propertyPath
   * @param {function(?SDK.RemoteObject, boolean=)} callback
   */
  getProperty(propertyPath, callback) {
    throw 'Not implemented';
  }

  /**
   * @param {!Protocol.Runtime.CallArgument} name
   * @return {!Promise<string|undefined>}
   */
  async deleteProperty(name) {
    throw 'Not implemented';
  }

  /**
   * @param {string|!Protocol.Runtime.CallArgument} name
   * @param {string} value
   * @return {!Promise<string|undefined>}
   */
  async setPropertyValue(name, value) {
    throw 'Not implemented';
  }

  /**
   * @param {function(this:Object, ...)} functionDeclaration
   * @param {!Array<!Protocol.Runtime.CallArgument>=} args
   * @param {function(?SDK.RemoteObject, boolean=)=} callback
   */
  callFunction(functionDeclaration, args, callback) {
    throw 'Not implemented';
  }

  /**
   * @param {function(this:Object, ...)} functionDeclaration
   * @param {!Array<!Protocol.Runtime.CallArgument>=} args
   * @return {!Promise<!SDK.CallFunctionResult>}
   */
  callFunctionPromise(functionDeclaration, args) {
    return new Promise(promiseConstructor.bind(this));

    /**
     * @param {function(!SDK.CallFunctionResult)} success
     * @this {SDK.RemoteObject}
     */
    function promiseConstructor(success) {
      this.callFunction(functionDeclaration, args, callFunctionCallback.bind(null, success));
    }

    /**
     * @param {function(!SDK.CallFunctionResult)} callback
     * @param {?SDK.RemoteObject} object
     * @param {boolean=} wasThrown
     */
    function callFunctionCallback(callback, object, wasThrown) {
      callback({object: object, wasThrown: wasThrown});
    }
  }

  /**
   * @template T
   * @param {function(this:Object, ...):T} functionDeclaration
   * @param {!Array<!Protocol.Runtime.CallArgument>|undefined} args
   * @param {function(T)} callback
   */
  callFunctionJSON(functionDeclaration, args, callback) {
    throw 'Not implemented';
  }

  /**
   * @param {function(this:Object, ...):T} functionDeclaration
   * @param {!Array<!Protocol.Runtime.CallArgument>|undefined} args
   * @return {!Promise<T>}
   * @template T
   */
  callFunctionJSONPromise(functionDeclaration, args) {
    return new Promise(success => this.callFunctionJSON(functionDeclaration, args, success));
  }

  release() {
  }

  /**
   * @return {!SDK.DebuggerModel}
   */
  debuggerModel() {
    throw new Error('DebuggerModel-less object');
  }

  /**
   * @return {!SDK.RuntimeModel}
   */
  runtimeModel() {
    throw new Error('RuntimeModel-less object');
  }

  /**
   * @return {boolean}
   */
  isNode() {
    return false;
  }
};


SDK.RemoteObjectImpl = class extends SDK.RemoteObject {
  /**
   * @param {!SDK.RuntimeModel} runtimeModel
   * @param {string|undefined} objectId
   * @param {string} type
   * @param {string|undefined} subtype
   * @param {*} value
   * @param {!Protocol.Runtime.UnserializableValue=} unserializableValue
   * @param {string=} description
   * @param {!Protocol.Runtime.ObjectPreview=} preview
   * @param {!Protocol.Runtime.CustomPreview=} customPreview
   */
  constructor(runtimeModel, objectId, type, subtype, value, unserializableValue, description, preview, customPreview) {
    super();

    this._runtimeModel = runtimeModel;
    this._runtimeAgent = runtimeModel.target().runtimeAgent();

    this._type = type;
    this._subtype = subtype;
    if (objectId) {
      // handle
      this._objectId = objectId;
      this._description = description;
      this._hasChildren = (type !== 'symbol');
      this._preview = preview;
    } else {
      this._description = description;
      if (!this.description && unserializableValue)
        this._description = unserializableValue;
      if (!this._description && (typeof value !== 'object' || value === null))
        this._description = value + '';
      this._hasChildren = false;
      if (typeof unserializableValue !== 'undefined') {
        this._unserializableValue = unserializableValue;
        if (unserializableValue === Protocol.Runtime.UnserializableValue.Infinity ||
            unserializableValue === Protocol.Runtime.UnserializableValue.NegativeInfinity ||
            unserializableValue === Protocol.Runtime.UnserializableValue.Negative0 ||
            unserializableValue === Protocol.Runtime.UnserializableValue.NaN)
          this._value = Number(unserializableValue);
        else
          this._value = unserializableValue;

      } else {
        this._value = value;
      }
    }
    this._customPreview = customPreview || null;
  }

  /**
   * @override
   * @return {?Protocol.Runtime.CustomPreview}
   */
  customPreview() {
    return this._customPreview;
  }

  /**
   * @override
   * @return {!Protocol.Runtime.RemoteObjectId|undefined}
   */
  get objectId() {
    return this._objectId;
  }

  /**
   * @override
   * @return {string}
   */
  get type() {
    return this._type;
  }

  /**
   * @override
   * @return {string|undefined}
   */
  get subtype() {
    return this._subtype;
  }

  /**
   * @override
   * @return {*}
   */
  get value() {
    return this._value;
  }

  /**
   * @override
   * @return {string|undefined}
   */
  get description() {
    return this._description;
  }

  /**
   * @override
   * @return {boolean}
   */
  get hasChildren() {
    return this._hasChildren;
  }

  /**
   * @override
   * @return {!Protocol.Runtime.ObjectPreview|undefined}
   */
  get preview() {
    return this._preview;
  }

  /**
   * @override
   * @param {boolean} generatePreview
   * @param {function(?Array.<!SDK.RemoteObjectProperty>, ?Array.<!SDK.RemoteObjectProperty>)} callback
   */
  getOwnProperties(generatePreview, callback) {
    this.doGetProperties(true, false, generatePreview, callback);
  }

  /**
   * @override
   * @param {boolean} accessorPropertiesOnly
   * @param {boolean} generatePreview
   * @param {function(?Array.<!SDK.RemoteObjectProperty>, ?Array.<!SDK.RemoteObjectProperty>)} callback
   */
  getAllProperties(accessorPropertiesOnly, generatePreview, callback) {
    this.doGetProperties(false, accessorPropertiesOnly, generatePreview, callback);
  }

  /**
   * @override
   * @param {!Array.<string>} propertyPath
   * @param {function(?SDK.RemoteObject, boolean=)} callback
   */
  getProperty(propertyPath, callback) {
    /**
     * @param {string} arrayStr
     * @suppressReceiverCheck
     * @this {Object}
     */
    function remoteFunction(arrayStr) {
      var result = this;
      var properties = JSON.parse(arrayStr);
      for (var i = 0, n = properties.length; i < n; ++i)
        result = result[properties[i]];
      return result;
    }

    var args = [{value: JSON.stringify(propertyPath)}];
    this.callFunction(remoteFunction, args, callback);
  }

  /**
   * @param {boolean} ownProperties
   * @param {boolean} accessorPropertiesOnly
   * @param {boolean} generatePreview
   * @param {function(?Array<!SDK.RemoteObjectProperty>, ?Array<!SDK.RemoteObjectProperty>)} callback
   */
  doGetProperties(ownProperties, accessorPropertiesOnly, generatePreview, callback) {
    if (!this._objectId) {
      callback(null, null);
      return;
    }

    this._runtimeAgent
        .invoke_getProperties({objectId: this._objectId, ownProperties, accessorPropertiesOnly, generatePreview})
        .then(remoteObjectBinder.bind(this));

    /**
     * @param {!Protocol.RuntimeAgent.GetPropertiesResponse} response
     * @this {SDK.RemoteObjectImpl}
     */
    function remoteObjectBinder(response) {
      if (response[Protocol.Error]) {
        callback(null, null);
        return;
      }
      if (response.exceptionDetails) {
        this._runtimeModel.exceptionThrown(Date.now(), response.exceptionDetails);
        callback(null, null);
        return;
      }
      var properties = response.result;
      var internalProperties = response.internalProperties;
      var result = [];
      for (var i = 0; properties && i < properties.length; ++i) {
        var property = properties[i];
        var propertyValue = property.value ? this._runtimeModel.createRemoteObject(property.value) : null;
        var propertySymbol = property.symbol ? this._runtimeModel.createRemoteObject(property.symbol) : null;
        var remoteProperty = new SDK.RemoteObjectProperty(
            property.name, propertyValue, !!property.enumerable, !!property.writable, !!property.isOwn,
            !!property.wasThrown, propertySymbol);

        if (typeof property.value === 'undefined') {
          if (property.get && property.get.type !== 'undefined')
            remoteProperty.getter = this._runtimeModel.createRemoteObject(property.get);
          if (property.set && property.set.type !== 'undefined')
            remoteProperty.setter = this._runtimeModel.createRemoteObject(property.set);
        }

        result.push(remoteProperty);
      }
      var internalPropertiesResult = null;
      if (internalProperties) {
        internalPropertiesResult = [];
        for (var i = 0; i < internalProperties.length; i++) {
          var property = internalProperties[i];
          if (!property.value)
            continue;
          var propertyValue = this._runtimeModel.createRemoteObject(property.value);
          internalPropertiesResult.push(new SDK.RemoteObjectProperty(property.name, propertyValue, true, false));
        }
      }
      callback(result, internalPropertiesResult);
    }
  }

  /**
   * @override
   * @param {string|!Protocol.Runtime.CallArgument} name
   * @param {string} value
   * @return {!Promise<string|undefined>}
   */
  async setPropertyValue(name, value) {
    if (!this._objectId)
      return `Can't set a property of non-object.`;

    var response = await this._runtimeAgent.invoke_evaluate({expression: value, silent: true});
    if (response[Protocol.Error] || response.exceptionDetails) {
      return response[Protocol.Error] ||
          (response.result.type !== 'string' ? response.result.description :
                                               /** @type {string} */ (response.result.value));
    }

    if (typeof name === 'string')
      name = SDK.RemoteObject.toCallArgument(name);

    var resultPromise = this.doSetObjectPropertyValue(response.result, name);

    if (response.result.objectId)
      this._runtimeAgent.releaseObject(response.result.objectId);

    return resultPromise;
  }

  /**
   * @param {!Protocol.Runtime.RemoteObject} result
   * @param {!Protocol.Runtime.CallArgument} name
   * @return {!Promise<string|undefined>}
   */
  async doSetObjectPropertyValue(result, name) {
    // This assignment may be for a regular (data) property, and for an accessor property (with getter/setter).
    // Note the sensitive matter about accessor property: the property may be physically defined in some proto object,
    // but logically it is bound to the object in question. JavaScript passes this object to getters/setters, not the object
    // where property was defined; so do we.
    var setPropertyValueFunction = 'function(a, b) { this[a] = b; }';

    var argv = [name, SDK.RemoteObject.toCallArgument(result)];
    var response = await this._runtimeAgent.invoke_callFunctionOn(
        {objectId: this._objectId, functionDeclaration: setPropertyValueFunction, arguments: argv, silent: true});
    var error = response[Protocol.Error];
    return error || response.exceptionDetails ? error || response.result.description : undefined;
  }

  /**
   * @override
   * @param {!Protocol.Runtime.CallArgument} name
   * @return {!Promise<string|undefined>}
   */
  async deleteProperty(name) {
    if (!this._objectId)
      return `Can't delete a property of non-object.`;

    var deletePropertyFunction = 'function(a) { delete this[a]; return !(a in this); }';
    var response = await this._runtimeAgent.invoke_callFunctionOn(
        {objectId: this._objectId, functionDeclaration: deletePropertyFunction, arguments: [name], silent: true});

    if (response[Protocol.Error] || response.exceptionDetails)
      return response[Protocol.Error] || response.result.description;

    if (!response.result.value)
      return 'Failed to delete property.';
  }

  /**
   * @override
   * @param {function(this:Object, ...)} functionDeclaration
   * @param {!Array.<!Protocol.Runtime.CallArgument>=} args
   * @param {function(?SDK.RemoteObject, boolean=)=} callback
   */
  callFunction(functionDeclaration, args, callback) {
    this._runtimeAgent
        .invoke_callFunctionOn({
          objectId: this._objectId,
          functionDeclaration: functionDeclaration.toString(),
          arguments: args,
          silent: true
        })
        .then(response => {
          if (!callback)
            return;
          if (response[Protocol.Error])
            callback(null, false);
          else
            callback(this._runtimeModel.createRemoteObject(response.result), !!response.exceptionDetails);
        });
  }

  /**
   * @override
   * @param {function(this:Object)} functionDeclaration
   * @param {!Array.<!Protocol.Runtime.CallArgument>|undefined} args
   * @param {function(*)} callback
   */
  callFunctionJSON(functionDeclaration, args, callback) {
    this._runtimeAgent
        .invoke_callFunctionOn({
          objectId: this._objectId,
          functionDeclaration: functionDeclaration.toString(),
          arguments: args,
          silent: true,
          returnByValue: true
        })
        .then(
            response => callback(response[Protocol.Error] || response.exceptionDetails ? null : response.result.value));
  }

  /**
   * @override
   */
  release() {
    if (!this._objectId)
      return;
    this._runtimeAgent.releaseObject(this._objectId);
  }

  /**
   * @override
   * @return {number}
   */
  arrayLength() {
    return SDK.RemoteObject.arrayLength(this);
  }

  /**
   * @override
   * @return {!SDK.DebuggerModel}
   */
  debuggerModel() {
    return this._runtimeModel.debuggerModel();
  }

  /**
   * @override
   * @return {!SDK.RuntimeModel}
   */
  runtimeModel() {
    return this._runtimeModel;
  }

  /**
   * @override
   * @return {boolean}
   */
  isNode() {
    return !!this._objectId && this.type === 'object' && this.subtype === 'node';
  }
};


SDK.ScopeRemoteObject = class extends SDK.RemoteObjectImpl {
  /**
   * @param {!SDK.RuntimeModel} runtimeModel
   * @param {string|undefined} objectId
   * @param {!SDK.ScopeRef} scopeRef
   * @param {string} type
   * @param {string|undefined} subtype
   * @param {*} value
   * @param {!Protocol.Runtime.UnserializableValue=} unserializableValue
   * @param {string=} description
   * @param {!Protocol.Runtime.ObjectPreview=} preview
   */
  constructor(runtimeModel, objectId, scopeRef, type, subtype, value, unserializableValue, description, preview) {
    super(runtimeModel, objectId, type, subtype, value, unserializableValue, description, preview);
    this._scopeRef = scopeRef;
    this._savedScopeProperties = undefined;
  }

  /**
   * @override
   * @param {boolean} ownProperties
   * @param {boolean} accessorPropertiesOnly
   * @param {boolean} generatePreview
   * @param {function(?Array.<!SDK.RemoteObjectProperty>, ?Array.<!SDK.RemoteObjectProperty>)} callback
   */
  doGetProperties(ownProperties, accessorPropertiesOnly, generatePreview, callback) {
    if (accessorPropertiesOnly) {
      callback([], []);
      return;
    }

    if (this._savedScopeProperties) {
      // No need to reload scope variables, as the remote object never
      // changes its properties. If variable is updated, the properties
      // array is patched locally.
      callback(this._savedScopeProperties.slice(), []);
      return;
    }

    /**
     * @param {?Array.<!SDK.RemoteObjectProperty>} properties
     * @param {?Array.<!SDK.RemoteObjectProperty>} internalProperties
     * @this {SDK.ScopeRemoteObject}
     */
    function wrappedCallback(properties, internalProperties) {
      if (this._scopeRef && Array.isArray(properties)) {
        this._savedScopeProperties = properties.slice();
        if (!this._scopeRef.callFrameId) {
          for (var property of this._savedScopeProperties)
            property.writable = false;
        }
      }
      callback(properties, internalProperties);
    }

    // Scope objects always fetch preview.
    generatePreview = true;

    super.doGetProperties(ownProperties, accessorPropertiesOnly, generatePreview, wrappedCallback.bind(this));
  }

  /**
   * @override
   * @param {!Protocol.Runtime.RemoteObject} result
   * @param {!Protocol.Runtime.CallArgument} argumentName
   * @return {!Promise<string|undefined>}
   */
  async doSetObjectPropertyValue(result, argumentName) {
    var name = /** @type {string} */ (argumentName.value);
    var error = await this.debuggerModel().setVariableValue(
        this._scopeRef.number, name, SDK.RemoteObject.toCallArgument(result), this._scopeRef.callFrameId);
    if (error)
      return error;
    if (this._savedScopeProperties) {
      for (var property of this._savedScopeProperties) {
        if (property.name === name)
          property.value = this._runtimeModel.createRemoteObject(result);
      }
    }
  }
};

SDK.ScopeRef = class {
  /**
   * @param {number} number
   * @param {string=} callFrameId
   */
  constructor(number, callFrameId) {
    this.number = number;
    this.callFrameId = callFrameId;
  }
};

/**
 * @unrestricted
 */
SDK.RemoteObjectProperty = class {
  /**
   * @param {string} name
   * @param {?SDK.RemoteObject} value
   * @param {boolean=} enumerable
   * @param {boolean=} writable
   * @param {boolean=} isOwn
   * @param {boolean=} wasThrown
   * @param {?SDK.RemoteObject=} symbol
   * @param {boolean=} synthetic
   * @param {function(string):!Promise<?SDK.RemoteObject>=} syntheticSetter
   */
  constructor(name, value, enumerable, writable, isOwn, wasThrown, symbol, synthetic, syntheticSetter) {
    this.name = name;
    if (value !== null)
      this.value = value;
    this.enumerable = typeof enumerable !== 'undefined' ? enumerable : true;
    var isNonSyntheticOrSyntheticWritable = !synthetic || !!syntheticSetter;
    this.writable = typeof writable !== 'undefined' ? writable : isNonSyntheticOrSyntheticWritable;
    this.isOwn = !!isOwn;
    this.wasThrown = !!wasThrown;
    if (symbol)
      this.symbol = symbol;
    this.synthetic = !!synthetic;
    if (syntheticSetter)
      this.syntheticSetter = syntheticSetter;
  }

  /**
   * @param {string} expression
   * @return {!Promise<boolean>}
   */
  async setSyntheticValue(expression) {
    if (!this.syntheticSetter)
      return false;
    var result = await this.syntheticSetter(expression);
    if (result)
      this.value = result;
    return !!result;
  }

  /**
   * @return {boolean}
   */
  isAccessorProperty() {
    return !!(this.getter || this.setter);
  }
};

// Below is a wrapper around a local object that implements the RemoteObject interface,
// which can be used by the UI code (primarily ObjectPropertiesSection).
// Note that only JSON-compliant objects are currently supported, as there's no provision
// for traversing prototypes, extracting class names via constructor, handling properties
// or functions.

SDK.LocalJSONObject = class extends SDK.RemoteObject {
  /**
   * @param {*} value
   */
  constructor(value) {
    super();
    this._value = value;
    /** @type {string} */
    this._cachedDescription;
    /** @type {!Array<!SDK.RemoteObjectProperty>} */
    this._cachedChildren;
  }

  /**
   * @override
   * @return {!Protocol.Runtime.RemoteObjectId|undefined}
   * */
  get objectId() {
    return undefined;
  }

  /**
   * @override
   * @return {*}
   */
  get value() {
    return this._value;
  }

  /**
   * @override
   * @return {string}
   */
  get description() {
    if (this._cachedDescription)
      return this._cachedDescription;

    /**
     * @param {!SDK.RemoteObjectProperty} property
     * @return {string}
     * @this {SDK.LocalJSONObject}
     */
    function formatArrayItem(property) {
      return this._formatValue(property.value);
    }

    /**
     * @param {!SDK.RemoteObjectProperty} property
     * @return {string}
     * @this {SDK.LocalJSONObject}
     */
    function formatObjectItem(property) {
      var name = property.name;
      if (/^\s|\s$|^$|\n/.test(name))
        name = '"' + name.replace(/\n/g, '\u21B5') + '"';
      return name + ': ' + this._formatValue(property.value);
    }

    if (this.type === 'object') {
      switch (this.subtype) {
        case 'array':
          this._cachedDescription = this._concatenate('[', ']', formatArrayItem.bind(this));
          break;
        case 'date':
          this._cachedDescription = '' + this._value;
          break;
        case 'null':
          this._cachedDescription = 'null';
          break;
        default:
          this._cachedDescription = this._concatenate('{', '}', formatObjectItem.bind(this));
      }
    } else {
      this._cachedDescription = String(this._value);
    }

    return this._cachedDescription;
  }

  /**
   * @param {?SDK.RemoteObject} value
   * @return {string}
   */
  _formatValue(value) {
    if (!value)
      return 'undefined';
    var description = value.description || '';
    if (value.type === 'string')
      return '"' + description.replace(/\n/g, '\u21B5') + '"';
    return description;
  }

  /**
   * @param {string} prefix
   * @param {string} suffix
   * @param {function(!SDK.RemoteObjectProperty)} formatProperty
   * @return {string}
   */
  _concatenate(prefix, suffix, formatProperty) {
    var previewChars = 100;

    var buffer = prefix;
    var children = this._children();
    for (var i = 0; i < children.length; ++i) {
      var itemDescription = formatProperty(children[i]);
      if (buffer.length + itemDescription.length > previewChars) {
        buffer += ',\u2026';
        break;
      }
      if (i)
        buffer += ', ';
      buffer += itemDescription;
    }
    buffer += suffix;
    return buffer;
  }

  /**
   * @override
   * @return {string}
   */
  get type() {
    return typeof this._value;
  }

  /**
   * @override
   * @return {string|undefined}
   */
  get subtype() {
    if (this._value === null)
      return 'null';

    if (Array.isArray(this._value))
      return 'array';

    if (this._value instanceof Date)
      return 'date';

    return undefined;
  }

  /**
   * @override
   * @return {boolean}
   */
  get hasChildren() {
    if ((typeof this._value !== 'object') || (this._value === null))
      return false;
    return !!Object.keys(/** @type {!Object} */ (this._value)).length;
  }

  /**
   * @override
   * @param {boolean} generatePreview
   * @param {function(?Array.<!SDK.RemoteObjectProperty>, ?Array.<!SDK.RemoteObjectProperty>)} callback
   */
  getOwnProperties(generatePreview, callback) {
    callback(this._children(), null);
  }

  /**
   * @override
   * @param {boolean} accessorPropertiesOnly
   * @param {boolean} generatePreview
   * @param {function(?Array.<!SDK.RemoteObjectProperty>, ?Array.<!SDK.RemoteObjectProperty>)} callback
   */
  getAllProperties(accessorPropertiesOnly, generatePreview, callback) {
    if (accessorPropertiesOnly)
      callback([], null);
    else
      callback(this._children(), null);
  }

  /**
   * @return {!Array.<!SDK.RemoteObjectProperty>}
   */
  _children() {
    if (!this.hasChildren)
      return [];
    var value = /** @type {!Object} */ (this._value);

    /**
     * @param {string} propName
     * @return {!SDK.RemoteObjectProperty}
     */
    function buildProperty(propName) {
      var propValue = value[propName];
      if (!(propValue instanceof SDK.RemoteObject))
        propValue = SDK.RemoteObject.fromLocalObject(propValue);
      return new SDK.RemoteObjectProperty(propName, propValue);
    }
    if (!this._cachedChildren)
      this._cachedChildren = Object.keys(value).map(buildProperty);
    return this._cachedChildren;
  }

  /**
   * @return {boolean}
   */
  isError() {
    return false;
  }

  /**
   * @override
   * @return {number}
   */
  arrayLength() {
    return Array.isArray(this._value) ? this._value.length : 0;
  }

  /**
   * @override
   * @param {function(this:Object, ...)} functionDeclaration
   * @param {!Array<!Protocol.Runtime.CallArgument>=} args
   * @param {function(?SDK.RemoteObject, boolean=)=} callback
   */
  callFunction(functionDeclaration, args, callback) {
    var target = /** @type {?Object} */ (this._value);
    var rawArgs = args ? args.map(arg => arg.value) : [];

    var result;
    var wasThrown = false;
    try {
      result = functionDeclaration.apply(target, rawArgs);
    } catch (e) {
      wasThrown = true;
    }

    if (!callback)
      return;
    callback(SDK.RemoteObject.fromLocalObject(result), wasThrown);
  }

  /**
   * @override
   * @param {function(this:Object)} functionDeclaration
   * @param {!Array<!Protocol.Runtime.CallArgument>|undefined} args
   * @param {function(*)} callback
   */
  callFunctionJSON(functionDeclaration, args, callback) {
    var target = /** @type {?Object} */ (this._value);
    var rawArgs = args ? args.map(arg => arg.value) : [];

    var result;
    try {
      result = functionDeclaration.apply(target, rawArgs);
    } catch (e) {
      result = null;
    }

    callback(result);
  }
};

SDK.RemoteArray = class {
  /**
   * @param {!SDK.RemoteObject} object
   */
  constructor(object) {
    this._object = object;
  }

  /**
   * @param {?SDK.RemoteObject} object
   * @return {!SDK.RemoteArray}
   */
  static objectAsArray(object) {
    if (!object || object.type !== 'object' || (object.subtype !== 'array' && object.subtype !== 'typedarray'))
      throw new Error('Object is empty or not an array');
    return new SDK.RemoteArray(object);
  }

  /**
   * @param {!Array<!SDK.RemoteObject>} objects
   * @return {!Promise<!SDK.RemoteArray>}
   */
  static createFromRemoteObjects(objects) {
    if (!objects.length)
      throw new Error('Input array is empty');
    var objectArguments = [];
    for (var i = 0; i < objects.length; ++i)
      objectArguments.push(SDK.RemoteObject.toCallArgument(objects[i]));
    return objects[0].callFunctionPromise(createArray, objectArguments).then(returnRemoteArray);

    /**
     * @return {!Array<*>}
     */
    function createArray() {
      if (arguments.length > 1)
        return new Array(arguments);
      return [arguments[0]];
    }

    /**
     * @param {!SDK.CallFunctionResult} result
     * @return {!SDK.RemoteArray}
     */
    function returnRemoteArray(result) {
      if (result.wasThrown || !result.object)
        throw new Error('Call function throws exceptions or returns empty value');
      return SDK.RemoteArray.objectAsArray(result.object);
    }
  }

  /**
   * @param {number} index
   * @return {!Promise<!SDK.RemoteObject>}
   */
  at(index) {
    if (index < 0 || index > this._object.arrayLength())
      throw new Error('Out of range');
    return this._object.callFunctionPromise(at, [SDK.RemoteObject.toCallArgument(index)])
        .then(assertCallFunctionResult);

    /**
     * @suppressReceiverCheck
     * @param {number} index
     * @return {*}
     * @this {!Object}
     */
    function at(index) {
      return this[index];
    }

    /**
     * @param {!SDK.CallFunctionResult} result
     * @return {!SDK.RemoteObject}
     */
    function assertCallFunctionResult(result) {
      if (result.wasThrown || !result.object)
        throw new Error('Exception in callFunction or result value is empty');
      return result.object;
    }
  }

  /**
   * @return {number}
   */
  length() {
    return this._object.arrayLength();
  }

  /**
   * @param {function(!SDK.RemoteObject):!Promise<T>} func
   * @return {!Promise<!Array<T>>}
   * @template T
   */
  map(func) {
    var promises = [];
    for (var i = 0; i < this.length(); ++i)
      promises.push(this.at(i).then(func));
    return Promise.all(promises);
  }

  /**
   * @return {!SDK.RemoteObject}
   */
  object() {
    return this._object;
  }
};


SDK.RemoteFunction = class {
  /**
   * @param {!SDK.RemoteObject} object
   */
  constructor(object) {
    this._object = object;
  }

  /**
   * @param {?SDK.RemoteObject} object
   * @return {!SDK.RemoteFunction}
   */
  static objectAsFunction(object) {
    if (!object || object.type !== 'function')
      throw new Error('Object is empty or not a function');
    return new SDK.RemoteFunction(object);
  }

  /**
   * @return {!Promise<!SDK.RemoteObject>}
   */
  targetFunction() {
    return this._object.getOwnPropertiesPromise(false /* generatePreview */).then(targetFunction.bind(this));

    /**
     * @param {!{properties: ?Array<!SDK.RemoteObjectProperty>, internalProperties: ?Array<!SDK.RemoteObjectProperty>}} ownProperties
     * @return {!SDK.RemoteObject}
     * @this {SDK.RemoteFunction}
     */
    function targetFunction(ownProperties) {
      if (!ownProperties.internalProperties)
        return this._object;
      var internalProperties = ownProperties.internalProperties;
      for (var property of internalProperties) {
        if (property.name === '[[TargetFunction]]')
          return property.value;
      }
      return this._object;
    }
  }

  /**
   * @return {!Promise<?SDK.DebuggerModel.FunctionDetails>}
   */
  targetFunctionDetails() {
    return this.targetFunction().then(functionDetails.bind(this));

    /**
     * @param {!SDK.RemoteObject} targetFunction
     * @return {!Promise<?SDK.DebuggerModel.FunctionDetails>}
     * @this {SDK.RemoteFunction}
     */
    function functionDetails(targetFunction) {
      var boundReleaseFunctionDetails =
          releaseTargetFunction.bind(null, this._object !== targetFunction ? targetFunction : null);
      return targetFunction.debuggerModel().functionDetailsPromise(targetFunction).then(boundReleaseFunctionDetails);
    }

    /**
     * @param {?SDK.RemoteObject} targetFunction
     * @param {?SDK.DebuggerModel.FunctionDetails} functionDetails
     * @return {?SDK.DebuggerModel.FunctionDetails}
     */
    function releaseTargetFunction(targetFunction, functionDetails) {
      if (targetFunction)
        targetFunction.release();
      return functionDetails;
    }
  }

  /**
   * @return {!SDK.RemoteObject}
   */
  object() {
    return this._object;
  }
};

/**
 * @const
 * @type {!RegExp}
 */
SDK.RemoteObject._descriptionLengthParenRegex = /\(([0-9]+)\)/;

/**
 * @const
 * @type {!RegExp}
 */
SDK.RemoteObject._descriptionLengthSquareRegex = /\[([0-9]+)\]/;
