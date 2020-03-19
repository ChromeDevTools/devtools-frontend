/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
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

/* eslint-disable no-unused-vars */

// Blink Web Facing API

/**
 * @param {!Object} object
 * @param {!Function} callback
 */
Object.observe = function(object, callback) {};

/** @type {boolean} */
Event.prototype.isMetaOrCtrlForTest;

/** @type {string} */
Event.prototype.code;

/**
 * TODO(luoe): MouseEvent properties movementX and movementY from the
 * PointerLock API are not yet standard. Once they are included in
 * Closure Compiler, these custom externs can be removed.
 */
/** @type {number} */
MouseEvent.prototype.movementX;

/** @type {number} */
MouseEvent.prototype.movementY;

/**
 * @type {number}
 */
KeyboardEvent.DOM_KEY_LOCATION_NUMPAD;

/**
 * @param {!T} value
 * @param {boolean=} onlyFirst
 * @this {Array.<T>}
 * @template T
 */
Array.prototype.remove = function(value, onlyFirst) {};
/**
 * @return {!Object.<string, boolean>}
 * @this {Array.<T>}
 * @template T
 */
Array.prototype.keySet = function() {};
/**
 * @param {!S} object
 * @param {function(!S,!T):number=} comparator
 * @param {number=} left
 * @param {number=} right
 * @return {number}
 * @this {Array.<T>}
 * @template S
 */
Array.prototype.lowerBound = function(object, comparator, left, right) {};
/**
 * @param {!S} object
 * @param {function(!S,!T):number=} comparator
 * @param {number=} left
 * @param {number=} right
 * @return {number}
 * @this {Array.<T>}
 * @template S
 */
Array.prototype.upperBound = function(object, comparator, left, right) {};
/**
 * @param {!S} value
 * @param {function(!S,!T):number} comparator
 * @return {number}
 * @this {Array.<T>}
 * @template S
 */
Array.prototype.binaryIndexOf = function(value, comparator) {};
/**
 * @param {function(number, number): number} comparator
 * @param {number} leftBound
 * @param {number} rightBound
 * @param {number} sortWindowLeft
 * @param {number} sortWindowRight
 * @return {!Array.<number>}
 * @this {Array.<number>}
 */
Array.prototype.sortRange = function(comparator, leftBound, rightBound, sortWindowLeft, sortWindowRight) {};

/**
 * @this {Array.<number>}
 * @param {function(number,number):boolean} comparator
 * @param {number} left
 * @param {number} right
 * @param {number} pivotIndex
 * @return {number}
 */
Array.prototype.partition = function(comparator, left, right, pivotIndex) {};

/**
 * @param {string} field
 * @return {!Array.<!T>}
 * @this {Array.<!Object.<string,T>>}
 * @template T
 */
Array.prototype.select = function(field) {};

/**
 * @return {!T|undefined}
 * @this {Array.<T>}
 * @template T
 */
Array.prototype.peekLast = function() {};

/**
 * @param {!Array.<T>} array
 * @param {function(T,T):number} comparator
 * @return {!Array.<T>}
 * @this {!Array.<T>}
 * @template T
 */
Array.prototype.intersectOrdered = function(array, comparator) {};

/**
 * @param {!Array.<T>} array
 * @param {function(T,T):number} comparator
 * @return {!Array.<T>}
 * @this {!Array.<T>}
 * @template T
 */
Array.prototype.mergeOrdered = function(array, comparator) {};

/**
 * @param {number} object
 * @param {function(number, number):number=} comparator
 * @param {number=} left
 * @param {number=} right
 * @return {number}
 */
Int32Array.prototype.lowerBound = function(object, comparator, left, right) {};

// TODO(luoe): remove these BigInt and ArrayLike types once closure supports them.
/**
 * @param {number|string} value
 */
const BigInt = function(value) {};

/** @typedef {*} */
const bigint = null;

/** @typedef {Array|NodeList|Arguments|{length: number}} */
let ArrayLike;

/**
 * @type {*}
 */
window.domAutomationController;

const DevToolsHost = function() {};

/** @typedef {{type:string, id:(number|undefined),
              label:(string|undefined), enabled:(boolean|undefined), checked:(boolean|undefined),
              subItems:(!Array.<!DevToolsHost.ContextMenuDescriptor>|undefined)}} */
DevToolsHost.ContextMenuDescriptor;

/**
 * @return {number}
 */
DevToolsHost.zoomFactor = function() {};

/**
 * @param {string} text
 */
DevToolsHost.copyText = function(text) {};

/**
 * @return {string}
 */
