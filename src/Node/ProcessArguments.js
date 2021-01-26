const LogLevels = require('../LogLevels');

let iv = null;
let key = null;
process.env.logLevel = LogLevels.DEBUG;
for(let i = 2; i < process.argv.length; ++i) {
  if(process.argv[i].includes('-key')) {
    key = process.argv[i + 1];
  }
  else if(process.argv[i].includes('-iv')) {
    iv = process.argv[i + 1];
  }
  else if(process.argv[i].includes('--logs')) {
    process.env.logLevel = process.argv[i + 1];
  }
}

if(!key || !iv) {
  console.log('Iv or Key is missing!');
  process.exit(1);
}

module.exports = {
  key,
  iv
}