import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const readConfigFile = (path) => {
  try {
    const config = require(path);
    return config;
  } catch (error) {
    console.error('Error reading config file', error);
  }
}

export { readConfigFile }