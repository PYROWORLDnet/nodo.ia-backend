/**
 * Test script for the bilingual car search function
 * Run with: node scripts/searchTest.js
 */

require('dotenv').config();
const { processVehicleQuery } = require('../src/langchain/agent');

async function runTest() {
  try {
    // Test queries in both languages with common vehicle terms
    const queries = [
      // English queries
      "I am looking for a gwagon",
      "Show me a pickup truck",
      "Find a convertible car under 50000",
      
      // Spanish queries
      "Busco una camioneta pickup",
      "Quiero un carro descapotable",
      "Necesito un sedán barato",
      
      // Mixed language
      "Looking for a buen camión",
      "Busco coches that are SUV"
    ];
    
    for (const query of queries) {
      console.log(`\n\n====== TESTING QUERY: "${query}" ======`);
      
      // Process query
      const result = await processVehicleQuery(query);
      
      console.log('=== RESULTS ===');
      console.log(`Total results: ${result.total_results}`);
      console.log('AI Response:', result.response);
      
      if (result.vehicles && result.vehicles.length > 0) {
        console.log('\nMatched vehicles:');
        result.vehicles.slice(0, 3).forEach((vehicle, index) => {
          console.log(`\n[${index + 1}] ${vehicle.brand} ${vehicle.model} (${vehicle.year})`);
          console.log(`   Price: ${vehicle.price}`);
        });
        
        if (result.vehicles.length > 3) {
          console.log(`\n... and ${result.vehicles.length - 3} more results`);
        }
      } else {
        console.log('\nNo vehicles found');
      }
      
      console.log('\nProcessing time:', result.processing_time_ms, 'ms');
      console.log('======================================');
      
      // Small delay between tests to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error('Error running test:', error);
  }
}

runTest().catch(console.error); 