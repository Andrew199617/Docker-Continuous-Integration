const Docker = require('dockerode');
const docker = new Docker();

const EnvVariables = require('./LoadEnv');

/**
 * @description Info for creating containers.
 */
const config = {
  dev: {
    tag: `${process.env.DOCKER_USERNAME}/lgd:latest-dev`,
    names: {
      lgd2: 6003,
      lgd3: 6004
    }
  },
  master: {
    tag: `${process.env.DOCKER_USERNAME}/lgd:latest`,
    names: {
      lgd0: 6001,
      lgd1: 6002
    }
  }
}
Object.freeze(config);
Object.seal(config);
const configKeys = Object.keys(config);

const auth = {
  username: process.env.DOCKER_USERNAME,
  password: process.env.DOCKER_TOKEN,
  auth: '',
  email: process.env.DOCKER_EMAIL,
  serveraddress: 'https://index.docker.io/v1'
};

/** @type {Dockerode.ContainerInfo[]} */
const activeContainers = [];

/** @type {Dockerode.ImageInfo} */
const activeImages = {
  imagesWithContainers: []
};

const States = {
  Exited: 'exited'
}

async function removeContainer(id) {
  try {
    console.log('Removed Container:', id);
    await docker.getContainer(id).remove({ force: true });
  }
  catch(err) {
    console.error(err);
  }
}

/**
 * @description Load all containers and remove any that have exited.
 */
function loadContainers() {
  console.log('Loading Containers!');
  return new Promise((resolve, reject) => {
    docker.listContainers({ all: true }, async function (err, containers) {
      if(err) {
        console.error('ERROR', err);
        reject(err);
        return;
      }

      for (let index = 0; index < containers.length; index++) {
        const containerInfo = containers[index];
        if(containerInfo.State === States.Exited) {
          await removeContainer(containerInfo.Id);
        }
        else {
          activeContainers.push(containerInfo);
        }
      }

      console.log('Done Loading Containers!');
      resolve();
    });
  });
}

async function removeImage(id) {
  for (const container in activeContainers) {
    if(container.ImageID === id) {
      await removeContainer(container.Id);
      return;
    }
  };

  try {
    console.log('Removed Image', id);
    await docker.getImage(id.replace('sha256:', '')).remove();
  }
  catch(err) {
    console.error(err);
  }
}

/**
 * @description load all images and delete all but the newest image for each tag.
 */
function loadImages() {
  console.log('Loading Images!');
  return new Promise((resolve, reject) => {
    let newImageAdded = false;
    docker.listImages(async function (err, images) {
      if(err) {
        console.error('ERROR', err);
        reject(err);
        return;
      }

      for (let index = 0; index < images.length; index++) {
        const imageInfo = images[index];

        if(!imageInfo.RepoTags) {
          await removeImage(imageInfo.Id);
          continue;
        }

        const latestForRepo = activeImages[imageInfo.RepoTags[0]];
        if(!latestForRepo) {
          activeImages[imageInfo.RepoTags[0]] = imageInfo;
          newImageAdded = true;
        }
        else if(latestForRepo.Id === imageInfo.Id) {
          continue;
        }
        else if(imageInfo.Created < latestForRepo.Created) {
          await removeImage(imageInfo.Id);
        }
        else {
          await removeImage(latestForRepo.Id);
          activeImages[imageInfo.RepoTags[0]] = imageInfo;
          newImageAdded = true;
        }
      }

      console.log('Done Loading Images!');

      if(newImageAdded) {
        await clearOutOfDateContainers();
      }

      resolve(newImageAdded);
    });
  });
}

/**
* @description Clears all containers that don't reference an Image
* in activeImages.
*/
async function clearOutOfDateContainers() {
  console.log('Clearing Out Of Date Containers!');
  for (let index = 0; index < activeContainers.length; index++) {
    const container = activeContainers[index];

    // Container has no image, should not be possible.
    if(!activeImages[container.Image]) {
      await removeContainer(container.Id);
      continue;
    }

    // Container referencing an image that has no tag.
    // All images must be tagged.
    if(!activeImages[container.Image].RepoTags) {
      await removeContainer(container.Id);
      continue;
    }

    // Container is referencing an older Image.
    if(activeImages[container.Image].Id !== container.ImageID) {
      await removeContainer(container.Id);
      const port = container.Ports[1].PublicPort;
      await createContainer(container.Names[0].substring(1), container.Image, port);
      continue;
    }

    let usingConfigTag = false;
    for(let i = 0; i < configKeys.length; ++i) {
      if(config[configKeys[i]].names[container.Names[0].substring(1)]) {
        if(config[configKeys[i]].tag !== activeImages[container.Image].RepoTags[0]) {
          usingConfigTag = true;
          break;
        }
      }
    }

    if(usingConfigTag) {
      console.log(`${container.Id} is using name in config!`)
      await removeContainer(container.Id);
    }
  }
  console.log('Done Clearing Out Of Date Containers!\n');
}

