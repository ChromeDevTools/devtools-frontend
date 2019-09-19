module.exports = function remapBranch(genItem, getMapping) {
	const locations = [];
	let source;

	for (let i = 0; i < genItem.locations.length; i += 1) {
		const mapping = getMapping(genItem.locations[i]);
		if (!mapping) {
			return null;
		}
		/* istanbul ignore else: edge case too hard to test for */
		if (!source) {
			source = mapping.source;
		} else if (source !== mapping.source) {
			return null;
		}
		locations.push(mapping.loc);
	}

	const locMapping = genItem.loc && getMapping(genItem.loc);

	const srcItem = {
		line: locations[0].start.line,
		type: genItem.type,
		locations,
		loc: locMapping ? locMapping.loc : undefined,
	};

	return { source, srcItem };
};
