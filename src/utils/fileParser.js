// Simple parser without external dependencies
export const parseGeoJSON = (jsonText) => {
  try {
    return JSON.parse(jsonText);
  } catch {
    throw new Error('Invalid GeoJSON format');
  }
};

export const processUploadedFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const fileName = file.name.toLowerCase();
        
        let geojson;
        
        if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
          geojson = parseGeoJSON(content);
        } else if (fileName.endsWith('.kml')) {
          reject(new Error('KML files require additional library. Please use GeoJSON format.'));
          return;
        } else {
          reject(new Error('Unsupported file format. Please upload GeoJSON files.'));
          return;
        }
        
        // Validate GeoJSON structure
        if (!geojson.type) {
          reject(new Error('Invalid GeoJSON: missing type property'));
          return;
        }
        
        resolve(geojson);
      } catch (error) {
        reject(new Error('Failed to parse file: ' + error.message));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

export const extractCoordinatesFromGeoJSON = (geojson) => {
  const coordinates = [];
  
  const extractFromGeometry = (geometry) => {
    if (!geometry || !geometry.type || !geometry.coordinates) return;
    
    try {
      switch (geometry.type) {
        case 'Point':
          if (Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2) {
            coordinates.push({ 
              lat: geometry.coordinates[1], 
              lng: geometry.coordinates[0] 
            });
          }
          break;
          
        case 'LineString':
        case 'MultiPoint':
          if (Array.isArray(geometry.coordinates)) {
            geometry.coordinates.forEach(coord => {
              if (Array.isArray(coord) && coord.length >= 2) {
                coordinates.push({ lat: coord[1], lng: coord[0] });
              }
            });
          }
          break;
          
        case 'Polygon':
          if (Array.isArray(geometry.coordinates) && geometry.coordinates[0]) {
            geometry.coordinates[0].forEach(coord => {
              if (Array.isArray(coord) && coord.length >= 2) {
                coordinates.push({ lat: coord[1], lng: coord[0] });
              }
            });
          }
          break;
          
        case 'MultiLineString':
          if (Array.isArray(geometry.coordinates)) {
            geometry.coordinates.forEach(part => {
              if (Array.isArray(part)) {
                part.forEach(coord => {
                  if (Array.isArray(coord) && coord.length >= 2) {
                    coordinates.push({ lat: coord[1], lng: coord[0] });
                  }
                });
              }
            });
          }
          break;
          
        case 'MultiPolygon':
          if (Array.isArray(geometry.coordinates)) {
            geometry.coordinates.forEach(polygon => {
              if (Array.isArray(polygon) && polygon[0]) {
                polygon[0].forEach(coord => {
                  if (Array.isArray(coord) && coord.length >= 2) {
                    coordinates.push({ lat: coord[1], lng: coord[0] });
                  }
                });
              }
            });
          }
          break;
          
        default:
          console.warn('Unknown geometry type:', geometry.type);
      }
    } catch (error) {
      console.error('Error extracting coordinates:', error);
    }
  };
  
  try {
    if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
      geojson.features.forEach(feature => {
        if (feature.geometry) {
          extractFromGeometry(feature.geometry);
        }
      });
    } else if (geojson.type === 'Feature' && geojson.geometry) {
      extractFromGeometry(geojson.geometry);
    } else if (geojson.type && geojson.coordinates) {
      // Direct geometry object
      extractFromGeometry(geojson);
    }
  } catch (error) {
    console.error('Error processing GeoJSON:', error);
  }
  
  return coordinates;
};