



export class PortError extends Error {
    constructor(message: string) {
        super(message);
        this.name = new.target.name;
    }
}

export class InsufficientPortsError extends PortError {
    constructor() {
        super('指定個数分のポートを確保できませんでした');
    }
}

export class PortAlreadyUsedError extends PortError {
    constructor(port: number) {
        super(`ポート ${port} は使用済みです`);
    }
}

export class PortAlreadyReleasedError extends PortError {
    constructor(port: number) {
        super(`ポート ${port} は解放済みです`);
    }
}





export class PortManager {
    #allowPorts: number[];
    #usedPorts: number[] = [];
    
    constructor(...ports: number[]) {
        this.#allowPorts = Array.from(new Set(ports));
    }



    usePorts(count: number) {
        if (this.#allowPorts.length < count) throw new InsufficientPortsError();
        const targetPorts = this.#allowPorts.splice(0, count);
        this.#usedPorts.push(...targetPorts);
        return targetPorts;
    }
    


    use(port?: number | undefined): number {
        if (port === undefined) port = this.usePorts(1)[0]!;
        const index = this.#allowPorts.indexOf(port);
        if (index === -1) throw new PortAlreadyUsedError(port);
        const target = this.#allowPorts.splice(index, 1);
        if (target.length === 0) throw new PortAlreadyUsedError(port);
        this.#usedPorts.push(...target);
        return port;
    }

    release(port: number) {
        const target = this.#usedPorts.splice(this.#usedPorts.indexOf(port), 1);
        if (target.length === 0) throw new PortAlreadyReleasedError(port);
    }

    releasePorts(...ports: number[]) {
        ports.forEach(p => this.release(p));
    }
}