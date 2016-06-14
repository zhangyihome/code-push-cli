import * as childProcess from "child_process";
import * as cli from "../../definitions/cli";
import * as moment from "moment";
import * as path from "path";
import * as Q from "q";

const simctl = require("simctl");
const which = require("which");

interface IDebugPlatform {
    getLogProcess(): any;
}

class AndroidDebugPlatform implements IDebugPlatform {
    getLogProcess() {
        try {
            which.sync("adb");
        } catch (e) {
            throw new Error("ADB command not found. Please ensure it is installed and available on your path.");
        }

        if (!this.isDeviceAvailable()) {
            throw new Error("No Android devices found. Re-run this command after starting one.");
        }

        return childProcess.spawn("adb", ["logcat"]);
    }

    // The following is an example of what the output looks
    // like when running the "adb devices" command.
    //
    // List of devices attached
    // emulator-5554	device
    private isDeviceAvailable() {
        const output = childProcess.execSync("adb devices").toString();
        return output.search(/^[\w-]+\s+device$/mi) > -1;
    }
}

class iOSDebugPlatform implements IDebugPlatform {
    private getSimulatorID(): string {
        const output: any = simctl.list({ devices: true, silent: true });
        const simulators = output.json.devices
                            .map((platform: any) => platform.devices)
                            .reduce((prev: any, next: any) => prev.concat(next))
                            .filter((device: any) => device.state === "Booted")
                            .map((device: any) => device.id);

        return simulators[0];
    }

    getLogProcess() {
        if (process.platform !== "darwin") {
            throw new Error("iOS debug logs can only be viewed on OS X.");
        }

        const simulatorID = this.getSimulatorID();
        if (!simulatorID) {
            throw new Error("No iOS simulators found. Re-run this command after starting one."); 
        }

        const logFilePath: string = path.join(process.env.HOME, "Library/Logs/CoreSimulator", simulatorID, "system.log");
        return childProcess.spawn("tail", ["-f", logFilePath]);
    }
}

const logMessagePrefix = "[CodePush] ";
function processLogData(logData: Buffer) {
    const content = logData.toString()
    content.split("\n")
        .filter((line) => line.indexOf(logMessagePrefix) > -1)
        .map((line) => {
            const timeStamp = moment().format("hh:mm:ss");
            const message = line.substring(line.indexOf(logMessagePrefix) + logMessagePrefix.length);
            return `[${timeStamp}] ${message}`;
        })
        .forEach((line) => console.log(line));
}

const debugPlatforms: any = {
    android: new AndroidDebugPlatform(),
    ios: new iOSDebugPlatform()
};

module.exports = (command: cli.IDebugCommand): Q.Promise<void> => {
    return Q.Promise<void>((resolve, reject) => {
        const platform: string = command.platform.toLowerCase();
        const debugPlatform: IDebugPlatform = debugPlatforms[platform];

        if (!debugPlatform) {
            const availablePlatforms = Object.getOwnPropertyNames(debugPlatforms);
            return reject(new Error(`"${platform}" is an unsupported platform. Available options are ${availablePlatforms.join(", ")}.`));
        }

        try {
            const logProcess = debugPlatform.getLogProcess();
            logProcess.stdout.on("data", processLogData);
            logProcess.stderr.on("data", reject);

            logProcess.on("close", resolve); 
        } catch (e) {
            reject(e);
        }
    }); 
};