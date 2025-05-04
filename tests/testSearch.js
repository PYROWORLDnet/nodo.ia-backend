/**
 * Test Script for SearchAPI.io Integration
 * 
 * This script tests the updated web search functionality using SearchAPI.io
 * Run with: node scripts/testSearch.js
 */

require('dotenv').config();
const { performWebSearch, detectLanguage } = require('../src/utils/promptEnhancer');

async function testSearch() {
  console.log('Starting SearchAPI.io integration test...');
  console.log('API Key configured:', process.env.SEARCH_API_KEY ? 'Yes' : 'No');
  
  // Test queries in English and Spanish
  const queries = [
    "What are the best pharmacies in Santo Domingo",
    "Farmacias abiertas 24 horas en Santo Domingo",
    "4 cylinder cars in Dominican Republic",
    "Current dollar price in Dominican Republic"
  ];
  
  console.log('Testing search for the following queries:');
  console.log(queries);
  console.log('------------------------------------');
  
  for (const query of queries) {
    console.log(`\nTesting search for: "${query}"`);
    
    try {
      // Detect language
      const language = detectLanguage(query);
      console.log(`Detected language: ${language}`);
      
      // Perform web search
      console.time('Search completed in');
      const searchResults = await performWebSearch(query, language);
      console.timeEnd('Search completed in');
      
      // Print results summary
      console.log(`Found ${searchResults.options.length} results`);
      console.log('Summary:', searchResults.summary);
      
      // Print first result details
      if (searchResults.options.length > 0) {
        console.log('\nFirst result:');
        console.log(`Title: ${searchResults.options[0].title}`);
        console.log(`Description: ${searchResults.options[0].description.substring(0, 100)}...`);
        console.log(`URL: ${searchResults.options[0].url}`);
        console.log(`Location: ${searchResults.options[0].location || 'Not detected'}`);
      }
      
      console.log('------------------------------------');
    } catch (error) {
      console.error(`Error testing search for "${query}":`, error);
    }
  }
}

// Run the test
testSearch().catch(console.error); 