async function createContainer(containerName, imageName, containerPort) {
  const port = `${containerPort}/tcp`;
  const cpuPercent = 0.20;
  const mb = 1000000;

  const options = {
    Image: imageName,
    name: containerName,
    env: EnvVariables,
    ExposedPorts: { },
    HostConfig: {
      // Memory: 200 * mb,
      KernelMemory: 1200 * mb,
      MemorySwap: -1,
      // MemorySwap: 2000 * mb,
      MemorySwappiness: 50,
      // MemoryReservation: 100 * mb,
      OomKillDisable: true,
      CpuPeriod: 100000,
      CpuQuota: 100000 * cpuPercent,
      PortBindings: {  }
    }
  };
  // options.ExposedPorts[port] = {};
  options.HostConfig.PortBindings['3000/tcp'] = [{ HostPort: port }];

  try {
    console.log(`Creating ${containerName} based off ${imageName} on Port ${port}!`)
    const newContainer = await docker.createContainer(options);
    newContainer.start();
  }
  catch (err) {
    console.log('ERROR:', err);
  }
}

/**
 * @description Remove all containers for a tag and create them again.
 * @param {{ tag: string, names: { [key: string]: number } }} branch
 */
async function updateContainers(branch) {
  if(typeof activeImages[branch.tag] === 'undefined') {
    console.log(`Updating Containers for ${branch.tag}!`);
    console.log(`Image ${branch.tag} did not exist!`);
    console.log('Done Updating Containers!\n');
    return;
  }

  console.log(`Updating Containers for ${branch.tag}!`);

  let containersToCreate = Object.assign({}, branch.names);
  for (let index = 0; index < activeContainers.length; index++) {
    const container = activeContainers[index];
    if(branch.tag !== container.Image) {
      continue;
    }

    if(activeImages[container.Image].Id === container.ImageID) {
      const name = container.Names[0].substring(1);
      console.log(name, ':', container.Id, ': Is already up to date!');
      delete containersToCreate[name];
      continue;
    }

    await removeContainer(container.Id);
  }

  containersToCreate = Object.keys(containersToCreate);
  for (let index = 0; index < containersToCreate.length; index++) {
    const container = containersToCreate[index];
    await createContainer(container, branch.tag, branch.names[container]);
  }

  console.log('Done Updating Containers!\n');
}

/**
 * @description Pull an image from docker.
 * @param {string} tag
 */
async function pullImage(tag) {
  let branch = null;
  for(let i = 0; i < configKeys.length; ++i) {
    if(config[configKeys[i]].tag === tag) {
      branch = config[configKeys[i]];
      break;
    }
  }

  if(!branch) {
    console.error('Could not find tag!');
    return;
  }

  let pulledNew = true;
  await new Promise((resolve, reject) => {
    docker.pull(tag, { authconfig: auth }, function (err, stream) {
      if(err) {
        console.error(err);
        pulledNew = false;
        reject(err);
        return;
      }

      console.log('Pulling with tag:', tag);
      docker.modem.followProgress(stream, onFinished, onProgress);

      function onFinished(err, output) {
        console.log('Pull Complete!\n');
        resolve();
      }

      let lastLineWasProgress = false;
      const lastLogs = { Downloading: '', Extracting: '' };
      const compoundOutput = Object.keys(lastLogs);

      function onProgress(event) {
        if(event.status && event.status.includes('Image is up to date for')) {
          pulledNew = false;
        }

        if(event.progress) {
          if(compoundOutput.includes(event.status)) {
            if(lastLineWasProgress && process.stdout.moveCursor) {
              console.clear();
              console.log('Pulling from', tag);
            }

            let output = '';
            for (let i = 0; i < compoundOutput.length; i++) {
              if(event.status === compoundOutput[i]){
                output += `${event.status} ${event.progress}`;
                lastLogs[event.status] = `${event.status} ${event.progress}`;
              }
              else {
                output += lastLogs[compoundOutput[i]] || compoundOutput[i];
              }

              output += i === 0 ? '\n' : '';
            }

            console.log(output);
            lastLineWasProgress = true;
          }
          else {
            throw new Error('Only Download/Extracting have progress.');
          }
        }
        else {
          lastLineWasProgress = false;
          console.log(event.status)
        }
      }
    });
  });

  if(pulledNew) {
    await loadContainers();
    await loadImages();
    await updateContainers(branch);
  }

  return pulledNew;
}

/**
 * @description Pull all images in Config.
 */
async function pullImages() {
  let pulledNew = false;
  for(let i = 0; i < configKeys.length; ++i) {
    const branch = config[configKeys[i]].tag;
    pulledNew = await pullImage(branch) || pulledNew;
  }

  return pulledNew;
}

async function initialize() {
  console.log('Initalizing Docker Containers/Images!');
  const pulledNew = await pullImages();
  if(!pulledNew) {
    await loadContainers();
    await loadImages();
  }
}

module.exports = {
  initialize,
  pullImage,
  pullImages,
  loadImages,
  loadContainers,
  updateContainers,
  config
}