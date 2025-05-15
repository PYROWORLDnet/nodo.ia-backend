const queryGenerator = require('../services/search/queryGenerator');
const responseGenerator = require('../services/search/responseGenerator');
const { pool } = require('../db');
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

class SearchController {
  async unifiedSearch(req, res) {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Query is required'
        });
      }

      // First, detect the intent and category using OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a search intent classifier. Analyze the query and determine:
              1. The category (vehicles, real_estate, products, or general)
              2. The language (en or es)
              3. A normalized query
              4. Confidence score (0-1)
              
              Return ONLY a JSON object with these fields.`
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const intent = JSON.parse(completion.choices[0].message.content);
      const { category, language, normalized_query, confidence } = intent;

      // Generate SQL query based on category and normalized query
      const sqlQuery = await queryGenerator.generateSQL(category, normalized_query, language);

      // If the query returns "SELECT 1 WHERE false", it means we should do a web search
      if (sqlQuery.text.includes('SELECT 1 WHERE false')) {
        // Perform web search
        const webSearchResults = await this.performWebSearch(query);
        
        // Generate natural language response from web search results
        const response = await responseGenerator.generateResponse(
          query,
          'general',
          null,
          webSearchResults
        );

        return res.json({
          success: true,
          category: 'general',
          source: 'web',
          detected_language: {
            code: language,
            name: language === 'es' ? 'Spanish' : 'English'
          },
          confidence,
          normalized_query,
          results: [],
          web_results: response
        });
      }

      // Execute SQL query
      const { rows } = await pool.query(sqlQuery.text);

      // Generate natural language response from database results
      const response = await responseGenerator.generateResponse(
        query,
        category,
        rows
      );

      return res.json({
        success: true,
        category,
        source: 'sql',
        detected_language: {
          code: language,
          name: language === 'es' ? 'Spanish' : 'English'
        },
        confidence,
        normalized_query,
        results: rows,
        response: response,
        sql_query: sqlQuery.text
      });

    } catch (error) {
      console.error('Search error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred while processing your search',
        error: error.message
      });
    }
  }

  async performWebSearch(query) {
    try {
      // Use a web search API (you'll need to implement this)
      // For now, we'll use OpenAI to generate a response
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a knowledgeable assistant. Someone has asked: "${query}"
              Provide a detailed, accurate response. If discussing cultural topics,
              be respectful and comprehensive. Include relevant facts and context.
              Format the response in a clear, engaging way.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      return [{
        title: "AI-Generated Response",
        url: null,
        snippet: completion.choices[0].message.content
      }];
    } catch (error) {
      console.error('Web search error:', error);
      return [];
    }
  }
}

module.exports = new SearchController(); 