DevToolsHost.platform = function() {};

/**
 * @param {number} x
 * @param {number} y
 * @param {!Array.<!DevToolsHost.ContextMenuDescriptor>} items
 * @param {!Document} document
 */
DevToolsHost.showContextMenuAtPoint = function(x, y, items, document) {};

/**
 * @param {string} message
 */
DevToolsHost.sendMessageToEmbedder = function(message) {};

/**
 * @return {string}
 */
DevToolsHost.getSelectionBackgroundColor = function() {};

/**
 * @return {string}
 */
DevToolsHost.getSelectionForegroundColor = function() {};

/**
 * @return {string}
 */
DevToolsHost.getInactiveSelectionBackgroundColor = function() {};

/**
 * @return {string}
 */
DevToolsHost.getInactiveSelectionForegroundColor = function() {};

/**
 * @return {boolean}
 */
DevToolsHost.isHostedMode = function() {};

/**
 * @param {string} fileSystemId
 * @param {string} registeredName
 * @return {?FileSystem}
 */
DevToolsHost.isolatedFileSystem = function(fileSystemId, registeredName) {};

/**
 * @param {!FileSystem} fileSystem
 */
DevToolsHost.upgradeDraggedFileSystemPermissions = function(fileSystem) {};

/** Extensions API */

/** @constructor */
function EventSink() {
}
/** @constructor */
function ExtensionSidebarPane() {
}
/** @constructor */
function Panel() {
}
/** @constructor */
function PanelWithSidebar() {
}
/** @constructor */
function Resource() {
}

let extensionServer;

/**
 * @constructor
 */
function ExtensionDescriptor() {
  this.startPage = '';
  this.name = '';
  this.exposeExperimentalAPIs = false;
}

/**
 * @constructor
 */
function ExtensionReloadOptions() {
  this.ignoreCache = false;
  this.injectedScript = '';
  this.userAgent = '';
}

const Adb = {};
/** @typedef {{id: string, name: string, url: string, attached: boolean}} */
Adb.Page;
/** @typedef {{id: string, adbBrowserChromeVersion: string, compatibleVersion: boolean, adbBrowserName: string, source: string, adbBrowserVersion: string, pages: !Array<!Adb.Page>}} */
Adb.Browser;
/** @typedef {{id: string, adbModel: string, adbSerial: string, browsers: !Array.<!Adb.Browser>, adbPortStatus: !Array.<number>, adbConnected: boolean}} */
Adb.Device;
/** @typedef {!Object.<string, string>} */
Adb.PortForwardingConfig;
/** @typedef {!{port: string, address: string}} */
Adb.PortForwardingRule;
/** @typedef {{ports: !Object<string, number>, browserId: string}} */
Adb.DevicePortForwardingStatus;
/** @typedef {!Object<string, !Adb.DevicePortForwardingStatus>} */
Adb.PortForwardingStatus;
/** @typedef {!Array<string>} */
Adb.NetworkDiscoveryConfig;
/**
 * @typedef {!{
 *   discoverUsbDevices: boolean,
 *   portForwardingEnabled: boolean,
 *   portForwardingConfig: !Adb.PortForwardingConfig,
 *   networkDiscoveryEnabled: boolean,
 *   networkDiscoveryConfig: !Adb.NetworkDiscoveryConfig
 * }}
 */
Adb.Config;

/** @const */
const module = {};

/**
 * @constructor
 */
function diff_match_patch() {
}

diff_match_patch.prototype = {
  /**
   * @param {string} text1
   * @param {string} text2
   * @return {!Array.<!{0: number, 1: string}>}
   */
  diff_main: function(text1, text2) {},

  /**
   * @param {!Array.<!{0: number, 1: string}>} diff
   */
  diff_cleanupSemantic(diff) {}
};

/** @constructor */
const Doc = function() {};
Doc.prototype = {
  /** @type {number} */
  scrollLeft: 0,
  /** @type {number} */
  scrollTop: 0
};

