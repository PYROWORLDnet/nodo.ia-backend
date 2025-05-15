const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:3000';
const SEARCH_ENDPOINT = `${API_URL}/api/search/unified`;

// Test queries for different categories
const TEST_QUERIES = [
  // Vehicle queries
  {
    description: "Basic vehicle search",
    query: "Toyota Corolla 2020",
    expectedCategory: "vehicles"
  },
  {
    description: "Vehicle with price range",
    query: "Honda cars under $15000",
    expectedCategory: "vehicles"
  },
  {
    description: "Vehicle with multiple conditions",
    query: "Used SUV automatic transmission diesel",
    expectedCategory: "vehicles"
  },
  {
    description: "Vehicle in Spanish",
    query: "Carros Toyota usados en Santo Domingo",
    expectedCategory: "vehicles"
  },

  // Product queries
  {
    description: "Basic product search",
    query: "iPhone 13 Pro Max",
    expectedCategory: "products"
  },
  {
    description: "Product with price range",
    query: "laptops under $1000",
    expectedCategory: "products"
  },
  {
    description: "Product with specifications",
    query: "4K Smart TV 55 inch",
    expectedCategory: "products"
  },
  {
    description: "Product in Spanish",
    query: "Nevera Samsung dos puertas",
    expectedCategory: "products"
  },

  // Real estate queries
  {
    description: "Basic real estate search",
    query: "2 bedroom apartment in Piantini",
    expectedCategory: "real_estate"
  },
  {
    description: "Real estate with price range",
    query: "Houses for sale under $200000",
    expectedCategory: "real_estate"
  },
  {
    description: "Real estate with multiple conditions",
    query: "3 bedroom house with parking and pool",
    expectedCategory: "real_estate"
  },
  {
    description: "Real estate in Spanish",
    query: "Apartamentos en alquiler en Naco 2 habitaciones",
    expectedCategory: "real_estate"
  },

  // Edge cases and special queries
  {
    description: "Very short query",
    query: "car",
    expectedCategory: "vehicles"
  },
  {
    description: "Query with special characters",
    query: "BMW 3-series 2.0L",
    expectedCategory: "vehicles"
  },
  {
    description: "Query with location",
    query: "apartments near Bella Vista Mall",
    expectedCategory: "real_estate"
  },
  {
    description: "Mixed language query",
    query: "Toyota Corolla full extras en Santo Domingo",
    expectedCategory: "vehicles"
  }
];

async function testSearchEndpoint() {
  console.log('🔍 Starting Search API endpoint tests...\n');

  for (const test of TEST_QUERIES) {
    try {
      console.log(`Testing: ${test.description}`);
      console.log(`Query: "${test.query}"`);

      const startTime = Date.now();
      const response = await axios.post(SEARCH_ENDPOINT, {
        query: test.query
      });
      const endTime = Date.now();

      console.log(`✅ Response received in ${endTime - startTime}ms`);
      console.log('Category:', response.data.category);
      console.log('Confidence:', response.data.confidence);
      console.log('Language:', response.data.detected_language.name);

      if (response.data.source === 'sql') {
        console.log('SQL Query:', response.data.sql_query);
        console.log(`Found ${response.data.results.length} results`);
        
        if (response.data.results.length > 0) {
          console.log('\nFirst result:');
          const result = response.data.results[0];
          if (response.data.category === 'vehicles') {
            console.log(`${result.brand} ${result.model} - ${result.price}`);
          } else if (response.data.category === 'products') {
            console.log(`${result.title} - ${result.price}`);
          } else if (response.data.category === 'real_estate') {
            console.log(`${result.title} - ${result.price}`);
          }
        }
      } else {
        console.log('Web search results:', response.data.results.length);
      }

      // Category check
      if (response.data.category === test.expectedCategory) {
        console.log('✅ Category matched expected');
      } else {
        console.log(`⚠️ Category mismatch: expected ${test.expectedCategory}, got ${response.data.category}`);
      }

      console.log('\n' + '-'.repeat(80) + '\n');
    } catch (error) {
      console.error(`❌ Error testing "${test.query}":`, error.response?.data || error.message);
      console.log('\n' + '-'.repeat(80) + '\n');
    }
  }
}

// Run the tests
testSearchEndpoint().catch(console.error); 