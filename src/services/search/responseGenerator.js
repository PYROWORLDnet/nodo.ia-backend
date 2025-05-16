const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

class ResponseGenerator {
  async generateResponse(query, category, dbResults, webResults = null) {
    try {
      // If we have web results, format those
      if (webResults) {
        return this.formatWebResults(query, webResults);
      }

      // If we have database results, format based on category
      if (dbResults) {
        switch (category) {
          case 'vehicles':
            return this.formatVehicleResults(dbResults, query);
          case 'real_estate':
            return this.formatRealEstateResults(query, dbResults);
          case 'products':
            return this.formatProductResults(query, dbResults);
          default:
            return this.generateGenericResponse(query, dbResults);
        }
      }

      // If no results
      return {
        message: "I couldn't find any results matching your search.",
        suggestions: "Try using different keywords or broadening your search criteria."
      };
    } catch (error) {
      console.error('Response generation error:', error);
      return {
        message: "I encountered an error while formatting the search results.",
        error: error.message
      };
    }
  }

  formatVehicleResults(results, query) {
    if (!results || !results.length) {
      return {
        message: "I couldn't find any vehicles matching your search criteria.",
        suggestions: "Try using different keywords or check our latest listings."
      };
    }

    // Safely handle potentially undefined properties
    const uniqueVehicles = results.reduce((acc, vehicle) => {
      // Skip invalid entries
      if (!vehicle) return acc;
      
      const key = [
        vehicle.brand || '',
        vehicle.model || '',
        vehicle.year || '',
        vehicle.price || ''
      ].join('-');
      
      if (!acc[key]) {
        acc[key] = vehicle;
      }
      return acc;
    }, {});

    const vehicles = Object.values(uniqueVehicles);

    // Safely extract attributes with null checks
    const brands = [...new Set(vehicles.map(v => v?.brand || '').filter(Boolean))];
    const models = [...new Set(vehicles.map(v => v?.model || '').filter(Boolean))];
    const years = [...new Set(vehicles.map(v => v?.year || '').filter(Boolean))].sort();
    const colors = [...new Set(vehicles.map(v => v?.exterior || '').filter(Boolean))];
    const locations = [...new Set(vehicles.map(v => v?.location || '').filter(Boolean))];
    
    // Safely handle price calculations
    const prices = vehicles
      .map(v => parseFloat(v?.price_value || '0'))
      .filter(p => !isNaN(p) && p > 0);
    
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;

    // Build response with null checks
    let responseText = `I found ${vehicles.length} exciting vehicles that match your search! 🚗\n\n`;

    if (models.length) {
      responseText += `🎯 Available Models:\n`;
      models.forEach(model => {
        responseText += `• ${model}\n`;
      });
    }

    if (years.length) {
      responseText += `\n📅 Model Years: ${Math.min(...years.map(Number))} to ${Math.max(...years.map(Number))}\n`;
    }

    if (colors.length) {
      responseText += `\n🎨 Color Options:\n`;
      colors.forEach(color => {
        responseText += `• ${color}\n`;
      });
    }

    if (prices.length) {
      responseText += `\n💰 Price Range:\n`;
      responseText += `From ${this.formatPrice(minPrice)} to ${this.formatPrice(maxPrice)}\n`;
    }

    if (locations.length) {
      responseText += `\n📍 Available in:\n`;
      locations.slice(0, 3).forEach(location => {
        responseText += `• ${location}\n`;
      });
      if (locations.length > 3) {
        responseText += `• And ${locations.length - 3} more locations\n`;
      }
    }

    responseText += `\n✨ Featured Vehicles:\n`;
    vehicles.slice(0, 3).forEach(vehicle => {
      if (!vehicle) return;
      
      const details = [
        vehicle.year,
        vehicle.brand,
        vehicle.model,
        vehicle.exterior ? `in ${vehicle.exterior}` : '',
        vehicle.price ? `- ${vehicle.price}` : ''
      ].filter(Boolean).join(' ');
      
      const features = [
        vehicle.transmission,
        vehicle.fuel,
        vehicle.condition,
        vehicle.location
      ].filter(Boolean).join(' • ');

      responseText += `\n🚘 ${details}\n`;
      if (features) {
        responseText += `   ${features}\n`;
      }
    });

    // Return standardized response format
    return {
      message: responseText,
      summary: {
        total: vehicles.length,
        models: models,
        years: years.length ? { min: Math.min(...years.map(Number)), max: Math.max(...years.map(Number)) } : null,
        colors: colors,
        locations: locations,
        price_range: prices.length ? { min: minPrice, max: maxPrice } : null
      },
      highlights: vehicles.slice(0, 3).map(vehicle => {
        return {
          id: vehicle.id,
          year: vehicle.year,
          brand: vehicle.brand,
          model: vehicle.model,
          color: vehicle.exterior,
          price: vehicle.price,
          price_value: vehicle.price_value,
          location: vehicle.location,
          image: vehicle.image_url
        };
      })
    };
  }

