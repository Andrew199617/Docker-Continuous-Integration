const Docker = require('./Docker');
const { pull } = require('./Node/ProcessArguments');

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
    await Docker.updateContainers();
  }

  console.log('Checking for new Images/Containers in', timeout);
  setTimeout(execute, timeout);
  timeout = Math.min(timeout + 2000, maxTimeout);
}

async function run() {
  if(pull) {
    await Docker.pullImages();
  }

  process.env.LOCAL = true;
  execute(false);
}

module.exports = run;