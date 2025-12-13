var __defProp = Object.defineProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/third_party/codemirror/package/addon/runmode/runmode-standalone.mjs
(function() {
  "use strict";
  function copyObj(obj, target, overwrite) {
    if (!target) {
      target = {};
    }
    for (var prop in obj) {
      if (obj.hasOwnProperty(prop) && (overwrite !== false || !target.hasOwnProperty(prop))) {
        target[prop] = obj[prop];
      }
    }
    return target;
  }
  function countColumn(string, end, tabSize, startIndex, startValue) {
    if (end == null) {
      end = string.search(/[^\s\u00a0]/);
      if (end == -1) {
        end = string.length;
      }
    }
    for (var i = startIndex || 0, n = startValue || 0; ; ) {
      var nextTab = string.indexOf("	", i);
      if (nextTab < 0 || nextTab >= end) {
        return n + (end - i);
      }
      n += nextTab - i;
      n += tabSize - n % tabSize;
      i = nextTab + 1;
    }
  }
  function nothing() {
  }
  function createObj(base, props) {
    var inst;
    if (Object.create) {
      inst = Object.create(base);
    } else {
      nothing.prototype = base;
      inst = new nothing();
    }
    if (props) {
      copyObj(props, inst);
    }
    return inst;
  }
  var StringStream = function(string, tabSize, lineOracle) {
    this.pos = this.start = 0;
    this.string = string;
    this.tabSize = tabSize || 8;
    this.lastColumnPos = this.lastColumnValue = 0;
    this.lineStart = 0;
    this.lineOracle = lineOracle;
  };
  StringStream.prototype.eol = function() {
    return this.pos >= this.string.length;
  };
  StringStream.prototype.sol = function() {
    return this.pos == this.lineStart;
  };
  StringStream.prototype.peek = function() {
    return this.string.charAt(this.pos) || void 0;
  };
  StringStream.prototype.next = function() {
    if (this.pos < this.string.length) {
      return this.string.charAt(this.pos++);
    }
  };
  StringStream.prototype.eat = function(match) {
    var ch = this.string.charAt(this.pos);
    var ok;
    if (typeof match == "string") {
      ok = ch == match;
    } else {
      ok = ch && (match.test ? match.test(ch) : match(ch));
    }
    if (ok) {
      ++this.pos;
      return ch;
    }
  };
  StringStream.prototype.eatWhile = function(match) {
    var start = this.pos;
    while (this.eat(match)) {
    }
    return this.pos > start;
  };
  StringStream.prototype.eatSpace = function() {
    var start = this.pos;
    while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) {
      ++this.pos;
    }
    return this.pos > start;
  };
  StringStream.prototype.skipToEnd = function() {
    this.pos = this.string.length;
  };
  StringStream.prototype.skipTo = function(ch) {
    var found = this.string.indexOf(ch, this.pos);
    if (found > -1) {
      this.pos = found;
      return true;
    }
  };
  StringStream.prototype.backUp = function(n) {
    this.pos -= n;
  };
  StringStream.prototype.column = function() {
    if (this.lastColumnPos < this.start) {
      this.lastColumnValue = countColumn(this.string, this.start, this.tabSize, this.lastColumnPos, this.lastColumnValue);
      this.lastColumnPos = this.start;
    }
    return this.lastColumnValue - (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0);
  };
  StringStream.prototype.indentation = function() {
    return countColumn(this.string, null, this.tabSize) - (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0);
  };
  StringStream.prototype.match = function(pattern, consume, caseInsensitive) {
    if (typeof pattern == "string") {
      var cased = function(str) {
        return caseInsensitive ? str.toLowerCase() : str;
      };
      var substr = this.string.substr(this.pos, pattern.length);
      if (cased(substr) == cased(pattern)) {
        if (consume !== false) {
          this.pos += pattern.length;
        }
        return true;
      }
    } else {
      var match = this.string.slice(this.pos).match(pattern);
      if (match && match.index > 0) {
        return null;
      }
      if (match && consume !== false) {
        this.pos += match[0].length;
      }
      return match;
    }
  };
  StringStream.prototype.current = function() {
    return this.string.slice(this.start, this.pos);
  };
  StringStream.prototype.hideFirstChars = function(n, inner) {
    this.lineStart += n;
    try {
      return inner();
    } finally {
      this.lineStart -= n;
    }
  };
  StringStream.prototype.lookAhead = function(n) {
    var oracle = this.lineOracle;
    return oracle && oracle.lookAhead(n);
  };
  StringStream.prototype.baseToken = function() {
    var oracle = this.lineOracle;
    return oracle && oracle.baseToken(this.pos);
  };
  var modes = {}, mimeModes = {};
  function defineMode(name, mode) {
    if (arguments.length > 2) {
      mode.dependencies = Array.prototype.slice.call(arguments, 2);
    }
    modes[name] = mode;
  }
  function defineMIME(mime, spec) {
    mimeModes[mime] = spec;
  }
  function resolveMode(spec) {
    if (typeof spec == "string" && mimeModes.hasOwnProperty(spec)) {
      spec = mimeModes[spec];
    } else if (spec && typeof spec.name == "string" && mimeModes.hasOwnProperty(spec.name)) {
      var found = mimeModes[spec.name];
      if (typeof found == "string") {
        found = { name: found };
      }
      spec = createObj(found, spec);
      spec.name = found.name;
    } else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+xml$/.test(spec)) {
      return resolveMode("application/xml");
    } else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+json$/.test(spec)) {
      return resolveMode("application/json");
    }
    if (typeof spec == "string") {
      return { name: spec };
    } else {
      return spec || { name: "null" };
    }
  }
  function getMode(options, spec) {
    spec = resolveMode(spec);
    var mfactory = modes[spec.name];
    if (!mfactory) {
      return getMode(options, "text/plain");
    }
    var modeObj = mfactory(options, spec);
    if (modeExtensions.hasOwnProperty(spec.name)) {
      var exts = modeExtensions[spec.name];
      for (var prop in exts) {
        if (!exts.hasOwnProperty(prop)) {
          continue;
        }
        if (modeObj.hasOwnProperty(prop)) {
          modeObj["_" + prop] = modeObj[prop];
        }
        modeObj[prop] = exts[prop];
      }
    }
    modeObj.name = spec.name;
    if (spec.helperType) {
      modeObj.helperType = spec.helperType;
    }
    if (spec.modeProps) {
      for (var prop$1 in spec.modeProps) {
        modeObj[prop$1] = spec.modeProps[prop$1];
      }
    }
    return modeObj;
  }
  var modeExtensions = {};
  function extendMode(mode, properties) {
    var exts = modeExtensions.hasOwnProperty(mode) ? modeExtensions[mode] : modeExtensions[mode] = {};
    copyObj(properties, exts);
  }
  function copyState(mode, state) {
    if (state === true) {
      return state;
    }
    if (mode.copyState) {
      return mode.copyState(state);
    }
    var nstate = {};
    for (var n in state) {
      var val = state[n];
      if (val instanceof Array) {
        val = val.concat([]);
      }
      nstate[n] = val;
    }
    return nstate;
  }
  function innerMode(mode, state) {
    var info;
    while (mode.innerMode) {
      info = mode.innerMode(state);
      if (!info || info.mode == mode) {
        break;
      }
      state = info.state;
      mode = info.mode;
    }
    return info || { mode, state };
  }
  function startState(mode, a1, a2) {
    return mode.startState ? mode.startState(a1, a2) : true;
  }
  var modeMethods = {
    __proto__: null,
    modes,
    mimeModes,
    defineMode,
    defineMIME,
    resolveMode,
    getMode,
    modeExtensions,
    extendMode,
    copyState,
    innerMode,
    startState
  };
  var root = typeof globalThis !== "undefined" ? globalThis : window;
  root.CodeMirror = {};
  CodeMirror.StringStream = StringStream;
  for (var exported in modeMethods) {
    CodeMirror[exported] = modeMethods[exported];
  }
  CodeMirror.defineMode("null", function() {
    return { token: function(stream) {
      return stream.skipToEnd();
    } };
  });
  CodeMirror.defineMIME("text/plain", "null");
  CodeMirror.registerHelper = CodeMirror.registerGlobalHelper = Math.min;
  CodeMirror.splitLines = function(string) {
    return string.split(/\r?\n|\r/);
  };
  CodeMirror.countColumn = countColumn;
  CodeMirror.defaults = { indentUnit: 2 };
  (function(mod) {
    if (typeof exports == "object" && typeof module == "object") {
      mod(__require("../../lib/codemirror"));
    } else if (typeof define == "function" && define.amd) {
      define(["../../lib/codemirror"], mod);
    } else {
      mod(CodeMirror);
    }
  })(function(CodeMirror2) {
    CodeMirror2.runMode = function(string, modespec, callback, options) {
      var mode = CodeMirror2.getMode(CodeMirror2.defaults, modespec);
      var tabSize = options && options.tabSize || CodeMirror2.defaults.tabSize;
      if (callback.appendChild) {
        var ie = /MSIE \d/.test(navigator.userAgent);
        var ie_lt9 = ie && (document.documentMode == null || document.documentMode < 9);
        var node = callback, col = 0;
        node.innerHTML = "";
        callback = function(text, style2) {
          if (text == "\n") {
            node.appendChild(document.createTextNode(ie_lt9 ? "\r" : text));
            col = 0;
            return;
          }
          var content = "";
          for (var pos = 0; ; ) {
            var idx = text.indexOf("	", pos);
            if (idx == -1) {
              content += text.slice(pos);
              col += text.length - pos;
              break;
            } else {
              col += idx - pos;
              content += text.slice(pos, idx);
              var size = tabSize - col % tabSize;
              col += size;
              for (var i2 = 0; i2 < size; ++i2) {
                content += " ";
              }
              pos = idx + 1;
            }
          }
          if (style2) {
            var sp = node.appendChild(document.createElement("span"));
            sp.className = "cm-" + style2.replace(/ +/g, " cm-");
            sp.appendChild(document.createTextNode(content));
          } else {
            node.appendChild(document.createTextNode(content));
          }
        };
      }
      var lines = CodeMirror2.splitLines(string), state = options && options.state || CodeMirror2.startState(mode);
      for (var i = 0, e = lines.length; i < e; ++i) {
        if (i) {
          callback("\n");
        }
        var stream = new CodeMirror2.StringStream(lines[i], null, {
          lookAhead: function(n) {
            return lines[i + n];
          },
          baseToken: function() {
          }
        });
        if (!stream.string && mode.blankLine) {
          mode.blankLine(state);
        }
        while (!stream.eol()) {
          var style = mode.token(stream, state);
          callback(stream.current(), style, i, stream.start, state, mode);
          stream.start = stream.pos;
        }
      }
    };
  });
})();

