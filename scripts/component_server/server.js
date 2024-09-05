// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const fs = require('fs');
const http = require('http');
const path = require('path');
const parseURL = require('url').parse;
const {argv} = require('yargs');

const {getTestRunnerConfigSetting} = require('../test/test_config_helpers.js');

const tracesMode = argv.traces || false;
const serverPort = parseInt(process.env.PORT, 10) || (tracesMode ? 11010 : 8090);

/**
 * When you run npm run components-server we run the script as is from scripts/,
 * but when this server is run as part of a test suite it's run from
 * out/Default/gen/scripts, so we have to do a bit of path mangling to figure
 * out where we are.
 */
const [target, isRunningInGen] = (() => {
  const regex = new RegExp(`out\\${path.sep}(.*)\\${path.sep}gen`);
  const match = regex.exec(__dirname);
  if (match) {
    return [match[1], true];
  }
  return [argv.target || process.env.TARGET || 'Default', false];
})();

/**
 * This configures the base of the URLs that are injected into each component
 * doc example to load. By default it's /, so that we load /front_end/..., but
 * this can be configured if you have a different file structure.
 */
const sharedResourcesBase =
    argv.sharedResourcesBase || getTestRunnerConfigSetting('component-server-shared-resources-path', '/');

/**
 * The server assumes that examples live in
 * devtoolsRoot/out/Target/gen/front_end/ui/components/docs, but if you need to add a
 * prefix you can pass this argument. Passing `foo` will redirect the server to
 * look in devtoolsRoot/out/Target/gen/foo/front_end/ui/components/docs.
 */
const componentDocsBaseArg = argv.componentDocsBase || process.env.COMPONENT_DOCS_BASE ||
    getTestRunnerConfigSetting('component-server-base-path', '');

let pathToOutTargetDir = __dirname;
/**
 * If we are in the gen directory, we need to find the out/Default folder to use
 * as our base to find files from. We could do this with path.join(x, '..',
 * '..') until we get the right folder, but that's brittle. It's better to
 * search up for out/Default to be robust to any folder structures.
 */
while (isRunningInGen && !pathToOutTargetDir.endsWith(`out${path.sep}${target}`)) {
  pathToOutTargetDir = path.resolve(pathToOutTargetDir, '..');
}

/* If we are not running in out/Default, we'll assume the script is running from the repo root, and navigate to {CWD}/out/Target */
const pathToBuiltOutTargetDirectory =
    isRunningInGen ? pathToOutTargetDir : path.resolve(path.join(process.cwd(), 'out', target));

let devtoolsRootFolder = path.resolve(path.join(pathToBuiltOutTargetDirectory, 'gen'));
const fullCheckoutDevtoolsRootFolder = path.join(devtoolsRootFolder, 'third_party', 'devtools-frontend', 'src');
if (__dirname.startsWith(fullCheckoutDevtoolsRootFolder)) {
  devtoolsRootFolder = fullCheckoutDevtoolsRootFolder;
}

const componentDocsBaseFolder = path.join(devtoolsRootFolder, componentDocsBaseArg);

if (!fs.existsSync(devtoolsRootFolder)) {
  console.error(`ERROR: Generated front_end folder (${devtoolsRootFolder}) does not exist.`);
  console.log(
      'The components server works from the built Ninja output; you may need to run Ninja to update your built DevTools.');
  console.log('If you build to a target other than default, you need to pass --target=X as an argument');
  process.exit(1);
}

process.on('uncaughtException', error => {
  console.error('uncaughtException', error);
});
process.on('unhandledRejection', error => {
  console.error('unhandledRejection', error);
});

const server = http.createServer((req, res) => requestHandler(req, res).catch(err => send500(res, err)));
server.listen(serverPort, 'localhost');
server.once('listening', () => {
  if (process.send) {
    process.send(serverPort);
  }
  console.log(`Started components server at http://localhost:${serverPort}\n`);
  console.log(`ui/components/docs location: ${
      path.relative(process.cwd(), path.join(componentDocsBaseFolder, 'front_end', 'ui', 'components', 'docs'))}`);
});

server.once('error', error => {
  if (process.send) {
    process.send('ERROR');
  }
  throw error;
});

// All paths that are injected globally into real DevTools, so we do the same
// to avoid styles being broken in the component server.
const styleSheetPaths = [
  'front_end/ui/legacy/themeColors.css',
  'front_end/ui/legacy/tokens.css',
  'front_end/ui/legacy/applicationColorTokens.css',
  'front_end/ui/legacy/designTokens.css',
  'front_end/ui/legacy/inspectorCommon.css',
  'front_end/ui/legacy/inspectorSyntaxHighlight.css',
  'front_end/ui/legacy/textButton.css',
  'front_end/ui/components/docs/component_docs_styles.css',
];

