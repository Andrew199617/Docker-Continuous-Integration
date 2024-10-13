const Docker = require('dockerode');
const docker = new Docker();

const LogLevels = require('./LogLevels');
const { config } = require('../DockerConfig.js');

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

/**
 * @description Get the config info for a container name.
 * @param {string} name lgd2 will get dev config.
 * @returns {{
  tag: string,
  names: {
      [name: string]: number;
  };
  volumeBinds: string[];
  containerStartedText: string;
  envVariables: any[];
 }}
 */
function getConfigForContainerName(name) {
  for(let i = 0; i < configKeys.length; ++i) {
    if(config[configKeys[i]].names[name]) {
      return config[configKeys[i]];
    }
  }

  console.log('Could not find config info for:', name);
  return null;
}

async function removeContainer(id) {
  try {
    console.log('Removed Container:', id);
    await docker.getContainer(id).remove({ force: true });

    for (const container in activeContainers) {
      if(activeContainers[container].ImageID === id) {
        delete activeContainers[container];
      }
    }
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

      activeContainers.length = 0;
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
    if(activeContainers[container].ImageID === id) {
      await removeContainer(activeContainers[container].Id);
    }
  }

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
          console.log('Removing Image without tags.');
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
      const containerName = container.Names[0].substring(1);
      const portBindings = container.Ports.splice(1);
      console.log(`Recreating ${containerName} with Ports ${portBindings}`);
      await createContainer(containerName, container.Image, portBindings);
      continue;
    }

    const configInfo = getConfigForContainerName(container.Names[0].substring(1));
    if(configInfo && configInfo.tag !== activeImages[container.Image].RepoTags[0]) {
      console.log(`${container.Id} is using name in config but has wrong image!`)
      await removeContainer(container.Id);
    }
  }
  console.log('Done Clearing Out Of Date Containers!\n');
}

/**
 * @description Create a container and log output waiting
 * for a success indication in logs of container.
 * @param {string} containerName name of container to build.
 * @param {string} imageName image to use to create container.
 * @param {{[ container: string ] : string}} containerPortBindings ports the container will use.
 * @returns {boolean} Whether the container succeeded in building.
 */
async function createContainer(containerName, imageName, containerPortBindings) {
  const configInfo = getConfigForContainerName(containerName);

  const envVariables = configInfo ? configInfo.envVariables : [];
  const cpuPercent = 0.33;
  const mb = 1000000;

  // We need more process power when we build next.js
  // after building we can limit memory and cpu.
  const releaseOptions = {
    Memory: 250 * mb,
    KernelMemory: 1000 * mb,
    MemorySwap: -1,
    MemorySwappiness: 1,
    MemoryReservation: 150 * mb,
    CpuPeriod: 100000,
    CpuQuota: 100000 * cpuPercent,
    RestartPolicy: { Name: "unless-stopped" }
  }

  const options = {
    Image: imageName,
    name: containerName,
    env: envVariables,
    ExposedPorts: { },
    HostConfig: {
      CpuPeriod: 100000,
      CpuQuota: 100000,
      PortBindings: containerPortBindings
    }
  };

  if(typeof configInfo.volumeBinds !== 'undefined') {
    console.log('Using Volumes', configInfo.volumeBinds);
    options.HostConfig.Binds = configInfo.volumeBinds;
  }

  try {
    console.log(`Creating ${containerName} based off ${imageName} with PortBindings`, containerPortBindings)
    const newContainer = await docker.createContainer(options);
    await newContainer.start();

    const timeout = 20 * 1000;
    var logOpts = {
      stdout: true,
      stderr: true,
      follow: true,
      until: Date.now() + timeout
    };
    const stream = await newContainer.logs(logOpts);
    const succeeded = await new Promise((resolve, reject) => {

      function failed() {
        interval.unref();
        resolve(false);
      }

      const interval = setTimeout(failed, timeout);

      function onData(data) {
        const logLine = data.trim()
          .split(/\n|\r\n/)
          .map(val => `\x1b[34m${containerName}: \x1b[0m${val.substring(8)}`)
          .join('\n');

        console.log(logLine);

        // Container is ready.
        if(logLine.includes(configInfo.containerStartedText)) {
          interval.unref();
          resolve(true);
        }
        else if(logLine.includes('Next Build Failed')) {
          failed();
        }
      }

      stream.setEncoding('utf8');
      stream.on('data', onData);
    });

    if(succeeded) {
      console.log('Build Succeeded, updating options!');
      await newContainer.update(releaseOptions);
    }
    else {
      console.log('Build Failed, removing container!');
      await removeContainer(newContainer.id);
    }
  }
  catch (err) {
    console.error('ERROR:', err.message);
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

    if(activeImages[container.Image].Id === container.ImageID
      && !process.env.LOCAL) {
      const name = container.Names[0].substring(1);
      console.log(name, ':', container.Id, ': Is already up to date!');
      delete containersToCreate[name];
      continue;
    }

    await removeContainer(container.Id);
  }

  containersToCreate = Object.keys(containersToCreate);
  for (let index = 0; index < containersToCreate.length; index++) {
    const containerName = containersToCreate[index];
    await createContainer(containerName, branch.tag, branch.names[containerName]);
  }

  console.log('Done Updating Containers!\n');
}

