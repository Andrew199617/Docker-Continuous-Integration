const EnvVariables = require('./src/LoadEnv');

/**
 * @description Info for creating containers.
 */
const config = {
  dev: {
    tag: `${process.env.DOCKER_USERNAME}/lgd:latest-dev`,
    names: {
      dev0: { '5000/tcp': [{ HostPort: '6006/tcp' }] }
      // dev1: { '5000/tcp': [{ HostPort: '6007/tcp' }] }
      // dev2: { '5000/tcp': [{ HostPort: '6008/tcp' }] }
    },
    containerStartedText: 'LGD latest-dev is running on port',
    envVariables: EnvVariables.DevEnvVariables
  },
  master: {
    tag: `${process.env.DOCKER_USERNAME}/lgd:release`,
    names: {
      lgd0: { '5000/tcp': [{ HostPort: '6001/tcp' }] }
      // lgd1: { '5000/tcp': [{ HostPort: '6002/tcp' }] },
      // lgd2: { '5000/tcp': [{ HostPort: '6003/tcp' }] }
      // lgd3: { '5000/tcp': [{ HostPort: '6004/tcp' }] },
      // lgd4: { '5000/tcp': [{ HostPort: '6005/tcp' }] }
    },
    containerStartedText: 'LGD release is running on port',
    envVariables: EnvVariables.ReleaseEnvVariables
  },
  server: {
    tag: `${process.env.DOCKER_USERNAME}/lgd:server`,
    names: {
      server: {
        '8082/tcp': [{ HostIp: '172.31.18.195', HostPort: '8082/tcp' }],
        '6010/tcp': [{ HostIp: '172.31.18.195', HostPort: '80/tcp' }],
        '6011/tcp': [{ HostIp: '[2600:1f14:1a8e:7702:6d4b:65a6:c609:4e06]', HostPort: '80/tcp' }],
        '6013/tcp': [{ HostIp: '[2600:1f14:1a8e:7702:6d4b:65a6:c609:4e06]', HostPort: '443/tcp' }],
        '6012/tcp': [{ HostIp: '172.31.18.195', HostPort: '443/tcp' }]
      }
    },
    volumeBinds: [
      'nginx:/home/lgd/nginx/',
      'certificates:/home/lgd/certificates/'
    ],
    containerStartedText: 'Server is listening on '
  }
}

module.exports = { config }