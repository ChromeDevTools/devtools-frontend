// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import {ls} from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as Workspace from '../workspace/workspace.js';

import {ContentProviderBasedProject} from './ContentProviderBasedProject.js';
import {DebuggerWorkspaceBinding} from './DebuggerWorkspaceBinding.js';  // eslint-disable-line no-unused-vars
import {NetworkProject} from './NetworkProject.js';

class SourceType {
  /**
   * @param {!TypeInfo} typeInfo
   * @param {!Array<!SourceType>} members
   * @param {!Map<*, !SourceType>} typeMap
   */
  constructor(typeInfo, members, typeMap) {
    this.typeInfo = typeInfo;
    this.members = members;
    this.typeMap = typeMap;
  }

  /** Create a type graph
   * @param {!Array<!TypeInfo>} typeInfos
   * @return {?SourceType}
   */
  static create(typeInfos) {
    if (typeInfos.length === 0) {
      return null;
    }
    /** @type Map<*, !SourceType> */
    const typeMap = new Map();
    for (const typeInfo of typeInfos) {
      typeMap.set(typeInfo.typeId, new SourceType(typeInfo, [], typeMap));
    }

    for (const sourceType of typeMap.values()) {
      sourceType.members = sourceType.typeInfo.members.map(({typeId}) => {
        const memberType = typeMap.get(typeId);
        if (!memberType) {
          throw new Error(`Incomplete type information for type ${typeInfos[0].typeNames[0] || '<anonymous>'}`);
        }
        return memberType;
      });
    }

    return typeMap.get(typeInfos[0].typeId) || null;
  }
}

/**
 * Generates the raw module ID for a script, which is used
 * to uniquely identify the debugging data for a script on
 * the responsible language plugin.
 * @param {!SDK.Script.Script} script
 * @return the unique raw module ID for the script.
 */
function rawModuleIdForScript(script) {
  return `${script.sourceURL}@${script.hash}`;
}

/**
 * @param {!SDK.DebuggerModel.CallFrame} callFrame
 * @return {!RawLocation}
 */
function getRawLocation(callFrame) {
  const {script} = callFrame;
  return {
    rawModuleId: rawModuleIdForScript(script),
    codeOffset: callFrame.location().columnNumber - (script.codeOffset() || 0),
    inlineFrameIndex: callFrame.inlineFrameIndex
  };
}

/**
 * @param {!SDK.DebuggerModel.CallFrame} callFrame
 * @param {!SDK.RemoteObject.RemoteObject} object
 * @return {!Promise<*>}
 */
async function resolveRemoteObject(callFrame, object) {
  if (typeof object.value !== 'undefined') {
    return object.value;
  }

  const response = await callFrame.debuggerModel.target().runtimeAgent().invoke_callFunctionOn(
      {functionDeclaration: 'function() { return this; }', objectId: object.objectId, returnByValue: true});
  const {result} = response;
  if (!result) {
    return undefined;
  }
  return result.value;
}

export class ValueNode extends SDK.RemoteObject.RemoteObjectImpl {
  /**
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @param {string|undefined} objectId
   * @param {string} type
   * @param {string|undefined} subtype
   * @param {*} value
   * @param {number|undefined} inspectableAddress
   * @param {!Protocol.Runtime.UnserializableValue=} unserializableValue
   * @param {string=} description
   * @param {!Protocol.Runtime.ObjectPreview=} preview
   * @param {!Protocol.Runtime.CustomPreview=} customPreview
   * @param {string=} className
   */
  constructor(
      callFrame, objectId, type, subtype, value, inspectableAddress, unserializableValue, description, preview,
      customPreview, className) {
    super(
        callFrame.debuggerModel.runtimeModel(), objectId, type, subtype, value, unserializableValue, description,
        preview, customPreview, className);

    this.inspectableAddress = inspectableAddress;
    this.callFrame = callFrame;
  }
}

// Debugger language plugins present source-language values as trees with mixed dynamic and static structural
// information. The static structure is defined by the variable's static type in the source language. Formatters are
// able to present source-language values in an arbitrary user-friendly way, which contributes the dynamic structural
// information. The classes StaticallyTypedValue and FormatedValueNode respectively implement the static and dynamic
// parts in the RemoteObject tree that defines the presentation of the source-language value in the debugger UI.
//
// struct S {
//   int i;
//   struct A {
//     int j;
//   } a[3];
// } s
//
// The RemoteObject tree representing the C struct above could look like the graph below with a formatter for the type
// struct A[3], interleaving static and dynamic representations:
//
// StaticallyTypedValueNode   -->  s: struct S
//                                 \
//                                 |\
// StaticallyTypedValueNode   -->  | i: int
//                                 \
//                                  \
// StaticallyTypedValueNode   -->    a: struct A[3]
//                                   \
//                                   |\
// FormattedValueNode         -->    | 0: struct A
//                                   | \
//                                   |  \
// StaticallyTypedValueNode   -->    |   j: int
//                                   .
//                                   .
//                                   .

/** Create a new value tree from an expression.
 * @param {!SDK.DebuggerModel.CallFrame} callFrame
 * @param {!DebuggerLanguagePlugin} plugin
 * @param {string} expression
 * @param {!SDK.RuntimeModel.EvaluationOptions} evalOptions
 * @return {!Promise<!SDK.RemoteObject.RemoteObject>}
 */
async function getValueTreeForExpression(callFrame, plugin, expression, evalOptions) {
  const location = getRawLocation(callFrame);

  let typeInfo;
  try {
    typeInfo = await plugin.getTypeInfo(expression, location);
  } catch (e) {
    FormattingError.throwLocal(callFrame, e.message);
  }
  // If there's no type information we cannot represent this expression.
  if (!typeInfo) {
    return new SDK.RemoteObject.LocalJSONObject(undefined);
  }
  const {base, typeInfos} = typeInfo;
  const sourceType = SourceType.create(typeInfos);
  if (!sourceType) {
    return new SDK.RemoteObject.LocalJSONObject(undefined);
  }
  if (sourceType.typeInfo.hasValue && !sourceType.typeInfo.canExpand && base) {
    // Need to run the formatter for the expression result.
    return formatSourceValue(callFrame, plugin, sourceType, base, [], evalOptions);
  }

  // Create a new value tree with static information for the root.
  const address = await StaticallyTypedValueNode.getInspectableAddress(callFrame, plugin, base, [], evalOptions);
  return new StaticallyTypedValueNode(callFrame, plugin, sourceType, base, [], evalOptions, address);
}

/** Run the formatter for the value defined by the pair of base and fieldChain.
 * @param {!SDK.DebuggerModel.CallFrame} callFrame
 * @param {!DebuggerLanguagePlugin} plugin
 * @param {!SourceType} sourceType
 * @param {!EvalBase} base
 * @param {!Array<!FieldInfo>} field
 * @param {!SDK.RuntimeModel.EvaluationOptions} evalOptions
 * @return {!Promise<!FormattedValueNode>}
 */
