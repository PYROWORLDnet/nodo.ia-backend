/**
 * Database optimization script to create indexes for improved query performance
 * 
 * Run with: node scripts/createIndexes.js
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create a connection to the database
const sequelize = process.env.DATABASE_URL 
  ? new Sequelize(process.env.DATABASE_URL, {
      logging: console.log,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    })
  : new Sequelize({
      dialect: 'postgres',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      logging: console.log,
    });

// SQL statements to create indexes and optimize the database
const OPTIMIZATION_QUERIES = [
  // Add indexes for common search columns
  `CREATE INDEX IF NOT EXISTS idx_vehicles_brand ON vehicles (LOWER(brand));`,
  `CREATE INDEX IF NOT EXISTS idx_vehicles_model ON vehicles (LOWER(model));`,
  `CREATE INDEX IF NOT EXISTS idx_vehicles_year ON vehicles (year);`,
  `CREATE INDEX IF NOT EXISTS idx_vehicles_location ON vehicles (LOWER(location));`,
  
  // Add an index for numeric price comparisons
  `CREATE INDEX IF NOT EXISTS idx_vehicles_price_numeric ON vehicles (REPLACE(price_value, ',', '')::numeric);`,
  
  // Add index for vehicle condition
  `CREATE INDEX IF NOT EXISTS idx_vehicles_condition ON vehicles (LOWER(condition));`,
  
  // Add index for fuel type
  `CREATE INDEX IF NOT EXISTS idx_vehicles_fuel ON vehicles (LOWER(fuel));`,
  
  // Add index for transmission
  `CREATE INDEX IF NOT EXISTS idx_vehicles_transmission ON vehicles (LOWER(transmission));`,
  
  // Create a function to extract year as integer for better indexing
  `CREATE OR REPLACE FUNCTION extract_year(year_text text)
   RETURNS integer AS $$
   BEGIN
     RETURN CASE WHEN year_text ~ '^[0-9]+$' THEN year_text::integer ELSE NULL END;
   EXCEPTION
     WHEN others THEN RETURN NULL;
   END;
   $$ LANGUAGE plpgsql IMMUTABLE;`,
   
  // Create a functional index for year as integer
  `CREATE INDEX IF NOT EXISTS idx_vehicles_year_int ON vehicles (extract_year(year));`,
  
  // Create a function to extract numeric price for better comparisons
  `CREATE OR REPLACE FUNCTION extract_price(price_text text)
   RETURNS numeric AS $$
   BEGIN
     RETURN REPLACE(price_text, ',', '')::numeric;
   EXCEPTION
     WHEN others THEN RETURN NULL;
   END;
   $$ LANGUAGE plpgsql IMMUTABLE;`,
   
  // Create a functional index for numeric price
  `CREATE INDEX IF NOT EXISTS idx_vehicles_price_func ON vehicles (extract_price(price_value));`,
  
  // Vacuum analyze to update statistics
  `VACUUM ANALYZE vehicles;`
];

// Function to run all optimization queries
async function optimizeDatabase() {
  let connection;
  
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Execute each optimization query
    for (const query of OPTIMIZATION_QUERIES) {
      try {
        console.log('Executing:', query);
        await sequelize.query(query);
        console.log('Successfully executed query.');
      } catch (err) {
        // Continue with other queries even if one fails
        console.error('Error executing query:', query);
        console.error('Error details:', err.message);
      }
    }
    
    console.log('Database optimization complete!');
  } catch (error) {
    console.error('Error optimizing database:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the optimization
optimizeDatabase(); 