// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const fs = require('fs');
const http = require('http');
const path = require('path');
const parseURL = require('url').parse;
const {argv} = require('yargs');

const serverPort = parseInt(process.env.PORT, 10) || 8090;

const target = argv.target || 'Default';

/**
 * When you run npm run components-server we run the script as is from scripts/,
 * but when this server is run as part of a test suite it's run from
 * out/Default/gen/scripts, so we have to do a bit of path mangling to figure
 * out where we are.
 */
const isRunningInGen = __dirname.includes(path.join(path.sep, 'gen', path.sep, 'scripts'));

const pathToBuiltOutTargetDirectory = isRunningInGen ? path.resolve(path.join(__dirname), '..', '..', '..') :
                                                       path.resolve(path.join(__dirname, '..', '..', 'out', target));
const devtoolsRootFolder = path.resolve(path.join(pathToBuiltOutTargetDirectory, 'gen'));

if (!fs.existsSync(devtoolsRootFolder)) {
  console.error(`ERROR: Generated front_end folder (${devtoolsRootFolder}) does not exist.`);
  console.log(
      'The components server works from the built Ninja output; you may need to run Ninja to update your built DevTools.');
  console.log('If you build to a target other than default, you need to pass --target=X as an argument');
  process.exit(1);
}

const server = http.createServer(requestHandler);
server.listen(serverPort);
server.once('listening', () => {
  if (process.send) {
    process.send(serverPort);
  }
  console.log(`Started components server at http://localhost:${serverPort}\n`);
});

server.once('error', error => {
  if (process.send) {
    process.send('ERROR');
  }
  throw error;
});

function createComponentIndexFile(componentPath, componentExamples) {
  const componentName = componentPath.replace('/front_end/component_docs/', '').replace(/_/g, ' ').replace('/', '');
  // clang-format off
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width" />
      <title>DevTools component: ${componentName}</title>
      <style>
        h1 { text-transform: capitalize; }

        .example {
          padding: 5px;
          margin: 10px;
        }

        a:link,
        a:visited {
          color: blue;
          text-decoration: underline;
        }

        a:hover {
          text-decoration: none;
        }
        .example summary {
          font-size: 20px;
        }

        .back-link {
          padding-left: 5px;
          font-size: 16px;
          font-style: italic;
        }

        iframe { display: block; width: 100%; height: 400px; }
      </style>
    </head>
    <body>
      <h1>
        ${componentName}
        <a class="back-link" href="/">Back to index</a>
      </h1>
      ${componentExamples.map(example => {
        const fullPath = path.join(componentPath, example);
        return `<details class="example">
          <summary><a href="${fullPath}">${example.replace('.html', '').replace(/-|_/g, ' ')}</a></summary>
          <iframe src="${fullPath}"></iframe>
        </details>`;
      }).join('\n')}
    </body>
  </html>`;
  // clang-format on
}

function createServerIndexFile(componentNames) {
  // clang-format off
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width" />
      <title>DevTools components</title>
      <style>
        a:link, a:visited {
          color: blue;
          text-transform: capitalize;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <h1>DevTools components</h1>
      <ul>
        ${componentNames.map(name => {
          const niceName = name.replace(/_/g, ' ');
          return `<li><a href='/front_end/component_docs/${name}'>${niceName}</a></li>`;
        }).join('\n')}
      </ul>
    </body>
  </html>`;
  // clang-format on
}

async function getExamplesForPath(filePath) {
  const componentDirectory = path.join(devtoolsRootFolder, filePath);
  const allFiles = await fs.promises.readdir(componentDirectory);
  const htmlExampleFiles = allFiles.filter(file => {
    return path.extname(file) === '.html';
  });

  return createComponentIndexFile(filePath, htmlExampleFiles);
}

function respondWithHtml(response, html) {
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.writeHead(200);
  response.write(html, 'utf8');
  response.end();
}

function send404(response, message) {
  response.writeHead(404);
  response.write(message, 'utf8');
  response.end();
}

async function checkFileExists(filePath) {
  try {
    const errorsAccessingFile = await fs.promises.access(filePath, fs.constants.R_OK);
    return !errorsAccessingFile;
  } catch (e) {
    return false;
  }
}

/**
 * In Devtools-Frontend we load images without a leading slash, e.g.
 * url(Images/checker.png). This works within devtools, but breaks this component
 * server as the path ends up as /component_docs/my_component/Images/checker.png.
 * So we check if the path ends in Images/*.* and if so, remove anything before
 * it. Then it will be resolved correctly.
 */
