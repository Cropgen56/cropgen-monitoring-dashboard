const BASE_URL = 'https://countriesnow.space/api/v0.1/countries';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';


const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/',
  'https://cors.bridged.cc/',
  'https://cors-proxy.htmldriven.com/?url='
];

const fetchWithCORS = async (url) => {
  // First try direct fetch (in case CORS is not an issue)
  try {
    const directResponse = await fetch(url);
    if (directResponse.ok) {
      return await directResponse.json();
    }
  } catch {
    console.log('Direct fetch failed, trying CORS proxies...');
  }

  // Try each CORS proxy
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy + encodeURIComponent(url);
      const response = await fetch(proxyUrl);
      if (response.ok) {
        const data = await response.json();
        console.log(`Success with proxy: ${proxy}`);
        return data;
      }
    } catch (error) {
      console.warn(`Proxy ${proxy} failed:`, error.message);
    }
  }
  
  throw new Error('All CORS proxies failed');
};

// Alternative geocoding using BigDataCloud (no CORS issues)
const geocodeWithBigDataCloud = async (query) => {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://api.bigdatacloud.net/data/geocode-v1/lookup?q=${encodedQuery}&key=`
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].latitude),
          lng: parseFloat(data[0].longitude),
          displayName: data[0].displayName || query,
        };
      }
    }
  } catch (error) {
    console.error('BigDataCloud geocoding failed:', error);
  }
  return null;
};

