/**
 * Lodash mixins for (deep) object accessing / manipulation.
 * @author Mark Lagendijk <mark@lagendijk.info>
 * @license MIT
 */
(function(root, factory){
    if(typeof define === 'function' && define.amd){
        // AMD. Register as an anonymous module.
        define(['lodash'], factory);
    }
    else if(typeof exports === 'object'){
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require('lodash').runInContext());
    }
    else{
        // Browser globals (root is window)
        root._.mixin(factory(root._));
    }
}(this, function(_, undefined){
    'use strict';

    var mixins = /** @lends _ */ {
        /**
         * Maps all values in an object tree and returns a new object with the same structure as the original.
         * @param {Object} object - The object to map.
         * @param {Function} callback - The function to be called per iteration on any non-object value in the tree.
         *   Callback is invoked with 2 arguments: (value, propertyPath)
         *   propertyPath is the path of the current property, in array format.
         * @returns {Object}
         */
        deepMapValues: function(object, callback, propertyPath){
            propertyPath = propertyPath || '';
            if(_.isArray(object)){
                return _.map(object, deepMapValuesIteratee);
            }
            else if(_.isObject(object) && !_.isDate(object) && !_.isRegExp(object) && !_.isFunction(object)){
                return _.extend({}, object, _.mapValues(object, deepMapValuesIteratee));
            }
            else{
                return callback(object, propertyPath);
            }

            function deepMapValuesIteratee(value, key){
                var valuePath = propertyPath ? propertyPath + '.' + key: key;
                return _.deepMapValues(value, callback, valuePath);
            }
        }
    };

    _.mixin(mixins);

    return mixins;
}));
