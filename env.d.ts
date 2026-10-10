/// <reference types="vitepress/client" />

/**
 * php-wasm ships no type declarations. Both entry points expose the same
 * `PhpBase` subclass — `PhpWeb` in the browser, `PhpNode` under Node for the
 * integration tests — and `createPhpAdapter` narrows either one to the
 * `PhpWasmModule` structural type it actually needs. Declaring the constructor
 * as unknown-shaped keeps that cast explicit at the call site rather than
 * letting an implicit `any` spread from the import.
 */
declare module 'php-wasm/PhpWeb.mjs' {
  export const PhpWeb: new (args?: Record<string, unknown>) => unknown
}

declare module 'php-wasm/PhpNode.mjs' {
  export const PhpNode: new (args?: Record<string, unknown>) => unknown
}
