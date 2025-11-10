import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
      banner: '"use client";',
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
      banner: '"use client";',
    },
  ],
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    '@clippyjs/core',
  ],
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: 'dist',
      rootDir: 'src',
      outputToFilesystem: true,
    }),
    copy({
      targets: [
        { src: '../core/assets', dest: 'dist' },
        { src: 'src/styles.css', dest: 'dist' },
      ],
    }),
    terser({
      format: {
        preamble: '"use client";',
      },
    }),
  ],
};