/** @constructor */
const CodeMirror = function(element, config) {};
CodeMirror.on = function(obj, type, handler) {};
CodeMirror.prototype = {
  /** @type {!Doc} */
  doc: null,
  addKeyMap: function(map) {},
  addLineClass: function(handle, where, cls) {},
  /**
   * @param {?Object=} options
   * @return {!CodeMirror.LineWidget}
   */
  addLineWidget: function(handle, node, options) {},
  /**
   * @param {string|!Object} spec
   * @param {!Object=} options
   */
  addOverlay: function(spec, options) {},
  addWidget: function(pos, node, scroll, vert, horiz) {},
  /** @param {boolean=} isClosed bv */
  changeGeneration: function(isClosed) {},
  charCoords: function(pos, mode) {},
  clearGutter: function(gutterID) {},
  clearHistory: function() {},
  clipPos: function(pos) {},
  /** @param {string=} mode */
  coordsChar: function(coords, mode) {},
  /** @param {string=} mode */
  cursorCoords: function(start, mode) {},
  defaultCharWidth: function() {},
  defaultTextHeight: function() {},
  deleteH: function(dir, unit) {},
  /**
   * @param {*=} to
   * @param {*=} op
   */
  eachLine: function(from, to, op) {},
  execCommand: function(cmd) {},
  extendSelection: function(from, to) {},
  findMarks: function(from, to) {},
  findMarksAt: function(pos) {},
  /**
   * @param {!CodeMirror.Pos} from
   * @param {boolean=} strict
   * @param {Object=} config
   */
  findMatchingBracket: function(from, strict, config) {},
  findPosH: function(from, amount, unit, visually) {},
  findPosV: function(from, amount, unit, goalColumn) {},
  firstLine: function() {},
  focus: function() {},
  getAllMarks: function() {},
  /** @param {string=} start */
  getCursor: function(start) {},
  getDoc: function() {},
  getGutterElement: function() {},
  getHistory: function() {},
  getInputField: function() {},
  getLine: function(line) {},
  /**
   * @return {!{wrapClass: string, height: number}}
   */
  getLineHandle: function(line) {},
  getLineNumber: function(line) {},
  /**
   * @return {!{token: function(CodeMirror.StringStream, Object):string}}
   */
  getMode: function() {},
  getOption: function(option) {},
  /** @param {*=} lineSep */
  getRange: function(from, to, lineSep) {},
  /**
   * @return {!{left: number, top: number, width: number, height: number, clientWidth: number, clientHeight: number}}
   */
  getScrollInfo: function() {},
  getScrollerElement: function() {},
  getSelection: function() {},
  getSelections: function() {},
  getStateAfter: function(line) {},
  getTokenAt: function(pos) {},
  /** @param {*=} lineSep */
  getValue: function(lineSep) {},
  getViewport: function() {},
  getWrapperElement: function() {},
  hasFocus: function() {},
  historySize: function() {},
  indentLine: function(n, dir, aggressive) {},
  indentSelection: function(how) {},
  indexFromPos: function(coords) {},
  /** @param {number=} generation */
  isClean: function(generation) {},
  iterLinkedDocs: function(f) {},
  lastLine: function() {},
  lineCount: function() {},
  lineInfo: function(line) {},
  /**
   * @param {number} height
   * @param {string=} mode
   */
  lineAtHeight: function(height, mode) {},
  linkedDoc: function(options) {},
  listSelections: function() {},
  markClean: function() {},
  markText: function(from, to, options) {},
  moveH: function(dir, unit) {},
  moveV: function(dir, unit) {},
  off: function(type, f) {},
  on: function(type, f) {},
  operation: function(f) {},
  posFromIndex: function(off) {},
  redo: function() {},
  refresh: function() {},
  removeKeyMap: function(map) {},
  removeLine: function(line) {},
  removeLineClass: function(handle, where, cls) {},
  removeLineWidget: function(widget) {},
  removeOverlay: function(spec) {},
  /** @param {*=} origin */
  replaceRange: function(code, from, to, origin) {},
  /**
   * @param {string} replacement
   * @param {string=} select
   */
  replaceSelection: function(replacement, select) {},
  /**
   * @param {!Array.<string>} textPerSelection
   */
  replaceSelections: function(textPerSelection) {},
  /** @param {*=} margin */
  scrollIntoView: function(pos, margin) {},
  scrollTo: function(x, y) {},
  setBookmark: function(pos, options) {},
  setCursor: function(line, ch, extend) {},
  setExtending: function(val) {},
  setGutterMarker: function(line, gutterID, value) {},
  setHistory: function(histData) {},
  setLine: function(line, text) {},
  setOption: function(option, value) {},
  setSelection: function(anchor, head, options) {},
  /**
   * @param {number=} primaryIndex
   * @param {?Object=} config
   */
  setSelections: function(selections, primaryIndex, config) {},
  setSize: function(width, height) {},
  setValue: function(code) {},
  somethingSelected: function() {},
  swapDoc: function(doc) {},
  undo: function() {},
  unlinkDoc: function(other) {}
};
/** @type {!{cursorDiv: Element, lineSpace: Element, gutters: Element}} */
CodeMirror.prototype.display;
/** @type {!{devtoolsAccessibleName: string, mode: string, lineWrapping: boolean}} */
CodeMirror.prototype.options;
/** @type {!Object} */
CodeMirror.Pass;
CodeMirror.showHint = function(codeMirror, hintintFunction) {};
CodeMirror.commands = {};
CodeMirror.modes = {};
CodeMirror.mimeModes = {};
CodeMirror.getMode = function(options, spec) {};
CodeMirror.overlayMode = function(mode1, mode2, squashSpans) {};
CodeMirror.defineMode = function(modeName, modeConstructor) {};
CodeMirror.startState = function(mode) {};
CodeMirror.copyState = function(mode, state) {};
CodeMirror.inputStyles = {};
CodeMirror.inputStyles.textarea = class {
  constructor() {
    /** @type {!HTMLTextAreaElement} */
    this.textarea;
    this.prevInput = '';
    this.composing = false;
    this.contextMenuPending = false;
    /** @type {!CodeMirror} */
    this.cm;
  }
  /**
   * @param {!Object} display
   */
  init(display) {
  }

  /**
   * @param {boolean=} typing
   */
  reset(typing) {
  }

  /**
   * @return {boolean}
   */
  poll() {
    return false;
  }
};

