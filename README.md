<!-- Logo/banner here, coming soon -->
<h1 align="center">QRLink</h1>
<p align="center"><sub><i>Created by <b><a href="https://github.com/InimicalPart">@InimicalPart</a></b> on behalf of <b><a href="https://newseed.se/">NewSeed IT Solutions AB</a></b></i></sub></p>

<br>

## Description
QRLink is a system that allows someone to generate a QR-code and change where it's pointing to based on multiple factors like time, location, etc.. QRLink can also be integrated with various other systems to add custom factors.

## Management
For help with managing QRLink, please see [GuideForManaging.md](https://github.com/newseedit/dynamic-qr-link/blob/main/GuideForManaging.md)
NewSeed IT employees, if I, the creator, were no longer at service, look at the document for a detailed explanation of QRLink, its systems, and help with troubleshooting.

## Prerequisites
To run QRLink, you need to have the following installed:
- NodeJS (>=18.17.1)
- NPM (>=9.6.7)

## Documentation
You can find the OpenAPI specification file for QRLink [here](https://github.com/newseedit/dynamic-qr-link/blob/main/openapi.yml)

## Usage
### Install NPM Dependencies
To install the NPM dependencies and patch NextJS for next-ws, you can run the following command in the project's root directory:
```bash
# Install the dependencies for the API and the frontend
# A "postinstall" script is configured (in package.json) to install the required dependencies that are located in the `NextJS/` folder as well as patch NextJS.
# This has to be run in the root directory, otherwise NextJS will not be patched!
npm install
```

### Docker (recommended)
QRLink's frontend and backend can be ran via Docker.
#### Prerequisites
- Docker (>=25.0.3)
#### Usage
To create and launch both MongoQRL (a MongoDB instance with a custom made API) and QRLink's API and frontend, you can run the following command in the root of the project's directory:
```bash
docker compose up
```

### NextJS frontend & backend (:8080)
To build and run the frontend and backend for QRLink, you can run this command in the project's root directory:
```bash
# Compile and run the NextJS website (:8080)
npm run qrlink
```
Alternatively, to run both in development mode (meaning that the files are rebuilt when changes happen), you can run the following command instead:
```bash
# Watch for changes, compile the website, and run the website (:8080)
npm run qrlink:dev
```
> [!CAUTION] 
> You should **NEVER** use the development mode when running in production. This could cause major security risks.


## Information for developers
### "main" branch
The main branch is designed for people to commit when work is in progress but not ready to be submitted to the server yet or all hell comes to life.

> [!WARNING]
> Please do not upload to the server from the "main" branch. Doing so may result in a highly un-stable server edition and/or an un-stable server configuration.

### "production" branch
The production branch is specifically designed to be used for uploads. This is the branch you should choose when choosing to upload to a server. Developers, do not push code here unless you're extremely sure that it's stable. This applies to all developers - unless you're cool like this guy -> 😎.


<br>
<footer>
  <p align="center">&copy; Copyright 2024 | <a href="https://github.com/InimicalPart">InimicalPart</a> & <a href="https://newseed.se/">NewSeed IT Solutions AB</a> - All rights reserved.
</footer>
