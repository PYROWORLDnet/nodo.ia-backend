/**
 * Database setup script with sample data
 * 
 * Run with: node scripts/setupDatabase.js
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create a connection to the database - use DATABASE_URL if available
const sequelize = process.env.DATABASE_URL 
  ? new Sequelize(process.env.DATABASE_URL, {
      logging: console.log,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false // in case of self-signed certificates
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

// Define vehicle model
const Vehicle = sequelize.define('vehicle', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  brand: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  model: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  engine: {
    type: Sequelize.STRING,
  },
  year: {
    type: Sequelize.INTEGER,
  },
  condition: {
    type: Sequelize.STRING,
  },
  use: {
    type: Sequelize.STRING,
  },
  exterior: {
    type: Sequelize.STRING,
  },
  interior: {
    type: Sequelize.STRING,
  },
  price: {
    type: Sequelize.DECIMAL(12, 2),
    get() {
      const value = this.getDataValue('price');
      return value === null ? null : parseFloat(value);
    }
  },
  price_value: {
    type: Sequelize.STRING,
  },
  transmission: {
    type: Sequelize.STRING,
  },
  traction: {
    type: Sequelize.STRING,
  },
  fuel: {
    type: Sequelize.STRING,
  },
  passengers: {
    type: Sequelize.INTEGER,
  },
  location: {
    type: Sequelize.STRING,
  }
}, {
  timestamps: true,
  tableName: 'vehicles'
});

// Sample vehicle data
const sampleVehicles = [
  // SUVs
  {
    brand: 'BMW',
    model: 'X5',
    engine: '3.0L 6-cylinder',
    year: 2020,
    condition: 'New',
    use: 'Personal',
    exterior: 'Black',
    interior: 'Leather',
    price: 65000.00,
    price_value: 'Luxury',
    transmission: 'Automatic',
    traction: 'AWD',
    fuel: 'Gasoline',
    passengers: 5,
    location: 'Barcelona'
  },
  {
    brand: 'Mercedes-Benz',
    model: 'GLE',
    engine: '2.0L 4-cylinder',
    year: 2020,
    condition: 'New',
    use: 'Personal',
    exterior: 'Silver',
    interior: 'Leather',
    price: 58000.00,
    price_value: 'Luxury',
    transmission: 'Automatic',
    traction: 'AWD',
    fuel: 'Gasoline',
    passengers: 5,
    location: 'Barcelona'
  },
  {
    brand: 'Toyota',
    model: 'RAV4',
    engine: '2.5L 4-cylinder',
    year: 2020,
    condition: 'New',
    use: 'Personal',
    exterior: 'Blue',
    interior: 'Cloth',
    price: 35000.00,
    price_value: 'Mid-range',
    transmission: 'Automatic',
    traction: 'AWD',
    fuel: 'Hybrid',
    passengers: 5,
    location: 'Barcelona'
  },
  
  // Family cars
  {
    brand: 'Renault',
    model: 'Espace',
    engine: '1.6L 4-cylinder',
    year: 2019,
    condition: 'Used',
    use: 'Family',
    exterior: 'Grey',
    interior: 'Cloth',
    price: 28000.00,
    price_value: 'Mid-range',
    transmission: 'Manual',
    traction: 'FWD',
    fuel: 'Diesel',
    passengers: 7,
    location: 'Madrid'
  },
  {
    brand: 'Volkswagen',
    model: 'Touran',
    engine: '2.0L 4-cylinder',
    year: 2018,
    condition: 'Used',
    use: 'Family',
    exterior: 'White',
    interior: 'Cloth',
    price: 25000.00,
    price_value: 'Economic',
    transmission: 'Manual',
    traction: 'FWD',
    fuel: 'Diesel',
    passengers: 7,
    location: 'Madrid'
  },
  {
    brand: 'Ford',
    model: 'S-Max',
    engine: '2.0L 4-cylinder',
    year: 2020,
    condition: 'New',
    use: 'Family',
    exterior: 'Black',
    interior: 'Leather',
    price: 42000.00,
    price_value: 'Premium',
    transmission: 'Automatic',
    traction: 'AWD',
    fuel: 'Diesel',
    passengers: 7,
    location: 'Madrid'
  },
  
  // Luxury cars
  {
    brand: 'Audi',
    model: 'A8',
    engine: '3.0L 6-cylinder',
    year: 2021,
    condition: 'New',
    use: 'Luxury',
    exterior: 'Black',
    interior: 'Premium Leather',
    price: 85000.00,
    price_value: 'Luxury',
    transmission: 'Automatic',
    traction: 'AWD',
    fuel: 'Gasoline',
    passengers: 5,
    location: 'Madrid'
  },
  {
    brand: 'BMW',
    model: '7 Series',
    engine: '4.4L 8-cylinder',
    year: 2020,
    condition: 'New',
    use: 'Luxury',
    exterior: 'Silver',
    interior: 'Premium Leather',
    price: 92000.00,
    price_value: 'Luxury',
    transmission: 'Automatic',
    traction: 'RWD',
    fuel: 'Gasoline',
    passengers: 5,
    location: 'Barcelona'
  },
  
  // Economic cars
  {
    brand: 'Toyota',
    model: 'Yaris',
    engine: '1.5L 4-cylinder',
    year: 2021,
    condition: 'New',
    use: 'City',
    exterior: 'Red',
    interior: 'Cloth',
    price: 18000.00,
    price_value: 'Economic',
    transmission: 'Manual',
    traction: 'FWD',
    fuel: 'Gasoline',
    passengers: 5,
    location: 'Valencia'
  },
  {
    brand: 'Dacia',
    model: 'Sandero',
    engine: '1.0L 3-cylinder',
    year: 2020,
    condition: 'New',
    use: 'City',
    exterior: 'White',
    interior: 'Cloth',
    price: 12000.00,
    price_value: 'Economic',
    transmission: 'Manual',
    traction: 'FWD',
    fuel: 'Gasoline',
    passengers: 5,
    location: 'Sevilla'
  },
  {
    brand: 'Seat',
    model: 'Ibiza',
    engine: '1.0L 3-cylinder',
    year: 2019,
    condition: 'Used',
    use: 'City',
    exterior: 'Blue',
    interior: 'Cloth',
    price: 14500.00,
    price_value: 'Economic',
    transmission: 'Manual',
    traction: 'FWD',
    fuel: 'Gasoline',
    passengers: 5,
    location: 'Barcelona'
  },
  
  // Electric cars
  {
    brand: 'Tesla',
    model: 'Model 3',
    engine: 'Electric',
    year: 2021,
    condition: 'New',
    use: 'Personal',
    exterior: 'White',
    interior: 'Vegan Leather',
    price: 48000.00,
    price_value: 'Premium',
    transmission: 'Automatic',
    traction: 'RWD',
    fuel: 'Electric',
    passengers: 5,
    location: 'Madrid'
  },
  {
    brand: 'Nissan',
    model: 'Leaf',
    engine: 'Electric',
    year: 2020,
    condition: 'New',
    use: 'City',
    exterior: 'Green',
    interior: 'Recycled Materials',
    price: 32000.00,
    price_value: 'Mid-range',
    transmission: 'Automatic',
    traction: 'FWD',
    fuel: 'Electric',
    passengers: 5,
    location: 'Barcelona'
  }
];

// Set up the database and load sample data
async function setupDatabase() {
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync the model with the database (create the table)
    await sequelize.sync({ force: true }); // This will drop the table if it exists
    console.log('Vehicle table created.');
    
    // Insert sample data
    await Vehicle.bulkCreate(sampleVehicles);
    console.log(`${sampleVehicles.length} sample vehicles inserted.`);
    
    console.log('Database setup complete!');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the setup
setupDatabase(); 