/** @typedef {{canceled: boolean, from: !CodeMirror.Pos, to: !CodeMirror.Pos, text: string, origin: string, cancel: function()}} */
CodeMirror.BeforeChangeObject;

/** @typedef {{from: !CodeMirror.Pos, to: !CodeMirror.Pos, origin: string, text: !Array.<string>, removed: !Array.<string>}} */
CodeMirror.ChangeObject;

/** @constructor */
CodeMirror.Pos = function(line, ch) {};
/** @type {number} */
CodeMirror.Pos.prototype.line;
/** @type {number} */
CodeMirror.Pos.prototype.ch;

/**
 * @param {!CodeMirror.Pos} pos1
 * @param {!CodeMirror.Pos} pos2
 * @return {number}
 */
CodeMirror.cmpPos = function(pos1, pos2) {};

/** @constructor */
CodeMirror.StringStream = function(line) {
  this.pos = 0;
  this.start = 0;
};
CodeMirror.StringStream.prototype = {
  backUp: function(n) {},
  column: function() {},
  current: function() {},
  eat: function(match) {},
  eatSpace: function() {},
  eatWhile: function(match) {},
  eol: function() {},
  indentation: function() {},
  /**
   * @param {!RegExp|string} pattern
   * @param {boolean=} consume
   * @param {boolean=} caseInsensitive
   */
  match: function(pattern, consume, caseInsensitive) {},
  next: function() {},
  peek: function() {},
  skipTo: function(ch) {},
  skipToEnd: function() {},
  sol: function() {}
};

/** @constructor */
CodeMirror.TextMarker = function(doc, type) {};
CodeMirror.TextMarker.prototype = {
  clear: function() {},
  find: function() {},
  changed: function() {}
};

/** @constructor */
CodeMirror.LineWidget = function() {};
CodeMirror.LineWidget.prototype = {
  clear: function() {}
};

/** @type {Object.<string, !Object.<string, string>>} */
CodeMirror.keyMap;

/** @type {{scrollLeft: number, scrollTop: number}} */
CodeMirror.doc;

/**
 * @param {string} mime
 * @param {string} mode
 */
CodeMirror.defineMIME = function(mime, mode) {};

/** @type {boolean} */
window.dispatchStandaloneTestRunnerMessages;

const acorn = {
  /**
   * @param {string} text
   * @param {Object.<string, boolean>} options
   * @return {!ESTree.Node}
   */
  parse: function(text, options) {},

  /**
   * @param {string} text
   * @param {Object.<string, boolean>} options
   * @return {!Acorn.Tokenizer}
   */
  tokenizer: function(text, options) {},

  tokTypes: {
    _true: new Acorn.TokenType(),
    _false: new Acorn.TokenType(),
    _null: new Acorn.TokenType(),
    num: new Acorn.TokenType(),
    regexp: new Acorn.TokenType(),
    string: new Acorn.TokenType(),
    name: new Acorn.TokenType(),
    eof: new Acorn.TokenType()
  }
};

acorn.loose = {};

/**
 * @param {string} text
 * @param {Object.<string, boolean>} options
 * @return {!ESTree.Node}
 */
acorn.loose.parse = function(text, options) {};

const Acorn = {};
/**
 * @constructor
 */