async function formatSourceValue(callFrame, plugin, sourceType, base, field, evalOptions) {
  const location = getRawLocation(callFrame);

  let evalCode = await plugin.getFormatter({base, field}, location);
  if (!evalCode) {
    evalCode = {js: ''};
  }
  const response = await callFrame.debuggerModel.target().debuggerAgent().invoke_evaluateOnCallFrame({
    callFrameId: callFrame.id,
    expression: evalCode.js,
    objectGroup: evalOptions.objectGroup,
    includeCommandLineAPI: evalOptions.includeCommandLineAPI,
    silent: evalOptions.silent,
    returnByValue: evalOptions.returnByValue,
    generatePreview: evalOptions.generatePreview,
    throwOnSideEffect: evalOptions.throwOnSideEffect,
    timeout: evalOptions.timeout,
  });
  const error = response.getError();
  if (error) {
    throw new Error(error);
  }

  const {result, exceptionDetails} = response;
  if (exceptionDetails) {
    throw new FormattingError(callFrame.debuggerModel.runtimeModel().createRemoteObject(result), exceptionDetails);
  }
  // Wrap the formatted result into a FormattedValueNode.
  const object = new FormattedValueNode(callFrame, sourceType, plugin, result, null, evalOptions, undefined);
  // Check whether the formatter returned a plain object or and object alongisde a formatter tag.
  const unpackedResultObject = await unpackResultObject(object);
  const node = unpackedResultObject || object;

  if (typeof node.value === 'undefined' && node.type !== 'undefined') {
    node.description = sourceType.typeInfo.typeNames[0];
  }

  return node;

  /**
   * @param {!FormattedValueNode} object
   * @return {!Promise<?FormattedValueNode>}
   */
  async function unpackResultObject(object) {
    const {tag, value, inspectableAddress} = await object.findProperties('tag', 'value', 'inspectableAddress');
    if (!tag || !value) {
      return null;
    }
    const {className, symbol} = await tag.findProperties('className', 'symbol');
    if (!className || !symbol) {
      return null;
    }
    const resolvedClassName = className.value;
    if (typeof resolvedClassName !== 'string' || typeof symbol.objectId === 'undefined') {
      return null;
    }

    value.formatterTag = {symbol: symbol.objectId, className: resolvedClassName};
    value.inspectableAddress = inspectableAddress ? inspectableAddress.value : undefined;
    return value;
  }
}

// Formatters produce proper JavaScript objects, which are mirrored as RemoteObjects. To implement interleaving of
// formatted and statically typed values, formatters may insert markers in the JavaScript objects. The markers contain
// the static type information (`EvalBase`)to create a new StaticallyTypedValueNode tree root. Markers are identified by
// their className and the presence of a special Symbol property. Both the class name and the symbol are defined by the
// `formatterTag` property.
//
// A FormattedValueNode is a RemoteObject whose properties can be either FormattedValueNodes or
// StaticallyTypedValueNodes. The class hooks into the creation of RemoteObjects for properties to check whether a
// property is a marker.
class FormattedValueNode extends ValueNode {
  /**
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @param {!DebuggerLanguagePlugin} plugin
   * @param {!SourceType} sourceType
   * @param {!Protocol.Runtime.RemoteObject} object
   * @param {?{className: string, symbol: string}} formatterTag
   * @param {!SDK.RuntimeModel.EvaluationOptions} evalOptions
   * @param {number|undefined} inspectableAddress
   */
  constructor(callFrame, sourceType, plugin, object, formatterTag, evalOptions, inspectableAddress) {
    super(
        callFrame, object.objectId, object.type, object.subtype, object.value, inspectableAddress,
        object.unserializableValue, object.description, object.preview, object.customPreview, object.className);

    this._plugin = plugin;
    this._sourceType = sourceType;

    // The tag describes how to identify a marker by its className and its identifier symbol's object id.
    /** @type {?{className: string, symbol: string }} */
    this.formatterTag = formatterTag;

    this._evalOptions = evalOptions;
  }

  /**
   * @param {...string} properties
   * @return {!Promise<!Object<string, !FormattedValueNode|undefined>>}
   */
  async findProperties(...properties) {
    /** @type {!Object<string, !FormattedValueNode|undefined>} */
    const result = {};
    for (const prop of (await this.getOwnProperties(false)).properties || []) {
      if (properties.indexOf(prop.name) >= 0) {
        if (prop.value) {
          result[prop.name] = /** @type {!FormattedValueNode|undefined} */ (prop.value);
        }
      }
    }
    return result;
  }

  /**
   * Hook into RemoteObject creation for properties to check whether a property is a marker.
   * @override
   * @param {!Protocol.Runtime.RemoteObject} newObject
   */
  async _createRemoteObject(newObject) {
    // Check if the property RemoteObject is a marker
    const base = await this._getEvalBaseFromObject(newObject);
    if (!base) {
      return new FormattedValueNode(
          this.callFrame, this._sourceType, this._plugin, newObject, this.formatterTag, this._evalOptions, undefined);
    }

    // Property is a marker, check if it's just static type information or if we need to run formatters for the value.
    const newSourceType = this._sourceType.typeMap.get(base.rootType.typeId);
    if (!newSourceType) {
      throw new Error('Unknown typeId in eval base');
    }
    // The marker refers to a value that needs to be formatted, so run the formatter.
    if (base.rootType.hasValue && !base.rootType.canExpand && base) {
      return formatSourceValue(this.callFrame, this._plugin, newSourceType, base, [], this._evalOptions);
    }

    // The marker is just static information, so start a new subtree with a static type info root.
    const address =
        await StaticallyTypedValueNode.getInspectableAddress(this.callFrame, this._plugin, base, [], this._evalOptions);
    return new StaticallyTypedValueNode(
        this.callFrame, this._plugin, newSourceType, base, [], this._evalOptions, address);
  }

  /**
   * Check whether an object is a marker and if so return the EvalBase it contains.
   * @param {!Protocol.Runtime.RemoteObject} object
   * @return {!Promise<?EvalBase>}
   */
  async _getEvalBaseFromObject(object) {
    const {objectId} = object;
    if (!object || !this.formatterTag) {
      return null;
    }

    // A marker is definitively identified by the symbol property. To avoid checking the properties of all objects,
    // check the className first for an early exit.
    const {className, symbol} = this.formatterTag;
    if (className !== object.className) {
      return null;
    }

    const response = await this.debuggerModel().target().runtimeAgent().invoke_callFunctionOn(
        {functionDeclaration: 'function(sym) { return this[sym]; }', objectId, arguments: [{objectId: symbol}]});
    const {result} = response;
    if (!result || result.type === 'undefined') {
      return null;
    }

    // The object is a marker, so pull the static type information from its symbol property. The symbol property is not
    // a formatted value per se, but we wrap it as one to be able to call `findProperties`.
    const baseObject = new FormattedValueNode(
        this.callFrame, this._sourceType, this._plugin, result, null, this._evalOptions, undefined);
    const {payload, rootType} = await baseObject.findProperties('payload', 'rootType');
    if (typeof payload === 'undefined' || typeof rootType === 'undefined') {
      return null;
    }
    const value = await resolveRemoteObject(this.callFrame, payload);
    const {typeId} = await rootType.findProperties('typeId', 'rootType');
    if (typeof value === 'undefined' || typeof typeId === 'undefined') {
      return null;
    }

    const newSourceType = this._sourceType.typeMap.get(typeId.value);
    if (!newSourceType) {
      return null;
    }

    return {payload: value, rootType: newSourceType.typeInfo};
  }
}

