#!/usr/bin/env python3
# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import argparse
import http.server
import itertools
import json
import os
from pathlib import Path
import socketserver
import subprocess
import sys
import tempfile
import time
from threading import Timer
import urllib

parser = argparse.ArgumentParser()
parser.add_argument('-port', default=8888, type=int)
parser.add_argument('tool', default='/abs/path/to/DWARFSymbolServer')
parser.add_argument('-I', nargs='*', default=[])
parser.add_argument(
    '-watch',
    help="watch symbol server for changes and restart automatically",
    action="store_true")
options = parser.parse_args()
PORT = 8888
SymbolServer = [
    options.tool, *itertools.chain.from_iterable(
        ('-I', '{0}'.format(subst)) for subst in options.I)
]
Watchdog = None

print('Executing {0}'.format(' '.join(SymbolServer)))
LC = subprocess.Popen(
    SymbolServer, stdin=subprocess.PIPE, stdout=subprocess.PIPE)
StdIn = LC.stdin
StdOut = LC.stdout


def restartLC():
    print('Restarting.')
    global LC, StdIn, StdOut
    LC.terminate()
    try:
        LC.wait(1)
    except TimeoutError:
        LC.kill()
        LC.wait(1)

    print('Executing {0}'.format(' '.join(SymbolServer)))
    LC = subprocess.Popen(
        SymbolServer, stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    StdIn = LC.stdin
    StdOut = LC.stdout


def DownloadResources(Input):
    def ResolveFile(UrlPath):
        Roots = [Path.cwd(), *map(Path, options.I)]
        for Root in Roots:
            Rooted = Root / UrlPath.relative_to(UrlPath.anchor)
            if Rooted.is_file():
                return Rooted.resolve()

        for Root in Roots:
            Rooted = Root / UrlPath.name
            if Rooted.is_file():
                return Rooted.resolve()
        return None

    if Input.get('method') == 'addRawModule':
        Module = Input.get('params', {}).get('rawModule', {})
        if Module and 'url' in Module:
            Url = urllib.parse.urlparse(Module['url'])
            ResolvedFile = ResolveFile(Path(Url.path))

            if ResolvedFile:
                Module['url'] = str(ResolvedFile)
                return Input, None

            if Url.scheme != 'file' and Url.scheme != '':
                TempFile = tempfile.NamedTemporaryFile()
                Module['url'] = TempFile.name
                urllib.request.urlretrieve(Url, TempFile.name)
                return Input, TempFile

    return Input, None


class SymbolServerServerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args):
        super().__init__(*args)
        self.TempModules = []

    def do_GET(self, *args):
        print('Get:', args)

    def do_OPTIONS(self, *args):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Methods', 'POST')
        self.send_header('Access-Control-Allow-Headers',
                         'accept, content-type')
        self.send_header('Access-Control-Max-Age', '1728000')
        self.end_headers()

    def do_POST(self, *args):
        Len = int(self.headers['Content-Length'])
        Input = json.loads(self.rfile.read(Len).decode())
        ResolvedResources, TempFile = DownloadResources(Input)
        if TempFile:
            self.TempModules.append(TempFile)
        Input = json.dumps(ResolvedResources)

        StdIn.write('Content-Length: {0}\r\n\r\n{1}'.format(len(Input),
                                                            Input).encode())
        StdIn.flush()
        Response = StdOut.readline().decode()
        assert Response.startswith('Content-Length: '), Response
        Len = int(Response[len('Content-Length: '):].strip())
        while StdOut.readline().decode().strip():
            pass
        Response = StdOut.read(Len)
        print(Response)

        self.send_response(200)
        self.send_header('Content-type', 'application/json;charset=UTF-8')
        self.end_headers()
        self.wfile.write(Response)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        http.server.SimpleHTTPRequestHandler.end_headers(self)


if options.watch:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler

    class ToolWatchdog(FileSystemEventHandler):
        def __init__(self):
            self.timer = None

        def on_any_event(self, event):
            if event.src_path == options.tool and os.access(
                    event.src_path, os.X_OK):
                if self.timer:
                    self.timer.cancel()
                self.timer = Timer(2, restartLC)
                self.timer.start()

    Watchdog = Observer()
    Watchdog.schedule(ToolWatchdog(),
                      path=os.path.dirname(options.tool),
                      recursive=False)
    print('Watchdog started for', options.tool)
    Watchdog.start()

while True:
    try:
        with socketserver.TCPServer(('127.0.0.1', options.port),
                                    SymbolServerServerHandler) as httpd:
            print('serving at port', options.port)
            try:
                httpd.serve_forever()
            finally:
                httpd.socket.close()
    except OSError as E:
        pass
    except:
        break
    time.sleep(0.001)
LC.kill()