Acorn.Tokenizer = function() {
  /** @type {function():!Acorn.Token} */
  this.getToken;
};

/**
 * @constructor
 */
Acorn.TokenType = function() {
  /** @type {string} */
  this.label;
  /** @type {(string|undefined)} */
  this.keyword;
};

/**
 * @typedef {{type: !Acorn.TokenType, value: string, start: number, end: number}}
 */
Acorn.Token;

/**
 * @typedef {{type: string, value: string, start: number, end: number}}
 */
Acorn.Comment;

/**
 * @typedef {(!Acorn.Token|!Acorn.Comment)}
 */
Acorn.TokenOrComment;

const dagre = {};
dagre.graphlib = {};
/**
 * @constructor
 */
dagre.graphlib.Graph = function() {};

dagre.graphlib.json = {};

/**
 * @param {string} graphData
 * @return {!dagre.graphlib.Graph}
 */
dagre.graphlib.json.read = function(graphData) {};

/**
 * @param {!dagre.graphlib.Graph} graph
 * @return {string}
 */
dagre.graphlib.json.write = function(graph) {};

/**
 * @param {!dagre.graphlib.Graph} graph
 * @param {?Object=} options
 */
dagre.layout = function(graph, options) {};
// Since the object types in JSDoc should use capitalized `Dagre`, dagre is renamed as Dagre below.
// Note that `var Dagre={}` will be added in dagre_module.js, so to prevent variable redefinition,
// the workaround is to name the module+folder as `dagre_layout`. This workaround is similar to
// `cm` and `CodeMirror`.
const Dagre = dagre;

const ESTree = {};

/**
 * @constructor
 */
ESTree.Node = function() {
  /** @type {number} */
  this.start;
  /** @type {number} */
  this.end;
  /** @type {string} */
  this.type;
  /** @type {(!ESTree.Node|undefined)} */
  this.key;
  /** @type {(!ESTree.Node|undefined)} */
  this.body;
  /** @type {(!Array.<!ESTree.Node>|undefined)} */
  this.declarations;
  /** @type {(!Array.<!ESTree.Node>|undefined)} */
  this.properties;
  /** @type {(!ESTree.Node|undefined)} */
  this.init;
  /** @type {(!Array.<!ESTree.Node>|undefined)} */
  this.params;
  /** @type {(string|undefined)} */
  this.name;
  /** @type {(?ESTree.Node|undefined)} */
  this.id;
  /** @type {(number|undefined)} */
  this.length;
  /** @type {(?ESTree.Node|undefined)} */
  this.argument;
  /** @type {(string|undefined)} */
  this.operator;
  /** @type {(!ESTree.Node|undefined)} */
  this.right;
  /** @type {(!ESTree.Node|undefined)} */
  this.left;
  /** @type {(string|undefined)} */
  this.kind;
  /** @type {(!ESTree.Node|undefined)} */
  this.property;
  /** @type {(!ESTree.Node|undefined)} */
  this.object;
  /** @type {(string|undefined)} */
  this.raw;
  /** @type {(boolean|undefined)} */
  this.computed;
};

/**
 * @extends {ESTree.Node}
 * @constructor
 */
ESTree.TemplateLiteralNode = function() {
  /** @type {!Array.<!ESTree.Node>} */
  this.quasis;
  /** @type {!Array.<!ESTree.Node>} */
  this.expressions;
};

/**
 * @type {string}
 * @see http://heycam.github.io/webidl/#es-DOMException-prototype-object
 * TODO(jsbell): DOMException should be a subclass of Error.
 */
DOMException.prototype.message;
/** @type {number} */
DOMException.ABORT_ERR;

/**
 * @constructor
 * @param {!Object} params
 */
const Terminal = function(params) {};

Terminal.prototype = {
  fit: function() {},
  linkify: function() {},
  /** @param {!Element} element */
  open: function(element) {},
  /** @param {string} eventName * @param {!Function} handler */
  on: function(eventName, handler) {}
};

/**
 * @param {string} context
 * @return {!Console}
 */
Console.prototype.context = function(context) {};

// Globally defined functions

/**
 * @param {!Array<string>|string} strings
 * @param {...*} vararg
 * @return {string}
 */
const ls = function(strings, vararg) {};

/**
* @param {string} tagName
* @param {string=} customElementType
* @return {!Element}
*/
const createElement = function(tagName, customElementType) {};

/**
 * @param {number|string} data
 * @return {!Text}
 */
const createTextNode = function(data) {};

/**
 * @param {string} elementName
 * @param {string=} className
 * @param {string=} customElementType
 * @return {!Element}
 */
