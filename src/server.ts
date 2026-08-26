import { ChildProcess, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import fs from "fs";
import path from "node:path";




type MCS_Events = {
    log: [Buffer];
    exit: [];
}


export type MCSProperties = Record<string, string>


export class MCS extends EventEmitter<MCS_Events> {
    #process: ChildProcess | undefined;
    
    
    #root: string;
    #properties: MCSProperties
    constructor(root: string, properties: MCSProperties) {
        super();

        this.#root = root;
        
        const propertiesPath = path.join(root, "server.properties");

        const rawProperties = fs.readFileSync(propertiesPath, { encoding: "utf8" });
        const defaultProperties = textPropertiesToJson(rawProperties);

        this.#properties = {...defaultProperties, ...properties}
        const newPropertiesText = JsonPropertiesToText(this.#properties);
        fs.writeFileSync(propertiesPath, newPropertiesText);
        
        this.#run();
    }

    #run() {
        this.#process = spawn("./bedrock_server", {cwd: this.#root});

        this.#process.stdout?.on("data", (data) => {
            this.emit("log", data)
        });
        
        this.#process.once("exit", () => {
            this.emit("exit");
            this.removeAllListeners();
        });
    }
    

    

    writeTerminal(data: string) {
        this.#process?.stdin?.write(data)
    }

    kill() {
        return this.#process?.kill("SIGINT")
    }

    restart() {
        this.#process?.removeAllListeners();
        this.#process?.once("exit", () => {
            this.#run();
        });
        this.kill();
    }

    get isAlive() {
        return this.#process?.exitCode ?? null === null;
    }


    getServerProperty(property: string) {
        return this.#properties[property]

    }
}



function textPropertiesToJson(properties: string): MCSProperties {
    const lines = properties.split("\n");
    const lineProperties = lines.map(line => {
        const [key, ...values] = line.split("=");
        return [key, values.join("=")]
    });
    return Object.fromEntries(lineProperties.filter(lp => lp[0] !== undefined && !lp[0].startsWith("#") && lp[0].length !== 0));
}


function JsonPropertiesToText(properties: MCSProperties) {
    return Object.entries(properties).map(p => p[0].startsWith("#") || p[0].length === 0 ? p.join("") : p.join("=")).join("\n")
}