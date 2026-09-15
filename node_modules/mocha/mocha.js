// mocha@12.0.0 in javascript ES2018
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.mocha = factory());
})(this, (function () { 'use strict';

  var global$1 = (typeof global !== "undefined" ? global :
    typeof self !== "undefined" ? self :
    typeof window !== "undefined" ? window : {});

  // shim for using process in browser
  // based off https://github.com/defunctzombie/node-process/blob/master/browser.js

  function defaultSetTimout() {
      throw new Error('setTimeout has not been defined');
  }
  function defaultClearTimeout () {
      throw new Error('clearTimeout has not been defined');
  }
  var cachedSetTimeout = defaultSetTimout;
  var cachedClearTimeout = defaultClearTimeout;
  if (typeof global$1.setTimeout === 'function') {
      cachedSetTimeout = setTimeout;
  }
  if (typeof global$1.clearTimeout === 'function') {
      cachedClearTimeout = clearTimeout;
  }

  function runTimeout(fun) {
      if (cachedSetTimeout === setTimeout) {
          //normal enviroments in sane situations
          return setTimeout(fun, 0);
      }
      // if setTimeout wasn't available but was latter defined
      if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
          cachedSetTimeout = setTimeout;
          return setTimeout(fun, 0);
      }
      try {
          // when when somebody has screwed with setTimeout but no I.E. maddness
          return cachedSetTimeout(fun, 0);
      } catch(e){
          try {
              // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
              return cachedSetTimeout.call(null, fun, 0);
          } catch(e){
              // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
              return cachedSetTimeout.call(this, fun, 0);
          }
      }


  }
  function runClearTimeout(marker) {
      if (cachedClearTimeout === clearTimeout) {
          //normal enviroments in sane situations
          return clearTimeout(marker);
      }
      // if clearTimeout wasn't available but was latter defined
      if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
          cachedClearTimeout = clearTimeout;
          return clearTimeout(marker);
      }
      try {
          // when when somebody has screwed with setTimeout but no I.E. maddness
          return cachedClearTimeout(marker);
      } catch (e){
          try {
              // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
              return cachedClearTimeout.call(null, marker);
          } catch (e){
              // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
              // Some versions of I.E. have different rules for clearTimeout vs setTimeout
              return cachedClearTimeout.call(this, marker);
          }
      }



  }
  var queue = [];
  var draining = false;
  var currentQueue;
  var queueIndex = -1;

  function cleanUpNextTick() {
      if (!draining || !currentQueue) {
          return;
      }
      draining = false;
      if (currentQueue.length) {
          queue = currentQueue.concat(queue);
      } else {
          queueIndex = -1;
      }
      if (queue.length) {
          drainQueue();
      }
  }

  function drainQueue() {
      if (draining) {
          return;
      }
      var timeout = runTimeout(cleanUpNextTick);
      draining = true;

      var len = queue.length;
      while(len) {
          currentQueue = queue;
          queue = [];
          while (++queueIndex < len) {
              if (currentQueue) {
                  currentQueue[queueIndex].run();
              }
          }
          queueIndex = -1;
          len = queue.length;
      }
      currentQueue = null;
      draining = false;
      runClearTimeout(timeout);
  }
  function nextTick(fun) {
      var args = new Array(arguments.length - 1);
      if (arguments.length > 1) {
          for (var i = 1; i < arguments.length; i++) {
              args[i - 1] = arguments[i];
          }
      }
      queue.push(new Item(fun, args));
      if (queue.length === 1 && !draining) {
          runTimeout(drainQueue);
      }
  }
  // v8 likes predictible objects
  function Item(fun, array) {
      this.fun = fun;
      this.array = array;
  }
  Item.prototype.run = function () {
      this.fun.apply(null, this.array);
  };
  var title$1 = 'browser';
  var platform = 'browser';
  var browser$1 = true;
  var env = {};
  var argv = [];
  var version = ''; // empty string to avoid regexp issues
  var versions = {};
  var release = {};
  var config = {};

  function noop() {}

  var on$1 = noop;
  var addListener = noop;
  var once = noop;
  var off = noop;
  var removeListener = noop;
  var removeAllListeners = noop;
  var emit = noop;

  function binding(name) {
      throw new Error('process.binding is not supported');
  }

  function cwd () { return '/' }
  function chdir (dir) {
      throw new Error('process.chdir is not supported');
  }function umask() { return 0; }

  // from https://github.com/kumavis/browser-process-hrtime/blob/master/index.js
  var performance = global$1.performance || {};
  var performanceNow =
    performance.now        ||
    performance.mozNow     ||
    performance.msNow      ||
    performance.oNow       ||
    performance.webkitNow  ||
    function(){ return (new Date()).getTime() };

  // generate timestamp or delta
  // see http://nodejs.org/api/process.html#process_process_hrtime
  function hrtime(previousTimestamp){
    var clocktime = performanceNow.call(performance)*1e-3;
    var seconds = Math.floor(clocktime);
    var nanoseconds = Math.floor((clocktime%1)*1e9);
    if (previousTimestamp) {
      seconds = seconds - previousTimestamp[0];
      nanoseconds = nanoseconds - previousTimestamp[1];
      if (nanoseconds<0) {
        seconds--;
        nanoseconds += 1e9;
      }
    }
    return [seconds,nanoseconds]
  }

  var startTime = new Date();
  function uptime() {
    var currentTime = new Date();
    var dif = currentTime - startTime;
    return dif / 1000;
  }

  var browser$1$1 = {
    nextTick: nextTick,
    title: title$1,
    browser: browser$1,
    env: env,
    argv: argv,
    version: version,
    versions: versions,
    on: on$1,
    addListener: addListener,
    once: once,
    off: off,
    removeListener: removeListener,
    removeAllListeners: removeAllListeners,
    emit: emit,
    binding: binding,
    cwd: cwd,
    chdir: chdir,
    umask: umask,
    hrtime: hrtime,
    platform: platform,
    release: release,
    config: config,
    uptime: uptime
  };

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function getDefaultExportFromCjs (x) {
  	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
  }

  function getAugmentedNamespace(n) {
    if (Object.prototype.hasOwnProperty.call(n, '__esModule')) return n;
    var f = n.default;
  	if (typeof f == "function") {
  		var a = function a () {
  			var isInstance = false;
        try {
          isInstance = this instanceof a;
        } catch {}
  			if (isInstance) {
          return Reflect.construct(f, arguments, this.constructor);
  			}
  			return f.apply(this, arguments);
  		};
  		a.prototype = f.prototype;
    } else a = {};
    Object.defineProperty(a, '__esModule', {value: true});
  	Object.keys(n).forEach(function (k) {
  		var d = Object.getOwnPropertyDescriptor(n, k);
  		Object.defineProperty(a, k, d.get ? d : {
  			enumerable: true,
  			get: function () {
  				return n[k];
  			}
  		});
  	});
  	return a;
  }

  var domain;

  // This constructor is used to store event handlers. Instantiating this is
  // faster than explicitly calling `Object.create(null)` to get a "clean" empty
  // object (tested with v8 v4.9).
  function EventHandlers() {}
  EventHandlers.prototype = Object.create(null);

  function EventEmitter() {
    EventEmitter.init.call(this);
  }

  // nodejs oddity
  // require('events') === require('events').EventEmitter
  EventEmitter.EventEmitter = EventEmitter;

  EventEmitter.usingDomains = false;

  EventEmitter.prototype.domain = undefined;
  EventEmitter.prototype._events = undefined;
  EventEmitter.prototype._maxListeners = undefined;

  // By default EventEmitters will print a warning if more than 10 listeners are
  // added to it. This is a useful default which helps finding memory leaks.
  EventEmitter.defaultMaxListeners = 10;

  EventEmitter.init = function() {
    this.domain = null;
    if (EventEmitter.usingDomains) {
      // if there is an active domain, then attach to it.
      if (domain.active && !(this instanceof domain.Domain)) {
        this.domain = domain.active;
      }
    }

    if (!this._events || this._events === Object.getPrototypeOf(this)._events) {
      this._events = new EventHandlers();
      this._eventsCount = 0;
    }

    this._maxListeners = this._maxListeners || undefined;
  };

  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.
  EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
    if (typeof n !== 'number' || n < 0 || isNaN(n))
      throw new TypeError('"n" argument must be a positive number');
    this._maxListeners = n;
    return this;
  };

  function $getMaxListeners(that) {
    if (that._maxListeners === undefined)
      return EventEmitter.defaultMaxListeners;
    return that._maxListeners;
  }

  EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
    return $getMaxListeners(this);
  };

  // These standalone emit* functions are used to optimize calling of event
  // handlers for fast cases because emit() itself often has a variable number of
  // arguments and can be deoptimized because of that. These functions always have
  // the same number of arguments and thus do not get deoptimized, so the code
  // inside them can execute faster.
  function emitNone(handler, isFn, self) {
    if (isFn)
      handler.call(self);
    else {
      var len = handler.length;
      var listeners = arrayClone(handler, len);
      for (var i = 0; i < len; ++i)
        listeners[i].call(self);
    }
  }
  function emitOne(handler, isFn, self, arg1) {
    if (isFn)
      handler.call(self, arg1);
    else {
      var len = handler.length;
      var listeners = arrayClone(handler, len);
      for (var i = 0; i < len; ++i)
        listeners[i].call(self, arg1);
    }
  }
  function emitTwo(handler, isFn, self, arg1, arg2) {
    if (isFn)
      handler.call(self, arg1, arg2);
    else {
      var len = handler.length;
      var listeners = arrayClone(handler, len);
      for (var i = 0; i < len; ++i)
        listeners[i].call(self, arg1, arg2);
    }
  }
  function emitThree(handler, isFn, self, arg1, arg2, arg3) {
    if (isFn)
      handler.call(self, arg1, arg2, arg3);
    else {
      var len = handler.length;
      var listeners = arrayClone(handler, len);
      for (var i = 0; i < len; ++i)
        listeners[i].call(self, arg1, arg2, arg3);
    }
  }

  function emitMany(handler, isFn, self, args) {
    if (isFn)
      handler.apply(self, args);
    else {
      var len = handler.length;
      var listeners = arrayClone(handler, len);
      for (var i = 0; i < len; ++i)
        listeners[i].apply(self, args);
    }
  }

  EventEmitter.prototype.emit = function emit(type) {
    var er, handler, len, args, i, events, domain;
    var doError = (type === 'error');

    events = this._events;
    if (events)
      doError = (doError && events.error == null);
    else if (!doError)
      return false;

    domain = this.domain;

    // If there is no 'error' event listener then throw.
    if (doError) {
      er = arguments[1];
      if (domain) {
        if (!er)
          er = new Error('Uncaught, unspecified "error" event');
        er.domainEmitter = this;
        er.domain = domain;
        er.domainThrown = false;
        domain.emit('error', er);
      } else if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
      return false;
    }

    handler = events[type];

    if (!handler)
      return false;

    var isFn = typeof handler === 'function';
    len = arguments.length;
    switch (len) {
      // fast cases
      case 1:
        emitNone(handler, isFn, this);
        break;
      case 2:
        emitOne(handler, isFn, this, arguments[1]);
        break;
      case 3:
        emitTwo(handler, isFn, this, arguments[1], arguments[2]);
        break;
      case 4:
        emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
        break;
      // slower
      default:
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        emitMany(handler, isFn, this, args);
    }

    return true;
  };

  function _addListener(target, type, listener, prepend) {
    var m;
    var events;
    var existing;

    if (typeof listener !== 'function')
      throw new TypeError('"listener" argument must be a function');

    events = target._events;
    if (!events) {
      events = target._events = new EventHandlers();
      target._eventsCount = 0;
    } else {
      // To avoid recursion in the case that type === "newListener"! Before
      // adding it to the listeners, first emit "newListener".
      if (events.newListener) {
        target.emit('newListener', type,
                    listener.listener ? listener.listener : listener);

        // Re-assign `events` because a newListener handler could have caused the
        // this._events to be assigned to a new object
        events = target._events;
      }
      existing = events[type];
    }

    if (!existing) {
      // Optimize the case of one listener. Don't need the extra array object.
      existing = events[type] = listener;
      ++target._eventsCount;
    } else {
      if (typeof existing === 'function') {
        // Adding the second element, need to change to array.
        existing = events[type] = prepend ? [listener, existing] :
                                            [existing, listener];
      } else {
        // If we've already got an array, just append.
        if (prepend) {
          existing.unshift(listener);
        } else {
          existing.push(listener);
        }
      }

      // Check for listener leak
      if (!existing.warned) {
        m = $getMaxListeners(target);
        if (m && m > 0 && existing.length > m) {
          existing.warned = true;
          var w = new Error('Possible EventEmitter memory leak detected. ' +
                              existing.length + ' ' + type + ' listeners added. ' +
                              'Use emitter.setMaxListeners() to increase limit');
          w.name = 'MaxListenersExceededWarning';
          w.emitter = target;
          w.type = type;
          w.count = existing.length;
          emitWarning(w);
        }
      }
    }

    return target;
  }
  function emitWarning(e) {
    typeof console.warn === 'function' ? console.warn(e) : console.log(e);
  }
  EventEmitter.prototype.addListener = function addListener(type, listener) {
    return _addListener(this, type, listener, false);
  };

  EventEmitter.prototype.on = EventEmitter.prototype.addListener;

  EventEmitter.prototype.prependListener =
      function prependListener(type, listener) {
        return _addListener(this, type, listener, true);
      };

  function _onceWrap(target, type, listener) {
    var fired = false;
    function g() {
      target.removeListener(type, g);
      if (!fired) {
        fired = true;
        listener.apply(target, arguments);
      }
    }
    g.listener = listener;
    return g;
  }

  EventEmitter.prototype.once = function once(type, listener) {
    if (typeof listener !== 'function')
      throw new TypeError('"listener" argument must be a function');
    this.on(type, _onceWrap(this, type, listener));
    return this;
  };

  EventEmitter.prototype.prependOnceListener =
      function prependOnceListener(type, listener) {
        if (typeof listener !== 'function')
          throw new TypeError('"listener" argument must be a function');
        this.prependListener(type, _onceWrap(this, type, listener));
        return this;
      };

  // emits a 'removeListener' event iff the listener was removed
  EventEmitter.prototype.removeListener =
      function removeListener(type, listener) {
        var list, events, position, i, originalListener;

        if (typeof listener !== 'function')
          throw new TypeError('"listener" argument must be a function');

        events = this._events;
        if (!events)
          return this;

        list = events[type];
        if (!list)
          return this;

        if (list === listener || (list.listener && list.listener === listener)) {
          if (--this._eventsCount === 0)
            this._events = new EventHandlers();
          else {
            delete events[type];
            if (events.removeListener)
              this.emit('removeListener', type, list.listener || listener);
          }
        } else if (typeof list !== 'function') {
          position = -1;

          for (i = list.length; i-- > 0;) {
            if (list[i] === listener ||
                (list[i].listener && list[i].listener === listener)) {
              originalListener = list[i].listener;
              position = i;
              break;
            }
          }

          if (position < 0)
            return this;

          if (list.length === 1) {
            list[0] = undefined;
            if (--this._eventsCount === 0) {
              this._events = new EventHandlers();
              return this;
            } else {
              delete events[type];
            }
          } else {
            spliceOne(list, position);
          }

          if (events.removeListener)
            this.emit('removeListener', type, originalListener || listener);
        }

        return this;
      };
      
  // Alias for removeListener added in NodeJS 10.0
  // https://nodejs.org/api/events.html#events_emitter_off_eventname_listener
  EventEmitter.prototype.off = function(type, listener){
      return this.removeListener(type, listener);
  };

  EventEmitter.prototype.removeAllListeners =
      function removeAllListeners(type) {
        var listeners, events;

        events = this._events;
        if (!events)
          return this;

        // not listening for removeListener, no need to emit
        if (!events.removeListener) {
          if (arguments.length === 0) {
            this._events = new EventHandlers();
            this._eventsCount = 0;
          } else if (events[type]) {
            if (--this._eventsCount === 0)
              this._events = new EventHandlers();
            else
              delete events[type];
          }
          return this;
        }

        // emit removeListener for all listeners on all events
        if (arguments.length === 0) {
          var keys = Object.keys(events);
          for (var i = 0, key; i < keys.length; ++i) {
            key = keys[i];
            if (key === 'removeListener') continue;
            this.removeAllListeners(key);
          }
          this.removeAllListeners('removeListener');
          this._events = new EventHandlers();
          this._eventsCount = 0;
          return this;
        }

        listeners = events[type];

        if (typeof listeners === 'function') {
          this.removeListener(type, listeners);
        } else if (listeners) {
          // LIFO order
          do {
            this.removeListener(type, listeners[listeners.length - 1]);
          } while (listeners[0]);
        }

        return this;
      };

  EventEmitter.prototype.listeners = function listeners(type) {
    var evlistener;
    var ret;
    var events = this._events;

    if (!events)
      ret = [];
    else {
      evlistener = events[type];
      if (!evlistener)
        ret = [];
      else if (typeof evlistener === 'function')
        ret = [evlistener.listener || evlistener];
      else
        ret = unwrapListeners(evlistener);
    }

    return ret;
  };

  EventEmitter.listenerCount = function(emitter, type) {
    if (typeof emitter.listenerCount === 'function') {
      return emitter.listenerCount(type);
    } else {
      return listenerCount$1.call(emitter, type);
    }
  };

  EventEmitter.prototype.listenerCount = listenerCount$1;
  function listenerCount$1(type) {
    var events = this._events;

    if (events) {
      var evlistener = events[type];

      if (typeof evlistener === 'function') {
        return 1;
      } else if (evlistener) {
        return evlistener.length;
      }
    }

    return 0;
  }

  EventEmitter.prototype.eventNames = function eventNames() {
    return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
  };

  // About 1.5x faster than the two-arg version of Array#splice().
  function spliceOne(list, index) {
    for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
      list[i] = list[k];
    list.pop();
  }

  function arrayClone(arr, i) {
    var copy = new Array(i);
    while (i--)
      copy[i] = arr[i];
    return copy;
  }

  function unwrapListeners(arr) {
    var ret = new Array(arr.length);
    for (var i = 0; i < ret.length; ++i) {
      ret[i] = arr[i].listener || arr[i];
    }
    return ret;
  }

  var _polyfillNode_events = /*#__PURE__*/Object.freeze({
    __proto__: null,
    EventEmitter: EventEmitter,
    default: EventEmitter
  });

  var lookup = [];
  var revLookup = [];
  var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
  var inited = false;
  function init () {
    inited = true;
    var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    for (var i = 0, len = code.length; i < len; ++i) {
      lookup[i] = code[i];
      revLookup[code.charCodeAt(i)] = i;
    }

    revLookup['-'.charCodeAt(0)] = 62;
    revLookup['_'.charCodeAt(0)] = 63;
  }

  function toByteArray (b64) {
    if (!inited) {
      init();
    }
    var i, j, l, tmp, placeHolders, arr;
    var len = b64.length;

    if (len % 4 > 0) {
      throw new Error('Invalid string. Length must be a multiple of 4')
    }

    // the number of equal signs (place holders)
    // if there are two placeholders, than the two characters before it
    // represent one byte
    // if there is only one, then the three characters before it represent 2 bytes
    // this is just a cheap hack to not do indexOf twice
    placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0;

    // base64 is 4/3 + up to two characters of the original data
    arr = new Arr(len * 3 / 4 - placeHolders);

    // if there are placeholders, only get up to the last complete 4 chars
    l = placeHolders > 0 ? len - 4 : len;

    var L = 0;

    for (i = 0, j = 0; i < l; i += 4, j += 3) {
      tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)];
      arr[L++] = (tmp >> 16) & 0xFF;
      arr[L++] = (tmp >> 8) & 0xFF;
      arr[L++] = tmp & 0xFF;
    }

    if (placeHolders === 2) {
      tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4);
      arr[L++] = tmp & 0xFF;
    } else if (placeHolders === 1) {
      tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2);
      arr[L++] = (tmp >> 8) & 0xFF;
      arr[L++] = tmp & 0xFF;
    }

    return arr
  }

  function tripletToBase64 (num) {
    return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
  }

  function encodeChunk (uint8, start, end) {
    var tmp;
    var output = [];
    for (var i = start; i < end; i += 3) {
      tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
      output.push(tripletToBase64(tmp));
    }
    return output.join('')
  }

  function fromByteArray (uint8) {
    if (!inited) {
      init();
    }
    var tmp;
    var len = uint8.length;
    var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
    var output = '';
    var parts = [];
    var maxChunkLength = 16383; // must be multiple of 3

    // go through the array every three bytes, we'll deal with trailing stuff later
    for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
      parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
    }

    // pad the end with zeros, but make sure to not forget the extra bytes
    if (extraBytes === 1) {
      tmp = uint8[len - 1];
      output += lookup[tmp >> 2];
      output += lookup[(tmp << 4) & 0x3F];
      output += '==';
    } else if (extraBytes === 2) {
      tmp = (uint8[len - 2] << 8) + (uint8[len - 1]);
      output += lookup[tmp >> 10];
      output += lookup[(tmp >> 4) & 0x3F];
      output += lookup[(tmp << 2) & 0x3F];
      output += '=';
    }

    parts.push(output);

    return parts.join('')
  }

  function read (buffer, offset, isLE, mLen, nBytes) {
    var e, m;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var nBits = -7;
    var i = isLE ? (nBytes - 1) : 0;
    var d = isLE ? -1 : 1;
    var s = buffer[offset + i];

    i += d;

    e = s & ((1 << (-nBits)) - 1);
    s >>= (-nBits);
    nBits += eLen;
    for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

    m = e & ((1 << (-nBits)) - 1);
    e >>= (-nBits);
    nBits += mLen;
    for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

    if (e === 0) {
      e = 1 - eBias;
    } else if (e === eMax) {
      return m ? NaN : ((s ? -1 : 1) * Infinity)
    } else {
      m = m + Math.pow(2, mLen);
      e = e - eBias;
    }
    return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
  }

  function write (buffer, value, offset, isLE, mLen, nBytes) {
    var e, m, c;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
    var i = isLE ? 0 : (nBytes - 1);
    var d = isLE ? 1 : -1;
    var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

    value = Math.abs(value);

    if (isNaN(value) || value === Infinity) {
      m = isNaN(value) ? 1 : 0;
      e = eMax;
    } else {
      e = Math.floor(Math.log(value) / Math.LN2);
      if (value * (c = Math.pow(2, -e)) < 1) {
        e--;
        c *= 2;
      }
      if (e + eBias >= 1) {
        value += rt / c;
      } else {
        value += rt * Math.pow(2, 1 - eBias);
      }
      if (value * c >= 2) {
        e++;
        c /= 2;
      }

      if (e + eBias >= eMax) {
        m = 0;
        e = eMax;
      } else if (e + eBias >= 1) {
        m = (value * c - 1) * Math.pow(2, mLen);
        e = e + eBias;
      } else {
        m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
        e = 0;
      }
    }

    for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

    e = (e << mLen) | m;
    eLen += mLen;
    for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

    buffer[offset + i - d] |= s * 128;
  }

  var toString$1 = {}.toString;

  var isArray$1 = Array.isArray || function (arr) {
    return toString$1.call(arr) == '[object Array]';
  };

  /*!
   * The buffer module from node.js, for the browser.
   *
   * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
   * @license  MIT
   */
  /* eslint-disable no-proto */


  var INSPECT_MAX_BYTES = 50;

  /**
   * If `Buffer.TYPED_ARRAY_SUPPORT`:
   *   === true    Use Uint8Array implementation (fastest)
   *   === false   Use Object implementation (most compatible, even IE6)
   *
   * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
   * Opera 11.6+, iOS 4.2+.
   *
   * Due to various browser bugs, sometimes the Object implementation will be used even
   * when the browser supports typed arrays.
   *
   * Note:
   *
   *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
   *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
   *
   *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
   *
   *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
   *     incorrect length in some situations.

   * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
   * get the Object implementation, which is slower but behaves correctly.
   */
  Buffer.TYPED_ARRAY_SUPPORT = global$1.TYPED_ARRAY_SUPPORT !== undefined
    ? global$1.TYPED_ARRAY_SUPPORT
    : true;

  /*
   * Export kMaxLength after typed array support is determined.
   */
  kMaxLength();

  function kMaxLength () {
    return Buffer.TYPED_ARRAY_SUPPORT
      ? 0x7fffffff
      : 0x3fffffff
  }

  function createBuffer (that, length) {
    if (kMaxLength() < length) {
      throw new RangeError('Invalid typed array length')
    }
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      // Return an augmented `Uint8Array` instance, for best performance
      that = new Uint8Array(length);
      that.__proto__ = Buffer.prototype;
    } else {
      // Fallback: Return an object instance of the Buffer class
      if (that === null) {
        that = new Buffer(length);
      }
      that.length = length;
    }

    return that
  }

  /**
   * The Buffer constructor returns instances of `Uint8Array` that have their
   * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
   * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
   * and the `Uint8Array` methods. Square bracket notation works as expected -- it
   * returns a single octet.
   *
   * The `Uint8Array` prototype remains unmodified.
   */

  function Buffer (arg, encodingOrOffset, length) {
    if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
      return new Buffer(arg, encodingOrOffset, length)
    }

    // Common case.
    if (typeof arg === 'number') {
      if (typeof encodingOrOffset === 'string') {
        throw new Error(
          'If encoding is specified then the first argument must be a string'
        )
      }
      return allocUnsafe(this, arg)
    }
    return from(this, arg, encodingOrOffset, length)
  }

  Buffer.poolSize = 8192; // not used by this implementation

  // TODO: Legacy, not needed anymore. Remove in next major version.
  Buffer._augment = function (arr) {
    arr.__proto__ = Buffer.prototype;
    return arr
  };

  function from (that, value, encodingOrOffset, length) {
    if (typeof value === 'number') {
      throw new TypeError('"value" argument must not be a number')
    }

    if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
      return fromArrayBuffer(that, value, encodingOrOffset, length)
    }

    if (typeof value === 'string') {
      return fromString(that, value, encodingOrOffset)
    }

    return fromObject(that, value)
  }

  /**
   * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
   * if value is a number.
   * Buffer.from(str[, encoding])
   * Buffer.from(array)
   * Buffer.from(buffer)
   * Buffer.from(arrayBuffer[, byteOffset[, length]])
   **/
  Buffer.from = function (value, encodingOrOffset, length) {
    return from(null, value, encodingOrOffset, length)
  };

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    Buffer.prototype.__proto__ = Uint8Array.prototype;
    Buffer.__proto__ = Uint8Array;
    if (typeof Symbol !== 'undefined' && Symbol.species &&
        Buffer[Symbol.species] === Buffer) ;
  }

  function assertSize (size) {
    if (typeof size !== 'number') {
      throw new TypeError('"size" argument must be a number')
    } else if (size < 0) {
      throw new RangeError('"size" argument must not be negative')
    }
  }

  function alloc (that, size, fill, encoding) {
    assertSize(size);
    if (size <= 0) {
      return createBuffer(that, size)
    }
    if (fill !== undefined) {
      // Only pay attention to encoding if it's a string. This
      // prevents accidentally sending in a number that would
      // be interpretted as a start offset.
      return typeof encoding === 'string'
        ? createBuffer(that, size).fill(fill, encoding)
        : createBuffer(that, size).fill(fill)
    }
    return createBuffer(that, size)
  }

  /**
   * Creates a new filled Buffer instance.
   * alloc(size[, fill[, encoding]])
   **/
  Buffer.alloc = function (size, fill, encoding) {
    return alloc(null, size, fill, encoding)
  };

  function allocUnsafe (that, size) {
    assertSize(size);
    that = createBuffer(that, size < 0 ? 0 : checked(size) | 0);
    if (!Buffer.TYPED_ARRAY_SUPPORT) {
      for (var i = 0; i < size; ++i) {
        that[i] = 0;
      }
    }
    return that
  }

  /**
   * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
   * */
  Buffer.allocUnsafe = function (size) {
    return allocUnsafe(null, size)
  };
  /**
   * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
   */
  Buffer.allocUnsafeSlow = function (size) {
    return allocUnsafe(null, size)
  };

  function fromString (that, string, encoding) {
    if (typeof encoding !== 'string' || encoding === '') {
      encoding = 'utf8';
    }

    if (!Buffer.isEncoding(encoding)) {
      throw new TypeError('"encoding" must be a valid string encoding')
    }

    var length = byteLength(string, encoding) | 0;
    that = createBuffer(that, length);

    var actual = that.write(string, encoding);

    if (actual !== length) {
      // Writing a hex string, for example, that contains invalid characters will
      // cause everything after the first invalid character to be ignored. (e.g.
      // 'abxxcd' will be treated as 'ab')
      that = that.slice(0, actual);
    }

    return that
  }

  function fromArrayLike (that, array) {
    var length = array.length < 0 ? 0 : checked(array.length) | 0;
    that = createBuffer(that, length);
    for (var i = 0; i < length; i += 1) {
      that[i] = array[i] & 255;
    }
    return that
  }

  function fromArrayBuffer (that, array, byteOffset, length) {
    array.byteLength; // this throws if `array` is not a valid ArrayBuffer

    if (byteOffset < 0 || array.byteLength < byteOffset) {
      throw new RangeError('\'offset\' is out of bounds')
    }

    if (array.byteLength < byteOffset + (length || 0)) {
      throw new RangeError('\'length\' is out of bounds')
    }

    if (byteOffset === undefined && length === undefined) {
      array = new Uint8Array(array);
    } else if (length === undefined) {
      array = new Uint8Array(array, byteOffset);
    } else {
      array = new Uint8Array(array, byteOffset, length);
    }

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      // Return an augmented `Uint8Array` instance, for best performance
      that = array;
      that.__proto__ = Buffer.prototype;
    } else {
      // Fallback: Return an object instance of the Buffer class
      that = fromArrayLike(that, array);
    }
    return that
  }

  function fromObject (that, obj) {
    if (internalIsBuffer(obj)) {
      var len = checked(obj.length) | 0;
      that = createBuffer(that, len);

      if (that.length === 0) {
        return that
      }

      obj.copy(that, 0, 0, len);
      return that
    }

    if (obj) {
      if ((typeof ArrayBuffer !== 'undefined' &&
          obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
        if (typeof obj.length !== 'number' || isnan(obj.length)) {
          return createBuffer(that, 0)
        }
        return fromArrayLike(that, obj)
      }

      if (obj.type === 'Buffer' && isArray$1(obj.data)) {
        return fromArrayLike(that, obj.data)
      }
    }

    throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
  }

  function checked (length) {
    // Note: cannot use `length < kMaxLength()` here because that fails when
    // length is NaN (which is otherwise coerced to zero.)
    if (length >= kMaxLength()) {
      throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                           'size: 0x' + kMaxLength().toString(16) + ' bytes')
    }
    return length | 0
  }
  Buffer.isBuffer = isBuffer$1;
  function internalIsBuffer (b) {
    return !!(b != null && b._isBuffer)
  }

  Buffer.compare = function compare (a, b) {
    if (!internalIsBuffer(a) || !internalIsBuffer(b)) {
      throw new TypeError('Arguments must be Buffers')
    }

    if (a === b) return 0

    var x = a.length;
    var y = b.length;

    for (var i = 0, len = Math.min(x, y); i < len; ++i) {
      if (a[i] !== b[i]) {
        x = a[i];
        y = b[i];
        break
      }
    }

    if (x < y) return -1
    if (y < x) return 1
    return 0
  };

  Buffer.isEncoding = function isEncoding (encoding) {
    switch (String(encoding).toLowerCase()) {
      case 'hex':
      case 'utf8':
      case 'utf-8':
      case 'ascii':
      case 'latin1':
      case 'binary':
      case 'base64':
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return true
      default:
        return false
    }
  };

  Buffer.concat = function concat (list, length) {
    if (!isArray$1(list)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }

    if (list.length === 0) {
      return Buffer.alloc(0)
    }

    var i;
    if (length === undefined) {
      length = 0;
      for (i = 0; i < list.length; ++i) {
        length += list[i].length;
      }
    }

    var buffer = Buffer.allocUnsafe(length);
    var pos = 0;
    for (i = 0; i < list.length; ++i) {
      var buf = list[i];
      if (!internalIsBuffer(buf)) {
        throw new TypeError('"list" argument must be an Array of Buffers')
      }
      buf.copy(buffer, pos);
      pos += buf.length;
    }
    return buffer
  };

  function byteLength (string, encoding) {
    if (internalIsBuffer(string)) {
      return string.length
    }
    if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
        (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
      return string.byteLength
    }
    if (typeof string !== 'string') {
      string = '' + string;
    }

    var len = string.length;
    if (len === 0) return 0

    // Use a for loop to avoid recursion
    var loweredCase = false;
    for (;;) {
      switch (encoding) {
        case 'ascii':
        case 'latin1':
        case 'binary':
          return len
        case 'utf8':
        case 'utf-8':
        case undefined:
          return utf8ToBytes(string).length
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return len * 2
        case 'hex':
          return len >>> 1
        case 'base64':
          return base64ToBytes(string).length
        default:
          if (loweredCase) return utf8ToBytes(string).length // assume utf8
          encoding = ('' + encoding).toLowerCase();
          loweredCase = true;
      }
    }
  }
  Buffer.byteLength = byteLength;

  function slowToString (encoding, start, end) {
    var loweredCase = false;

    // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
    // property of a typed array.

    // This behaves neither like String nor Uint8Array in that we set start/end
    // to their upper/lower bounds if the value passed is out of range.
    // undefined is handled specially as per ECMA-262 6th Edition,
    // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
    if (start === undefined || start < 0) {
      start = 0;
    }
    // Return early if start > this.length. Done here to prevent potential uint32
    // coercion fail below.
    if (start > this.length) {
      return ''
    }

    if (end === undefined || end > this.length) {
      end = this.length;
    }

    if (end <= 0) {
      return ''
    }

    // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
    end >>>= 0;
    start >>>= 0;

    if (end <= start) {
      return ''
    }

    if (!encoding) encoding = 'utf8';

    while (true) {
      switch (encoding) {
        case 'hex':
          return hexSlice(this, start, end)

        case 'utf8':
        case 'utf-8':
          return utf8Slice(this, start, end)

        case 'ascii':
          return asciiSlice(this, start, end)

        case 'latin1':
        case 'binary':
          return latin1Slice(this, start, end)

        case 'base64':
          return base64Slice(this, start, end)

        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return utf16leSlice(this, start, end)

        default:
          if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
          encoding = (encoding + '').toLowerCase();
          loweredCase = true;
      }
    }
  }

  // The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
  // Buffer instances.
  Buffer.prototype._isBuffer = true;

  function swap (b, n, m) {
    var i = b[n];
    b[n] = b[m];
    b[m] = i;
  }

  Buffer.prototype.swap16 = function swap16 () {
    var len = this.length;
    if (len % 2 !== 0) {
      throw new RangeError('Buffer size must be a multiple of 16-bits')
    }
    for (var i = 0; i < len; i += 2) {
      swap(this, i, i + 1);
    }
    return this
  };

  Buffer.prototype.swap32 = function swap32 () {
    var len = this.length;
    if (len % 4 !== 0) {
      throw new RangeError('Buffer size must be a multiple of 32-bits')
    }
    for (var i = 0; i < len; i += 4) {
      swap(this, i, i + 3);
      swap(this, i + 1, i + 2);
    }
    return this
  };

  Buffer.prototype.swap64 = function swap64 () {
    var len = this.length;
    if (len % 8 !== 0) {
      throw new RangeError('Buffer size must be a multiple of 64-bits')
    }
    for (var i = 0; i < len; i += 8) {
      swap(this, i, i + 7);
      swap(this, i + 1, i + 6);
      swap(this, i + 2, i + 5);
      swap(this, i + 3, i + 4);
    }
    return this
  };

  Buffer.prototype.toString = function toString () {
    var length = this.length | 0;
    if (length === 0) return ''
    if (arguments.length === 0) return utf8Slice(this, 0, length)
    return slowToString.apply(this, arguments)
  };

  Buffer.prototype.equals = function equals (b) {
    if (!internalIsBuffer(b)) throw new TypeError('Argument must be a Buffer')
    if (this === b) return true
    return Buffer.compare(this, b) === 0
  };

  Buffer.prototype.inspect = function inspect () {
    var str = '';
    var max = INSPECT_MAX_BYTES;
    if (this.length > 0) {
      str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
      if (this.length > max) str += ' ... ';
    }
    return '<Buffer ' + str + '>'
  };

  Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
    if (!internalIsBuffer(target)) {
      throw new TypeError('Argument must be a Buffer')
    }

    if (start === undefined) {
      start = 0;
    }
    if (end === undefined) {
      end = target ? target.length : 0;
    }
    if (thisStart === undefined) {
      thisStart = 0;
    }
    if (thisEnd === undefined) {
      thisEnd = this.length;
    }

    if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
      throw new RangeError('out of range index')
    }

    if (thisStart >= thisEnd && start >= end) {
      return 0
    }
    if (thisStart >= thisEnd) {
      return -1
    }
    if (start >= end) {
      return 1
    }

    start >>>= 0;
    end >>>= 0;
    thisStart >>>= 0;
    thisEnd >>>= 0;

    if (this === target) return 0

    var x = thisEnd - thisStart;
    var y = end - start;
    var len = Math.min(x, y);

    var thisCopy = this.slice(thisStart, thisEnd);
    var targetCopy = target.slice(start, end);

    for (var i = 0; i < len; ++i) {
      if (thisCopy[i] !== targetCopy[i]) {
        x = thisCopy[i];
        y = targetCopy[i];
        break
      }
    }

    if (x < y) return -1
    if (y < x) return 1
    return 0
  };

  // Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
  // OR the last index of `val` in `buffer` at offset <= `byteOffset`.
  //
  // Arguments:
  // - buffer - a Buffer to search
  // - val - a string, Buffer, or number
  // - byteOffset - an index into `buffer`; will be clamped to an int32
  // - encoding - an optional encoding, relevant is val is a string
  // - dir - true for indexOf, false for lastIndexOf
  function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
    // Empty buffer means no match
    if (buffer.length === 0) return -1

    // Normalize byteOffset
    if (typeof byteOffset === 'string') {
      encoding = byteOffset;
      byteOffset = 0;
    } else if (byteOffset > 0x7fffffff) {
      byteOffset = 0x7fffffff;
    } else if (byteOffset < -2147483648) {
      byteOffset = -2147483648;
    }
    byteOffset = +byteOffset;  // Coerce to Number.
    if (isNaN(byteOffset)) {
      // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
      byteOffset = dir ? 0 : (buffer.length - 1);
    }

    // Normalize byteOffset: negative offsets start from the end of the buffer
    if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
    if (byteOffset >= buffer.length) {
      if (dir) return -1
      else byteOffset = buffer.length - 1;
    } else if (byteOffset < 0) {
      if (dir) byteOffset = 0;
      else return -1
    }

    // Normalize val
    if (typeof val === 'string') {
      val = Buffer.from(val, encoding);
    }

    // Finally, search either indexOf (if dir is true) or lastIndexOf
    if (internalIsBuffer(val)) {
      // Special case: looking for empty string/buffer always fails
      if (val.length === 0) {
        return -1
      }
      return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
    } else if (typeof val === 'number') {
      val = val & 0xFF; // Search for a byte value [0-255]
      if (Buffer.TYPED_ARRAY_SUPPORT &&
          typeof Uint8Array.prototype.indexOf === 'function') {
        if (dir) {
          return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
        } else {
          return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
        }
      }
      return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
    }

    throw new TypeError('val must be string, number or Buffer')
  }

  function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
    var indexSize = 1;
    var arrLength = arr.length;
    var valLength = val.length;

    if (encoding !== undefined) {
      encoding = String(encoding).toLowerCase();
      if (encoding === 'ucs2' || encoding === 'ucs-2' ||
          encoding === 'utf16le' || encoding === 'utf-16le') {
        if (arr.length < 2 || val.length < 2) {
          return -1
        }
        indexSize = 2;
        arrLength /= 2;
        valLength /= 2;
        byteOffset /= 2;
      }
    }

    function read (buf, i) {
      if (indexSize === 1) {
        return buf[i]
      } else {
        return buf.readUInt16BE(i * indexSize)
      }
    }

    var i;
    if (dir) {
      var foundIndex = -1;
      for (i = byteOffset; i < arrLength; i++) {
        if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
          if (foundIndex === -1) foundIndex = i;
          if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
        } else {
          if (foundIndex !== -1) i -= i - foundIndex;
          foundIndex = -1;
        }
      }
    } else {
      if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
      for (i = byteOffset; i >= 0; i--) {
        var found = true;
        for (var j = 0; j < valLength; j++) {
          if (read(arr, i + j) !== read(val, j)) {
            found = false;
            break
          }
        }
        if (found) return i
      }
    }

    return -1
  }

  Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
    return this.indexOf(val, byteOffset, encoding) !== -1
  };

  Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
    return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
  };

  Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
    return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
  };

  function hexWrite (buf, string, offset, length) {
    offset = Number(offset) || 0;
    var remaining = buf.length - offset;
    if (!length) {
      length = remaining;
    } else {
      length = Number(length);
      if (length > remaining) {
        length = remaining;
      }
    }

    // must be an even number of digits
    var strLen = string.length;
    if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

    if (length > strLen / 2) {
      length = strLen / 2;
    }
    for (var i = 0; i < length; ++i) {
      var parsed = parseInt(string.substr(i * 2, 2), 16);
      if (isNaN(parsed)) return i
      buf[offset + i] = parsed;
    }
    return i
  }

  function utf8Write (buf, string, offset, length) {
    return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
  }

  function asciiWrite (buf, string, offset, length) {
    return blitBuffer(asciiToBytes(string), buf, offset, length)
  }

  function latin1Write (buf, string, offset, length) {
    return asciiWrite(buf, string, offset, length)
  }

  function base64Write (buf, string, offset, length) {
    return blitBuffer(base64ToBytes(string), buf, offset, length)
  }

  function ucs2Write (buf, string, offset, length) {
    return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
  }

  Buffer.prototype.write = function write (string, offset, length, encoding) {
    // Buffer#write(string)
    if (offset === undefined) {
      encoding = 'utf8';
      length = this.length;
      offset = 0;
    // Buffer#write(string, encoding)
    } else if (length === undefined && typeof offset === 'string') {
      encoding = offset;
      length = this.length;
      offset = 0;
    // Buffer#write(string, offset[, length][, encoding])
    } else if (isFinite(offset)) {
      offset = offset | 0;
      if (isFinite(length)) {
        length = length | 0;
        if (encoding === undefined) encoding = 'utf8';
      } else {
        encoding = length;
        length = undefined;
      }
    // legacy write(string, encoding, offset, length) - remove in v0.13
    } else {
      throw new Error(
        'Buffer.write(string, encoding, offset[, length]) is no longer supported'
      )
    }

    var remaining = this.length - offset;
    if (length === undefined || length > remaining) length = remaining;

    if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
      throw new RangeError('Attempt to write outside buffer bounds')
    }

    if (!encoding) encoding = 'utf8';

    var loweredCase = false;
    for (;;) {
      switch (encoding) {
        case 'hex':
          return hexWrite(this, string, offset, length)

        case 'utf8':
        case 'utf-8':
          return utf8Write(this, string, offset, length)

        case 'ascii':
          return asciiWrite(this, string, offset, length)

        case 'latin1':
        case 'binary':
          return latin1Write(this, string, offset, length)

        case 'base64':
          // Warning: maxLength not taken into account in base64Write
          return base64Write(this, string, offset, length)

        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return ucs2Write(this, string, offset, length)

        default:
          if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
          encoding = ('' + encoding).toLowerCase();
          loweredCase = true;
      }
    }
  };

  Buffer.prototype.toJSON = function toJSON () {
    return {
      type: 'Buffer',
      data: Array.prototype.slice.call(this._arr || this, 0)
    }
  };

  function base64Slice (buf, start, end) {
    if (start === 0 && end === buf.length) {
      return fromByteArray(buf)
    } else {
      return fromByteArray(buf.slice(start, end))
    }
  }

  function utf8Slice (buf, start, end) {
    end = Math.min(buf.length, end);
    var res = [];

    var i = start;
    while (i < end) {
      var firstByte = buf[i];
      var codePoint = null;
      var bytesPerSequence = (firstByte > 0xEF) ? 4
        : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
        : 1;

      if (i + bytesPerSequence <= end) {
        var secondByte, thirdByte, fourthByte, tempCodePoint;

        switch (bytesPerSequence) {
          case 1:
            if (firstByte < 0x80) {
              codePoint = firstByte;
            }
            break
          case 2:
            secondByte = buf[i + 1];
            if ((secondByte & 0xC0) === 0x80) {
              tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
              if (tempCodePoint > 0x7F) {
                codePoint = tempCodePoint;
              }
            }
            break
          case 3:
            secondByte = buf[i + 1];
            thirdByte = buf[i + 2];
            if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
              tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
              if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                codePoint = tempCodePoint;
              }
            }
            break
          case 4:
            secondByte = buf[i + 1];
            thirdByte = buf[i + 2];
            fourthByte = buf[i + 3];
            if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
              tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
              if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                codePoint = tempCodePoint;
              }
            }
        }
      }

      if (codePoint === null) {
        // we did not generate a valid codePoint so insert a
        // replacement char (U+FFFD) and advance only 1 byte
        codePoint = 0xFFFD;
        bytesPerSequence = 1;
      } else if (codePoint > 0xFFFF) {
        // encode to utf16 (surrogate pair dance)
        codePoint -= 0x10000;
        res.push(codePoint >>> 10 & 0x3FF | 0xD800);
        codePoint = 0xDC00 | codePoint & 0x3FF;
      }

      res.push(codePoint);
      i += bytesPerSequence;
    }

    return decodeCodePointsArray(res)
  }

  // Based on http://stackoverflow.com/a/22747272/680742, the browser with
  // the lowest limit is Chrome, with 0x10000 args.
  // We go 1 magnitude less, for safety
  var MAX_ARGUMENTS_LENGTH = 0x1000;

  function decodeCodePointsArray (codePoints) {
    var len = codePoints.length;
    if (len <= MAX_ARGUMENTS_LENGTH) {
      return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
    }

    // Decode in chunks to avoid "call stack size exceeded".
    var res = '';
    var i = 0;
    while (i < len) {
      res += String.fromCharCode.apply(
        String,
        codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
      );
    }
    return res
  }

  function asciiSlice (buf, start, end) {
    var ret = '';
    end = Math.min(buf.length, end);

    for (var i = start; i < end; ++i) {
      ret += String.fromCharCode(buf[i] & 0x7F);
    }
    return ret
  }

  function latin1Slice (buf, start, end) {
    var ret = '';
    end = Math.min(buf.length, end);

    for (var i = start; i < end; ++i) {
      ret += String.fromCharCode(buf[i]);
    }
    return ret
  }

  function hexSlice (buf, start, end) {
    var len = buf.length;

    if (!start || start < 0) start = 0;
    if (!end || end < 0 || end > len) end = len;

    var out = '';
    for (var i = start; i < end; ++i) {
      out += toHex(buf[i]);
    }
    return out
  }

  function utf16leSlice (buf, start, end) {
    var bytes = buf.slice(start, end);
    var res = '';
    for (var i = 0; i < bytes.length; i += 2) {
      res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
    }
    return res
  }

  Buffer.prototype.slice = function slice (start, end) {
    var len = this.length;
    start = ~~start;
    end = end === undefined ? len : ~~end;

    if (start < 0) {
      start += len;
      if (start < 0) start = 0;
    } else if (start > len) {
      start = len;
    }

    if (end < 0) {
      end += len;
      if (end < 0) end = 0;
    } else if (end > len) {
      end = len;
    }

    if (end < start) end = start;

    var newBuf;
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      newBuf = this.subarray(start, end);
      newBuf.__proto__ = Buffer.prototype;
    } else {
      var sliceLen = end - start;
      newBuf = new Buffer(sliceLen, undefined);
      for (var i = 0; i < sliceLen; ++i) {
        newBuf[i] = this[i + start];
      }
    }

    return newBuf
  };

  /*
   * Need to make sure that buffer isn't trying to write out of bounds.
   */
  function checkOffset (offset, ext, length) {
    if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
    if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
  }

  Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) checkOffset(offset, byteLength, this.length);

    var val = this[offset];
    var mul = 1;
    var i = 0;
    while (++i < byteLength && (mul *= 0x100)) {
      val += this[offset + i] * mul;
    }

    return val
  };

  Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) {
      checkOffset(offset, byteLength, this.length);
    }

    var val = this[offset + --byteLength];
    var mul = 1;
    while (byteLength > 0 && (mul *= 0x100)) {
      val += this[offset + --byteLength] * mul;
    }

    return val
  };

  Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 1, this.length);
    return this[offset]
  };

  Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 2, this.length);
    return this[offset] | (this[offset + 1] << 8)
  };

  Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 2, this.length);
    return (this[offset] << 8) | this[offset + 1]
  };

  Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);

    return ((this[offset]) |
        (this[offset + 1] << 8) |
        (this[offset + 2] << 16)) +
        (this[offset + 3] * 0x1000000)
  };

  Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);

    return (this[offset] * 0x1000000) +
      ((this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      this[offset + 3])
  };

  Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) checkOffset(offset, byteLength, this.length);

    var val = this[offset];
    var mul = 1;
    var i = 0;
    while (++i < byteLength && (mul *= 0x100)) {
      val += this[offset + i] * mul;
    }
    mul *= 0x80;

    if (val >= mul) val -= Math.pow(2, 8 * byteLength);

    return val
  };

  Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) checkOffset(offset, byteLength, this.length);

    var i = byteLength;
    var mul = 1;
    var val = this[offset + --i];
    while (i > 0 && (mul *= 0x100)) {
      val += this[offset + --i] * mul;
    }
    mul *= 0x80;

    if (val >= mul) val -= Math.pow(2, 8 * byteLength);

    return val
  };

  Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 1, this.length);
    if (!(this[offset] & 0x80)) return (this[offset])
    return ((0xff - this[offset] + 1) * -1)
  };

  Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 2, this.length);
    var val = this[offset] | (this[offset + 1] << 8);
    return (val & 0x8000) ? val | 0xFFFF0000 : val
  };

  Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 2, this.length);
    var val = this[offset + 1] | (this[offset] << 8);
    return (val & 0x8000) ? val | 0xFFFF0000 : val
  };

  Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);

    return (this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16) |
      (this[offset + 3] << 24)
  };

  Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);

    return (this[offset] << 24) |
      (this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      (this[offset + 3])
  };

  Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);
    return read(this, offset, true, 23, 4)
  };

  Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);
    return read(this, offset, false, 23, 4)
  };

  Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 8, this.length);
    return read(this, offset, true, 52, 8)
  };

  Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
    if (!noAssert) checkOffset(offset, 8, this.length);
    return read(this, offset, false, 52, 8)
  };

  function checkInt (buf, value, offset, ext, max, min) {
    if (!internalIsBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
    if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
    if (offset + ext > buf.length) throw new RangeError('Index out of range')
  }

  Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) {
      var maxBytes = Math.pow(2, 8 * byteLength) - 1;
      checkInt(this, value, offset, byteLength, maxBytes, 0);
    }

    var mul = 1;
    var i = 0;
    this[offset] = value & 0xFF;
    while (++i < byteLength && (mul *= 0x100)) {
      this[offset + i] = (value / mul) & 0xFF;
    }

    return offset + byteLength
  };

  Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) {
      var maxBytes = Math.pow(2, 8 * byteLength) - 1;
      checkInt(this, value, offset, byteLength, maxBytes, 0);
    }

    var i = byteLength - 1;
    var mul = 1;
    this[offset + i] = value & 0xFF;
    while (--i >= 0 && (mul *= 0x100)) {
      this[offset + i] = (value / mul) & 0xFF;
    }

    return offset + byteLength
  };

  Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
    if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
    this[offset] = (value & 0xff);
    return offset + 1
  };

  function objectWriteUInt16 (buf, value, offset, littleEndian) {
    if (value < 0) value = 0xffff + value + 1;
    for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
      buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
        (littleEndian ? i : 1 - i) * 8;
    }
  }

  Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value & 0xff);
      this[offset + 1] = (value >>> 8);
    } else {
      objectWriteUInt16(this, value, offset, true);
    }
    return offset + 2
  };

  Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value >>> 8);
      this[offset + 1] = (value & 0xff);
    } else {
      objectWriteUInt16(this, value, offset, false);
    }
    return offset + 2
  };

  function objectWriteUInt32 (buf, value, offset, littleEndian) {
    if (value < 0) value = 0xffffffff + value + 1;
    for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
      buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff;
    }
  }

  Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset + 3] = (value >>> 24);
      this[offset + 2] = (value >>> 16);
      this[offset + 1] = (value >>> 8);
      this[offset] = (value & 0xff);
    } else {
      objectWriteUInt32(this, value, offset, true);
    }
    return offset + 4
  };

  Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value >>> 24);
      this[offset + 1] = (value >>> 16);
      this[offset + 2] = (value >>> 8);
      this[offset + 3] = (value & 0xff);
    } else {
      objectWriteUInt32(this, value, offset, false);
    }
    return offset + 4
  };

  Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) {
      var limit = Math.pow(2, 8 * byteLength - 1);

      checkInt(this, value, offset, byteLength, limit - 1, -limit);
    }

    var i = 0;
    var mul = 1;
    var sub = 0;
    this[offset] = value & 0xFF;
    while (++i < byteLength && (mul *= 0x100)) {
      if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
        sub = 1;
      }
      this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
    }

    return offset + byteLength
  };

  Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) {
      var limit = Math.pow(2, 8 * byteLength - 1);

      checkInt(this, value, offset, byteLength, limit - 1, -limit);
    }

    var i = byteLength - 1;
    var mul = 1;
    var sub = 0;
    this[offset + i] = value & 0xFF;
    while (--i >= 0 && (mul *= 0x100)) {
      if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
        sub = 1;
      }
      this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
    }

    return offset + byteLength
  };

  Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -128);
    if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
    if (value < 0) value = 0xff + value + 1;
    this[offset] = (value & 0xff);
    return offset + 1
  };

  Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -32768);
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value & 0xff);
      this[offset + 1] = (value >>> 8);
    } else {
      objectWriteUInt16(this, value, offset, true);
    }
    return offset + 2
  };

  Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -32768);
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value >>> 8);
      this[offset + 1] = (value & 0xff);
    } else {
      objectWriteUInt16(this, value, offset, false);
    }
    return offset + 2
  };

  Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -2147483648);
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value & 0xff);
      this[offset + 1] = (value >>> 8);
      this[offset + 2] = (value >>> 16);
      this[offset + 3] = (value >>> 24);
    } else {
      objectWriteUInt32(this, value, offset, true);
    }
    return offset + 4
  };

  Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -2147483648);
    if (value < 0) value = 0xffffffff + value + 1;
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = (value >>> 24);
      this[offset + 1] = (value >>> 16);
      this[offset + 2] = (value >>> 8);
      this[offset + 3] = (value & 0xff);
    } else {
      objectWriteUInt32(this, value, offset, false);
    }
    return offset + 4
  };

  function checkIEEE754 (buf, value, offset, ext, max, min) {
    if (offset + ext > buf.length) throw new RangeError('Index out of range')
    if (offset < 0) throw new RangeError('Index out of range')
  }

  function writeFloat (buf, value, offset, littleEndian, noAssert) {
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 4);
    }
    write(buf, value, offset, littleEndian, 23, 4);
    return offset + 4
  }

  Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
    return writeFloat(this, value, offset, true, noAssert)
  };

  Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
    return writeFloat(this, value, offset, false, noAssert)
  };

  function writeDouble (buf, value, offset, littleEndian, noAssert) {
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 8);
    }
    write(buf, value, offset, littleEndian, 52, 8);
    return offset + 8
  }

  Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
    return writeDouble(this, value, offset, true, noAssert)
  };

  Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
    return writeDouble(this, value, offset, false, noAssert)
  };

  // copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
  Buffer.prototype.copy = function copy (target, targetStart, start, end) {
    if (!start) start = 0;
    if (!end && end !== 0) end = this.length;
    if (targetStart >= target.length) targetStart = target.length;
    if (!targetStart) targetStart = 0;
    if (end > 0 && end < start) end = start;

    // Copy 0 bytes; we're done
    if (end === start) return 0
    if (target.length === 0 || this.length === 0) return 0

    // Fatal error conditions
    if (targetStart < 0) {
      throw new RangeError('targetStart out of bounds')
    }
    if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
    if (end < 0) throw new RangeError('sourceEnd out of bounds')

    // Are we oob?
    if (end > this.length) end = this.length;
    if (target.length - targetStart < end - start) {
      end = target.length - targetStart + start;
    }

    var len = end - start;
    var i;

    if (this === target && start < targetStart && targetStart < end) {
      // descending copy from end
      for (i = len - 1; i >= 0; --i) {
        target[i + targetStart] = this[i + start];
      }
    } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
      // ascending copy from start
      for (i = 0; i < len; ++i) {
        target[i + targetStart] = this[i + start];
      }
    } else {
      Uint8Array.prototype.set.call(
        target,
        this.subarray(start, start + len),
        targetStart
      );
    }

    return len
  };

  // Usage:
  //    buffer.fill(number[, offset[, end]])
  //    buffer.fill(buffer[, offset[, end]])
  //    buffer.fill(string[, offset[, end]][, encoding])
  Buffer.prototype.fill = function fill (val, start, end, encoding) {
    // Handle string cases:
    if (typeof val === 'string') {
      if (typeof start === 'string') {
        encoding = start;
        start = 0;
        end = this.length;
      } else if (typeof end === 'string') {
        encoding = end;
        end = this.length;
      }
      if (val.length === 1) {
        var code = val.charCodeAt(0);
        if (code < 256) {
          val = code;
        }
      }
      if (encoding !== undefined && typeof encoding !== 'string') {
        throw new TypeError('encoding must be a string')
      }
      if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
        throw new TypeError('Unknown encoding: ' + encoding)
      }
    } else if (typeof val === 'number') {
      val = val & 255;
    }

    // Invalid ranges are not set to a default, so can range check early.
    if (start < 0 || this.length < start || this.length < end) {
      throw new RangeError('Out of range index')
    }

    if (end <= start) {
      return this
    }

    start = start >>> 0;
    end = end === undefined ? this.length : end >>> 0;

    if (!val) val = 0;

    var i;
    if (typeof val === 'number') {
      for (i = start; i < end; ++i) {
        this[i] = val;
      }
    } else {
      var bytes = internalIsBuffer(val)
        ? val
        : utf8ToBytes(new Buffer(val, encoding).toString());
      var len = bytes.length;
      for (i = 0; i < end - start; ++i) {
        this[i + start] = bytes[i % len];
      }
    }

    return this
  };

  // HELPER FUNCTIONS
  // ================

  var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;

  function base64clean (str) {
    // Node strips out invalid characters like \n and \t from the string, base64-js does not
    str = stringtrim(str).replace(INVALID_BASE64_RE, '');
    // Node converts strings with length < 2 to ''
    if (str.length < 2) return ''
    // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
    while (str.length % 4 !== 0) {
      str = str + '=';
    }
    return str
  }

  function stringtrim (str) {
    if (str.trim) return str.trim()
    return str.replace(/^\s+|\s+$/g, '')
  }

  function toHex (n) {
    if (n < 16) return '0' + n.toString(16)
    return n.toString(16)
  }

  function utf8ToBytes (string, units) {
    units = units || Infinity;
    var codePoint;
    var length = string.length;
    var leadSurrogate = null;
    var bytes = [];

    for (var i = 0; i < length; ++i) {
      codePoint = string.charCodeAt(i);

      // is surrogate component
      if (codePoint > 0xD7FF && codePoint < 0xE000) {
        // last char was a lead
        if (!leadSurrogate) {
          // no lead yet
          if (codePoint > 0xDBFF) {
            // unexpected trail
            if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
            continue
          } else if (i + 1 === length) {
            // unpaired lead
            if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
            continue
          }

          // valid lead
          leadSurrogate = codePoint;

          continue
        }

        // 2 leads in a row
        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          leadSurrogate = codePoint;
          continue
        }

        // valid surrogate pair
        codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
      } else if (leadSurrogate) {
        // valid bmp char, but last char was a lead
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
      }

      leadSurrogate = null;

      // encode utf8
      if (codePoint < 0x80) {
        if ((units -= 1) < 0) break
        bytes.push(codePoint);
      } else if (codePoint < 0x800) {
        if ((units -= 2) < 0) break
        bytes.push(
          codePoint >> 0x6 | 0xC0,
          codePoint & 0x3F | 0x80
        );
      } else if (codePoint < 0x10000) {
        if ((units -= 3) < 0) break
        bytes.push(
          codePoint >> 0xC | 0xE0,
          codePoint >> 0x6 & 0x3F | 0x80,
          codePoint & 0x3F | 0x80
        );
      } else if (codePoint < 0x110000) {
        if ((units -= 4) < 0) break
        bytes.push(
          codePoint >> 0x12 | 0xF0,
          codePoint >> 0xC & 0x3F | 0x80,
          codePoint >> 0x6 & 0x3F | 0x80,
          codePoint & 0x3F | 0x80
        );
      } else {
        throw new Error('Invalid code point')
      }
    }

    return bytes
  }

  function asciiToBytes (str) {
    var byteArray = [];
    for (var i = 0; i < str.length; ++i) {
      // Node's code seems to be doing this and not & 0x7F..
      byteArray.push(str.charCodeAt(i) & 0xFF);
    }
    return byteArray
  }

  function utf16leToBytes (str, units) {
    var c, hi, lo;
    var byteArray = [];
    for (var i = 0; i < str.length; ++i) {
      if ((units -= 2) < 0) break

      c = str.charCodeAt(i);
      hi = c >> 8;
      lo = c % 256;
      byteArray.push(lo);
      byteArray.push(hi);
    }

    return byteArray
  }


  function base64ToBytes (str) {
    return toByteArray(base64clean(str))
  }

  function blitBuffer (src, dst, offset, length) {
    for (var i = 0; i < length; ++i) {
      if ((i + offset >= dst.length) || (i >= src.length)) break
      dst[i + offset] = src[i];
    }
    return i
  }

  function isnan (val) {
    return val !== val // eslint-disable-line no-self-compare
  }


  // the following is from is-buffer, also by Feross Aboukhadijeh and with same lisence
  // The _isBuffer check is for Safari 5-7 support, because it's missing
  // Object.prototype.constructor. Remove this eventually
  function isBuffer$1(obj) {
    return obj != null && (!!obj._isBuffer || isFastBuffer(obj) || isSlowBuffer(obj))
  }

  function isFastBuffer (obj) {
    return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
  }

  // For Node v0.10 support. Remove this eventually.
  function isSlowBuffer (obj) {
    return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isFastBuffer(obj.slice(0, 0))
  }

  var inherits;
  if (typeof Object.create === 'function'){
    inherits = function inherits(ctor, superCtor) {
      // implementation from standard node.js 'util' module
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    };
  } else {
    inherits = function inherits(ctor, superCtor) {
      ctor.super_ = superCtor;
      var TempCtor = function () {};
      TempCtor.prototype = superCtor.prototype;
      ctor.prototype = new TempCtor();
      ctor.prototype.constructor = ctor;
    };
  }

  var getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors ||
    function getOwnPropertyDescriptors(obj) {
      var keys = Object.keys(obj);
      var descriptors = {};
      for (var i = 0; i < keys.length; i++) {
        descriptors[keys[i]] = Object.getOwnPropertyDescriptor(obj, keys[i]);
      }
      return descriptors;
    };

  var formatRegExp = /%[sdj%]/g;
  function format(f) {
    if (!isString$2(f)) {
      var objects = [];
      for (var i = 0; i < arguments.length; i++) {
        objects.push(inspect(arguments[i]));
      }
      return objects.join(' ');
    }

    var i = 1;
    var args = arguments;
    var len = args.length;
    var str = String(f).replace(formatRegExp, function(x) {
      if (x === '%%') return '%';
      if (i >= len) return x;
      switch (x) {
        case '%s': return String(args[i++]);
        case '%d': return Number(args[i++]);
        case '%j':
          try {
            return JSON.stringify(args[i++]);
          } catch (_) {
            return '[Circular]';
          }
        default:
          return x;
      }
    });
    for (var x = args[i]; i < len; x = args[++i]) {
      if (isNull(x) || !isObject(x)) {
        str += ' ' + x;
      } else {
        str += ' ' + inspect(x);
      }
    }
    return str;
  }

  // Mark that a method should not be used.
  // Returns a modified function which warns once by default.
  // If --no-deprecation is set, then it is a no-op.
  function deprecate(fn, msg) {
    // Allow for deprecating things in the process of starting up.
    if (isUndefined(global$1.process)) {
      return function() {
        return deprecate(fn, msg).apply(this, arguments);
      };
    }

    if (browser$1$1.noDeprecation === true) {
      return fn;
    }

    var warned = false;
    function deprecated() {
      if (!warned) {
        if (browser$1$1.throwDeprecation) {
          throw new Error(msg);
        } else if (browser$1$1.traceDeprecation) {
          console.trace(msg);
        } else {
          console.error(msg);
        }
        warned = true;
      }
      return fn.apply(this, arguments);
    }

    return deprecated;
  }

  var debugs = {};
  var debugEnviron;
  function debuglog(set) {
    if (isUndefined(debugEnviron))
      debugEnviron = browser$1$1.env.NODE_DEBUG || '';
    set = set.toUpperCase();
    if (!debugs[set]) {
      if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
        var pid = 0;
        debugs[set] = function() {
          var msg = format.apply(null, arguments);
          console.error('%s %d: %s', set, pid, msg);
        };
      } else {
        debugs[set] = function() {};
      }
    }
    return debugs[set];
  }

  /**
   * Echos the value of a value. Trys to print the value out
   * in the best way possible given the different types.
   *
   * @param {Object} obj The object to print out.
   * @param {Object} opts Optional options object that alters the output.
   */
  /* legacy: obj, showHidden, depth, colors*/
  function inspect(obj, opts) {
    // default options
    var ctx = {
      seen: [],
      stylize: stylizeNoColor
    };
    // legacy...
    if (arguments.length >= 3) ctx.depth = arguments[2];
    if (arguments.length >= 4) ctx.colors = arguments[3];
    if (isBoolean(opts)) {
      // legacy...
      ctx.showHidden = opts;
    } else if (opts) {
      // got an "options" object
      _extend(ctx, opts);
    }
    // set default options
    if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
    if (isUndefined(ctx.depth)) ctx.depth = 2;
    if (isUndefined(ctx.colors)) ctx.colors = false;
    if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
    if (ctx.colors) ctx.stylize = stylizeWithColor;
    return formatValue(ctx, obj, ctx.depth);
  }

  // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
  inspect.colors = {
    'bold' : [1, 22],
    'italic' : [3, 23],
    'underline' : [4, 24],
    'inverse' : [7, 27],
    'white' : [37, 39],
    'grey' : [90, 39],
    'black' : [30, 39],
    'blue' : [34, 39],
    'cyan' : [36, 39],
    'green' : [32, 39],
    'magenta' : [35, 39],
    'red' : [31, 39],
    'yellow' : [33, 39]
  };

  // Don't use 'blue' not visible on cmd.exe
  inspect.styles = {
    'special': 'cyan',
    'number': 'yellow',
    'boolean': 'yellow',
    'undefined': 'grey',
    'null': 'bold',
    'string': 'green',
    'date': 'magenta',
    // "name": intentionally not styling
    'regexp': 'red'
  };


  function stylizeWithColor(str, styleType) {
    var style = inspect.styles[styleType];

    if (style) {
      return '\u001b[' + inspect.colors[style][0] + 'm' + str +
             '\u001b[' + inspect.colors[style][1] + 'm';
    } else {
      return str;
    }
  }


  function stylizeNoColor(str, styleType) {
    return str;
  }


  function arrayToHash(array) {
    var hash = {};

    array.forEach(function(val, idx) {
      hash[val] = true;
    });

    return hash;
  }


  function formatValue(ctx, value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (ctx.customInspect &&
        value &&
        isFunction(value.inspect) &&
        // Filter out the util module, it's inspect function is special
        value.inspect !== inspect &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      var ret = value.inspect(recurseTimes, ctx);
      if (!isString$2(ret)) {
        ret = formatValue(ctx, ret, recurseTimes);
      }
      return ret;
    }

    // Primitive types cannot have properties
    var primitive = formatPrimitive(ctx, value);
    if (primitive) {
      return primitive;
    }

    // Look up the keys of the object.
    var keys = Object.keys(value);
    var visibleKeys = arrayToHash(keys);

    if (ctx.showHidden) {
      keys = Object.getOwnPropertyNames(value);
    }

    // IE doesn't make error fields non-enumerable
    // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
    if (isError(value)
        && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
      return formatError(value);
    }

    // Some type of object without properties can be shortcutted.
    if (keys.length === 0) {
      if (isFunction(value)) {
        var name = value.name ? ': ' + value.name : '';
        return ctx.stylize('[Function' + name + ']', 'special');
      }
      if (isRegExp(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
      }
      if (isDate(value)) {
        return ctx.stylize(Date.prototype.toString.call(value), 'date');
      }
      if (isError(value)) {
        return formatError(value);
      }
    }

    var base = '', array = false, braces = ['{', '}'];

    // Make Array say that they are Array
    if (isArray(value)) {
      array = true;
      braces = ['[', ']'];
    }

    // Make functions say that they are functions
    if (isFunction(value)) {
      var n = value.name ? ': ' + value.name : '';
      base = ' [Function' + n + ']';
    }

    // Make RegExps say that they are RegExps
    if (isRegExp(value)) {
      base = ' ' + RegExp.prototype.toString.call(value);
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + Date.prototype.toUTCString.call(value);
    }

    // Make error with message first say the error
    if (isError(value)) {
      base = ' ' + formatError(value);
    }

    if (keys.length === 0 && (!array || value.length == 0)) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
      } else {
        return ctx.stylize('[Object]', 'special');
      }
    }

    ctx.seen.push(value);

    var output;
    if (array) {
      output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
    } else {
      output = keys.map(function(key) {
        return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
      });
    }

    ctx.seen.pop();

    return reduceToSingleString(output, base, braces);
  }


  function formatPrimitive(ctx, value) {
    if (isUndefined(value))
      return ctx.stylize('undefined', 'undefined');
    if (isString$2(value)) {
      var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                               .replace(/'/g, "\\'")
                                               .replace(/\\"/g, '"') + '\'';
      return ctx.stylize(simple, 'string');
    }
    if (isNumber(value))
      return ctx.stylize('' + value, 'number');
    if (isBoolean(value))
      return ctx.stylize('' + value, 'boolean');
    // For some reason typeof null is "object", so special case here.
    if (isNull(value))
      return ctx.stylize('null', 'null');
  }


  function formatError(value) {
    return '[' + Error.prototype.toString.call(value) + ']';
  }


  function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
    var output = [];
    for (var i = 0, l = value.length; i < l; ++i) {
      if (hasOwnProperty(value, String(i))) {
        output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
            String(i), true));
      } else {
        output.push('');
      }
    }
    keys.forEach(function(key) {
      if (!key.match(/^\d+$/)) {
        output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
            key, true));
      }
    });
    return output;
  }


  function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
    var name, str, desc;
    desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
    if (desc.get) {
      if (desc.set) {
        str = ctx.stylize('[Getter/Setter]', 'special');
      } else {
        str = ctx.stylize('[Getter]', 'special');
      }
    } else {
      if (desc.set) {
        str = ctx.stylize('[Setter]', 'special');
      }
    }
    if (!hasOwnProperty(visibleKeys, key)) {
      name = '[' + key + ']';
    }
    if (!str) {
      if (ctx.seen.indexOf(desc.value) < 0) {
        if (isNull(recurseTimes)) {
          str = formatValue(ctx, desc.value, null);
        } else {
          str = formatValue(ctx, desc.value, recurseTimes - 1);
        }
        if (str.indexOf('\n') > -1) {
          if (array) {
            str = str.split('\n').map(function(line) {
              return '  ' + line;
            }).join('\n').substr(2);
          } else {
            str = '\n' + str.split('\n').map(function(line) {
              return '   ' + line;
            }).join('\n');
          }
        }
      } else {
        str = ctx.stylize('[Circular]', 'special');
      }
    }
    if (isUndefined(name)) {
      if (array && key.match(/^\d+$/)) {
        return str;
      }
      name = JSON.stringify('' + key);
      if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
        name = name.substr(1, name.length - 2);
        name = ctx.stylize(name, 'name');
      } else {
        name = name.replace(/'/g, "\\'")
                   .replace(/\\"/g, '"')
                   .replace(/(^"|"$)/g, "'");
        name = ctx.stylize(name, 'string');
      }
    }

    return name + ': ' + str;
  }


  function reduceToSingleString(output, base, braces) {
    var length = output.reduce(function(prev, cur) {
      if (cur.indexOf('\n') >= 0) ;
      return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
    }, 0);

    if (length > 60) {
      return braces[0] +
             (base === '' ? '' : base + '\n ') +
             ' ' +
             output.join(',\n  ') +
             ' ' +
             braces[1];
    }

    return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
  }


  // NOTE: These type checking functions intentionally don't use `instanceof`
  // because it is fragile and can be easily faked with `Object.create()`.
  function isArray(ar) {
    return Array.isArray(ar);
  }

  function isBoolean(arg) {
    return typeof arg === 'boolean';
  }

  function isNull(arg) {
    return arg === null;
  }

  function isNullOrUndefined(arg) {
    return arg == null;
  }

  function isNumber(arg) {
    return typeof arg === 'number';
  }

  function isString$2(arg) {
    return typeof arg === 'string';
  }

  function isSymbol(arg) {
    return typeof arg === 'symbol';
  }

  function isUndefined(arg) {
    return arg === void 0;
  }

  function isRegExp(re) {
    return isObject(re) && objectToString(re) === '[object RegExp]';
  }

  function isObject(arg) {
    return typeof arg === 'object' && arg !== null;
  }

  function isDate(d) {
    return isObject(d) && objectToString(d) === '[object Date]';
  }

  function isError(e) {
    return isObject(e) &&
        (objectToString(e) === '[object Error]' || e instanceof Error);
  }

  function isFunction(arg) {
    return typeof arg === 'function';
  }

  function isPrimitive(arg) {
    return arg === null ||
           typeof arg === 'boolean' ||
           typeof arg === 'number' ||
           typeof arg === 'string' ||
           typeof arg === 'symbol' ||  // ES6 symbol
           typeof arg === 'undefined';
  }

  function isBuffer(maybeBuf) {
    return Buffer.isBuffer(maybeBuf);
  }

  function objectToString(o) {
    return Object.prototype.toString.call(o);
  }


  function pad$1(n) {
    return n < 10 ? '0' + n.toString(10) : n.toString(10);
  }


  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
                'Oct', 'Nov', 'Dec'];

  // 26 Feb 16:19:34
  function timestamp() {
    var d = new Date();
    var time = [pad$1(d.getHours()),
                pad$1(d.getMinutes()),
                pad$1(d.getSeconds())].join(':');
    return [d.getDate(), months[d.getMonth()], time].join(' ');
  }


  // log is just a thin wrapper to console.log that prepends a timestamp
  function log() {
    console.log('%s - %s', timestamp(), format.apply(null, arguments));
  }

  function _extend(origin, add) {
    // Don't do anything if add isn't an object
    if (!add || !isObject(add)) return origin;

    var keys = Object.keys(add);
    var i = keys.length;
    while (i--) {
      origin[keys[i]] = add[keys[i]];
    }
    return origin;
  }
  function hasOwnProperty(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  }

  var kCustomPromisifiedSymbol = typeof Symbol !== 'undefined' ? Symbol('util.promisify.custom') : undefined;

  function promisify(original) {
    if (typeof original !== 'function')
      throw new TypeError('The "original" argument must be of type Function');

    if (kCustomPromisifiedSymbol && original[kCustomPromisifiedSymbol]) {
      var fn = original[kCustomPromisifiedSymbol];
      if (typeof fn !== 'function') {
        throw new TypeError('The "util.promisify.custom" argument must be of type Function');
      }
      Object.defineProperty(fn, kCustomPromisifiedSymbol, {
        value: fn, enumerable: false, writable: false, configurable: true
      });
      return fn;
    }

    function fn() {
      var promiseResolve, promiseReject;
      var promise = new Promise(function (resolve, reject) {
        promiseResolve = resolve;
        promiseReject = reject;
      });

      var args = [];
      for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
      }
      args.push(function (err, value) {
        if (err) {
          promiseReject(err);
        } else {
          promiseResolve(value);
        }
      });

      try {
        original.apply(this, args);
      } catch (err) {
        promiseReject(err);
      }

      return promise;
    }

    Object.setPrototypeOf(fn, Object.getPrototypeOf(original));

    if (kCustomPromisifiedSymbol) Object.defineProperty(fn, kCustomPromisifiedSymbol, {
      value: fn, enumerable: false, writable: false, configurable: true
    });
    return Object.defineProperties(
      fn,
      getOwnPropertyDescriptors(original)
    );
  }

  promisify.custom = kCustomPromisifiedSymbol;

  function callbackifyOnRejected(reason, cb) {
    // `!reason` guard inspired by bluebird (Ref: https://goo.gl/t5IS6M).
    // Because `null` is a special error value in callbacks which means "no error
    // occurred", we error-wrap so the callback consumer can distinguish between
    // "the promise rejected with null" or "the promise fulfilled with undefined".
    if (!reason) {
      var newReason = new Error('Promise was rejected with a falsy value');
      newReason.reason = reason;
      reason = newReason;
    }
    return cb(reason);
  }

  function callbackify(original) {
    if (typeof original !== 'function') {
      throw new TypeError('The "original" argument must be of type Function');
    }

    // We DO NOT return the promise as it gives the user a false sense that
    // the promise is actually somehow related to the callback's execution
    // and that the callback throwing will reject the promise.
    function callbackified() {
      var args = [];
      for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
      }

      var maybeCb = args.pop();
      if (typeof maybeCb !== 'function') {
        throw new TypeError('The last argument must be of type Function');
      }
      var self = this;
      var cb = function() {
        return maybeCb.apply(self, arguments);
      };
      // In true node style we process the callback on `nextTick` with all the
      // implications (stack, `uncaughtException`, `async_hooks`)
      original.apply(this, args)
        .then(function(ret) { browser$1$1.nextTick(cb.bind(null, null, ret)); },
          function(rej) { browser$1$1.nextTick(callbackifyOnRejected.bind(null, rej, cb)); });
    }

    Object.setPrototypeOf(callbackified, Object.getPrototypeOf(original));
    Object.defineProperties(callbackified, getOwnPropertyDescriptors(original));
    return callbackified;
  }

  var util = {
    inherits: inherits,
    _extend: _extend,
    log: log,
    isBuffer: isBuffer,
    isPrimitive: isPrimitive,
    isFunction: isFunction,
    isError: isError,
    isDate: isDate,
    isObject: isObject,
    isRegExp: isRegExp,
    isUndefined: isUndefined,
    isSymbol: isSymbol,
    isString: isString$2,
    isNumber: isNumber,
    isNullOrUndefined: isNullOrUndefined,
    isNull: isNull,
    isBoolean: isBoolean,
    isArray: isArray,
    inspect: inspect,
    deprecate: deprecate,
    format: format,
    debuglog: debuglog,
    promisify: promisify,
    callbackify: callbackify,
  };

  var _polyfillNode_util = /*#__PURE__*/Object.freeze({
    __proto__: null,
    _extend: _extend,
    callbackify: callbackify,
    debuglog: debuglog,
    default: util,
    deprecate: deprecate,
    format: format,
    inherits: inherits,
    inspect: inspect,
    isArray: isArray,
    isBoolean: isBoolean,
    isBuffer: isBuffer,
    isDate: isDate,
    isError: isError,
    isFunction: isFunction,
    isNull: isNull,
    isNullOrUndefined: isNullOrUndefined,
    isNumber: isNumber,
    isObject: isObject,
    isPrimitive: isPrimitive,
    isRegExp: isRegExp,
    isString: isString$2,
    isSymbol: isSymbol,
    isUndefined: isUndefined,
    log: log,
    promisify: promisify
  });

  function BufferList() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  BufferList.prototype.push = function (v) {
    var entry = { data: v, next: null };
    if (this.length > 0) this.tail.next = entry;else this.head = entry;
    this.tail = entry;
    ++this.length;
  };

  BufferList.prototype.unshift = function (v) {
    var entry = { data: v, next: this.head };
    if (this.length === 0) this.tail = entry;
    this.head = entry;
    ++this.length;
  };

  BufferList.prototype.shift = function () {
    if (this.length === 0) return;
    var ret = this.head.data;
    if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
    --this.length;
    return ret;
  };

  BufferList.prototype.clear = function () {
    this.head = this.tail = null;
    this.length = 0;
  };

  BufferList.prototype.join = function (s) {
    if (this.length === 0) return '';
    var p = this.head;
    var ret = '' + p.data;
    while (p = p.next) {
      ret += s + p.data;
    }return ret;
  };

  BufferList.prototype.concat = function (n) {
    if (this.length === 0) return Buffer.alloc(0);
    if (this.length === 1) return this.head.data;
    var ret = Buffer.allocUnsafe(n >>> 0);
    var p = this.head;
    var i = 0;
    while (p) {
      p.data.copy(ret, i);
      i += p.data.length;
      p = p.next;
    }
    return ret;
  };

  // Copyright Joyent, Inc. and other Node contributors.
  //
  // Permission is hereby granted, free of charge, to any person obtaining a
  // copy of this software and associated documentation files (the
  // "Software"), to deal in the Software without restriction, including
  // without limitation the rights to use, copy, modify, merge, publish,
  // distribute, sublicense, and/or sell copies of the Software, and to permit
  // persons to whom the Software is furnished to do so, subject to the
  // following conditions:
  //
  // The above copyright notice and this permission notice shall be included
  // in all copies or substantial portions of the Software.
  //
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
  // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
  // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
  // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
  // USE OR OTHER DEALINGS IN THE SOFTWARE.

  var isBufferEncoding = Buffer.isEncoding
    || function(encoding) {
         switch (encoding && encoding.toLowerCase()) {
           case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
           default: return false;
         }
       };


  function assertEncoding(encoding) {
    if (encoding && !isBufferEncoding(encoding)) {
      throw new Error('Unknown encoding: ' + encoding);
    }
  }

  // StringDecoder provides an interface for efficiently splitting a series of
  // buffers into a series of JS strings without breaking apart multi-byte
  // characters. CESU-8 is handled as part of the UTF-8 encoding.
  //
  // @TODO Handling all encodings inside a single object makes it very difficult
  // to reason about this code, so it should be split up in the future.
  // @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
  // points as used by CESU-8.
  function StringDecoder(encoding) {
    this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
    assertEncoding(encoding);
    switch (this.encoding) {
      case 'utf8':
        // CESU-8 represents each of Surrogate Pair by 3-bytes
        this.surrogateSize = 3;
        break;
      case 'ucs2':
      case 'utf16le':
        // UTF-16 represents each of Surrogate Pair by 2-bytes
        this.surrogateSize = 2;
        this.detectIncompleteChar = utf16DetectIncompleteChar;
        break;
      case 'base64':
        // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
        this.surrogateSize = 3;
        this.detectIncompleteChar = base64DetectIncompleteChar;
        break;
      default:
        this.write = passThroughWrite;
        return;
    }

    // Enough space to store all bytes of a single character. UTF-8 needs 4
    // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
    this.charBuffer = new Buffer(6);
    // Number of bytes received for the current incomplete multi-byte character.
    this.charReceived = 0;
    // Number of bytes expected for the current incomplete multi-byte character.
    this.charLength = 0;
  }

  // write decodes the given buffer and returns it as JS string that is
  // guaranteed to not contain any partial multi-byte characters. Any partial
  // character found at the end of the buffer is buffered up, and will be
  // returned when calling write again with the remaining bytes.
  //
  // Note: Converting a Buffer containing an orphan surrogate to a String
  // currently works, but converting a String to a Buffer (via `new Buffer`, or
  // Buffer#write) will replace incomplete surrogates with the unicode
  // replacement character. See https://codereview.chromium.org/121173009/ .
  StringDecoder.prototype.write = function(buffer) {
    var charStr = '';
    // if our last write ended with an incomplete multibyte character
    while (this.charLength) {
      // determine how many remaining bytes this buffer has to offer for this char
      var available = (buffer.length >= this.charLength - this.charReceived) ?
          this.charLength - this.charReceived :
          buffer.length;

      // add the new bytes to the char buffer
      buffer.copy(this.charBuffer, this.charReceived, 0, available);
      this.charReceived += available;

      if (this.charReceived < this.charLength) {
        // still not enough chars in this buffer? wait for more ...
        return '';
      }

      // remove bytes belonging to the current character from the buffer
      buffer = buffer.slice(available, buffer.length);

      // get the character that was split
      charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

      // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
      var charCode = charStr.charCodeAt(charStr.length - 1);
      if (charCode >= 0xD800 && charCode <= 0xDBFF) {
        this.charLength += this.surrogateSize;
        charStr = '';
        continue;
      }
      this.charReceived = this.charLength = 0;

      // if there are no more bytes in this buffer, just emit our char
      if (buffer.length === 0) {
        return charStr;
      }
      break;
    }

    // determine and set charLength / charReceived
    this.detectIncompleteChar(buffer);

    var end = buffer.length;
    if (this.charLength) {
      // buffer the incomplete character bytes we got
      buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
      end -= this.charReceived;
    }

    charStr += buffer.toString(this.encoding, 0, end);

    var end = charStr.length - 1;
    var charCode = charStr.charCodeAt(end);
    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      var size = this.surrogateSize;
      this.charLength += size;
      this.charReceived += size;
      this.charBuffer.copy(this.charBuffer, size, 0, size);
      buffer.copy(this.charBuffer, 0, 0, size);
      return charStr.substring(0, end);
    }

    // or just emit the charStr
    return charStr;
  };

  // detectIncompleteChar determines if there is an incomplete UTF-8 character at
  // the end of the given buffer. If so, it sets this.charLength to the byte
  // length that character, and sets this.charReceived to the number of bytes
  // that are available for this character.
  StringDecoder.prototype.detectIncompleteChar = function(buffer) {
    // determine how many bytes we have to check at the end of this buffer
    var i = (buffer.length >= 3) ? 3 : buffer.length;

    // Figure out if one of the last i bytes of our buffer announces an
    // incomplete char.
    for (; i > 0; i--) {
      var c = buffer[buffer.length - i];

      // See http://en.wikipedia.org/wiki/UTF-8#Description

      // 110XXXXX
      if (i == 1 && c >> 5 == 0x06) {
        this.charLength = 2;
        break;
      }

      // 1110XXXX
      if (i <= 2 && c >> 4 == 0x0E) {
        this.charLength = 3;
        break;
      }

      // 11110XXX
      if (i <= 3 && c >> 3 == 0x1E) {
        this.charLength = 4;
        break;
      }
    }
    this.charReceived = i;
  };

  StringDecoder.prototype.end = function(buffer) {
    var res = '';
    if (buffer && buffer.length)
      res = this.write(buffer);

    if (this.charReceived) {
      var cr = this.charReceived;
      var buf = this.charBuffer;
      var enc = this.encoding;
      res += buf.slice(0, cr).toString(enc);
    }

    return res;
  };

  function passThroughWrite(buffer) {
    return buffer.toString(this.encoding);
  }

  function utf16DetectIncompleteChar(buffer) {
    this.charReceived = buffer.length % 2;
    this.charLength = this.charReceived ? 2 : 0;
  }

  function base64DetectIncompleteChar(buffer) {
    this.charReceived = buffer.length % 3;
    this.charLength = this.charReceived ? 3 : 0;
  }

  Readable.ReadableState = ReadableState;

  var debug$2 = debuglog('stream');
  inherits(Readable, EventEmitter);

  function prependListener(emitter, event, fn) {
    // Sadly this is not cacheable as some libraries bundle their own
    // event emitter implementation with them.
    if (typeof emitter.prependListener === 'function') {
      return emitter.prependListener(event, fn);
    } else {
      // This is a hack to make sure that our error handler is attached before any
      // userland ones.  NEVER DO THIS. This is here only because this code needs
      // to continue to work with older versions of Node.js that do not include
      // the prependListener() method. The goal is to eventually remove this hack.
      if (!emitter._events || !emitter._events[event])
        emitter.on(event, fn);
      else if (Array.isArray(emitter._events[event]))
        emitter._events[event].unshift(fn);
      else
        emitter._events[event] = [fn, emitter._events[event]];
    }
  }
  function listenerCount (emitter, type) {
    return emitter.listeners(type).length;
  }
  function ReadableState(options, stream) {

    options = options || {};

    // object stream flag. Used to make read(n) ignore n and to
    // make all the buffer merging and length checks go away
    this.objectMode = !!options.objectMode;

    if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

    // the point at which it stops calling _read() to fill the buffer
    // Note: 0 is a valid value, means "don't call _read preemptively ever"
    var hwm = options.highWaterMark;
    var defaultHwm = this.objectMode ? 16 : 16 * 1024;
    this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

    // cast to ints.
    this.highWaterMark = ~ ~this.highWaterMark;

    // A linked list is used to store data chunks instead of an array because the
    // linked list can remove elements from the beginning faster than
    // array.shift()
    this.buffer = new BufferList();
    this.length = 0;
    this.pipes = null;
    this.pipesCount = 0;
    this.flowing = null;
    this.ended = false;
    this.endEmitted = false;
    this.reading = false;

    // a flag to be able to tell if the onwrite cb is called immediately,
    // or on a later tick.  We set this to true at first, because any
    // actions that shouldn't happen until "later" should generally also
    // not happen before the first write call.
    this.sync = true;

    // whenever we return null, then we set a flag to say
    // that we're awaiting a 'readable' event emission.
    this.needReadable = false;
    this.emittedReadable = false;
    this.readableListening = false;
    this.resumeScheduled = false;

    // Crypto is kind of old and crusty.  Historically, its default string
    // encoding is 'binary' so we have to make this configurable.
    // Everything else in the universe uses 'utf8', though.
    this.defaultEncoding = options.defaultEncoding || 'utf8';

    // when piping, we only care about 'readable' events that happen
    // after read()ing all the bytes and not getting any pushback.
    this.ranOut = false;

    // the number of writers that are awaiting a drain event in .pipe()s
    this.awaitDrain = 0;

    // if true, a maybeReadMore has been scheduled
    this.readingMore = false;

    this.decoder = null;
    this.encoding = null;
    if (options.encoding) {
      this.decoder = new StringDecoder(options.encoding);
      this.encoding = options.encoding;
    }
  }
  function Readable(options) {

    if (!(this instanceof Readable)) return new Readable(options);

    this._readableState = new ReadableState(options, this);

    // legacy
    this.readable = true;

    if (options && typeof options.read === 'function') this._read = options.read;

    EventEmitter.call(this);
  }

  // Manually shove something into the read() buffer.
  // This returns true if the highWaterMark has not been hit yet,
  // similar to how Writable.write() returns true if you should
  // write() some more.
  Readable.prototype.push = function (chunk, encoding) {
    var state = this._readableState;

    if (!state.objectMode && typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;
      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }
    }

    return readableAddChunk(this, state, chunk, encoding, false);
  };

  // Unshift should *always* be something directly out of read()
  Readable.prototype.unshift = function (chunk) {
    var state = this._readableState;
    return readableAddChunk(this, state, chunk, '', true);
  };

  Readable.prototype.isPaused = function () {
    return this._readableState.flowing === false;
  };

  function readableAddChunk(stream, state, chunk, encoding, addToFront) {
    var er = chunkInvalid(state, chunk);
    if (er) {
      stream.emit('error', er);
    } else if (chunk === null) {
      state.reading = false;
      onEofChunk(stream, state);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (state.ended && !addToFront) {
        var e = new Error('stream.push() after EOF');
        stream.emit('error', e);
      } else if (state.endEmitted && addToFront) {
        var _e = new Error('stream.unshift() after end event');
        stream.emit('error', _e);
      } else {
        var skipAdd;
        if (state.decoder && !addToFront && !encoding) {
          chunk = state.decoder.write(chunk);
          skipAdd = !state.objectMode && chunk.length === 0;
        }

        if (!addToFront) state.reading = false;

        // Don't add to the buffer if we've decoded to an empty string chunk and
        // we're not in object mode
        if (!skipAdd) {
          // if we want the data now, just emit it.
          if (state.flowing && state.length === 0 && !state.sync) {
            stream.emit('data', chunk);
            stream.read(0);
          } else {
            // update the buffer info.
            state.length += state.objectMode ? 1 : chunk.length;
            if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

            if (state.needReadable) emitReadable(stream);
          }
        }

        maybeReadMore(stream, state);
      }
    } else if (!addToFront) {
      state.reading = false;
    }

    return needMoreData(state);
  }

  // if it's past the high water mark, we can push in some more.
  // Also, if we have no data yet, we can stand some
  // more bytes.  This is to work around cases where hwm=0,
  // such as the repl.  Also, if the push() triggered a
  // readable event, and the user called read(largeNumber) such that
  // needReadable was set, then we ought to push more, so that another
  // 'readable' event will be triggered.
  function needMoreData(state) {
    return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
  }

  // backwards compatibility.
  Readable.prototype.setEncoding = function (enc) {
    this._readableState.decoder = new StringDecoder(enc);
    this._readableState.encoding = enc;
    return this;
  };

  // Don't raise the hwm > 8MB
  var MAX_HWM = 0x800000;
  function computeNewHighWaterMark(n) {
    if (n >= MAX_HWM) {
      n = MAX_HWM;
    } else {
      // Get the next highest power of 2 to prevent increasing hwm excessively in
      // tiny amounts
      n--;
      n |= n >>> 1;
      n |= n >>> 2;
      n |= n >>> 4;
      n |= n >>> 8;
      n |= n >>> 16;
      n++;
    }
    return n;
  }

  // This function is designed to be inlinable, so please take care when making
  // changes to the function body.
  function howMuchToRead(n, state) {
    if (n <= 0 || state.length === 0 && state.ended) return 0;
    if (state.objectMode) return 1;
    if (n !== n) {
      // Only flow one buffer at a time
      if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
    }
    // If we're asking for more than the current hwm, then raise the hwm.
    if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
    if (n <= state.length) return n;
    // Don't have enough
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    }
    return state.length;
  }

  // you can override either this method, or the async _read(n) below.
  Readable.prototype.read = function (n) {
    debug$2('read', n);
    n = parseInt(n, 10);
    var state = this._readableState;
    var nOrig = n;

    if (n !== 0) state.emittedReadable = false;

    // if we're doing read(0) to trigger a readable event, but we
    // already have a bunch of data in the buffer, then just trigger
    // the 'readable' event and move on.
    if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
      debug$2('read: emitReadable', state.length, state.ended);
      if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
      return null;
    }

    n = howMuchToRead(n, state);

    // if we've ended, and we're now clear, then finish it up.
    if (n === 0 && state.ended) {
      if (state.length === 0) endReadable(this);
      return null;
    }

    // All the actual chunk generation logic needs to be
    // *below* the call to _read.  The reason is that in certain
    // synthetic stream cases, such as passthrough streams, _read
    // may be a completely synchronous operation which may change
    // the state of the read buffer, providing enough data when
    // before there was *not* enough.
    //
    // So, the steps are:
    // 1. Figure out what the state of things will be after we do
    // a read from the buffer.
    //
    // 2. If that resulting state will trigger a _read, then call _read.
    // Note that this may be asynchronous, or synchronous.  Yes, it is
    // deeply ugly to write APIs this way, but that still doesn't mean
    // that the Readable class should behave improperly, as streams are
    // designed to be sync/async agnostic.
    // Take note if the _read call is sync or async (ie, if the read call
    // has returned yet), so that we know whether or not it's safe to emit
    // 'readable' etc.
    //
    // 3. Actually pull the requested chunks out of the buffer and return.

    // if we need a readable event, then we need to do some reading.
    var doRead = state.needReadable;
    debug$2('need readable', doRead);

    // if we currently have less than the highWaterMark, then also read some
    if (state.length === 0 || state.length - n < state.highWaterMark) {
      doRead = true;
      debug$2('length less than watermark', doRead);
    }

    // however, if we've ended, then there's no point, and if we're already
    // reading, then it's unnecessary.
    if (state.ended || state.reading) {
      doRead = false;
      debug$2('reading or ended', doRead);
    } else if (doRead) {
      debug$2('do read');
      state.reading = true;
      state.sync = true;
      // if the length is currently zero, then we *need* a readable event.
      if (state.length === 0) state.needReadable = true;
      // call internal read method
      this._read(state.highWaterMark);
      state.sync = false;
      // If _read pushed data synchronously, then `reading` will be false,
      // and we need to re-evaluate how much data we can return to the user.
      if (!state.reading) n = howMuchToRead(nOrig, state);
    }

    var ret;
    if (n > 0) ret = fromList(n, state);else ret = null;

    if (ret === null) {
      state.needReadable = true;
      n = 0;
    } else {
      state.length -= n;
    }

    if (state.length === 0) {
      // If we have nothing in the buffer, then we want to know
      // as soon as we *do* get something into the buffer.
      if (!state.ended) state.needReadable = true;

      // If we tried to read() past the EOF, then emit end on the next tick.
      if (nOrig !== n && state.ended) endReadable(this);
    }

    if (ret !== null) this.emit('data', ret);

    return ret;
  };

  function chunkInvalid(state, chunk) {
    var er = null;
    if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== null && chunk !== undefined && !state.objectMode) {
      er = new TypeError('Invalid non-string/buffer chunk');
    }
    return er;
  }

  function onEofChunk(stream, state) {
    if (state.ended) return;
    if (state.decoder) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) {
        state.buffer.push(chunk);
        state.length += state.objectMode ? 1 : chunk.length;
      }
    }
    state.ended = true;

    // emit 'readable' now to make sure it gets picked up.
    emitReadable(stream);
  }

  // Don't emit readable right away in sync mode, because this can trigger
  // another read() call => stack overflow.  This way, it might trigger
  // a nextTick recursion warning, but that's not so bad.
  function emitReadable(stream) {
    var state = stream._readableState;
    state.needReadable = false;
    if (!state.emittedReadable) {
      debug$2('emitReadable', state.flowing);
      state.emittedReadable = true;
      if (state.sync) nextTick(emitReadable_, stream);else emitReadable_(stream);
    }
  }

  function emitReadable_(stream) {
    debug$2('emit readable');
    stream.emit('readable');
    flow(stream);
  }

  // at this point, the user has presumably seen the 'readable' event,
  // and called read() to consume some data.  that may have triggered
  // in turn another _read(n) call, in which case reading = true if
  // it's in progress.
  // However, if we're not ended, or reading, and the length < hwm,
  // then go ahead and try to read some more preemptively.
  function maybeReadMore(stream, state) {
    if (!state.readingMore) {
      state.readingMore = true;
      nextTick(maybeReadMore_, stream, state);
    }
  }

  function maybeReadMore_(stream, state) {
    var len = state.length;
    while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
      debug$2('maybeReadMore read 0');
      stream.read(0);
      if (len === state.length)
        // didn't get any data, stop spinning.
        break;else len = state.length;
    }
    state.readingMore = false;
  }

  // abstract method.  to be overridden in specific implementation classes.
  // call cb(er, data) where data is <= n in length.
  // for virtual (non-string, non-buffer) streams, "length" is somewhat
  // arbitrary, and perhaps not very meaningful.
  Readable.prototype._read = function (n) {
    this.emit('error', new Error('not implemented'));
  };

  Readable.prototype.pipe = function (dest, pipeOpts) {
    var src = this;
    var state = this._readableState;

    switch (state.pipesCount) {
      case 0:
        state.pipes = dest;
        break;
      case 1:
        state.pipes = [state.pipes, dest];
        break;
      default:
        state.pipes.push(dest);
        break;
    }
    state.pipesCount += 1;
    debug$2('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

    var doEnd = (!pipeOpts || pipeOpts.end !== false);

    var endFn = doEnd ? onend : cleanup;
    if (state.endEmitted) nextTick(endFn);else src.once('end', endFn);

    dest.on('unpipe', onunpipe);
    function onunpipe(readable) {
      debug$2('onunpipe');
      if (readable === src) {
        cleanup();
      }
    }

    function onend() {
      debug$2('onend');
      dest.end();
    }

    // when the dest drains, it reduces the awaitDrain counter
    // on the source.  This would be more elegant with a .once()
    // handler in flow(), but adding and removing repeatedly is
    // too slow.
    var ondrain = pipeOnDrain(src);
    dest.on('drain', ondrain);

    var cleanedUp = false;
    function cleanup() {
      debug$2('cleanup');
      // cleanup event handlers once the pipe is broken
      dest.removeListener('close', onclose);
      dest.removeListener('finish', onfinish);
      dest.removeListener('drain', ondrain);
      dest.removeListener('error', onerror);
      dest.removeListener('unpipe', onunpipe);
      src.removeListener('end', onend);
      src.removeListener('end', cleanup);
      src.removeListener('data', ondata);

      cleanedUp = true;

      // if the reader is waiting for a drain event from this
      // specific writer, then it would cause it to never start
      // flowing again.
      // So, if this is awaiting a drain, then we just call it now.
      // If we don't know, then assume that we are waiting for one.
      if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
    }

    // If the user pushes more data while we're writing to dest then we'll end up
    // in ondata again. However, we only want to increase awaitDrain once because
    // dest will only emit one 'drain' event for the multiple writes.
    // => Introduce a guard on increasing awaitDrain.
    var increasedAwaitDrain = false;
    src.on('data', ondata);
    function ondata(chunk) {
      debug$2('ondata');
      increasedAwaitDrain = false;
      var ret = dest.write(chunk);
      if (false === ret && !increasedAwaitDrain) {
        // If the user unpiped during `dest.write()`, it is possible
        // to get stuck in a permanently paused state if that write
        // also returned false.
        // => Check whether `dest` is still a piping destination.
        if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
          debug$2('false write response, pause', src._readableState.awaitDrain);
          src._readableState.awaitDrain++;
          increasedAwaitDrain = true;
        }
        src.pause();
      }
    }

    // if the dest has an error, then stop piping into it.
    // however, don't suppress the throwing behavior for this.
    function onerror(er) {
      debug$2('onerror', er);
      unpipe();
      dest.removeListener('error', onerror);
      if (listenerCount(dest, 'error') === 0) dest.emit('error', er);
    }

    // Make sure our error handler is attached before userland ones.
    prependListener(dest, 'error', onerror);

    // Both close and finish should trigger unpipe, but only once.
    function onclose() {
      dest.removeListener('finish', onfinish);
      unpipe();
    }
    dest.once('close', onclose);
    function onfinish() {
      debug$2('onfinish');
      dest.removeListener('close', onclose);
      unpipe();
    }
    dest.once('finish', onfinish);

    function unpipe() {
      debug$2('unpipe');
      src.unpipe(dest);
    }

    // tell the dest that it's being piped to
    dest.emit('pipe', src);

    // start the flow if it hasn't been started already.
    if (!state.flowing) {
      debug$2('pipe resume');
      src.resume();
    }

    return dest;
  };

  function pipeOnDrain(src) {
    return function () {
      var state = src._readableState;
      debug$2('pipeOnDrain', state.awaitDrain);
      if (state.awaitDrain) state.awaitDrain--;
      if (state.awaitDrain === 0 && src.listeners('data').length) {
        state.flowing = true;
        flow(src);
      }
    };
  }

  Readable.prototype.unpipe = function (dest) {
    var state = this._readableState;

    // if we're not piping anywhere, then do nothing.
    if (state.pipesCount === 0) return this;

    // just one destination.  most common case.
    if (state.pipesCount === 1) {
      // passed in one, but it's not the right one.
      if (dest && dest !== state.pipes) return this;

      if (!dest) dest = state.pipes;

      // got a match.
      state.pipes = null;
      state.pipesCount = 0;
      state.flowing = false;
      if (dest) dest.emit('unpipe', this);
      return this;
    }

    // slow case. multiple pipe destinations.

    if (!dest) {
      // remove all.
      var dests = state.pipes;
      var len = state.pipesCount;
      state.pipes = null;
      state.pipesCount = 0;
      state.flowing = false;

      for (var _i = 0; _i < len; _i++) {
        dests[_i].emit('unpipe', this);
      }return this;
    }

    // try to find the right one.
    var i = indexOf(state.pipes, dest);
    if (i === -1) return this;

    state.pipes.splice(i, 1);
    state.pipesCount -= 1;
    if (state.pipesCount === 1) state.pipes = state.pipes[0];

    dest.emit('unpipe', this);

    return this;
  };

  // set up data events if they are asked for
  // Ensure readable listeners eventually get something
  Readable.prototype.on = function (ev, fn) {
    var res = EventEmitter.prototype.on.call(this, ev, fn);

    if (ev === 'data') {
      // Start flowing on next tick if stream isn't explicitly paused
      if (this._readableState.flowing !== false) this.resume();
    } else if (ev === 'readable') {
      var state = this._readableState;
      if (!state.endEmitted && !state.readableListening) {
        state.readableListening = state.needReadable = true;
        state.emittedReadable = false;
        if (!state.reading) {
          nextTick(nReadingNextTick, this);
        } else if (state.length) {
          emitReadable(this);
        }
      }
    }

    return res;
  };
  Readable.prototype.addListener = Readable.prototype.on;

  function nReadingNextTick(self) {
    debug$2('readable nexttick read 0');
    self.read(0);
  }

  // pause() and resume() are remnants of the legacy readable stream API
  // If the user uses them, then switch into old mode.
  Readable.prototype.resume = function () {
    var state = this._readableState;
    if (!state.flowing) {
      debug$2('resume');
      state.flowing = true;
      resume(this, state);
    }
    return this;
  };

  function resume(stream, state) {
    if (!state.resumeScheduled) {
      state.resumeScheduled = true;
      nextTick(resume_, stream, state);
    }
  }

  function resume_(stream, state) {
    if (!state.reading) {
      debug$2('resume read 0');
      stream.read(0);
    }

    state.resumeScheduled = false;
    state.awaitDrain = 0;
    stream.emit('resume');
    flow(stream);
    if (state.flowing && !state.reading) stream.read(0);
  }

  Readable.prototype.pause = function () {
    debug$2('call pause flowing=%j', this._readableState.flowing);
    if (false !== this._readableState.flowing) {
      debug$2('pause');
      this._readableState.flowing = false;
      this.emit('pause');
    }
    return this;
  };

  function flow(stream) {
    var state = stream._readableState;
    debug$2('flow', state.flowing);
    while (state.flowing && stream.read() !== null) {}
  }

  // wrap an old-style stream as the async data source.
  // This is *not* part of the readable stream interface.
  // It is an ugly unfortunate mess of history.
  Readable.prototype.wrap = function (stream) {
    var state = this._readableState;
    var paused = false;

    var self = this;
    stream.on('end', function () {
      debug$2('wrapped end');
      if (state.decoder && !state.ended) {
        var chunk = state.decoder.end();
        if (chunk && chunk.length) self.push(chunk);
      }

      self.push(null);
    });

    stream.on('data', function (chunk) {
      debug$2('wrapped data');
      if (state.decoder) chunk = state.decoder.write(chunk);

      // don't skip over falsy values in objectMode
      if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

      var ret = self.push(chunk);
      if (!ret) {
        paused = true;
        stream.pause();
      }
    });

    // proxy all the other methods.
    // important when wrapping filters and duplexes.
    for (var i in stream) {
      if (this[i] === undefined && typeof stream[i] === 'function') {
        this[i] = function (method) {
          return function () {
            return stream[method].apply(stream, arguments);
          };
        }(i);
      }
    }

    // proxy certain important events.
    var events = ['error', 'close', 'destroy', 'pause', 'resume'];
    forEach(events, function (ev) {
      stream.on(ev, self.emit.bind(self, ev));
    });

    // when we try to consume some more bytes, simply unpause the
    // underlying stream.
    self._read = function (n) {
      debug$2('wrapped _read', n);
      if (paused) {
        paused = false;
        stream.resume();
      }
    };

    return self;
  };

  // exposed for testing purposes only.
  Readable._fromList = fromList;

  // Pluck off n bytes from an array of buffers.
  // Length is the combined lengths of all the buffers in the list.
  // This function is designed to be inlinable, so please take care when making
  // changes to the function body.
  function fromList(n, state) {
    // nothing buffered
    if (state.length === 0) return null;

    var ret;
    if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
      // read it all, truncate the list
      if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
      state.buffer.clear();
    } else {
      // read part of list
      ret = fromListPartial(n, state.buffer, state.decoder);
    }

    return ret;
  }

  // Extracts only enough buffered data to satisfy the amount requested.
  // This function is designed to be inlinable, so please take care when making
  // changes to the function body.
  function fromListPartial(n, list, hasStrings) {
    var ret;
    if (n < list.head.data.length) {
      // slice is the same for buffers and strings
      ret = list.head.data.slice(0, n);
      list.head.data = list.head.data.slice(n);
    } else if (n === list.head.data.length) {
      // first chunk is a perfect match
      ret = list.shift();
    } else {
      // result spans more than one buffer
      ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
    }
    return ret;
  }

  // Copies a specified amount of characters from the list of buffered data
  // chunks.
  // This function is designed to be inlinable, so please take care when making
  // changes to the function body.
  function copyFromBufferString(n, list) {
    var p = list.head;
    var c = 1;
    var ret = p.data;
    n -= ret.length;
    while (p = p.next) {
      var str = p.data;
      var nb = n > str.length ? str.length : n;
      if (nb === str.length) ret += str;else ret += str.slice(0, n);
      n -= nb;
      if (n === 0) {
        if (nb === str.length) {
          ++c;
          if (p.next) list.head = p.next;else list.head = list.tail = null;
        } else {
          list.head = p;
          p.data = str.slice(nb);
        }
        break;
      }
      ++c;
    }
    list.length -= c;
    return ret;
  }

  // Copies a specified amount of bytes from the list of buffered data chunks.
  // This function is designed to be inlinable, so please take care when making
  // changes to the function body.
  function copyFromBuffer(n, list) {
    var ret = Buffer.allocUnsafe(n);
    var p = list.head;
    var c = 1;
    p.data.copy(ret);
    n -= p.data.length;
    while (p = p.next) {
      var buf = p.data;
      var nb = n > buf.length ? buf.length : n;
      buf.copy(ret, ret.length - n, 0, nb);
      n -= nb;
      if (n === 0) {
        if (nb === buf.length) {
          ++c;
          if (p.next) list.head = p.next;else list.head = list.tail = null;
        } else {
          list.head = p;
          p.data = buf.slice(nb);
        }
        break;
      }
      ++c;
    }
    list.length -= c;
    return ret;
  }

  function endReadable(stream) {
    var state = stream._readableState;

    // If we get here before consuming all the bytes, then that is a
    // bug in node.  Should never happen.
    if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

    if (!state.endEmitted) {
      state.ended = true;
      nextTick(endReadableNT, state, stream);
    }
  }

  function endReadableNT(state, stream) {
    // Check that we didn't get one last unshift.
    if (!state.endEmitted && state.length === 0) {
      state.endEmitted = true;
      stream.readable = false;
      stream.emit('end');
    }
  }

  function forEach(xs, f) {
    for (var i = 0, l = xs.length; i < l; i++) {
      f(xs[i], i);
    }
  }

  function indexOf(xs, x) {
    for (var i = 0, l = xs.length; i < l; i++) {
      if (xs[i] === x) return i;
    }
    return -1;
  }

  // A bit simpler than readable streams.
  // Implement an async ._write(chunk, encoding, cb), and it'll handle all
  // the drain event emission and buffering.

  Writable.WritableState = WritableState;
  inherits(Writable, EventEmitter);

  function nop() {}

  function WriteReq(chunk, encoding, cb) {
    this.chunk = chunk;
    this.encoding = encoding;
    this.callback = cb;
    this.next = null;
  }

  function WritableState(options, stream) {
    Object.defineProperty(this, 'buffer', {
      get: deprecate(function () {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.')
    });
    options = options || {};

    // object stream flag to indicate whether or not this stream
    // contains buffers or objects.
    this.objectMode = !!options.objectMode;

    if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

    // the point at which write() starts returning false
    // Note: 0 is a valid value, means that we always return false if
    // the entire buffer is not flushed immediately on write()
    var hwm = options.highWaterMark;
    var defaultHwm = this.objectMode ? 16 : 16 * 1024;
    this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

    // cast to ints.
    this.highWaterMark = ~ ~this.highWaterMark;

    this.needDrain = false;
    // at the start of calling end()
    this.ending = false;
    // when end() has been called, and returned
    this.ended = false;
    // when 'finish' is emitted
    this.finished = false;

    // should we decode strings into buffers before passing to _write?
    // this is here so that some node-core streams can optimize string
    // handling at a lower level.
    var noDecode = options.decodeStrings === false;
    this.decodeStrings = !noDecode;

    // Crypto is kind of old and crusty.  Historically, its default string
    // encoding is 'binary' so we have to make this configurable.
    // Everything else in the universe uses 'utf8', though.
    this.defaultEncoding = options.defaultEncoding || 'utf8';

    // not an actual buffer we keep track of, but a measurement
    // of how much we're waiting to get pushed to some underlying
    // socket or file.
    this.length = 0;

    // a flag to see when we're in the middle of a write.
    this.writing = false;

    // when true all writes will be buffered until .uncork() call
    this.corked = 0;

    // a flag to be able to tell if the onwrite cb is called immediately,
    // or on a later tick.  We set this to true at first, because any
    // actions that shouldn't happen until "later" should generally also
    // not happen before the first write call.
    this.sync = true;

    // a flag to know if we're processing previously buffered items, which
    // may call the _write() callback in the same tick, so that we don't
    // end up in an overlapped onwrite situation.
    this.bufferProcessing = false;

    // the callback that's passed to _write(chunk,cb)
    this.onwrite = function (er) {
      onwrite(stream, er);
    };

    // the callback that the user supplies to write(chunk,encoding,cb)
    this.writecb = null;

    // the amount that is being written when _write is called.
    this.writelen = 0;

    this.bufferedRequest = null;
    this.lastBufferedRequest = null;

    // number of pending user-supplied write callbacks
    // this must be 0 before 'finish' can be emitted
    this.pendingcb = 0;

    // emit prefinish if the only thing we're waiting for is _write cbs
    // This is relevant for synchronous Transform streams
    this.prefinished = false;

    // True if the error was already emitted and should not be thrown again
    this.errorEmitted = false;

    // count buffered requests
    this.bufferedRequestCount = 0;

    // allocate the first CorkedRequest, there is always
    // one allocated and free to use, and we maintain at most two
    this.corkedRequestsFree = new CorkedRequest(this);
  }

  WritableState.prototype.getBuffer = function writableStateGetBuffer() {
    var current = this.bufferedRequest;
    var out = [];
    while (current) {
      out.push(current);
      current = current.next;
    }
    return out;
  };
  function Writable(options) {

    // Writable ctor is applied to Duplexes, though they're not
    // instanceof Writable, they're instanceof Readable.
    if (!(this instanceof Writable) && !(this instanceof Duplex)) return new Writable(options);

    this._writableState = new WritableState(options, this);

    // legacy.
    this.writable = true;

    if (options) {
      if (typeof options.write === 'function') this._write = options.write;

      if (typeof options.writev === 'function') this._writev = options.writev;
    }

    EventEmitter.call(this);
  }

  // Otherwise people can pipe Writable streams, which is just wrong.
  Writable.prototype.pipe = function () {
    this.emit('error', new Error('Cannot pipe, not readable'));
  };

  function writeAfterEnd(stream, cb) {
    var er = new Error('write after end');
    // TODO: defer error events consistently everywhere, not just the cb
    stream.emit('error', er);
    nextTick(cb, er);
  }

  // If we get something that is not a buffer, string, null, or undefined,
  // and we're not in objectMode, then that's an error.
  // Otherwise stream chunks are all considered to be of length=1, and the
  // watermarks determine how many objects to keep in the buffer, rather than
  // how many bytes or characters.
  function validChunk(stream, state, chunk, cb) {
    var valid = true;
    var er = false;
    // Always throw error if a null is written
    // if we are not in object mode then throw
    // if it is not a buffer, string, or undefined.
    if (chunk === null) {
      er = new TypeError('May not write null values to stream');
    } else if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
      er = new TypeError('Invalid non-string/buffer chunk');
    }
    if (er) {
      stream.emit('error', er);
      nextTick(cb, er);
      valid = false;
    }
    return valid;
  }

  Writable.prototype.write = function (chunk, encoding, cb) {
    var state = this._writableState;
    var ret = false;

    if (typeof encoding === 'function') {
      cb = encoding;
      encoding = null;
    }

    if (Buffer.isBuffer(chunk)) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

    if (typeof cb !== 'function') cb = nop;

    if (state.ended) writeAfterEnd(this, cb);else if (validChunk(this, state, chunk, cb)) {
      state.pendingcb++;
      ret = writeOrBuffer(this, state, chunk, encoding, cb);
    }

    return ret;
  };

  Writable.prototype.cork = function () {
    var state = this._writableState;

    state.corked++;
  };

  Writable.prototype.uncork = function () {
    var state = this._writableState;

    if (state.corked) {
      state.corked--;

      if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
    }
  };

  Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
    // node::ParseEncoding() requires lower case.
    if (typeof encoding === 'string') encoding = encoding.toLowerCase();
    if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
    this._writableState.defaultEncoding = encoding;
    return this;
  };

  function decodeChunk(state, chunk, encoding) {
    if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
      chunk = Buffer.from(chunk, encoding);
    }
    return chunk;
  }

  // if we're already writing something, then just put this
  // in the queue, and wait our turn.  Otherwise, call _write
  // If we return false, then we need a drain event, so set that flag.
  function writeOrBuffer(stream, state, chunk, encoding, cb) {
    chunk = decodeChunk(state, chunk, encoding);

    if (Buffer.isBuffer(chunk)) encoding = 'buffer';
    var len = state.objectMode ? 1 : chunk.length;

    state.length += len;

    var ret = state.length < state.highWaterMark;
    // we must ensure that previous needDrain will not be reset to false.
    if (!ret) state.needDrain = true;

    if (state.writing || state.corked) {
      var last = state.lastBufferedRequest;
      state.lastBufferedRequest = new WriteReq(chunk, encoding, cb);
      if (last) {
        last.next = state.lastBufferedRequest;
      } else {
        state.bufferedRequest = state.lastBufferedRequest;
      }
      state.bufferedRequestCount += 1;
    } else {
      doWrite(stream, state, false, len, chunk, encoding, cb);
    }

    return ret;
  }

  function doWrite(stream, state, writev, len, chunk, encoding, cb) {
    state.writelen = len;
    state.writecb = cb;
    state.writing = true;
    state.sync = true;
    if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
    state.sync = false;
  }

  function onwriteError(stream, state, sync, er, cb) {
    --state.pendingcb;
    if (sync) nextTick(cb, er);else cb(er);

    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
  }

  function onwriteStateUpdate(state) {
    state.writing = false;
    state.writecb = null;
    state.length -= state.writelen;
    state.writelen = 0;
  }

  function onwrite(stream, er) {
    var state = stream._writableState;
    var sync = state.sync;
    var cb = state.writecb;

    onwriteStateUpdate(state);

    if (er) onwriteError(stream, state, sync, er, cb);else {
      // Check if we're actually ready to finish, but don't emit yet
      var finished = needFinish(state);

      if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
        clearBuffer(stream, state);
      }

      if (sync) {
        /*<replacement>*/
          nextTick(afterWrite, stream, state, finished, cb);
        /*</replacement>*/
      } else {
          afterWrite(stream, state, finished, cb);
        }
    }
  }

  function afterWrite(stream, state, finished, cb) {
    if (!finished) onwriteDrain(stream, state);
    state.pendingcb--;
    cb();
    finishMaybe(stream, state);
  }

  // Must force callback to be called on nextTick, so that we don't
  // emit 'drain' before the write() consumer gets the 'false' return
  // value, and has a chance to attach a 'drain' listener.
  function onwriteDrain(stream, state) {
    if (state.length === 0 && state.needDrain) {
      state.needDrain = false;
      stream.emit('drain');
    }
  }

  // if there's something in the buffer waiting, then process it
  function clearBuffer(stream, state) {
    state.bufferProcessing = true;
    var entry = state.bufferedRequest;

    if (stream._writev && entry && entry.next) {
      // Fast case, write everything using _writev()
      var l = state.bufferedRequestCount;
      var buffer = new Array(l);
      var holder = state.corkedRequestsFree;
      holder.entry = entry;

      var count = 0;
      while (entry) {
        buffer[count] = entry;
        entry = entry.next;
        count += 1;
      }

      doWrite(stream, state, true, state.length, buffer, '', holder.finish);

      // doWrite is almost always async, defer these to save a bit of time
      // as the hot path ends with doWrite
      state.pendingcb++;
      state.lastBufferedRequest = null;
      if (holder.next) {
        state.corkedRequestsFree = holder.next;
        holder.next = null;
      } else {
        state.corkedRequestsFree = new CorkedRequest(state);
      }
    } else {
      // Slow case, write chunks one-by-one
      while (entry) {
        var chunk = entry.chunk;
        var encoding = entry.encoding;
        var cb = entry.callback;
        var len = state.objectMode ? 1 : chunk.length;

        doWrite(stream, state, false, len, chunk, encoding, cb);
        entry = entry.next;
        // if we didn't call the onwrite immediately, then
        // it means that we need to wait until it does.
        // also, that means that the chunk and cb are currently
        // being processed, so move the buffer counter past them.
        if (state.writing) {
          break;
        }
      }

      if (entry === null) state.lastBufferedRequest = null;
    }

    state.bufferedRequestCount = 0;
    state.bufferedRequest = entry;
    state.bufferProcessing = false;
  }

  Writable.prototype._write = function (chunk, encoding, cb) {
    cb(new Error('not implemented'));
  };

  Writable.prototype._writev = null;

  Writable.prototype.end = function (chunk, encoding, cb) {
    var state = this._writableState;

    if (typeof chunk === 'function') {
      cb = chunk;
      chunk = null;
      encoding = null;
    } else if (typeof encoding === 'function') {
      cb = encoding;
      encoding = null;
    }

    if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

    // .end() fully uncorks
    if (state.corked) {
      state.corked = 1;
      this.uncork();
    }

    // ignore unnecessary end() calls.
    if (!state.ending && !state.finished) endWritable(this, state, cb);
  };

  function needFinish(state) {
    return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
  }

  function prefinish(stream, state) {
    if (!state.prefinished) {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }

  function finishMaybe(stream, state) {
    var need = needFinish(state);
    if (need) {
      if (state.pendingcb === 0) {
        prefinish(stream, state);
        state.finished = true;
        stream.emit('finish');
      } else {
        prefinish(stream, state);
      }
    }
    return need;
  }

  function endWritable(stream, state, cb) {
    state.ending = true;
    finishMaybe(stream, state);
    if (cb) {
      if (state.finished) nextTick(cb);else stream.once('finish', cb);
    }
    state.ended = true;
    stream.writable = false;
  }

  // It seems a linked list but it is not
  // there will be only 2 of these for each stream
  function CorkedRequest(state) {
    var _this = this;

    this.next = null;
    this.entry = null;

    this.finish = function (err) {
      var entry = _this.entry;
      _this.entry = null;
      while (entry) {
        var cb = entry.callback;
        state.pendingcb--;
        cb(err);
        entry = entry.next;
      }
      if (state.corkedRequestsFree) {
        state.corkedRequestsFree.next = _this;
      } else {
        state.corkedRequestsFree = _this;
      }
    };
  }

  inherits(Duplex, Readable);

  var keys = Object.keys(Writable.prototype);
  for (var v = 0; v < keys.length; v++) {
    var method = keys[v];
    if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
  }
  function Duplex(options) {
    if (!(this instanceof Duplex)) return new Duplex(options);

    Readable.call(this, options);
    Writable.call(this, options);

    if (options && options.readable === false) this.readable = false;

    if (options && options.writable === false) this.writable = false;

    this.allowHalfOpen = true;
    if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

    this.once('end', onend);
  }

  // the no-half-open enforcer
  function onend() {
    // if we allow half-open state, or if the writable side ended,
    // then we're ok.
    if (this.allowHalfOpen || this._writableState.ended) return;

    // no more data can be written.
    // But allow more writes to happen in this tick.
    nextTick(onEndNT, this);
  }

  function onEndNT(self) {
    self.end();
  }

  // a transform stream is a readable/writable stream where you do
  // something with the data.  Sometimes it's called a "filter",
  // but that's not a great name for it, since that implies a thing where
  // some bits pass through, and others are simply ignored.  (That would
  // be a valid example of a transform, of course.)
  //
  // While the output is causally related to the input, it's not a
  // necessarily symmetric or synchronous transformation.  For example,
  // a zlib stream might take multiple plain-text writes(), and then
  // emit a single compressed chunk some time in the future.
  //
  // Here's how this works:
  //
  // The Transform stream has all the aspects of the readable and writable
  // stream classes.  When you write(chunk), that calls _write(chunk,cb)
  // internally, and returns false if there's a lot of pending writes
  // buffered up.  When you call read(), that calls _read(n) until
  // there's enough pending readable data buffered up.
  //
  // In a transform stream, the written data is placed in a buffer.  When
  // _read(n) is called, it transforms the queued up data, calling the
  // buffered _write cb's as it consumes chunks.  If consuming a single
  // written chunk would result in multiple output chunks, then the first
  // outputted bit calls the readcb, and subsequent chunks just go into
  // the read buffer, and will cause it to emit 'readable' if necessary.
  //
  // This way, back-pressure is actually determined by the reading side,
  // since _read has to be called to start processing a new chunk.  However,
  // a pathological inflate type of transform can cause excessive buffering
  // here.  For example, imagine a stream where every byte of input is
  // interpreted as an integer from 0-255, and then results in that many
  // bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
  // 1kb of data being output.  In this case, you could write a very small
  // amount of input, and end up with a very large amount of output.  In
  // such a pathological inflating mechanism, there'd be no way to tell
  // the system to stop doing the transform.  A single 4MB write could
  // cause the system to run out of memory.
  //
  // However, even in such a pathological case, only a single written chunk
  // would be consumed, and then the rest would wait (un-transformed) until
  // the results of the previous transformed chunk were consumed.

  inherits(Transform, Duplex);

  function TransformState(stream) {
    this.afterTransform = function (er, data) {
      return afterTransform(stream, er, data);
    };

    this.needTransform = false;
    this.transforming = false;
    this.writecb = null;
    this.writechunk = null;
    this.writeencoding = null;
  }

  function afterTransform(stream, er, data) {
    var ts = stream._transformState;
    ts.transforming = false;

    var cb = ts.writecb;

    if (!cb) return stream.emit('error', new Error('no writecb in Transform class'));

    ts.writechunk = null;
    ts.writecb = null;

    if (data !== null && data !== undefined) stream.push(data);

    cb(er);

    var rs = stream._readableState;
    rs.reading = false;
    if (rs.needReadable || rs.length < rs.highWaterMark) {
      stream._read(rs.highWaterMark);
    }
  }
  function Transform(options) {
    if (!(this instanceof Transform)) return new Transform(options);

    Duplex.call(this, options);

    this._transformState = new TransformState(this);

    // when the writable side finishes, then flush out anything remaining.
    var stream = this;

    // start out asking for a readable event once data is transformed.
    this._readableState.needReadable = true;

    // we have implemented the _read method, and done the other things
    // that Readable wants before the first _read call, so unset the
    // sync guard flag.
    this._readableState.sync = false;

    if (options) {
      if (typeof options.transform === 'function') this._transform = options.transform;

      if (typeof options.flush === 'function') this._flush = options.flush;
    }

    this.once('prefinish', function () {
      if (typeof this._flush === 'function') this._flush(function (er) {
        done(stream, er);
      });else done(stream);
    });
  }

  Transform.prototype.push = function (chunk, encoding) {
    this._transformState.needTransform = false;
    return Duplex.prototype.push.call(this, chunk, encoding);
  };

  // This is the part where you do stuff!
  // override this function in implementation classes.
  // 'chunk' is an input chunk.
  //
  // Call `push(newChunk)` to pass along transformed output
  // to the readable side.  You may call 'push' zero or more times.
  //
  // Call `cb(err)` when you are done with this chunk.  If you pass
  // an error, then that'll put the hurt on the whole operation.  If you
  // never call cb(), then you'll never get another chunk.
  Transform.prototype._transform = function (chunk, encoding, cb) {
    throw new Error('Not implemented');
  };

  Transform.prototype._write = function (chunk, encoding, cb) {
    var ts = this._transformState;
    ts.writecb = cb;
    ts.writechunk = chunk;
    ts.writeencoding = encoding;
    if (!ts.transforming) {
      var rs = this._readableState;
      if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
    }
  };

  // Doesn't matter what the args are here.
  // _transform does all the work.
  // That we got here means that the readable side wants more data.
  Transform.prototype._read = function (n) {
    var ts = this._transformState;

    if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
      ts.transforming = true;
      this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
    } else {
      // mark that we need a transform, so that any data that comes in
      // will get processed, now that we've asked for it.
      ts.needTransform = true;
    }
  };

  function done(stream, er) {
    if (er) return stream.emit('error', er);

    // if there's nothing in the write buffer, then that means
    // that nothing more will ever be provided
    var ws = stream._writableState;
    var ts = stream._transformState;

    if (ws.length) throw new Error('Calling transform done when ws.length != 0');

    if (ts.transforming) throw new Error('Calling transform done when still transforming');

    return stream.push(null);
  }

  inherits(PassThrough, Transform);
  function PassThrough(options) {
    if (!(this instanceof PassThrough)) return new PassThrough(options);

    Transform.call(this, options);
  }

  PassThrough.prototype._transform = function (chunk, encoding, cb) {
    cb(null, chunk);
  };

  inherits(Stream, EventEmitter);
  Stream.Readable = Readable;
  Stream.Writable = Writable;
  Stream.Duplex = Duplex;
  Stream.Transform = Transform;
  Stream.PassThrough = PassThrough;

  // Backwards-compat with node 0.4.x
  Stream.Stream = Stream;

  // old-style streams.  Note that the pipe method (the only relevant
  // part of this class) is overridden in the Readable class.

  function Stream() {
    EventEmitter.call(this);
  }

  Stream.prototype.pipe = function(dest, options) {
    var source = this;

    function ondata(chunk) {
      if (dest.writable) {
        if (false === dest.write(chunk) && source.pause) {
          source.pause();
        }
      }
    }

    source.on('data', ondata);

    function ondrain() {
      if (source.readable && source.resume) {
        source.resume();
      }
    }

    dest.on('drain', ondrain);

    // If the 'end' option is not supplied, dest.end() will be called when
    // source gets the 'end' or 'close' events.  Only dest.end() once.
    if (!dest._isStdio && (!options || options.end !== false)) {
      source.on('end', onend);
      source.on('close', onclose);
    }

    var didOnEnd = false;
    function onend() {
      if (didOnEnd) return;
      didOnEnd = true;

      dest.end();
    }


    function onclose() {
      if (didOnEnd) return;
      didOnEnd = true;

      if (typeof dest.destroy === 'function') dest.destroy();
    }

    // don't leave dangling pipes when there are errors.
    function onerror(er) {
      cleanup();
      if (EventEmitter.listenerCount(this, 'error') === 0) {
        throw er; // Unhandled stream error in pipe.
      }
    }

    source.on('error', onerror);
    dest.on('error', onerror);

    // remove all the event listeners that were added.
    function cleanup() {
      source.removeListener('data', ondata);
      dest.removeListener('drain', ondrain);

      source.removeListener('end', onend);
      source.removeListener('close', onclose);

      source.removeListener('error', onerror);
      dest.removeListener('error', onerror);

      source.removeListener('end', cleanup);
      source.removeListener('close', cleanup);

      dest.removeListener('close', cleanup);
    }

    source.on('end', cleanup);
    source.on('close', cleanup);

    dest.on('close', cleanup);

    dest.emit('pipe', source);

    // Allow for unix-like usage: A.pipe(B).pipe(C)
    return dest;
  };

  var _polyfillNode_stream = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Duplex: Duplex,
    PassThrough: PassThrough,
    Readable: Readable,
    Stream: Stream,
    Transform: Transform,
    Writable: Writable,
    default: Stream
  });

  var require$$0$3 = /*@__PURE__*/getAugmentedNamespace(_polyfillNode_stream);

  var require$$1$3 = /*@__PURE__*/getAugmentedNamespace(_polyfillNode_util);

  var browserStdout;
  var hasRequiredBrowserStdout;

  function requireBrowserStdout () {
  	if (hasRequiredBrowserStdout) return browserStdout;
  	hasRequiredBrowserStdout = 1;
  	var WritableStream = require$$0$3.Writable;
  	var inherits = require$$1$3.inherits;

  	browserStdout = BrowserStdout;


  	inherits(BrowserStdout, WritableStream);

  	function BrowserStdout(opts) {
  	  if (!(this instanceof BrowserStdout)) return new BrowserStdout(opts)

  	  opts = opts || {};
  	  WritableStream.call(this, opts);
  	  this.label = (opts.label !== undefined) ? opts.label : 'stdout';
  	}

  	BrowserStdout.prototype._write = function(chunks, encoding, cb) {
  	  var output = chunks.toString ? chunks.toString() : chunks;
  	  if (this.label === false) {
  	    console.log(output);
  	  } else {
  	    console.log(this.label+':', output);
  	  }
  	  browser$1$1.nextTick(cb);
  	};
  	return browserStdout;
  }

  var browserStdoutExports = requireBrowserStdout();
  var BrowserStdout = /*@__PURE__*/getDefaultExportFromCjs(browserStdoutExports);

  /**
   * Parse the given `qs`.
   *
   * @private
   * @param {string} qs
   * @return {Object<string, string>}
   */
  function parseQuery(qs) {
    return qs
      .replace("?", "")
      .split("&")
      .reduce(function (obj, pair) {
        var i = pair.indexOf("=");
        var key = pair.slice(0, i);
        var val = pair.slice(i + 1);

        // Due to how the URLSearchParams API treats spaces
        obj[key] = decodeURIComponent(val.replace(/\+/g, "%20"));

        return obj;
      }, {});
  }

  /**
   * Highlight the given string of `js`.
   *
   * @private
   * @param {string} js
   * @return {string}
   */
  function highlight(js) {
    return js
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\/\/(.*)/gm, '<span class="comment">//$1</span>')
      .replace(/('.*?')/gm, '<span class="string">$1</span>')
      .replace(/(\d+\.\d+)/gm, '<span class="number">$1</span>')
      .replace(/(\d+)/gm, '<span class="number">$1</span>')
      .replace(
        /\bnew[ \t]+(\w+)/gm,
        '<span class="keyword">new</span> <span class="init">$1</span>',
      )
      .replace(
        /\b(function|new|throw|return|var|if|else)\b/gm,
        '<span class="keyword">$1</span>',
      );
  }

  /**
   * Highlight the contents of tag `name`.
   *
   * @private
   * @param {string} name
   */
  function highlightTags(name) {
    var code = document.getElementById("mocha").getElementsByTagName(name);
    for (var i = 0, len = code.length; i < len; ++i) {
      code[i].innerHTML = highlight(code[i].innerHTML);
    }
  }

  function commonjsRequire(path) {
  	throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
  }

  var mocha$1 = {exports: {}};

  // @ts-check

  /**
   * Escapes special characters in a string to make it safe for use in regular expressions.
   *
   * @param {string} value - The string to escape
   * @returns {string} The escaped string safe for use in regular expressions
   */
  function escapeRegExp(value) {
    // TODO [engine:node@>=24]: Replace with built in RegExp.escape()
    return value
      .replaceAll(/[|\\{}()[\]^$+*?.]/g, "\\$&")
      .replaceAll("-", "\\x2d");
  }

  var regexp = /*#__PURE__*/Object.freeze({
    __proto__: null,
    escapeRegExp: escapeRegExp
  });

  var require$$0$2 = /*@__PURE__*/getAugmentedNamespace(regexp);

  // Copyright Joyent, Inc. and other Node contributors.
  //
  // Permission is hereby granted, free of charge, to any person obtaining a
  // copy of this software and associated documentation files (the
  // "Software"), to deal in the Software without restriction, including
  // without limitation the rights to use, copy, modify, merge, publish,
  // distribute, sublicense, and/or sell copies of the Software, and to permit
  // persons to whom the Software is furnished to do so, subject to the
  // following conditions:
  //
  // The above copyright notice and this permission notice shall be included
  // in all copies or substantial portions of the Software.
  //
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
  // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
  // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
  // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
  // USE OR OTHER DEALINGS IN THE SOFTWARE.

  // resolves . and .. elements in a path array with directory names there
  // must be no slashes, empty elements, or device names (c:\) in the array
  // (so also no leading and trailing slashes - it does not distinguish
  // relative and absolute paths)
  function normalizeArray(parts, allowAboveRoot) {
    // if the path tries to go above the root, `up` ends up > 0
    var up = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
      var last = parts[i];
      if (last === '.') {
        parts.splice(i, 1);
      } else if (last === '..') {
        parts.splice(i, 1);
        up++;
      } else if (up) {
        parts.splice(i, 1);
        up--;
      }
    }

    // if the path is allowed to go above the root, restore leading ..s
    if (allowAboveRoot) {
      for (; up--; up) {
        parts.unshift('..');
      }
    }

    return parts;
  }

  // Split a filename into [root, dir, basename, ext], unix version
  // 'root' is just a slash, or nothing.
  var splitPathRe =
      /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
  var splitPath = function(filename) {
    return splitPathRe.exec(filename).slice(1);
  };

  // path.resolve([from ...], to)
  // posix version
  function resolve() {
    var resolvedPath = '',
        resolvedAbsolute = false;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path = (i >= 0) ? arguments[i] : '/';

      // Skip empty and invalid entries
      if (typeof path !== 'string') {
        throw new TypeError('Arguments to path.resolve must be strings');
      } else if (!path) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charAt(0) === '/';
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
      return !!p;
    }), !resolvedAbsolute).join('/');

    return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
  }
  // path.normalize(path)
  // posix version
  function normalize(path) {
    var isPathAbsolute = isAbsolute(path),
        trailingSlash = substr(path, -1) === '/';

    // Normalize the path
    path = normalizeArray(filter(path.split('/'), function(p) {
      return !!p;
    }), !isPathAbsolute).join('/');

    if (!path && !isPathAbsolute) {
      path = '.';
    }
    if (path && trailingSlash) {
      path += '/';
    }

    return (isPathAbsolute ? '/' : '') + path;
  }
  // posix version
  function isAbsolute(path) {
    return path.charAt(0) === '/';
  }

  // posix version
  function join() {
    var paths = Array.prototype.slice.call(arguments, 0);
    return normalize(filter(paths, function(p, index) {
      if (typeof p !== 'string') {
        throw new TypeError('Arguments to path.join must be strings');
      }
      return p;
    }).join('/'));
  }


  // path.relative(from, to)
  // posix version
  function relative(from, to) {
    from = resolve(from).substr(1);
    to = resolve(to).substr(1);

    function trim(arr) {
      var start = 0;
      for (; start < arr.length; start++) {
        if (arr[start] !== '') break;
      }

      var end = arr.length - 1;
      for (; end >= 0; end--) {
        if (arr[end] !== '') break;
      }

      if (start > end) return [];
      return arr.slice(start, end - start + 1);
    }

    var fromParts = trim(from.split('/'));
    var toParts = trim(to.split('/'));

    var length = Math.min(fromParts.length, toParts.length);
    var samePartsLength = length;
    for (var i = 0; i < length; i++) {
      if (fromParts[i] !== toParts[i]) {
        samePartsLength = i;
        break;
      }
    }

    var outputParts = [];
    for (var i = samePartsLength; i < fromParts.length; i++) {
      outputParts.push('..');
    }

    outputParts = outputParts.concat(toParts.slice(samePartsLength));

    return outputParts.join('/');
  }

  var sep = '/';
  var delimiter = ':';

  function dirname(path) {
    var result = splitPath(path),
        root = result[0],
        dir = result[1];

    if (!root && !dir) {
      // No dirname whatsoever
      return '.';
    }

    if (dir) {
      // It has a dirname, strip trailing slash
      dir = dir.substr(0, dir.length - 1);
    }

    return root + dir;
  }

  function basename(path, ext) {
    var f = splitPath(path)[2];
    // TODO: make this comparison case-insensitive on windows?
    if (ext && f.substr(-1 * ext.length) === ext) {
      f = f.substr(0, f.length - ext.length);
    }
    return f;
  }


  function extname(path) {
    return splitPath(path)[3];
  }
  var path = {
    extname: extname,
    basename: basename,
    dirname: dirname,
    sep: sep,
    delimiter: delimiter,
    relative: relative,
    join: join,
    isAbsolute: isAbsolute,
    normalize: normalize,
    resolve: resolve
  };
  function filter (xs, f) {
      if (xs.filter) return xs.filter(f);
      var res = [];
      for (var i = 0; i < xs.length; i++) {
          if (f(xs[i], i, xs)) res.push(xs[i]);
      }
      return res;
  }

  // String.prototype.substr - negative index don't work in IE8
  var substr = 'ab'.substr(-1) === 'b' ?
      function (str, start, len) { return str.substr(start, len) } :
      function (str, start, len) {
          if (start < 0) start = str.length + start;
          return str.substr(start, len);
      }
  ;

  var _polyfillNode_path = /*#__PURE__*/Object.freeze({
    __proto__: null,
    basename: basename,
    default: path,
    delimiter: delimiter,
    dirname: dirname,
    extname: extname,
    isAbsolute: isAbsolute,
    join: join,
    normalize: normalize,
    relative: relative,
    resolve: resolve,
    sep: sep
  });

  var require$$1$2 = /*@__PURE__*/getAugmentedNamespace(_polyfillNode_path);

  var reporters = {};

  class Diff {
      diff(oldStr, newStr, 
      // Type below is not accurate/complete - see above for full possibilities - but it compiles
      options = {}) {
          let callback;
          if (typeof options === 'function') {
              callback = options;
              options = {};
          }
          else if ('callback' in options) {
              callback = options.callback;
          }
          // Allow subclasses to massage the input prior to running
          const oldString = this.castInput(oldStr, options);
          const newString = this.castInput(newStr, options);
          const oldTokens = this.removeEmpty(this.tokenize(oldString, options));
          const newTokens = this.removeEmpty(this.tokenize(newString, options));
          return this.diffWithOptionsObj(oldTokens, newTokens, options, callback);
      }
      diffWithOptionsObj(oldTokens, newTokens, options, callback) {
          var _a;
          const done = (value) => {
              value = this.postProcess(value, options);
              if (callback) {
                  setTimeout(function () { callback(value); }, 0);
                  return undefined;
              }
              else {
                  return value;
              }
          };
          const newLen = newTokens.length, oldLen = oldTokens.length;
          let editLength = 1;
          let maxEditLength = newLen + oldLen;
          if (options.maxEditLength != null) {
              maxEditLength = Math.min(maxEditLength, options.maxEditLength);
          }
          const maxExecutionTime = (_a = options.timeout) !== null && _a !== void 0 ? _a : Infinity;
          const abortAfterTimestamp = Date.now() + maxExecutionTime;
          const bestPath = [{ oldPos: -1, lastComponent: undefined }];
          // Seed editLength = 0, i.e. the content starts with the same values
          let newPos = this.extractCommon(bestPath[0], newTokens, oldTokens, 0, options);
          if (bestPath[0].oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
              // Identity per the equality and tokenizer
              return done(this.buildValues(bestPath[0].lastComponent, newTokens, oldTokens));
          }
          // Once we hit the right edge of the edit graph on some diagonal k, we can
          // definitely reach the end of the edit graph in no more than k edits, so
          // there's no point in considering any moves to diagonal k+1 any more (from
          // which we're guaranteed to need at least k+1 more edits).
          // Similarly, once we've reached the bottom of the edit graph, there's no
          // point considering moves to lower diagonals.
          // We record this fact by setting minDiagonalToConsider and
          // maxDiagonalToConsider to some finite value once we've hit the edge of
          // the edit graph.
          // This optimization is not faithful to the original algorithm presented in
          // Myers's paper, which instead pointlessly extends D-paths off the end of
          // the edit graph - see page 7 of Myers's paper which notes this point
          // explicitly and illustrates it with a diagram. This has major performance
          // implications for some common scenarios. For instance, to compute a diff
          // where the new text simply appends d characters on the end of the
          // original text of length n, the true Myers algorithm will take O(n+d^2)
          // time while this optimization needs only O(n+d) time.
          let minDiagonalToConsider = -Infinity, maxDiagonalToConsider = Infinity;
          // Main worker method. checks all permutations of a given edit length for acceptance.
          const execEditLength = () => {
              for (let diagonalPath = Math.max(minDiagonalToConsider, -editLength); diagonalPath <= Math.min(maxDiagonalToConsider, editLength); diagonalPath += 2) {
                  let basePath;
                  const removePath = bestPath[diagonalPath - 1], addPath = bestPath[diagonalPath + 1];
                  if (removePath) {
                      // No one else is going to attempt to use this value, clear it
                      // @ts-expect-error - perf optimisation. This type-violating value will never be read.
                      bestPath[diagonalPath - 1] = undefined;
                  }
                  let canAdd = false;
                  if (addPath) {
                      // what newPos will be after we do an insertion:
                      const addPathNewPos = addPath.oldPos - diagonalPath;
                      canAdd = addPath && 0 <= addPathNewPos && addPathNewPos < newLen;
                  }
                  const canRemove = removePath && removePath.oldPos + 1 < oldLen;
                  if (!canAdd && !canRemove) {
                      // If this path is a terminal then prune
                      // @ts-expect-error - perf optimisation. This type-violating value will never be read.
                      bestPath[diagonalPath] = undefined;
                      continue;
                  }
                  // Select the diagonal that we want to branch from. We select the prior
                  // path whose position in the old string is the farthest from the origin
                  // and does not pass the bounds of the diff graph
                  if (!canRemove || (canAdd && removePath.oldPos < addPath.oldPos)) {
                      basePath = this.addToPath(addPath, true, false, 0, options);
                  }
                  else {
                      basePath = this.addToPath(removePath, false, true, 1, options);
                  }
                  newPos = this.extractCommon(basePath, newTokens, oldTokens, diagonalPath, options);
                  if (basePath.oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
                      // If we have hit the end of both strings, then we are done
                      return done(this.buildValues(basePath.lastComponent, newTokens, oldTokens)) || true;
                  }
                  else {
                      bestPath[diagonalPath] = basePath;
                      if (basePath.oldPos + 1 >= oldLen) {
                          maxDiagonalToConsider = Math.min(maxDiagonalToConsider, diagonalPath - 1);
                      }
                      if (newPos + 1 >= newLen) {
                          minDiagonalToConsider = Math.max(minDiagonalToConsider, diagonalPath + 1);
                      }
                  }
              }
              editLength++;
          };
          // Performs the length of edit iteration. Is a bit fugly as this has to support the
          // sync and async mode which is never fun. Loops over execEditLength until a value
          // is produced, or until the edit length exceeds options.maxEditLength (if given),
          // in which case it will return undefined.
          if (callback) {
              (function exec() {
                  setTimeout(function () {
                      if (editLength > maxEditLength || Date.now() > abortAfterTimestamp) {
                          return callback(undefined);
                      }
                      if (!execEditLength()) {
                          exec();
                      }
                  }, 0);
              }());
          }
          else {
              while (editLength <= maxEditLength && Date.now() <= abortAfterTimestamp) {
                  const ret = execEditLength();
                  if (ret) {
                      return ret;
                  }
              }
          }
      }
      addToPath(path, added, removed, oldPosInc, options) {
          const last = path.lastComponent;
          if (last && !options.oneChangePerToken && last.added === added && last.removed === removed) {
              return {
                  oldPos: path.oldPos + oldPosInc,
                  lastComponent: { count: last.count + 1, added: added, removed: removed, previousComponent: last.previousComponent }
              };
          }
          else {
              return {
                  oldPos: path.oldPos + oldPosInc,
                  lastComponent: { count: 1, added: added, removed: removed, previousComponent: last }
              };
          }
      }
      extractCommon(basePath, newTokens, oldTokens, diagonalPath, options) {
          const newLen = newTokens.length, oldLen = oldTokens.length;
          let oldPos = basePath.oldPos, newPos = oldPos - diagonalPath, commonCount = 0;
          while (newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(oldTokens[oldPos + 1], newTokens[newPos + 1], options)) {
              newPos++;
              oldPos++;
              commonCount++;
              if (options.oneChangePerToken) {
                  basePath.lastComponent = { count: 1, previousComponent: basePath.lastComponent, added: false, removed: false };
              }
          }
          if (commonCount && !options.oneChangePerToken) {
              basePath.lastComponent = { count: commonCount, previousComponent: basePath.lastComponent, added: false, removed: false };
          }
          basePath.oldPos = oldPos;
          return newPos;
      }
      equals(left, right, options) {
          if (options.comparator) {
              return options.comparator(left, right);
          }
          else {
              return left === right
                  || (!!options.ignoreCase && left.toLowerCase() === right.toLowerCase());
          }
      }
      removeEmpty(array) {
          const ret = [];
          for (let i = 0; i < array.length; i++) {
              if (array[i]) {
                  ret.push(array[i]);
              }
          }
          return ret;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      castInput(value, options) {
          return value;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      tokenize(value, options) {
          return Array.from(value);
      }
      join(chars) {
          // Assumes ValueT is string, which is the case for most subclasses.
          // When it's false, e.g. in diffArrays, this method needs to be overridden (e.g. with a no-op)
          // Yes, the casts are verbose and ugly, because this pattern - of having the base class SORT OF
          // assume tokens and values are strings, but not completely - is weird and janky.
          return chars.join('');
      }
      postProcess(changeObjects, 
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      options) {
          return changeObjects;
      }
      get useLongestToken() {
          return false;
      }
      buildValues(lastComponent, newTokens, oldTokens) {
          // First we convert our linked list of components in reverse order to an
          // array in the right order:
          const components = [];
          let nextComponent;
          while (lastComponent) {
              components.push(lastComponent);
              nextComponent = lastComponent.previousComponent;
              delete lastComponent.previousComponent;
              lastComponent = nextComponent;
          }
          components.reverse();
          const componentLen = components.length;
          let componentPos = 0, newPos = 0, oldPos = 0;
          for (; componentPos < componentLen; componentPos++) {
              const component = components[componentPos];
              if (!component.removed) {
                  if (!component.added && this.useLongestToken) {
                      let value = newTokens.slice(newPos, newPos + component.count);
                      value = value.map(function (value, i) {
                          const oldValue = oldTokens[oldPos + i];
                          return oldValue.length > value.length ? oldValue : value;
                      });
                      component.value = this.join(value);
                  }
                  else {
                      component.value = this.join(newTokens.slice(newPos, newPos + component.count));
                  }
                  newPos += component.count;
                  // Common case
                  if (!component.added) {
                      oldPos += component.count;
                  }
              }
              else {
                  component.value = this.join(oldTokens.slice(oldPos, oldPos + component.count));
                  oldPos += component.count;
              }
          }
          return components;
      }
  }

  // Based on https://en.wikipedia.org/wiki/Latin_script_in_Unicode
  //
  // Chars/ranges counted as "word" characters by this regex are as follows:
  //
  // + U+00AD  Soft hyphen
  // + 00C0–00FF (letters with diacritics from the Latin-1 Supplement), except:
  //   - U+00D7  × Multiplication sign
  //   - U+00F7  ÷ Division sign
  // + Latin Extended-A, 0100–017F
  // + Latin Extended-B, 0180–024F
  // + IPA Extensions, 0250–02AF
  // + Spacing Modifier Letters, 02B0–02FF, except:
  //   - U+02C7  ˇ &#711;  Caron
  //   - U+02D8  ˘ &#728;  Breve
  //   - U+02D9  ˙ &#729;  Dot Above
  //   - U+02DA  ˚ &#730;  Ring Above
  //   - U+02DB  ˛ &#731;  Ogonek
  //   - U+02DC  ˜ &#732;  Small Tilde
  //   - U+02DD  ˝ &#733;  Double Acute Accent
  // + Latin Extended Additional, 1E00–1EFF
  const extendedWordChars = 'a-zA-Z0-9_\\u{AD}\\u{C0}-\\u{D6}\\u{D8}-\\u{F6}\\u{F8}-\\u{2C6}\\u{2C8}-\\u{2D7}\\u{2DE}-\\u{2FF}\\u{1E00}-\\u{1EFF}';
  class WordsWithSpaceDiff extends Diff {
      tokenize(value) {
          // Slightly different to the tokenizeIncludingWhitespace regex used above in
          // that this one treats each individual newline as a distinct token, rather
          // than merging them into other surrounding whitespace. This was requested
          // in https://github.com/kpdecker/jsdiff/issues/180 &
          //    https://github.com/kpdecker/jsdiff/issues/211
          const regex = new RegExp(`(\\r?\\n)|[${extendedWordChars}]+|[^\\S\\n\\r]+|[^${extendedWordChars}]`, 'ug');
          return value.match(regex) || [];
      }
  }
  const wordsWithSpaceDiff = new WordsWithSpaceDiff();
  function diffWordsWithSpace(oldStr, newStr, options) {
      return wordsWithSpaceDiff.diff(oldStr, newStr, options);
  }

  class LineDiff extends Diff {
      constructor() {
          super(...arguments);
          this.tokenize = tokenize;
      }
      equals(left, right, options) {
          // If we're ignoring whitespace, we need to normalise lines by stripping
          // whitespace before checking equality. (This has an annoying interaction
          // with newlineIsToken that requires special handling: if newlines get their
          // own token, then we DON'T want to trim the *newline* tokens down to empty
          // strings, since this would cause us to treat whitespace-only line content
          // as equal to a separator between lines, which would be weird and
          // inconsistent with the documented behavior of the options.)
          if (options.ignoreWhitespace) {
              if (!options.newlineIsToken || !left.includes('\n')) {
                  left = left.trim();
              }
              if (!options.newlineIsToken || !right.includes('\n')) {
                  right = right.trim();
              }
          }
          else if (options.ignoreNewlineAtEof && !options.newlineIsToken) {
              if (left.endsWith('\n')) {
                  left = left.slice(0, -1);
              }
              if (right.endsWith('\n')) {
                  right = right.slice(0, -1);
              }
          }
          return super.equals(left, right, options);
      }
  }
  const lineDiff = new LineDiff();
  function diffLines(oldStr, newStr, options) {
      return lineDiff.diff(oldStr, newStr, options);
  }
  // Exported standalone so it can be used from jsonDiff too.
  function tokenize(value, options) {
      if (options.stripTrailingCr) {
          // remove one \r before \n to match GNU diff's --strip-trailing-cr behavior
          value = value.replace(/\r\n/g, '\n');
      }
      const retLines = [], linesAndNewlines = value.split(/(\n|\r\n)/);
      // Ignore the final empty token that occurs if the string ends with a new line
      if (!linesAndNewlines[linesAndNewlines.length - 1]) {
          linesAndNewlines.pop();
      }
      // Merge the content and line separators into single tokens
      for (let i = 0; i < linesAndNewlines.length; i++) {
          const line = linesAndNewlines[i];
          if (i % 2 && !options.newlineIsToken) {
              retLines[retLines.length - 1] += line;
          }
          else {
              retLines.push(line);
          }
      }
      return retLines;
  }

  /**
   * Returns true if the filename contains characters that require C-style
   * quoting (as used by Git and GNU diffutils in diff output).
   */
  function needsQuoting(s) {
      for (let i = 0; i < s.length; i++) {
          if (s[i] < '\x20' || s[i] > '\x7e' || s[i] === '"' || s[i] === '\\') {
              return true;
          }
      }
      return false;
  }
  /**
   * C-style quotes a filename, encoding special characters as escape sequences
   * and non-ASCII bytes as octal escapes. This is the inverse of
   * `parseQuotedFileName` in parse.ts.
   *
   * Non-ASCII bytes are encoded as UTF-8 before being emitted as octal escapes.
   * This matches the behaviour of both Git and GNU diffutils, which always emit
   * UTF-8 octal escapes regardless of the underlying filesystem encoding (e.g.
   * Git for Windows converts from NTFS's UTF-16 to UTF-8 internally).
   *
   * If the filename doesn't need quoting, returns it as-is.
   */
  function quoteFileNameIfNeeded(s) {
      if (!needsQuoting(s)) {
          return s;
      }
      let result = '"';
      const bytes = new TextEncoder().encode(s);
      let i = 0;
      while (i < bytes.length) {
          const b = bytes[i];
          // See https://en.wikipedia.org/wiki/Escape_sequences_in_C#Escape_sequences
          if (b === 0x07) {
              result += '\\a';
          }
          else if (b === 0x08) {
              result += '\\b';
          }
          else if (b === 0x09) {
              result += '\\t';
          }
          else if (b === 0x0a) {
              result += '\\n';
          }
          else if (b === 0x0b) {
              result += '\\v';
          }
          else if (b === 0x0c) {
              result += '\\f';
          }
          else if (b === 0x0d) {
              result += '\\r';
          }
          else if (b === 0x22) {
              result += '\\"';
          }
          else if (b === 0x5c) {
              result += '\\\\';
          }
          else if (b >= 0x20 && b <= 0x7e) {
              // Just a printable ASCII character that is neither a double quote nor a
              // backslash; no need to escape it.
              result += String.fromCharCode(b);
          }
          else {
              // Either part of a non-ASCII character or a control character without a
              // special escape sequence; needs escaping as a 3-digit octal escape
              result += '\\' + b.toString(8).padStart(3, '0');
          }
          i++;
      }
      result += '"';
      return result;
  }
  const INCLUDE_HEADERS = {
      includeIndex: true,
      includeUnderline: true,
      includeFileHeaders: true
  };
  function structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
      let optionsObj;
      {
          optionsObj = {};
      }
      if (typeof optionsObj.context === 'undefined') {
          optionsObj.context = 4;
      }
      // We copy this into its own variable to placate TypeScript, which thinks
      // optionsObj.context might be undefined in the callbacks below.
      const context = optionsObj.context;
      // @ts-expect-error (runtime check for something that is correctly a static type error)
      if (optionsObj.newlineIsToken) {
          throw new Error('newlineIsToken may not be used with patch-generation functions, only with diffing functions');
      }
      if (!optionsObj.callback) {
          return diffLinesResultToPatch(diffLines(oldStr, newStr, optionsObj));
      }
      else {
          const { callback } = optionsObj;
          diffLines(oldStr, newStr, Object.assign(Object.assign({}, optionsObj), { callback: (diff) => {
                  const patch = diffLinesResultToPatch(diff);
                  // TypeScript is unhappy without the cast because it does not understand that `patch` may
                  // be undefined here only if `callback` is StructuredPatchCallbackAbortable:
                  callback(patch);
              } }));
      }
      function diffLinesResultToPatch(diff) {
          // STEP 1: Build up the patch with no "\ No newline at end of file" lines and with the arrays
          //         of lines containing trailing newline characters. We'll tidy up later...
          if (!diff) {
              return;
          }
          diff.push({ value: '', lines: [] }); // Append an empty value to make cleanup easier
          function contextLines(lines) {
              return lines.map(function (entry) { return ' ' + entry; });
          }
          const hunks = [];
          let oldRangeStart = 0, newRangeStart = 0, curRange = [], oldLine = 1, newLine = 1;
          for (let i = 0; i < diff.length; i++) {
              const current = diff[i], lines = current.lines || splitLines(current.value);
              current.lines = lines;
              if (current.added || current.removed) {
                  // If we have previous context, start with that
                  if (!oldRangeStart) {
                      const prev = diff[i - 1];
                      oldRangeStart = oldLine;
                      newRangeStart = newLine;
                      if (prev) {
                          curRange = context > 0 ? contextLines(prev.lines.slice(-context)) : [];
                          oldRangeStart -= curRange.length;
                          newRangeStart -= curRange.length;
                      }
                  }
                  // Output our changes
                  for (const line of lines) {
                      curRange.push((current.added ? '+' : '-') + line);
                  }
                  // Track the updated file position
                  if (current.added) {
                      newLine += lines.length;
                  }
                  else {
                      oldLine += lines.length;
                  }
              }
              else {
                  // Identical context lines. Track line changes
                  if (oldRangeStart) {
                      // Close out any changes that have been output (or join overlapping)
                      if (lines.length <= context * 2 && i < diff.length - 2) {
                          // Overlapping
                          for (const line of contextLines(lines)) {
                              curRange.push(line);
                          }
                      }
                      else {
                          // end the range and output
                          const contextSize = Math.min(lines.length, context);
                          for (const line of contextLines(lines.slice(0, contextSize))) {
                              curRange.push(line);
                          }
                          const hunk = {
                              oldStart: oldRangeStart,
                              oldLines: (oldLine - oldRangeStart + contextSize),
                              newStart: newRangeStart,
                              newLines: (newLine - newRangeStart + contextSize),
                              lines: curRange
                          };
                          hunks.push(hunk);
                          oldRangeStart = 0;
                          newRangeStart = 0;
                          curRange = [];
                      }
                  }
                  oldLine += lines.length;
                  newLine += lines.length;
              }
          }
          // Step 2: eliminate the trailing `\n` from each line of each hunk, and, where needed, add
          //         "\ No newline at end of file".
          for (const hunk of hunks) {
              for (let i = 0; i < hunk.lines.length; i++) {
                  if (hunk.lines[i].endsWith('\n')) {
                      hunk.lines[i] = hunk.lines[i].slice(0, -1);
                  }
                  else {
                      hunk.lines.splice(i + 1, 0, '\\ No newline at end of file');
                      i++; // Skip the line we just added, then continue iterating
                  }
              }
          }
          return {
              oldFileName: oldFileName, newFileName: newFileName,
              oldHeader: oldHeader, newHeader: newHeader,
              hunks: hunks
          };
      }
  }
  /**
   * creates a unified diff patch.
   *
   * @param patch either a single structured patch object (as returned by `structuredPatch`) or an
   *   array of them (as returned by `parsePatch`).
   * @param headerOptions behaves the same as the `headerOptions` option of `createTwoFilesPatch`.
   *   Ignored for patches where `isGit` is `true`.
   *
   * When a patch has `isGit: true`, `formatPatch` output is changed to more closely match Git's
   * output: it emits a `diff --git` header, emits Git extended headers as appropriate based on
   * properties like `isRename`, `isCreate`, `newMode`, etc, and will omit `---`/`+++` file
   * headers for patches with no hunks (e.g. renames without content changes).
   */
  function formatPatch(patch, headerOptions) {
      var _a, _b, _c, _d, _e, _f;
      if (!headerOptions) {
          headerOptions = INCLUDE_HEADERS;
      }
      if (Array.isArray(patch)) {
          if (patch.length > 1 && !headerOptions.includeFileHeaders && !patch.every(p => p.isGit)) {
              throw new Error('Cannot omit file headers on a multi-file patch. '
                  + '(The result would be unparseable; how would a tool trying to apply '
                  + 'the patch know which changes are to which file?)');
          }
          return patch.map(p => formatPatch(p, headerOptions)).join('\n');
      }
      const ret = [];
      // Git patches have a fixed header format (diff --git, extended headers,
      // and ---/+++ when hunks are present), so headerOptions is ignored.
      if (patch.isGit) {
          headerOptions = INCLUDE_HEADERS;
          // Emit Git-style diff --git header and extended headers.
          // Git never puts /dev/null in the "diff --git" line; for file
          // creations/deletions it uses the real filename on both sides.
          if (!patch.oldFileName) {
              throw new Error('oldFileName must be specified for Git patches');
          }
          if (!patch.newFileName) {
              throw new Error('newFileName must be specified for Git patches');
          }
          let gitOldName = patch.oldFileName;
          let gitNewName = patch.newFileName;
          if (patch.isCreate && gitOldName === '/dev/null') {
              gitOldName = gitNewName.replace(/^b\//, 'a/');
          }
          else if (patch.isDelete && gitNewName === '/dev/null') {
              gitNewName = gitOldName.replace(/^a\//, 'b/');
          }
          ret.push('diff --git ' + quoteFileNameIfNeeded(gitOldName) + ' ' + quoteFileNameIfNeeded(gitNewName));
          if (patch.isDelete) {
              ret.push('deleted file mode ' + ((_a = patch.oldMode) !== null && _a !== void 0 ? _a : '100644'));
          }
          if (patch.isCreate) {
              ret.push('new file mode ' + ((_b = patch.newMode) !== null && _b !== void 0 ? _b : '100644'));
          }
          if (patch.oldMode && patch.newMode && !patch.isDelete && !patch.isCreate) {
              ret.push('old mode ' + patch.oldMode);
              ret.push('new mode ' + patch.newMode);
          }
          if (patch.isRename) {
              ret.push('rename from ' + quoteFileNameIfNeeded(((_c = patch.oldFileName) !== null && _c !== void 0 ? _c : '').replace(/^a\//, '')));
              ret.push('rename to ' + quoteFileNameIfNeeded(((_d = patch.newFileName) !== null && _d !== void 0 ? _d : '').replace(/^b\//, '')));
          }
          if (patch.isCopy) {
              ret.push('copy from ' + quoteFileNameIfNeeded(((_e = patch.oldFileName) !== null && _e !== void 0 ? _e : '').replace(/^a\//, '')));
              ret.push('copy to ' + quoteFileNameIfNeeded(((_f = patch.newFileName) !== null && _f !== void 0 ? _f : '').replace(/^b\//, '')));
          }
      }
      else {
          if (headerOptions.includeIndex && patch.oldFileName == patch.newFileName && patch.oldFileName !== undefined) {
              ret.push('Index: ' + patch.oldFileName);
          }
          if (headerOptions.includeUnderline) {
              ret.push('===================================================================');
          }
      }
      // Emit --- / +++ file headers. For Git patches with no hunks (e.g.
      // pure renames, mode-only changes), Git omits these, so we do too.
      const hasHunks = patch.hunks.length > 0;
      if (headerOptions.includeFileHeaders && patch.oldFileName !== undefined && patch.newFileName !== undefined
          && (!patch.isGit || hasHunks)) {
          ret.push('--- ' + quoteFileNameIfNeeded(patch.oldFileName) + (patch.oldHeader ? '\t' + patch.oldHeader : ''));
          ret.push('+++ ' + quoteFileNameIfNeeded(patch.newFileName) + (patch.newHeader ? '\t' + patch.newHeader : ''));
      }
      for (let i = 0; i < patch.hunks.length; i++) {
          const hunk = patch.hunks[i];
          // Unified Diff Format quirk: If the chunk size is 0,
          // the first number is one lower than one would expect.
          // https://www.artima.com/weblogs/viewpost.jsp?thread=164293
          const oldStart = hunk.oldLines === 0 ? hunk.oldStart - 1 : hunk.oldStart;
          const newStart = hunk.newLines === 0 ? hunk.newStart - 1 : hunk.newStart;
          ret.push('@@ -' + oldStart + ',' + hunk.oldLines
              + ' +' + newStart + ',' + hunk.newLines
              + ' @@');
          for (const line of hunk.lines) {
              ret.push(line);
          }
      }
      return ret.join('\n') + '\n';
  }
  function createTwoFilesPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
      {
          const patchObj = structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader);
          if (!patchObj) {
              return;
          }
          return formatPatch(patchObj, void 0 );
      }
  }
  function createPatch(fileName, oldStr, newStr, oldHeader, newHeader, options) {
      return createTwoFilesPatch(fileName, fileName, oldStr, newStr, oldHeader, newHeader);
  }
  /**
   * Split `text` into an array of lines, including the trailing newline character (where present)
   */
  function splitLines(text) {
      const hasTrailingNl = text.endsWith('\n');
      const result = text.split('\n').map(line => line + '\n');
      if (hasTrailingNl) {
          result.pop();
      }
      else {
          result.push(result.pop().slice(0, -1));
      }
      return result;
  }

  /**
   * Helpers.
   */

  var ms$1;
  var hasRequiredMs;

  function requireMs () {
  	if (hasRequiredMs) return ms$1;
  	hasRequiredMs = 1;
  	var s = 1000;
  	var m = s * 60;
  	var h = m * 60;
  	var d = h * 24;
  	var w = d * 7;
  	var y = d * 365.25;

  	/**
  	 * Parse or format the given `val`.
  	 *
  	 * Options:
  	 *
  	 *  - `long` verbose formatting [false]
  	 *
  	 * @param {String|Number} val
  	 * @param {Object} [options]
  	 * @throws {Error} throw an error if val is not a non-empty string or a number
  	 * @return {String|Number}
  	 * @api public
  	 */

  	ms$1 = function (val, options) {
  	  options = options || {};
  	  var type = typeof val;
  	  if (type === 'string' && val.length > 0) {
  	    return parse(val);
  	  } else if (type === 'number' && isFinite(val)) {
  	    return options.long ? fmtLong(val) : fmtShort(val);
  	  }
  	  throw new Error(
  	    'val is not a non-empty string or a valid number. val=' +
  	      JSON.stringify(val)
  	  );
  	};

  	/**
  	 * Parse the given `str` and return milliseconds.
  	 *
  	 * @param {String} str
  	 * @return {Number}
  	 * @api private
  	 */

  	function parse(str) {
  	  str = String(str);
  	  if (str.length > 100) {
  	    return;
  	  }
  	  var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
  	    str
  	  );
  	  if (!match) {
  	    return;
  	  }
  	  var n = parseFloat(match[1]);
  	  var type = (match[2] || 'ms').toLowerCase();
  	  switch (type) {
  	    case 'years':
  	    case 'year':
  	    case 'yrs':
  	    case 'yr':
  	    case 'y':
  	      return n * y;
  	    case 'weeks':
  	    case 'week':
  	    case 'w':
  	      return n * w;
  	    case 'days':
  	    case 'day':
  	    case 'd':
  	      return n * d;
  	    case 'hours':
  	    case 'hour':
  	    case 'hrs':
  	    case 'hr':
  	    case 'h':
  	      return n * h;
  	    case 'minutes':
  	    case 'minute':
  	    case 'mins':
  	    case 'min':
  	    case 'm':
  	      return n * m;
  	    case 'seconds':
  	    case 'second':
  	    case 'secs':
  	    case 'sec':
  	    case 's':
  	      return n * s;
  	    case 'milliseconds':
  	    case 'millisecond':
  	    case 'msecs':
  	    case 'msec':
  	    case 'ms':
  	      return n;
  	    default:
  	      return undefined;
  	  }
  	}

  	/**
  	 * Short format for `ms`.
  	 *
  	 * @param {Number} ms
  	 * @return {String}
  	 * @api private
  	 */

  	function fmtShort(ms) {
  	  var msAbs = Math.abs(ms);
  	  if (msAbs >= d) {
  	    return Math.round(ms / d) + 'd';
  	  }
  	  if (msAbs >= h) {
  	    return Math.round(ms / h) + 'h';
  	  }
  	  if (msAbs >= m) {
  	    return Math.round(ms / m) + 'm';
  	  }
  	  if (msAbs >= s) {
  	    return Math.round(ms / s) + 's';
  	  }
  	  return ms + 'ms';
  	}

  	/**
  	 * Long format for `ms`.
  	 *
  	 * @param {Number} ms
  	 * @return {String}
  	 * @api private
  	 */

  	function fmtLong(ms) {
  	  var msAbs = Math.abs(ms);
  	  if (msAbs >= d) {
  	    return plural(ms, msAbs, d, 'day');
  	  }
  	  if (msAbs >= h) {
  	    return plural(ms, msAbs, h, 'hour');
  	  }
  	  if (msAbs >= m) {
  	    return plural(ms, msAbs, m, 'minute');
  	  }
  	  if (msAbs >= s) {
  	    return plural(ms, msAbs, s, 'second');
  	  }
  	  return ms + ' ms';
  	}

  	/**
  	 * Pluralization helper.
  	 */

  	function plural(ms, msAbs, n, name) {
  	  var isPlural = msAbs >= n * 1.5;
  	  return Math.round(ms / n) + ' ' + name + (isPlural ? 's' : '');
  	}
  	return ms$1;
  }

  var msExports = requireMs();
  var ms = /*@__PURE__*/getDefaultExportFromCjs(msExports);

  var utils$1 = {};

  var picocolors_browser = {exports: {}};

  var hasRequiredPicocolors_browser;

  function requirePicocolors_browser () {
  	if (hasRequiredPicocolors_browser) return picocolors_browser.exports;
  	hasRequiredPicocolors_browser = 1;
  	var x=String;
  	var create=function() {return {isColorSupported:false,reset:x,bold:x,dim:x,italic:x,underline:x,inverse:x,hidden:x,strikethrough:x,black:x,red:x,green:x,yellow:x,blue:x,magenta:x,cyan:x,white:x,gray:x,bgBlack:x,bgRed:x,bgGreen:x,bgYellow:x,bgBlue:x,bgMagenta:x,bgCyan:x,bgWhite:x,blackBright:x,redBright:x,greenBright:x,yellowBright:x,blueBright:x,magentaBright:x,cyanBright:x,whiteBright:x,bgBlackBright:x,bgRedBright:x,bgGreenBright:x,bgYellowBright:x,bgBlueBright:x,bgMagentaBright:x,bgCyanBright:x,bgWhiteBright:x}};
  	picocolors_browser.exports=create();
  	picocolors_browser.exports.createColors = create;
  	return picocolors_browser.exports;
  }

  var isUnicodeSupported;
  var hasRequiredIsUnicodeSupported;

  function requireIsUnicodeSupported () {
  	if (hasRequiredIsUnicodeSupported) return isUnicodeSupported;
  	hasRequiredIsUnicodeSupported = 1;

  	isUnicodeSupported = () => {
  		if (browser$1$1.platform !== 'win32') {
  			return true;
  		}

  		return Boolean(browser$1$1.env.CI) ||
  			Boolean(browser$1$1.env.WT_SESSION) || // Windows Terminal
  			browser$1$1.env.TERM_PROGRAM === 'vscode' ||
  			browser$1$1.env.TERM === 'xterm-256color' ||
  			browser$1$1.env.TERM === 'alacritty';
  	};
  	return isUnicodeSupported;
  }

  var hasRequiredUtils;

  function requireUtils () {
  	if (hasRequiredUtils) return utils$1;
  	hasRequiredUtils = 1;
  	(function (exports) {

  		/**
  		 * Various utility functions used throughout Mocha's codebase.
  		 * @module utils
  		 */

  		/**
  		 * Module dependencies.
  		 */
  		var path = require$$1$2;
  		var pc = /*@__PURE__*/ requirePicocolors_browser();
  		var isUnicodeSupported = requireIsUnicodeSupported()();

  		const MOCHA_ID_PROP_NAME = "__mocha_id__";

  		function htmlCodePointEscape(codePoint) {
  		  return "&#x" + codePoint.toString(16).toUpperCase() + ";";
  		}

  		function shouldEscapeHtmlChar(codePoint) {
  		  return (
  		    (codePoint >= 0x01 && codePoint <= 0x09) ||
  		    codePoint === 0x0b ||
  		    codePoint === 0x0c ||
  		    (codePoint >= 0x0e && codePoint <= 0x1f) ||
  		    codePoint === 0x22 ||
  		    codePoint === 0x26 ||
  		    codePoint === 0x27 ||
  		    codePoint === 0x3c ||
  		    codePoint === 0x3e ||
  		    codePoint === 0x60 ||
  		    codePoint === 0x7f ||
  		    codePoint === 0x81 ||
  		    codePoint === 0x8d ||
  		    codePoint === 0x8f ||
  		    codePoint === 0x90 ||
  		    codePoint === 0x9d ||
  		    codePoint >= 0xa0
  		  );
  		}

  		/**
  		 * Escape special characters in the given string of html.
  		 *
  		 * @private
  		 * @param  {string} html
  		 * @return {string}
  		 */
  		exports.escape = function (html) {
  		  var string = String(html);
  		  var escaped = "";

  		  for (var index = 0; index < string.length; index++) {
  		    var codePoint = string.charCodeAt(index);

  		    if (
  		      codePoint >= 0xd800 &&
  		      codePoint <= 0xdbff &&
  		      index + 1 < string.length
  		    ) {
  		      var low = string.charCodeAt(index + 1);

  		      if (low >= 0xdc00 && low <= 0xdfff) {
  		        // Decode a UTF-16 surrogate pair into a single Unicode code point.
  		        // See https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
  		        codePoint = (codePoint - 0xd800) * 0x400 + low - 0xdc00 + 0x10000;
  		        escaped += htmlCodePointEscape(codePoint);
  		        index++;
  		        continue;
  		      }
  		    }

  		    escaped += shouldEscapeHtmlChar(codePoint)
  		      ? htmlCodePointEscape(codePoint)
  		      : string.charAt(index);
  		  }

  		  return escaped;
  		};

  		/**
  		 * Test if the given obj is type of string.
  		 *
  		 * @private
  		 * @param {Object} obj
  		 * @return {boolean}
  		 */
  		exports.isString = function (obj) {
  		  return typeof obj === "string";
  		};

  		/**
  		 * Compute a slug from the given `str`.
  		 *
  		 * @private
  		 * @param {string} str
  		 * @return {string}
  		 */
  		exports.slug = function (str) {
  		  return str
  		    .toLowerCase()
  		    .replace(/\s+/g, "-")
  		    .replace(/[^-\w]/g, "")
  		    .replace(/-{2,}/g, "-");
  		};

  		/**
  		 * Strip the function definition from `str`, and re-indent for pre whitespace.
  		 *
  		 * @param {string} str
  		 * @return {string}
  		 */
  		exports.clean = function (str) {
  		  str = str
  		    .replace(/\r\n?|[\n\u2028\u2029]/g, "\n")
  		    .replace(/^\uFEFF/, "")
  		    // (traditional)->  space/name     parameters    body     (lambda)-> parameters       body   multi-statement/single          keep body content
  		    .replace(
  		      /^function(?:\s*|\s[^(]*)\([^)]*\)\s*\{((?:.|\n)*?)\}$|^\([^)]*\)\s*=>\s*(?:\{((?:.|\n)*?)\}|((?:.|\n)*))$/,
  		      "$1$2$3",
  		    );

  		  var spaces = str.match(/^\n?( *)/)[1].length;
  		  var tabs = str.match(/^\n?(\t*)/)[1].length;
  		  var re = new RegExp(
  		    "^\n?" + (tabs ? "\t" : " ") + "{" + (tabs || spaces) + "}",
  		    "gm",
  		  );

  		  str = str.replace(re, "");

  		  return str.trim();
  		};

  		/**
  		 * If a value could have properties, and has none, this function is called,
  		 * which returns a string representation of the empty value.
  		 *
  		 * Functions w/ no properties return `'[Function]'`
  		 * Arrays w/ length === 0 return `'[]'`
  		 * Objects w/ no properties return `'{}'`
  		 * All else: return result of `value.toString()`
  		 *
  		 * @private
  		 * @param {*} value The value to inspect.
  		 * @param {string} typeHint The type of the value
  		 * @returns {string}
  		 */
  		function emptyRepresentation(value, typeHint) {
  		  switch (typeHint) {
  		    case "function":
  		      return "[Function]";
  		    case "null-prototype":
  		    case "object":
  		      return "{}";
  		    case "array":
  		      return "[]";
  		    default:
  		      return value.toString();
  		  }
  		}

  		/**
  		 * Takes some variable and asks `Object.prototype.toString()` what it thinks it
  		 * is.
  		 *
  		 * @private
  		 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString
  		 * @param {*} value The value to test.
  		 * @returns {string} Computed type
  		 * @example
  		 * canonicalType({}) // 'object'
  		 * canonicalType([]) // 'array'
  		 * canonicalType(1) // 'number'
  		 * canonicalType(false) // 'boolean'
  		 * canonicalType(Infinity) // 'number'
  		 * canonicalType(null) // 'null'
  		 * canonicalType(new Date()) // 'date'
  		 * canonicalType(/foo/) // 'regexp'
  		 * canonicalType('type') // 'string'
  		 * canonicalType(global) // 'global'
  		 * canonicalType(new String('foo') // 'object'
  		 * canonicalType(async function() {}) // 'asyncfunction'
  		 * canonicalType(Object.create(null)) // 'null-prototype'
  		 */
  		var canonicalType = (exports.canonicalType = function canonicalType(value) {
  		  if (value === undefined) {
  		    return "undefined";
  		  } else if (value === null) {
  		    return "null";
  		  } else if (Buffer.isBuffer(value)) {
  		    return "buffer";
  		  } else if (Object.getPrototypeOf(value) === null) {
  		    return "null-prototype";
  		  }

  		  return Object.prototype.toString
  		    .call(value)
  		    .replace(/^\[.+\s(.+?)]$/, "$1")
  		    .toLowerCase();
  		});

  		/**
  		 *
  		 * Returns a general type or data structure of a variable
  		 * @private
  		 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures
  		 * @param {*} value The value to test.
  		 * @returns {string} One of undefined, boolean, number, string, bigint, symbol, object
  		 * @example
  		 * type({}) // 'object'
  		 * type([]) // 'array'
  		 * type(1) // 'number'
  		 * type(false) // 'boolean'
  		 * type(Infinity) // 'number'
  		 * type(null) // 'null'
  		 * type(new Date()) // 'object'
  		 * type(/foo/) // 'object'
  		 * type('type') // 'string'
  		 * type(global) // 'object'
  		 * type(new String('foo') // 'string'
  		 */
  		exports.type = function type(value) {
  		  // Null is special
  		  if (value === null) return "null";
  		  const primitives = new Set([
  		    "undefined",
  		    "boolean",
  		    "number",
  		    "string",
  		    "bigint",
  		    "symbol",
  		  ]);
  		  const _type = typeof value;
  		  if (_type === "function") return _type;
  		  if (primitives.has(_type)) return _type;
  		  if (value instanceof String) return "string";
  		  if (value instanceof Error) return "error";
  		  if (Array.isArray(value)) return "array";

  		  return _type;
  		};

  		/**
  		 * Stringify `value`. Different behavior depending on type of value:
  		 *
  		 * - If `value` is undefined or null, return `'[undefined]'` or `'[null]'`, respectively.
  		 * - If `value` is not an object, function or array, return result of `value.toString()` wrapped in double-quotes.
  		 * - If `value` is an *empty* object, function, or array, return result of function
  		 *   {@link emptyRepresentation}.
  		 * - If `value` has properties, call {@link exports.canonicalize} on it, then return result of
  		 *   JSON.stringify().
  		 *
  		 * @private
  		 * @see exports.type
  		 * @param {*} value
  		 * @return {string}
  		 */
  		exports.stringify = function (value) {
  		  var typeHint = canonicalType(value);

  		  if (!~["object", "array", "function", "null-prototype"].indexOf(typeHint)) {
  		    if (typeHint === "buffer") {
  		      var json = Buffer.prototype.toJSON.call(value);
  		      // Based on the toJSON result
  		      return jsonStringify(
  		        json.data && json.type ? json.data : json,
  		        2,
  		      ).replace(/,(\n|$)/g, "$1");
  		    }

  		    // Boxed String objects (new String("foo")): expand into character-indexed object.
  		    if (typeHint === "string" && typeof value === "object") {
  		      value = value.split("").reduce(function (acc, char, idx) {
  		        acc[idx] = char;
  		        return acc;
  		      }, {});
  		      typeHint = "object";
  		    } else {
  		      return jsonStringify(value);
  		    }
  		  }

  		  for (var prop in value) {
  		    if (Object.prototype.hasOwnProperty.call(value, prop)) {
  		      return jsonStringify(
  		        exports.canonicalize(value, null, typeHint),
  		        2,
  		      ).replace(/,(\n|$)/g, "$1");
  		    }
  		  }

  		  return emptyRepresentation(value, typeHint);
  		};

  		/**
  		 * like JSON.stringify but more sense.
  		 *
  		 * @private
  		 * @param {Object}  object
  		 * @param {number=} spaces
  		 * @param {number=} depth
  		 * @returns {*}
  		 */
  		function jsonStringify(object, spaces, depth) {
  		  if (typeof spaces === "undefined") {
  		    // primitive types
  		    return _stringify(object);
  		  }

  		  depth = depth || 1;
  		  var space = spaces * depth;
  		  var str = Array.isArray(object) ? "[" : "{";
  		  var end = Array.isArray(object) ? "]" : "}";
  		  var length =
  		    typeof object.length === "number"
  		      ? object.length
  		      : Object.keys(object).length;
  		  function _stringify(val) {
  		    switch (canonicalType(val)) {
  		      case "null":
  		      case "undefined":
  		        val = "[" + val + "]";
  		        break;
  		      case "array":
  		      case "object":
  		        val = jsonStringify(val, spaces, depth + 1);
  		        break;
  		      case "boolean":
  		      case "regexp":
  		      case "symbol":
  		      case "number":
  		        val =
  		          val === 0 && 1 / val === -Infinity // `-0`
  		            ? "-0"
  		            : val.toString();
  		        break;
  		      case "bigint":
  		        val = val.toString() + "n";
  		        break;
  		      case "date":
  		        var sDate = isNaN(val.getTime()) ? val.toString() : val.toISOString();
  		        val = "[Date: " + sDate + "]";
  		        break;
  		      case "buffer":
  		        var json = val.toJSON();
  		        // Based on the toJSON result
  		        json = json.data && json.type ? json.data : json;
  		        val = "[Buffer: " + jsonStringify(json, 2, depth + 1) + "]";
  		        break;
  		      default:
  		        val =
  		          val === "[Function]" || val === "[Circular]"
  		            ? val
  		            : JSON.stringify(val); // string
  		    }
  		    return val;
  		  }

  		  for (var i in object) {
  		    if (!Object.prototype.hasOwnProperty.call(object, i)) {
  		      continue; // not my business
  		    }
  		    --length;
  		    str +=
  		      "\n " +
  		      " ".repeat(space - 1) +
  		      (Array.isArray(object) ? "" : '"' + i + '": ') + // key
  		      _stringify(object[i]) + // value
  		      (length ? "," : ""); // comma
  		  }

  		  return (
  		    str +
  		    // [], {}
  		    (str.length !== 1 ? "\n" + " ".repeat(Math.max(0, space - 2)) + end : end)
  		  );
  		}

  		/**
  		 * Return a new Thing that has the keys in sorted order. Recursive.
  		 *
  		 * If the Thing...
  		 * - has already been seen, return string `'[Circular]'`
  		 * - is `undefined`, return string `'[undefined]'`
  		 * - is `null`, return value `null`
  		 * - is some other primitive, return the value
  		 * - is not a primitive or an `Array`, `Object`, or `Function`, return the value of the Thing's `toString()` method
  		 * - is a non-empty `Array`, `Object`, or `Function`, return the result of calling this function again.
  		 * - is an empty `Array`, `Object`, or `Function`, return the result of calling `emptyRepresentation()`
  		 *
  		 * @private
  		 * @see {@link exports.stringify}
  		 * @param {*} value Thing to inspect.  May or may not have properties.
  		 * @param {Array} [stack=[]] Stack of seen values
  		 * @param {string} [typeHint] Type hint
  		 * @return {(Object|Array|Function|string|undefined)}
  		 */
  		exports.canonicalize = function canonicalize(value, stack, typeHint) {
  		  var canonicalizedObj;

  		  var prop;

  		  typeHint = typeHint || canonicalType(value);
  		  function withStack(value, fn) {
  		    stack.push(value);
  		    fn();
  		    stack.pop();
  		  }

  		  stack = stack || [];

  		  if (stack.indexOf(value) !== -1) {
  		    return "[Circular]";
  		  }

  		  switch (typeHint) {
  		    case "undefined":
  		    case "buffer":
  		    case "null":
  		      canonicalizedObj = value;
  		      break;
  		    case "array":
  		      withStack(value, function () {
  		        canonicalizedObj = value.map(function (item) {
  		          return exports.canonicalize(item, stack);
  		        });
  		      });
  		      break;
  		    case "function":
  		      /* eslint-disable-next-line no-unused-vars */
  		      for (prop in value) {
  		        canonicalizedObj = {};
  		        break;
  		      }

  		      if (!canonicalizedObj) {
  		        canonicalizedObj = emptyRepresentation(value, typeHint);
  		        break;
  		      }
  		    /* falls through */
  		    case "null-prototype":
  		    case "object":
  		      canonicalizedObj = canonicalizedObj || {};
  		      if (typeHint === "null-prototype" && Symbol.toStringTag in value) {
  		        canonicalizedObj["[Symbol.toStringTag]"] = value[Symbol.toStringTag];
  		      }
  		      withStack(value, function () {
  		        Object.keys(value)
  		          .sort()
  		          .forEach(function (key) {
  		            canonicalizedObj[key] = exports.canonicalize(value[key], stack);
  		          });
  		      });
  		      break;
  		    case "date":
  		    case "number":
  		    case "regexp":
  		    case "boolean":
  		    case "symbol":
  		      canonicalizedObj = value;
  		      break;
  		    default:
  		      canonicalizedObj = value + "";
  		  }

  		  return canonicalizedObj;
  		};

  		/**
  		 * @summary
  		 * This Filter based on `mocha-clean` module.(see: `github.com/rstacruz/mocha-clean`)
  		 * @description
  		 * When invoking this function you get a filter function that get the Error.stack as an input,
  		 * and return a prettify output.
  		 * (i.e: strip Mocha and internal node functions from stack trace).
  		 * @returns {Function}
  		 */
  		exports.stackTraceFilter = function () {
  		  // TODO: Replace with `process.browser`
  		  var is = typeof document === "undefined" ? { node: true } : { };
  		  var slash = path.sep;
  		  var cwd;
  		  if (is.node) {
  		    cwd = exports.cwd() + slash;
  		  } else {
  		    cwd = (
  		      typeof location === "undefined" ? window.location : location
  		    ).href.replace(/\/[^/]*$/, "/");
  		    slash = "/";
  		  }

  		  function isMochaInternal(line) {
  		    return (
  		      ~line.indexOf("node_modules" + slash + "mocha" + slash) ||
  		      ~line.indexOf(slash + "mocha.js") ||
  		      ~line.indexOf(slash + "mocha.min.js")
  		    );
  		  }

  		  function isNodeInternal(line) {
  		    return (
  		      ~line.indexOf("(timers.js:") ||
  		      ~line.indexOf("(events.js:") ||
  		      ~line.indexOf("(node.js:") ||
  		      ~line.indexOf("(module.js:") ||
  		      ~line.indexOf("GeneratorFunctionPrototype.next (native)") ||
  		      false
  		    );
  		  }

  		  return function (stack) {
  		    stack = stack.split("\n");

  		    stack = stack.reduce(function (list, line) {
  		      if (isMochaInternal(line)) {
  		        return list;
  		      }

  		      if (is.node && isNodeInternal(line)) {
  		        return list;
  		      }

  		      // Clean up cwd(absolute)
  		      if (/:\d+:\d+\)?$/.test(line)) {
  		        line = line.replace("(" + cwd, "(");
  		      }

  		      list.push(line);
  		      return list;
  		    }, []);

  		    return stack.join("\n");
  		  };
  		};

  		/**
  		 * Crude, but effective.
  		 * @public
  		 * @param {*} value
  		 * @returns {boolean} Whether or not `value` is a Promise
  		 */
  		exports.isPromise = function isPromise(value) {
  		  return (
  		    typeof value === "object" &&
  		    value !== null &&
  		    typeof value.then === "function"
  		  );
  		};

  		/**
  		 * Clamps a numeric value to an inclusive range.
  		 *
  		 * @param {number} value - Value to be clamped.
  		 * @param {number[]} range - Two element array specifying [min, max] range.
  		 * @returns {number} clamped value
  		 */
  		exports.clamp = function clamp(value, range) {
  		  return Math.min(Math.max(value, range[0]), range[1]);
  		};

  		/**
  		 * It's a noop.
  		 * @public
  		 */
  		exports.noop = function () {};

  		/**
  		 * Creates a map-like object.
  		 *
  		 * @description
  		 * A "map" is an object with no prototype, for our purposes. In some cases
  		 * this would be more appropriate than a `Map`, especially if your environment
  		 * doesn't support it. Recommended for use in Mocha's public APIs.
  		 *
  		 * @public
  		 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#Custom_and_Null_objects|MDN:Map}
  		 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create#Custom_and_Null_objects|MDN:Object.create - Custom objects}
  		 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign#Custom_and_Null_objects|MDN:Object.assign}
  		 * @param {...*} [obj] - Arguments to `Object.assign()`.
  		 * @returns {Object} An object with no prototype, having `...obj` properties
  		 */
  		exports.createMap = function () {
  		  return Object.assign.apply(
  		    null,
  		    [Object.create(null)].concat(Array.prototype.slice.call(arguments)),
  		  );
  		};

  		/**
  		 * Creates a read-only map-like object.
  		 *
  		 * @description
  		 * This differs from {@link module:utils.createMap createMap} only in that
  		 * the argument must be non-empty, because the result is frozen.
  		 *
  		 * @see {@link module:utils.createMap createMap}
  		 * @param {...*} [obj] - Arguments to `Object.assign()`.
  		 * @returns {Object} A frozen object with no prototype, having `...obj` properties
  		 * @throws {TypeError} if argument is not a non-empty object.
  		 */
  		exports.defineConstants = function (obj) {
  		  if (canonicalType(obj) !== "object" || !Object.keys(obj).length) {
  		    throw new TypeError("Invalid argument; expected a non-empty object");
  		  }
  		  return Object.freeze(exports.createMap(obj));
  		};

  		/**
  		 * Returns current working directory
  		 *
  		 * Wrapper around `process.cwd()` for isolation
  		 * @private
  		 */
  		exports.cwd = function cwd() {
  		  return browser$1$1.cwd();
  		};

  		/**
  		 * Returns `true` if Mocha is running in a browser.
  		 * Checks for `process.browser`.
  		 * @returns {boolean}
  		 * @private
  		 */
  		exports.isBrowser = function isBrowser() {
  		  return Boolean(browser$1$1.browser);
  		};

  		/*
  		 * Casts `value` to an array; useful for optionally accepting array parameters
  		 *
  		 * It follows these rules, depending on `value`.  If `value` is...
  		 * 1. `undefined`: return an empty Array
  		 * 2. `null`: return an array with a single `null` element
  		 * 3. Any other object: return the value of `Array.from()` _if_ the object is iterable
  		 * 4. otherwise: return an array with a single element, `value`
  		 * @param {*} value - Something to cast to an Array
  		 * @returns {Array<*>}
  		 */
  		exports.castArray = function castArray(value) {
  		  if (value === undefined) {
  		    return [];
  		  }
  		  if (value === null) {
  		    return [null];
  		  }
  		  if (
  		    typeof value === "object" &&
  		    (typeof value[Symbol.iterator] === "function" || value.length !== undefined)
  		  ) {
  		    return Array.from(value);
  		  }
  		  return [value];
  		};

  		exports.constants = exports.defineConstants({
  		  MOCHA_ID_PROP_NAME,
  		});

  		const uniqueIDBase =
  		  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";

  		/**
  		 * Creates a new unique identifier
  		 * Does not create cryptographically safe ids.
  		 * Trivial copy of nanoid/non-secure
  		 * @returns {string} Unique identifier
  		 */
  		exports.uniqueID = () => {
  		  let id = "";
  		  for (let i = 0; i < 21; i++) {
  		    id += uniqueIDBase[(Math.random() * 64) | 0];
  		  }
  		  return id;
  		};

  		exports.assignNewMochaID = (obj) => {
  		  const id = exports.uniqueID();
  		  Object.defineProperty(obj, MOCHA_ID_PROP_NAME, {
  		    get() {
  		      return id;
  		    },
  		  });
  		  return obj;
  		};

  		/**
  		 * Retrieves a Mocha ID from an object, if present.
  		 * @param {*} [obj] - Object
  		 * @returns {string|void}
  		 */
  		exports.getMochaID = (obj) =>
  		  obj && typeof obj === "object" ? obj[MOCHA_ID_PROP_NAME] : undefined;

  		/**
  		 * Replaces any detected circular dependency with the string '[Circular]'
  		 * Mutates original object
  		 * @param inputObj {*}
  		 * @returns {*}
  		 */
  		exports.breakCircularDeps = (inputObj) => {
  		  const seen = new Set();

  		  function _breakCircularDeps(obj) {
  		    if (obj && typeof obj !== "object") {
  		      return obj;
  		    }

  		    if (seen.has(obj)) {
  		      return "[Circular]";
  		    }

  		    seen.add(obj);
  		    for (const k in obj) {
  		      const descriptor = Object.getOwnPropertyDescriptor(obj, k);

  		      if (descriptor && descriptor.writable) {
  		        obj[k] = _breakCircularDeps(obj[k]);
  		      }
  		    }

  		    // deleting means only a seen object that is its own child will be detected
  		    seen.delete(obj);
  		    return obj;
  		  }

  		  return _breakCircularDeps(inputObj);
  		};

  		/**
  		 * Checks if provided input can be parsed as a JavaScript Number.
  		 */
  		exports.isNumeric = (input) => {
  		  return !isNaN(parseFloat(input));
  		};

  		/**
  		 * Checks if being ran in a CI environment.
  		 *
  		 * This uses the CI env variable, which is set by most popular CI providers. Some
  		 * examples include:
  		 * Github:     https://docs.github.com/en/actions/reference/workflows-and-actions/variables
  		 * Gitlab:     https://docs.gitlab.com/ci/variables/predefined_variables/
  		 * CircleCI:   https://circleci.com/docs/reference/variables/#built-in-environment-variables
  		 * Bitbucket:  https://support.atlassian.com/bitbucket-cloud/docs/variables-and-secrets/
  		 */
  		exports.isCI = () => {
  		  return !!browser$1$1.env.CI;
  		};

  		exports.logSymbols = {
  		  info: pc.blue(isUnicodeSupported ? "ℹ" : "i"),
  		  success: pc.green(isUnicodeSupported ? "✔" : "√"),
  		  warning: pc.yellow(isUnicodeSupported ? "⚠" : "‼"),
  		  error: pc.red(isUnicodeSupported ? "✖" : "×"),
  		}; 
  	} (utils$1));
  	return utils$1;
  }

  var utilsExports = requireUtils();
  var utils = /*@__PURE__*/getDefaultExportFromCjs(utilsExports);

  var supportsColor = {};

  var _nodeResolve_empty = /*#__PURE__*/Object.freeze({
    __proto__: null,
    default: supportsColor
  });

  var require$$0$1 = /*@__PURE__*/getAugmentedNamespace(_polyfillNode_events);

  /**
   @module Pending
  */

  /**
   * Initialize a new `PendingError` error with the given message.
   *
   * @param {string} message
   */
  class PendingError extends Error {
    constructor(message) {
      super(message);
      this.name = "PendingError";
    }
  }

  var pending = /*#__PURE__*/Object.freeze({
    __proto__: null,
    PendingError: PendingError
  });

  var require$$1$1 = /*@__PURE__*/getAugmentedNamespace(pending);

  var browser = {exports: {}};

  var common;
  var hasRequiredCommon;

  function requireCommon () {
  	if (hasRequiredCommon) return common;
  	hasRequiredCommon = 1;
  	/**
  	 * This is the common logic for both the Node.js and web browser
  	 * implementations of `debug()`.
  	 */

  	function setup(env) {
  		createDebug.debug = createDebug;
  		createDebug.default = createDebug;
  		createDebug.coerce = coerce;
  		createDebug.disable = disable;
  		createDebug.enable = enable;
  		createDebug.enabled = enabled;
  		createDebug.humanize = requireMs();
  		createDebug.destroy = destroy;

  		Object.keys(env).forEach(key => {
  			createDebug[key] = env[key];
  		});

  		/**
  		* The currently active debug mode names, and names to skip.
  		*/

  		createDebug.names = [];
  		createDebug.skips = [];

  		/**
  		* Map of special "%n" handling functions, for the debug "format" argument.
  		*
  		* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
  		*/
  		createDebug.formatters = {};

  		/**
  		* Selects a color for a debug namespace
  		* @param {String} namespace The namespace string for the debug instance to be colored
  		* @return {Number|String} An ANSI color code for the given namespace
  		* @api private
  		*/
  		function selectColor(namespace) {
  			let hash = 0;

  			for (let i = 0; i < namespace.length; i++) {
  				hash = ((hash << 5) - hash) + namespace.charCodeAt(i);
  				hash |= 0; // Convert to 32bit integer
  			}

  			return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
  		}
  		createDebug.selectColor = selectColor;

  		/**
  		* Create a debugger with the given `namespace`.
  		*
  		* @param {String} namespace
  		* @return {Function}
  		* @api public
  		*/
  		function createDebug(namespace) {
  			let prevTime;
  			let enableOverride = null;
  			let namespacesCache;
  			let enabledCache;

  			function debug(...args) {
  				// Disabled?
  				if (!debug.enabled) {
  					return;
  				}

  				const self = debug;

  				// Set `diff` timestamp
  				const curr = Number(new Date());
  				const ms = curr - (prevTime || curr);
  				self.diff = ms;
  				self.prev = prevTime;
  				self.curr = curr;
  				prevTime = curr;

  				args[0] = createDebug.coerce(args[0]);

  				if (typeof args[0] !== 'string') {
  					// Anything else let's inspect with %O
  					args.unshift('%O');
  				}

  				// Apply any `formatters` transformations
  				let index = 0;
  				args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
  					// If we encounter an escaped % then don't increase the array index
  					if (match === '%%') {
  						return '%';
  					}
  					index++;
  					const formatter = createDebug.formatters[format];
  					if (typeof formatter === 'function') {
  						const val = args[index];
  						match = formatter.call(self, val);

  						// Now we need to remove `args[index]` since it's inlined in the `format`
  						args.splice(index, 1);
  						index--;
  					}
  					return match;
  				});

  				// Apply env-specific formatting (colors, etc.)
  				createDebug.formatArgs.call(self, args);

  				const logFn = self.log || createDebug.log;
  				logFn.apply(self, args);
  			}

  			debug.namespace = namespace;
  			debug.useColors = createDebug.useColors();
  			debug.color = createDebug.selectColor(namespace);
  			debug.extend = extend;
  			debug.destroy = createDebug.destroy; // XXX Temporary. Will be removed in the next major release.

  			Object.defineProperty(debug, 'enabled', {
  				enumerable: true,
  				configurable: false,
  				get: () => {
  					if (enableOverride !== null) {
  						return enableOverride;
  					}
  					if (namespacesCache !== createDebug.namespaces) {
  						namespacesCache = createDebug.namespaces;
  						enabledCache = createDebug.enabled(namespace);
  					}

  					return enabledCache;
  				},
  				set: v => {
  					enableOverride = v;
  				}
  			});

  			// Env-specific initialization logic for debug instances
  			if (typeof createDebug.init === 'function') {
  				createDebug.init(debug);
  			}

  			return debug;
  		}

  		function extend(namespace, delimiter) {
  			const newDebug = createDebug(this.namespace + (typeof delimiter === 'undefined' ? ':' : delimiter) + namespace);
  			newDebug.log = this.log;
  			return newDebug;
  		}

  		/**
  		* Enables a debug mode by namespaces. This can include modes
  		* separated by a colon and wildcards.
  		*
  		* @param {String} namespaces
  		* @api public
  		*/
  		function enable(namespaces) {
  			createDebug.save(namespaces);
  			createDebug.namespaces = namespaces;

  			createDebug.names = [];
  			createDebug.skips = [];

  			const split = (typeof namespaces === 'string' ? namespaces : '')
  				.trim()
  				.replace(/\s+/g, ',')
  				.split(',')
  				.filter(Boolean);

  			for (const ns of split) {
  				if (ns[0] === '-') {
  					createDebug.skips.push(ns.slice(1));
  				} else {
  					createDebug.names.push(ns);
  				}
  			}
  		}

  		/**
  		 * Checks if the given string matches a namespace template, honoring
  		 * asterisks as wildcards.
  		 *
  		 * @param {String} search
  		 * @param {String} template
  		 * @return {Boolean}
  		 */
  		function matchesTemplate(search, template) {
  			let searchIndex = 0;
  			let templateIndex = 0;
  			let starIndex = -1;
  			let matchIndex = 0;

  			while (searchIndex < search.length) {
  				if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === '*')) {
  					// Match character or proceed with wildcard
  					if (template[templateIndex] === '*') {
  						starIndex = templateIndex;
  						matchIndex = searchIndex;
  						templateIndex++; // Skip the '*'
  					} else {
  						searchIndex++;
  						templateIndex++;
  					}
  				} else if (starIndex !== -1) { // eslint-disable-line no-negated-condition
  					// Backtrack to the last '*' and try to match more characters
  					templateIndex = starIndex + 1;
  					matchIndex++;
  					searchIndex = matchIndex;
  				} else {
  					return false; // No match
  				}
  			}

  			// Handle trailing '*' in template
  			while (templateIndex < template.length && template[templateIndex] === '*') {
  				templateIndex++;
  			}

  			return templateIndex === template.length;
  		}

  		/**
  		* Disable debug output.
  		*
  		* @return {String} namespaces
  		* @api public
  		*/
  		function disable() {
  			const namespaces = [
  				...createDebug.names,
  				...createDebug.skips.map(namespace => '-' + namespace)
  			].join(',');
  			createDebug.enable('');
  			return namespaces;
  		}

  		/**
  		* Returns true if the given mode name is enabled, false otherwise.
  		*
  		* @param {String} name
  		* @return {Boolean}
  		* @api public
  		*/
  		function enabled(name) {
  			for (const skip of createDebug.skips) {
  				if (matchesTemplate(name, skip)) {
  					return false;
  				}
  			}

  			for (const ns of createDebug.names) {
  				if (matchesTemplate(name, ns)) {
  					return true;
  				}
  			}

  			return false;
  		}

  		/**
  		* Coerce `val`.
  		*
  		* @param {Mixed} val
  		* @return {Mixed}
  		* @api private
  		*/
  		function coerce(val) {
  			if (val instanceof Error) {
  				return val.stack || val.message;
  			}
  			return val;
  		}

  		/**
  		* XXX DO NOT USE. This is a temporary stub function.
  		* XXX It WILL be removed in the next major release.
  		*/
  		function destroy() {
  			console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
  		}

  		createDebug.enable(createDebug.load());

  		return createDebug;
  	}

  	common = setup;
  	return common;
  }

  var hasRequiredBrowser;

  function requireBrowser () {
  	if (hasRequiredBrowser) return browser.exports;
  	hasRequiredBrowser = 1;
  	(function (module, exports) {
  		/**
  		 * This is the web browser implementation of `debug()`.
  		 */

  		exports.formatArgs = formatArgs;
  		exports.save = save;
  		exports.load = load;
  		exports.useColors = useColors;
  		exports.storage = localstorage();
  		exports.destroy = (() => {
  			let warned = false;

  			return () => {
  				if (!warned) {
  					warned = true;
  					console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
  				}
  			};
  		})();

  		/**
  		 * Colors.
  		 */

  		exports.colors = [
  			'#0000CC',
  			'#0000FF',
  			'#0033CC',
  			'#0033FF',
  			'#0066CC',
  			'#0066FF',
  			'#0099CC',
  			'#0099FF',
  			'#00CC00',
  			'#00CC33',
  			'#00CC66',
  			'#00CC99',
  			'#00CCCC',
  			'#00CCFF',
  			'#3300CC',
  			'#3300FF',
  			'#3333CC',
  			'#3333FF',
  			'#3366CC',
  			'#3366FF',
  			'#3399CC',
  			'#3399FF',
  			'#33CC00',
  			'#33CC33',
  			'#33CC66',
  			'#33CC99',
  			'#33CCCC',
  			'#33CCFF',
  			'#6600CC',
  			'#6600FF',
  			'#6633CC',
  			'#6633FF',
  			'#66CC00',
  			'#66CC33',
  			'#9900CC',
  			'#9900FF',
  			'#9933CC',
  			'#9933FF',
  			'#99CC00',
  			'#99CC33',
  			'#CC0000',
  			'#CC0033',
  			'#CC0066',
  			'#CC0099',
  			'#CC00CC',
  			'#CC00FF',
  			'#CC3300',
  			'#CC3333',
  			'#CC3366',
  			'#CC3399',
  			'#CC33CC',
  			'#CC33FF',
  			'#CC6600',
  			'#CC6633',
  			'#CC9900',
  			'#CC9933',
  			'#CCCC00',
  			'#CCCC33',
  			'#FF0000',
  			'#FF0033',
  			'#FF0066',
  			'#FF0099',
  			'#FF00CC',
  			'#FF00FF',
  			'#FF3300',
  			'#FF3333',
  			'#FF3366',
  			'#FF3399',
  			'#FF33CC',
  			'#FF33FF',
  			'#FF6600',
  			'#FF6633',
  			'#FF9900',
  			'#FF9933',
  			'#FFCC00',
  			'#FFCC33'
  		];

  		/**
  		 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
  		 * and the Firebug extension (any Firefox version) are known
  		 * to support "%c" CSS customizations.
  		 *
  		 * TODO: add a `localStorage` variable to explicitly enable/disable colors
  		 */

  		// eslint-disable-next-line complexity
  		function useColors() {
  			// NB: In an Electron preload script, document will be defined but not fully
  			// initialized. Since we know we're in Chrome, we'll just detect this case
  			// explicitly
  			if (typeof window !== 'undefined' && window.process && (window.process.type === 'renderer' || window.process.__nwjs)) {
  				return true;
  			}

  			// Internet Explorer and Edge do not support colors.
  			if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
  				return false;
  			}

  			let m;

  			// Is webkit? http://stackoverflow.com/a/16459606/376773
  			// document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
  			// eslint-disable-next-line no-return-assign
  			return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
  				// Is firebug? http://stackoverflow.com/a/398120/376773
  				(typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
  				// Is firefox >= v31?
  				// https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
  				(typeof navigator !== 'undefined' && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31) ||
  				// Double check webkit in userAgent just in case we are in a worker
  				(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
  		}

  		/**
  		 * Colorize log arguments if enabled.
  		 *
  		 * @api public
  		 */

  		function formatArgs(args) {
  			args[0] = (this.useColors ? '%c' : '') +
  				this.namespace +
  				(this.useColors ? ' %c' : ' ') +
  				args[0] +
  				(this.useColors ? '%c ' : ' ') +
  				'+' + module.exports.humanize(this.diff);

  			if (!this.useColors) {
  				return;
  			}

  			const c = 'color: ' + this.color;
  			args.splice(1, 0, c, 'color: inherit');

  			// The final "%c" is somewhat tricky, because there could be other
  			// arguments passed either before or after the %c, so we need to
  			// figure out the correct index to insert the CSS into
  			let index = 0;
  			let lastC = 0;
  			args[0].replace(/%[a-zA-Z%]/g, match => {
  				if (match === '%%') {
  					return;
  				}
  				index++;
  				if (match === '%c') {
  					// We only are interested in the *last* %c
  					// (the user may have provided their own)
  					lastC = index;
  				}
  			});

  			args.splice(lastC, 0, c);
  		}

  		/**
  		 * Invokes `console.debug()` when available.
  		 * No-op when `console.debug` is not a "function".
  		 * If `console.debug` is not available, falls back
  		 * to `console.log`.
  		 *
  		 * @api public
  		 */
  		exports.log = console.debug || console.log || (() => {});

  		/**
  		 * Save `namespaces`.
  		 *
  		 * @param {String} namespaces
  		 * @api private
  		 */
  		function save(namespaces) {
  			try {
  				if (namespaces) {
  					exports.storage.setItem('debug', namespaces);
  				} else {
  					exports.storage.removeItem('debug');
  				}
  			} catch (error) {
  				// Swallow
  				// XXX (@Qix-) should we be logging these?
  			}
  		}

  		/**
  		 * Load `namespaces`.
  		 *
  		 * @return {String} returns the previously persisted debug modes
  		 * @api private
  		 */
  		function load() {
  			let r;
  			try {
  				r = exports.storage.getItem('debug') || exports.storage.getItem('DEBUG') ;
  			} catch (error) {
  				// Swallow
  				// XXX (@Qix-) should we be logging these?
  			}

  			// If debug isn't set in LS, and we're in Electron, try to load $DEBUG
  			if (!r && typeof browser$1$1 !== 'undefined' && 'env' in browser$1$1) {
  				r = browser$1$1.env.DEBUG;
  			}

  			return r;
  		}

  		/**
  		 * Localstorage attempts to return the localstorage.
  		 *
  		 * This is necessary because safari throws
  		 * when a user disables cookies/localstorage
  		 * and you attempt to access it.
  		 *
  		 * @return {LocalStorage}
  		 * @api private
  		 */

  		function localstorage() {
  			try {
  				// TVMLKit (Apple TV JS Runtime) does not have a window object, just localStorage in the global context
  				// The Browser also has localStorage in the global context.
  				return localStorage;
  			} catch (error) {
  				// Swallow
  				// XXX (@Qix-) should we be logging these?
  			}
  		}

  		module.exports = requireCommon()(exports);

  		const {formatters} = module.exports;

  		/**
  		 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
  		 */

  		formatters.j = function (v) {
  			try {
  				return JSON.stringify(v);
  			} catch (error) {
  				return '[UnexpectedJSONParseError]: ' + error.message;
  			}
  		}; 
  	} (browser, browser.exports));
  	return browser.exports;
  }

  var browserExports = requireBrowser();
  var debugModule = /*@__PURE__*/getDefaultExportFromCjs(browserExports);

  /**
   * When Mocha throws exceptions (or rejects `Promise`s), it attempts to assign a `code` property to the `Error` object, for easier handling. These are the potential values of `code`.
   * @public
   * @namespace
   * @memberof module:lib/errors
   */
  const constants$g = {
    /**
     * An unrecoverable error.
     * @constant
     * @default
     */
    FATAL: "ERR_MOCHA_FATAL",

    /**
     * The type of an argument to a function call is invalid
     * @constant
     * @default
     */
    INVALID_ARG_TYPE: "ERR_MOCHA_INVALID_ARG_TYPE",

    /**
     * The value of an argument to a function call is invalid
     * @constant
     * @default
     */
    INVALID_ARG_VALUE: "ERR_MOCHA_INVALID_ARG_VALUE",

    /**
     * Something was thrown, but it wasn't an `Error`
     * @constant
     * @default
     */
    INVALID_EXCEPTION: "ERR_MOCHA_INVALID_EXCEPTION",

    /**
     * An interface (e.g., `Mocha.interfaces`) is unknown or invalid
     * @constant
     * @default
     */
    INVALID_INTERFACE: "ERR_MOCHA_INVALID_INTERFACE",

    /**
     * A reporter (.e.g, `Mocha.reporters`) is unknown or invalid
     * @constant
     * @default
     */
    INVALID_REPORTER: "ERR_MOCHA_INVALID_REPORTER",

    /**
     * `done()` was called twice in a `Test` or `Hook` callback
     * @constant
     * @default
     */
    MULTIPLE_DONE: "ERR_MOCHA_MULTIPLE_DONE",

    /**
     * No files matched the pattern provided by the user
     * @constant
     * @default
     */
    NO_FILES_MATCH_PATTERN: "ERR_MOCHA_NO_FILES_MATCH_PATTERN",

    /**
     * Known, but unsupported behavior of some kind
     * @constant
     * @default
     */
    UNSUPPORTED: "ERR_MOCHA_UNSUPPORTED",

    /**
     * Invalid state transition occurring in `Mocha` instance
     * @constant
     * @default
     */
    INSTANCE_ALREADY_RUNNING: "ERR_MOCHA_INSTANCE_ALREADY_RUNNING",

    /**
     * Invalid state transition occurring in `Mocha` instance
     * @constant
     * @default
     */
    INSTANCE_ALREADY_DISPOSED: "ERR_MOCHA_INSTANCE_ALREADY_DISPOSED",

    /**
     * Use of `only()` w/ `--forbid-only` results in this error.
     * @constant
     * @default
     */
    FORBIDDEN_EXCLUSIVITY: "ERR_MOCHA_FORBIDDEN_EXCLUSIVITY",

    /**
     * To be thrown when a user-defined plugin implementation (e.g., `mochaHooks`) is invalid
     * @constant
     * @default
     */
    INVALID_PLUGIN_IMPLEMENTATION: "ERR_MOCHA_INVALID_PLUGIN_IMPLEMENTATION",

    /**
     * To be thrown when a builtin or third-party plugin definition (the _definition_ of `mochaHooks`) is invalid
     * @constant
     * @default
     */
    INVALID_PLUGIN_DEFINITION: "ERR_MOCHA_INVALID_PLUGIN_DEFINITION",

    /**
     * When a runnable exceeds its allowed run time.
     * @constant
     * @default
     */
    TIMEOUT: "ERR_MOCHA_TIMEOUT",

    /**
     * Input file is not able to be parsed
     * @constant
     * @default
     */
    UNPARSABLE_FILE: "ERR_MOCHA_UNPARSABLE_FILE",
  };

  var errorConstants = /*#__PURE__*/Object.freeze({
    __proto__: null,
    constants: constants$g
  });

  /**
   * @typedef {import('./mocha.cjs')} Mocha
   * @typedef {import('./runnable.js')} Runnable
   * @typedef {import('./types.d.ts').MochaTimeoutError} MochaTimeoutError
   * @typedef {import('./types.d.ts').PluginDefinition} PluginDefinition
   */


  /**
   * Contains error codes and factory functions to create throwable error objects
   * @module
   */

  /**
   * A set containing all string values of all Mocha error constants, for use by {@link isMochaError}.
   * @private
   */
  const MOCHA_ERRORS = new Set(Object.values(constants$g));

  /**
   * Creates an error object to be thrown when no files to be tested could be found using specified pattern.
   *
   * @public
   * @static
   * @param {string} message - Error message to be displayed.
   * @param {string} pattern - User-specified argument value.
   * @returns {Error} instance detailing the error condition
   */
  function createNoFilesMatchPatternError(message, pattern) {
    var err = new Error(message);
    err.code = constants$g.NO_FILES_MATCH_PATTERN;
    err.pattern = pattern;
    return err;
  }

  /**
   * Creates an error object to be thrown when the reporter specified in the options was not found.
   *
   * @public
   * @param {string} message - Error message to be displayed.
   * @param {string} reporter - User-specified reporter value.
   * @returns {Error} instance detailing the error condition
   */
  function createInvalidReporterError(message, reporter) {
    var err = new TypeError(message);
    err.code = constants$g.INVALID_REPORTER;
    err.reporter = reporter;
    return err;
  }

  /**
   * Creates an error object to be thrown when the interface specified in the options was not found.
   *
   * @public
   * @static
   * @param {string} message - Error message to be displayed.
   * @param {string} ui - User-specified interface value.
   * @returns {Error} instance detailing the error condition
   */
  function createInvalidInterfaceError(message, ui) {
    var err = new Error(message);
    err.code = constants$g.INVALID_INTERFACE;
    err.interface = ui;
    return err;
  }

  /**
   * Creates an error object to be thrown when a behavior, option, or parameter is unsupported.
   *
   * @public
   * @static
   * @param {string} message - Error message to be displayed.
   * @returns {Error} instance detailing the error condition
   */
  function createUnsupportedError$2(message) {
    var err = new Error(message);
    err.code = constants$g.UNSUPPORTED;
    return err;
  }

  /**
   * Creates an error object to be thrown when an argument is missing.
   *
   * @public
   * @static
   * @param {string} message - Error message to be displayed.
   * @param {string} argument - Argument name.
   * @param {string} expected - Expected argument datatype.
   * @returns {Error} instance detailing the error condition
   */
  function createMissingArgumentError(message, argument, expected) {
    return createInvalidArgumentTypeError(message, argument, expected);
  }

  /**
   * Creates an error object to be thrown when an argument did not use the supported type
   *
   * @public
   * @static
   * @param {string} message - Error message to be displayed.
   * @param {string} argument - Argument name.
   * @param {string} expected - Expected argument datatype.
   * @returns {Error} instance detailing the error condition
   */
  function createInvalidArgumentTypeError(message, argument, expected) {
    var err = new TypeError(message);
    err.code = constants$g.INVALID_ARG_TYPE;
    err.argument = argument;
    err.expected = expected;
    err.actual = typeof argument;
    return err;
  }

  /**
   * Creates an error object to be thrown when an argument did not use the supported value
   *
   * @public
   * @static
   * @param {string} message - Error message to be displayed.
   * @param {string} argument - Argument name.
   * @param {string} value - Argument value.
   * @param {string} [reason] - Why value is invalid.
   * @returns {Error} instance detailing the error condition
   */
  function createInvalidArgumentValueError(message, argument, value, reason) {
    var err = new TypeError(message);
    err.code = constants$g.INVALID_ARG_VALUE;
    err.argument = argument;
    err.value = value;
    err.reason = typeof reason !== "undefined" ? reason : "is invalid";
    return err;
  }

  /**
   * Creates an error object to be thrown when an exception was caught, but the `Error` is falsy or undefined.
   *
   * @public
   * @static
   * @param {string} message - Error message to be displayed.
   * @returns {Error} instance detailing the error condition
   */
  function createInvalidExceptionError(message, value) {
    var err = new Error(message);
    err.code = constants$g.INVALID_EXCEPTION;
    err.valueType = typeof value;
    err.value = value;
    return err;
  }

  /**
   * Creates an error object to be thrown when an unrecoverable error occurs.
   *
   * @public
   * @static
   * @param {string} message - Error message to be displayed.
   * @returns {Error} instance detailing the error condition
   */
  function createFatalError(message, value) {
    var err = new Error(message);
    err.code = constants$g.FATAL;
    err.valueType = typeof value;
    err.value = value;
    return err;
  }

  /**
   * Dynamically creates a plugin-type-specific error based on plugin type
   * @param {string} message - Error message
   * @param {"reporter"|"ui"} pluginType - Plugin type. Future: expand as needed
   * @param {string} [pluginId] - Name/path of plugin, if any
   * @throws When `pluginType` is not known
   * @public
   * @static
   * @returns {Error}
   */
  function createInvalidLegacyPluginError(message, pluginType, pluginId) {
    switch (pluginType) {
      case "reporter":
        return createInvalidReporterError(message, pluginId);
      case "ui":
        return createInvalidInterfaceError(message, pluginId);
      default:
        throw new Error('unknown pluginType "' + pluginType + '"');
    }
  }

  /**
   * Creates an error object to be thrown when a mocha object's `run` method is executed while it is already disposed.
   * @param {string} message The error message to be displayed.
   * @param {boolean} cleanReferencesAfterRun the value of `cleanReferencesAfterRun`
   * @param {Mocha} instance the mocha instance that throw this error
   * @static
   */
  function createMochaInstanceAlreadyDisposedError(
    message,
    cleanReferencesAfterRun,
    instance,
  ) {
    var err = new Error(message);
    err.code = constants$g.INSTANCE_ALREADY_DISPOSED;
    err.cleanReferencesAfterRun = cleanReferencesAfterRun;
    err.instance = instance;
    return err;
  }

  /**
   * Creates an error object to be thrown when a mocha object's `run` method is called while a test run is in progress.
   * @param {string} message The error message to be displayed.
   * @static
   * @public
   */
  function createMochaInstanceAlreadyRunningError(message, instance) {
    var err = new Error(message);
    err.code = constants$g.INSTANCE_ALREADY_RUNNING;
    err.instance = instance;
    return err;
  }

  /**
   * Creates an error object to be thrown when done() is called multiple times in a test
   *
   * @public
   * @param {Runnable} runnable - Original runnable
   * @param {Error} [originalErr] - Original error, if any
   * @returns {Error} instance detailing the error condition
   * @static
   */
  function createMultipleDoneError(runnable, originalErr) {
    var title;
    try {
      title = format("<%s>", runnable.fullTitle());
      if (runnable.parent.root) {
        title += " (of root suite)";
      }
    } catch {
      title = format("<%s> (of unknown suite)", runnable.title);
    }
    var message = format(
      "done() called multiple times in %s %s",
      runnable.type ? runnable.type : "unknown runnable",
      title,
    );
    if (runnable.file) {
      message += format(" of file %s", runnable.file);
    }
    if (originalErr) {
      message += format("; in addition, done() received error: %s", originalErr);
    }

    var err = new Error(message);
    err.code = constants$g.MULTIPLE_DONE;
    err.valueType = typeof originalErr;
    err.value = originalErr;
    return err;
  }

  /**
   * Creates an error object to be thrown when `.only()` is used with
   * `--forbid-only`.
   * @static
   * @public
   * @param {Mocha} mocha - Mocha instance
   * @returns {Error} Error with code {@link constants.FORBIDDEN_EXCLUSIVITY}
   */
  function createForbiddenExclusivityError(mocha) {
    var message;
    if (mocha.isWorker) {
      message = "`.only` is not supported in parallel mode";
    } else {
      message = "`.only` forbidden by --forbid-only";
      if (utilsExports.isCI()) {
        message += " (default in CI, add `--no-forbid-only` to allow `.only`)";
      }
    }

    var err = new Error(message);
    err.code = constants$g.FORBIDDEN_EXCLUSIVITY;
    return err;
  }

  /**
   * Creates an error object to be thrown when a plugin definition is invalid
   * @static
   * @param {string} msg - Error message
   * @param {PluginDefinition} [pluginDef] - Problematic plugin definition
   * @public
   * @returns {Error} Error with code {@link constants.INVALID_PLUGIN_DEFINITION}
   */
  function createInvalidPluginDefinitionError(msg, pluginDef) {
    const err = new Error(msg);
    err.code = constants$g.INVALID_PLUGIN_DEFINITION;
    err.pluginDef = pluginDef;
    return err;
  }

  /**
   * Creates an error object to be thrown when a plugin implementation (user code) is invalid
   * @static
   * @param {string} msg - Error message
   * @param {Object} [opts] - Plugin definition and user-supplied implementation
   * @param {PluginDefinition} [opts.pluginDef] - Plugin Definition
   * @param {*} [opts.pluginImpl] - Plugin Implementation (user-supplied)
   * @public
   * @returns {Error} Error with code {@link constants.INVALID_PLUGIN_DEFINITION}
   */
  function createInvalidPluginImplementationError(
    msg,
    { pluginDef, pluginImpl } = {},
  ) {
    const err = new Error(msg);
    err.code = constants$g.INVALID_PLUGIN_IMPLEMENTATION;
    err.pluginDef = pluginDef;
    err.pluginImpl = pluginImpl;
    return err;
  }

  /**
   * Creates an error object to be thrown when a runnable exceeds its allowed run time.
   * @static
   * @param {string} msg - Error message
   * @param {number} [timeout] - Timeout in ms
   * @param {string} [file] - File, if given
   * @returns {MochaTimeoutError}
   */
  function createTimeoutError(msg, timeout, file) {
    const err = new Error(msg);
    err.code = constants$g.TIMEOUT;
    err.timeout = timeout;
    err.file = file;
    return err;
  }

  /**
   * Creates an error object to be thrown when file is unparsable
   * @public
   * @static
   * @param {string} message - Error message to be displayed.
   * @returns {Error} Error with code {@link constants.UNPARSABLE_FILE}
   */
  function createUnparsableFileError(message) {
    var err = new Error(message);
    err.code = constants$g.UNPARSABLE_FILE;
    return err;
  }

  /**
   * Returns `true` if an error came out of Mocha.
   * _Can suffer from false negatives, but not false positives._
   * @static
   * @public
   * @param {*} err - Error, or anything
   * @returns {boolean}
   */
  const isMochaError = (err) =>
    Boolean(err && typeof err === "object" && MOCHA_ERRORS.has(err.code));

  var errors = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createFatalError: createFatalError,
    createForbiddenExclusivityError: createForbiddenExclusivityError,
    createInvalidArgumentTypeError: createInvalidArgumentTypeError,
    createInvalidArgumentValueError: createInvalidArgumentValueError,
    createInvalidExceptionError: createInvalidExceptionError,
    createInvalidInterfaceError: createInvalidInterfaceError,
    createInvalidLegacyPluginError: createInvalidLegacyPluginError,
    createInvalidPluginDefinitionError: createInvalidPluginDefinitionError,
    createInvalidPluginImplementationError: createInvalidPluginImplementationError,
    createInvalidReporterError: createInvalidReporterError,
    createMissingArgumentError: createMissingArgumentError,
    createMochaInstanceAlreadyDisposedError: createMochaInstanceAlreadyDisposedError,
    createMochaInstanceAlreadyRunningError: createMochaInstanceAlreadyRunningError,
    createMultipleDoneError: createMultipleDoneError,
    createNoFilesMatchPatternError: createNoFilesMatchPatternError,
    createTimeoutError: createTimeoutError,
    createUnparsableFileError: createUnparsableFileError,
    createUnsupportedError: createUnsupportedError$2,
    isMochaError: isMochaError
  });

  const debug$1 = debugModule("mocha:runnable");

  /**
   * Save timer references to avoid Sinon interfering (see GH-237).
   * @private
   */
  var Date$4 = global$1.Date;
  var setTimeout$2 = global$1.setTimeout;
  var clearTimeout$1 = global$1.clearTimeout;
  var toString = Object.prototype.toString;

  var MAX_TIMEOUT = Math.pow(2, 31) - 1;

  class Runnable extends EventEmitter {
    // "Additional properties" doc comment added for hosted docs (mochajs.org/api)
    /**
     * Initialize a new `Runnable` with the given `title` and callback `fn`.
     * Additional properties, like `getFullTitle()` and `slow()`, can be viewed in the `Runnable` source.
     *
     * @extends external:EventEmitter
     * @public
     * @param {String} title
     * @param {Function} fn
     */
    constructor(title, fn) {
      super(title, fn);
      this.title = title;
      this.fn = fn;
      this.body = (fn || "").toString();
      this.async = fn && fn.length;
      this.sync = !this.async;
      this._timeout = 2000;
      this._slow = 75;
      this._retries = -1;
      utils.assignNewMochaID(this);
      Object.defineProperty(this, "id", {
        get() {
          return utils.getMochaID(this);
        },
      });
      this.reset();
    }

    /**
     * Resets the state initially or for a next run.
     */
    reset() {
      this.timedOut = false;
      this._currentRetry = 0;
      this.pending = false;
      delete this.state;
      delete this.err;
    }

    /**
     * Get current timeout value in msecs.
     *
     * @private
     * @returns {number} current timeout threshold value
     */
    /**
     * @summary
     * Set timeout threshold value (msecs).
     *
     * @description
     * A string argument can use shorthand (e.g., "2s") and will be converted.
     * The value will be clamped to range [<code>0</code>, <code>2^<sup>31</sup>-1</code>].
     * If clamped value matches either range endpoint, timeouts will be disabled.
     *
     * @private
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout#Maximum_delay_value}
     * @param {number|string} ms - Timeout threshold value.
     * @returns {Runnable} this
     * @chainable
     */
    timeout(ms$1) {
      if (!arguments.length) {
        return this._timeout;
      }
      if (typeof ms$1 === "string") {
        ms$1 = ms(ms$1);
      }

      // Clamp to range
      var range = [0, MAX_TIMEOUT];
      ms$1 = utils.clamp(ms$1, range);

      // see #1652 for reasoning
      if (ms$1 === range[0] || ms$1 === range[1]) {
        this._timeout = 0;
      } else {
        this._timeout = ms$1;
      }
      debug$1("timeout %d", this._timeout);

      if (this.timer) {
        this.resetTimeout();
      }
      return this;
    }

    /**
     * Set or get slow `ms`.
     *
     * @private
     * @param {number|string} ms
     * @return {Runnable|number} ms or Runnable instance.
     */
    slow(ms$1) {
      if (!arguments.length || typeof ms$1 === "undefined") {
        return this._slow;
      }
      if (typeof ms$1 === "string") {
        ms$1 = ms(ms$1);
      }
      debug$1("slow %d", ms$1);
      this._slow = ms$1;
      return this;
    }

    /**
     * Halt and mark as pending.
     *
     * @memberof Mocha.Runnable
     * @public
     */
    skip() {
      this.pending = true;
      throw new PendingError("sync skip; aborting execution");
    }

    /**
     * Check if this runnable or its parent suite is marked as pending.
     *
     * @private
     */
    isPending() {
      return this.pending || (this.parent && this.parent.isPending());
    }

    /**
     * Return `true` if this Runnable has failed.
     * @return {boolean}
     * @private
     */
    isFailed() {
      return !this.isPending() && this.state === Runnable.constants.STATE_FAILED;
    }

    /**
     * Return `true` if this Runnable has passed.
     * @return {boolean}
     * @private
     */
    isPassed() {
      return !this.isPending() && this.state === Runnable.constants.STATE_PASSED;
    }

    /**
     * Set or get number of retries.
     *
     * @private
     */
    retries(n) {
      if (!arguments.length) {
        return this._retries;
      }
      this._retries = n;
    }

    /**
     * Set or get current retry
     *
     * @private
     */
    currentRetry(n) {
      if (!arguments.length) {
        return this._currentRetry;
      }
      this._currentRetry = n;
    }

    /**
     * Return the full title generated by recursively concatenating the parent's
     * full title.
     *
     * @memberof Mocha.Runnable
     * @public
     * @return {string}
     */
    fullTitle() {
      return this.titlePath().join(" ");
    }

    /**
     * Return the title path generated by concatenating the parent's title path with the title.
     *
     * @memberof Mocha.Runnable
     * @public
     * @return {string[]}
     */
    titlePath() {
      return this.parent.titlePath().concat([this.title]);
    }

    /**
     * Clear the timeout.
     *
     * @private
     */
    clearTimeout() {
      clearTimeout$1(this.timer);
    }

    /**
     * Reset the timeout.
     *
     * @private
     */
    resetTimeout() {
      var self = this;
      var ms = this.timeout() || MAX_TIMEOUT;

      this.clearTimeout();
      this.timer = setTimeout$2(function () {
        if (self.timeout() === 0) {
          return;
        }
        self.callback(self._timeoutError(ms));
        self.timedOut = true;
      }, ms);
    }

    /**
     * Set or get a list of whitelisted globals for this test run.
     *
     * @private
     * @param {string[]} globals
     */
    globals(globals) {
      if (!arguments.length) {
        return this._allowedGlobals;
      }
      this._allowedGlobals = globals;
    }

    /**
     * Run the test and invoke `fn(err)`.
     *
     * @param {Function} fn
     * @private
     */
    run(fn) {
      var self = this;
      var start = new Date$4();
      var ctx = this.ctx;
      var finished;
      var errorWasHandled = false;

      if (this.isPending()) return fn();

      // Sometimes the ctx exists, but it is not runnable
      if (ctx && ctx.runnable) {
        ctx.runnable(this);
      }

      // called multiple times
      function multiple(err) {
        if (errorWasHandled) {
          return;
        }
        errorWasHandled = true;
        self.emit("error", createMultipleDoneError(self, err));
      }

      // finished
      function done(err) {
        var ms = self.timeout();
        if (self.timedOut) {
          return;
        }

        if (finished) {
          return multiple(err);
        }

        self.clearTimeout();
        self.duration = new Date$4() - start;
        finished = true;
        if (!err && self.duration > ms && ms > 0) {
          err = self._timeoutError(ms);
        }
        fn(err);
      }

      // for .resetTimeout() and Runner#uncaught()
      this.callback = done;

      if (this.fn && typeof this.fn.call !== "function") {
        done(
          new TypeError(
            "A runnable must be passed a function as its second argument.",
          ),
        );
        return;
      }

      // explicit async with `done` argument
      if (this.async) {
        this.resetTimeout();

        // allows skip() to be used in an explicit async context
        this.skip = function asyncSkip() {
          this.pending = true;
          done();
          // halt execution, the uncaught handler will ignore the failure.
          throw new PendingError("async skip; aborting execution");
        };

        try {
          callFnAsync(this.fn);
        } catch (err) {
          // handles async runnables which actually run synchronously
          errorWasHandled = true;
          if (err instanceof PendingError) {
            return; // done() is already called in this.skip()
          } else if (this.allowUncaught) {
            throw err;
          }
          done(Runnable.toValueOrError(err));
        }
        return;
      }

      // sync or promise-returning
      try {
        callFn(this.fn);
      } catch (err) {
        errorWasHandled = true;
        if (err instanceof PendingError) {
          return done();
        } else if (this.allowUncaught) {
          throw err;
        }
        done(Runnable.toValueOrError(err));
      }

      function callFn(fn) {
        var result = fn.call(ctx);
        if (result && typeof result.then === "function") {
          self.resetTimeout();
          result.then(
            function () {
              done();
              // Return null so libraries like bluebird do not warn about
              // subsequently constructed Promises.
              return null;
            },
            function (reason) {
              done(
                reason || new Error("Promise rejected with no or falsy reason"),
              );
            },
          );
        } else {
          if (self.asyncOnly) {
            return done(
              new Error(
                "--async-only option in use without declaring `done()` or returning a promise",
              ),
            );
          }

          done();
        }
      }

      function callFnAsync(fn) {
        var result = fn.call(ctx, function (err) {
          if (err instanceof Error || toString.call(err) === "[object Error]") {
            return done(err);
          }
          if (err) {
            if (Object.prototype.toString.call(err) === "[object Object]") {
              return done(
                new Error(
                  "done() invoked with non-Error: " + JSON.stringify(err),
                ),
              );
            }
            return done(new Error("done() invoked with non-Error: " + err));
          }
          if (result && utils.isPromise(result)) {
            return done(
              new Error(
                "Resolution method is overspecified. Specify a callback *or* return a Promise; not both.",
              ),
            );
          }

          done();
        });
      }
    }

    /**
     * Instantiates a "timeout" error
     *
     * @param {number} ms - Timeout (in milliseconds)
     * @returns {Error} a "timeout" error
     * @private
     */
    _timeoutError(ms) {
      let msg = `Timeout of ${ms}ms exceeded. For async tests and hooks, ensure "done()" is called; if returning a Promise, ensure it resolves.`;
      if (this.file) {
        msg += " (" + this.file + ")";
      }
      return createTimeoutError(msg, ms, this.file);
    }

    static constants = utils.defineConstants(
      /**
       * {@link Runnable}-related Runnable.constants.
       * @public
       * @memberof Runnable
       * @readonly
       * @static
       * @alias constants
       * @enum {string}
       */
      {
        /**
         * Value of `state` prop when a `Runnable` has failed
         */
        STATE_FAILED: "failed",
        /**
         * Value of `state` prop when a `Runnable` has passed
         */
        STATE_PASSED: "passed",
        /**
         * Value of `state` prop when a `Runnable` has been skipped by user
         */
        STATE_PENDING: "pending",
      },
    );

    /**
     * Given `value`, return identity if truthy, otherwise create an "invalid exception" error and return that.
     * @param {*} [value] - Value to return, if present
     * @returns {*|Error} `value`, otherwise an `Error`
     * @private
     */
    static toValueOrError(value) {
      return (
        value ||
        createInvalidExceptionError(
          "Runnable failed with falsy or undefined exception. Please throw an Error instead.",
          value,
        )
      );
    }
  }

  var runnable = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Runnable: Runnable
  });

  var require$$11$1 = /*@__PURE__*/getAugmentedNamespace(runnable);

  const { MOCHA_ID_PROP_NAME: MOCHA_ID_PROP_NAME$2 } = utils.constants;

  class Hook extends Runnable {
    /**
     * Initialize a new `Hook` with the given `title` and callback `fn`
     *
     * @extends Runnable
     * @param {String} title
     * @param {Function} fn
     */
    constructor(title, fn) {
      super(title, fn);
      this.type = "hook";
    }

    /**
     * Resets the state for a next run.
     */
    reset() {
      super.reset(this);
      delete this._error;
    }

    /**
     * Get or set the test `err`.
     *
     * @memberof Hook
     * @public
     * @param {Error} err
     * @return {Error}
     */
    error(err) {
      if (!arguments.length) {
        err = this._error;
        this._error = null;
        return err;
      }

      this._error = err;
    }

    /**
     * Returns an object suitable for IPC.
     * Functions are represented by keys beginning with `$$`.
     * @private
     * @returns {Object}
     */
    serialize() {
      return {
        $$currentRetry: this.currentRetry(),
        $$fullTitle: this.fullTitle(),
        $$isPending: Boolean(this.isPending()),
        $$titlePath: this.titlePath(),
        ctx:
          this.ctx && this.ctx.currentTest
            ? {
                currentTest: {
                  title: this.ctx.currentTest.title,
                  [MOCHA_ID_PROP_NAME$2]: this.ctx.currentTest.id,
                },
              }
            : {},
        duration: this.duration,
        file: this.file,
        parent: {
          $$fullTitle: this.parent.fullTitle(),
          [MOCHA_ID_PROP_NAME$2]: this.parent.id,
        },
        state: this.state,
        title: this.title,
        type: this.type,
        [MOCHA_ID_PROP_NAME$2]: this.id,
      };
    }
  }

  var hook = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Hook: Hook
  });

  /**
   * @typedef {import('./test.js')} Test
   */


  const {
    assignNewMochaID,
    clamp,
    constants: utilsConstants,
    defineConstants,
    getMochaID,
    isString: isString$1,
  } = utils;
  const debug = debugModule("mocha:suite");

  const { MOCHA_ID_PROP_NAME: MOCHA_ID_PROP_NAME$1 } = utilsConstants;

  class Suite extends EventEmitter {
    static constants = defineConstants(
      /**
       * {@link Suite}-related constants.
       * @public
       * @memberof Suite
       * @alias constants
       * @readonly
       * @static
       * @enum {string}
       */
      {
        /**
         * Event emitted after a test file has been loaded. Not emitted in browser.
         */
        EVENT_FILE_POST_REQUIRE: "post-require",
        /**
         * Event emitted before a test file has been loaded. In browser, this is emitted once an interface has been selected.
         */
        EVENT_FILE_PRE_REQUIRE: "pre-require",
        /**
         * Event emitted immediately after a test file has been loaded. Not emitted in browser.
         */
        EVENT_FILE_REQUIRE: "require",
        /**
         * Event emitted when `global.run()` is called (use with `delay` option).
         */
        EVENT_ROOT_SUITE_RUN: "run",

        /**
         * Namespace for collection of a `Suite`'s "after all" hooks.
         */
        HOOK_TYPE_AFTER_ALL: "afterAll",
        /**
         * Namespace for collection of a `Suite`'s "after each" hooks.
         */
        HOOK_TYPE_AFTER_EACH: "afterEach",
        /**
         * Namespace for collection of a `Suite`'s "before all" hooks.
         */
        HOOK_TYPE_BEFORE_ALL: "beforeAll",
        /**
         * Namespace for collection of a `Suite`'s "before each" hooks.
         */
        HOOK_TYPE_BEFORE_EACH: "beforeEach",

        /**
         * Emitted after a child `Suite` has been added to a `Suite`.
         */
        EVENT_SUITE_ADD_SUITE: "suite",
        /**
         * Emitted after an "after all" `Hook` has been added to a `Suite`.
         */
        EVENT_SUITE_ADD_HOOK_AFTER_ALL: "afterAll",
        /**
         * Emitted after an "after each" `Hook` has been added to a `Suite`.
         */
        EVENT_SUITE_ADD_HOOK_AFTER_EACH: "afterEach",
        /**
         * Emitted after an "before all" `Hook` has been added to a `Suite`.
         */
        EVENT_SUITE_ADD_HOOK_BEFORE_ALL: "beforeAll",
        /**
         * Emitted after an "before each" `Hook` has been added to a `Suite`.
         */
        EVENT_SUITE_ADD_HOOK_BEFORE_EACH: "beforeEach",
        /**
         * Emitted after a `Test` has been added to a `Suite`.
         */
        EVENT_SUITE_ADD_TEST: "test",
      },
    );

    /**
     * Create a new `Suite` with the given `title` and parent `Suite`.
     *
     * @public
     * @param {Suite} parent - Parent suite (required!)
     * @param {string} title - Title
     * @return {Suite}
     */
    static create(parent, title) {
      var suite = new Suite(title, parent.ctx);
      suite.parent = parent;
      parent.addSuite(suite);
      return suite;
    }

    /**
     * Constructs a new `Suite` instance with the given `title`, `ctx`, and `isRoot`.
     *
     * @public
     * @extends EventEmitter
     * @see {@link https://nodejs.org/api/events.html#events_class_eventemitter|EventEmitter}
     * @param {string} title - Suite title.
     * @param {Context} parentContext - Parent context instance.
     * @param {boolean} [isRoot=false] - Whether this is the root suite.
     */
    constructor(title, parentContext, isRoot) {
      if (!isString$1(title)) {
        throw createInvalidArgumentTypeError(
          'Suite argument "title" must be a string. Received type "' +
            typeof title +
            '"',
          "title",
          "string",
        );
      }
      super();
      this.title = title;
      function Context() {}
      Context.prototype = parentContext;
      this.ctx = new Context();
      this.suites = [];
      this.tests = [];
      this.root = isRoot === true;
      this.pending = false;
      this._retries = -1;
      this._beforeEach = [];
      this._beforeAll = [];
      this._afterEach = [];
      this._afterAll = [];
      this._timeout = 2000;
      this._slow = 75;
      this._bail = false;
      this._onlyTests = [];
      this._onlySuites = [];
      assignNewMochaID(this);

      Object.defineProperty(this, "id", {
        get() {
          return getMochaID(this);
        },
      });

      this.reset();
    }

    /**
     * Resets the state initially or for a next run.
     */
    reset() {
      this.delayed = false;
      function doReset(thingToReset) {
        thingToReset.reset();
      }
      this.suites.forEach(doReset);
      this.tests.forEach(doReset);
      this._beforeEach.forEach(doReset);
      this._afterEach.forEach(doReset);
      this._beforeAll.forEach(doReset);
      this._afterAll.forEach(doReset);
    }

    /**
     * Return a clone of this `Suite`.
     *
     * @private
     * @return {Suite}
     */
    clone() {
      var suite = new Suite(this.title);
      debug("clone");
      suite.ctx = this.ctx;
      suite.root = this.root;
      suite.timeout(this.timeout());
      suite.retries(this.retries());
      suite.slow(this.slow());
      suite.bail(this.bail());
      return suite;
    }

    /**
     * Set or get timeout `ms` or short-hand such as "2s".
     *
     * @private
     * @todo Do not attempt to set value if `ms` is undefined
     * @param {number|string} ms
     * @return {Suite|number} for chaining
     */
    timeout(ms$1) {
      if (!arguments.length) {
        return this._timeout;
      }
      if (typeof ms$1 === "string") {
        ms$1 = ms(ms$1);
      }

      // Clamp to range
      var INT_MAX = Math.pow(2, 31) - 1;
      var range = [0, INT_MAX];
      ms$1 = clamp(ms$1, range);

      debug("timeout %d", ms$1);
      this._timeout = parseInt(ms$1, 10);

      // Allow overriding inner/nested suites
      // See and test-cases with chain-called timeout argument.
      // https://github.com/mochajs/mocha/issues/5422
      for (const t of this.tests) {
        t.timeout(this._timeout);
      }
      for (const s of this.suites) {
        s.timeout(this._timeout);
      }
      return this;
    }

    /**
     * Set or get number of times to retry a failed test.
     *
     * @private
     * @param {number|string} n
     * @return {Suite|number} for chaining
     */
    retries(n) {
      if (!arguments.length) {
        return this._retries;
      }
      debug("retries %d", n);
      this._retries = parseInt(n, 10) || 0;
      return this;
    }

    /**
     * Set or get slow `ms` or short-hand such as "2s".
     *
     * @private
     * @param {number|string} ms
     * @return {Suite|number} for chaining
     */
    slow(ms$1) {
      if (!arguments.length) {
        return this._slow;
      }
      if (typeof ms$1 === "string") {
        ms$1 = ms(ms$1);
      }
      debug("slow %d", ms$1);
      this._slow = ms$1;
      return this;
    }

    /**
     * Set or get whether to bail after first error.
     *
     * @private
     * @param {boolean} bail
     * @return {Suite|number} for chaining
     */
    bail(bail) {
      if (!arguments.length) {
        return this._bail;
      }
      debug("bail %s", bail);
      this._bail = bail;
      return this;
    }

    /**
     * Check if this suite or its parent suite is marked as pending.
     *
     * @private
     */
    isPending() {
      return this.pending || (this.parent && this.parent.isPending());
    }

    /**
     * Generic hook-creator.
     * @private
     * @param {string} title - Title of hook
     * @param {Function} fn - Hook callback
     * @returns {Hook} A new hook
     */
    _createHook(title, fn) {
      var hook = new Hook(title, fn);
      hook.parent = this;
      hook.timeout(this.timeout());
      hook.retries(this.retries());
      hook.slow(this.slow());
      hook.ctx = this.ctx;
      hook.file = this.file;
      return hook;
    }

    /**
     * Run `fn(test[, done])` before running tests.
     *
     * @private
     * @param {string} title
     * @param {Function} fn
     * @return {Suite} for chaining
     */
    beforeAll(title, fn) {
      if (this.isPending()) {
        return this;
      }
      if (typeof title === "function") {
        fn = title;
        title = fn.name;
      }
      title = '"before all" hook' + (title ? ": " + title : "");

      var hook = this._createHook(title, fn);
      this._beforeAll.push(hook);
      this.emit(Suite.constants.EVENT_SUITE_ADD_HOOK_BEFORE_ALL, hook);
      return hook;
    }

    /**
     * Run `fn(test[, done])` after running tests.
     *
     * @private
     * @param {string} title
     * @param {Function} fn
     * @return {Suite} for chaining
     */
    afterAll(title, fn) {
      if (this.isPending()) {
        return this;
      }
      if (typeof title === "function") {
        fn = title;
        title = fn.name;
      }
      title = '"after all" hook' + (title ? ": " + title : "");

      var hook = this._createHook(title, fn);
      this._afterAll.push(hook);
      this.emit(Suite.constants.EVENT_SUITE_ADD_HOOK_AFTER_ALL, hook);
      return hook;
    }

    /**
     * Run `fn(test[, done])` before each test case.
     *
     * @private
     * @param {string} title
     * @param {Function} fn
     * @return {Suite} for chaining
     */
    beforeEach(title, fn) {
      if (this.isPending()) {
        return this;
      }
      if (typeof title === "function") {
        fn = title;
        title = fn.name;
      }
      title = '"before each" hook' + (title ? ": " + title : "");

      var hook = this._createHook(title, fn);
      this._beforeEach.push(hook);
      this.emit(Suite.constants.EVENT_SUITE_ADD_HOOK_BEFORE_EACH, hook);
      return hook;
    }

    /**
     * Run `fn(test[, done])` after each test case.
     *
     * @private
     * @param {string} title
     * @param {Function} fn
     * @return {Suite} for chaining
     */
    afterEach(title, fn) {
      if (this.isPending()) {
        return this;
      }
      if (typeof title === "function") {
        fn = title;
        title = fn.name;
      }
      title = '"after each" hook' + (title ? ": " + title : "");

      var hook = this._createHook(title, fn);
      this._afterEach.push(hook);
      this.emit(Suite.constants.EVENT_SUITE_ADD_HOOK_AFTER_EACH, hook);
      return hook;
    }

    /**
     * Add a test `suite`.
     *
     * @private
     * @param {Suite} suite
     * @return {Suite} for chaining
     */
    addSuite(suite) {
      suite.parent = this;
      suite.root = false;
      suite.timeout(this.timeout());
      suite.retries(this.retries());
      suite.slow(this.slow());
      suite.bail(this.bail());
      this.suites.push(suite);
      this.emit(Suite.constants.EVENT_SUITE_ADD_SUITE, suite);
      return this;
    }

    /**
     * Add a `test` to this suite.
     *
     * @private
     * @param {Test} test
     * @return {Suite} for chaining
     */
    addTest(test) {
      test.parent = this;
      test.timeout(this.timeout());
      test.retries(this.retries());
      test.slow(this.slow());
      test.ctx = this.ctx;
      this.tests.push(test);
      this.emit(Suite.constants.EVENT_SUITE_ADD_TEST, test);
      return this;
    }

    /**
     * Return the full title generated by recursively concatenating the parent's
     * full title.
     *
     * @memberof Suite
     * @public
     * @return {string}
     */
    fullTitle() {
      return this.titlePath().join(" ");
    }

    /**
     * Return the title path generated by recursively concatenating the parent's
     * title path.
     *
     * @memberof Suite
     * @public
     * @return {string[]}
     */
    titlePath() {
      var result = [];
      if (this.parent) {
        result = result.concat(this.parent.titlePath());
      }
      if (!this.root) {
        result.push(this.title);
      }
      return result;
    }

    /**
     * Return the total number of tests.
     *
     * @memberof Suite
     * @public
     * @return {number}
     */
    total() {
      return (
        this.suites.reduce(function (sum, suite) {
          return sum + suite.total();
        }, 0) + this.tests.length
      );
    }

    /**
     * Iterates through each suite recursively to find all tests. Applies a
     * function in the format `fn(test)`.
     *
     * @private
     * @param {Function} fn
     * @return {Suite}
     */
    eachTest(fn) {
      this.tests.forEach(fn);
      this.suites.forEach(function (suite) {
        suite.eachTest(fn);
      });
      return this;
    }

    /**
     * This will run the root suite if we happen to be running in delayed mode.
     * @private
     */
    run() {
      if (this.root) {
        this.emit(Suite.constants.EVENT_ROOT_SUITE_RUN);
      }
    }

    /**
     * Determines whether a suite has an `only` test or suite as a descendant.
     *
     * @private
     * @returns {Boolean}
     */
    hasOnly() {
      return (
        this._onlyTests.length > 0 ||
        this._onlySuites.length > 0 ||
        this.suites.some(function (suite) {
          return suite.hasOnly();
        })
      );
    }

    /**
     * Filter suites based on `isOnly` logic.
     *
     * @private
     * @returns {Boolean}
     */
    filterOnly() {
      if (this._onlyTests.length) {
        // If the suite contains `only` tests, run those and ignore any nested suites.
        this.tests = this._onlyTests;
        this.suites = [];
      } else {
        // Otherwise, do not run any of the tests in this suite.
        this.tests = [];
        this._onlySuites.forEach(function (onlySuite) {
          // If there are other `only` tests/suites nested in the current `only` suite, then filter that `only` suite.
          // Otherwise, all of the tests on this `only` suite should be run, so don't filter it.
          if (onlySuite.hasOnly()) {
            onlySuite.filterOnly();
          }
        });
        // Run the `only` suites, as well as any other suites that have `only` tests/suites as descendants.
        var onlySuites = this._onlySuites;
        this.suites = this.suites.filter(function (childSuite) {
          return onlySuites.indexOf(childSuite) !== -1 || childSuite.filterOnly();
        });
      }
      // Keep the suite only if there is something to run
      return this.tests.length > 0 || this.suites.length > 0;
    }

    /**
     * Adds a suite to the list of subsuites marked `only`.
     *
     * @private
     * @param {Suite} suite
     */
    appendOnlySuite(suite) {
      this._onlySuites.push(suite);
    }

    /**
     * Marks a suite to be `only`.
     *
     * @private
     */
    markOnly() {
      this.parent && this.parent.appendOnlySuite(this);
    }

    /**
     * Adds a test to the list of tests marked `only`.
     *
     * @private
     * @param {Test} test
     */
    appendOnlyTest(test) {
      this._onlyTests.push(test);
    }

    /**
     * Returns the array of hooks by hook name; see `HOOK_TYPE_*` constants.
     * @private
     */
    getHooks(name) {
      return this["_" + name];
    }

    /**
     * cleans all references from this suite and all child suites.
     */
    dispose() {
      this.suites.forEach(function (suite) {
        suite.dispose();
      });
      this.cleanReferences();
    }

    /**
     * Cleans up the references to all the deferred functions
     * (before/after/beforeEach/afterEach) and tests of a Suite.
     * These must be deleted otherwise a memory leak can happen,
     * as those functions may reference variables from closures,
     * thus those variables can never be garbage collected as long
     * as the deferred functions exist.
     *
     * @private
     */
    cleanReferences() {
      function cleanArrReferences(arr) {
        for (var i = 0; i < arr.length; i++) {
          delete arr[i].fn;
        }
      }

      if (Array.isArray(this._beforeAll)) {
        cleanArrReferences(this._beforeAll);
      }

      if (Array.isArray(this._beforeEach)) {
        cleanArrReferences(this._beforeEach);
      }

      if (Array.isArray(this._afterAll)) {
        cleanArrReferences(this._afterAll);
      }

      if (Array.isArray(this._afterEach)) {
        cleanArrReferences(this._afterEach);
      }

      for (var i = 0; i < this.tests.length; i++) {
        delete this.tests[i].fn;
      }
    }

    /**
     * Returns an object suitable for IPC.
     * Functions are represented by keys beginning with `$$`.
     * @private
     * @returns {Object}
     */
    serialize() {
      return {
        _bail: this._bail,
        $$fullTitle: this.fullTitle(),
        $$isPending: Boolean(this.isPending()),
        root: this.root,
        title: this.title,
        [MOCHA_ID_PROP_NAME$1]: this.id,
        parent: this.parent ? { [MOCHA_ID_PROP_NAME$1]: this.parent.id } : null,
      };
    }
  }

  var suite = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Suite: Suite
  });

  var require$$5$1 = /*@__PURE__*/getAugmentedNamespace(suite);

  var require$$8$1 = /*@__PURE__*/getAugmentedNamespace(errors);

  var require$$7$2 = /*@__PURE__*/getAugmentedNamespace(errorConstants);

  var runner;
  var hasRequiredRunner;

  function requireRunner () {
  	if (hasRequiredRunner) return runner;
  	hasRequiredRunner = 1;

  	/**
  	 * @typedef {import('./types.d.ts').RunnerOptions} RunnerOptions
  	 */

  	/**
  	 * Module dependencies.
  	 * @private
  	 */
  	var EventEmitter = require$$0$1.EventEmitter;
  	var { PendingError } = require$$1$1;
  	var utils = requireUtils();
  	var debug = requireBrowser()("mocha:runner");
  	var { Runnable } = require$$11$1;
  	var { Suite } = require$$5$1;
  	var HOOK_TYPE_BEFORE_EACH = Suite.constants.HOOK_TYPE_BEFORE_EACH;
  	var HOOK_TYPE_AFTER_EACH = Suite.constants.HOOK_TYPE_AFTER_EACH;
  	var HOOK_TYPE_AFTER_ALL = Suite.constants.HOOK_TYPE_AFTER_ALL;
  	var HOOK_TYPE_BEFORE_ALL = Suite.constants.HOOK_TYPE_BEFORE_ALL;
  	var EVENT_ROOT_SUITE_RUN = Suite.constants.EVENT_ROOT_SUITE_RUN;
  	var STATE_FAILED = Runnable.constants.STATE_FAILED;
  	var STATE_PASSED = Runnable.constants.STATE_PASSED;
  	var STATE_PENDING = Runnable.constants.STATE_PENDING;
  	var stackFilter = utils.stackTraceFilter();
  	var stringify = utils.stringify;

  	const {
  	  createInvalidExceptionError,
  	  createUnsupportedError,
  	  createFatalError,
  	  isMochaError,
  	} = require$$8$1;
  	const { constants: errorConstants } = require$$7$2;

  	/**
  	 * Non-enumerable globals.
  	 * @private
  	 * @readonly
  	 */
  	var globals = [
  	  "setTimeout",
  	  "clearTimeout",
  	  "setInterval",
  	  "clearInterval",
  	  "XMLHttpRequest",
  	  "Date",
  	  "setImmediate",
  	  "clearImmediate",
  	];

  	var constants = utils.defineConstants(
  	  /**
  	   * {@link Runner}-related constants. Used by reporters. Each event emits the corresponding object, unless otherwise indicated.
  	   * @example
  	   * const Mocha = require('mocha');
  	   * const Base = Mocha.reporters.Base;
  	   * const {
  	   *   EVENT_HOOK_BEGIN,
  	   *   EVENT_TEST_PASS,
  	   *   EVENT_TEST_FAIL,
  	   *   EVENT_TEST_END
  	   * } = Mocha.Runner.constants
  	   *
  	   * function MyReporter(runner, options) {
  	   *   Base.call(this, runner, options);
  	   *
  	   *   runner.on(EVENT_HOOK_BEGIN, function(hook) {
  	   *     console.log('hook called: ', hook.title);
  	   *   });
  	   *
  	   *   runner.on(EVENT_TEST_PASS, function(test) {
  	   *     console.log('pass: %s', test.fullTitle());
  	   *   });
  	   *
  	   *   runner.on(EVENT_TEST_FAIL, function(test, err) {
  	   *     console.log('fail: %s -- error: %s', test.fullTitle(), err.message);
  	   *   });
  	   *
  	   *   runner.on(EVENT_TEST_END, function() {
  	   *     console.log('end: %d/%d', runner.stats.passes, runner.stats.tests);
  	   *   });
  	   * }
  	   *
  	   * module.exports = MyReporter;
  	   *
  	   * @public
  	   * @memberof Runner
  	   * @readonly
  	   * @alias constants
  	   * @static
  	   * @enum {string}
  	   */
  	  {
  	    /**
  	     * Emitted when {@link Hook} execution begins
  	     */
  	    EVENT_HOOK_BEGIN: "hook",
  	    /**
  	     * Emitted when {@link Hook} execution ends
  	     */
  	    EVENT_HOOK_END: "hook end",
  	    /**
  	     * Emitted when Root {@link Suite} execution begins (all files have been parsed and hooks/tests are ready for execution)
  	     */
  	    EVENT_RUN_BEGIN: "start",
  	    /**
  	     * Emitted when Root {@link Suite} execution has been delayed via `delay` option
  	     */
  	    EVENT_DELAY_BEGIN: "waiting",
  	    /**
  	     * Emitted when delayed Root {@link Suite} execution is triggered by user via `global.run()`
  	     */
  	    EVENT_DELAY_END: "ready",
  	    /**
  	     * Emitted when Root {@link Suite} execution ends
  	     */
  	    EVENT_RUN_END: "end",
  	    /**
  	     * Emitted when {@link Suite} execution begins
  	     */
  	    EVENT_SUITE_BEGIN: "suite",
  	    /**
  	     * Emitted when {@link Suite} execution ends
  	     */
  	    EVENT_SUITE_END: "suite end",
  	    /**
  	     * Emitted when {@link Test} execution begins
  	     */
  	    EVENT_TEST_BEGIN: "test",
  	    /**
  	     * Emitted when {@link Test} execution ends
  	     */
  	    EVENT_TEST_END: "test end",
  	    /**
  	     * Emitted when {@link Test} execution fails. Includes an `err` object of type `Error`.
  	     * @example
  	     * runner.on(EVENT_TEST_FAIL, function(test, err) {
  	     *   console.log('fail: %s -- error: %s', test.fullTitle(), err.message);
  	     * });
  	     *
  	     *
  	     */
  	    EVENT_TEST_FAIL: "fail",
  	    /**
  	     * Emitted when {@link Test} execution succeeds
  	     */
  	    EVENT_TEST_PASS: "pass",
  	    /**
  	     * Emitted when {@link Test} becomes pending
  	     */
  	    EVENT_TEST_PENDING: "pending",
  	    /**
  	     * Emitted when {@link Test} execution has failed, but will retry
  	     */
  	    EVENT_TEST_RETRY: "retry",
  	    /**
  	     * Initial state of Runner
  	     */
  	    STATE_IDLE: "idle",
  	    /**
  	     * State set to this value when the Runner has started running
  	     */
  	    STATE_RUNNING: "running",
  	    /**
  	     * State set to this value when the Runner has stopped
  	     */
  	    STATE_STOPPED: "stopped",
  	  },
  	);

  	class Runner extends EventEmitter {
  	  /**
  	   * Initialize a `Runner` at the Root {@link Suite}, which represents a hierarchy of {@link Suite|Suites} and {@link Test|Tests}.
  	   *
  	   * @extends external:EventEmitter
  	   * @public
  	   * @class
  	   * @param {Suite} suite - Root suite
  	   * @param {Object} [opts] - Settings object
  	   * @param {boolean} [opts.cleanReferencesAfterRun] - Whether to clean references to test fns and hooks when a suite is done.
  	   * @param {boolean} [opts.delay] - Whether to delay execution of root suite until ready.
  	   * @param {boolean} [opts.dryRun] - Whether to report tests without running them.
  	   * @param {boolean} [opts.failZero] - Whether to fail test run if zero tests encountered.
  	   * @param {boolean} [opts.failHookAffectedTests] - Whether to fail all tests affected by hook failures.
  	   */
  	  constructor(suite, opts = {}) {
  	    super();

  	    var self = this;
  	    this._globals = [];
  	    this._abort = false;
  	    this.suite = suite;
  	    this._opts = opts;
  	    this.state = constants.STATE_IDLE;
  	    this.total = suite.total();
  	    this.failures = 0;
  	    /**
  	     * @type {Map<EventEmitter,Map<string,Set<EventListener>>>}
  	     */
  	    this._eventListeners = new Map();
  	    this.on(constants.EVENT_TEST_END, function (test) {
  	      if (test.type === "test" && test.retriedTest() && test.parent) {
  	        var idx =
  	          test.parent.tests && test.parent.tests.indexOf(test.retriedTest());
  	        if (idx > -1) test.parent.tests[idx] = test;
  	      }
  	      self.checkGlobals(test);
  	    });
  	    this.on(constants.EVENT_HOOK_END, function (hook) {
  	      self.checkGlobals(hook);
  	    });
  	    this._defaultGrep = /.*/;
  	    this.grep(this._defaultGrep);
  	    this.globals(this.globalProps());

  	    this.uncaught = this._uncaught.bind(this);
  	    this.unhandled = (reason, promise) => {
  	      if (isMochaError(reason)) {
  	        debug(
  	          "trapped unhandled rejection coming out of Mocha; forwarding to uncaught handler:",
  	          reason,
  	        );
  	        this.uncaught(reason);
  	      } else {
  	        debug(
  	          "trapped unhandled rejection from (probably) user code; re-emitting on process",
  	        );
  	        this._removeEventListener(
  	          browser$1$1,
  	          "unhandledRejection",
  	          this.unhandled,
  	        );
  	        try {
  	          browser$1$1.emit("unhandledRejection", reason, promise);
  	        } finally {
  	          this._addEventListener(browser$1$1, "unhandledRejection", this.unhandled);
  	        }
  	      }
  	    };
  	  }
  	}

  	/**
  	 * Wrapper for setImmediate or browser polyfill.
  	 *
  	 * @param {Function} fn
  	 * @private
  	 */
  	Runner.immediately = commonjsGlobal.setImmediate;

  	/**
  	 * Replacement for `target.on(eventName, listener)` that does bookkeeping to remove them when this runner instance is disposed.
  	 * @param {EventEmitter} target - The `EventEmitter`
  	 * @param {string} eventName - The event name
  	 * @param {string} fn - Listener function
  	 * @private
  	 */
  	Runner.prototype._addEventListener = function (target, eventName, listener) {
  	  debug(
  	    "_addEventListener(): adding for event %s; %d current listeners",
  	    eventName,
  	    target.listenerCount(eventName),
  	  );
  	  /* istanbul ignore next */
  	  if (
  	    this._eventListeners.has(target) &&
  	    this._eventListeners.get(target).has(eventName) &&
  	    this._eventListeners.get(target).get(eventName).has(listener)
  	  ) {
  	    debug(
  	      "warning: tried to attach duplicate event listener for %s",
  	      eventName,
  	    );
  	    return;
  	  }
  	  target.on(eventName, listener);
  	  const targetListeners = this._eventListeners.has(target)
  	    ? this._eventListeners.get(target)
  	    : new Map();
  	  const targetEventListeners = targetListeners.has(eventName)
  	    ? targetListeners.get(eventName)
  	    : new Set();
  	  targetEventListeners.add(listener);
  	  targetListeners.set(eventName, targetEventListeners);
  	  this._eventListeners.set(target, targetListeners);
  	};

  	/**
  	 * Replacement for `target.removeListener(eventName, listener)` that also updates the bookkeeping.
  	 * @param {EventEmitter} target - The `EventEmitter`
  	 * @param {string} eventName - The event name
  	 * @param {function} listener - Listener function
  	 * @private
  	 */
  	Runner.prototype._removeEventListener = function (target, eventName, listener) {
  	  target.removeListener(eventName, listener);

  	  if (this._eventListeners.has(target)) {
  	    const targetListeners = this._eventListeners.get(target);
  	    if (targetListeners.has(eventName)) {
  	      const targetEventListeners = targetListeners.get(eventName);
  	      targetEventListeners.delete(listener);
  	      if (!targetEventListeners.size) {
  	        targetListeners.delete(eventName);
  	      }
  	    }
  	    if (!targetListeners.size) {
  	      this._eventListeners.delete(target);
  	    }
  	  } else {
  	    debug("trying to remove listener for untracked object %s", target);
  	  }
  	};

  	/**
  	 * Removes all event handlers set during a run on this instance.
  	 * Remark: this does _not_ clean/dispose the tests or suites themselves.
  	 */
  	Runner.prototype.dispose = function () {
  	  this.removeAllListeners();
  	  this._eventListeners.forEach((targetListeners, target) => {
  	    targetListeners.forEach((targetEventListeners, eventName) => {
  	      targetEventListeners.forEach((listener) => {
  	        target.removeListener(eventName, listener);
  	      });
  	    });
  	  });
  	  this._eventListeners.clear();
  	};

  	/**
  	 * Run tests with full titles matching `re`. Updates runner.total
  	 * with number of tests matched.
  	 *
  	 * @public
  	 * @memberof Runner
  	 * @param {RegExp} re
  	 * @param {boolean} invert
  	 * @return {Runner} Runner instance.
  	 */
  	Runner.prototype.grep = function (re, invert) {
  	  debug("grep(): setting to %s", re);
  	  this._grep = re;
  	  this._invert = invert;
  	  this.total = this.grepTotal(this.suite);
  	  return this;
  	};

  	/**
  	 * Returns the number of tests matching the grep search for the
  	 * given suite.
  	 *
  	 * @memberof Runner
  	 * @public
  	 * @param {Suite} suite
  	 * @return {number}
  	 */
  	Runner.prototype.grepTotal = function (suite) {
  	  var self = this;
  	  var total = 0;

  	  suite.eachTest(function (test) {
  	    var match = self._grep.test(test.fullTitle());
  	    if (self._invert) {
  	      match = !match;
  	    }
  	    if (match) {
  	      total++;
  	    }
  	  });

  	  return total;
  	};

  	/**
  	 * Return a list of global properties.
  	 *
  	 * @return {Array}
  	 * @private
  	 */
  	Runner.prototype.globalProps = function () {
  	  var props = Object.keys(commonjsGlobal);

  	  // non-enumerables
  	  for (var i = 0; i < globals.length; ++i) {
  	    if (~props.indexOf(globals[i])) {
  	      continue;
  	    }
  	    props.push(globals[i]);
  	  }

  	  return props;
  	};

  	/**
  	 * Allow the given `arr` of globals.
  	 *
  	 * @public
  	 * @memberof Runner
  	 * @param {Array} arr
  	 * @return {Runner} Runner instance.
  	 */
  	Runner.prototype.globals = function (arr) {
  	  if (!arguments.length) {
  	    return this._globals;
  	  }
  	  debug("globals(): setting to %O", arr);
  	  this._globals = this._globals.concat(arr);
  	  return this;
  	};

  	/**
  	 * Check for global variable leaks.
  	 *
  	 * @private
  	 */
  	Runner.prototype.checkGlobals = function (test) {
  	  if (!this.checkLeaks) {
  	    return;
  	  }
  	  var ok = this._globals;

  	  var globals = this.globalProps();
  	  var leaks;

  	  if (test) {
  	    ok = ok.concat(test._allowedGlobals || []);
  	  }

  	  if (this.prevGlobalsLength === globals.length) {
  	    return;
  	  }
  	  this.prevGlobalsLength = globals.length;

  	  leaks = filterLeaks(ok, globals);
  	  this._globals = this._globals.concat(leaks);

  	  if (leaks.length) {
  	    var msg = `global leak(s) detected: ${leaks.map((e) => `'${e}'`).join(", ")}`;
  	    this.fail(test, new Error(msg));
  	  }
  	};

  	/**
  	 * Create an error object for a test that was skipped due to a hook failure.
  	 *
  	 * @private
  	 * @param {string} hookTitle - The title of the failed hook
  	 * @param {*} hookError - The error from the failed hook (may not be an Error object)
  	 * @returns {Error} The error object for the skipped test
  	 */
  	function createHookSkipError(hookTitle, hookError) {
  	  // Handle falsy or undefined exceptions
  	  if (!hookError) {
  	    hookError = createInvalidExceptionError(
  	      'Hook "' + hookTitle + '" failed with exception: ' + hookError,
  	      hookError,
  	    );
  	  }
  	  // Convert non-Error objects to Error
  	  else if (!isError(hookError)) {
  	    hookError = thrown2Error(hookError);
  	  }

  	  var errorMessage =
  	    'Test skipped due to failure in hook "' +
  	    hookTitle +
  	    '": ' +
  	    hookError.message;
  	  var testError = new Error(errorMessage);
  	  testError.stack = hookError.stack;
  	  return testError;
  	}

  	/**
  	 * Fail all tests that are affected by a hook failure.
  	 * This is used when the `failHookAffectedTests` option is enabled.
  	 *
  	 * @private
  	 * @param {Suite} suite - The suite containing the affected tests
  	 * @param {Error} hookError - The error from the failed hook
  	 * @param {string} hookTitle - The title of the failed hook
  	 */
  	Runner.prototype.failAffectedTests = function (suite, hookError, hookTitle) {
  	  if (!this._opts.failHookAffectedTests) {
  	    return;
  	  }

  	  var self = this;
  	  var testError = createHookSkipError(hookTitle, hookError);

  	  // Recursively fail all tests in this suite and its child suites
  	  function failTestsInSuite(s) {
  	    s.tests.forEach(function (test) {
  	      // Only fail tests that haven't been executed yet
  	      if (!test.state) {
  	        test.state = STATE_FAILED;
  	        self.failures++;
  	        self.emit(constants.EVENT_TEST_BEGIN, test);
  	        self.emit(constants.EVENT_TEST_FAIL, test, testError);
  	        self.emit(constants.EVENT_TEST_END, test);
  	      }
  	    });

  	    s.suites.forEach(failTestsInSuite);
  	  }

  	  failTestsInSuite(suite);
  	};

  	/**
  	 * Fail the given `test`.
  	 *
  	 * If `test` is a hook, failures work in the following pattern:
  	 * - If bail, run corresponding `after each` and `after` hooks,
  	 *   then exit
  	 * - Failed `before` hook skips all tests in a suite and subsuites,
  	 *   but jumps to corresponding `after` hook
  	 * - Failed `before each` hook skips remaining tests in a
  	 *   suite and jumps to corresponding `after each` hook,
  	 *   which is run only once
  	 * - Failed `after` hook does not alter execution order
  	 * - Failed `after each` hook skips remaining tests in a
  	 *   suite and subsuites, but executes other `after each`
  	 *   hooks
  	 *
  	 * @private
  	 * @param {Runnable} test
  	 * @param {Error} err
  	 * @param {boolean} [force=false] - Whether to fail a pending test.
  	 */
  	Runner.prototype.fail = function (test, err, force) {
  	  force = force === true;
  	  if (test.isPending() && !force) {
  	    return;
  	  }
  	  if (this.state === constants.STATE_STOPPED) {
  	    if (err.code === errorConstants.MULTIPLE_DONE) {
  	      throw err;
  	    }
  	    throw createFatalError(
  	      "Test failed after root suite execution completed!",
  	      err,
  	    );
  	  }

  	  ++this.failures;
  	  debug("total number of failures: %d", this.failures);
  	  test.state = STATE_FAILED;

  	  if (!isError(err)) {
  	    err = thrown2Error(err);
  	  }

  	  // Filter the stack traces
  	  if (!this.fullStackTrace) {
  	    const alreadyFiltered = new Set();
  	    let currentErr = err;

  	    while (currentErr && currentErr.stack && !alreadyFiltered.has(currentErr)) {
  	      alreadyFiltered.add(currentErr);

  	      try {
  	        currentErr.stack = stackFilter(currentErr.stack);
  	      } catch {
  	        // Ignore error as some environments do not take kindly to monkeying with the stack
  	      }

  	      currentErr = currentErr.cause;
  	    }
  	  }

  	  this.emit(constants.EVENT_TEST_FAIL, test, err);
  	};

  	/**
  	 * Run hook `name` callbacks and then invoke `fn()`.
  	 *
  	 * @private
  	 * @param {string} name
  	 * @param {Function} fn
  	 */

  	Runner.prototype.hook = function (name, fn) {
  	  if (this._opts.dryRun) return fn();

  	  var suite = this.suite;
  	  var hooks = suite.getHooks(name);
  	  var self = this;

  	  function next(i) {
  	    var hook = hooks[i];
  	    if (!hook) {
  	      return fn();
  	    }
  	    self.currentRunnable = hook;

  	    if (name === HOOK_TYPE_BEFORE_ALL) {
  	      hook.ctx.currentTest = hook.parent.tests[0];
  	    } else if (name === HOOK_TYPE_AFTER_ALL) {
  	      hook.ctx.currentTest = hook.parent.tests[hook.parent.tests.length - 1];
  	    } else {
  	      hook.ctx.currentTest = self.test;
  	    }

  	    setHookTitle(hook);

  	    hook.allowUncaught = self.allowUncaught;

  	    self.emit(constants.EVENT_HOOK_BEGIN, hook);

  	    if (!hook.listeners("error").length) {
  	      self._addEventListener(hook, "error", function (err) {
  	        self.fail(hook, err);
  	      });
  	    }

  	    hook.run(function cbHookRun(err) {
  	      var testError = hook.error();
  	      if (testError) {
  	        self.fail(self.test, testError);
  	      }
  	      // conditional skip
  	      if (hook.pending) {
  	        if (name === HOOK_TYPE_AFTER_EACH) {
  	          // TODO define and implement use case
  	          if (self.test) {
  	            self.test.pending = true;
  	          }
  	        } else if (name === HOOK_TYPE_BEFORE_EACH) {
  	          if (self.test) {
  	            self.test.pending = true;
  	          }
  	          self.emit(constants.EVENT_HOOK_END, hook);
  	          hook.pending = false; // activates hook for next test
  	          return fn(new Error("abort hookDown"));
  	        } else if (name === HOOK_TYPE_BEFORE_ALL) {
  	          suite.tests.forEach(function (test) {
  	            test.pending = true;
  	          });
  	          suite.suites.forEach(function (suite) {
  	            suite.pending = true;
  	          });
  	          hooks = [];
  	        } else {
  	          hook.pending = false;
  	          var errForbid = createUnsupportedError("`this.skip` forbidden");
  	          self.fail(hook, errForbid);
  	          return fn(errForbid);
  	        }
  	      } else if (err) {
  	        self.fail(hook, err);
  	        // If failHookAffectedTests is enabled, mark affected tests as failed
  	        if (self._opts.failHookAffectedTests) {
  	          if (name === HOOK_TYPE_BEFORE_ALL) {
  	            self.failAffectedTests(self.suite, err, hook.title);
  	          } else if (name === HOOK_TYPE_BEFORE_EACH) {
  	            // Fail the current test
  	            if (self.test && !self.test.state) {
  	              var testError = createHookSkipError(hook.title, err);

  	              self.test.state = STATE_FAILED;
  	              self.failures++;
  	              self.emit(constants.EVENT_TEST_BEGIN, self.test);
  	              self.emit(constants.EVENT_TEST_FAIL, self.test, testError);
  	              self.emit(constants.EVENT_TEST_END, self.test);
  	            }
  	            // Store the hook error info for remaining tests
  	            self._failedBeforeEachHook = {
  	              error: err,
  	              title: hook.title,
  	            };
  	          }
  	        }
  	        // stop executing hooks, notify callee of hook err
  	        return fn(err);
  	      }
  	      self.emit(constants.EVENT_HOOK_END, hook);
  	      delete hook.ctx.currentTest;
  	      setHookTitle(hook);
  	      next(++i);
  	    });

  	    function setHookTitle(hook) {
  	      hook.originalTitle = hook.originalTitle || hook.title;
  	      if (hook.ctx && hook.ctx.currentTest) {
  	        hook.title = `${hook.originalTitle} for "${hook.ctx.currentTest.title}"`;
  	      } else {
  	        var parentTitle;
  	        if (hook.parent.title) {
  	          parentTitle = hook.parent.title;
  	        } else {
  	          parentTitle = hook.parent.root ? "{root}" : "";
  	        }
  	        hook.title = `${hook.originalTitle} in "${parentTitle}"`;
  	      }
  	    }
  	  }

  	  Runner.immediately(function () {
  	    next(0);
  	  });
  	};

  	/**
  	 * Run hook `name` for the given array of `suites`
  	 * in order, and callback `fn(err, errSuite)`.
  	 *
  	 * @private
  	 * @param {string} name
  	 * @param {Array} suites
  	 * @param {Function} fn
  	 */
  	Runner.prototype.hooks = function (name, suites, fn) {
  	  var self = this;
  	  var orig = this.suite;

  	  function next(suite) {
  	    self.suite = suite;

  	    if (!suite) {
  	      self.suite = orig;
  	      return fn();
  	    }

  	    self.hook(name, function (err) {
  	      if (err) {
  	        var errSuite = self.suite;
  	        self.suite = orig;
  	        return fn(err, errSuite);
  	      }

  	      next(suites.pop());
  	    });
  	  }

  	  next(suites.pop());
  	};

  	/**
  	 * Run 'afterEach' hooks from bottom up.
  	 *
  	 * @param {String} name
  	 * @param {Function} fn
  	 * @private
  	 */
  	Runner.prototype.hookUp = function (name, fn) {
  	  var suites = [this.suite].concat(this.parents()).reverse();
  	  this.hooks(name, suites, fn);
  	};

  	/**
  	 * Run 'beforeEach' hooks from top level down.
  	 *
  	 * @param {String} name
  	 * @param {Function} fn
  	 * @private
  	 */
  	Runner.prototype.hookDown = function (name, fn) {
  	  var suites = [this.suite].concat(this.parents());
  	  this.hooks(name, suites, fn);
  	};

  	/**
  	 * Return an array of parent Suites from
  	 * closest to furthest.
  	 *
  	 * @return {Array}
  	 * @private
  	 */
  	Runner.prototype.parents = function () {
  	  var suite = this.suite;
  	  var suites = [];
  	  while (suite.parent) {
  	    suite = suite.parent;
  	    suites.push(suite);
  	  }
  	  return suites;
  	};

  	/**
  	 * Run the current test and callback `fn(err)`.
  	 *
  	 * @param {Function} fn
  	 * @private
  	 */
  	Runner.prototype.runTest = function (fn) {
  	  if (this._opts.dryRun) return Runner.immediately(fn);

  	  var self = this;
  	  var test = this.test;

  	  if (!test) {
  	    return;
  	  }

  	  if (this.asyncOnly) {
  	    test.asyncOnly = true;
  	  }
  	  this._addEventListener(test, "error", function (err) {
  	    self.fail(test, err);
  	  });
  	  if (this.allowUncaught) {
  	    test.allowUncaught = true;
  	    return test.run(fn);
  	  }
  	  try {
  	    test.run(fn);
  	  } catch (err) {
  	    fn(err);
  	  }
  	};

  	/**
  	 * Run tests in the given `suite` and invoke the callback `fn()` when complete.
  	 *
  	 * @private
  	 * @param {Suite} suite
  	 * @param {Function} fn
  	 */
  	Runner.prototype.runTests = function (suite, fn) {
  	  var self = this;
  	  var tests = suite.tests.slice();
  	  var test;

  	  function hookErr(err, errSuite, after) {
  	    // before/after Each hook for errSuite failed:
  	    var orig = self.suite;

  	    // If failHookAffectedTests is enabled and this is a beforeEach failure,
  	    // mark remaining tests as failed
  	    if (
  	      self._opts.failHookAffectedTests &&
  	      !after &&
  	      self._failedBeforeEachHook
  	    ) {
  	      // Fail all remaining tests in the suite
  	      var remainingTests = tests.slice();
  	      remainingTests.forEach(function (t) {
  	        if (!t.state) {
  	          var testError = createHookSkipError(
  	            self._failedBeforeEachHook.title,
  	            self._failedBeforeEachHook.error,
  	          );

  	          t.state = STATE_FAILED;
  	          self.failures++;
  	          self.emit(constants.EVENT_TEST_BEGIN, t);
  	          self.emit(constants.EVENT_TEST_FAIL, t, testError);
  	          self.emit(constants.EVENT_TEST_END, t);
  	        }
  	      });
  	      // Clear the stored hook info
  	      delete self._failedBeforeEachHook;
  	    }

  	    // for failed 'after each' hook start from errSuite parent,
  	    // otherwise start from errSuite itself
  	    self.suite = after ? errSuite.parent : errSuite;

  	    if (self.suite) {
  	      self.hookUp(HOOK_TYPE_AFTER_EACH, function (err2, errSuite2) {
  	        self.suite = orig;
  	        // some hooks may fail even now
  	        if (err2) {
  	          return hookErr(err2, errSuite2, true);
  	        }
  	        // report error suite
  	        fn(errSuite);
  	      });
  	    } else {
  	      // there is no need calling other 'after each' hooks
  	      self.suite = orig;
  	      fn(errSuite);
  	    }
  	  }

  	  function next(err, errSuite) {
  	    // if we bail after first err
  	    if (self.failures && suite._bail) {
  	      tests = [];
  	    }

  	    if (self._abort) {
  	      return fn();
  	    }

  	    if (err) {
  	      return hookErr(err, errSuite, true);
  	    }

  	    // next test
  	    test = tests.shift();

  	    // all done
  	    if (!test) {
  	      return fn();
  	    }

  	    // grep
  	    var match = self._grep.test(test.fullTitle());
  	    if (self._invert) {
  	      match = !match;
  	    }
  	    if (!match) {
  	      // Run immediately only if we have defined a grep. When we
  	      // define a grep — It can cause maximum callstack error if
  	      // the grep is doing a large recursive loop by neglecting
  	      // all tests. The run immediately function also comes with
  	      // a performance cost. So we don't want to run immediately
  	      // if we run the whole test suite, because running the whole
  	      // test suite don't do any immediate recursive loops. Thus,
  	      // allowing a JS runtime to breathe.
  	      if (self._grep !== self._defaultGrep) {
  	        Runner.immediately(next);
  	      } else {
  	        next();
  	      }
  	      return;
  	    }

  	    // static skip, no hooks are executed
  	    if (test.isPending()) {
  	      if (self.forbidPending) {
  	        self.fail(test, new Error("Pending test forbidden"), true);
  	      } else {
  	        test.state = STATE_PENDING;
  	        self.emit(constants.EVENT_TEST_PENDING, test);
  	      }
  	      self.emit(constants.EVENT_TEST_END, test);
  	      return next();
  	    }

  	    // execute test and hook(s)
  	    self.emit(constants.EVENT_TEST_BEGIN, (self.test = test));
  	    self.hookDown(HOOK_TYPE_BEFORE_EACH, function (err, errSuite) {
  	      // conditional skip within beforeEach
  	      if (test.isPending()) {
  	        if (self.forbidPending) {
  	          self.fail(test, new Error("Pending test forbidden"), true);
  	        } else {
  	          test.state = STATE_PENDING;
  	          self.emit(constants.EVENT_TEST_PENDING, test);
  	        }
  	        self.emit(constants.EVENT_TEST_END, test);
  	        // skip inner afterEach hooks below errSuite level
  	        var origSuite = self.suite;
  	        self.suite = errSuite || self.suite;
  	        return self.hookUp(HOOK_TYPE_AFTER_EACH, function (e, eSuite) {
  	          self.suite = origSuite;
  	          next(e, eSuite);
  	        });
  	      }
  	      if (err) {
  	        return hookErr(err, errSuite, false);
  	      }
  	      self.currentRunnable = self.test;
  	      self.runTest(function (err) {
  	        test = self.test;
  	        // conditional skip within it
  	        if (test.pending) {
  	          if (self.forbidPending) {
  	            self.fail(test, new Error("Pending test forbidden"), true);
  	          } else {
  	            test.state = STATE_PENDING;
  	            self.emit(constants.EVENT_TEST_PENDING, test);
  	          }
  	          self.emit(constants.EVENT_TEST_END, test);
  	          return self.hookUp(HOOK_TYPE_AFTER_EACH, next);
  	        } else if (err) {
  	          var retry = test.currentRetry();
  	          if (retry < test.retries()) {
  	            var clonedTest = test.clone();
  	            clonedTest.currentRetry(retry + 1);
  	            tests.unshift(clonedTest);

  	            self.emit(constants.EVENT_TEST_RETRY, test, err);

  	            // Early return + hook trigger so that it doesn't
  	            // increment the count wrong
  	            return self.hookUp(HOOK_TYPE_AFTER_EACH, next);
  	          } else {
  	            self.fail(test, err);
  	          }
  	          self.emit(constants.EVENT_TEST_END, test);
  	          return self.hookUp(HOOK_TYPE_AFTER_EACH, next);
  	        }

  	        test.state = STATE_PASSED;
  	        self.emit(constants.EVENT_TEST_PASS, test);
  	        self.emit(constants.EVENT_TEST_END, test);
  	        self.hookUp(HOOK_TYPE_AFTER_EACH, next);
  	      });
  	    });
  	  }

  	  this.next = next;
  	  this.hookErr = hookErr;
  	  next();
  	};

  	/**
  	 * Run the given `suite` and invoke the callback `fn()` when complete.
  	 *
  	 * @private
  	 * @param {Suite} suite
  	 * @param {Function} fn
  	 */
  	Runner.prototype.runSuite = function (suite, fn) {
  	  var i = 0;
  	  var self = this;
  	  var total = this.grepTotal(suite);

  	  debug("runSuite(): running %s", suite.fullTitle());

  	  if (!total || (self.failures && suite._bail)) {
  	    debug("runSuite(): bailing");
  	    return fn();
  	  }

  	  this.emit(constants.EVENT_SUITE_BEGIN, (this.suite = suite));

  	  function next(errSuite) {
  	    if (errSuite) {
  	      // current suite failed on a hook from errSuite
  	      if (errSuite === suite) {
  	        // if errSuite is current suite
  	        // continue to the next sibling suite
  	        return done();
  	      }
  	      // errSuite is among the parents of current suite
  	      // stop execution of errSuite and all sub-suites
  	      return done(errSuite);
  	    }

  	    if (self._abort) {
  	      return done();
  	    }

  	    var curr = suite.suites[i++];
  	    if (!curr) {
  	      return done();
  	    }

  	    // Avoid grep neglecting large number of tests causing a
  	    // huge recursive loop and thus a maximum call stack error.
  	    // See comment in `this.runTests()` for more information.
  	    if (self._grep !== self._defaultGrep) {
  	      Runner.immediately(function () {
  	        self.runSuite(curr, next);
  	      });
  	    } else {
  	      self.runSuite(curr, next);
  	    }
  	  }

  	  function done(errSuite) {
  	    self.suite = suite;
  	    self.nextSuite = next;

  	    // remove reference to test
  	    delete self.test;

  	    self.hook(HOOK_TYPE_AFTER_ALL, function () {
  	      self.emit(constants.EVENT_SUITE_END, suite);
  	      fn(errSuite);
  	    });
  	  }

  	  this.nextSuite = next;

  	  this.hook(HOOK_TYPE_BEFORE_ALL, function (err) {
  	    if (err) {
  	      return done();
  	    }
  	    self.runTests(suite, next);
  	  });
  	};

  	/**
  	 * Handle uncaught exceptions within runner.
  	 *
  	 * This function is bound to the instance as `Runner#uncaught` at instantiation
  	 * time. It's intended to be listening on the `Process.uncaughtException` event.
  	 * In order to not leak EE listeners, we need to ensure no more than a single
  	 * `uncaughtException` listener exists per `Runner`.  The only way to do
  	 * this--because this function needs the context (and we don't have lambdas)--is
  	 * to use `Function.prototype.bind`. We need strict equality to unregister and
  	 * _only_ unregister the _one_ listener we set from the
  	 * `Process.uncaughtException` event; would be poor form to just remove
  	 * everything. See {@link Runner#run} for where the event listener is registered
  	 * and unregistered.
  	 * @param {Error} err - Some uncaught error
  	 * @private
  	 */
  	Runner.prototype._uncaught = function (err) {
  	  // this is defensive to prevent future developers from mis-calling this function.
  	  // it's more likely that it'd be called with the incorrect context--say, the global
  	  // `process` object--than it would to be called with a context that is not a "subclass"
  	  // of `Runner`.
  	  if (!(this instanceof Runner)) {
  	    throw createFatalError(
  	      "Runner#uncaught() called with invalid context",
  	      this,
  	    );
  	  }
  	  if (err instanceof PendingError) {
  	    debug("uncaught(): caught a PendingError");
  	    return;
  	  }
  	  // browser does not exit script when throwing in global.onerror()
  	  if (this.allowUncaught && !utils.isBrowser()) {
  	    debug("uncaught(): bubbling exception due to --allow-uncaught");
  	    throw err;
  	  }

  	  if (this.state === constants.STATE_STOPPED) {
  	    debug("uncaught(): throwing after run has completed!");
  	    throw err;
  	  }

  	  if (err) {
  	    debug("uncaught(): got truthy exception %O", err);
  	  } else {
  	    debug("uncaught(): undefined/falsy exception");
  	    err = createInvalidExceptionError(
  	      "Caught falsy/undefined exception which would otherwise be uncaught. No stack trace found; try a debugger",
  	      err,
  	    );
  	  }

  	  if (!isError(err)) {
  	    err = thrown2Error(err);
  	    debug('uncaught(): converted "error" %o to Error', err);
  	  }
  	  err.uncaught = true;

  	  var runnable = this.currentRunnable;

  	  if (!runnable) {
  	    runnable = new Runnable("Uncaught error outside test suite");
  	    debug("uncaught(): no current Runnable; created a phony one");
  	    runnable.parent = this.suite;

  	    if (this.state === constants.STATE_RUNNING) {
  	      debug("uncaught(): failing gracefully");
  	      this.fail(runnable, err);
  	    } else {
  	      // Can't recover from this failure
  	      debug("uncaught(): test run has not yet started; unrecoverable");
  	      this.emit(constants.EVENT_RUN_BEGIN);
  	      this.fail(runnable, err);
  	      this.emit(constants.EVENT_RUN_END);
  	    }

  	    return;
  	  }

  	  runnable.clearTimeout();

  	  if (runnable.isFailed()) {
  	    debug("uncaught(): Runnable has already failed");
  	    // Ignore error if already failed
  	    return;
  	  } else if (runnable.isPending()) {
  	    debug("uncaught(): pending Runnable wound up failing!");
  	    // report 'pending test' retrospectively as failed
  	    this.fail(runnable, err, true);
  	    return;
  	  }

  	  // we cannot recover gracefully if a Runnable has already passed
  	  // then fails asynchronously
  	  if (runnable.isPassed()) {
  	    debug("uncaught(): Runnable has already passed; bailing gracefully");
  	    this.fail(runnable, err);
  	    this.abort();
  	  } else {
  	    debug("uncaught(): forcing Runnable to complete with Error");
  	    return runnable.callback(err);
  	  }
  	};

  	/**
  	 * Run the root suite and invoke `fn(failures)`
  	 * on completion.
  	 *
  	 * @public
  	 * @memberof Runner
  	 * @param {Function} fn - Callback when finished
  	 * @param {RunnerOptions} [opts] - For subclasses
  	 * @returns {Runner} Runner instance.
  	 */
  	Runner.prototype.run = function (fn, opts = {}) {
  	  var rootSuite = this.suite;
  	  var options = opts.options || {};

  	  debug("run(): got options: %O", options);
  	  fn = fn || function () {};

  	  const end = () => {
  	    if (!this.total && this._opts.failZero) this.failures = 1;

  	    debug("run(): root suite completed; emitting %s", constants.EVENT_RUN_END);
  	    this.emit(constants.EVENT_RUN_END);
  	  };

  	  const begin = () => {
  	    debug("run(): emitting %s", constants.EVENT_RUN_BEGIN);
  	    this.emit(constants.EVENT_RUN_BEGIN);
  	    debug("run(): emitted %s", constants.EVENT_RUN_BEGIN);

  	    this.runSuite(rootSuite, end);
  	  };

  	  const prepare = () => {
  	    debug("run(): starting");
  	    // If there is an `only` filter
  	    if (rootSuite.hasOnly()) {
  	      rootSuite.filterOnly();
  	      debug("run(): filtered exclusive Runnables");
  	    }
  	    this.state = constants.STATE_RUNNING;
  	    if (this._opts.delay) {
  	      this.emit(constants.EVENT_DELAY_END);
  	      debug('run(): "delay" ended');
  	    }

  	    return begin();
  	  };

  	  // references cleanup to avoid memory leaks
  	  if (this._opts.cleanReferencesAfterRun) {
  	    this.on(constants.EVENT_SUITE_END, (suite) => {
  	      suite.cleanReferences();
  	    });
  	  }

  	  // callback
  	  this.on(constants.EVENT_RUN_END, function () {
  	    this.state = constants.STATE_STOPPED;
  	    debug("run(): emitted %s", constants.EVENT_RUN_END);
  	    fn(this.failures);
  	  });

  	  this._removeEventListener(browser$1$1, "uncaughtException", this.uncaught);
  	  this._removeEventListener(browser$1$1, "unhandledRejection", this.unhandled);
  	  this._addEventListener(browser$1$1, "uncaughtException", this.uncaught);
  	  this._addEventListener(browser$1$1, "unhandledRejection", this.unhandled);

  	  if (this._opts.delay) {
  	    // for reporters, I guess.
  	    // might be nice to debounce some dots while we wait.
  	    this.emit(constants.EVENT_DELAY_BEGIN, rootSuite);
  	    rootSuite.once(EVENT_ROOT_SUITE_RUN, prepare);
  	    debug("run(): waiting for green light due to --delay");
  	  } else {
  	    Runner.immediately(prepare);
  	  }

  	  return this;
  	};

  	/**
  	 * Toggle partial object linking behavior; used for building object references from
  	 * unique ID's. Does nothing in serial mode, because the object references already exist.
  	 * Subclasses can implement this (e.g., `ParallelBufferedRunner`)
  	 * @abstract
  	 * @param {boolean} [value] - If `true`, enable partial object linking, otherwise disable
  	 * @returns {Runner}
  	 * @chainable
  	 * @public
  	 * @example
  	 * // this reporter needs proper object references when run in parallel mode
  	 * class MyReporter {
  	 *   constructor(runner) {
  	 *     runner.linkPartialObjects(true)
  	 *       .on(EVENT_SUITE_BEGIN, suite => {
  	 *         // this Suite may be the same object...
  	 *       })
  	 *       .on(EVENT_TEST_BEGIN, test => {
  	 *         // ...as the `test.parent` property
  	 *       });
  	 *   }
  	 * }
  	 */
  	Runner.prototype.linkPartialObjects = function () {
  	  return this;
  	};

  	/*
  	 * Like {@link Runner#run}, but does not accept a callback and returns a `Promise` instead of a `Runner`.
  	 * This function cannot reject; an `unhandledRejection` event will bubble up to the `process` object instead.
  	 * @public
  	 * @memberof Runner
  	 * @param {Object} [opts] - Options for {@link Runner#run}
  	 * @returns {Promise<number>} Failure count
  	 */
  	Runner.prototype.runAsync = async function runAsync(opts = {}) {
  	  return new Promise((resolve) => {
  	    this.run(resolve, opts);
  	  });
  	};

  	/**
  	 * Cleanly abort execution.
  	 *
  	 * @memberof Runner
  	 * @public
  	 * @return {Runner} Runner instance.
  	 */
  	Runner.prototype.abort = function () {
  	  debug("abort(): aborting");
  	  this._abort = true;

  	  return this;
  	};

  	/**
  	 * Returns `true` if Mocha is running in parallel mode.  For reporters.
  	 *
  	 * Subclasses should return an appropriate value.
  	 * @public
  	 * @returns {false}
  	 */
  	Runner.prototype.isParallelMode = function isParallelMode() {
  	  return false;
  	};

  	/**
  	 * Configures an alternate reporter for worker processes to use. Subclasses
  	 * using worker processes should implement this.
  	 * @public
  	 * @param {string} path - Absolute path to alternate reporter for worker processes to use
  	 * @returns {Runner}
  	 * @throws When in serial mode
  	 * @chainable
  	 * @abstract
  	 */
  	Runner.prototype.workerReporter = function () {
  	  throw createUnsupportedError("workerReporter() not supported in serial mode");
  	};

  	/**
  	 * Filter leaks with the given globals flagged as `ok`.
  	 *
  	 * @private
  	 * @param {Array} ok
  	 * @param {Array} globals
  	 * @return {Array}
  	 */
  	function filterLeaks(ok, globals) {
  	  return globals.filter(function (key) {
  	    // Firefox and Chrome exposes iframes as index inside the window object
  	    if (/^\d+/.test(key)) {
  	      return false;
  	    }

  	    // in firefox
  	    // if runner runs in an iframe, this iframe's window.getInterface method
  	    // not init at first it is assigned in some seconds
  	    if (commonjsGlobal.navigator && /^getInterface/.test(key)) {
  	      return false;
  	    }

  	    // an iframe could be approached by window[iframeIndex]
  	    // in ie6,7,8 and opera, iframeIndex is enumerable, this could cause leak
  	    if (commonjsGlobal.navigator && /^\d+/.test(key)) {
  	      return false;
  	    }

  	    // Opera and IE expose global variables for HTML element IDs (issue #243)
  	    if (/^mocha-/.test(key)) {
  	      return false;
  	    }

  	    var matched = ok.filter(function (ok) {
  	      if (~ok.indexOf("*")) {
  	        return key.indexOf(ok.split("*")[0]) === 0;
  	      }
  	      return key === ok;
  	    });
  	    return !matched.length && (!commonjsGlobal.navigator || key !== "onerror");
  	  });
  	}

  	/**
  	 * Check if argument is an instance of Error object or a duck-typed equivalent.
  	 *
  	 * @private
  	 * @param {Object} err - object to check
  	 * @param {string} err.message - error message
  	 * @returns {boolean}
  	 */
  	function isError(err) {
  	  return err instanceof Error || (err && typeof err.message === "string");
  	}

  	/**
  	 *
  	 * Converts thrown non-extensible type into proper Error.
  	 *
  	 * @private
  	 * @param {*} thrown - Non-extensible type thrown by code
  	 * @return {Error}
  	 */
  	function thrown2Error(err) {
  	  return new Error(
  	    `the ${utils.canonicalType(err)} ${stringify(
	      err,
	    )} was thrown, throw an Error :)`,
  	  );
  	}

  	Runner.constants = constants;

  	/**
  	 * Node.js' `EventEmitter`
  	 * @external EventEmitter
  	 * @see {@link https://nodejs.org/api/events.html#events_class_eventemitter}
  	 */

  	runner = Runner;
  	return runner;
  }

  var runnerExports = requireRunner();
  var Runner = /*@__PURE__*/getDefaultExportFromCjs(runnerExports);

  const { constants: constants$f } = Runner;
  var EVENT_TEST_PASS$c = constants$f.EVENT_TEST_PASS;
  var EVENT_TEST_FAIL$c = constants$f.EVENT_TEST_FAIL;

  const isBrowser = utils.isBrowser();

  function getBrowserWindowSize() {
    if ("innerHeight" in global$1) {
      return [global$1.innerHeight, global$1.innerWidth];
    }
    // In a Web Worker, the DOM Window is not available.
    return [640, 480];
  }

  /**
   * Check if both stdio streams are associated with a tty.
   */

  var isatty = isBrowser || (browser$1$1.stdout.isTTY && browser$1$1.stderr.isTTY);

  /**
   * Save log references to avoid tests interfering (see GH-3604).
   */
  var consoleLog = console.log;

  /**
   * @abstract
   * @description
   * All other reporters generally inherit from this reporter.
   */
  class Base {
    /**
     * Constructs a new `Base` reporter instance.
     *
     * @public
     * @memberof Mocha.reporters
     * @param {Runner} runner - Instance triggers reporter actions.
     * @param {Object} [options] - runner options
     */
    constructor(runner, options) {
      var failures = (this.failures = []);

      if (!runner) {
        throw new TypeError("Missing runner argument");
      }
      this.options = options || {};
      this.runner = runner;
      this.stats = runner.stats; // assigned so Reporters keep a closer reference

      var maxDiffSizeOpt =
        this.options.reporterOption && this.options.reporterOption.maxDiffSize;
      if (maxDiffSizeOpt !== undefined && !isNaN(Number(maxDiffSizeOpt))) {
        Base.maxDiffSize = Number(maxDiffSizeOpt);
      }

      runner.on(EVENT_TEST_PASS$c, function (test) {
        if (test.duration > test.slow()) {
          test.speed = "slow";
        } else if (test.duration > test.slow() / 2) {
          test.speed = "medium";
        } else {
          test.speed = "fast";
        }
      });

      runner.on(EVENT_TEST_FAIL$c, function (test, err) {
        if (Base.showDiff(err)) {
          stringifyDiffObjs(err);
        }
        // more than one error per test
        if (test.err && err instanceof Error) {
          test.err.multiple = (test.err.multiple || []).concat(err);
        } else {
          test.err = err;
        }
        failures.push(test);
      });
    }

    /**
     * Outputs common epilogue used by many of the bundled reporters.
     *
     * @public
     * @memberof Mocha.reporters
     */
    epilogue() {
      var stats = this.stats;
      var fmt;

      Base.consoleLog();

      // passes
      fmt =
        Base.color("bright pass", " ") +
        Base.color("green", " %d passing") +
        Base.color("light", " (%s)");

      Base.consoleLog(fmt, stats.passes || 0, ms(stats.duration));

      // pending
      if (stats.pending) {
        fmt = Base.color("pending", " ") + Base.color("pending", " %d pending");

        Base.consoleLog(fmt, stats.pending);
      }

      // failures
      if (stats.failures) {
        fmt = Base.color("fail", "  %d failing");

        Base.consoleLog(fmt, stats.failures);

        Base.list(this.failures);
        Base.consoleLog();
      }

      Base.consoleLog();
    }
  }

  Base.consoleLog = consoleLog;

  Base.abstract = true;

  /**
   * Enable coloring by default, except in the browser interface.
   */
  Base.useColors =
    !isBrowser &&
    (supportsColor.stdout || browser$1$1.env.MOCHA_COLORS !== undefined);

  /**
   * Inline diffs instead of +/-
   */

  Base.inlineDiffs = false;

  /**
   * Truncate diffs longer than this value to avoid slow performance
   */
  Base.maxDiffSize = 8192;

  /**
   * Default color map.
   */

  Base.colors = {
    pass: 90,
    fail: 31,
    "bright pass": 92,
    "bright fail": 91,
    "bright yellow": 93,
    pending: 36,
    suite: 0,
    "error title": 0,
    "error message": 31,
    "error stack": 90,
    checkmark: 32,
    fast: 90,
    medium: 33,
    slow: 31,
    green: 32,
    light: 90,
    "diff gutter": 90,
    "diff added": 32,
    "diff removed": 31,
    "diff added inline": "30;42",
    "diff removed inline": "30;41",
  };

  /**
   * Default symbol map.
   */

  Base.symbols = {
    ok: utils.logSymbols.success,
    err: utils.logSymbols.error,
    dot: ".",
    comma: ",",
    bang: "!",
  };

  /**
   * Color `str` with the given `type`,
   * allowing colors to be disabled,
   * as well as user-defined color
   * schemes.
   *
   * @private
   * @param {string} type
   * @param {string} str
   * @return {string}
   */
  Base.color = function (type, str) {
    if (!Base.useColors) {
      return String(str);
    }
    return "\u001b[" + Base.colors[type] + "m" + str + "\u001b[0m";
  };

  /**
   * Expose term window size, with some defaults for when stderr is not a tty.
   */

  Base.window = {
    width: 75,
  };

  if (isatty) {
    if (isBrowser) {
      Base.window.width = getBrowserWindowSize()[1];
    } else {
      Base.window.width = browser$1$1.stdout.getWindowSize(1)[0];
    }
  }

  /**
   * Expose some basic cursor interactions that are common among reporters.
   */

  Base.cursor = {
    hide: function () {
      isatty && browser$1$1.stdout.write("\u001b[?25l");
    },

    show: function () {
      isatty && browser$1$1.stdout.write("\u001b[?25h");
    },

    deleteLine: function () {
      isatty && browser$1$1.stdout.write("\u001b[2K");
    },

    beginningOfLine: function () {
      isatty && browser$1$1.stdout.write("\u001b[0G");
    },

    CR: function () {
      if (isatty) {
        Base.cursor.deleteLine();
        Base.cursor.beginningOfLine();
      } else {
        browser$1$1.stdout.write("\r");
      }
    },
  };

  Base.showDiff = function (err) {
    return (
      err &&
      err.showDiff !== false &&
      sameType(err.actual, err.expected) &&
      err.expected !== undefined
    );
  };

  /**
   * Estimate the serialized size of a value.
   * Returns -1 if the value is too complex to estimate safely.
   *
   * @private
   * @param {*} val
   * @param {number} maxDepth
   * @param {Set<*>} [seen]
   * @returns {number}
   */
  function estimateSize(val, maxDepth, seen) {
    if (maxDepth <= 0) return -1;

    seen = seen || new Set();

    const type = typeof val;
    if (type === "string") return val.length;
    if (type === "number" || type === "boolean") return 8;
    if (val === null || val === undefined) return 4;

    // Avoid circular references
    if (type === "object") {
      if (seen.has(val)) return -1;
      seen.add(val);

      // Special handling for Buffers - they can be massive
      if (typeof Buffer !== "undefined" && Buffer.isBuffer(val)) {
        return val.length > 10000 ? -1 : val.length * 2;
      }

      let size = 2; // {} or []
      try {
        const keys = Object.keys(val);
        if (keys.length > 1000) return -1; // Too many keys

        for (const key of keys) {
          const childSize = estimateSize(val[key], maxDepth - 1, seen);
          if (childSize === -1) return -1;
          size += key.length + childSize + 4; // key + value + formatting
          if (size > 100000) return -1; // Bail early if getting huge
        }
      } catch {
        return -1;
      }

      seen.delete(val);
      return size;
    }

    return 50; // Default estimate for other types
  }

  function stringifyDiffObjs(err) {
    if (!utils.isString(err.actual) || !utils.isString(err.expected)) {
      // Estimate size before stringifying to avoid hangs
      const maxSafeSize = Base.maxDiffSize || 8192;
      const actualSize = estimateSize(err.actual, 10);
      const expectedSize = estimateSize(err.expected, 10);

      if (
        actualSize === -1 ||
        expectedSize === -1 ||
        actualSize > maxSafeSize ||
        expectedSize > maxSafeSize
      ) {
        // Values too large/complex - provide safe fallback
        err.actual = "[object too large to diff]";
        err.expected = "[object too large to diff]";
        return;
      }

      err.actual = utils.stringify(err.actual);
      err.expected = utils.stringify(err.expected);
    }
  }

  /**
   * Returns a diff between 2 strings with coloured ANSI output.
   *
   * @description
   * The diff will be either inline or unified dependent on the value
   * of `Base.inlineDiff`.
   *
   * @param {string} actual
   * @param {string} expected
   * @return {string} Diff
   */

  Base.generateDiff = function (actual, expected) {
    try {
      var maxLen = Base.maxDiffSize;
      var skipped = 0;
      if (maxLen > 0) {
        skipped = Math.max(actual.length - maxLen, expected.length - maxLen);
        actual = actual.slice(0, maxLen);
        expected = expected.slice(0, maxLen);
      }
      let result = Base.inlineDiffs
        ? inlineDiff(actual, expected)
        : unifiedDiff(actual, expected);
      if (skipped > 0) {
        result = `${result}\n      [mocha] output truncated to ${maxLen} characters, see "maxDiffSize" reporter-option\n`;
      }
      return result;
    } catch {
      var msg =
        "\n      " +
        Base.color("diff added", "+ expected") +
        " " +
        Base.color("diff removed", "- actual:  failed to generate Mocha diff") +
        "\n";
      return msg;
    }
  };

  /**
   * Traverses err.cause and returns all stack traces
   *
   * @private
   * @param {Error} err
   * @param {Set<Error>} [seen]
   * @return {FullErrorStack}
   */
  var getFullErrorStack = function (err, seen) {
    if (seen && seen.has(err)) {
      return { message: "", msg: "<circular>", stack: "" };
    }

    var message;

    if (typeof err.inspect === "function") {
      message = err.inspect() + "";
    } else if (err.message && typeof err.message.toString === "function") {
      message = err.message + "";
    } else {
      message = "";
    }

    var msg;
    var stack = err.stack || message;
    var index = message ? stack.indexOf(message) : -1;

    if (index === -1) {
      msg = message;
    } else {
      index += message.length;
      msg = stack.slice(0, index);
      // remove msg from stack
      stack = stack.slice(index + 1);

      if (err.cause) {
        seen = seen || new Set();
        seen.add(err);
        const causeStack = getFullErrorStack(err.cause, seen);
        stack +=
          "\n   Caused by: " +
          causeStack.msg +
          (causeStack.stack ? "\n" + causeStack.stack : "");
      }
    }

    return {
      message,
      msg,
      stack,
    };
  };

  /**
   * Outputs the given `failures` as a list.
   *
   * @public
   * @memberof Mocha.reporters.Base
   * @variation 1
   * @param {Object[]} failures - Each is Test instance with corresponding
   *     Error property
   */
  Base.list = function (failures) {
    var multipleErr, multipleTest;
    Base.consoleLog();
    failures.forEach(function (test, i) {
      // format
      var fmt =
        Base.color("error title", "  %s) %s:\n") +
        Base.color("error message", "     %s") +
        Base.color("error stack", "\n%s\n");

      // msg
      var err;
      if (test.err && test.err.multiple) {
        if (multipleTest !== test) {
          multipleTest = test;
          multipleErr = [test.err].concat(test.err.multiple);
        }
        err = multipleErr.shift();
      } else {
        err = test.err;
      }

      var { message, msg, stack } = getFullErrorStack(err);

      // uncaught
      if (err.uncaught) {
        msg = "Uncaught " + msg;
      }
      // explicitly show diff
      if (!Base.hideDiff && Base.showDiff(err)) {
        stringifyDiffObjs(err);
        fmt =
          Base.color("error title", "  %s) %s:\n%s") +
          Base.color("error stack", "\n%s\n");
        var match = message.match(/^([^:]+): expected/);
        msg = "\n      " + Base.color("error message", match ? match[1] : msg);

        msg += Base.generateDiff(err.actual, err.expected);
      }

      // indent stack trace
      stack = stack.replace(/^/gm, "  ");

      // indented test title
      var testTitle = "";
      test.titlePath().forEach(function (str, index) {
        if (index !== 0) {
          testTitle += "\n     ";
        }
        for (var i = 0; i < index; i++) {
          testTitle += "  ";
        }
        testTitle += str;
      });

      Base.consoleLog(fmt, i + 1, testTitle, msg, stack);
    });
  };

  /**
   * Pads the given `str` to `len`.
   *
   * @private
   * @param {string} str
   * @param {string} len
   * @return {string}
   */
  function pad(str, len) {
    str = String(str);
    return Array(len - str.length + 1).join(" ") + str;
  }

  /**
   * Returns inline diff between 2 strings with coloured ANSI output.
   *
   * @private
   * @param {String} actual
   * @param {String} expected
   * @return {string} Diff
   */
  function inlineDiff(actual, expected) {
    var msg = errorDiff(actual, expected);

    // linenos
    var lines = msg.split("\n");
    if (lines.length > 4) {
      var width = String(lines.length).length;
      msg = lines
        .map(function (str, i) {
          return pad(i + 1, width) + " |" + " " + str;
        })
        .join("\n");
    }

    // legend
    msg =
      "\n" +
      Base.color("diff removed inline", "actual") +
      " " +
      Base.color("diff added inline", "expected") +
      "\n\n" +
      msg +
      "\n";

    // indent
    msg = msg.replace(/^/gm, "      ");
    return msg;
  }

  /**
   * Returns unified diff between two strings with coloured ANSI output.
   *
   * @private
   * @param {String} actual
   * @param {String} expected
   * @return {string} The diff.
   */
  function unifiedDiff(actual, expected) {
    var indent = "      ";
    function cleanUp(line) {
      if (line[0] === "+") {
        return indent + colorLines("diff added", line);
      }
      if (line[0] === "-") {
        return indent + colorLines("diff removed", line);
      }
      if (line.match(/@@/)) {
        return "--";
      }
      if (line.match(/\\ No newline/)) {
        return null;
      }
      return indent + line;
    }
    function notBlank(line) {
      return typeof line !== "undefined" && line !== null;
    }
    var msg = createPatch("string", actual, expected);
    var lines = msg.split("\n").splice(5);
    return (
      "\n      " +
      colorLines("diff added", "+ expected") +
      " " +
      colorLines("diff removed", "- actual") +
      "\n\n" +
      lines.map(cleanUp).filter(notBlank).join("\n")
    );
  }

  /**
   * Returns character diff for `err`.
   *
   * @private
   * @param {String} actual
   * @param {String} expected
   * @return {string} the diff
   */
  function errorDiff(actual, expected) {
    return diffWordsWithSpace(actual, expected)
      .map(function (str) {
        if (str.added) {
          return colorLines("diff added inline", str.value);
        }
        if (str.removed) {
          return colorLines("diff removed inline", str.value);
        }
        return str.value;
      })
      .join("");
  }

  /**
   * Colors lines for `str`, using the color `name`.
   *
   * @private
   * @param {string} name
   * @param {string} str
   * @return {string}
   */
  function colorLines(name, str) {
    return str
      .split("\n")
      .map(function (str) {
        return Base.color(name, str);
      })
      .join("\n");
  }

  /**
   * Object#toString reference.
   */
  var objToString = Object.prototype.toString;

  /**
   * Checks that a / b have the same type.
   *
   * @private
   * @param {Object} a
   * @param {Object} b
   * @return {boolean}
   */
  function sameType(a, b) {
    return objToString.call(a) === objToString.call(b);
  }

  var base = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Base: Base
  });

  var require$$0 = /*@__PURE__*/getAugmentedNamespace(base);

  var { constants: constants$e } = Runner;
  var EVENT_TEST_PASS$b = constants$e.EVENT_TEST_PASS;
  var EVENT_TEST_FAIL$b = constants$e.EVENT_TEST_FAIL;
  var EVENT_RUN_BEGIN$9 = constants$e.EVENT_RUN_BEGIN;
  var EVENT_TEST_PENDING$8 = constants$e.EVENT_TEST_PENDING;
  var EVENT_RUN_END$d = constants$e.EVENT_RUN_END;

  class Dot extends Base {
    static description = "dot matrix representation";

    /**
     * Constructs a new `Dot` reporter instance.
     *
     * @public
     * @memberof Mocha.reporters
     * @extends Mocha.reporters.Base
     * @param {Runner} runner - Instance triggers reporter actions.
     * @param {Object} [options] - runner options
     */
    constructor(runner, options) {
      super(runner, options);

      var self = this;
      var width = (Base.window.width * 0.75) | 0;
      var n = -1;

      runner.on(EVENT_RUN_BEGIN$9, function () {
        browser$1$1.stdout.write("\n");
      });

      runner.on(EVENT_TEST_PENDING$8, function () {
        if (++n % width === 0) {
          browser$1$1.stdout.write("\n  ");
        }
        browser$1$1.stdout.write(Base.color("pending", Base.symbols.comma));
      });

      runner.on(EVENT_TEST_PASS$b, function (test) {
        if (++n % width === 0) {
          browser$1$1.stdout.write("\n  ");
        }
        if (test.speed === "slow") {
          browser$1$1.stdout.write(Base.color("bright yellow", Base.symbols.dot));
        } else {
          browser$1$1.stdout.write(Base.color(test.speed, Base.symbols.dot));
        }
      });

      runner.on(EVENT_TEST_FAIL$b, function () {
        if (++n % width === 0) {
          browser$1$1.stdout.write("\n  ");
        }
        browser$1$1.stdout.write(Base.color("fail", Base.symbols.bang));
      });

      runner.once(EVENT_RUN_END$d, function () {
        browser$1$1.stdout.write("\n");
        self.epilogue();
      });
    }
  }

  var dot = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Dot: Dot
  });

  var require$$1 = /*@__PURE__*/getAugmentedNamespace(dot);

  /**
   * @typedef {import('../runner.cjs')} Runner
   */

  var constants$d = Runner.constants;
  var EVENT_TEST_PASS$a = constants$d.EVENT_TEST_PASS;
  var EVENT_TEST_FAIL$a = constants$d.EVENT_TEST_FAIL;
  var EVENT_SUITE_BEGIN$4 = constants$d.EVENT_SUITE_BEGIN;
  var EVENT_SUITE_END$3 = constants$d.EVENT_SUITE_END;

  class Doc extends Base {
    static description = "HTML documentation";

    /**
     * Constructs a new `Doc` reporter instance.
     *
     * @public
     * @memberof Mocha.reporters
     * @extends Mocha.reporters.Base
     * @param {Runner} runner - Instance triggers reporter actions.
     * @param {Object} [options] - runner options
     */
    constructor(runner, options) {
      super(runner, options);

      var indents = 2;

      function indent() {
        return Array(indents).join("  ");
      }

      runner.on(EVENT_SUITE_BEGIN$4, function (suite) {
        if (suite.root) {
          return;
        }
        ++indents;
        Base.consoleLog('%s<section class="suite">', indent());
        ++indents;
        Base.consoleLog("%s<h1>%s</h1>", indent(), utils.escape(suite.title));
        Base.consoleLog("%s<dl>", indent());
      });

      runner.on(EVENT_SUITE_END$3, function (suite) {
        if (suite.root) {
          return;
        }
        Base.consoleLog("%s</dl>", indent());
        --indents;
        Base.consoleLog("%s</section>", indent());
        --indents;
      });

      runner.on(EVENT_TEST_PASS$a, function (test) {
        Base.consoleLog("%s  <dt>%s</dt>", indent(), utils.escape(test.title));
        Base.consoleLog("%s  <dt>%s</dt>", indent(), utils.escape(test.file));
        var code = utils.escape(utils.clean(test.body));
        Base.consoleLog(
          "%s  <dd><pre><code>%s</code></pre></dd>",
          indent(),
          code,
        );
      });

      runner.on(EVENT_TEST_FAIL$a, function (test, err) {
        Base.consoleLog(
          '%s  <dt class="error">%s</dt>',
          indent(),
          utils.escape(test.title),
        );
        Base.consoleLog(
          '%s  <dt class="error">%s</dt>',
          indent(),
          utils.escape(test.file),
        );
        var code = utils.escape(utils.clean(test.body));
        Base.consoleLog(
          '%s  <dd class="error"><pre><code>%s</code></pre></dd>',
          indent(),
          code,
        );
        Base.consoleLog(
          '%s  <dd class="error">%s</dd>',
          indent(),
          utils.escape(err),
        );
      });
    }
  }

  var doc = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Doc: Doc
  });

  var require$$2 = /*@__PURE__*/getAugmentedNamespace(doc);

  var constants$c = Runner.constants;
  var EVENT_TEST_PASS$9 = constants$c.EVENT_TEST_PASS;
  var EVENT_TEST_FAIL$9 = constants$c.EVENT_TEST_FAIL;
  var EVENT_RUN_BEGIN$8 = constants$c.EVENT_RUN_BEGIN;
  var EVENT_RUN_END$c = constants$c.EVENT_RUN_END;
  var EVENT_TEST_PENDING$7 = constants$c.EVENT_TEST_PENDING;
  var EVENT_TEST_END$4 = constants$c.EVENT_TEST_END;
  var sprintf = util.format;

  class TAP extends Base {
    static description = "TAP-compatible output";

    /**
     * Constructs a new `TAP` reporter instance.
     *
     * @public
     * @memberof Mocha.reporters
     * @extends Mocha.reporters.Base
     * @param {Runner} runner - Instance triggers reporter actions.
     * @param {Object} [options] - runner options
     */
    constructor(runner, options) {
      super(runner, options);

      var self = this;
      var n = 1;

      var tapVersion = "12";
      if (options && options.reporterOptions) {
        if (options.reporterOptions.tapVersion) {
          tapVersion = options.reporterOptions.tapVersion.toString();
        }
      }

      this._producer = createProducer(tapVersion);

      runner.once(EVENT_RUN_BEGIN$8, function () {
        self._producer.writeVersion();
      });

      runner.on(EVENT_TEST_END$4, function () {
        ++n;
      });

      runner.on(EVENT_TEST_PENDING$7, function (test) {
        self._producer.writePending(n, test);
      });

      runner.on(EVENT_TEST_PASS$9, function (test) {
        self._producer.writePass(n, test);
      });

      runner.on(EVENT_TEST_FAIL$9, function (test, err) {
        self._producer.writeFail(n, test, err);
      });

      runner.once(EVENT_RUN_END$c, function () {
        self._producer.writeEpilogue(runner.stats);
      });
    }
  }

  /**
   * Returns a TAP-safe title of `test`.
   *
   * @private
   * @param {Test} test - Test instance.
   * @return {String} title with any hash character removed
   */
  function title(test) {
    return test.fullTitle().replace(/#/g, "");
  }

  /**
   * Writes newline-terminated formatted string to reporter output stream.
   *
   * @private
   * @param {string} format - `printf`-like format string
   * @param {...*} [varArgs] - Format string arguments
   */
  function println() {
    var vargs = Array.from(arguments);
    vargs[0] += "\n";
    browser$1$1.stdout.write(sprintf.apply(null, vargs));
  }

  /**
   * Returns a `tapVersion`-appropriate TAP producer instance, if possible.
   *
   * @private
   * @param {string} tapVersion - Version of TAP specification to produce.
   * @returns {TAPProducer} specification-appropriate instance
   * @throws {Error} if specification version has no associated producer.
   */
  function createProducer(tapVersion) {
    var producers = {
      12: new TAP12Producer(),
      13: new TAP13Producer(),
    };
    var producer = producers[tapVersion];

    if (!producer) {
      throw new Error(
        "invalid or unsupported TAP version: " + JSON.stringify(tapVersion),
      );
    }

    return producer;
  }

  /**
   * @summary
   * Constructs a new TAPProducer.
   *
   * @description
   * <em>Only</em> to be used as an abstract base class.
   *
   * @private
   * @constructor
   */
  class TAPProducer {
    /**
     * Writes the TAP version to reporter output stream.
     *
     * @abstract
     */
    writeVersion() {}

    /**
     * Writes the plan to reporter output stream.
     *
     * @abstract
     * @param {number} ntests - Number of tests that are planned to run.
     */
    writePlan(ntests) {
      println("%d..%d", 1, ntests);
    }

    /**
     * Writes that test passed to reporter output stream.
     *
     * @abstract
     * @param {number} n - Index of test that passed.
     * @param {Test} test - Instance containing test information.
     */
    writePass(n, test) {
      println("ok %d %s", n, title(test));
    }

    /**
     * Writes that test was skipped to reporter output stream.
     *
     * @abstract
     * @param {number} n - Index of test that was skipped.
     * @param {Test} test - Instance containing test information.
     */
    writePending(n, test) {
      println("ok %d %s # SKIP -", n, title(test));
    }

    /**
     * Writes that test failed to reporter output stream.
     *
     * @abstract
     * @param {number} n - Index of test that failed.
     * @param {Test} test - Instance containing test information.
     */
    writeFail(n, test) {
      println("not ok %d %s", n, title(test));
    }

    /**
     * Writes the summary epilogue to reporter output stream.
     *
     * @abstract
     * @param {Object} stats - Object containing run statistics.
     */
    writeEpilogue(stats) {
      // :TBD: Why is this not counting pending tests?
      println("# tests " + (stats.passes + stats.failures));
      println("# pass " + stats.passes);
      // :TBD: Why are we not showing pending results?
      println("# fail " + stats.failures);
      this.writePlan(stats.passes + stats.failures + stats.pending);
    }
  }

  /**
   * @description
   * Produces output conforming to the TAP12 specification.
   *
   * @private
   * @constructor
   * @extends TAPProducer
   * @see {@link https://testanything.org/tap-specification.html|Specification}
   */
  class TAP12Producer extends TAPProducer {
    /**
     * Writes that test failed to reporter output stream, with error formatting.
     * @override
     */
    writeFail(n, test, err) {
      super.writeFail(n, test, err);
      if (err.message) {
        println(err.message.replace(/^/gm, "  "));
      }
      if (err.stack) {
        println(err.stack.replace(/^/gm, "  "));
      }
    }
  }

  /**
   * @summary
   * Constructs a new TAP13Producer.
   *
   * @description
   * Produces output conforming to the TAP13 specification.
   *
   * @private
   * @constructor
   * @extends TAPProducer
   * @see {@link https://testanything.org/tap-version-13-specification.html|Specification}
   */
  class TAP13Producer extends TAPProducer {
    /**
     * Writes the TAP version to reporter output stream.
     * @override
     */
    writeVersion() {
      println("TAP version 13");
    }

    /**
     * Writes that test failed to reporter output stream, with error formatting.
     * @override
     */
    writeFail(n, test, err) {
      super.writeFail(n, test, err);
      var emitYamlBlock = err.message != null || err.stack != null;
      if (emitYamlBlock) {
        println(indent(1) + "---");
        if (err.message) {
          println(indent(2) + "message: |-");
          println(err.message.replace(/^/gm, indent(3)));
        }
        if (err.stack) {
          println(indent(2) + "stack: |-");
          println(err.stack.replace(/^/gm, indent(3)));
        }
        println(indent(1) + "...");
      }
    }
  }

  function indent(level) {
    return Array(level + 1).join("  ");
  }

  var tap = /*#__PURE__*/Object.freeze({
    __proto__: null,
    TAP: TAP
  });

  var require$$3 = /*@__PURE__*/getAugmentedNamespace(tap);

  var fs = {};

  const createUnsupportedError$1 = createUnsupportedError$2;
  var constants$b = Runner.constants;
  var EVENT_TEST_PASS$8 = constants$b.EVENT_TEST_PASS;
  var EVENT_TEST_PENDING$6 = constants$b.EVENT_TEST_PENDING;
  var EVENT_TEST_FAIL$8 = constants$b.EVENT_TEST_FAIL;
  var EVENT_TEST_END$3 = constants$b.EVENT_TEST_END;
  var EVENT_RUN_END$b = constants$b.EVENT_RUN_END;

  class JSONReporter extends Base {
    static description = "single JSON object";

    /**
     * Constructs a new `JSON` reporter instance.
     *
     * @public
     * @memberof Mocha.reporters
     * @extends Mocha.reporters.Base
     * @param {Runner} runner - Instance triggers reporter actions.
     * @param {Object} [options] - runner options
     */
    constructor(runner, options = {}) {
      super(runner, options);

      var self = this;
      var tests = [];
      var pending = [];
      var failures = [];
      var passes = [];
      var output;

      if (options.reporterOption && options.reporterOption.output) {
        if (utils.isBrowser()) {
          throw createUnsupportedError$1("file output not supported in browser");
        }
        output = options.reporterOption.output;
      }

      runner.on(EVENT_TEST_END$3, function (test) {
        tests.push(test);
      });

      runner.on(EVENT_TEST_PASS$8, function (test) {
        passes.push(test);
      });

      runner.on(EVENT_TEST_FAIL$8, function (test) {
        failures.push(test);
      });

      runner.on(EVENT_TEST_PENDING$6, function (test) {
        pending.push(test);
      });

      runner.once(EVENT_RUN_END$b, function () {
        var obj = {
          stats: self.stats,
          tests: tests.map(clean$1),
          pending: pending.map(clean$1),
          failures: failures.map(clean$1),
          passes: passes.map(clean$1),
        };

        runner.testResults = obj;

        var json = JSON.stringify(obj, null, 2);
        if (output) {
          try {
            fs.mkdirSync(path.dirname(output), { recursive: true });
            fs.writeFileSync(output, json);
          } catch (err) {
            console.error(
              `${Base.symbols.err} [mocha] writing output to "${output}" failed: ${err.message}\n`,
            );
            browser$1$1.stdout.write(json);
          }
        } else {
          browser$1$1.stdout.write(json);
        }
      });
    }
  }

  /**
   * Return a plain-object representation of `test`
   * free of cyclic properties etc.
   *
   * @private
   * @param {Object} test
   * @return {Object}
   */
  function clean$1(test) {
    var err = test.err || {};
    if (err instanceof Error) {
      err = errorJSON(err);
    }

    return {
      title: test.title,
      fullTitle: test.fullTitle(),
      file: test.file,
      duration: test.duration,
      currentRetry: test.currentRetry(),
      speed: test.speed,
      err: cleanCycles(err),
    };
  }

  /**
   * Replaces any circular references inside `obj` with '[object Object]'
   *
   * @private
   * @param {Object} obj
   * @return {Object}
   */
  function cleanCycles(obj) {
    var cache = [];
    return JSON.parse(
      JSON.stringify(obj, function (key, value) {
        if (typeof value === "object" && value !== null) {
          if (cache.indexOf(value) !== -1) {
            // Instead of going in a circle, we'll print [object Object]
            return "" + value;
          }
          cache.push(value);
        }

        return value;
      }),
    );
  }

  /**
   * Transform an Error object into a JSON object.
   *
   * @private
   * @param {Error} err
   * @return {Object}
   */
  function errorJSON(err) {
    var res = {};
    Object.getOwnPropertyNames(err).forEach(function (key) {
      res[key] = err[key];
    }, err);
    return res;
  }

  var json = /*#__PURE__*/Object.freeze({
    __proto__: null,
    JSONReporter: JSONReporter
  });

  var require$$4$1 = /*@__PURE__*/getAugmentedNamespace(json);

  var constants$a = Runner.constants;
  var EVENT_TEST_PASS$7 = constants$a.EVENT_TEST_PASS;
  var EVENT_TEST_FAIL$7 = constants$a.EVENT_TEST_FAIL;
  var EVENT_SUITE_BEGIN$3 = constants$a.EVENT_SUITE_BEGIN;
  var EVENT_SUITE_END$2 = constants$a.EVENT_SUITE_END;
  var EVENT_TEST_PENDING$5 = constants$a.EVENT_TEST_PENDING;
  var escape$1 = utils.escape;

  /**
   * Save timer references to avoid Sinon interfering (see GH-237).
   */

  var Date$3 = global$1.Date;

  /**
   * Stats template: Result, progress, passes, failures, and duration.
   */

  var statsTemplate =
    '<ul id="mocha-stats">' +
    '<li class="result"></li>' +
    '<li class="progress-contain"><progress class="progress-element" max="100" value="0"></progress><svg class="progress-ring"><circle class="ring-flatlight" stroke-dasharray="100%,0%"/><circle class="ring-highlight" stroke-dasharray="0%,100%"/></svg><div class="progress-text">0%</div></li>' +
    '<li class="passes"><a href="javascript:void(0);">passes:</a> <em>0</em></li>' +
    '<li class="failures"><a href="javascript:void(0);">failures:</a> <em>0</em></li>' +
    '<li class="duration">duration: <em>0</em>s</li>' +
    "</ul>";

  var playIcon = "&#x2023;";

  class HTML extends Base {
    static browserOnly = true;

    /**
     * Constructs a new `HTML` reporter instance.
     *
     * @public
     * @memberof Mocha.reporters
     * @extends Mocha.reporters.Base
     * @param {Runner} runner - Instance triggers reporter actions.
     * @param {Object} [options] - runner options
     */
    constructor(runner, options) {
      super(runner, options);

      var self = this;
      var stats = this.stats;
      var stat = fragment(statsTemplate);
      var items = stat.getElementsByTagName("li");
      const resultIndex = 0;
      const progressIndex = 1;
      const passesIndex = 2;
      const failuresIndex = 3;
      const durationIndex = 4;
      /** Stat item containing the root suite pass or fail indicator (hasFailures ? '✖' : '✓') */
      var resultIndicator = items[resultIndex];
      /** Passes text and count */
      const passesStat = items[passesIndex];
      /** Stat item containing the pass count (not the word, just the number) */
      const passesCount = passesStat.getElementsByTagName("em")[0];
      /** Stat item linking to filter to show only passing tests */
      const passesLink = passesStat.getElementsByTagName("a")[0];
      /** Failures text and count */
      const failuresStat = items[failuresIndex];
      /** Stat item containing the failure count (not the word, just the number) */
      const failuresCount = failuresStat.getElementsByTagName("em")[0];
      /** Stat item linking to filter to show only failing tests */
      const failuresLink = failuresStat.getElementsByTagName("a")[0];
      /** Stat item linking to the duration time (not the word or unit, just the number) */
      var duration = items[durationIndex].getElementsByTagName("em")[0];
      var report = fragment('<ul id="mocha-report"></ul>');
      var stack = [report];
      var progressText = items[progressIndex].getElementsByTagName("div")[0];
      var progressBar = items[progressIndex].getElementsByTagName("progress")[0];
      var progressRing = [
        items[progressIndex].getElementsByClassName("ring-flatlight")[0],
        items[progressIndex].getElementsByClassName("ring-highlight")[0],
      ];
      var root = document.getElementById("mocha");

      if (!root) {
        return error("#mocha div missing, add it to your document");
      }

      // pass toggle
      on(passesLink, "click", function (evt) {
        evt.preventDefault();
        unhide();
        var name = /pass/.test(report.className) ? "" : " pass";
        report.className = report.className.replace(/fail|pass/g, "") + name;
        if (report.className.trim()) {
          hideSuitesWithout("test pass");
        }
      });

      // failure toggle
      on(failuresLink, "click", function (evt) {
        evt.preventDefault();
        unhide();
        var name = /fail/.test(report.className) ? "" : " fail";
        report.className = report.className.replace(/fail|pass/g, "") + name;
        if (report.className.trim()) {
          hideSuitesWithout("test fail");
        }
      });

      root.appendChild(stat);
      root.appendChild(report);

      runner.on(EVENT_SUITE_BEGIN$3, function (suite) {
        if (suite.root) {
          return;
        }

        // suite
        var url = self.suiteURL(suite);
        var el = fragment(
          '<li class="suite"><h1><a href="%s">%s</a></h1></li>',
          url,
          escape$1(suite.title),
        );

        // container
        stack[0].appendChild(el);
        stack.unshift(document.createElement("ul"));
        el.appendChild(stack[0]);
      });

      runner.on(EVENT_SUITE_END$2, function (suite) {
        if (suite.root) {
          if (stats.failures === 0) {
            text(resultIndicator, "✓");
            stat.className += " pass";
          }
          updateStats();
          return;
        }
        stack.shift();
      });

      runner.on(EVENT_TEST_PASS$7, function (test) {
        var url = self.testURL(test);
        var markup =
          '<li class="test pass %e"><h2>%e<span class="duration">%ems</span> ' +
          '<a href="%s" class="replay">' +
          playIcon +
          "</a></h2></li>";
        var el = fragment(markup, test.speed, test.title, test.duration, url);
        self.addCodeToggle(el, test.body);
        appendToStack(el);
        updateStats();
      });

      runner.on(EVENT_TEST_FAIL$7, function (test) {
        // Update stat items
        text(resultIndicator, "✖");
        stat.className += " fail";

        var el = fragment(
          '<li class="test fail"><h2>%e <a href="%e" class="replay">' +
            playIcon +
            "</a></h2></li>",
          test.title,
          self.testURL(test),
        );
        var stackString; // Note: Includes leading newline
        var message = test.err.toString();

        // <=IE7 stringifies to [Object Error]. Since it can be overloaded, we
        // check for the result of the stringifying.
        if (message === "[object Error]") {
          message = test.err.message;
        }

        if (test.err.stack) {
          var indexOfMessage = test.err.stack.indexOf(test.err.message);
          if (indexOfMessage === -1) {
            stackString = test.err.stack;
          } else {
            stackString = test.err.stack.slice(
              test.err.message.length + indexOfMessage,
            );
          }
        } else if (test.err.sourceURL && test.err.line !== undefined) {
          // Safari doesn't give you a stack. Let's at least provide a source line.
          stackString = "\n(" + test.err.sourceURL + ":" + test.err.line + ")";
        }

        stackString = stackString || "";

        if (test.err.htmlMessage && stackString) {
          el.appendChild(
            fragment(
              '<div class="html-error">%s\n<pre class="error">%e</pre></div>',
              test.err.htmlMessage,
              stackString,
            ),
          );
        } else if (test.err.htmlMessage) {
          el.appendChild(
            fragment('<div class="html-error">%s</div>', test.err.htmlMessage),
          );
        } else {
          el.appendChild(
            fragment('<pre class="error">%e%e</pre>', message, stackString),
          );
        }

        self.addCodeToggle(el, test.body);
        appendToStack(el);
        updateStats();
      });

      runner.on(EVENT_TEST_PENDING$5, function (test) {
        var el = fragment(
          '<li class="test pass pending"><h2>%e</h2></li>',
          test.title,
        );
        appendToStack(el);
        updateStats();
      });

      function appendToStack(el) {
        // Don't call .appendChild if #mocha-report was already .shift()'ed off the stack.
        if (stack[0]) {
          stack[0].appendChild(el);
        }
      }

      function updateStats() {
        var percent = ((stats.tests / runner.total) * 100) | 0;
        progressBar.value = percent;
        if (progressText) {
          // setting a toFixed that is too low, makes small changes to progress not shown
          // setting it too high, makes the progress text longer then it needs to
          // to address this, calculate the toFixed based on the magnitude of total
          var decimalPlaces = Math.ceil(Math.log10(runner.total / 100));
          text(
            progressText,
            percent.toFixed(Math.min(Math.max(decimalPlaces, 0), 100)) + "%",
          );
        }
        if (progressRing) {
          var radius = parseFloat(
            getComputedStyle(progressRing[0]).getPropertyValue("r"),
          );
          var wholeArc = Math.PI * 2 * radius;
          var highlightArc = percent * (wholeArc / 100);
          // The progress ring is in 2 parts, the flatlight color and highlight color.
          // Rendering both on top of the other, seems to make a 3rd color on the edges.
          // To create 1 whole ring with 2 colors, both parts are inverse of the other.
          progressRing[0].style["stroke-dasharray"] =
            `0,${highlightArc}px,${wholeArc}px`;
          progressRing[1].style["stroke-dasharray"] =
            `${highlightArc}px,${wholeArc}px`;
        }

        // update stats
        var ms = new Date$3() - stats.start;
        text(passesCount, stats.passes);
        text(failuresCount, stats.failures);
        text(duration, (ms / 1000).toFixed(2));
      }
    }

    /**
     * Provide suite URL.
     *
     * @param {Object} [suite]
     */
    suiteURL(suite) {
      return makeUrl("^" + escapeRegExp(suite.fullTitle()) + " ");
    }

    /**
     * Provide test URL.
     *
     * @param {Object} [test]
     */
    testURL(test) {
      return makeUrl("^" + escapeRegExp(test.fullTitle()) + "$");
    }

    /**
     * Adds code toggle functionality for the provided test's list element.
     *
     * @param {HTMLLIElement} el
     * @param {string} contents
     */
    addCodeToggle(el, contents) {
      var h2 = el.getElementsByTagName("h2")[0];

      on(h2, "click", function () {
        pre.style.display = pre.style.display === "none" ? "block" : "none";
      });

      var pre = fragment("<pre><code>%e</code></pre>", utils.clean(contents));
      el.appendChild(pre);
      pre.style.display = "none";
    }
  }

  /**
   * Makes a URL, preserving querystring ("search") parameters.
   *
   * @param {string} s
   * @return {string} A new URL.
   */
  function makeUrl(s) {
    var search = window.location.search;

    // Remove previous {grep, fgrep, invert} query parameters if present
    if (search) {
      search = search
        .replace(/[?&](?:f?grep|invert)=[^&\s]*/g, "")
        .replace(/^&/, "?");
    }

    return (
      window.location.pathname +
      (search ? search + "&" : "?") +
      "grep=" +
      encodeURIComponent(s)
    );
  }

  /**
   * Display error `msg`.
   *
   * @param {string} msg
   */
  function error(msg) {
    document.body.appendChild(fragment('<div id="mocha-error">%s</div>', msg));
  }

  /**
   * Return a DOM fragment from `html`.
   *
   * @param {string} html
   */
  function fragment(html) {
    var args = arguments;
    var div = document.createElement("div");
    var i = 1;

    div.innerHTML = html.replace(/%([se])/g, function (_, type) {
      switch (type) {
        case "s":
          return String(args[i++]);
        case "e":
          return escape$1(args[i++]);
        // no default
      }
    });

    return div.firstChild;
  }

  /**
   * Check for suites that do not have elements
   * with `classname`, and hide them.
   *
   * @param {text} classname
   */
  function hideSuitesWithout(classname) {
    var suites = document.getElementsByClassName("suite");
    for (var i = 0; i < suites.length; i++) {
      var els = suites[i].getElementsByClassName(classname);
      if (!els.length) {
        suites[i].className += " hidden";
      }
    }
  }

  /**
   * Unhide .hidden suites.
   */
  function unhide() {
    var els = document.getElementsByClassName("suite hidden");
    while (els.length > 0) {
      els[0].className = els[0].className.replace("suite hidden", "suite");
    }
  }

  /**
   * Set an element's text contents.
   *
   * @param {HTMLElement} el
   * @param {string} contents
   */
  function text(el, contents) {
    if (el.textContent) {
      el.textContent = contents;
    } else {
      el.innerText = contents;
    }
  }

  /**
   * Listen on `event` with callback `fn`.
   */
  function on(el, event, fn) {
    if (el.addEventListener) {
      el.addEventListener(event, fn, false);
    } else {
      el.attachEvent("on" + event, fn);
    }
  }

  var html = /*#__PURE__*/Object.freeze({
    __proto__: null,
    HTML: HTML
  });

  var require$$5 = /*@__PURE__*/getAugmentedNamespace(html);

  var { constants: constants$9 } = Runner;
  var EVENT_RUN_BEGIN$7 = constants$9.EVENT_RUN_BEGIN;
  var EVENT_RUN_END$a = constants$9.EVENT_RUN_END;
  var EVENT_TEST_BEGIN = constants$9.EVENT_TEST_BEGIN;
  var EVENT_TEST_FAIL$6 = constants$9.EVENT_TEST_FAIL;
  var EVENT_TEST_PASS$6 = constants$9.EVENT_TEST_PASS;
  var EVENT_TEST_PENDING$4 = constants$9.EVENT_TEST_PENDING;
  var color$3 = Base.color;
  var cursor$2 = Base.cursor;

  class List extends Base {
    static description = 'like "spec" reporter but flat';

    /**
     * Constructs a new `List` reporter instance.
     *
     * @public
     * @memberof Mocha.reporters
     * @extends Mocha.reporters.Base
     * @param {Runner} runner - Instance triggers reporter actions.
     * @param {Object} [options] - runner options
     */
    constructor(runner, options) {
      super(runner, options);

      var n = 0;

      runner.on(EVENT_RUN_BEGIN$7, function () {
        Base.consoleLog();
      });

      runner.on(EVENT_TEST_BEGIN, function (test) {
        browser$1$1.stdout.write(color$3("pass", "    " + test.fullTitle() + ": "));
      });

      runner.on(EVENT_TEST_PENDING$4, function (test) {
        var fmt = color$3("checkmark", "  -") + color$3("pending", " %s");
        Base.consoleLog(fmt, test.fullTitle());
      });

      runner.on(EVENT_TEST_PASS$6, function (test) {
        var fmt =
          color$3("checkmark", "  " + Base.symbols.ok) +
          color$3("pass", " %s: ") +
          color$3(test.speed, "%dms");
        cursor$2.CR();
        Base.consoleLog(fmt, test.fullTitle(), test.duration);
      });

      runner.on(EVENT_TEST_FAIL$6, function (test) {
        cursor$2.CR();
        Base.consoleLog(color$3("fail", "  %d) %s"), ++n, test.fullTitle());
      });

      runner.once(EVENT_RUN_END$a, (...args) => this.epilogue(...args));
    }
  }

  var list = /*#__PURE__*/Object.freeze({
    __proto__: null,
    List: List
  });

  var require$$6 = /*@__PURE__*/getAugmentedNamespace(list);

  var { constants: constants$8 } = Runner;
  var EVENT_RUN_END$9 = constants$8.EVENT_RUN_END;
  var EVENT_RUN_BEGIN$6 = constants$8.EVENT_RUN_BEGIN;

  class Min extends Base {
    static description = "essentially just a summary";

    /**
     * Constructs a new `Min` reporter instance.
     *
     * @description
     * This minimal test reporter is best used with '--watch'.
     *
     * @public
     * @memberof Mocha.reporters
     * @extends Mocha.reporters.Base
     * @param {Runner} runner - Instance triggers reporter actions.
     * @param {Object} [options] - runner options
     */
    constructor(runner, options) {
      super(runner, options);

      runner.on(EVENT_RUN_BEGIN$6, function () {
        // clear screen
        browser$1$1.stdout.write("\u001b[2J");
        // set cursor position
        browser$1$1.stdout.write("\u001b[1;3H");
      });

      runner.once(EVENT_RUN_END$9, (...args) => this.epilogue(...args));
    }
  }

  var min = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Min: Min
  });

  var require$$7$1 = /*@__PURE__*/getAugmentedNamespace(min);

  /**
   * @typedef {import('../runner.cjs')} Runner
   * @typedef {import('../test.js')} Test
   */

  var constants$7 = Runner.constants;
  var EVENT_RUN_BEGIN$5 = constants$7.EVENT_RUN_BEGIN;
  var EVENT_RUN_END$8 = constants$7.EVENT_RUN_END;
  var EVENT_SUITE_BEGIN$2 = constants$7.EVENT_SUITE_BEGIN;
  var EVENT_SUITE_END$1 = constants$7.EVENT_SUITE_END;
  var EVENT_TEST_FAIL$5 = constants$7.EVENT_TEST_FAIL;
  var EVENT_TEST_PASS$5 = constants$7.EVENT_TEST_PASS;
  var EVENT_TEST_PENDING$3 = constants$7.EVENT_TEST_PENDING;
  var color$2 = Base.color;

  class Spec extends Base {
    static description = "hierarchical & verbose [default]";

    /**
     * Constructs a new `Spec` reporter instance.
     *
     * @public
     * @memberof Mocha.reporters
     * @extends Mocha.reporters.Base
     * @param {Runner} runner - Instance triggers reporter actions.
     * @param {Object} [options] - runner options
     */
    constructor(runner, options) {
      super(runner, options);

      var indents = 0;
      var n = 0;

      function indent() {
        return Array(indents).join("  ");
      }

      runner.on(EVENT_RUN_BEGIN$5, function () {
        Base.consoleLog();
      });

      runner.on(EVENT_SUITE_BEGIN$2, function (suite) {
        ++indents;
        Base.consoleLog(color$2("suite", "%s%s"), indent(), suite.title);
      });

      runner.on(EVENT_SUITE_END$1, function () {
        --indents;
        if (indents === 1) {
          Base.consoleLog();
        }
      });

      runner.on(EVENT_TEST_PENDING$3, function (test) {
        var fmt = indent() + color$2("pending", "  - %s");
        Base.consoleLog(fmt, test.title);
      });

      runner.on(EVENT_TEST_PASS$5, function (test) {
        var fmt;
        if (test.speed === "fast") {
          fmt =
            indent() +
            color$2("checkmark", "  " + Base.symbols.ok) +
            color$2("pass", " %s");
          Base.consoleLog(fmt, test.title);
        } else {
          fmt =
            indent() +
            color$2("checkmark", "  " + Base.symbols.ok) +
            color$2("pass", " %s") +
            color$2(test.speed, " (%dms)");
          Base.consoleLog(fmt, test.title, test.duration);
        }
      });

      runner.on(EVENT_TEST_FAIL$5, function (test) {
        Base.consoleLog(indent() + color$2("fail", "  %d) %s"), ++n, test.title);
      });

      runner.once(EVENT_RUN_END$8, (...args) => this.epilogue(...args));
    }
  }

  var spec = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Spec: Spec
  });

  var require$$8 = /*@__PURE__*/getAugmentedNamespace(spec);

  var constants$6 = Runner.constants;
  var EVENT_RUN_BEGIN$4 = constants$6.EVENT_RUN_BEGIN;
  var EVENT_TEST_PENDING$2 = constants$6.EVENT_TEST_PENDING;
  var EVENT_TEST_PASS$4 = constants$6.EVENT_TEST_PASS;
  var EVENT_RUN_END$7 = constants$6.EVENT_RUN_END;
  var EVENT_TEST_FAIL$4 = constants$6.EVENT_TEST_FAIL;

  class NyanCat extends Base {
    static description = '"nyan cat"';

    /**
     * Constructs a new `Nyan` reporter instance.
     *
     * @public
     * @memberof Mocha.reporters
     * @extends Mocha.reporters.Base
     * @param {Runner} runner - Instance triggers reporter actions.
     * @param {Object} [options] - runner options
     */
    constructor(runner, options) {
      super(runner, options);

      var self = this;
      var width = (Base.window.width * 0.75) | 0;
      var nyanCatWidth = (this.nyanCatWidth = 11);

      this.colorIndex = 0;
      this.numberOfLines = 4;
      this.rainbowColors = self.generateColors();
      this.scoreboardWidth = 5;
      this.tick = 0;
      this.trajectories = [[], [], [], []];
      this.trajectoryWidthMax = width - nyanCatWidth;

      runner.on(EVENT_RUN_BEGIN$4, function () {
        Base.cursor.hide();
        self.draw();
      });

      runner.on(EVENT_TEST_PENDING$2, function () {
        self.draw();
      });

      runner.on(EVENT_TEST_PASS$4, function () {
        self.draw();
      });

      runner.on(EVENT_TEST_FAIL$4, function () {
        self.draw();
      });

      runner.once(EVENT_RUN_END$7, function () {
        Base.cursor.show();
        for (var i = 0; i < self.numberOfLines; i++) {
          browser$1$1.stdout.write("\n");
        }
        self.epilogue();
      });
    }

    /**
     * Draw the nyan cat
     *
     * @private
     */

    draw() {
      this.appendRainbow();
      this.drawScoreboard();
      this.drawRainbow();
      this.drawNyanCat();
      this.tick = !this.tick;
    }

    /**
     * Draw the "scoreboard" showing the number
     * of passes, failures and pending tests.
     *
     * @private
     */

    drawScoreboard() {
      var stats = this.stats;

      function draw(type, n) {
        browser$1$1.stdout.write(" ");
        browser$1$1.stdout.write(Base.color(type, n));
        browser$1$1.stdout.write("\n");
      }

      draw("green", stats.passes);
      draw("fail", stats.failures);
      draw("pending", stats.pending);
      browser$1$1.stdout.write("\n");

      this.cursorUp(this.numberOfLines);
    }

    /**
     * Append the rainbow.
     *
     * @private
     */

    appendRainbow() {
      var segment = this.tick ? "_" : "-";
      var rainbowified = this.rainbowify(segment);

      for (var index = 0; index < this.numberOfLines; index++) {
        var trajectory = this.trajectories[index];
        if (trajectory.length >= this.trajectoryWidthMax) {
          trajectory.shift();
        }
        trajectory.push(rainbowified);
      }
    }

    /**
     * Draw the rainbow.
     *
     * @private
     */

    drawRainbow() {
      var self = this;

      this.trajectories.forEach(function (line) {
        browser$1$1.stdout.write("\u001b[" + self.scoreboardWidth + "C");
        browser$1$1.stdout.write(line.join(""));
        browser$1$1.stdout.write("\n");
      });

      this.cursorUp(this.numberOfLines);
    }

    /**
     * Draw the nyan cat
     *
     * @private
     */
    drawNyanCat() {
      var self = this;
      var startWidth = this.scoreboardWidth + this.trajectories[0].length;
      var dist = "\u001b[" + startWidth + "C";
      var padding;

      browser$1$1.stdout.write(dist);
      browser$1$1.stdout.write("_,------,");
      browser$1$1.stdout.write("\n");

      browser$1$1.stdout.write(dist);
      padding = self.tick ? "  " : "   ";
      browser$1$1.stdout.write("_|" + padding + "/\\_/\\ ");
      browser$1$1.stdout.write("\n");

      browser$1$1.stdout.write(dist);
      padding = self.tick ? "_" : "__";
      var tail = self.tick ? "~" : "^";
      browser$1$1.stdout.write(tail + "|" + padding + this.face() + " ");
      browser$1$1.stdout.write("\n");

      browser$1$1.stdout.write(dist);
      padding = self.tick ? " " : "  ";
      browser$1$1.stdout.write(padding + '""  "" ');
      browser$1$1.stdout.write("\n");

      this.cursorUp(this.numberOfLines);
    }

    /**
     * Draw nyan cat face.
     *
     * @private
     * @return {string}
     */

    face() {
      var stats = this.stats;
      if (stats.failures) {
        return "( x .x)";
      } else if (stats.pending) {
        return "( o .o)";
      } else if (stats.passes) {
        return "( ^ .^)";
      }
      return "( - .-)";
    }

    /**
     * Move cursor up `n`.
     *
     * @private
     * @param {number} n
     */

    cursorUp(n) {
      browser$1$1.stdout.write("\u001b[" + n + "A");
    }

    /**
     * Move cursor down `n`.
     *
     * @private
     * @param {number} n
     */

    cursorDown(n) {
      browser$1$1.stdout.write("\u001b[" + n + "B");
    }

    /**
     * Generate rainbow colors.
     *
     * @private
     * @return {Array}
     */
    generateColors() {
      var colors = [];

      for (var i = 0; i < 6 * 7; i++) {
        var pi3 = Math.floor(Math.PI / 3);
        var n = i * (1.0 / 6);
        var r = Math.floor(3 * Math.sin(n) + 3);
        var g = Math.floor(3 * Math.sin(n + 2 * pi3) + 3);
        var b = Math.floor(3 * Math.sin(n + 4 * pi3) + 3);
        colors.push(36 * r + 6 * g + b + 16);
      }

      return colors;
    }

    /**
     * Apply rainbow to the given `str`.
     *
     * @private
     * @param {string} str
     * @return {string}
     */
    rainbowify(str) {
      if (!Base.useColors) {
        return str;
      }
      var color = this.rainbowColors[this.colorIndex % this.rainbowColors.length];
      this.colorIndex += 1;
      return "\u001b[38;5;" + color + "m" + str + "\u001b[0m";
    }
  }

  var nyan = /*#__PURE__*/Object.freeze({
    __proto__: null,
    NyanCat: NyanCat
  });

  var require$$9 = /*@__PURE__*/getAugmentedNamespace(nyan);

  var createUnsupportedError = createUnsupportedError$2;
  var constants$5 = Runner.constants;
  var EVENT_TEST_PASS$3 = constants$5.EVENT_TEST_PASS;
  var EVENT_TEST_FAIL$3 = constants$5.EVENT_TEST_FAIL;
  var EVENT_RUN_END$6 = constants$5.EVENT_RUN_END;
  var EVENT_TEST_PENDING$1 = constants$5.EVENT_TEST_PENDING;
  var STATE_FAILED$1 = Runnable.constants.STATE_FAILED;
  var escape = utils.escape;
  var ANSI_ESCAPE_SEQUENCE = new RegExp(
    String.fromCharCode(27) + "\\[[0-?]*[ -/]*[@-~]",
    "g",
  );

  /**
   * Save timer references to avoid Sinon interfering (see GH-237).
   */
  var Date$2 = global$1.Date;

  class XUnit extends Base {
    static description = "XUnit-compatible XML output";

    /**
     * Constructs a new `XUnit` reporter instance.
     *
     * @public
     * @memberof Mocha.reporters
     * @extends Mocha.reporters.Base
     * @param {Runner} runner - Instance triggers reporter actions.
     * @param {Object} [options] - runner options
     */
    constructor(runner, options) {
      super(runner, options);

      var stats = this.stats;
      var tests = [];
      var self = this;

      // the name of the test suite, as it will appear in the resulting XML file
      var suiteName;

      // the default name of the test suite if none is provided
      var DEFAULT_SUITE_NAME = "Mocha Tests";

      if (options && options.reporterOptions) {
        if (options.reporterOptions.output) {
          if (!fs.createWriteStream) {
            throw createUnsupportedError("file output not supported in browser");
          }

          fs.mkdirSync(path.dirname(options.reporterOptions.output), {
            recursive: true,
          });
          self.fileStream = fs.createWriteStream(options.reporterOptions.output);
        }

        // get the suite name from the reporter options (if provided)
        suiteName = options.reporterOptions.suiteName;
      }

      // fall back to the default suite name
      suiteName = suiteName || DEFAULT_SUITE_NAME;

      runner.on(EVENT_TEST_PENDING$1, function (test) {
        tests.push(test);
      });

      runner.on(EVENT_TEST_PASS$3, function (test) {
        tests.push(test);
      });

      runner.on(EVENT_TEST_FAIL$3, function (test) {
        tests.push(test);
      });

      runner.once(EVENT_RUN_END$6, function () {
        self.write(
          tag(
            "testsuite",
            {
              name: suiteName,
              tests: stats.tests,
              failures: 0,
              errors: stats.failures,
              skipped: stats.tests - stats.failures - stats.passes,
              timestamp: new Date$2().toUTCString(),
              time: stats.duration / 1000 || 0,
            },
            false,
          ),
        );

        tests.forEach(function (t) {
          self.test(t, options);
        });

        self.write("</testsuite>");
      });
    }

    /**
     * Override done to close the stream (if it's a file).
     *
     * @param failures
     * @param {Function} fn
     */
    done(failures, fn) {
      if (this.fileStream) {
        this.fileStream.end(function () {
          fn(failures);
        });
      } else {
        fn(failures);
      }
    }

    /**
     * Write out the given line.
     *
     * @param {string} line
     */
    write(line) {
      if (this.fileStream) {
        this.fileStream.write(line + "\n");
      } else if (typeof browser$1$1 === "object" && browser$1$1.stdout) {
        browser$1$1.stdout.write(line + "\n");
      } else {
        Base.consoleLog(line);
      }
    }

    /**
     * Output tag for the given `test.`
     *
     * @param {Test} test
     */
    test(test, options) {
      Base.useColors = false;

      var attrs = {
        classname: test.parent.fullTitle(),
        name: test.title,
        file: testFilePath(test.file, options),
        time: test.duration / 1000 || 0,
      };

      if (test.state === STATE_FAILED$1) {
        var err = test.err;
        var diff =
          !Base.hideDiff && Base.showDiff(err)
            ? "\n" + Base.generateDiff(err.actual, err.expected)
            : "";
        this.write(
          tag(
            "testcase",
            attrs,
            false,
            tag(
              "failure",
              {},
              false,
              escapeXml(err.message) +
                escapeXml(diff) +
                "\n" +
                escapeXml(err.stack),
            ),
          ),
        );
      } else if (test.isPending()) {
        this.write(tag("testcase", attrs, false, tag("skipped", {}, true)));
      } else {
        this.write(tag("testcase", attrs, true));
      }
    }
  }

  /**
   * HTML tag helper.
   *
   * @param name
   * @param attrs
   * @param close
   * @param content
   * @return {string}
   */
  function tag(name, attrs, close, content) {
    var end = close ? "/>" : ">";
    var pairs = [];
    var tag;

    for (var key in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, key)) {
        pairs.push(key + '="' + escapeXml(attrs[key]) + '"');
      }
    }

    tag = "<" + name + (pairs.length ? " " + pairs.join(" ") : "") + end;
    if (content) {
      tag += content + "</" + name + end;
    }
    return tag;
  }

  function escapeXml(value) {
    return escape(
      stripInvalidXmlCharacters(String(value).replace(ANSI_ESCAPE_SEQUENCE, "")),
    );
  }

  function stripInvalidXmlCharacters(value) {
    var result = "";

    for (var i = 0; i < value.length; i += 1) {
      var charCode = value.charCodeAt(i);
      if (
        charCode === 0x09 ||
        charCode === 0x0a ||
        charCode === 0x0d ||
        charCode >= 0x20
      ) {
        result += value[i];
      }
    }

    return result;
  }

  function testFilePath(filepath, options) {
    if (
      options &&
      options.reporterOptions &&
      options.reporterOptions.showRelativePaths
    ) {
      return path.relative(browser$1$1.cwd(), filepath);
    }

    return filepath;
  }

  var xunit = /*#__PURE__*/Object.freeze({
    __proto__: null,
    XUnit: XUnit
  });

  var require$$10$1 = /*@__PURE__*/getAugmentedNamespace(xunit);

  var constants$4 = Runner.constants;
  var EVENT_RUN_END$5 = constants$4.EVENT_RUN_END;
  var EVENT_SUITE_BEGIN$1 = constants$4.EVENT_SUITE_BEGIN;
  var EVENT_SUITE_END = constants$4.EVENT_SUITE_END;
  var EVENT_TEST_PASS$2 = constants$4.EVENT_TEST_PASS;

  /**
   * Constants
   */

  var SUITE_PREFIX = "$";

  class Markdown extends Base {
    static description = "GitHub Flavored Markdown";

    /**
     * Constructs a new `Markdown` reporter instance.
     *
     * @public
     * @memberof Mocha.reporters
     * @extends Mocha.reporters.Base
     * @param {Runner} runner - Instance triggers reporter actions.
     * @param {Object} [options] - runner options
     */
    constructor(runner, options) {
      super(runner, options);

      var level = 0;
      var buf = "";

      function title(str) {
        return Array(level).join("#") + " " + str;
      }

      function mapTOC(suite, obj) {
        var ret = obj;
        var key = SUITE_PREFIX + suite.title;

        obj = obj[key] = obj[key] || { suite };
        suite.suites.forEach(function (suite) {
          mapTOC(suite, obj);
        });

        return ret;
      }

      function stringifyTOC(obj, level) {
        ++level;
        var buf = "";
        var link;
        for (var key in obj) {
          if (key === "suite") {
            continue;
          }
          if (key !== SUITE_PREFIX) {
            link = " - [" + key.substring(1) + "]";
            link += "(#" + utils.slug(obj[key].suite.fullTitle()) + ")\n";
            buf += Array(level).join("  ") + link;
          }
          buf += stringifyTOC(obj[key], level);
        }
        return buf;
      }

      function generateTOC(suite) {
        var obj = mapTOC(suite, {});
        return stringifyTOC(obj, 0);
      }

      generateTOC(runner.suite);

      runner.on(EVENT_SUITE_BEGIN$1, function (suite) {
        ++level;
        var slug = utils.slug(suite.fullTitle());
        buf += '<a name="' + slug + '"></a>' + "\n";
        buf += title(suite.title) + "\n";
      });

      runner.on(EVENT_SUITE_END, function () {
        --level;
      });

      runner.on(EVENT_TEST_PASS$2, function (test) {
        var code = utils.clean(test.body);
        buf += test.title + ".\n";
        buf += "\n```js\n";
        buf += code + "\n";
        buf += "```\n\n";
      });

      runner.once(EVENT_RUN_END$5, function () {
        browser$1$1.stdout.write("# TOC\n");
        browser$1$1.stdout.write(generateTOC(runner.suite));
        browser$1$1.stdout.write(buf);
      });
    }
  }

  var markdown = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Markdown: Markdown
  });

  var require$$11 = /*@__PURE__*/getAugmentedNamespace(markdown);

  var constants$3 = Runner.constants;
  var EVENT_RUN_BEGIN$3 = constants$3.EVENT_RUN_BEGIN;
  var EVENT_TEST_END$2 = constants$3.EVENT_TEST_END;
  var EVENT_RUN_END$4 = constants$3.EVENT_RUN_END;
  var color$1 = Base.color;
  var cursor$1 = Base.cursor;

  /**
   * General progress bar color.
   */

  Base.colors.progress = 90;

  class Progress extends Base {
    static description = "a progress bar";

    /**
     * Constructs a new `Progress` reporter instance.
     *
     * @public
     * @memberof Mocha.reporters
     * @extends Mocha.reporters.Base
     * @param {Runner} runner - Instance triggers reporter actions.
     * @param {Object} [options] - runner options
     */
    constructor(runner, options) {
      super(runner, options);

      var self = this;
      var width = (Base.window.width * 0.5) | 0;
      var total = runner.total;
      var complete = 0;
      var lastN = -1;

      // default chars
      options = options || {};
      var reporterOptions = options.reporterOptions || {};

      options.open = reporterOptions.open || "[";
      options.complete = reporterOptions.complete || "▬";
      options.incomplete = reporterOptions.incomplete || Base.symbols.dot;
      options.close = reporterOptions.close || "]";
      options.verbose = reporterOptions.verbose || false;

      // tests started
      runner.on(EVENT_RUN_BEGIN$3, function () {
        browser$1$1.stdout.write("\n");
        cursor$1.hide();
      });

      // tests complete
      runner.on(EVENT_TEST_END$2, function () {
        complete++;

        var percent = complete / total;
        var n = (width * percent) | 0;
        var i = width - n;

        if (n === lastN && !options.verbose) {
          // Don't re-render the line if it hasn't changed
          return;
        }
        lastN = n;

        cursor$1.CR();
        browser$1$1.stdout.write("\u001b[J");
        browser$1$1.stdout.write(color$1("progress", "  " + options.open));
        browser$1$1.stdout.write(Array(n).join(options.complete));
        browser$1$1.stdout.write(Array(i).join(options.incomplete));
        browser$1$1.stdout.write(color$1("progress", options.close));
        if (options.verbose) {
          browser$1$1.stdout.write(
            color$1("progress", " " + complete + " of " + total),
          );
        }
      });

      // tests are complete, output some stats
      // and the failures if any
      runner.once(EVENT_RUN_END$4, function () {
        cursor$1.show();
        browser$1$1.stdout.write("\n");
        self.epilogue();
      });
    }
  }

  var progress = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Progress: Progress
  });

  var require$$12$1 = /*@__PURE__*/getAugmentedNamespace(progress);

  var constants$2 = Runner.constants;
  var EVENT_RUN_BEGIN$2 = constants$2.EVENT_RUN_BEGIN;
  var EVENT_RUN_END$3 = constants$2.EVENT_RUN_END;
  var EVENT_TEST_END$1 = constants$2.EVENT_TEST_END;
  var STATE_FAILED = Runnable.constants.STATE_FAILED;

  var cursor = Base.cursor;
  var color = Base.color;

  /**
   * Airplane color.
   */

  Base.colors.plane = 0;

  /**
   * Airplane crash color.
   */

  Base.colors["plane crash"] = 31;

  /**
   * Runway color.
   */

  Base.colors.runway = 90;

  class Landing extends Base {
    static description = "Unicode landing strip";

    /**
     * Constructs a new `Landing` reporter instance.
     *
     * @public
     * @memberof Mocha.reporters
     * @extends Mocha.reporters.Base
     * @param {Runner} runner - Instance triggers reporter actions.
     * @param {Object} [options] - runner options
     */
    constructor(runner, options) {
      super(runner, options);

      var self = this;
      var width = (Base.window.width * 0.75) | 0;
      var stream = browser$1$1.stdout;

      var plane = color("plane", "✈");
      var crashed = -1;
      var n = 0;
      var total = 0;

      function runway() {
        var buf = Array(width).join("-");
        return "  " + color("runway", buf);
      }

      runner.on(EVENT_RUN_BEGIN$2, function () {
        stream.write("\n\n\n  ");
        cursor.hide();
      });

      runner.on(EVENT_TEST_END$1, function (test) {
        // check if the plane crashed
        var col = crashed === -1 ? ((width * ++n) / ++total) | 0 : crashed;
        // show the crash
        if (test.state === STATE_FAILED) {
          plane = color("plane crash", "✈");
          crashed = col;
        }

        // render landing strip
        stream.write("\u001b[" + (width + 1) + "D\u001b[2A");
        stream.write(runway());
        stream.write("\n  ");
        stream.write(color("runway", Array(col).join("⋅")));
        stream.write(plane);
        stream.write(color("runway", Array(width - col).join("⋅") + "\n"));
        stream.write(runway());
        stream.write("\u001b[0m");
      });

      runner.once(EVENT_RUN_END$3, function () {
        cursor.show();
        browser$1$1.stdout.write("\n");
        self.epilogue();
      });

      // if cursor is hidden when we ctrl-C, then it will remain hidden unless...
      browser$1$1.once("SIGINT", function () {
        cursor.show();
        browser$1$1.nextTick(function () {
          browser$1$1.kill(browser$1$1.pid, "SIGINT");
        });
      });
    }
  }

  var landing = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Landing: Landing
  });

  var require$$13 = /*@__PURE__*/getAugmentedNamespace(landing);

  var constants$1 = Runner.constants;
  var EVENT_TEST_PASS$1 = constants$1.EVENT_TEST_PASS;
  var EVENT_TEST_FAIL$2 = constants$1.EVENT_TEST_FAIL;
  var EVENT_RUN_BEGIN$1 = constants$1.EVENT_RUN_BEGIN;
  var EVENT_RUN_END$2 = constants$1.EVENT_RUN_END;

  class JSONStream extends Base {
    static description = "newline delimited JSON events";

    /**
     * Constructs a new `JSONStream` reporter instance.
     *
     * @public
     * @memberof Mocha.reporters
     * @extends Mocha.reporters.Base
     * @param {Runner} runner - Instance triggers reporter actions.
     * @param {Object} [options] - runner options
     */
    constructor(runner, options) {
      super(runner, options);

      var self = this;
      var total = runner.total;

      runner.once(EVENT_RUN_BEGIN$1, function () {
        writeEvent(["start", { total }]);
      });

      runner.on(EVENT_TEST_PASS$1, function (test) {
        writeEvent(["pass", clean(test)]);
      });

      runner.on(EVENT_TEST_FAIL$2, function (test, err) {
        test = clean(test);
        test.err = err.message;
        test.stack = err.stack || null;
        writeEvent(["fail", test]);
      });

      runner.once(EVENT_RUN_END$2, function () {
        writeEvent(["end", self.stats]);
      });
    }
  }

  /**
   * Writes Mocha event to reporter output stream.
   *
   * @private
   * @param {unknown[]} event - Mocha event to be output.
   */
  function writeEvent(event) {
    browser$1$1.stdout.write(JSON.stringify(event) + "\n");
  }

  /**
   * Returns an object literal representation of `test`
   * free of cyclic properties, etc.
   *
   * @private
   * @param {Test} test - Instance used as data source.
   * @return {Object} object containing pared-down test instance data
   */
  function clean(test) {
    return {
      title: test.title,
      fullTitle: test.fullTitle(),
      file: test.file,
      duration: test.duration,
      currentRetry: test.currentRetry(),
      speed: test.speed,
    };
  }

  var jsonStream = /*#__PURE__*/Object.freeze({
    __proto__: null,
    JSONStream: JSONStream
  });

  var require$$14$1 = /*@__PURE__*/getAugmentedNamespace(jsonStream);

  const { constants } = Runner;
  var EVENT_TEST_FAIL$1 = constants.EVENT_TEST_FAIL;
  var EVENT_RUN_END$1 = constants.EVENT_RUN_END;

  /**
   * Extract file, line, and column from an error stack trace.
   *
   * @private
   * @param {string} [stackTrace] - stack trace string
   * @return {{ file?: string, line?: string, col?: string }}
   */
  function extractLocation(stackTrace) {
    if (!stackTrace) {
      return {};
    }
    var matches =
      /^\s*at Context.*\(([^()]+):([0-9]+):([0-9]+)\)/gm.exec(stackTrace) ||
      /^\s*at.*\(([^()]+):([0-9]+):([0-9]+)\)/gm.exec(stackTrace);
    if (matches === null) {
      return {};
    }
    return {
      file: matches[1],
      line: matches[2],
      col: matches[3],
    };
  }

  /**
   * Escape a value for use in a GitHub Actions workflow command.
   *
   * @private
   * @param {string} value
   * @return {string}
   */
  function escapeWorkflowValue(value) {
    return String(value)
      .replace(/%/g, "%25")
      .replace(/\r/g, "%0D")
      .replace(/\n/g, "%0A");
  }

  /**
   * Escape a property value for use in a GitHub Actions workflow command.
   *
   * @private
   * @param {string} value
   * @return {string}
   */
  function escapeWorkflowProperty(value) {
    return String(value)
      .replace(/%/g, "%25")
      .replace(/\r/g, "%0D")
      .replace(/\n/g, "%0A")
      .replace(/:/g, "%3A")
      .replace(/,/g, "%2C");
  }

  class GithubActions extends Spec {
    static description =
      "like spec, with GitHub Actions error annotations and job summary";

    /**
     * Construct a new GithubActions reporter instance.
     *
     * @description
     * Extend the Spec reporter to add GitHub Actions error annotations and
     * Job Summary output when running in GitHub Actions CI.
     *
     * @public
     * @memberof Mocha.reporters
     * @extends Mocha.reporters.Spec
     * @param {Runner} runner - Instance triggers reporter actions.
     * @param {Object} [options] - runner options
     */
    constructor(runner, options) {
      super(runner, options);

      var ciFailures = [];

      runner.on(EVENT_TEST_FAIL$1, function (test) {
        ciFailures.push(test);
      });

      runner.once(EVENT_RUN_END$1, () => {
        if (ciFailures.length > 0) {
          browser$1$1.stdout.write("::group::Mocha Annotations\n");

          for (var test of ciFailures) {
            var location = extractLocation(test.err && test.err.stack);
            var props = [];
            if (location.file) {
              props.push("file=" + escapeWorkflowProperty(location.file));
            }
            if (location.line) {
              props.push("line=" + escapeWorkflowProperty(location.line));
            }
            if (location.col) {
              props.push("col=" + escapeWorkflowProperty(location.col));
            }

            var message = test.err ? escapeWorkflowValue(test.err.message) : "";
            browser$1$1.stdout.write(
              "::error " + props.join(",") + "::" + message + "\n",
            );
          }

          browser$1$1.stdout.write("::endgroup::\n");
        }

        var summaryFile = browser$1$1.env.GITHUB_STEP_SUMMARY;
        if (summaryFile) {
          var lines = [];
          lines.push(
            ":white_check_mark: " +
              (this.stats.passes || 0) +
              " passing (" +
              ms(this.stats.duration) +
              ")",
          );
          if (this.stats.pending) {
            lines.push(":pause_button: " + this.stats.pending + " pending");
          }
          if (this.stats.failures) {
            lines.push(":x: " + this.stats.failures + " failing");
          }
          fs.appendFileSync(summaryFile, lines.join("\n") + "\n");
        }
      });
    }
  }

  var githubActions = /*#__PURE__*/Object.freeze({
    __proto__: null,
    GithubActions: GithubActions
  });

  var require$$15$1 = /*@__PURE__*/getAugmentedNamespace(githubActions);

  var hasRequiredReporters;

  function requireReporters () {
  	if (hasRequiredReporters) return reporters;
  	hasRequiredReporters = 1;
  	(function (exports) {

  		// Alias exports to a their normalized format Mocha#reporter to prevent a need
  		// for dynamic (try/catch) requires, which Browserify doesn't handle.
  		const { Base } = require$$0;
  		exports.Base = exports.base = Base;
  		const { Dot } = require$$1;
  		exports.Dot = exports.dot = Dot;
  		const { Doc } = require$$2;
  		exports.Doc = exports.doc = Doc;
  		const { TAP } = require$$3;
  		exports.TAP = exports.tap = TAP;
  		const { JSONReporter } = require$$4$1;
  		exports.JSON = exports.json = JSONReporter;
  		const { HTML } = require$$5;
  		exports.HTML = exports.html = HTML;
  		const { List } = require$$6;
  		exports.List = exports.list = List;
  		const { Min } = require$$7$1;
  		exports.Min = exports.min = Min;
  		const { Spec } = require$$8;
  		exports.Spec = exports.spec = Spec;
  		const { NyanCat } = require$$9;
  		exports.Nyan = exports.nyan = NyanCat;
  		const { XUnit } = require$$10$1;
  		exports.XUnit = exports.xunit = XUnit;
  		const { Markdown } = require$$11;
  		exports.Markdown = exports.markdown = Markdown;
  		const { Progress } = require$$12$1;
  		exports.Progress = exports.progress = Progress;
  		const { Landing } = require$$13;
  		exports.Landing = exports.landing = Landing;
  		const { JSONStream } = require$$14$1;
  		exports.JSONStream = exports["json-stream"] = JSONStream;
  		const { GithubActions } = require$$15$1;
  		exports.GithubActions = exports["github-actions"] = GithubActions; 
  	} (reporters));
  	return reporters;
  }

  var diff = true;
  var extension = [
  	"js",
  	"cjs",
  	"mjs"
  ];
  var reporter = "spec";
  var slow = 75;
  var timeout = 2000;
  var ui = "bdd";
  var require$$4 = {
  	diff: diff,
  	extension: extension,
  	"package": "./package.json",
  	reporter: reporter,
  	slow: slow,
  	timeout: timeout,
  	ui: ui,
  	"watch-ignore": [
  	"node_modules",
  	".git"
  ]
  };

  var require$$18 = /*@__PURE__*/getAugmentedNamespace(_nodeResolve_empty);

  /**
   * @typedef {import('./types.d.ts').StatsCollector} StatsCollector
   * @typedef {import('./runner.cjs')} Runner
   */


  const {
    EVENT_TEST_PASS,
    EVENT_TEST_FAIL,
    EVENT_SUITE_BEGIN,
    EVENT_RUN_BEGIN,
    EVENT_TEST_PENDING,
    EVENT_RUN_END,
    EVENT_TEST_END,
  } = Runner.constants;

  /**
   * Provides stats such as test duration, number of tests passed / failed etc., by listening for events emitted by `runner`.
   *
   * @private
   * @param {Runner} runner - Runner instance
   * @throws {TypeError} If falsy `runner`
   */
  function createStatsCollector(runner) {
    /**
     * @type {StatsCollector}
     */
    var stats = {
      suites: 0,
      tests: 0,
      passes: 0,
      pending: 0,
      failures: 0,
    };

    if (!runner) {
      throw new TypeError("Missing runner argument");
    }

    runner.stats = stats;

    runner.once(EVENT_RUN_BEGIN, function () {
      stats.start = new Date();
    });
    runner.on(EVENT_SUITE_BEGIN, function (suite) {
      suite.root || stats.suites++;
    });
    runner.on(EVENT_TEST_PASS, function () {
      stats.passes++;
    });
    runner.on(EVENT_TEST_FAIL, function () {
      stats.failures++;
    });
    runner.on(EVENT_TEST_PENDING, function () {
      stats.pending++;
    });
    runner.on(EVENT_TEST_END, function () {
      stats.tests++;
    });
    runner.once(EVENT_RUN_END, function () {
      stats.end = new Date();
      stats.duration = stats.end - stats.start;
    });
  }

  var statsCollector = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createStatsCollector: createStatsCollector
  });

  var require$$7 = /*@__PURE__*/getAugmentedNamespace(statsCollector);

  const { isString } = utils;
  const { MOCHA_ID_PROP_NAME } = utils.constants;

  class Test extends Runnable {
    /**
     * Initialize a new `Test` with the given `title` and callback `fn`.
     *
     * @public
     * @extends Runnable
     * @param {String} title - Test title (required)
     * @param {Function} [fn] - Test callback.  If omitted, the Test is considered "pending"
     */
    constructor(title, fn) {
      if (!isString(title)) {
        throw createInvalidArgumentTypeError(
          'Test argument "title" should be a string. Received type "' +
            typeof title +
            '"',
          "title",
          "string",
        );
      }
      super(title, fn);
      this.type = "test";
      this.reset();
    }

    /**
     * Resets the state initially or for a next run.
     */
    reset() {
      super.reset();
      this.pending = !this.fn;
      delete this.state;
    }

    /**
     * Set or get retried test
     *
     * @private
     */
    retriedTest(n) {
      if (!arguments.length) {
        return this._retriedTest;
      }
      this._retriedTest = n;
    }

    /**
     * Add test to the list of tests marked `only`.
     *
     * @private
     */
    markOnly() {
      this.parent.appendOnlyTest(this);
    }

    clone() {
      var test = new Test(this.title, this.fn);
      test.timeout(this.timeout());
      test.slow(this.slow());
      test.retries(this.retries());
      test.currentRetry(this.currentRetry());
      test.retriedTest(this.retriedTest() || this);
      test.globals(this.globals());
      test.parent = this.parent;
      test.file = this.file;
      test.ctx = this.ctx;
      return test;
    }

    /**
     * Returns an minimal object suitable for transmission over IPC.
     * Functions are represented by keys beginning with `$$`.
     * @private
     * @returns {Object}
     */
    serialize() {
      return {
        $$currentRetry: this._currentRetry,
        $$fullTitle: this.fullTitle(),
        $$isPending: Boolean(this.pending),
        $$retriedTest: this._retriedTest || null,
        $$slow: this._slow,
        $$titlePath: this.titlePath(),
        body: this.body,
        duration: this.duration,
        err: this.err,
        parent: {
          $$fullTitle: this.parent.fullTitle(),
          [MOCHA_ID_PROP_NAME]: this.parent.id,
        },
        speed: this.speed,
        state: this.state,
        title: this.title,
        type: this.type,
        file: this.file,
        [MOCHA_ID_PROP_NAME]: this.id,
      };
    }
  }

  var test = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Test: Test
  });

  /**
   * Functions common to more than one interface.
   *
   * @private
   * @param {Suite[]} suites
   * @param {Context} context
   * @param {Mocha} mocha
   * @return {Object} An object containing common functions.
   */
  function createCommon(suites, context, mocha) {
    /**
     * Check if the suite should be tested.
     *
     * @private
     * @param {Suite} suite - suite to check
     * @returns {boolean}
     */
    function shouldBeTested(suite) {
      return (
        !mocha.options.grep ||
        (mocha.options.grep &&
          mocha.options.grep.test(suite.fullTitle()) &&
          !mocha.options.invert)
      );
    }

    return {
      /**
       * This is only present if flag --delay is passed into Mocha. It triggers
       * root suite execution.
       *
       * @param {Suite} suite The root suite.
       * @return {Function} A function which runs the root suite
       */
      runWithSuite: function runWithSuite(suite) {
        return function run() {
          suite.run();
        };
      },

      /**
       * Execute before running tests.
       *
       * @param {string} name
       * @param {Function} fn
       */
      before: function (name, fn) {
        return suites[0].beforeAll(name, fn);
      },

      /**
       * Execute after running tests.
       *
       * @param {string} name
       * @param {Function} fn
       */
      after: function (name, fn) {
        return suites[0].afterAll(name, fn);
      },

      /**
       * Execute before each test case.
       *
       * @param {string} name
       * @param {Function} fn
       */
      beforeEach: function (name, fn) {
        return suites[0].beforeEach(name, fn);
      },

      /**
       * Execute after each test case.
       *
       * @param {string} name
       * @param {Function} fn
       */
      afterEach: function (name, fn) {
        return suites[0].afterEach(name, fn);
      },

      suite: {
        /**
         * Create an exclusive Suite; convenience function
         * See docstring for create() below.
         *
         * @param {Object} opts
         * @returns {Suite}
         */
        only: function only(opts) {
          if (mocha.options.forbidOnly) {
            throw createForbiddenExclusivityError(mocha);
          }
          opts.isOnly = true;
          return this.create(opts);
        },

        /**
         * Create a Suite, but skip it; convenience function
         * See docstring for create() below.
         *
         * @param {Object} opts
         * @returns {Suite}
         */
        skip: function skip(opts) {
          opts.pending = true;
          return this.create(opts);
        },

        /**
         * Creates a suite.
         *
         * @param {Object} opts Options
         * @param {string} opts.title Title of Suite
         * @param {Function} [opts.fn] Suite Function (not always applicable)
         * @param {boolean} [opts.pending] Is Suite pending?
         * @param {string} [opts.file] Filepath where this Suite resides
         * @param {boolean} [opts.isOnly] Is Suite exclusive?
         * @returns {Suite}
         */
        create: function create(opts) {
          var suite = Suite.create(suites[0], opts.title);
          suite.pending = Boolean(opts.pending);
          suite.file = opts.file;
          suites.unshift(suite);
          if (opts.isOnly) {
            suite.markOnly();
          }
          if (
            suite.pending &&
            mocha.options.forbidPending &&
            shouldBeTested(suite)
          ) {
            throw createUnsupportedError$2("Pending test forbidden");
          }
          if (typeof opts.fn === "function") {
            opts.fn.call(suite);
            suites.shift();
          } else if (typeof opts.fn === "undefined" && !suite.pending) {
            throw createMissingArgumentError(
              'Suite "' +
                suite.fullTitle() +
                '" was defined but no callback was supplied. ' +
                "Supply a callback or explicitly skip the suite.",
              "callback",
              "function",
            );
          } else if (!opts.fn && suite.pending) {
            suites.shift();
          }

          return suite;
        },
      },

      test: {
        /**
         * Exclusive test-case.
         *
         * @param {Object} mocha
         * @param {Function} test
         * @returns {*}
         */
        only: function (mocha, test) {
          if (mocha.options.forbidOnly) {
            throw createForbiddenExclusivityError(mocha);
          }
          test.markOnly();
          return test;
        },

        /**
         * Pending test case.
         *
         * @param {string} title
         */
        skip: function (title) {
          context.test(title);
        },
      },
    };
  }

  const EVENT_FILE_PRE_REQUIRE$2 = Suite.constants.EVENT_FILE_PRE_REQUIRE;

  /**
   * BDD-style interface:
   *
   *      describe('Array', function() {
   *        describe('#indexOf()', function() {
   *          it('should return -1 when not present', function() {
   *            // ...
   *          });
   *
   *          it('should return the index when present', function() {
   *            // ...
   *          });
   *        });
   *      });
   *
   * @param {Suite} suite Root suite.
   */
  function bddInterface(suite) {
    var suites = [suite];

    suite.on(EVENT_FILE_PRE_REQUIRE$2, function (context, file, mocha) {
      var common = createCommon(suites, context, mocha);

      context.before = common.before;
      context.after = common.after;
      context.beforeEach = common.beforeEach;
      context.afterEach = common.afterEach;
      context.run = mocha.options.delay && common.runWithSuite(suite);
      /**
       * Describe a "suite" with the given `title`
       * and callback `fn` containing nested suites
       * and/or tests.
       */

      context.describe = context.context = function (title, fn) {
        return common.suite.create({
          title,
          file,
          fn,
        });
      };

      /**
       * Pending describe.
       */

      context.xdescribe =
        context.xcontext =
        context.describe.skip =
          function (title, fn) {
            return common.suite.skip({
              title,
              file,
              fn,
            });
          };

      /**
       * Exclusive suite.
       */

      context.describe.only = function (title, fn) {
        return common.suite.only({
          title,
          file,
          fn,
        });
      };

      /**
       * Describe a specification or test-case
       * with the given `title` and callback `fn`
       * acting as a thunk.
       */

      context.it = context.specify = function (title, fn) {
        var suite = suites[0];
        if (suite.isPending()) {
          fn = null;
        }
        var test = new Test(title, fn);
        test.file = file;
        suite.addTest(test);
        return test;
      };

      /**
       * Exclusive test-case.
       */

      context.it.only = function (title, fn) {
        return common.test.only(mocha, context.it(title, fn));
      };

      /**
       * Pending test case.
       */

      context.xit =
        context.xspecify =
        context.it.skip =
          function (title) {
            return context.it(title);
          };
    });
  }

  // Required for `--list-interfaces`
  bddInterface.description = "BDD or RSpec style [default]";

  const EVENT_FILE_PRE_REQUIRE$1 = Suite.constants.EVENT_FILE_PRE_REQUIRE;

  /**
   * TDD-style interface:
   *
   *      suite('Array', function() {
   *        suite('#indexOf()', function() {
   *          suiteSetup(function() {
   *
   *          });
   *
   *          test('should return -1 when not present', function() {
   *
   *          });
   *
   *          test('should return the index when present', function() {
   *
   *          });
   *
   *          suiteTeardown(function() {
   *
   *          });
   *        });
   *      });
   *
   * @param {Suite} suite Root suite.
   */
  function tddInterface(suite) {
    var suites = [suite];

    suite.on(EVENT_FILE_PRE_REQUIRE$1, function (context, file, mocha) {
      var common = createCommon(suites, context, mocha);

      context.setup = common.beforeEach;
      context.teardown = common.afterEach;
      context.suiteSetup = common.before;
      context.suiteTeardown = common.after;
      context.run = mocha.options.delay && common.runWithSuite(suite);

      /**
       * Describe a "suite" with the given `title` and callback `fn` containing
       * nested suites and/or tests.
       */
      context.suite = function (title, fn) {
        return common.suite.create({
          title,
          file,
          fn,
        });
      };

      /**
       * Pending suite.
       */
      context.suite.skip = function (title, fn) {
        return common.suite.skip({
          title,
          file,
          fn,
        });
      };

      /**
       * Exclusive test-case.
       */
      context.suite.only = function (title, fn) {
        return common.suite.only({
          title,
          file,
          fn,
        });
      };

      /**
       * Describe a specification or test-case with the given `title` and
       * callback `fn` acting as a thunk.
       */
      context.test = function (title, fn) {
        var suite = suites[0];
        if (suite.isPending()) {
          fn = null;
        }
        var test = new Test(title, fn);
        test.file = file;
        suite.addTest(test);
        return test;
      };

      /**
       * Exclusive test-case.
       */

      context.test.only = function (title, fn) {
        return common.test.only(mocha, context.test(title, fn));
      };

      context.test.skip = common.test.skip;
    });
  }

  // Required for `--list-interfaces`
  tddInterface.description =
    'traditional "suite"/"test" instead of BDD\'s "describe"/"it"';

  const EVENT_FILE_PRE_REQUIRE = Suite.constants.EVENT_FILE_PRE_REQUIRE;

  /**
   * QUnit-style interface:
   *
   *     suite('Array');
   *
   *     test('#length', function() {
   *       var arr = [1,2,3];
   *       ok(arr.length == 3);
   *     });
   *
   *     test('#indexOf()', function() {
   *       var arr = [1,2,3];
   *       ok(arr.indexOf(1) == 0);
   *       ok(arr.indexOf(2) == 1);
   *       ok(arr.indexOf(3) == 2);
   *     });
   *
   *     suite('String');
   *
   *     test('#length', function() {
   *       ok('foo'.length == 3);
   *     });
   *
   * @param {Suite} suite Root suite.
   */
  function qUnitInterface(suite) {
    var suites = [suite];

    suite.on(EVENT_FILE_PRE_REQUIRE, function (context, file, mocha) {
      var common = createCommon(suites, context, mocha);

      context.before = common.before;
      context.after = common.after;
      context.beforeEach = common.beforeEach;
      context.afterEach = common.afterEach;
      context.run = mocha.options.delay && common.runWithSuite(suite);
      /**
       * Describe a "suite" with the given `title`.
       */

      context.suite = function (title) {
        if (suites.length > 1) {
          suites.shift();
        }
        return common.suite.create({
          title,
          file,
          fn: false,
        });
      };

      /**
       * Exclusive Suite.
       */

      context.suite.only = function (title) {
        if (suites.length > 1) {
          suites.shift();
        }
        return common.suite.only({
          title,
          file,
          fn: false,
        });
      };

      /**
       * Describe a specification or test-case
       * with the given `title` and callback `fn`
       * acting as a thunk.
       */

      context.test = function (title, fn) {
        var test = new Test(title, fn);
        test.file = file;
        suites[0].addTest(test);
        return test;
      };

      /**
       * Exclusive test-case.
       */

      context.test.only = function (title, fn) {
        return common.test.only(mocha, context.test(title, fn));
      };

      context.test.skip = common.test.skip;
    });
  }

  // Required for `--list-interfaces`
  qUnitInterface.description = "QUnit style";

  /**
   * Exports-style (as Node.js module) interface:
   *
   *     exports.Array = {
   *       '#indexOf()': {
   *         'should return -1 when the value is not present': function() {
   *
   *         },
   *
   *         'should return the correct index when the value is present': function() {
   *
   *         }
   *       }
   *     };
   *
   * @param {Suite} suite Root suite.
   */
  function exportsInterface(suite) {
    var suites = [suite];

    suite.on(Suite.constants.EVENT_FILE_REQUIRE, visit);

    function visit(obj, file) {
      var suite;
      for (var key in obj) {
        if (typeof obj[key] === "function") {
          var fn = obj[key];
          switch (key) {
            case "before":
              suites[0].beforeAll(fn);
              break;
            case "after":
              suites[0].afterAll(fn);
              break;
            case "beforeEach":
              suites[0].beforeEach(fn);
              break;
            case "afterEach":
              suites[0].afterEach(fn);
              break;
            default:
              var test = new Test(key, fn);
              test.file = file;
              suites[0].addTest(test);
          }
        } else {
          suite = Suite.create(suites[0], key);
          suites.unshift(suite);
          visit(obj[key], file);
          suites.shift();
        }
      }
    }
  }

  // Required for `--list-interfaces`
  exportsInterface.description = 'Node.js module ("exports") style';

  var interfaces = /*#__PURE__*/Object.freeze({
    __proto__: null,
    bdd: bddInterface,
    exports: exportsInterface,
    qunit: qUnitInterface,
    tdd: tddInterface
  });

  var require$$10 = /*@__PURE__*/getAugmentedNamespace(interfaces);

  /**
   * @typedef {import('./runnable.js')} Runnable
   */

  /**
   * Initialize a new `Context`.
   *
   * @private
   */
  class Context {
    constructor() {}
    /**
     * Set or get the context `Runnable` to `runnable`.
     *
     * @private
     * @param {Runnable} runnable
     * @return {Context} context
     */
    runnable(runnable) {
      if (!arguments.length) {
        return this._runnable;
      }
      this.test = this._runnable = runnable;
      return this;
    }
    /**
     * Set or get test timeout `ms`.
     *
     * @private
     * @param {number} ms
     * @return {Context} self
     */
    timeout(ms) {
      if (!arguments.length) {
        return this.runnable().timeout();
      }
      this.runnable().timeout(ms);
      return this;
    }
    /**
     * Set or get test slowness threshold `ms`.
     *
     * @private
     * @param {number} ms
     * @return {Context} self
     */
    slow(ms) {
      if (!arguments.length) {
        return this.runnable().slow();
      }
      this.runnable().slow(ms);
      return this;
    }
    /**
     * Mark a test as skipped.
     *
     * @private
     * @throws PendingError
     */
    skip() {
      this.runnable().skip();
    }
    /**
     * Set or get a number of allowed retries on failed tests
     *
     * @private
     * @param {number} n
     * @return {Context} self
     */
    retries(n) {
      if (!arguments.length) {
        return this.runnable().retries();
      }
      this.runnable().retries(n);
      return this;
    }
  }

  var context = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Context: Context
  });

  var require$$12 = /*@__PURE__*/getAugmentedNamespace(context);

  var require$$14 = /*@__PURE__*/getAugmentedNamespace(hook);

  var require$$15 = /*@__PURE__*/getAugmentedNamespace(test);

  var require$$17 = {
  	
  };

  var hasRequiredMocha;

  function requireMocha () {
  	if (hasRequiredMocha) return mocha$1.exports;
  	hasRequiredMocha = 1;
  	(function (module, exports) {

  		/*!
  		 * mocha
  		 * Copyright(c) 2011 TJ Holowaychuk <tj@vision-media.ca>
  		 * MIT Licensed
  		 */

  		var { escapeRegExp } = require$$0$2;
  		var path = require$$1$2;
  		var builtinReporters = requireReporters();
  		var utils = requireUtils();
  		var mocharc = require$$4;
  		var { Suite } = require$$5$1;
  		var esmUtils = require$$18;
  		var createStatsCollector = require$$7.createStatsCollector;
  		const {
  		  createInvalidReporterError,
  		  createInvalidInterfaceError,
  		  createMochaInstanceAlreadyDisposedError,
  		  createMochaInstanceAlreadyRunningError,
  		  createUnsupportedError,
  		} = require$$8$1;
  		const { EVENT_FILE_PRE_REQUIRE, EVENT_FILE_POST_REQUIRE, EVENT_FILE_REQUIRE } =
  		  Suite.constants;
  		var debug = requireBrowser()("mocha:mocha");

  		/**
  		 * @typedef {import('./types.d.ts').DoneCB} DoneCB
  		 * @typedef {import('./types.d.ts').MochaGlobalFixture} MochaGlobalFixture
  		 * @typedef {import('./types.d.ts').MochaOptions} MochaOptions
  		 * @typedef {import('./types.d.ts').MochaRootHookObject} MochaRootHookObject
  		 * @typedef {import('./types.d.ts').Reporter} Reporter
  		 */

  		// Legacy CJS-style require() export, as well as default in ESM
  		exports = module.exports = Mocha;

  		// Modern property-based / ESM named export
  		module.exports.Mocha = Mocha;

  		/**
  		 * A Mocha instance is a finite state machine.
  		 * These are the states it can be in.
  		 * @private
  		 */
  		var mochaStates = utils.defineConstants({
  		  /**
  		   * Initial state of the mocha instance
  		   * @private
  		   */
  		  INIT: "init",
  		  /**
  		   * Mocha instance is running tests
  		   * @private
  		   */
  		  RUNNING: "running",
  		  /**
  		   * Mocha instance is done running tests and references to test functions and hooks are cleaned.
  		   * You can reset this state by unloading the test files.
  		   * @private
  		   */
  		  REFERENCES_CLEANED: "referencesCleaned",
  		  /**
  		   * Mocha instance is disposed and can no longer be used.
  		   * @private
  		   */
  		  DISPOSED: "disposed",
  		});

  		/**
  		 * To require local UIs and reporters when running in node.
  		 */

  		if (!utils.isBrowser() && typeof module.paths !== "undefined") {
  		  var cwd = utils.cwd();
  		  module.paths.push(cwd, path.join(cwd, "node_modules"));
  		}

  		/**
  		 * Expose internals.
  		 * @private
  		 */

  		exports.utils = utils;
  		// Must be extensible, see `should add the interface` test
  		// in `run-helpers.spec.js`
  		exports.interfaces = { ...require$$10 };
  		/**
  		 * @public
  		 * @memberof Mocha
  		 */
  		exports.reporters = builtinReporters;
  		exports.Runnable = require$$11$1.Runnable;
  		exports.Context = require$$12.Context;
  		/**
  		 *
  		 * @memberof Mocha
  		 */
  		exports.Runner = requireRunner();
  		exports.Suite = Suite;
  		exports.Hook = require$$14.Hook;
  		exports.Test = require$$15.Test;

  		let currentContext;
  		exports.afterEach = function (...args) {
  		  return (currentContext.afterEach || currentContext.teardown).apply(
  		    this,
  		    args,
  		  );
  		};
  		exports.after = function (...args) {
  		  return (currentContext.after || currentContext.suiteTeardown).apply(
  		    this,
  		    args,
  		  );
  		};
  		exports.beforeEach = function (...args) {
  		  return (currentContext.beforeEach || currentContext.setup).apply(this, args);
  		};
  		exports.before = function (...args) {
  		  return (currentContext.before || currentContext.suiteSetup).apply(this, args);
  		};
  		exports.describe = function (...args) {
  		  return (currentContext.describe || currentContext.suite).apply(this, args);
  		};
  		exports.describe.only = function (...args) {
  		  return (currentContext.describe || currentContext.suite).only.apply(
  		    this,
  		    args,
  		  );
  		};
  		exports.describe.skip = function (...args) {
  		  return (currentContext.describe || currentContext.suite).skip.apply(
  		    this,
  		    args,
  		  );
  		};
  		exports.it = function (...args) {
  		  return (currentContext.it || currentContext.test).apply(this, args);
  		};
  		exports.it.only = function (...args) {
  		  return (currentContext.it || currentContext.test).only.apply(this, args);
  		};
  		exports.it.skip = function (...args) {
  		  return (currentContext.it || currentContext.test).skip.apply(this, args);
  		};
  		exports.xdescribe = exports.describe.skip;
  		exports.xit = exports.it.skip;
  		exports.setup = exports.beforeEach;
  		exports.suiteSetup = exports.before;
  		exports.suiteTeardown = exports.after;
  		exports.suite = exports.describe;
  		exports.teardown = exports.afterEach;
  		exports.test = exports.it;
  		exports.run = function (...args) {
  		  return currentContext.run.apply(this, args);
  		};

  		/**
  		 * Constructs a new Mocha instance with `options`.
  		 *
  		 * @public
  		 * @class Mocha
  		 * @param {MochaOptions} [options] - Settings object.
  		 */
  		function Mocha(options = {}) {
  		  options = { ...mocharc, ...options };
  		  this.files = [];
  		  this.options = options;
  		  // root suite
  		  this.suite = new exports.Suite("", new exports.Context(), true);
  		  this._cleanReferencesAfterRun = true;
  		  this._state = mochaStates.INIT;

  		  this.grep(options.grep)
  		    .fgrep(options.fgrep)
  		    .ui(options.ui)
  		    .reporter(
  		      options.reporter,
  		      options["reporter-option"] ||
  		        options.reporterOption ||
  		        options.reporterOptions, // for backwards compatibility
  		    )
  		    .slow(options.slow)
  		    .global(options.global);

  		  // this guard exists because Suite#timeout does not consider `undefined` to be valid input
  		  if (typeof options.timeout !== "undefined") {
  		    this.timeout(options.timeout === false ? 0 : options.timeout);
  		  }

  		  if ("retries" in options) {
  		    this.retries(options.retries);
  		  }

  		  [
  		    "allowUncaught",
  		    "asyncOnly",
  		    "bail",
  		    "checkLeaks",
  		    "color",
  		    "delay",
  		    "diff",
  		    "dryRun",
  		    "passOnFailingTestSuite",
  		    "failZero",
  		    "forbidOnly",
  		    "forbidPending",
  		    "fullTrace",
  		    "inlineDiffs",
  		    "invert",
  		  ].forEach(function (opt) {
  		    if (options[opt]) {
  		      this[opt]();
  		    }
  		  }, this);

  		  if (options.rootHooks) {
  		    this.rootHooks(options.rootHooks);
  		  }

  		  /**
  		   * The class which we'll instantiate in {@link Mocha#run}.  Defaults to
  		   * {@link Runner} in serial mode; changes in parallel mode.
  		   * @memberof Mocha
  		   * @private
  		   */
  		  this._runnerClass = exports.Runner;

  		  /**
  		   * Whether or not to call {@link Mocha#loadFiles} implicitly when calling
  		   * {@link Mocha#run}.  If this is `true`, then it's up to the consumer to call
  		   * {@link Mocha#loadFiles} _or_ {@link Mocha#loadFilesAsync}.
  		   * @private
  		   * @memberof Mocha
  		   */
  		  this._lazyLoadFiles = false;

  		  /**
  		   * It's useful for a Mocha instance to know if it's running in a worker process.
  		   * We could derive this via other means, but it's helpful to have a flag to refer to.
  		   * @memberof Mocha
  		   * @private
  		   */
  		  this.isWorker = Boolean(options.isWorker);

  		  this.globalSetup(options.globalSetup)
  		    .globalTeardown(options.globalTeardown)
  		    .enableGlobalSetup(options.enableGlobalSetup)
  		    .enableGlobalTeardown(options.enableGlobalTeardown);

  		  if (
  		    options.parallel &&
  		    (typeof options.jobs === "undefined" || options.jobs > 1)
  		  ) {
  		    debug("attempting to enable parallel mode");
  		    this.parallelMode(true);
  		  }
  		}

  		/**
  		 * Enables or disables bailing on the first failure.
  		 *
  		 * @public
  		 * @see [CLI option](../#-bail-b)
  		 * @param {boolean} [bail=true] - Whether to bail on first error.
  		 * @returns {Mocha} this
  		 * @chainable
  		 */
  		Mocha.prototype.bail = function (bail) {
  		  this.suite.bail(bail !== false);
  		  return this;
  		};

  		/**
  		 * @summary
  		 * Adds `file` to be loaded for execution.
  		 *
  		 * @description
  		 * Useful for generic setup code that must be included within test suite.
  		 *
  		 * @public
  		 * @see [CLI option](../#-file-filedirectoryglob)
  		 * @param {string} file - Pathname of file to be loaded.
  		 * @returns {Mocha} this
  		 * @chainable
  		 */
  		Mocha.prototype.addFile = function (file) {
  		  this.files.push(file);
  		  return this;
  		};

  		/**
  		 * Sets reporter to `reporter`, defaults to "spec".
  		 *
  		 * @public
  		 * @see [CLI option](../#-reporter-name-r-name)
  		 * @see [Reporters](../#reporters)
  		 * @param {String|Reporter} reporterName - Reporter name or constructor.
  		 * @param {Object} [reporterOptions] - Options used to configure the reporter.
  		 * @returns {Mocha} this
  		 * @chainable
  		 * @throws {Error} if requested reporter cannot be loaded
  		 * @example
  		 *
  		 * // Use XUnit reporter and direct its output to file
  		 * mocha.reporter('xunit', { output: '/path/to/testspec.xunit.xml' });
  		 */
  		Mocha.prototype.reporter = function (reporterName, reporterOptions) {
  		  if (typeof reporterName === "function") {
  		    this._reporter = reporterName;
  		  } else {
  		    reporterName = reporterName || "spec";
  		    var reporter;
  		    // Try to load a built-in reporter.
  		    if (builtinReporters[reporterName]) {
  		      reporter = builtinReporters[reporterName];
  		    }
  		    // Try to load reporters from process.cwd() and node_modules
  		    if (!reporter) {
  		      let foundReporter;
  		      try {
  		        foundReporter = require.resolve(reporterName);
  		        reporter = commonjsRequire(foundReporter);
  		      } catch (err) {
  		        if (foundReporter) {
  		          throw createInvalidReporterError(err.message, foundReporter);
  		        }
  		        // Try to load reporters from a cwd-relative path
  		        try {
  		          reporter = commonjsRequire(path.resolve(reporterName));
  		        } catch (err) {
  		          throw createInvalidReporterError(err.message, reporterName);
  		        }
  		      }
  		    }
  		    if (reporter.default) {
  		      reporter = reporter.default;
  		    }

  		    this._reporter = reporter;
  		  }
  		  this.options.reporterOption = reporterOptions;
  		  // alias option name is used in built-in reporters xunit/tap/progress
  		  this.options.reporterOptions = reporterOptions;
  		  return this;
  		};

  		/**
  		 * Sets test UI `name`, defaults to "bdd".
  		 *
  		 * @public
  		 * @see [CLI option](../#-ui-name-u-name)
  		 * @see [Interface DSLs](../#interfaces)
  		 * @param {string|Function} [ui=bdd] - Interface name or class.
  		 * @returns {Mocha} this
  		 * @chainable
  		 * @throws {Error} if requested interface cannot be loaded
  		 */
  		Mocha.prototype.ui = function (ui) {
  		  var bindInterface;
  		  if (typeof ui === "function") {
  		    bindInterface = ui;
  		  } else {
  		    ui = ui || "bdd";
  		    bindInterface = exports.interfaces[ui];
  		    if (!bindInterface) {
  		      try {
  		        bindInterface = commonjsRequire(ui);
  		      } catch {
  		        throw createInvalidInterfaceError(`invalid interface '${ui}'`, ui);
  		      }
  		    }
  		  }
  		  if (bindInterface.default) {
  		    bindInterface = bindInterface.default;
  		  }

  		  bindInterface(this.suite);

  		  this.suite.on(EVENT_FILE_PRE_REQUIRE, function (context) {
  		    currentContext = context;
  		  });

  		  return this;
  		};

  		/**
  		 * Loads `files` prior to execution. Does not support ES Modules.
  		 *
  		 * @description
  		 * The implementation relies on Node's `require` to execute
  		 * the test interface functions and will be subject to its cache.
  		 * Supports only CommonJS modules. To load ES modules, use Mocha#loadFilesAsync.
  		 *
  		 * @private
  		 * @see {@link Mocha#addFile}
  		 * @see {@link Mocha#run}
  		 * @see {@link Mocha#unloadFiles}
  		 * @see {@link Mocha#loadFilesAsync}
  		 * @param {Function} [fn] - Callback invoked upon completion.
  		 */
  		Mocha.prototype.loadFiles = function (fn) {
  		  var self = this;
  		  var suite = this.suite;
  		  this.files.forEach(function (file) {
  		    file = path.resolve(file);
  		    suite.emit(EVENT_FILE_PRE_REQUIRE, commonjsGlobal, file, self);
  		    suite.emit(EVENT_FILE_REQUIRE, commonjsRequire(file), file, self);
  		    suite.emit(EVENT_FILE_POST_REQUIRE, commonjsGlobal, file, self);
  		  });
  		  fn && fn();
  		};

  		/**
  		 * Loads `files` prior to execution. Supports Node ES Modules.
  		 *
  		 * @description
  		 * The implementation relies on Node's `require` and `import` to execute
  		 * the test interface functions and will be subject to its cache.
  		 * Supports both CJS and ESM modules.
  		 *
  		 * @public
  		 * @see {@link Mocha#addFile}
  		 * @see {@link Mocha#run}
  		 * @see {@link Mocha#unloadFiles}
  		 * @param {Object} [options] - Settings object.
  		 * @param {Function} [options.esmDecorator] - Function invoked on esm module name right before importing it. By default will passthrough as is.
  		 * @returns {Promise}
  		 * @example
  		 *
  		 * // loads ESM (and CJS) test files asynchronously, then runs root suite
  		 * mocha.loadFilesAsync()
  		 *   .then(() => mocha.run(failures => process.exitCode = failures ? 1 : 0))
  		 *   .catch(() => process.exitCode = 1);
  		 */
  		Mocha.prototype.loadFilesAsync = function ({ esmDecorator } = {}) {
  		  var self = this;
  		  var suite = this.suite;
  		  this.lazyLoadFiles(true);

  		  return esmUtils.loadFilesAsync(
  		    this.files,
  		    function (file) {
  		      suite.emit(EVENT_FILE_PRE_REQUIRE, commonjsGlobal, file, self);
  		    },
  		    function (file, resultModule) {
  		      suite.emit(EVENT_FILE_REQUIRE, resultModule, file, self);
  		      suite.emit(EVENT_FILE_POST_REQUIRE, commonjsGlobal, file, self);
  		    },
  		    esmDecorator,
  		  );
  		};

  		/**
  		 * Removes a previously loaded file from Node's `require` cache.
  		 *
  		 * @private
  		 * @static
  		 * @see {@link Mocha#unloadFiles}
  		 * @param {string} file - Pathname of file to be unloaded.
  		 */
  		Mocha.unloadFile = function (file) {
  		  if (utils.isBrowser()) {
  		    throw createUnsupportedError(
  		      "unloadFile() is only supported in a Node.js environment",
  		    );
  		  }
  		  return require$$18.unloadFile(file);
  		};

  		/**
  		 * Unloads `files` from Node's `require` cache.
  		 *
  		 * @description
  		 * This allows required files to be "freshly" reloaded, providing the ability
  		 * to reuse a Mocha instance programmatically.
  		 * Note: does not clear ESM module files from the cache
  		 *
  		 * <strong>Intended for consumers &mdash; not used internally</strong>
  		 *
  		 * @public
  		 * @see {@link Mocha#run}
  		 * @returns {Mocha} this
  		 * @chainable
  		 */
  		Mocha.prototype.unloadFiles = function () {
  		  if (this._state === mochaStates.DISPOSED) {
  		    throw createMochaInstanceAlreadyDisposedError(
  		      "Mocha instance is already disposed, it cannot be used again.",
  		      this._cleanReferencesAfterRun,
  		      this,
  		    );
  		  }

  		  this.files.forEach(function (file) {
  		    Mocha.unloadFile(file);
  		  });
  		  this._state = mochaStates.INIT;
  		  return this;
  		};

  		/**
  		 * Sets `grep` filter after escaping RegExp special characters.
  		 *
  		 * @public
  		 * @see {@link Mocha#grep}
  		 * @param {string} str - Value to be converted to a regexp.
  		 * @returns {Mocha} this
  		 * @chainable
  		 * @example
  		 *
  		 * // Select tests whose full title begins with `"foo"` followed by a period
  		 * mocha.fgrep('foo.');
  		 */
  		Mocha.prototype.fgrep = function (str) {
  		  if (!str) {
  		    return this;
  		  }
  		  return this.grep(new RegExp(escapeRegExp(str)));
  		};

  		/**
  		 * @summary
  		 * Sets `grep` filter used to select specific tests for execution.
  		 *
  		 * @description
  		 * If `re` is a regexp-like string, it will be converted to regexp.
  		 * The regexp is tested against the full title of each test (i.e., the
  		 * name of the test preceded by titles of each its ancestral suites).
  		 * As such, using an <em>exact-match</em> fixed pattern against the
  		 * test name itself will not yield any matches.
  		 * <br>
  		 * <strong>Previous filter value will be overwritten on each call!</strong>
  		 *
  		 * @public
  		 * @see [CLI option](../#-grep-regexp-g-regexp)
  		 * @see {@link Mocha#fgrep}
  		 * @see {@link Mocha#invert}
  		 * @param {RegExp|String} re - Regular expression used to select tests.
  		 * @return {Mocha} this
  		 * @chainable
  		 * @example
  		 *
  		 * // Select tests whose full title contains `"match"`, ignoring case
  		 * mocha.grep(/match/i);
  		 * @example
  		 *
  		 * // Same as above but with regexp-like string argument
  		 * mocha.grep('/match/i');
  		 * @example
  		 *
  		 * // ## Anti-example
  		 * // Given embedded test `it('only-this-test')`...
  		 * mocha.grep('/^only-this-test$/');    // NO! Use `.only()` to do this!
  		 */
  		Mocha.prototype.grep = function (re) {
  		  if (utils.isString(re)) {
  		    // extract args if it's regex-like, i.e: [string, pattern, flag]
  		    var arg = re.match(/^\/(.*)\/([a-z]*)$|.*/);
  		    this.options.grep = new RegExp(arg[1] || arg[0], arg[2]);
  		  } else {
  		    this.options.grep = re;
  		  }
  		  return this;
  		};

  		/**
  		 * Inverts `grep` matches.
  		 *
  		 * @public
  		 * @see {@link Mocha#grep}
  		 * @return {Mocha} this
  		 * @chainable
  		 * @example
  		 *
  		 * // Select tests whose full title does *not* contain `"match"`, ignoring case
  		 * mocha.grep(/match/i).invert();
  		 */
  		Mocha.prototype.invert = function () {
  		  this.options.invert = true;
  		  return this;
  		};

  		/**
  		 * Enables or disables checking for global variables leaked while running tests.
  		 *
  		 * @public
  		 * @see [CLI option](../#-check-leaks)
  		 * @param {boolean} [checkLeaks=true] - Whether to check for global variable leaks.
  		 * @return {Mocha} this
  		 * @chainable
  		 */
  		Mocha.prototype.checkLeaks = function (checkLeaks) {
  		  this.options.checkLeaks = checkLeaks !== false;
  		  return this;
  		};

  		/**
  		 * Enables or disables whether or not to dispose after each test run.
  		 * Disable this to ensure you can run the test suite multiple times.
  		 * If disabled, be sure to dispose mocha when you're done to prevent memory leaks.
  		 * @public
  		 * @see {@link Mocha#dispose}
  		 * @param {boolean} cleanReferencesAfterRun
  		 * @return {Mocha} this
  		 * @chainable
  		 */
  		Mocha.prototype.cleanReferencesAfterRun = function (cleanReferencesAfterRun) {
  		  this._cleanReferencesAfterRun = cleanReferencesAfterRun !== false;
  		  return this;
  		};

  		/**
  		 * Manually dispose this mocha instance. Mark this instance as `disposed` and unable to run more tests.
  		 * It also removes function references to tests functions and hooks, so variables trapped in closures can be cleaned by the garbage collector.
  		 * @public
  		 */
  		Mocha.prototype.dispose = function () {
  		  if (this._state === mochaStates.RUNNING) {
  		    throw createMochaInstanceAlreadyRunningError(
  		      "Cannot dispose while the mocha instance is still running tests.",
  		    );
  		  }
  		  this.unloadFiles();
  		  this._previousRunner && this._previousRunner.dispose();
  		  this.suite.dispose();
  		  this._state = mochaStates.DISPOSED;
  		};

  		/**
  		 * Displays full stack trace upon test failure.
  		 *
  		 * @public
  		 * @see [CLI option](../#-full-trace)
  		 * @param {boolean} [fullTrace=true] - Whether to print full stacktrace upon failure.
  		 * @return {Mocha} this
  		 * @chainable
  		 */
  		Mocha.prototype.fullTrace = function (fullTrace) {
  		  this.options.fullTrace = fullTrace !== false;
  		  return this;
  		};

  		/**
  		 * Specifies whitelist of variable names to be expected in global scope.
  		 *
  		 * @public
  		 * @see [CLI option](../#-global-variable-name)
  		 * @see {@link Mocha#checkLeaks}
  		 * @param {String[]|String} global - Accepted global variable name(s).
  		 * @return {Mocha} this
  		 * @chainable
  		 * @example
  		 *
  		 * // Specify variables to be expected in global scope
  		 * mocha.global(['jQuery', 'MyLib']);
  		 */
  		Mocha.prototype.global = function (global) {
  		  this.options.global = (this.options.global || [])
  		    .concat(global)
  		    .filter(Boolean)
  		    .filter(function (elt, idx, arr) {
  		      return arr.indexOf(elt) === idx;
  		    });
  		  return this;
  		};
  		// for backwards compatibility, 'globals' is an alias of 'global'
  		Mocha.prototype.globals = Mocha.prototype.global;

  		/**
  		 * Enables or disables TTY color output by screen-oriented reporters.
  		 *
  		 * @public
  		 * @see [CLI option](../#-color-c-colors)
  		 * @param {boolean} [color=true] - Whether to enable color output.
  		 * @return {Mocha} this
  		 * @chainable
  		 */
  		Mocha.prototype.color = function (color) {
  		  this.options.color = color !== false;
  		  return this;
  		};

  		/**
  		 * Enables or disables reporter to use inline diffs (rather than +/-)
  		 * in test failure output.
  		 *
  		 * @public
  		 * @see [CLI option](../#-inline-diffs)
  		 * @param {boolean} [inlineDiffs=true] - Whether to use inline diffs.
  		 * @return {Mocha} this
  		 * @chainable
  		 */
  		Mocha.prototype.inlineDiffs = function (inlineDiffs) {
  		  this.options.inlineDiffs = inlineDiffs !== false;
  		  return this;
  		};

  		/**
  		 * Enables or disables reporter to include diff in test failure output.
  		 *
  		 * @public
  		 * @see [CLI option](../#-diff)
  		 * @param {boolean} [diff=true] - Whether to show diff on failure.
  		 * @return {Mocha} this
  		 * @chainable
  		 */
  		Mocha.prototype.diff = function (diff) {
  		  this.options.diff = diff !== false;
  		  return this;
  		};

  		/**
  		 * @summary
  		 * Sets timeout threshold value.
  		 *
  		 * @description
  		 * A string argument can use shorthand (such as "2s") and will be converted.
  		 * If the value is `0`, timeouts will be disabled.
  		 *
  		 * @public
  		 * @see [CLI option](../#-timeout-ms-t-ms)
  		 * @see [Timeouts](../#timeouts)
  		 * @param {number|string} msecs - Timeout threshold value.
  		 * @return {Mocha} this
  		 * @chainable
  		 * @example
  		 *
  		 * // Sets timeout to one second
  		 * mocha.timeout(1000);
  		 * @example
  		 *
  		 * // Same as above but using string argument
  		 * mocha.timeout('1s');
  		 */
  		Mocha.prototype.timeout = function (msecs) {
  		  this.suite.timeout(msecs);
  		  return this;
  		};

  		/**
  		 * Sets the number of times to retry failed tests.
  		 *
  		 * @public
  		 * @see [CLI option](../#-retries-n)
  		 * @see [Retry Tests](../#retry-tests)
  		 * @param {number} retry - Number of times to retry failed tests.
  		 * @return {Mocha} this
  		 * @chainable
  		 * @example
  		 *
  		 * // Allow any failed test to retry one more time
  		 * mocha.retries(1);
  		 */
  		Mocha.prototype.retries = function (retry) {
  		  this.suite.retries(retry);
  		  return this;
  		};

  		/**
  		 * Sets slowness threshold value.
  		 *
  		 * @public
  		 * @see [CLI option](../#-slow-ms-s-ms)
  		 * @param {number} msecs - Slowness threshold value.
  		 * @return {Mocha} this
  		 * @chainable
  		 * @example
  		 *
  		 * // Sets "slow" threshold to half a second
  		 * mocha.slow(500);
  		 * @example
  		 *
  		 * // Same as above but using string argument
  		 * mocha.slow('0.5s');
  		 */
  		Mocha.prototype.slow = function (msecs) {
  		  this.suite.slow(msecs);
  		  return this;
  		};

  		/**
  		 * Forces all tests to either accept a `done` callback or return a promise.
  		 *
  		 * @public
  		 * @see [CLI option](../#-async-only-a)
  		 * @param {boolean} [asyncOnly=true] - Whether to force `done` callback or promise.
  		 * @return {Mocha} this
  		 * @chainable
  		 */
  		Mocha.prototype.asyncOnly = function (asyncOnly) {
  		  this.options.asyncOnly = asyncOnly !== false;
  		  return this;
  		};

  		/**
  		 * Disables syntax highlighting (in browser).
  		 *
  		 * @public
  		 * @return {Mocha} this
  		 * @chainable
  		 */
  		Mocha.prototype.noHighlighting = function () {
  		  this.options.noHighlighting = true;
  		  return this;
  		};

  		/**
  		 * Enables or disables uncaught errors to propagate.
  		 *
  		 * @public
  		 * @see [CLI option](../#-allow-uncaught)
  		 * @param {boolean} [allowUncaught=true] - Whether to propagate uncaught errors.
  		 * @return {Mocha} this
  		 * @chainable
  		 */
  		Mocha.prototype.allowUncaught = function (allowUncaught) {
  		  this.options.allowUncaught = allowUncaught !== false;
  		  return this;
  		};

  		/**
  		 * @summary
  		 * Delays root suite execution.
  		 *
  		 * @description
  		 * Used to perform async operations before any suites are run.
  		 *
  		 * @public
  		 * @see [delayed root suite](../#delayed-root-suite)
  		 * @returns {Mocha} this
  		 * @chainable
  		 */
  		Mocha.prototype.delay = function delay() {
  		  this.options.delay = true;
  		  return this;
  		};

  		/**
  		 * Enables or disables running tests in dry-run mode.
  		 *
  		 * @public
  		 * @see [CLI option](../#-dry-run)
  		 * @param {boolean} [dryRun=true] - Whether to activate dry-run mode.
  		 * @return {Mocha} this
  		 * @chainable
  		 */
  		Mocha.prototype.dryRun = function (dryRun) {
  		  this.options.dryRun = dryRun !== false;
  		  return this;
  		};

  		/**
  		 * Reports tests as failed when they are skipped due to a hook failure.
  		 *
  		 * @public
  		 * @see [CLI option](../#-fail-hook-affected-tests)
  		 * @param {boolean} [failHookAffectedTests=true] - Whether to fail tests affected by hook failures.
  		 * @return {Mocha} this
  		 * @chainable
  		 */
  		Mocha.prototype.failHookAffectedTests = function (failHookAffectedTests) {
  		  this.options.failHookAffectedTests = failHookAffectedTests !== false;
  		  return this;
  		};

  		/**
  		 * Fails test run if no tests encountered with exit-code 1.
  		 *
  		 * @public
  		 * @see [CLI option](../#-fail-zero)
  		 * @param {boolean} [failZero=true] - Whether to fail test run.
  		 * @return {Mocha} this
  		 * @chainable
  		 */
  		Mocha.prototype.failZero = function (failZero) {
  		  this.options.failZero = failZero !== false;
  		  return this;
  		};

  		/**
  		 * Fail test run if tests were failed.
  		 *
  		 * @public
  		 * @see [CLI option](../#-pass-on-failing-test-suite)
  		 * @param {boolean} [passOnFailingTestSuite=false] - Whether to fail test run.
  		 * @return {Mocha} this
  		 * @chainable
  		 */
  		Mocha.prototype.passOnFailingTestSuite = function (passOnFailingTestSuite) {
  		  this.options.passOnFailingTestSuite = passOnFailingTestSuite === true;
  		  return this;
  		};

  		/**
  		 * Causes tests marked `only` to fail the suite.
  		 *
  		 * @public
  		 * @see [CLI option](../#-forbid-only)
  		 * @param {boolean} [forbidOnly=true] - Whether tests marked `only` fail the suite.
  		 * @returns {Mocha} this
  		 * @chainable
  		 */
  		Mocha.prototype.forbidOnly = function (forbidOnly) {
  		  this.options.forbidOnly = forbidOnly !== false;
  		  return this;
  		};

  		/**
  		 * Causes pending tests and tests marked `skip` to fail the suite.
  		 *
  		 * @public
  		 * @see [CLI option](../#-forbid-pending)
  		 * @param {boolean} [forbidPending=true] - Whether pending tests fail the suite.
  		 * @returns {Mocha} this
  		 * @chainable
  		 */
  		Mocha.prototype.forbidPending = function (forbidPending) {
  		  this.options.forbidPending = forbidPending !== false;
  		  return this;
  		};

  		/**
  		 * Throws an error if mocha is in the wrong state to be able to transition to a "running" state.
  		 * @private
  		 */
  		Mocha.prototype._guardRunningStateTransition = function () {
  		  if (this._state === mochaStates.RUNNING) {
  		    throw createMochaInstanceAlreadyRunningError(
  		      "Mocha instance is currently running tests, cannot start a next test run until this one is done",
  		      this,
  		    );
  		  }
  		  if (
  		    this._state === mochaStates.DISPOSED ||
  		    this._state === mochaStates.REFERENCES_CLEANED
  		  ) {
  		    throw createMochaInstanceAlreadyDisposedError(
  		      "Mocha instance is already disposed, cannot start a new test run. Please create a new mocha instance. Be sure to set disable `cleanReferencesAfterRun` when you want to reuse the same mocha instance for multiple test runs.",
  		      this._cleanReferencesAfterRun,
  		      this,
  		    );
  		  }
  		};

  		/**
  		 * Mocha version as specified by "package.json".
  		 *
  		 * @name Mocha#version
  		 * @type string
  		 * @readonly
  		 */
  		Object.defineProperty(Mocha.prototype, "version", {
  		  value: require$$17.version,
  		  configurable: false,
  		  enumerable: true,
  		  writable: false,
  		});

  		/**
  		 * Runs root suite and invokes `fn()` when complete.
  		 *
  		 * @description
  		 * To run tests multiple times (or to run tests in files that are
  		 * already in the `require` cache), make sure to clear them from
  		 * the cache first!
  		 *
  		 * @public
  		 * @see {@link Mocha#unloadFiles}
  		 * @see {@link Runner#run}
  		 * @param {DoneCB} [fn] - Callback invoked when test execution completed.
  		 * @returns {import("./runner.cjs")} runner instance
  		 * @example
  		 *
  		 * // exit with non-zero status if there were test failures
  		 * mocha.run(failures => process.exitCode = failures ? 1 : 0);
  		 */
  		Mocha.prototype.run = function (fn) {
  		  this._guardRunningStateTransition();
  		  this._state = mochaStates.RUNNING;
  		  if (this._previousRunner) {
  		    this._previousRunner.dispose();
  		    this.suite.reset();
  		  }
  		  if (this.files.length && !this._lazyLoadFiles) {
  		    this.loadFiles();
  		  }
  		  var suite = this.suite;
  		  var options = this.options;
  		  options.files = this.files;
  		  const runner = new this._runnerClass(suite, {
  		    cleanReferencesAfterRun: this._cleanReferencesAfterRun,
  		    delay: options.delay,
  		    dryRun: options.dryRun,
  		    failHookAffectedTests: options.failHookAffectedTests,
  		    failZero: options.failZero,
  		  });
  		  createStatsCollector(runner);
  		  var reporter = new this._reporter(runner, options);
  		  runner.checkLeaks = options.checkLeaks === true;
  		  runner.fullStackTrace = options.fullTrace;
  		  runner.asyncOnly = options.asyncOnly;
  		  runner.allowUncaught = options.allowUncaught;
  		  runner.forbidOnly = options.forbidOnly;
  		  runner.forbidPending = options.forbidPending;
  		  if (options.grep) {
  		    runner.grep(options.grep, options.invert);
  		  }
  		  if (options.global) {
  		    runner.globals(options.global);
  		  }
  		  if (options.color !== undefined) {
  		    exports.reporters.Base.useColors = options.color;
  		  }
  		  exports.reporters.Base.inlineDiffs = options.inlineDiffs;
  		  exports.reporters.Base.hideDiff = !options.diff;

  		  const done = (failures) => {
  		    this._previousRunner = runner;
  		    this._state = this._cleanReferencesAfterRun
  		      ? mochaStates.REFERENCES_CLEANED
  		      : mochaStates.INIT;
  		    fn = fn || utils.noop;
  		    if (typeof reporter.done === "function") {
  		      reporter.done(failures, fn);
  		    } else {
  		      fn(failures);
  		    }
  		  };

  		  const reportFixtureError = (phase, err) => {
  		    browser$1$1.stderr.write(
  		      `\n[mocha] global ${phase} failed:\n${err && err.stack ? err.stack : err}\n`,
  		    );
  		  };

  		  const runAsync = async (runner) => {
  		    let context = {};
  		    if (this.options.enableGlobalSetup && this.hasGlobalSetupFixtures()) {
  		      try {
  		        context = await this.runGlobalSetup(runner);
  		      } catch (err) {
  		        reportFixtureError("setup", err);
  		        return 1;
  		      }
  		    }
  		    const failureCount = await runner.runAsync({
  		      files: this.files,
  		      options,
  		    });
  		    if (this.options.enableGlobalTeardown && this.hasGlobalTeardownFixtures()) {
  		      try {
  		        await this.runGlobalTeardown(runner, { context });
  		      } catch (err) {
  		        reportFixtureError("teardown", err);
  		        return failureCount + 1;
  		      }
  		    }
  		    return failureCount;
  		  };

  		  // Errors coming out of Runner#run itself remain uncaught/unhandled and are picked up by the `process` event listeners.
  		  // Only global fixture errors are intercepted above so they surface to the user instead of being silently "swallowed".
  		  // Also: returning anything other than `runner` would be a breaking change.
  		  runAsync(runner).then(done);

  		  return runner;
  		};

  		/**
  		 * Assigns hooks to the root suite
  		 * @param {MochaRootHookObject} [hooks] - Hooks to assign to root suite
  		 * @chainable
  		 */
  		Mocha.prototype.rootHooks = function rootHooks({
  		  beforeAll = [],
  		  beforeEach = [],
  		  afterAll = [],
  		  afterEach = [],
  		} = {}) {
  		  beforeAll = utils.castArray(beforeAll);
  		  beforeEach = utils.castArray(beforeEach);
  		  afterAll = utils.castArray(afterAll);
  		  afterEach = utils.castArray(afterEach);
  		  beforeAll.forEach((hook) => {
  		    this.suite.beforeAll(hook);
  		  });
  		  beforeEach.forEach((hook) => {
  		    this.suite.beforeEach(hook);
  		  });
  		  afterAll.forEach((hook) => {
  		    this.suite.afterAll(hook);
  		  });
  		  afterEach.forEach((hook) => {
  		    this.suite.afterEach(hook);
  		  });
  		  return this;
  		};

  		/**
  		 * Toggles parallel mode.
  		 *
  		 * Must be run before calling {@link Mocha#run}. Changes the `Runner` class to
  		 * use; also enables lazy file loading if not already done so.
  		 *
  		 * Warning: when passed `false` and lazy loading has been enabled _via any means_ (including calling `parallelMode(true)`), this method will _not_ disable lazy loading. Lazy loading is a prerequisite for parallel
  		 * mode, but parallel mode is _not_ a prerequisite for lazy loading!
  		 * @param {boolean} [enable] - If `true`, enable; otherwise disable.
  		 * @throws If run in browser
  		 * @throws If Mocha not in `INIT` state
  		 * @returns {Mocha}
  		 * @chainable
  		 * @public
  		 */
  		Mocha.prototype.parallelMode = function parallelMode(enable = true) {
  		  if (utils.isBrowser()) {
  		    throw createUnsupportedError("parallel mode is only supported in Node.js");
  		  }
  		  const parallel = Boolean(enable);
  		  if (
  		    parallel === this.options.parallel &&
  		    this._lazyLoadFiles &&
  		    this._runnerClass !== exports.Runner
  		  ) {
  		    return this;
  		  }
  		  if (this._state !== mochaStates.INIT) {
  		    throw createUnsupportedError(
  		      "cannot change parallel mode after having called run()",
  		    );
  		  }
  		  this.options.parallel = parallel;

  		  // swap Runner class
  		  this._runnerClass = parallel
  		    ? require$$18
  		    : exports.Runner;

  		  // lazyLoadFiles may have been set `true` otherwise (for ESM loading),
  		  // so keep `true` if so.
  		  return this.lazyLoadFiles(this._lazyLoadFiles || parallel);
  		};

  		/**
  		 * Disables implicit call to {@link Mocha#loadFiles} in {@link Mocha#run}. This
  		 * setting is used by watch mode, parallel mode, and for loading ESM files.
  		 * @todo This should throw if we've already loaded files; such behavior
  		 * necessitates adding a new state.
  		 * @param {boolean} [enable] - If `true`, disable eager loading of files in
  		 * {@link Mocha#run}
  		 * @chainable
  		 * @public
  		 */
  		Mocha.prototype.lazyLoadFiles = function lazyLoadFiles(enable) {
  		  this._lazyLoadFiles = enable === true;
  		  debug("set lazy load to %s", enable);
  		  return this;
  		};

  		/**
  		 * Configures one or more global setup fixtures.
  		 *
  		 * If given no parameters, _unsets_ any previously-set fixtures.
  		 * @chainable
  		 * @public
  		 * @param {MochaGlobalFixture|MochaGlobalFixture[]} [setupFns] - Global setup fixture(s)
  		 * @returns {Mocha}
  		 */
  		Mocha.prototype.globalSetup = function globalSetup(setupFns = []) {
  		  setupFns = utils.castArray(setupFns);
  		  this.options.globalSetup = setupFns;
  		  debug("configured %d global setup functions", setupFns.length);
  		  return this;
  		};

  		/**
  		 * Configures one or more global teardown fixtures.
  		 *
  		 * If given no parameters, _unsets_ any previously-set fixtures.
  		 * @chainable
  		 * @public
  		 * @param {MochaGlobalFixture|MochaGlobalFixture[]} [teardownFns] - Global teardown fixture(s)
  		 * @returns {Mocha}
  		 */
  		Mocha.prototype.globalTeardown = function globalTeardown(teardownFns = []) {
  		  teardownFns = utils.castArray(teardownFns);
  		  this.options.globalTeardown = teardownFns;
  		  debug("configured %d global teardown functions", teardownFns.length);
  		  return this;
  		};

  		/**
  		 * Run any global setup fixtures sequentially, if any.
  		 *
  		 * This is _automatically called_ by {@link Mocha#run} _unless_ the `runGlobalSetup` option is `false`; see {@link Mocha#enableGlobalSetup}.
  		 *
  		 * The context object this function resolves with should be consumed by {@link Mocha#runGlobalTeardown}.
  		 * @param {object} [context] - Context object if already have one
  		 * @public
  		 * @returns {Promise<object>} Context object
  		 */
  		Mocha.prototype.runGlobalSetup = async function runGlobalSetup(context = {}) {
  		  const { globalSetup } = this.options;
  		  if (globalSetup && globalSetup.length) {
  		    debug("run(): global setup starting");
  		    await this._runGlobalFixtures(globalSetup, context);
  		    debug("run(): global setup complete");
  		  }
  		  return context;
  		};

  		/**
  		 * Run any global teardown fixtures sequentially, if any.
  		 *
  		 * This is _automatically called_ by {@link Mocha#run} _unless_ the `runGlobalTeardown` option is `false`; see {@link Mocha#enableGlobalTeardown}.
  		 *
  		 * Should be called with context object returned by {@link Mocha#runGlobalSetup}, if applicable.
  		 * @param {object} [context] - Context object if already have one
  		 * @public
  		 * @returns {Promise<object>} Context object
  		 */
  		Mocha.prototype.runGlobalTeardown = async function runGlobalTeardown(
  		  context = {},
  		) {
  		  const { globalTeardown } = this.options;
  		  if (globalTeardown && globalTeardown.length) {
  		    debug("run(): global teardown starting");
  		    await this._runGlobalFixtures(globalTeardown, context);
  		  }
  		  debug("run(): global teardown complete");
  		  return context;
  		};

  		/**
  		 * Run global fixtures sequentially with context `context`
  		 * @private
  		 * @param {MochaGlobalFixture[]} [fixtureFns] - Fixtures to run
  		 * @param {object} [context] - context object
  		 * @returns {Promise<object>} context object
  		 */
  		Mocha.prototype._runGlobalFixtures = async function _runGlobalFixtures(
  		  fixtureFns = [],
  		  context = {},
  		) {
  		  for await (const fixtureFn of fixtureFns) {
  		    await fixtureFn.call(context);
  		  }
  		  return context;
  		};

  		/**
  		 * Toggle execution of any global setup fixture(s)
  		 *
  		 * @chainable
  		 * @public
  		 * @param {boolean } [enabled=true] - If `false`, do not run global setup fixture
  		 * @returns {Mocha}
  		 */
  		Mocha.prototype.enableGlobalSetup = function enableGlobalSetup(enabled = true) {
  		  this.options.enableGlobalSetup = Boolean(enabled);
  		  return this;
  		};

  		/**
  		 * Toggle execution of any global teardown fixture(s)
  		 *
  		 * @chainable
  		 * @public
  		 * @param {boolean } [enabled=true] - If `false`, do not run global teardown fixture
  		 * @returns {Mocha}
  		 */
  		Mocha.prototype.enableGlobalTeardown = function enableGlobalTeardown(
  		  enabled = true,
  		) {
  		  this.options.enableGlobalTeardown = Boolean(enabled);
  		  return this;
  		};

  		/**
  		 * Returns `true` if one or more global setup fixtures have been supplied.
  		 * @public
  		 * @returns {boolean}
  		 */
  		Mocha.prototype.hasGlobalSetupFixtures = function hasGlobalSetupFixtures() {
  		  return Boolean(this.options.globalSetup.length);
  		};

  		/**
  		 * Returns `true` if one or more global teardown fixtures have been supplied.
  		 * @public
  		 * @returns {boolean}
  		 */
  		Mocha.prototype.hasGlobalTeardownFixtures =
  		  function hasGlobalTeardownFixtures() {
  		    return Boolean(this.options.globalTeardown.length);
  		  }; 
  	} (mocha$1, mocha$1.exports));
  	return mocha$1.exports;
  }

  var mochaExports = requireMocha();
  var Mocha = /*@__PURE__*/getDefaultExportFromCjs(mochaExports);

  /**
   * Shim process.stdout.
   */
  browser$1$1.stdout = BrowserStdout({ label: false });

  /**
   * Create a Mocha instance.
   *
   * @return {undefined}
   */

  var mocha = new Mocha({ reporter: "html" });

  /**
   * Save timer references to avoid Sinon interfering (see GH-237).
   */

  var Date$1 = global$1.Date;
  var setTimeout$1 = global$1.setTimeout;

  var uncaughtExceptionHandlers = [];

  var originalOnerrorHandler = global$1.onerror;

  /**
   * Remove uncaughtException listener.
   * Revert to original onerror handler if previously defined.
   */

  browser$1$1.removeListener = function (e, fn) {
    if (e === "uncaughtException") {
      if (originalOnerrorHandler) {
        global$1.onerror = originalOnerrorHandler;
      } else {
        global$1.onerror = function () {};
      }
      var i = uncaughtExceptionHandlers.indexOf(fn);
      if (i !== -1) {
        uncaughtExceptionHandlers.splice(i, 1);
      }
    }
  };

  /**
   * Implements listenerCount for 'uncaughtException'.
   */

  browser$1$1.listenerCount = function (name) {
    if (name === "uncaughtException") {
      return uncaughtExceptionHandlers.length;
    }
    return 0;
  };

  /**
   * Implements uncaughtException listener.
   */

  browser$1$1.on = function (e, fn) {
    if (e === "uncaughtException") {
      global$1.onerror = function (msg, url, line, col, err) {
        fn(err || new Error(msg + " (" + url + ":" + line + ":" + col + ")"));
        return !mocha.options.allowUncaught;
      };
      uncaughtExceptionHandlers.push(fn);
    }
  };

  browser$1$1.listeners = function (err) {
    if (err === "uncaughtException") {
      return uncaughtExceptionHandlers;
    }
    return [];
  };

  // The BDD UI is registered by default, but no UI will be functional in the
  // browser without an explicit call to the overridden `mocha.ui` (see below).
  // Ensure that this default UI does not expose its methods to the global scope.
  mocha.suite.removeAllListeners("pre-require");

  var immediateQueue = [];
  var immediateTimeout;

  function timeslice() {
    var immediateStart = new Date$1().getTime();
    while (immediateQueue.length && new Date$1().getTime() - immediateStart < 100) {
      immediateQueue.shift()();
    }
    if (immediateQueue.length) {
      immediateTimeout = setTimeout$1(timeslice, 0);
    } else {
      immediateTimeout = null;
    }
  }

  /**
   * High-performance override of Runner.immediately.
   */

  Mocha.Runner.immediately = function (callback) {
    immediateQueue.push(callback);
    if (!immediateTimeout) {
      immediateTimeout = setTimeout$1(timeslice, 0);
    }
  };

  /**
   * Function to allow assertion libraries to throw errors directly into mocha.
   * This is useful when running tests in a browser because window.onerror will
   * only receive the 'message' attribute of the Error.
   */
  mocha.throwError = function (err) {
    uncaughtExceptionHandlers.forEach(function (fn) {
      fn(err);
    });
    throw err;
  };

  /**
   * Override ui to ensure that the ui functions are initialized.
   * Normally this would happen in Mocha.prototype.loadFiles.
   */

  mocha.ui = function (ui) {
    Mocha.prototype.ui.call(this, ui);
    this.suite.emit("pre-require", global$1, null, this);
    return this;
  };

  /**
   * Setup mocha with the given setting options.
   */

  mocha.setup = function (opts) {
    if (typeof opts === "string") {
      opts = { ui: opts };
    }
    if (opts.delay === true) {
      this.delay();
    }
    var self = this;
    Object.keys(opts)
      .filter(function (opt) {
        return opt !== "delay";
      })
      .forEach(function (opt) {
        if (Object.prototype.hasOwnProperty.call(opts, opt)) {
          self[opt](opts[opt]);
        }
      });
    return this;
  };

  /**
   * Run mocha, returning the Runner.
   */

  mocha.run = function (fn) {
    var options = mocha.options;
    mocha.globals("location");

    var query = parseQuery(global$1.location.search || "");
    if (query.grep) {
      mocha.grep(query.grep);
    }
    if (query.fgrep) {
      mocha.fgrep(query.fgrep);
    }
    if (query.invert) {
      mocha.invert();
    }

    return Mocha.prototype.run.call(mocha, function (err) {
      // The DOM Document is not available in Web Workers.
      var document = global$1.document;
      if (
        document &&
        document.getElementById("mocha") &&
        options.noHighlighting !== true
      ) {
        highlightTags("code");
      }
      if (fn) {
        fn(err);
      }
    });
  };

  /**
   * Expose the process shim.
   * https://github.com/mochajs/mocha/pull/916
   */

  Mocha.process = browser$1$1;

  /**
   * Expose mocha.
   */
  global$1.Mocha = Mocha;
  global$1.mocha = mocha;

  // for bundlers: enable `import {describe, it} from 'mocha'`
  // `bdd` interface only
  // prettier-ignore
  [
    'describe', 'context', 'it', 'specify',
    'xdescribe', 'xcontext', 'xit', 'xspecify',
    'before', 'beforeEach', 'afterEach', 'after'
  ].forEach(function(key) {
    mocha[key] = global$1[key];
  });

  return mocha;

}));
//# sourceMappingURL=mocha.js.map
