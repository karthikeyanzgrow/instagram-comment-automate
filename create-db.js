const postgres = require('postgres');

async function createDatabase() {
  // Connect to the default 'postgres' database
  const sql = postgres('postgres://postgres:postgres@localhost:5432/postgres');
  
  try {
    console.log("Checking if database 'ig_automation' exists...");
    const dbs = await sql`SELECT datname FROM pg_database WHERE datname = 'ig_automation'`;
    
    if (dbs.length === 0) {
      console.log("Database does not exist. Creating 'ig_automation'...");
      // We cannot use tagged template literals for database names safely in all drivers,
      // so we use unsafe string execution for CREATE DATABASE which doesn't support parameters.
      await sql.unsafe('CREATE DATABASE ig_automation');
      console.log("Database created successfully!");
    } else {
      console.log("Database 'ig_automation' already exists.");
    }
  } catch (error) {
    console.error("Error creating database:", error.message);
  } finally {
    await sql.end();
  }
}

createDatabase();
