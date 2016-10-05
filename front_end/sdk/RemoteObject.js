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
 * @typedef {{object: ?WebInspector.RemoteObject, wasThrown: (boolean|undefined)}}
 */
WebInspector.CallFunctionResult;

/**
 * This may not be an interface due to "instanceof WebInspector.RemoteObject" checks in the code.
 *
 * @constructor
 */
WebInspector.RemoteObject = function() { };

WebInspector.RemoteObject.prototype = {

    /**
     * @return {?RuntimeAgent.CustomPreview}
     */
    customPreview: function()
    {
        return null;
    },

    /** @return {string} */
    get type()
    {
        throw "Not implemented";
    },

    /** @return {string|undefined} */
    get subtype()
    {
        throw "Not implemented";
    },

    /** @return {string|undefined} */
    get description()
    {
        throw "Not implemented";
    },

    /** @return {boolean} */
    get hasChildren()
    {
        throw "Not implemented";
    },

    /**
     * @return {number}
     */
    arrayLength: function()
    {
        throw "Not implemented";
    },

    /**
     * @param {function(?Array.<!WebInspector.RemoteObjectProperty>, ?Array.<!WebInspector.RemoteObjectProperty>)} callback
     */
    getOwnProperties: function(callback)
    {
        throw "Not implemented";
    },

    /**
     * @return {!Promise<!{properties: ?Array.<!WebInspector.RemoteObjectProperty>, internalProperties: ?Array.<!WebInspector.RemoteObjectProperty>}>}
     */
    getOwnPropertiesPromise: function()
    {
        return new Promise(promiseConstructor.bind(this));

        /**
         * @param {function(!{properties: ?Array.<!WebInspector.RemoteObjectProperty>, internalProperties: ?Array.<!WebInspector.RemoteObjectProperty>})} success
         * @this {WebInspector.RemoteObject}
         */
        function promiseConstructor(success)
        {
            this.getOwnProperties(getOwnPropertiesCallback.bind(null, success));
        }

        /**
         * @param {function(!{properties: ?Array.<!WebInspector.RemoteObjectProperty>, internalProperties: ?Array.<!WebInspector.RemoteObjectProperty>})} callback
         * @param {?Array.<!WebInspector.RemoteObjectProperty>} properties
         * @param {?Array.<!WebInspector.RemoteObjectProperty>} internalProperties
         */
        function getOwnPropertiesCallback(callback, properties, internalProperties)
        {
            callback({
                properties: properties,
                internalProperties: internalProperties
            });
        }
    },

    /**
     * @param {boolean} accessorPropertiesOnly
     * @param {function(?Array<!WebInspector.RemoteObjectProperty>, ?Array<!WebInspector.RemoteObjectProperty>)} callback
     */
    getAllProperties: function(accessorPropertiesOnly, callback)
    {
        throw "Not implemented";
    },

    /**
     * @param {boolean} accessorPropertiesOnly
     * @return {!Promise<!{properties: ?Array<!WebInspector.RemoteObjectProperty>, internalProperties: ?Array<!WebInspector.RemoteObjectProperty>}>}
     */
    getAllPropertiesPromise: function(accessorPropertiesOnly)
    {
        return new Promise(promiseConstructor.bind(this));

        /**
         * @param {function(!{properties: ?Array<!WebInspector.RemoteObjectProperty>, internalProperties: ?Array.<!WebInspector.RemoteObjectProperty>})} success
         * @this {WebInspector.RemoteObject}
         */
        function promiseConstructor(success)
        {
            this.getAllProperties(accessorPropertiesOnly, getAllPropertiesCallback.bind(null, success));
        }

        /**
         * @param {function(!{properties: ?Array<!WebInspector.RemoteObjectProperty>, internalProperties: ?Array<!WebInspector.RemoteObjectProperty>})} callback
         * @param {?Array<!WebInspector.RemoteObjectProperty>} properties
         * @param {?Array<!WebInspector.RemoteObjectProperty>} internalProperties
         */
        function getAllPropertiesCallback(callback, properties, internalProperties)
        {
            callback({
                properties: properties,
                internalProperties: internalProperties
            });
        }
    },

    /**
     * @return {!Promise<?Array<!WebInspector.EventListener>>}
     */
    eventListeners: function()
    {
        throw "Not implemented";
    },

    /**
     * @param {!RuntimeAgent.CallArgument} name
     * @param {function(string=)} callback
     */
    deleteProperty: function(name, callback)
    {
        throw "Not implemented";
    },

    /**
     * @param {string|!RuntimeAgent.CallArgument} name
     * @param {string} value
     * @param {function(string=)} callback
     */
    setPropertyValue: function(name, value, callback)
    {
        throw "Not implemented";
    },

    /**
     * @param {function(this:Object, ...)} functionDeclaration
     * @param {!Array<!RuntimeAgent.CallArgument>=} args
     * @param {function(?WebInspector.RemoteObject, boolean=)=} callback
     */
    callFunction: function(functionDeclaration, args, callback)
    {
        throw "Not implemented";
    },

    /**
     * @param {function(this:Object, ...)} functionDeclaration
     * @param {!Array<!RuntimeAgent.CallArgument>=} args
     * @return {!Promise<!WebInspector.CallFunctionResult>}
     */
    callFunctionPromise: function(functionDeclaration, args)
    {
        return new Promise(promiseConstructor.bind(this));

        /**
         * @param {function(!WebInspector.CallFunctionResult)} success
         * @this {WebInspector.RemoteObject}
         */
        function promiseConstructor(success)
        {
            this.callFunction(functionDeclaration, args, callFunctionCallback.bind(null, success));
        }

        /**
         * @param {function(!WebInspector.CallFunctionResult)} callback
         * @param {?WebInspector.RemoteObject} object
         * @param {boolean=} wasThrown
         */
        function callFunctionCallback(callback, object, wasThrown)
        {
            callback({
                object: object,
                wasThrown: wasThrown
            });
        }
    },

    /**
     * @template T
     * @param {function(this:Object, ...):T} functionDeclaration
     * @param {!Array<!RuntimeAgent.CallArgument>|undefined} args
     * @param {function(T)} callback
     */
    callFunctionJSON: function(functionDeclaration, args, callback)
    {
        throw "Not implemented";
    },

    /**
     * @param {function(this:Object, ...):T} functionDeclaration
     * @param {!Array<!RuntimeAgent.CallArgument>|undefined} args
     * @return {!Promise<T>}
     * @template T
     */
    callFunctionJSONPromise: function(functionDeclaration, args)
    {
        return new Promise(promiseConstructor.bind(this));

        /**
         * @this {WebInspector.RemoteObject}
         */
        function promiseConstructor(success)
        {
            this.callFunctionJSON(functionDeclaration, args, success);
        }
    },

    /**
     * @return {!WebInspector.Target}
     */
    target: function()
    {
        throw new Error("Target-less object");
    },

    /**
     * @return {?WebInspector.DebuggerModel}
     */
    debuggerModel: function()
    {
        throw new Error("DebuggerModel-less object");
    },

    /**
     * @return {boolean}
     */
    isNode: function()
    {
        return false;
    }
};