  formatPrice(price) {
    if (!price) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }

  async formatRealEstateResults(query, results) {
    if (!results.length) {
      return {
        message: "I couldn't find any properties matching your search criteria.",
        suggestions: "Try adjusting your location or price range."
      };
    }

    const types = [...new Set(results.map(r => r.property_type))];
    const locations = [...new Set(results.map(r => r.location))];
    const prices = results.map(r => parseFloat(r.price_value)).filter(Boolean);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // Generate human-friendly response text
    let responseText = `I found ${results.length} propert${results.length > 1 ? 'ies' : 'y'} that match your search! 🏠\n\n`;
    
    if (types.length) {
      responseText += `🏢 Property Types:\n`;
      types.forEach(type => {
        responseText += `• ${type}\n`;
      });
    }
    
    if (locations.length) {
      responseText += `\n📍 Locations:\n`;
      locations.slice(0, 3).forEach(location => {
        responseText += `• ${location}\n`;
      });
      if (locations.length > 3) {
        responseText += `• And ${locations.length - 3} more locations\n`;
      }
    }
    
    if (prices.length) {
      responseText += `\n💰 Price Range:\n`;
      responseText += `From ${this.formatPrice(minPrice)} to ${this.formatPrice(maxPrice)}\n`;
    }
    
    responseText += `\n✨ Featured Properties:\n`;
    results.slice(0, 3).forEach(property => {
      if (!property) return;
      
      const details = [
        property.property_type,
        property.title,
        property.price ? `- ${property.price}` : ''
      ].filter(Boolean).join(' ');
      
      const features = [
        property.bedrooms ? `${property.bedrooms} bed` : '',
        property.bathrooms ? `${property.bathrooms} bath` : '',
        property.area ? `${property.area}` : '',
        property.location
      ].filter(Boolean).join(' • ');

      responseText += `\n🏡 ${details}\n`;
      if (features) {
        responseText += `   ${features}\n`;
      }
    });

    return {
      message: responseText,
      summary: {
        total_results: results.length,
        property_types: types,
        locations: locations,
        price_range: prices.length ? { min: minPrice, max: maxPrice } : null
      },
      highlights: results.slice(0, 3).map(property => ({
        id: property.id,
        title: property.title,
        price: property.price,
        price_value: property.price_value,
        location: property.location,
        property_type: property.property_type,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        area: property.area,
        image: property.image_url
      }))
    };
  }

