/**
 * Test script for the Vehicle NLP Query System
 * 
 * This script sends sample queries to the API in both English and Spanish
 * to demonstrate the system's multilingual capabilities.
 * 
 * Run with: node scripts/testQueries.js
 */

const fetch = require('node-fetch');
require('dotenv').config();

const API_URL = `http://localhost:${process.env.PORT || 3000}/query`;

// Sample queries in English and Spanish
const sampleQueries = [
  // English queries
  "Show me SUVs from 2020 in Barcelona",
  "What are the most luxurious cars available?",
  "I need a family car with at least 7 seats",
  "Electric vehicles under $40,000",
  "Show me used cars in Madrid with manual transmission",
  
  // Spanish queries
  "Muéstrame los SUVs del 2020 en Barcelona",
  "¿Cuáles son los coches más lujosos disponibles?",
  "Necesito un coche familiar con al menos 7 asientos",
  "Vehículos eléctricos por menos de 40.000€",
  "Muéstrame coches usados en Madrid con transmisión manual"
];

/**
 * Send a query to the API
 * @param {string} query - The natural language query
 * @returns {Promise<Object>} - The API response
 */
async function sendQuery(query) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error sending query: ${error.message}`);
    return null;
  }
}

/**
 * Run all sample queries sequentially
 */
async function runSampleQueries() {
  console.log('Starting test queries...\n');
  
  for (let i = 0; i < sampleQueries.length; i++) {
    const query = sampleQueries[i];
    
    console.log(`\n[Query ${i + 1}]: ${query}`);
    console.log('-'.repeat(80));
    
    const result = await sendQuery(query);
    
    if (result) {
      console.log(`Response: ${result.response}`);
      console.log(`Found ${result.vehicles.length} vehicles`);
      
      // Show a brief summary of the first vehicle if available
      if (result.vehicles.length > 0) {
        const firstVehicle = result.vehicles[0];
        console.log('\nFirst vehicle:');
        console.log(`  ${firstVehicle.brand} ${firstVehicle.model} (${firstVehicle.year})`);
        console.log(`  Price: ${firstVehicle.price}`);
        console.log(`  Location: ${firstVehicle.location}`);
      }
    } else {
      console.log('Query failed');
    }
    
    console.log('-'.repeat(80));
    
    // Add a small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\nAll sample queries completed!');
}

// Run the tests
runSampleQueries(); 