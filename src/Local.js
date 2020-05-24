const Docker = require('./Docker');

let timeout = 2000;
const maxTimeout = 30000;

/**
* @description Run locally to update container if a new build happens.
*/
async function execute(pulledNew) {
  await Docker.loadContainers();
  const newImageAdded = await Docker.loadImages();
  if(newImageAdded || pulledNew) {
    timeout = 2000;
    const configKeys = Object.keys(Docker.config);
    for(let i = 0; i < configKeys.length; ++i) {
      await Docker.updateContainers(Docker.config[configKeys[i]]);
    }
  }

  console.log('Checking for new Images/Containers in', timeout);
  setTimeout(execute, timeout);
  timeout = Math.min(timeout + 2000, maxTimeout);
}

async function run() {
  if(process.argv[3] && process.argv[3] === '-p') {
    await Docker.pullImages();
  }

  process.env.LOCAL = true;
  execute(false);
}

module.exports = run;