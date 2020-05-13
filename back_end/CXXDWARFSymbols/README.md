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
[depot_tools](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up).
To check out the source for the DevTools frontend, including the symbol server, follow these steps:

```bash
mkdir devtools
cd devtools
fetch devtools-frontend
```

The dependencies for the symbol server are not fetched by `gclient sync` in DevTools by default. To enable it, run
```bash
vim $(gclient root)/.gclient
```
In the `custom_vars` section, insert this line:
```python
"build_symbol_server": True,
```
Then run `glient sync` to fetch the dependencies. To update with the latest upstream changes, simply run `git pull`
followed by `gclient sync` again later.

Building and running the server further require these dependencies:
* CMake
* Python3
* libprotobuf and protoc
* Swig (for building lldb)
* The watchdog python package (optional)
* XCode and XCode developer tools (MacOS)
* brew (MacOs)

On Debian, install the dependencies by running
```bash
apt install cmake python3 libprotobuf-dev protobuf-compiler swig
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
```

On Windows, the build requires both Clang and Microsoft Visual Studio 2019 (or higher)
* Install [CMake](https://cmake.org/download/), [Python3](https://www.python.org/downloads/release)
* Install [protobuf](https://github.com/protocolbuffers/protobuf/blob/master/src/README.md) with [vcpkg](https://github.com/microsoft/vcpkg)

```
vcpkg install protobuf protobuf:x64-windows
```
* Install [Clang/LLVM](https://releases.llvm.org/download.html)

### Building

The project uses CMake. To build it, on Linux/MacOS run
```bash
mkdir -p out/SymbolServer && cd out/SymbolServer
cmake -GNinja ../../back_end/CXXDWARFSymbols
ninja
ninja check-symbol-server # Run unit and integration tests
```

On Windows:

run CMake in a Visual Studio Command Prompt, specifying the paths of the Clang compiler and of the vcpkg toolchain file
```bash
cmake -GNinja ../../back_end/CXXDWARFSymbols -DCMAKE_TOOLCHAIN_FILE=c:\vcpkg\scripts\buildsystems\vcpkg.cmake -Wno-dev -D CMAKE_CXX_COMPILER="C:/Program Files/LLVM/bin/clang-cl.exe" -D CMAKE_C_COMPILER="C:/Program Files/LLVM/bin/clang-cl.exe"

ninja
ninja check-symbol-server # Run unit and integration tests
```
(replace _c:\vcpkg_ and the _C:/Program Files/LLVM_ with the actual installation folders)


#### Building with Goma

You can use Goma to speed up building significantly. For this you'll need
a recent checkout of depot_tools as well as a v8 checkout.
```bash
mkdir -p out/SymbolServer && cd out/SymbolServer
cmake -GNinja \
  -DCMAKE_EXPORT_COMPILE_COMMANDS=ON \
  -DCMAKE_CXX_COMPILER_LAUNCHER=/path/to/depot_tools/.cipd_bin/gomacc \
  -DCMAKE_C_COMPILER_LAUNCHER=/path/to/depot_tools/.cipd_bin/gomacc \
  -DCMAKE_C_COMPILER=/path/to/v8/third_party/llvm-build/Release+Asserts/bin/clang \
  -DCMAKE_CXX_COMPILER=/path/to/v8/third_party/llvm-build/Release+Asserts/bin/clang++ \
  ../../back_end/CXXDWARFSymbols
ninja -j100
```

### Running the server

To run the, use the runner tool:
```bash
back_end/CXXDWARFSymbols/tools/symbol-server.py out/SymbolServer/bin/DWARFSymbolServer -I /path/to/wasm/symbol/modules
```

To avoid having to download lots of symbol modules, the tool accepts `-I`
arguments pointing to file system directories containing the symbol modules.

You can also pass `-watch` when developing the symbol server, which makes
the Python script watch the symbol server binary for changes and automatically
restart it when changes are detected. For this to work, you need to install
the `python3-watchdog` package on Debian.

### Showing Variable Values
There is experimental support for showing contents for integer and
C-string variables. To enable this feature, chrome needs to be started with
`--js-flags=--wasm-expose-debug-eval`.