/**
 * @param {*} value
 * @return {!WebInspector.RemoteObject}
 */
WebInspector.RemoteObject.fromLocalObject = function(value)
{
    return new WebInspector.LocalJSONObject(value);
};

/**
 * @param {!WebInspector.RemoteObject} remoteObject
 * @return {string}
 */
WebInspector.RemoteObject.type = function(remoteObject)
{
    if (remoteObject === null)
        return "null";

    var type = typeof remoteObject;
    if (type !== "object" && type !== "function")
        return type;

    return remoteObject.type;
};

/**
 * @param {!WebInspector.RemoteObject|!RuntimeAgent.RemoteObject|!RuntimeAgent.ObjectPreview} object
 * @return {number}
 */
WebInspector.RemoteObject.arrayLength = function(object)
{
    if (object.subtype !== "array" && object.subtype !== "typedarray")
        return 0;
    var matches = object.description.match(/\[([0-9]+)\]/);
    if (!matches)
        return 0;
    return parseInt(matches[1], 10);
};

/**
 * @param {!RuntimeAgent.RemoteObject|!WebInspector.RemoteObject|number|string|boolean|undefined|null} object
 * @return {!RuntimeAgent.CallArgument}
 */
WebInspector.RemoteObject.toCallArgument = function(object)
{
    var type = typeof object;
    if (type === "undefined")
        return {};
    if (type === "number") {
        var description = String(object);
        if (object === 0 && 1 / object < 0)
            return { unserializableValue: RuntimeAgent.UnserializableValue.Negative0 };
        if (description === "NaN")
            return { unserializableValue: RuntimeAgent.UnserializableValue.NaN };
        if (description === "Infinity")
            return { unserializableValue: RuntimeAgent.UnserializableValue.Infinity };
        if (description === "-Infinity")
            return { unserializableValue: RuntimeAgent.UnserializableValue.NegativeInfinity };
        return { value: object };
    }
    if (type === "string" || type === "boolean")
        return { value: object };

    if (!object)
        return { value: null };

    if (typeof object.unserializableValue !== "undefined")
        return { unserializableValue: object.unserializableValue };
    if (typeof object._unserializableValue !== "undefined")
        return { unserializableValue: object._unserializableValue };

    if (typeof object.objectId !== "undefined")
        return { objectId: object.objectId };
    if (typeof object._objectId !== "undefined")
        return { objectId: object._objectId };

    return { value: object.value };
};

/**
 * @constructor
 * @extends {WebInspector.RemoteObject}
 * @param {!WebInspector.Target} target
 * @param {string|undefined} objectId
 * @param {string} type
 * @param {string|undefined} subtype
 * @param {*} value
 * @param {!RuntimeAgent.UnserializableValue=} unserializableValue
 * @param {string=} description
 * @param {!RuntimeAgent.ObjectPreview=} preview
 * @param {!RuntimeAgent.CustomPreview=} customPreview
 */
