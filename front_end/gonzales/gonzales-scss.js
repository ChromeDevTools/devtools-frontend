(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["gonzales"] = factory();
	else
		root["gonzales"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Node = __webpack_require__(1);
	var parse = __webpack_require__(7);

	module.exports = {
	  createNode: function createNode(options) {
	    return new Node(options);
	  },
	  parse: parse
	};

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/**
	 * @param {string} type
	 * @param {array|string} content
	 * @param {number} line
	 * @param {number} column
	 * @constructor
	 */

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var Node = function () {
	  function Node(options) {
	    _classCallCheck(this, Node);

	    this.type = options.type;
	    this.content = options.content;
	    this.syntax = options.syntax;

	    if (options.start) this.start = options.start;
	    if (options.end) this.end = options.end;
	  }

	  /**
	   * @param {String} type Node type
	   * @return {Boolean} Whether there is a child node of given type
	   */


	  Node.prototype.contains = function contains(type) {
	    return this.content.some(function (node) {
	      return node.type === type;
	    });
	  };

	  /**
	   * @param {String} type Node type
	   * @param {Function} callback Function to call for every found node
	   */


	  Node.prototype.eachFor = function eachFor(type, callback) {
	    if (!Array.isArray(this.content)) return;

	    if (typeof type !== 'string') {
	      callback = type;
	      type = null;
	    }

	    var l = this.content.length;
	    var breakLoop;

	    for (var i = l; i--;) {
	      if (breakLoop === null) break;

	      if (!type || this.content[i] && this.content[i].type === type) breakLoop = callback(this.content[i], i, this);
	    }

	    if (breakLoop === null) return null;
	  };

	  /**
	   * @param {String} type
	   * @return {?Node} First child node or `null` if nothing's been found.
	   */


	  Node.prototype.first = function first(type) {
	    if (!Array.isArray(this.content)) return null;

	    if (!type) return this.content[0];

	    var i = 0;
	    var l = this.content.length;

	    for (; i < l; i++) {
	      if (this.content[i].type === type) return this.content[i];
	    }

	    return null;
	  };

	  /**
	   * @param {String} type Node type
	   * @param {Function} callback Function to call for every found node
	   */


	  Node.prototype.forEach = function forEach(type, callback) {
	    if (!Array.isArray(this.content)) return;

	    if (typeof type !== 'string') {
	      callback = type;
	      type = null;
	    }

	    var i = 0;
	    var l = this.content.length;
	    var breakLoop;

	    for (; i < l; i++) {
	      if (breakLoop === null) break;

	      if (!type || this.content[i] && this.content[i].type === type) breakLoop = callback(this.content[i], i, this);
	    }

	    if (breakLoop === null) return null;
	  };

	  /**
	   * @param {Number} index
	   * @return {?Node}
	   */


	  Node.prototype.get = function get(index) {
	    if (!Array.isArray(this.content)) return null;

	    var node = this.content[index];
	    return node ? node : null;
	  };

	  /**
	   * @param {Number} index
	   * @param {Node} node
	   */


	  Node.prototype.insert = function insert(index, node) {
	    if (!Array.isArray(this.content)) return;

	    this.content.splice(index, 0, node);
	  };

	  /**
	   * @param {String} type
	   * @return {Boolean} Whether the node is of given type
	   */


	  Node.prototype.is = function is(type) {
	    return this.type === type;
	  };

	  /**
	   * @param {String} type
	   * @return {?Node} Last child node or `null` if nothing's been found.
	   */


	  Node.prototype.last = function last(type) {
	    if (!Array.isArray(this.content)) return null;

	    var i = this.content.length;
	    if (!type) return this.content[i - 1];

	    for (; i--;) {
	      if (this.content[i].type === type) return this.content[i];
	    }

	    return null;
	  };

	  /**
	   * Number of child nodes.
	   * @type {number}
	   */


	  /**
	   * @param {Number} index
	   * @return {Node}
	   */
	  Node.prototype.removeChild = function removeChild(index) {
	    if (!Array.isArray(this.content)) return;

	    var removedChild = this.content.splice(index, 1);

	    return removedChild;
	  };

	  Node.prototype.toJson = function toJson() {
	    return JSON.stringify(this, false, 2);
	  };

	  Node.prototype.toString = function toString() {
	    var stringify = void 0;

	    try {
	      stringify = __webpack_require__(2)("./" + this.syntax + '/stringify');
	    } catch (e) {
	      var message = 'Syntax "' + this.syntax + '" is not supported yet, sorry';
	      return console.error(message);
	    }

	    return stringify(this);
	  };

	  /**
	   * @param {Function} callback
	   */


	  Node.prototype.traverse = function traverse(callback, index) {
	    var level = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
	    var parent = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

	    var breakLoop;
	    var x;

	    level++;

	    callback(this, index, parent, level);

	    if (!Array.isArray(this.content)) return;

	    for (var i = 0, l = this.content.length; i < l; i++) {
	      breakLoop = this.content[i].traverse(callback, i, level, this);
	      if (breakLoop === null) break;

	      // If some nodes were removed or added:
	      if (x = this.content.length - l) {
	        l += x;
	        i += x;
	      }
	    }

	    if (breakLoop === null) return null;
	  };

	  Node.prototype.traverseByType = function traverseByType(type, callback) {
	    this.traverse(function (node) {
	      if (node.type === type) callback.apply(node, arguments);
	    });
	  };

	  Node.prototype.traverseByTypes = function traverseByTypes(types, callback) {
	    this.traverse(function (node) {
	      if (types.indexOf(node.type) !== -1) callback.apply(node, arguments);
	    });
	  };

	  _createClass(Node, [{
	    key: 'length',
	    get: function get() {
	      if (!Array.isArray(this.content)) return 0;
	      return this.content.length;
	    }
	  }]);

	  return Node;
	}();

	module.exports = Node;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var map = {
		"./css/stringify": 3,
		"./less/stringify": 4,
		"./sass/stringify": 5,
		"./scss/stringify": 6
	};
	function webpackContext(req) {
		return __webpack_require__(webpackContextResolve(req));
	};
	function webpackContextResolve(req) {
		return map[req] || (function() { throw new Error("Cannot find module '" + req + "'.") }());
	};
	webpackContext.keys = function webpackContextKeys() {
		return Object.keys(map);
	};
	webpackContext.resolve = webpackContextResolve;
	module.exports = webpackContext;
	webpackContext.id = 2;


/***/ },
/* 3 */
/***/ function(module, exports) {

	'use strict';

	module.exports = function stringify(tree) {
	  // TODO: Better error message
	  if (!tree) throw new Error('We need tree to translate');

	  function _t(tree) {
	    var type = tree.type;
	    if (_unique[type]) return _unique[type](tree);
	    if (typeof tree.content === 'string') return tree.content;
	    if (Array.isArray(tree.content)) return _composite(tree.content);
	    return '';
	  }

	  function _composite(t, i) {
	    if (!t) return '';

	    var s = '';
	    i = i || 0;
	    for (; i < t.length; i++) {
	      s += _t(t[i]);
	    }return s;
	  }

	  var _unique = {
	    'arguments': function _arguments(t) {
	      return '(' + _composite(t.content) + ')';
	    },
	    'atkeyword': function atkeyword(t) {
	      return '@' + _composite(t.content);
	    },
	    'attributeSelector': function attributeSelector(t) {
	      return '[' + _composite(t.content) + ']';
	    },
	    'block': function block(t) {
	      return '{' + _composite(t.content) + '}';
	    },
	    'brackets': function brackets(t) {
	      return '[' + _composite(t.content) + ']';
	    },
	    'class': function _class(t) {
	      return '.' + _composite(t.content);
	    },
	    'color': function color(t) {
	      return '#' + t.content;
	    },
	    'expression': function expression(t) {
	      return 'expression(' + t.content + ')';
	    },
	    'id': function id(t) {
	      return '#' + _composite(t.content);
	    },
	    'multilineComment': function multilineComment(t) {
	      return '/*' + t.content + '*/';
	    },
	    'nthSelector': function nthSelector(t) {
	      return ':' + _t(t.content[0]) + '(' + _composite(t.content.slice(1)) + ')';
	    },
	    'parentheses': function parentheses(t) {
	      return '(' + _composite(t.content) + ')';
	    },
	    'percentage': function percentage(t) {
	      return _composite(t.content) + '%';
	    },
	    'pseudoClass': function pseudoClass(t) {
	      return ':' + _composite(t.content);
	    },
	    'pseudoElement': function pseudoElement(t) {
	      return '::' + _composite(t.content);
	    },
	    'universalSelector': function universalSelector(t) {
	      return _composite(t.content) + '*';
	    },
	    'uri': function uri(t) {
	      return 'url(' + _composite(t.content) + ')';
	    }
	  };

	  return _t(tree);
	};

/***/ },
/* 4 */
/***/ function(module, exports) {

	'use strict';

	module.exports = function stringify(tree) {
	  // TODO: Better error message
	  if (!tree) throw new Error('We need tree to translate');

	  function _t(tree) {
	    var type = tree.type;
	    if (_unique[type]) return _unique[type](tree);
	    if (typeof tree.content === 'string') return tree.content;
	    if (Array.isArray(tree.content)) return _composite(tree.content);
	    return '';
	  }

	  function _composite(t, i) {
	    if (!t) return '';

	    var s = '';
	    i = i || 0;
	    for (; i < t.length; i++) {
	      s += _t(t[i]);
	    }return s;
	  }

	  var _unique = {
	    'arguments': function _arguments(t) {
	      return '(' + _composite(t.content) + ')';
	    },
	    'atkeyword': function atkeyword(t) {
	      return '@' + _composite(t.content);
	    },
	    'attributeSelector': function attributeSelector(t) {
	      return '[' + _composite(t.content) + ']';
	    },
	    'block': function block(t) {
	      return '{' + _composite(t.content) + '}';
	    },
	    'brackets': function brackets(t) {
	      return '[' + _composite(t.content) + ']';
	    },
	    'class': function _class(t) {
	      return '.' + _composite(t.content);
	    },
	    'color': function color(t) {
	      return '#' + t.content;
	    },
	    'escapedString': function escapedString(t) {
	      return '~' + t.content;
	    },
	    'expression': function expression(t) {
	      return 'expression(' + t.content + ')';
	    },
	    'id': function id(t) {
	      return '#' + _composite(t.content);
	    },
	    'interpolatedVariable': function interpolatedVariable(t) {
	      return '@{' + _composite(t.content) + '}';
	    },
	    'multilineComment': function multilineComment(t) {
	      return '/*' + t.content + '*/';
	    },
	    'nthSelector': function nthSelector(t) {
	      return ':' + _t(t.content[0]) + '(' + _composite(t.content.slice(1)) + ')';
	    },
	    'parentheses': function parentheses(t) {
	      return '(' + _composite(t.content) + ')';
	    },
	    'percentage': function percentage(t) {
	      return _composite(t.content) + '%';
	    },
	    'pseudoClass': function pseudoClass(t) {
	      return ':' + _composite(t.content);
	    },
	    'pseudoElement': function pseudoElement(t) {
	      return '::' + _composite(t.content);
	    },
	    'singlelineComment': function singlelineComment(t) {
	      return '/' + '/' + t.content;
	    },
	    'universalSelector': function universalSelector(t) {
	      return _composite(t.content) + '*';
	    },
	    'uri': function uri(t) {
	      return 'url(' + _composite(t.content) + ')';
	    },
	    'variable': function variable(t) {
	      return '@' + _composite(t.content);
	    },
	    'variablesList': function variablesList(t) {
	      return _composite(t.content) + '...';
	    }
	  };

	  return _t(tree);
	};

/***/ },
/* 5 */
/***/ function(module, exports) {

	'use strict';

	module.exports = function stringify(tree) {
	  // TODO: Better error message
	  if (!tree) throw new Error('We need tree to translate');

	  function _t(tree) {
	    var type = tree.type;
	    if (_unique[type]) return _unique[type](tree);
	    if (typeof tree.content === 'string') return tree.content;
	    if (Array.isArray(tree.content)) return _composite(tree.content);
	    return '';
	  }

	  function _composite(t, i) {
	    if (!t) return '';

	    var s = '';
	    i = i || 0;
	    for (; i < t.length; i++) {
	      s += _t(t[i]);
	    }return s;
	  }

	  var _unique = {
	    'arguments': function _arguments(t) {
	      return '(' + _composite(t.content) + ')';
	    },
	    'atkeyword': function atkeyword(t) {
	      return '@' + _composite(t.content);
	    },
	    'attributeSelector': function attributeSelector(t) {
	      return '[' + _composite(t.content) + ']';
	    },
	    'block': function block(t) {
	      return _composite(t.content);
	    },
	    'brackets': function brackets(t) {
	      return '[' + _composite(t.content) + ']';
	    },
	    'class': function _class(t) {
	      return '.' + _composite(t.content);
	    },
	    'color': function color(t) {
	      return '#' + t.content;
	    },
	    'expression': function expression(t) {
	      return 'expression(' + t.content + ')';
	    },
	    'id': function id(t) {
	      return '#' + _composite(t.content);
	    },
	    'interpolation': function interpolation(t) {
	      return '#{' + _composite(t.content) + '}';
	    },
	    'multilineComment': function multilineComment(t) {
	      var lines = t.content.split('\n');
	      var close = '';

	      if (lines.length > 1) {
	        var lastLine = lines[lines.length - 1];
	        if (lastLine.length < t.end.column) {
	          close = '*/';
	        }
	      } else if (t.content.length + 4 === t.end.column - t.start.column + 1) {
	        close = '*/';
	      }

	      return '/*' + t.content + close;
	    },
	    'nthSelector': function nthSelector(t) {
	      return ':' + _t(t.content[0]) + '(' + _composite(t.content.slice(1)) + ')';
	    },
	    'parentheses': function parentheses(t) {
	      return '(' + _composite(t.content) + ')';
	    },
	    'percentage': function percentage(t) {
	      return _composite(t.content) + '%';
	    },
	    'placeholder': function placeholder(t) {
	      return '%' + _composite(t.content);
	    },
	    'pseudoClass': function pseudoClass(t) {
	      return ':' + _composite(t.content);
	    },
	    'pseudoElement': function pseudoElement(t) {
	      return '::' + _composite(t.content);
	    },
	    'singlelineComment': function singlelineComment(t) {
	      return '/' + '/' + t.content;
	    },
	    'universalSelector': function universalSelector(t) {
	      return _composite(t.content) + '*';
	    },
	    'uri': function uri(t) {
	      return 'url(' + _composite(t.content) + ')';
	    },
	    'variable': function variable(t) {
	      return '$' + _composite(t.content);
	    },
	    'variablesList': function variablesList(t) {
	      return _composite(t.content) + '...';
	    }
	  };

	  return _t(tree);
	};

/***/ },
/* 6 */
/***/ function(module, exports) {

	'use strict';

	module.exports = function stringify(tree) {
	  // TODO: Better error message
	  if (!tree) throw new Error('We need tree to translate');

	  function _t(tree) {
	    var type = tree.type;
	    if (_unique[type]) return _unique[type](tree);
	    if (typeof tree.content === 'string') return tree.content;
	    if (Array.isArray(tree.content)) return _composite(tree.content);
	    return '';
	  }

	  function _composite(t, i) {
	    if (!t) return '';

	    var s = '';
	    i = i || 0;
	    for (; i < t.length; i++) {
	      s += _t(t[i]);
	    }return s;
	  }

	  var _unique = {
	    'arguments': function _arguments(t) {
	      return '(' + _composite(t.content) + ')';
	    },
	    'atkeyword': function atkeyword(t) {
	      return '@' + _composite(t.content);
	    },
	    'attributeSelector': function attributeSelector(t) {
	      return '[' + _composite(t.content) + ']';
	    },
	    'block': function block(t) {
	      return '{' + _composite(t.content) + '}';
	    },
	    'brackets': function brackets(t) {
	      return '[' + _composite(t.content) + ']';
	    },
	    'class': function _class(t) {
	      return '.' + _composite(t.content);
	    },
	    'color': function color(t) {
	      return '#' + t.content;
	    },
	    'expression': function expression(t) {
	      return 'expression(' + t.content + ')';
	    },
	    'id': function id(t) {
	      return '#' + _composite(t.content);
	    },
	    'interpolation': function interpolation(t) {
	      return '#{' + _composite(t.content) + '}';
	    },
	    'multilineComment': function multilineComment(t) {
	      return '/*' + t.content + '*/';
	    },
	    'nthSelector': function nthSelector(t) {
	      return ':' + _t(t.content[0]) + '(' + _composite(t.content.slice(1)) + ')';
	    },
	    'parentheses': function parentheses(t) {
	      return '(' + _composite(t.content) + ')';
	    },
	    'percentage': function percentage(t) {
	      return _composite(t.content) + '%';
	    },
	    'placeholder': function placeholder(t) {
	      return '%' + _composite(t.content);
	    },
	    'pseudoClass': function pseudoClass(t) {
	      return ':' + _composite(t.content);
	    },
	    'pseudoElement': function pseudoElement(t) {
	      return '::' + _composite(t.content);
	    },
	    'singlelineComment': function singlelineComment(t) {
	      return '/' + '/' + t.content;
	    },
	    'universalSelector': function universalSelector(t) {
	      return _composite(t.content) + '*';
	    },
	    'uri': function uri(t) {
	      return 'url(' + _composite(t.content) + ')';
	    },
	    'variable': function variable(t) {
	      return '$' + _composite(t.content);
	    },
	    'variablesList': function variablesList(t) {
	      return _composite(t.content) + '...';
	    }
	  };

	  return _t(tree);
	};

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var ParsingError = __webpack_require__(8);
	var syntaxes = __webpack_require__(10);

	var isInteger = Number.isInteger || function (value) {
	  return typeof value === 'number' && Math.floor(value) === value;
	};

	/**
	 * @param {String} css
	 * @param {Object} options
	 * @return {Object} AST
	 */
	function parser(css, options) {
	  if (typeof css !== 'string') throw new Error('Please, pass a string to parse');else if (!css) return __webpack_require__(21)();

	  var syntax = options && options.syntax || 'css';
	  var context = options && options.context || 'stylesheet';
	  var tabSize = options && options.tabSize;
	  if (!isInteger(tabSize) || tabSize < 1) tabSize = 1;

	  var syntaxParser = syntaxes[syntax];

	  if (!syntaxParser) {
	    var message = 'Syntax "' + syntax + '" is not supported yet, sorry';
	    return console.error(message);
	  }

	  var getTokens = syntaxParser.tokenizer;
	  var mark = syntaxParser.mark;
	  var parse = syntaxParser.parse;

	  var tokens = getTokens(css, tabSize);
	  mark(tokens);

	  var ast;
	  try {
	    ast = parse(tokens, context);
	  } catch (e) {
	    if (!e.syntax) throw e;
	    throw new ParsingError(e, css);
	  }

	  return ast;
	}

	module.exports = parser;

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var parserPackage = __webpack_require__(9);

	/**
	 * @param {Error} e
	 * @param {String} css
	 */
	function ParsingError(e, css) {
	  this.line = e.line;
	  this.syntax = e.syntax;
	  this.css_ = css;
	}

	ParsingError.prototype = {
	  /**
	   * @type {String}
	   * @private
	   */
	  customMessage_: '',

	  /**
	   * @type {Number}
	   */
	  line: null,

	  /**
	   * @type {String}
	   */
	  name: 'Parsing error',

	  /**
	   * @type {String}
	   */
	  syntax: null,

	  /**
	   * @type {String}
	   */
	  version: parserPackage.version,

	  /**
	   * @type {String}
	   */
	  get context() {
	    var LINES_AROUND = 2;

	    var result = [];
	    var currentLineNumber = this.line;
	    var start = currentLineNumber - 1 - LINES_AROUND;
	    var end = currentLineNumber + LINES_AROUND;
	    var lines = this.css_.split(/\r\n|\r|\n/);

	    for (var i = start; i < end; i++) {
	      var line = lines[i];
	      if (!line) continue;
	      var ln = i + 1;
	      var mark = ln === currentLineNumber ? '*' : ' ';
	      result.push(ln + mark + '| ' + line);
	    }

	    return result.join('\n');
	  },

	  /**
	   * @type {String}
	   */
	  get message() {
	    if (this.customMessage_) {
	      return this.customMessage_;
	    } else {
	      var message = 'Please check validity of the block';
	      if (typeof this.line === 'number') message += ' starting from line #' + this.line;
	      return message;
	    }
	  },

	  set message(message) {
	    this.customMessage_ = message;
	  },

	  /**
	   * @return {String}
	   */
	  toString: function toString() {
	    return [this.name + ': ' + this.message, '', this.context, '', 'Syntax: ' + this.syntax, 'Gonzales PE version: ' + this.version].join('\n');
	  }
	};

	module.exports = ParsingError;

/***/ },
/* 9 */
/***/ function(module, exports) {

	module.exports = {
		"name": "gonzales-pe",
		"description": "Gonzales Preprocessor Edition (fast CSS parser)",
		"version": "4.0.3",
		"homepage": "http://github.com/tonyganch/gonzales-pe",
		"bugs": "http://github.com/tonyganch/gonzales-pe/issues",
		"license": "MIT",
		"author": {
			"name": "Tony Ganch",
			"email": "tonyganch+github@gmail.com",
			"url": "http://tonyganch.com"
		},
		"main": "./lib/gonzales",
		"repository": {
			"type": "git",
			"url": "http://github.com/tonyganch/gonzales-pe.git"
		},
		"scripts": {
			"autofix-tests": "bash ./scripts/build.sh && bash ./scripts/autofix-tests.sh",
			"build": "bash ./scripts/build.sh",
			"init": "bash ./scripts/init.sh",
			"lint": "bash ./scripts/lint.sh",
			"log": "bash ./scripts/log.sh",
			"prepublish": "bash ./scripts/prepublish.sh",
			"postpublish": "bash ./scripts/postpublish.sh",
			"test": "bash ./scripts/test.sh",
			"watch": "bash ./scripts/watch.sh"
		},
		"bin": {
			"gonzales": "./bin/gonzales.js"
		},
		"dependencies": {
			"minimist": "1.1.x"
		},
		"devDependencies": {
			"babel-core": "^6.18.2",
			"babel-loader": "^6.2.7",
			"babel-plugin-add-module-exports": "^0.2.1",
			"babel-preset-es2015": "^6.18.0",
			"coffee-script": "~1.7.1",
			"eslint": "^3.0.0",
			"jscs": "2.1.0",
			"jshint": "2.8.0",
			"json-loader": "^0.5.3",
			"mocha": "2.2.x",
			"webpack": "^1.12.2",
			"webpack-closure-compiler": "^2.0.2"
		},
		"engines": {
			"node": ">=0.6.0"
		}
	};

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = {
	  css: __webpack_require__(11),
	  scss: __webpack_require__(17)
	};

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;
	exports.default = {
	  mark: __webpack_require__(12),
	  parse: __webpack_require__(14),
	  stringify: __webpack_require__(3),
	  tokenizer: __webpack_require__(16)
	};
	module.exports = exports['default'];

/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var TokenType = __webpack_require__(13);

	/**
	 * Mark whitespaces and comments
	 * @param {Array} tokens
	 */
	function markSpacesAndComments(tokens) {
	  var tokensLength = tokens.length;
	  var spaces = [-1, -1];
	  var type; // Current token's type

	  // For every token in the token list, mark spaces and line breaks
	  // as spaces (set both `ws` and `sc` flags). Mark multiline comments
	  // with `sc` flag.
	  // If there are several spaces or tabs or line breaks or multiline
	  // comments in a row, group them: take the last one's index number
	  // and save it to the first token in the group as a reference:
	  // e.g., `ws_last = 7` for a group of whitespaces or `sc_last = 9`
	  // for a group of whitespaces and comments.
	  for (var i = 0; i < tokensLength; i++) {
	    type = tokens[i].type;

	    if (type === TokenType.Space || type === TokenType.Tab || type === TokenType.Newline) {
	      markSpace(tokens, i, spaces);
	    } else if (type === TokenType.CommentML) {
	      markComment(tokens, i, spaces);
	    } else {
	      markEndOfSpacesAndComments(tokens, i, spaces);
	    }
	  }

	  markEndOfSpacesAndComments(tokens, i, spaces);
	}

	function markSpace(tokens, i, spaces) {
	  var token = tokens[i];
	  token.ws = true;
	  token.sc = true;

	  if (spaces[0] === -1) spaces[0] = i;
	  if (spaces[1] === -1) spaces[1] = i;
	}

	function markComment(tokens, i, spaces) {
	  var ws = spaces[0];
	  tokens[i].sc = true;

	  if (ws !== -1) {
	    tokens[ws].ws_last = i - 1;
	    spaces[0] = -1;
	  }
	}

	function markEndOfSpacesAndComments(tokens, i, spaces) {
	  var ws = spaces[0];
	  var sc = spaces[1];
	  if (ws !== -1) {
	    tokens[ws].ws_last = i - 1;
	    spaces[0] = -1;
	  }
	  if (sc !== -1) {
	    tokens[sc].sc_last = i - 1;
	    spaces[1] = -1;
	  }
	}

	/**
	 * Pair brackets
	 * @param {Array} tokens
	 */
	function markBrackets(tokens) {
	  var tokensLength = tokens.length;
	  var ps = []; // Parentheses
	  var sbs = []; // Square brackets
	  var cbs = []; // Curly brackets
	  var t = void 0; // Current token

	  // For every token in the token list, if we meet an opening (left)
	  // bracket, push its index number to a corresponding array.
	  // If we then meet a closing (right) bracket, look at the corresponding
	  // array. If there are any elements (records about previously met
	  // left brackets), take a token of the last left bracket (take
	  // the last index number from the array and find a token with
	  // this index number) and save right bracket's index as a reference:
	  for (var i = 0; i < tokensLength; i++) {
	    t = tokens[i];
	    var type = t.type;

	    if (type === TokenType.LeftParenthesis) {
	      ps.push(i);
	    } else if (type === TokenType.RightParenthesis) {
	      if (ps.length) {
	        t.left = ps.pop();
	        tokens[t.left].right = i;
	      }
	    } else if (type === TokenType.LeftSquareBracket) {
	      sbs.push(i);
	    } else if (type === TokenType.RightSquareBracket) {
	      if (sbs.length) {
	        t.left = sbs.pop();
	        tokens[t.left].right = i;
	      }
	    } else if (type === TokenType.LeftCurlyBracket) {
	      cbs.push(i);
	    } else if (type === TokenType.RightCurlyBracket) {
	      if (cbs.length) {
	        t.left = cbs.pop();
	        tokens[t.left].right = i;
	      }
	    }
	  }
	}

	/**
	 * @param {Array} tokens
	 */
	function markTokens(tokens) {
	  // Mark paired brackets:
	  markBrackets(tokens);
	  // Mark whitespaces and comments:
	  markSpacesAndComments(tokens);
	}

	module.exports = markTokens;

/***/ },
/* 13 */
/***/ function(module, exports) {

	// jscs:disable

	'use strict';

	module.exports = {
	    StringSQ: 'StringSQ',
	    StringDQ: 'StringDQ',
	    CommentML: 'CommentML',
	    CommentSL: 'CommentSL',

	    Newline: 'Newline',
	    Space: 'Space',
	    Tab: 'Tab',

	    ExclamationMark: 'ExclamationMark', // !
	    QuotationMark: 'QuotationMark', // "
	    NumberSign: 'NumberSign', // #
	    DollarSign: 'DollarSign', // $
	    PercentSign: 'PercentSign', // %
	    Ampersand: 'Ampersand', // &
	    Apostrophe: 'Apostrophe', // '
	    LeftParenthesis: 'LeftParenthesis', // (
	    RightParenthesis: 'RightParenthesis', // )
	    Asterisk: 'Asterisk', // *
	    PlusSign: 'PlusSign', // +
	    Comma: 'Comma', // ,
	    HyphenMinus: 'HyphenMinus', // -
	    FullStop: 'FullStop', // .
	    Solidus: 'Solidus', // /
	    Colon: 'Colon', // :
	    Semicolon: 'Semicolon', // ;
	    LessThanSign: 'LessThanSign', // <
	    EqualsSign: 'EqualsSign', // =
	    EqualitySign: 'EqualitySign', // ==
	    InequalitySign: 'InequalitySign', // !=
	    GreaterThanSign: 'GreaterThanSign', // >
	    QuestionMark: 'QuestionMark', // ?
	    CommercialAt: 'CommercialAt', // @
	    LeftSquareBracket: 'LeftSquareBracket', // [
	    ReverseSolidus: 'ReverseSolidus', // \
	    RightSquareBracket: 'RightSquareBracket', // ]
	    CircumflexAccent: 'CircumflexAccent', // ^
	    LowLine: 'LowLine', // _
	    LeftCurlyBracket: 'LeftCurlyBracket', // {
	    VerticalLine: 'VerticalLine', // |
	    RightCurlyBracket: 'RightCurlyBracket', // }
	    Tilde: 'Tilde', // ~

	    Identifier: 'Identifier',
	    DecimalNumber: 'DecimalNumber'
	};

/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Node = __webpack_require__(1);
	var NodeType = __webpack_require__(15);
	var TokenType = __webpack_require__(13);

	/**
	 * @type {Array}
	 */
	var tokens;

	/**
	 * @type {Number}
	 */
	var tokensLength;

	/**
	 * @type {Number}
	 */
	var pos;

	var contexts = {
	  'atkeyword': function atkeyword() {
	    return checkAtkeyword(pos) && getAtkeyword();
	  },
	  'atrule': function atrule() {
	    return checkAtrule(pos) && getAtrule();
	  },
	  'block': function block() {
	    return checkBlock(pos) && getBlock();
	  },
	  'brackets': function brackets() {
	    return checkBrackets(pos) && getBrackets();
	  },
	  'class': function _class() {
	    return checkClass(pos) && getClass();
	  },
	  'combinator': function combinator() {
	    return checkCombinator(pos) && getCombinator();
	  },
	  'commentML': function commentML() {
	    return checkCommentML(pos) && getCommentML();
	  },
	  'declaration': function declaration() {
	    return checkDeclaration(pos) && getDeclaration();
	  },
	  'declDelim': function declDelim() {
	    return checkDeclDelim(pos) && getDeclDelim();
	  },
	  'delim': function delim() {
	    return checkDelim(pos) && getDelim();
	  },
	  'dimension': function dimension() {
	    return checkDimension(pos) && getDimension();
	  },
	  'expression': function expression() {
	    return checkExpression(pos) && getExpression();
	  },
	  'function': function _function() {
	    return checkFunction(pos) && getFunction();
	  },
	  'ident': function ident() {
	    return checkIdent(pos) && getIdent();
	  },
	  'important': function important() {
	    return checkImportant(pos) && getImportant();
	  },
	  'namespace': function namespace() {
	    return checkNamespace(pos) && getNamespace();
	  },
	  'number': function number() {
	    return checkNumber(pos) && getNumber();
	  },
	  'operator': function operator() {
	    return checkOperator(pos) && getOperator();
	  },
	  'parentheses': function parentheses() {
	    return checkParentheses(pos) && getParentheses();
	  },
	  'percentage': function percentage() {
	    return checkPercentage(pos) && getPercentage();
	  },
	  'progid': function progid() {
	    return checkProgid(pos) && getProgid();
	  },
	  'property': function property() {
	    return checkProperty(pos) && getProperty();
	  },
	  'propertyDelim': function propertyDelim() {
	    return checkPropertyDelim(pos) && getPropertyDelim();
	  },
	  'pseudoc': function pseudoc() {
	    return checkPseudoc(pos) && getPseudoc();
	  },
	  'pseudoe': function pseudoe() {
	    return checkPseudoe(pos) && getPseudoe();
	  },
	  'ruleset': function ruleset() {
	    return checkRuleset(pos) && getRuleset();
	  },
	  's': function s() {
	    return checkS(pos) && getS();
	  },
	  'selector': function selector() {
	    return checkSelector(pos) && getSelector();
	  },
	  'shash': function shash() {
	    return checkShash(pos) && getShash();
	  },
	  'string': function string() {
	    return checkString(pos) && getString();
	  },
	  'stylesheet': function stylesheet() {
	    return checkStylesheet(pos) && getStylesheet();
	  },
	  'unary': function unary() {
	    return checkUnary(pos) && getUnary();
	  },
	  'unicodeRange': function unicodeRange() {
	    return checkUnicodeRange(pos) && getUnicodeRange();
	  },
	  'universalSelector': function universalSelector() {
	    return checkUniversalSelector(pos) && getUniversalSelector();
	  },
	  'urange': function urange() {
	    return checkUrange(pos) && getUrange();
	  },
	  'uri': function uri() {
	    return checkUri(pos) && getUri();
	  },
	  'value': function value() {
	    return checkValue(pos) && getValue();
	  },
	  'vhash': function vhash() {
	    return checkVhash(pos) && getVhash();
	  }
	};

	/**
	 * Stop parsing and display error.
	 * @param {Number=} i Token's index number
	 */
	function throwError(i) {
	  var ln = tokens[i].ln;

	  throw { line: ln, syntax: 'css' };
	}

	/**
	 * @param {Object} exclude
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkExcluding(exclude, i) {
	  var start = i;

	  while (i < tokensLength) {
	    if (exclude[tokens[i++].type]) break;
	  }

	  return i - start - 2;
	}

	/**
	 * @param {Number} start
	 * @param {Number} finish
	 * @return {String}
	 */
	function joinValues(start, finish) {
	  var s = '';

	  for (var i = start; i < finish + 1; i++) {
	    s += tokens[i].value;
	  }

	  return s;
	}

	/**
	 * @param {Number} start
	 * @param {Number} num
	 * @return {String}
	 */
	function joinValues2(start, num) {
	  if (start + num - 1 >= tokensLength) return;

	  var s = '';

	  for (var i = 0; i < num; i++) {
	    s += tokens[start + i].value;
	  }

	  return s;
	}

	function getLastPosition(content, line, column, colOffset) {
	  return typeof content === 'string' ? getLastPositionForString(content, line, column, colOffset) : getLastPositionForArray(content, line, column, colOffset);
	}

	function getLastPositionForString(content, line, column, colOffset) {
	  var position = [];

	  if (!content) {
	    position = [line, column];
	    if (colOffset) position[1] += colOffset - 1;
	    return position;
	  }

	  var lastLinebreak = content.lastIndexOf('\n');
	  var endsWithLinebreak = lastLinebreak === content.length - 1;
	  var splitContent = content.split('\n');
	  var linebreaksCount = splitContent.length - 1;
	  var prevLinebreak = linebreaksCount === 0 || linebreaksCount === 1 ? -1 : content.length - splitContent[linebreaksCount - 1].length - 2;

	  // Line:
	  var offset = endsWithLinebreak ? linebreaksCount - 1 : linebreaksCount;
	  position[0] = line + offset;

	  // Column:
	  if (endsWithLinebreak) {
	    offset = prevLinebreak !== -1 ? content.length - prevLinebreak : content.length - 1;
	  } else {
	    offset = linebreaksCount !== 0 ? content.length - lastLinebreak - column - 1 : content.length - 1;
	  }
	  position[1] = column + offset;

	  if (!colOffset) return position;

	  if (endsWithLinebreak) {
	    position[0]++;
	    position[1] = colOffset;
	  } else {
	    position[1] += colOffset;
	  }

	  return position;
	}

	function getLastPositionForArray(content, line, column, colOffset) {
	  var position;

	  if (content.length === 0) {
	    position = [line, column];
	  } else {
	    var c = content[content.length - 1];
	    if (c.hasOwnProperty('end')) {
	      position = [c.end.line, c.end.column];
	    } else {
	      position = getLastPosition(c.content, line, column);
	    }
	  }

	  if (!colOffset) return position;

	  if (tokens[pos - 1] && tokens[pos - 1].type !== 'Newline') {
	    position[1] += colOffset;
	  } else {
	    position[0]++;
	    position[1] = 1;
	  }

	  return position;
	}

	function newNode(type, content, line, column, end) {
	  if (!end) end = getLastPosition(content, line, column);
	  return new Node({
	    type: type,
	    content: content,
	    start: {
	      line: line,
	      column: column
	    },
	    end: {
	      line: end[0],
	      column: end[1]
	    },
	    syntax: 'css'
	  });
	}

	/**
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkAny(i) {
	  var l;

	  if (l = checkBrackets(i)) tokens[i].any_child = 1;else if (l = checkParentheses(i)) tokens[i].any_child = 2;else if (l = checkString(i)) tokens[i].any_child = 3;else if (l = checkPercentage(i)) tokens[i].any_child = 4;else if (l = checkDimension(i)) tokens[i].any_child = 5;else if (l = checkUnicodeRange(i)) tokens[i].any_child = 13;else if (l = checkNumber(i)) tokens[i].any_child = 6;else if (l = checkUri(i)) tokens[i].any_child = 7;else if (l = checkExpression(i)) tokens[i].any_child = 8;else if (l = checkFunction(i)) tokens[i].any_child = 9;else if (l = checkIdent(i)) tokens[i].any_child = 10;else if (l = checkClass(i)) tokens[i].any_child = 11;else if (l = checkUnary(i)) tokens[i].any_child = 12;

	  return l;
	}

	/**
	 * @return {Node}
	 */
	function getAny() {
	  var childType = tokens[pos].any_child;

	  if (childType === 1) return getBrackets();else if (childType === 2) return getParentheses();else if (childType === 3) return getString();else if (childType === 4) return getPercentage();else if (childType === 5) return getDimension();else if (childType === 13) return getUnicodeRange();else if (childType === 6) return getNumber();else if (childType === 7) return getUri();else if (childType === 8) return getExpression();else if (childType === 9) return getFunction();else if (childType === 10) return getIdent();else if (childType === 11) return getClass();else if (childType === 12) return getUnary();
	}

	/**
	 * Check if token is part of an @-word (e.g. `@import`, `@include`)
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkAtkeyword(i) {
	  var l;

	  // Check that token is `@`:
	  if (i >= tokensLength || tokens[i++].type !== TokenType.CommercialAt) return 0;

	  return (l = checkIdent(i)) ? l + 1 : 0;
	}

	/**
	 * Get node with @-word
	 * @return {Node}
	 */
	function getAtkeyword() {
	  var type = NodeType.AtkeywordType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  pos++;

	  content.push(getIdent());

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is a part of an @-rule
	 * @param {Number} i Token's index number
	 * @return {Number} Length of @-rule
	 */
	function checkAtrule(i) {
	  var l;

	  if (i >= tokensLength) return 0;

	  // If token already has a record of being part of an @-rule,
	  // return the @-rule's length:
	  if (tokens[i].atrule_l !== undefined) return tokens[i].atrule_l;

	  // If token is part of an @-rule, save the rule's type to token.
	  // @keyframes:
	  if (l = checkKeyframesRule(i)) tokens[i].atrule_type = 4;
	  // @-rule with ruleset:
	  else if (l = checkAtruler(i)) tokens[i].atrule_type = 1;
	    // Block @-rule:
	    else if (l = checkAtruleb(i)) tokens[i].atrule_type = 2;
	      // Single-line @-rule:
	      else if (l = checkAtrules(i)) tokens[i].atrule_type = 3;else return 0;

	  // If token is part of an @-rule, save the rule's length to token:
	  tokens[i].atrule_l = l;

	  return l;
	}

	/**
	 * Get node with @-rule
	 * @return {Node}
	 */
	function getAtrule() {
	  switch (tokens[pos].atrule_type) {
	    case 1:
	      return getAtruler(); // @-rule with ruleset
	    case 2:
	      return getAtruleb(); // Block @-rule
	    case 3:
	      return getAtrules(); // Single-line @-rule
	    case 4:
	      return getKeyframesRule();
	  }
	}

	/**
	 * Check if token is part of a block @-rule
	 * @param {Number} i Token's index number
	 * @return {Number} Length of the @-rule
	 */
	function checkAtruleb(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkAtkeyword(i)) i += l;else return 0;

	  if (l = checkTsets(i)) i += l;

	  if (l = checkBlock(i)) i += l;else return 0;

	  return i - start;
	}

	/**
	 * Get node with a block @-rule
	 * @return {Node}
	 */
	function getAtruleb() {
	  var type = NodeType.AtruleType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [getAtkeyword()].concat(getTsets()).concat([getBlock()]);

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is part of an @-rule with ruleset
	 * @param {Number} i Token's index number
	 * @return {Number} Length of the @-rule
	 */
	function checkAtruler(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkAtkeyword(i)) i += l;else return 0;

	  if (l = checkTsets(i)) i += l;

	  if (i < tokensLength && tokens[i].type === TokenType.LeftCurlyBracket) i++;else return 0;

	  if (l = checkAtrulers(i)) i += l;

	  if (i < tokensLength && tokens[i].type === TokenType.RightCurlyBracket) i++;else return 0;

	  return i - start;
	}

	/**
	 * Get node with an @-rule with ruleset
	 * @return {Node}
	 */
	function getAtruler() {
	  var type = NodeType.AtruleType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [getAtkeyword()];

	  content = content.concat(getTsets());

	  content.push(getAtrulers());

	  return newNode(type, content, line, column);
	}

	/**
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkAtrulers(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkSC(i)) i += l;

	  while (i < tokensLength) {
	    if (l = checkSC(i)) tokens[i].atrulers_child = 1;else if (l = checkAtrule(i)) tokens[i].atrulers_child = 2;else if (l = checkRuleset(i)) tokens[i].atrulers_child = 3;else break;
	    i += l;
	  }

	  tokens[i].atrulers_end = 1;

	  if (l = checkSC(i)) i += l;

	  return i - start;
	}

	/**
	 * @return {Node}
	 */
	function getAtrulers() {
	  var type = NodeType.BlockType;
	  var token = tokens[pos++];
	  var line = token.ln;
	  var column = token.col;
	  var content = getSC();

	  while (!tokens[pos].atrulers_end) {
	    var childType = tokens[pos].atrulers_child;
	    if (childType === 1) content = content.concat(getSC());else if (childType === 2) content.push(getAtrule());else if (childType === 3) content.push(getRuleset());
	  }

	  content = content.concat(getSC());

	  var end = getLastPosition(content, line, column, 1);
	  pos++;

	  return newNode(type, content, line, column, end);
	}

	/**
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkAtrules(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkAtkeyword(i)) i += l;else return 0;

	  if (l = checkTsets(i)) i += l;

	  return i - start;
	}

	/**
	 * @return {Node}
	 */
	function getAtrules() {
	  var type = NodeType.AtruleType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [getAtkeyword()].concat(getTsets());

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is part of a block (e.g. `{...}`).
	 * @param {Number} i Token's index number
	 * @return {Number} Length of the block
	 */
	function checkBlock(i) {
	  return i < tokensLength && tokens[i].type === TokenType.LeftCurlyBracket ? tokens[i].right - i + 1 : 0;
	}

	/**
	 * Get node with a block
	 * @return {Node}
	 */
	function getBlock() {
	  var type = NodeType.BlockType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var end = tokens[pos++].right;
	  var content = [];

	  while (pos < end) {
	    if (checkBlockdecl(pos)) content = content.concat(getBlockdecl());else throwError(pos);
	  }

	  var end_ = getLastPosition(content, line, column, 1);
	  pos = end + 1;

	  return newNode(type, content, line, column, end_);
	}

	/**
	 * Check if token is part of a declaration (property-value pair)
	 * @param {Number} i Token's index number
	 * @return {Number} Length of the declaration
	 */
	function checkBlockdecl(i) {
	  var l;

	  if (i >= tokensLength) return 0;

	  if (l = checkBlockdecl1(i)) tokens[i].bd_type = 1;else if (l = checkBlockdecl2(i)) tokens[i].bd_type = 2;else if (l = checkBlockdecl3(i)) tokens[i].bd_type = 3;else if (l = checkBlockdecl4(i)) tokens[i].bd_type = 4;else return 0;

	  return l;
	}

	/**
	 * @return {Array}
	 */
	function getBlockdecl() {
	  switch (tokens[pos].bd_type) {
	    case 1:
	      return getBlockdecl1();
	    case 2:
	      return getBlockdecl2();
	    case 3:
	      return getBlockdecl3();
	    case 4:
	      return getBlockdecl4();
	  }
	}

	/**
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkBlockdecl1(i) {
	  var start = i;
	  var l = void 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkDeclaration(i)) tokens[i].bd_kind = 1;else if (l = checkAtrule(i)) tokens[i].bd_kind = 2;else return 0;

	  i += l;

	  if (l = checkSC(i)) i += l;

	  if (i < tokensLength && (l = checkDeclDelim(i))) i += l;else return 0;

	  if (l = checkSC(i)) i += l;else return 0;

	  return i - start;
	}

	/**
	 * @return {Array}
	 */
	function getBlockdecl1() {
	  var sc = getSC();
	  var x = void 0;

	  switch (tokens[pos].bd_kind) {
	    case 1:
	      x = getDeclaration();
	      break;
	    case 2:
	      x = getAtrule();
	      break;
	  }

	  return sc.concat([x]).concat(getSC()).concat([getDeclDelim()]).concat(getSC());
	}

	/**
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkBlockdecl2(i) {
	  var start = i;
	  var l = void 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkDeclaration(i)) tokens[i].bd_kind = 1;else if (l = checkAtrule(i)) tokens[i].bd_kind = 2;else return 0;

	  i += l;

	  if (l = checkSC(i)) i += l;

	  return i - start;
	}

	/**
	 * @return {Array}
	 */
	function getBlockdecl2() {
	  var sc = getSC();
	  var x = void 0;

	  switch (tokens[pos].bd_kind) {
	    case 1:
	      x = getDeclaration();
	      break;
	    case 2:
	      x = getAtrule();
	      break;
	  }

	  return sc.concat([x]).concat(getSC());
	}

	/**
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkBlockdecl3(i) {
	  var start = i;
	  var l = void 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkDeclDelim(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  return i - start;
	}

	/**
	 * @return {Array}
	 */
	function getBlockdecl3() {
	  return getSC().concat([getDeclDelim()]).concat(getSC());
	}

	/**
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkBlockdecl4(i) {
	  return checkSC(i);
	}

	/**
	 * @return {Array}
	 */
	function getBlockdecl4() {
	  return getSC();
	}

	/**
	 * Check if token is part of text inside square brackets, e.g. `[1]`
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkBrackets(i) {
	  if (i >= tokensLength) return 0;

	  var start = i;

	  if (tokens[i].type === TokenType.LeftSquareBracket) i++;else return 0;

	  if (i < tokens[start].right) {
	    var l = checkTsets(i);
	    if (l) i += l;else return 0;
	  }

	  i++;

	  return i - start;
	}

	/**
	 * Get node with text inside square brackets, e.g. `[1]`
	 * @return {Node}
	 */
	function getBrackets() {
	  var type = NodeType.BracketsType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;

	  var tsets = [];
	  var right = token.right;

	  pos++;

	  if (pos < right) {
	    tsets = getTsets();
	  }

	  var end = getLastPosition(tsets, line, column, 1);
	  pos++;

	  return newNode(type, tsets, line, column, end);
	}

	/**
	 * Check if token is part of a class selector (e.g. `.abc`)
	 * @param {Number} i Token's index number
	 * @return {Number} Length of the class selector
	 */
	function checkClass(i) {
	  var l;

	  if (i >= tokensLength) return 0;

	  if (tokens[i].class_l) return tokens[i].class_l;

	  if (tokens[i++].type === TokenType.FullStop && (l = checkIdent(i))) {
	    tokens[i].class_l = l + 1;
	    return l + 1;
	  }

	  return 0;
	}

	/**
	 * Get node with a class selector
	 * @return {Node}
	 */
	function getClass() {
	  var type = NodeType.ClassType;
	  var token = tokens[pos++];
	  var line = token.ln;
	  var column = token.col;
	  var content = [getIdent()];

	  return newNode(type, content, line, column);
	}

	function checkCombinator(i) {
	  if (i >= tokensLength) return 0;

	  var l = void 0;
	  if (l = checkCombinator1(i)) tokens[i].combinatorType = 1;else if (l = checkCombinator2(i)) tokens[i].combinatorType = 2;else if (l = checkCombinator3(i)) tokens[i].combinatorType = 3;

	  return l;
	}

	function getCombinator() {
	  var type = tokens[pos].combinatorType;
	  if (type === 1) return getCombinator1();
	  if (type === 2) return getCombinator2();
	  if (type === 3) return getCombinator3();
	}
	/**
	 * (1) `||`
	 */
	function checkCombinator1(i) {
	  if (tokens[i].type === TokenType.VerticalLine && tokens[i + 1].type === TokenType.VerticalLine) return 2;else return 0;
	}

	function getCombinator1() {
	  var type = NodeType.CombinatorType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = '||';

	  pos += 2;
	  return newNode(type, content, line, column);
	}

	/**
	 * (1) `>`
	 * (2) `+`
	 * (3) `~`
	 */
	function checkCombinator2(i) {
	  var type = tokens[i].type;
	  if (type === TokenType.PlusSign || type === TokenType.GreaterThanSign || type === TokenType.Tilde) return 1;else return 0;
	}

	function getCombinator2() {
	  var type = NodeType.CombinatorType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = tokens[pos++].value;

	  return newNode(type, content, line, column);
	}

	/**
	 * (1) `/panda/`
	 */
	function checkCombinator3(i) {
	  var start = i;

	  if (tokens[i].type === TokenType.Solidus) i++;else return 0;

	  var l = void 0;
	  if (l = checkIdent(i)) i += l;else return 0;

	  if (tokens[i].type === TokenType.Solidus) i++;else return 0;

	  return i - start;
	}

	function getCombinator3() {
	  var type = NodeType.CombinatorType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;

	  // Skip `/`.
	  pos++;
	  var ident = getIdent();

	  // Skip `/`.
	  pos++;

	  var content = '/' + ident.content + '/';

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is a multiline comment.
	 * @param {Number} i Token's index number
	 * @return {Number} `1` if token is a multiline comment, otherwise `0`
	 */
	function checkCommentML(i) {
	  return i < tokensLength && tokens[i].type === TokenType.CommentML ? 1 : 0;
	}

	/**
	 * Get node with a multiline comment
	 * @return {Node}
	 */
	function getCommentML() {
	  var type = NodeType.CommentMLType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = tokens[pos].value.substring(2);
	  var l = content.length;

	  if (content.charAt(l - 2) === '*' && content.charAt(l - 1) === '/') content = content.substring(0, l - 2);

	  var end = getLastPosition(content, line, column, 2);
	  if (end[0] === line) end[1] += 2;
	  pos++;

	  return newNode(type, content, line, column, end);
	}

	/**
	 * Check if token is part of a declaration (property-value pair)
	 * @param {Number} i Token's index number
	 * @return {Number} Length of the declaration
	 */
	function checkDeclaration(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkProperty(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkPropertyDelim(i)) i++;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkValue(i)) i += l;else return 0;

	  return i - start;
	}

	/**
	 * Get node with a declaration
	 * @return {Node}
	 */
	function getDeclaration() {
	  var type = NodeType.DeclarationType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;

	  var content = [getProperty()].concat(getSC()).concat([getPropertyDelim()]).concat(getSC()).concat([getValue()]);

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is a semicolon
	 * @param {Number} i Token's index number
	 * @return {Number} `1` if token is a semicolon, otherwise `0`
	 */
	function checkDeclDelim(i) {
	  return i < tokensLength && tokens[i].type === TokenType.Semicolon ? 1 : 0;
	}

	/**
	 * Get node with a semicolon
	 * @return {Node}
	 */
	function getDeclDelim() {
	  var type = NodeType.DeclDelimType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = ';';

	  pos++;

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is a comma
	 * @param {Number} i Token's index number
	 * @return {Number} `1` if token is a comma, otherwise `0`
	 */
	function checkDelim(i) {
	  return i < tokensLength && tokens[i].type === TokenType.Comma ? 1 : 0;
	}

	/**
	 * Get node with a comma
	 * @return {Node}
	 */
	function getDelim() {
	  var type = NodeType.DelimType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = ',';

	  pos++;

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is part of a number with dimension unit (e.g. `10px`)
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkDimension(i) {
	  var ln = checkNumber(i);
	  var li = void 0;

	  if (i >= tokensLength || !ln || i + ln >= tokensLength) return 0;

	  return (li = checkUnit(i + ln)) ? ln + li : 0;
	}

	/**
	 * Get node of a number with dimension unit
	 * @return {Node}
	 */
	function getDimension() {
	  var type = NodeType.DimensionType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [getNumber(), getUnit()];

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is unit
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkUnit(i) {
	  var units = ['em', 'ex', 'ch', 'rem', 'vh', 'vw', 'vmin', 'vmax', 'px', 'mm', 'q', 'cm', 'in', 'pt', 'pc', 'deg', 'grad', 'rad', 'turn', 's', 'ms', 'Hz', 'kHz', 'dpi', 'dpcm', 'dppx'];

	  return units.indexOf(tokens[i].value) !== -1 ? 1 : 0;
	}

	/**
	 * Get unit node of type ident
	 * @return {Node} An ident node containing the unit value
	 */
	function getUnit() {
	  var type = NodeType.IdentType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = token.value;

	  pos++;

	  return newNode(type, content, line, column);
	}

	/**
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkExpression(i) {
	  var start = i;

	  if (i >= tokensLength || tokens[i++].value !== 'expression' || i >= tokensLength || tokens[i].type !== TokenType.LeftParenthesis) {
	    return 0;
	  }

	  return tokens[i].right - start + 1;
	}

	/**
	 * @return {Node}
	 */
	function getExpression() {
	  var type = NodeType.ExpressionType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;

	  pos++;

	  var content = joinValues(pos + 1, tokens[pos].right - 1);
	  var end = getLastPosition(content, line, column, 1);
	  if (end[0] === line) end[1] += 11;
	  pos = tokens[pos].right + 1;

	  return newNode(type, content, line, column, end);
	}

	/**
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkFunction(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkIdent(i)) i += l;else return 0;

	  return i < tokensLength && tokens[i].type === TokenType.LeftParenthesis ? tokens[i].right - start + 1 : 0;
	}

	/**
	 * @return {Node}
	 */
	function getFunction() {
	  var type = NodeType.FunctionType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var ident = getIdent();
	  var content = [ident];

	  content.push(getArguments());

	  return newNode(type, content, line, column);
	}

	/**
	 * @return {Node}
	 */
	function getArguments() {
	  var type = NodeType.ArgumentsType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];
	  var body = void 0;

	  pos++;

	  while (pos < tokensLength && tokens[pos].type !== TokenType.RightParenthesis) {
	    if (checkDeclaration(pos)) content.push(getDeclaration());else if (checkArgument(pos)) {
	      body = getArgument();
	      if (typeof body.content === 'string') content.push(body);else content = content.concat(body);
	    } else if (checkClass(pos)) content.push(getClass());else throwError(pos);
	  }

	  var end = getLastPosition(content, line, column, 1);
	  pos++;

	  return newNode(type, content, line, column, end);
	}

	/**
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkArgument(i) {
	  var l;

	  if (l = checkVhash(i)) tokens[i].argument_child = 1;else if (l = checkAny(i)) tokens[i].argument_child = 2;else if (l = checkSC(i)) tokens[i].argument_child = 3;else if (l = checkOperator(i)) tokens[i].argument_child = 4;

	  return l;
	}

	/**
	 * @return {Node}
	 */
	function getArgument() {
	  var childType = tokens[pos].argument_child;
	  if (childType === 1) return getVhash();else if (childType === 2) return getAny();else if (childType === 3) return getSC();else if (childType === 4) return getOperator();
	}

	/**
	 * Check if token is part of an identifierю
	 * Grammar from CSS spec:
	 *   h         [0-9a-f]
	 *   nonascii  [\240-\377]
	 *   unicode   \\{h}{1,6}(\r\n|[ \t\r\n\f])?
	 *   escape    {unicode}|\\[^\r\n\f0-9a-f]
	 *   nmstart   [_a-z]|{nonascii}|{escape}
	 *   nmchar    [_a-z0-9-]|{nonascii}|{escape}
	 *   ident     -?{nmstart}{nmchar}*
	 *
	 * @param {number} i Token's index number
	 * @return {number} Length of the identifier
	 */
	function checkIdent(i) {
	  var start = i;

	  if (i >= tokensLength) return 0;

	  if (tokens[i].type === TokenType.HyphenMinus) i++;

	  if (tokens[i].type === TokenType.LowLine || tokens[i].type === TokenType.Identifier) i++;else return 0;

	  for (; i < tokensLength; i++) {
	    if (tokens[i].type !== TokenType.HyphenMinus && tokens[i].type !== TokenType.LowLine && tokens[i].type !== TokenType.Identifier && tokens[i].type !== TokenType.DecimalNumber) break;
	  }

	  tokens[start].ident_last = i - 1;

	  return i - start;
	}

	/**
	 * Get node with an identifier
	 * @return {Node}
	 */
	function getIdent() {
	  var type = NodeType.IdentType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = joinValues(pos, tokens[pos].ident_last);

	  pos = tokens[pos].ident_last + 1;

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is part of `!important` word
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkImportant(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength || tokens[i++].type !== TokenType.ExclamationMark) return 0;

	  if (l = checkSC(i)) i += l;

	  if (tokens[i].value === 'important') {
	    tokens[start].importantEnd = i;
	    return i - start + 1;
	  } else {
	    return 0;
	  }
	}

	/**
	 * Get node with `!important` word
	 * @return {Node}
	 */
	function getImportant() {
	  var type = NodeType.ImportantType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = joinValues(pos, token.importantEnd);

	  pos = token.importantEnd + 1;

	  return newNode(type, content, line, column);
	}

	/**
	 * Check a single keyframe block - `5% {}`
	 * @param {Number} i
	 * @returns {Number}
	 */
	function checkKeyframesBlock(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkKeyframesSelectorsGroup(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkBlock(i)) i += l;else return 0;

	  return i - start;
	}

	/**
	 * Get a single keyframe block - `5% {}`
	 * @returns {Node}
	 */
	function getKeyframesBlock() {
	  var type = NodeType.RulesetType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [].concat(getKeyframesSelectorsGroup(), getSC(), [getBlock()]);

	  return newNode(type, content, line, column);
	}

	/**
	 * Check all keyframe blocks - `5% {} 100% {}`
	 * @param {Number} i
	 * @returns {Number}
	 */
	function checkKeyframesBlocks(i) {
	  var start = i;
	  var l = void 0;

	  if (i < tokensLength && tokens[i].type === TokenType.LeftCurlyBracket) i++;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkKeyframesBlock(i)) i += l;else return 0;

	  while (tokens[i].type !== TokenType.RightCurlyBracket) {
	    if (l = checkSC(i)) i += l;else if (l = checkKeyframesBlock(i)) i += l;else break;
	  }

	  if (i < tokensLength && tokens[i].type === TokenType.RightCurlyBracket) i++;else return 0;

	  return i - start;
	}

	/**
	 * Get all keyframe blocks - `5% {} 100% {}`
	 * @returns {Node}
	 */
	function getKeyframesBlocks() {
	  var type = NodeType.BlockType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];
	  var keyframesBlocksEnd = token.right;

	  // Skip `{`.
	  pos++;

	  while (pos < keyframesBlocksEnd) {
	    if (checkSC(pos)) content = content.concat(getSC());else if (checkKeyframesBlock(pos)) content.push(getKeyframesBlock());
	  }

	  var end = getLastPosition(content, line, column, 1);

	  // Skip `}`.
	  pos++;

	  return newNode(type, content, line, column, end);
	}

	/**
	 * Check if token is part of a @keyframes rule.
	 * @param {Number} i Token's index number
	 * @return {Number} Length of the @keyframes rule
	 */
	function checkKeyframesRule(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkAtkeyword(i)) i += l;else return 0;

	  var atruleName = joinValues2(i - l, l);
	  if (atruleName.indexOf('keyframes') === -1) return 0;

	  if (l = checkSC(i)) i += l;else return 0;

	  if (l = checkIdent(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkKeyframesBlocks(i)) i += l;else return 0;

	  return i - start;
	}

	/**
	 * @return {Node}
	 */
	function getKeyframesRule() {
	  var type = NodeType.AtruleType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [].concat([getAtkeyword()], getSC(), [getIdent()], getSC(), [getKeyframesBlocks()]);

	  return newNode(type, content, line, column);
	}

	/**
	 * Check a single keyframe selector - `5%`, `from` etc
	 * @param {Number} i
	 * @returns {Number}
	 */
	function checkKeyframesSelector(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkIdent(i)) {
	    // Valid selectors are only `from` and `to`.
	    var selector = joinValues2(i, l);
	    if (selector !== 'from' && selector !== 'to') return 0;

	    i += l;
	    tokens[start].keyframesSelectorType = 1;
	  } else if (l = checkPercentage(i)) {
	    i += l;
	    tokens[start].keyframesSelectorType = 2;
	  } else {
	    return 0;
	  }

	  return i - start;
	}

	/**
	 * Get a single keyframe selector
	 * @returns {Node}
	 */
	function getKeyframesSelector() {
	  var keyframesSelectorType = NodeType.KeyframesSelectorType;
	  var selectorType = NodeType.SelectorType;

	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  if (token.keyframesSelectorType === 1) {
	    content.push(getIdent());
	  } else {
	    content.push(getPercentage());
	  }

	  var keyframesSelector = newNode(keyframesSelectorType, content, line, column);
	  return newNode(selectorType, [keyframesSelector], line, column);
	}

	/**
	 * Check the keyframe's selector groups
	 * @param {Number} i
	 * @returns {Number}
	 */
	function checkKeyframesSelectorsGroup(i) {
	  var start = i;
	  var l = void 0;

	  if (l = checkKeyframesSelector(i)) i += l;else return 0;

	  while (i < tokensLength) {
	    var sb = checkSC(i);
	    var c = checkDelim(i + sb);
	    if (!c) break;
	    var sa = checkSC(i + sb + c);
	    if (l = checkKeyframesSelector(i + sb + c + sa)) i += sb + c + sa + l;else break;
	  }

	  tokens[start].selectorsGroupEnd = i;

	  return i - start;
	}

	/**
	 * Get the keyframe's selector groups
	 * @returns {Array} An array of keyframe selectors
	 */
	function getKeyframesSelectorsGroup() {
	  var selectorsGroup = [];
	  var selectorsGroupEnd = tokens[pos].selectorsGroupEnd;

	  selectorsGroup.push(getKeyframesSelector());

	  while (pos < selectorsGroupEnd) {
	    selectorsGroup = selectorsGroup.concat(getSC());
	    selectorsGroup.push(getDelim());
	    selectorsGroup = selectorsGroup.concat(getSC());
	    selectorsGroup.push(getKeyframesSelector());
	  }

	  return selectorsGroup;
	}

	/**
	 * Check if token is a namespace sign (`|`)
	 * @param {Number} i Token's index number
	 * @return {Number} `1` if token is `|`, `0` if not
	 */
	function checkNamespace(i) {
	  return i < tokensLength && tokens[i].type === TokenType.VerticalLine ? 1 : 0;
	}

	/**
	 * Get node with a namespace sign
	 * @return {Node}
	 */
	function getNamespace() {
	  var type = NodeType.NamespaceType;
	  var token = tokens[pos++];
	  var line = token.ln;
	  var column = token.col;
	  var content = '|';

	  return newNode(type, content, line, column);
	}

	/**
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkNmName2(i) {
	  if (tokens[i].type === TokenType.Identifier) return 1;else if (tokens[i].type !== TokenType.DecimalNumber) return 0;

	  i++;

	  return i < tokensLength && tokens[i].type === TokenType.Identifier ? 2 : 1;
	}

	/**
	 * @return {String}
	 */
	function getNmName2() {
	  var s = tokens[pos].value;

	  if (tokens[pos++].type === TokenType.DecimalNumber && pos < tokensLength && tokens[pos].type === TokenType.Identifier) s += tokens[pos++].value;

	  return s;
	}

	/**
	 * Check if token is part of a number
	 * @param {Number} i Token's index number
	 * @return {Number} Length of number
	 */
	function checkNumber(i) {
	  if (i >= tokensLength) return 0;

	  if (tokens[i].number_l) return tokens[i].number_l;

	  // `10`:
	  if (i < tokensLength && tokens[i].type === TokenType.DecimalNumber && (!tokens[i + 1] || tokens[i + 1] && tokens[i + 1].type !== TokenType.FullStop)) {
	    tokens[i].number_l = 1;
	    return 1;
	  }

	  // `10.`:
	  if (i < tokensLength && tokens[i].type === TokenType.DecimalNumber && tokens[i + 1] && tokens[i + 1].type === TokenType.FullStop && (!tokens[i + 2] || tokens[i + 2].type !== TokenType.DecimalNumber)) {
	    tokens[i].number_l = 2;
	    return 2;
	  }

	  // `.10`:
	  if (i < tokensLength && tokens[i].type === TokenType.FullStop && tokens[i + 1].type === TokenType.DecimalNumber) {
	    tokens[i].number_l = 2;
	    return 2;
	  }

	  // `10.10`:
	  if (i < tokensLength && tokens[i].type === TokenType.DecimalNumber && tokens[i + 1] && tokens[i + 1].type === TokenType.FullStop && tokens[i + 2] && tokens[i + 2].type === TokenType.DecimalNumber) {
	    tokens[i].number_l = 3;
	    return 3;
	  }

	  return 0;
	}

	/**
	 * Get node with number
	 * @return {Node}
	 */
	function getNumber() {
	  var type = NodeType.NumberType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = '';
	  var l = tokens[pos].number_l;

	  for (var j = 0; j < l; j++) {
	    content += tokens[pos + j].value;
	  }

	  pos += l;

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is an operator (`/`, `,`, `:` or `=`).
	 * @param {Number} i Token's index number
	 * @return {Number} `1` if token is an operator, otherwise `0`
	 */
	function checkOperator(i) {
	  if (i >= tokensLength) return 0;

	  switch (tokens[i].type) {
	    case TokenType.Solidus:
	    case TokenType.Comma:
	    case TokenType.Colon:
	    case TokenType.EqualsSign:
	      return 1;
	  }

	  return 0;
	}

	/**
	 * Get node with an operator
	 * @return {Node}
	 */
	function getOperator() {
	  var type = NodeType.OperatorType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = token.value;

	  pos++;

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is part of text inside parentheses, e.g. `(1)`
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkParentheses(i) {
	  if (i >= tokensLength) return 0;

	  var start = i;
	  var right = tokens[i].right;

	  if (tokens[i].type === TokenType.LeftParenthesis) i++;else return 0;

	  if (i < right) {
	    var l = checkTsets(i);
	    if (l) i += l;else return 0;
	  }

	  i++;

	  return i - start;
	}

	/**
	 * Get node with text inside parentheses, e.g. `(1)`
	 * @return {Node}
	 */
	function getParentheses() {
	  var type = NodeType.ParenthesesType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var tsets = [];
	  var right = token.right;

	  pos++;

	  if (pos < right) {
	    tsets = getTsets();
	  }

	  var end = getLastPosition(tsets, line, column, 1);
	  pos++;

	  return newNode(type, tsets, line, column, end);
	}

	/**
	 * Check if token is part of a number with percent sign (e.g. `10%`)
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkPercentage(i) {
	  var x;

	  if (i >= tokensLength) return 0;

	  x = checkNumber(i);

	  if (!x || i + x >= tokensLength) return 0;

	  return tokens[i + x].type === TokenType.PercentSign ? x + 1 : 0;
	}

	/**
	 * Get node of number with percent sign
	 * @return {Node}
	 */
	function getPercentage() {
	  var type = NodeType.PercentageType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [getNumber()];

	  var end = getLastPosition(content, line, column, 1);
	  pos++;

	  return newNode(type, content, line, column, end);
	}

	/**
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkProgid(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (joinValues2(i, 6) === 'progid:DXImageTransform.Microsoft.') i += 6;else return 0;

	  if (l = checkIdent(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (tokens[i].type === TokenType.LeftParenthesis) {
	    tokens[start].progid_end = tokens[i].right;
	    i = tokens[i].right + 1;
	  } else return 0;

	  return i - start;
	}

	/**
	 * @return {Node}
	 */
	function getProgid() {
	  var type = NodeType.ProgidType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var progid_end = token.progid_end;
	  var content = joinValues(pos, progid_end);

	  pos = progid_end + 1;

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is part of a property
	 * @param {Number} i Token's index number
	 * @return {Number} Length of the property
	 */
	function checkProperty(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkIdent(i)) i += l;else return 0;

	  return i - start;
	}

	/**
	 * Get node with a property
	 * @return {Node}
	 */
	function getProperty() {
	  var type = NodeType.PropertyType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [getIdent()];

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is a colon
	 * @param {Number} i Token's index number
	 * @return {Number} `1` if token is a colon, otherwise `0`
	 */
	function checkPropertyDelim(i) {
	  return i < tokensLength && tokens[i].type === TokenType.Colon ? 1 : 0;
	}

	/**
	 * Get node with a colon
	 * @return {Node}
	 */
	function getPropertyDelim() {
	  var type = NodeType.PropertyDelimType;
	  var token = tokens[pos++];
	  var line = token.ln;
	  var column = token.col;
	  var content = ':';

	  return newNode(type, content, line, column);
	}

	/**
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkPseudo(i) {
	  return checkPseudoe(i) || checkPseudoc(i);
	}

	/**
	 * @return {Node}
	 */
	function getPseudo() {
	  if (checkPseudoe(pos)) return getPseudoe();
	  if (checkPseudoc(pos)) return getPseudoc();
	}

	/**
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkPseudoe(i) {
	  var l;

	  if (i >= tokensLength || tokens[i++].type !== TokenType.Colon || i >= tokensLength || tokens[i++].type !== TokenType.Colon) return 0;

	  return (l = checkIdent(i)) ? l + 2 : 0;
	}

	/**
	 * @return {Node}
	 */
	function getPseudoe() {
	  var type = NodeType.PseudoeType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  pos += 2;

	  content.push(getIdent());

	  return newNode(type, content, line, column);
	}

	/**
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkPseudoc(i) {
	  var l;

	  if (i >= tokensLength || tokens[i].type !== TokenType.Colon) return 0;

	  if (l = checkPseudoClass1(i)) tokens[i].pseudoClassType = 1;else if (l = checkPseudoClass2(i)) tokens[i].pseudoClassType = 2;else if (l = checkPseudoClass3(i)) tokens[i].pseudoClassType = 3;else if (l = checkPseudoClass4(i)) tokens[i].pseudoClassType = 4;else if (l = checkPseudoClass5(i)) tokens[i].pseudoClassType = 5;else if (l = checkPseudoClass6(i)) tokens[i].pseudoClassType = 6;else return 0;

	  return l;
	}

	/**
	 * @return {Node}
	 */
	function getPseudoc() {
	  var childType = tokens[pos].pseudoClassType;
	  if (childType === 1) return getPseudoClass1();
	  if (childType === 2) return getPseudoClass2();
	  if (childType === 3) return getPseudoClass3();
	  if (childType === 4) return getPseudoClass4();
	  if (childType === 5) return getPseudoClass5();
	  if (childType === 6) return getPseudoClass6();
	}

	/**
	 * (1) `:panda(selector)`
	 * (2) `:panda(selector, selector)`
	 */
	function checkPseudoClass1(i) {
	  var start = i;

	  // Skip `:`.
	  i++;

	  var l = void 0;
	  if (l = checkIdent(i)) i += l;else return 0;

	  if (i >= tokensLength || tokens[i].type !== TokenType.LeftParenthesis) return 0;

	  var right = tokens[i].right;

	  // Skip `(`.
	  i++;

	  if (l = checkSelectorsGroup(i)) i += l;else return 0;

	  if (i !== right) return 0;

	  return i - start + 1;
	}

	/**
	 * (-) `:not(panda)`
	 */
	function getPseudoClass1() {
	  var type = NodeType.PseudocType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  // Skip `:`.
	  pos++;

	  content.push(getIdent());

	  {
	    var _type = NodeType.ArgumentsType;
	    var _token = tokens[pos];
	    var _line = _token.ln;
	    var _column = _token.col;

	    // Skip `(`.
	    pos++;

	    var selectors = getSelectorsGroup();
	    var end = getLastPosition(selectors, _line, _column, 1);
	    var args = newNode(_type, selectors, _line, _column, end);
	    content.push(args);

	    // Skip `)`.
	    pos++;
	  }

	  return newNode(type, content, line, column);
	}

	/**
	 * (1) `:nth-child(odd)`
	 * (2) `:nth-child(even)`
	 * (3) `:lang(de-DE)`
	 */
	function checkPseudoClass2(i) {
	  var start = i;
	  var l = 0;

	  // Skip `:`.
	  i++;

	  if (i >= tokensLength) return 0;

	  if (l = checkIdent(i)) i += l;else return 0;

	  if (i >= tokensLength || tokens[i].type !== TokenType.LeftParenthesis) return 0;

	  var right = tokens[i].right;

	  // Skip `(`.
	  i++;

	  if (l = checkSC(i)) i += l;

	  if (l = checkIdent(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (i !== right) return 0;

	  return i - start + 1;
	}

	function getPseudoClass2() {
	  var type = NodeType.PseudocType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  // Skip `:`.
	  pos++;

	  var ident = getIdent();
	  content.push(ident);

	  // Skip `(`.
	  pos++;

	  var l = tokens[pos].ln;
	  var c = tokens[pos].col;
	  var value = [];

	  value = value.concat(getSC());
	  value.push(getIdent());
	  value = value.concat(getSC());

	  var end = getLastPosition(value, l, c, 1);
	  var args = newNode(NodeType.ArgumentsType, value, l, c, end);
	  content.push(args);

	  // Skip `)`.
	  pos++;

	  return newNode(type, content, line, column);
	}

	/**
	 * (-) `:nth-child(-3n + 2)`
	 */
	function checkPseudoClass3(i) {
	  var start = i;
	  var l = 0;

	  // Skip `:`.
	  i++;

	  if (i >= tokensLength) return 0;

	  if (l = checkIdent(i)) i += l;else return 0;

	  if (i >= tokensLength || tokens[i].type !== TokenType.LeftParenthesis) return 0;

	  var right = tokens[i].right;

	  // Skip `(`.
	  i++;

	  if (l = checkSC(i)) i += l;

	  if (l = checkUnary(i)) i += l;
	  if (i >= tokensLength) return 0;
	  if (tokens[i].type === TokenType.DecimalNumber) i++;

	  if (i >= tokensLength) return 0;
	  if (tokens[i].value === 'n') i++;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (i >= tokensLength) return 0;
	  if (tokens[i].value === '+' || tokens[i].value === '-') i++;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (tokens[i].type === TokenType.DecimalNumber) i++;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (i !== right) return 0;

	  return i - start + 1;
	}

	function getPseudoClass3() {
	  var type = NodeType.PseudocType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  // Skip `:`.
	  pos++;

	  var ident = getIdent();
	  content.push(ident);

	  var l = tokens[pos].ln;
	  var c = tokens[pos].col;
	  var value = [];

	  // Skip `(`.
	  pos++;

	  if (checkUnary(pos)) value.push(getUnary());
	  if (checkNumber(pos)) value.push(getNumber());

	  {
	    var _l = tokens[pos].ln;
	    var _c = tokens[pos].col;
	    var _content = tokens[pos].value;
	    var _ident = newNode(NodeType.IdentType, _content, _l, _c);
	    value.push(_ident);
	    pos++;
	  }

	  value = value.concat(getSC());
	  if (checkUnary(pos)) value.push(getUnary());
	  value = value.concat(getSC());
	  if (checkNumber(pos)) value.push(getNumber());
	  value = value.concat(getSC());

	  var end = getLastPosition(value, l, c, 1);
	  var args = newNode(NodeType.ArgumentsType, value, l, c, end);
	  content.push(args);

	  // Skip `)`.
	  pos++;

	  return newNode(type, content, line, column);
	}

	/**
	 * (-) `:nth-child(-3n)`
	 */
	function checkPseudoClass4(i) {
	  var start = i;
	  var l = 0;

	  // Skip `:`.
	  i++;

	  if (i >= tokensLength) return 0;

	  if (l = checkIdent(i)) i += l;else return 0;

	  if (i >= tokensLength) return 0;
	  if (tokens[i].type !== TokenType.LeftParenthesis) return 0;

	  var right = tokens[i].right;

	  // Skip `(`.
	  i++;

	  if (l = checkSC(i)) i += l;

	  if (l = checkUnary(i)) i += l;
	  if (tokens[i].type === TokenType.DecimalNumber) i++;

	  if (tokens[i].value === 'n') i++;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (i !== right) return 0;

	  return i - start + 1;
	}

	function getPseudoClass4() {
	  var type = NodeType.PseudocType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  // Skip `:`.
	  pos++;

	  var ident = getIdent();
	  content.push(ident);

	  // Skip `(`.
	  pos++;

	  var l = tokens[pos].ln;
	  var c = tokens[pos].col;
	  var value = [];

	  if (checkUnary(pos)) value.push(getUnary());
	  if (checkNumber(pos)) value.push(getNumber());
	  if (checkIdent(pos)) value.push(getIdent());
	  value = value.concat(getSC());

	  var end = getLastPosition(value, l, c, 1);
	  var args = newNode(NodeType.ArgumentsType, value, l, c, end);
	  content.push(args);

	  // Skip `)`.
	  pos++;

	  return newNode(type, content, line, column);
	}

	/**
	 * (-) `:nth-child(+8)`
	 */
	function checkPseudoClass5(i) {
	  var start = i;
	  var l = 0;

	  // Skip `:`.
	  i++;

	  if (i >= tokensLength) return 0;

	  if (l = checkIdent(i)) i += l;else return 0;

	  if (i >= tokensLength) return 0;
	  if (tokens[i].type !== TokenType.LeftParenthesis) return 0;

	  var right = tokens[i].right;

	  // Skip `(`.
	  i++;

	  if (l = checkSC(i)) i += l;

	  if (l = checkUnary(i)) i += l;
	  if (tokens[i].type === TokenType.DecimalNumber) i++;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (i !== right) return 0;

	  return i - start + 1;
	}

	function getPseudoClass5() {
	  var type = NodeType.PseudocType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  // Skip `:`.
	  pos++;

	  var ident = getIdent();
	  content.push(ident);

	  // Skip `(`.
	  pos++;

	  var l = tokens[pos].ln;
	  var c = tokens[pos].col;
	  var value = [];

	  if (checkUnary(pos)) value.push(getUnary());
	  if (checkNumber(pos)) value.push(getNumber());
	  value = value.concat(getSC());

	  var end = getLastPosition(value, l, c, 1);
	  var args = newNode(NodeType.ArgumentsType, value, l, c, end);
	  content.push(args);

	  // Skip `)`.
	  pos++;

	  return newNode(type, content, line, column);
	}

	/**
	 * (-) `:checked`
	 */
	function checkPseudoClass6(i) {
	  var start = i;
	  var l = 0;

	  // Skip `:`.
	  i++;

	  if (i >= tokensLength) return 0;

	  if (l = checkIdent(i)) i += l;else return 0;

	  return i - start;
	}

	function getPseudoClass6() {
	  var type = NodeType.PseudocType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  // Skip `:`.
	  pos++;

	  var ident = getIdent();
	  content.push(ident);

	  return newNode(type, content, line, column);
	}

	/**
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkRuleset(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkSelectorsGroup(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkBlock(i)) i += l;else return 0;

	  return i - start;
	}

	/**
	 * @return {Node}
	 */
	function getRuleset() {
	  var type = NodeType.RulesetType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  content = content.concat(getSelectorsGroup());
	  content = content.concat(getSC());
	  content.push(getBlock());

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is marked as a space (if it's a space or a tab
	 *      or a line break).
	 * @param {Number} i
	 * @return {Number} Number of spaces in a row starting with the given token.
	 */
	function checkS(i) {
	  return i < tokensLength && tokens[i].ws ? tokens[i].ws_last - i + 1 : 0;
	}

	/**
	 * Get node with spaces
	 * @return {Node}
	 */
	function getS() {
	  var type = NodeType.SType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = joinValues(pos, tokens[pos].ws_last);

	  pos = tokens[pos].ws_last + 1;

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is a space or a comment.
	 * @param {Number} i Token's index number
	 * @return {Number} Number of similar (space or comment) tokens
	 *      in a row starting with the given token.
	 */
	function checkSC(i) {
	  var l = void 0;
	  var lsc = 0;

	  while (i < tokensLength) {
	    if (l = checkS(i)) tokens[i].sc_child = 1;else if (l = checkCommentML(i)) tokens[i].sc_child = 2;else break;
	    i += l;
	    lsc += l;
	  }

	  return lsc || 0;
	}

	/**
	 * Get node with spaces and comments
	 * @return {Array}
	 */
	function getSC() {
	  var sc = [];

	  if (pos >= tokensLength) return sc;

	  while (pos < tokensLength) {
	    var childType = tokens[pos].sc_child;
	    if (childType === 1) sc.push(getS());else if (childType === 2) sc.push(getCommentML());else break;
	  }

	  return sc;
	}

	/**
	 * Check if token is part of a hexadecimal number (e.g. `#fff`) inside
	 *      a simple selector
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkShash(i) {
	  var l;

	  if (i >= tokensLength || tokens[i].type !== TokenType.NumberSign) return 0;

	  return (l = checkIdent(i + 1)) ? l + 1 : 0;
	}

	/**
	 * Get node with a hexadecimal number (e.g. `#fff`) inside a simple
	 *      selector
	 * @return {Node}
	 */
	function getShash() {
	  var type = NodeType.ShashType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  pos++;

	  var ident = getIdent();
	  content.push(ident);

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is part of a string (text wrapped in quotes)
	 * @param {Number} i Token's index number
	 * @return {Number} `1` if token is part of a string, `0` if not
	 */
	function checkString(i) {
	  if (i >= tokensLength) {
	    return 0;
	  }

	  if (tokens[i].type === TokenType.StringSQ || tokens[i].type === TokenType.StringDQ) {
	    return 1;
	  }

	  return 0;
	}

	/**
	 * Get string's node
	 * @return {Array} `['string', x]` where `x` is a string (including
	 *      quotes).
	 */
	function getString() {
	  var type = NodeType.StringType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = token.value;

	  pos++;

	  return newNode(type, content, line, column);
	}

	/**
	 * Validate stylesheet: it should consist of any number (0 or more) of
	 * rulesets (sets of rules with selectors), @-rules, whitespaces or
	 * comments.
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkStylesheet(i) {
	  var start = i;
	  var l = void 0;

	  // Check every token:
	  while (i < tokensLength) {
	    if (l = checkSC(i)) tokens[i].stylesheet_child = 1;else if (l = checkRuleset(i)) tokens[i].stylesheet_child = 2;else if (l = checkAtrule(i)) tokens[i].stylesheet_child = 3;else if (l = checkDeclDelim(i)) tokens[i].stylesheet_child = 4;else throwError(i);

	    i += l;
	  }

	  return i - start;
	}

	/**
	 * @return {Array} `['stylesheet', x]` where `x` is all stylesheet's
	 *      nodes.
	 */
	function getStylesheet() {
	  var type = NodeType.StylesheetType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];
	  var childType = void 0;

	  while (pos < tokensLength) {
	    childType = tokens[pos].stylesheet_child;
	    if (childType === 1) content = content.concat(getSC());else if (childType === 2) content.push(getRuleset());else if (childType === 3) content.push(getAtrule());else if (childType === 4) content.push(getDeclDelim());
	  }

	  return newNode(type, content, line, column);
	}

	/**
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkTset(i) {
	  var l;

	  if (l = checkVhash(i)) tokens[i].tset_child = 1;else if (l = checkAny(i)) tokens[i].tset_child = 2;else if (l = checkSC(i)) tokens[i].tset_child = 3;else if (l = checkOperator(i)) tokens[i].tset_child = 4;

	  return l;
	}

	/**
	 * @return {Array}
	 */
	function getTset() {
	  var childType = tokens[pos].tset_child;
	  if (childType === 1) return getVhash();else if (childType === 2) return getAny();else if (childType === 3) return getSC();else if (childType === 4) return getOperator();
	}

	/**
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkTsets(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  while (l = checkTset(i)) {
	    i += l;
	  }

	  return i - start;
	}

	/**
	 * @return {Array}
	 */
	function getTsets() {
	  var x = [];
	  var t = void 0;

	  while (checkTset(pos)) {
	    t = getTset();
	    if (typeof t.content === 'string') x.push(t);else x = x.concat(t);
	  }

	  return x;
	}

	/**
	 * Check if token is an unary (arithmetical) sign (`+` or `-`)
	 * @param {Number} i Token's index number
	 * @return {Number} `1` if token is an unary sign, `0` if not
	 */
	function checkUnary(i) {
	  if (i >= tokensLength) {
	    return 0;
	  }

	  if (tokens[i].type === TokenType.HyphenMinus || tokens[i].type === TokenType.PlusSign) {
	    return 1;
	  }

	  return 0;
	}

	/**
	 * Get node with an unary (arithmetical) sign (`+` or `-`)
	 * @return {Array} `['unary', x]` where `x` is an unary sign
	 *      converted to string.
	 */
	function getUnary() {
	  var type = NodeType.OperatorType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = token.value;

	  pos++;

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is a unicode range (single or multiple <urange> nodes)
	 * @param {number} i Token's index
	 * @return {number} Unicode range node's length
	 */
	function checkUnicodeRange(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkUrange(i)) i += l;else return 0;

	  while (i < tokensLength) {
	    var spaceBefore = checkSC(i);
	    var comma = checkDelim(i + spaceBefore);
	    if (!comma) break;

	    var spaceAfter = checkSC(i + spaceBefore + comma);
	    if (l = checkUrange(i + spaceBefore + comma + spaceAfter)) {
	      i += spaceBefore + comma + spaceAfter + l;
	    } else break;
	  }

	  return i - start;
	}

	/**
	 * Get a unicode range node
	 * @return {Node}
	 */
	function getUnicodeRange() {
	  var type = NodeType.UnicodeRangeType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  while (pos < tokensLength) {
	    if (checkSC(pos)) content = content.concat(getSC());else if (checkDelim(pos)) content.push(getDelim());else if (checkUrange(pos)) content.push(getUrange());else break;
	  }

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is a u-range (part of a unicode-range)
	 * (1) `U+416`
	 * (2) `U+400-4ff`
	 * (3) `U+4??`
	 * @param {number} i Token's index
	 * @return {number} Urange node's length
	 */
	function checkUrange(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  // Check for unicode prefix (u+ or U+)
	  if (tokens[i].value === 'U' || tokens[i].value === 'u') i += 1;else return 0;

	  if (i >= tokensLength) return 0;

	  if (tokens[i].value === '+') i += 1;else return 0;

	  while (i < tokensLength) {
	    if (l = checkIdent(i)) i += l;else if (l = checkNumber(i)) i += l;else if (l = checkUnary(i)) i += l;else if (l = _checkUnicodeWildcard(i)) i += l;else break;
	  }

	  tokens[start].urangeEnd = i - 1;

	  return i - start;
	}

	/**
	 * Get a u-range node (part of a unicode-range)
	 * @return {Node}
	 */
	function getUrange() {
	  var startPos = pos;
	  var type = NodeType.UrangeType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  content = joinValues(startPos, tokens[startPos].urangeEnd);
	  pos = tokens[startPos].urangeEnd + 1;

	  return newNode(type, content, line, column);
	}

	/**
	 * Check for unicode wildcard characters `?`
	 * @param {number} i Token's index
	 * @return {number} Wildcard length
	 */
	function _checkUnicodeWildcard(i) {
	  var start = i;

	  if (i >= tokensLength) return 0;

	  while (i < tokensLength) {
	    if (tokens[i].type === TokenType.QuestionMark) i += 1;else break;
	  }

	  return i - start;
	}

	/**
	 * Check if token is part of URI (e.g. `url('/css/styles.css')`)
	 * @param {Number} i Token's index number
	 * @return {Number} Length of URI
	 */
	function checkUri(i) {
	  var start = i;

	  if (i >= tokensLength || tokens[i].value !== 'url') return 0;
	  i += 1;
	  if (i >= tokensLength || tokens[i].type !== TokenType.LeftParenthesis) return 0;

	  return tokens[i].right - start + 1;
	}

	/**
	 * Get node with URI
	 * @return {Array} `['uri', x]` where `x` is URI's nodes (without `url`
	 *      and braces, e.g. `['string', ''/css/styles.css'']`).
	 */
	function getUri() {
	  var startPos = pos;
	  var uriExcluding = {};
	  var uri = void 0;
	  var l = void 0;
	  var raw = void 0;

	  var rawContent = void 0;
	  var t = void 0;

	  pos += 2;

	  uriExcluding[TokenType.Space] = 1;
	  uriExcluding[TokenType.Tab] = 1;
	  uriExcluding[TokenType.Newline] = 1;
	  uriExcluding[TokenType.LeftParenthesis] = 1;
	  uriExcluding[TokenType.RightParenthesis] = 1;

	  if (checkUri1(pos)) {
	    uri = [].concat(getSC()).concat([getString()]).concat(getSC());
	  } else {
	    uri = checkSC(pos) ? getSC() : [];
	    l = checkExcluding(uriExcluding, pos);
	    rawContent = joinValues(pos, pos + l);
	    t = tokens[pos];
	    raw = newNode(NodeType.RawType, rawContent, t.ln, t.col);

	    uri.push(raw);

	    pos += l + 1;

	    if (checkSC(pos)) uri = uri.concat(getSC());
	  }

	  t = tokens[startPos];
	  var line = t.ln;
	  var column = t.col;
	  var end = getLastPosition(uri, line, column, 1);
	  pos++;

	  return newNode(NodeType.UriType, uri, line, column, end);
	}

	/**
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkUri1(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkSC(i)) i += l;

	  if (tokens[i].type !== TokenType.StringDQ && tokens[i].type !== TokenType.StringSQ) return 0;

	  i++;

	  if (l = checkSC(i)) i += l;

	  return i - start;
	}

	/**
	 * Check if token is part of a value
	 * @param {Number} i Token's index number
	 * @return {Number} Length of the value
	 */
	function checkValue(i) {
	  var start = i;
	  var l = void 0;
	  var s = void 0;
	  var _i = void 0;

	  while (i < tokensLength) {
	    s = checkSC(i);
	    _i = i + s;

	    if (l = _checkValue(_i)) i += l + s;else break;
	  }

	  tokens[start].value_end = i;
	  return i - start;
	}

	/**
	 * @return {Array}
	 */
	function getValue() {
	  var startPos = pos;
	  var end = tokens[pos].value_end;
	  var x = [];

	  while (pos < end) {
	    if (tokens[pos].value_child) x.push(_getValue());else x = x.concat(getSC());
	  }

	  var t = tokens[startPos];
	  return newNode(NodeType.ValueType, x, t.ln, t.col);
	}

	/**
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function _checkValue(i) {
	  var l;

	  if (l = checkProgid(i)) tokens[i].value_child = 1;else if (l = checkVhash(i)) tokens[i].value_child = 2;else if (l = checkAny(i)) tokens[i].value_child = 3;else if (l = checkOperator(i)) tokens[i].value_child = 4;else if (l = checkImportant(i)) tokens[i].value_child = 5;

	  return l;
	}

	/**
	 * @return {Array}
	 */
	function _getValue() {
	  var childType = tokens[pos].value_child;
	  if (childType === 1) return getProgid();else if (childType === 2) return getVhash();else if (childType === 3) return getAny();else if (childType === 4) return getOperator();else if (childType === 5) return getImportant();
	}

	/**
	 * Check if token is part of a hexadecimal number (e.g. `#fff`) inside
	 *      some value
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkVhash(i) {
	  var l;

	  if (i >= tokensLength || tokens[i].type !== TokenType.NumberSign) return 0;

	  return (l = checkNmName2(i + 1)) ? l + 1 : 0;
	}

	/**
	 * Get node with a hexadecimal number (e.g. `#fff`) inside some value
	 * @return {Array} `['vhash', x]` where `x` is a hexadecimal number
	 *      converted to string (without `#`, e.g. `'fff'`).
	 */
	function getVhash() {
	  var type = NodeType.VhashType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = void 0;

	  pos++;

	  content = getNmName2();
	  var end = getLastPosition(content, line, column + 1);
	  return newNode(type, content, line, column, end);
	}

	function checkSelectorsGroup(i) {
	  if (i >= tokensLength) return 0;

	  var start = i;
	  var l = void 0;

	  if (l = checkSelector(i)) i += l;else return 0;

	  while (i < tokensLength) {
	    var sb = checkSC(i);
	    var c = checkDelim(i + sb);
	    if (!c) break;
	    var sa = checkSC(i + sb + c);
	    if (l = checkSelector(i + sb + c + sa)) i += sb + c + sa + l;else break;
	  }

	  tokens[start].selectorsGroupEnd = i;
	  return i - start;
	}

	function getSelectorsGroup() {
	  var selectorsGroup = [];
	  var selectorsGroupEnd = tokens[pos].selectorsGroupEnd;

	  selectorsGroup.push(getSelector());

	  while (pos < selectorsGroupEnd) {
	    selectorsGroup = selectorsGroup.concat(getSC());
	    selectorsGroup.push(getDelim());
	    selectorsGroup = selectorsGroup.concat(getSC());
	    selectorsGroup.push(getSelector());
	  }

	  return selectorsGroup;
	}

	function checkSelector(i) {
	  if (i >= tokensLength) return 0;

	  var start = i;
	  var l = void 0;

	  if (l = checkCompoundSelector(i)) i += l;else return 0;

	  while (i < tokensLength) {
	    var sb = checkSC(i);
	    var c = checkCombinator(i + sb);
	    if (!sb && !c) break;
	    var sa = checkSC(i + sb + c);
	    if (l = checkCompoundSelector(i + sb + c + sa)) i += sb + c + sa + l;else break;
	  }

	  tokens[start].selectorEnd = i;
	  return i - start;
	}

	function getSelector() {
	  var type = NodeType.SelectorType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var selectorEnd = token.selectorEnd;
	  var content = void 0;

	  content = getCompoundSelector();

	  while (pos < selectorEnd) {
	    content = content.concat(getSC());
	    if (checkCombinator(pos)) content.push(getCombinator());
	    content = content.concat(getSC());
	    content = content.concat(getCompoundSelector());
	  }

	  return newNode(type, content, line, column);
	}

	function checkCompoundSelector(i) {
	  var l = void 0;

	  if (l = checkCompoundSelector1(i)) {
	    tokens[i].compoundSelectorType = 1;
	  } else if (l = checkCompoundSelector2(i)) {
	    tokens[i].compoundSelectorType = 2;
	  }

	  return l;
	}

	function getCompoundSelector() {
	  var type = tokens[pos].compoundSelectorType;
	  if (type === 1) return getCompoundSelector1();
	  if (type === 2) return getCompoundSelector2();
	}

	function checkCompoundSelector1(i) {
	  if (i >= tokensLength) return 0;

	  var start = i;

	  var l = void 0;
	  if (l = checkUniversalSelector(i) || checkTypeSelector(i)) i += l;else return 0;

	  while (i < tokensLength) {
	    var _l2 = checkShash(i) || checkClass(i) || checkAttributeSelector(i) || checkPseudo(i);
	    if (_l2) i += _l2;else break;
	  }

	  tokens[start].compoundSelectorEnd = i;

	  return i - start;
	}

	function getCompoundSelector1() {
	  var sequence = [];
	  var compoundSelectorEnd = tokens[pos].compoundSelectorEnd;

	  if (checkUniversalSelector(pos)) sequence.push(getUniversalSelector());else sequence.push(getTypeSelector());

	  while (pos < compoundSelectorEnd) {
	    if (checkShash(pos)) sequence.push(getShash());else if (checkClass(pos)) sequence.push(getClass());else if (checkAttributeSelector(pos)) sequence.push(getAttributeSelector());else if (checkPseudo(pos)) sequence.push(getPseudo());
	  }

	  return sequence;
	}

	function checkCompoundSelector2(i) {
	  if (i >= tokensLength) return 0;

	  var start = i;

	  while (i < tokensLength) {
	    var l = checkShash(i) || checkClass(i) || checkAttributeSelector(i) || checkPseudo(i);
	    if (l) i += l;else break;
	  }

	  tokens[start].compoundSelectorEnd = i;

	  return i - start;
	}

	function getCompoundSelector2() {
	  var sequence = [];
	  var compoundSelectorEnd = tokens[pos].compoundSelectorEnd;

	  while (pos < compoundSelectorEnd) {
	    if (checkShash(pos)) sequence.push(getShash());else if (checkClass(pos)) sequence.push(getClass());else if (checkAttributeSelector(pos)) sequence.push(getAttributeSelector());else if (checkPseudo(pos)) sequence.push(getPseudo());
	  }

	  return sequence;
	}

	function checkUniversalSelector(i) {
	  if (i >= tokensLength) return 0;

	  var start = i;
	  var l = void 0;

	  if (l = checkNamePrefix(i)) i += l;

	  if (tokens[i].type === TokenType.Asterisk) i++;else return 0;

	  return i - start;
	}

	function getUniversalSelector() {
	  var type = NodeType.UniversalSelectorType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];
	  var end = void 0;

	  if (checkNamePrefix(pos)) {
	    content.push(getNamePrefix());
	    end = getLastPosition(content, line, column, 1);
	  }

	  pos++;

	  return newNode(type, content, line, column, end);
	}

	function checkTypeSelector(i) {
	  if (i >= tokensLength) return 0;

	  var start = i;
	  var l = void 0;

	  if (l = checkNamePrefix(i)) i += l;

	  if (l = checkIdent(i)) i += l;else return 0;

	  return i - start;
	}

	function getTypeSelector() {
	  var type = NodeType.TypeSelectorType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  if (checkNamePrefix(pos)) content.push(getNamePrefix());

	  content.push(getIdent());

	  return newNode(type, content, line, column);
	}

	function checkAttributeSelector(i) {
	  var l = void 0;
	  if (l = checkAttributeSelector1(i)) tokens[i].attributeSelectorType = 1;else if (l = checkAttributeSelector2(i)) tokens[i].attributeSelectorType = 2;

	  return l;
	}

	function getAttributeSelector() {
	  var type = tokens[pos].attributeSelectorType;
	  if (type === 1) return getAttributeSelector1();else return getAttributeSelector2();
	}

	/**
	 * (1) `[panda=nani]`
	 * (2) `[panda='nani']`
	 * (3) `[panda='nani' i]`
	 *
	 */
	function checkAttributeSelector1(i) {
	  var start = i;

	  if (tokens[i].type === TokenType.LeftSquareBracket) i++;else return 0;

	  var l = void 0;
	  if (l = checkSC(i)) i += l;

	  if (l = checkAttributeName(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkAttributeMatch(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkAttributeValue(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkAttributeFlags(i)) {
	    i += l;
	    if (l = checkSC(i)) i += l;
	  }

	  if (tokens[i].type === TokenType.RightSquareBracket) i++;else return 0;

	  return i - start;
	}

	function getAttributeSelector1() {
	  var type = NodeType.AttributeSelectorType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  // Skip `[`.
	  pos++;

	  content = content.concat(getSC());
	  content.push(getAttributeName());
	  content = content.concat(getSC());
	  content.push(getAttributeMatch());
	  content = content.concat(getSC());
	  content.push(getAttributeValue());
	  content = content.concat(getSC());

	  if (checkAttributeFlags(pos)) {
	    content.push(getAttributeFlags());
	    content = content.concat(getSC());
	  }

	  // Skip `]`.
	  pos++;

	  var end = getLastPosition(content, line, column, 1);
	  return newNode(type, content, line, column, end);
	}

	/**
	 * (1) `[panda]`
	 */
	function checkAttributeSelector2(i) {
	  var start = i;

	  if (tokens[i].type === TokenType.LeftSquareBracket) i++;else return 0;

	  var l = void 0;
	  if (l = checkSC(i)) i += l;

	  if (l = checkAttributeName(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (tokens[i].type === TokenType.RightSquareBracket) i++;else return 0;

	  return i - start;
	}

	function getAttributeSelector2() {
	  var type = NodeType.AttributeSelectorType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  // Skip `[`.
	  pos++;

	  content = content.concat(getSC());
	  content.push(getAttributeName());
	  content = content.concat(getSC());

	  // Skip `]`.
	  pos++;

	  var end = getLastPosition(content, line, column, 1);
	  return newNode(type, content, line, column, end);
	}

	function checkAttributeName(i) {
	  var start = i;
	  var l = void 0;

	  if (l = checkNamePrefix(i)) i += l;

	  if (l = checkIdent(i)) i += l;else return 0;

	  return i - start;
	}

	function getAttributeName() {
	  var type = NodeType.AttributeNameType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  if (checkNamePrefix(pos)) content.push(getNamePrefix());
	  content.push(getIdent());

	  return newNode(type, content, line, column);
	}

	function checkAttributeMatch(i) {
	  var l = void 0;
	  if (l = checkAttributeMatch1(i)) tokens[i].attributeMatchType = 1;else if (l = checkAttributeMatch2(i)) tokens[i].attributeMatchType = 2;

	  return l;
	}

	function getAttributeMatch() {
	  var type = tokens[pos].attributeMatchType;
	  if (type === 1) return getAttributeMatch1();else return getAttributeMatch2();
	}

	function checkAttributeMatch1(i) {
	  var start = i;

	  var type = tokens[i].type;
	  if (type === TokenType.Tilde || type === TokenType.VerticalLine || type === TokenType.CircumflexAccent || type === TokenType.DollarSign || type === TokenType.Asterisk) i++;else return 0;

	  if (tokens[i].type === TokenType.EqualsSign) i++;else return 0;

	  return i - start;
	}

	function getAttributeMatch1() {
	  var type = NodeType.AttributeMatchType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = tokens[pos].value + tokens[pos + 1].value;
	  pos += 2;

	  return newNode(type, content, line, column);
	}

	function checkAttributeMatch2(i) {
	  if (tokens[i].type === TokenType.EqualsSign) return 1;else return 0;
	}

	function getAttributeMatch2() {
	  var type = NodeType.AttributeMatchType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = '=';

	  pos++;
	  return newNode(type, content, line, column);
	}

	function checkAttributeValue(i) {
	  return checkString(i) || checkIdent(i);
	}

	function getAttributeValue() {
	  var type = NodeType.AttributeValueType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  if (checkString(pos)) content.push(getString());else content.push(getIdent());

	  return newNode(type, content, line, column);
	}

	function checkAttributeFlags(i) {
	  return checkIdent(i);
	}

	function getAttributeFlags() {
	  var type = NodeType.AttributeFlagsType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [getIdent()];

	  return newNode(type, content, line, column);
	}

	function checkNamePrefix(i) {
	  if (i >= tokensLength) return 0;

	  var l = void 0;
	  if (l = checkNamePrefix1(i)) tokens[i].namePrefixType = 1;else if (l = checkNamePrefix2(i)) tokens[i].namePrefixType = 2;

	  return l;
	}

	function getNamePrefix() {
	  var type = tokens[pos].namePrefixType;
	  if (type === 1) return getNamePrefix1();else return getNamePrefix2();
	}

	/**
	 * (1) `panda|`
	 * (2) `panda<comment>|`
	 */
	function checkNamePrefix1(i) {
	  var start = i;
	  var l = void 0;

	  if (l = checkNamespacePrefix(i)) i += l;else return 0;

	  if (l = checkCommentML(i)) i += l;

	  if (l = checkNamespaceSeparator(i)) i += l;else return 0;

	  return i - start;
	}

	function getNamePrefix1() {
	  var type = NodeType.NamePrefixType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  content.push(getNamespacePrefix());

	  if (checkCommentML(pos)) content.push(getCommentML());

	  content.push(getNamespaceSeparator());

	  return newNode(type, content, line, column);
	}

	/**
	 * (1) `|`
	 */
	function checkNamePrefix2(i) {
	  return checkNamespaceSeparator(i);
	}

	function getNamePrefix2() {
	  var type = NodeType.NamePrefixType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [getNamespaceSeparator()];

	  return newNode(type, content, line, column);
	}

	/**
	 * (1) `*`
	 * (2) `panda`
	 */
	function checkNamespacePrefix(i) {
	  if (i >= tokensLength) return 0;

	  var l = void 0;

	  if (tokens[i].type === TokenType.Asterisk) return 1;else if (l = checkIdent(i)) return l;else return 0;
	}

	function getNamespacePrefix() {
	  var type = NodeType.NamespacePrefixType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  if (tokens[pos].type === TokenType.Asterisk) {
	    var asteriskNode = newNode(NodeType.IdentType, '*', line, column);
	    content.push(asteriskNode);
	    pos++;
	  } else if (checkIdent(pos)) content.push(getIdent());

	  return newNode(type, content, line, column);
	}

	/**
	 * (1) `|`
	 */
	function checkNamespaceSeparator(i) {
	  if (i >= tokensLength) return 0;

	  if (tokens[i].type !== TokenType.VerticalLine) return 0;

	  // Return false if `|=` - [attr|=value]
	  if (tokens[i + 1] && tokens[i + 1].type === TokenType.EqualsSign) return 0;

	  return 1;
	}

	function getNamespaceSeparator() {
	  var type = NodeType.NamespaceSeparatorType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = '|';

	  pos++;
	  return newNode(type, content, line, column);
	}

	module.exports = function (_tokens, context) {
	  tokens = _tokens;
	  tokensLength = tokens.length;
	  pos = 0;

	  return contexts[context]();
	};

/***/ },
/* 15 */
/***/ function(module, exports) {

	'use strict';

	module.exports = {
	  ArgumentsType: 'arguments',
	  AtkeywordType: 'atkeyword',
	  AtruleType: 'atrule',
	  AttributeSelectorType: 'attributeSelector',
	  AttributeNameType: 'attributeName',
	  AttributeFlagsType: 'attributeFlags',
	  AttributeMatchType: 'attributeMatch',
	  AttributeValueType: 'attributeValue',
	  BlockType: 'block',
	  BracketsType: 'brackets',
	  ClassType: 'class',
	  CombinatorType: 'combinator',
	  CommentMLType: 'multilineComment',
	  CommentSLType: 'singlelineComment',
	  ConditionType: 'condition',
	  ConditionalStatementType: 'conditionalStatement',
	  DeclarationType: 'declaration',
	  DeclDelimType: 'declarationDelimiter',
	  DefaultType: 'default',
	  DelimType: 'delimiter',
	  DimensionType: 'dimension',
	  EscapedStringType: 'escapedString',
	  ExtendType: 'extend',
	  ExpressionType: 'expression',
	  FunctionType: 'function',
	  GlobalType: 'global',
	  IdentType: 'ident',
	  ImportantType: 'important',
	  IncludeType: 'include',
	  InterpolationType: 'interpolation',
	  InterpolatedVariableType: 'interpolatedVariable',
	  KeyframesSelectorType: 'keyframesSelector',
	  LoopType: 'loop',
	  MixinType: 'mixin',
	  NamePrefixType: 'namePrefix',
	  NamespacePrefixType: 'namespacePrefix',
	  NamespaceSeparatorType: 'namespaceSeparator',
	  NumberType: 'number',
	  OperatorType: 'operator',
	  OptionalType: 'optional',
	  ParenthesesType: 'parentheses',
	  ParentSelectorType: 'parentSelector',
	  ParentSelectorExtensionType: 'parentSelectorExtension',
	  PercentageType: 'percentage',
	  PlaceholderType: 'placeholder',
	  ProgidType: 'progid',
	  PropertyType: 'property',
	  PropertyDelimType: 'propertyDelimiter',
	  PseudocType: 'pseudoClass',
	  PseudoeType: 'pseudoElement',
	  RawType: 'raw',
	  RulesetType: 'ruleset',
	  SType: 'space',
	  SelectorType: 'selector',
	  ShashType: 'id',
	  StringType: 'string',
	  StylesheetType: 'stylesheet',
	  TypeSelectorType: 'typeSelector',
	  UnicodeRangeType: 'unicodeRange',
	  UniversalSelectorType: 'universalSelector',
	  UriType: 'uri',
	  UrangeType: 'urange',
	  ValueType: 'value',
	  VariableType: 'variable',
	  VariablesListType: 'variablesList',
	  VhashType: 'color'
	};

/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = function (css, tabSize) {
	  var TokenType = __webpack_require__(13);

	  var tokens = [];
	  var urlMode = false;
	  var blockMode = 0;
	  var pos = 0;
	  var tn = 0;
	  var ln = 1;
	  var col = 1;
	  var cssLength = 0;

	  var Punctuation = {
	    ' ': TokenType.Space,
	    '\n': TokenType.Newline,
	    '\r': TokenType.Newline,
	    '\t': TokenType.Tab,
	    '!': TokenType.ExclamationMark,
	    '"': TokenType.QuotationMark,
	    '#': TokenType.NumberSign,
	    '$': TokenType.DollarSign,
	    '%': TokenType.PercentSign,
	    '&': TokenType.Ampersand,
	    '\'': TokenType.Apostrophe,
	    '(': TokenType.LeftParenthesis,
	    ')': TokenType.RightParenthesis,
	    '*': TokenType.Asterisk,
	    '+': TokenType.PlusSign,
	    ',': TokenType.Comma,
	    '-': TokenType.HyphenMinus,
	    '.': TokenType.FullStop,
	    '/': TokenType.Solidus,
	    ':': TokenType.Colon,
	    ';': TokenType.Semicolon,
	    '<': TokenType.LessThanSign,
	    '=': TokenType.EqualsSign,
	    '>': TokenType.GreaterThanSign,
	    '?': TokenType.QuestionMark,
	    '@': TokenType.CommercialAt,
	    '[': TokenType.LeftSquareBracket,
	    ']': TokenType.RightSquareBracket,
	    '^': TokenType.CircumflexAccent,
	    '_': TokenType.LowLine,
	    '{': TokenType.LeftCurlyBracket,
	    '|': TokenType.VerticalLine,
	    '}': TokenType.RightCurlyBracket,
	    '~': TokenType.Tilde
	  };

	  /**
	   * Add a token to the token list
	   * @param {string} type
	   * @param {string} value
	   */
	  function pushToken(type, value, column) {
	    tokens.push({
	      tn: tn++,
	      ln: ln,
	      col: column,
	      type: type,
	      value: value
	    });
	  }

	  /**
	   * Check if a character is a decimal digit
	   * @param {string} c Character
	   * @returns {boolean}
	   */
	  function isDecimalDigit(c) {
	    return '0123456789'.indexOf(c) >= 0;
	  }

	  /**
	   * Parse spaces
	   * @param {string} css Unparsed part of CSS string
	   */
	  function parseSpaces(css) {
	    var start = pos;

	    // Read the string until we meet a non-space character:
	    for (; pos < cssLength; pos++) {
	      if (css.charAt(pos) !== ' ') break;
	    }

	    // Add a substring containing only spaces to tokens:
	    pushToken(TokenType.Space, css.substring(start, pos--), col);
	    col += pos - start;
	  }

	  /**
	   * Parse a string within quotes
	   * @param {string} css Unparsed part of CSS string
	   * @param {string} q Quote (either `'` or `"`)
	   */
	  function parseString(css, q) {
	    var start = pos;

	    // Read the string until we meet a matching quote:
	    for (pos++; pos < cssLength; pos++) {
	      // Skip escaped quotes:
	      if (css.charAt(pos) === '\\') pos++;else if (css.charAt(pos) === q) break;
	    }

	    // Add the string (including quotes) to tokens:
	    pushToken(q === '"' ? TokenType.StringDQ : TokenType.StringSQ, css.substring(start, pos + 1), col);
	    col += pos - start;
	  }

	  /**
	   * Parse numbers
	   * @param {string} css Unparsed part of CSS string
	   */
	  function parseDecimalNumber(css) {
	    var start = pos;

	    // Read the string until we meet a character that's not a digit:
	    for (; pos < cssLength; pos++) {
	      if (!isDecimalDigit(css.charAt(pos))) break;
	    }

	    // Add the number to tokens:
	    pushToken(TokenType.DecimalNumber, css.substring(start, pos--), col);
	    col += pos - start;
	  }

	  /**
	   * Parse identifier
	   * @param {string} css Unparsed part of CSS string
	   */
	  function parseIdentifier(css) {
	    var start = pos;

	    // Skip all opening slashes:
	    while (css.charAt(pos) === '/') {
	      pos++;
	    } // Read the string until we meet a punctuation mark:
	    for (; pos < cssLength; pos++) {
	      // Skip all '\':
	      if (css.charAt(pos) === '\\') pos++;else if (Punctuation[css.charAt(pos)]) break;
	    }

	    var ident = css.substring(start, pos--);

	    // Enter url mode if parsed substring is `url`:
	    urlMode = urlMode || ident === 'url';

	    // Add identifier to tokens:
	    pushToken(TokenType.Identifier, ident, col);
	    col += pos - start;
	  }

	  /**
	  * Parse a multiline comment
	  * @param {string} css Unparsed part of CSS string
	  */
	  function parseMLComment(css) {
	    var start = pos;

	    // Read the string until we meet `*/`.
	    // Since we already know first 2 characters (`/*`), start reading
	    // from `pos + 2`:
	    for (pos = pos + 2; pos < cssLength; pos++) {
	      if (css.charAt(pos) === '*' && css.charAt(pos + 1) === '/') {
	        pos++;
	        break;
	      }
	    }

	    // Add full comment (including `/*` and `*/`) to the list of tokens:
	    var comment = css.substring(start, pos + 1);
	    pushToken(TokenType.CommentML, comment, col);

	    var newlines = comment.split('\n');
	    if (newlines.length > 1) {
	      ln += newlines.length - 1;
	      col = newlines[newlines.length - 1].length;
	    } else {
	      col += pos - start;
	    }
	  }

	  function parseSLComment(css) {
	    var start = pos;

	    // Read the string until we meet line break.
	    // Since we already know first 2 characters (`//`), start reading
	    // from `pos + 2`:
	    for (pos += 2; pos < cssLength; pos++) {
	      if (css.charAt(pos) === '\n' || css.charAt(pos) === '\r') {
	        break;
	      }
	    }

	    // Add comment (including `//` and line break) to the list of tokens:
	    pushToken(TokenType.CommentSL, css.substring(start, pos--), col);
	    col += pos - start;
	  }

	  /**
	   * Convert a CSS string to a list of tokens
	   * @param {string} css CSS string
	   * @returns {Array} List of tokens
	   * @private
	   */
	  function getTokens(css) {
	    var c; // Current character
	    var cn; // Next character

	    cssLength = css.length;

	    // Parse string, character by character:
	    for (pos = 0; pos < cssLength; col++, pos++) {
	      c = css.charAt(pos);
	      cn = css.charAt(pos + 1);

	      // If we meet `/*`, it's a start of a multiline comment.
	      // Parse following characters as a multiline comment:
	      if (c === '/' && cn === '*') {
	        parseMLComment(css);
	      }

	      // If we meet `//` and it is not a part of url:
	      else if (!urlMode && c === '/' && cn === '/') {
	          // If we're currently inside a block, treat `//` as a start
	          // of identifier. Else treat `//` as a start of a single-line
	          // comment:
	          if (blockMode > 0) parseIdentifier(css);else parseSLComment(css);
	        }

	        // If current character is a double or single quote, it's a start
	        // of a string:
	        else if (c === '"' || c === "'") {
	            parseString(css, c);
	          }

	          // If current character is a space:
	          else if (c === ' ') {
	              parseSpaces(css);
	            }

	            // If current character is a punctuation mark:
	            else if (Punctuation[c]) {
	                // Add it to the list of tokens:
	                pushToken(Punctuation[c], c, col);
	                if (c === '\n' || c === '\r') {
	                  ln++;
	                  col = 0;
	                } // Go to next line
	                else if (c === ')') urlMode = false; // Exit url mode
	                  else if (c === '{') blockMode++; // Enter a block
	                    else if (c === '}') blockMode--; // Exit a block
	                      else if (c === '\t' && tabSize > 1) col += tabSize - 1;
	              }

	              // If current character is a decimal digit:
	              else if (isDecimalDigit(c)) {
	                  parseDecimalNumber(css);
	                }

	                // If current character is anything else:
	                else {
	                    parseIdentifier(css);
	                  }
	    }

	    return tokens;
	  }

	  return getTokens(css);
	};

/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;
	exports.default = {
	  mark: __webpack_require__(18),
	  parse: __webpack_require__(19),
	  stringify: __webpack_require__(6),
	  tokenizer: __webpack_require__(20)
	};
	module.exports = exports['default'];

/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var TokenType = __webpack_require__(13);

	module.exports = function () {
	  /**
	  * Mark whitespaces and comments
	  */
	  function markSC(tokens) {
	    var tokensLength = tokens.length;
	    var ws = -1; // Flag for whitespaces
	    var sc = -1; // Flag for whitespaces and comments
	    var t = void 0; // Current token

	    // For every token in the token list, mark spaces and line breaks
	    // as spaces (set both `ws` and `sc` flags). Mark multiline comments
	    // with `sc` flag.
	    // If there are several spaces or tabs or line breaks or multiline
	    // comments in a row, group them: take the last one's index number
	    // and save it to the first token in the group as a reference:
	    // e.g., `ws_last = 7` for a group of whitespaces or `sc_last = 9`
	    // for a group of whitespaces and comments.
	    for (var i = 0; i < tokensLength; i++) {
	      t = tokens[i];
	      switch (t.type) {
	        case TokenType.Space:
	        case TokenType.Tab:
	        case TokenType.Newline:
	          t.ws = true;
	          t.sc = true;

	          if (ws === -1) ws = i;
	          if (sc === -1) sc = i;

	          break;
	        case TokenType.CommentML:
	        case TokenType.CommentSL:
	          if (ws !== -1) {
	            tokens[ws].ws_last = i - 1;
	            ws = -1;
	          }

	          t.sc = true;

	          break;
	        default:
	          if (ws !== -1) {
	            tokens[ws].ws_last = i - 1;
	            ws = -1;
	          }

	          if (sc !== -1) {
	            tokens[sc].sc_last = i - 1;
	            sc = -1;
	          }
	      }
	    }

	    if (ws !== -1) tokens[ws].ws_last = i - 1;
	    if (sc !== -1) tokens[sc].sc_last = i - 1;
	  }

	  /**
	  * Pair brackets
	  */
	  function markBrackets(tokens) {
	    var tokensLength = tokens.length;
	    var ps = []; // Parentheses
	    var sbs = []; // Square brackets
	    var cbs = []; // Curly brackets
	    var t = void 0; // Current token

	    // For every token in the token list, if we meet an opening (left)
	    // bracket, push its index number to a corresponding array.
	    // If we then meet a closing (right) bracket, look at the corresponding
	    // array. If there are any elements (records about previously met
	    // left brackets), take a token of the last left bracket (take
	    // the last index number from the array and find a token with
	    // this index number) and save right bracket's index as a reference:
	    for (var i = 0; i < tokensLength; i++) {
	      t = tokens[i];
	      switch (t.type) {
	        case TokenType.LeftParenthesis:
	          ps.push(i);
	          break;
	        case TokenType.RightParenthesis:
	          if (ps.length) {
	            t.left = ps.pop();
	            tokens[t.left].right = i;
	          }
	          break;
	        case TokenType.LeftSquareBracket:
	          sbs.push(i);
	          break;
	        case TokenType.RightSquareBracket:
	          if (sbs.length) {
	            t.left = sbs.pop();
	            tokens[t.left].right = i;
	          }
	          break;
	        case TokenType.LeftCurlyBracket:
	          cbs.push(i);
	          break;
	        case TokenType.RightCurlyBracket:
	          if (cbs.length) {
	            t.left = cbs.pop();
	            tokens[t.left].right = i;
	          }
	          break;
	      }
	    }
	  }

	  return function (tokens) {
	    markBrackets(tokens);
	    markSC(tokens);
	  };
	}();

/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Node = __webpack_require__(1);
	var NodeType = __webpack_require__(15);
	var TokenType = __webpack_require__(13);

	var tokens = void 0;
	var tokensLength = void 0;
	var pos = void 0;

	var contexts = {
	  'arguments': function _arguments() {
	    return checkArguments(pos) && getArguments();
	  },
	  'atkeyword': function atkeyword() {
	    return checkAtkeyword(pos) && getAtkeyword();
	  },
	  'atrule': function atrule() {
	    return checkAtrule(pos) && getAtrule();
	  },
	  'block': function block() {
	    return checkBlock(pos) && getBlock();
	  },
	  'brackets': function brackets() {
	    return checkBrackets(pos) && getBrackets();
	  },
	  'class': function _class() {
	    return checkClass(pos) && getClass();
	  },
	  'combinator': function combinator() {
	    return checkCombinator(pos) && getCombinator();
	  },
	  'commentML': function commentML() {
	    return checkCommentML(pos) && getCommentML();
	  },
	  'commentSL': function commentSL() {
	    return checkCommentSL(pos) && getCommentSL();
	  },
	  'condition': function condition() {
	    return checkCondition(pos) && getCondition();
	  },
	  'conditionalStatement': function conditionalStatement() {
	    return checkConditionalStatement(pos) && getConditionalStatement();
	  },
	  'declaration': function declaration() {
	    return checkDeclaration(pos) && getDeclaration();
	  },
	  'declDelim': function declDelim() {
	    return checkDeclDelim(pos) && getDeclDelim();
	  },
	  'default': function _default() {
	    return checkDefault(pos) && getDefault();
	  },
	  'delim': function delim() {
	    return checkDelim(pos) && getDelim();
	  },
	  'dimension': function dimension() {
	    return checkDimension(pos) && getDimension();
	  },
	  'expression': function expression() {
	    return checkExpression(pos) && getExpression();
	  },
	  'extend': function extend() {
	    return checkExtend(pos) && getExtend();
	  },
	  'function': function _function() {
	    return checkFunction(pos) && getFunction();
	  },
	  'global': function global() {
	    return checkGlobal(pos) && getGlobal();
	  },
	  'ident': function ident() {
	    return checkIdent(pos) && getIdent();
	  },
	  'important': function important() {
	    return checkImportant(pos) && getImportant();
	  },
	  'include': function include() {
	    return checkInclude(pos) && getInclude();
	  },
	  'interpolation': function interpolation() {
	    return checkInterpolation(pos) && getInterpolation();
	  },
	  'loop': function loop() {
	    return checkLoop(pos) && getLoop();
	  },
	  'mixin': function mixin() {
	    return checkMixin(pos) && getMixin();
	  },
	  'namespace': function namespace() {
	    return checkNamespace(pos) && getNamespace();
	  },
	  'number': function number() {
	    return checkNumber(pos) && getNumber();
	  },
	  'operator': function operator() {
	    return checkOperator(pos) && getOperator();
	  },
	  'optional': function optional() {
	    return checkOptional(pos) && getOptional();
	  },
	  'parentheses': function parentheses() {
	    return checkParentheses(pos) && getParentheses();
	  },
	  'parentselector': function parentselector() {
	    return checkParentSelector(pos) && getParentSelector();
	  },
	  'percentage': function percentage() {
	    return checkPercentage(pos) && getPercentage();
	  },
	  'placeholder': function placeholder() {
	    return checkPlaceholder(pos) && getPlaceholder();
	  },
	  'progid': function progid() {
	    return checkProgid(pos) && getProgid();
	  },
	  'property': function property() {
	    return checkProperty(pos) && getProperty();
	  },
	  'propertyDelim': function propertyDelim() {
	    return checkPropertyDelim(pos) && getPropertyDelim();
	  },
	  'pseudoc': function pseudoc() {
	    return checkPseudoc(pos) && getPseudoc();
	  },
	  'pseudoe': function pseudoe() {
	    return checkPseudoe(pos) && getPseudoe();
	  },
	  'ruleset': function ruleset() {
	    return checkRuleset(pos) && getRuleset();
	  },
	  's': function s() {
	    return checkS(pos) && getS();
	  },
	  'selector': function selector() {
	    return checkSelector(pos) && getSelector();
	  },
	  'shash': function shash() {
	    return checkShash(pos) && getShash();
	  },
	  'string': function string() {
	    return checkString(pos) && getString();
	  },
	  'stylesheet': function stylesheet() {
	    return checkStylesheet(pos) && getStylesheet();
	  },
	  'typeSelector': function typeSelector() {
	    return checkTypeSelector(pos) && getTypeSelector();
	  },
	  'unary': function unary() {
	    return checkUnary(pos) && getUnary();
	  },
	  'unicodeRange': function unicodeRange() {
	    return checkUnicodeRange(pos) && getUnicodeRange();
	  },
	  'universalSelector': function universalSelector() {
	    return checkUniversalSelector(pos) && getUniversalSelector();
	  },
	  'urange': function urange() {
	    return checkUrange(pos) && getUrange();
	  },
	  'uri': function uri() {
	    return checkUri(pos) && getUri();
	  },
	  'value': function value() {
	    return checkValue(pos) && getValue();
	  },
	  'variable': function variable() {
	    return checkVariable(pos) && getVariable();
	  },
	  'variableslist': function variableslist() {
	    return checkVariablesList(pos) && getVariablesList();
	  },
	  'vhash': function vhash() {
	    return checkVhash(pos) && getVhash();
	  }
	};

	/**
	 * Stop parsing and display error
	 * @param {Number=} i Token's index number
	 */
	function throwError(i) {
	  var ln = i ? tokens[i].ln : tokens[pos].ln;

	  throw { line: ln, syntax: 'scss' };
	}

	/**
	 * @param {Number} start
	 * @param {Number} finish
	 * @returns {String}
	 */
	function joinValues(start, finish) {
	  var s = '';

	  for (var i = start; i < finish + 1; i++) {
	    s += tokens[i].value;
	  }

	  return s;
	}

	/**
	 * @param {Number} start
	 * @param {Number} num
	 * @returns {String}
	 */
	function joinValues2(start, num) {
	  if (start + num - 1 >= tokensLength) return;

	  var s = '';

	  for (var i = 0; i < num; i++) {
	    s += tokens[start + i].value;
	  }

	  return s;
	}

	function getLastPosition(content, line, column, colOffset) {
	  return typeof content === 'string' ? getLastPositionForString(content, line, column, colOffset) : getLastPositionForArray(content, line, column, colOffset);
	}

	function getLastPositionForString(content, line, column, colOffset) {
	  var position = [];

	  if (!content) {
	    position = [line, column];
	    if (colOffset) position[1] += colOffset - 1;
	    return position;
	  }

	  var lastLinebreak = content.lastIndexOf('\n');
	  var endsWithLinebreak = lastLinebreak === content.length - 1;
	  var splitContent = content.split('\n');
	  var linebreaksCount = splitContent.length - 1;
	  var prevLinebreak = linebreaksCount === 0 || linebreaksCount === 1 ? -1 : content.length - splitContent[linebreaksCount - 1].length - 2;

	  // Line:
	  var offset = endsWithLinebreak ? linebreaksCount - 1 : linebreaksCount;
	  position[0] = line + offset;

	  // Column:
	  if (endsWithLinebreak) {
	    offset = prevLinebreak !== -1 ? content.length - prevLinebreak : content.length - 1;
	  } else {
	    offset = linebreaksCount !== 0 ? content.length - lastLinebreak - column - 1 : content.length - 1;
	  }
	  position[1] = column + offset;

	  if (!colOffset) return position;

	  if (endsWithLinebreak) {
	    position[0]++;
	    position[1] = colOffset;
	  } else {
	    position[1] += colOffset;
	  }

	  return position;
	}

	function getLastPositionForArray(content, line, column, colOffset) {
	  var position;

	  if (content.length === 0) {
	    position = [line, column];
	  } else {
	    var c = content[content.length - 1];
	    if (c.hasOwnProperty('end')) {
	      position = [c.end.line, c.end.column];
	    } else {
	      position = getLastPosition(c.content, line, column);
	    }
	  }

	  if (!colOffset) return position;

	  if (tokens[pos - 1] && tokens[pos - 1].type !== 'Newline') {
	    position[1] += colOffset;
	  } else {
	    position[0]++;
	    position[1] = 1;
	  }

	  return position;
	}

	function newNode(type, content, line, column, end) {
	  if (!end) end = getLastPosition(content, line, column);
	  return new Node({
	    type: type,
	    content: content,
	    start: {
	      line: line,
	      column: column
	    },
	    end: {
	      line: end[0],
	      column: end[1]
	    },
	    syntax: 'scss'
	  });
	}

	/**
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkAny(i) {
	  var l = void 0;

	  if (l = checkBrackets(i)) tokens[i].any_type = 1;else if (l = checkParentheses(i)) tokens[i].any_type = 2;else if (l = checkString(i)) tokens[i].any_type = 3;else if (l = checkVariablesList(i)) tokens[i].any_type = 4;else if (l = checkVariable(i)) tokens[i].any_type = 5;else if (l = checkPlaceholder(i)) tokens[i].any_type = 6;else if (l = checkPercentage(i)) tokens[i].any_type = 7;else if (l = checkDimension(i)) tokens[i].any_type = 8;else if (l = checkUnicodeRange(i)) tokens[i].any_type = 9;else if (l = checkNumber(i)) tokens[i].any_type = 10;else if (l = checkUri(i)) tokens[i].any_type = 11;else if (l = checkExpression(i)) tokens[i].any_type = 12;else if (l = checkFunction(i)) tokens[i].any_type = 13;else if (l = checkInterpolation(i)) tokens[i].any_type = 14;else if (l = checkIdent(i)) tokens[i].any_type = 15;else if (l = checkClass(i)) tokens[i].any_type = 16;else if (l = checkUnary(i)) tokens[i].any_type = 17;

	  return l;
	}

	/**
	 * @returns {Array}
	 */
	function getAny() {
	  var type = tokens[pos].any_type;

	  if (type === 1) return getBrackets();
	  if (type === 2) return getParentheses();
	  if (type === 3) return getString();
	  if (type === 4) return getVariablesList();
	  if (type === 5) return getVariable();
	  if (type === 6) return getPlaceholder();
	  if (type === 7) return getPercentage();
	  if (type === 8) return getDimension();
	  if (type === 9) return getUnicodeRange();
	  if (type === 10) return getNumber();
	  if (type === 11) return getUri();
	  if (type === 12) return getExpression();
	  if (type === 13) return getFunction();
	  if (type === 14) return getInterpolation();
	  if (type === 15) return getIdent();
	  if (type === 16) return getClass();
	  if (type === 17) return getUnary();
	}

	/**
	 * Check if token is part of mixin's arguments.
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of arguments
	 */
	function checkArguments(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength || tokens[i].type !== TokenType.LeftParenthesis) return 0;

	  i++;

	  while (i < tokens[start].right) {
	    if (l = checkArgument(i)) i += l;else return 0;
	  }

	  return tokens[start].right - start + 1;
	}

	/**
	 * Check if token is valid to be part of arguments list
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of argument
	 */
	function checkArgument(i) {
	  return checkBrackets(i) || checkParentheses(i) || checkSingleValueDeclaration(i) || checkFunction(i) || checkVariablesList(i) || checkVariable(i) || checkSC(i) || checkDelim(i) || checkDeclDelim(i) || checkString(i) || checkPercentage(i) || checkDimension(i) || checkNumber(i) || checkUri(i) || checkInterpolation(i) || checkIdent(i) || checkVhash(i) || checkOperator(i) || checkUnary(i) || checkImportant(i) || checkGlobal(i) || checkDefault(i) || checkOptional(i) || checkParentSelector(i);
	}

	/**
	 * @returns {Array} Node that is part of arguments list
	 */
	function getArgument() {
	  if (checkBrackets(pos)) return getBrackets();else if (checkParentheses(pos)) return getParentheses();else if (checkSingleValueDeclaration(pos)) return getSingleValueDeclaration();else if (checkFunction(pos)) return getFunction();else if (checkVariablesList(pos)) return getVariablesList();else if (checkVariable(pos)) return getVariable();else if (checkSC(pos)) return getSC();else if (checkDelim(pos)) return getDelim();else if (checkDeclDelim(pos)) return getDeclDelim();else if (checkString(pos)) return getString();else if (checkPercentage(pos)) return getPercentage();else if (checkDimension(pos)) return getDimension();else if (checkNumber(pos)) return getNumber();else if (checkUri(pos)) return getUri();else if (checkInterpolation(pos)) return getInterpolation();else if (checkIdent(pos)) return getIdent();else if (checkVhash(pos)) return getVhash();else if (checkOperator(pos)) return getOperator();else if (checkUnary(pos)) return getUnary();else if (checkImportant(pos)) return getImportant();else if (checkGlobal(pos)) return getGlobal();else if (checkDefault(pos)) return getDefault();else if (checkOptional(pos)) return getOptional();else if (checkParentSelector(pos)) return getParentSelector();
	}

	/**
	 * Check if token is part of an @-word (e.g. `@import`, `@include`)
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkAtkeyword(i) {
	  var l;

	  // Check that token is `@`:
	  if (i >= tokensLength || tokens[i++].type !== TokenType.CommercialAt) return 0;

	  return (l = checkIdentOrInterpolation(i)) ? l + 1 : 0;
	}

	/**
	 * Get node with @-word
	 * @returns {Array} `['atkeyword', ['ident', x]]` where `x` is
	 *      an identifier without
	 *      `@` (e.g. `import`, `include`)
	 */
	function getAtkeyword() {
	  var startPos = pos;
	  var x = void 0;

	  pos++;

	  x = getIdentOrInterpolation();

	  var token = tokens[startPos];
	  return newNode(NodeType.AtkeywordType, x, token.ln, token.col);
	}

	/**
	 * Check if token is a part of an @-rule
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of @-rule
	 */
	function checkAtrule(i) {
	  var l;

	  if (i >= tokensLength) return 0;

	  // If token already has a record of being part of an @-rule,
	  // return the @-rule's length:
	  if (tokens[i].atrule_l !== undefined) return tokens[i].atrule_l;

	  // If token is part of an @-rule, save the rule's type to token.
	  // @keyframes:
	  if (l = checkKeyframesRule(i)) tokens[i].atrule_type = 4;
	  // @-rule with ruleset:
	  else if (l = checkAtruler(i)) tokens[i].atrule_type = 1;
	    // Block @-rule:
	    else if (l = checkAtruleb(i)) tokens[i].atrule_type = 2;
	      // Single-line @-rule:
	      else if (l = checkAtrules(i)) tokens[i].atrule_type = 3;else return 0;

	  // If token is part of an @-rule, save the rule's length to token:
	  tokens[i].atrule_l = l;

	  return l;
	}

	/**
	 * Get node with @-rule
	 * @returns {Array}
	 */
	function getAtrule() {
	  switch (tokens[pos].atrule_type) {
	    case 1:
	      return getAtruler(); // @-rule with ruleset
	    case 2:
	      return getAtruleb(); // Block @-rule
	    case 3:
	      return getAtrules(); // Single-line @-rule
	    case 4:
	      return getKeyframesRule();
	  }
	}

	/**
	 * Check if token is part of a block @-rule
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of the @-rule
	 */
	function checkAtruleb(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkAtkeyword(i)) i += l;else return 0;

	  if (l = checkTsets(i)) i += l;

	  if (l = checkBlock(i)) i += l;else return 0;

	  return i - start;
	}

	/**
	 * Get node with a block @-rule
	 * @returns {Array} `['atruleb', ['atkeyword', x], y, ['block', z]]`
	 */
	function getAtruleb() {
	  var startPos = pos;
	  var x = void 0;

	  x = [getAtkeyword()].concat(getTsets()).concat([getBlock()]);

	  var token = tokens[startPos];
	  return newNode(NodeType.AtruleType, x, token.ln, token.col);
	}

	/**
	 * Check if token is part of an @-rule with ruleset
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of the @-rule
	 */
	function checkAtruler(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkAtkeyword(i)) i += l;else return 0;

	  if (l = checkTsets(i)) i += l;

	  if (i < tokensLength && tokens[i].type === TokenType.LeftCurlyBracket) i++;else return 0;

	  if (l = checkAtrulers(i)) i += l;

	  if (i < tokensLength && tokens[i].type === TokenType.RightCurlyBracket) i++;else return 0;

	  return i - start;
	}

	/**
	 * Get node with an @-rule with ruleset
	 * @returns {Array} ['atruler', ['atkeyword', x], y, z]
	 */
	function getAtruler() {
	  var startPos = pos;
	  var x = void 0;

	  x = [getAtkeyword()].concat(getTsets());

	  x.push(getAtrulers());

	  var token = tokens[startPos];
	  return newNode(NodeType.AtruleType, x, token.ln, token.col);
	}

	/**
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkAtrulers(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  while (l = checkRuleset(i) || checkAtrule(i) || checkSC(i)) {
	    i += l;
	  }

	  if (i < tokensLength) tokens[i].atrulers_end = 1;

	  return i - start;
	}

	/**
	 * @returns {Array} `['atrulers', x]`
	 */
	function getAtrulers() {
	  var startPos = pos;
	  var x = void 0;
	  var token = tokens[startPos];
	  var line = token.ln;
	  var column = token.col;
	  pos++;

	  x = getSC();

	  while (!tokens[pos].atrulers_end) {
	    if (checkSC(pos)) x = x.concat(getSC());else if (checkAtrule(pos)) x.push(getAtrule());else if (checkRuleset(pos)) x.push(getRuleset());
	  }

	  x = x.concat(getSC());

	  var end = getLastPosition(x, line, column, 1);
	  pos++;

	  return newNode(NodeType.BlockType, x, token.ln, token.col, end);
	}

	/**
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkAtrules(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkAtkeyword(i)) i += l;else return 0;

	  if (l = checkTsets(i)) i += l;

	  return i - start;
	}

	/**
	 * @returns {Array} `['atrules', ['atkeyword', x], y]`
	 */
	function getAtrules() {
	  var startPos = pos;
	  var x = void 0;

	  x = [getAtkeyword()].concat(getTsets());

	  var token = tokens[startPos];
	  return newNode(NodeType.AtruleType, x, token.ln, token.col);
	}

	/**
	 * Check if token is part of a block (e.g. `{...}`).
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of the block
	 */
	function checkBlock(i) {
	  return i < tokensLength && tokens[i].type === TokenType.LeftCurlyBracket ? tokens[i].right - i + 1 : 0;
	}

	/**
	 * Get node with a block
	 * @returns {Array} `['block', x]`
	 */
	function getBlock() {
	  var startPos = pos;
	  var end = tokens[pos].right;
	  var x = [];
	  var token = tokens[startPos];
	  var line = token.ln;
	  var column = token.col;

	  pos++;

	  while (pos < end) {
	    if (checkBlockdecl(pos)) x = x.concat(getBlockdecl());else throwError();
	  }

	  var end_ = getLastPosition(x, line, column, 1);
	  pos = end + 1;

	  return newNode(NodeType.BlockType, x, token.ln, token.col, end_);
	}

	/**
	 * Check if token is part of a declaration (property-value pair)
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of the declaration
	 */
	function checkBlockdecl(i) {
	  var l;

	  if (i >= tokensLength) return 0;

	  if (l = checkBlockdecl1(i)) tokens[i].bd_type = 1;else if (l = checkBlockdecl2(i)) tokens[i].bd_type = 2;else if (l = checkBlockdecl3(i)) tokens[i].bd_type = 3;else if (l = checkBlockdecl4(i)) tokens[i].bd_type = 4;else return 0;

	  return l;
	}

	/**
	 * @returns {Array}
	 */
	function getBlockdecl() {
	  switch (tokens[pos].bd_type) {
	    case 1:
	      return getBlockdecl1();
	    case 2:
	      return getBlockdecl2();
	    case 3:
	      return getBlockdecl3();
	    case 4:
	      return getBlockdecl4();
	  }
	}

	/**
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkBlockdecl1(i) {
	  var start = i;
	  var l = void 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkConditionalStatement(i)) tokens[i].bd_kind = 1;else if (l = checkInclude(i)) tokens[i].bd_kind = 2;else if (l = checkExtend(i)) tokens[i].bd_kind = 4;else if (l = checkLoop(i)) tokens[i].bd_kind = 3;else if (l = checkAtrule(i)) tokens[i].bd_kind = 6;else if (l = checkRuleset(i)) tokens[i].bd_kind = 7;else if (l = checkDeclaration(i)) tokens[i].bd_kind = 5;else return 0;

	  i += l;

	  if (i < tokensLength && (l = checkDeclDelim(i))) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  return i - start;
	}

	/**
	 * @returns {Array}
	 */
	function getBlockdecl1() {
	  var sc = getSC();
	  var x = void 0;

	  switch (tokens[pos].bd_kind) {
	    case 1:
	      x = getConditionalStatement();
	      break;
	    case 2:
	      x = getInclude();
	      break;
	    case 3:
	      x = getLoop();
	      break;
	    case 4:
	      x = getExtend();
	      break;
	    case 5:
	      x = getDeclaration();
	      break;
	    case 6:
	      x = getAtrule();
	      break;
	    case 7:
	      x = getRuleset();
	      break;
	  }

	  return sc.concat([x]).concat([getDeclDelim()]).concat(getSC());
	}

	/**
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkBlockdecl2(i) {
	  var start = i;
	  var l = void 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkConditionalStatement(i)) tokens[i].bd_kind = 1;else if (l = checkInclude(i)) tokens[i].bd_kind = 2;else if (l = checkExtend(i)) tokens[i].bd_kind = 4;else if (l = checkMixin(i)) tokens[i].bd_kind = 8;else if (l = checkLoop(i)) tokens[i].bd_kind = 3;else if (l = checkAtrule(i)) tokens[i].bd_kind = 6;else if (l = checkRuleset(i)) tokens[i].bd_kind = 7;else if (l = checkDeclaration(i)) tokens[i].bd_kind = 5;else return 0;

	  i += l;

	  if (l = checkSC(i)) i += l;

	  return i - start;
	}

	/**
	 * @returns {Array}
	 */
	function getBlockdecl2() {
	  var sc = getSC();
	  var x = void 0;

	  switch (tokens[pos].bd_kind) {
	    case 1:
	      x = getConditionalStatement();
	      break;
	    case 2:
	      x = getInclude();
	      break;
	    case 3:
	      x = getLoop();
	      break;
	    case 4:
	      x = getExtend();
	      break;
	    case 5:
	      x = getDeclaration();
	      break;
	    case 6:
	      x = getAtrule();
	      break;
	    case 7:
	      x = getRuleset();
	      break;
	    case 8:
	      x = getMixin();
	      break;
	  }

	  return sc.concat([x]).concat(getSC());
	}

	/**
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkBlockdecl3(i) {
	  var start = i;
	  var l = void 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkDeclDelim(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  return i - start;
	}

	/**
	 * @returns {Array} `[s0, ['declDelim'], s1]` where `s0` and `s1` are
	 *      are optional whitespaces.
	 */
	function getBlockdecl3() {
	  return getSC().concat([getDeclDelim()]).concat(getSC());
	}

	/**
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkBlockdecl4(i) {
	  return checkSC(i);
	}

	/**
	 * @returns {Array}
	 */
	function getBlockdecl4() {
	  return getSC();
	}

	/**
	 * Check if token is part of text inside square brackets, e.g. `[1]`
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkBrackets(i) {
	  if (i >= tokensLength) return 0;

	  var start = i;

	  if (tokens[i].type === TokenType.LeftSquareBracket) i++;else return 0;

	  if (i < tokens[start].right) {
	    var l = checkTsets(i);
	    if (l) i += l;else return 0;
	  }

	  i++;

	  return i - start;
	}

	/**
	 * Get node with text inside parentheses or square brackets (e.g. `(1)`)
	 * @return {Node}
	 */
	function getBrackets() {
	  var startPos = pos;
	  var token = tokens[startPos];
	  var line = token.ln;
	  var column = token.col;
	  var tsets = [];
	  var right = token.right;

	  pos++;

	  if (pos < right) {
	    tsets = getTsets();
	  }

	  var end = getLastPosition(tsets, line, column, 1);
	  pos++;

	  return newNode(NodeType.BracketsType, tsets, token.ln, token.col, end);
	}

	/**
	 * Check if token is part of a class selector (e.g. `.abc`)
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of the class selector
	 */
	function checkClass(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (tokens[i].class_l) return tokens[i].class_l;

	  if (tokens[i++].type !== TokenType.FullStop) return 0;

	  if (l = checkIdentOrInterpolation(i)) i += l;else return 0;

	  while (i < tokensLength) {
	    if (l = checkIdentOrInterpolation(i)) i += l;else break;
	  }

	  tokens[start].classEnd = i;

	  return i - start;
	}

	/**
	 * Get node with a class selector
	 * @returns {Array} `['class', ['ident', x]]` where x is a class's
	 *      identifier (without `.`, e.g. `abc`).
	 */
	function getClass() {
	  var startPos = pos;
	  var type = NodeType.ClassType;
	  var token = tokens[startPos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];
	  var end = token.classEnd;

	  // Skip `.`
	  pos++;

	  while (pos < end) {
	    if (checkIdentOrInterpolation(pos)) {
	      content = content.concat(getIdentOrInterpolation());
	    } else break;
	  }

	  return newNode(type, content, line, column);
	}

	function checkCombinator(i) {
	  if (i >= tokensLength) return 0;

	  var l = void 0;
	  if (l = checkCombinator1(i)) tokens[i].combinatorType = 1;else if (l = checkCombinator2(i)) tokens[i].combinatorType = 2;else if (l = checkCombinator3(i)) tokens[i].combinatorType = 3;

	  return l;
	}

	function getCombinator() {
	  var type = tokens[pos].combinatorType;
	  if (type === 1) return getCombinator1();
	  if (type === 2) return getCombinator2();
	  if (type === 3) return getCombinator3();
	}
	/**
	 * (1) `||`
	 */
	function checkCombinator1(i) {
	  if (tokens[i].type === TokenType.VerticalLine && tokens[i + 1].type === TokenType.VerticalLine) return 2;else return 0;
	}

	function getCombinator1() {
	  var type = NodeType.CombinatorType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = '||';

	  pos += 2;
	  return newNode(type, content, line, column);
	}

	/**
	 * (1) `>`
	 * (2) `+`
	 * (3) `~`
	 */
	function checkCombinator2(i) {
	  var type = tokens[i].type;
	  if (type === TokenType.PlusSign || type === TokenType.GreaterThanSign || type === TokenType.Tilde) return 1;else return 0;
	}

	function getCombinator2() {
	  var type = NodeType.CombinatorType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = tokens[pos++].value;

	  return newNode(type, content, line, column);
	}

	/**
	 * (1) `/panda/`
	 */
	function checkCombinator3(i) {
	  var start = i;

	  if (tokens[i].type === TokenType.Solidus) i++;else return 0;

	  var l = void 0;
	  if (l = checkIdent(i)) i += l;else return 0;

	  if (tokens[i].type === TokenType.Solidus) i++;else return 0;

	  return i - start;
	}

	function getCombinator3() {
	  var type = NodeType.CombinatorType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;

	  // Skip `/`.
	  pos++;
	  var ident = getIdent();

	  // Skip `/`.
	  pos++;

	  var content = '/' + ident.content + '/';

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is a multiline comment.
	 * @param {Number} i Token's index number
	 * @returns {Number} `1` if token is a multiline comment, otherwise `0`
	 */
	function checkCommentML(i) {
	  return i < tokensLength && tokens[i].type === TokenType.CommentML ? 1 : 0;
	}

	/**
	 * Get node with a multiline comment
	 * @returns {Array} `['commentML', x]` where `x`
	 *      is the comment's text (without `/*` and `* /`).
	 */
	function getCommentML() {
	  var startPos = pos;
	  var s = tokens[pos].value.substring(2);
	  var l = s.length;
	  var token = tokens[startPos];
	  var line = token.ln;
	  var column = token.col;

	  if (s.charAt(l - 2) === '*' && s.charAt(l - 1) === '/') s = s.substring(0, l - 2);

	  var end = getLastPosition(s, line, column, 2);
	  if (end[0] === line) end[1] += 2;
	  pos++;

	  return newNode(NodeType.CommentMLType, s, token.ln, token.col, end);
	}

	/**
	 * Check if token is part of a single-line comment.
	 * @param {Number} i Token's index number
	 * @returns {Number} `1` if token is a single-line comment, otherwise `0`
	 */
	function checkCommentSL(i) {
	  return i < tokensLength && tokens[i].type === TokenType.CommentSL ? 1 : 0;
	}

	/**
	 * Get node with a single-line comment.
	 * @returns {Array} `['commentSL', x]` where `x` is comment's message
	 *      (without `//`)
	 */
	function getCommentSL() {
	  var startPos = pos;
	  var x = void 0;
	  var token = tokens[startPos];
	  var line = token.ln;
	  var column = token.col;

	  x = tokens[pos++].value.substring(2);
	  var end = getLastPosition(x, line, column + 2);

	  return newNode(NodeType.CommentSLType, x, token.ln, token.col, end);
	}

	/**
	 * Check if token is part of a condition
	 * (e.g. `@if ...`, `@else if ...` or `@else ...`).
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of the condition
	 */
	function checkCondition(i) {
	  var start = i;
	  var l = void 0;
	  var _i = void 0;
	  var s = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkAtkeyword(i)) i += l;else return 0;

	  if (['if', 'else'].indexOf(tokens[start + 1].value) < 0) return 0;

	  while (i < tokensLength) {
	    if (l = checkBlock(i)) break;

	    s = checkSC(i);
	    _i = i + s;

	    if (l = _checkCondition(_i)) i += l + s;else break;
	  }

	  return i - start;
	}

	function _checkCondition(i) {
	  return checkVariable(i) || checkNumber(i) || checkInterpolation(i) || checkIdent(i) || checkOperator(i) || checkCombinator(i) || checkString(i);
	}

	/**
	 * Get node with a condition.
	 * @returns {Array} `['condition', x]`
	 */
	function getCondition() {
	  var startPos = pos;
	  var x = [];
	  var s;
	  var _pos;

	  x.push(getAtkeyword());

	  while (pos < tokensLength) {
	    if (checkBlock(pos)) break;

	    s = checkSC(pos);
	    _pos = pos + s;

	    if (!_checkCondition(_pos)) break;

	    if (s) x = x.concat(getSC());
	    x.push(_getCondition());
	  }

	  var token = tokens[startPos];
	  return newNode(NodeType.ConditionType, x, token.ln, token.col);
	}

	function _getCondition() {
	  if (checkVariable(pos)) return getVariable();
	  if (checkNumber(pos)) return getNumber();
	  if (checkInterpolation(pos)) return getInterpolation();
	  if (checkIdent(pos)) return getIdent();
	  if (checkOperator(pos)) return getOperator();
	  if (checkCombinator(pos)) return getCombinator();
	  if (checkString(pos)) return getString();
	}

	/**
	 * Check if token is part of a conditional statement
	 * (e.g. `@if ... {} @else if ... {} @else ... {}`).
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of the condition
	 */
	function checkConditionalStatement(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkCondition(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkBlock(i)) i += l;else return 0;

	  return i - start;
	}

	/**
	 * Get node with a condition.
	 * @returns {Array} `['condition', x]`
	 */
	function getConditionalStatement() {
	  var startPos = pos;
	  var x = [];

	  x.push(getCondition());
	  x = x.concat(getSC());
	  x.push(getBlock());

	  var token = tokens[startPos];
	  return newNode(NodeType.ConditionalStatementType, x, token.ln, token.col);
	}

	/**
	 * Check if token is part of a declaration (property-value pair)
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of the declaration
	 */
	function checkDeclaration(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkProperty(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkPropertyDelim(i)) i++;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkValue(i)) i += l;else return 0;

	  return i - start;
	}

	/**
	 * Get node with a declaration
	 * @returns {Array} `['declaration', ['property', x], ['propertyDelim'],
	 *       ['value', y]]`
	 */
	function getDeclaration() {
	  var startPos = pos;
	  var x = [];

	  x.push(getProperty());
	  x = x.concat(getSC());
	  x.push(getPropertyDelim());
	  x = x.concat(getSC());
	  x.push(getValue());

	  var token = tokens[startPos];
	  return newNode(NodeType.DeclarationType, x, token.ln, token.col);
	}

	/**
	 * @param {number} i Token's index number
	 * @returns {number} Length of the declaration
	 */
	function checkSingleValueDeclaration(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkProperty(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkPropertyDelim(i)) i++;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkSingleValue(i)) i += l;else return 0;

	  return i - start;
	}

	/**
	 * Get node with a declaration
	 * @returns {Array} `['declaration', ['property', x], ['propertyDelim'],
	 *       ['value', y]]`
	 */
	function getSingleValueDeclaration() {
	  var startPos = pos;
	  var x = [];

	  x.push(getProperty());
	  x = x.concat(getSC());
	  x.push(getPropertyDelim());
	  x = x.concat(getSC());
	  x.push(getSingleValue());

	  var token = tokens[startPos];
	  return newNode(NodeType.DeclarationType, x, token.ln, token.col);
	}

	/**
	 * Check if token is a semicolon
	 * @param {Number} i Token's index number
	 * @returns {Number} `1` if token is a semicolon, otherwise `0`
	 */
	function checkDeclDelim(i) {
	  return i < tokensLength && tokens[i].type === TokenType.Semicolon ? 1 : 0;
	}

	/**
	 * Get node with a semicolon
	 * @returns {Array} `['declDelim']`
	 */
	function getDeclDelim() {
	  var startPos = pos++;

	  var token = tokens[startPos];
	  return newNode(NodeType.DeclDelimType, ';', token.ln, token.col);
	}

	/**
	 * Check if token if part of `!default` word.
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of the `!default` word
	 */
	function checkDefault(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength || tokens[i++].type !== TokenType.ExclamationMark) return 0;

	  if (l = checkSC(i)) i += l;

	  if (tokens[i].value === 'default') {
	    tokens[start].defaultEnd = i;
	    return i - start + 1;
	  } else {
	    return 0;
	  }
	}

	/**
	 * Get node with a `!default` word
	 * @returns {Array} `['default', sc]` where `sc` is optional whitespace
	 */
	function getDefault() {
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = joinValues(pos, token.defaultEnd);

	  pos = token.defaultEnd + 1;

	  return newNode(NodeType.DefaultType, content, line, column);
	}

	/**
	 * Check if token is a comma
	 * @param {Number} i Token's index number
	 * @returns {Number} `1` if token is a comma, otherwise `0`
	 */
	function checkDelim(i) {
	  return i < tokensLength && tokens[i].type === TokenType.Comma ? 1 : 0;
	}

	/**
	 * Get node with a comma
	 * @returns {Array} `['delim']`
	 */
	function getDelim() {
	  var startPos = pos;

	  pos++;

	  var token = tokens[startPos];
	  return newNode(NodeType.DelimType, ',', token.ln, token.col);
	}

	/**
	 * Check if token is part of a number with dimension unit (e.g. `10px`)
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkDimension(i) {
	  var ln = checkNumber(i);
	  var li = void 0;

	  if (i >= tokensLength || !ln || i + ln >= tokensLength) return 0;

	  return (li = checkUnit(i + ln)) ? ln + li : 0;
	}

	/**
	 * Get node of a number with dimension unit
	 * @return {Node}
	 */
	function getDimension() {
	  var type = NodeType.DimensionType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [getNumber(), getUnit()];

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is unit
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkUnit(i) {
	  var units = ['em', 'ex', 'ch', 'rem', 'vh', 'vw', 'vmin', 'vmax', 'px', 'mm', 'q', 'cm', 'in', 'pt', 'pc', 'deg', 'grad', 'rad', 'turn', 's', 'ms', 'Hz', 'kHz', 'dpi', 'dpcm', 'dppx'];

	  return units.indexOf(tokens[i].value) !== -1 ? 1 : 0;
	}

	/**
	 * Get unit node of type ident
	 * @return {Node} An ident node containing the unit value
	 */
	function getUnit() {
	  var type = NodeType.IdentType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = token.value;

	  pos++;

	  return newNode(type, content, line, column);
	}

	/**
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkExpression(i) {
	  var start = i;

	  if (i >= tokensLength || tokens[i++].value !== 'expression' || i >= tokensLength || tokens[i].type !== TokenType.LeftParenthesis) return 0;

	  return tokens[i].right - start + 1;
	}

	/**
	 * @returns {Array}
	 */
	function getExpression() {
	  var startPos = pos;
	  var e;
	  var token = tokens[startPos];
	  var line = token.ln;
	  var column = token.col;

	  pos++;

	  e = joinValues(pos + 1, tokens[pos].right - 1);
	  var end = getLastPosition(e, line, column, 1);
	  if (end[0] === line) end[1] += 11;
	  pos = tokens[pos].right + 1;

	  return newNode(NodeType.ExpressionType, e, token.ln, token.col, end);
	}

	function checkExtend(i) {
	  var l = 0;

	  if (l = checkExtend1(i)) tokens[i].extend_child = 1;else if (l = checkExtend2(i)) tokens[i].extend_child = 2;

	  return l;
	}

	function getExtend() {
	  var type = tokens[pos].extend_child;

	  if (type === 1) return getExtend1();else if (type === 2) return getExtend2();
	}

	/**
	 * Checks if token is part of an extend with `!optional` flag.
	 * @param {Number} i
	 */
	function checkExtend1(i) {
	  var start = i;
	  var l;

	  if (i >= tokensLength) return 0;

	  if (l = checkAtkeyword(i)) i += l;else return 0;

	  if (tokens[start + 1].value !== 'extend') return 0;

	  if (l = checkSC(i)) i += l;else return 0;

	  if (l = checkSelectorsGroup(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;else return 0;

	  if (l = checkOptional(i)) i += l;else return 0;

	  return i - start;
	}

	function getExtend1() {
	  var startPos = pos;
	  var x = [].concat([getAtkeyword()], getSC(), getSelectorsGroup(), getSC(), [getOptional()]);

	  var token = tokens[startPos];
	  return newNode(NodeType.ExtendType, x, token.ln, token.col);
	}

	/**
	 * Checks if token is part of an extend without `!optional` flag.
	 * @param {Number} i
	 */
	function checkExtend2(i) {
	  var start = i;
	  var l;

	  if (i >= tokensLength) return 0;

	  if (l = checkAtkeyword(i)) i += l;else return 0;

	  if (tokens[start + 1].value !== 'extend') return 0;

	  if (l = checkSC(i)) i += l;else return 0;

	  if (l = checkSelectorsGroup(i)) i += l;else return 0;

	  return i - start;
	}

	function getExtend2() {
	  var startPos = pos;
	  var x = [].concat([getAtkeyword()], getSC(), getSelectorsGroup());
	  var token = tokens[startPos];
	  return newNode(NodeType.ExtendType, x, token.ln, token.col);
	}

	/**
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkFunction(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkIdentOrInterpolation(i)) i += l;else return 0;

	  return i < tokensLength && tokens[i].type === TokenType.LeftParenthesis ? tokens[i].right - start + 1 : 0;
	}

	/**
	 * @returns {Array}
	 */
	function getFunction() {
	  var startPos = pos;
	  var x = getIdentOrInterpolation();
	  var body = void 0;

	  body = getArguments();

	  x.push(body);

	  var token = tokens[startPos];
	  return newNode(NodeType.FunctionType, x, token.ln, token.col);
	}

	/**
	 * @returns {Array}
	 */
	function getArguments() {
	  var startPos = pos;
	  var x = [];
	  var body = void 0;
	  var token = tokens[startPos];
	  var line = token.ln;
	  var column = token.col;

	  pos++;

	  while (pos < tokensLength && tokens[pos].type !== TokenType.RightParenthesis) {
	    if (checkSingleValueDeclaration(pos)) x.push(getSingleValueDeclaration());else if (checkArgument(pos)) {
	      body = getArgument();
	      if (typeof body.content === 'string') x.push(body);else x = x.concat(body);
	    } else if (checkClass(pos)) x.push(getClass());else throwError();
	  }

	  var end = getLastPosition(x, line, column, 1);
	  pos++;

	  return newNode(NodeType.ArgumentsType, x, token.ln, token.col, end);
	}

	/**
	 * Check if token is part of an identifier
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of the identifier
	 */
	function checkIdent(i) {
	  var start = i;

	  if (i >= tokensLength) return 0;

	  // Check if token is part of a negative number
	  if (tokens[i].type === TokenType.HyphenMinus && tokens[i + 1].type === TokenType.DecimalNumber) return 0;

	  if (tokens[i].type === TokenType.HyphenMinus) i++;

	  if (checkInterpolation(i)) {
	    tokens[start].ident_last = i - 1;
	    return i - start;
	  }

	  if (tokens[i].type === TokenType.LowLine || tokens[i].type === TokenType.Identifier) i++;else return 0;

	  for (; i < tokensLength; i++) {
	    if (tokens[i].type !== TokenType.HyphenMinus && tokens[i].type !== TokenType.LowLine && tokens[i].type !== TokenType.Identifier && tokens[i].type !== TokenType.DecimalNumber) break;
	  }

	  tokens[start].ident_last = i - 1;

	  return i - start;
	}

	/**
	 * Get node with an identifier
	 * @returns {Array} `['ident', x]` where `x` is identifier's name
	 */
	function getIdent() {
	  var startPos = pos;
	  var x = joinValues(pos, tokens[pos].ident_last);

	  pos = tokens[pos].ident_last + 1;

	  var token = tokens[startPos];
	  return newNode(NodeType.IdentType, x, token.ln, token.col);
	}

	/**
	 * @param {number} i Token's index number
	 * @returns {number} Length of the identifier
	 */
	function checkPartialIdent(i) {
	  var start = i;

	  if (i >= tokensLength) return 0;

	  for (; i < tokensLength; i++) {
	    if (tokens[i].type !== TokenType.HyphenMinus && tokens[i].type !== TokenType.LowLine && tokens[i].type !== TokenType.Identifier && tokens[i].type !== TokenType.DecimalNumber) break;
	  }

	  tokens[start].ident_last = i - 1;

	  return i - start;
	}

	function checkIdentOrInterpolation(i) {
	  var start = i;
	  var l = void 0;
	  var prevIsInterpolation = false;

	  while (i < tokensLength) {
	    if (l = checkInterpolation(i)) {
	      tokens[i].ii_type = 1;
	      i += l;
	      prevIsInterpolation = true;
	    } else if (l = checkIdent(i)) {
	      tokens[i].ii_type = 2;
	      i += l;
	      prevIsInterpolation = false;
	    } else if (prevIsInterpolation && (l = checkPartialIdent(i))) {
	      tokens[i].ii_type = 3;
	      i += l;
	      prevIsInterpolation = false;
	    } else break;
	  }

	  return i - start;
	}

	function getIdentOrInterpolation() {
	  var x = [];

	  while (pos < tokensLength) {
	    var tokenType = tokens[pos].ii_type;

	    if (tokenType === 1) {
	      x.push(getInterpolation());
	    } else if (tokenType === 2 || tokenType === 3) {
	      x.push(getIdent());
	    } else break;
	  }

	  return x;
	}

	/**
	 * Check if token is part of `!important` word
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkImportant(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength || tokens[i++].type !== TokenType.ExclamationMark) return 0;

	  if (l = checkSC(i)) i += l;

	  if (tokens[i].value === 'important') {
	    tokens[start].importantEnd = i;
	    return i - start + 1;
	  } else {
	    return 0;
	  }
	}

	/**
	 * Get node with `!important` word
	 * @returns {Array} `['important', sc]` where `sc` is optional whitespace
	 */
	function getImportant() {
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = joinValues(pos, token.importantEnd);

	  pos = token.importantEnd + 1;

	  return newNode(NodeType.ImportantType, content, line, column);
	}

	/**
	 * Check if token is part of an included mixin (`@include` or `@extend`
	 *      directive).
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of the included mixin
	 */
	function checkInclude(i) {
	  var l;

	  if (i >= tokensLength) return 0;

	  if (l = checkInclude1(i)) tokens[i].include_type = 1;else if (l = checkInclude2(i)) tokens[i].include_type = 2;else if (l = checkInclude3(i)) tokens[i].include_type = 3;else if (l = checkInclude4(i)) tokens[i].include_type = 4;else if (l = checkInclude5(i)) tokens[i].include_type = 5;

	  return l;
	}

	/**
	 * Check if token is part of `!global` word
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkGlobal(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength || tokens[i++].type !== TokenType.ExclamationMark) return 0;

	  if (l = checkSC(i)) i += l;

	  if (tokens[i].value === 'global') {
	    tokens[start].globalEnd = i;
	    return i - start + 1;
	  } else {
	    return 0;
	  }
	}

	/**
	 * Get node with `!global` word
	 */
	function getGlobal() {
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = joinValues(pos, token.globalEnd);

	  pos = token.globalEnd + 1;

	  return newNode(NodeType.GlobalType, content, line, column);
	}

	/**
	 * Get node with included mixin
	 * @returns {Array} `['include', x]`
	 */
	function getInclude() {
	  switch (tokens[pos].include_type) {
	    case 1:
	      return getInclude1();
	    case 2:
	      return getInclude2();
	    case 3:
	      return getInclude3();
	    case 4:
	      return getInclude4();
	    case 5:
	      return getInclude5();
	  }
	}

	/**
	 * Get node with included mixin with keyfames selector like
	 * `@include nani(foo) { 0% {}}`
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of the include
	 */
	function checkInclude1(i) {
	  var start = i;
	  var l = void 0;

	  if (l = checkAtkeyword(i)) i += l;else return 0;

	  if (tokens[start + 1].value !== 'include') return 0;

	  if (l = checkSC(i)) i += l;else return 0;

	  if (l = checkIdentOrInterpolation(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkArguments(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkKeyframesBlocks(i)) i += l;else return 0;

	  return i - start;
	}

	/**
	 * Get node with included mixin with keyfames selector like
	 * `@include nani(foo) { 0% {}}`
	 * @returns {Array} `['include', ['atkeyword', x], sc, ['selector', y], sc,
	 *      ['arguments', z], sc, ['block', q], sc` where `x` is `include` or
	 *      `extend`, `y` is mixin's identifier (selector), `z` are arguments
	 *      passed to the mixin, `q` is block passed to the mixin containing a
	 *      ruleset > selector > keyframesSelector, and `sc` are optional
	 *      whitespaces
	 */
	function getInclude1() {
	  var startPos = pos;
	  var x = [].concat(getAtkeyword(), getSC(), getIdentOrInterpolation(), getSC(), getArguments(), getSC(), getKeyframesBlocks());

	  var token = tokens[startPos];
	  return newNode(NodeType.IncludeType, x, token.ln, token.col);
	}

	/**
	 * Check if token is part of an included mixin like `@include nani(foo) {...}`
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of the include
	 */
	function checkInclude2(i) {
	  var start = i;
	  var l = void 0;

	  if (l = checkAtkeyword(i)) i += l;else return 0;

	  if (tokens[start + 1].value !== 'include') return 0;

	  if (l = checkSC(i)) i += l;else return 0;

	  if (l = checkIdentOrInterpolation(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkArguments(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkBlock(i)) i += l;else return 0;

	  return i - start;
	}

	/**
	 * Get node with included mixin like `@include nani(foo) {...}`
	 * @returns {Array} `['include', ['atkeyword', x], sc, ['selector', y], sc,
	 *      ['arguments', z], sc, ['block', q], sc` where `x` is `include` or
	 *      `extend`, `y` is mixin's identifier (selector), `z` are arguments
	 *      passed to the mixin, `q` is block passed to the mixin and `sc`
	 *      are optional whitespaces
	 */
	function getInclude2() {
	  var startPos = pos;
	  var x = [].concat(getAtkeyword(), getSC(), getIdentOrInterpolation(), getSC(), getArguments(), getSC(), getBlock());

	  var token = tokens[startPos];
	  return newNode(NodeType.IncludeType, x, token.ln, token.col);
	}

	/**
	 * Check if token is part of an included mixin like `@include nani(foo)`
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of the include
	 */
	function checkInclude3(i) {
	  var start = i;
	  var l = void 0;

	  if (l = checkAtkeyword(i)) i += l;else return 0;

	  if (tokens[start + 1].value !== 'include') return 0;

	  if (l = checkSC(i)) i += l;else return 0;

	  if (l = checkIdentOrInterpolation(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkArguments(i)) i += l;else return 0;

	  return i - start;
	}

	/**
	 * Get node with included mixin like `@include nani(foo)`
	 * @returns {Array} `['include', ['atkeyword', x], sc, ['selector', y], sc,
	 *      ['arguments', z], sc]` where `x` is `include` or `extend`, `y` is
	 *      mixin's identifier (selector), `z` are arguments passed to the
	 *      mixin and `sc` are optional whitespaces
	 */
	function getInclude3() {
	  var startPos = pos;
	  var x = [].concat(getAtkeyword(), getSC(), getIdentOrInterpolation(), getSC(), getArguments());

	  var token = tokens[startPos];
	  return newNode(NodeType.IncludeType, x, token.ln, token.col);
	}

	/**
	 * Check if token is part of an included mixin with a content block passed
	 *      as an argument (e.g. `@include nani {...}`)
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of the mixin
	 */
	function checkInclude4(i) {
	  var start = i;
	  var l = void 0;

	  if (l = checkAtkeyword(i)) i += l;else return 0;

	  if (tokens[start + 1].value !== 'include') return 0;

	  if (l = checkSC(i)) i += l;else return 0;

	  if (l = checkIdentOrInterpolation(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkBlock(i)) i += l;else return 0;

	  return i - start;
	}

	/**
	 * Get node with an included mixin with a content block passed
	 *      as an argument (e.g. `@include nani {...}`)
	 * @returns {Array} `['include', x]`
	 */
	function getInclude4() {
	  var startPos = pos;
	  var x = [].concat(getAtkeyword(), getSC(), getIdentOrInterpolation(), getSC(), getBlock());

	  var token = tokens[startPos];
	  return newNode(NodeType.IncludeType, x, token.ln, token.col);
	}

	/**
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkInclude5(i) {
	  var start = i;
	  var l = void 0;

	  if (l = checkAtkeyword(i)) i += l;else return 0;

	  if (tokens[start + 1].value !== 'include') return 0;

	  if (l = checkSC(i)) i += l;else return 0;

	  if (l = checkIdentOrInterpolation(i)) i += l;else return 0;

	  return i - start;
	}

	/**
	 * @returns {Array} `['include', x]`
	 */
	function getInclude5() {
	  var startPos = pos;
	  var x = [].concat(getAtkeyword(), getSC(), getIdentOrInterpolation());

	  var token = tokens[startPos];
	  return newNode(NodeType.IncludeType, x, token.ln, token.col);
	}

	/**
	 * Check if token is part of an interpolated variable (e.g. `#{$nani}`).
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkInterpolation(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (tokens[i].type !== TokenType.NumberSign || !tokens[i + 1] || tokens[i + 1].type !== TokenType.LeftCurlyBracket) return 0;

	  i += 2;

	  while (tokens[i].type !== TokenType.RightCurlyBracket) {
	    if (l = checkArgument(i)) i += l;else return 0;
	  }

	  return tokens[i].type === TokenType.RightCurlyBracket ? i - start + 1 : 0;
	}

	/**
	 * Get node with an interpolated variable
	 * @returns {Array} `['interpolation', x]`
	 */
	function getInterpolation() {
	  var startPos = pos;
	  var x = [];
	  var token = tokens[startPos];
	  var line = token.ln;
	  var column = token.col;

	  // Skip `#{`:
	  pos += 2;

	  while (pos < tokensLength && tokens[pos].type !== TokenType.RightCurlyBracket) {
	    var body = getArgument();
	    if (typeof body.content === 'string') x.push(body);else x = x.concat(body);
	  }

	  var end = getLastPosition(x, line, column, 1);

	  // Skip `}`:
	  pos++;

	  return newNode(NodeType.InterpolationType, x, token.ln, token.col, end);
	}

	/**
	 * Check a single keyframe block - `5% {}`
	 * @param {Number} i
	 * @returns {Number}
	 */
	function checkKeyframesBlock(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkKeyframesSelectorsGroup(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkBlock(i)) i += l;else return 0;

	  return i - start;
	}

	/**
	 * Get a single keyframe block - `5% {}`
	 * @returns {Node}
	 */
	function getKeyframesBlock() {
	  var type = NodeType.RulesetType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [].concat(getKeyframesSelectorsGroup(), getSC(), [getBlock()]);

	  return newNode(type, content, line, column);
	}

	/**
	 * Check all keyframe blocks - `5% {} 100% {}`
	 * @param {Number} i
	 * @returns {Number}
	 */
	function checkKeyframesBlocks(i) {
	  var start = i;
	  var l = void 0;

	  if (i < tokensLength && tokens[i].type === TokenType.LeftCurlyBracket) i++;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkKeyframesBlock(i)) i += l;else return 0;

	  while (tokens[i].type !== TokenType.RightCurlyBracket) {
	    if (l = checkSC(i)) i += l;else if (l = checkKeyframesBlock(i)) i += l;else break;
	  }

	  if (i < tokensLength && tokens[i].type === TokenType.RightCurlyBracket) i++;else return 0;

	  return i - start;
	}

	/**
	 * Get all keyframe blocks - `5% {} 100% {}`
	 * @returns {Node}
	 */
	function getKeyframesBlocks() {
	  var type = NodeType.BlockType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];
	  var keyframesBlocksEnd = token.right;

	  // Skip `{`.
	  pos++;

	  while (pos < keyframesBlocksEnd) {
	    if (checkSC(pos)) content = content.concat(getSC());else if (checkKeyframesBlock(pos)) content.push(getKeyframesBlock());else if (checkAtrule(pos)) content.push(getAtrule()); // @content
	    else break;
	  }

	  var end = getLastPosition(content, line, column, 1);

	  // Skip `}`.
	  pos++;

	  return newNode(type, content, line, column, end);
	}

	/**
	 * Check if token is part of a @keyframes rule.
	 * @param {Number} i Token's index number
	 * @return {Number} Length of the @keyframes rule
	 */
	function checkKeyframesRule(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkAtkeyword(i)) i += l;else return 0;

	  var atruleName = joinValues2(i - l, l);
	  if (atruleName.indexOf('keyframes') === -1) return 0;

	  if (l = checkSC(i)) i += l;else return 0;

	  if (l = checkIdentOrInterpolation(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkKeyframesBlocks(i)) i += l;else return 0;

	  return i - start;
	}

	/**
	 * @return {Node}
	 */
	function getKeyframesRule() {
	  var type = NodeType.AtruleType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [].concat([getAtkeyword()], getSC(), getIdentOrInterpolation(), getSC(), [getKeyframesBlocks()]);

	  return newNode(type, content, line, column);
	}

	/**
	 * Check a single keyframe selector - `5%`, `from` etc
	 * @param {Number} i
	 * @returns {Number}
	 */
	function checkKeyframesSelector(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkIdent(i)) {
	    // Valid selectors are only `from` and `to`.
	    var selector = joinValues2(i, l);
	    if (selector !== 'from' && selector !== 'to') return 0;

	    i += l;
	    tokens[start].keyframesSelectorType = 1;
	  } else if (l = checkPercentage(i)) {
	    i += l;
	    tokens[start].keyframesSelectorType = 2;
	  } else if (l = checkInterpolation(i)) {
	    i += l;
	    tokens[start].keyframesSelectorType = 3;
	  } else {
	    return 0;
	  }

	  return i - start;
	}

	/**
	 * Get a single keyframe selector
	 * @returns {Node}
	 */
	function getKeyframesSelector() {
	  var keyframesSelectorType = NodeType.KeyframesSelectorType;
	  var selectorType = NodeType.SelectorType;

	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  if (token.keyframesSelectorType === 1) {
	    content.push(getIdent());
	  } else if (token.keyframesSelectorType === 2) {
	    content.push(getPercentage());
	  } else if (token.keyframesSelectorType === 3) {
	    content.push(getInterpolation());
	  }

	  var keyframesSelector = newNode(keyframesSelectorType, content, line, column);
	  return newNode(selectorType, [keyframesSelector], line, column);
	}

	/**
	 * Check the keyframe's selector groups
	 * @param {Number} i
	 * @returns {Number}
	 */
	function checkKeyframesSelectorsGroup(i) {
	  var start = i;
	  var l = void 0;

	  if (l = checkKeyframesSelector(i)) i += l;else return 0;

	  while (i < tokensLength) {
	    var sb = checkSC(i);
	    var c = checkDelim(i + sb);
	    if (!c) break;
	    var sa = checkSC(i + sb + c);
	    if (l = checkKeyframesSelector(i + sb + c + sa)) i += sb + c + sa + l;else break;
	  }

	  tokens[start].selectorsGroupEnd = i;

	  return i - start;
	}

	/**
	 * Get the keyframe's selector groups
	 * @returns {Array} An array of keyframe selectors
	 */
	function getKeyframesSelectorsGroup() {
	  var selectorsGroup = [];
	  var selectorsGroupEnd = tokens[pos].selectorsGroupEnd;

	  selectorsGroup.push(getKeyframesSelector());

	  while (pos < selectorsGroupEnd) {
	    selectorsGroup = selectorsGroup.concat(getSC());
	    selectorsGroup.push(getDelim());
	    selectorsGroup = selectorsGroup.concat(getSC());
	    selectorsGroup.push(getKeyframesSelector());
	  }

	  return selectorsGroup;
	}

	/**
	 * Check if token is part of a loop.
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of the loop
	 */
	function checkLoop(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkAtkeyword(i)) i += l;else return 0;

	  if (['for', 'each', 'while'].indexOf(tokens[start + 1].value) < 0) return 0;

	  while (i < tokensLength) {
	    if (l = checkBlock(i)) {
	      i += l;
	      break;
	    } else if (l = checkVariable(i) || checkNumber(i) || checkInterpolation(i) || checkIdent(i) || checkSC(i) || checkOperator(i) || checkCombinator(i) || checkString(i)) i += l;else return 0;
	  }

	  return i - start;
	}

	/**
	 * Get node with a loop.
	 * @returns {Array} `['loop', x]`
	 */
	function getLoop() {
	  var startPos = pos;
	  var x = [];

	  x.push(getAtkeyword());

	  while (pos < tokensLength) {
	    if (checkBlock(pos)) {
	      x.push(getBlock());
	      break;
	    } else if (checkVariable(pos)) x.push(getVariable());else if (checkNumber(pos)) x.push(getNumber());else if (checkInterpolation(pos)) x.push(getInterpolation());else if (checkIdent(pos)) x.push(getIdent());else if (checkOperator(pos)) x.push(getOperator());else if (checkCombinator(pos)) x.push(getCombinator());else if (checkSC(pos)) x = x.concat(getSC());else if (checkString(pos)) x.push(getString());
	  }

	  var token = tokens[startPos];
	  return newNode(NodeType.LoopType, x, token.ln, token.col);
	}

	/**
	 * Check if token is part of a mixin
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of the mixin
	 */
	function checkMixin(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if ((l = checkAtkeyword(i)) && tokens[i + 1].value === 'mixin') i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkIdentOrInterpolation(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkArguments(i)) i += l;

	  if (l = checkSC(i)) i += l;

	  if (l = checkBlock(i)) i += l;else return 0;

	  return i - start;
	}

	/**
	 * Get node with a mixin
	 * @returns {Array} `['mixin', x]`
	 */
	function getMixin() {
	  var startPos = pos;
	  var x = [getAtkeyword()];

	  x = x.concat(getSC());

	  if (checkIdentOrInterpolation(pos)) x = x.concat(getIdentOrInterpolation());

	  x = x.concat(getSC());

	  if (checkArguments(pos)) x.push(getArguments());

	  x = x.concat(getSC());

	  if (checkBlock(pos)) x.push(getBlock());

	  var token = tokens[startPos];
	  return newNode(NodeType.MixinType, x, token.ln, token.col);
	}

	/**
	 * Check if token is a namespace sign (`|`)
	 * @param {Number} i Token's index number
	 * @returns {Number} `1` if token is `|`, `0` if not
	 */
	function checkNamespace(i) {
	  return i < tokensLength && tokens[i].type === TokenType.VerticalLine ? 1 : 0;
	}

	/**
	 * Get node with a namespace sign
	 * @returns {Array} `['namespace']`
	 */
	function getNamespace() {
	  var startPos = pos;

	  pos++;

	  var token = tokens[startPos];
	  return newNode(NodeType.NamespaceType, '|', token.ln, token.col);
	}

	/**
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkNmName2(i) {
	  if (tokens[i].type === TokenType.Identifier) return 1;else if (tokens[i].type !== TokenType.DecimalNumber) return 0;

	  i++;

	  return i < tokensLength && tokens[i].type === TokenType.Identifier ? 2 : 1;
	}

	/**
	 * @returns {String}
	 */
	function getNmName2() {
	  var s = tokens[pos].value;

	  if (tokens[pos++].type === TokenType.DecimalNumber && pos < tokensLength && tokens[pos].type === TokenType.Identifier) s += tokens[pos++].value;

	  return s;
	}

	/**
	 * Check if token is part of a number
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of number
	 */
	function checkNumber(i) {
	  if (i >= tokensLength) return 0;

	  if (tokens[i].number_l) return tokens[i].number_l;

	  // `10`:
	  if (i < tokensLength && tokens[i].type === TokenType.DecimalNumber && (!tokens[i + 1] || tokens[i + 1] && tokens[i + 1].type !== TokenType.FullStop)) {
	    tokens[i].number_l = 1;
	    return 1;
	  }

	  // `10.`:
	  if (i < tokensLength && tokens[i].type === TokenType.DecimalNumber && tokens[i + 1] && tokens[i + 1].type === TokenType.FullStop && (!tokens[i + 2] || tokens[i + 2].type !== TokenType.DecimalNumber)) {
	    tokens[i].number_l = 2;
	    return 2;
	  }

	  // `.10`:
	  if (i < tokensLength && tokens[i].type === TokenType.FullStop && tokens[i + 1].type === TokenType.DecimalNumber) {
	    tokens[i].number_l = 2;
	    return 2;
	  }

	  // `10.10`:
	  if (i < tokensLength && tokens[i].type === TokenType.DecimalNumber && tokens[i + 1] && tokens[i + 1].type === TokenType.FullStop && tokens[i + 2] && tokens[i + 2].type === TokenType.DecimalNumber) {
	    tokens[i].number_l = 3;
	    return 3;
	  }

	  return 0;
	}

	/**
	 * Get node with number
	 * @returns {Array} `['number', x]` where `x` is a number converted
	 *      to string.
	 */
	function getNumber() {
	  var s = '';
	  var startPos = pos;
	  var l = tokens[pos].number_l;

	  for (var j = 0; j < l; j++) {
	    s += tokens[pos + j].value;
	  }

	  pos += l;

	  var token = tokens[startPos];
	  return newNode(NodeType.NumberType, s, token.ln, token.col);
	}

	/**
	 * Check if token is an operator (`/`, `%`, `,`, `:` or `=`).
	 * @param {Number} i Token's index number
	 * @returns {Number} `1` if token is an operator, otherwise `0`
	 */
	function checkOperator(i) {
	  if (i >= tokensLength) return 0;

	  switch (tokens[i].type) {
	    case TokenType.Solidus:
	    case TokenType.PercentSign:
	    case TokenType.Comma:
	    case TokenType.Colon:
	    case TokenType.EqualsSign:
	    case TokenType.EqualitySign:
	    case TokenType.InequalitySign:
	    case TokenType.LessThanSign:
	    case TokenType.GreaterThanSign:
	    case TokenType.Asterisk:
	      return 1;
	  }

	  return 0;
	}

	/**
	 * Get node with an operator
	 * @returns {Array} `['operator', x]` where `x` is an operator converted
	 *      to string.
	 */
	function getOperator() {
	  var startPos = pos;
	  var x = tokens[pos++].value;

	  var token = tokens[startPos];
	  return newNode(NodeType.OperatorType, x, token.ln, token.col);
	}

	/**
	 * Check if token is part of `!optional` word
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkOptional(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength || tokens[i++].type !== TokenType.ExclamationMark) return 0;

	  if (l = checkSC(i)) i += l;

	  if (tokens[i].value === 'optional') {
	    tokens[start].optionalEnd = i;
	    return i - start + 1;
	  } else {
	    return 0;
	  }
	}

	/**
	 * Get node with `!optional` word
	 */
	function getOptional() {
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = joinValues(pos, token.optionalEnd);

	  pos = token.optionalEnd + 1;

	  return newNode(NodeType.OptionalType, content, line, column);
	}

	/**
	 * Check if token is part of text inside parentheses, e.g. `(1)`
	 * @param {Number} i Token's index number
	 * @return {Number}
	 */
	function checkParentheses(i) {
	  if (i >= tokensLength) return 0;

	  var start = i;
	  var right = tokens[i].right;

	  if (tokens[i].type === TokenType.LeftParenthesis) i++;else return 0;

	  if (i < right) {
	    var l = checkTsets(i);
	    if (l) i += l;else return 0;
	  }

	  i++;

	  return i - start;
	}

	/**
	 * Get node with text inside parentheses, e.g. `(1)`
	 * @return {Node}
	 */
	function getParentheses() {
	  var type = NodeType.ParenthesesType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var tsets = [];
	  var right = token.right;

	  pos++;

	  if (pos < right) {
	    tsets = getTsets();
	  }

	  var end = getLastPosition(tsets, line, column, 1);
	  pos++;

	  return newNode(type, tsets, line, column, end);
	}

	/**
	 * Check if token is a parent selector, e.g. `&`
	 * @param {number} i Token's index number
	 * @return {number}
	 */
	function checkParentSelector(i) {
	  return i < tokensLength && tokens[i].type === TokenType.Ampersand ? 1 : 0;
	}

	/**
	 * Get node with a parent selector
	 * @return {Node}
	 */
	function getParentSelector() {
	  var startPos = pos;
	  var token = tokens[startPos];

	  pos++;

	  return newNode(NodeType.ParentSelectorType, '&', token.ln, token.col);
	}

	/**
	 * Check if token is a parent selector extension, e.g. `&--foo-bar`
	 * @param {number} i Token's index number
	 * @returns {number} Length of the parent selector extension
	 */
	function checkParentSelectorExtension(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  while (i < tokensLength) {
	    if (l = checkIdentOrInterpolation(i) || checkPartialIdent(i)) i += l;else break;
	  }

	  return i - start;
	}

	/**
	 * Get parent selector extension node
	 * @return {Node}
	 */
	function getParentSelectorExtension() {
	  var type = NodeType.ParentSelectorExtensionType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  while (pos < tokensLength) {
	    if (checkIdentOrInterpolation(pos)) {
	      content = content.concat(getIdentOrInterpolation());
	    } else if (checkPartialIdent(pos)) {
	      content.push(getIdent());
	    } else break;
	  }

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is a parent selector with an extension or not
	 * @param {number} i Token's index number
	 * @return {number} Length of the parent selector and extension if applicable
	 */
	function checkParentSelectorWithExtension(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkParentSelector(i)) i += l;else return 0;

	  if (l = checkParentSelectorExtension(i)) i += l;

	  return i - start;
	}

	/**
	 * Get parent selector node and extension node if applicable
	 * @return {Array}
	 */
	function getParentSelectorWithExtension() {
	  var content = [getParentSelector()];

	  if (checkParentSelectorExtension(pos)) content.push(getParentSelectorExtension());

	  return content;
	}

	/**
	 * Check if token is part of a number or an interpolation with a percent sign
	 * (e.g. `10%`).
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkPercentage(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkNumberOrInterpolation(i)) i += l;else return 0;

	  if (i >= tokensLength) return 0;

	  if (tokens[i].type !== TokenType.PercentSign) return 0;

	  return i - start + 1;
	}

	/**
	 * Get a percentage node that contains either a number or an interpolation
	 * @returns {Object} The percentage node
	 */
	function getPercentage() {
	  var startPos = pos;
	  var token = tokens[startPos];
	  var line = token.ln;
	  var column = token.col;
	  var content = getNumberOrInterpolation();
	  var end = getLastPosition(content, line, column, 1);

	  // Skip %
	  pos++;

	  return newNode(NodeType.PercentageType, content, token.ln, token.col, end);
	}

	/**
	 * Check if token is a number or an interpolation
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkNumberOrInterpolation(i) {
	  var start = i;
	  var l = void 0;

	  while (i < tokensLength) {
	    if (l = checkInterpolation(i) || checkNumber(i)) i += l;else break;
	  }

	  return i - start;
	}

	/**
	 * Get a number and/or interpolation node
	 * @returns {Array} An array containing a single or multiple nodes
	 */
	function getNumberOrInterpolation() {
	  var content = [];

	  while (pos < tokensLength) {
	    if (checkInterpolation(pos)) content.push(getInterpolation());else if (checkNumber(pos)) content.push(getNumber());else break;
	  }

	  return content;
	}

	/**
	 * Check if token is part of a placeholder selector (e.g. `%abc`).
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of the selector
	 */
	function checkPlaceholder(i) {
	  var l;

	  if (i >= tokensLength) return 0;

	  if (tokens[i].placeholder_l) return tokens[i].placeholder_l;

	  if (tokens[i].type !== TokenType.PercentSign) return 0;

	  if (l = checkIdentOrInterpolation(i + 1)) {
	    tokens[i].placeholder_l = l + 1;
	    return l + 1;
	  } else return 0;
	}

	/**
	 * Get node with a placeholder selector
	 * @returns {Array} `['placeholder', ['ident', x]]` where x is a placeholder's
	 *      identifier (without `%`, e.g. `abc`).
	 */
	function getPlaceholder() {
	  var startPos = pos;

	  pos++;

	  var x = getIdentOrInterpolation();

	  var token = tokens[startPos];
	  return newNode(NodeType.PlaceholderType, x, token.ln, token.col);
	}

	/**
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkProgid(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (joinValues2(i, 6) === 'progid:DXImageTransform.Microsoft.') i += 6;else return 0;

	  if (l = checkIdentOrInterpolation(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (tokens[i].type === TokenType.LeftParenthesis) {
	    tokens[start].progid_end = tokens[i].right;
	    i = tokens[i].right + 1;
	  } else return 0;

	  return i - start;
	}

	/**
	 * @returns {Array}
	 */
	function getProgid() {
	  var startPos = pos;
	  var progid_end = tokens[pos].progid_end;
	  var x = joinValues(pos, progid_end);

	  pos = progid_end + 1;

	  var token = tokens[startPos];
	  return newNode(NodeType.ProgidType, x, token.ln, token.col);
	}

	/**
	 * Check if token is part of a property
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of the property
	 */
	function checkProperty(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkVariable(i) || checkIdentOrInterpolation(i)) i += l;else return 0;

	  return i - start;
	}

	/**
	 * Get node with a property
	 * @returns {Array} `['property', x]`
	 */
	function getProperty() {
	  var startPos = pos;
	  var x = [];

	  if (checkVariable(pos)) {
	    x.push(getVariable());
	  } else {
	    x = x.concat(getIdentOrInterpolation());
	  }

	  var token = tokens[startPos];
	  return newNode(NodeType.PropertyType, x, token.ln, token.col);
	}

	/**
	 * Check if token is a colon
	 * @param {Number} i Token's index number
	 * @returns {Number} `1` if token is a colon, otherwise `0`
	 */
	function checkPropertyDelim(i) {
	  return i < tokensLength && tokens[i].type === TokenType.Colon ? 1 : 0;
	}

	/**
	 * Get node with a colon
	 * @returns {Array} `['propertyDelim']`
	 */
	function getPropertyDelim() {
	  var startPos = pos;

	  pos++;

	  var token = tokens[startPos];
	  return newNode(NodeType.PropertyDelimType, ':', token.ln, token.col);
	}

	/**
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkPseudo(i) {
	  return checkPseudoe(i) || checkPseudoc(i);
	}

	/**
	 * @returns {Array}
	 */
	function getPseudo() {
	  if (checkPseudoe(pos)) return getPseudoe();
	  if (checkPseudoc(pos)) return getPseudoc();
	}

	/**
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkPseudoe(i) {
	  var l;

	  if (i >= tokensLength || tokens[i++].type !== TokenType.Colon || i >= tokensLength || tokens[i++].type !== TokenType.Colon) return 0;

	  return (l = checkIdentOrInterpolation(i)) ? l + 2 : 0;
	}

	/**
	 * @returns {Array}
	 */
	function getPseudoe() {
	  var startPos = pos;

	  pos += 2;

	  var x = getIdentOrInterpolation();

	  var token = tokens[startPos];
	  return newNode(NodeType.PseudoeType, x, token.ln, token.col);
	}

	/**
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkPseudoc(i) {
	  var l;

	  if (i >= tokensLength || tokens[i].type !== TokenType.Colon) return 0;

	  if (l = checkPseudoClass3(i)) tokens[i].pseudoClassType = 3;else if (l = checkPseudoClass4(i)) tokens[i].pseudoClassType = 4;else if (l = checkPseudoClass5(i)) tokens[i].pseudoClassType = 5;else if (l = checkPseudoClass1(i)) tokens[i].pseudoClassType = 1;else if (l = checkPseudoClass2(i)) tokens[i].pseudoClassType = 2;else if (l = checkPseudoClass6(i)) tokens[i].pseudoClassType = 6;else return 0;

	  return l;
	}

	/**
	 * @returns {Array}
	 */
	function getPseudoc() {
	  var childType = tokens[pos].pseudoClassType;
	  if (childType === 1) return getPseudoClass1();
	  if (childType === 2) return getPseudoClass2();
	  if (childType === 3) return getPseudoClass3();
	  if (childType === 4) return getPseudoClass4();
	  if (childType === 5) return getPseudoClass5();
	  if (childType === 6) return getPseudoClass6();
	}

	/**
	 * (-) `:not(panda)`
	 */
	function checkPseudoClass1(i) {
	  var start = i;

	  // Skip `:`.
	  i++;

	  if (i >= tokensLength) return 0;

	  var l = void 0;
	  if (l = checkIdentOrInterpolation(i)) i += l;else return 0;

	  if (i >= tokensLength || tokens[i].type !== TokenType.LeftParenthesis) return 0;

	  var right = tokens[i].right;

	  // Skip `(`.
	  i++;

	  if (l = checkSelectorsGroup(i)) i += l;else return 0;

	  if (i !== right) return 0;

	  return right - start + 1;
	}

	/**
	 * (-) `:not(panda)`
	 */
	function getPseudoClass1() {
	  var type = NodeType.PseudocType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  // Skip `:`.
	  pos++;

	  content = content.concat(getIdentOrInterpolation());

	  {
	    var _type = NodeType.ArgumentsType;
	    var _token = tokens[pos];
	    var _line = _token.ln;
	    var _column = _token.col;

	    // Skip `(`.
	    pos++;

	    var selectors = getSelectorsGroup();
	    var end = getLastPosition(selectors, _line, _column, 1);
	    var args = newNode(_type, selectors, _line, _column, end);
	    content.push(args);

	    // Skip `)`.
	    pos++;
	  }

	  return newNode(type, content, line, column);
	}

	/**
	 * (1) `:nth-child(odd)`
	 * (2) `:nth-child(even)`
	 * (3) `:lang(de-DE)`
	 */
	function checkPseudoClass2(i) {
	  var start = i;
	  var l = 0;

	  // Skip `:`.
	  i++;

	  if (i >= tokensLength) return 0;

	  if (l = checkIdentOrInterpolation(i)) i += l;else return 0;

	  if (i >= tokensLength || tokens[i].type !== TokenType.LeftParenthesis) return 0;

	  var right = tokens[i].right;

	  // Skip `(`.
	  i++;

	  if (l = checkSC(i)) i += l;

	  if (l = checkIdentOrInterpolation(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (i !== right) return 0;

	  return i - start + 1;
	}

	function getPseudoClass2() {
	  var type = NodeType.PseudocType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  // Skip `:`.
	  pos++;

	  content = content.concat(getIdentOrInterpolation());

	  var l = tokens[pos].ln;
	  var c = tokens[pos].col;
	  var value = [];

	  // Skip `(`.
	  pos++;

	  value = value.concat(getSC()).concat(getIdentOrInterpolation()).concat(getSC());

	  var end = getLastPosition(value, l, c, 1);
	  var args = newNode(NodeType.ArgumentsType, value, l, c, end);
	  content.push(args);

	  // Skip `)`.
	  pos++;

	  return newNode(type, content, line, column);
	}

	/**
	 * (-) `:nth-child(-3n + 2)`
	 */
	function checkPseudoClass3(i) {
	  var start = i;
	  var l = 0;

	  // Skip `:`.
	  i++;

	  if (i >= tokensLength) return 0;

	  if (l = checkIdentOrInterpolation(i)) i += l;else return 0;

	  if (i >= tokensLength || tokens[i].type !== TokenType.LeftParenthesis) return 0;

	  var right = tokens[i].right;

	  // Skip `(`.
	  i++;

	  if (l = checkSC(i)) i += l;

	  if (l = checkUnary(i)) i += l;

	  if (l = checkNumberOrInterpolation(i)) i += l;

	  if (i >= tokensLength) return 0;
	  if (tokens[i].value === 'n') i++;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (i >= tokensLength) return 0;

	  if (tokens[i].type === TokenType.PlusSign || tokens[i].type === TokenType.HyphenMinus) i++;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkNumberOrInterpolation(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (i !== right) return 0;

	  return i - start + 1;
	}

	function getPseudoClass3() {
	  var type = NodeType.PseudocType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;

	  // Skip `:`.
	  pos++;

	  var content = getIdentOrInterpolation();

	  var l = tokens[pos].ln;
	  var c = tokens[pos].col;
	  var value = [];

	  // Skip `(`.
	  pos++;

	  if (checkUnary(pos)) value.push(getUnary());

	  if (checkNumberOrInterpolation(pos)) value = value.concat(getNumberOrInterpolation());

	  {
	    var _l = tokens[pos].ln;
	    var _c = tokens[pos].col;
	    var _content = tokens[pos].value;
	    var ident = newNode(NodeType.IdentType, _content, _l, _c);
	    value.push(ident);
	    pos++;
	  }

	  value = value.concat(getSC());
	  if (checkUnary(pos)) value.push(getUnary());
	  value = value.concat(getSC());
	  if (checkNumberOrInterpolation(pos)) value = value.concat(getNumberOrInterpolation());
	  value = value.concat(getSC());

	  var end = getLastPosition(value, l, c, 1);
	  var args = newNode(NodeType.ArgumentsType, value, l, c, end);
	  content.push(args);

	  // Skip `)`.
	  pos++;

	  return newNode(type, content, line, column);
	}

	/**
	 * (-) `:nth-child(-3n)`
	 */
	function checkPseudoClass4(i) {
	  var start = i;
	  var l = 0;

	  // Skip `:`.
	  i++;

	  if (i >= tokensLength) return 0;

	  if (l = checkIdentOrInterpolation(i)) i += l;else return 0;

	  if (i >= tokensLength) return 0;
	  if (tokens[i].type !== TokenType.LeftParenthesis) return 0;

	  var right = tokens[i].right;

	  // Skip `(`.
	  i++;

	  if (l = checkSC(i)) i += l;

	  // Check for leading unary `-`
	  if (l = checkUnary(i)) i += l;

	  // Check for interpolation `#{i}`
	  if (l = checkInterpolation(i)) i += l;

	  if (tokens[i].type === TokenType.DecimalNumber) i++;

	  if (tokens[i].value === 'n') i++;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (i !== right) return 0;

	  return i - start + 1;
	}

	function getPseudoClass4() {
	  var type = NodeType.PseudocType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;

	  // Skip `:`.
	  pos++;

	  var content = getIdentOrInterpolation();

	  var l = tokens[pos].ln;
	  var c = tokens[pos].col;
	  var value = [];

	  // Skip `(`.
	  pos++;

	  value = value.concat(getSC());

	  if (checkUnary(pos)) value.push(getUnary());
	  if (checkInterpolation(pos)) value.push(getInterpolation());
	  if (checkNumber(pos)) value.push(getNumber());
	  if (checkIdent(pos)) value.push(getIdent());
	  value = value.concat(getSC());

	  var end = getLastPosition(value, l, c, 1);
	  var args = newNode(NodeType.ArgumentsType, value, l, c, end);
	  content.push(args);

	  // Skip `)`.
	  pos++;

	  return newNode(type, content, line, column);
	}

	/**
	 * (-) `:nth-child(+8)`
	 */
	function checkPseudoClass5(i) {
	  var start = i;
	  var l = 0;

	  // Skip `:`.
	  i++;

	  if (i >= tokensLength) return 0;

	  if (l = checkIdentOrInterpolation(i)) i += l;else return 0;

	  if (i >= tokensLength) return 0;
	  if (tokens[i].type !== TokenType.LeftParenthesis) return 0;

	  var right = tokens[i].right;

	  // Skip `(`.
	  i++;

	  if (l = checkSC(i)) i += l;

	  if (l = checkUnary(i)) i += l;
	  if (tokens[i].type === TokenType.DecimalNumber) i++;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (i !== right) return 0;

	  return i - start + 1;
	}

	function getPseudoClass5() {
	  var type = NodeType.PseudocType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;

	  // Skip `:`.
	  pos++;

	  var content = getIdentOrInterpolation();

	  var l = tokens[pos].ln;
	  var c = tokens[pos].col;
	  var value = [];

	  // Skip `(`.
	  pos++;

	  if (checkUnary(pos)) value.push(getUnary());
	  if (checkNumber(pos)) value.push(getNumber());
	  value = value.concat(getSC());

	  var end = getLastPosition(value, l, c, 1);
	  var args = newNode(NodeType.ArgumentsType, value, l, c, end);
	  content.push(args);

	  // Skip `)`.
	  pos++;

	  return newNode(type, content, line, column);
	}

	/**
	 * (-) `:checked`
	 */
	function checkPseudoClass6(i) {
	  var start = i;
	  var l = 0;

	  // Skip `:`.
	  i++;

	  if (i >= tokensLength) return 0;

	  if (l = checkIdentOrInterpolation(i)) i += l;else return 0;

	  return i - start;
	}

	function getPseudoClass6() {
	  var type = NodeType.PseudocType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;

	  // Skip `:`.
	  pos++;

	  var content = getIdentOrInterpolation();

	  return newNode(type, content, line, column);
	}

	/**
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkRuleset(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkSelectorsGroup(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkBlock(i)) i += l;else return 0;

	  return i - start;
	}

	function getRuleset() {
	  var type = NodeType.RulesetType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  content = content.concat(getSelectorsGroup());
	  content = content.concat(getSC());
	  content.push(getBlock());

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is marked as a space (if it's a space or a tab
	 *      or a line break).
	 * @param {Number} i
	 * @returns {Number} Number of spaces in a row starting with the given token.
	 */
	function checkS(i) {
	  return i < tokensLength && tokens[i].ws ? tokens[i].ws_last - i + 1 : 0;
	}

	/**
	 * Get node with spaces
	 * @returns {Array} `['s', x]` where `x` is a string containing spaces
	 */
	function getS() {
	  var startPos = pos;
	  var x = joinValues(pos, tokens[pos].ws_last);

	  pos = tokens[pos].ws_last + 1;

	  var token = tokens[startPos];
	  return newNode(NodeType.SType, x, token.ln, token.col);
	}

	/**
	 * Check if token is a space or a comment.
	 * @param {Number} i Token's index number
	 * @returns {Number} Number of similar (space or comment) tokens
	 *      in a row starting with the given token.
	 */
	function checkSC(i) {
	  if (i >= tokensLength) return 0;

	  var l = void 0;
	  var lsc = 0;

	  while (i < tokensLength) {
	    if (!(l = checkS(i)) && !(l = checkCommentML(i)) && !(l = checkCommentSL(i))) break;
	    i += l;
	    lsc += l;
	  }

	  return lsc || 0;
	}

	/**
	 * Get node with spaces and comments
	 * @returns {Array} Array containing nodes with spaces (if there are any)
	 *      and nodes with comments (if there are any):
	 *      `[['s', x]*, ['comment', y]*]` where `x` is a string of spaces
	 *      and `y` is a comment's text (without `/*` and `* /`).
	 */
	function getSC() {
	  var sc = [];

	  if (pos >= tokensLength) return sc;

	  while (pos < tokensLength) {
	    if (checkS(pos)) sc.push(getS());else if (checkCommentML(pos)) sc.push(getCommentML());else if (checkCommentSL(pos)) sc.push(getCommentSL());else break;
	  }

	  return sc;
	}

	/**
	 * Check if token is part of a hexadecimal number (e.g. `#fff`) inside a simple
	 * selector
	 * @param {number} i Token's index number
	 * @return {number}
	 */
	function checkShash(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (tokens[i].type === TokenType.NumberSign) i++;else return 0;

	  if (l = checkIdentOrInterpolation(i) || checkPartialIdent(i)) i += l;else return 0;

	  while (i < tokensLength) {
	    if (l = checkIdentOrInterpolation(i) || checkPartialIdent(i)) i += l;else break;
	  }

	  tokens[start].shashEnd = i;

	  return i - start;
	}

	/**
	 * Get node with a hexadecimal number (e.g. `#fff`) inside a simple selector
	 * @returns {Node}
	 */
	function getShash() {
	  var startPos = pos;
	  var type = NodeType.ShashType;
	  var token = tokens[startPos];
	  var line = token.ln;
	  var column = token.col;
	  var end = token.shashEnd;
	  var content = [];

	  // Skip `#`
	  pos++;

	  while (pos < end) {
	    if (checkIdentOrInterpolation(pos)) {
	      content = content.concat(getIdentOrInterpolation());
	    } else if (checkPartialIdent(pos)) {
	      content.push(getIdent());
	    } else break;
	  }

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is part of a string (text wrapped in quotes)
	 * @param {Number} i Token's index number
	 * @returns {Number} `1` if token is part of a string, `0` if not
	 */
	function checkString(i) {
	  if (i >= tokensLength) return 0;

	  if (tokens[i].type === TokenType.StringSQ || tokens[i].type === TokenType.StringDQ) {
	    return 1;
	  }

	  return 0;
	}

	/**
	 * Get string's node
	 * @returns {Array} `['string', x]` where `x` is a string (including
	 *      quotes).
	 */
	function getString() {
	  var startPos = pos;
	  var x = tokens[pos++].value;

	  var token = tokens[startPos];
	  return newNode(NodeType.StringType, x, token.ln, token.col);
	}

	/**
	 * Validate stylesheet: it should consist of any number (0 or more) of
	 * rulesets (sets of rules with selectors), @-rules, whitespaces or
	 * comments.
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkStylesheet(i) {
	  var start = i;
	  var l = void 0;

	  while (i < tokensLength) {
	    if (l = checkSC(i)) tokens[i].ss_child = 1;else if (l = checkRuleset(i)) tokens[i].ss_child = 2;else if (l = checkInclude(i)) tokens[i].ss_child = 3;else if (l = checkExtend(i)) tokens[i].ss_child = 4;else if (l = checkMixin(i)) tokens[i].ss_child = 5;else if (l = checkLoop(i)) tokens[i].ss_child = 6;else if (l = checkConditionalStatement(i)) tokens[i].ss_child = 7;else if (l = checkAtrule(i)) tokens[i].ss_child = 8;else if (l = checkDeclaration(i)) tokens[i].ss_child = 9;else if (l = checkDeclDelim(i)) tokens[i].ss_child = 10;else throwError(i);

	    i += l;
	  }

	  return i - start;
	}

	/**
	 * @returns {Array} `['stylesheet', x]` where `x` is all stylesheet's
	 *      nodes.
	 */
	function getStylesheet() {
	  var startPos = pos;
	  var x = [];

	  while (pos < tokensLength) {
	    var childType = tokens[pos].ss_child;

	    if (childType === 1) x = x.concat(getSC());else if (childType === 2) x.push(getRuleset());else if (childType === 3) x.push(getInclude());else if (childType === 4) x.push(getExtend());else if (childType === 5) x.push(getMixin());else if (childType === 6) x.push(getLoop());else if (childType === 7) x.push(getConditionalStatement());else if (childType === 8) x.push(getAtrule());else if (childType === 9) x.push(getDeclaration());else if (childType === 10) x.push(getDeclDelim());
	  }

	  var token = tokens[startPos];
	  return newNode(NodeType.StylesheetType, x, token.ln, token.col);
	}

	/**
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkTset(i) {
	  var l;
	  if (l = checkVhash(i)) tokens[i].tset_type = 1;else if (l = checkOperator(i)) tokens[i].tset_type = 2;else if (l = checkAny(i)) tokens[i].tset_type = 3;else if (l = checkSC(i)) tokens[i].tset_type = 4;else if (l = checkInterpolation(i)) tokens[i].tset_type = 5;

	  return l;
	}

	/**
	 * @returns {Array}
	 */
	function getTset() {
	  var tsetType = tokens[pos].tset_type;

	  if (tsetType === 1) return getVhash();else if (tsetType === 2) return getOperator();else if (tsetType === 3) return getAny();else if (tsetType === 4) return getSC();else if (tsetType === 5) return getInterpolation();
	}

	/**
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkTsets(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  while (l = checkTset(i)) {
	    i += l;
	  }

	  tokens[start].tsets_end = i;
	  return i - start;
	}

	/**
	 * @returns {Array}
	 */
	function getTsets() {
	  var x = [];
	  var t = void 0;

	  if (pos >= tokensLength) return x;

	  var end = tokens[pos].tsets_end;
	  while (pos < end) {
	    t = getTset();
	    if (typeof t.content === 'string') x.push(t);else x = x.concat(t);
	  }

	  return x;
	}

	/**
	 * Check if token is an unary (arithmetical) sign (`+` or `-`)
	 * @param {Number} i Token's index number
	 * @returns {Number} `1` if token is an unary sign, `0` if not
	 */
	function checkUnary(i) {
	  if (i >= tokensLength) {
	    return 0;
	  }

	  if (tokens[i].type === TokenType.HyphenMinus || tokens[i].type === TokenType.PlusSign) {
	    return 1;
	  }

	  return 0;
	}

	/**
	 * Get node with an unary (arithmetical) sign (`+` or `-`)
	 * @returns {Array} `['unary', x]` where `x` is an unary sign
	 *      converted to string.
	 */
	function getUnary() {
	  var startPos = pos;
	  var x = tokens[pos++].value;

	  var token = tokens[startPos];
	  return newNode(NodeType.OperatorType, x, token.ln, token.col);
	}

	/**
	 * Check if token is a unicode range (single or multiple <urange> nodes)
	 * @param {number} i Token's index
	 * @return {number} Unicode range node's length
	 */
	function checkUnicodeRange(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkUrange(i)) i += l;else return 0;

	  while (i < tokensLength) {
	    var spaceBefore = checkSC(i);
	    var comma = checkDelim(i + spaceBefore);
	    if (!comma) break;

	    var spaceAfter = checkSC(i + spaceBefore + comma);
	    if (l = checkUrange(i + spaceBefore + comma + spaceAfter)) {
	      i += spaceBefore + comma + spaceAfter + l;
	    } else break;
	  }

	  return i - start;
	}

	/**
	 * Get a unicode range node
	 * @return {Node}
	 */
	function getUnicodeRange() {
	  var type = NodeType.UnicodeRangeType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  while (pos < tokensLength) {
	    if (checkSC(pos)) content = content.concat(getSC());else if (checkDelim(pos)) content.push(getDelim());else if (checkUrange(pos)) content.push(getUrange());else break;
	  }

	  return newNode(type, content, line, column);
	}

	/**
	 * Check if token is a u-range (part of a unicode-range)
	 * (1) `U+416`
	 * (2) `U+400-4ff`
	 * (3) `U+4??`
	 * @param {number} i Token's index
	 * @return {number} Urange node's length
	 */
	function checkUrange(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  // Check for unicode prefix (u+ or U+)
	  if (tokens[i].value === 'U' || tokens[i].value === 'u') i += 1;else return 0;

	  if (i >= tokensLength) return 0;

	  if (tokens[i].value === '+') i += 1;else return 0;

	  while (i < tokensLength) {
	    if (l = checkIdent(i)) i += l;else if (l = checkNumber(i)) i += l;else if (l = checkUnary(i)) i += l;else if (l = _checkUnicodeWildcard(i)) i += l;else break;
	  }

	  tokens[start].urangeEnd = i - 1;

	  return i - start;
	}

	/**
	 * Get a u-range node (part of a unicode-range)
	 * @return {Node}
	 */
	function getUrange() {
	  var startPos = pos;
	  var type = NodeType.UrangeType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  content = joinValues(startPos, tokens[startPos].urangeEnd);
	  pos = tokens[startPos].urangeEnd + 1;

	  return newNode(type, content, line, column);
	}

	/**
	 * Check for unicode wildcard characters `?`
	 * @param {number} i Token's index
	 * @return {number} Wildcard length
	 */
	function _checkUnicodeWildcard(i) {
	  var start = i;

	  if (i >= tokensLength) return 0;

	  while (i < tokensLength) {
	    if (tokens[i].type === TokenType.QuestionMark) i += 1;else break;
	  }

	  tokens[start].uri_raw_end = i;

	  return i - start;
	}

	/**
	 * Check if token is part of URI, e.g. `url('/css/styles.css')`
	 * @param {number} i Token's index number
	 * @returns {number} Length of URI
	 */
	function checkUri(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength || tokens[i].value !== 'url') return 0;

	  // Skip `url`
	  i++;

	  if (i >= tokensLength || tokens[i].type !== TokenType.LeftParenthesis) return 0;

	  // Store the opening parenthesis token as we will reference it's `right`
	  // property to determine when the parentheses close
	  var leftParenthesis = tokens[i];

	  // Skip `(`
	  i++;

	  // Determine the type of URI
	  while (i < leftParenthesis.right) {
	    if (l = checkUri1(i)) {
	      i += l;
	      tokens[start].uriType = 1; // Raw based URI (without quotes)
	    } else if (l = checkUri2(i)) {
	      i += l;
	      tokens[start].uriType = 2; // Non-raw based URI (with quotes)
	    } else return 0;
	  }

	  return i - start;
	}

	/**
	 * Get specific type of URI node
	 * @return {Node} Specific type of URI node
	 */
	function getUri() {
	  var uriType = tokens[pos].uriType;

	  if (uriType === 1) return getUri1();
	  if (uriType === 2) return getUri2();
	}

	/**
	 * Check if token type is valid URI character
	 * @param {number} i Token's index number
	 * @return {number} Length of raw node
	 */
	function checkUriRawCharacters(i) {
	  var start = i;
	  var l = void 0;

	  if (l = checkIdent(i)) i += l;else if (l = checkNumber(i)) i += l;else {
	    switch (tokens[i].type) {
	      case TokenType.ExclamationMark:
	      case TokenType.NumberSign:
	      case TokenType.DollarSign:
	      case TokenType.PercentSign:
	      case TokenType.Ampersand:
	      case TokenType.Asterisk:
	      case TokenType.PlusSign:
	      case TokenType.Comma:
	      case TokenType.HyphenMinus:
	      case TokenType.FullStop:
	      case TokenType.Solidus:
	      case TokenType.Colon:
	      case TokenType.Semicolon:
	      case TokenType.LessThanSign:
	      case TokenType.EqualsSign:
	      case TokenType.GreaterThanSign:
	      case TokenType.QuotationMark:
	      case TokenType.CommercialAt:
	      case TokenType.LeftSquareBracket:
	      case TokenType.RightSquareBracket:
	      case TokenType.CircumflexAccent:
	      case TokenType.LowLine:
	      case TokenType.LeftCurlyBracket:
	      case TokenType.VerticalLine:
	      case TokenType.RightCurlyBracket:
	      case TokenType.Tilde:
	        i += 1;
	        break;

	      default:
	        return 0;
	    }
	  }

	  return i - start;
	}

	/**
	 * Check if content of URI can be contained within a raw node
	 * @param {number} i Token's index number
	 * @return {number} Length of raw node
	 */
	function checkUriRaw(i) {
	  var start = i;
	  var l = void 0;

	  while (i < tokensLength) {
	    if (checkInterpolation(i) || checkVariable(i)) break;else if (l = checkUriRawCharacters(i)) i += l;else break;
	  }

	  tokens[start].uri_raw_end = i;

	  return i - start;
	}

	/**
	 * Get a raw node
	 * @return {Node}
	 */
	function getUriRaw() {
	  var startPos = pos;
	  var type = NodeType.RawType;
	  var token = tokens[startPos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];
	  var l = void 0;

	  while (pos < tokens[startPos].uri_raw_end) {
	    if (checkInterpolation(pos) || checkVariable(pos)) break;else if (l = checkUriRawCharacters(pos)) pos += l;else break;
	  }

	  content = joinValues(startPos, pos - 1);

	  return newNode(type, content, line, column);
	}

	/**
	 * Check for a raw (without quotes) URI
	 * (1) http://foo.com/bar.png
	 * (2) http://foo.com/#{$bar}.png
	 * (3) #{$foo}/bar.png
	 * (4) #{$foo}
	 * @param {number} i Token's index number
	 * @return {number} Length of URI node
	 */
	function checkUri1(i) {
	  var start = i;
	  var l = void 0;

	  if (l = checkSC(i)) i += l;

	  while (i < tokensLength) {
	    if (l = checkInterpolation(i) || checkUriRaw(i)) i += l;else break;
	  }

	  if (l = checkSC(i)) i += l;

	  // Check that we are at the end of the uri
	  if (i < tokens[start - 1].right) return 0;

	  tokens[start].uri_end = i;

	  return i - start;
	}

	/**
	 * Get a raw (without quotes) URI
	  node
	 * @return {Node}
	 */
	function getUri1() {
	  var startPos = pos;
	  var type = NodeType.UriType;
	  var token = tokens[startPos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];
	  var end = void 0;

	  // Skip `url` and `(`
	  pos += 2;

	  if (checkSC(pos)) content = content.concat(getSC());

	  while (pos < tokens[startPos + 2].uri_end) {
	    if (checkInterpolation(pos)) content.push(getInterpolation());else if (checkUriRaw(pos)) content.push(getUriRaw());else break;
	  }

	  if (checkSC(pos)) content = content.concat(getSC());

	  // Check that we are at the end of the uri
	  if (pos < tokens[startPos + 1].right) return 0;

	  end = getLastPosition(content, line, column, 1);

	  // Skip `)`
	  pos++;

	  return newNode(type, content, line, column, end);
	}

	/**
	 * Check for a non-raw (with quotes) URI
	 * (1) 'http://foo.com/bar.png'
	 * (2) 'http://foo.com/'#{$bar}.png
	 * (3) #{$foo}'/bar.png'
	 * @param {number} i Token's index number
	 * @return {number} Length of URI node
	 */
	function checkUri2(i) {
	  var start = i;
	  var l = void 0;

	  while (i < tokensLength) {
	    if (l = checkSC(i)) i += l;else if (l = checkString(i)) i += l;else if (l = checkFunction(i)) i += l;else if (l = checkUnary(i)) i += l;else if (l = checkIdentOrInterpolation(i)) i += l;else if (l = checkVariable(i)) i += l;else break;
	  }

	  tokens[start].uri_end = i;

	  return i - start;
	}

	/**
	 * Get a non-raw (with quotes) URI node
	 * @return {Node}
	 */
	function getUri2() {
	  var startPos = pos;
	  var token = tokens[startPos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];
	  var end = void 0;

	  // Skip `url` and `(`
	  pos += 2;

	  while (pos < tokens[startPos + 2].uri_end) {
	    if (checkSC(pos)) content = content.concat(getSC());else if (checkUnary(pos)) content.push(getUnary());else if (_checkValue(pos)) content.push(_getValue());else break;
	  }

	  end = getLastPosition(content, line, column, 1);

	  // Skip `)`
	  pos++;

	  return newNode(NodeType.UriType, content, line, column, end);
	}

	/**
	 * Check if token is part of a value
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of the value
	 */
	function checkValue(i) {
	  var start = i;
	  var l = void 0;
	  var s = void 0;
	  var _i = void 0;

	  while (i < tokensLength) {
	    if (checkDeclDelim(i)) break;

	    s = checkSC(i);
	    _i = i + s;

	    if (l = _checkValue(_i)) i += l + s;
	    if (!l || checkBlock(i - l)) break;
	  }

	  return i - start;
	}

	/**
	 * @returns {Array}
	 */
	function getValue() {
	  var startPos = pos;
	  var x = [];
	  var _pos = void 0;
	  var s = void 0;

	  while (pos < tokensLength) {
	    s = checkSC(pos);
	    _pos = pos + s;

	    if (checkDeclDelim(_pos)) break;

	    if (!_checkValue(_pos)) break;

	    if (s) x = x.concat(getSC());
	    x.push(_getValue());

	    if (checkBlock(_pos)) break;
	  }

	  var token = tokens[startPos];
	  return newNode(NodeType.ValueType, x, token.ln, token.col);
	}

	/**
	 * @param {number} i Token's index number
	 * @returns {number} Length of the value
	 */
	function checkSingleValue(i) {
	  var start = i;
	  var l = void 0;
	  var s = void 0;
	  var _i = void 0;

	  while (i < tokensLength) {
	    if (checkDeclDelim(i) || checkDelim(i)) break;

	    s = checkSC(i);
	    _i = i + s;

	    if (l = _checkValue(_i)) i += l + s;
	    if (!l || checkBlock(i - l)) break;
	  }

	  return i - start;
	}

	/**
	 * @returns {Array}
	 */
	function getSingleValue() {
	  var startPos = pos;
	  var x = [];
	  var _pos = void 0;
	  var s = void 0;

	  while (pos < tokensLength) {
	    s = checkSC(pos);
	    _pos = pos + s;

	    if (checkDeclDelim(_pos) || checkDelim(_pos)) break;

	    if (!_checkValue(_pos)) break;

	    if (s) x = x.concat(getSC());
	    x.push(_getValue());

	    if (checkBlock(_pos)) break;
	  }

	  var token = tokens[startPos];
	  return newNode(NodeType.ValueType, x, token.ln, token.col);
	}

	/**
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function _checkValue(i) {
	  return checkInterpolation(i) || checkVariable(i) || checkVhash(i) || checkBlock(i) || checkAtkeyword(i) || checkOperator(i) || checkImportant(i) || checkGlobal(i) || checkDefault(i) || checkProgid(i) || checkAny(i) || checkParentSelector(i);
	}

	/**
	 * @returns {Array}
	 */
	function _getValue() {
	  if (checkInterpolation(pos)) return getInterpolation();else if (checkVariable(pos)) return getVariable();else if (checkVhash(pos)) return getVhash();else if (checkBlock(pos)) return getBlock();else if (checkAtkeyword(pos)) return getAtkeyword();else if (checkOperator(pos)) return getOperator();else if (checkImportant(pos)) return getImportant();else if (checkGlobal(pos)) return getGlobal();else if (checkDefault(pos)) return getDefault();else if (checkProgid(pos)) return getProgid();else if (checkAny(pos)) return getAny();else if (checkParentSelector(pos)) return getParentSelector();
	}

	/**
	 * Check if token is part of a variable
	 * @param {Number} i Token's index number
	 * @returns {Number} Length of the variable
	 */
	function checkVariable(i) {
	  var l;

	  if (i >= tokensLength || tokens[i].type !== TokenType.DollarSign) return 0;

	  return (l = checkIdent(i + 1)) ? l + 1 : 0;
	}

	/**
	 * Get node with a variable
	 * @returns {Array} `['variable', ['ident', x]]` where `x` is
	 *      a variable name.
	 */
	function getVariable() {
	  var startPos = pos;
	  var x = [];

	  pos++;

	  x.push(getIdent());

	  var token = tokens[startPos];
	  return newNode(NodeType.VariableType, x, token.ln, token.col);
	}

	/**
	 * Check if token is part of a variables list (e.g. `$values...`).
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkVariablesList(i) {
	  var d = 0; // Number of dots
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkVariable(i)) i += l;else return 0;

	  while (i < tokensLength && tokens[i].type === TokenType.FullStop) {
	    d++;
	    i++;
	  }

	  return d === 3 ? l + d : 0;
	}

	/**
	 * Get node with a variables list
	 * @returns {Array} `['variableslist', ['variable', ['ident', x]]]` where
	 *      `x` is a variable name.
	 */
	function getVariablesList() {
	  var startPos = pos;
	  var x = getVariable();
	  var token = tokens[startPos];
	  var line = token.ln;
	  var column = token.col;

	  var end = getLastPosition([x], line, column, 3);
	  pos += 3;

	  return newNode(NodeType.VariablesListType, [x], token.ln, token.col, end);
	}

	/**
	 * Check if token is part of a hexadecimal number (e.g. `#fff`) inside
	 *      some value
	 * @param {Number} i Token's index number
	 * @returns {Number}
	 */
	function checkVhash(i) {
	  var l;

	  if (i >= tokensLength || tokens[i].type !== TokenType.NumberSign) return 0;

	  return (l = checkNmName2(i + 1)) ? l + 1 : 0;
	}

	/**
	 * Get node with a hexadecimal number (e.g. `#fff`) inside some value
	 * @returns {Array} `['vhash', x]` where `x` is a hexadecimal number
	 *      converted to string (without `#`, e.g. `'fff'`).
	 */
	function getVhash() {
	  var startPos = pos;
	  var x = void 0;
	  var token = tokens[startPos];
	  var line = token.ln;
	  var column = token.col;

	  pos++;

	  x = getNmName2();
	  var end = getLastPosition(x, line, column + 1);
	  return newNode(NodeType.VhashType, x, token.ln, token.col, end);
	}

	function checkSelectorsGroup(i) {
	  if (i >= tokensLength) return 0;

	  var start = i;
	  var l = void 0;

	  if (l = checkSelector(i)) i += l;else return 0;

	  while (i < tokensLength) {
	    var sb = checkSC(i);
	    var c = checkDelim(i + sb);
	    if (!c) break;
	    var sa = checkSC(i + sb + c);
	    if (l = checkSelector(i + sb + c + sa)) i += sb + c + sa + l;else break;
	  }

	  tokens[start].selectorsGroupEnd = i;
	  return i - start;
	}

	function getSelectorsGroup() {
	  var selectorsGroup = [];
	  var selectorsGroupEnd = tokens[pos].selectorsGroupEnd;

	  selectorsGroup.push(getSelector());

	  while (pos < selectorsGroupEnd) {
	    selectorsGroup = selectorsGroup.concat(getSC());
	    selectorsGroup.push(getDelim());
	    selectorsGroup = selectorsGroup.concat(getSC());
	    selectorsGroup.push(getSelector());
	  }

	  return selectorsGroup;
	}

	function checkSelector(i) {
	  var l;

	  if (l = checkSelector1(i)) tokens[i].selectorType = 1;else if (l = checkSelector2(i)) tokens[i].selectorType = 2;

	  return l;
	}

	function getSelector() {
	  var selectorType = tokens[pos].selectorType;
	  if (selectorType === 1) return getSelector1();else return getSelector2();
	}

	/**
	 * Checks for selector which starts with a compound selector.
	 */
	function checkSelector1(i) {
	  if (i >= tokensLength) return 0;

	  var start = i;
	  var l = void 0;

	  if (l = checkCompoundSelector(i)) i += l;else return 0;

	  while (i < tokensLength) {
	    var s = checkSC(i);
	    var c = checkCombinator(i + s);
	    if (!s && !c) break;
	    if (c) {
	      i += s + c;
	      s = checkSC(i);
	    }

	    if (l = checkCompoundSelector(i + s)) i += s + l;else break;
	  }

	  tokens[start].selectorEnd = i;
	  return i - start;
	}

	function getSelector1() {
	  var type = NodeType.SelectorType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var selectorEnd = token.selectorEnd;
	  var content = getCompoundSelector();

	  while (pos < selectorEnd) {
	    if (checkSC(pos)) content = content.concat(getSC());else if (checkCombinator(pos)) content.push(getCombinator());else if (checkCompoundSelector(pos)) content = content.concat(getCompoundSelector());
	  }

	  return newNode(type, content, line, column);
	}

	/**
	 * Checks for a selector that starts with a combinator.
	 */
	function checkSelector2(i) {
	  if (i >= tokensLength) return 0;

	  var start = i;
	  var l = void 0;

	  if (l = checkCombinator(i)) i += l;else return 0;

	  while (i < tokensLength) {
	    var sb = checkSC(i);
	    if (l = checkCompoundSelector(i + sb)) i += sb + l;else break;

	    var sa = checkSC(i);
	    var c = checkCombinator(i + sa);
	    if (!sa && !c) break;
	    if (c) {
	      i += sa + c;
	    }
	  }

	  tokens[start].selectorEnd = i;
	  return i - start;
	}

	function getSelector2() {
	  var type = NodeType.SelectorType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var selectorEnd = token.selectorEnd;
	  var content = [getCombinator()];

	  while (pos < selectorEnd) {
	    if (checkSC(pos)) content = content.concat(getSC());else if (checkCombinator(pos)) content.push(getCombinator());else if (checkCompoundSelector(pos)) content = content.concat(getCompoundSelector());
	  }

	  return newNode(type, content, line, column);
	}

	function checkCompoundSelector(i) {
	  var l = void 0;

	  if (l = checkCompoundSelector1(i)) {
	    tokens[i].compoundSelectorType = 1;
	  } else if (l = checkCompoundSelector2(i)) {
	    tokens[i].compoundSelectorType = 2;
	  }

	  return l;
	}

	function getCompoundSelector() {
	  var type = tokens[pos].compoundSelectorType;
	  if (type === 1) return getCompoundSelector1();
	  if (type === 2) return getCompoundSelector2();
	}

	/**
	 * Check for compound selectors that start with either a type selector,
	 * placeholder or parent selector with extension
	 * (1) `foo.bar`
	 * (2) `foo[attr=val]`
	 * (3) `foo:first-of-type`
	 * (4) `foo%bar`
	 * @param {number} i Token's index
	 * @return {number} Compound selector's length
	 */
	function checkCompoundSelector1(i) {
	  if (i >= tokensLength) return 0;

	  var start = i;
	  var l = void 0;

	  if (l = checkUniversalSelector(i) || checkTypeSelector(i) || checkPlaceholder(i) || checkParentSelectorWithExtension(i)) i += l;else return 0;

	  while (i < tokensLength) {
	    var _l2 = checkShash(i) || checkClass(i) || checkAttributeSelector(i) || checkPseudo(i) || checkPlaceholder(i);

	    if (_l2) i += _l2;else break;
	  }

	  tokens[start].compoundSelectorEnd = i;

	  return i - start;
	}

	/**
	 * @return {Array} An array of nodes that make up the compound selector
	 */
	function getCompoundSelector1() {
	  var sequence = [];
	  var compoundSelectorEnd = tokens[pos].compoundSelectorEnd;

	  if (checkUniversalSelector(pos)) sequence.push(getUniversalSelector());else if (checkTypeSelector(pos)) sequence.push(getTypeSelector());else if (checkPlaceholder(pos)) sequence.push(getPlaceholder());else if (checkParentSelectorWithExtension(pos)) sequence = sequence.concat(getParentSelectorWithExtension());

	  while (pos < compoundSelectorEnd) {
	    if (checkShash(pos)) sequence.push(getShash());else if (checkClass(pos)) sequence.push(getClass());else if (checkAttributeSelector(pos)) sequence.push(getAttributeSelector());else if (checkPseudo(pos)) sequence.push(getPseudo());else if (checkPlaceholder(pos)) sequence.push(getPlaceholder());else break;
	  }

	  return sequence;
	}

	/**
	 * Check for all other compound selectors
	 * (1) `.foo.bar`
	 * (2) `.foo[attr=val]`
	 * (3) `.foo:first-of-type`
	 * (4) `.foo%bar`
	 * (5) `.foo#{$bar}`
	 * @param {number} i Token's index
	 * @return {number} Compound selector's length
	 */
	function checkCompoundSelector2(i) {
	  if (i >= tokensLength) return 0;

	  var start = i;

	  while (i < tokensLength) {
	    var l = checkShash(i) || checkClass(i) || checkAttributeSelector(i) || checkPseudo(i) || checkPlaceholder(i) || checkInterpolation(i);

	    if (l) i += l;else break;
	  }

	  tokens[start].compoundSelectorEnd = i;

	  return i - start;
	}

	/**
	 * @return {Array} An array of nodes that make up the compound selector
	 */
	function getCompoundSelector2() {
	  var sequence = [];
	  var compoundSelectorEnd = tokens[pos].compoundSelectorEnd;

	  while (pos < compoundSelectorEnd) {
	    if (checkShash(pos)) sequence.push(getShash());else if (checkClass(pos)) sequence.push(getClass());else if (checkAttributeSelector(pos)) sequence.push(getAttributeSelector());else if (checkPseudo(pos)) sequence.push(getPseudo());else if (checkPlaceholder(pos)) sequence.push(getPlaceholder());else if (checkInterpolation(pos)) sequence.push(getInterpolation());else break;
	  }

	  return sequence;
	}

	function checkUniversalSelector(i) {
	  if (i >= tokensLength) return 0;

	  var start = i;
	  var l = void 0;

	  if (l = checkNamePrefix(i)) i += l;

	  if (tokens[i].type === TokenType.Asterisk) i++;else return 0;

	  return i - start;
	}

	function getUniversalSelector() {
	  var type = NodeType.UniversalSelectorType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];
	  var end = void 0;

	  if (checkNamePrefix(pos)) {
	    content.push(getNamePrefix());
	    end = getLastPosition(content, line, column, 1);
	  }

	  pos++;

	  return newNode(type, content, line, column, end);
	}

	/**
	 * Check if token is part of a type selector
	 * @param {number} i Token's index
	 * @return {number} Type selector's length
	 */
	function checkTypeSelector(i) {
	  var start = i;
	  var l = void 0;

	  if (i >= tokensLength) return 0;

	  if (l = checkNamePrefix(i)) i += l;

	  if (l = checkIdentOrInterpolation(i)) i += l;else return 0;

	  return i - start;
	}

	/**
	 * Get type selector node
	 * @return {Node}
	 */
	function getTypeSelector() {
	  var type = NodeType.TypeSelectorType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  if (checkNamePrefix(pos)) content.push(getNamePrefix());

	  content = content.concat(getIdentOrInterpolation());

	  return newNode(type, content, line, column);
	}

	function checkAttributeSelector(i) {
	  var l = void 0;
	  if (l = checkAttributeSelector1(i)) tokens[i].attributeSelectorType = 1;else if (l = checkAttributeSelector2(i)) tokens[i].attributeSelectorType = 2;

	  return l;
	}

	function getAttributeSelector() {
	  var type = tokens[pos].attributeSelectorType;
	  if (type === 1) return getAttributeSelector1();else return getAttributeSelector2();
	}

	/**
	 * (1) `[panda=nani]`
	 * (2) `[panda='nani']`
	 * (3) `[panda='nani' i]`
	 *
	 */
	function checkAttributeSelector1(i) {
	  var start = i;

	  if (tokens[i].type === TokenType.LeftSquareBracket) i++;else return 0;

	  var l = void 0;
	  if (l = checkSC(i)) i += l;

	  if (l = checkAttributeName(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkAttributeMatch(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkAttributeValue(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (l = checkAttributeFlags(i)) {
	    i += l;
	    if (l = checkSC(i)) i += l;
	  }

	  if (tokens[i].type === TokenType.RightSquareBracket) i++;else return 0;

	  return i - start;
	}

	function getAttributeSelector1() {
	  var type = NodeType.AttributeSelectorType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  // Skip `[`.
	  pos++;

	  content = content.concat(getSC());
	  content.push(getAttributeName());
	  content = content.concat(getSC());
	  content.push(getAttributeMatch());
	  content = content.concat(getSC());
	  content.push(getAttributeValue());
	  content = content.concat(getSC());

	  if (checkAttributeFlags(pos)) {
	    content.push(getAttributeFlags());
	    content = content.concat(getSC());
	  }

	  // Skip `]`.
	  pos++;

	  var end = getLastPosition(content, line, column, 1);
	  return newNode(type, content, line, column, end);
	}

	/**
	 * (1) `[panda]`
	 */
	function checkAttributeSelector2(i) {
	  var start = i;

	  if (tokens[i].type === TokenType.LeftSquareBracket) i++;else return 0;

	  var l = void 0;
	  if (l = checkSC(i)) i += l;

	  if (l = checkAttributeName(i)) i += l;else return 0;

	  if (l = checkSC(i)) i += l;

	  if (tokens[i].type === TokenType.RightSquareBracket) i++;else return 0;

	  return i - start;
	}

	function getAttributeSelector2() {
	  var type = NodeType.AttributeSelectorType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  // Skip `[`.
	  pos++;

	  content = content.concat(getSC());
	  content.push(getAttributeName());
	  content = content.concat(getSC());

	  // Skip `]`.
	  pos++;

	  var end = getLastPosition(content, line, column, 1);
	  return newNode(type, content, line, column, end);
	}

	function checkAttributeName(i) {
	  var start = i;
	  var l = void 0;

	  if (l = checkNamePrefix(i)) i += l;

	  if (l = checkIdentOrInterpolation(i)) i += l;else return 0;

	  return i - start;
	}

	function getAttributeName() {
	  var type = NodeType.AttributeNameType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  if (checkNamePrefix(pos)) content.push(getNamePrefix());
	  content = content.concat(getIdentOrInterpolation());

	  return newNode(type, content, line, column);
	}

	function checkAttributeMatch(i) {
	  var l = void 0;
	  if (l = checkAttributeMatch1(i)) tokens[i].attributeMatchType = 1;else if (l = checkAttributeMatch2(i)) tokens[i].attributeMatchType = 2;

	  return l;
	}

	function getAttributeMatch() {
	  var type = tokens[pos].attributeMatchType;
	  if (type === 1) return getAttributeMatch1();else return getAttributeMatch2();
	}

	function checkAttributeMatch1(i) {
	  var start = i;

	  var type = tokens[i].type;
	  if (type === TokenType.Tilde || type === TokenType.VerticalLine || type === TokenType.CircumflexAccent || type === TokenType.DollarSign || type === TokenType.Asterisk) i++;else return 0;

	  if (tokens[i].type === TokenType.EqualsSign) i++;else return 0;

	  return i - start;
	}

	function getAttributeMatch1() {
	  var type = NodeType.AttributeMatchType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = tokens[pos].value + tokens[pos + 1].value;
	  pos += 2;

	  return newNode(type, content, line, column);
	}

	function checkAttributeMatch2(i) {
	  if (tokens[i].type === TokenType.EqualsSign) return 1;else return 0;
	}

	function getAttributeMatch2() {
	  var type = NodeType.AttributeMatchType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = '=';

	  pos++;
	  return newNode(type, content, line, column);
	}

	function checkAttributeValue(i) {
	  return checkString(i) || checkIdentOrInterpolation(i);
	}

	function getAttributeValue() {
	  var type = NodeType.AttributeValueType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  if (checkString(pos)) content.push(getString());else content = content.concat(getIdentOrInterpolation());

	  return newNode(type, content, line, column);
	}

	function checkAttributeFlags(i) {
	  return checkIdentOrInterpolation(i);
	}

	function getAttributeFlags() {
	  var type = NodeType.AttributeFlagsType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = getIdentOrInterpolation();

	  return newNode(type, content, line, column);
	}

	function checkNamePrefix(i) {
	  if (i >= tokensLength) return 0;

	  var l = void 0;
	  if (l = checkNamePrefix1(i)) tokens[i].namePrefixType = 1;else if (l = checkNamePrefix2(i)) tokens[i].namePrefixType = 2;

	  return l;
	}

	function getNamePrefix() {
	  var type = tokens[pos].namePrefixType;
	  if (type === 1) return getNamePrefix1();else return getNamePrefix2();
	}

	/**
	 * (1) `panda|`
	 * (2) `panda<comment>|`
	 */
	function checkNamePrefix1(i) {
	  var start = i;
	  var l = void 0;

	  if (l = checkNamespacePrefix(i)) i += l;else return 0;

	  if (l = checkCommentML(i)) i += l;

	  if (l = checkNamespaceSeparator(i)) i += l;else return 0;

	  return i - start;
	}

	function getNamePrefix1() {
	  var type = NodeType.NamePrefixType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  content.push(getNamespacePrefix());

	  if (checkCommentML(pos)) content.push(getCommentML());

	  content.push(getNamespaceSeparator());

	  return newNode(type, content, line, column);
	}

	/**
	 * (1) `|`
	 */
	function checkNamePrefix2(i) {
	  return checkNamespaceSeparator(i);
	}

	function getNamePrefix2() {
	  var type = NodeType.NamePrefixType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [getNamespaceSeparator()];

	  return newNode(type, content, line, column);
	}

	/**
	 * (1) `*`
	 * (2) `panda`
	 */
	function checkNamespacePrefix(i) {
	  if (i >= tokensLength) return 0;

	  var l = void 0;

	  if (tokens[i].type === TokenType.Asterisk) return 1;else if (l = checkIdentOrInterpolation(i)) return l;else return 0;
	}

	function getNamespacePrefix() {
	  var type = NodeType.NamespacePrefixType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = [];

	  if (token.type === TokenType.Asterisk) {
	    var asteriskNode = newNode(NodeType.IdentType, '*', token.ln, token.col);
	    content.push(asteriskNode);
	    pos++;
	  } else if (checkIdentOrInterpolation(pos)) content = content.concat(getIdentOrInterpolation());

	  return newNode(type, content, line, column);
	}

	/**
	 * (1) `|`
	 */
	function checkNamespaceSeparator(i) {
	  if (i >= tokensLength) return 0;

	  if (tokens[i].type !== TokenType.VerticalLine) return 0;

	  // Return false if `|=` - [attr|=value]
	  if (tokens[i + 1] && tokens[i + 1].type === TokenType.EqualsSign) return 0;

	  return 1;
	}

	function getNamespaceSeparator() {
	  var type = NodeType.NamespaceSeparatorType;
	  var token = tokens[pos];
	  var line = token.ln;
	  var column = token.col;
	  var content = '|';

	  pos++;
	  return newNode(type, content, line, column);
	}

	module.exports = function (_tokens, context) {
	  tokens = _tokens;
	  tokensLength = tokens.length;
	  pos = 0;

	  return contexts[context]();
	};

/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = function (css, tabSize) {
	  var TokenType = __webpack_require__(13);

	  var tokens = [];
	  var urlMode = false;
	  var c = void 0; // Current character
	  var cn = void 0; // Next character
	  var pos = 0;
	  var tn = 0;
	  var ln = 1;
	  var col = 1;

	  var Punctuation = {
	    ' ': TokenType.Space,
	    '\n': TokenType.Newline,
	    '\r': TokenType.Newline,
	    '\t': TokenType.Tab,
	    '!': TokenType.ExclamationMark,
	    '"': TokenType.QuotationMark,
	    '#': TokenType.NumberSign,
	    '$': TokenType.DollarSign,
	    '%': TokenType.PercentSign,
	    '&': TokenType.Ampersand,
	    '\'': TokenType.Apostrophe,
	    '(': TokenType.LeftParenthesis,
	    ')': TokenType.RightParenthesis,
	    '*': TokenType.Asterisk,
	    '+': TokenType.PlusSign,
	    ',': TokenType.Comma,
	    '-': TokenType.HyphenMinus,
	    '.': TokenType.FullStop,
	    '/': TokenType.Solidus,
	    ':': TokenType.Colon,
	    ';': TokenType.Semicolon,
	    '<': TokenType.LessThanSign,
	    '=': TokenType.EqualsSign,
	    '==': TokenType.EqualitySign,
	    '!=': TokenType.InequalitySign,
	    '>': TokenType.GreaterThanSign,
	    '?': TokenType.QuestionMark,
	    '@': TokenType.CommercialAt,
	    '[': TokenType.LeftSquareBracket,
	    ']': TokenType.RightSquareBracket,
	    '^': TokenType.CircumflexAccent,
	    '_': TokenType.LowLine,
	    '{': TokenType.LeftCurlyBracket,
	    '|': TokenType.VerticalLine,
	    '}': TokenType.RightCurlyBracket,
	    '~': TokenType.Tilde,
	    '`': TokenType.Backtick
	  };

	  /**
	   * Add a token to the token list
	   * @param {string} type
	   * @param {string} value
	   */
	  function pushToken(type, value, column) {
	    tokens.push({
	      tn: tn++,
	      ln: ln,
	      col: column,
	      type: type,
	      value: value
	    });
	  }

	  /**
	   * Check if a character is a decimal digit
	   * @param {string} c Character
	   * @returns {boolean}
	   */
	  function isDecimalDigit(c) {
	    return '0123456789'.indexOf(c) >= 0;
	  }

	  /**
	   * Parse spaces
	   * @param {string} css Unparsed part of CSS string
	   */
	  function parseSpaces(css) {
	    var start = pos;

	    // Read the string until we meet a non-space character:
	    for (; pos < css.length; pos++) {
	      if (css.charAt(pos) !== ' ') break;
	    }

	    // Add a substring containing only spaces to tokens:
	    pushToken(TokenType.Space, css.substring(start, pos--), col);
	    col += pos - start;
	  }

	  /**
	   * Parse a string within quotes
	   * @param {string} css Unparsed part of CSS string
	   * @param {string} q Quote (either `'` or `"`)
	   */
	  function parseString(css, q) {
	    var start = pos;

	    // Read the string until we meet a matching quote:
	    for (pos++; pos < css.length; pos++) {
	      // Skip escaped quotes:
	      if (css.charAt(pos) === '\\') pos++;else if (css.charAt(pos) === q) break;
	    }

	    // Add the string (including quotes) to tokens:
	    var type = q === '"' ? TokenType.StringDQ : TokenType.StringSQ;
	    pushToken(type, css.substring(start, pos + 1), col);
	    col += pos - start;
	  }

	  /**
	   * Parse numbers
	   * @param {string} css Unparsed part of CSS string
	   */
	  function parseDecimalNumber(css) {
	    var start = pos;

	    // Read the string until we meet a character that's not a digit:
	    for (; pos < css.length; pos++) {
	      if (!isDecimalDigit(css.charAt(pos))) break;
	    }

	    // Add the number to tokens:
	    pushToken(TokenType.DecimalNumber, css.substring(start, pos--), col);
	    col += pos - start;
	  }

	  /**
	   * Parse identifier
	   * @param {string} css Unparsed part of CSS string
	   */
	  function parseIdentifier(css) {
	    var start = pos;

	    // Skip all opening slashes:
	    while (css.charAt(pos) === '/') {
	      pos++;
	    } // Read the string until we meet a punctuation mark:
	    for (; pos < css.length; pos++) {
	      // Skip all '\':
	      if (css.charAt(pos) === '\\') pos++;else if (css.charAt(pos) in Punctuation) break;
	    }

	    var ident = css.substring(start, pos--);

	    // Enter url mode if parsed substring is `url`:
	    if (!urlMode && ident === 'url' && css.charAt(pos + 1) === '(') {
	      urlMode = true;
	    }

	    // Add identifier to tokens:
	    pushToken(TokenType.Identifier, ident, col);
	    col += pos - start;
	  }

	  /**
	   * Parse equality sign
	   */
	  function parseEquality() {
	    pushToken(TokenType.EqualitySign, '==', col);
	    pos++;
	    col++;
	  }

	  /**
	   * Parse inequality sign
	   */
	  function parseInequality() {
	    pushToken(TokenType.InequalitySign, '!=', col);
	    pos++;
	    col++;
	  }

	  /**
	  * Parse a multiline comment
	  * @param {string} css Unparsed part of CSS string
	  */
	  function parseMLComment(css) {
	    var start = pos;

	    // Read the string until we meet `*/`.
	    // Since we already know first 2 characters (`/*`), start reading
	    // from `pos + 2`:
	    for (pos += 2; pos < css.length; pos++) {
	      if (css.charAt(pos) === '*' && css.charAt(pos + 1) === '/') {
	        pos++;
	        break;
	      }
	    }

	    // Add full comment (including `/*` and `*/`) to the list of tokens:
	    var comment = css.substring(start, pos + 1);
	    pushToken(TokenType.CommentML, comment, col);

	    var newlines = comment.split('\n');
	    if (newlines.length > 1) {
	      ln += newlines.length - 1;
	      col = newlines[newlines.length - 1].length;
	    } else {
	      col += pos - start;
	    }
	  }

	  /**
	  * Parse a single line comment
	  * @param {string} css Unparsed part of CSS string
	  */
	  function parseSLComment(css) {
	    var start = pos;

	    // Read the string until we meet line break.
	    // Since we already know first 2 characters (`//`), start reading
	    // from `pos + 2`:
	    for (pos += 2; pos < css.length; pos++) {
	      if (css.charAt(pos) === '\n' || css.charAt(pos) === '\r') {
	        break;
	      }
	    }

	    // Add comment (including `//` and line break) to the list of tokens:
	    pushToken(TokenType.CommentSL, css.substring(start, pos--), col);
	    col += pos - start;
	  }

	  /**
	   * Convert a CSS string to a list of tokens
	   * @param {string} css CSS string
	   * @returns {Array} List of tokens
	   * @private
	   */
	  function getTokens(css) {
	    // Parse string, character by character:
	    for (pos = 0; pos < css.length; col++, pos++) {
	      c = css.charAt(pos);
	      cn = css.charAt(pos + 1);

	      // If we meet `/*`, it's a start of a multiline comment.
	      // Parse following characters as a multiline comment:
	      if (c === '/' && cn === '*') {
	        parseMLComment(css);
	      }

	      // If we meet `//` and it is not a part of url:
	      else if (!urlMode && c === '/' && cn === '/') {
	          // If we're currently inside a block, treat `//` as a start
	          // of identifier. Else treat `//` as a start of a single-line
	          // comment:
	          parseSLComment(css);
	        }

	        // If current character is a double or single quote, it's a start
	        // of a string:
	        else if (c === '"' || c === "'") {
	            parseString(css, c);
	          }

	          // If current character is a space:
	          else if (c === ' ') {
	              parseSpaces(css);
	            }

	            // If current character is `=`, it must be combined with next `=`
	            else if (c === '=' && cn === '=') {
	                parseEquality(css);
	              }

	              // If we meet `!=`, this must be inequality
	              else if (c === '!' && cn === '=') {
	                  parseInequality(css);
	                }

	                // If current character is a punctuation mark:
	                else if (c in Punctuation) {
	                    // Check for CRLF here or just LF
	                    if (c === '\r' && cn === '\n' || c === '\n') {
	                      // If \r we know the next character is \n due to statement above
	                      // so we push a CRLF token type to the token list and importantly
	                      // skip the next character so as not to double count newlines or
	                      // columns etc
	                      if (c === '\r') {
	                        pushToken(TokenType.Newline, '\r\n', col);
	                        pos++; // If CRLF skip the next character and push crlf token
	                      } else if (c === '\n') {
	                        // If just a LF newline and not part of CRLF newline we can just
	                        // push punctuation as usual
	                        pushToken(Punctuation[c], c, col);
	                      }

	                      ln++; // Go to next line
	                      col = 0; // Reset the column count
	                    } else if (c !== '\r' && c !== '\n') {
	                      // Handle all other punctuation and add to list of tokens
	                      pushToken(Punctuation[c], c, col);
	                    } // Go to next line
	                    if (c === ')') urlMode = false; // Exit url mode
	                    else if (c === '\t' && tabSize > 1) col += tabSize - 1;
	                  }

	                  // If current character is a decimal digit:
	                  else if (isDecimalDigit(c)) {
	                      parseDecimalNumber(css);
	                    }

	                    // If current character is anything else:
	                    else {
	                        parseIdentifier(css);
	                      }
	    }

	    return tokens;
	  }

	  return getTokens(css);
	};

/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Node = __webpack_require__(1);
	var NodeTypes = __webpack_require__(15);

	module.exports = function () {
	  return new Node({
	    type: NodeTypes.StylesheetType,
	    content: [],
	    start: [0, 0],
	    end: [0, 0]
	  });
	};

/***/ }
/******/ ])
});
;