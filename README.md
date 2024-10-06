# ENV Files
- Add release.env for env variables to use with the release container.
- Add dev.env for the env variables to sue with the dev container.

### Variables
- DOCKER_USERNAME
- DOCKER_TOKEN
- DOCKER_EMAIL

# Args
examples: -key sadm -iv hgfd -l -p

# Required Args
- -key is used to specify encryption key used to decrypt env files.
  - You don' want to have plain text secrets on your server in case its hacked.
- -iv is used for decrypting.

# Optional Args
- -l is used to execute locally without pulling images.
  - local will also force containers to be rebuilt
- -p is used to pull images when the program is run in local mode.