WebInspector.RemoteObjectImpl = function(target, objectId, type, subtype, value, unserializableValue, description, preview, customPreview)
{
    WebInspector.RemoteObject.call(this);

    this._target = target;
    this._runtimeAgent = target.runtimeAgent();
    this._debuggerModel = WebInspector.DebuggerModel.fromTarget(target);

    this._type = type;
    this._subtype = subtype;
    if (objectId) {
        // handle
        this._objectId = objectId;
        this._description = description;
        this._hasChildren = (type !== "symbol");
        this._preview = preview;
    } else {
        this._description = description;
        if (!this._description && (typeof value !== "object" || value === null))
            this._description = value + "";
        this._hasChildren = false;
        if (typeof unserializableValue !== "undefined") {
            this._unserializableValue = unserializableValue;
            if (unserializableValue === RuntimeAgent.UnserializableValue.Infinity ||
                unserializableValue === RuntimeAgent.UnserializableValue.NegativeInfinity ||
                unserializableValue === RuntimeAgent.UnserializableValue.Negative0 ||
                unserializableValue === RuntimeAgent.UnserializableValue.NaN) {
                this.value = Number(unserializableValue);
            } else {
                this.value = unserializableValue;
            }
        } else {
            this.value = value;
        }
    }
    this._customPreview = customPreview || null;
};