// gen/front_end/third_party/codemirror/package/mode/css/css.mjs
(function(mod) {
  if (typeof exports == "object" && typeof module == "object")
    mod(__require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd)
    define(["../../lib/codemirror"], mod);
  else
    mod(CodeMirror);
})(function(CodeMirror2) {
  "use strict";
  CodeMirror2.defineMode("css", function(config, parserConfig) {
    var inline = parserConfig.inline;
    if (!parserConfig.propertyKeywords) parserConfig = CodeMirror2.resolveMode("text/css");
    var indentUnit = config.indentUnit, tokenHooks = parserConfig.tokenHooks, documentTypes2 = parserConfig.documentTypes || {}, mediaTypes2 = parserConfig.mediaTypes || {}, mediaFeatures2 = parserConfig.mediaFeatures || {}, mediaValueKeywords2 = parserConfig.mediaValueKeywords || {}, propertyKeywords2 = parserConfig.propertyKeywords || {}, nonStandardPropertyKeywords2 = parserConfig.nonStandardPropertyKeywords || {}, fontProperties2 = parserConfig.fontProperties || {}, counterDescriptors2 = parserConfig.counterDescriptors || {}, colorKeywords2 = parserConfig.colorKeywords || {}, valueKeywords2 = parserConfig.valueKeywords || {}, allowNested = parserConfig.allowNested, lineComment = parserConfig.lineComment, supportsAtComponent = parserConfig.supportsAtComponent === true, highlightNonStandardPropertyKeywords = config.highlightNonStandardPropertyKeywords !== false;
    var type, override;
    function ret(style, tp) {
      type = tp;
      return style;
    }
    function tokenBase(stream, state) {
      var ch = stream.next();
      if (tokenHooks[ch]) {
        var result = tokenHooks[ch](stream, state);
        if (result !== false) return result;
      }
      if (ch == "@") {
        stream.eatWhile(/[\w\\\-]/);
        return ret("def", stream.current());
      } else if (ch == "=" || (ch == "~" || ch == "|") && stream.eat("=")) {
        return ret(null, "compare");
      } else if (ch == '"' || ch == "'") {
        state.tokenize = tokenString(ch);
        return state.tokenize(stream, state);
      } else if (ch == "#") {
        stream.eatWhile(/[\w\\\-]/);
        return ret("atom", "hash");
      } else if (ch == "!") {
        stream.match(/^\s*\w*/);
        return ret("keyword", "important");
      } else if (/\d/.test(ch) || ch == "." && stream.eat(/\d/)) {
        stream.eatWhile(/[\w.%]/);
        return ret("number", "unit");
      } else if (ch === "-") {
        if (/[\d.]/.test(stream.peek())) {
          stream.eatWhile(/[\w.%]/);
          return ret("number", "unit");
        } else if (stream.match(/^-[\w\\\-]*/)) {
          stream.eatWhile(/[\w\\\-]/);
          if (stream.match(/^\s*:/, false))
            return ret("variable-2", "variable-definition");
          return ret("variable-2", "variable");
        } else if (stream.match(/^\w+-/)) {
          return ret("meta", "meta");
        }
      } else if (/[,+>*\/]/.test(ch)) {
        return ret(null, "select-op");
      } else if (ch == "." && stream.match(/^-?[_a-z][_a-z0-9-]*/i)) {
        return ret("qualifier", "qualifier");
      } else if (/[:;{}\[\]\(\)]/.test(ch)) {
        return ret(null, ch);
      } else if (stream.match(/^[\w-.]+(?=\()/)) {
        if (/^(url(-prefix)?|domain|regexp)$/i.test(stream.current())) {
          state.tokenize = tokenParenthesized;
        }
        return ret("variable callee", "variable");
      } else if (/[\w\\\-]/.test(ch)) {
        stream.eatWhile(/[\w\\\-]/);
        return ret("property", "word");
      } else {
        return ret(null, null);
      }
    }
    function tokenString(quote) {
      return function(stream, state) {
        var escaped = false, ch;
        while ((ch = stream.next()) != null) {
          if (ch == quote && !escaped) {
            if (quote == ")") stream.backUp(1);
            break;
          }
          escaped = !escaped && ch == "\\";
        }
        if (ch == quote || !escaped && quote != ")") state.tokenize = null;
        return ret("string", "string");
      };
    }
    function tokenParenthesized(stream, state) {
      stream.next();
      if (!stream.match(/^\s*[\"\')]/, false))
        state.tokenize = tokenString(")");
      else
        state.tokenize = null;
      return ret(null, "(");
    }
    function Context(type2, indent, prev) {
      this.type = type2;
      this.indent = indent;
      this.prev = prev;
    }
    function pushContext(state, stream, type2, indent) {
      state.context = new Context(type2, stream.indentation() + (indent === false ? 0 : indentUnit), state.context);
      return type2;
    }
    function popContext(state) {
      if (state.context.prev)
        state.context = state.context.prev;
      return state.context.type;
    }
    function pass(type2, stream, state) {
      return states[state.context.type](type2, stream, state);
    }
    function popAndPass(type2, stream, state, n) {
      for (var i = n || 1; i > 0; i--)
        state.context = state.context.prev;
      return pass(type2, stream, state);
    }
    function wordAsValue(stream) {
      var word = stream.current().toLowerCase();
      if (valueKeywords2.hasOwnProperty(word))
        override = "atom";
      else if (colorKeywords2.hasOwnProperty(word))
        override = "keyword";
      else
        override = "variable";
    }
    var states = {};
    states.top = function(type2, stream, state) {
      if (type2 == "{") {
        return pushContext(state, stream, "block");
      } else if (type2 == "}" && state.context.prev) {
        return popContext(state);
      } else if (supportsAtComponent && /@component/i.test(type2)) {
        return pushContext(state, stream, "atComponentBlock");
      } else if (/^@(-moz-)?document$/i.test(type2)) {
        return pushContext(state, stream, "documentTypes");
      } else if (/^@(media|supports|(-moz-)?document|import)$/i.test(type2)) {
        return pushContext(state, stream, "atBlock");
      } else if (/^@(font-face|counter-style)/i.test(type2)) {
        state.stateArg = type2;
        return "restricted_atBlock_before";
      } else if (/^@(-(moz|ms|o|webkit)-)?keyframes$/i.test(type2)) {
        return "keyframes";
      } else if (type2 && type2.charAt(0) == "@") {
        return pushContext(state, stream, "at");
      } else if (type2 == "hash") {
        override = "builtin";
      } else if (type2 == "word") {
        override = "tag";
      } else if (type2 == "variable-definition") {
        return "maybeprop";
      } else if (type2 == "interpolation") {
        return pushContext(state, stream, "interpolation");
      } else if (type2 == ":") {
        return "pseudo";
      } else if (allowNested && type2 == "(") {
        return pushContext(state, stream, "parens");
      }
      return state.context.type;
    };
    states.block = function(type2, stream, state) {
      if (type2 == "word") {
        var word = stream.current().toLowerCase();
        if (propertyKeywords2.hasOwnProperty(word)) {
          override = "property";
          return "maybeprop";
        } else if (nonStandardPropertyKeywords2.hasOwnProperty(word)) {
          override = highlightNonStandardPropertyKeywords ? "string-2" : "property";
          return "maybeprop";
        } else if (allowNested) {
          override = stream.match(/^\s*:(?:\s|$)/, false) ? "property" : "tag";
          return "block";
        } else {
          override += " error";
          return "maybeprop";
        }
      } else if (type2 == "meta") {
        return "block";
      } else if (!allowNested && (type2 == "hash" || type2 == "qualifier")) {
        override = "error";
        return "block";
      } else {
        return states.top(type2, stream, state);
      }
    };
    states.maybeprop = function(type2, stream, state) {
      if (type2 == ":") return pushContext(state, stream, "prop");
      return pass(type2, stream, state);
    };
    states.prop = function(type2, stream, state) {
      if (type2 == ";") return popContext(state);
      if (type2 == "{" && allowNested) return pushContext(state, stream, "propBlock");
      if (type2 == "}" || type2 == "{") return popAndPass(type2, stream, state);
      if (type2 == "(") return pushContext(state, stream, "parens");
      if (type2 == "hash" && !/^#([0-9a-fA-f]{3,4}|[0-9a-fA-f]{6}|[0-9a-fA-f]{8})$/.test(stream.current())) {
        override += " error";
      } else if (type2 == "word") {
        wordAsValue(stream);
      } else if (type2 == "interpolation") {
        return pushContext(state, stream, "interpolation");
      }
      return "prop";
    };
    states.propBlock = function(type2, _stream, state) {
      if (type2 == "}") return popContext(state);
      if (type2 == "word") {
        override = "property";
        return "maybeprop";
      }
      return state.context.type;
    };
    states.parens = function(type2, stream, state) {
      if (type2 == "{" || type2 == "}") return popAndPass(type2, stream, state);
      if (type2 == ")") return popContext(state);
      if (type2 == "(") return pushContext(state, stream, "parens");
      if (type2 == "interpolation") return pushContext(state, stream, "interpolation");
      if (type2 == "word") wordAsValue(stream);
      return "parens";
    };
    states.pseudo = function(type2, stream, state) {
      if (type2 == "meta") return "pseudo";
      if (type2 == "word") {
        override = "variable-3";
        return state.context.type;
      }
      return pass(type2, stream, state);
    };
    states.documentTypes = function(type2, stream, state) {
      if (type2 == "word" && documentTypes2.hasOwnProperty(stream.current())) {
        override = "tag";
        return state.context.type;
      } else {
        return states.atBlock(type2, stream, state);
      }
    };
    states.atBlock = function(type2, stream, state) {
      if (type2 == "(") return pushContext(state, stream, "atBlock_parens");
      if (type2 == "}" || type2 == ";") return popAndPass(type2, stream, state);
      if (type2 == "{") return popContext(state) && pushContext(state, stream, allowNested ? "block" : "top");
      if (type2 == "interpolation") return pushContext(state, stream, "interpolation");
      if (type2 == "word") {
        var word = stream.current().toLowerCase();
        if (word == "only" || word == "not" || word == "and" || word == "or")
          override = "keyword";
        else if (mediaTypes2.hasOwnProperty(word))
          override = "attribute";
        else if (mediaFeatures2.hasOwnProperty(word))
          override = "property";
        else if (mediaValueKeywords2.hasOwnProperty(word))
          override = "keyword";
        else if (propertyKeywords2.hasOwnProperty(word))
          override = "property";
        else if (nonStandardPropertyKeywords2.hasOwnProperty(word))
          override = highlightNonStandardPropertyKeywords ? "string-2" : "property";
        else if (valueKeywords2.hasOwnProperty(word))
          override = "atom";
        else if (colorKeywords2.hasOwnProperty(word))
          override = "keyword";
        else
          override = "error";
      }
      return state.context.type;
    };
    states.atComponentBlock = function(type2, stream, state) {
      if (type2 == "}")
        return popAndPass(type2, stream, state);
      if (type2 == "{")
        return popContext(state) && pushContext(state, stream, allowNested ? "block" : "top", false);
      if (type2 == "word")
        override = "error";
      return state.context.type;
    };
    states.atBlock_parens = function(type2, stream, state) {
      if (type2 == ")") return popContext(state);
      if (type2 == "{" || type2 == "}") return popAndPass(type2, stream, state, 2);
      return states.atBlock(type2, stream, state);
    };
    states.restricted_atBlock_before = function(type2, stream, state) {
      if (type2 == "{")
        return pushContext(state, stream, "restricted_atBlock");
      if (type2 == "word" && state.stateArg == "@counter-style") {
        override = "variable";
        return "restricted_atBlock_before";
      }
      return pass(type2, stream, state);
    };
    states.restricted_atBlock = function(type2, stream, state) {
      if (type2 == "}") {
        state.stateArg = null;
        return popContext(state);
      }
      if (type2 == "word") {
        if (state.stateArg == "@font-face" && !fontProperties2.hasOwnProperty(stream.current().toLowerCase()) || state.stateArg == "@counter-style" && !counterDescriptors2.hasOwnProperty(stream.current().toLowerCase()))
          override = "error";
        else
          override = "property";
        return "maybeprop";
      }
      return "restricted_atBlock";
    };
    states.keyframes = function(type2, stream, state) {
      if (type2 == "word") {
        override = "variable";
        return "keyframes";
      }
      if (type2 == "{") return pushContext(state, stream, "top");
      return pass(type2, stream, state);
    };
    states.at = function(type2, stream, state) {
      if (type2 == ";") return popContext(state);
      if (type2 == "{" || type2 == "}") return popAndPass(type2, stream, state);
      if (type2 == "word") override = "tag";
      else if (type2 == "hash") override = "builtin";
      return "at";
    };
    states.interpolation = function(type2, stream, state) {
      if (type2 == "}") return popContext(state);
      if (type2 == "{" || type2 == ";") return popAndPass(type2, stream, state);
      if (type2 == "word") override = "variable";
      else if (type2 != "variable" && type2 != "(" && type2 != ")") override = "error";
      return "interpolation";
    };
    return {
      startState: function(base) {
        return {
          tokenize: null,
          state: inline ? "block" : "top",
          stateArg: null,
          context: new Context(inline ? "block" : "top", base || 0, null)
        };
      },
      token: function(stream, state) {
        if (!state.tokenize && stream.eatSpace()) return null;
        var style = (state.tokenize || tokenBase)(stream, state);
        if (style && typeof style == "object") {
          type = style[1];
          style = style[0];
        }
        override = style;
        if (type != "comment")
          state.state = states[state.state](type, stream, state);
        return override;
      },
      indent: function(state, textAfter) {
        var cx = state.context, ch = textAfter && textAfter.charAt(0);
        var indent = cx.indent;
        if (cx.type == "prop" && (ch == "}" || ch == ")")) cx = cx.prev;
        if (cx.prev) {
          if (ch == "}" && (cx.type == "block" || cx.type == "top" || cx.type == "interpolation" || cx.type == "restricted_atBlock")) {
            cx = cx.prev;
            indent = cx.indent;
          } else if (ch == ")" && (cx.type == "parens" || cx.type == "atBlock_parens") || ch == "{" && (cx.type == "at" || cx.type == "atBlock")) {
            indent = Math.max(0, cx.indent - indentUnit);
          }
        }
        return indent;
      },
      electricChars: "}",
      blockCommentStart: "/*",
      blockCommentEnd: "*/",
      blockCommentContinue: " * ",
      lineComment,
      fold: "brace"
    };
  });
  function keySet(array) {
    var keys = {};
    for (var i = 0; i < array.length; ++i) {
      keys[array[i].toLowerCase()] = true;
    }
    return keys;
  }
  var documentTypes_ = [
    "domain",
    "regexp",
    "url",
    "url-prefix"
  ], documentTypes = keySet(documentTypes_);
  var mediaTypes_ = [
    "all",
    "aural",
    "braille",
    "handheld",
    "print",
    "projection",
    "screen",
    "tty",
    "tv",
    "embossed"
  ], mediaTypes = keySet(mediaTypes_);
  var mediaFeatures_ = [
    "width",
    "min-width",
    "max-width",
    "height",
    "min-height",
    "max-height",
    "device-width",
    "min-device-width",
    "max-device-width",
    "device-height",
    "min-device-height",
    "max-device-height",
    "aspect-ratio",
    "min-aspect-ratio",
    "max-aspect-ratio",
    "device-aspect-ratio",
    "min-device-aspect-ratio",
    "max-device-aspect-ratio",
    "color",
    "min-color",
    "max-color",
    "color-index",
    "min-color-index",
    "max-color-index",
    "monochrome",
    "min-monochrome",
    "max-monochrome",
    "resolution",
    "min-resolution",
    "max-resolution",
    "scan",
    "grid",
    "orientation",
    "device-pixel-ratio",
    "min-device-pixel-ratio",
    "max-device-pixel-ratio",
    "pointer",
    "any-pointer",
    "hover",
    "any-hover",
    "prefers-color-scheme"
  ], mediaFeatures = keySet(mediaFeatures_);
  var mediaValueKeywords_ = [
    "landscape",
    "portrait",
    "none",
    "coarse",
    "fine",
    "on-demand",
    "hover",
    "interlace",
    "progressive",
    "dark",
    "light"
  ], mediaValueKeywords = keySet(mediaValueKeywords_);
  var propertyKeywords_ = [
    "align-content",
    "align-items",
    "align-self",
    "alignment-adjust",
    "alignment-baseline",
    "all",
    "anchor-point",
    "animation",
    "animation-delay",
    "animation-direction",
    "animation-duration",
    "animation-fill-mode",
    "animation-iteration-count",
    "animation-name",
    "animation-play-state",
    "animation-timing-function",
    "appearance",
    "azimuth",
    "backdrop-filter",
    "backface-visibility",
    "background",
    "background-attachment",
    "background-blend-mode",
    "background-clip",
    "background-color",
    "background-image",
    "background-origin",
    "background-position",
    "background-position-x",
    "background-position-y",
    "background-repeat",
    "background-size",
    "baseline-shift",
    "binding",
    "bleed",
    "block-size",
    "bookmark-label",
    "bookmark-level",
    "bookmark-state",
    "bookmark-target",
    "border",
    "border-bottom",
    "border-bottom-color",
    "border-bottom-left-radius",
    "border-bottom-right-radius",
    "border-bottom-style",
    "border-bottom-width",
    "border-collapse",
    "border-color",
    "border-image",
    "border-image-outset",
    "border-image-repeat",
    "border-image-slice",
    "border-image-source",
    "border-image-width",
    "border-left",
    "border-left-color",
    "border-left-style",
    "border-left-width",
    "border-radius",
    "border-right",
    "border-right-color",
    "border-right-style",
    "border-right-width",
    "border-spacing",
    "border-style",
    "border-top",
    "border-top-color",
    "border-top-left-radius",
    "border-top-right-radius",
    "border-top-style",
    "border-top-width",
    "border-width",
    "bottom",
    "box-decoration-break",
    "box-shadow",
    "box-sizing",
    "break-after",
    "break-before",
    "break-inside",
    "caption-side",
    "caret-color",
    "clear",
    "clip",
    "color",
    "color-profile",
    "column-count",
    "column-fill",
    "column-gap",
    "column-rule",
    "column-rule-color",
    "column-rule-style",
    "column-rule-width",
    "column-span",
    "column-width",
    "columns",
    "contain",
    "content",
    "counter-increment",
    "counter-reset",
    "crop",
    "cue",
    "cue-after",
    "cue-before",
    "cursor",
    "direction",
    "display",
    "dominant-baseline",
    "drop-initial-after-adjust",
    "drop-initial-after-align",
    "drop-initial-before-adjust",
    "drop-initial-before-align",
    "drop-initial-size",
    "drop-initial-value",
    "elevation",
    "empty-cells",
    "fit",
    "fit-position",
    "flex",
    "flex-basis",
    "flex-direction",
    "flex-flow",
    "flex-grow",
    "flex-shrink",
    "flex-wrap",
    "float",
    "float-offset",
    "flow-from",
    "flow-into",
    "font",
    "font-family",
    "font-feature-settings",
    "font-kerning",
    "font-language-override",
    "font-optical-sizing",
    "font-size",
    "font-size-adjust",
    "font-stretch",
    "font-style",
    "font-synthesis",
    "font-variant",
    "font-variant-alternates",
    "font-variant-caps",
    "font-variant-east-asian",
    "font-variant-ligatures",
    "font-variant-numeric",
    "font-variant-position",
    "font-variation-settings",
    "font-weight",
    "gap",
    "grid",
    "grid-area",
    "grid-auto-columns",
    "grid-auto-flow",
    "grid-auto-rows",
    "grid-column",
    "grid-column-end",
    "grid-column-gap",
    "grid-column-start",
    "grid-gap",
    "grid-row",
    "grid-row-end",
    "grid-row-gap",
    "grid-row-start",
    "grid-template",
    "grid-template-areas",
    "grid-template-columns",
    "grid-template-rows",
    "hanging-punctuation",
    "height",
    "hyphens",
    "icon",
    "image-orientation",
    "image-rendering",
    "image-resolution",
    "inline-box-align",
    "inset",
    "inset-block",
    "inset-block-end",
    "inset-block-start",
    "inset-inline",
    "inset-inline-end",
    "inset-inline-start",
    "isolation",
    "justify-content",
    "justify-items",
    "justify-self",
    "left",
    "letter-spacing",
    "line-break",
    "line-height",
    "line-height-step",
    "line-stacking",
    "line-stacking-ruby",
    "line-stacking-shift",
    "line-stacking-strategy",
    "list-style",
    "list-style-image",
    "list-style-position",
    "list-style-type",
    "margin",
    "margin-bottom",
    "margin-left",
    "margin-right",
    "margin-top",
    "marks",
    "marquee-direction",
    "marquee-loop",
    "marquee-play-count",
    "marquee-speed",
    "marquee-style",
    "mask-clip",
    "mask-composite",
    "mask-image",
    "mask-mode",
    "mask-origin",
    "mask-position",
    "mask-repeat",
    "mask-size",
    "mask-type",
    "max-block-size",
    "max-height",
    "max-inline-size",
    "max-width",
    "min-block-size",
    "min-height",
    "min-inline-size",
    "min-width",
    "mix-blend-mode",
    "move-to",
    "nav-down",
    "nav-index",
    "nav-left",
    "nav-right",
    "nav-up",
    "object-fit",
    "object-position",
    "offset",
    "offset-anchor",
    "offset-distance",
    "offset-path",
    "offset-position",
    "offset-rotate",
    "opacity",
    "order",
    "orphans",
    "outline",
    "outline-color",
    "outline-offset",
    "outline-style",
    "outline-width",
    "overflow",
    "overflow-style",
    "overflow-wrap",
    "overflow-x",
    "overflow-y",
    "padding",
    "padding-bottom",
    "padding-left",
    "padding-right",
    "padding-top",
    "page",
    "page-break-after",
    "page-break-before",
    "page-break-inside",
    "page-policy",
    "pause",
    "pause-after",
    "pause-before",
    "perspective",
    "perspective-origin",
    "pitch",
    "pitch-range",
    "place-content",
    "place-items",
    "place-self",
    "play-during",
    "position",
    "presentation-level",
    "punctuation-trim",
    "quotes",
    "region-break-after",
    "region-break-before",
    "region-break-inside",
    "region-fragment",
    "rendering-intent",
    "resize",
    "rest",
    "rest-after",
    "rest-before",
    "richness",
    "right",
    "rotate",
    "rotation",
    "rotation-point",
    "row-gap",
    "ruby-align",
    "ruby-overhang",
    "ruby-position",
    "ruby-span",
    "scale",
    "scroll-behavior",
    "scroll-margin",
    "scroll-margin-block",
    "scroll-margin-block-end",
    "scroll-margin-block-start",
    "scroll-margin-bottom",
    "scroll-margin-inline",
    "scroll-margin-inline-end",
    "scroll-margin-inline-start",
    "scroll-margin-left",
    "scroll-margin-right",
    "scroll-margin-top",
    "scroll-padding",
    "scroll-padding-block",
    "scroll-padding-block-end",
    "scroll-padding-block-start",
    "scroll-padding-bottom",
    "scroll-padding-inline",
    "scroll-padding-inline-end",
    "scroll-padding-inline-start",
    "scroll-padding-left",
    "scroll-padding-right",
    "scroll-padding-top",
    "scroll-snap-align",
    "scroll-snap-type",
    "shape-image-threshold",
    "shape-inside",
    "shape-margin",
    "shape-outside",
    "size",
    "speak",
    "speak-as",
    "speak-header",
    "speak-numeral",
    "speak-punctuation",
    "speech-rate",
    "stress",
    "string-set",
    "tab-size",
    "table-layout",
    "target",
    "target-name",
    "target-new",
    "target-position",
    "text-align",
    "text-align-last",
    "text-combine-upright",
    "text-decoration",
    "text-decoration-color",
    "text-decoration-line",
    "text-decoration-skip",
    "text-decoration-skip-ink",
    "text-decoration-style",
    "text-emphasis",
    "text-emphasis-color",
    "text-emphasis-position",
    "text-emphasis-style",
    "text-height",
    "text-indent",
    "text-justify",
    "text-orientation",
    "text-outline",
    "text-overflow",
    "text-rendering",
    "text-shadow",
    "text-size-adjust",
    "text-space-collapse",
    "text-transform",
    "text-underline-position",
    "text-wrap",
    "top",
    "touch-action",
    "transform",
    "transform-origin",
    "transform-style",
    "transition",
    "transition-delay",
    "transition-duration",
    "transition-property",
    "transition-timing-function",
    "translate",
    "unicode-bidi",
    "user-select",
    "vertical-align",
    "visibility",
    "voice-balance",
    "voice-duration",
    "voice-family",
    "voice-pitch",
    "voice-range",
    "voice-rate",
    "voice-stress",
    "voice-volume",
    "volume",
    "white-space",
    "widows",
    "width",
    "will-change",
    "word-break",
    "word-spacing",
    "word-wrap",
    "writing-mode",
    "z-index",
    // SVG-specific
    "clip-path",
    "clip-rule",
    "mask",
    "enable-background",
    "filter",
    "flood-color",
    "flood-opacity",
    "lighting-color",
    "stop-color",
    "stop-opacity",
    "pointer-events",
    "color-interpolation",
    "color-interpolation-filters",
    "color-rendering",
    "fill",
    "fill-opacity",
    "fill-rule",
    "image-rendering",
    "marker",
    "marker-end",
    "marker-mid",
    "marker-start",
    "paint-order",
    "shape-rendering",
    "stroke",
    "stroke-dasharray",
    "stroke-dashoffset",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-miterlimit",
    "stroke-opacity",
    "stroke-width",
    "text-rendering",
    "baseline-shift",
    "dominant-baseline",
    "glyph-orientation-horizontal",
    "glyph-orientation-vertical",
    "text-anchor",
    "writing-mode"
  ], propertyKeywords = keySet(propertyKeywords_);
  var nonStandardPropertyKeywords_ = [
    "border-block",
    "border-block-color",
    "border-block-end",
    "border-block-end-color",
    "border-block-end-style",
    "border-block-end-width",
    "border-block-start",
    "border-block-start-color",
    "border-block-start-style",
    "border-block-start-width",
    "border-block-style",
    "border-block-width",
    "border-inline",
    "border-inline-color",
    "border-inline-end",
    "border-inline-end-color",
    "border-inline-end-style",
    "border-inline-end-width",
    "border-inline-start",
    "border-inline-start-color",
    "border-inline-start-style",
    "border-inline-start-width",
    "border-inline-style",
    "border-inline-width",
    "margin-block",
    "margin-block-end",
    "margin-block-start",
    "margin-inline",
    "margin-inline-end",
    "margin-inline-start",
    "padding-block",
    "padding-block-end",
    "padding-block-start",
    "padding-inline",
    "padding-inline-end",
    "padding-inline-start",
    "scroll-snap-stop",
    "scrollbar-3d-light-color",
    "scrollbar-arrow-color",
    "scrollbar-base-color",
    "scrollbar-dark-shadow-color",
    "scrollbar-face-color",
    "scrollbar-highlight-color",
    "scrollbar-shadow-color",
    "scrollbar-track-color",
    "searchfield-cancel-button",
    "searchfield-decoration",
    "searchfield-results-button",
    "searchfield-results-decoration",
    "shape-inside",
    "zoom"
  ], nonStandardPropertyKeywords = keySet(nonStandardPropertyKeywords_);
  var fontProperties_ = [
    "font-display",
    "font-family",
    "src",
    "unicode-range",
    "font-variant",
    "font-feature-settings",
    "font-stretch",
    "font-weight",
    "font-style"
  ], fontProperties = keySet(fontProperties_);
  var counterDescriptors_ = [
    "additive-symbols",
    "fallback",
    "negative",
    "pad",
    "prefix",
    "range",
    "speak-as",
    "suffix",
    "symbols",
    "system"
  ], counterDescriptors = keySet(counterDescriptors_);
  var colorKeywords_ = [
    "aliceblue",
    "antiquewhite",
    "aqua",
    "aquamarine",
    "azure",
    "beige",
    "bisque",
    "black",
    "blanchedalmond",
    "blue",
    "blueviolet",
    "brown",
    "burlywood",
    "cadetblue",
    "chartreuse",
    "chocolate",
    "coral",
    "cornflowerblue",
    "cornsilk",
    "crimson",
    "cyan",
    "darkblue",
    "darkcyan",
    "darkgoldenrod",
    "darkgray",
    "darkgreen",
    "darkkhaki",
    "darkmagenta",
    "darkolivegreen",
    "darkorange",
    "darkorchid",
    "darkred",
    "darksalmon",
    "darkseagreen",
    "darkslateblue",
    "darkslategray",
    "darkturquoise",
    "darkviolet",
    "deeppink",
    "deepskyblue",
    "dimgray",
    "dodgerblue",
    "firebrick",
    "floralwhite",
    "forestgreen",
    "fuchsia",
    "gainsboro",
    "ghostwhite",
    "gold",
    "goldenrod",
    "gray",
    "grey",
    "green",
    "greenyellow",
    "honeydew",
    "hotpink",
    "indianred",
    "indigo",
    "ivory",
    "khaki",
    "lavender",
    "lavenderblush",
    "lawngreen",
    "lemonchiffon",
    "lightblue",
    "lightcoral",
    "lightcyan",
    "lightgoldenrodyellow",
    "lightgray",
    "lightgreen",
    "lightpink",
    "lightsalmon",
    "lightseagreen",
    "lightskyblue",
    "lightslategray",
    "lightsteelblue",
    "lightyellow",
    "lime",
    "limegreen",
    "linen",
    "magenta",
    "maroon",
    "mediumaquamarine",
    "mediumblue",
    "mediumorchid",
    "mediumpurple",
    "mediumseagreen",
    "mediumslateblue",
    "mediumspringgreen",
    "mediumturquoise",
    "mediumvioletred",
    "midnightblue",
    "mintcream",
    "mistyrose",
    "moccasin",
    "navajowhite",
    "navy",
    "oldlace",
    "olive",
    "olivedrab",
    "orange",
    "orangered",
    "orchid",
    "palegoldenrod",
    "palegreen",
    "paleturquoise",
    "palevioletred",
    "papayawhip",
    "peachpuff",
    "peru",
    "pink",
    "plum",
    "powderblue",
    "purple",
    "rebeccapurple",
    "red",
    "rosybrown",
    "royalblue",
    "saddlebrown",
    "salmon",
    "sandybrown",
    "seagreen",
    "seashell",
    "sienna",
    "silver",
    "skyblue",
    "slateblue",
    "slategray",
    "snow",
    "springgreen",
    "steelblue",
    "tan",
    "teal",
    "thistle",
    "tomato",
    "turquoise",
    "violet",
    "wheat",
    "white",
    "whitesmoke",
    "yellow",
    "yellowgreen"
  ], colorKeywords = keySet(colorKeywords_);
  var valueKeywords_ = [
    "above",
    "absolute",
    "activeborder",
    "additive",
    "activecaption",
    "afar",
    "after-white-space",
    "ahead",
    "alias",
    "all",
    "all-scroll",
    "alphabetic",
    "alternate",
    "always",
    "amharic",
    "amharic-abegede",
    "antialiased",
    "appworkspace",
    "arabic-indic",
    "armenian",
    "asterisks",
    "attr",
    "auto",
    "auto-flow",
    "avoid",
    "avoid-column",
    "avoid-page",
    "avoid-region",
    "axis-pan",
    "background",
    "backwards",
    "baseline",
    "below",
    "bidi-override",
    "binary",
    "bengali",
    "blink",
    "block",
    "block-axis",
    "bold",
    "bolder",
    "border",
    "border-box",
    "both",
    "bottom",
    "break",
    "break-all",
    "break-word",
    "bullets",
    "button",
    "button-bevel",
    "buttonface",
    "buttonhighlight",
    "buttonshadow",
    "buttontext",
    "calc",
    "cambodian",
    "capitalize",
    "caps-lock-indicator",
    "caption",
    "captiontext",
    "caret",
    "cell",
    "center",
    "checkbox",
    "circle",
    "cjk-decimal",
    "cjk-earthly-branch",
    "cjk-heavenly-stem",
    "cjk-ideographic",
    "clear",
    "clip",
    "close-quote",
    "col-resize",
    "collapse",
    "color",
    "color-burn",
    "color-dodge",
    "column",
    "column-reverse",
    "compact",
    "condensed",
    "contain",
    "content",
    "contents",
    "content-box",
    "context-menu",
    "continuous",
    "copy",
    "counter",
    "counters",
    "cover",
    "crop",
    "cross",
    "crosshair",
    "currentcolor",
    "cursive",
    "cyclic",
    "darken",
    "dashed",
    "decimal",
    "decimal-leading-zero",
    "default",
    "default-button",
    "dense",
    "destination-atop",
    "destination-in",
    "destination-out",
    "destination-over",
    "devanagari",
    "difference",
    "disc",
    "discard",
    "disclosure-closed",
    "disclosure-open",
    "document",
    "dot-dash",
    "dot-dot-dash",
    "dotted",
    "double",
    "down",
    "e-resize",
    "ease",
    "ease-in",
    "ease-in-out",
    "ease-out",
    "element",
    "ellipse",
    "ellipsis",
    "embed",
    "end",
    "ethiopic",
    "ethiopic-abegede",
    "ethiopic-abegede-am-et",
    "ethiopic-abegede-gez",
    "ethiopic-abegede-ti-er",
    "ethiopic-abegede-ti-et",
    "ethiopic-halehame-aa-er",
    "ethiopic-halehame-aa-et",
    "ethiopic-halehame-am-et",
    "ethiopic-halehame-gez",
    "ethiopic-halehame-om-et",
    "ethiopic-halehame-sid-et",
    "ethiopic-halehame-so-et",
    "ethiopic-halehame-ti-er",
    "ethiopic-halehame-ti-et",
    "ethiopic-halehame-tig",
    "ethiopic-numeric",
    "ew-resize",
    "exclusion",
    "expanded",
    "extends",
    "extra-condensed",
    "extra-expanded",
    "fantasy",
    "fast",
    "fill",
    "fill-box",
    "fixed",
    "flat",
    "flex",
    "flex-end",
    "flex-start",
    "footnotes",
    "forwards",
    "from",
    "geometricPrecision",
    "georgian",
    "graytext",
    "grid",
    "groove",
    "gujarati",
    "gurmukhi",
    "hand",
    "hangul",
    "hangul-consonant",
    "hard-light",
    "hebrew",
    "help",
    "hidden",
    "hide",
    "higher",
    "highlight",
    "highlighttext",
    "hiragana",
    "hiragana-iroha",
    "horizontal",
    "hsl",
    "hsla",
    "hue",
    "icon",
    "ignore",
    "inactiveborder",
    "inactivecaption",
    "inactivecaptiontext",
    "infinite",
    "infobackground",
    "infotext",
    "inherit",
    "initial",
    "inline",
    "inline-axis",
    "inline-block",
    "inline-flex",
    "inline-grid",
    "inline-table",
    "inset",
    "inside",
    "intrinsic",
    "invert",
    "italic",
    "japanese-formal",
    "japanese-informal",
    "justify",
    "kannada",
    "katakana",
    "katakana-iroha",
    "keep-all",
    "khmer",
    "korean-hangul-formal",
    "korean-hanja-formal",
    "korean-hanja-informal",
    "landscape",
    "lao",
    "large",
    "larger",
    "left",
    "level",
    "lighter",
    "lighten",
    "line-through",
    "linear",
    "linear-gradient",
    "lines",
    "list-item",
    "listbox",
    "listitem",
    "local",
    "logical",
    "loud",
    "lower",
    "lower-alpha",
    "lower-armenian",
    "lower-greek",
    "lower-hexadecimal",
    "lower-latin",
    "lower-norwegian",
    "lower-roman",
    "lowercase",
    "ltr",
    "luminosity",
    "malayalam",
    "manipulation",
    "match",
    "matrix",
    "matrix3d",
    "media-controls-background",
    "media-current-time-display",
    "media-fullscreen-button",
    "media-mute-button",
    "media-play-button",
    "media-return-to-realtime-button",
    "media-rewind-button",
    "media-seek-back-button",
    "media-seek-forward-button",
    "media-slider",
    "media-sliderthumb",
    "media-time-remaining-display",
    "media-volume-slider",
    "media-volume-slider-container",
    "media-volume-sliderthumb",
    "medium",
    "menu",
    "menulist",
    "menulist-button",
    "menulist-text",
    "menulist-textfield",
    "menutext",
    "message-box",
    "middle",
    "min-intrinsic",
    "mix",
    "mongolian",
    "monospace",
    "move",
    "multiple",
    "multiple_mask_images",
    "multiply",
    "myanmar",
    "n-resize",
    "narrower",
    "ne-resize",
    "nesw-resize",
    "no-close-quote",
    "no-drop",
    "no-open-quote",
    "no-repeat",
    "none",
    "normal",
    "not-allowed",
    "nowrap",
    "ns-resize",
    "numbers",
    "numeric",
    "nw-resize",
    "nwse-resize",
    "oblique",
    "octal",
    "opacity",
    "open-quote",
    "optimizeLegibility",
    "optimizeSpeed",
    "oriya",
    "oromo",
    "outset",
    "outside",
    "outside-shape",
    "overlay",
    "overline",
    "padding",
    "padding-box",
    "painted",
    "page",
    "paused",
    "persian",
    "perspective",
    "pinch-zoom",
    "plus-darker",
    "plus-lighter",
    "pointer",
    "polygon",
    "portrait",
    "pre",
    "pre-line",
    "pre-wrap",
    "preserve-3d",
    "progress",
    "push-button",
    "radial-gradient",
    "radio",
    "read-only",
    "read-write",
    "read-write-plaintext-only",
    "rectangle",
    "region",
    "relative",
    "repeat",
    "repeating-linear-gradient",
    "repeating-radial-gradient",
    "repeat-x",
    "repeat-y",
    "reset",
    "reverse",
    "rgb",
    "rgba",
    "ridge",
    "right",
    "rotate",
    "rotate3d",
    "rotateX",
    "rotateY",
    "rotateZ",
    "round",
    "row",
    "row-resize",
    "row-reverse",
    "rtl",
    "run-in",
    "running",
    "s-resize",
    "sans-serif",
    "saturation",
    "scale",
    "scale3d",
    "scaleX",
    "scaleY",
    "scaleZ",
    "screen",
    "scroll",
    "scrollbar",
    "scroll-position",
    "se-resize",
    "searchfield",
    "searchfield-cancel-button",
    "searchfield-decoration",
    "searchfield-results-button",
    "searchfield-results-decoration",
    "self-start",
    "self-end",
    "semi-condensed",
    "semi-expanded",
    "separate",
    "serif",
    "show",
    "sidama",
    "simp-chinese-formal",
    "simp-chinese-informal",
    "single",
    "skew",
    "skewX",
    "skewY",
    "skip-white-space",
    "slide",
    "slider-horizontal",
    "slider-vertical",
    "sliderthumb-horizontal",
    "sliderthumb-vertical",
    "slow",
    "small",
    "small-caps",
    "small-caption",
    "smaller",
    "soft-light",
    "solid",
    "somali",
    "source-atop",
    "source-in",
    "source-out",
    "source-over",
    "space",
    "space-around",
    "space-between",
    "space-evenly",
    "spell-out",
    "square",
    "square-button",
    "start",
    "static",
    "status-bar",
    "stretch",
    "stroke",
    "stroke-box",
    "sub",
    "subpixel-antialiased",
    "svg_masks",
    "super",
    "sw-resize",
    "symbolic",
    "symbols",
    "system-ui",
    "table",
    "table-caption",
    "table-cell",
    "table-column",
    "table-column-group",
    "table-footer-group",
    "table-header-group",
    "table-row",
    "table-row-group",
    "tamil",
    "telugu",
    "text",
    "text-bottom",
    "text-top",
    "textarea",
    "textfield",
    "thai",
    "thick",
    "thin",
    "threeddarkshadow",
    "threedface",
    "threedhighlight",
    "threedlightshadow",
    "threedshadow",
    "tibetan",
    "tigre",
    "tigrinya-er",
    "tigrinya-er-abegede",
    "tigrinya-et",
    "tigrinya-et-abegede",
    "to",
    "top",
    "trad-chinese-formal",
    "trad-chinese-informal",
    "transform",
    "translate",
    "translate3d",
    "translateX",
    "translateY",
    "translateZ",
    "transparent",
    "ultra-condensed",
    "ultra-expanded",
    "underline",
    "unidirectional-pan",
    "unset",
    "up",
    "upper-alpha",
    "upper-armenian",
    "upper-greek",
    "upper-hexadecimal",
    "upper-latin",
    "upper-norwegian",
    "upper-roman",
    "uppercase",
    "urdu",
    "url",
    "var",
    "vertical",
    "vertical-text",
    "view-box",
    "visible",
    "visibleFill",
    "visiblePainted",
    "visibleStroke",
    "visual",
    "w-resize",
    "wait",
    "wave",
    "wider",
    "window",
    "windowframe",
    "windowtext",
    "words",
    "wrap",
    "wrap-reverse",
    "x-large",
    "x-small",
    "xor",
    "xx-large",
    "xx-small"
  ], valueKeywords = keySet(valueKeywords_);
  var allWords = documentTypes_.concat(mediaTypes_).concat(mediaFeatures_).concat(mediaValueKeywords_).concat(propertyKeywords_).concat(nonStandardPropertyKeywords_).concat(colorKeywords_).concat(valueKeywords_);
  CodeMirror2.registerHelper("hintWords", "css", allWords);
  function tokenCComment(stream, state) {
    var maybeEnd = false, ch;
    while ((ch = stream.next()) != null) {
      if (maybeEnd && ch == "/") {
        state.tokenize = null;
        break;
      }
      maybeEnd = ch == "*";
    }
    return ["comment", "comment"];
  }
  CodeMirror2.defineMIME("text/css", {
    documentTypes,
    mediaTypes,
    mediaFeatures,
    mediaValueKeywords,
    propertyKeywords,
    nonStandardPropertyKeywords,
    fontProperties,
    counterDescriptors,
    colorKeywords,
    valueKeywords,
    tokenHooks: {
      "/": function(stream, state) {
        if (!stream.eat("*")) return false;
        state.tokenize = tokenCComment;
        return tokenCComment(stream, state);
      }
    },
    name: "css"
  });
  CodeMirror2.defineMIME("text/x-scss", {
    mediaTypes,
    mediaFeatures,
    mediaValueKeywords,
    propertyKeywords,
    nonStandardPropertyKeywords,
    colorKeywords,
    valueKeywords,
    fontProperties,
    allowNested: true,
    lineComment: "//",
    tokenHooks: {
      "/": function(stream, state) {
        if (stream.eat("/")) {
          stream.skipToEnd();
          return ["comment", "comment"];
        } else if (stream.eat("*")) {
          state.tokenize = tokenCComment;
          return tokenCComment(stream, state);
        } else {
          return ["operator", "operator"];
        }
      },
      ":": function(stream) {
        if (stream.match(/^\s*\{/, false))
          return [null, null];
        return false;
      },
      "$": function(stream) {
        stream.match(/^[\w-]+/);
        if (stream.match(/^\s*:/, false))
          return ["variable-2", "variable-definition"];
        return ["variable-2", "variable"];
      },
      "#": function(stream) {
        if (!stream.eat("{")) return false;
        return [null, "interpolation"];
      }
    },
    name: "css",
    helperType: "scss"
  });
  CodeMirror2.defineMIME("text/x-less", {
    mediaTypes,
    mediaFeatures,
    mediaValueKeywords,
    propertyKeywords,
    nonStandardPropertyKeywords,
    colorKeywords,
    valueKeywords,
    fontProperties,
    allowNested: true,
    lineComment: "//",
    tokenHooks: {
      "/": function(stream, state) {
        if (stream.eat("/")) {
          stream.skipToEnd();
          return ["comment", "comment"];
        } else if (stream.eat("*")) {
          state.tokenize = tokenCComment;
          return tokenCComment(stream, state);
        } else {
          return ["operator", "operator"];
        }
      },
      "@": function(stream) {
        if (stream.eat("{")) return [null, "interpolation"];
        if (stream.match(/^(charset|document|font-face|import|(-(moz|ms|o|webkit)-)?keyframes|media|namespace|page|supports)\b/i, false)) return false;
        stream.eatWhile(/[\w\\\-]/);
        if (stream.match(/^\s*:/, false))
          return ["variable-2", "variable-definition"];
        return ["variable-2", "variable"];
      },
      "&": function() {
        return ["atom", "atom"];
      }
    },
    name: "css",
    helperType: "less"
  });
  CodeMirror2.defineMIME("text/x-gss", {
    documentTypes,
    mediaTypes,
    mediaFeatures,
    propertyKeywords,
    nonStandardPropertyKeywords,
    fontProperties,
    counterDescriptors,
    colorKeywords,
    valueKeywords,
    supportsAtComponent: true,
    tokenHooks: {
      "/": function(stream, state) {
        if (!stream.eat("*")) return false;
        state.tokenize = tokenCComment;
        return tokenCComment(stream, state);
      }
    },
    name: "css",
    helperType: "gss"
  });
});

// gen/front_end/third_party/codemirror/package/mode/xml/xml.mjs
(function(mod) {
  if (typeof exports == "object" && typeof module == "object")
    mod(__require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd)
    define(["../../lib/codemirror"], mod);
  else
    mod(CodeMirror);
})(function(CodeMirror2) {
  "use strict";
  var htmlConfig = {
    autoSelfClosers: {
      "area": true,
      "base": true,
      "br": true,
      "col": true,
      "command": true,
      "embed": true,
      "frame": true,
      "hr": true,
      "img": true,
      "input": true,
      "keygen": true,
      "link": true,
      "meta": true,
      "param": true,
      "source": true,
      "track": true,
      "wbr": true,
      "menuitem": true
    },
    implicitlyClosed: {
      "dd": true,
      "li": true,
      "optgroup": true,
      "option": true,
      "p": true,
      "rp": true,
      "rt": true,
      "tbody": true,
      "td": true,
      "tfoot": true,
      "th": true,
      "tr": true
    },
    contextGrabbers: {
      "dd": { "dd": true, "dt": true },
      "dt": { "dd": true, "dt": true },
      "li": { "li": true },
      "option": { "option": true, "optgroup": true },
      "optgroup": { "optgroup": true },
      "p": {
        "address": true,
        "article": true,
        "aside": true,
        "blockquote": true,
        "dir": true,
        "div": true,
        "dl": true,
        "fieldset": true,
        "footer": true,
        "form": true,
        "h1": true,
        "h2": true,
        "h3": true,
        "h4": true,
        "h5": true,
        "h6": true,
        "header": true,
        "hgroup": true,
        "hr": true,
        "menu": true,
        "nav": true,
        "ol": true,
        "p": true,
        "pre": true,
        "section": true,
        "table": true,
        "ul": true
      },
      "rp": { "rp": true, "rt": true },
      "rt": { "rp": true, "rt": true },
      "tbody": { "tbody": true, "tfoot": true },
      "td": { "td": true, "th": true },
      "tfoot": { "tbody": true },
      "th": { "td": true, "th": true },
      "thead": { "tbody": true, "tfoot": true },
      "tr": { "tr": true }
    },
    doNotIndent: { "pre": true },
    allowUnquoted: true,
    allowMissing: true,
    caseFold: true
  };
  var xmlConfig = {
    autoSelfClosers: {},
    implicitlyClosed: {},
    contextGrabbers: {},
    doNotIndent: {},
    allowUnquoted: false,
    allowMissing: false,
    allowMissingTagName: false,
    caseFold: false
  };
  CodeMirror2.defineMode("xml", function(editorConf, config_) {
    var indentUnit = editorConf.indentUnit;
    var config = {};
    var defaults = config_.htmlMode ? htmlConfig : xmlConfig;
    for (var prop in defaults) config[prop] = defaults[prop];
    for (var prop in config_) config[prop] = config_[prop];
    var type, setStyle;
    function inText(stream, state) {
      function chain(parser) {
        state.tokenize = parser;
        return parser(stream, state);
      }
      var ch = stream.next();
      if (ch == "<") {
        if (stream.eat("!")) {
          if (stream.eat("[")) {
            if (stream.match("CDATA[")) return chain(inBlock("atom", "]]>"));
            else return null;
          } else if (stream.match("--")) {
            return chain(inBlock("comment", "-->"));
          } else if (stream.match("DOCTYPE", true, true)) {
            stream.eatWhile(/[\w\._\-]/);
            return chain(doctype(1));
          } else {
            return null;
          }
        } else if (stream.eat("?")) {
          stream.eatWhile(/[\w\._\-]/);
          state.tokenize = inBlock("meta", "?>");
          return "meta";
        } else {
          type = stream.eat("/") ? "closeTag" : "openTag";
          state.tokenize = inTag;
          return "tag bracket";
        }
      } else if (ch == "&") {
        var ok;
        if (stream.eat("#")) {
          if (stream.eat("x")) {
            ok = stream.eatWhile(/[a-fA-F\d]/) && stream.eat(";");
          } else {
            ok = stream.eatWhile(/[\d]/) && stream.eat(";");
          }
        } else {
          ok = stream.eatWhile(/[\w\.\-:]/) && stream.eat(";");
        }
        return ok ? "atom" : "error";
      } else {
        stream.eatWhile(/[^&<]/);
        return null;
      }
    }
    inText.isInText = true;
    function inTag(stream, state) {
      var ch = stream.next();
      if (ch == ">" || ch == "/" && stream.eat(">")) {
        state.tokenize = inText;
        type = ch == ">" ? "endTag" : "selfcloseTag";
        return "tag bracket";
      } else if (ch == "=") {
        type = "equals";
        return null;
      } else if (ch == "<") {
        state.tokenize = inText;
        state.state = baseState;
        state.tagName = state.tagStart = null;
        var next = state.tokenize(stream, state);
        return next ? next + " tag error" : "tag error";
      } else if (/[\'\"]/.test(ch)) {
        state.tokenize = inAttribute(ch);
        state.stringStartCol = stream.column();
        return state.tokenize(stream, state);
      } else {
        stream.match(/^[^\s\u00a0=<>\"\']*[^\s\u00a0=<>\"\'\/]/);
        return "word";
      }
    }
    function inAttribute(quote) {
      var closure = function(stream, state) {
        while (!stream.eol()) {
          if (stream.next() == quote) {
            state.tokenize = inTag;
            break;
          }
        }
        return "string";
      };
      closure.isInAttribute = true;
      return closure;
    }
    function inBlock(style, terminator) {
      return function(stream, state) {
        while (!stream.eol()) {
          if (stream.match(terminator)) {
            state.tokenize = inText;
            break;
          }
          stream.next();
        }
        return style;
      };
    }
    function doctype(depth) {
      return function(stream, state) {
        var ch;
        while ((ch = stream.next()) != null) {
          if (ch == "<") {
            state.tokenize = doctype(depth + 1);
            return state.tokenize(stream, state);
          } else if (ch == ">") {
            if (depth == 1) {
              state.tokenize = inText;
              break;
            } else {
              state.tokenize = doctype(depth - 1);
              return state.tokenize(stream, state);
            }
          }
        }
        return "meta";
      };
    }
    function Context(state, tagName, startOfLine) {
      this.prev = state.context;
      this.tagName = tagName || "";
      this.indent = state.indented;
      this.startOfLine = startOfLine;
      if (config.doNotIndent.hasOwnProperty(tagName) || state.context && state.context.noIndent)
        this.noIndent = true;
    }
    function popContext(state) {
      if (state.context) state.context = state.context.prev;
    }
    function maybePopContext(state, nextTagName) {
      var parentTagName;
      while (true) {
        if (!state.context) {
          return;
        }
        parentTagName = state.context.tagName;
        if (!config.contextGrabbers.hasOwnProperty(parentTagName) || !config.contextGrabbers[parentTagName].hasOwnProperty(nextTagName)) {
          return;
        }
        popContext(state);
      }
    }
    function baseState(type2, stream, state) {
      if (type2 == "openTag") {
        state.tagStart = stream.column();
        return tagNameState;
      } else if (type2 == "closeTag") {
        return closeTagNameState;
      } else {
        return baseState;
      }
    }
    function tagNameState(type2, stream, state) {
      if (type2 == "word") {
        state.tagName = stream.current();
        setStyle = "tag";
        return attrState;
      } else if (config.allowMissingTagName && type2 == "endTag") {
        setStyle = "tag bracket";
        return attrState(type2, stream, state);
      } else {
        setStyle = "error";
        return tagNameState;
      }
    }
    function closeTagNameState(type2, stream, state) {
      if (type2 == "word") {
        var tagName = stream.current();
        if (state.context && state.context.tagName != tagName && config.implicitlyClosed.hasOwnProperty(state.context.tagName))
          popContext(state);
        if (state.context && state.context.tagName == tagName || config.matchClosing === false) {
          setStyle = "tag";
          return closeState;
        } else {
          setStyle = "tag error";
          return closeStateErr;
        }
      } else if (config.allowMissingTagName && type2 == "endTag") {
        setStyle = "tag bracket";
        return closeState(type2, stream, state);
      } else {
        setStyle = "error";
        return closeStateErr;
      }
    }
    function closeState(type2, _stream, state) {
      if (type2 != "endTag") {
        setStyle = "error";
        return closeState;
      }
      popContext(state);
      return baseState;
    }
    function closeStateErr(type2, stream, state) {
      setStyle = "error";
      return closeState(type2, stream, state);
    }
    function attrState(type2, _stream, state) {
      if (type2 == "word") {
        setStyle = "attribute";
        return attrEqState;
      } else if (type2 == "endTag" || type2 == "selfcloseTag") {
        var tagName = state.tagName, tagStart = state.tagStart;
        state.tagName = state.tagStart = null;
        if (type2 == "selfcloseTag" || config.autoSelfClosers.hasOwnProperty(tagName)) {
          maybePopContext(state, tagName);
        } else {
          maybePopContext(state, tagName);
          state.context = new Context(state, tagName, tagStart == state.indented);
        }
        return baseState;
      }
      setStyle = "error";
      return attrState;
    }
    function attrEqState(type2, stream, state) {
      if (type2 == "equals") return attrValueState;
      if (!config.allowMissing) setStyle = "error";
      return attrState(type2, stream, state);
    }
    function attrValueState(type2, stream, state) {
      if (type2 == "string") return attrContinuedState;
      if (type2 == "word" && config.allowUnquoted) {
        setStyle = "string";
        return attrState;
      }
      setStyle = "error";
      return attrState(type2, stream, state);
    }
    function attrContinuedState(type2, stream, state) {
      if (type2 == "string") return attrContinuedState;
      return attrState(type2, stream, state);
    }
    return {
      startState: function(baseIndent) {
        var state = {
          tokenize: inText,
          state: baseState,
          indented: baseIndent || 0,
          tagName: null,
          tagStart: null,
          context: null
        };
        if (baseIndent != null) state.baseIndent = baseIndent;
        return state;
      },
      token: function(stream, state) {
        if (!state.tagName && stream.sol())
          state.indented = stream.indentation();
        if (stream.eatSpace()) return null;
        type = null;
        var style = state.tokenize(stream, state);
        if ((style || type) && style != "comment") {
          setStyle = null;
          state.state = state.state(type || style, stream, state);
          if (setStyle)
            style = setStyle == "error" ? style + " error" : setStyle;
        }
        return style;
      },
      indent: function(state, textAfter, fullLine) {
        var context = state.context;
        if (state.tokenize.isInAttribute) {
          if (state.tagStart == state.indented)
            return state.stringStartCol + 1;
          else
            return state.indented + indentUnit;
        }
        if (context && context.noIndent) return CodeMirror2.Pass;
        if (state.tokenize != inTag && state.tokenize != inText)
          return fullLine ? fullLine.match(/^(\s*)/)[0].length : 0;
        if (state.tagName) {
          if (config.multilineTagIndentPastTag !== false)
            return state.tagStart + state.tagName.length + 2;
          else
            return state.tagStart + indentUnit * (config.multilineTagIndentFactor || 1);
        }
        if (config.alignCDATA && /<!\[CDATA\[/.test(textAfter)) return 0;
        var tagAfter = textAfter && /^<(\/)?([\w_:\.-]*)/.exec(textAfter);
        if (tagAfter && tagAfter[1]) {
          while (context) {
            if (context.tagName == tagAfter[2]) {
              context = context.prev;
              break;
            } else if (config.implicitlyClosed.hasOwnProperty(context.tagName)) {
              context = context.prev;
            } else {
              break;
            }
          }
        } else if (tagAfter) {
          while (context) {
            var grabbers = config.contextGrabbers[context.tagName];
            if (grabbers && grabbers.hasOwnProperty(tagAfter[2]))
              context = context.prev;
            else
              break;
          }
        }
        while (context && context.prev && !context.startOfLine)
          context = context.prev;
        if (context) return context.indent + indentUnit;
        else return state.baseIndent || 0;
      },
      electricInput: /<\/[\s\w:]+>$/,
      blockCommentStart: "<!--",
      blockCommentEnd: "-->",
      configuration: config.htmlMode ? "html" : "xml",
      helperType: config.htmlMode ? "html" : "xml",
      skipAttribute: function(state) {
        if (state.state == attrValueState)
          state.state = attrState;
      },
      xmlCurrentTag: function(state) {
        return state.tagName ? { name: state.tagName, close: state.type == "closeTag" } : null;
      },
      xmlCurrentContext: function(state) {
        var context = [];
        for (var cx = state.context; cx; cx = cx.prev)
          context.push(cx.tagName);
        return context.reverse();
      }
    };
  });
  CodeMirror2.defineMIME("text/xml", "xml");
  CodeMirror2.defineMIME("application/xml", "xml");
  if (!CodeMirror2.mimeModes.hasOwnProperty("text/html"))
    CodeMirror2.defineMIME("text/html", { name: "xml", htmlMode: true });
});

// gen/front_end/third_party/codemirror/package/mode/javascript/javascript.mjs
(function(mod) {
  if (typeof exports == "object" && typeof module == "object")
    mod(__require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd)
    define(["../../lib/codemirror"], mod);
  else
    mod(CodeMirror);
})(function(CodeMirror2) {
  "use strict";
  CodeMirror2.defineMode("javascript", function(config, parserConfig) {
    var indentUnit = config.indentUnit;
    var statementIndent = parserConfig.statementIndent;
    var jsonldMode = parserConfig.jsonld;
    var jsonMode = parserConfig.json || jsonldMode;
    var trackScope = parserConfig.trackScope !== false;
    var isTS = parserConfig.typescript;
    var wordRE = parserConfig.wordCharacters || /[\w$\xa1-\uffff]/;
    var keywords = function() {
      function kw(type2) {
        return { type: type2, style: "keyword" };
      }
      var A = kw("keyword a"), B = kw("keyword b"), C = kw("keyword c"), D = kw("keyword d");
      var operator = kw("operator"), atom = { type: "atom", style: "atom" };
      return {
        "if": kw("if"),
        "while": A,
        "with": A,
        "else": B,
        "do": B,
        "try": B,
        "finally": B,
        "return": D,
        "break": D,
        "continue": D,
        "new": kw("new"),
        "delete": C,
        "void": C,
        "throw": C,
        "debugger": kw("debugger"),
        "var": kw("var"),
        "const": kw("var"),
        "let": kw("var"),
        "function": kw("function"),
        "catch": kw("catch"),
        "for": kw("for"),
        "switch": kw("switch"),
        "case": kw("case"),
        "default": kw("default"),
        "in": operator,
        "typeof": operator,
        "instanceof": operator,
        "true": atom,
        "false": atom,
        "null": atom,
        "undefined": atom,
        "NaN": atom,
        "Infinity": atom,
        "this": kw("this"),
        "class": kw("class"),
        "super": kw("atom"),
        "yield": C,
        "export": kw("export"),
        "import": kw("import"),
        "extends": C,
        "await": C
      };
    }();
    var isOperatorChar = /[+\-*&%=<>!?|~^@]/;
    var isJsonldKeyword = /^@(context|id|value|language|type|container|list|set|reverse|index|base|vocab|graph)"/;
    function readRegexp(stream) {
      var escaped = false, next, inSet = false;
      while ((next = stream.next()) != null) {
        if (!escaped) {
          if (next == "/" && !inSet) return;
          if (next == "[") inSet = true;
          else if (inSet && next == "]") inSet = false;
        }
        escaped = !escaped && next == "\\";
      }
    }
    var type, content;
    function ret(tp, style, cont2) {
      type = tp;
      content = cont2;
      return style;
    }
    function tokenBase(stream, state) {
      var ch = stream.next();
      if (ch == '"' || ch == "'") {
        state.tokenize = tokenString(ch);
        return state.tokenize(stream, state);
      } else if (ch == "." && stream.match(/^\d[\d_]*(?:[eE][+\-]?[\d_]+)?/)) {
        return ret("number", "number");
      } else if (ch == "." && stream.match("..")) {
        return ret("spread", "meta");
      } else if (/[\[\]{}\(\),;\:\.]/.test(ch)) {
        return ret(ch);
      } else if (ch == "=" && stream.eat(">")) {
        return ret("=>", "operator");
      } else if (ch == "0" && stream.match(/^(?:x[\dA-Fa-f_]+|o[0-7_]+|b[01_]+)n?/)) {
        return ret("number", "number");
      } else if (/\d/.test(ch)) {
        stream.match(/^[\d_]*(?:n|(?:\.[\d_]*)?(?:[eE][+\-]?[\d_]+)?)?/);
        return ret("number", "number");
      } else if (ch == "/") {
        if (stream.eat("*")) {
          state.tokenize = tokenComment;
          return tokenComment(stream, state);
        } else if (stream.eat("/")) {
          stream.skipToEnd();
          return ret("comment", "comment");
        } else if (expressionAllowed(stream, state, 1)) {
          readRegexp(stream);
          stream.match(/^\b(([gimyus])(?![gimyus]*\2))+\b/);
          return ret("regexp", "string-2");
        } else {
          stream.eat("=");
          return ret("operator", "operator", stream.current());
        }
      } else if (ch == "`") {
        state.tokenize = tokenQuasi;
        return tokenQuasi(stream, state);
      } else if (ch == "#" && stream.peek() == "!") {
        stream.skipToEnd();
        return ret("meta", "meta");
      } else if (ch == "#" && stream.eatWhile(wordRE)) {
        return ret("variable", "property");
      } else if (ch == "<" && stream.match("!--") || ch == "-" && stream.match("->") && !/\S/.test(stream.string.slice(0, stream.start))) {
        stream.skipToEnd();
        return ret("comment", "comment");
      } else if (isOperatorChar.test(ch)) {
        if (ch != ">" || !state.lexical || state.lexical.type != ">") {
          if (stream.eat("=")) {
            if (ch == "!" || ch == "=") stream.eat("=");
          } else if (/[<>*+\-|&?]/.test(ch)) {
            stream.eat(ch);
            if (ch == ">") stream.eat(ch);
          }
        }
        if (ch == "?" && stream.eat(".")) return ret(".");
        return ret("operator", "operator", stream.current());
      } else if (wordRE.test(ch)) {
        stream.eatWhile(wordRE);
        var word = stream.current();
        if (state.lastType != ".") {
          if (keywords.propertyIsEnumerable(word)) {
            var kw = keywords[word];
            return ret(kw.type, kw.style, word);
          }
          if (word == "async" && stream.match(/^(\s|\/\*([^*]|\*(?!\/))*?\*\/)*[\[\(\w]/, false))
            return ret("async", "keyword", word);
        }
        return ret("variable", "variable", word);
      }
    }
    function tokenString(quote) {
      return function(stream, state) {
        var escaped = false, next;
        if (jsonldMode && stream.peek() == "@" && stream.match(isJsonldKeyword)) {
          state.tokenize = tokenBase;
          return ret("jsonld-keyword", "meta");
        }
        while ((next = stream.next()) != null) {
          if (next == quote && !escaped) break;
          escaped = !escaped && next == "\\";
        }
        if (!escaped) state.tokenize = tokenBase;
        return ret("string", "string");
      };
    }
    function tokenComment(stream, state) {
      var maybeEnd = false, ch;
      while (ch = stream.next()) {
        if (ch == "/" && maybeEnd) {
          state.tokenize = tokenBase;
          break;
        }
        maybeEnd = ch == "*";
      }
      return ret("comment", "comment");
    }
    function tokenQuasi(stream, state) {
      var escaped = false, next;
      while ((next = stream.next()) != null) {
        if (!escaped && (next == "`" || next == "$" && stream.eat("{"))) {
          state.tokenize = tokenBase;
          break;
        }
        escaped = !escaped && next == "\\";
      }
      return ret("quasi", "string-2", stream.current());
    }
    var brackets = "([{}])";
    function findFatArrow(stream, state) {
      if (state.fatArrowAt) state.fatArrowAt = null;
      var arrow = stream.string.indexOf("=>", stream.start);
      if (arrow < 0) return;
      if (isTS) {
        var m = /:\s*(?:\w+(?:<[^>]*>|\[\])?|\{[^}]*\})\s*$/.exec(stream.string.slice(stream.start, arrow));
        if (m) arrow = m.index;
      }
      var depth = 0, sawSomething = false;
      for (var pos = arrow - 1; pos >= 0; --pos) {
        var ch = stream.string.charAt(pos);
        var bracket = brackets.indexOf(ch);
        if (bracket >= 0 && bracket < 3) {
          if (!depth) {
            ++pos;
            break;
          }
          if (--depth == 0) {
            if (ch == "(") sawSomething = true;
            break;
          }
        } else if (bracket >= 3 && bracket < 6) {
          ++depth;
        } else if (wordRE.test(ch)) {
          sawSomething = true;
        } else if (/["'\/`]/.test(ch)) {
          for (; ; --pos) {
            if (pos == 0) return;
            var next = stream.string.charAt(pos - 1);
            if (next == ch && stream.string.charAt(pos - 2) != "\\") {
              pos--;
              break;
            }
          }
        } else if (sawSomething && !depth) {
          ++pos;
          break;
        }
      }
      if (sawSomething && !depth) state.fatArrowAt = pos;
    }
    var atomicTypes = {
      "atom": true,
      "number": true,
      "variable": true,
      "string": true,
      "regexp": true,
      "this": true,
      "import": true,
      "jsonld-keyword": true
    };
    function JSLexical(indented, column, type2, align, prev, info) {
      this.indented = indented;
      this.column = column;
      this.type = type2;
      this.prev = prev;
      this.info = info;
      if (align != null) this.align = align;
    }
    function inScope(state, varname) {
      if (!trackScope) return false;
      for (var v = state.localVars; v; v = v.next)
        if (v.name == varname) return true;
      for (var cx2 = state.context; cx2; cx2 = cx2.prev) {
        for (var v = cx2.vars; v; v = v.next)
          if (v.name == varname) return true;
      }
    }
    function parseJS(state, style, type2, content2, stream) {
      var cc = state.cc;
      cx.state = state;
      cx.stream = stream;
      cx.marked = null, cx.cc = cc;
      cx.style = style;
      if (!state.lexical.hasOwnProperty("align"))
        state.lexical.align = true;
      while (true) {
        var combinator = cc.length ? cc.pop() : jsonMode ? expression : statement;
        if (combinator(type2, content2)) {
          while (cc.length && cc[cc.length - 1].lex)
            cc.pop()();
          if (cx.marked) return cx.marked;
          if (type2 == "variable" && inScope(state, content2)) return "variable-2";
          return style;
        }
      }
    }
    var cx = { state: null, column: null, marked: null, cc: null };
    function pass() {
      for (var i = arguments.length - 1; i >= 0; i--) cx.cc.push(arguments[i]);
    }
    function cont() {
      pass.apply(null, arguments);
      return true;
    }
    function inList(name, list) {
      for (var v = list; v; v = v.next) if (v.name == name) return true;
      return false;
    }
    function register(varname) {
      var state = cx.state;
      cx.marked = "def";
      if (!trackScope) return;
      if (state.context) {
        if (state.lexical.info == "var" && state.context && state.context.block) {
          var newContext = registerVarScoped(varname, state.context);
          if (newContext != null) {
            state.context = newContext;
            return;
          }
        } else if (!inList(varname, state.localVars)) {
          state.localVars = new Var(varname, state.localVars);
          return;
        }
      }
      if (parserConfig.globalVars && !inList(varname, state.globalVars))
        state.globalVars = new Var(varname, state.globalVars);
    }
    function registerVarScoped(varname, context) {
      if (!context) {
        return null;
      } else if (context.block) {
        var inner = registerVarScoped(varname, context.prev);
        if (!inner) return null;
        if (inner == context.prev) return context;
        return new Context(inner, context.vars, true);
      } else if (inList(varname, context.vars)) {
        return context;
      } else {
        return new Context(context.prev, new Var(varname, context.vars), false);
      }
    }
    function isModifier(name) {
      return name == "public" || name == "private" || name == "protected" || name == "abstract" || name == "readonly";
    }
    function Context(prev, vars, block2) {
      this.prev = prev;
      this.vars = vars;
      this.block = block2;
    }
    function Var(name, next) {
      this.name = name;
      this.next = next;
    }
    var defaultVars = new Var("this", new Var("arguments", null));
    function pushcontext() {
      cx.state.context = new Context(cx.state.context, cx.state.localVars, false);
      cx.state.localVars = defaultVars;
    }
    function pushblockcontext() {
      cx.state.context = new Context(cx.state.context, cx.state.localVars, true);
      cx.state.localVars = null;
    }
    function popcontext() {
      cx.state.localVars = cx.state.context.vars;
      cx.state.context = cx.state.context.prev;
    }
    popcontext.lex = true;
    function pushlex(type2, info) {
      var result = function() {
        var state = cx.state, indent = state.indented;
        if (state.lexical.type == "stat") indent = state.lexical.indented;
        else for (var outer = state.lexical; outer && outer.type == ")" && outer.align; outer = outer.prev)
          indent = outer.indented;
        state.lexical = new JSLexical(indent, cx.stream.column(), type2, null, state.lexical, info);
      };
      result.lex = true;
      return result;
    }
    function poplex() {
      var state = cx.state;
      if (state.lexical.prev) {
        if (state.lexical.type == ")")
          state.indented = state.lexical.indented;
        state.lexical = state.lexical.prev;
      }
    }
    poplex.lex = true;
    function expect(wanted) {
      function exp(type2) {
        if (type2 == wanted) return cont();
        else if (wanted == ";" || type2 == "}" || type2 == ")" || type2 == "]") return pass();
        else return cont(exp);
      }
      ;
      return exp;
    }
    function statement(type2, value) {
      if (type2 == "var") return cont(pushlex("vardef", value), vardef, expect(";"), poplex);
      if (type2 == "keyword a") return cont(pushlex("form"), parenExpr, statement, poplex);
      if (type2 == "keyword b") return cont(pushlex("form"), statement, poplex);
      if (type2 == "keyword d") return cx.stream.match(/^\s*$/, false) ? cont() : cont(pushlex("stat"), maybeexpression, expect(";"), poplex);
      if (type2 == "debugger") return cont(expect(";"));
      if (type2 == "{") return cont(pushlex("}"), pushblockcontext, block, poplex, popcontext);
      if (type2 == ";") return cont();
      if (type2 == "if") {
        if (cx.state.lexical.info == "else" && cx.state.cc[cx.state.cc.length - 1] == poplex)
          cx.state.cc.pop()();
        return cont(pushlex("form"), parenExpr, statement, poplex, maybeelse);
      }
      if (type2 == "function") return cont(functiondef);
      if (type2 == "for") return cont(pushlex("form"), pushblockcontext, forspec, statement, popcontext, poplex);
      if (type2 == "class" || isTS && value == "interface") {
        cx.marked = "keyword";
        return cont(pushlex("form", type2 == "class" ? type2 : value), className, poplex);
      }
      if (type2 == "variable") {
        if (isTS && value == "declare") {
          cx.marked = "keyword";
          return cont(statement);
        } else if (isTS && (value == "module" || value == "enum" || value == "type") && cx.stream.match(/^\s*\w/, false)) {
          cx.marked = "keyword";
          if (value == "enum") return cont(enumdef);
          else if (value == "type") return cont(typename, expect("operator"), typeexpr, expect(";"));
          else return cont(pushlex("form"), pattern, expect("{"), pushlex("}"), block, poplex, poplex);
        } else if (isTS && value == "namespace") {
          cx.marked = "keyword";
          return cont(pushlex("form"), expression, statement, poplex);
        } else if (isTS && value == "abstract") {
          cx.marked = "keyword";
          return cont(statement);
        } else {
          return cont(pushlex("stat"), maybelabel);
        }
      }
      if (type2 == "switch") return cont(
        pushlex("form"),
        parenExpr,
        expect("{"),
        pushlex("}", "switch"),
        pushblockcontext,
        block,
        poplex,
        poplex,
        popcontext
      );
      if (type2 == "case") return cont(expression, expect(":"));
      if (type2 == "default") return cont(expect(":"));
      if (type2 == "catch") return cont(pushlex("form"), pushcontext, maybeCatchBinding, statement, poplex, popcontext);
      if (type2 == "export") return cont(pushlex("stat"), afterExport, poplex);
      if (type2 == "import") return cont(pushlex("stat"), afterImport, poplex);
      if (type2 == "async") return cont(statement);
      if (value == "@") return cont(expression, statement);
      return pass(pushlex("stat"), expression, expect(";"), poplex);
    }
    function maybeCatchBinding(type2) {
      if (type2 == "(") return cont(funarg, expect(")"));
    }
    function expression(type2, value) {
      return expressionInner(type2, value, false);
    }
    function expressionNoComma(type2, value) {
      return expressionInner(type2, value, true);
    }
    function parenExpr(type2) {
      if (type2 != "(") return pass();
      return cont(pushlex(")"), maybeexpression, expect(")"), poplex);
    }
    function expressionInner(type2, value, noComma) {
      if (cx.state.fatArrowAt == cx.stream.start) {
        var body = noComma ? arrowBodyNoComma : arrowBody;
        if (type2 == "(") return cont(pushcontext, pushlex(")"), commasep(funarg, ")"), poplex, expect("=>"), body, popcontext);
        else if (type2 == "variable") return pass(pushcontext, pattern, expect("=>"), body, popcontext);
      }
      var maybeop = noComma ? maybeoperatorNoComma : maybeoperatorComma;
      if (atomicTypes.hasOwnProperty(type2)) return cont(maybeop);
      if (type2 == "function") return cont(functiondef, maybeop);
      if (type2 == "class" || isTS && value == "interface") {
        cx.marked = "keyword";
        return cont(pushlex("form"), classExpression, poplex);
      }
      if (type2 == "keyword c" || type2 == "async") return cont(noComma ? expressionNoComma : expression);
      if (type2 == "(") return cont(pushlex(")"), maybeexpression, expect(")"), poplex, maybeop);
      if (type2 == "operator" || type2 == "spread") return cont(noComma ? expressionNoComma : expression);
      if (type2 == "[") return cont(pushlex("]"), arrayLiteral, poplex, maybeop);
      if (type2 == "{") return contCommasep(objprop, "}", null, maybeop);
      if (type2 == "quasi") return pass(quasi, maybeop);
      if (type2 == "new") return cont(maybeTarget(noComma));
      return cont();
    }
    function maybeexpression(type2) {
      if (type2.match(/[;\}\)\],]/)) return pass();
      return pass(expression);
    }
    function maybeoperatorComma(type2, value) {
      if (type2 == ",") return cont(maybeexpression);
      return maybeoperatorNoComma(type2, value, false);
    }
    function maybeoperatorNoComma(type2, value, noComma) {
      var me = noComma == false ? maybeoperatorComma : maybeoperatorNoComma;
      var expr = noComma == false ? expression : expressionNoComma;
      if (type2 == "=>") return cont(pushcontext, noComma ? arrowBodyNoComma : arrowBody, popcontext);
      if (type2 == "operator") {
        if (/\+\+|--/.test(value) || isTS && value == "!") return cont(me);
        if (isTS && value == "<" && cx.stream.match(/^([^<>]|<[^<>]*>)*>\s*\(/, false))
          return cont(pushlex(">"), commasep(typeexpr, ">"), poplex, me);
        if (value == "?") return cont(expression, expect(":"), expr);
        return cont(expr);
      }
      if (type2 == "quasi") {
        return pass(quasi, me);
      }
      if (type2 == ";") return;
      if (type2 == "(") return contCommasep(expressionNoComma, ")", "call", me);
      if (type2 == ".") return cont(property, me);
      if (type2 == "[") return cont(pushlex("]"), maybeexpression, expect("]"), poplex, me);
      if (isTS && value == "as") {
        cx.marked = "keyword";
        return cont(typeexpr, me);
      }
      if (type2 == "regexp") {
        cx.state.lastType = cx.marked = "operator";
        cx.stream.backUp(cx.stream.pos - cx.stream.start - 1);
        return cont(expr);
      }
    }
    function quasi(type2, value) {
      if (type2 != "quasi") return pass();
      if (value.slice(value.length - 2) != "${") return cont(quasi);
      return cont(expression, continueQuasi);
    }
    function continueQuasi(type2) {
      if (type2 == "}") {
        cx.marked = "string-2";
        cx.state.tokenize = tokenQuasi;
        return cont(quasi);
      }
    }
    function arrowBody(type2) {
      findFatArrow(cx.stream, cx.state);
      return pass(type2 == "{" ? statement : expression);
    }
    function arrowBodyNoComma(type2) {
      findFatArrow(cx.stream, cx.state);
      return pass(type2 == "{" ? statement : expressionNoComma);
    }
    function maybeTarget(noComma) {
      return function(type2) {
        if (type2 == ".") return cont(noComma ? targetNoComma : target);
        else if (type2 == "variable" && isTS) return cont(maybeTypeArgs, noComma ? maybeoperatorNoComma : maybeoperatorComma);
        else return pass(noComma ? expressionNoComma : expression);
      };
    }
    function target(_, value) {
      if (value == "target") {
        cx.marked = "keyword";
        return cont(maybeoperatorComma);
      }
    }
    function targetNoComma(_, value) {
      if (value == "target") {
        cx.marked = "keyword";
        return cont(maybeoperatorNoComma);
      }
    }
    function maybelabel(type2) {
      if (type2 == ":") return cont(poplex, statement);
      return pass(maybeoperatorComma, expect(";"), poplex);
    }
    function property(type2) {
      if (type2 == "variable") {
        cx.marked = "property";
        return cont();
      }
    }
    function objprop(type2, value) {
      if (type2 == "async") {
        cx.marked = "property";
        return cont(objprop);
      } else if (type2 == "variable" || cx.style == "keyword") {
        cx.marked = "property";
        if (value == "get" || value == "set") return cont(getterSetter);
        var m;
        if (isTS && cx.state.fatArrowAt == cx.stream.start && (m = cx.stream.match(/^\s*:\s*/, false)))
          cx.state.fatArrowAt = cx.stream.pos + m[0].length;
        return cont(afterprop);
      } else if (type2 == "number" || type2 == "string") {
        cx.marked = jsonldMode ? "property" : cx.style + " property";
        return cont(afterprop);
      } else if (type2 == "jsonld-keyword") {
        return cont(afterprop);
      } else if (isTS && isModifier(value)) {
        cx.marked = "keyword";
        return cont(objprop);
      } else if (type2 == "[") {
        return cont(expression, maybetype, expect("]"), afterprop);
      } else if (type2 == "spread") {
        return cont(expressionNoComma, afterprop);
      } else if (value == "*") {
        cx.marked = "keyword";
        return cont(objprop);
      } else if (type2 == ":") {
        return pass(afterprop);
      }
    }
    function getterSetter(type2) {
      if (type2 != "variable") return pass(afterprop);
      cx.marked = "property";
      return cont(functiondef);
    }
    function afterprop(type2) {
      if (type2 == ":") return cont(expressionNoComma);
      if (type2 == "(") return pass(functiondef);
    }
    function commasep(what, end, sep) {
      function proceed(type2, value) {
        if (sep ? sep.indexOf(type2) > -1 : type2 == ",") {
          var lex = cx.state.lexical;
          if (lex.info == "call") lex.pos = (lex.pos || 0) + 1;
          return cont(function(type3, value2) {
            if (type3 == end || value2 == end) return pass();
            return pass(what);
          }, proceed);
        }
        if (type2 == end || value == end) return cont();
        if (sep && sep.indexOf(";") > -1) return pass(what);
        return cont(expect(end));
      }
      return function(type2, value) {
        if (type2 == end || value == end) return cont();
        return pass(what, proceed);
      };
    }
    function contCommasep(what, end, info) {
      for (var i = 3; i < arguments.length; i++)
        cx.cc.push(arguments[i]);
      return cont(pushlex(end, info), commasep(what, end), poplex);
    }
    function block(type2) {
      if (type2 == "}") return cont();
      return pass(statement, block);
    }
    function maybetype(type2, value) {
      if (isTS) {
        if (type2 == ":") return cont(typeexpr);
        if (value == "?") return cont(maybetype);
      }
    }
    function maybetypeOrIn(type2, value) {
      if (isTS && (type2 == ":" || value == "in")) return cont(typeexpr);
    }
    function mayberettype(type2) {
      if (isTS && type2 == ":") {
        if (cx.stream.match(/^\s*\w+\s+is\b/, false)) return cont(expression, isKW, typeexpr);
        else return cont(typeexpr);
      }
    }
    function isKW(_, value) {
      if (value == "is") {
        cx.marked = "keyword";
        return cont();
      }
    }
    function typeexpr(type2, value) {
      if (value == "keyof" || value == "typeof" || value == "infer" || value == "readonly") {
        cx.marked = "keyword";
        return cont(value == "typeof" ? expressionNoComma : typeexpr);
      }
      if (type2 == "variable" || value == "void") {
        cx.marked = "type";
        return cont(afterType);
      }
      if (value == "|" || value == "&") return cont(typeexpr);
      if (type2 == "string" || type2 == "number" || type2 == "atom") return cont(afterType);
      if (type2 == "[") return cont(pushlex("]"), commasep(typeexpr, "]", ","), poplex, afterType);
      if (type2 == "{") return cont(pushlex("}"), typeprops, poplex, afterType);
      if (type2 == "(") return cont(commasep(typearg, ")"), maybeReturnType, afterType);
      if (type2 == "<") return cont(commasep(typeexpr, ">"), typeexpr);
    }
    function maybeReturnType(type2) {
      if (type2 == "=>") return cont(typeexpr);
    }
    function typeprops(type2) {
      if (type2.match(/[\}\)\]]/)) return cont();
      if (type2 == "," || type2 == ";") return cont(typeprops);
      return pass(typeprop, typeprops);
    }
    function typeprop(type2, value) {
      if (type2 == "variable" || cx.style == "keyword") {
        cx.marked = "property";
        return cont(typeprop);
      } else if (value == "?" || type2 == "number" || type2 == "string") {
        return cont(typeprop);
      } else if (type2 == ":") {
        return cont(typeexpr);
      } else if (type2 == "[") {
        return cont(expect("variable"), maybetypeOrIn, expect("]"), typeprop);
      } else if (type2 == "(") {
        return pass(functiondecl, typeprop);
      } else if (!type2.match(/[;\}\)\],]/)) {
        return cont();
      }
    }
    function typearg(type2, value) {
      if (type2 == "variable" && cx.stream.match(/^\s*[?:]/, false) || value == "?") return cont(typearg);
      if (type2 == ":") return cont(typeexpr);
      if (type2 == "spread") return cont(typearg);
      return pass(typeexpr);
    }
    function afterType(type2, value) {
      if (value == "<") return cont(pushlex(">"), commasep(typeexpr, ">"), poplex, afterType);
      if (value == "|" || type2 == "." || value == "&") return cont(typeexpr);
      if (type2 == "[") return cont(typeexpr, expect("]"), afterType);
      if (value == "extends" || value == "implements") {
        cx.marked = "keyword";
        return cont(typeexpr);
      }
      if (value == "?") return cont(typeexpr, expect(":"), typeexpr);
    }
    function maybeTypeArgs(_, value) {
      if (value == "<") return cont(pushlex(">"), commasep(typeexpr, ">"), poplex, afterType);
    }
    function typeparam() {
      return pass(typeexpr, maybeTypeDefault);
    }
    function maybeTypeDefault(_, value) {
      if (value == "=") return cont(typeexpr);
    }
    function vardef(_, value) {
      if (value == "enum") {
        cx.marked = "keyword";
        return cont(enumdef);
      }
      return pass(pattern, maybetype, maybeAssign, vardefCont);
    }
    function pattern(type2, value) {
      if (isTS && isModifier(value)) {
        cx.marked = "keyword";
        return cont(pattern);
      }
      if (type2 == "variable") {
        register(value);
        return cont();
      }
      if (type2 == "spread") return cont(pattern);
      if (type2 == "[") return contCommasep(eltpattern, "]");
      if (type2 == "{") return contCommasep(proppattern, "}");
    }
    function proppattern(type2, value) {
      if (type2 == "variable" && !cx.stream.match(/^\s*:/, false)) {
        register(value);
        return cont(maybeAssign);
      }
      if (type2 == "variable") cx.marked = "property";
      if (type2 == "spread") return cont(pattern);
      if (type2 == "}") return pass();
      if (type2 == "[") return cont(expression, expect("]"), expect(":"), proppattern);
      return cont(expect(":"), pattern, maybeAssign);
    }
    function eltpattern() {
      return pass(pattern, maybeAssign);
    }
    function maybeAssign(_type, value) {
      if (value == "=") return cont(expressionNoComma);
    }
    function vardefCont(type2) {
      if (type2 == ",") return cont(vardef);
    }
    function maybeelse(type2, value) {
      if (type2 == "keyword b" && value == "else") return cont(pushlex("form", "else"), statement, poplex);
    }
    function forspec(type2, value) {
      if (value == "await") return cont(forspec);
      if (type2 == "(") return cont(pushlex(")"), forspec1, poplex);
    }
    function forspec1(type2) {
      if (type2 == "var") return cont(vardef, forspec2);
      if (type2 == "variable") return cont(forspec2);
      return pass(forspec2);
    }
    function forspec2(type2, value) {
      if (type2 == ")") return cont();
      if (type2 == ";") return cont(forspec2);
      if (value == "in" || value == "of") {
        cx.marked = "keyword";
        return cont(expression, forspec2);
      }
      return pass(expression, forspec2);
    }
    function functiondef(type2, value) {
      if (value == "*") {
        cx.marked = "keyword";
        return cont(functiondef);
      }
      if (type2 == "variable") {
        register(value);
        return cont(functiondef);
      }
      if (type2 == "(") return cont(pushcontext, pushlex(")"), commasep(funarg, ")"), poplex, mayberettype, statement, popcontext);
      if (isTS && value == "<") return cont(pushlex(">"), commasep(typeparam, ">"), poplex, functiondef);
    }
    function functiondecl(type2, value) {
      if (value == "*") {
        cx.marked = "keyword";
        return cont(functiondecl);
      }
      if (type2 == "variable") {
        register(value);
        return cont(functiondecl);
      }
      if (type2 == "(") return cont(pushcontext, pushlex(")"), commasep(funarg, ")"), poplex, mayberettype, popcontext);
      if (isTS && value == "<") return cont(pushlex(">"), commasep(typeparam, ">"), poplex, functiondecl);
    }
    function typename(type2, value) {
      if (type2 == "keyword" || type2 == "variable") {
        cx.marked = "type";
        return cont(typename);
      } else if (value == "<") {
        return cont(pushlex(">"), commasep(typeparam, ">"), poplex);
      }
    }
    function funarg(type2, value) {
      if (value == "@") cont(expression, funarg);
      if (type2 == "spread") return cont(funarg);
      if (isTS && isModifier(value)) {
        cx.marked = "keyword";
        return cont(funarg);
      }
      if (isTS && type2 == "this") return cont(maybetype, maybeAssign);
      return pass(pattern, maybetype, maybeAssign);
    }
    function classExpression(type2, value) {
      if (type2 == "variable") return className(type2, value);
      return classNameAfter(type2, value);
    }
    function className(type2, value) {
      if (type2 == "variable") {
        register(value);
        return cont(classNameAfter);
      }
    }
    function classNameAfter(type2, value) {
      if (value == "<") return cont(pushlex(">"), commasep(typeparam, ">"), poplex, classNameAfter);
      if (value == "extends" || value == "implements" || isTS && type2 == ",") {
        if (value == "implements") cx.marked = "keyword";
        return cont(isTS ? typeexpr : expression, classNameAfter);
      }
      if (type2 == "{") return cont(pushlex("}"), classBody, poplex);
    }
    function classBody(type2, value) {
      if (type2 == "async" || type2 == "variable" && (value == "static" || value == "get" || value == "set" || isTS && isModifier(value)) && cx.stream.match(/^\s+[\w$\xa1-\uffff]/, false)) {
        cx.marked = "keyword";
        return cont(classBody);
      }
      if (type2 == "variable" || cx.style == "keyword") {
        cx.marked = "property";
        return cont(classfield, classBody);
      }
      if (type2 == "number" || type2 == "string") return cont(classfield, classBody);
      if (type2 == "[")
        return cont(expression, maybetype, expect("]"), classfield, classBody);
      if (value == "*") {
        cx.marked = "keyword";
        return cont(classBody);
      }
      if (isTS && type2 == "(") return pass(functiondecl, classBody);
      if (type2 == ";" || type2 == ",") return cont(classBody);
      if (type2 == "}") return cont();
      if (value == "@") return cont(expression, classBody);
    }
    function classfield(type2, value) {
      if (value == "?") return cont(classfield);
      if (type2 == ":") return cont(typeexpr, maybeAssign);
      if (value == "=") return cont(expressionNoComma);
      var context = cx.state.lexical.prev, isInterface = context && context.info == "interface";
      return pass(isInterface ? functiondecl : functiondef);
    }
    function afterExport(type2, value) {
      if (value == "*") {
        cx.marked = "keyword";
        return cont(maybeFrom, expect(";"));
      }
      if (value == "default") {
        cx.marked = "keyword";
        return cont(expression, expect(";"));
      }
      if (type2 == "{") return cont(commasep(exportField, "}"), maybeFrom, expect(";"));
      return pass(statement);
    }
    function exportField(type2, value) {
      if (value == "as") {
        cx.marked = "keyword";
        return cont(expect("variable"));
      }
      if (type2 == "variable") return pass(expressionNoComma, exportField);
    }
    function afterImport(type2) {
      if (type2 == "string") return cont();
      if (type2 == "(") return pass(expression);
      if (type2 == ".") return pass(maybeoperatorComma);
      return pass(importSpec, maybeMoreImports, maybeFrom);
    }
    function importSpec(type2, value) {
      if (type2 == "{") return contCommasep(importSpec, "}");
      if (type2 == "variable") register(value);
      if (value == "*") cx.marked = "keyword";
      return cont(maybeAs);
    }
    function maybeMoreImports(type2) {
      if (type2 == ",") return cont(importSpec, maybeMoreImports);
    }
    function maybeAs(_type, value) {
      if (value == "as") {
        cx.marked = "keyword";
        return cont(importSpec);
      }
    }
    function maybeFrom(_type, value) {
      if (value == "from") {
        cx.marked = "keyword";
        return cont(expression);
      }
    }
    function arrayLiteral(type2) {
      if (type2 == "]") return cont();
      return pass(commasep(expressionNoComma, "]"));
    }
    function enumdef() {
      return pass(pushlex("form"), pattern, expect("{"), pushlex("}"), commasep(enummember, "}"), poplex, poplex);
    }
    function enummember() {
      return pass(pattern, maybeAssign);
    }
    function isContinuedStatement(state, textAfter) {
      return state.lastType == "operator" || state.lastType == "," || isOperatorChar.test(textAfter.charAt(0)) || /[,.]/.test(textAfter.charAt(0));
    }
    function expressionAllowed(stream, state, backUp) {
      return state.tokenize == tokenBase && /^(?:operator|sof|keyword [bcd]|case|new|export|default|spread|[\[{}\(,;:]|=>)$/.test(state.lastType) || state.lastType == "quasi" && /\{\s*$/.test(stream.string.slice(0, stream.pos - (backUp || 0)));
    }
    return {
      startState: function(basecolumn) {
        var state = {
          tokenize: tokenBase,
          lastType: "sof",
          cc: [],
          lexical: new JSLexical((basecolumn || 0) - indentUnit, 0, "block", false),
          localVars: parserConfig.localVars,
          context: parserConfig.localVars && new Context(null, null, false),
          indented: basecolumn || 0
        };
        if (parserConfig.globalVars && typeof parserConfig.globalVars == "object")
          state.globalVars = parserConfig.globalVars;
        return state;
      },
      token: function(stream, state) {
        if (stream.sol()) {
          if (!state.lexical.hasOwnProperty("align"))
            state.lexical.align = false;
          state.indented = stream.indentation();
          findFatArrow(stream, state);
        }
        if (state.tokenize != tokenComment && stream.eatSpace()) return null;
        var style = state.tokenize(stream, state);
        if (type == "comment") return style;
        state.lastType = type == "operator" && (content == "++" || content == "--") ? "incdec" : type;
        return parseJS(state, style, type, content, stream);
      },
      indent: function(state, textAfter) {
        if (state.tokenize == tokenComment || state.tokenize == tokenQuasi) return CodeMirror2.Pass;
        if (state.tokenize != tokenBase) return 0;
        var firstChar = textAfter && textAfter.charAt(0), lexical = state.lexical, top;
        if (!/^\s*else\b/.test(textAfter)) for (var i = state.cc.length - 1; i >= 0; --i) {
          var c = state.cc[i];
          if (c == poplex) lexical = lexical.prev;
          else if (c != maybeelse && c != popcontext) break;
        }
        while ((lexical.type == "stat" || lexical.type == "form") && (firstChar == "}" || (top = state.cc[state.cc.length - 1]) && (top == maybeoperatorComma || top == maybeoperatorNoComma) && !/^[,\.=+\-*:?[\(]/.test(textAfter)))
          lexical = lexical.prev;
        if (statementIndent && lexical.type == ")" && lexical.prev.type == "stat")
          lexical = lexical.prev;
        var type2 = lexical.type, closing = firstChar == type2;
        if (type2 == "vardef") return lexical.indented + (state.lastType == "operator" || state.lastType == "," ? lexical.info.length + 1 : 0);
        else if (type2 == "form" && firstChar == "{") return lexical.indented;
        else if (type2 == "form") return lexical.indented + indentUnit;
        else if (type2 == "stat")
          return lexical.indented + (isContinuedStatement(state, textAfter) ? statementIndent || indentUnit : 0);
        else if (lexical.info == "switch" && !closing && parserConfig.doubleIndentSwitch != false)
          return lexical.indented + (/^(?:case|default)\b/.test(textAfter) ? indentUnit : 2 * indentUnit);
        else if (lexical.align) return lexical.column + (closing ? 0 : 1);
        else return lexical.indented + (closing ? 0 : indentUnit);
      },
      electricInput: /^\s*(?:case .*?:|default:|\{|\})$/,
      blockCommentStart: jsonMode ? null : "/*",
      blockCommentEnd: jsonMode ? null : "*/",
      blockCommentContinue: jsonMode ? null : " * ",
      lineComment: jsonMode ? null : "//",
      fold: "brace",
      closeBrackets: "()[]{}''\"\"``",
      helperType: jsonMode ? "json" : "javascript",
      jsonldMode,
      jsonMode,
      expressionAllowed,
      skipExpression: function(state) {
        var top = state.cc[state.cc.length - 1];
        if (top == expression || top == expressionNoComma) state.cc.pop();
      }
    };
  });
  CodeMirror2.registerHelper("wordChars", "javascript", /[\w$]/);
  CodeMirror2.defineMIME("text/javascript", "javascript");
  CodeMirror2.defineMIME("text/ecmascript", "javascript");
  CodeMirror2.defineMIME("application/javascript", "javascript");
  CodeMirror2.defineMIME("application/x-javascript", "javascript");
  CodeMirror2.defineMIME("application/ecmascript", "javascript");
  CodeMirror2.defineMIME("application/json", { name: "javascript", json: true });
  CodeMirror2.defineMIME("application/x-json", { name: "javascript", json: true });
  CodeMirror2.defineMIME("application/manifest+json", { name: "javascript", json: true });
  CodeMirror2.defineMIME("application/ld+json", { name: "javascript", jsonld: true });
  CodeMirror2.defineMIME("text/typescript", { name: "javascript", typescript: true });
  CodeMirror2.defineMIME("application/typescript", { name: "javascript", typescript: true });
});

// gen/front_end/entrypoints/formatter_worker/CSSFormatter.js
var CSSFormatter_exports = {};
__export(CSSFormatter_exports, {
  CSSFormatter: () => CSSFormatter
});
import * as Platform4 from "./../../core/platform/platform.js";

// gen/front_end/entrypoints/formatter_worker/FormatterWorker.js
var FormatterWorker_exports = {};
__export(FormatterWorker_exports, {
  AbortTokenization: () => AbortTokenization,
  createTokenizer: () => createTokenizer,
  format: () => format,
  substituteExpression: () => substituteExpression
});
import * as Platform3 from "./../../core/platform/platform.js";
import * as Root from "./../../core/root/root.js";

// gen/front_end/entrypoints/formatter_worker/FormattedContentBuilder.js
var FormattedContentBuilder_exports = {};
__export(FormattedContentBuilder_exports, {
  FormattedContentBuilder: () => FormattedContentBuilder
});
var FormattedContentBuilder = class {
  indentString;
  #lastOriginalPosition = 0;
  #formattedContent = [];
  #formattedContentLength = 0;
  #lastFormattedPosition = 0;
  #nestingLevel = 0;
  #newLines = 0;
  #enforceSpaceBetweenWords = true;
  #softSpace = false;
  #hardSpaces = 0;
  #cachedIndents = /* @__PURE__ */ new Map();
  #canBeIdentifierOrNumber = /[$\u200C\u200D\p{ID_Continue}]/u;
  mapping = { original: [0], formatted: [0] };
  constructor(indentString) {
    this.indentString = indentString;
  }
  setEnforceSpaceBetweenWords(value) {
    const oldValue = this.#enforceSpaceBetweenWords;
    this.#enforceSpaceBetweenWords = value;
    return oldValue;
  }
  addToken(token, offset) {
    if (this.#enforceSpaceBetweenWords && !this.#hardSpaces && !this.#softSpace) {
      const lastCharOfLastToken = this.#formattedContent.at(-1)?.at(-1) ?? "";
      if (this.#canBeIdentifierOrNumber.test(lastCharOfLastToken) && this.#canBeIdentifierOrNumber.test(token)) {
        this.addSoftSpace();
      }
    }
    this.#appendFormatting();
    this.#addMappingIfNeeded(offset);
    this.#addText(token);
  }
  addSoftSpace() {
    if (!this.#hardSpaces) {
      this.#softSpace = true;
    }
  }
  addHardSpace() {
    this.#softSpace = false;
    ++this.#hardSpaces;
  }
  addNewLine(noSquash) {
    if (!this.#formattedContentLength) {
      return;
    }
    if (noSquash) {
      ++this.#newLines;
    } else {
      this.#newLines = this.#newLines || 1;
    }
  }
  increaseNestingLevel() {
    this.#nestingLevel += 1;
  }
  decreaseNestingLevel() {
    if (this.#nestingLevel > 0) {
      this.#nestingLevel -= 1;
    }
  }
  content() {
    return this.#formattedContent.join("") + (this.#newLines ? "\n" : "");
  }
  #appendFormatting() {
    if (this.#newLines) {
      for (let i = 0; i < this.#newLines; ++i) {
        this.#addText("\n");
      }
      this.#addText(this.#indent());
    } else if (this.#softSpace) {
      this.#addText(" ");
    }
    if (this.#hardSpaces) {
      for (let i = 0; i < this.#hardSpaces; ++i) {
        this.#addText(" ");
      }
    }
    this.#newLines = 0;
    this.#softSpace = false;
    this.#hardSpaces = 0;
  }
  #indent() {
    const cachedValue = this.#cachedIndents.get(this.#nestingLevel);
    if (cachedValue) {
      return cachedValue;
    }
    let fullIndent = "";
    for (let i = 0; i < this.#nestingLevel; ++i) {
      fullIndent += this.indentString;
    }
    if (this.#nestingLevel <= 20) {
      this.#cachedIndents.set(this.#nestingLevel, fullIndent);
    }
    return fullIndent;
  }
  #addText(text) {
    this.#formattedContent.push(text);
    this.#formattedContentLength += text.length;
  }
  #addMappingIfNeeded(originalPosition) {
    if (originalPosition - this.#lastOriginalPosition === this.#formattedContentLength - this.#lastFormattedPosition) {
      return;
    }
    this.mapping.original.push(originalPosition);
    this.#lastOriginalPosition = originalPosition;
    this.mapping.formatted.push(this.#formattedContentLength);
    this.#lastFormattedPosition = this.#formattedContentLength;
  }
};

// gen/front_end/entrypoints/formatter_worker/HTMLFormatter.js
var HTMLFormatter_exports = {};
__export(HTMLFormatter_exports, {
  HTMLFormatter: () => HTMLFormatter,
  HTMLModel: () => HTMLModel
});
import * as Platform2 from "./../../core/platform/platform.js";

// gen/front_end/entrypoints/formatter_worker/JavaScriptFormatter.js
var JavaScriptFormatter_exports = {};
__export(JavaScriptFormatter_exports, {
  JavaScriptFormatter: () => JavaScriptFormatter
});
import * as Acorn2 from "./../../third_party/acorn/acorn.js";

// gen/front_end/entrypoints/formatter_worker/AcornTokenizer.js
import * as Platform from "./../../core/platform/platform.js";
import * as TextUtils from "./../../models/text_utils/text_utils.js";
import * as Acorn from "./../../third_party/acorn/acorn.js";
var AcornTokenizer = class {
  #textCursor;
  #tokenLineStart;
  #tokenLineEnd;
  #tokens;
  #idx = 0;
  constructor(content, tokens) {
    this.#tokens = tokens;
    const contentLineEndings = Platform.StringUtilities.findLineEndingIndexes(content);
    this.#textCursor = new TextUtils.TextCursor.TextCursor(contentLineEndings);
    this.#tokenLineStart = 0;
    this.#tokenLineEnd = 0;
  }
  static punctuator(token, values) {
    return token.type !== Acorn.tokTypes.num && token.type !== Acorn.tokTypes.regexp && token.type !== Acorn.tokTypes.string && token.type !== Acorn.tokTypes.name && !token.type.keyword && (!values || token.type.label.length === 1 && values.indexOf(token.type.label) !== -1);
  }
  static keyword(token, keyword) {
    return Boolean(token.type.keyword) && token.type !== Acorn.tokTypes["_true"] && token.type !== Acorn.tokTypes["_false"] && token.type !== Acorn.tokTypes["_null"] && (!keyword || token.type.keyword === keyword);
  }
  static identifier(token, identifier) {
    return token.type === Acorn.tokTypes.name && (!identifier || token.value === identifier);
  }
  static arrowIdentifier(token, identifier) {
    return token.type === Acorn.tokTypes.arrow && (!identifier || token.type.label === identifier);
  }
  static lineComment(token) {
    return token.type === "Line";
  }
  static blockComment(token) {
    return token.type === "Block";
  }
  nextToken() {
    const token = this.#tokens[this.#idx++];
    if (!token || token.type === Acorn.tokTypes.eof) {
      return null;
    }
    this.#textCursor.advance(token.start);
    this.#tokenLineStart = this.#textCursor.lineNumber();
    this.#textCursor.advance(token.end);
    this.#tokenLineEnd = this.#textCursor.lineNumber();
    return token;
  }
  peekToken() {
    const token = this.#tokens[this.#idx];
    if (!token || token.type === Acorn.tokTypes.eof) {
      return null;
    }
    return token;
  }
  tokenLineStart() {
    return this.#tokenLineStart;
  }
  tokenLineEnd() {
    return this.#tokenLineEnd;
  }
};
var ECMA_VERSION = 2022;

// gen/front_end/entrypoints/formatter_worker/ESTreeWalker.js
var ESTreeWalker = class {
  #beforeVisit;
  #afterVisit;
  constructor(beforeVisit, afterVisit) {
    this.#beforeVisit = beforeVisit;
    this.#afterVisit = afterVisit;
  }
  walk(ast) {
    this.#innerWalk(ast, null);
  }
  #innerWalk(node, parent) {
    if (!node) {
      return;
    }
    node.parent = parent;
    this.#beforeVisit.call(null, node);
    const walkOrder = WALK_ORDER[node.type];
    if (!walkOrder) {
      console.error("Walk order not defined for " + node.type);
      return;
    }
    if (node.type === "TemplateLiteral") {
      const templateLiteral = node;
      const expressionsLength = templateLiteral.expressions.length;
      for (let i = 0; i < expressionsLength; ++i) {
        this.#innerWalk(templateLiteral.quasis[i], templateLiteral);
        this.#innerWalk(templateLiteral.expressions[i], templateLiteral);
      }
      this.#innerWalk(templateLiteral.quasis[expressionsLength], templateLiteral);
    } else {
      for (let i = 0; i < walkOrder.length; ++i) {
        const entity = node[walkOrder[i]];
        if (Array.isArray(entity)) {
          this.#walkArray(entity, node);
        } else {
          this.#innerWalk(entity, node);
        }
      }
    }
    this.#afterVisit.call(null, node);
  }
  #walkArray(nodeArray, parentNode) {
    for (let i = 0; i < nodeArray.length; ++i) {
      this.#innerWalk(nodeArray[i], parentNode);
    }
  }
};
var WALK_ORDER = {
  AwaitExpression: ["argument"],
  ArrayExpression: ["elements"],
  ArrayPattern: ["elements"],
  ArrowFunctionExpression: ["params", "body"],
  AssignmentExpression: ["left", "right"],
  AssignmentPattern: ["left", "right"],
  BinaryExpression: ["left", "right"],
  BlockStatement: ["body"],
  BreakStatement: ["label"],
  CallExpression: ["callee", "arguments"],
  CatchClause: ["param", "body"],
  ClassBody: ["body"],
  ClassDeclaration: ["id", "superClass", "body"],
  ClassExpression: ["id", "superClass", "body"],
  ChainExpression: ["expression"],
  ConditionalExpression: ["test", "consequent", "alternate"],
  ContinueStatement: ["label"],
  DebuggerStatement: [],
  DoWhileStatement: ["body", "test"],
  EmptyStatement: [],
  ExpressionStatement: ["expression"],
  ForInStatement: ["left", "right", "body"],
  ForOfStatement: ["left", "right", "body"],
  ForStatement: ["init", "test", "update", "body"],
  FunctionDeclaration: ["id", "params", "body"],
  FunctionExpression: ["id", "params", "body"],
  Identifier: [],
  ImportDeclaration: ["specifiers", "source"],
  ImportDefaultSpecifier: ["local"],
  ImportNamespaceSpecifier: ["local"],
  ImportSpecifier: ["imported", "local"],
  ImportExpression: ["source"],
  ExportAllDeclaration: ["source"],
  ExportDefaultDeclaration: ["declaration"],
  ExportNamedDeclaration: ["specifiers", "source", "declaration"],
  ExportSpecifier: ["exported", "local"],
  IfStatement: ["test", "consequent", "alternate"],
  LabeledStatement: ["label", "body"],
  Literal: [],
  LogicalExpression: ["left", "right"],
  MemberExpression: ["object", "property"],
  MetaProperty: ["meta", "property"],
  MethodDefinition: ["key", "value"],
  NewExpression: ["callee", "arguments"],
  ObjectExpression: ["properties"],
  ObjectPattern: ["properties"],
  ParenthesizedExpression: ["expression"],
  PrivateIdentifier: [],
  PropertyDefinition: ["key", "value"],
  Program: ["body"],
  Property: ["key", "value"],
  RestElement: ["argument"],
  ReturnStatement: ["argument"],
  SequenceExpression: ["expressions"],
  SpreadElement: ["argument"],
  StaticBlock: ["body"],
  Super: [],
  SwitchCase: ["test", "consequent"],
  SwitchStatement: ["discriminant", "cases"],
  TaggedTemplateExpression: ["tag", "quasi"],
  TemplateElement: [],
  TemplateLiteral: ["quasis", "expressions"],
  ThisExpression: [],
  ThrowStatement: ["argument"],
  TryStatement: ["block", "handler", "finalizer"],
  UnaryExpression: ["argument"],
  UpdateExpression: ["argument"],
  VariableDeclaration: ["declarations"],
  VariableDeclarator: ["id", "init"],
  WhileStatement: ["test", "body"],
  WithStatement: ["object", "body"],
  YieldExpression: ["argument"]
};

// gen/front_end/entrypoints/formatter_worker/JavaScriptFormatter.js
var JavaScriptFormatter = class {
  #builder;
  #tokenizer;
  #content;
  #fromOffset;
  #lastLineNumber;
  #toOffset;
  constructor(builder) {
    this.#builder = builder;
  }
  format(text, _lineEndings, fromOffset, toOffset) {
    this.#fromOffset = fromOffset;
    this.#toOffset = toOffset;
    this.#content = text.substring(this.#fromOffset, this.#toOffset);
    this.#lastLineNumber = 0;
    const tokens = [];
    const ast = Acorn2.parse(this.#content, {
      ranges: false,
      preserveParens: true,
      allowAwaitOutsideFunction: true,
      allowImportExportEverywhere: true,
      ecmaVersion: ECMA_VERSION,
      allowHashBang: true,
      onToken: tokens,
      onComment: tokens
    });
    this.#tokenizer = new AcornTokenizer(this.#content, tokens);
    const walker = new ESTreeWalker(this.#beforeVisit.bind(this), this.#afterVisit.bind(this));
    walker.walk(ast);
  }
  #push(token, format2) {
    for (let i = 0; i < format2.length; ++i) {
      if (format2[i] === "s") {
        this.#builder.addSoftSpace();
      } else if (format2[i] === "S") {
        this.#builder.addHardSpace();
      } else if (format2[i] === "n") {
        this.#builder.addNewLine();
      } else if (format2[i] === ">") {
        this.#builder.increaseNestingLevel();
      } else if (format2[i] === "<") {
        this.#builder.decreaseNestingLevel();
      } else if (format2[i] === "t") {
        if (this.#tokenizer.tokenLineStart() - this.#lastLineNumber > 1) {
          this.#builder.addNewLine(true);
        }
        this.#lastLineNumber = this.#tokenizer.tokenLineEnd();
        if (token) {
          this.#builder.addToken(this.#content.substring(token.start, token.end), this.#fromOffset + token.start);
        }
      }
    }
  }
  #beforeVisit(node) {
    if (!node.parent) {
      return;
    }
    if (node.type === "TemplateLiteral") {
      this.#builder.setEnforceSpaceBetweenWords(false);
    }
    let token;
    while ((token = this.#tokenizer.peekToken()) && token.start < node.start) {
      const token2 = this.#tokenizer.nextToken();
      const format2 = this.#formatToken(node.parent, token2);
      this.#push(token2, format2);
    }
  }
  #afterVisit(node) {
    const restore = this.#builder.setEnforceSpaceBetweenWords(node.type !== "TemplateElement");
    let token;
    while ((token = this.#tokenizer.peekToken()) && token.start < node.end) {
      const token2 = this.#tokenizer.nextToken();
      const format2 = this.#formatToken(node, token2);
      this.#push(token2, format2);
    }
    this.#push(null, this.#finishNode(node));
    this.#builder.setEnforceSpaceBetweenWords(restore || node.type === "TemplateLiteral");
  }
  #inForLoopHeader(node) {
    const parent = node.parent;
    if (!parent) {
      return false;
    }
    if (parent.type === "ForStatement") {
      const parentNode = parent;
      return node === parentNode.init || node === parentNode.test || node === parentNode.update;
    }
    if (parent.type === "ForInStatement" || parent.type === "ForOfStatement") {
      const parentNode = parent;
      return node === parentNode.left || node === parentNode.right;
    }
    return false;
  }
  #formatToken(node, tokenOrComment) {
    const AT = AcornTokenizer;
    if (AT.lineComment(tokenOrComment)) {
      return "tn";
    }
    if (AT.blockComment(tokenOrComment)) {
      return "tn";
    }
    const token = tokenOrComment;
    const nodeType = node.type;
    if (nodeType === "ContinueStatement" || nodeType === "BreakStatement") {
      return node.label && AT.keyword(token) ? "ts" : "t";
    }
    if (nodeType === "Identifier") {
      return "t";
    }
    if (nodeType === "PrivateIdentifier") {
      return "t";
    }
    if (nodeType === "ReturnStatement") {
      if (AT.punctuator(token, ";")) {
        return "t";
      }
      return node.argument ? "ts" : "t";
    }
    if (nodeType === "AwaitExpression") {
      if (AT.punctuator(token, ";")) {
        return "t";
      }
      return node.argument ? "ts" : "t";
    }
    if (nodeType === "Property") {
      if (AT.punctuator(token, ":")) {
        return "ts";
      }
      return "t";
    }
    if (nodeType === "ArrayExpression") {
      if (AT.punctuator(token, ",")) {
        return "ts";
      }
      return "t";
    }
    if (nodeType === "LabeledStatement") {
      if (AT.punctuator(token, ":")) {
        return "ts";
      }
    } else if (nodeType === "LogicalExpression" || nodeType === "AssignmentExpression" || nodeType === "BinaryExpression") {
      if (AT.punctuator(token) && !AT.punctuator(token, "()")) {
        return "sts";
      }
    } else if (nodeType === "ConditionalExpression") {
      if (AT.punctuator(token, "?:")) {
        return "sts";
      }
    } else if (nodeType === "VariableDeclarator") {
      if (AT.punctuator(token, "=")) {
        return "sts";
      }
    } else if (nodeType === "ObjectPattern") {
      if (node.parent?.type === "VariableDeclarator" && AT.punctuator(token, "{")) {
        return "st";
      }
      if (AT.punctuator(token, ",")) {
        return "ts";
      }
    } else if (nodeType === "FunctionDeclaration") {
      if (AT.punctuator(token, ",)")) {
        return "ts";
      }
    } else if (nodeType === "FunctionExpression") {
      if (AT.punctuator(token, ",)")) {
        return "ts";
      }
      if (AT.keyword(token, "function")) {
        return node.id ? "ts" : "t";
      }
    } else if (nodeType === "ArrowFunctionExpression") {
      if (AT.punctuator(token, ",)")) {
        return "ts";
      }
      if (AT.punctuator(token, "(")) {
        return "st";
      }
      if (AT.arrowIdentifier(token, "=>")) {
        return "sts";
      }
    } else if (nodeType === "WithStatement") {
      if (AT.punctuator(token, ")")) {
        return node.body?.type === "BlockStatement" ? "ts" : "tn>";
      }
    } else if (nodeType === "SwitchStatement") {
      if (AT.punctuator(token, "{")) {
        return "tn>";
      }
      if (AT.punctuator(token, "}")) {
        return "n<tn";
      }
      if (AT.punctuator(token, ")")) {
        return "ts";
      }
    } else if (nodeType === "SwitchCase") {
      if (AT.keyword(token, "case")) {
        return "n<ts";
      }
      if (AT.keyword(token, "default")) {
        return "n<t";
      }
      if (AT.punctuator(token, ":")) {
        return "tn>";
      }
    } else if (nodeType === "VariableDeclaration") {
      if (AT.punctuator(token, ",")) {
        let allVariablesInitialized = true;
        const declarations = node.declarations;
        for (let i = 0; i < declarations.length; ++i) {
          allVariablesInitialized = allVariablesInitialized && Boolean(declarations[i].init);
        }
        return !this.#inForLoopHeader(node) && allVariablesInitialized ? "nSSts" : "ts";
      }
    } else if (nodeType === "PropertyDefinition") {
      if (AT.punctuator(token, "=")) {
        return "sts";
      }
      if (AT.punctuator(token, ";")) {
        return "tn";
      }
    } else if (nodeType === "BlockStatement") {
      if (AT.punctuator(token, "{")) {
        return node.body.length ? "tn>" : "t";
      }
      if (AT.punctuator(token, "}")) {
        return node.body.length ? "n<t" : "t";
      }
    } else if (nodeType === "CatchClause") {
      if (AT.punctuator(token, ")")) {
        return "ts";
      }
    } else if (nodeType === "ObjectExpression") {
      if (!node.properties.length) {
        return "t";
      }
      if (AT.punctuator(token, "{")) {
        return "tn>";
      }
      if (AT.punctuator(token, "}")) {
        return "n<t";
      }
      if (AT.punctuator(token, ",")) {
        return "tn";
      }
    } else if (nodeType === "IfStatement") {
      if (AT.punctuator(token, ")")) {
        return node.consequent?.type === "BlockStatement" ? "ts" : "tn>";
      }
      if (AT.keyword(token, "else")) {
        const preFormat = node.consequent?.type === "BlockStatement" ? "st" : "n<t";
        let postFormat = "n>";
        if (node.alternate && (node.alternate.type === "BlockStatement" || node.alternate.type === "IfStatement")) {
          postFormat = "s";
        }
        return preFormat + postFormat;
      }
    } else if (nodeType === "CallExpression") {
      if (AT.punctuator(token, ",")) {
        return "ts";
      }
    } else if (nodeType === "SequenceExpression" && AT.punctuator(token, ",")) {
      return node.parent?.type === "SwitchCase" ? "ts" : "tn";
    } else if (nodeType === "ForStatement" || nodeType === "ForOfStatement" || nodeType === "ForInStatement") {
      if (AT.punctuator(token, ";")) {
        return "ts";
      }
      if (AT.keyword(token, "in") || AT.identifier(token, "of")) {
        return "sts";
      }
      if (AT.punctuator(token, ")")) {
        return node.body?.type === "BlockStatement" ? "ts" : "tn>";
      }
    } else if (nodeType === "WhileStatement") {
      if (AT.punctuator(token, ")")) {
        return node.body?.type === "BlockStatement" ? "ts" : "tn>";
      }
    } else if (nodeType === "DoWhileStatement") {
      const blockBody = node.body?.type === "BlockStatement";
      if (AT.keyword(token, "do")) {
        return blockBody ? "ts" : "tn>";
      }
      if (AT.keyword(token, "while")) {
        return blockBody ? "sts" : "n<ts";
      }
      if (AT.punctuator(token, ";")) {
        return "tn";
      }
    } else if (nodeType === "ClassBody") {
      if (AT.punctuator(token, "{")) {
        return "stn>";
      }
      if (AT.punctuator(token, "}")) {
        return "<ntn";
      }
      return "t";
    } else if (nodeType === "YieldExpression") {
      return "t";
    } else if (nodeType === "Super") {
      return "t";
    } else if (nodeType === "ImportExpression") {
      return "t";
    } else if (nodeType === "ExportAllDeclaration") {
      if (AT.punctuator(token, "*")) {
        return "sts";
      }
      return "t";
    } else if (nodeType === "ExportNamedDeclaration" || nodeType === "ImportDeclaration") {
      if (AT.punctuator(token, "{")) {
        return "st";
      }
      if (AT.punctuator(token, ",")) {
        return "ts";
      }
      if (AT.punctuator(token, "}")) {
        return node.source ? "ts" : "t";
      }
      if (AT.punctuator(token, "*")) {
        return "sts";
      }
      return "t";
    } else if (nodeType === "MemberExpression") {
      if (node.object.type === "Literal" && typeof node.object.value === "number") {
        return "st";
      }
      return "t";
    }
    return AT.keyword(token) && !AT.keyword(token, "this") ? "ts" : "t";
  }
  #finishNode(node) {
    const nodeType = node.type;
    if (nodeType === "WithStatement") {
      if (node.body && node.body.type !== "BlockStatement") {
        return "n<";
      }
    } else if (nodeType === "VariableDeclaration") {
      if (!this.#inForLoopHeader(node)) {
        return "n";
      }
    } else if (nodeType === "ForStatement" || nodeType === "ForOfStatement" || nodeType === "ForInStatement") {
      if (node.body && node.body.type !== "BlockStatement") {
        return "n<";
      }
    } else if (nodeType === "BlockStatement") {
      if (node.parent?.type === "IfStatement") {
        const parentNode = node.parent;
        if (parentNode.alternate && parentNode.consequent === node) {
          return "";
        }
      }
      if (node.parent?.type === "FunctionExpression" && node.parent.parent?.type === "Property") {
        return "";
      }
      if (node.parent?.type === "FunctionExpression" && node.parent.parent?.type === "VariableDeclarator") {
        return "";
      }
      if (node.parent?.type === "FunctionExpression" && node.parent.parent?.type === "CallExpression") {
        return "";
      }
      if (node.parent?.type === "DoWhileStatement") {
        return "";
      }
      if (node.parent?.type === "TryStatement") {
        const parentNode = node.parent;
        if (parentNode.block === node) {
          return "s";
        }
      }
      if (node.parent?.type === "CatchClause") {
        const parentNode = node.parent;
        if (parentNode.parent?.finalizer) {
          return "s";
        }
      }
      return "n";
    } else if (nodeType === "WhileStatement") {
      if (node.body && node.body.type !== "BlockStatement") {
        return "n<";
      }
    } else if (nodeType === "IfStatement") {
      if (node.alternate) {
        if (node.alternate.type !== "BlockStatement" && node.alternate.type !== "IfStatement") {
          return "<";
        }
      } else if (node.consequent) {
        if (node.consequent.type !== "BlockStatement") {
          return "<";
        }
      }
    } else if (nodeType === "BreakStatement" || nodeType === "ContinueStatement" || nodeType === "ThrowStatement" || nodeType === "ReturnStatement" || nodeType === "ExpressionStatement") {
      return "n";
    } else if (nodeType === "ImportDeclaration" || nodeType === "ExportAllDeclaration" || nodeType === "ExportDefaultDeclaration" || nodeType === "ExportNamedDeclaration") {
      return "n";
    }
    return "";
  }
};

