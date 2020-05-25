const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let iv = null;
let key = null;
for(let i = 2; i < process.argv.length; ++i) {
  if(process.argv[i].includes('-key')) {
    key = process.argv[i + 1];
  }
  else if(process.argv[i].includes('-iv')) {
    iv = process.argv[i + 1];
  }
}

if(!key || !iv) {
  console.log('Iv or Key is missing!');
  process.exit(1);
}

function decrypt(str) {
  // const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  // let encrypted = cipher.update(str, 'utf-8', 'hex');
  // encrypted += cipher.final('hex');
  // console.log('Encrypted:', encrypted);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  return decipher.update(str.trim(), 'hex', 'utf8');
}

const localPath = path.join(process.cwd(), '.env');
let localEnv = fs.readFileSync(localPath);
localEnv = localEnv.toString();
localEnv = decrypt(localEnv);
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
devEnv = decrypt(devEnv);
devEnv = devEnv.split(/\n|\r\n/g);

const ReleaseEnvVariables = [];

const releasePath = path.join(process.cwd(), 'release.env');
let releaseEnv = fs.readFileSync(releasePath);
releaseEnv = releaseEnv.toString();
releaseEnv = decrypt(releaseEnv);
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