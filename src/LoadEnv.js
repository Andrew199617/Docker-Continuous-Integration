const fs = require('fs');
const path = require('path');
const envFilePath = process.argv[3] || 'D:\\Self Taught\\React\\PortfolioSite\\.env';

const EnvVariables = [];

const localPath = path.join(process.cwd(), '.env');
let localEnv = fs.readFileSync(localPath);
localEnv = localEnv.toString();
localEnv = localEnv.split(/\n|\r\n/g);

const file = fs.readFileSync(envFilePath);
const envFile = file.toString();
const splitEnv = envFile.split(/\n|\r\n/g);

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

loop:
for (let index = 0; index < splitEnv.length; index++) {
  while(splitEnv[index].trim() === '') {
    index++;
    if(typeof splitEnv[index] === 'object' && !splitEnv[index]) {
      break loop;
    }
    else if(index >= splitEnv.length) {
      break loop;
    }
  }
  EnvVariables.push(splitEnv[index])
}

EnvVariables.push('NODE_ENV=production');

module.exports = EnvVariables;