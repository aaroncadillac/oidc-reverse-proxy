import fs from 'fs';

const evalEnvVars = (data) => {
  try {
    const varsRegex = /\${([A-Za-z_][A-Za-z0-9_]*)}|\$([A-Za-z_][A-Za-z0-9_]*)/g;
    for (const match of data.matchAll(varsRegex)) {
      const varEval = process.env[match[1] || match[2]];
      if (varEval) {
        data = data.replace(match[0], varEval);
      } else {
        console.error(`Missing env var ${match[0]} on config file`);
      }
    }
    return data;
  } catch (error) {
    console.error('Error replacing env vars', error);
  }
}
const readConfigFile = (path) => {
  try {
    let data = fs.readFileSync(path, 'utf8');
    data = evalEnvVars(data);
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading config file', error);
  }
}

export { readConfigFile }