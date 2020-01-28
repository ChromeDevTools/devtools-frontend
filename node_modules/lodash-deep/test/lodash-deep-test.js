/* globals: require, beforeEach, describe, it, module, inject, expect, spyOn */
describe('lodash-deep mixins', function(){
    'use strict';
    var isNode, _, object;
    isNode = (typeof module !== 'undefined' && module.exports);
    if(isNode){
        _ = require('lodash');
        _.mixin(require('../lodash-deep.min.js'));
    }
    else{
        _ = window._;
    }

    beforeEach(function() {
        // set up an inherited property
        object = {
            inheritedLevel1: {
                value: 'inherited value 1',
                level2: {
                    value: 'inherited value 2'
                }
            }
        };

        object = Object.create(object);

        object.level1 = {
            value: 'value 1',
            level2: {}
        };

        // set up an enumerable and a non-enumerable own property
        Object.defineProperties(object.level1.level2, {
            ownEnumLevel3: {
                configurable: true,
                enumerable: true,
                writable: true,
                value: [
                    {
                        value: 'own enumerable value 3'
                    }
                ]
            },
            ownNonEnumLevel3: {
                configurable: true,
                enumerable: false,
                writable: true,
                value: [
                    {
                        value: 'own non-enumerable value 3'
                    }
                ]
            }
        });

        object.level1.level2.value = 'value 2';
    });

    describe('deepMapValues(object, callback)', function(){
        it('should not modify the original object', function(){
            var settings = {
                a: '{{key}}',
                b: {
                    c: {
                        d: [ '{{key}}' ]
                    }
                }
            };

            _.deepMapValues(settings, function(value){
                if(_.isString(value) && value.indexOf('{{') > -1){
                    return value.replace(/\{\{(.*?)}}/g, function(str, key){
                        return key;
                    });
                }

                return value;
            });

            expect(settings.b.c.d).toEqual(['{{key}}']);
        });

        it('should map all values in an object', function(){
            var mappedObject = _.deepMapValues(object, function(value){
                return 'foo ' + value + ' bar';
            });
            expect(_.get(mappedObject, 'level1.value')).toEqual('foo value 1 bar');
            expect(_.get(mappedObject, 'level1.level2.value')).toEqual('foo value 2 bar');
        });

        it('should copy, not map, prototype values', function(){
            var mappedObject = _.deepMapValues(object, function(value){
                return 'foo ' + value + ' bar';
            });

            expect(_.get(mappedObject, ['level1', 'level2', 'ownNonEnumLevel3', 0, 'value'])).toBeUndefined();
            expect(_.get(mappedObject, ['level1', 'level2', 'ownEnumLevel3', 0, 'value'])).toEqual('foo own enumerable value 3 bar');
        });

        it('should provide the current property path (as string) to the callback function', function(){
            var mappedObject = _.deepMapValues(object, function(value, path){
                return (path + ' is ' + value);
            });
            expect(_.get(mappedObject, 'level1.value')).toEqual('level1.value is value 1');
            expect(_.get(mappedObject, 'level1.level2.value')).toEqual('level1.level2.value is value 2');
        });

        it('should work with collections', function (){
            var deepArrayTest = {
                a: {
                    b: [
                        {
                            c: {
                                d: '{{key}}'
                            }
                        },
                        {
                            d: '{{key}}'
                        }
                    ]
                }
            };

            var mappedObject = _.deepMapValues(deepArrayTest, function(value) {
                return value + 'test';
            });

            expect(mappedObject.a.b instanceof Array).toBe(true);
            expect(mappedObject.a.b[ 1 ].d).toEqual(deepArrayTest.a.b[ 1 ].d + 'test');
            expect(mappedObject.a.b[ 0 ].c.d).toEqual(deepArrayTest.a.b[ 0 ].c.d + 'test');
        });
    });
});