WebInspector.RemoteObjectImpl.prototype = {

    /**
     * @override
     * @return {?RuntimeAgent.CustomPreview}
     */
    customPreview: function()
    {
        return this._customPreview;
    },

    /** @return {!RuntimeAgent.RemoteObjectId} */
    get objectId()
    {
        return this._objectId;
    },

    /**
     * @override
     * @return {string}
     */
    get type()
    {
        return this._type;
    },

    /**
     * @override
     * @return {string|undefined}
     */
    get subtype()
    {
        return this._subtype;
    },

    /**
     * @override
     * @return {string|undefined}
     */
    get description()
    {
        return this._description;
    },

    /**
     * @override
     * @return {boolean}
     */
    get hasChildren()
    {
        return this._hasChildren;
    },

    /**
     * @return {!RuntimeAgent.ObjectPreview|undefined}
     */
    get preview()
    {
        return this._preview;
    },

    /**
     * @override
     * @param {function(?Array.<!WebInspector.RemoteObjectProperty>, ?Array.<!WebInspector.RemoteObjectProperty>)} callback
     */
    getOwnProperties: function(callback)
    {
        this.doGetProperties(true, false, false, callback);
    },

    /**
     * @override
     * @param {boolean} accessorPropertiesOnly
     * @param {function(?Array.<!WebInspector.RemoteObjectProperty>, ?Array.<!WebInspector.RemoteObjectProperty>)} callback
     */
    getAllProperties: function(accessorPropertiesOnly, callback)
    {
        this.doGetProperties(false, accessorPropertiesOnly, false, callback);
    },

    /**
     * @override
     * @return {!Promise<?Array<!WebInspector.EventListener>>}
     */
    eventListeners: function()
    {
        return new Promise(eventListeners.bind(this));
        /**
         * @param {function(?)} fulfill
         * @param {function(*)} reject
         * @this {WebInspector.RemoteObjectImpl}
         */
        function eventListeners(fulfill, reject)
        {
            if (!this.target().hasDOMCapability()) {
                // TODO(kozyatinskiy): figure out how this should work for |window| when there is no DOMDebugger.
                fulfill([]);
                return;
            }

            if (!this._objectId) {
                reject(new Error("No object id specified"));
                return;
            }

            this.target().domdebuggerAgent().getEventListeners(this._objectId, mycallback.bind(this));

            /**
             * @this {WebInspector.RemoteObjectImpl}
             * @param {?Protocol.Error} error
             * @param {!Array<!DOMDebuggerAgent.EventListener>} payloads
             */
            function mycallback(error, payloads)
            {
                if (error) {
                    reject(new Error(error));
                    return;
                }
                fulfill(payloads.map(createEventListener.bind(this)));
            }

            /**
             * @this {WebInspector.RemoteObjectImpl}
             * @param {!DOMDebuggerAgent.EventListener} payload
             */
            function createEventListener(payload)
            {
                return new WebInspector.EventListener(this._target,
                                                      this,
                                                      payload.type,
                                                      payload.useCapture,
                                                      payload.passive,
                                                      payload.handler ? this.target().runtimeModel.createRemoteObject(payload.handler) : null,
                                                      payload.originalHandler ? this.target().runtimeModel.createRemoteObject(payload.originalHandler) : null,
                                                      /** @type {!WebInspector.DebuggerModel.Location} */ (this._debuggerModel.createRawLocationByScriptId(payload.scriptId, payload.lineNumber, payload.columnNumber)),
                                                      payload.removeFunction ? this.target().runtimeModel.createRemoteObject(payload.removeFunction) : null);
            }
        }
    },

    /**
     * @param {!Array.<string>} propertyPath
     * @param {function(?WebInspector.RemoteObject, boolean=)} callback
     */
    getProperty: function(propertyPath, callback)
    {
        /**
         * @param {string} arrayStr
         * @suppressReceiverCheck
         * @this {Object}
         */
        function remoteFunction(arrayStr)
        {
            var result = this;
            var properties = JSON.parse(arrayStr);
            for (var i = 0, n = properties.length; i < n; ++i)
                result = result[properties[i]];
            return result;
        }

        var args = [{ value: JSON.stringify(propertyPath) }];
        this.callFunction(remoteFunction, args, callback);
    },

    /**
     * @param {boolean} ownProperties
     * @param {boolean} accessorPropertiesOnly
     * @param {boolean} generatePreview
     * @param {function(?Array.<!WebInspector.RemoteObjectProperty>, ?Array.<!WebInspector.RemoteObjectProperty>)} callback
     */
    doGetProperties: function(ownProperties, accessorPropertiesOnly, generatePreview, callback)
    {
        if (!this._objectId) {
            callback(null, null);
            return;
        }

        /**
         * @param {?Protocol.Error} error
         * @param {!Array.<!RuntimeAgent.PropertyDescriptor>} properties
         * @param {!Array.<!RuntimeAgent.InternalPropertyDescriptor>=} internalProperties
         * @param {?RuntimeAgent.ExceptionDetails=} exceptionDetails
         * @this {WebInspector.RemoteObjectImpl}
         */
        function remoteObjectBinder(error, properties, internalProperties, exceptionDetails)
        {
            if (error) {
                callback(null, null);
                return;
            }
            if (exceptionDetails) {
                this._target.consoleModel.addMessage(WebInspector.ConsoleMessage.fromException(this._target, exceptionDetails, undefined, undefined, undefined));
                callback(null, null);
                return;
            }
            var result = [];
            for (var i = 0; properties && i < properties.length; ++i) {
                var property = properties[i];
                var propertyValue = property.value ? this._target.runtimeModel.createRemoteObject(property.value) : null;
                var propertySymbol = property.symbol ? this._target.runtimeModel.createRemoteObject(property.symbol) : null;
                var remoteProperty = new WebInspector.RemoteObjectProperty(property.name, propertyValue,
                        !!property.enumerable, !!property.writable, !!property.isOwn, !!property.wasThrown, propertySymbol);

                if (typeof property.value === "undefined") {
                    if (property.get && property.get.type !== "undefined")
                        remoteProperty.getter = this._target.runtimeModel.createRemoteObject(property.get);
                    if (property.set && property.set.type !== "undefined")
                        remoteProperty.setter = this._target.runtimeModel.createRemoteObject(property.set);
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
                    var propertyValue = this._target.runtimeModel.createRemoteObject(property.value);
                    internalPropertiesResult.push(new WebInspector.RemoteObjectProperty(property.name, propertyValue, true, false));
                }
            }
            callback(result, internalPropertiesResult);
        }
        this._runtimeAgent.getProperties(this._objectId, ownProperties, accessorPropertiesOnly, generatePreview, remoteObjectBinder.bind(this));
    },

    /**
     * @override
     * @param {string|!RuntimeAgent.CallArgument} name
     * @param {string} value
     * @param {function(string=)} callback
     */
    setPropertyValue: function(name, value, callback)
    {
        if (!this._objectId) {
            callback("Can't set a property of non-object.");
            return;
        }

        this._runtimeAgent.invoke_evaluate({expression:value, silent:true}, evaluatedCallback.bind(this));

        /**
         * @param {?Protocol.Error} error
         * @param {!RuntimeAgent.RemoteObject} result
         * @param {!RuntimeAgent.ExceptionDetails=} exceptionDetails
         * @this {WebInspector.RemoteObject}
         */
        function evaluatedCallback(error, result, exceptionDetails)
        {
            if (error || !!exceptionDetails) {
                callback(error || (result.type !== "string" ? result.description : /** @type {string} */(result.value)));
                return;
            }

            if (typeof name === "string")
                name = WebInspector.RemoteObject.toCallArgument(name);

            this.doSetObjectPropertyValue(result, name, callback);

            if (result.objectId)
                this._runtimeAgent.releaseObject(result.objectId);
        }
    },

    /**
     * @param {!RuntimeAgent.RemoteObject} result
     * @param {!RuntimeAgent.CallArgument} name
     * @param {function(string=)} callback
     */
    doSetObjectPropertyValue: function(result, name, callback)
    {
        // This assignment may be for a regular (data) property, and for an accessor property (with getter/setter).
        // Note the sensitive matter about accessor property: the property may be physically defined in some proto object,
        // but logically it is bound to the object in question. JavaScript passes this object to getters/setters, not the object
        // where property was defined; so do we.
        var setPropertyValueFunction = "function(a, b) { this[a] = b; }";

        var argv = [name, WebInspector.RemoteObject.toCallArgument(result)];
        this._runtimeAgent.callFunctionOn(this._objectId, setPropertyValueFunction, argv, true, undefined, undefined, undefined, undefined, propertySetCallback);

        /**
         * @param {?Protocol.Error} error
         * @param {!RuntimeAgent.RemoteObject} result
         * @param {!RuntimeAgent.ExceptionDetails=} exceptionDetails
         */
        function propertySetCallback(error, result, exceptionDetails)
        {
            if (error || !!exceptionDetails) {
                callback(error || result.description);
                return;
            }
            callback();
        }
    },

    /**
     * @override
     * @param {!RuntimeAgent.CallArgument} name
     * @param {function(string=)} callback
     */
    deleteProperty: function(name, callback)
    {
        if (!this._objectId) {
            callback("Can't delete a property of non-object.");
            return;
        }

        var deletePropertyFunction = "function(a) { delete this[a]; return !(a in this); }";
        this._runtimeAgent.callFunctionOn(this._objectId, deletePropertyFunction, [name], true, undefined, undefined, undefined, undefined, deletePropertyCallback);

        /**
         * @param {?Protocol.Error} error
         * @param {!RuntimeAgent.RemoteObject} result
         * @param {!RuntimeAgent.ExceptionDetails=} exceptionDetails
         */
        function deletePropertyCallback(error, result, exceptionDetails)
        {
            if (error || !!exceptionDetails) {
                callback(error || result.description);
                return;
            }
            if (!result.value)
                callback("Failed to delete property.");
            else
                callback();
        }
    },

    /**
     * @override
     * @param {function(this:Object, ...)} functionDeclaration
     * @param {!Array.<!RuntimeAgent.CallArgument>=} args
     * @param {function(?WebInspector.RemoteObject, boolean=)=} callback
     */
    callFunction: function(functionDeclaration, args, callback)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {!RuntimeAgent.RemoteObject} result
         * @param {!RuntimeAgent.ExceptionDetails=} exceptionDetails
         * @this {WebInspector.RemoteObjectImpl}
         */
        function mycallback(error, result, exceptionDetails)
        {
            if (!callback)
                return;
            if (error)
                callback(null, false);
            else
                callback(this.target().runtimeModel.createRemoteObject(result), !!exceptionDetails);
        }

        this._runtimeAgent.callFunctionOn(this._objectId, functionDeclaration.toString(), args, true, undefined, undefined, undefined, undefined, mycallback.bind(this));
    },

    /**
     * @override
     * @param {function(this:Object)} functionDeclaration
     * @param {!Array.<!RuntimeAgent.CallArgument>|undefined} args
     * @param {function(*)} callback
     */
    callFunctionJSON: function(functionDeclaration, args, callback)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {!RuntimeAgent.RemoteObject} result
         * @param {!RuntimeAgent.ExceptionDetails=} exceptionDetails
         */
        function mycallback(error, result, exceptionDetails)
        {
            callback((error || !!exceptionDetails) ? null : result.value);
        }

        this._runtimeAgent.callFunctionOn(this._objectId, functionDeclaration.toString(), args, true, true, false, undefined, undefined, mycallback);
    },

    release: function()
    {
        if (!this._objectId)
            return;
        this._runtimeAgent.releaseObject(this._objectId);
    },

    /**
     * @override
     * @return {number}
     */
    arrayLength: function()
    {
        return WebInspector.RemoteObject.arrayLength(this);
    },

    /**
     * @override
     * @return {!WebInspector.Target}
     */
    target: function()
    {
        return this._target;
    },

    /**
     * @override
     * @return {?WebInspector.DebuggerModel}
     */
    debuggerModel: function()
    {
        return this._debuggerModel;
    },

    /**
     * @override
     * @return {boolean}
     */
    isNode: function()
    {
        return !!this._objectId && this.type === "object" && this.subtype === "node";
    },

    __proto__: WebInspector.RemoteObject.prototype
};


