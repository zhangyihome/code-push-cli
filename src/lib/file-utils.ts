import * as fs from "fs";

export function isDirectory(path: string): boolean {
  return fs.statSync(path).isDirectory();
}

export function fileDoesNotExistOrIsDirectory(path: string): boolean {
  try {
    return isDirectory(path);
  } catch (error) {
    return true;
  }
}
