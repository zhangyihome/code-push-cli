/// <reference path="../definitions/external/node/node.d.ts" />

import { Promise } from "q";
import { command } from "./command-parser";
import { execute } from "./command-executor";

function run(): void {
    if (!command) {
        return;
    }

    execute(command)
        .catch((error: any): void => console.log("Error:  " + error.message))
        .done();
}

run();