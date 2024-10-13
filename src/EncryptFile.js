const { iv, key } = require('./Node/ProcessArguments');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const env = fs.readFileSync(path.join(__dirname, '../plain.env'));
const releaseEnv = fs.readFileSync(path.join(__dirname, '../releasePlain.env'));
let devEnv = fs.readFileSync(path.join(__dirname, '../devPlain.env'));

function encrypt(str) {
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  return cipher.update(str.trim(), 'utf8', 'hex');
}


// When copy and pasting this onto the server make sure you press insert
// before pasting sometimes the beginning is missing if you don't
// do this.
fs.writeFileSync(path.join(__dirname, '../env'), encrypt(env.toString()).toString());
fs.writeFileSync(path.join(__dirname, '../release.env'), encrypt(releaseEnv.toString()).toString());
fs.writeFileSync(path.join(__dirname, '../dev.env'), encrypt(devEnv.toString()).toString());




//
// Below used for testing encryption was written correctly.
//

// function decrypt(str) {
//   const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
//   return decipher.update(str.trim(), 'hex', 'utf8');
// }

// const devPath = path.join(process.cwd(), 'dev.env');
// devEnv = fs.readFileSync(devPath);
// devEnv = devEnv.toString();
// console.log(devEnv);
// devEnv = decrypt(devEnv);
// devEnv = devEnv.split(/\n|\r\n/g);
// console.log(devEnv);