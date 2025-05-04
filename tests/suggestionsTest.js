/**
 * Test script for the smart suggestions functionality
 * This tests how the system responds to vehicle queries that return no results
 */

require('dotenv').config();
const { extractVehicleParameters } = require('../src/langchain/agent');
const { detectLanguage } = require('../src/utils/languageDetector');
const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate intelligent suggestions when no vehicles are found
 * @param {Object} extractedParams - The parameters extracted from the query
 * @param {string} language - The detected language
 * @returns {Promise<Object>} - Alternative suggestions and follow-up questions
 */
async function generateSmartSuggestions(extractedParams, language) {
  try {
    // Get parameters
    const params = extractedParams.parameters || {};
    
    // Build suggestion prompt
    const prompt = `
    You are a vehicle database expert helping a user who found NO RESULTS for their search.
    
    The user was looking for: ${JSON.stringify(params, null, 2)}
    
    Your task:
    1. Analyze what might have caused zero results (too specific? rare combination?)
    2. Generate 3 SPECIFIC alternative searches that are more likely to yield results
    3. Create 2 follow-up questions to better understand what the user wants
    
    IMPORTANT:
    - Suggest relaxing the most restrictive parameters first
    - For technical specs (like cylinders), suggest alternatives (e.g., "Try V6 instead of V8")
    - If price range seems unrealistic, suggest a more realistic range
    - For rare models/brands, suggest similar popular alternatives
    - Follow-up questions should be conversational and focused on clarifying intent
    
    Return JSON with this structure:
    {
      "analysis": "Brief analysis of why the search might have failed",
      "alternative_searches": [
        {
          "description": "Description of alternative search 1",
          "modified_parameters": {"key parameters that changed": "new values"}
        },
        {similar structure for other alternatives}
      ],
      "follow_up_questions": [
        "Question 1?",
        "Question 2?"
      ]
    }`;
    
    // Generate suggestions using AI
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "Generate smart suggestions for this failed vehicle search" }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });
    
    const suggestions = JSON.parse(response.choices[0].message.content);
    console.log('Generated smart suggestions:', suggestions);
    
    return suggestions;
  } catch (error) {
    console.error('Error generating smart suggestions:', error);
    // Return simple fallback suggestions
    return {
      analysis: language === 'es' 
        ? "La búsqueda puede ser demasiado específica." 
        : "The search may be too specific.",
      alternative_searches: [
        {
          description: language === 'es' ? "Intente ampliar su búsqueda" : "Try broadening your search",
          modified_parameters: {}
        }
      ],
      follow_up_questions: [
        language === 'es' ? "¿Qué características son más importantes para usted?" : "Which features are most important to you?",
        language === 'es' ? "¿Consideraría otras marcas o modelos?" : "Would you consider other brands or models?"
      ]
    };
  }
}

/**
 * Generate a natural language response based on the suggestions
 * @param {string} query - The original user query
 * @param {Object} suggestions - The suggestions object
 * @param {string} language - The detected language
 * @returns {Promise<string>} - Formatted response
 */
async function generateResponseFromSuggestions(query, suggestions, language) {
  const prompt = `
    You are a professional vehicle database assistant providing a ${language === 'es' ? 'Spanish' : 'English'} response to: "${query}"
    
    Unfortunately, no vehicles were found that match this query.
    
    Our analysis suggests: "${suggestions.analysis}"
    
    Alternative searches to suggest:
    ${suggestions.alternative_searches.map(alt => `- ${alt.description}`).join('\n')}
    
    Follow-up questions:
    ${suggestions.follow_up_questions.map(q => `- ${q}`).join('\n')}
    
    Give a professional, helpful response that:
    1. Acknowledges that no results were found
    2. Briefly explains why (using the analysis)
    3. Suggests 2-3 specific alternative searches they could try
    4. Asks 1-2 follow-up questions to better understand their needs
    5. Maintains a professional, courteous tone
    6. ONLY return the text response, nothing else
  `;
  
  const formattedResponse = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: "Format the no-results response" }
    ],
    temperature: 0.6
  });
  
  return formattedResponse.choices[0].message.content;
}