  async formatProductResults(query, results) {
    if (!results.length) {
      return {
        message: "I couldn't find any products matching your search criteria.",
        suggestions: "Try using different keywords or check our featured products."
      };
    }

    const categories = [...new Set(results.map(r => r.category))];
    const brands = [...new Set(results.map(r => r.brand).filter(Boolean))];
    const conditions = [...new Set(results.map(r => r.condition).filter(Boolean))];
    const prices = results.map(r => parseFloat(r.price_value)).filter(Boolean);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // Generate human-friendly response text
    let responseText = `I found ${results.length} product${results.length > 1 ? 's' : ''} that match your search! 🛍️\n\n`;
    
    if (categories.length) {
      responseText += `📦 Categories:\n`;
      categories.forEach(category => {
        responseText += `• ${category}\n`;
      });
    }
    
    if (brands.length) {
      responseText += `\n🏭 Brands:\n`;
      brands.slice(0, 5).forEach(brand => {
        responseText += `• ${brand}\n`;
      });
      if (brands.length > 5) {
        responseText += `• And ${brands.length - 5} more brands\n`;
      }
    }
    
    if (prices.length) {
      responseText += `\n💰 Price Range:\n`;
      responseText += `From ${this.formatPrice(minPrice)} to ${this.formatPrice(maxPrice)}\n`;
    }
    
    responseText += `\n✨ Featured Products:\n`;
    results.slice(0, 3).forEach(product => {
      if (!product) return;
      
      const details = [
        product.title,
        product.price ? `- ${product.price}` : ''
      ].filter(Boolean).join(' ');
      
      const features = [
        product.condition,
        product.brand,
        product.category
      ].filter(Boolean).join(' • ');

      responseText += `\n🛒 ${details}\n`;
      if (features) {
        responseText += `   ${features}\n`;
      }
    });

    return {
      message: responseText,
      summary: {
        total: results.length,
        categories: categories,
        brands: brands,
        conditions: conditions,
        price_range: prices.length ? { min: minPrice, max: maxPrice } : null
      },
      highlights: results.slice(0, 3).map(product => ({
        id: product.id,
        title: product.title,
        price: product.price,
        price_value: product.price_value,
        category: product.category,
        condition: product.condition,
        brand: product.brand,
        image: product.image_url
      }))
    };
  }

  async formatWebResults(query, webResults) {
    if (!webResults || !webResults.length) {
      return {
        message: "I couldn't find any relevant information for your query.",
        suggestions: "Try rephrasing your question or being more specific.",
        type: "web-search"
      };
    }

    try {
      // Extract relevant information from web results
      const sources = webResults.map(result => ({
        title: result.title,
        url: result.url,
        snippet: result.snippet
      }));

      // Create a combined content string from all snippets for OpenAI to process
      const combinedContent = webResults.map(result => 
        `Title: ${result.title}\nContent: ${result.snippet}`
      ).join('\n\n');

      // Use OpenAI to generate a comprehensive, natural language response
      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant that synthesizes information from Brave web search results. Create a comprehensive, conversational response that addresses the user's query based on the search results provided. Include key facts and information in a natural, flowing style similar to ChatGPT or Perplexity. Present the information objectively and clearly. Begin with a brief introduction acknowledging this is from Brave Search sources, and end with a gentle indication that the information is sourced from Brave Search."
          },
          {
            role: "user",
            content: `User query: "${query}"\n\nWeb search results:\n${combinedContent}`
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      // Extract the generated response
      const responseText = aiResponse.choices[0].message.content;

      return {
        message: responseText,
        type: "web-search",
        engine: "brave-search",
        sources: sources.slice(0, 5) // Return top 5 sources
      };
    } catch (error) {
      console.error("Error generating web search response:", error);
      
      // Fallback to a simpler response if OpenAI processing fails
      return {
        message: `Based on Brave Search results for "${query}":\n\n${webResults[0].snippet}\n\n(This information comes from Brave Search sources)`,
        type: "web-search",
        engine: "brave-search",
        sources: webResults.map(result => ({
          title: result.title,
          url: result.url
        }))
      };
    }
  }

  async generateGenericResponse(query, results) {
    if (!results || !results.length) {
      return {
        message: "I couldn't find any relevant information for your query.",
        suggestions: "Try using different keywords or check our featured content."
      };
    }
    
    return {
      message: `Found ${results.length} results for your search.`,
      summary: {
        total: results.length
      },
      highlights: results.slice(0, 3).map(result => ({
        id: result.id,
        title: result.title,
        description: result.description
      }))
    };
  }
}

module.exports = new ResponseGenerator(); 