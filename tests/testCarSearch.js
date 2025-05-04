/**
 * Test Script for Enhanced Car Search
 * 
 * This script tests the improved car search functionality with fuzzy matching
 * and intelligent fallbacks for common misspellings and variants.
 * 
 * Run with: node scripts/testCarSearch.js
 */

require('dotenv').config();
const { processVehicleQuery } = require('../src/langchain/agent');
const { checkIfCarRelated } = require('../src/routes/query');

async function testCarSearch() {
  console.log('Testing Enhanced Car Search Functionality\n');
  
  // Test queries with common misspellings and variants
  const testQueries = [
    "I am looking for a gwagon",
    "Looking for mercedez benz",
    "Show me toyotas from 2022",
    "Find me a 4 door sedan",
    "BMW x5 in santo domingo"
  ];
  
  for (const query of testQueries) {
    console.log(`\n=== Testing query: "${query}" ===`);
    
    try {
      // First check if the query is detected as car-related
      console.log('Checking if car-related...');
      const isCarRelated = await checkIfCarRelated(query);
      console.log('Is car-related:', isCarRelated);
      
      if (isCarRelated) {
        // Process the vehicle query
        console.log('Processing vehicle query...');
        const result = await processVehicleQuery(query);
        
        // Log the results
        console.log(`Found ${result.total_results} vehicles`);
        console.log('Response:', result.response);
        
        if (result.vehicles && result.vehicles.length > 0) {
          console.log('\nFirst result:');
          const firstVehicle = result.vehicles[0];
          console.log(`- Brand: ${firstVehicle.brand}`);
          console.log(`- Model: ${firstVehicle.model}`);
          console.log(`- Year: ${firstVehicle.year}`);
          console.log(`- Price: ${firstVehicle.price}`);
        } else {
          console.log('No vehicles found');
        }
      } else {
        console.log('Query not detected as car-related');
      }
    } catch (error) {
      console.error('Error processing query:', error);
    }
    
    console.log('===================================');
  }
}

// Run the test
testCarSearch().catch(console.error); 