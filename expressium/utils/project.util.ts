import fs from 'fs/promises';
import path from 'path';

/**
 * ## findProjectRootDirectory
 *
 * Determine the root directory of a Node.js project.
 *
 * @description
 * Traverses up from a given starting directory to locate the nearest directory containing a `package.json` file.
 * This is typically used to identify the root of a Node.js project for configuration or tooling purposes.
 *
 * @param startDirectory - The directory path to start searching from.
 * 
 * @return
 * A promise that resolves to the absolute path of the project root directory.
 *
 * @throws
 * Will throw an error if a `package.json` file is not found in any parent directory.
 */
export const findProjectRootDirectory = async (startDirectory: string): Promise<string> => {
  let currentDirectory = startDirectory;

  while (currentDirectory !== path.parse(currentDirectory).root) {
    try {
      await fs.access(path.join(currentDirectory, 'package.json'));
      
      return currentDirectory;
    } catch {
      currentDirectory = path.dirname(currentDirectory);
    }
  }

  throw new Error('Could not locate project root (package.json not found)');
};
