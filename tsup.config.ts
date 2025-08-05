import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [ // Entry point(s)
    'src/index.ts',
  ],

  dts: {
    resolve: true,
  },

  sourcemap: true, // Generate sourcemaps
  treeshake: true, // Remove unused code

  clean: true, // Clean output directory before building
  outDir: 'dist', // Output directory

  format: ['cjs', 'esm'], // Output format(s)

  splitting: false,
  keepNames: true, // stops build from prefixing our class names with `_` in some cases

  platform: 'node',
  target: 'node22',
});
