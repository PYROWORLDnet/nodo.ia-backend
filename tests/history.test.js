const fetch = require('node-fetch');
require('dotenv').config();

/**
 * This is a manual test file to test the search history functionality
 * Run with: node tests/history.test.js
 */

async function testHistory() {
  console.log('Search History API Test');
  console.log('======================');
  
  // You'll need a valid JWT token to test these endpoints
  const token = process.env.TEST_JWT_TOKEN || 'your_jwt_token_here';
  
  // Instructions for getting a token
  if (token === 'your_jwt_token_here') {
    console.log('\n⚠️ You need a valid JWT token to test these endpoints');
    console.log('First authenticate using Sign in with Apple, then use the token returned by the authentication endpoint');
    process.exit(1);
  }
  
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  
  console.log('\nTest endpoints:');
  console.log(`GET ${baseUrl}/history - Get search history`);
  console.log(`POST ${baseUrl}/history - Save a search query`);
  console.log(`PATCH ${baseUrl}/history/:id/favorite - Toggle favorite status`);
  console.log(`DELETE ${baseUrl}/history/:id - Delete a search entry`);
  console.log(`DELETE ${baseUrl}/history - Clear all search history`);
  
  console.log('\nExample requests:');
  
  console.log(`\n1. Get search history:`);
  console.log(`
  curl -X GET ${baseUrl}/history \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json"
  `);
  
  console.log(`\n2. Get favorites only:`);
  console.log(`
  curl -X GET "${baseUrl}/history?favorite=true" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json"
  `);
  
  console.log(`\n3. Save search query:`);
  console.log(`
  curl -X POST ${baseUrl}/history \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "Example search query",
    "response": {
      "results": ["Example result 1", "Example result 2"]
    },
    "context": {
      "deviceType": "iPhone",
      "appVersion": "1.0.0"
    }
  }'
  `);
  
  console.log(`\n4. Toggle favorite status:`);
  console.log(`
  # Replace :id with an actual search history ID
  curl -X PATCH ${baseUrl}/history/:id/favorite \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json"
  `);
  
  console.log(`\n5. Delete a search entry:`);
  console.log(`
  # Replace :id with an actual search history ID
  curl -X DELETE ${baseUrl}/history/:id \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json"
  `);
  
  console.log(`\n6. Clear all search history:`);
  console.log(`
  curl -X DELETE ${baseUrl}/history \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json"
  `);
  
  console.log('\nImplementation guide for your React Native app:');
  console.log(`
  // React Native implementation for handling search history
  import { useState, useEffect } from 'react';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  
  // Function to get JWT token from storage
  const getToken = async () => {
    try {
      return await AsyncStorage.getItem('userToken');
    } catch (error) {
      console.error('Failed to get token', error);
      return null;
    }
  };
  
  // Get user's search history
  async function fetchSearchHistory(favorite = false) {
    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch(
        \`${baseUrl}/history\${favorite ? '?favorite=true' : ''}\`, 
        {
          method: 'GET',
          headers: {
            'Authorization': \`Bearer \${token}\`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch history');
      return await response.json();
    } catch (error) {
      console.error('Error fetching history:', error);
      return { results: [] };
    }
  }
  
  // Save a search query
  async function saveSearch(query, response, context = {}) {
    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch('${baseUrl}/history', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          response,
          context,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to save search');
      return await response.json();
    } catch (error) {
      console.error('Error saving search:', error);
      return null;
    }
  }
  
  // Toggle favorite status
  async function toggleFavorite(searchId) {
    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch(\`${baseUrl}/history/\${searchId}/favorite\`, {
        method: 'PATCH',
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) throw new Error('Failed to toggle favorite');
      return await response.json();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return null;
    }
  }
  `);
}

// Run the test
testHistory(); 