class FormattingError extends Error {
  /**
   * @param {!SDK.RemoteObject.RemoteObject} exception
   * @param {!Protocol.Runtime.ExceptionDetails} exceptionDetails
   */
  constructor(exception, exceptionDetails) {
    const {description} = exceptionDetails.exception || {};
    super(description || exceptionDetails.text);
    this.exception = exception;
    this.exceptionDetails = exceptionDetails;
  }

  /**
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @param {string} message
   */
  static throwLocal(callFrame, message) {
    /** @type {!Protocol.Runtime.RemoteObject} */
    const exception = {
      type: Protocol.Runtime.RemoteObjectType.Object,
      subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
      description: message
    };
    /** @type {!Protocol.Runtime.ExceptionDetails} */
    const exceptionDetails = {text: 'Uncaught', exceptionId: -1, columnNumber: 0, lineNumber: 0, exception};
    const errorObject = callFrame.debuggerModel.runtimeModel().createRemoteObject(exception);
    throw new FormattingError(errorObject, exceptionDetails);
  }
}

// This class implements a `RemoteObject` for source language value whose immediate properties are defined purely by
// static type information. Static type information is expressed by an `EvalBase` together with a `fieldChain`. The
// latter is necessary to express navigating through type members. We don't know how to make sense of an `EvalBase`'s
// payload here, which is why member navigation is relayed to the formatter via the `fieldChain`.
class StaticallyTypedValueNode extends ValueNode {
  /**
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @param {!DebuggerLanguagePlugin} plugin
   * @param {!SourceType} sourceType The source type for this node.
   * @param {?EvalBase} base Base type information for the root of the current statically typed subtree.
   * @param {!Array<!FieldInfo>} fieldChain A sequence of `FieldInfo`s gathered on the path from the base to this node.
   * @param {!SDK.RuntimeModel.EvaluationOptions} evalOptions
   * @param {number|undefined} inspectableAddress
   */
  constructor(callFrame, plugin, sourceType, base, fieldChain, evalOptions, inspectableAddress) {
    const typeName = sourceType.typeInfo.typeNames[0] || '<anonymous>';
    const variableType = 'object';
    super(
        callFrame,
        /* objectId=*/ undefined,
        /* type=*/ variableType,
        /* subtype=*/ undefined, /* value=*/ null, inspectableAddress, /* unserializableValue=*/ undefined,
        /* description=*/ typeName, /* preview=*/ undefined, /* customPreview=*/ undefined, /* className=*/ typeName);
    this._variableType = variableType;
    this._plugin = plugin;
    /** @type {!SourceType} */
    this._sourceType = sourceType;
    this._base = base;
    this._fieldChain = fieldChain;
    this._hasChildren = true;
    this._evalOptions = evalOptions;
  }

  /**
   * @override
   * @return {string}
   */
  get type() {
    return this._variableType;
  }

  /**
   * @param {!SourceType} sourceType
   * @param {!FieldInfo} fieldInfo
   * @return {!Promise<!SDK.RemoteObject.RemoteObject>}
   */
  async _expandMember(sourceType, fieldInfo) {
    const fieldChain = this._fieldChain.concat(fieldInfo);
    if (sourceType.typeInfo.hasValue && !sourceType.typeInfo.canExpand && this._base) {
      return formatSourceValue(this.callFrame, this._plugin, sourceType, this._base, fieldChain, this._evalOptions);
    }

    const address = this.inspectableAddress !== undefined ? this.inspectableAddress + fieldInfo.offset : undefined;
    return new StaticallyTypedValueNode(
        this.callFrame, this._plugin, sourceType, this._base, fieldChain, this._evalOptions, address);
  }


  /**
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @param {!DebuggerLanguagePlugin} plugin
   * @param {EvalBase?} base
   * @param {!Array<!FieldInfo>} field
   * @param {!SDK.RuntimeModel.EvaluationOptions} evalOptions
   * @return {!Promise<number|undefined>}
   */
  static async getInspectableAddress(callFrame, plugin, base, field, evalOptions) {
    if (!base) {
      return undefined;
    }

    const addressCode = await plugin.getInspectableAddress({base, field});
    if (!addressCode.js) {
      return undefined;
    }
    const response = await callFrame.debuggerModel.target().debuggerAgent().invoke_evaluateOnCallFrame({
      callFrameId: callFrame.id,
      expression: addressCode.js,
      objectGroup: evalOptions.objectGroup,
      includeCommandLineAPI: evalOptions.includeCommandLineAPI,
      silent: evalOptions.silent,
      returnByValue: true,
      generatePreview: evalOptions.generatePreview,
      throwOnSideEffect: evalOptions.throwOnSideEffect,
      timeout: evalOptions.timeout,
    });

    const error = response.getError();
    if (error) {
      throw new Error(error);
    }

    const {result, exceptionDetails} = response;
    if (exceptionDetails) {
      throw new FormattingError(callFrame.debuggerModel.runtimeModel().createRemoteObject(result), exceptionDetails);
    }

    const address = result.value;
    if (!Number.isSafeInteger(address) || address < 0) {
      console.error(`Inspectable address is not a positive, safe integer: ${address}`);
      return undefined;
    }

    return address;
  }

  /**
   * @override
   * @param {boolean} ownProperties
   * @param {boolean} accessorPropertiesOnly
   * @param {boolean} generatePreview
   * @return {!Promise<!SDK.RemoteObject.GetPropertiesResult>}
   */
  async doGetProperties(ownProperties, accessorPropertiesOnly, generatePreview) {
    const {typeInfo} = this._sourceType;
    if (accessorPropertiesOnly || !typeInfo.canExpand) {
      return /** @type {!SDK.RemoteObject.GetPropertiesResult} */ ({properties: [], internalProperties: []});
    }

    if (typeInfo.members.length > 0) {
      // This value doesn't have a formatter, but we can eagerly expand arrays in the frontend if the size is known.
      if (typeInfo.arraySize > 0) {
        const {typeId} = this._sourceType.typeInfo.members[0];
        /** @type {!Array<!SDK.RemoteObject.RemoteObjectProperty>} */
        const properties = [];
        const elementTypeInfo = this._sourceType.members[0];
        for (let i = 0; i < typeInfo.arraySize; ++i) {
          const name = `${i}`;
          const elementField = {name, typeId, offset: elementTypeInfo.typeInfo.size * i};
          properties.push(new SDK.RemoteObject.RemoteObjectProperty(
              name, await this._expandMember(elementTypeInfo, elementField), /* enumerable=*/ false,
              /* writable=*/ false,
              /* isOwn=*/ true,
              /* wasThrown=*/ false));
        }
        return /** @type {!SDK.RemoteObject.GetPropertiesResult} */ ({properties, internalProperties: []});
      }

      // The node is expanded, just make remote objects for its members
      const members = Promise.all(this._sourceType.members.map(async (memberTypeInfo, idx) => {
        const fieldInfo = this._sourceType.typeInfo.members[idx];
        const propertyObject = await this._expandMember(memberTypeInfo, fieldInfo);
        const name = fieldInfo.name || '';
        return new SDK.RemoteObject.RemoteObjectProperty(
            name, propertyObject, /* enumerable=*/ false, /* writable=*/ false, /* isOwn=*/ true,
            /* wasThrown=*/ false);
      }));
      return /** @type {!SDK.RemoteObject.GetPropertiesResult} */ ({properties: await members, internalProperties: []});
    }


    return /** @type {!SDK.RemoteObject.GetPropertiesResult} */ ({properties: [], internalProperties: []});
  }
}

