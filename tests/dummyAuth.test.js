const fetch = require('node-fetch');
require('dotenv').config();

/**
 * This is a test file for the dummy Apple Sign-In functionality
 * Run with: node tests/dummyAuth.test.js
 */

async function testDummyAuth() {
  console.log('Dummy Apple Sign-In Test');
  console.log('=======================');
  
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  
  console.log('\nThis test will use the dummy endpoint to simulate Apple Sign-In without needing real Apple credentials.');
  console.log(`\nEndpoint: POST ${baseUrl}/auth/dummy/apple`);
  
  // 1. Test with default values
  console.log('\n1. Testing with default values:');
  console.log(`
  curl -X POST ${baseUrl}/auth/dummy/apple \\
  -H "Content-Type: application/json" \\
  -d '{}'
  `);
  
  // 2. Test with custom user info
  console.log('\n2. Testing with custom user info:');
  console.log(`
  curl -X POST ${baseUrl}/auth/dummy/apple \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "yourname@example.com",
    "firstName": "Your",
    "lastName": "Name"
  }'
  `);
  
  // Try to actually perform the request if we're running this directly
  try {
    console.log('\n🔄 Attempting to call the dummy endpoint...');
    
    const response = await fetch(`${baseUrl}/auth/dummy/apple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Success! Response:');
      console.log(JSON.stringify(data, null, 2));
      
      // Save the token to TEST_JWT_TOKEN environment variable for use in other tests
      console.log('\n💡 To use this token in other tests, set the TEST_JWT_TOKEN environment variable:');
      console.log(`\nIn .env file:`);
      console.log(`TEST_JWT_TOKEN=${data.token}`);
      
      console.log('\n📝 Example usage with token:');
      console.log(`
      curl -X GET ${baseUrl}/history \\
      -H "Authorization: Bearer ${data.token}" \\
      -H "Content-Type: application/json"
      `);
    } else {
      const errorData = await response.json();
      console.log('\n❌ Error calling endpoint:');
      console.log(JSON.stringify(errorData, null, 2));
    }
  } catch (error) {
    console.log('\n❌ Failed to connect:');
    console.log(`Error: ${error.message}`);
    console.log('\nMake sure your server is running and accessible at', baseUrl);
  }
  
  console.log('\n📋 After generating a token:');
  console.log('1. You can use this token to test the history endpoints');
  console.log('2. The token is valid for 30 days');
  console.log('3. You can verify the token with GET /auth/verify');
}

// Run the test
testDummyAuth(); 