import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Linking,
  SafeAreaView
} from 'react-native';
import axios from 'axios';

// Base API URL - replace with your actual API URL
const API_URL = 'https://your-api-url.com/api/v1/search/unified';

const SearchApp = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(API_URL, { query });
      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search for anything..."
          placeholderTextColor="#999"
        />
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={handleSearch}
          disabled={loading}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {results && !loading && (
        <SearchResults results={results} />
      )}
    </SafeAreaView>
  );
};

const SearchResults = ({ results }) => {
  const { success, query, result, metadata } = results;

  if (!success) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Search failed</Text>
      </View>
    );
  }

  return (
    <View style={styles.resultsContainer}>
      {/* Response text at the top */}
      <Text style={styles.responseText}>{result.content}</Text>
      
      {/* Display different results based on type */}
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

const DatabaseResults = ({ category, items, highlights }) => {
  // Render based on category
  const renderHighlight = (item) => {
    switch (category) {
      case 'vehicles':
        return <VehicleCard vehicle={item} />;
      case 'real_estate':
        return <PropertyCard property={item} />;
      case 'products':
        return <ProductItem product={item} />;
      default:
        return <GenericItem item={item} />;
    }
  };

  return (
    <View style={styles.databaseResultsContainer}>
      {highlights && highlights.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Featured Results</Text>
          <FlatList
            horizontal
            data={highlights}
            renderItem={({ item }) => renderHighlight(item)}
            keyExtractor={(item) => item.id.toString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.highlightsContainer}
          />
        </>
      )}
      
      {items && items.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>All Results ({items.length})</Text>
          <FlatList
            data={items.slice(0, 10)} // Limit to first 10 for performance
            renderItem={({ item }) => renderHighlight(item)}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.itemsContainer}
          />
        </>
      )}
    </View>
  );
};

const WebSearchResults = ({ sources, engine }) => {
  return (
    <View style={styles.webResultsContainer}>
      <Text style={styles.sectionTitle}>Sources</Text>
      <FlatList
        data={sources}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.sourceItem}
            onPress={() => Linking.openURL(item.url)}
          >
            <Text style={styles.sourceTitle}>{item.title}</Text>
            <Text style={styles.sourceUrl}>{item.url}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item, index) => `source-${index}`}
      />
      
      <Text style={styles.attribution}>Powered by {engine}</Text>
    </View>
  );
};

// Category-specific card components
const VehicleCard = ({ vehicle }) => (
  <TouchableOpacity style={styles.vehicleCard}>
    {vehicle.image && (
      <Image source={{ uri: vehicle.image }} style={styles.vehicleImage} />
    )}
    <Text style={styles.vehicleTitle}>
      {vehicle.year} {vehicle.brand} {vehicle.model}
    </Text>
    <Text style={styles.vehiclePrice}>{vehicle.price}</Text>
    <Text style={styles.vehicleLocation}>{vehicle.location}</Text>
  </TouchableOpacity>
);

const PropertyCard = ({ property }) => (
  <TouchableOpacity style={styles.propertyCard}>
    {property.image && (
      <Image source={{ uri: property.image }} style={styles.propertyImage} />
    )}
    <Text style={styles.propertyTitle}>{property.title}</Text>
    <Text style={styles.propertyPrice}>{property.price}</Text>
    <Text style={styles.propertyDetails}>
      {property.bedrooms ? `${property.bedrooms} bed • ` : ''}
      {property.bathrooms ? `${property.bathrooms} bath • ` : ''}
      {property.area || ''}
    </Text>
    <Text style={styles.propertyLocation}>{property.location}</Text>
  </TouchableOpacity>
);

const ProductItem = ({ product }) => (
  <TouchableOpacity style={styles.productItem}>
    {product.image && (
      <Image source={{ uri: product.image }} style={styles.productImage} />
    )}
    <View style={styles.productInfo}>
      <Text style={styles.productTitle}>{product.title}</Text>
      <Text style={styles.productPrice}>{product.price}</Text>
      <Text style={styles.productCategory}>{product.category}</Text>
    </View>
  </TouchableOpacity>
);

const GenericItem = ({ item }) => (
  <TouchableOpacity style={styles.genericItem}>
    <Text style={styles.genericTitle}>{item.title}</Text>
    <Text style={styles.genericDescription}>{item.description}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  searchButton: {
    marginLeft: 12,
    backgroundColor: '#0066cc',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#fee',
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#c00',
    fontSize: 16,
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  responseText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 20,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  databaseResultsContainer: {
    flex: 1,
  },
  webResultsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  highlightsContainer: {
    paddingBottom: 16,
  },
  itemsContainer: {
    paddingBottom: 20,
  },
  vehicleCard: {
    width: 220,
    backgroundColor: 'white',
    borderRadius: 8,
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  vehicleImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#eee',
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: '600',
    padding: 12,
    paddingBottom: 4,
  },
  vehiclePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0066cc',
    paddingHorizontal: 12,
  },
  vehicleLocation: {
    fontSize: 14,
    color: '#666',
    padding: 12,
    paddingTop: 4,
  },
  propertyCard: {
    width: 220,
    backgroundColor: 'white',
    borderRadius: 8,
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  propertyImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#eee',
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: '600',
    padding: 12,
    paddingBottom: 4,
  },
  propertyPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0066cc',
    paddingHorizontal: 12,
  },
  propertyDetails: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 12,
  },
  propertyLocation: {
    fontSize: 14,
    color: '#666',
    padding: 12,
    paddingTop: 4,
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: 100,
    height: 100,
    backgroundColor: '#eee',
  },
  productInfo: {
    flex: 1,
    padding: 12,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0066cc',
    marginTop: 4,
  },
  productCategory: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  genericItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  genericTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  genericDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sourceItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066cc',
  },
  sourceUrl: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  attribution: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
});

export default SearchApp; 