# Chrome DevTools C++/DWARF Symbol Server

The symbol server offers a standalone service for analyzing WebAssembly modules
containing DWARF debug symbols.

### DISCLAIMER
The symbol server is highly experimental and not officially released as part of
chromium. The server is not ready for production use and provides no security
from malicious modules or clients of the service. So use at your own discretion!

### Source code
The server is part of the Chrome DevTools frontend that is available on
[chromium.googlesource.com](https://chromium.googlesource.com/devtools/devtools-frontend).


### Prerequisites

Building the server requires
[depot_tools](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up)
to fetch dependencies. The dependencies are not fetched by `gclient sync` in
DevTools by default. To enable it, run
```bash
vim $(gclient root)/.gclient
```
In the `custom_vars` section, insert this line:
```python
"build_symbol_server": True,
```
Then run `glient sync` to fetch the dependencies.

Building and running the server further require these dependencies:
* CMake
* Python3
* libprotobuf and protoc
* Swig (for building lldb)
* The watchdog python package
* XCode and XCode developer tools (MacOS)
* brew (MacOs)

On Debian, install the dependencies by running
```bash
apt install cmake python3 libprotobuf-dev protobuf-compiler swig python-watchdog
```

On MacOS, install the dependencies by
* Getting XCode (Mac App Store)
* XCode developer tools
```bash
xcode-select --install
```
* brew
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
```
* cmake, python3, swig, protobuf
```bash
brew install cmake python3 swig protobuf
pip3 install --user watchdog
```

### Building

The project uses CMake. To build it, run
```bash
mkdir -p out/SymbolServer && cd out/SymbolServer
cmake -GNinja ../../back_end/CXXDWARFSymbols
ninja
ninja check-symbol-server # Run unit and integration tests
```

### Running the server

To run the, use the runner tool:
```bash
back_end/CXXDWARFSymbols/tools/symbol-server.py out/SymbolServer/bin/DWARFSymbolServer -I /path/to/wasm/symbol/modules
```

To avoid having to download lots of symbol modules, the tool accepts `-I`
arguments pointing to file system directories containing the symbol modules.
