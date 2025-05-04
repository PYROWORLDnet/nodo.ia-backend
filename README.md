# Vehicle NLP Query System with Dominican Assistant

A Node.js backend system that allows users to query a PostgreSQL database of vehicles using natural language in either English or Spanish. The system also functions as a Dominican cultural and informational assistant that can answer questions with real-time web search capabilities when needed.

## Features

- **Natural Language Processing**: Query the vehicle database using everyday language
- **Multilingual Support**: Automatically detects and responds in English or Spanish
- **Intelligent Query Interpretation**: Handles vague concepts like "luxury cars" or "family vehicles"
- **Performance Optimized**: Uses caching and efficient query processing
- **Dominican Cultural Context**: Special handling for queries about the Dominican Republic
- **Automatic Web Search**: Detects when real-time information is needed and performs searches
- **Unified Query System**: Send any query and get the appropriate response

## Prerequisites

- Node.js (v14+)
- PostgreSQL database with a `vehicles` table
- OpenAI API key
- Search API key (optional, for Bing or Google search)

## Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/vehicle-nlp-query-system.git
cd vehicle-nlp-query-system
```

2. Install dependencies:
```
npm install
```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your database credentials and OpenAI API key
   - Add your search API key for real-time web search (optional)

4. Set up the database with sample data:
```
npm run setup-db
```

5. Start the server:
```
npm start
```

## Testing

You can run the unified test script with sample queries for both vehicle and general information:

```
npm test
```

This will send a series of predefined queries to the API and display the results.

## Database Schema

The system expects a PostgreSQL database with a `vehicles` table containing the following fields:

- `brand`: The manufacturer (e.g., Toyota, BMW)
- `model`: The specific model name
- `engine`: Engine specifications
- `year`: Year of manufacture
- `condition`: New, Used, etc.
- `use`: Purpose or usage type
- `exterior`: Exterior color or condition
- `interior`: Interior materials or color
- `price`: Price in currency units
- `price_value`: Qualitative price descriptor
- `transmission`: Automatic, Manual, etc.
- `traction`: FWD, RWD, AWD, etc.
- `fuel`: Gasoline, Diesel, Electric, etc.
- `passengers`: Number of passengers
- `location`: Geographic location

## API Usage

### Process Any Query

**Endpoint**: `POST /query`

**Request Body**:
```json
{
  "query": "¿Cuáles son los Toyota Corolla 2020 en Santo Domingo?"
}
```

**Response (With vehicle results)**:
```json
{
  "response": "Encontré 5 Toyota Corolla del año 2020 en Santo Domingo. Los precios varían entre RD$950,000 y RD$1,200,000 dependiendo de las condiciones y el kilometraje.",
  "vehicles": [
    {
      "id": 1,
      "brand": "Toyota",
      "model": "Corolla",
      "year": 2020,
      "price": 1100000,
      "location": "Santo Domingo",
      "...": "..."
    },
    "..."
  ],
  "total_results": 5,
  "processing_time_ms": 542
}
```

**Request Body (Requiring web search)**:
```json
{
  "query": "¿Cuál es el precio actual del dólar en República Dominicana?"
}
```

**Response (With web search)**:
```json
{
  "response": "El precio actual del dólar en República Dominicana es aproximadamente 58.5 pesos dominicanos por 1 USD. Esto puede variar ligeramente dependiendo de la entidad bancaria o casa de cambio que consultes.",
  "search_performed": true,
  "processing_time_ms": 1250
}
```

### Spanish or English Support

The system automatically detects the language of your query and responds in the same language. You can ask questions in either language and receive responses in kind.

## How It Works

The unified system automatically handles all types of queries:

1. For each query, the system:
   - Detects the language (Spanish or English)
   - Checks if web search is needed based on keywords
   - Performs web search if necessary
   - Attempts to find vehicle database matches
   - Returns the most relevant response

2. For vehicle queries:
   - Returns database results and a natural language summary
   
3. For general information:
   - Uses the Dominican-specific context
   - Incorporates web search results when available
   - Provides a conversational response

## Architecture

- **Express.js API Layer**: Handles HTTP requests
- **OpenAI Integration**: Processes natural language
- **Language Detection**: Automatically identifies the query language
- **Automatic Search Detection**: Determines when web search is needed
- **PostgreSQL Database**: Stores vehicle information
- **Web Search Integration**: Connects to Bing or Google API for real-time information
- **In-memory Caching**: Improves performance for repeated queries

## License

MIT 