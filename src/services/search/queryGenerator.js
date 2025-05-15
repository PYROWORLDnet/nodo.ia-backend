const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

class QueryGenerator {
  constructor() {
    this.translations = {
      vehicles: {
        colors: {
          'black': ['negro', 'negra', 'black'],
          'white': ['blanco', 'blanca', 'white'],
          'red': ['rojo', 'roja', 'red'],
          'blue': ['azul', 'blue'],
          'gray': ['gris', 'grey', 'gray'],
          'silver': ['plateado', 'plateada', 'silver'],
          'green': ['verde', 'green'],
          'brown': ['marron', 'brown', 'cafe', 'café'],
          'yellow': ['amarillo', 'amarilla', 'yellow'],
          'gold': ['dorado', 'dorada', 'gold']
        },
        brands: {
          'mercedes': ['mercedes', 'mercedes-benz', 'mercedes benz', 'mercdez', 'mercedez'],
          'toyota': ['toyota'],
          'honda': ['honda'],
          'bmw': ['bmw'],
          'audi': ['audi'],
          'lexus': ['lexus'],
          'nissan': ['nissan']
        }
      },
      real_estate: {
        property_types: {
          'apartment': ['apartment', 'apartamento', 'apto', 'apt'],
          'house': ['house', 'casa', 'residencia'],
          'penthouse': ['penthouse', 'pent-house', 'ático', 'atico'],
          'villa': ['villa', 'villa residencial'],
          'condo': ['condo', 'condominio', 'condominium']
        },
        locations: {
          'santo domingo': [
            'santo domingo',
            'santo domingo este',
            'santo domingo norte',
            'santo domingo oeste',
            'distrito nacional',
            'sto domingo',
            'sto. domingo'
          ]
        },
        amenities: {
          'parking': ['parking', 'parqueo', 'garage', 'garaje'],
          'pool': ['pool', 'piscina', 'swimming pool'],
          'gym': ['gym', 'gimnasio'],
          'security': ['security', 'seguridad', '24/7', 'vigilancia']
        }
      },
      products: {
        categories: {
          'electronics': ['electronics', 'electrónicos', 'electronica', 'electrónica'],
          'clothing': ['clothing', 'ropa', 'vestimenta', 'clothes'],
          'furniture': ['furniture', 'muebles', 'mobiliario'],
          'toys': ['toys', 'juguetes'],
          'sports': ['sports', 'deportes', 'sporting goods']
        }
      }
    };

    // Stop words in English and Spanish
    this.stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'in', 'is', 'it', 'of', 'on', 'the', 'to', 'was', 'were',
      'will', 'with', 'looking', 'near', 'nearby', 'close', 'to', 'i', 'am',
      'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'cerca', 'de',
      'busco', 'buscando', 'quiero', 'necesito'
    ]);
  }

  escapeSQLString(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/'/g, "''")
      .replace(/\\/g, '\\\\')
      .trim();
  }

  sanitizeILIKEPattern(str) {
    return `%${this.escapeSQLString(str)}%`;
  }

  extractSearchTerms(query) {
    if (!query) return [];
    return query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 0 && !this.stopWords.has(word));
  }

  async generateSQL(category, query, language) {
    try {
      const searchTerms = this.extractSearchTerms(query);
      if (!searchTerms.length) {
        return {
          text: `
            SELECT * FROM ${category} 
            ORDER BY price_value ASC NULLS LAST 
            LIMIT 20
          `
        };
      }

      switch (category) {
        case 'vehicles': {
          // Build color patterns
          const colorPatterns = [];
          searchTerms.forEach(term => {
            Object.entries(this.translations.vehicles.colors).forEach(([color, variations]) => {
              if (variations.some(v => v.includes(term) || term.includes(v))) {
                variations.forEach(v => colorPatterns.push(this.sanitizeILIKEPattern(v)));
              }
            });
          });

          // Build brand patterns
          const brandPatterns = [];
          searchTerms.forEach(term => {
            Object.entries(this.translations.vehicles.brands).forEach(([brand, variations]) => {
              if (variations.some(v => v.includes(term) || term.includes(v))) {
                variations.forEach(v => brandPatterns.push(this.sanitizeILIKEPattern(v)));
              }
            });
          });

          const conditions = [];
          if (brandPatterns.length > 0) {
            conditions.push(`(brand ILIKE ANY(ARRAY[${brandPatterns.map(p => `'${p}'`).join(', ')}]))`);
          }
          if (colorPatterns.length > 0) {
            conditions.push(`(
              exterior ILIKE ANY(ARRAY[${colorPatterns.map(p => `'${p}'`).join(', ')}]) OR
              interior ILIKE ANY(ARRAY[${colorPatterns.map(p => `'${p}'`).join(', ')}])
            )`);
          }

          // General search if no specific patterns found
          const basePatterns = searchTerms.map(term => this.sanitizeILIKEPattern(term));
          if (!brandPatterns.length && !colorPatterns.length) {
            conditions.push(`(
              brand ILIKE ANY(ARRAY[${basePatterns.map(p => `'${p}'`).join(', ')}]) OR
              model ILIKE ANY(ARRAY[${basePatterns.map(p => `'${p}'`).join(', ')}]) OR
              exterior ILIKE ANY(ARRAY[${basePatterns.map(p => `'${p}'`).join(', ')}]) OR
              interior ILIKE ANY(ARRAY[${basePatterns.map(p => `'${p}'`).join(', ')}])
            )`);
          }

          return {
            text: `
              SELECT *,
              CASE
                WHEN brand ILIKE ANY(ARRAY[${brandPatterns.length > 0 ? brandPatterns.map(p => `'${p}'`).join(', ') : "'%'"}]) THEN 50
                WHEN (exterior ILIKE ANY(ARRAY[${colorPatterns.length > 0 ? colorPatterns.map(p => `'${p}'`).join(', ') : "'%'"}]) OR
                      interior ILIKE ANY(ARRAY[${colorPatterns.length > 0 ? colorPatterns.map(p => `'${p}'`).join(', ') : "'%'"}])) THEN 40
                WHEN model ILIKE ANY(ARRAY[${basePatterns.map(p => `'${p}'`).join(', ')}]) THEN 30
                ELSE 10
              END as relevance
              FROM vehicles
              ${conditions.length > 0 ? `WHERE ${conditions.join(' OR ')}` : ''}
              ORDER BY relevance DESC, price_value ASC NULLS LAST
              LIMIT 20
            `
          };
        }

        case 'real_estate': {
          // Build property type patterns
          const propertyPatterns = [];
          searchTerms.forEach(term => {
            Object.entries(this.translations.real_estate.property_types).forEach(([type, variations]) => {
              if (variations.some(v => v.includes(term) || term.includes(v))) {
                variations.forEach(v => propertyPatterns.push(this.sanitizeILIKEPattern(v)));
              }
            });
          });

          // Build location patterns
          const locationPatterns = [];
          searchTerms.forEach(term => {
            Object.entries(this.translations.real_estate.locations).forEach(([loc, variations]) => {
              if (variations.some(v => v.includes(term) || term.includes(v))) {
                variations.forEach(v => locationPatterns.push(this.sanitizeILIKEPattern(v)));
              }
            });
          });

          // Build amenity patterns
          const amenityPatterns = [];
          searchTerms.forEach(term => {
            Object.entries(this.translations.real_estate.amenities).forEach(([amenity, variations]) => {
              if (variations.some(v => v.includes(term) || term.includes(v))) {
                variations.forEach(v => amenityPatterns.push(this.sanitizeILIKEPattern(v)));
              }
            });
          });

          const conditions = [];
          if (propertyPatterns.length > 0) {
            conditions.push(`(description_text ILIKE ANY(ARRAY[${propertyPatterns.map(p => `'${p}'`).join(', ')}]))`);
          }
          if (locationPatterns.length > 0) {
            conditions.push(`(location ILIKE ANY(ARRAY[${locationPatterns.map(p => `'${p}'`).join(', ')}]))`);
          }
          if (amenityPatterns.length > 0) {
            conditions.push(`(
              description_text ILIKE ANY(ARRAY[${amenityPatterns.map(p => `'${p}'`).join(', ')}]) OR
              specifications ILIKE ANY(ARRAY[${amenityPatterns.map(p => `'${p}'`).join(', ')}])
            )`);
          }

          // General search if no specific patterns found
          const basePatterns = searchTerms.map(term => this.sanitizeILIKEPattern(term));
          if (!propertyPatterns.length && !locationPatterns.length && !amenityPatterns.length) {
            conditions.push(`(
              description_text ILIKE ANY(ARRAY[${basePatterns.map(p => `'${p}'`).join(', ')}]) OR
              location ILIKE ANY(ARRAY[${basePatterns.map(p => `'${p}'`).join(', ')}]) OR
              specifications ILIKE ANY(ARRAY[${basePatterns.map(p => `'${p}'`).join(', ')}])
            )`);
          }

          return {
            text: `
              SELECT *,
              CASE
                WHEN description_text ILIKE ANY(ARRAY[${propertyPatterns.length > 0 ? propertyPatterns.map(p => `'${p}'`).join(', ') : "'%'"}]) THEN 50
                WHEN location ILIKE ANY(ARRAY[${locationPatterns.length > 0 ? locationPatterns.map(p => `'${p}'`).join(', ') : "'%'"}]) THEN 40
                WHEN specifications ILIKE ANY(ARRAY[${amenityPatterns.length > 0 ? amenityPatterns.map(p => `'${p}'`).join(', ') : "'%'"}]) THEN 30
                ELSE 10
              END as relevance
              FROM real_estate
              ${conditions.length > 0 ? `WHERE ${conditions.join(' OR ')}` : ''}
              ORDER BY relevance DESC, price_value ASC NULLS LAST
              LIMIT 20
            `
          };
        }

        case 'products': {
          // Build category patterns
          const categoryPatterns = [];
          searchTerms.forEach(term => {
            Object.entries(this.translations.products.categories).forEach(([cat, variations]) => {
              if (variations.some(v => v.includes(term) || term.includes(v))) {
                variations.forEach(v => categoryPatterns.push(this.sanitizeILIKEPattern(v)));
              }
            });
          });

          const conditions = [];
          if (categoryPatterns.length > 0) {
            conditions.push(`(category ILIKE ANY(ARRAY[${categoryPatterns.map(p => `'${p}'`).join(', ')}]))`);
          }

          // General search
          const basePatterns = searchTerms.map(term => this.sanitizeILIKEPattern(term));
          conditions.push(`(
            description_text ILIKE ANY(ARRAY[${basePatterns.map(p => `'${p}'`).join(', ')}]) OR
            specifications ILIKE ANY(ARRAY[${basePatterns.map(p => `'${p}'`).join(', ')}])
          )`);

          return {
            text: `
              SELECT *,
              CASE
                WHEN category ILIKE ANY(ARRAY[${categoryPatterns.length > 0 ? categoryPatterns.map(p => `'${p}'`).join(', ') : "'%'"}]) THEN 50
                WHEN description_text ILIKE ANY(ARRAY[${basePatterns.map(p => `'${p}'`).join(', ')}]) THEN 30
                WHEN specifications ILIKE ANY(ARRAY[${basePatterns.map(p => `'${p}'`).join(', ')}]) THEN 20
                ELSE 10
              END as relevance
              FROM products
              ${conditions.length > 0 ? `WHERE ${conditions.join(' OR ')}` : ''}
              ORDER BY relevance DESC, price_value ASC NULLS LAST
              LIMIT 20
            `
          };
        }

        default: {
          // If category is not recognized, return empty query to trigger web search
          return {
            text: `SELECT 1 WHERE false`
          };
        }
      }

    } catch (error) {
      console.error('SQL generation error:', error);
      // Return empty query to trigger web search
      return {
        text: `SELECT 1 WHERE false`
      };
    }
  }
}

module.exports = new QueryGenerator(); 