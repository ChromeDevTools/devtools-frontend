#!/usr/bin/env node

require("./index.js")
	.cli()
	// eslint-disable-next-line no-console
	.catch(console.log);
