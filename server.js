const http = require('http');
const Docker = require('./src/Docker');

require('./src/LoadEnv');

const PORT = 8080;
const REPO_NAME = 'LearnGameDevelopment';

async function initializeDocker() {

  if(process.argv[2] && process.argv[2] === 'local') {
    await require('./src/Local')();
  }
  else {
    await Docker.initialize();
  }

  http
    .createServer((req, res) => {
      req.on('data', chunk => {

        const body = JSON.parse(chunk);

        if(body.repository.name !== REPO_NAME) {
          res.statusCode = 404;
          res.end();
          return;
        }

        if(body.push_data.pusher !== process.env.DOCKER_USERNAME) {
          res.statusCode = 500;
          res.end();
          return;
        }

        console.log('Parsed Push from Docker!');
        res.statusCode = 200;
        res.end();

        Docker.pullImage(body.push_data.tag);
      });
    })
    .listen(PORT);
}

initializeDocker();