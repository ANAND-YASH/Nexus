import base, { globals } from '@nexus/config/eslint/base';
import { defineConfig } from 'eslint/config';

export default defineConfig(base, {
  languageOptions: {
    globals: { ...globals.node, ...globals.jest },
  },
});
