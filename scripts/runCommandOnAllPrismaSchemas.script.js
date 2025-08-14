import { exec } from 'child_process';
import fs from 'fs';
import momentTimezone from 'moment-timezone';
import path from 'path';
import util from 'util';

const PRISMA_DIRECTORY = 'prisma';

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
  console.log(`${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } [prisma]: Invalid command. Please use one of: ${ Object.keys(COMMAND_LIST).join(', ') }`);
  process.exit(1);
}

const findPrismaSchemaFiles = async () => {
  try {
    const prismaSchemaFileList = fs.readdirSync(PRISMA_DIRECTORY);
    
    return prismaSchemaFileList
      .filter((prismaSchemaFile) => prismaSchemaFile.endsWith('.prisma'))
      .map((prismaSchemaFile) => path.join(PRISMA_DIRECTORY, prismaSchemaFile));
  } catch (error) {
    console.error(`${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } [prisma]: Error reading prisma directory: ${ error.message }`);
    process.exit(1);
  }
};

const runCommandOnAllPrismaSchemas = async () => {
  const prismaSchemaFileList = await findPrismaSchemaFiles();
  
  if (prismaSchemaFileList.length === 0) {
    console.error(`${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } [prisma]: No schema files found. Schema files should be in the prisma directory`);
    process.exit(1);
  }

  console.log(`${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } [prisma]: Found ${ prismaSchemaFileList.length } schema files. Running ${ command } on each`);
  
  const execPromise = util.promisify(exec);

  for (const prismaSchemaFile of prismaSchemaFileList) {
    const fullCommand = `${ COMMAND_LIST[command] } --schema=${ prismaSchemaFile }`;
    
    console.log(`${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } [prisma]: Executing: ${ fullCommand }`);
    
    try {
      const { stdout, stderr } = await execPromise(fullCommand);

      if (stdout) {
        console.log(stdout);
      }

      if (stderr) {
        console.error(stderr);
      }

      console.log(`${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } [prisma]: ✅ Successfully ran ${ command } on ${ prismaSchemaFile }`);
    } catch (error) {
      console.error(`${ momentTimezone().utc().format('DD-MM-YYYY HH:mm:ss') } [prisma]: ❌ Error executing ${ command } on ${ prismaSchemaFile }:`);
      console.error(error.message);
    }
  }
};

runCommandOnAllPrismaSchemas();
