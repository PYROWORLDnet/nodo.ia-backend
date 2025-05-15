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
            return this.formatVehicleResults(query, dbResults);
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

  async formatVehicleResults(query, results) {
    if (!results.length) {
      return {
        message: "I couldn't find any vehicles matching your search criteria.",
        suggestions: "Try searching with different terms or checking our latest vehicle listings."
      };
    }

    // Extract unique brands, colors, and price range
    const brands = [...new Set(results.map(r => r.brand))];
    const exteriorColors = [...new Set(results.map(r => r.exterior).filter(Boolean))];
    const locations = [...new Set(results.map(r => r.location).filter(Boolean))];
    const models = [...new Set(results.map(r => r.model).filter(Boolean))];
    const years = [...new Set(results.map(r => r.year).filter(Boolean))].sort();
    const prices = results.map(r => parseFloat(r.price_value)).filter(Boolean);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Generate natural language response
    let responseText = `I found ${results.length} ${brands[0]} vehicle${results.length > 1 ? 's' : ''} that match your search. `;
    
    // Add model information
    if (models.length) {
      responseText += `The available models include ${models.filter(m => m !== 'Desconocido').join(', ')}. `;
    }

    // Add year range
    if (years.length) {
      const minYear = Math.min(...years.map(y => parseInt(y)));
      const maxYear = Math.max(...years.map(y => parseInt(y)));
      responseText += `Model years range from ${minYear} to ${maxYear}. `;
    }

    // Add color information
    if (exteriorColors.length) {
      responseText += `Available exterior colors include ${exteriorColors.join(', ')}. `;
    }

    // Add location information
    if (locations.length) {
      responseText += `These vehicles are located in various areas including ${locations.slice(0, 3).join(', ')}. `;
    }

    // Add price information
    if (prices.length) {
      responseText += `Prices range from RD$ ${minPrice.toLocaleString()} to RD$ ${maxPrice.toLocaleString()}. `;
    }

    // Add recommendations
    responseText += `\n\nHighlights from the search results:\n`;
    const highlights = results
      .filter(v => v.price_value > 0)
      .slice(0, 3)
      .map(v => {
        let highlight = `- ${v.year} ${v.brand} ${v.model}`;
        if (v.price_value) highlight += ` at RD$ ${parseInt(v.price_value).toLocaleString()}`;
        if (v.location) highlight += ` in ${v.location}`;
        if (v.exterior) highlight += ` (${v.exterior})`;
        return highlight;
      });
    responseText += highlights.join('\n');

    return {
      message: responseText,
      summary: {
        total_results: results.length,
        brands,
        models,
        colors: exteriorColors,
        years,
        locations: locations.slice(0, 5),
        price_range: prices.length ? { min: minPrice, max: maxPrice } : null
      },
      results: results.map(vehicle => ({
        id: vehicle.id,
        title: `${vehicle.year} ${vehicle.brand} ${vehicle.model}`,
        price: vehicle.price_value,
        location: vehicle.location,
        details: {
          exterior: vehicle.exterior,
          interior: vehicle.interior,
          mileage: vehicle.mileage,
          transmission: vehicle.transmission,
          fuel: vehicle.fuel,
          condition: vehicle.condition,
          accessories: vehicle.accessories
        }
      }))
    };
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

    return {
      message: `I found ${results.length} propert${results.length > 1 ? 'ies' : 'y'} that match your search.`,
      summary: {
        total_results: results.length,
        property_types: types,
        locations: locations,
        price_range: prices.length ? { min: minPrice, max: maxPrice } : null
      },
      results: results.map(property => ({
        id: property.id,
        title: property.title,
        price: property.price_value,
        location: property.location,
        details: {
          property_type: property.property_type,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          area: property.area
        }
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
    const prices = results.map(r => parseFloat(r.price_value)).filter(Boolean);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    return {
      message: `I found ${results.length} product${results.length > 1 ? 's' : ''} that match your search.`,
      summary: {
        total_results: results.length,
        categories: categories,
        price_range: prices.length ? { min: minPrice, max: maxPrice } : null
      },
      results: results.map(product => ({
        id: product.id,
        title: product.title,
        price: product.price_value,
        category: product.category,
        details: {
          condition: product.condition,
          brand: product.brand
        }
      }))
    };
  }

  async formatWebResults(query, results) {
    if (!results || !results.length) {
      return {
        message: "I couldn't find any relevant information for your query.",
        suggestions: "Try rephrasing your question or being more specific."
      };
    }

    return {
      message: results[0].snippet,
      sources: results.map(result => ({
        title: result.title,
        url: result.url
      }))
    };
  }

  async generateGenericResponse(query, results) {
    return {
      message: `Found ${results.length} results for your search.`,
      results: results.map(result => ({
        id: result.id,
        title: result.title,
        description: result.description
      }))
    };
  }
}

module.exports = new ResponseGenerator(); 