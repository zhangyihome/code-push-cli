import * as semver from "semver";

const regexpForMajor = /^\d+$/;
const regexpForMajorMinor = /^\d+\.\d+$/;

// Check if the given string is a semver-compliant version number (e.g. '1.2.3')
// (missing minor/patch values will be added on server side to pass semver.satisfies check)
export function isValidVersion(version: string): boolean {
  return !!semver.valid(version) || regexpForMajorMinor.test(version) || regexpForMajor.test(version);
}

export function isLowVersion(v1: string, v2: string): boolean {
  return semver.compare(v1, v2) === -1 ? true : false;
}
