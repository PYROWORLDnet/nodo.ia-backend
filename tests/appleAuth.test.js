const fetch = require('node-fetch');
const { verifyAppleToken, exchangeAppleCodeForTokens } = require('../src/utils/appleAuth');
require('dotenv').config();

/**
 * This is a manual test file to test the Apple Sign-In functionality
 * Run with: node tests/appleAuth.test.js
 */

async function testAppleAuth() {
  console.log('Apple Sign-In Test');
  console.log('=================');
  
  // Check if required environment variables are set
  const requiredVars = [
    'APPLE_CLIENT_ID',
    'APPLE_TEAM_ID',
    'APPLE_KEY_ID',
    'APPLE_REDIRECT_URI',
    'APPLE_PRIVATE_KEY'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`Error: Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please make sure these are set in your .env file.');
    process.exit(1);
  }
  
  console.log('Environment variables present. Please note you need to provide a valid code or token for testing.');
  console.log('\nTest instructions for iOS:');
  console.log('1. Implement Sign in with Apple in your iOS app');
  console.log('2. When successful, extract the authorization code or identity token');
  console.log('3. Use that code or token to test the endpoints directly');
  
  console.log('\nTest endpoints:');
  console.log(`POST ${process.env.API_BASE_URL || 'http://localhost:3000'}/auth/apple/code`);
  console.log(`POST ${process.env.API_BASE_URL || 'http://localhost:3000'}/auth/apple/token`);
  
  console.log('\nExample request with authorization code:');
  console.log(`
  curl -X POST ${process.env.API_BASE_URL || 'http://localhost:3000'}/auth/apple/code \\
  -H "Content-Type: application/json" \\
  -d '{
    "code": "your_authorization_code_here",
    "user": {
      "name": {
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  }'
  `);
  
  console.log('\nExample request with ID token:');
  console.log(`
  curl -X POST ${process.env.API_BASE_URL || 'http://localhost:3000'}/auth/apple/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "idToken": "your_id_token_here",
    "user": {
      "name": {
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  }'
  `);
  
  console.log('\nImplementation guide for your React Native app:');
  console.log(`
  // React Native implementation using react-native-apple-authentication
  
  import { appleAuth } from '@invertase/react-native-apple-authentication';
  import { Alert } from 'react-native';
  
  // Apple Sign In Button Press Handler
  async function onAppleButtonPress() {
    try {
      // Perform the Apple Sign In request
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });
      
      // Get the response details
      const {
        identityToken, // JWT token, can be sent directly to your server
        authorizationCode, // OR use authorization code
        fullName, // May be null if not requested
        email, // May be null if not requested
      } = appleAuthRequestResponse;
      
      // Send to your backend API using one of these approaches:
      
      // 1. Using identityToken (recommended)
      const response = await fetch('${process.env.API_BASE_URL || 'http://localhost:3000'}/auth/apple/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: identityToken,
          user: {
            name: {
              firstName: fullName?.givenName,
              lastName: fullName?.familyName,
            }
          }
        }),
      });
      
      // OR 2. Using authorization code
      const response = await fetch('${process.env.API_BASE_URL || 'http://localhost:3000'}/auth/apple/code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: authorizationCode,
          user: {
            name: {
              firstName: fullName?.givenName,
              lastName: fullName?.familyName,
            }
          }
        }),
      });
      
      const data = await response.json();
      
      // Store the JWT token from your server for subsequent authenticated requests
      const { token } = data;
      // Save token to secure storage...
      
    } catch (error) {
      Alert.alert('Sign in with Apple failed', error.message);
    }
  }
  `);
}

// Run the test
testAppleAuth(); 