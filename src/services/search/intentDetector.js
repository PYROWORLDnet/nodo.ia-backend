const { OpenAI } = require('openai');
const franc = require('franc');

// Categories and their keywords for fallback detection
const CATEGORIES = {
  vehicles: ['car', 'auto', 'vehicle', 'truck', 'van', 'suv', 'motorcycle'],
  real_estate: ['house', 'apartment', 'property', 'rent', 'sale', 'real estate', 'home'],
  products: ['electronics', 'appliance', 'product', 'gadget', 'device'],
  web_search: [] // Fallback category
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

class IntentDetector {
  async detectIntent(query) {
    try {
      // First try keyword-based detection for faster response
      const keywordResult = this.detectWithKeywords(query.toLowerCase());
      if (keywordResult.confidence > 0.5) {
        return keywordResult;
      }

      // If keyword detection isn't confident enough, use GPT
      const gptIntent = await this.detectWithGPT(query);
      return gptIntent || keywordResult;
    } catch (error) {
      console.error('Intent detection error:', error);
      return { category: 'web_search', confidence: 0.5, normalized_query: query };
    }
  }

  async detectWithGPT(query) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "system",
          content: "You are a search intent classifier. Analyze the query and determine its category."
        }, {
          role: "user",
          content: `Classify this search query into one of these categories: vehicles, real_estate, products, or web_search.
          Query: "${query}"
          Return JSON only: {"category": "category_name", "confidence": 0.0-1.0, "normalized_query": "corrected query"}`
        }],
        temperature: 0.3,
        max_tokens: 150
      });

      const result = JSON.parse(completion.choices[0].message.content.trim());
      return {
        ...result,
        source: 'gpt'
      };
    } catch (e) {
      console.error('GPT detection error:', e);
      return null;
    }
  }

  detectWithKeywords(query) {
    let maxScore = 0;
    let detectedCategory = 'web_search';

    for (const [category, keywords] of Object.entries(CATEGORIES)) {
      const score = keywords.reduce((acc, keyword) => {
        return acc + (query.includes(keyword.toLowerCase()) ? 1 : 0);
      }, 0) / Math.max(keywords.length, 1);

      if (score > maxScore) {
        maxScore = score;
        detectedCategory = category;
      }
    }

    return {
      category: detectedCategory,
      confidence: maxScore,
      normalized_query: query,
      source: 'keywords'
    };
  }
}

module.exports = new IntentDetector(); 