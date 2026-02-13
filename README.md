
<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="100" alt="Nest Logo" /></a>
</p>

# Organization MS


## Description

This repository is made for manage the XRPL transactions in the Rinne system. 

The MS uses rabbitMQ for the communication with other modules. (implemented)

The organizations holding the team members and the Users (Members) and their relations along with the organizations.


[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Installation

```bash
$ npm install
```

Or the similar part in docker compose
TODO: add docker compose local dev-env variables, from .env

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Development


### Install environment 

#### Requirements
- Docker - https://www.docker.com/products/docker-desktop/
- Optional:
  - node: v20.13.1
  - Node version manager `nvm`


#### First Install, or re install: 
Installing all dependencies, and requirements and the migrations
```sh
$ task install
```

#### Daily usage:

Start the environment in debug mode

```sh
$ task work:start
```

To shut down the env, this will preserve the database
```sh
$ task work:done
```

##### To make actions you can do the next:


```sh
# Login into the docker container, so you can add command install, run test, etc...
$ task login

$ npm run test
```

#### Debugging: 

```bash
# Start dev environment with with test credentials.
# This also open up for debugging, so you can use your debugger 
$ docker-compose up
# Or if you started with: 
$ task work:start
```

![Attach debugger for breakpoints](./documentation/images/attach-debugger.png "Attach debugger for breakpoints")


## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov

# run lints
$ npm run lint
# run lints
$ npm run format
```

https://docs.nestjs.com/microservices/rabbitmq

