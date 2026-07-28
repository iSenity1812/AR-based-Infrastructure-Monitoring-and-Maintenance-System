const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const nodeModulesPath = path.resolve(projectRoot, 'node_modules');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [projectRoot];
config.resolver.nodeModulesPaths = [nodeModulesPath];
config.resolver.extraNodeModules = {
  '@babel/runtime': path.resolve(nodeModulesPath, '@babel/runtime'),
};

module.exports = config;
