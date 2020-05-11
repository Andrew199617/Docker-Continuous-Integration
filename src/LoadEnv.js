const fs = require('fs');
const path = require('path');

const localPath = path.join(process.cwd(), '.env');
let localEnv = fs.readFileSync(localPath);
localEnv = localEnv.toString();
localEnv = localEnv.split(/\n|\r\n/g);

loop:
for (let index = 0; index < localEnv.length; index++) {
  while(localEnv[index].trim() === '') {
    index++;
    if(typeof localEnv[index] === 'object' && !localEnv[index]) {
      break loop;
    }
    else if(index >= localEnv.length) {
      break loop;
    }
  }
  const key = localEnv[index].replace(/=.*/, '');
  const value = localEnv[index].replace(/.*=/, '');
  process.env[key.trim()] = value.trim();
}

const DevEnvVariables = [];

const devPath = path.join(process.cwd(), 'dev.env');
let devEnv = fs.readFileSync(devPath);
devEnv = devEnv.toString();
devEnv = devEnv.split(/\n|\r\n/g);

const ReleaseEnvVariables = [];

const releasePath = path.join(process.cwd(), 'release.env');
let releaseEnv = fs.readFileSync(releasePath);
releaseEnv = releaseEnv.toString();
releaseEnv = releaseEnv.split(/\n|\r\n/g);

function ParseEnvFile(envFile, array) {
  loop:
  for (let index = 0; index < envFile.length; index++) {
    while(envFile[index].trim() === '') {
      index++;
      if(typeof envFile[index] === 'object' && !envFile[index]) {
        break loop;
      }
      else if(index >= envFile.length) {
        break loop;
      }
    }

    array.push(envFile[index])
  }

  array.push('NODE_ENV=production');
}

ParseEnvFile(devEnv, DevEnvVariables);
ParseEnvFile(releaseEnv, ReleaseEnvVariables);


module.exports = {
  DevEnvVariables,
  ReleaseEnvVariables
};