const createElementWithClass = function(elementName, className, customElementType) {};

/**
 * @param {string} childType
 * @param {string=} className
 * @return {!Element}
 */
const createSVGElement = function(childType, className) {};

/**
 * @return {!DocumentFragment}
 */
const createDocumentFragment = function() {};

/**
 * @param {!Event} event
 * @return {boolean}
 */
const isEnterKey = function(event) {};

/**
 * @param {!Event} event
 * @return {boolean}
 */
const isEnterOrSpaceKey = function(event) {};

/**
 * @param {!Event} event
 * @return {boolean}
 */
const isEscKey = function(event) {};

/**
 * @param {!{startPage: string, name: string, exposeExperimentalAPIs: boolean}} extensionInfo
 * @param {string} inspectedTabId
 * @param {string} themeName
 * @param {!Array<number>} keysToForward
 * @param {function(!Object, !Object)|undefined} testHook
 * @return {string}
 */
const buildExtensionAPIInjectedScript = function(extensionInfo, inspectedTabId, themeName, keysToForward, testHook) {};

/**
 * @param {number} m
 * @param {number} n
 * @return {number}
 */
const mod = function(m, n) {};

/**
 * @param {string} query
 * @param {boolean} caseSensitive
 * @param {boolean} isRegex
 * @return {!RegExp}
 */
const createSearchRegex = function(query, caseSensitive, isRegex) {};

/**
 * @param {string} query
 * @param {string=} flags
 * @return {!RegExp}
 */
const createPlainTextSearchRegex = function(query, flags) {};

/**
 * @param {number} spacesCount
 * @return {string}
 */
const spacesPadding = function(spacesCount) {};

/**
 * @param {number} value
 * @param {number} symbolsCount
 * @return {string}
 */
const numberToStringWithSpacesPadding = function(value, symbolsCount) {};

/**
 * @param {*} value
 */
const suppressUnused = function(value) {};

/**
 * TODO: move into its own module
 * @param {function()} callback
 */
const runOnWindowLoad = function(callback) {};

/**
 * @template T
 * @param {function(new:T, ...)} constructorFunction
 * @return {!T}
 */
const singleton = function(constructorFunction) {};

/**
 * @param {?string} content
 * @return {number}
 */
const base64ToSize = function(content) {};

/**
 * @param {?string} input
 * @return {string}
 */
const unescapeCssString = function(input) {};

/**
 * @constructor
 * @param {function(!Array<*>)} callback
 */
const ResizeObserver = function(callback) {};


// Lighthouse Report Renderer

/**
 * @constructor
 * @param {!Document} document
 */
const DOM = function(document) {};

/**
 * @constructor
 * @param {!DOM} dom
 */
const ReportRenderer = function(dom) {};

ReportRenderer.prototype = {
  /**
   * @param {!ReportRenderer.ReportJSON} report
   * @param {!Element} container Parent element to render the report into.
   */
  renderReport: function(report, container) {},

  /**
   * @param {!Document|!Element} context
   */
  setTemplateContext: function(context) {},

};

/**
 * @constructor
 * @param {!DOM} dom
 */
const ReportUIFeatures = function(dom) {
  /** @type {!ReportRenderer.ReportJSON} */
  this.json;

  /** @type {!Document} */
  this._document;
};

ReportUIFeatures.prototype = {
  /**
   * @param {!Document|!Element} context
   */
  setTemplateContext: function(context) {},

  /**
   * @param {!ReportRenderer.ReportJSON} report
   */
  initFeatures: function(report) {},

  _resetUIState: function() {},
};

/**
 * @typedef {{
 *     rawValue: (number|boolean|undefined),
 *     id: string,
 *     title: string,
 *     description: string,
 *     explanation: (string|undefined),
 *     errorMessage: (string|undefined),
 *     displayValue: (string|Array<string|number>|undefined),
 *     scoreDisplayMode: string,
 *     error: boolean,
 *     score: (number|null),
 *     details: (!DetailsRenderer.DetailsJSON|undefined),
 * }}
 */
ReportRenderer.AuditResultJSON;

/**
 * @typedef {{
 *     id: string,
 *     score: (number|null),
 *     weight: number,
 *     group: (string|undefined),
 *     result: ReportRenderer.AuditResultJSON
 * }}
 */
ReportRenderer.AuditJSON;

/**
 * @typedef {{
 *     title: string,
 *     id: string,
 *     score: (number|null),
 *     description: (string|undefined),
 *     manualDescription: string,
 *     auditRefs: !Array<!ReportRenderer.AuditJSON>
 * }}
 */
