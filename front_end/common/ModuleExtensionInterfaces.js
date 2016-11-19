// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @interface
 */
Common.Renderer = function() {};

Common.Renderer.prototype = {
  /**
   * @param {!Object} object
   * @return {!Promise.<!Element>}
   */
  render(object) {}
};

/**
 * @param {!Object} object
 * @return {!Promise.<!Element>}
 */
Common.Renderer.renderPromise = function(object) {
  if (!object)
    return Promise.reject(new Error('Can\'t render ' + object));

  return self.runtime.extension(Common.Renderer, object).instance().then(render);

  /**
   * @param {!Common.Renderer} renderer
   */
  function render(renderer) {
    return renderer.render(object);
  }
};

/**
 * @interface
 */
Common.Revealer = function() {};

/**
 * @param {?Object} revealable
 * @param {boolean=} omitFocus
 */
Common.Revealer.reveal = function(revealable, omitFocus) {
  Common.Revealer.revealPromise(revealable, omitFocus);
};

/**
 * @param {?Object} revealable
 * @param {boolean=} omitFocus
 * @return {!Promise.<undefined>}
 */
Common.Revealer.revealPromise = function(revealable, omitFocus) {
  if (!revealable)
    return Promise.reject(new Error('Can\'t reveal ' + revealable));
  return self.runtime.allInstances(Common.Revealer, revealable).then(reveal);

  /**
   * @param {!Array.<!Common.Revealer>} revealers
   * @return {!Promise.<undefined>}
   */
  function reveal(revealers) {
    var promises = [];
    for (var i = 0; i < revealers.length; ++i)
      promises.push(revealers[i].reveal(/** @type {!Object} */ (revealable), omitFocus));
    return Promise.race(promises);
  }
};

Common.Revealer.prototype = {
  /**
   * @param {!Object} object
   * @param {boolean=} omitFocus
   * @return {!Promise}
   */
  reveal(object, omitFocus) {}
};

/**
 * @interface
 */
Common.App = function() {};

Common.App.prototype = {
  /**
   * @param {!Document} document
   */
  presentUI(document) {}
};

/**
 * @interface
 */
Common.AppProvider = function() {};

Common.AppProvider.prototype = {
  /**
   * @return {!Common.App}
   */
  createApp() {}
};

/**
 * @interface
 */
Common.QueryParamHandler = function() {};

Common.QueryParamHandler.prototype = {
  /**
   * @param {string} value
   */
  handleQueryParam(value) {}
};
