import path from "node:path";
import fs from "node:fs";
import { PackageManager } from "./package.js";
import { MCS, type MCSProperties } from "./server.js";
import { PortManager } from "./port.js";



export class MCSManager extends PackageManager {
    #ports: PortManager
    
    #root_worlds: string;

    #root_works: string;
    constructor(root: string, allowPorts: number[]) {
        super(root);

        this.#root_worlds = path.join(root, "worlds");
        this.#root_works = path.join(root, "works");

        fs.mkdirSync(this.#root_worlds, { recursive: true });
        fs.mkdirSync(this.#root_works, { recursive: true });
        fs.readdirSync(this.#root_works).forEach(d => {
            const target = path.join(this.#root_works, d);
            fs.rmSync(target, { recursive: true });
        });

        this.#ports = new PortManager(...allowPorts)
    }



    get serverPackages() {
        return getFiles(this.root_packages);
    }
    
    get serverVersions() {
        return getDirs(this.root_servers);
    }

    get worlds() {
        return getDirs(this.#root_works);
    }



    #initWorld(workDir: string, world: string) {
        const worldPath =  path.isAbsolute(world) ? world : path.join(this.#root_worlds, world);
        if (!fs.existsSync(worldPath)) fs.mkdirSync(worldPath);
        
        const allowlistPath = path.join(worldPath, "allowlist.json");
        if (!fs.existsSync(allowlistPath)) fs.writeFileSync(allowlistPath, "[]");
        const runAllowlistPath = path.join(workDir, "allowlist.json");
        fs.symlinkSync(allowlistPath, runAllowlistPath);


        const permissionsPath = path.join(worldPath, "permissions.json");
        if (!fs.existsSync(permissionsPath)) fs.writeFileSync(permissionsPath, "[]");
        const runPermissionsPath = path.join(workDir, "permissions.json");
        fs.symlinkSync(permissionsPath, runPermissionsPath);


        const runWorldRoot = path.join(workDir, "worlds");
        fs.mkdirSync(runWorldRoot, { recursive: true });

        const runWorldPath = path.join(runWorldRoot, "world");
        fs.symlinkSync(worldPath, runWorldPath);
    }
    
    
    async initWorkSpace(version: string, world: string) {
        const id = crypto.randomUUID();
        const work = path.join(this.#root_works, id);
        fs.mkdirSync(work, { recursive: true });
        const ok = await this.initServer(version, work, (fname) => {
            switch (fname) {
                case "allowlist.json":
                case "permissions.json":
                    return
                    
                case "config":
                case "worlds":
                case "server.properties":
                    return false;

                default:
                    return true;
            }
        });


        if (ok) {
            this.#initWorld(work, world);
            
            return work;
        }
    }
    
    async runServer(version: string, world: string, customServerProperties: MCSProperties, portv4?: number | undefined, portv6?: number | undefined) {

        const v4 = portv4 ? this.#ports.use(portv4) : this.#ports.use();
        const v6 = portv6 ? this.#ports.use(portv6) : this.#ports.use();

        const workSpace = await this.initWorkSpace(version, world)
        if (workSpace) return new MCS(workSpace, {
            ...customServerProperties,
            "level-name": "world",
            "server-port": v4.toString(),
            "server-portv6": v6.toString()
        });


    }
}



function getDirs(root: string) {
    return fs.readdirSync(root).map(e => fs.statSync(path.join(root, e)).isDirectory() ? e : undefined).filter(v => v !== undefined);
}


function getFiles(root: string) {
    return fs.readdirSync(root).map(e => fs.statSync(path.join(root, e)).isFile() ? e : undefined).filter(v => v !== undefined);
}