ReportRenderer.CategoryJSON;

/**
 * @typedef {{
 *     title: string,
 *     description: (string|undefined),
 * }}
 */
ReportRenderer.GroupJSON;

/**
 * @typedef {{
 *     lighthouseVersion: string,
 *     userAgent: string,
 *     fetchTime: string,
 *     timing: {total: number},
 *     requestedUrl: string,
 *     finalUrl: string,
 *     runWarnings: (!Array<string>|undefined),
 *     artifacts: {traces: {defaultPass: {traceEvents: !Array}}},
 *     audits: !Object<string, !ReportRenderer.AuditResultJSON>,
 *     categories: !Object<string, !ReportRenderer.CategoryJSON>,
 *     categoryGroups: !Object<string, !ReportRenderer.GroupJSON>,
 * }}
 */
ReportRenderer.ReportJSON;

/**
 * @typedef {{
 *     traces: {defaultPass: {traceEvents: !Array}},
 * }}
 */
ReportRenderer.RunnerResultArtifacts;

/**
 * @typedef {{
 *     lhr: !ReportRenderer.ReportJSON,
 *     artifacts: ReportRenderer.RunnerResultArtifacts,
 *     report: string,
 *     stack: string
 * }}
 */
ReportRenderer.RunnerResult;


/**
 * @constructor
 * @param {!DOM} dom
 * @param {!DetailsRenderer} detailsRenderer
 */
const CategoryRenderer = function(dom, detailsRenderer) {};


/**
 * @constructor
 * @param {!DOM} dom
 */
const DetailsRenderer = function(dom) {};

DetailsRenderer.prototype = {
  /**
   * @param {!DetailsRenderer.NodeDetailsJSON} item
   * @return {!Element}
   */
  renderNode: function(item) {},
};

/**
 * @typedef {{
 *     type: string,
 *     value: (string|number|undefined),
 *     summary: (DetailsRenderer.OpportunitySummary|undefined),
 *     granularity: (number|undefined),
 *     displayUnit: (string|undefined)
 * }}
 */
DetailsRenderer.DetailsJSON;

/**
 * @typedef {{
 *     type: string,
 *     path: (string|undefined),
 *     selector: (string|undefined),
 *     snippet:(string|undefined)
 * }}
 */
DetailsRenderer.NodeDetailsJSON;

/**
 * @typedef {{
 *     sourceUrl: (string|undefined),
 *     sourceLine: (string|undefined),
 *     sourceColumn: (string|undefined),
 * }}
 */
DetailsRenderer.SourceLocationDetailsJSON;

/** @typedef {{
 *     wastedMs: (number|undefined),
 *     wastedBytes: (number|undefined),
 * }}
 */
DetailsRenderer.OpportunitySummary;

const LighthouseReportGenerator = class {
  /**
   * @param {!ReportRenderer.ReportJSON} lhr
   * @return {string}
   */
  generateReportHtml(lhr) {
    return '';
  }
};

/** @interface */
class InspectorFrontendHostAPI {
  /**
   * @param {string=} type
   */
  addFileSystem(type) {
  }

  loadCompleted() {
  }

  /**
   * @param {number} requestId
   * @param {string} fileSystemPath
   * @param {string} excludedFolders
   */
  indexPath(requestId, fileSystemPath, excludedFolders) {
  }

  /**
   * Requests inspected page to be placed atop of the inspector frontend with specified bounds.
   * @param {{x: number, y: number, width: number, height: number}} bounds
   */
  setInspectedPageBounds(bounds) {
  }

  /**
   * @param {!Array<string>} certChain
   */
  showCertificateViewer(certChain) {
  }

  /**
   * @param {string} shortcuts
   */
  setWhitelistedShortcuts(shortcuts) {
  }

  /**
   * @param {boolean} active
   */
  setEyeDropperActive(active) {
  }

  inspectElementCompleted() {
  }

  /**
   * @param {string} url
   */
  openInNewTab(url) {
  }

  /**
   * @param {string} fileSystemPath
   */
  showItemInFolder(fileSystemPath) {
  }

  /**
   * @param {string} fileSystemPath
   */
  removeFileSystem(fileSystemPath) {
  }

  requestFileSystems() {
  }

  /**
   * @param {string} url
   * @param {string} content
   * @param {boolean} forceSaveAs
   */
  save(url, content, forceSaveAs) {
  }

  /**
   * @param {string} url
   * @param {string} content
   */
  append(url, content) {
  }

  /**
   * @param {string} url
   */
  close(url) {
  }

