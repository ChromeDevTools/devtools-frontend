# Copyright 2023 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

set(DEV_RESOURCES
  TestDriver.js
  DevToolsPluginForTests.html
  index.html
  )

set(EXTENSION_RESOURCES
  DevToolsPlugin.html
  ExtensionOptions.html
  )

foreach(EXTENSION_RESOURCE IN LISTS EXTENSION_RESOURCES DEV_RESOURCES)
  copy_file(${EXTENSION_RESOURCE} ${EXTENSION_RESOURCE})
endforeach(EXTENSION_RESOURCE)
configure_file(manifest.json.in manifest.json @ONLY)

set(EXTENSION_BUNDLE_ENTRYPOINTS
  DevToolsPluginHost.js
  DevToolsPluginWorkerMain.js
  ExtensionOptions.js
)
set(EXTENSION_BUNDLED_SOURCES)
foreach(entrypoint IN LISTS EXTENSION_BUNDLE_ENTRYPOINTS)
  get_filename_component(NAME_WE ${entrypoint} NAME_WE)
  list(APPEND EXTENSION_BUNDLED_SOURCES ${CMAKE_CURRENT_BINARY_DIR}/${NAME_WE}.bundle.js)
endforeach()

set(ESBUILD_BINARY ${DEVTOOLS_SOURCE_DIR}/third_party/esbuild/esbuild)
if (CMAKE_HOST_WIN32)
  set(ESBUILD_BINARY ${ESBUILD_BINARY}.exe)
endif()

set(ESBUILD_ARGS
  ${EXTENSION_BUNDLE_ENTRYPOINTS}
  --bundle
  --format=esm
  --outdir=.
  --out-extension:.js=.bundle.js
  --external:./SymbolsBackend.js
)
if (NOT CMAKE_BUILD_TYPE STREQUAL "Release")
  list(APPEND ESBUILD_ARGS --sourcemap=inline)
endif()

add_custom_command(
  OUTPUT
    ${EXTENSION_BUNDLED_SOURCES}
  COMMAND
    ${CMAKE_COMMAND}
  ARGS
    -E env GODEBUG=asyncpreemptoff=1 NODE_PATH=${PROJECT_SOURCE_DIR}/third_party
    ${ESBUILD_BINARY}
    ${ESBUILD_ARGS}
  WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
  DEPENDS ${TS_COMPILER_OUTPUTS} ${ESBUILD_BINARY}
)

add_custom_target(Bundles DEPENDS ${EXTENSION_BUNDLED_SOURCES})

add_executable(SymbolsBackend SymbolsBackend.cc)
target_link_libraries(SymbolsBackend PUBLIC DWARFSymbols)
target_include_directories(SymbolsBackend PUBLIC
  ${PROJECT_SOURCE_DIR}/third_party/emscripten/system/include)
target_link_libraries(SymbolsBackend PRIVATE -sMAXIMUM_MEMORY=4GB)
target_link_libraries(SymbolsBackend PRIVATE -sALLOW_MEMORY_GROWTH=1)
target_link_libraries(SymbolsBackend PRIVATE -sMODULARIZE=1)
target_link_libraries(SymbolsBackend PRIVATE -s'EXPORT_NAME=createSymbolsBackend')
target_link_libraries(SymbolsBackend PRIVATE -s'EXTRA_EXPORTED_RUNTIME_METHODS=[\"FS\"]')
target_link_libraries(SymbolsBackend PRIVATE -sERROR_ON_UNDEFINED_SYMBOLS=0)
target_link_libraries(SymbolsBackend PRIVATE --bind)
target_link_libraries(SymbolsBackend PRIVATE --no-heap-copy)
target_link_libraries(SymbolsBackend PRIVATE -sSEPARATE_DWARF_URL=SymbolsBackend.wasm.debug.wasm)
target_link_libraries(SymbolsBackend PRIVATE
  -sWASM_BIGINT
  -sDYNAMIC_EXECUTION=0
)

if (CXX_DEBUGGING_USE_SANITIZERS)
  target_link_libraries(SymbolsBackend PRIVATE
    -sINITIAL_MEMORY=1073741824
    -fsanitize=address,undefined
  )
endif()
if (NOT CMAKE_BUILD_TYPE STREQUAL "Release")
  target_link_libraries(SymbolsBackend PRIVATE
    -sERROR_ON_WASM_CHANGES_AFTER_LINK
    -sREVERSE_DEPS=all
    -sASSERTIONS=1
    )
