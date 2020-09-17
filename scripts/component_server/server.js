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
const devtoolsFrontendFolder = path.resolve(path.join(__dirname, '..', '..', 'out', target, 'gen', 'front_end'));

if (!fs.existsSync(devtoolsFrontendFolder)) {
  console.error(`ERROR: Generated front_end folder (${devtoolsFrontendFolder}) does not exist.`);
  console.log(
      'The components server works from the built Ninja output; you may need to run Ninja to update your built DevTools.');
  console.log('If you build to a target other than default, you need to pass --target=X as an argument');
  process.exit(1);
}

http.createServer(requestHandler).listen(serverPort);
console.log(`Started components server at http://localhost:${serverPort}\n`);

function createComponentIndexFile(componentPath, componentExamples) {
  const componentName = componentPath.replace('/', '').replace(/_/g, ' ');
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
        iframe { display: block; width: 100%; }
      </style>
    </head>
    <body>
      <h1>${componentName}</h1>
      ${componentExamples.map(example => {
        const fullPath = path.join('component_docs', componentPath, example);
        return `<div class="example">
          <h3><a href="${fullPath}">${example}</a></h3>
          <iframe src="${fullPath}"></iframe>
        </div>`;
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
        a { text-transform: capitalize; }
      </style>
    </head>
    <body>
      <h1>DevTools components</h1>
      <ul>
        ${componentNames.map(name => {
          return `<li><a href='/${name}'>${name}</a></li>`;
        }).join('\n')}
      </ul>
    </body>
  </html>`;
  // clang-format on
}

async function getExamplesForPath(filePath) {
  const componentDirectory = path.join(devtoolsFrontendFolder, 'component_docs', filePath);
  const contents = await fs.promises.readdir(componentDirectory);

  return createComponentIndexFile(filePath, contents);
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
  const normalizedPath = path.join('Images', `${imageName}.${imageExt}`);
  return normalizedPath;
}

async function requestHandler(request, response) {
  const filePath = parseURL(request.url).pathname;
  if (filePath === '/favicon.ico') {
    send404(response, '404, no favicon');
    return;
  }

  if (filePath === '/' || filePath === '/index.html') {
    const components = await fs.promises.readdir(path.join(devtoolsFrontendFolder, 'component_docs'));
    const html = createServerIndexFile(components);
    respondWithHtml(response, html);
  } else if (path.extname(filePath) === '') {
    // This means it's a component path like /breadcrumbs.
    const componentHtml = await getExamplesForPath(filePath);
    respondWithHtml(response, componentHtml);
  } else {
    // This means it's an asset like a JS file or an image.
    const normalizedPath = normalizeImagePathIfRequired(filePath);
    const fullPath = path.join(devtoolsFrontendFolder, normalizedPath);

    if (!fullPath.startsWith(devtoolsFrontendFolder)) {
      console.error(`Path ${fullPath} is outside the DevTools Frontend root dir.`);
      process.exit(1);
    }

    const fileExists = await checkFileExists(fullPath);

    if (!fileExists) {
      send404(response, '404, File not found');
      return;
    }

    let encoding = 'utf8';
    if (fullPath.endsWith('.wasm') || fullPath.endsWith('.png') || fullPath.endsWith('.jpg')) {
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
    }

    response.writeHead(200);
    response.write(fileContents, encoding);
    response.end();
  }
}