/**
 * @description Pull an image from docker.
 * @param {string} tag
 */
async function pullImage(tag) {
  let branch = GetBranchFromTag(tag);

  if(!branch) {
    console.error(`Could not find tag: ${tag}!`);
    return;
  }

  let pulledNew = true;
  await new Promise((resolve, reject) => {
    docker.pull(branch.tag, { authconfig: auth }, function (err, stream) {
      function checkUpToDate(event) {
        if(event.status && event.status.includes('Image is up to date for')) {
          console.log('Image Already up to date.');
          pulledNew = false;
        }
      }

      function onFinished(err, output) {
        if(err) {
          console.error(err);
        }

        console.log('Pull Complete!\n', output);
        resolve();
      }

      if(err) {
        console.error(err);
        pulledNew = false;
        reject(err);
        return;
      }

      console.log('Pulling with tag:', tag);
      if(process.env.logLevel === LogLevels.DEBUG) {
        docker.modem.followProgress(stream, onFinished, onProgress);
      }
      else {
        docker.modem.followProgress(stream, onFinished, checkUpToDate);
      }

      let lastLineWasProgress = false;
      const lastLogs = { Downloading: '', Extracting: '' };
      const compoundOutput = Object.keys(lastLogs);

      function onProgress(event) {
        checkUpToDate(event);

        if(!event.progress) {
          lastLineWasProgress = false;
          console.log(event.status);
          return;
        }

        if(!compoundOutput.includes(event.status)) {
          throw new Error('Only Download/Extracting have progress.');
        }

        if(lastLineWasProgress) {
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
    });
  });

  if(pulledNew) {
    await loadContainers();
    await loadImages();
    await updateContainers(branch);
  }

  return pulledNew;
}

function GetBranchFromTag(tag) {
  let branch = null;
  for (let i = 0; i < configKeys.length; ++i) {
    if (config[configKeys[i]].tag === tag
      || config[configKeys[i]].tag === `${process.env.DOCKER_USERNAME}/${tag}`
      || config[configKeys[i]].tag === `${process.env.DOCKER_USERNAME}/lgd:${tag}`) {
      branch = config[configKeys[i]];
      break;
    }
  }

  return branch;
}

/**
 * @description Pull all images in Config.
 */
async function pullImages() {
  let pulledNew = false;
  for(let i = 0; i < configKeys.length; ++i) {
    const branch = config[configKeys[i]].tag;
    try {
      pulledNew = await pullImage(branch) || pulledNew;
    }
    catch(err) {
      console.error('Error occurred pulling: ', branch);
      console.error(err);
    }
  }

  return pulledNew;
}

async function initialize() {
  console.log('Initializing Docker Containers/Images!');
  const pulledNew = await pullImages();
  if(!pulledNew) {
    await loadContainers();
    await loadImages();
    await updateContainers(branch);
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