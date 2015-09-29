/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */
 
import * as Acquisition from "../acquisition-sdk";
export * from "../acquisition-sdk";

export interface NativeSample {
    // constructor(configuration: Configuration): void;

    beforeApply(callback: Acquisition.Callback<Acquisition.LocalPackage>): void;
    afterApply(callback: Acquisition.Callback<Acquisition.LocalPackage>): void;

    queryUpdate(callback: Acquisition.Callback<Acquisition.RemotePackage>): void;
    download(session: Acquisition.RemotePackage, callback?: Acquisition.Callback<Acquisition.LocalPackage>): void;
    abort(session: Acquisition.RemotePackage, callback?: Acquisition.Callback<void>): void;
    apply(newPackage: Acquisition.LocalPackage, callback?: Acquisition.Callback<void>): void;

    getCurrentPackage(callback?: Acquisition.Callback<Acquisition.LocalPackage>): void;
}

export var NativeImplementation: { new (configuration: Acquisition.Configuration): NativeSample };

