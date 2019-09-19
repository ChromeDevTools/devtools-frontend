module.exports = function remapFunction(genItem, getMapping) {
	const mapping = getMapping(genItem.loc);

	if (!mapping) {
		return null;
	}

	const declMapping = genItem.decl && getMapping(genItem.decl);

	const srcItem = {
		name: genItem.name,
		line: mapping.loc.start.line,
		loc: mapping.loc,
		decl: declMapping ? declMapping.loc : undefined,
	};

	if (genItem.skip) {
		srcItem.skip = genItem.skip;
	}

	return { srcItem, source: mapping.source };
};