// gen/front_end/entrypoints/formatter_worker/JSONFormatter.js
var JSONFormatter_exports = {};
__export(JSONFormatter_exports, {
  JSONFormatter: () => JSONFormatter
});
var JSONFormatter = class {
  builder;
  toOffset;
  fromOffset;
  lineEndings;
  lastLine;
  text;
  constructor(builder) {
    this.builder = builder;
    this.lastLine = -1;
  }
  format(text, lineEndings, fromOffset, toOffset) {
    this.lineEndings = lineEndings;
    this.fromOffset = fromOffset;
    this.toOffset = toOffset;
    this.lastLine = -1;
    this.text = text;
    const tokenize = createTokenizer("application/json");
    tokenize(text.substring(this.fromOffset, this.toOffset), this.tokenCallback.bind(this));
  }
  tokenCallback(token, _type, startPosition) {
    switch (token.charAt(0)) {
      case "{":
      case "[":
        if (this.text[startPosition + 1] === "}" || this.text[startPosition + 1] === "]") {
          this.builder.addToken(token, startPosition);
        } else {
          this.builder.addToken(token, startPosition);
          this.builder.addNewLine();
          this.builder.increaseNestingLevel();
        }
        break;
      case "}":
      case "]":
        if (this.text[startPosition - 1] === "{" || this.text[startPosition - 1] === "[") {
          this.builder.addToken(token, startPosition);
        } else {
          this.builder.decreaseNestingLevel();
          this.builder.addNewLine();
          this.builder.addToken(token, startPosition);
        }
        break;
      case ":":
        this.builder.addToken(token, startPosition);
        this.builder.addSoftSpace();
        break;
      case ",":
        this.builder.addToken(token, startPosition);
        this.builder.addNewLine();
        break;
      case "":
      case " ":
      case "\n":
        break;
      default:
        this.builder.addToken(token, startPosition);
        break;
    }
  }
};

