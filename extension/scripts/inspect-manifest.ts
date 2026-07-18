import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('.output/chrome-mv3/manifest.json', 'utf8')) as {
  permissions?: string[];
  host_permissions?: string[];
  content_scripts?: unknown[];
};
const permissions = manifest.permissions ?? [];
const forbidden = ['activeTab', 'tabs', 'scripting', 'debugger'];
const found = permissions.filter((permission) => forbidden.includes(permission));

if (found.length) throw new Error(`Forbidden Phase 2 permissions: ${found.join(', ')}`);
const expectedHosts = ['http://127.0.0.1:8000/*'];
const hosts = manifest.host_permissions ?? [];
if (hosts.sort().join(',') !== expectedHosts.sort().join(',')) {
  throw new Error(`Unexpected Phase 2 host permission set: ${hosts.join(', ')}`);
}
if (manifest.content_scripts?.length) throw new Error('Phase 2 must not include content scripts');

const expected = ['sidePanel', 'storage'];
if (permissions.sort().join(',') !== expected.sort().join(',')) {
  throw new Error(`Unexpected Phase 2 permission set: ${permissions.join(', ')}`);
}
console.log(
  `Validated manifest permissions: ${permissions.join(', ')}; hosts: ${hosts.join(', ')}`,
);
