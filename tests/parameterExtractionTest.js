const { OpenAI } = require('openai');
const { detectLanguage } = require('../src/utils/languageDetector');
require('dotenv').config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extracts and refines structured parameters from a vehicle query
 * @param {string} query - The user query
 * @param {string} language - The detected language ('es' or 'en')
 * @returns {Promise<Object>} - Structured parameters
 */
async function extractVehicleParameters(query, language) {
  try {
    // Create a parameter extraction prompt
    const prompt = `
    You are a vehicle database expert. Extract specific parameters from this query:
    
    QUERY: "${query}"
    LANGUAGE: ${language === 'es' ? 'Spanish' : 'English'}
    
    INSTRUCTIONS:
    1. Analyze query for vehicle specifications
    2. Extract all relevant parameters
    3. Pay special attention to TECHNICAL PARAMETERS such as cylinders, engine size, etc.
    4. Parse TECHNICAL PARAMETERS correctly (e.g., "8 cylinder" should be saved as cylinders: 8)
    5. For ambiguous terms, include alternatives (e.g., "Benz" → brand: "Mercedes")
    
    PARAMETERS TO EXTRACT (include ONLY those mentioned):
    - brand: Car manufacturer
    - model: Specific model name
    - year_range: Min and max years
    - price_range: Min and max price
    - vehicle_type: Category (SUV, sedan, etc.)
    - engine_specs: {
        cylinders: number of cylinders (IMPORTANT for queries like "8 cylinders car")
        displacement: Engine size (e.g. "2.0L")
        type: Engine type (e.g. "V6", "turbo")
      }
    - transmission: Manual/automatic
    - fuel_type: Gasoline/diesel/etc.
    - color: Vehicle color
    - condition: New/used
    - location: Geographic location
    
    RETURN JSON ONLY with this structure:
    {
      "parameters": {
        "brand": string or [string],
        "model": string or [string],
        "year_range": {"min": number, "max": number},
        "price_range": {"min": number, "max": number},
        "vehicle_type": string or [string],
        "engine_specs": {
          "cylinders": number,
          "displacement": string,
          "type": string
        },
        "transmission": string,
        "fuel_type": string,
        "color": string,
        "condition": string,
        "location": string
      },
      "query_type": "technical" or "general",
      "is_technical_search": boolean (true if query mentions engine specs)
    }`;
    
    // Call the AI to extract parameters
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: query }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 350
    });
    
    // Parse the response
    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (error) {
    console.error('Error extracting vehicle parameters:', error);
    return {
      parameters: {},
      query_type: "general",
      is_technical_search: false
    };
  }
}

/**
 * Build an optimized SQL query based on extracted parameters
 * @param {Object} params - The extracted parameters
 * @returns {string} - SQL query for vehicle search
 */
