module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    "(.+/WasmParser).js": "$1.ts",
  },
};