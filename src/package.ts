import path from "node:path";
import fs from "fs";
import EventEmitter from "node:events";
import https from "node:https";

import adm from "adm-zip";



type PackageManagerEvents = {
    downloadComplete: [string, boolean]
}

export class PackageManager extends EventEmitter<PackageManagerEvents> {
    #root: string;
    
    #root_packages: string;
    #root_tmp_packages: string;
    
    #root_servers: string;
    #root_tmp_servers: string;

    #genLink
    constructor(root: string, genLink: (version: string) => string = (v) => `https://www.minecraft.net/bedrockdedicatedserver/bin-linux/bedrock-server-${v}.zip`) {
        super();

        this.#genLink = genLink;

        this.#root = root;
        this.#root_packages = path.join(root, "packages");
        this.#root_tmp_packages = path.join(root, "tmp_packages");        
        
        this.#root_servers = path.join(root, "servers");
        this.#root_tmp_servers = path.join(root, "tmp_servers");


        fs.mkdirSync(this.#root_packages, { recursive: true });
        fs.mkdirSync(this.#root_tmp_packages, { recursive: true });        
        
        fs.mkdirSync(this.#root_servers, { recursive: true });
        fs.mkdirSync(this.#root_tmp_servers, { recursive: true });
    }

    get root() {
        return this.#root
    }
    
    get root_packages() {
        return this.#root_packages;
    }

    get root_servers() {
        return this.#root_servers;
    }



    #downloadingVersions: string[] = [];
    async #downloadPackage(version: string) {
        const manager = this;

        return new Promise<boolean>(async (res) => {
            if (this.hasPackage(version)) {
                res(true);

            } else if (this.#downloadingVersions.includes(version)) {
                this.on("downloadComplete", function call (v, success) {
                    if (v === version) {
                        manager.removeListener("downloadComplete", call);
                        res(success);
                    }
                });

            } else {
                this.#downloadingVersions.push(version);
                const ok = await this.#download(version)
                this.#downloadingVersions.splice(this.#downloadingVersions.indexOf(version), 1);
                res(ok);
                
            }
        })
    }


    #download(version: string) {
        const link = this.#genLink(version);


        
        const packagePathTmp = path.join(this.#root_tmp_packages, `${version}.zip`); 
        const packagePath = path.join(this.#root_packages, `${version}.zip`);
        
        
        console.log(link)
        
        


        return new Promise<boolean>((res, rej) => {

            const req = https.get(link, (r) => {
                
                if (r.statusCode === 200) {
                    const pws = fs.createWriteStream(packagePathTmp);
                    pws.on("error", () => {
                        res(false);

                    }).on("close", () => {
                        fs.renameSync(packagePathTmp, packagePath);
                        res(true);

                    });
                    r.pipe(pws, { end: true })

                } else {
                    req.destroy()
                    res(false);

                }

            });

        })

    }


    hasPackage(version: string) {
        const packagePath = path.join(this.root_packages, `${version}.zip`);
        return fs.existsSync(packagePath)
    }

    hasServer(version: string) {
        const serverPath = path.join(this.#root_servers, version);
        return fs.existsSync(serverPath);
    }




    #extractPackage(version: string) {
        const packagePath = path.join(this.#root_packages, `${version}.zip`);

        const serverPathTmp = path.join(this.#root_tmp_servers, version);
        const serverPath = path.join(this.#root_servers, version);

        //一時ファイルを削除
        if (fs.existsSync(serverPathTmp)) fs.rmSync(serverPathTmp, { recursive: true });
        fs.mkdirSync(serverPathTmp, { recursive: true });


        
        const zip = new adm(packagePath);
        zip.extractAllTo(serverPathTmp, true, true);

        if (fs.existsSync(serverPath)) fs.rmSync(serverPath, { recursive: true });
        fs.renameSync(serverPathTmp, serverPath);

    }



    async initServer(version: string, dir: string, linkCall: (fileName: string) => boolean | undefined = () => true) {
        if (!this.hasServer(version)) {
            if (!this.hasPackage(version)) {
                const ok = await this.#downloadPackage(version)
                if (!ok) return false;
            }
            this.#extractPackage(version);
        }


        const serverPath = path.join(this.#root_servers, version);
        fs.readdirSync(serverPath).forEach(fname => {
            const link = linkCall(fname);
            if (link === undefined) return;
            const fromPath = path.join(serverPath, fname);
            const toPath = path.join(dir, fname);
            if (link) {
                fs.symlinkSync(fromPath, toPath)

            } else {
                fs.cpSync(fromPath, toPath, { recursive: true });
            }
        });

        return true;
    }
    
}