// Test queries that would likely return no results
const TEST_QUERIES = [
  {
    query: "I am looking for toyota revo",
    description: "Query with common vehicle model that should get parameters even if API fails"
  },
  {
    query: "McLaren P1 under $50,000",
    description: "Unrealistic price for luxury/exotic car"
  },
  {
    query: "Used 2023 BMW i8 with 12 cylinders",
    description: "Car with incorrect technical specifications (i8 doesn't have 12 cylinders)"
  },
  {
    query: "Toyota pickup from 1950s with automatic transmission",
    description: "Combination of old model with modern feature that likely doesn't exist"
  },
  {
    query: "coche Ferrari rojo descapotable menos de 10000 dólares",
    description: "Spanish query with unrealistic price for luxury convertible"
  },
  {
    query: "8 cylinder electric car",
    description: "Contradictory specifications (electric cars don't have cylinders)"
  }
];

// Run the test
async function runSuggestionsTest() {
  console.log("=== SMART SUGGESTIONS AND FALLBACK TEST ===\n");
  
  for (const testCase of TEST_QUERIES) {
    console.log(`\n--- Testing: "${testCase.query}" ---`);
    console.log(`Description: ${testCase.description}`);
    
    // Detect language
    const language = detectLanguage(testCase.query);
    console.log(`Detected language: ${language}`);
    
    // Test extraction with timeout
    console.time('extractionTime');
    let params = null;
    try {
      params = await extractVehicleParameters(testCase.query, language);
    } catch (error) {
      console.error('Extraction error:', error);
    }
    console.timeEnd('extractionTime');
    
    console.log('\nExtracted parameters:');
    console.log(JSON.stringify(params, null, 2));
    
    // Verify Dominican Republic is included
    if (params && params.parameters) {
      console.log(`\nLocation included: ${params.parameters.location ? 'YES' : 'NO'}`);
      if (params.parameters.location) {
        console.log(`Location value: ${params.parameters.location}`);
      }
    }
    
    // Only generate suggestions for queries expected to have no results (skip first query)
    if (testCase.query !== "I am looking for toyota revo") {
      // Generate smart suggestions
      console.time('suggestionsTime');
      const suggestions = await generateSmartSuggestions(params, language);
      console.timeEnd('suggestionsTime');
      
      console.log('\nSmart suggestions:');
      console.log(JSON.stringify(suggestions, null, 2));
      
      // Generate natural language response
      console.time('responseTime');
      const response = await generateResponseFromSuggestions(
        testCase.query,
        suggestions,
        language
      );
      console.timeEnd('responseTime');
      
      console.log('\nFormatted response:');
      console.log(response);
    }
    
    console.log("\n" + "-".repeat(50));
  }
  
  console.log("\n=== TEST COMPLETED ===");
}

// Test the fallback parameter extraction independently
async function testFallbackExtraction() {
  console.log("\n=== TESTING FALLBACK EXTRACTION ===\n");
  
  const testCases = [
    "toyota revo",
    "honda civic 2020",
    "bmw x5"
  ];
  
  for (const query of testCases) {
    console.log(`\nQuery: "${query}"`);
    const language = detectLanguage(query);
    
    // Import the createFallbackParameters function from agent.js
    const { createFallbackParameters } = require('../src/langchain/agent');
    
    // If not exported directly, recreate the function here
    const fallbackParams = typeof createFallbackParameters === 'function' 
      ? createFallbackParameters(query, language)
      : createSimpleFallbackParameters(query, language);
    
    console.log('Fallback parameters:');
    console.log(JSON.stringify(fallbackParams, null, 2));
  }
}

// Simple version of the fallback function for testing
function createSimpleFallbackParameters(query, language) {
  const normalizedQuery = query.toLowerCase();
  
  // Extract potential brand
  let brand = null;
  const commonBrands = [
    'toyota', 'honda', 'ford', 'chevrolet', 'nissan', 'bmw'
  ];
  
  for (const b of commonBrands) {
    if (normalizedQuery.includes(b)) {
      brand = b;
      break;
    }
  }
  
  // Create basic parameters
  const parameters = {};
  if (brand) parameters.brand = brand;
  
  // Check for common models
  if (brand === 'toyota' && normalizedQuery.includes('revo')) {
    parameters.model = 'revo';
  }
  
  // Always add Dominican Republic
  parameters.location = "Dominican Republic";
  
  return {
    parameters: parameters,
    query_type: "general",
    is_technical_search: false
  };
}

// Execute the tests
async function runAllTests() {
  await runSuggestionsTest();
  await testFallbackExtraction();
}

runAllTests().catch(console.error); 