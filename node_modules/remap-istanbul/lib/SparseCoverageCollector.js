class SparseCoverageCollector {
	constructor() {
		this.srcCoverage = {};
		this.metaInfo = {};
	}

	getSourceCoverage(filename) {
		let data = this.srcCoverage[filename];
		if (!data) {
			data = this.srcCoverage[filename] = {
				path: filename,
				statementMap: {},
				fnMap: {},
				branchMap: {},
				s: {},
				b: {},
				f: {},
			};
			this.metaInfo[filename] = {
				indexes: {},
				lastIndex: {
					s: 0,
					b: 0,
					f: 0,
				},
			};
		}

		return {
			data,
			meta: this.metaInfo[filename],
		};
	}

	setCoverage(filePath, fileCoverage) {
		this.srcCoverage[filePath] = fileCoverage;
	}

	setSourceCode(filePath, source) {
		this.getSourceCoverage(filePath).data.code = source;
	}


	getFinalCoverage() {
		return this.srcCoverage;
	}

	updateBranch(source, srcItem, hits) {
		const { data, meta } = this.getSourceCoverage(source);

		let key = ['b'];
		srcItem.locations.map(loc => key.push(
			loc.start.line, loc.start.column,
			loc.end.line, loc.end.line
		));

		key = key.join(':');

		let index = meta.indexes[key];
		if (!index) {
			meta.lastIndex.b += 1;
			index = meta.lastIndex.b;
			meta.indexes[key] = index;
			data.branchMap[index] = srcItem;
		}

		if (!data.b[index]) {
			data.b[index] = hits.map(v => v);
		} else {
			for (let i = 0; i < hits.length; i += 1) {
				data.b[index][i] += hits[i];
			}
		}
	}

	updateFunction(source, srcItem, hits) {
		const { data, meta } = this.getSourceCoverage(source);

		const key = [
			'f',
			srcItem.loc.start.line, srcItem.loc.start.column,
			srcItem.loc.end.line, srcItem.loc.end.column,
		].join(':');

		let index = meta.indexes[key];
		if (!index) {
			meta.lastIndex.f += 1;
			index = meta.lastIndex.f;
			meta.indexes[key] = index;
			data.fnMap[index] = srcItem;
		}

		data.f[index] = data.f[index] || 0;
		data.f[index] += hits;
	}

	updateStatement(source, srcItem, hits) {
		const { data, meta } = this.getSourceCoverage(source);

		const key = [
			's',
			srcItem.start.line, srcItem.start.column,
			srcItem.end.line, srcItem.end.column,
		].join(':');

		let index = meta.indexes[key];
		if (!index) {
			meta.lastIndex.s += 1;
			index = meta.lastIndex.s;
			meta.indexes[key] = index;
			data.statementMap[index] = srcItem;
		}

		data.s[index] = data.s[index] || 0;
		data.s[index] += hits;
	}
}

module.exports = SparseCoverageCollector;
