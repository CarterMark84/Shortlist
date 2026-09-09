/**
 * Metro config for an npm-workspaces monorepo.
 *
 * Two things are needed beyond the Expo defaults:
 *  - `watchFolders` so edits to packages/shared trigger a rebuild
 *  - `nodeModulesPaths` so hoisted dependencies at the workspace root resolve
 *
 * `disableHierarchicalLookup` stops Metro walking further up the tree, which
 * avoids it accidentally resolving two copies of React.
 */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
