## Usage

Those templates dependencies are maintained via [pnpm](https://pnpm.io) via `pnpm up -Lri`.

This is the reason you see a `pnpm-lock.yaml`. That being said, any package manager will work. This file can be safely be removed once you clone a template.

```bash
$ npm install # or pnpm install or yarn install
```

### Learn more on the [Solid Website](https://solidjs.com) and come chat with us on our [Discord](https://discord.com/invite/solidjs)

## Available Scripts

In the project directory, you can run:

### To deploy

#### On MacOS
You will need to run ```./build.sh```. To do this first you will need to enure it has the right permissions:
```bash
$ chmod +x build.sh
```

And then you can run:
```bash
$ ./build.sh
```

#### On Windows
You will need to have Powershell installed. Then you can run

```bash
$ .\publish.ps1
```

Open [http://localhost:3002](http://localhost:3002) to view it in the browser.<br>

### `npm run build`

Builds the app for production to the `dist` folder.<br>
It correctly bundles Solid in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

## Deployment

You can deploy the `dist` folder to any static host provider (netlify, surge, now, etc.)
