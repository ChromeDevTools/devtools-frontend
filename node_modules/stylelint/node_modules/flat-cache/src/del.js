const fs = require('node:fs');
const path = require('node:path');

function del(targetPath) {
	if (!fs.existsSync(targetPath)) {
		return false;
	}

	try {
		if (fs.statSync(targetPath).isDirectory()) {
			// If it's a directory, delete its contents first
			for (const file of fs.readdirSync(targetPath)) {
				const currentPath = path.join(targetPath, file);

				if (fs.statSync(currentPath).isFile()) {
					fs.unlinkSync(currentPath); // Delete file
				}
			}

			fs.rmdirSync(targetPath); // Delete the now-empty directory
		} else {
			fs.unlinkSync(targetPath); // If it's a file, delete it directly
		}

		return true;
	} catch (error) {
		console.error(`Error while deleting ${targetPath}: ${error.message}`);
	}
}

module.exports = {del};
