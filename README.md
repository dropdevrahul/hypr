# Hypr

## About
A desktop application build using wails and reactjs to perform REST APIs

## Screenshots
![example](examples/hypr2.png)

## Live Development
Please install the requiremenys for wails as mentioned here [wails](https://wails.io/docs/gettingstarted/installation/) 

To run in live development mode, run `wails dev` in the project directory. This will run a Vite development
server that will provide very fast hot reload of your frontend changes. If you want to develop in a browser
and have access to your Go methods, there is also a dev server that runs on http://localhost:34115. Connect
to this in your browser, and you can call your Go code from devtools.

## Building
To build a redistributable, production mode package, use `wails build`.
