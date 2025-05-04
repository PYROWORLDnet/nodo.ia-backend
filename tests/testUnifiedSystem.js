/**
 * Test script for the unified query system
 * This script tests car database queries and web search fallback
 * 
 * Run with: node scripts/testUnifiedSystem.js
 */

const fetch = require('node-fetch');
require('dotenv').config();

// API configuration
const PORT = process.env.PORT || 3000;
const API_URL = `http://localhost:${PORT}/query`;

// Sample test queries
const TEST_QUERIES = [
  // Car database queries
  { 
    text: "Show me Toyota Corollas from 2020",
    description: "Car model & year query",
    expectedType: "car"
  },
  { 
    text: "¿Cuáles son los carros más baratos en Santo Domingo?",
    description: "Cheapest cars query in Spanish",
    expectedType: "car"
  },
  
  // Non-car queries that should trigger web search
  { 
    text: "Where can I find throat medicine in Santo Domingo?", 
    description: "Medicine query",
    expectedType: "web-search"
  },
  { 
    text: "¿Cuál es el precio actual del dólar en República Dominicana?", 
    description: "Currency price query in Spanish",
    expectedType: "web-search"
  },
  { 
    text: "What are the best beaches in Punta Cana?", 
    description: "Tourism query in English",
    expectedType: "web-search"
  },
  { 
    text: "¿Dónde puedo encontrar una farmacia abierta cerca de la Zona Colonial?", 
    description: "Pharmacy query in Spanish",
    expectedType: "web-search"
  }
];

/**
 * Test unified query API
 */
async function testUnifiedSystem() {
  console.log("\n=== Testing Unified Query System ===\n");
  
  for (const query of TEST_QUERIES) {
    try {
      console.log(`Testing: ${query.description} - "${query.text}"`);
      console.log(`Expected type: ${query.expectedType}`);
      
      const startTime = Date.now();
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: query.text })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const elapsedTime = Date.now() - startTime;
      
      console.log(`  - Response received in ${elapsedTime}ms`);
      console.log(`  - API processing time: ${data.processing_time_ms}ms`);
      console.log(`  - Response: "${data.response.substring(0, 100)}${data.response.length > 100 ? '...' : ''}"`);
      
      // Check response properties
      const hasVehicles = Array.isArray(data.vehicles) && data.vehicles.length > 0;
      const hasSearchResults = Array.isArray(data.search_results) && data.search_results.length > 0;
      
      const actualType = hasVehicles ? "car" : (hasSearchResults ? "web-search" : "unknown");
      
      console.log(`  - Detected type: ${actualType}`);
      console.log(`  - Type detection correct: ${actualType === query.expectedType ? "✅" : "❌"}`);
      
      if (hasVehicles) {
        console.log(`  - Found ${data.vehicles.length} vehicles in database`);
      }
      
      if (hasSearchResults) {
        console.log(`  - Found ${data.search_results.length} search results`);
        // Show first search result details
        if (data.search_results.length > 0) {
          const firstResult = data.search_results[0];
          console.log(`  - First result: ${firstResult.title}`);
          console.log(`  - Location: ${firstResult.location || 'N/A'}`);
          console.log(`  - URL: ${firstResult.url || 'N/A'}`);
        }
      }
      
      console.log("\n");
    } catch (error) {
      console.error(`Error testing query "${query.text}":`, error.message);
    }
  }
}

// Execute tests
testUnifiedSystem().catch(error => {
  console.error("Test error:", error);
}); 