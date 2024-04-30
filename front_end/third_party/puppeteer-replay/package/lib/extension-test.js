#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { RunnerExtension, createRunner, parse, stringify } from '../lib/main.js';
import 'fs';
import { isAbsolute, join } from 'path';
import { pathToFileURL } from 'url';
import { cwd } from 'process';
import 'cli-table3';
import 'colorette';
import http from 'http';
import assert from 'assert/strict';
import { spawn } from 'child_process';

/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */
async function importExtensionFromPath(path) {
    const module = await import(pathToFileURL(isAbsolute(path) ? path : join(cwd(), path)).toString());
    return module.default;
}

const recording = {
    title: 'spec',
    steps: [
        {
            type: 'setViewport',
            width: 900,
            height: 700,
            deviceScaleFactor: 1,
            isMobile: false,
            hasTouch: false,
            isLandscape: false,
        },
        {
            type: 'navigate',
            url: 'http://localhost:8907/spec.html',
            assertedEvents: [
                {
                    type: 'navigation',
                    url: 'http://localhost:8907/spec.html',
                    title: '',
                },
            ],
        },
        {
            type: 'click',
            target: 'main',
            selectors: [
                ['aria/Click'],
                ['#button'],
                ['xpath///*[@id="button"]'],
                ['text/Click'],
            ],
            offsetY: 18,
            offsetX: 36,
        },
        {
            type: 'doubleClick',
            target: 'main',
            selectors: [
                ['aria/Click'],
                ['#button'],
                ['xpath///*[@id="button"]'],
                ['text/Click'],
            ],
            offsetY: 18,
            offsetX: 36,
        },
        {
            type: 'keyDown',
            target: 'main',
            key: 'Tab',
        },
        {
            type: 'keyUp',
            key: 'Tab',
            target: 'main',
        },
        {
            type: 'change',
            value: 'test',
            selectors: [['#input'], ['xpath///*[@id="input"]']],
            target: 'main',
        },
        {
            type: 'change',
            value: 'testSuffix',
            selectors: [['#input-prefilled']],
            target: 'main',
        },
        {
            type: 'keyDown',
            target: 'main',
            key: 'Enter',
        },
        {
            type: 'keyUp',
            key: 'Enter',
            target: 'main',
        },
        {
            type: 'click',
            selectors: [['#input'], ['xpath///*[@id="input"]']],
            target: 'main',
            button: 'secondary',
            offsetX: 1,
            offsetY: 1,
        },
        {
            type: 'hover',
            target: 'main',
            selectors: [
                ['aria/Hover'],
                ['#hover'],
                ['xpath///*[@id="hover"]'],
                ['text/Hover'],
            ],
        },
        {
            type: 'waitForExpression',
            expression: 'new Promise(resolve => setTimeout(() => resolve(true), 500))',
        },
        {
            type: 'waitForElement',
            target: 'main',
            selectors: ['#button'],
            count: 1,
            visible: true,
            properties: {
                id: 'button',
            },
            attributes: {
                id: 'button',
            },
        },
        {
            type: 'change',
            value: 'optionB',
            selectors: [['#select']],
            target: 'main',
        },
    ],
};
const expectedLog = `window dimensions 900x700
click targetId=button button=0 detail=1 value=
click targetId=button button=0 detail=1 value=
click targetId=button button=0 detail=2 value=
dblclick targetId=button button=0 detail=2 value=
change targetId=input button=undefined detail=undefined value=test
change targetId=input-prefilled button=undefined detail=undefined value=testSuffix
contextmenu targetId=input button=2 detail=0 value=test
mouseenter targetId=hover button=0 detail=0 value=
change targetId=select button=undefined detail=undefined value=optionB
`.trim();
const files = new Map([
    [
        'spec.html',
        `<!DOCTYPE html>
<button id="button" onclick="logEvent(event)" ondblclick="logEvent(event)">
    Click
</button>
<button
    id="hover"
    onmouseenter="logEvent(event)"
    onmouseleave="logEvent(event)"
>
    Hover
</button>
<input id="input" oncontextmenu="logEvent(event)" onchange="logEvent(event)" />
<input id="input-prefilled" onchange="logEvent(event)" value="test" />
<select id="select" onchange="logEvent(event)">
    <option value=""></option>
    <option value="optionA">Option A</option>
    <option value="optionB">Option B</option>
</select>
<pre id="log"></pre>
<script>
    function logStr(str) {
      log.innerText += str;
      const data = { username: 'example' };
      fetch('/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/text',
        },
        body: str,
      })
        .catch((error) => {
          console.error(error);
        });
    }
    function logEvent(event) {
      logStr(
          '\\n' +
          event.type +
          ' targetId=' +
          event.target.id +
          ' button=' +
          event.button +
          ' detail=' +
          event.detail +
          ' value=' +
          event.target.value
      );
    }
    logStr(\`window dimensions \${window.innerWidth}x\${window.innerHeight}\`);
    input.addEventListener('contextmenu', (e) => e.preventDefault(), false);
</script>`,
    ],
]);

/**
    Copyright 2023 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */
async function startServer() {
    const log = {
        contents: '',
    };
    const server = http.createServer(async (req, res) => {
        if (req.method === 'GET') {
            for (const [file, content] of files.entries()) {
                if (req.url?.endsWith(file)) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(content);
                    return;
                }
            }
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
            return;
        }
        if (req.method === 'POST') {
            const body = await new Promise((resolve) => {
                const body = [];
                req
                    .on('data', (chunk) => {
                    body.push(chunk);
                })
                    .on('end', () => {
                    resolve(Buffer.concat(body).toString());
                });
            });
            res.writeHead(200);
            res.end();
            log.contents += body;
            return;
        }
        res.writeHead(400);
        res.end();
    });
    return new Promise((resolve) => {
        server.listen(8907, 'localhost', () => {
            resolve({ server, log });
        });
    });
}
yargs(hideBin(process.argv))
    .command('$0', 'Test an extension implementation', () => { }, async (argv) => {
    const args = argv;
    const Extension = await importExtensionFromPath(args.extension);
    const ext = new Extension();
    let run = async () => { };
    if (ext instanceof RunnerExtension) {
        console.log('runner');
        run = async () => {
            const extension = new Extension();
            const runner = await createRunner(parse(recording), extension);
            await runner.run();
        };
    }
    else {
        run = async () => {
            const exported = await stringify(parse(recording), {
                extension: new Extension(),
            });
            const childProcess = spawn('node', {
                stdio: ['pipe', 'pipe', 'inherit'],
                shell: true,
            });
            childProcess.stdin.write(exported);
            childProcess.stdin.end();
            await new Promise((resolve, reject) => {
                childProcess.on('close', (code) => code
                    ? reject(new Error(`Running node failed with code ${code}`))
                    : resolve());
            });
        };
    }
    const { server, log } = await startServer();
    try {
        await run();
    }
    catch (err) {
        console.error(err);
    }
    finally {
        server.close();
    }
    assert.equal(log.contents, expectedLog);
    console.log('Run matches the expectations');
})
    .option('extension', {
    alias: 'ext',
    type: 'string',
    description: 'The path to the extension module. The default export will be used as a Stringify or Runner extension based on instanceOf checks.',
    demandOption: true,
})
    .parse();
//# sourceMappingURL=extension-test.js.map