function createComponentIndexFile(componentPath, componentExamples) {
  const componentName = componentPath.replace('/front_end/ui/components/docs/', '').replace(/_/g, ' ').replace('/', '');
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
  const linksToStyleSheets =
      styleSheetPaths
          .map(link => `<link rel="stylesheet" href="${sharedResourcesBase}${path.join(...link.split('/'))}" />`)
          .join('\n');

  // clang-format off
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width" />
      <title>DevTools components</title>
      ${linksToStyleSheets}
    </head>
    <body id="index-page">
      <h1>DevTools components</h1>
      <ul class="components-list">
        ${componentNames.map(name => {
          const niceName = name.replace(/_/g, ' ');
          return `<li><a href='/front_end/ui/components/docs/${name}'>${niceName}</a></li>`;
        }).join('\n')}
      </ul>
    </body>
  </html>`;
  // clang-format on
}

async function getExamplesForPath(filePath) {
  const componentDirectory = path.join(componentDocsBaseFolder, filePath);
  if (!await checkFileExists(componentDirectory)) {
    return null;
  }
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

function send500(response, error) {
  response.writeHead(500);
  response.write(error.toString(), 'utf8');
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
 * @param {http.IncomingMessage} request
 * @param {http.ServerResponse} response
 */
async function requestHandler(request, response) {
  const filePath = parseURL(request.url).pathname;
  if (filePath === '/favicon.ico') {
    send404(response, '404, no favicon');
    return;
  }
  if (['/', '/index.html'].includes(filePath) && tracesMode === false) {
    const components =
        await fs.promises.readdir(path.join(componentDocsBaseFolder, 'front_end', 'ui', 'components', 'docs'));
    const html = createServerIndexFile(components.filter(filePath => {
      const stats = fs.lstatSync(path.join(componentDocsBaseFolder, 'front_end', 'ui', 'components', 'docs', filePath));
      // Filter out some build config files (tsconfig, d.ts, etc), and just list the directories.
      return stats.isDirectory();
    }));
    respondWithHtml(response, html);
  } else if (filePath.startsWith('/front_end/ui/components/docs') && path.extname(filePath) === '') {
    // This means it's a component path like /breadcrumbs.
    const componentHtml = await getExamplesForPath(filePath);
    if (componentHtml !== null) {
      respondWithHtml(response, componentHtml);
    } else {
      send404(response, '404, not a valid component');
    }
    return;
  } else if (tracesMode) {
    return handleTracesModeRequest(request, response, filePath);
  } else if (/ui\/components\/docs\/(.+)\/(.+)\.html/.test(filePath)) {
    /** This conditional checks if we are viewing an individual example's HTML
     *  file. e.g. localhost:8090/front_end/ui/components/docs/data_grid/basic.html For each
     *  example we inject themeColors.css into the page so all CSS variables
     *  that components use are available.
     */

    /**
     * We also let the user provide a different base path for any shared
     * resources that we load. But if this is provided along with the
     * componentDocsBaseArg, and the two are the same, we don't want to use the
     * shared resources base, as it's part of the componentDocsBaseArg and
     * therefore the URL is already correct.
     *
     * If we didn't get a componentDocsBaseArg or we did and it's different to
     * the sharedResourcesBase, we use sharedResourcesBase.
     */
    const baseUrlForSharedResource =
        componentDocsBaseArg && componentDocsBaseArg.endsWith(sharedResourcesBase) ? '/' : `/${sharedResourcesBase}`;
    const fullPath = path.join(componentDocsBaseFolder, filePath);
    if (!(await checkFileExists(fullPath))) {
      send404(response, '404, File not found');
      return;
    }
    const fileContents = await fs.promises.readFile(fullPath, {encoding: 'utf8'});

    const linksToStyleSheets =
        styleSheetPaths
            .map(
                link => `<link rel="stylesheet" href="${
                    path.join(baseUrlForSharedResource, ...link.split('/'))}" type="text/css" />`)
            .join('\n');

    const toggleDarkModeScript = `<script type="module" src="${
        path.join(baseUrlForSharedResource, 'front_end', 'ui', 'components', 'docs', 'component_docs.js')}"></script>`;
    const newFileContents = fileContents.replace('</head>', `${linksToStyleSheets}</head>`)
                                .replace('</body>', toggleDarkModeScript + '\n</body>');
    respondWithHtml(response, newFileContents);

  } else {
    // This means it's an asset like a JS file or an image.
    let fullPath = path.join(componentDocsBaseFolder, filePath);
    if (fullPath.endsWith(path.join('locales', 'en-US.json')) &&
        !componentDocsBaseFolder.includes(sharedResourcesBase)) {
      /**
       * If the path is for locales/en-US.json we special case the loading of that to fix the path so it works properly in the server.
       * We also make sure that we take into account the shared resources base;
       * but if the base folder already contains the shared resources base, we don't
       * add it to the path, because otherwise that would cause the shared resources
       * base to be duplicated in the fullPath.
       */
      // Rewrite this path so we can load up the locale in the component-docs
      let prefix = componentDocsBaseFolder;
      if (sharedResourcesBase && !componentDocsBaseFolder.includes(sharedResourcesBase)) {
        prefix = path.join(componentDocsBaseFolder, sharedResourcesBase);
      }
      fullPath = path.join(prefix, 'front_end', 'core', 'i18n', 'locales', 'en-US.json');
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
    if (fullPath.endsWith('.js') || fullPath.endsWith('.mjs')) {
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
    } else if (fullPath.endsWith('.gz')) {
      response.setHeader('Content-Type', 'application/gzip');
      encoding = 'binary';
    }

    const fileContents = await fs.promises.readFile(fullPath, encoding);

    response.writeHead(200);
    response.write(fileContents, encoding);
    response.end();
  }
}

