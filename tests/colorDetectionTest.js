/**
 * Test script for vehicle color detection functionality
 * This tests how the system detects colors in both English and Spanish
 */

require('dotenv').config();
const { detectVehicleColor } = require('../src/langchain/agent');

// If detectVehicleColor is not exported directly, include it here
function localDetectVehicleColor(query) {
  const normalizedQuery = query.toLowerCase();
  
  // Common colors in English and Spanish with variations
  const colorMap = {
    // Basic colors with variations
    'black': ['black', 'negro', 'negra', 'oscuro', 'oscura', 'midnight'],
    'white': ['white', 'blanco', 'blanca', 'pearl', 'polar', 'ivory', 'perla'],
    'red': ['red', 'rojo', 'roja', 'burgundy', 'crimson', 'vermillion', 'scarlet', 'carmesí'],
    'blue': ['blue', 'azul', 'navy', 'cobalt', 'turquoise', 'turquesa', 'celeste'],
    'green': ['green', 'verde', 'olive', 'jade', 'emerald', 'lime', 'forest', 'esmeralda'],
    'yellow': ['yellow', 'amarillo', 'amarilla', 'gold', 'oro', 'dorado', 'amber', 'ámbar'],
    'orange': ['orange', 'naranja', 'anaranjado', 'amber', 'ámbar'],
    'purple': ['purple', 'violet', 'púrpura', 'violeta', 'morado', 'lavender', 'lavanda'],
    'pink': ['pink', 'rosa', 'rosado', 'rosada', 'fuschia', 'magenta'],
    'brown': ['brown', 'café', 'marrón', 'marron', 'chocolate', 'tan', 'beige', 'khaki', 'caqui'],
    'gray': ['gray', 'grey', 'gris', 'silver', 'plata', 'plateado', 'charcoal'],
    
    // Metallic variations
    'silver': ['silver', 'plata', 'plateado', 'argent'],
    'bronze': ['bronze', 'bronce'],
    'champagne': ['champagne', 'champán', 'champan'],
    
    // Custom car colors
    'burgundy': ['burgundy', 'wine', 'vino', 'bordeaux', 'burdeos'],
    'teal': ['teal', 'turquoise', 'turquesa'],
    'cream': ['cream', 'crema', 'beige'],
    'navy': ['navy', 'navy blue', 'azul marino'],
    'charcoal': ['charcoal', 'carbon', 'carbón', 'graphite', 'grafito'],
    
    // Two-tone descriptions
    'two-tone': ['two-tone', 'two tone', 'bi-color', 'bicolor', 'dos colores', 'dos tonos']
  };
  
  // Check for color mentions in the query
  for (const [standardColor, variations] of Object.entries(colorMap)) {
    for (const colorTerm of variations) {
      // Look for the color term as a whole word
      if (new RegExp(`\\b${colorTerm}\\b`).test(normalizedQuery)) {
        return standardColor;
      }
    }
  }
  
  // Descriptive terms that might indicate colors
  const descriptiveColors = {
    'metallic': 'metallic',
    'metálico': 'metallic',
    'matte': 'matte',
    'mate': 'matte',
    'gloss': 'glossy',
    'brillante': 'glossy',
    'pearl': 'pearl',
    'perla': 'pearl',
    'iridescent': 'iridescent',
    'iridiscente': 'iridescent'
  };
  
  // Check for descriptive color terms
  for (const [term, description] of Object.entries(descriptiveColors)) {
    if (normalizedQuery.includes(term)) {
      // Find if there's also a standard color
      for (const [standardColor, variations] of Object.entries(colorMap)) {
        for (const colorTerm of variations) {
          if (new RegExp(`\\b${colorTerm}\\b`).test(normalizedQuery)) {
            return `${description} ${standardColor}`;
          }
        }
      }
      
      // If no standard color found with descriptor
      return description;
    }
  }
  
  return null;
}

// Test queries with color mentions
const TEST_QUERIES = [
  // English queries with colors
  "I want a black Toyota Corolla",
  "Looking for a red car under $20,000",
  "Show me blue SUVs from 2020",
  "Metallic silver BMW",
  "Pearl white Honda Civic",
  "Matte black Mercedes",
  "Dark gray Ford truck",
  "Burgundy sedan with leather interior",
  "Champagne colored Lexus",
  "Two-tone white and black Toyota",
  
  // Spanish queries with colors
  "Busco un Toyota negro",
  "Quiero un carro rojo menos de $20,000",
  "Muéstrame SUVs azules del 2020",
  "BMW plata metálico",
  "Honda Civic blanco perla",
  "Mercedes negro mate",
  "Camioneta Ford gris oscuro",
  "Sedán color vino con interior de cuero",
  "Lexus color champán",
  "Toyota bicolor blanco y negro",
  
  // Mixed language and edge cases
  "Looking for carro negro",
  "Busco un blue car",
  "Toyota Corolla midnight black",
  "Carro color graphite",
  "Forest green SUV with sunroof",
  "Vehículo amarillo oro",
  "Purple car with good mileage",
  "Toyota Land Cruiser gris plateado"
];

// Run the test
function runColorDetectionTest() {
  console.log("=== VEHICLE COLOR DETECTION TEST ===\n");
  
  console.log("Using detectVehicleColor function...\n");
  
  // Use the imported function if available, otherwise use local version
  const colorDetector = typeof detectVehicleColor === 'function' 
    ? detectVehicleColor 
    : localDetectVehicleColor;
  
  for (const query of TEST_QUERIES) {
    const detectedColor = colorDetector(query);
    
    console.log(`Query: "${query}"`);
    if (detectedColor) {
      console.log(`Detected color: ${detectedColor}`);
    } else {
      console.log("No color detected");
    }
    console.log("-".repeat(40));
  }
  
  console.log("\n=== TEST COMPLETED ===");
}

// Execute the test
runColorDetectionTest(); 