function normalizeImagePathIfRequired(filePath) {
  const imagePathRegex = /\/Images\/(\S+)\.(\w{3})/;
  const match = imagePathRegex.exec(filePath);
  if (!match) {
    return filePath;
  }

  const [, imageName, imageExt] = match;
  const normalizedPath = path.join('front_end', 'Images', `${imageName}.${imageExt}`);
  return normalizedPath;
}

async function requestHandler(request, response) {
  const filePath = parseURL(request.url).pathname;
  if (filePath === '/favicon.ico') {
    send404(response, '404, no favicon');
    return;
  }

  if (filePath === '/' || filePath === '/index.html') {
    const components = await fs.promises.readdir(path.join(devtoolsRootFolder, 'front_end', 'component_docs'));
    const html = createServerIndexFile(components.filter(filePath => {
      const stats = fs.lstatSync(path.join(devtoolsRootFolder, 'front_end', 'component_docs', filePath));
      // Filter out some build config files (tsconfig, d.ts, etc), and just list the directories.
      return stats.isDirectory();
    }));
    respondWithHtml(response, html);
  } else if (filePath.startsWith('/front_end/component_docs') && path.extname(filePath) === '') {
    // This means it's a component path like /breadcrumbs.
    const componentHtml = await getExamplesForPath(filePath);
    respondWithHtml(response, componentHtml);
    return;
  } else if (/component_docs\/(.+)\/(.+)\.html/.test(filePath)) {
    /** This conditional checks if we are viewing an individual example's HTML
     *  file. e.g. localhost:8090/front_end/component_docs/data_grid/basic.html For each
     *  example we inject themeColors.css into the page so all CSS variables
     *  that components use are available.
     */
    const fileContents = await fs.promises.readFile(path.join(devtoolsRootFolder, filePath), {encoding: 'utf8'});
    const themeColoursLink = '<link rel="stylesheet" href="/front_end/ui/themeColors.css" type="text/css" />';
    const inspectorStyleLink = '<link rel="stylesheet" href="/front_end/ui/inspectorStyle.css" type="text/css" />';
    const toggleDarkModeScript = '<script type="module" src="/front_end/component_docs/component_docs.js"></script>';
    const newFileContents = fileContents.replace('<style>', `${themeColoursLink}\n${inspectorStyleLink}\n<style>`)
                                .replace('<script', toggleDarkModeScript + '\n<script');
    respondWithHtml(response, newFileContents);

  } else {
    // This means it's an asset like a JS file or an image.
    const normalizedPath = normalizeImagePathIfRequired(filePath);

    let fullPath = path.join(devtoolsRootFolder, normalizedPath);
    if (fullPath.endsWith(path.join('locales', 'en-US.json'))) {
      // Rewrite this path so we can load up the locale in the component-docs
      fullPath = path.join(devtoolsRootFolder, 'front_end', 'i18n', 'locales', 'en-US.json');
    }

    if (!fullPath.startsWith(devtoolsRootFolder) && !fileIsInTestFolder) {
      console.error(`Path ${fullPath} is outside the DevTools Frontend root dir.`);
      process.exit(1);
    }

    const fileExists = await checkFileExists(fullPath);

    if (!fileExists) {
      send404(response, '404, File not found');
      return;
    }

    let encoding = 'utf8';
    if (fullPath.endsWith('.wasm') || fullPath.endsWith('.png') || fullPath.endsWith('.jpg') ||
        fullPath.endsWith('.avif')) {
      encoding = 'binary';
    }

    const fileContents = await fs.promises.readFile(fullPath, encoding);

    encoding = 'utf8';
    if (fullPath.endsWith('.js')) {
      response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    } else if (fullPath.endsWith('.css')) {
      response.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (fullPath.endsWith('.wasm')) {
      response.setHeader('Content-Type', 'application/wasm');
      encoding = 'binary';
    } else if (fullPath.endsWith('.svg')) {
      response.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    } else if (fullPath.endsWith('.png')) {
      response.setHeader('Content-Type', 'image/png');
      encoding = 'binary';
    } else if (fullPath.endsWith('.jpg')) {
      response.setHeader('Content-Type', 'image/jpg');
      encoding = 'binary';
    } else if (fullPath.endsWith('.avif')) {
      response.setHeader('Content-Type', 'image/avif');
      encoding = 'binary';
    }

    response.writeHead(200);
    response.write(fileContents, encoding);
    response.end();
  }
}
