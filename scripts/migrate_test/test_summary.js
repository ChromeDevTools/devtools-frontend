const fs = require('fs');
const path = require('path');

const utils = require('../utils');

const TESTS_PATH = path.resolve(__dirname, '..', '..', '..', '..', 'LayoutTests', 'http', 'tests', 'devtools');

function main() {
  const groups = {};
  groups['/'] = {html: 0, js: 0};
  const total = {html: 0, js: 0};
  const filenames = fs.readdirSync(TESTS_PATH);
  for (const filename of filenames) {
    const filePath = path.resolve(TESTS_PATH, filename);
    if (utils.isDir(filePath)) {
      groups[filename] = summarizeRecursive(filePath);
    } else {
      const extension = path.extname(filePath);
      if (extension === '.js') {
        groups['/'].js++;
      }
      if (extension === '.html') {
        groups['/'].html++;
      }
    }
  }

  for (var key in groups) {
    total.html += groups[key].html;
    total.js += groups[key].js;
  }

  for (var key in groups) {
    console.log(key, ' 😞', groups[key].html, ' 🎉', groups[key].js)
  }

  console.log('\nTotal: ', ' 😞', total.html, ' 🎉', total.js)
}

function summarizeRecursive(dirPath) {
  const aggregatedStat = {html: 0, js: 0};
  if (dirPath.endsWith('resources'))
    return aggregatedStat;
  const filenames = fs.readdirSync(dirPath);
  for (const filename of filenames) {
    const filePath = path.resolve(dirPath, filename);
    if (utils.isDir(filePath)) {
      const stat = summarizeRecursive(filePath);
      aggregatedStat.html += stat.html;
      aggregatedStat.js += stat.js;
    } else {
      const extension = path.extname(filePath);
      if (extension === '.js') {
        aggregatedStat.js++;
      }
      if (extension === '.html') {
        aggregatedStat.html++;
      }
    }
  }
  return aggregatedStat;
}

main();