class NamespaceObject extends SDK.RemoteObject.LocalJSONObject {
  /**
   * @param {*} value
   */
  constructor(value) {
    super(value);
  }

  /**
   * @override
   * @return {string}
   */
  get description() {
    return this.type;
  }

  /**
   * @override
   * @return {string}
   */
  get type() {
    return 'namespace';
  }
}

class SourceScopeRemoteObject extends SDK.RemoteObject.RemoteObjectImpl {
  /**
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @param {!DebuggerLanguagePlugin} plugin
   * @param {!RawLocation} location
   */
  constructor(callFrame, plugin, location) {
    super(callFrame.debuggerModel.runtimeModel(), undefined, 'object', undefined, null);
    /** @type {!Array<!Variable>} */
    this.variables = [];
    this._callFrame = callFrame;
    this._plugin = plugin;
    this._location = location;
  }

  /**
   * @override
   * @param {boolean} ownProperties
   * @param {boolean} accessorPropertiesOnly
   * @param {boolean} generatePreview
   * @return {!Promise<!SDK.RemoteObject.GetPropertiesResult>}
   */
  async doGetProperties(ownProperties, accessorPropertiesOnly, generatePreview) {
    if (accessorPropertiesOnly) {
      return /** @type {!SDK.RemoteObject.GetPropertiesResult} */ ({properties: [], internalProperties: []});
    }

    const properties = [];
    /** @type {!Object<string, !SDK.RemoteObject.RemoteObject>} */
    const namespaces = {};

    /**
     * @param {string} name
     * @param {!SDK.RemoteObject.RemoteObject} obj
     */
    function makeProperty(name, obj) {
      return new SDK.RemoteObject.RemoteObjectProperty(
          name, obj,
          /* enumerable=*/ false, /* writable=*/ false, /* isOwn=*/ true, /* wasThrown=*/ false);
    }

    for (const variable of this.variables) {
      let sourceVar;
      try {
        sourceVar = await getValueTreeForExpression(
            this._callFrame, this._plugin, variable.name,
            /** @type {!SDK.RuntimeModel.EvaluationOptions} */
            ({
              generatePreview: false,
              includeCommandLineAPI: true,
              objectGroup: 'backtrace',
              returnByValue: false,
              silent: false
            }));
      } catch (e) {
        console.warn(e);
        sourceVar = new SDK.RemoteObject.LocalJSONObject(undefined);
      }
      if (variable.nestedName && variable.nestedName.length > 1) {
        let parent = namespaces;
        for (let index = 0; index < variable.nestedName.length - 1; index++) {
          const nestedName = variable.nestedName[index];
          let child = parent[nestedName];
          if (!child) {
            child = new NamespaceObject({});
            parent[nestedName] = child;
          }
          parent = child.value;
        }
        const name = variable.nestedName[variable.nestedName.length - 1];
        parent[name] = sourceVar;
      } else {
        properties.push(makeProperty(variable.name, sourceVar));
      }
    }

    for (const namespace in namespaces) {
      properties.push(makeProperty(namespace, /** @type {!SDK.RemoteObject.RemoteObject} */ (namespaces[namespace])));
    }

    return /** @type {!SDK.RemoteObject.GetPropertiesResult} */ ({properties: properties, internalProperties: []});
  }
}

/**
 * @implements {SDK.DebuggerModel.ScopeChainEntry}
 */
export class SourceScope {
  /**
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @param {string} type
   * @param {string} typeName
   * @param {string|undefined} icon
   * @param {!DebuggerLanguagePlugin} plugin
   * @param {!RawLocation} location
   */
  constructor(callFrame, type, typeName, icon, plugin, location) {
    this._callFrame = callFrame;
    this._type = type;
    this._typeName = typeName;
    this._icon = icon;
    this._object = new SourceScopeRemoteObject(callFrame, plugin, location);
    this._name = type;
    /** @type {?SDK.DebuggerModel.Location} */
    this._startLocation = null;
    /** @type {?SDK.DebuggerModel.Location} */
    this._endLocation = null;
  }

  /**
   * @param {string} name
   * @return {!Promise<?SDK.RemoteObject.RemoteObject>}
   */
  async getVariableValue(name) {
    for (let v = 0; v < this._object.variables.length; ++v) {
      if (this._object.variables[v].name !== name) {
        continue;
      }
      const properties = await this._object.getAllProperties(false, false);
      if (!properties.properties) {
        continue;
      }
      const {value} = properties.properties[v];
      if (value) {
        return value;
      }
    }
    return null;
  }

  /**
   * @override
   * @return {!SDK.DebuggerModel.CallFrame}
   */
  callFrame() {
    return this._callFrame;
  }

  /**
   * @override
   * @return {string}
   */
  type() {
    return this._type;
  }

  /**
   * @override
   * @return {string}
   */
  typeName() {
    return this._typeName;
  }

  /**
   * @override
   * @return {string|undefined}
   */
  name() {
    return undefined;
  }

  /**
   * @override
   * @return {?SDK.DebuggerModel.Location}
   */
  startLocation() {
    return this._startLocation;
  }

  /**
   * @override
   * @return {?SDK.DebuggerModel.Location}
   */
  endLocation() {
    return this._endLocation;
  }

  /**
   * @override
   * @return {!SourceScopeRemoteObject}
   */
  object() {
    return this._object;
  }

  /**
   * @override
   * @return {string}
   */
  description() {
    return '';
  }

  /**
   * @override
   */
  icon() {
    return this._icon;
  }
}

/**
 * @implements {SDK.SDKModel.SDKModelObserver<!SDK.DebuggerModel.DebuggerModel>}
 */
export class DebuggerLanguagePluginManager {
  /**
   * @param {!SDK.SDKModel.TargetManager} targetManager
   * @param {!Workspace.Workspace.WorkspaceImpl} workspace
   * @param {!DebuggerWorkspaceBinding} debuggerWorkspaceBinding
   */
  constructor(targetManager, workspace, debuggerWorkspaceBinding) {
    this._workspace = workspace;
    this._debuggerWorkspaceBinding = debuggerWorkspaceBinding;

    /** @type {!Array<!DebuggerLanguagePlugin>} */
    this._plugins = [];

    /** @type {!Map<!SDK.DebuggerModel.DebuggerModel, !ModelData>} */
    this._debuggerModelToData = new Map();
    targetManager.observeModels(SDK.DebuggerModel.DebuggerModel, this);

    /**
     * @type {!Map<string, !{
     *   rawModuleId: string,
     *   plugin: !DebuggerLanguagePlugin,
     *   scripts: !Array<!SDK.Script.Script>,
     *   addRawModulePromise: !Promise<!Array<string>>
     * }>}
     */
    this._rawModuleHandles = new Map();
  }

