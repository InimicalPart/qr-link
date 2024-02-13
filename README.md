<h1 align="center">DynamicQR</h1>
<p align="center"><sub><i>Created by <b><a href="https://github.com/InimicalPart">@InimicalPart</a></b> on the behalf of <b><a href="https://newseed.se/">NewSeed IT Solutions AB</a></b></i></sub></p>

<br>

## Description
DynamicQR is a system that allows someone to generate a QR-code and change where it's pointing to based on multiple factors like time, location, etc.. DynamicQR can also be integrated with various other systems to add custom factors.

## Prerequisites
To run DynamicQR, you need to have the following installed:
- NodeJS (>=18.17.1)
- NPM (>=9.6.7)

## Documentation
You can find the OpenAPI specification file for DynamicQR [here](https://github.com/newseedit/dynamic-qr-link/blob/main/openapi.yml)

## Usage
### Install NPM Dependencies
To install the NPM dependencies for both the DynamicQR API and the frontend, you can run the following command in the project's root directory:
```bash
# Install the dependencies for the API and the frontend
# A "postinstall" script is configured (in package.json) to also install the required dependencies in the `frontend/` folder.
npm install
```

### API server
To start the API server, run the following command in the project's root directory:
```bash
# Compile and run the API (:3000)
npm run build_and_run
```
Alternatively, to run the API server in development mode (meaning that the file is rebuilt when changes happen), you can run the following command instead:
```bash
# Watch for changes and run the API (:3000)
npm run watch
```

### NextJS frontend
To build and run the frontend for DynamicQR, you can run this command in the `frontend/` directory:
```bash
# Compile and run the NextJS frontend (:8080)
npm run build_and_run
```
Alternatively, to run the frontend in development mode (meaning that the files are rebuilt when changes happen), you can run the following command instead:
```bash
# Watch for changes, compile the frontend, and run the frontend (:8080)
npm run dev
```
> [!CAUTION] 
> You should **NEVER** use the development mode when running in production. This could cause major security risks.

<br>
<footer>
  <p align="center">&copy; Copyright 2024 | <a href="https://github.com/InimicalPart">InimicalPart</a> & <a href="https://newseed.se/">NewSeed IT Solutions AB</a></p>
</footer>