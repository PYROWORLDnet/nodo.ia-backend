const queryGenerator = require('../services/search/queryGenerator');
const responseGenerator = require('../services/search/responseGenerator');
const { pool } = require('../db');
const { OpenAI } = require('openai');
const axios = require('axios');

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

        // Return standardized response format
        return res.json({
          success: true,
          query: {
            original: query,
            normalized: normalized_query,
            language: language,
            confidence: confidence
          },
          result: {
            type: 'web-search',
            engine: 'brave-search',
            content: response.message,
            sources: response.sources || [],
            count: webSearchResults.length || 0
          },
          metadata: {
            category: 'general',
            display_format: 'text'
          }
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

      // Return standardized response format
      return res.json({
        success: true,
        query: {
          original: query,
          normalized: normalized_query,
          language: language,
          confidence: confidence
        },
        result: {
          type: 'database',
          category: category,
          content: typeof response === 'string' ? response : response.message,
          items: rows,
          count: rows.length,
          summary: typeof response === 'object' && response.summary ? response.summary : null
        },
        metadata: {
          display_format: this.getDisplayFormat(category),
          sql_query: sqlQuery.text
        }
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
  
  // Helper method to determine display format based on category
  getDisplayFormat(category) {
    switch (category) {
      case 'vehicles':
        return 'cards';
      case 'real_estate':
        return 'grid';
      case 'products':
        return 'list';
      default:
        return 'text';
    }
  }

  async performWebSearch(query) {
    try {
      // Use Brave Search API for web search results
      const braveApiKey = process.env.BRAVE_SEARCH_API_KEY || 'BSAoryuCB8x-4_dRu3pOgbppK3GEjN8';
      
      if (!braveApiKey) {
        console.warn('Brave Search API key not found. Using fallback method.');
        return this.performFallbackSearch(query);
      }
      
      const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': braveApiKey
        },
        params: {
          q: query,
          count: 10,  // Number of results
          search_lang: 'en',
          country: 'US'
        }
      });
      
      if (!response.data || !response.data.web || !response.data.web.results || response.data.web.results.length === 0) {
        console.log('No web search results found from Brave Search, using fallback');
        return this.performFallbackSearch(query);
      }
      
      // Transform Brave Search results to our expected format
      return response.data.web.results.map(item => ({
        title: item.title || '',
        url: item.url || '',
        snippet: item.description || ''
      }));
    } catch (error) {
      console.error('Brave Search API error:', error);
      console.log('Using fallback search due to API error');
      return this.performFallbackSearch(query);
    }
  }
  
  async performFallbackSearch(query) {
    try {
      // Use OpenAI to generate a response when web search API is unavailable
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a knowledgeable assistant. The user has asked: "${query}"
              Provide a detailed, accurate response. If discussing cultural topics,
              be respectful and comprehensive. Include relevant facts and context.
              Format the response in a clear, engaging way.`
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      return [{
        title: "AI-Generated Response",
        url: "https://search.brave.com",
        snippet: completion.choices[0].message.content
      }];
    } catch (error) {
      console.error('Fallback search error:', error);
      return [{
        title: "Search Error",
        url: null,
        snippet: "I apologize, but I couldn't retrieve information for your query at this time. Please try again later."
      }];
    }
  }
}

module.exports = new SearchController(); 