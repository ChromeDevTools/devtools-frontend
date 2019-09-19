# Copyright 2014 Google Inc. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Command-line tool to validate and pretty-print JSON5.

Usage::

    $ echo '{foo:"bar"}' | python -m json5.tool
    { foo: "bar" }
    $
"""

import os
import sys

from . import arg_parser
from . import lib
from .host import Host
from .version import VERSION


def main(argv=None, host=None):
    host = host or Host()

    parser = arg_parser.ArgumentParser(host, prog='json5')
    parser.add_argument('-c', metavar='STR', dest='cmd',
                        help='inline json5 string')
    parser.add_argument('--json', dest='as_json', action='store_const',
                        const=True, default=False,
                        help='output as json')
    parser.add_argument('files', nargs='*', default=[],
                        help=parser.SUPPRESS)
    args = parser.parse_args(argv)

    if parser.exit_status is not None:
        return parser.exit_status

    if args.version:
        host.print_(VERSION)
        return 0

    if args.cmd:
        inp = args.cmd
    else:
        inp = ''.join(host.fileinput(args.files))

    host.print_(lib.dumps(lib.loads(inp), compact=True, as_json=args.as_json))
    return 0


if __name__ == '__main__':  # pragma: no cover
    sys.exit(main())
