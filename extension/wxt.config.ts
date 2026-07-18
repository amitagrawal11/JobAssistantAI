import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Job Copilot',
    description:
      'Review and prepare job applications with user-controlled assistance.',
    permissions: ['sidePanel', 'storage'],
    host_permissions: ['http://127.0.0.1:8000/*'],
    action: {
      default_title: 'Open Job Copilot',
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
