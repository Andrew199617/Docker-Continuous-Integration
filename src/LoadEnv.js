const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { iv, key } = require('./Node/ProcessArguments');

function decrypt(str) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  return decipher.update(str.trim(), 'hex', 'utf8');
}

console.log('Getting Local Env.');
const localPath = path.join(process.cwd(), '.env');
let localEnv = fs.readFileSync(localPath);
localEnv = localEnv.toString();
localEnv = decrypt(localEnv);
localEnv = localEnv.split(/\n|\r\n/g);
console.log('Got Local Env.');

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

console.log('Getting Dev Env.');
const devPath = path.join(process.cwd(), 'dev.env');
let devEnv = fs.readFileSync(devPath);
devEnv = devEnv.toString();
devEnv = decrypt(devEnv);
devEnv = devEnv.split(/\n|\r\n/g);
console.log('Got Dev Env.');

const ReleaseEnvVariables = [];

console.log('Getting Release Env.');
const releasePath = path.join(process.cwd(), 'release.env');
let releaseEnv = fs.readFileSync(releasePath);
releaseEnv = releaseEnv.toString();
releaseEnv = decrypt(releaseEnv);
releaseEnv = releaseEnv.split(/\n|\r\n/g);
console.log('Got Release Env.');

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