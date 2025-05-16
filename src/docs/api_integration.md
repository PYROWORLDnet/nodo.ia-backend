# Unified Search API Integration Guide for React Native

This guide explains how to integrate with the Unified Search API in your React Native application. The API provides a consistent response format regardless of the source (database or web search) or category (vehicles, real estate, products), making it easy to handle in your frontend application.

## Making API Requests

### Basic Request

```javascript
import axios from 'axios';

const searchQuery = async (query) => {
  try {
    const response = await axios.post('https://your-api.com/api/v1/search/unified', {
      query: query
    });
    
    return response.data;
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
};
```

## Understanding Response Structure

All responses follow a consistent format:

```javascript
{
  "success": true,
  "query": {
    "original": "black mercedes car nearby santo domingo",
    "normalized": "black mercedes car santo domingo",
    "language": "en",
    "confidence": 0.95
  },
  "result": {
    // Varies based on type
  },
  "metadata": {
    // Additional info
  }
}
```

### Response Types

There are two main response types:

1. **Database Results** (vehicles, real estate, products)
2. **Web Search Results** (general queries)

## Handling Different Response Types in React Native

The beauty of our standardized format is that you can handle all responses with a single component structure:

```jsx
const SearchResults = ({ searchResults }) => {
  if (!searchResults) return <Loading />;
  
  const { success, query, result, metadata } = searchResults;
  
  if (!success) {
    return <ErrorMessage message={searchResults.message} />;
  }
  
  return (
    <View style={styles.container}>
      {/* Display the natural language response */}
      <Text style={styles.responseText}>{result.content}</Text>
      
      {/* Display results differently based on type */}
      {result.type === 'database' ? (
        <DatabaseResults 
          category={result.category} 
          items={result.items} 
          highlights={result.highlights}
          displayFormat={metadata.display_format} 
        />
      ) : (
        <WebSearchResults 
          sources={result.sources} 
          engine={result.engine} 
        />
      )}
    </View>
  );
};
```

### Database Results Component

```jsx
const DatabaseResults = ({ category, items, highlights, displayFormat }) => {
  // Choose layout based on displayFormat (cards, grid, list)
  const ResultsLayout = getLayoutComponentForFormat(displayFormat);
  
  return (
    <View>
      {/* Show highlights section */}
      <Text style={styles.sectionTitle}>Featured Results</Text>
      <FlatList
        data={highlights}
        horizontal
        renderItem={({ item }) => <HighlightCard item={item} category={category} />}
        keyExtractor={item => item.id.toString()}
      />
      
      {/* Show all results */}
      <Text style={styles.sectionTitle}>All Results</Text>
      <ResultsLayout data={items} category={category} />
    </View>
  );
};
```

### Web Search Results Component

```jsx
const WebSearchResults = ({ sources, engine }) => {
  return (
    <View>
      {/* Sources section */}
      <Text style={styles.sectionTitle}>Sources</Text>
      <FlatList
        data={sources}
        renderItem={({ item }) => (
          <TouchableOpacity 
            onPress={() => Linking.openURL(item.url)}
            style={styles.sourceItem}
          >
            <Text style={styles.sourceTitle}>{item.title}</Text>
            <Text style={styles.sourceUrl}>{item.url}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item, index) => `source-${index}`}
      />
      
      {/* Attribution */}
      <Text style={styles.attribution}>Powered by {engine}</Text>
    </View>
  );
};
```

## Displaying Category-Specific Data

### Vehicles

```jsx
const VehicleCard = ({ vehicle }) => (
  <TouchableOpacity style={styles.vehicleCard}>
    {vehicle.image && <Image source={{ uri: vehicle.image }} style={styles.vehicleImage} />}
    <Text style={styles.vehicleTitle}>{vehicle.year} {vehicle.brand} {vehicle.model}</Text>
    <Text style={styles.vehiclePrice}>{vehicle.price}</Text>
    <Text style={styles.vehicleDetails}>
      {[vehicle.transmission, vehicle.fuel, vehicle.condition].filter(Boolean).join(' • ')}
    </Text>
    <Text style={styles.vehicleLocation}>{vehicle.location}</Text>
  </TouchableOpacity>
);
```

### Real Estate

```jsx
const PropertyCard = ({ property }) => (
  <TouchableOpacity style={styles.propertyCard}>
    {property.image && <Image source={{ uri: property.image }} style={styles.propertyImage} />}
    <Text style={styles.propertyTitle}>{property.title}</Text>
    <Text style={styles.propertyPrice}>{property.price}</Text>
    <Text style={styles.propertyDetails}>
      {property.bedrooms} bed • {property.bathrooms} bath • {property.area}
    </Text>
    <Text style={styles.propertyLocation}>{property.location}</Text>
  </TouchableOpacity>
);
```

### Products

```jsx
const ProductItem = ({ product }) => (
  <TouchableOpacity style={styles.productItem}>
    {product.image && <Image source={{ uri: product.image }} style={styles.productImage} />}
    <View style={styles.productInfo}>
      <Text style={styles.productTitle}>{product.title}</Text>
      <Text style={styles.productPrice}>{product.price}</Text>
      <Text style={styles.productCategory}>{product.category}</Text>
      <Text style={styles.productDetails}>
        {[product.condition, product.brand].filter(Boolean).join(' • ')}
      </Text>
    </View>
  </TouchableOpacity>
);
```

## Best Practices

1. **Use the display_format field**: The API provides a recommended display format (`cards`, `grid`, `list`, or `text`) in the metadata.

2. **Progressive Detail Loading**: Show the conversational response immediately, then load the structured results.

3. **Handle Multiple Languages**: Check `query.language` to display content in the user's language.

4. **Error Handling**: Always check the `success` flag before rendering results.

5. **Responsive Design**: Ensure your UI components adapt to different device sizes.

## Example App Structure

```
src/
├── components/
│   ├── Search/
│   │   ├── SearchBar.js
│   │   ├── SearchResults.js
│   │   ├── DatabaseResults.js
│   │   ├── WebSearchResults.js
│   │   └── ResultTypes/
│   │       ├── VehicleResults.js
│   │       ├── RealEstateResults.js
│   │       └── ProductResults.js
│   └── common/
│       ├── Loading.js
│       ├── ErrorMessage.js
│       └── layouts/
│           ├── CardLayout.js
│           ├── GridLayout.js
│           └── ListView.js
└── screens/
    ├── SearchScreen.js
    └── ResultDetailScreen.js
```

By following this structure, your app will be able to seamlessly handle all types of search results with minimal conditional logic. 