/* eslint-disable unicorn/no-this-assignment, no-unused-expressions */
const path = require('node:path');
const fs = require('node:fs');
const Keyv = require('keyv');
const {writeJSON, tryParse} = require('./utils.js');
const {del} = require('./del.js');

const cache = {
	/**
   * Load a cache identified by the given Id. If the element does not exists, then initialize an empty
   * cache storage. If specified `cacheDir` will be used as the directory to persist the data to. If omitted
   * then the cache module directory `./cache` will be used instead
   *
   * @method load
   * @param docId {String} the id of the cache, would also be used as the name of the file cache
   * @param [cacheDir] {String} directory for the cache entry
   */
	load(documentId, cacheDir) {
		const me = this;
		me.keyv = new Keyv();

		me.__visited = {};
		me.__persisted = {};

		me._pathToFile = cacheDir ? path.resolve(cacheDir, documentId) : path.resolve(__dirname, '../.cache/', documentId);

		if (fs.existsSync(me._pathToFile)) {
			me._persisted = tryParse(me._pathToFile, {});
		}
	},

	get _persisted() {
		return this.__persisted;
	},

	set _persisted(value) {
		this.__persisted = value;
	},

	get _visited() {
		return this.__visited;
	},

	set _visited(value) {
		this.__visited = value;
	},

	/**
   * Load the cache from the provided file
   * @method loadFile
   * @param  {String} pathToFile the path to the file containing the info for the cache
   */
	loadFile(pathToFile) {
		const me = this;
		const dir = path.dirname(pathToFile);
		const fName = path.basename(pathToFile);

		me.load(fName, dir);
	},

	/**
   * Returns the entire persisted object
   * @method all
   * @returns {*}
   */
	all() {
		return this._persisted;
	},

	keys() {
		return Object.keys(this._persisted);
	},
	/**
   * Sets a key to a given value
   * @method setKey
   * @param key {string} the key to set
   * @param value {object} the value of the key. Could be any object that can be serialized with JSON.stringify
   */
	setKey(key, value) {
		this._visited[key] = true;
		this._persisted[key] = value;
	},
	/**
   * Remove a given key from the cache
   * @method removeKey
   * @param key {String} the key to remove from the object
   */
	removeKey(key) {
		delete this._visited[key]; // Esfmt-ignore-line
		delete this._persisted[key]; // Esfmt-ignore-line
	},
	/**
   * Return the value of the provided key
   * @method getKey
   * @param key {String} the name of the key to retrieve
   * @returns {*} the value from the key
   */
	getKey(key) {
		this._visited[key] = true;
		return this._persisted[key];
	},

	/**
   * Remove keys that were not accessed/set since the
   * last time the `prune` method was called.
   * @method _prune
   * @private
   */
	_prune() {
		const me = this;
		const object = {};

		const keys = Object.keys(me._visited);

		// No keys visited for either get or set value
		if (keys.length === 0) {
			return;
		}

		for (const key of keys) {
			object[key] = me._persisted[key];
		}

		me._visited = {};
		me._persisted = object;
	},

	/**
   * Save the state of the cache identified by the docId to disk
   * as a JSON structure
   * @param [noPrune=false] {Boolean} whether to remove from cache the non visited files
   * @method save
   */
	save(noPrune) {
		const me = this;
		!noPrune && me._prune();
		writeJSON(me._pathToFile, me._persisted);
	},

	/**
   * Remove the file where the cache is persisted
   * @method removeCacheFile
   * @return {Boolean} true or false if the file was successfully deleted
   */
	removeCacheFile() {
		return del(this._pathToFile);
	},
	/**
   * Destroy the file cache and cache content.
   * @method destroy
   */
	destroy() {
		const me = this;
		me._visited = {};
		me._persisted = {};

		me.removeCacheFile();
	},
};

module.exports = {
	/**
   * Alias for create. Should be considered depreacted. Will be removed in next releases
   *
   * @method load
   * @param docId {String} the id of the cache, would also be used as the name of the file cache
   * @param [cacheDir] {String} directory for the cache entry
   * @returns {cache} cache instance
   */
	load(documentId, cacheDir) {
		return this.create(documentId, cacheDir);
	},

	/**
   * Load a cache identified by the given Id. If the element does not exists, then initialize an empty
   * cache storage.
   *
   * @method create
   * @param docId {String} the id of the cache, would also be used as the name of the file cache
   * @param [cacheDir] {String} directory for the cache entry
   * @returns {cache} cache instance
   */
	create(documentId, cacheDir) {
		const object = Object.create(cache);
		object.load(documentId, cacheDir);
		return object;
	},

	createFromFile(filePath) {
		const object = Object.create(cache);
		object.loadFile(filePath);
		return object;
	},
	/**
   * Clear the cache identified by the given id. Caches stored in a different cache directory can be deleted directly
   *
   * @method clearCache
   * @param docId {String} the id of the cache, would also be used as the name of the file cache
   * @param cacheDir {String} the directory where the cache file was written
   * @returns {Boolean} true if the cache folder was deleted. False otherwise
   */
	clearCacheById(documentId, cacheDir) {
		const filePath = cacheDir ? path.resolve(cacheDir, documentId) : path.resolve(__dirname, '../.cache/', documentId);
		return del(filePath);
	},
	/**
   * Remove all cache stored in the cache directory
   * @method clearAll
   * @returns {Boolean} true if the cache folder was deleted. False otherwise
   */
	clearAll(cacheDir) {
		const filePath = cacheDir ? path.resolve(cacheDir) : path.resolve(__dirname, '../.cache/');
		return del(filePath);
	},
};
