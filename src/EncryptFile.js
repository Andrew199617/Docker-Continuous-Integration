const { iv, key } = require('./Node/ProcessArguments');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const releaseEnv = fs.readFileSync(path.join(__dirname, '../release copy.env'));
const devEnv = fs.readFileSync(path.join(__dirname, '../dev copy.env'));

function encrypt(str) {
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  return cipher.update(str.trim(), 'utf8', 'hex');
}

fs.writeFileSync(path.join(__dirname, '../release.env'), encrypt(releaseEnv.toString()));
fs.writeFileSync(path.join(__dirname, '../dev.env'), encrypt(devEnv.toString()));