function createTracesIndexFile(traceFilenames) {
  function pageFunction() {
    const origin = new URL(location.href).origin;

    document.body.addEventListener('click', async e => {
      if (!e.target.matches('button')) {
        return;
      }
      const filename = e.target.textContent;
      const traceUrl = `${origin}/t/${filename}`;
      const devtoolsLoadingTraceUrl = `devtools://devtools/bundled/devtools_app.html?loadTimelineFromURL=${traceUrl}`;

      try {
        await navigator.clipboard.writeText(devtoolsLoadingTraceUrl);
        e.target.classList.add('clicked');
        setTimeout(() => e.target.classList.remove('clicked'), 1000);
      } catch (e) {
        console.error(e);
      }
    });
  }

  // clang-format off
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width" />
      <title>Traces</title>
      <style>
        button {
          appearance: none;
          border: 0;
          background: transparent;
          font-size: 18px;
          padding: 5px;
          text-align: left;
        }
        button:hover {
          background: aliceblue;
          cursor: pointer;
        }
        button:active {cursor: copy;}
        button.clicked {animation: 600ms cubic-bezier(0.65, 0.05, 0.36, 1) bam;}
        button.clicked::after {
          content: "Copied URL";
          background-color: #e0e0e0;
          margin-left: 6px;
          font-size: 70%;
          padding: 1px 3px;
          animation: 500ms fadeOut ease 700ms forwards;
        }
        form {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
        }
        @keyframes bam {
          from {background-color: #66bb6a;}
          to {background-color: aliceblue;}
        }
        @keyframes fadeOut {
          from {opacity: 1;}
          to {opacity: 0;}
        }
      </style>
    </head>
    <body id="traces-page">
      <h1>First</h1>
      <p><textarea cols=100>devtools://devtools/bundled/devtools_app.html</textarea>
      <h1>Load OPP with fixture traces:</h1>

      <form>
        ${traceFilenames.map(filename => {
          return `<button type=button>${filename}</button>`;
        }).join('\n')}
      </form>

      <script>
        (${pageFunction.toString()})();
      </script>
    </body>
  </html>`;
  // clang-format on
}

/**
 * @param {http.IncomingMessage} request
 * @param {http.ServerResponse} response
 * @param {string|null} filePath
 */
async function handleTracesModeRequest(request, response, filePath) {
  const traceFolder = path.resolve(path.join(process.cwd(), 'front_end/panels/timeline/fixtures/traces/'));
  if (filePath === '/') {
    const traceFilenames = fs.readdirSync(traceFolder).filter(f => f.includes('json'));
    const html = createTracesIndexFile(traceFilenames);
    respondWithHtml(response, html);
  } else if (filePath.startsWith('/t/')) {
    const fileName = filePath.replace('/t/', '');
    const fullPath = path.resolve(path.join(traceFolder, fileName));

    if (!fullPath.startsWith(traceFolder)) {
      console.error(`Path ${fullPath} is outside trace fixtures folder.`);
      process.exit(1);
    }

    const fileExists = await checkFileExists(fullPath);
    if (!fileExists) {
      return send404(response, '404, File not found');
    }

    let encoding = 'utf8';
    if (fullPath.endsWith('.json')) {
      response.setHeader('Content-Type', 'application/json');
    } else if (fullPath.endsWith('.gz')) {
      response.setHeader('Content-Type', 'application/gzip');
      encoding = 'binary';
    }
    // Traces need CORS to be loaded by devtools:// origin
    response.setHeader('Access-Control-Allow-Origin', '*');

    const fileContents = await fs.promises.readFile(fullPath, encoding);
    response.writeHead(200);
    response.write(fileContents, encoding);
    response.end();
  } else {
    console.error(`Unhandled traces mode request: ${filePath}`);
    process.exit(1);
  }
}
