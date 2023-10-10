[![Node.js CI](https://github.com/TheLukaDragar/DMLDreact/actions/workflows/node.js.yml/badge.svg)](https://github.com/TheLukaDragar/DMLDreact/actions/workflows/node.js.yml)
# DMLDreact
This repository contains client application for the DLMD system.


## Frameworks
The application is written in [react native](https://reactnative.dev/).
For building and deploying, the [Expo](https://expo.dev/) framework is used.

## Requirements

- Node.js >= 16
- NPM > v8.x
- Expo = 48
- React = 18
- React native = 0.71
- Git

## Installation

The installation procedure describes building and installation of test app to the Android device.

Installation of the app consists of following actions:

- Setting up the configuration files.
- Building the app on the Expo cloud.
- Installing application (APK) on the android system.

The installation steps presented are based on the Ubuntu 22.04 LTS system.

### Setting up configuration
// TODO: setup the settings:
- APIUrlEP:...
- reputationSCAddress: 0x0000000000000
- parcelNFTSCAddress: 0x0000000000000
- RPCUrl: https://bellecour.iex.ec

### Building the app

Install needed tools
```bash
sudo apt install git
sudo apt install curl
```

Install node:
```bash
cd ~
curl -sL https://deb.nodesource.com/setup_16.x -o /tmp/nodesource_setup.sh
sudo bash /tmp/nodesource_setup.sh
sudo apt install nodejs
node -v
```

Clone the repo locally:
```bash
git clone https://github.com/TheLukaDragar/DMLDreact.git
```

Install dependencies:
```bash
cd DMLDreact
npm i
```

Set up expo account:
Go to https://expo.dev/ and signup for the account.

Create build:
```bash
npm run build
```

### Installing application (APK) on the android system

After the build is done, you can use the QR code to get the build to the Android app.
QR code can be scanned with Expo Go (Android).
The Expo Go will provide a link to install app on the mobile phone.

When the app is installed, it is available in the phone under the name DLMDreact

Alternatively Android studio can be installed, so the app can be tested on android emulator.

