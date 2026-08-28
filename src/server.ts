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
    #isDaemon
    constructor(root: string, properties: MCSProperties, isDaemon: boolean = false) {
        super();

        this.#root = root;

        this.#isDaemon = isDaemon;
        
        const propertiesPath = path.join(root, "server.properties");

        const rawProperties = fs.readFileSync(propertiesPath, { encoding: "utf8" });
        const defaultProperties = textPropertiesToJson(rawProperties);

        this.#properties = {...defaultProperties, ...properties}
        const newPropertiesText = JsonPropertiesToText(this.#properties);
        fs.writeFileSync(propertiesPath, newPropertiesText);
        
        this.#run();
    }

    #run() {
        if (this.isAlive) return console.log("alive")
        this.#process = spawn("./bedrock_server", {cwd: this.#root});

        this.#process.stdout?.on("data", (data) => {
            this.emit("log", data)
        });
        
        this.#process.once("exit", () => {
            if (this.#isDaemon) {
                this.#run();
                return;
            }
            this.emit("exit");
            this.removeAllListeners();
        });
    }
    

    

    writeTerminal(data: string) {
        this.#process?.stdin?.write(data)
    }

    kill() {
        if (this.#isDaemon) this.#isDaemon = false;
        return this.#process?.kill("SIGKILL")
    }

    restart() {
        this.#process?.removeAllListeners();
        this.#process?.once("exit", () => {
            this.#run();
        });
        const daemon = this.#isDaemon;
        this.kill();
        this.#isDaemon = daemon;
    }

    get isAlive() {
        return this.#process?.exitCode === null && this.#process.signalCode === null;
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