const http = require('http');
const Docker = require('./src/Docker');
const { local } = require('./src/Node/ProcessArguments');

const runLocal = require('./src/Local');

require('./src/LoadEnv');

const PORT = 8081;

// Name of Repo on Docker Hub.
const REPO_NAME = 'lgd';

async function initializeDocker() {

  if(local) {
    await runLocal();
  }
  else {
    await Docker.initialize();
  }

  http
    .createServer((req, res) => {
      req.on('data', chunk => {

        let body = null;
        try {
          body = JSON.parse(chunk);
        }
        catch(err) {
          console.error('Invalid Body sent!');
          console.error(err);
          res.statusCode = 404;
          res.end();
          return;
        }

        if(typeof body.repository === 'undefined' || !body.repository) {
          console.error('Invalid Body sent!');
          res.statusCode = 404;
          res.end();
          return;
        }

        if(body.repository.name !== REPO_NAME) {
          console.error('Wrong repo name! Actual:', body.repository.name, 'Expected:', REPO_NAME);
          res.statusCode = 404;
          res.end();
          return;
        }

        if(body.push_data.pusher !== process.env.DOCKER_USERNAME) {
          console.error('Wrong pusher! Actual:', body.push_data.pusher, 'Expected:', process.env.DOCKER_USERNAME);
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