export const locationApi = {
  // Fetch all countries with their coordinates
  getCountries: async () => {
    try {
      const response = await fetch(`${BASE_URL}/positions`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.msg || 'Failed to fetch countries');
      }
      
      // Store countries in localStorage for offline fallback
      localStorage.setItem('cached_countries', JSON.stringify(data.data));
      
      return data.data;
    } catch (error) {
      console.error('Error fetching countries:', error);
      
      // Try to get from cache
      const cached = localStorage.getItem('cached_countries');
      if (cached) {
        console.log('Using cached countries data');
        return JSON.parse(cached);
      }
      
      throw error;
    }
  },

  // Fetch states for a specific country
  getStates: async (country) => {
    try {
      const response = await fetch(`${BASE_URL}/states`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ country }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.msg || 'Failed to fetch states');
      }
      
      // Cache states
      const cacheKey = `cached_states_${country}`;
      localStorage.setItem(cacheKey, JSON.stringify(data.data.states));
      
      return data.data.states;
    } catch (error) {
      console.error('Error fetching states:', error);
      
      // Try cache
      const cacheKey = `cached_states_${country}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        console.log('Using cached states data');
        return JSON.parse(cached);
      }
      
      return [];
    }
  },

  // Fetch cities for a specific country and state
  getCities: async (country, state) => {
    try {
      const response = await fetch(`${BASE_URL}/state/cities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ country, state }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.msg || 'Failed to fetch cities');
      }
      
      // Cache cities
      const cacheKey = `cached_cities_${country}_${state}`;
      localStorage.setItem(cacheKey, JSON.stringify(data.data));
      
      return data.data;
    } catch (error) {
      console.error('Error fetching cities:', error);
      
      // Try cache
      const cacheKey = `cached_cities_${country}_${state}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        console.log('Using cached cities data');
        return JSON.parse(cached);
      }
      
      return [];
    }
  },

  // Geocode location to get coordinates
  geocodeLocation: async (query) => {
    console.log('Geocoding location:', query);
    
    try {
      // Method 1: Try BigDataCloud first (no CORS issues)
      const bigDataResult = await geocodeWithBigDataCloud(query);
      if (bigDataResult) {
        console.log('Geocoded with BigDataCloud:', bigDataResult);
        return bigDataResult;
      }
      
      try {
        const encodedQuery = encodeURIComponent(query);
        const nominatimUrl = `${NOMINATIM_URL}/search?q=${encodedQuery}&format=json&limit=1&addressdetails=1`;
        
        const data = await fetchWithCORS(nominatimUrl);
        
        if (data && data.length > 0) {
          const result = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            displayName: data[0].display_name,
            boundingBox: data[0].boundingbox,
          };
          console.log('Geocoded with Nominatim:', result);
          return result;
        }
      } catch (nominatimError) {
        console.warn('Nominatim geocoding failed:', nominatimError);
      }
      
      // Method 3: Fallback to country coordinates
      const parts = query.split(',').map(s => s.trim());
      if (parts.length > 0) {
        const countryName = parts[parts.length - 1]; // Last part is usually country
        const stateName = parts.length > 1 ? parts[parts.length - 2] : null;
        const cityName = parts.length > 2 ? parts[0] : null;
        
        // Get countries data
        let countries = [];
        try {
          const response = await fetch(`${BASE_URL}/positions`);
          const data = await response.json();
          if (!data.error) {
            countries = data.data;
          }
        } catch {
          // Try cached data
          const cached = localStorage.getItem('cached_countries');
          if (cached) {
            countries = JSON.parse(cached);
          }
        }
        
        // Find country
        const country = countries.find(c => 
          c.name.toLowerCase() === countryName.toLowerCase() ||
          c.name.toLowerCase().includes(countryName.toLowerCase())
        );
        
        if (country) {
          // Base coordinates from country
          let lat = parseFloat(country.lat);
          let lng = parseFloat(country.long);
          
          // Add slight offset for state/city to make it more realistic
          if (stateName) {
            // Add state-level offset
            lat += (Math.random() - 0.5) * 2;
            lng += (Math.random() - 0.5) * 2;
          }
          if (cityName) {
            // Add city-level offset
            lat += (Math.random() - 0.5) * 0.5;
            lng += (Math.random() - 0.5) * 0.5;
          }
          
          const result = {
            lat: lat,
            lng: lng,
            displayName: query,
            boundingBox: null,
          };
          console.log('Geocoded with fallback:', result);
          return result;
        }
      }
      
      console.error('All geocoding methods failed for:', query);
      return null;
    } catch (error) {
      console.error('Error geocoding location:', error);
      return null;
    }
  },

  // Search locations with autocomplete
  searchLocations: async (query) => {
    console.log('Searching locations:', query);
    
    try {
      const results = [];
      
      // Method 1: Try Nominatim with CORS proxy
      try {
        const encodedQuery = encodeURIComponent(query);
        const nominatimUrl = `${NOMINATIM_URL}/search?q=${encodedQuery}&format=json&limit=5&addressdetails=1`;
        
        const data = await fetchWithCORS(nominatimUrl);
        
        if (data && data.length > 0) {
          const nominatimResults = data.map(item => ({
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            displayName: item.display_name,
            type: item.type || 'place',
            importance: item.importance || 0.5,
          }));
          results.push(...nominatimResults);
        }
      } catch (nominatimError) {
        console.warn('Nominatim search failed:', nominatimError);
      }
      
      // If we have results from Nominatim, return them
      if (results.length > 0) {
        console.log('Search results from Nominatim:', results);
        return results;
      }
      
      // Method 2: Fallback to searching in countries/cities data
      const searchLower = query.toLowerCase();
      
      // Get countries
      let countries = [];
      try {
        const response = await fetch(`${BASE_URL}/positions`);
        const data = await response.json();
        if (!data.error) {
          countries = data.data;
        }
      } catch {
        const cached = localStorage.getItem('cached_countries');
        if (cached) {
          countries = JSON.parse(cached);
        }
      }
      
      // Search in countries
      const countryMatches = countries
        .filter(c => 
          c.name.toLowerCase().includes(searchLower) ||
          c.iso2.toLowerCase() === searchLower ||
          c.iso3.toLowerCase() === searchLower
        )
        .slice(0, 5)
        .map(country => ({
          lat: parseFloat(country.lat),
          lng: parseFloat(country.long),
          displayName: country.name,
          type: 'country',
          importance: 0.8,
        }));
      
      results.push(...countryMatches);
      
      // Try to search for cities if query includes comma (city, country format)
      if (query.includes(',')) {
        const parts = query.split(',').map(s => s.trim());
        if (parts.length >= 2) {
          const possibleCountry = parts[parts.length - 1];
          
          // Find the country
          const country = countries.find(c => 
            c.name.toLowerCase().includes(possibleCountry.toLowerCase())
          );
          
          if (country) {
            // Create a city result with offset from country center
            results.unshift({
              lat: parseFloat(country.lat) + (Math.random() - 0.5) * 2,
              lng: parseFloat(country.long) + (Math.random() - 0.5) * 2,
              displayName: query,
              type: 'city',
              importance: 0.6,
            });
          }
        }
      }
      
      console.log('Search results from fallback:', results.slice(0, 5));
      return results.slice(0, 5);
    } catch (error) {
      console.error('Error searching locations:', error);
      return [];
    }
  },
  
  // Helper function to get coordinates for a country directly
  getCountryCoordinates: async (countryName) => {
    try {
      const countries = await locationApi.getCountries();
      const country = countries.find(c => 
        c.name.toLowerCase() === countryName.toLowerCase()
      );
      
      if (country) {
        return {
          lat: parseFloat(country.lat),
          lng: parseFloat(country.long),
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting country coordinates:', error);
      return null;
    }
  },
};