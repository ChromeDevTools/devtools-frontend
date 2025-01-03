/* eslint-disable unicorn/no-this-assignment, func-names, no-multi-assign  */
const path = require('node:path');
const crypto = require('node:crypto');

module.exports = {
	createFromFile(filePath, useChecksum, currentWorkingDir) {
		const fname = path.basename(filePath);
		const dir = path.dirname(filePath);
		return this.create(fname, dir, useChecksum, currentWorkingDir);
	},

	create(cacheId, _path, useChecksum, currentWorkingDir) {
		const fs = require('node:fs');
		const flatCache = require('flat-cache');
		const cache = flatCache.load(cacheId, _path);
		let normalizedEntries = {};

		const removeNotFoundFiles = function removeNotFoundFiles() {
			const cachedEntries = cache.keys();
			// Remove not found entries
			for (const fPath of cachedEntries) {
				try {
					let filePath = fPath;
					if (currentWorkingDir) {
						filePath = path.join(currentWorkingDir, fPath);
					}

					fs.statSync(filePath);
				} catch (error) {
					if (error.code === 'ENOENT') {
						cache.removeKey(fPath);
					}
				}
			}
		};

		removeNotFoundFiles();

		return {
			/**
       * The flat cache storage used to persist the metadata of the `files
       * @type {Object}
       */
			cache,

			/**
       * To enable relative paths as the key with current working directory
       * @type {string}
       */
			currentWorkingDir: currentWorkingDir ?? undefined,

			/**
       * Given a buffer, calculate md5 hash of its content.
       * @method getHash
       * @param  {Buffer} buffer   buffer to calculate hash on
       * @return {String}          content hash digest
       */
			getHash(buffer) {
				return crypto.createHash('md5').update(buffer).digest('hex');
			},

			/**
       * Return whether or not a file has changed since last time reconcile was called.
       * @method hasFileChanged
       * @param  {String}  file  the filepath to check
       * @return {Boolean}       wheter or not the file has changed
       */
			hasFileChanged(file) {
				return this.getFileDescriptor(file).changed;
			},

			/**
       * Given an array of file paths it return and object with three arrays:
       *  - changedFiles: Files that changed since previous run
       *  - notChangedFiles: Files that haven't change
       *  - notFoundFiles: Files that were not found, probably deleted
       *
       * @param  {Array} files the files to analyze and compare to the previous seen files
       * @return {[type]}       [description]
       */
			analyzeFiles(files) {
				const me = this;
				files ||= [];

				const res = {
					changedFiles: [],
					notFoundFiles: [],
					notChangedFiles: [],
				};

				for (const entry of me.normalizeEntries(files)) {
					if (entry.changed) {
						res.changedFiles.push(entry.key);
						continue;
					}

					if (entry.notFound) {
						res.notFoundFiles.push(entry.key);
						continue;
					}

					res.notChangedFiles.push(entry.key);
				}

				return res;
			},

			getFileDescriptor(file) {
				let fstat;

				try {
					fstat = fs.statSync(file);
				} catch (error) {
					this.removeEntry(file);
					return {key: file, notFound: true, err: error};
				}

				if (useChecksum) {
					return this._getFileDescriptorUsingChecksum(file);
				}

				return this._getFileDescriptorUsingMtimeAndSize(file, fstat);
			},

			_getFileKey(file) {
				if (this.currentWorkingDir) {
					return file.split(this.currentWorkingDir).pop();
				}

				return file;
			},

			_getFileDescriptorUsingMtimeAndSize(file, fstat) {
				let meta = cache.getKey(this._getFileKey(file));
				const cacheExists = Boolean(meta);

				const cSize = fstat.size;
				const cTime = fstat.mtime.getTime();

				let isDifferentDate;
				let isDifferentSize;

				if (meta) {
					isDifferentDate = cTime !== meta.mtime;
					isDifferentSize = cSize !== meta.size;
				} else {
					meta = {size: cSize, mtime: cTime};
				}

				const nEntry = (normalizedEntries[this._getFileKey(file)] = {
					key: this._getFileKey(file),
					changed: !cacheExists || isDifferentDate || isDifferentSize,
					meta,
				});

				return nEntry;
			},

			_getFileDescriptorUsingChecksum(file) {
				let meta = cache.getKey(this._getFileKey(file));
				const cacheExists = Boolean(meta);

				let contentBuffer;
				try {
					contentBuffer = fs.readFileSync(file);
				} catch {
					contentBuffer = '';
				}

				let isDifferent = true;
				const hash = this.getHash(contentBuffer);

				if (meta) {
					isDifferent = hash !== meta.hash;
				} else {
					meta = {hash};
				}

				const nEntry = (normalizedEntries[this._getFileKey(file)] = {
					key: this._getFileKey(file),
					changed: !cacheExists || isDifferent,
					meta,
				});

				return nEntry;
			},

			/**
       * Return the list o the files that changed compared
       * against the ones stored in the cache
       *
       * @method getUpdated
       * @param files {Array} the array of files to compare against the ones in the cache
       * @returns {Array}
       */
			getUpdatedFiles(files) {
				const me = this;
				files ||= [];

				return me
					.normalizeEntries(files)
					.filter(entry => entry.changed)
					.map(entry => entry.key);
			},

			/**
       * Return the list of files
       * @method normalizeEntries
       * @param files
       * @returns {*}
       */
			normalizeEntries(files) {
				files ||= [];

				const me = this;
				const nEntries = files.map(file => me.getFileDescriptor(file));

				// NormalizeEntries = nEntries;
				return nEntries;
			},

			/**
       * Remove an entry from the file-entry-cache. Useful to force the file to still be considered
       * modified the next time the process is run
       *
       * @method removeEntry
       * @param entryName
       */
			removeEntry(entryName) {
				delete normalizedEntries[this._getFileKey(entryName)];
				cache.removeKey(this._getFileKey(entryName));
			},

			/**
       * Delete the cache file from the disk
       * @method deleteCacheFile
       */
			deleteCacheFile() {
				cache.removeCacheFile();
			},

			/**
       * Remove the cache from the file and clear the memory cache
       */
			destroy() {
				normalizedEntries = {};
				cache.destroy();
			},

			_getMetaForFileUsingCheckSum(cacheEntry) {
				let filePath = cacheEntry.key;
				if (this.currentWorkingDir) {
					filePath = path.join(this.currentWorkingDir, filePath);
				}

				const contentBuffer = fs.readFileSync(filePath);
				const hash = this.getHash(contentBuffer);
				const meta = Object.assign(cacheEntry.meta, {hash});
				delete meta.size;
				delete meta.mtime;
				return meta;
			},

			_getMetaForFileUsingMtimeAndSize(cacheEntry) {
				let filePath = cacheEntry.key;
				if (currentWorkingDir) {
					filePath = path.join(currentWorkingDir, filePath);
				}

				const stat = fs.statSync(filePath);
				const meta = Object.assign(cacheEntry.meta, {
					size: stat.size,
					mtime: stat.mtime.getTime(),
				});
				delete meta.hash;
				return meta;
			},

			/**
       * Sync the files and persist them to the cache
       * @method reconcile
       */
			reconcile(noPrune) {
				removeNotFoundFiles();

				noPrune = noPrune === undefined ? true : noPrune;

				const entries = normalizedEntries;
				const keys = Object.keys(entries);

				if (keys.length === 0) {
					return;
				}

				const me = this;

				for (const entryName of keys) {
					const cacheEntry = entries[entryName];

					try {
						const meta = useChecksum
							? me._getMetaForFileUsingCheckSum(cacheEntry)
							: me._getMetaForFileUsingMtimeAndSize(cacheEntry);
						cache.setKey(this._getFileKey(entryName), meta);
					} catch (error) {
						// If the file does not exists we don't save it
						// other errors are just thrown
						if (error.code !== 'ENOENT') {
							throw error;
						}
					}
				}

				cache.save(noPrune);
			},
		};
	},
};