function buildOptimizedSqlQuery(params) {
  const conditions = [];
  const parameters = params.parameters || {};
  
  // Handle brand
  if (parameters.brand) {
    if (Array.isArray(parameters.brand)) {
      const brandConditions = parameters.brand.map(brand => `brand ILIKE '%${brand}%'`);
      conditions.push(`(${brandConditions.join(' OR ')})`);
    } else {
      conditions.push(`brand ILIKE '%${parameters.brand}%'`);
    }
  }
  
  // Handle model
  if (parameters.model) {
    if (Array.isArray(parameters.model)) {
      const modelConditions = parameters.model.map(model => 
        `(model ILIKE '%${model}%' OR similarity(model, '${model}') > 0.4)`
      );
      conditions.push(`(${modelConditions.join(' OR ')})`);
    } else {
      conditions.push(`(model ILIKE '%${parameters.model}%' OR similarity(model, '${parameters.model}') > 0.4)`);
    }
  }
  
  // Handle year range
  if (parameters.year_range) {
    if (parameters.year_range.min) {
      conditions.push(`year::integer >= ${parameters.year_range.min}`);
    }
    if (parameters.year_range.max) {
      conditions.push(`year::integer <= ${parameters.year_range.max}`);
    }
  }
  
  // Handle price range
  if (parameters.price_range) {
    if (parameters.price_range.min) {
      conditions.push(`REPLACE(price_value, ',', '')::numeric >= ${parameters.price_range.min}`);
    }
    if (parameters.price_range.max) {
      conditions.push(`REPLACE(price_value, ',', '')::numeric <= ${parameters.price_range.max}`);
    }
  }
  
  // Handle vehicle type
  if (parameters.vehicle_type) {
    if (Array.isArray(parameters.vehicle_type)) {
      const typeConditions = parameters.vehicle_type.map(type => `model ILIKE '%${type}%'`);
      conditions.push(`(${typeConditions.join(' OR ')})`);
    } else {
      conditions.push(`model ILIKE '%${parameters.vehicle_type}%'`);
    }
  }
  
  // Handle engine specifications - IMPORTANT for technical queries
  if (parameters.engine_specs) {
    // Handle cylinders - this is what was missing previously
    if (parameters.engine_specs.cylinders) {
      // Search for cylinders in the engine field, not in model or brand
      const cylinders = parameters.engine_specs.cylinders;
      conditions.push(`(engine ILIKE '%${cylinders}%cylinder%' OR engine ILIKE '%${cylinders}%cilindro%' OR engine ILIKE '%V${cylinders}%')`);
    }
    
    // Handle displacement
    if (parameters.engine_specs.displacement) {
      conditions.push(`engine ILIKE '%${parameters.engine_specs.displacement}%'`);
    }
    
    // Handle engine type
    if (parameters.engine_specs.type) {
      conditions.push(`engine ILIKE '%${parameters.engine_specs.type}%'`);
    }
  }
  
  // Handle transmission
  if (parameters.transmission) {
    conditions.push(`transmission ILIKE '%${parameters.transmission}%'`);
  }
  
  // Handle fuel type
  if (parameters.fuel_type) {
    conditions.push(`fuel ILIKE '%${parameters.fuel_type}%'`);
  }
  
  // Handle color
  if (parameters.color) {
    conditions.push(`exterior ILIKE '%${parameters.color}%'`);
  }
  
  // Handle condition
  if (parameters.condition) {
    conditions.push(`condition ILIKE '%${parameters.condition}%'`);
  }
  
  // Handle location
  if (parameters.location) {
    conditions.push(`(location ILIKE '%${parameters.location}%' OR address ILIKE '%${parameters.location}%')`);
  }
  
  // Build final query
  let sqlQuery = "SELECT * FROM vehicles";
  
  if (conditions.length > 0) {
    sqlQuery += " WHERE " + conditions.join(" AND ");
  }
  
  // Always add a limit
  sqlQuery += " LIMIT 15";
  
  return sqlQuery;
}

// Test queries that demonstrate the parameter extraction
const TEST_QUERIES = [
  {
    query: "8 cylinders car",
    description: "Technical query with cylinder specification in English"
  },
  {
    query: "coche con 8 cilindros",
    description: "Technical query with cylinder specification in Spanish"
  },
  {
    query: "BMW under $50,000",
    description: "Brand with price range"
  },
  {
    query: "Toyota Corolla 2020 usado en Santo Domingo",
    description: "Specific vehicle with year, condition and location"
  },
  {
    query: "V8 pickup truck",
    description: "Technical query with engine type and vehicle type"
  }
];

// Run the test
async function runParameterExtractionTest() {
  console.log("=== VEHICLE PARAMETER EXTRACTION TEST ===\n");
  
  for (const testCase of TEST_QUERIES) {
    console.log(`\n--- Testing: "${testCase.query}" ---`);
    console.log(`Description: ${testCase.description}`);
    
    // Detect language
    const language = detectLanguage(testCase.query);
    console.log(`Detected language: ${language}`);
    
    // Extract parameters
    console.time('extractionTime');
    const params = await extractVehicleParameters(testCase.query, language);
    console.timeEnd('extractionTime');
    
    console.log('\nExtracted parameters:');
    console.log(JSON.stringify(params, null, 2));
    
    // Build SQL
    const sqlQuery = buildOptimizedSqlQuery(params);
    
    console.log('\nGenerated SQL query:');
    console.log(sqlQuery);
    
    console.log("\n" + "-".repeat(50));
  }
  
  console.log("\n=== TEST COMPLETED ===");
}

// Execute the test
runParameterExtractionTest().catch(console.error); 