  /**
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @param {!SDK.RuntimeModel.EvaluationOptions} options
   * @returns {!Promise<?SDK.RuntimeModel.EvaluationResult>}
   */
  async _evaluateOnCallFrame(callFrame, options) {
    const {script} = callFrame;
    const {expression} = options;
    const {plugin} = await this._rawModuleIdAndPluginForScript(script);
    if (!plugin) {
      return null;
    }
    const location = getRawLocation(callFrame);
    const sourceLocations = await plugin.rawLocationToSourceLocation(location);
    if (sourceLocations.length === 0) {
      return null;
    }

    try {
      const object = await getValueTreeForExpression(callFrame, plugin, expression, options);
      return {object, exceptionDetails: undefined};
    } catch (error) {
      if (error instanceof FormattingError) {
        const {exception: object, exceptionDetails} = error;
        return {object, exceptionDetails};
      }
      return {error: error.message};
    }
  }

  /**
   * @param {!Array<!SDK.DebuggerModel.CallFrame>} callFrames
   * @return {!Promise<!Array<!SDK.DebuggerModel.CallFrame>>}
   */
  _expandCallFrames(callFrames) {
    return Promise
        .all(callFrames.map(async callFrame => {
          const {frames} = await this.getFunctionInfo(callFrame);
          if (frames.length) {
            return frames.map(({name}, index) => callFrame.createVirtualCallFrame(index, name));
          }
          return callFrame;
        }))
        .then(callFrames => callFrames.flat());
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   */
  modelAdded(debuggerModel) {
    this._debuggerModelToData.set(debuggerModel, new ModelData(debuggerModel, this._workspace));
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.GlobalObjectCleared, this._globalObjectCleared, this);
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.ParsedScriptSource, this._parsedScriptSource, this);
    debuggerModel.setEvaluateOnCallFrameCallback(this._evaluateOnCallFrame.bind(this));
    debuggerModel.setExpandCallFramesCallback(this._expandCallFrames.bind(this));
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   */
  modelRemoved(debuggerModel) {
    debuggerModel.removeEventListener(SDK.DebuggerModel.Events.GlobalObjectCleared, this._globalObjectCleared, this);
    debuggerModel.removeEventListener(SDK.DebuggerModel.Events.ParsedScriptSource, this._parsedScriptSource, this);
    debuggerModel.setEvaluateOnCallFrameCallback(null);
    debuggerModel.setExpandCallFramesCallback(null);
    const modelData = this._debuggerModelToData.get(debuggerModel);
    if (modelData) {
      modelData._dispose();
      this._debuggerModelToData.delete(debuggerModel);
    }
    this._rawModuleHandles.forEach((rawModuleHandle, rawModuleId) => {
      const scripts = rawModuleHandle.scripts.filter(script => script.debuggerModel !== debuggerModel);
      if (scripts.length === 0) {
        rawModuleHandle.plugin.removeRawModule(rawModuleId).catch(error => {
          Common.Console.Console.instance().error(ls`Error in debugger language plugin: ${error.message}`);
        });
        this._rawModuleHandles.delete(rawModuleId);
      } else {
        rawModuleHandle.scripts = scripts;
      }
    });
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _globalObjectCleared(event) {
    const debuggerModel = /** @type {!SDK.DebuggerModel.DebuggerModel} */ (event.data);
    this.modelRemoved(debuggerModel);
    this.modelAdded(debuggerModel);
  }

  /**
   * @param {!DebuggerLanguagePlugin} plugin
   */
  addPlugin(plugin) {
    this._plugins.push(plugin);
    for (const debuggerModel of this._debuggerModelToData.keys()) {
      for (const script of debuggerModel.scripts()) {
        if (this.hasPluginForScript(script)) {
          continue;
        }
        this._parsedScriptSource({data: script});
      }
    }
  }

  /**
   * @param {!DebuggerLanguagePlugin} plugin
   */
  removePlugin(plugin) {
    this._plugins = this._plugins.filter(p => p !== plugin);
    const scripts = new Set();
    this._rawModuleHandles.forEach((rawModuleHandle, rawModuleId) => {
      if (rawModuleHandle.plugin !== plugin) {
        return;
      }
      rawModuleHandle.scripts.forEach(script => scripts.add(script));
      this._rawModuleHandles.delete(rawModuleId);
    });
    for (const script of scripts) {
      const modelData = /** @type {!ModelData} */ (this._debuggerModelToData.get(script.debuggerModel));
      modelData._removeScript(script);

      // Let's see if we have another plugin that's happy to
      // take this orphaned script now. This is important to
      // get right, since the same plugin might race during
      // unregister/register and we might already have the
      // new instance of the plugin added before we remove
      // the previous instance.
      this._parsedScriptSource({data: script});
    }
  }

  /**
   * @param {!SDK.Script.Script} script
   * @return {boolean}
   */
  hasPluginForScript(script) {
    const rawModuleId = rawModuleIdForScript(script);
    const rawModuleHandle = this._rawModuleHandles.get(rawModuleId);
    return rawModuleHandle !== undefined && rawModuleHandle.scripts.includes(script);
  }

  /**
   * Returns the responsible language plugin and the raw module ID for a script.
   *
   * This ensures that the `addRawModule` call finishes first such that the
   * caller can immediately issue calls to the returned plugin without the
   * risk of racing with the `addRawModule` call. The returned plugin will be
   * set to undefined to indicate that there's no plugin for the script.
   *
   * @param {!SDK.Script.Script} script
   * @return {!Promise<!{rawModuleId: string, plugin: ?DebuggerLanguagePlugin}>}
   */
  async _rawModuleIdAndPluginForScript(script) {
    const rawModuleId = rawModuleIdForScript(script);
    const rawModuleHandle = this._rawModuleHandles.get(rawModuleId);
    if (rawModuleHandle) {
      await rawModuleHandle.addRawModulePromise;
      if (rawModuleHandle === this._rawModuleHandles.get(rawModuleId)) {
        return {rawModuleId, plugin: rawModuleHandle.plugin};
      }
    }
    return {rawModuleId, plugin: null};
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {!Promise<?Workspace.UISourceCode.UILocation>}
   */
  async rawLocationToUILocation(rawLocation) {
    const script = rawLocation.script();
    if (!script) {
      return null;
    }
    const {rawModuleId, plugin} = await this._rawModuleIdAndPluginForScript(script);
    if (!plugin) {
      return null;
    }

    const pluginLocation = {
      rawModuleId,
      // RawLocation.columnNumber is the byte offset in the full raw wasm module. Plugins expect the offset in the code
      // section, so subtract the offset of the code section in the module here.
      codeOffset: rawLocation.columnNumber - (script.codeOffset() || 0),
      inlineFrameIndex: rawLocation.inlineFrameIndex
    };

    try {
      const sourceLocations = await plugin.rawLocationToSourceLocation(pluginLocation);
      for (const sourceLocation of sourceLocations) {
        const modelData = this._debuggerModelToData.get(script.debuggerModel);
        if (!modelData) {
          continue;
        }
        const uiSourceCode = modelData._project.uiSourceCodeForURL(sourceLocation.sourceFileURL);
        if (!uiSourceCode) {
          continue;
        }
        // Absence of column information is indicated by the value `-1` in talking to language plugins.
        return uiSourceCode.uiLocation(
            sourceLocation.lineNumber, sourceLocation.columnNumber >= 0 ? sourceLocation.columnNumber : undefined);
      }
    } catch (error) {
      Common.Console.Console.instance().error(ls`Error in debugger language plugin: ${error.message}`);
    }
    return null;
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number=} columnNumber
   * @return {!Promise<?Array<!{start: !SDK.DebuggerModel.Location, end: !SDK.DebuggerModel.Location}>>} Returns null if this manager does not have a plugin for it.
   */
  uiLocationToRawLocationRanges(uiSourceCode, lineNumber, columnNumber = -1) {
    /** @type {!Array<!Promise<!Array<!{start: !SDK.DebuggerModel.Location, end: !SDK.DebuggerModel.Location}>>>} */
    const locationPromises = [];
    this.scriptsForUISourceCode(uiSourceCode).forEach(script => {
      const rawModuleId = rawModuleIdForScript(script);
      const rawModuleHandle = this._rawModuleHandles.get(rawModuleId);
      if (!rawModuleHandle) {
        return;
      }
      const {plugin} = rawModuleHandle;
      locationPromises.push(getLocations(rawModuleId, plugin, script));
    });
    if (locationPromises.length === 0) {
      return Promise.resolve(null);
    }

    return Promise.all(locationPromises).then(locations => locations.flat()).catch(error => {
      Common.Console.Console.instance().error(ls`Error in debugger language plugin: ${error.message}`);
      return null;
    });

    /**
     * @param {string} rawModuleId
     * @param {!DebuggerLanguagePlugin} plugin
     * @param {!SDK.Script.Script} script
     * @return {!Promise<!Array<!{start: !SDK.DebuggerModel.Location, end: !SDK.DebuggerModel.Location}>>}
     */
    async function getLocations(rawModuleId, plugin, script) {
      const pluginLocation = {rawModuleId, sourceFileURL: uiSourceCode.url(), lineNumber, columnNumber};

      const rawLocations = await plugin.sourceLocationToRawLocation(pluginLocation);
      if (!rawLocations) {
        return [];
      }
      return rawLocations.map(
          m => ({
            start: new SDK.DebuggerModel.Location(
                script.debuggerModel, script.scriptId, 0, Number(m.startOffset) + (script.codeOffset() || 0)),
            end: new SDK.DebuggerModel.Location(
                script.debuggerModel, script.scriptId, 0, Number(m.endOffset) + (script.codeOffset() || 0))
          }));
    }
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number=} columnNumber
   * @return {!Promise<?Array<!SDK.DebuggerModel.Location>>} Returns null if this manager does not have a plugin for it.
   */
  async uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber) {
    const locationRanges = await this.uiLocationToRawLocationRanges(uiSourceCode, lineNumber, columnNumber);
    if (!locationRanges) {
      return null;
    }
    return locationRanges.map(({start}) => start);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {!Array<!SDK.Script.Script>}
   */
  scriptsForUISourceCode(uiSourceCode) {
    for (const modelData of this._debuggerModelToData.values()) {
      const scripts = modelData._uiSourceCodeToScripts.get(uiSourceCode);
      if (scripts) {
        return scripts;
      }
    }
    return [];
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _parsedScriptSource(event) {
    const script = /** @type {!SDK.Script.Script} */ (event.data);
    if (!script.sourceURL) {
      return;
    }

    for (const plugin of this._plugins) {
      if (!plugin.handleScript(script)) {
        return;
      }
      const rawModuleId = rawModuleIdForScript(script);
      let rawModuleHandle = this._rawModuleHandles.get(rawModuleId);
      if (!rawModuleHandle) {
        const sourceFileURLsPromise = (async () => {
          const console = Common.Console.Console.instance();
          const url = script.sourceURL;
          const symbolsUrl = (script.debugSymbols && script.debugSymbols.externalURL) || '';
          if (symbolsUrl) {
            console.log(ls`[${plugin.name}] Loading debug symbols for ${url} (via ${symbolsUrl})...`);
          } else {
            console.log(ls`[${plugin.name}] Loading debug symbols for ${url}...`);
          }
          try {
            const code = (!symbolsUrl && url.startsWith('wasm://')) ? await script.getWasmBytecode() : undefined;
            const sourceFileURLs = await plugin.addRawModule(rawModuleId, symbolsUrl, {url, code});
            // Check that the handle isn't stale by now. This works because the code that assigns to
            // `rawModuleHandle` below will run before this code because of the `await` in the preceding
            // line. This is primarily to avoid logging the message below, which would give the developer
            // the misleading information that we're done, while in reality it was a stale call that finished.
            if (rawModuleHandle !== this._rawModuleHandles.get(rawModuleId)) {
              return [];
            }
            if (sourceFileURLs.length === 0) {
              console.warn(ls`[${plugin.name}] Loaded debug symbols for ${url}, but didn't find any source files`);
            } else {
              console.log(
                  ls`[${plugin.name}] Loaded debug symbols for ${url}, found ${sourceFileURLs.length} source file(s)`);
            }
            return sourceFileURLs;
          } catch (error) {
            console.error(ls`[${plugin.name}] Failed to load debug symbols for ${url} (${error.message})`);
            this._rawModuleHandles.delete(rawModuleId);
            return [];
          }
        })();
        rawModuleHandle = {rawModuleId, plugin, scripts: [script], addRawModulePromise: sourceFileURLsPromise};
        this._rawModuleHandles.set(rawModuleId, rawModuleHandle);
      } else {
        rawModuleHandle.scripts.push(script);
      }

      // Wait for the addRawModule call to finish and
      // update the project. It's important to check
      // for the DebuggerModel again, which may disappear
      // in the meantime...
      rawModuleHandle.addRawModulePromise.then(sourceFileURLs => {
        // The script might have disappeared meanwhile...
        if (script.debuggerModel.scriptForId(script.scriptId) === script) {
          const modelData = this._debuggerModelToData.get(script.debuggerModel);
          if (modelData) {  // The DebuggerModel could have disappeared meanwhile...
            modelData._addSourceFiles(script, sourceFileURLs);
            this._debuggerWorkspaceBinding.updateLocations(script);
          }
        }
      });
      return;
    }
  }

  /**
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @return {!Promise<?Array<!SourceScope>>}
   */
  async resolveScopeChain(callFrame) {
    const script = callFrame.script;
    const {rawModuleId, plugin} = await this._rawModuleIdAndPluginForScript(script);
    if (!plugin) {
      return null;
    }

    const location = {
      rawModuleId,
      codeOffset: callFrame.location().columnNumber - (script.codeOffset() || 0),
      inlineFrameIndex: callFrame.inlineFrameIndex
    };

    try {
      const sourceMapping = await plugin.rawLocationToSourceLocation(location);
      if (sourceMapping.length === 0) {
        return null;
      }
      /** @type {!Map<string, !SourceScope>} */
      const scopes = new Map();
      const variables = await plugin.listVariablesInScope(location);
      for (const variable of variables || []) {
        let scope = scopes.get(variable.scope);
        if (!scope) {
          const {type, typeName, icon} = await plugin.getScopeInfo(variable.scope);
          scope = new SourceScope(callFrame, type, typeName, icon, plugin, location);
          scopes.set(variable.scope, scope);
        }
        scope.object().variables.push(variable);
      }
      return Array.from(scopes.values());
    } catch (error) {
      Common.Console.Console.instance().error(ls`Error in debugger language plugin: ${error.message}`);
      return null;
    }
  }

  /**
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @return {!Promise<!{frames: !Array<!FunctionInfo>}>}
   */
  async getFunctionInfo(callFrame) {
    const noDwarfInfo = {frames: []};
    if (!callFrame) {
      return noDwarfInfo;
    }
    const script = callFrame.script;
    const {rawModuleId, plugin} = await this._rawModuleIdAndPluginForScript(script);
    if (!plugin) {
      return noDwarfInfo;
    }

    /** @type {!RawLocation}} */
    const location = {
      rawModuleId,
      codeOffset: callFrame.location().columnNumber - (script.codeOffset() || 0),
    };

    try {
      return await plugin.getFunctionInfo(location);
    } catch (error) {
      Common.Console.Console.instance().warn(ls`Error in debugger language plugin: ${error.message}`);
      return noDwarfInfo;
    }
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {!Promise<!Array<!{start: !SDK.DebuggerModel.Location, end: !SDK.DebuggerModel.Location}>>} Returns an empty list if this manager does not have a plugin for it.
   */
  async getInlinedFunctionRanges(rawLocation) {
    const script = rawLocation.script();
    if (!script) {
      return [];
    }
    const {rawModuleId, plugin} = await this._rawModuleIdAndPluginForScript(script);
    if (!plugin) {
      return [];
    }

    const pluginLocation = {
      rawModuleId,
      // RawLocation.columnNumber is the byte offset in the full raw wasm module. Plugins expect the offset in the code
      // section, so subtract the offset of the code section in the module here.
      codeOffset: rawLocation.columnNumber - (script.codeOffset() || 0),
    };

    try {
      const locations = await plugin.getInlinedFunctionRanges(pluginLocation);
      return locations.map(
          m => ({
            start: new SDK.DebuggerModel.Location(
                script.debuggerModel, script.scriptId, 0, Number(m.startOffset) + (script.codeOffset() || 0)),
            end: new SDK.DebuggerModel.Location(
                script.debuggerModel, script.scriptId, 0, Number(m.endOffset) + (script.codeOffset() || 0))
          }));
    } catch (error) {
      Common.Console.Console.instance().warn(ls`Error in debugger language plugin: ${error.message}`);
      return [];
    }
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {!Promise<!Array<!{start: !SDK.DebuggerModel.Location, end: !SDK.DebuggerModel.Location}>>} Returns an empty list if this manager does not have a plugin for it.
   */
  async getInlinedCalleesRanges(rawLocation) {
    const script = rawLocation.script();
    if (!script) {
      return [];
    }
    const {rawModuleId, plugin} = await this._rawModuleIdAndPluginForScript(script);
    if (!plugin) {
      return [];
    }

    const pluginLocation = {
      rawModuleId,
      // RawLocation.columnNumber is the byte offset in the full raw wasm module. Plugins expect the offset in the code
      // section, so subtract the offset of the code section in the module here.
      codeOffset: rawLocation.columnNumber - (script.codeOffset() || 0),
    };

    try {
      const locations = await plugin.getInlinedCalleesRanges(pluginLocation);
      return locations.map(
          m => ({
            start: new SDK.DebuggerModel.Location(
                script.debuggerModel, script.scriptId, 0, Number(m.startOffset) + (script.codeOffset() || 0)),
            end: new SDK.DebuggerModel.Location(
                script.debuggerModel, script.scriptId, 0, Number(m.endOffset) + (script.codeOffset() || 0))
          }));
    } catch (error) {
      Common.Console.Console.instance().warn(ls`Error in debugger language plugin: ${error.message}`);
      return [];
    }
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  async getMappedLines(uiSourceCode) {
    const rawModuleIds =
        await Promise.all(this.scriptsForUISourceCode(uiSourceCode).map(s => this._rawModuleIdAndPluginForScript(s)));

    /** @type {Set<number> | undefined} */
    let mappedLines;
    for (const {rawModuleId, plugin} of rawModuleIds) {
      if (!plugin) {
        continue;
      }
      const lines = await plugin.getMappedLines(rawModuleId, uiSourceCode.url());

      if (lines === undefined) {
        continue;
      }
      if (mappedLines === undefined) {
        mappedLines = new Set(lines);
      } else {
        /**
         * @param {number} l
         */
        lines.forEach(l => /** @type {!Set<number>} */ (mappedLines).add(l));
      }
    }
    return mappedLines;
  }
}

class ModelData {
  /**
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   * @param {!Workspace.Workspace.WorkspaceImpl} workspace
   */
  constructor(debuggerModel, workspace) {
    this._debuggerModel = debuggerModel;
    this._project = new ContentProviderBasedProject(
        workspace, 'language_plugins::' + debuggerModel.target().id(), Workspace.Workspace.projectTypes.Network, '',
        false /* isServiceProject */);
    NetworkProject.setTargetForProject(this._project, debuggerModel.target());

    /** @type {!Map<!Workspace.UISourceCode.UISourceCode, !Array<!SDK.Script.Script>>} */
    this._uiSourceCodeToScripts = new Map();
  }

  /**
   * @param {!SDK.Script.Script} script
   * @param {!Array<string>} urls
   */
  _addSourceFiles(script, urls) {
    const initiator = script.createPageResourceLoadInitiator();
    for (const url of urls) {
      let uiSourceCode = this._project.uiSourceCodeForURL(url);
      if (!uiSourceCode) {
        uiSourceCode = this._project.createUISourceCode(url, Common.ResourceType.resourceTypes.SourceMapScript);
        NetworkProject.setInitialFrameAttribution(uiSourceCode, script.frameId);

        // Bind the uiSourceCode to the script first before we add the
        // uiSourceCode to the project and thereby notify the rest of
        // the system about the new source file.
        // https://crbug.com/1150295 is an example where the breakpoint
        // resolution logic kicks in right after adding the uiSourceCode
        // and at that point we already need to have the mapping in place
        // otherwise we will not get the breakpoint right.
        this._uiSourceCodeToScripts.set(uiSourceCode, [script]);

        const contentProvider = new SDK.CompilerSourceMappingContentProvider.CompilerSourceMappingContentProvider(
            url, Common.ResourceType.resourceTypes.SourceMapScript, initiator);
        const mimeType = Common.ResourceType.ResourceType.mimeFromURL(url) || 'text/javascript';
        this._project.addUISourceCodeWithProvider(uiSourceCode, contentProvider, null, mimeType);
      } else {
        // The same uiSourceCode can be provided by different scripts,
        // but we don't expect that to happen frequently.
        const scripts = /** @type {!Array<!SDK.Script.Script>} */ (this._uiSourceCodeToScripts.get(uiSourceCode));
        if (!scripts.includes(script)) {
          scripts.push(script);
        }
      }
    }
  }

  /**
   * @param {!SDK.Script.Script} script
   */
  _removeScript(script) {
    this._uiSourceCodeToScripts.forEach((scripts, uiSourceCode) => {
      scripts = scripts.filter(s => s !== script);
      if (scripts.length === 0) {
        this._uiSourceCodeToScripts.delete(uiSourceCode);
        this._project.removeUISourceCode(uiSourceCode.url());
      } else {
        this._uiSourceCodeToScripts.set(uiSourceCode, scripts);
      }
    });
  }

  _dispose() {
    this._project.dispose();
  }
}

/** Raw modules represent compiled JavaScript Scripts or Wasm Modules
 * @typedef {{
 *            url: string,
 *            code: (ArrayBuffer|undefined)
 *          }}
 */
// @ts-ignore typedef
export let RawModule;

/** Code ranges in raw modules
 * @typedef {{
 *            rawModuleId:string,
 *            startOffset:number,
 *            endOffset:number
 *          }}
 */
// @ts-ignore typedef
export let RawLocationRange;

/** Offsets in raw modules
 * @typedef {{
 *            rawModuleId: string,
 *            codeOffset: number,
 *            inlineFrameIndex?: number
 *          }}
 */
// @ts-ignore typedef
export let RawLocation;

/** Locations in source files. A columnNumber of `-1` indicates that the location refers to the whole line.
 * @typedef {{
 *            rawModuleId: string,
 *            sourceFileURL: string,
 *            lineNumber: number,
 *            columnNumber: number
 *          }}
 */
// @ts-ignore typedef
export let SourceLocation;

/** A source language variable
 * @typedef {{
 *            scope: string,
 *            name: string,
 *            type: string,
 *            nestedName: ?Array<string>
 *          }}
 */
// @ts-ignore typedef
export let Variable;

/** The value of a source language variable
 * @typedef {{
 *            value: (string|!Array<!VariableValue>),
 *            js_type: string,
 *            type: string,
 *            name: string
 *          }}
 */
// @ts-ignore typedef
export let VariableValue;


/** Either the code of an evaluator module or a constant representation of a variable
 * @typedef {{
 *            code: (!ArrayBuffer|undefined),
 *            constantValue: (!VariableValue|undefined)
 *          }}
 */
// @ts-ignore typedef
export let EvaluatorModule;

/** Description of a scope
 * @typedef {{
 *            type: string,
 *            typeName: string,
 *            icon: (string|undefined)
 *          }}
 */
// @ts-ignore typedef
export let ScopeInfo;

/** Either the code of an evaluator module or a constant representation of a variable
 * @typedef {{
 *            name: string
 *          }}
 */
// @ts-ignore typedef
export let FunctionInfo;

/**
 * @typedef {{
 *            name: (string|undefined),
 *            offset: number,
 *            typeId: *
 *}}
 */
// @ts-ignore typedef
export let FieldInfo;
/**
 * @typedef {{
 *            typeNames: !Array<string>,
 *            typeId: *,
 *            members: !Array<!FieldInfo>,
 *            alignment: number,
 *            arraySize: number,
 *            size: number,
 *            canExpand: boolean,
 *            hasValue: boolean
 *          }}
 */
// @ts-ignore typedef
export let TypeInfo;

/**
 * @typedef {{
 *            rootType: TypeInfo,
 *            payload: *
 *}}
*/
// @ts-ignore typedef
export let EvalBase;

export class DebuggerLanguagePlugin {
  /**
   * @param {string} name The user visible name for the plugin.
   */
  constructor(name) {
    this.name = name;
  }

  /**
   * @param {!SDK.Script.Script} script
   * @return {boolean} True if this plugin should handle this script
   */
  handleScript(script) {
    throw new Error('Not implemented yet');
  }

  dispose() {
  }

  /** Notify the plugin about a new script
   * @param {string} rawModuleId
   * @param {string} symbolsURL - URL of a file providing the debug symbols for this module
   * @param {!RawModule} rawModule
   * @return {!Promise<!Array<string>>} - An array of URLs for the source files for the raw module
  */
  async addRawModule(rawModuleId, symbolsURL, rawModule) {
    throw new Error('Not implemented yet');
  }

  /** Find locations in raw modules from a location in a source file
   * @param {!SourceLocation} sourceLocation
   * @return {!Promise<!Array<!RawLocationRange>>}
  */
  async sourceLocationToRawLocation(sourceLocation) {
    throw new Error('Not implemented yet');
  }

  /** Find locations in source files from a location in a raw module
   * @param {!RawLocation} rawLocation
   * @return {!Promise<!Array<!SourceLocation>>}
  */
  async rawLocationToSourceLocation(rawLocation) {
    throw new Error('Not implemented yet');
  }

  /** Return detailed information about a scope
   * @param {string} type
   * @return {!Promise<!ScopeInfo>}
   */
  async getScopeInfo(type) {
    throw new Error('Not implemented yet');
  }

  /** List all variables in lexical scope at a given location in a raw module
   * @param {!RawLocation} rawLocation
   * @return {!Promise<!Array<!Variable>>}
  */
  async listVariablesInScope(rawLocation) {
    throw new Error('Not implemented yet');
  }

  /** Evaluate the content of a variable in a given lexical scope
   * @param {string} name
   * @param {!RawLocation} location
   * @return {!Promise<?EvaluatorModule>}
  */
  async evaluateVariable(name, location) {
    throw new Error('Not implemented yet');
  }

  /**
   * Notifies the plugin that a script is removed.
   * @param {string} rawModuleId
   * @return {!Promise<void>}
   */
  removeRawModule(rawModuleId) {
    throw new Error('Not implemented yet');
  }

  /**
   * @param {string} expression
   * @param {!RawLocation} context
   * @return {!Promise<?{typeInfos: !Array<!TypeInfo>, base: !EvalBase}>}
   */
  getTypeInfo(expression, context) {
    throw new Error('Not implemented yet');
  }

  /**
   * @param {string|!{base: !EvalBase, field: !Array<!FieldInfo>}} expressionOrField
   * @param {!RawLocation} context
   * @return {!Promise<?{js:string}>}
   */
  getFormatter(expressionOrField, context) {
    throw new Error('Not implemented yet');
  }


  /**
   * @param {!{base: !EvalBase, field: !Array<!FieldInfo>}} field
   * @return {!Promise<!{js:string}>}
   */
  getInspectableAddress(field) {
    throw new Error('Not implemented yet');
  }

  /** Find locations in source files from a location in a raw module
   * @param {!RawLocation} rawLocation
   * @return {!Promise<!{frames: !Array<!FunctionInfo>}>}
  */
  async getFunctionInfo(rawLocation) {
    throw new Error('Not implemented yet');
  }

  /** Find locations in raw modules corresponding to the inline function
   *  that rawLocation is in. Used for stepping out of an inline function.
   * @param {!RawLocation} rawLocation
   * @return {!Promise<!Array<!RawLocationRange>>}
  */
  async getInlinedFunctionRanges(rawLocation) {
    throw new Error('Not implemented yet');
  }

  /** Find locations in raw modules corresponding to inline functions
   *  called by the function or inline frame that rawLocation is in.
   *  Used for stepping over inline functions.
   * @param {!RawLocation} rawLocation
   * @return {!Promise<!Array<!RawLocationRange>>}
  */
  async getInlinedCalleesRanges(rawLocation) {
    throw new Error('Not implemented yet');
  }

  /**
   * @param {string} rawModuleId
   * @param {string} sourceFileURL
   * @return {!Promise<!Array<number>|undefined>}
   */
  async getMappedLines(rawModuleId, sourceFileURL) {
    throw new Error('Not implemented yet');
  }
}
