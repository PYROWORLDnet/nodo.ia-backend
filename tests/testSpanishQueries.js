const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1/search';

const testQueries = [
  // Apartment queries
  {
    query: "apartamento en santo domingo",
    description: "Búsqueda básica de apartamento"
  },
  {
    query: "apto en distrito nacional",
    description: "Búsqueda con abreviatura común"
  },
  {
    query: "apartamento cerca de santo domingo este",
    description: "Búsqueda con ubicación específica"
  },
  
  // House queries
  {
    query: "casa en santo domingo norte",
    description: "Búsqueda de casa"
  },
  {
    query: "residencia en santo domingo oeste",
    description: "Búsqueda usando 'residencia'"
  },

  // Penthouse queries
  {
    query: "penthouse en santo domingo",
    description: "Búsqueda de penthouse"
  },
  {
    query: "ático en distrito nacional",
    description: "Búsqueda usando 'ático'"
  },

  // Specific amenities
  {
    query: "apartamento con piscina en santo domingo",
    description: "Búsqueda con amenidad específica"
  },
  {
    query: "casa con parqueo en santo domingo",
    description: "Búsqueda con parqueo"
  },
  {
    query: "apartamento con gimnasio distrito nacional",
    description: "Búsqueda con gimnasio"
  },

  // Mixed language queries
  {
    query: "apartment con piscina santo domingo",
    description: "Búsqueda mixta inglés/español"
  },
  {
    query: "penthouse with parking santo domingo",
    description: "Búsqueda mixta inglés/español"
  }
];

async function runTests() {
  console.log('Iniciando pruebas de búsqueda en español...\n');

  for (const test of testQueries) {
    try {
      console.log(`Probando: "${test.query}" (${test.description})`);
      
      const response = await axios.post(API_URL, {
        query: test.query
      });

      console.log('Categoría detectada:', response.data.category);
      console.log('Confianza:', response.data.confidence);
      console.log('Resultados encontrados:', response.data.results.length);
      console.log('Consulta SQL generada:', response.data.sql_query);
      console.log('----------------------------------------\n');

    } catch (error) {
      console.error(`Error en la prueba "${test.query}":`, error.message);
      console.log('----------------------------------------\n');
    }
  }
}

// Ejecutar las pruebas
runTests().catch(console.error); 