/**
 * @param {!WebInspector.RemoteObject} object
 * @param {function(?Array.<!WebInspector.RemoteObjectProperty>, ?Array.<!WebInspector.RemoteObjectProperty>)} callback
 */
WebInspector.RemoteObject.loadFromObjectPerProto = function(object, callback)
{
    // Combines 2 asynch calls. Doesn't rely on call-back orders (some calls may be loop-back).
    var savedOwnProperties;
    var savedAccessorProperties;
    var savedInternalProperties;
    var resultCounter = 2;

    function processCallback()
    {
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
            return callback(propertiesMap.valuesArray().concat(propertySymbols), savedInternalProperties ? savedInternalProperties : null);
        } else {
            callback(null, null);
        }
    }

    /**
     * @param {?Array.<!WebInspector.RemoteObjectProperty>} properties
     * @param {?Array.<!WebInspector.RemoteObjectProperty>} internalProperties
     */
    function allAccessorPropertiesCallback(properties, internalProperties)
    {
        savedAccessorProperties = properties;
        processCallback();
    }

    /**
     * @param {?Array.<!WebInspector.RemoteObjectProperty>} properties
     * @param {?Array.<!WebInspector.RemoteObjectProperty>} internalProperties
     */
    function ownPropertiesCallback(properties, internalProperties)
    {
        savedOwnProperties = properties;
        savedInternalProperties = internalProperties;
        processCallback();
    }

    object.getAllProperties(true, allAccessorPropertiesCallback);
    object.getOwnProperties(ownPropertiesCallback);
};


/**
 * @constructor
 * @extends {WebInspector.RemoteObjectImpl}
 * @param {!WebInspector.Target} target
 * @param {string|undefined} objectId
 * @param {!WebInspector.ScopeRef} scopeRef
 * @param {string} type
 * @param {string|undefined} subtype
 * @param {*} value
 * @param {!RuntimeAgent.UnserializableValue=} unserializableValue
 * @param {string=} description
 * @param {!RuntimeAgent.ObjectPreview=} preview
 */
WebInspector.ScopeRemoteObject = function(target, objectId, scopeRef, type, subtype, value, unserializableValue, description, preview)
{
    WebInspector.RemoteObjectImpl.call(this, target, objectId, type, subtype, value, unserializableValue, description, preview);
    this._scopeRef = scopeRef;
    this._savedScopeProperties = undefined;
};