else()
  target_link_libraries(SymbolsBackend PRIVATE -sASSERTIONS=0)
endif()

target_link_libraries(SymbolsBackend PRIVATE -s'ENVIRONMENT=web,worker')
target_link_libraries(SymbolsBackend PRIVATE -s'EXPORT_ES6=1')

add_custom_command(OUTPUT
  ${CMAKE_CURRENT_BINARY_DIR}/SymbolsBackend.wasm.debug.wasm.dwp
  COMMAND
    ${LLVM_DWP}
  ARGS
    -e ${CMAKE_CURRENT_BINARY_DIR}/SymbolsBackend.wasm.debug.wasm
    -o ${CMAKE_CURRENT_BINARY_DIR}/SymbolsBackend.wasm.debug.wasm.dwp
  WORKING_DIRECTORY
    ${PROJECT_BINARY_DIR}
  DEPENDS
    SymbolsBackend)

  option(CXX_DEBUGGING_DWO_ONLY "Do not build dwp when using split dwarf" OFF)
  if(CXX_DEBUGGING_USE_SPLIT_DWARF)
    if(CXX_DEBUGGING_DWO_ONLY)
    if(EXISTS ${CMAKE_CURRENT_BINARY_DIR}/SymbolsBackend.wasm.debug.wasm.dwp)
      message(WARNING "File ${CMAKE_CURRENT_BINARY_DIR}/SymbolsBackend.wasm.debug.wasm.dwp exists from a previous build and will likely be used when debugging. This is probably not what you want.")
    endif()

    file(CREATE_LINK ${PROJECT_BINARY_DIR}/src ${CMAKE_CURRENT_BINARY_DIR}/src SYMBOLIC)
    file(CREATE_LINK ${PROJECT_BINARY_DIR}/lib ${CMAKE_CURRENT_BINARY_DIR}/lib SYMBOLIC)
    file(CREATE_LINK ${PROJECT_BINARY_DIR}/third_party ${CMAKE_CURRENT_BINARY_DIR}/third_party SYMBOLIC)
  else()
    add_custom_target(DevToolsPluginDwp ALL
      DEPENDS ${CMAKE_CURRENT_BINARY_DIR}/SymbolsBackend.wasm.debug.wasm.dwp)
  endif()
endif()

set(CXX_DEBUGGING_ARCHIVE "${PROJECT_BINARY_DIR}/cxx_debugging_extension-${CMAKE_PROJECT_VERSION}.zip")
set(CXX_DEBUGGING_INPUTS
  ${EXTENSION_BUNDLED_SOURCES}
  ${CMAKE_CURRENT_BINARY_DIR}/manifest.json
  $<TARGET_FILE:SymbolsBackend>)

foreach(RESOURCE IN LISTS EXTENSION_RESOURCES)
  list(APPEND CXX_DEBUGGING_INPUTS ${CMAKE_CURRENT_BINARY_DIR}/${RESOURCE})
endforeach()

set(CXX_DEBUGGING_DIST_FILES
  ${CXX_DEBUGGING_INPUTS}
  ${CMAKE_CURRENT_BINARY_DIR}/SymbolsBackend.wasm
)
add_custom_command(OUTPUT "${CXX_DEBUGGING_ARCHIVE}"
  COMMAND ${CMAKE_COMMAND} -E tar "cf" "${CXX_DEBUGGING_ARCHIVE}" --format=zip -- ${CXX_DEBUGGING_DIST_FILES}
  WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
  DEPENDS ${CXX_DEBUGGING_INPUTS} Bundles
  COMMENT "Zipping to ${CXX_DEBUGGING_ARCHIVE}.")

if(CMAKE_BUILD_TYPE STREQUAL "Release")
  add_custom_target(DevToolsPlugin ALL DEPENDS ${CXX_DEBUGGING_ARCHIVE} ${DEV_RESOURCES})
else()
  add_custom_target(DevToolsPlugin ALL DEPENDS ${CXX_DEBUGGING_INPUTS} ${DEV_RESOURCES})
endif()

add_custom_command(TARGET DevToolsPlugin POST_BUILD
  COMMAND ${CMAKE_COMMAND} -E make_directory ${CXX_DEBUGGING_GEN_DIR}
  COMMAND ${CMAKE_COMMAND} -E copy ${CXX_DEBUGGING_DIST_FILES} ${CXX_DEBUGGING_GEN_DIR}
)

set(EXTENSION_BUNDLED_SOURCES ${EXTENSION_BUNDLED_SOURCES} PARENT_SCOPE)
