import path from "node:path";
import fs from "fs";
import { MCSManager } from "./manager.js";
import { MCS } from "./server.js";

const __dirname = import.meta.dirname;


const serverRoot = path.join(__dirname, "../mcs");



const rootDir = path.join(__dirname, "../test_root");
const customWorld = path.join(rootDir, "customWorld");
fs.mkdirSync(customWorld, {recursive: true});
// fs.mkdirSync(rootDir, { recursive: true });

const version = "1.26.44.3";


const start = 19130;
const allowPorts = new Array(10).fill(0).map((v, i) => start + i);

const mcsm = new MCSManager(rootDir, allowPorts);
// mcsm.initWorkSpace(version, customWorld).then(work => {
//     if (!work) return;
//     new MCS(work, {
//         "allow-list": "false",
//         "level-name": "world",
//         "server-port": "19132",
//         "server-portv6": "19133"
//     })
// })

const mcs = await mcsm.runServer(version, customWorld, {"allow-list": "false"}, 19132, 19133, true);
console.log(mcs)
mcs?.on("log", (log) => {
    process.stdout.write(log);
});

setInterval(() => {
    // mcs?.writeTerminal("stop\n")
    mcs?.restart()
}, 1000*30);
// const serv = mcsm.runServer(version, "testworld", {"allow-list": "false", "server-name": "custom server name"}, 19140, 19141);


// serv.then(mcs => {
//     mcs?.on("log", (log) => {
//         console.log(log.toString())
//     })
//     setTimeout(() => {
//         mcs?.restart()
//         // mcs?.kill()
//         // mcsm.runServer(version, "testworld", {"allow-list": "false", "server-name": "custom server name"}, 19132, 19133);
//     }, 1000*10);
// })

// const pm = new PackageManager(rootDir)
// pm.

// pm.downloadPackage(version).then(res => {
//     console.log(res)
//     pm.extractPackage(version)
// })


// const mcs = new MCS(serverRoot);


// mcs.on("log", (data) => {
//     process.stdout.write(data)
//     // console.log(data.toString());
// });


// setTimeout(() => {
//     mcs.writeTerminal("say 20s\n");
//     setTimeout(() => {
//         mcs.writeTerminal("stop\n");
//     }, 1000*20);
// }, 1000*20);