  /**
   * @param {number} requestId
   * @param {string} fileSystemPath
   * @param {string} query
   */
  searchInPath(requestId, fileSystemPath, query) {
  }

  /**
   * @param {number} requestId
   */
  stopIndexing(requestId) {
  }

  bringToFront() {
  }

  closeWindow() {
  }

  copyText(text) {
  }

  /**
   * @param {string} url
   */
  inspectedURLChanged(url) {
  }

  /**
   * @param {string} fileSystemId
   * @param {string} registeredName
   * @return {?FileSystem}
   */
  isolatedFileSystem(fileSystemId, registeredName) {
  }

  /**
   * @param {string} url
   * @param {string} headers
   * @param {number} streamId
   * @param {function(!InspectorFrontendHostAPI.LoadNetworkResourceResult)} callback
   */
  loadNetworkResource(url, headers, streamId, callback) {
  }

  /**
   * @param {function(!Object<string, string>)} callback
   */
  getPreferences(callback) {
  }

  /**
   * @param {string} name
   * @param {string} value
   */
  setPreference(name, value) {
  }

  /**
   * @param {string} name
   */
  removePreference(name) {
  }

  clearPreferences() {
  }

  /**
   * @param {!FileSystem} fileSystem
   */
  upgradeDraggedFileSystemPermissions(fileSystem) {
  }

  /**
   * @return {string}
   */
  platform() {
  }

  /**
   * @param {string} actionName
   * @param {number} actionCode
   * @param {number} bucketSize
   */
  recordEnumeratedHistogram(actionName, actionCode, bucketSize) {
  }

  /**
   * @param {string} histogramName
   * @param {number} duration
   */
  recordPerformanceHistogram(histogramName, duration) {
  }

  /**
   * @param {string} umaName
   */
  recordUserMetricsAction(umaName) {
  }

  /**
   * @param {string} message
   */
  sendMessageToBackend(message) {
  }

  /**
   * @param {!Adb.Config} config
   */
  setDevicesDiscoveryConfig(config) {
  }

  /**
   * @param {boolean} enabled
   */
  setDevicesUpdatesEnabled(enabled) {
  }

  /**
   * @param {string} pageId
   * @param {string} action
   */
  performActionOnRemotePage(pageId, action) {
  }

  /**
   * @param {string} browserId
   * @param {string} url
   */
  openRemotePage(browserId, url) {
  }

  openNodeFrontend() {
  }

  /**
   * @param {string} origin
   * @param {string} script
   */
  setInjectedScriptForOrigin(origin, script) {
  }

  /**
   * @param {boolean} isDocked
   * @param {function()} callback
   */
  setIsDocked(isDocked, callback) {
  }

  /**
   * @return {number}
   */
  zoomFactor() {
  }

  zoomIn() {
  }

  zoomOut() {
  }

  resetZoom() {
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {!Array.<!InspectorFrontendHostAPI.ContextMenuDescriptor>} items
   * @param {!Document} document
   */
  showContextMenuAtPoint(x, y, items, document) {
  }

  /**
   * @param {function()} callback
   */
  reattach(callback) {
  }

  readyForTest() {
  }

  connectionReady() {
  }

  /**
   * @param {boolean} value
   */
  setOpenNewWindowForPopups(value) {
  }

  /**
   * @return {boolean}
   */
  isHostedMode() {
  }

  /**
   * @param {function(!ExtensionDescriptor)} callback
   */
  setAddExtensionCallback(callback) {
  }
}

/** @typedef
{{
    type: string,
    id: (number|undefined),
    label: (string|undefined),
    enabled: (boolean|undefined),
    checked: (boolean|undefined),
    subItems: (!Array.<!InspectorFrontendHostAPI.ContextMenuDescriptor>|undefined)
}} */
InspectorFrontendHostAPI.ContextMenuDescriptor;

/** @typedef
{{
    statusCode: number,
    headers: (!Object.<string, string>|undefined),
    netError: (number|undefined),
    netErrorName: (string|undefined),
    urlValid: (boolean|undefined),
    messageOverride: (string|undefined)
}} */
InspectorFrontendHostAPI.LoadNetworkResourceResult;

/**
 * @interface
 */
class ServicePort {
  /**
   * @param {function(string)} messageHandler
   * @param {function(string)} closeHandler
   */
  setHandlers(messageHandler, closeHandler) {
  }

  /**
   * @param {string} message
   * @return {!Promise<boolean>}
   */
  send(message) {
  }

  /**
   * @return {!Promise<boolean>}
   */
  close() {
  }
}

const fabric = {};
