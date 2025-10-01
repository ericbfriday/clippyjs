import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

const external = ["react", "react-dom"];

export default [
  // ESM build
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.esm.js",
      format: "es",
      sourcemap: true,
      interop: "auto",
    },
    external,
    plugins: [
      nodeResolve({ preferBuiltins: false }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "dist",
        rootDir: "src",
        outputToFilesystem: true,
      }),
    ],
  },
  // CommonJS build
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.js",
      format: "cjs",
      sourcemap: true,
      interop: "auto",
    },
    external,
    plugins: [
      nodeResolve({ preferBuiltins: false }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "dist",
        rootDir: "src",
        outputToFilesystem: true,
      }),
    ],
  },
  // UMD build (for browser)
  {
    input: "src/index.ts",
    output: {
      file: "dist/clippy.min.js",
      format: "umd",
      name: "clippy",
      sourcemap: true,
      globals: {
        react: "React",
        "react-dom": "ReactDOM",
      },
      interop: "auto",
    },
    external,
    plugins: [
      nodeResolve({ preferBuiltins: false }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "dist",
        rootDir: "src",
        outputToFilesystem: true,
      }),
      terser(),
    ],
  },
];
