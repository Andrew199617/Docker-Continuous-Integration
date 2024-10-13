# ENV Files
See below for how to generate these.
- Add release.env for env variables to use with the release container.
- Add dev.env for the env variables to use with the dev container.
- Add env for the env variables to use with this program.

### Create plain.env Variables
- DOCKER_USERNAME
- DOCKER_TOKEN
- DOCKER_EMAIL
- GITHUB_SECRET
- LOCAL

### Create releasePlain.env or devPlain.env
- Can be any env variable used by the program you are continuously integrating.
- Needs to be parsed into a encrypted file use node src\EncryptFile.js.

### encrypting .env files.
Run this locally to generate the encrypted env files.
node src\EncryptFile.js -key keyVal -iv ivVal
- If you create the plain.env files correctly the program will create the encrypted .env files for you.
- Use the IV and Key you generated.

#### generating IV and Key
If you want it really secure you can do something like this to generate the iv and key.
const IV = new Buffer(crypto.randomBytes(12), 'utf8');
const KEY = new Buffer(crypto.randomBytes(32), 'utf8');
You can also use whatever you want and can remember because it will be easier to start program later.

# Args
examples: node server.js -key sadm -iv hgfd -l -p
Generate key doing const IV = new Buffer(crypto.randomBytes(12), 'utf8');
Save this IV and pass it to generate the .env file.

# Required Args
- -key is used to specify encryption key used to decrypt env files.
  - You don' want to have plain text secrets on your server in case its hacked.
- -iv is used for decrypting.

# Optional Args
- -l is used to execute locally without pulling images.
  - local will also force containers to be rebuilt
- -p is used to pull images when the program is run in local mode.