// gen/front_end/entrypoints/formatter_worker/HTMLFormatter.js
var HTMLFormatter = class {
  #builder;
  #jsFormatter;
  #jsonFormatter;
  #cssFormatter;
  #text;
  #lineEndings;
  #model;
  constructor(builder) {
    this.#builder = builder;
    this.#jsFormatter = new JavaScriptFormatter(builder);
    this.#jsonFormatter = new JSONFormatter(builder);
    this.#cssFormatter = new CSSFormatter(builder);
  }
  format(text, lineEndings) {
    this.#text = text;
    this.#lineEndings = lineEndings;
    this.#model = new HTMLModel(text);
    this.#walk(this.#model.document());
  }
  #formatTokensTill(element, offset) {
    if (!this.#model) {
      return;
    }
    let nextToken = this.#model.peekToken();
    while (nextToken && nextToken.startOffset < offset) {
      const token = this.#model.nextToken();
      this.#formatToken(element, token);
      nextToken = this.#model.peekToken();
    }
  }
  #walk(element) {
    if (!element.openTag || !element.closeTag) {
      throw new Error("Element is missing open or close tag");
    }
    if (element.parent) {
      this.#formatTokensTill(element.parent, element.openTag.startOffset);
    }
    this.#beforeOpenTag(element);
    this.#formatTokensTill(element, element.openTag.endOffset);
    this.#afterOpenTag(element);
    for (let i = 0; i < element.children.length; ++i) {
      this.#walk(element.children[i]);
    }
    this.#formatTokensTill(element, element.closeTag.startOffset);
    this.#beforeCloseTag(element);
    this.#formatTokensTill(element, element.closeTag.endOffset);
    this.#afterCloseTag(element);
  }
  #beforeOpenTag(element) {
    if (!this.#model) {
      return;
    }
    if (!element.children.length || element === this.#model.document()) {
      return;
    }
    this.#builder.addNewLine();
  }
  #afterOpenTag(element) {
    if (!this.#model) {
      return;
    }
    if (!element.children.length || element === this.#model.document()) {
      return;
    }
    this.#builder.increaseNestingLevel();
    this.#builder.addNewLine();
  }
  #beforeCloseTag(element) {
    if (!this.#model) {
      return;
    }
    if (!element.children.length || element === this.#model.document()) {
      return;
    }
    this.#builder.decreaseNestingLevel();
    this.#builder.addNewLine();
  }
  #afterCloseTag(_element) {
    this.#builder.addNewLine();
  }
  #formatToken(element, token) {
    if (Platform2.StringUtilities.isWhitespace(token.value)) {
      return;
    }
    if (hasTokenInSet(token.type, "comment") || hasTokenInSet(token.type, "meta")) {
      this.#builder.addNewLine();
      this.#builder.addToken(token.value.trim(), token.startOffset);
      this.#builder.addNewLine();
      return;
    }
    if (!element.openTag || !element.closeTag) {
      return;
    }
    const isBodyToken = element.openTag.endOffset <= token.startOffset && token.startOffset < element.closeTag.startOffset;
    if (isBodyToken && element.name === "style") {
      this.#builder.addNewLine();
      this.#builder.increaseNestingLevel();
      this.#cssFormatter.format(this.#text || "", this.#lineEndings || [], token.startOffset, token.endOffset);
      this.#builder.decreaseNestingLevel();
      return;
    }
    if (isBodyToken && element.name === "script") {
      this.#builder.addNewLine();
      this.#builder.increaseNestingLevel();
      if (scriptTagIsJavaScript(element)) {
        this.#jsFormatter.format(this.#text || "", this.#lineEndings || [], token.startOffset, token.endOffset);
      } else if (scriptTagIsJSON(element)) {
        this.#jsonFormatter.format(this.#text || "", this.#lineEndings || [], token.startOffset, token.endOffset);
      } else {
        this.#builder.addToken(token.value, token.startOffset);
        this.#builder.addNewLine();
      }
      this.#builder.decreaseNestingLevel();
      return;
    }
    if (!isBodyToken && hasTokenInSet(token.type, "attribute")) {
      this.#builder.addSoftSpace();
    }
    this.#builder.addToken(token.value, token.startOffset);
  }
};
function scriptTagIsJavaScript(element) {
  if (!element.openTag) {
    return true;
  }
  if (!element.openTag.attributes.has("type")) {
    return true;
  }
  let type = element.openTag.attributes.get("type");
  if (!type) {
    return true;
  }
  type = type.toLowerCase();
  const isWrappedInQuotes = /^(["\'])(.*)\1$/.exec(type.trim());
  if (isWrappedInQuotes) {
    type = isWrappedInQuotes[2];
  }
  return [
    "application/ecmascript",
    "application/javascript",
    "application/x-ecmascript",
    "application/x-javascript",
    "module",
    "text/ecmascript",
    "text/javascript",
    "text/javascript1.0",
    "text/javascript1.1",
    "text/javascript1.2",
    "text/javascript1.3",
    "text/javascript1.4",
    "text/javascript1.5",
    "text/jscript",
    "text/livescript",
    "text/x-ecmascript",
    "text/x-javascript"
  ].includes(type.trim());
}
function scriptTagIsJSON(element) {
  if (!element.openTag) {
    return false;
  }
  let type = element.openTag.attributes.get("type");
  if (!type) {
    return false;
  }
  type = type.toLowerCase();
  const isWrappedInQuotes = /^(["\'])(.*)\1$/.exec(type.trim());
  if (isWrappedInQuotes) {
    type = isWrappedInQuotes[2];
  }
  const isSubtype = /^application\/\w+\+json$/.exec(type.trim());
  if (isSubtype) {
    type = "application/json";
  }
  return [
    "application/json",
    "importmap",
    "speculationrules"
  ].includes(type.trim());
}
function hasTokenInSet(tokenTypes, type) {
  return tokenTypes.has(type) || tokenTypes.has(`xml-${type}`);
}
var HTMLModel = class {
  #state = "Initial";
  #document;
  #stack;
  #tokens = [];
  #tokenIndex = 0;
  #attributes = /* @__PURE__ */ new Map();
  #attributeName = "";
  #tagName = "";
  #isOpenTag = false;
  #tagStartOffset;
  #tagEndOffset;
  constructor(text) {
    this.#document = new FormatterElement("document");
    this.#document.openTag = new Tag("document", 0, 0, /* @__PURE__ */ new Map(), true, false);
    this.#document.closeTag = new Tag("document", text.length, text.length, /* @__PURE__ */ new Map(), false, false);
    this.#stack = [this.#document];
    this.#build(text);
  }
  #build(text) {
    const tokenizer = createTokenizer("text/html");
    let baseOffset = 0, lastOffset = 0;
    let pendingToken = null;
    const pushToken = (token) => {
      this.#tokens.push(token);
      this.#updateDOM(token);
      const element = this.#stack[this.#stack.length - 1];
      if (element && (element.name === "script" || element.name === "style") && element.openTag?.endOffset === lastOffset) {
        return AbortTokenization;
      }
      return;
    };
    const processToken = (tokenValue, type, tokenStart, tokenEnd) => {
      tokenStart += baseOffset;
      tokenEnd += baseOffset;
      lastOffset = tokenEnd;
      const tokenType = type ? new Set(type.split(" ")) : /* @__PURE__ */ new Set();
      const token = new Token(tokenValue, tokenType, tokenStart, tokenEnd);
      if (pendingToken) {
        if (tokenValue === "/" && type === "attribute" && pendingToken.type.has("string")) {
          token.startOffset = pendingToken.startOffset;
          token.value = `${pendingToken.value}${tokenValue}`;
          token.type = pendingToken.type;
        } else if (tokenValue.startsWith("&") && type === "error" && pendingToken.type.size === 0 || type === null && pendingToken.type.has("error")) {
          pendingToken.endOffset = token.endOffset;
          pendingToken.value += tokenValue;
          pendingToken.type = token.type;
          return;
        } else if (pushToken(pendingToken) === AbortTokenization) {
          return AbortTokenization;
        }
        pendingToken = null;
      }
      if (type === "string" || type === null) {
        pendingToken = token;
        return;
      }
      return pushToken(token);
    };
    while (true) {
      baseOffset = lastOffset;
      tokenizer(text.substring(lastOffset), processToken);
      if (pendingToken) {
        pushToken(pendingToken);
        pendingToken = null;
      }
      if (lastOffset >= text.length) {
        break;
      }
      const element = this.#stack[this.#stack.length - 1];
      if (!element) {
        break;
      }
      while (true) {
        lastOffset = text.indexOf("</", lastOffset);
        if (lastOffset === -1) {
          lastOffset = text.length;
          break;
        }
        if (text.substring(lastOffset + 2).toLowerCase().startsWith(element.name)) {
          break;
        }
        lastOffset += 2;
      }
      if (!element.openTag) {
        break;
      }
      const tokenStart = element.openTag.endOffset;
      const tokenEnd = lastOffset;
      const tokenValue = text.substring(tokenStart, tokenEnd);
      this.#tokens.push(new Token(tokenValue, /* @__PURE__ */ new Set(), tokenStart, tokenEnd));
    }
    while (this.#stack.length > 1) {
      const element = this.#stack[this.#stack.length - 1];
      if (!element) {
        break;
      }
      this.#popElement(new Tag(element.name, text.length, text.length, /* @__PURE__ */ new Map(), false, false));
    }
  }
  #updateDOM(token) {
    const value = token.value;
    const type = token.type;
    switch (this.#state) {
      case "Initial":
        if (hasTokenInSet(type, "bracket") && (value === "<" || value === "</")) {
          this.#onStartTag(token);
          this.#state = "Tag";
        }
        return;
      case "Tag":
        if (hasTokenInSet(type, "tag") && !hasTokenInSet(type, "bracket")) {
          this.#tagName = value.trim().toLowerCase();
        } else if (hasTokenInSet(type, "attribute")) {
          this.#attributeName = value.trim().toLowerCase();
          this.#attributes.set(this.#attributeName, "");
          this.#state = "AttributeName";
        } else if (hasTokenInSet(type, "bracket") && (value === ">" || value === "/>")) {
          this.#onEndTag(token);
          this.#state = "Initial";
        }
        return;
      case "AttributeName":
        if (!type.size && value === "=") {
          this.#state = "AttributeValue";
        } else if (hasTokenInSet(type, "bracket") && (value === ">" || value === "/>")) {
          this.#onEndTag(token);
          this.#state = "Initial";
        }
        return;
      case "AttributeValue":
        if (hasTokenInSet(type, "string")) {
          this.#attributes.set(this.#attributeName, value);
          this.#state = "Tag";
        } else if (hasTokenInSet(type, "bracket") && (value === ">" || value === "/>")) {
          this.#onEndTag(token);
          this.#state = "Initial";
        }
        return;
    }
  }
  #onStartTag(token) {
    this.#tagName = "";
    this.#tagStartOffset = token.startOffset;
    this.#tagEndOffset = null;
    this.#attributes = /* @__PURE__ */ new Map();
    this.#attributeName = "";
    this.#isOpenTag = token.value === "<";
  }
  #onEndTag(token) {
    this.#tagEndOffset = token.endOffset;
    const selfClosingTag = token.value === "/>" || SelfClosingTags.has(this.#tagName);
    const tag = new Tag(this.#tagName, this.#tagStartOffset || 0, this.#tagEndOffset, this.#attributes, this.#isOpenTag, selfClosingTag);
    this.#onTagComplete(tag);
  }
  #onTagComplete(tag) {
    if (tag.isOpenTag) {
      const topElement = this.#stack[this.#stack.length - 1];
      if (topElement) {
        const tagSet = AutoClosingTags.get(topElement.name);
        if (topElement !== this.#document && topElement.openTag?.selfClosingTag) {
          this.#popElement(autocloseTag(topElement, topElement.openTag.endOffset));
        } else if (tagSet?.has(tag.name)) {
          this.#popElement(autocloseTag(topElement, tag.startOffset));
        }
        this.#pushElement(tag);
      }
      return;
    }
    let lastTag = this.#stack[this.#stack.length - 1];
    while (this.#stack.length > 1 && lastTag && lastTag.name !== tag.name) {
      this.#popElement(autocloseTag(lastTag, tag.startOffset));
      lastTag = this.#stack[this.#stack.length - 1];
    }
    if (this.#stack.length === 1) {
      return;
    }
    this.#popElement(tag);
    function autocloseTag(element, offset) {
      return new Tag(element.name, offset, offset, /* @__PURE__ */ new Map(), false, false);
    }
  }
  #popElement(closeTag) {
    const element = this.#stack.pop();
    if (!element) {
      return;
    }
    element.closeTag = closeTag;
  }
  #pushElement(openTag) {
    const topElement = this.#stack[this.#stack.length - 1];
    const newElement = new FormatterElement(openTag.name);
    if (topElement) {
      newElement.parent = topElement;
      topElement.children.push(newElement);
    }
    newElement.openTag = openTag;
    this.#stack.push(newElement);
  }
  peekToken() {
    return this.#tokenIndex < this.#tokens.length ? this.#tokens[this.#tokenIndex] : null;
  }
  nextToken() {
    return this.#tokens[this.#tokenIndex++];
  }
  document() {
    return this.#document;
  }
};
var SelfClosingTags = /* @__PURE__ */ new Set([
  "area",
  "base",
  "br",
  "col",
  "command",
  "embed",
  "hr",
  "img",
  "input",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
var AutoClosingTags = /* @__PURE__ */ new Map([
  ["head", /* @__PURE__ */ new Set(["body"])],
  ["li", /* @__PURE__ */ new Set(["li"])],
  ["dt", /* @__PURE__ */ new Set(["dt", "dd"])],
  ["dd", /* @__PURE__ */ new Set(["dt", "dd"])],
  [
    "p",
    /* @__PURE__ */ new Set([
      "address",
      "article",
      "aside",
      "blockquote",
      "div",
      "dl",
      "fieldset",
      "footer",
      "form",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "header",
      "hgroup",
      "hr",
      "main",
      "nav",
      "ol",
      "p",
      "pre",
      "section",
      "table",
      "ul"
    ])
  ],
  ["rb", /* @__PURE__ */ new Set(["rb", "rt", "rtc", "rp"])],
  ["rt", /* @__PURE__ */ new Set(["rb", "rt", "rtc", "rp"])],
  ["rtc", /* @__PURE__ */ new Set(["rb", "rtc", "rp"])],
  ["rp", /* @__PURE__ */ new Set(["rb", "rt", "rtc", "rp"])],
  ["optgroup", /* @__PURE__ */ new Set(["optgroup"])],
  ["option", /* @__PURE__ */ new Set(["option", "optgroup"])],
  ["colgroup", /* @__PURE__ */ new Set(["colgroup"])],
  ["thead", /* @__PURE__ */ new Set(["tbody", "tfoot"])],
  ["tbody", /* @__PURE__ */ new Set(["tbody", "tfoot"])],
  ["tfoot", /* @__PURE__ */ new Set(["tbody"])],
  ["tr", /* @__PURE__ */ new Set(["tr"])],
  ["td", /* @__PURE__ */ new Set(["td", "th"])],
  ["th", /* @__PURE__ */ new Set(["td", "th"])]
]);
var Token = class {
  value;
  type;
  startOffset;
  endOffset;
  constructor(value, type, startOffset, endOffset) {
    this.value = value;
    this.type = type;
    this.startOffset = startOffset;
    this.endOffset = endOffset;
  }
};
var Tag = class {
  name;
  startOffset;
  endOffset;
  attributes;
  isOpenTag;
  selfClosingTag;
  constructor(name, startOffset, endOffset, attributes, isOpenTag, selfClosingTag) {
    this.name = name;
    this.startOffset = startOffset;
    this.endOffset = endOffset;
    this.attributes = attributes;
    this.isOpenTag = isOpenTag;
    this.selfClosingTag = selfClosingTag;
  }
};
var FormatterElement = class {
  name;
  children = [];
  parent = null;
  openTag = null;
  closeTag = null;
  constructor(name) {
    this.name = name;
  }
};

// gen/front_end/entrypoints/formatter_worker/IdentityFormatter.js
var IdentityFormatter = class {
  builder;
  constructor(builder) {
    this.builder = builder;
  }
  format(text, _lineEndings, fromOffset, toOffset) {
    const content = text.substring(fromOffset, toOffset);
    this.builder.addToken(content, fromOffset);
  }
};

// gen/front_end/entrypoints/formatter_worker/Substitute.js
var Substitute_exports = {};
__export(Substitute_exports, {
  substituteExpression: () => substituteExpression
});
import * as Acorn4 from "./../../third_party/acorn/acorn.js";

// gen/front_end/entrypoints/formatter_worker/ScopeParser.js
var ScopeParser_exports = {};
__export(ScopeParser_exports, {
  Scope: () => Scope,
  ScopeVariableAnalysis: () => ScopeVariableAnalysis,
  parseScopes: () => parseScopes
});
import * as Acorn3 from "./../../third_party/acorn/acorn.js";
function parseScopes(expression, sourceType = "script") {
  let root = null;
  try {
    root = Acorn3.parse(expression, { ecmaVersion: ECMA_VERSION, allowAwaitOutsideFunction: true, ranges: false, sourceType });
  } catch {
    return null;
  }
  return new ScopeVariableAnalysis(root, expression).run();
}
var Scope = class {
  variables = /* @__PURE__ */ new Map();
  parent;
  start;
  end;
  kind;
  name;
  nameMappingLocations;
  children = [];
  constructor(start, end, parent, kind, name, nameMappingLocations) {
    this.start = start;
    this.end = end;
    this.parent = parent;
    this.kind = kind;
    this.name = name;
    this.nameMappingLocations = nameMappingLocations;
    if (parent) {
      parent.children.push(this);
    }
  }
  export() {
    const variables = [];
    for (const variable of this.variables) {
      const offsets = [];
      for (const use of variable[1].uses) {
        offsets.push(use.offset);
      }
      variables.push({ name: variable[0], kind: variable[1].definitionKind, offsets });
    }
    const children = this.children.map((c) => c.export());
    return {
      start: this.start,
      end: this.end,
      variables,
      kind: this.kind,
      name: this.name,
      nameMappingLocations: this.nameMappingLocations,
      children
    };
  }
  addVariable(name, offset, definitionKind, isShorthandAssignmentProperty) {
    const variable = this.variables.get(name);
    const use = { offset, scope: this, isShorthandAssignmentProperty };
    if (!variable) {
      this.variables.set(name, { definitionKind, uses: [use] });
      return;
    }
    if (variable.definitionKind === 0) {
      variable.definitionKind = definitionKind;
    }
    variable.uses.push(use);
  }
  findBinders(name) {
    const result = [];
    let scope = this;
    while (scope !== null) {
      const defUse = scope.variables.get(name);
      if (defUse && defUse.definitionKind !== 0) {
        result.push(defUse);
      }
      scope = scope.parent;
    }
    return result;
  }
  #mergeChildDefUses(name, defUses) {
    const variable = this.variables.get(name);
    if (!variable) {
      this.variables.set(name, defUses);
      return;
    }
    variable.uses.push(...defUses.uses);
    if (defUses.definitionKind === 2) {
      console.assert(
        variable.definitionKind !== 1
        /* DefinitionKind.LET */
      );
      if (variable.definitionKind === 0) {
        variable.definitionKind = defUses.definitionKind;
      }
    } else {
      console.assert(
        defUses.definitionKind === 0
        /* DefinitionKind.NONE */
      );
    }
  }
  finalizeToParent(isFunctionScope) {
    if (!this.parent) {
      console.error("Internal error: wrong nesting in scope analysis.");
      throw new Error("Internal error");
    }
    const keysToRemove = [];
    for (const [name, defUse] of this.variables.entries()) {
      if (defUse.definitionKind === 0 || defUse.definitionKind === 2 && !isFunctionScope) {
        this.parent.#mergeChildDefUses(name, defUse);
        keysToRemove.push(name);
      }
    }
    keysToRemove.forEach((k) => this.variables.delete(k));
  }
};
var ScopeVariableAnalysis = class {
  #rootScope;
  #allNames = /* @__PURE__ */ new Set();
  #currentScope;
  #rootNode;
  #sourceText;
  #methodName;
  #additionalMappingLocations = [];
  constructor(node, sourceText) {
    this.#rootNode = node;
    this.#sourceText = sourceText;
    this.#rootScope = new Scope(
      node.start,
      node.end,
      null,
      3
      /* ScopeKind.GLOBAL */
    );
    this.#currentScope = this.#rootScope;
  }
  run() {
    this.#processNode(this.#rootNode);
    return this.#rootScope;
  }
  #processNode(node) {
    if (node === null) {
      return;
    }
    switch (node.type) {
      case "AwaitExpression":
        this.#processNode(node.argument);
        break;
      case "ArrayExpression":
        node.elements.forEach((item) => this.#processNode(item));
        break;
      case "ExpressionStatement":
        this.#processNode(node.expression);
        break;
      case "Program":
        console.assert(this.#currentScope === this.#rootScope);
        node.body.forEach((item) => this.#processNode(item));
        console.assert(this.#currentScope === this.#rootScope);
        break;
      case "ArrayPattern":
        node.elements.forEach((item) => this.#processNode(item));
        break;
      case "ArrowFunctionExpression": {
        this.#pushScope(node.start, node.end, 4, void 0, mappingLocationsForArrowFunctions(node, this.#sourceText));
        node.params.forEach(this.#processNodeAsDefinition.bind(this, 2, false));
        if (node.body.type === "BlockStatement") {
          node.body.body.forEach(this.#processNode.bind(this));
        } else {
          this.#processNode(node.body);
        }
        this.#popScope(true);
        break;
      }
      case "AssignmentExpression":
      case "AssignmentPattern":
      case "BinaryExpression":
      case "LogicalExpression":
        this.#processNode(node.left);
        this.#processNode(node.right);
        break;
      case "BlockStatement":
        this.#pushScope(
          node.start,
          node.end,
          1
          /* ScopeKind.BLOCK */
        );
        node.body.forEach(this.#processNode.bind(this));
        this.#popScope(false);
        break;
      case "CallExpression":
        this.#processNode(node.callee);
        node.arguments.forEach(this.#processNode.bind(this));
        break;
      case "VariableDeclaration": {
        const definitionKind = node.kind === "var" ? 2 : 1;
        node.declarations.forEach(this.#processVariableDeclarator.bind(this, definitionKind));
        break;
      }
      case "CatchClause":
        this.#pushScope(
          node.start,
          node.end,
          1
          /* ScopeKind.BLOCK */
        );
        this.#processNodeAsDefinition(1, false, node.param);
        this.#processNode(node.body);
        this.#popScope(false);
        break;
      case "ClassBody":
        node.body.forEach(this.#processNode.bind(this));
        break;
      case "ClassDeclaration":
        this.#processNodeAsDefinition(1, false, node.id);
        this.#processNode(node.superClass ?? null);
        this.#processNode(node.body);
        break;
      case "ClassExpression":
        this.#processNode(node.superClass ?? null);
        this.#processNode(node.body);
        break;
      case "ChainExpression":
        this.#processNode(node.expression);
        break;
      case "ConditionalExpression":
        this.#processNode(node.test);
        this.#processNode(node.consequent);
        this.#processNode(node.alternate);
        break;
      case "DoWhileStatement":
        this.#processNode(node.body);
        this.#processNode(node.test);
        break;
      case "ForInStatement":
      case "ForOfStatement":
        this.#pushScope(
          node.start,
          node.end,
          1
          /* ScopeKind.BLOCK */
        );
        this.#processNode(node.left);
        this.#processNode(node.right);
        this.#processNode(node.body);
        this.#popScope(false);
        break;
      case "ForStatement":
        this.#pushScope(
          node.start,
          node.end,
          1
          /* ScopeKind.BLOCK */
        );
        this.#processNode(node.init ?? null);
        this.#processNode(node.test ?? null);
        this.#processNode(node.update ?? null);
        this.#processNode(node.body);
        this.#popScope(false);
        break;
      case "FunctionDeclaration":
        this.#processNodeAsDefinition(2, false, node.id);
        this.#pushScope(node.id?.end ?? node.start, node.end, 2, node.id.name, mappingLocationsForFunctionDeclaration(node, this.#sourceText));
        this.#addVariable(
          "this",
          node.start,
          3
          /* DefinitionKind.FIXED */
        );
        this.#addVariable(
          "arguments",
          node.start,
          3
          /* DefinitionKind.FIXED */
        );
        node.params.forEach(this.#processNodeAsDefinition.bind(this, 1, false));
        node.body.body.forEach(this.#processNode.bind(this));
        this.#popScope(true);
        break;
      case "FunctionExpression":
        this.#pushScope(node.id?.end ?? node.start, node.end, 2, this.#methodName ?? node.id?.name, [...this.#additionalMappingLocations, ...mappingLocationsForFunctionExpression(node, this.#sourceText)]);
        this.#additionalMappingLocations = [];
        this.#methodName = void 0;
        this.#addVariable(
          "this",
          node.start,
          3
          /* DefinitionKind.FIXED */
        );
        this.#addVariable(
          "arguments",
          node.start,
          3
          /* DefinitionKind.FIXED */
        );
        node.params.forEach(this.#processNodeAsDefinition.bind(this, 1, false));
        node.body.body.forEach(this.#processNode.bind(this));
        this.#popScope(true);
        break;
      case "Identifier":
        this.#addVariable(node.name, node.start);
        break;
      case "IfStatement":
        this.#processNode(node.test);
        this.#processNode(node.consequent);
        this.#processNode(node.alternate ?? null);
        break;
      case "LabeledStatement":
        this.#processNode(node.body);
        break;
      case "MetaProperty":
        break;
      case "MethodDefinition":
        if (node.computed) {
          this.#processNode(node.key);
        } else {
          this.#additionalMappingLocations = mappingLocationsForMethodDefinition(node);
          this.#methodName = nameForMethodDefinition(node);
        }
        this.#processNode(node.value);
        break;
      case "NewExpression":
        this.#processNode(node.callee);
        node.arguments.forEach(this.#processNode.bind(this));
        break;
      case "MemberExpression":
        this.#processNode(node.object);
        if (node.computed) {
          this.#processNode(node.property);
        }
        break;
      case "ObjectExpression":
        node.properties.forEach(this.#processNode.bind(this));
        break;
      case "ObjectPattern":
        node.properties.forEach(this.#processNode.bind(this));
        break;
      case "PrivateIdentifier":
        break;
      case "PropertyDefinition":
        if (node.computed) {
          this.#processNode(node.key);
        }
        this.#processNode(node.value ?? null);
        break;
      case "Property":
        if (node.shorthand) {
          console.assert(node.value.type === "Identifier");
          console.assert(node.key.type === "Identifier");
          console.assert(node.value.name === node.key.name);
          this.#addVariable(node.value.name, node.value.start, 0, true);
        } else {
          if (node.computed) {
            this.#processNode(node.key);
          } else if (node.value.type === "FunctionExpression") {
            this.#additionalMappingLocations = mappingLocationsForMethodDefinition(node);
            this.#methodName = nameForMethodDefinition(node);
          }
          this.#processNode(node.value);
        }
        break;
      case "RestElement":
        this.#processNodeAsDefinition(1, false, node.argument);
        break;
      case "ReturnStatement":
        this.#processNode(node.argument ?? null);
        break;
      case "SequenceExpression":
        node.expressions.forEach(this.#processNode.bind(this));
        break;
      case "SpreadElement":
        this.#processNode(node.argument);
        break;
      case "SwitchCase":
        this.#processNode(node.test ?? null);
        node.consequent.forEach(this.#processNode.bind(this));
        break;
      case "SwitchStatement":
        this.#processNode(node.discriminant);
        node.cases.forEach(this.#processNode.bind(this));
        break;
      case "TaggedTemplateExpression":
        this.#processNode(node.tag);
        this.#processNode(node.quasi);
        break;
      case "TemplateLiteral":
        node.expressions.forEach(this.#processNode.bind(this));
        break;
      case "ThisExpression":
        this.#addVariable("this", node.start);
        break;
      case "ThrowStatement":
        this.#processNode(node.argument);
        break;
      case "TryStatement":
        this.#processNode(node.block);
        this.#processNode(node.handler ?? null);
        this.#processNode(node.finalizer ?? null);
        break;
      case "WithStatement":
        this.#processNode(node.object);
        this.#processNode(node.body);
        break;
      case "YieldExpression":
        this.#processNode(node.argument ?? null);
        break;
      case "UnaryExpression":
      case "UpdateExpression":
        this.#processNode(node.argument);
        break;
      case "WhileStatement":
        this.#processNode(node.test);
        this.#processNode(node.body);
        break;
      // Ignore, no expressions involved.
      case "BreakStatement":
      case "ContinueStatement":
      case "DebuggerStatement":
      case "EmptyStatement":
      case "Literal":
      case "Super":
      case "TemplateElement":
        break;
      // Ignore, cannot be used outside of a module.
      case "ImportDeclaration":
      case "ImportDefaultSpecifier":
      case "ImportNamespaceSpecifier":
      case "ImportSpecifier":
      case "ImportExpression":
      case "ExportAllDeclaration":
      case "ExportDefaultDeclaration":
      case "ExportNamedDeclaration":
      case "ExportSpecifier":
        break;
      case "VariableDeclarator":
        console.error("Should not encounter VariableDeclarator in general traversal.");
        break;
    }
  }
  getFreeVariables() {
    const result = /* @__PURE__ */ new Map();
    for (const [name, defUse] of this.#rootScope.variables) {
      if (defUse.definitionKind !== 0) {
        continue;
      }
      result.set(name, defUse.uses);
    }
    return result;
  }
  getAllNames() {
    return this.#allNames;
  }
  #pushScope(start, end, kind, name, nameMappingLocations) {
    this.#currentScope = new Scope(start, end, this.#currentScope, kind, name, nameMappingLocations);
  }
  #popScope(isFunctionContext) {
    if (this.#currentScope.parent === null) {
      console.error("Internal error: wrong nesting in scope analysis.");
      throw new Error("Internal error");
    }
    this.#currentScope.finalizeToParent(isFunctionContext);
    this.#currentScope = this.#currentScope.parent;
  }
  #addVariable(name, offset, definitionKind = 0, isShorthandAssignmentProperty = false) {
    this.#allNames.add(name);
    this.#currentScope.addVariable(name, offset, definitionKind, isShorthandAssignmentProperty);
  }
  #processNodeAsDefinition(definitionKind, isShorthandAssignmentProperty, node) {
    if (node === null) {
      return;
    }
    switch (node.type) {
      case "ArrayPattern":
        node.elements.forEach(this.#processNodeAsDefinition.bind(this, definitionKind, false));
        break;
      case "AssignmentPattern":
        this.#processNodeAsDefinition(definitionKind, isShorthandAssignmentProperty, node.left);
        this.#processNode(node.right);
        break;
      case "Identifier":
        this.#addVariable(node.name, node.start, definitionKind, isShorthandAssignmentProperty);
        break;
      case "MemberExpression":
        this.#processNode(node.object);
        if (node.computed) {
          this.#processNode(node.property);
        }
        break;
      case "ObjectPattern":
        node.properties.forEach(this.#processNodeAsDefinition.bind(this, definitionKind, false));
        break;
      case "Property":
        if (node.computed) {
          this.#processNode(node.key);
        }
        this.#processNodeAsDefinition(definitionKind, node.shorthand, node.value);
        break;
      case "RestElement":
        this.#processNodeAsDefinition(definitionKind, false, node.argument);
        break;
    }
  }
  #processVariableDeclarator(definitionKind, decl) {
    this.#processNodeAsDefinition(definitionKind, false, decl.id);
    this.#processNode(decl.init ?? null);
  }
};
function mappingLocationsForFunctionDeclaration(node, sourceText) {
  const result = [node.id.start];
  const searchParenEndPos = node.params.length ? node.params[0].start : node.body.start;
  const parenPos = indexOfCharInBounds(sourceText, "(", node.id.end, searchParenEndPos);
  if (parenPos >= 0) {
    result.push(parenPos);
  }
  return result;
}
function mappingLocationsForFunctionExpression(node, sourceText) {
  const result = [];
  if (node.id) {
    result.push(node.id.start);
  }
  const searchParenStartPos = node.id ? node.id.end : node.start;
  const searchParenEndPos = node.params.length ? node.params[0].start : node.body.start;
  const parenPos = indexOfCharInBounds(sourceText, "(", searchParenStartPos, searchParenEndPos);
  if (parenPos >= 0) {
    result.push(parenPos);
  }
  return result;
}
function mappingLocationsForMethodDefinition(node) {
  if (node.key.type === "Identifier" || node.key.type === "PrivateIdentifier") {
    const id = node.key;
    return [id.start];
  }
  return [];
}
function nameForMethodDefinition(node) {
  if (node.key.type === "Identifier") {
    return node.key.name;
  }
  if (node.key.type === "PrivateIdentifier") {
    return "#" + node.key.name;
  }
  return void 0;
}
function mappingLocationsForArrowFunctions(node, sourceText) {
  const result = [];
  const searchParenStartPos = node.async ? node.start + 5 : node.start;
  const searchParenEndPos = node.params.length ? node.params[0].start : node.body.start;
  const parenPos = indexOfCharInBounds(sourceText, "(", searchParenStartPos, searchParenEndPos);
  if (parenPos >= 0) {
    result.push(parenPos);
  }
  const searchArrowStartPos = node.params.length ? node.params[node.params.length - 1].end : node.start;
  const arrowPos = indexOfCharInBounds(sourceText, "=", searchArrowStartPos, node.body.start);
  if (arrowPos >= 0 && sourceText[arrowPos + 1] === ">") {
    result.push(arrowPos);
  }
  return result;
}
function indexOfCharInBounds(str, needle, start, end) {
  for (let i = start; i < end; ++i) {
    if (str[i] === needle) {
      return i;
    }
  }
  return -1;
}

// gen/front_end/entrypoints/formatter_worker/Substitute.js
function substituteExpression(expression, nameMap) {
  const replacements = computeSubstitution(expression, nameMap);
  return applySubstitution(expression, replacements);
}
function computeSubstitution(expression, nameMap) {
  const root = Acorn4.parse(expression, {
    ecmaVersion: ECMA_VERSION,
    allowAwaitOutsideFunction: true,
    allowImportExportEverywhere: true,
    checkPrivateFields: false,
    ranges: false
  });
  const scopeVariables = new ScopeVariableAnalysis(root, expression);
  scopeVariables.run();
  const freeVariables = scopeVariables.getFreeVariables();
  const result = [];
  const allNames = scopeVariables.getAllNames();
  for (const rename of nameMap.values()) {
    if (rename) {
      allNames.add(rename);
    }
  }
  function getNewName(base) {
    let i = 1;
    while (allNames.has(`${base}_${i}`)) {
      i++;
    }
    const newName = `${base}_${i}`;
    allNames.add(newName);
    return newName;
  }
  for (const [name, rename] of nameMap.entries()) {
    const defUse = freeVariables.get(name);
    if (!defUse) {
      continue;
    }
    if (rename === null) {
      throw new Error(`Cannot substitute '${name}' as the underlying variable '${rename}' is unavailable`);
    }
    const binders = [];
    for (const use of defUse) {
      result.push({
        from: name,
        to: rename,
        offset: use.offset,
        isShorthandAssignmentProperty: use.isShorthandAssignmentProperty
      });
      binders.push(...use.scope.findBinders(rename));
    }
    for (const binder of binders) {
      if (binder.definitionKind === 3) {
        throw new Error(`Cannot avoid capture of '${rename}'`);
      }
      const newName = getNewName(rename);
      for (const use of binder.uses) {
        result.push({
          from: rename,
          to: newName,
          offset: use.offset,
          isShorthandAssignmentProperty: use.isShorthandAssignmentProperty
        });
      }
    }
  }
  result.sort((l, r) => l.offset - r.offset);
  return result;
}
function applySubstitution(expression, replacements) {
  const accumulator = [];
  let last = 0;
  for (const r of replacements) {
    accumulator.push(expression.slice(last, r.offset));
    let replacement = r.to;
    if (r.isShorthandAssignmentProperty) {
      replacement = `${r.from}: ${r.to}`;
    }
    accumulator.push(replacement);
    last = r.offset + r.from.length;
  }
  accumulator.push(expression.slice(last));
  return accumulator.join("");
}

// gen/front_end/entrypoints/formatter_worker/FormatterWorker.js
function createTokenizer(mimeType) {
  const mode = CodeMirror.getMode({ indentUnit: 2 }, mimeType);
  const state = CodeMirror.startState(mode);
  if (!mode || mode.name === "null") {
    throw new Error(`Could not find CodeMirror mode for MimeType: ${mimeType}`);
  }
  if (!mode.token) {
    throw new Error(`Could not find CodeMirror mode with token method: ${mimeType}`);
  }
  return (line, callback) => {
    const stream = new CodeMirror.StringStream(line);
    while (!stream.eol()) {
      const style = mode.token(stream, state);
      const value = stream.current();
      if (callback(value, style, stream.start, stream.start + value.length) === AbortTokenization) {
        return;
      }
      stream.start = stream.pos;
    }
  };
}
var AbortTokenization = {};
function format(mimeType, text, indentString) {
  indentString = indentString || "    ";
  let result;
  const builder = new FormattedContentBuilder(indentString);
  const lineEndings = Platform3.StringUtilities.findLineEndingIndexes(text);
  try {
    switch (mimeType) {
      case "text/html": {
        const formatter = new HTMLFormatter(builder);
        formatter.format(text, lineEndings);
        break;
      }
      case "text/css": {
        const formatter = new CSSFormatter(builder);
        formatter.format(text, lineEndings, 0, text.length);
        break;
      }
      case "application/javascript":
      case "text/javascript": {
        const formatter = new JavaScriptFormatter(builder);
        formatter.format(text, lineEndings, 0, text.length);
        break;
      }
      case "application/json":
      case "application/manifest+json": {
        const formatter = new JSONFormatter(builder);
        formatter.format(text, lineEndings, 0, text.length);
        break;
      }
      default: {
        const formatter = new IdentityFormatter(builder);
        formatter.format(text, lineEndings, 0, text.length);
      }
    }
    result = {
      mapping: builder.mapping,
      content: builder.content()
    };
  } catch (e) {
    console.error(e);
    result = {
      mapping: { original: [0], formatted: [0] },
      content: text
    };
  }
  return result;
}
(function disableLoggingForTest() {
  if (Root.Runtime.Runtime.queryParam("test")) {
    console.error = () => void 0;
  }
})();

// gen/front_end/entrypoints/formatter_worker/CSSFormatter.js
var cssTrimEnd = (tokenValue) => {
  const re = /(?:\r?\n|[\t\f\r ])+$/g;
  return tokenValue.replace(re, "");
};
var CSSFormatter = class {
  #builder;
  #toOffset;
  #fromOffset;
  #lineEndings;
  #lastLine;
  #state;
  constructor(builder) {
    this.#builder = builder;
    this.#lastLine = -1;
    this.#state = {
      eatWhitespace: void 0,
      seenProperty: void 0,
      inPropertyValue: void 0,
      afterClosingBrace: void 0
    };
  }
  format(text, lineEndings, fromOffset, toOffset) {
    this.#lineEndings = lineEndings;
    this.#fromOffset = fromOffset;
    this.#toOffset = toOffset;
    this.#state = {
      eatWhitespace: void 0,
      seenProperty: void 0,
      inPropertyValue: void 0,
      afterClosingBrace: void 0
    };
    this.#lastLine = -1;
    const tokenize = createTokenizer("text/css");
    const oldEnforce = this.#builder.setEnforceSpaceBetweenWords(false);
    tokenize(text.substring(this.#fromOffset, this.#toOffset), this.#tokenCallback.bind(this));
    this.#builder.setEnforceSpaceBetweenWords(oldEnforce);
  }
  #tokenCallback(token, type, startPosition) {
    startPosition += this.#fromOffset;
    const startLine = Platform4.ArrayUtilities.lowerBound(this.#lineEndings, startPosition, Platform4.ArrayUtilities.DEFAULT_COMPARATOR);
    if (startLine !== this.#lastLine) {
      this.#state.eatWhitespace = true;
    }
    if (type && (/^property/.test(type) || /^variable-2/.test(type)) && !this.#state.inPropertyValue) {
      this.#state.seenProperty = true;
    }
    this.#lastLine = startLine;
    const isWhitespace = /^(?:\r?\n|[\t\f\r ])+$/.test(token);
    if (isWhitespace) {
      if (!this.#state.eatWhitespace) {
        this.#builder.addSoftSpace();
      }
      return;
    }
    this.#state.eatWhitespace = false;
    if (token === "\n") {
      return;
    }
    if (token !== "}") {
      if (this.#state.afterClosingBrace) {
        this.#builder.addNewLine(true);
      }
      this.#state.afterClosingBrace = false;
    }
    if (token === "}") {
      if (this.#state.inPropertyValue) {
        this.#builder.addNewLine();
      }
      this.#builder.decreaseNestingLevel();
      this.#state.afterClosingBrace = true;
      this.#state.inPropertyValue = false;
    } else if (token === ":" && !this.#state.inPropertyValue && this.#state.seenProperty) {
      this.#builder.addToken(token, startPosition);
      this.#builder.addSoftSpace();
      this.#state.eatWhitespace = true;
      this.#state.inPropertyValue = true;
      this.#state.seenProperty = false;
      return;
    } else if (token === "{") {
      this.#builder.addSoftSpace();
      this.#builder.addToken(token, startPosition);
      this.#builder.addNewLine();
      this.#builder.increaseNestingLevel();
      return;
    }
    this.#builder.addToken(cssTrimEnd(token), startPosition);
    if (type === "comment" && !this.#state.inPropertyValue && !this.#state.seenProperty) {
      this.#builder.addNewLine();
    }
    if (token === ";" && this.#state.inPropertyValue) {
      this.#state.inPropertyValue = false;
      this.#builder.addNewLine();
    } else if (token === "}") {
      this.#builder.addNewLine();
    }
  }
};

// gen/front_end/entrypoints/formatter_worker/CSSRuleParser.js
var CSSRuleParser_exports = {};
__export(CSSRuleParser_exports, {
  CSSParserStates: () => CSSParserStates,
  parseCSS: () => parseCSS
});
var CSSParserStates = {
  Initial: "Initial",
  Selector: "Selector",
  Style: "Style",
  PropertyName: "PropertyName",
  PropertyValue: "PropertyValue",
  AtRule: "AtRule"
};
function parseCSS(text, chunkCallback) {
  const chunkSize = 1e5;
  const lines = text.split("\n");
  let rules = [];
  let processedChunkCharacters = 0;
  let state = CSSParserStates.Initial;
  let rule;
  let property;
  const UndefTokenType = /* @__PURE__ */ new Set();
  let disabledRules = [];
  function disabledRulesCallback(chunk) {
    disabledRules = disabledRules.concat(chunk.chunk);
  }
  function cssTrim(tokenValue) {
    const re = /^(?:\r?\n|[\t\f\r ])+|(?:\r?\n|[\t\f\r ])+$/g;
    return tokenValue.replace(re, "");
  }
  function processToken(tokenValue, tokenTypes, column, newColumn) {
    const tokenType = tokenTypes ? new Set(tokenTypes.split(" ")) : UndefTokenType;
    switch (state) {
      case CSSParserStates.Initial:
        if (tokenType.has("qualifier") || tokenType.has("builtin") || tokenType.has("tag")) {
          rule = {
            selectorText: tokenValue,
            lineNumber,
            columnNumber: column,
            properties: []
          };
          state = CSSParserStates.Selector;
        } else if (tokenType.has("def")) {
          rule = {
            atRule: tokenValue,
            lineNumber,
            columnNumber: column
          };
          state = CSSParserStates.AtRule;
        }
        break;
      case CSSParserStates.Selector:
        if (tokenValue === "{" && tokenType === UndefTokenType) {
          rule.selectorText = cssTrim(rule.selectorText);
          rule.styleRange = createRange(lineNumber, newColumn);
          state = CSSParserStates.Style;
        } else {
          rule.selectorText += tokenValue;
        }
        break;
      case CSSParserStates.AtRule:
        if ((tokenValue === ";" || tokenValue === "{") && tokenType === UndefTokenType) {
          rule.atRule = cssTrim(rule.atRule);
          rules.push(rule);
          state = CSSParserStates.Initial;
        } else {
          rule.atRule += tokenValue;
        }
        break;
      case CSSParserStates.Style:
        if (tokenType.has("meta") || tokenType.has("property") || tokenType.has("variable-2")) {
          property = {
            name: tokenValue,
            value: "",
            range: createRange(lineNumber, column),
            nameRange: createRange(lineNumber, column)
          };
          state = CSSParserStates.PropertyName;
        } else if (tokenValue === "}" && tokenType === UndefTokenType) {
          rule.styleRange.endLine = lineNumber;
          rule.styleRange.endColumn = column;
          rules.push(rule);
          state = CSSParserStates.Initial;
        } else if (tokenType.has("comment")) {
          if (tokenValue.substring(0, 2) !== "/*" || tokenValue.substring(tokenValue.length - 2) !== "*/") {
            break;
          }
          const uncommentedText = tokenValue.substring(2, tokenValue.length - 2);
          const fakeRule = "a{\n" + uncommentedText + "}";
          disabledRules = [];
          parseCSS(fakeRule, disabledRulesCallback);
          if (disabledRules.length === 1 && disabledRules[0].properties.length === 1) {
            const disabledProperty = disabledRules[0].properties[0];
            disabledProperty.disabled = true;
            disabledProperty.range = createRange(lineNumber, column);
            disabledProperty.range.endColumn = newColumn;
            const lineOffset = lineNumber - 1;
            const columnOffset = column + 2;
            disabledProperty.nameRange.startLine += lineOffset;
            disabledProperty.nameRange.startColumn += columnOffset;
            disabledProperty.nameRange.endLine += lineOffset;
            disabledProperty.nameRange.endColumn += columnOffset;
            disabledProperty.valueRange.startLine += lineOffset;
            disabledProperty.valueRange.startColumn += columnOffset;
            disabledProperty.valueRange.endLine += lineOffset;
            disabledProperty.valueRange.endColumn += columnOffset;
            rule.properties.push(disabledProperty);
          }
        }
        break;
      case CSSParserStates.PropertyName:
        if (tokenValue === ":" && tokenType === UndefTokenType) {
          property.name = property.name;
          property.nameRange.endLine = lineNumber;
          property.nameRange.endColumn = column;
          property.valueRange = createRange(lineNumber, newColumn);
          state = CSSParserStates.PropertyValue;
        } else if (tokenType.has("property")) {
          property.name += tokenValue;
        }
        break;
      case CSSParserStates.PropertyValue:
        if ((tokenValue === ";" || tokenValue === "}") && tokenType === UndefTokenType) {
          property.value = property.value;
          property.valueRange.endLine = lineNumber;
          property.valueRange.endColumn = column;
          property.range.endLine = lineNumber;
          property.range.endColumn = tokenValue === ";" ? newColumn : column;
          rule.properties.push(property);
          if (tokenValue === "}") {
            rule.styleRange.endLine = lineNumber;
            rule.styleRange.endColumn = column;
            rules.push(rule);
            state = CSSParserStates.Initial;
          } else {
            state = CSSParserStates.Style;
          }
        } else if (!tokenType.has("comment")) {
          property.value += tokenValue;
        }
        break;
      default:
        console.assert(false, "Unknown CSS parser state.");
    }
    processedChunkCharacters += newColumn - column;
    if (processedChunkCharacters > chunkSize) {
      chunkCallback({ chunk: rules, isLastChunk: false });
      rules = [];
      processedChunkCharacters = 0;
    }
  }
  const tokenizer = createTokenizer("text/css");
  let lineNumber;
  for (lineNumber = 0; lineNumber < lines.length; ++lineNumber) {
    const line = lines[lineNumber];
    tokenizer(line, processToken);
    processToken("\n", null, line.length, line.length + 1);
  }
  chunkCallback({ chunk: rules, isLastChunk: true });
  function createRange(lineNumber2, columnNumber) {
    return { startLine: lineNumber2, startColumn: columnNumber, endLine: lineNumber2, endColumn: columnNumber };
  }
}
export {
  CSSFormatter_exports as CSSFormatter,
  CSSRuleParser_exports as CSSRuleParser,
  FormattedContentBuilder_exports as FormattedContentBuilder,
  FormatterWorker_exports as FormatterWorker,
  HTMLFormatter_exports as HTMLFormatter,
  JSONFormatter_exports as JSONFormatter,
  JavaScriptFormatter_exports as JavaScriptFormatter,
  ScopeParser_exports as ScopeParser,
  Substitute_exports as Substitute
};
//# sourceMappingURL=formatter_worker.js.map