WebInspector.ScopeRemoteObject.prototype = {
    /**
     * @override
     * @param {boolean} ownProperties
     * @param {boolean} accessorPropertiesOnly
     * @param {boolean} generatePreview
     * @param {function(?Array.<!WebInspector.RemoteObjectProperty>, ?Array.<!WebInspector.RemoteObjectProperty>)} callback
     */
    doGetProperties: function(ownProperties, accessorPropertiesOnly, generatePreview, callback)
    {
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
         * @param {?Array.<!WebInspector.RemoteObjectProperty>} properties
         * @param {?Array.<!WebInspector.RemoteObjectProperty>} internalProperties
         * @this {WebInspector.ScopeRemoteObject}
         */
        function wrappedCallback(properties, internalProperties)
        {
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

        WebInspector.RemoteObjectImpl.prototype.doGetProperties.call(this, ownProperties, accessorPropertiesOnly, generatePreview, wrappedCallback.bind(this));
    },

    /**
     * @override
     * @param {!RuntimeAgent.RemoteObject} result
     * @param {!RuntimeAgent.CallArgument} argumentName
     * @param {function(string=)} callback
     */
    doSetObjectPropertyValue: function(result, argumentName, callback)
    {
        var name = /** @type {string} */ (argumentName.value);
        this._debuggerModel.setVariableValue(this._scopeRef.number, name, WebInspector.RemoteObject.toCallArgument(result), this._scopeRef.callFrameId, setVariableValueCallback.bind(this));

        /**
         * @param {string=} error
         * @this {WebInspector.ScopeRemoteObject}
         */
        function setVariableValueCallback(error)
        {
            if (error) {
                callback(error);
                return;
            }
            if (this._savedScopeProperties) {
                for (var i = 0; i < this._savedScopeProperties.length; i++) {
                    if (this._savedScopeProperties[i].name === name)
                        this._savedScopeProperties[i].value = this._target.runtimeModel.createRemoteObject(result);
                }
            }
            callback();
        }
    },

    __proto__: WebInspector.RemoteObjectImpl.prototype
};

/**
 * @constructor
 * @param {number} number
 * @param {string=} callFrameId
 */
WebInspector.ScopeRef = function(number, callFrameId)
{
    this.number = number;
    this.callFrameId = callFrameId;
};

/**
 * @constructor
 * @param {string} name
 * @param {?WebInspector.RemoteObject} value
 * @param {boolean=} enumerable
 * @param {boolean=} writable
 * @param {boolean=} isOwn
 * @param {boolean=} wasThrown
 * @param {boolean=} synthetic
 * @param {?WebInspector.RemoteObject=} symbol
 */
WebInspector.RemoteObjectProperty = function(name, value, enumerable, writable, isOwn, wasThrown, symbol, synthetic)
{
    this.name = name;
    if (value !== null)
        this.value = value;
    this.enumerable = typeof enumerable !== "undefined" ? enumerable : true;
    this.writable = typeof writable !== "undefined" ? writable : true;
    this.isOwn = !!isOwn;
    this.wasThrown = !!wasThrown;
    if (symbol)
        this.symbol = symbol;
    this.synthetic = !!synthetic;
};

WebInspector.RemoteObjectProperty.prototype = {
    /**
     * @return {boolean}
     */
    isAccessorProperty: function()
    {
        return !!(this.getter || this.setter);
    }
};

// Below is a wrapper around a local object that implements the RemoteObject interface,
// which can be used by the UI code (primarily ObjectPropertiesSection).
// Note that only JSON-compliant objects are currently supported, as there's no provision
// for traversing prototypes, extracting class names via constructor, handling properties
// or functions.

/**
 * @constructor
 * @extends {WebInspector.RemoteObject}
 * @param {*} value
 */
WebInspector.LocalJSONObject = function(value)
{
    WebInspector.RemoteObject.call(this);
    this._value = value;
};

WebInspector.LocalJSONObject.prototype = {
    /**
     * @override
     * @return {string}
     */
    get description()
    {
        if (this._cachedDescription)
            return this._cachedDescription;

        /**
         * @param {!WebInspector.RemoteObjectProperty} property
         * @return {string}
         * @this {WebInspector.LocalJSONObject}
         */
        function formatArrayItem(property)
        {
            return this._formatValue(property.value);
        }

        /**
         * @param {!WebInspector.RemoteObjectProperty} property
         * @return {string}
         * @this {WebInspector.LocalJSONObject}
         */
        function formatObjectItem(property)
        {
            var name = property.name;
            if (/^\s|\s$|^$|\n/.test(name))
                name = "\"" + name.replace(/\n/g, "\u21B5") + "\"";
            return name + ": " + this._formatValue(property.value);
        }

        if (this.type === "object") {
            switch (this.subtype) {
            case "array":
                this._cachedDescription = this._concatenate("[", "]", formatArrayItem.bind(this));
                break;
            case "date":
                this._cachedDescription = "" + this._value;
                break;
            case "null":
                this._cachedDescription = "null";
                break;
            default:
                this._cachedDescription = this._concatenate("{", "}", formatObjectItem.bind(this));
            }
        } else {
            this._cachedDescription = String(this._value);
        }

        return this._cachedDescription;
    },

    /**
     * @param {?WebInspector.RemoteObject} value
     * @return {string}
     */
    _formatValue: function(value)
    {
        if (!value)
            return "undefined";
        var description = value.description || "";
        if (value.type === "string")
            return "\"" + description.replace(/\n/g, "\u21B5") + "\"";
        return description;
    },

    /**
     * @param {string} prefix
     * @param {string} suffix
     * @param {function(!WebInspector.RemoteObjectProperty)} formatProperty
     * @return {string}
     */
    _concatenate: function(prefix, suffix, formatProperty)
    {
        var previewChars = 100;

        var buffer = prefix;
        var children = this._children();
        for (var i = 0; i < children.length; ++i) {
            var itemDescription = formatProperty(children[i]);
            if (buffer.length + itemDescription.length > previewChars) {
                buffer += ",\u2026";
                break;
            }
            if (i)
                buffer += ", ";
            buffer += itemDescription;
        }
        buffer += suffix;
        return buffer;
    },

    /**
     * @override
     * @return {string}
     */
    get type()
    {
        return typeof this._value;
    },

    /**
     * @override
     * @return {string|undefined}
     */
    get subtype()
    {
        if (this._value === null)
            return "null";

        if (Array.isArray(this._value))
            return "array";

        if (this._value instanceof Date)
            return "date";

        return undefined;
    },

    /**
     * @override
     * @return {boolean}
     */
    get hasChildren()
    {
        if ((typeof this._value !== "object") || (this._value === null))
            return false;
        return !!Object.keys(/** @type {!Object} */ (this._value)).length;
    },

    /**
     * @override
     * @param {function(?Array.<!WebInspector.RemoteObjectProperty>, ?Array.<!WebInspector.RemoteObjectProperty>)} callback
     */
    getOwnProperties: function(callback)
    {
        callback(this._children(), null);
    },

    /**
     * @override
     * @param {boolean} accessorPropertiesOnly
     * @param {function(?Array.<!WebInspector.RemoteObjectProperty>, ?Array.<!WebInspector.RemoteObjectProperty>)} callback
     */
    getAllProperties: function(accessorPropertiesOnly, callback)
    {
        if (accessorPropertiesOnly)
            callback([], null);
        else
            callback(this._children(), null);
    },

    /**
     * @return {!Array.<!WebInspector.RemoteObjectProperty>}
     */
    _children: function()
    {
        if (!this.hasChildren)
            return [];
        var value = /** @type {!Object} */ (this._value);

        /**
         * @param {string} propName
         * @return {!WebInspector.RemoteObjectProperty}
         */
        function buildProperty(propName)
        {
            var propValue = value[propName];
            if (!(propValue instanceof WebInspector.RemoteObject))
                propValue = WebInspector.RemoteObject.fromLocalObject(propValue);
            return new WebInspector.RemoteObjectProperty(propName, propValue);
        }
        if (!this._cachedChildren)
            this._cachedChildren = Object.keys(value).map(buildProperty);
        return this._cachedChildren;
    },

    /**
     * @return {boolean}
     */
    isError: function()
    {
        return false;
    },

    /**
     * @override
     * @return {number}
     */
    arrayLength: function()
    {
        return Array.isArray(this._value) ? this._value.length : 0;
    },

    /**
     * @override
     * @param {function(this:Object, ...)} functionDeclaration
     * @param {!Array.<!RuntimeAgent.CallArgument>=} args
     * @param {function(?WebInspector.RemoteObject, boolean=)=} callback
     */
    callFunction: function(functionDeclaration, args, callback)
    {
        var target = /** @type {?Object} */ (this._value);
        var rawArgs = args ? args.map(function(arg) { return arg.value; }) : [];

        var result;
        var wasThrown = false;
        try {
            result = functionDeclaration.apply(target, rawArgs);
        } catch (e) {
            wasThrown = true;
        }

        if (!callback)
            return;
        callback(WebInspector.RemoteObject.fromLocalObject(result), wasThrown);
    },

    /**
     * @override
     * @param {function(this:Object)} functionDeclaration
     * @param {!Array.<!RuntimeAgent.CallArgument>|undefined} args
     * @param {function(*)} callback
     */
    callFunctionJSON: function(functionDeclaration, args, callback)
    {
        var target = /** @type {?Object} */ (this._value);
        var rawArgs = args ? args.map(function(arg) { return arg.value; }) : [];

        var result;
        try {
            result = functionDeclaration.apply(target, rawArgs);
        } catch (e) {
            result = null;
        }

        callback(result);
    },

    __proto__: WebInspector.RemoteObject.prototype
};

/**
 * @constructor
 * @param {!WebInspector.RemoteObject} object
 */
WebInspector.RemoteArray = function(object)
{
    this._object = object;
};

/**
 * @param {?WebInspector.RemoteObject} object
 * @return {!WebInspector.RemoteArray}
 */
WebInspector.RemoteArray.objectAsArray = function(object)
{
    if (!object || object.type !== "object" || (object.subtype !== "array" && object.subtype !== "typedarray"))
        throw new Error("Object is empty or not an array");
    return new WebInspector.RemoteArray(object);
};

/**
 * @param {!Array<!WebInspector.RemoteObject>} objects
 * @return {!Promise<!WebInspector.RemoteArray>}
 */
WebInspector.RemoteArray.createFromRemoteObjects = function(objects)
{
    if (!objects.length)
        throw new Error("Input array is empty");
    var objectArguments = [];
    for (var i = 0; i < objects.length; ++i)
        objectArguments.push(WebInspector.RemoteObject.toCallArgument(objects[i]));
    return objects[0].callFunctionPromise(createArray, objectArguments).then(returnRemoteArray);

    /**
     * @return {!Array<*>}
     */
    function createArray()
    {
        if (arguments.length > 1)
            return new Array(arguments);
        return [arguments[0]];
    }

    /**
     * @param {!WebInspector.CallFunctionResult} result
     * @return {!WebInspector.RemoteArray}
     */
    function returnRemoteArray(result)
    {
        if (result.wasThrown || !result.object)
            throw new Error("Call function throws exceptions or returns empty value");
        return WebInspector.RemoteArray.objectAsArray(result.object);
    }
};

WebInspector.RemoteArray.prototype = {
    /**
     * @param {number} index
     * @return {!Promise<!WebInspector.RemoteObject>}
     */
    at: function(index)
    {
        if (index < 0 || index > this._object.arrayLength())
            throw new Error("Out of range");
        return this._object.callFunctionPromise(at, [WebInspector.RemoteObject.toCallArgument(index)]).then(assertCallFunctionResult);

        /**
         * @suppressReceiverCheck
         * @param {number} index
         * @return {*}
         * @this {!Object}
         */
        function at(index)
        {
            return this[index];
        }

        /**
         * @param {!WebInspector.CallFunctionResult} result
         * @return {!WebInspector.RemoteObject}
         */
        function assertCallFunctionResult(result)
        {
            if (result.wasThrown || !result.object)
                throw new Error("Exception in callFunction or result value is empty");
            return result.object;
        }
    },

    /**
     * @return {number}
     */
    length: function()
    {
        return this._object.arrayLength();
    },

    /**
     * @param {function(!WebInspector.RemoteObject):!Promise<T>} func
     * @return {!Promise<!Array<T>>}
     * @template T
     */
    map: function(func)
    {
        var promises = [];
        for (var i = 0; i < this.length(); ++i)
            promises.push(this.at(i).then(func));
        return Promise.all(promises);
    },

    /**
     * @return {!WebInspector.RemoteObject}
     */
    object: function()
    {
        return this._object;
    }
};

/**
 * @constructor
 * @param {!WebInspector.RemoteObject} object
 */
WebInspector.RemoteFunction = function(object)
{
    this._object = object;
};

/**
 * @param {?WebInspector.RemoteObject} object
 * @return {!WebInspector.RemoteFunction}
 */
WebInspector.RemoteFunction.objectAsFunction = function(object)
{
    if (!object || object.type !== "function")
        throw new Error("Object is empty or not a function");
    return new WebInspector.RemoteFunction(object);
};

WebInspector.RemoteFunction.prototype = {
    /**
     * @return {!Promise<!WebInspector.RemoteObject>}
     */
    targetFunction: function()
    {
        return this._object.getOwnPropertiesPromise().then(targetFunction.bind(this));

        /**
         * @param {!{properties: ?Array<!WebInspector.RemoteObjectProperty>, internalProperties: ?Array<!WebInspector.RemoteObjectProperty>}} ownProperties
         * @return {!WebInspector.RemoteObject}
         * @this {WebInspector.RemoteFunction}
         */
        function targetFunction(ownProperties)
        {
            if (!ownProperties.internalProperties)
                return this._object;
            var internalProperties = ownProperties.internalProperties;
            for (var property of internalProperties) {
                if (property.name === "[[TargetFunction]]")
                    return property.value;
            }
            return this._object;
        }
    },

    /**
     * @return {!Promise<?WebInspector.DebuggerModel.FunctionDetails>}
     */
    targetFunctionDetails: function()
    {
        return this.targetFunction().then(functionDetails.bind(this));

        /**
         * @param {!WebInspector.RemoteObject} targetFunction
         * @return {!Promise<?WebInspector.DebuggerModel.FunctionDetails>}
         * @this {WebInspector.RemoteFunction}
         */
        function functionDetails(targetFunction)
        {
            var boundReleaseFunctionDetails = releaseTargetFunction.bind(null, this._object !== targetFunction ? targetFunction : null);
            return targetFunction.debuggerModel().functionDetailsPromise(targetFunction).then(boundReleaseFunctionDetails);
        }

        /**
         * @param {?WebInspector.RemoteObject} targetFunction
         * @param {?WebInspector.DebuggerModel.FunctionDetails} functionDetails
         * @return {?WebInspector.DebuggerModel.FunctionDetails}
         */
        function releaseTargetFunction(targetFunction, functionDetails)
        {
            if (targetFunction)
                targetFunction.release();
            return functionDetails;
        }
    },

    /**
     * @return {!WebInspector.RemoteObject}
     */
    object: function()
    {
        return this._object;
    }
};
