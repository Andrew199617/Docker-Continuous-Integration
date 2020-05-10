const Docker = require('./Docker');

let timeout = 2000;
const maxTimeout = 30000;

/**
* @description Run locally to update container if a new build happens.
*/
async function execute() {
  await Docker.loadContainers();
  const newImageAdded = await Docker.loadImages();
  if(newImageAdded) {
    timeout = 2000;
    await Docker.updateContainers(Docker.config.master);
    await Docker.updateContainers(Docker.config.dev);
  }

  console.log('Checking for new Images/Containers in', timeout);
  setTimeout(execute, timeout);
  timeout = Math.min(timeout + 2000, maxTimeout);
}

execute();