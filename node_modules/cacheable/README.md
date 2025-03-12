[<img align="center" src="https://cacheable.org/logo.svg" alt="Cacheable" />](https://github.com/jaredwray/cacheable)

> High Performance Layer 1 / Layer 2 Caching with Keyv Storage

[![codecov](https://codecov.io/gh/jaredwray/cacheable/graph/badge.svg?token=lWZ9OBQ7GM)](https://codecov.io/gh/jaredwray/cacheable)
[![tests](https://github.com/jaredwray/cacheable/actions/workflows/tests.yml/badge.svg)](https://github.com/jaredwray/cacheable/actions/workflows/tests.yml)
[![npm](https://img.shields.io/npm/dm/cacheable.svg)](https://www.npmjs.com/package/cacheable)
[![npm](https://img.shields.io/npm/v/cacheable)](https://www.npmjs.com/package/cacheable)
[![license](https://img.shields.io/github/license/jaredwray/cacheable)](https://github.com/jaredwray/cacheable/blob/main/LICENSE)

`cacheable` is a high performance layer 1 / layer 2 caching engine that is focused on distributed caching with enterprise features such as `CacheSync` (coming soon). It is built on top of the robust storage engine [Keyv](https://keyv.org) and provides a simple API to cache and retrieve data.

* Simple to use with robust API
* Not bloated with additional modules
* Scalable and trusted storage engine by Keyv
* Memory Caching with LRU and Expiration `CacheableMemory`
* Resilient to failures with try/catch and offline
* Wrap / Memoization for Sync and Async Functions with Stampede Protection
* Hooks and Events to extend functionality
* Shorthand for ttl in milliseconds `(1m = 60000) (1h = 3600000) (1d = 86400000)`
* Non-blocking operations for layer 2 caching
* Distributed Caching Sync via Pub/Sub (coming soon)
* Comprehensive testing and code coverage
* ESM and CommonJS support with Typescript
* Maintained and supported regularly

# Table of Contents
* [Getting Started](#getting-started)
* [Basic Usage](#basic-usage)
* [Hooks and Events](#hooks-and-events)
* [Storage Tiering and Caching](#storage-tiering-and-caching)
* [Shorthand for Time to Live (ttl)](#shorthand-for-time-to-live-ttl)
* [Non-Blocking Operations](#non-blocking-operations)
* [CacheSync - Distributed Updates](#cachesync---distributed-updates)
* [Cacheable Options](#cacheable-options)
* [Cacheable Statistics (Instance Only)](#cacheable-statistics-instance-only)
* [Cacheable - API](#cacheable---api)
* [CacheableMemory - In-Memory Cache](#cacheablememory---in-memory-cache)
* [CacheableMemory Options](#cacheablememory-options)
* [CacheableMemory - API](#cacheablememory---api)
* [Wrap / Memoization for Sync and Async Functions](#wrap--memoization-for-sync-and-async-functions)
* [Keyv Storage Adapter - KeyvCacheableMemory](#keyv-storage-adapter---keyvcacheablememory)
* [How to Contribute](#how-to-contribute)
* [License and Copyright](#license-and-copyright)

# Getting Started

`cacheable` is primarily used as an extension to you caching engine with a robust storage backend [Keyv](https://keyv.org), Memonization (Wrap), Hooks, Events, and Statistics.

```bash
npm install cacheable
```

# Basic Usage

```javascript
import { Cacheable } from 'cacheable';

const cacheable = new Cacheable();
await cacheable.set('key', 'value', 1000);
const value = await cacheable.get('key');
```

This is a basic example where you are only using the in-memory storage engine. To enable layer 1 and layer 2 caching you can use the `secondary` property in the options:

```javascript
import { Cacheable } from 'cacheable';
import KeyvRedis from '@keyv/redis';

const secondary = new KeyvRedis('redis://user:pass@localhost:6379');
const cache = new Cacheable({secondary});
``` 

In this example, the primary store we will use `lru-cache` and the secondary store is Redis. You can also set multiple stores in the options:

```javascript
import { Cacheable } from 'cacheable';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';
import { LRUCache } from 'lru-cache'

const primary = new Keyv({store: new LRUCache()});
const secondary = new KeyvRedis('redis://user:pass@localhost:6379');
const cache = new Cacheable({primary, secondary});
```

This is a more advanced example and not needed for most use cases.

# Hooks and Events

The following hooks are available for you to extend the functionality of `cacheable` via `CacheableHooks` enum:

* `BEFORE_SET`: This is called before the `set()` method is called.
* `AFTER_SET`: This is called after the `set()` method is called.
* `BEFORE_SET_MANY`: This is called before the `setMany()` method is called.
* `AFTER_SET_MANY`: This is called after the `setMany()` method is called.
* `BEFORE_GET`: This is called before the `get()` method is called.
* `AFTER_GET`: This is called after the `get()` method is called.
* `BEFORE_GET_MANY`: This is called before the `getMany()` method is called.
* `AFTER_GET_MANY`: This is called after the `getMany()` method is called.

An example of how to use these hooks:

```javascript
import { Cacheable, CacheableHooks } from 'cacheable';

const cacheable = new Cacheable();
cacheable.onHook(CacheableHooks.BEFORE_SET, (data) => {
  console.log(`before set: ${data.key} ${data.value}`);
});
```

# Storage Tiering and Caching

`cacheable` is built as a layer 1 and layer 2 caching engine by default. The purpose is to have your layer 1 be fast and your layer 2 be more persistent. The primary store is the layer 1 cache and the secondary store is the layer 2 cache. By adding the secondary store you are enabling layer 2 caching. By default the operations are blocking but fault tolerant:

* `Setting Data`: Sets the value in the primary store and then the secondary store.
* `Getting Data`: Gets the value from the primary if the value does not exist it will get it from the secondary store and set it in the primary store.
* `Deleting Data`: Deletes the value from the primary store and secondary store at the same time waiting for both to respond.
* `Clearing Data`: Clears the primary store and secondary store at the same time waiting for both to respond.

# Shorthand for Time to Live (ttl)

By default `Cacheable` and `CacheableMemory` the `ttl` is in milliseconds but you can use shorthand for the time to live. Here are the following shorthand values:

* `ms`: Milliseconds such as (1ms = 1)
* `s`: Seconds such as (1s = 1000)
* `m`: Minutes such as (1m = 60000)
* `h` or `hr`: Hours such as (1h = 3600000)
* `d`: Days such as (1d = 86400000)

Here is an example of how to use the shorthand for the `ttl`:

```javascript
import { Cacheable } from 'cacheable';
const cache = new Cacheable({ ttl: '15m' }); //sets the default ttl to 15 minutes (900000 ms)
cache.set('key', 'value', '1h'); //sets the ttl to 1 hour (3600000 ms) and overrides the default
```

if you want to disable the `ttl` you can set it to `0` or `undefined`:

```javascript
import { Cacheable } from 'cacheable';
const cache = new Cacheable({ ttl: 0 }); //sets the default ttl to 0 which is disabled
cache.set('key', 'value', 0); //sets the ttl to 0 which is disabled
```

If you set the ttl to anything below `0` or `undefined` it will disable the ttl for the cache and the value that returns will be `undefined`. With no ttl set the value will be stored `indefinitely`.

```javascript
import { Cacheable } from 'cacheable';
const cache = new Cacheable({ ttl: 0 }); //sets the default ttl to 0 which is disabled
console.log(cache.ttl); // undefined
cache.ttl = '1h'; // sets the default ttl to 1 hour (3600000 ms)
console.log(cache.ttl); // '1h'
cache.ttl = -1; // sets the default ttl to 0 which is disabled
console.log(cache.ttl); // undefined
```

# Non-Blocking Operations

If you want your layer 2 (secondary) store to be non-blocking you can set the `nonBlocking` property to `true` in the options. This will make the secondary store non-blocking and will not wait for the secondary store to respond on `setting data`, `deleting data`, or `clearing data`. This is useful if you want to have a faster response time and not wait for the secondary store to respond.

```javascript
import { Cacheable } from 'cacheable';
import {KeyvRedis} from '@keyv/redis';

const secondary = new KeyvRedis('redis://user:pass@localhost:6379');
const cache = new Cacheable({secondary, nonBlocking: true});
```

# CacheSync - Distributed Updates

`cacheable` has a feature called `CacheSync` that is coming soon. This feature will allow you to have distributed caching with Pub/Sub. This will allow you to have multiple instances of `cacheable` running and when a value is set, deleted, or cleared it will update all instances of `cacheable` with the same value. Current plan is to support the following:

* [AWS SQS](https://aws.amazon.com/sqs)
* [RabbitMQ](https://www.rabbitmq.com)
* [Nats](https://nats.io)
* [Azure Service Bus](https://azure.microsoft.com/en-us/services/service-bus)
* [Redis Pub/Sub](https://redis.io/topics/pubsub)

This feature should be live by end of year. 

# Cacheable Options

The following options are available for you to configure `cacheable`:

* `primary`: The primary store for the cache (layer 1) defaults to in-memory by Keyv.
* `secondary`: The secondary store for the cache (layer 2) usually a persistent cache by Keyv.
* `nonBlocking`: If the secondary store is non-blocking. Default is `false`.
* `stats`: To enable statistics for this instance. Default is `false`.
* `ttl`: The default time to live for the cache in milliseconds. Default is `undefined` which is disabled.
* `namespace`: The namespace for the cache. Default is `undefined`.

# Cacheable Statistics (Instance Only)

If you want to enable statistics for your instance you can set the `.stats.enabled` property to `true` in the options. This will enable statistics for your instance and you can get the statistics by calling the `stats` property. Here are the following property statistics:

* `hits`: The number of hits in the cache.
* `misses`: The number of misses in the cache.
* `sets`: The number of sets in the cache.
* `deletes`: The number of deletes in the cache.
* `clears`: The number of clears in the cache.
* `errors`: The number of errors in the cache.
* `count`: The number of keys in the cache.
* `vsize`: The estimated byte size of the values in the cache.
* `ksize`: The estimated byte size of the keys in the cache.

You can clear / reset the stats by calling the `.stats.reset()` method.

_This does not enable statistics for your layer 2 cache as that is a distributed cache_.

# Cacheable - API

* `set(key, value, ttl?)`: Sets a value in the cache.
* `setMany([{key, value, ttl?}])`: Sets multiple values in the cache.
* `get(key)`: Gets a value from the cache.
* `getMany([keys])`: Gets multiple values from the cache.
* `has(key)`: Checks if a value exists in the cache.
* `hasMany([keys])`: Checks if multiple values exist in the cache.
* `take(key)`: Takes a value from the cache and deletes it.
* `takeMany([keys])`: Takes multiple values from the cache and deletes them.
* `delete(key)`: Deletes a value from the cache.
* `deleteMany([keys])`: Deletes multiple values from the cache.
* `clear()`: Clears the cache stores. Be careful with this as it will clear both layer 1 and layer 2.
* `wrap(function, WrapOptions)`: Wraps an `async` function in a cache.
* `disconnect()`: Disconnects from the cache stores.
* `onHook(hook, callback)`: Sets a hook.
* `removeHook(hook)`: Removes a hook.
* `on(event, callback)`: Listens for an event.
* `removeListener(event, callback)`: Removes a listener.
* `hash(object: any, algorithm = 'sha256'): string`: Hashes an object with the algorithm. Default is `sha256`.
* `primary`: The primary store for the cache (layer 1) defaults to in-memory by Keyv.
* `secondary`: The secondary store for the cache (layer 2) usually a persistent cache by Keyv.
* `namespace`: The namespace for the cache. Default is `undefined`. This will set the namespace for the primary and secondary stores.
* `nonBlocking`: If the secondary store is non-blocking. Default is `false`.
* `stats`: The statistics for this instance which includes `hits`, `misses`, `sets`, `deletes`, `clears`, `errors`, `count`, `vsize`, `ksize`.

# CacheableMemory - In-Memory Cache

`cacheable` comes with a built-in in-memory cache called `CacheableMemory`. This is a simple in-memory cache that is used as the primary store for `cacheable`. You can use this as a standalone cache or as a primary store for `cacheable`. Here is an example of how to use `CacheableMemory`:

```javascript
import { CacheableMemory } from 'cacheable';
const options = {
  ttl: '1h', // 1 hour
  useClones: true, // use clones for the values (default is true)
  lruSize: 1000, // the size of the LRU cache (default is 0 which is unlimited)
}
const cache = new CacheableMemory(options);
cache.set('key', 'value');
const value = cache.get('key'); // value
```

You can use `CacheableMemory` as a standalone cache or as a primary store for `cacheable`. You can also set the `useClones` property to `false` if you want to use the same reference for the values. This is useful if you are using large objects and want to save memory. The `lruSize` property is the size of the LRU cache and is set to `0` by default which is unlimited. When setting the `lruSize` property it will limit the number of keys in the cache.

This simple in-memory cache uses multiple Map objects and a with `expiration` and `lru` policies if set to manage the in memory cache at scale.

By default we use lazy expiration deletion which means on `get` and `getMany` type functions we look if it is expired and then delete it. If you want to have a more aggressive expiration policy you can set the `checkInterval` property to a value greater than `0` which will check for expired keys at the interval you set.

## CacheableMemory Options

* `ttl`: The time to live for the cache in milliseconds. Default is `undefined` which is means indefinitely.
* `useClones`: If the cache should use clones for the values. Default is `true`.
* `lruSize`: The size of the LRU cache. Default is `0` which is unlimited.
* `checkInterval`: The interval to check for expired keys in milliseconds. Default is `0` which is disabled.

## CacheableMemory - API

* `set(key, value, ttl?)`: Sets a value in the cache.
* `setMany([{key, value, ttl?}])`: Sets multiple values in the cache from `CacheableItem`.
* `get(key)`: Gets a value from the cache.
* `getMany([keys])`: Gets multiple values from the cache.
* `getRaw(key)`: Gets a value from the cache as `CacheableStoreItem`.
* `getManyRaw([keys])`: Gets multiple values from the cache as `CacheableStoreItem`.
* `has(key)`: Checks if a value exists in the cache.
* `hasMany([keys])`: Checks if multiple values exist in the cache.
* `delete(key)`: Deletes a value from the cache.
* `deleteMany([keys])`: Deletes multiple values from the cache.
* `take(key)`: Takes a value from the cache and deletes it.
* `takeMany([keys])`: Takes multiple values from the cache and deletes them.
* `wrap(function, WrapSyncOptions)`: Wraps a `sync` function in a cache.
* `clear()`: Clears the cache.
* `size()`: The number of keys in the cache.
* `keys()`: The keys in the cache.
* `items()`: The items in the cache as `CacheableStoreItem` example `{ key, value, expires? }`.
* `checkExpired()`: Checks for expired keys in the cache. This is used by the `checkInterval` property.
* `startIntervalCheck()`: Starts the interval check for expired keys if `checkInterval` is above 0 ms.
* `stopIntervalCheck()`: Stops the interval check for expired keys.
* `hash(object: any, algorithm = 'sha256'): string`: Hashes an object with the algorithm. Default is `sha256`.

# Wrap / Memoization for Sync and Async Functions

`Cacheable` and `CacheableMemory` has a feature called `wrap` that allows you to wrap a function in a cache. This is useful for memoization and caching the results of a function. You can wrap a `sync` or `async` function in a cache. Here is an example of how to use the `wrap` function:

```javascript
import { Cacheable } from 'cacheable';
const asyncFunction = async (value: number) => {
  return Math.random() * value;
};

const cache = new Cacheable();
const options = {
  ttl: '1h', // 1 hour
  keyPrefix: 'p1', // key prefix. This is used if you have multiple functions and need to set a unique prefix.
}
const wrappedFunction = cache.wrap(asyncFunction, options);
console.log(await wrappedFunction(2)); // 4
console.log(await wrappedFunction(2)); // 4 from cache
```
With `Cacheable` we have also included stampede protection so that a `Promise` based call will only be called once if multiple requests of the same are executed at the same time. Here is an example of how to test for stampede protection:
  
```javascript
import { Cacheable } from 'cacheable';
const asyncFunction = async (value: number) => {
  return value;
};

const cache = new Cacheable();
const options = {
  ttl: '1h', // 1 hour
  keyPrefix: 'p1', // key prefix. This is used if you have multiple functions and need to set a unique prefix.
}

const wrappedFunction = cache.wrap(asyncFunction, options);
const promises = [];
for (let i = 0; i < 10; i++) {
  promises.push(wrappedFunction(i));
}

const results = await Promise.all(promises); // all results should be the same

console.log(results); // [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
```

In this example we are wrapping an `async` function in a cache with a `ttl` of `1 hour`. This will cache the result of the function for `1 hour` and then expire the value. You can also wrap a `sync` function in a cache:

```javascript
import { CacheableMemory } from 'cacheable';
const syncFunction = (value: number) => {
  return value * 2;
};

const cache = new CacheableMemory();
const wrappedFunction = cache.wrap(syncFunction, { ttl: '1h', key: 'syncFunction' });
console.log(wrappedFunction(2)); // 4
console.log(wrappedFunction(2)); // 4 from cache
```

In this example we are wrapping a `sync` function in a cache with a `ttl` of `1 hour`. This will cache the result of the function for `1 hour` and then expire the value. You can also set the `key` property in the `wrap()` options to set a custom key for the cache.

When an error occurs in the function it will not cache the value and will return the error. This is useful if you want to cache the results of a function but not cache the error. If you want it to cache the error you can set the `cacheError` property to `true` in the `wrap()` options. This is disabled by default.

```javascript
import { CacheableMemory } from 'cacheable';
const syncFunction = (value: number) => {
  throw new Error('error');
};

const cache = new CacheableMemory();
const wrappedFunction = cache.wrap(syncFunction, { ttl: '1h', key: 'syncFunction', cacheError: true });
console.log(wrappedFunction()); // error
console.log(wrappedFunction()); // error from cache
```

# Keyv Storage Adapter - KeyvCacheableMemory

`cacheable` comes with a built-in storage adapter for Keyv called `KeyvCacheableMemory`. This takes `CacheableMemory` and creates a storage adapter for Keyv. This is useful if you want to use `CacheableMemory` as a storage adapter for Keyv. Here is an example of how to use `KeyvCacheableMemory`:

```javascript
import { Keyv } from 'keyv';
import { KeyvCacheableMemory } from 'cacheable';

const keyv = new Keyv({ store: new KeyvCacheableMemory() });
await keyv.set('foo', 'bar');
const value = await keyv.get('foo');
console.log(value); // bar 
```

# How to Contribute

You can contribute by forking the repo and submitting a pull request. Please make sure to add tests and update the documentation. To learn more about how to contribute go to our main README [https://github.com/jaredwray/cacheable](https://github.com/jaredwray/cacheable). This will talk about how to `Open a Pull Request`, `Ask a Question`, or `Post an Issue`.

# License and Copyright
[MIT © Jared Wray](./LICENSE)