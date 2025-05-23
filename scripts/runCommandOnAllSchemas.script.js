import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

const SCHEMA_DIRECTORY = 'prisma';

const COMMAND_LIST = {
  'db:pull': 'prisma db pull',
  'db:push': 'prisma db push',
  'db:generate': 'prisma generate',
  'db:migrate:dev': 'prisma migrate dev',
  'db:migrate:deploy': 'prisma migrate deploy',
  'db:studio': 'prisma studio',
};

const command = process.argv[2];

if (!command || !COMMAND_LIST[command]) {
  console.error(`Error: Invalid command. Please use one of: ${ Object.keys(COMMAND_LIST).join(', ') }`);
  process.exit(1);
}

const findSchemaFiles = async () => {
  try {
    const fileList = fs.readdirSync(SCHEMA_DIRECTORY);
    
    return fileList
      .filter((file) => file.endsWith('.prisma'))
      .map((file) => path.join(SCHEMA_DIRECTORY, file));
  } catch (error) {
    console.error(`Error reading schema directory: ${ error.message }`);
    process.exit(1);
  }
};

const runCommandOnAllSchemas = async () => {
  const schemaFileList = await findSchemaFiles();
  
  if (schemaFileList.length === 0) {
    console.error('No schema files found. Schema files should be in the prisma directory');
    process.exit(1);
  }

  console.log(`Found ${ schemaFileList.length } schema files. Running ${ command } on each...`);
  
  for (const schemaFile of schemaFileList) {
    const fullCommand = `${ COMMAND_LIST[command] } --schema=${ schemaFile }`;
    
    console.log(`\nExecuting: ${ fullCommand }`);
    
    try {
      const { stdout, stderr } = await execPromise(fullCommand);

      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);

      console.log(`✅ Successfully ran ${ command } on ${ schemaFile }`);
    } catch (error) {
      console.error(`❌ Error executing ${ command } on ${ schemaFile }:`);
      console.error(error.message);
    }
  }
};

runCommandOnAllSchemas();
