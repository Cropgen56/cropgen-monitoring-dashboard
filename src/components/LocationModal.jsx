import React, { useState, useEffect, useRef } from 'react';
import { X, Globe, MapIcon, Building2, MapPin, Navigation, ChevronDown } from 'lucide-react';

// Hardcoded location data
const locationData = {
  countries: [
    { name: 'India', iso2: 'IN', lat: 20.5937, lng: 78.9629 },
    { name: 'South Africa', iso2: 'ZA', lat: -30.5595, lng: 22.9375 },
    { name: 'Zimbabwe', iso2: 'ZW', lat: -19.0154, lng: 29.1549 },
    { name: 'Australia', iso2: 'AU', lat: -25.2744, lng: 133.7751 },
    { name: 'United States', iso2: 'US', lat: 37.0902, lng: -95.7129 },
    { name: 'United Kingdom', iso2: 'GB', lat: 55.3781, lng: -3.4360 },
    { name: 'Canada', iso2: 'CA', lat: 56.1304, lng: -106.3468 },
    { name: 'Germany', iso2: 'DE', lat: 51.1657, lng: 10.4515 },
    { name: 'Brazil', iso2: 'BR', lat: -14.2350, lng: -51.9253 },
    { name: 'Japan', iso2: 'JP', lat: 36.2048, lng: 138.2529 },
  ],
  states: {
    'India': [
      { name: 'Maharashtra', state_code: 'MH', lat: 19.7515, lng: 75.7139 },
      { name: 'Karnataka', state_code: 'KA', lat: 15.3173, lng: 75.7139 },
      { name: 'Tamil Nadu', state_code: 'TN', lat: 11.1271, lng: 78.6569 },
      { name: 'Delhi', state_code: 'DL', lat: 28.7041, lng: 77.1025 },
      { name: 'Gujarat', state_code: 'GJ', lat: 22.2587, lng: 71.1924 },
      { name: 'Rajasthan', state_code: 'RJ', lat: 27.0238, lng: 74.2179 },
      { name: 'Uttar Pradesh', state_code: 'UP', lat: 26.8467, lng: 80.9462 },
      { name: 'West Bengal', state_code: 'WB', lat: 22.9868, lng: 87.8550 },
    ],
    'South Africa': [
      { name: 'Gauteng', state_code: 'GP', lat: -26.2708, lng: 28.1123 },
      { name: 'Western Cape', state_code: 'WC', lat: -33.2278, lng: 21.8569 },
      { name: 'KwaZulu-Natal', state_code: 'KZN', lat: -28.5306, lng: 30.8958 },
      { name: 'Eastern Cape', state_code: 'EC', lat: -32.2968, lng: 26.4194 },
      { name: 'Limpopo', state_code: 'LP', lat: -23.4013, lng: 29.4179 },
    ],
    'Zimbabwe': [
      { name: 'Harare', state_code: 'HA', lat: -17.8292, lng: 31.0522 },
      { name: 'Bulawayo', state_code: 'BU', lat: -20.1325, lng: 28.6266 },
      { name: 'Manicaland', state_code: 'MA', lat: -18.9216, lng: 32.1746 },
      { name: 'Mashonaland East', state_code: 'ME', lat: -18.5872, lng: 31.2626 },
      { name: 'Mashonaland West', state_code: 'MW', lat: -17.4851, lng: 29.7889 },
      { name: 'Masvingo', state_code: 'MV', lat: -20.0674, lng: 30.8277 },
      { name: 'Matabeleland North', state_code: 'MN', lat: -18.5332, lng: 27.5495 },
      { name: 'Matabeleland South', state_code: 'MS', lat: -21.0522, lng: 29.0458 },
      { name: 'Midlands', state_code: 'MI', lat: -19.0554, lng: 29.6035 },
    ],
    'Australia': [
      { name: 'New South Wales', state_code: 'NSW', lat: -31.8406, lng: 145.6128 },
      { name: 'Victoria', state_code: 'VIC', lat: -36.9848, lng: 143.3906 },
      { name: 'Queensland', state_code: 'QLD', lat: -20.9176, lng: 142.7028 },
      { name: 'Western Australia', state_code: 'WA', lat: -27.6728, lng: 121.6283 },
      { name: 'South Australia', state_code: 'SA', lat: -30.0002, lng: 136.2092 },
      { name: 'Tasmania', state_code: 'TAS', lat: -41.4545, lng: 145.9707 },
    ],
    'United States': [
      { name: 'California', state_code: 'CA', lat: 36.7783, lng: -119.4179 },
      { name: 'Texas', state_code: 'TX', lat: 31.9686, lng: -99.9018 },
      { name: 'Florida', state_code: 'FL', lat: 27.6648, lng: -81.5158 },
      { name: 'New York', state_code: 'NY', lat: 40.7128, lng: -74.0060 },
      { name: 'Illinois', state_code: 'IL', lat: 40.6331, lng: -89.3985 },
      { name: 'Washington', state_code: 'WA', lat: 47.7511, lng: -120.7401 },
      { name: 'Colorado', state_code: 'CO', lat: 39.5501, lng: -105.7821 },
    ],
    'United Kingdom': [
      { name: 'England', state_code: 'ENG', lat: 52.3555, lng: -1.1743 },
      { name: 'Scotland', state_code: 'SCT', lat: 56.4907, lng: -4.2026 },
      { name: 'Wales', state_code: 'WLS', lat: 52.1307, lng: -3.7837 },
      { name: 'Northern Ireland', state_code: 'NIR', lat: 54.7877, lng: -6.4923 },
    ],
    'Canada': [
      { name: 'Ontario', state_code: 'ON', lat: 51.2538, lng: -85.3232 },
      { name: 'Quebec', state_code: 'QC', lat: 52.9399, lng: -73.5491 },
      { name: 'British Columbia', state_code: 'BC', lat: 53.7267, lng: -127.6476 },
      { name: 'Alberta', state_code: 'AB', lat: 53.9333, lng: -116.5765 },
    ],
    'Germany': [
      { name: 'Bavaria', state_code: 'BY', lat: 48.7904, lng: 11.4979 },
      { name: 'Berlin', state_code: 'BE', lat: 52.5200, lng: 13.4050 },
      { name: 'Hamburg', state_code: 'HH', lat: 53.5511, lng: 9.9937 },
      { name: 'Hesse', state_code: 'HE', lat: 50.6521, lng: 9.1624 },
    ],
    'Brazil': [
      { name: 'São Paulo', state_code: 'SP', lat: -23.5505, lng: -46.6333 },
      { name: 'Rio de Janeiro', state_code: 'RJ', lat: -22.9068, lng: -43.1729 },
      { name: 'Minas Gerais', state_code: 'MG', lat: -18.5122, lng: -44.5550 },
      { name: 'Bahia', state_code: 'BA', lat: -12.5797, lng: -41.7007 },
    ],
    'Japan': [
      { name: 'Tokyo', state_code: 'TK', lat: 35.6762, lng: 139.6503 },
      { name: 'Osaka', state_code: 'OS', lat: 34.6937, lng: 135.5023 },
      { name: 'Kyoto', state_code: 'KY', lat: 35.0116, lng: 135.7681 },
      { name: 'Hokkaido', state_code: 'HK', lat: 43.0642, lng: 141.3469 },
    ],
  },
  cities: {
    'India': {
      'Maharashtra': [
        { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
        { name: 'Pune', lat: 18.5204, lng: 73.8567 },
        { name: 'Nagpur', lat: 21.1458, lng: 79.0882 },
        { name: 'Nashik', lat: 19.9975, lng: 73.7898 },
      ],
      'Karnataka': [
        { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
        { name: 'Mysore', lat: 12.2958, lng: 76.6394 },
        { name: 'Hubli', lat: 15.3647, lng: 75.1240 },
      ],
      'Tamil Nadu': [
        { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
        { name: 'Coimbatore', lat: 11.0168, lng: 76.9558 },
        { name: 'Madurai', lat: 9.9252, lng: 78.1198 },
      ],
      'Delhi': [
        { name: 'New Delhi', lat: 28.6139, lng: 77.2090 },
        { name: 'North Delhi', lat: 28.7041, lng: 77.1025 },
        { name: 'South Delhi', lat: 28.5355, lng: 77.2410 },
      ],
      'Gujarat': [
        { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
        { name: 'Surat', lat: 21.1702, lng: 72.8311 },
        { name: 'Vadodara', lat: 22.3072, lng: 73.1812 },
      ],
      'Rajasthan': [
        { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
        { name: 'Udaipur', lat: 24.5854, lng: 73.7125 },
        { name: 'Jodhpur', lat: 26.2389, lng: 73.0243 },
      ],
      'Uttar Pradesh': [
        { name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
        { name: 'Kanpur', lat: 26.4499, lng: 80.3319 },
        { name: 'Varanasi', lat: 25.3176, lng: 82.9739 },
      ],
      'West Bengal': [
        { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
        { name: 'Howrah', lat: 22.5958, lng: 88.2636 },
        { name: 'Darjeeling', lat: 27.0360, lng: 88.2627 },
      ],
    },
    'South Africa': {
      'Gauteng': [
        { name: 'Johannesburg', lat: -26.2041, lng: 28.0473 },
        { name: 'Pretoria', lat: -25.7479, lng: 28.2293 },
        { name: 'Soweto', lat: -26.2227, lng: 27.8569 },
      ],
      'Western Cape': [
        { name: 'Cape Town', lat: -33.9249, lng: 18.4241 },
        { name: 'Stellenbosch', lat: -33.9321, lng: 18.8602 },
      ],
      'KwaZulu-Natal': [
        { name: 'Durban', lat: -29.8587, lng: 31.0218 },
        { name: 'Pietermaritzburg', lat: -29.6006, lng: 30.3794 },
      ],
      'Eastern Cape': [
        { name: 'Port Elizabeth', lat: -33.9608, lng: 25.6022 },
        { name: 'East London', lat: -33.0292, lng: 27.8546 },
      ],
      'Limpopo': [
        { name: 'Polokwane', lat: -23.9045, lng: 29.4688 },
        { name: 'Mokopane', lat: -24.1946, lng: 29.0046 },
      ],
    },
    'Zimbabwe': {
      'Harare': [
        { name: 'Harare City', lat: -17.8292, lng: 31.0522 },
        { name: 'Chitungwiza', lat: -18.0127, lng: 31.0755 },
        { name: 'Epworth', lat: -17.8903, lng: 31.1478 },
      ],
      'Bulawayo': [
        { name: 'Bulawayo City', lat: -20.1325, lng: 28.6266 },
        { name: 'Nkulumane', lat: -20.1833, lng: 28.5333 },
      ],
      'Manicaland': [
         { name: 'Makoni', lat: -18.494268007228975, lng: 32.15794784535138 },
        { name: 'Mutare', lat: -18.9707, lng: 32.6709 },
        { name: 'Chipinge', lat: -20.1883, lng: 32.6189 },
        { name: 'Rusape', lat: -18.5287, lng: 32.1279 },
        { name: 'Nyanga', lat: -18.2167, lng: 32.7500 },
        { name: 'Chimanimani', lat: -19.7994, lng: 32.8697 }
      
      ],
      'Mashonaland East': [
        { name: 'Marondera', lat: -18.1853, lng: 31.5519 },
        { name: 'Ruwa', lat: -17.8892, lng: 31.2483 },
      ],
      'Mashonaland West': [
        { name: 'Chinhoyi', lat: -17.3622, lng: 30.1911 },
        { name: 'Karoi', lat: -16.8167, lng: 29.6833 },
        { name: 'Kadoma', lat: -18.3333, lng: 29.9167 },
      ],
      'Masvingo': [
        { name: 'Masvingo City', lat: -20.0674, lng: 30.8277 },
        { name: 'Chiredzi', lat: -21.0500, lng: 31.6667 },
      ],
      'Matabeleland North': [
        { name: 'Hwange', lat: -18.3667, lng: 25.9833 },
        { name: 'Victoria Falls', lat: -17.9243, lng: 25.8572 },
        { name: 'Lupane', lat: -18.9333, lng: 27.8000 },
      ],
      'Matabeleland South': [
        { name: 'Gwanda', lat: -20.9333, lng: 29.0167 },
        { name: 'Beitbridge', lat: -22.2167, lng: 30.0000 },
        { name: 'Plumtree', lat: -20.4833, lng: 27.8167 },
      ],
      'Midlands': [
        { name: 'Gweru', lat: -19.4500, lng: 29.8167 },
        { name: 'Kwekwe', lat: -18.9281, lng: 29.8147 },
        { name: 'Zvishavane', lat: -20.3333, lng: 30.0333 },
      ],
    },
    'Australia': {
      'New South Wales': [
        { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
        { name: 'Newcastle', lat: -32.9283, lng: 151.7817 },
        { name: 'Wollongong', lat: -34.4278, lng: 150.8931 },
      ],
      'Victoria': [
        { name: 'Melbourne', lat: -37.8136, lng: 144.9631 },
        { name: 'Geelong', lat: -38.1499, lng: 144.3617 },
        { name: 'Ballarat', lat: -37.5622, lng: 143.8503 },
      ],
      'Queensland': [
        { name: 'Brisbane', lat: -27.4698, lng: 153.0251 },
        { name: 'Gold Coast', lat: -28.0167, lng: 153.4000 },
        { name: 'Cairns', lat: -16.9186, lng: 145.7781 },
      ],
      'Western Australia': [
        { name: 'Perth', lat: -31.9505, lng: 115.8605 },
        { name: 'Fremantle', lat: -32.0569, lng: 115.7439 },
      ],
      'South Australia': [
        { name: 'Adelaide', lat: -34.9285, lng: 138.6007 },
        { name: 'Mount Gambier', lat: -37.8286, lng: 140.7828 },
      ],
      'Tasmania': [
        { name: 'Hobart', lat: -42.8821, lng: 147.3272 },
        { name: 'Launceston', lat: -41.4332, lng: 147.1441 },
      ],
    },
    'United States': {
      'California': [
        { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
        { name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
        { name: 'San Diego', lat: 32.7157, lng: -117.1611 },
        { name: 'San Jose', lat: 37.3382, lng: -121.8863 },
      ],
      'Texas': [
        { name: 'Houston', lat: 29.7604, lng: -95.3698 },
        { name: 'Dallas', lat: 32.7767, lng: -96.7970 },
        { name: 'Austin', lat: 30.2672, lng: -97.7431 },
        { name: 'San Antonio', lat: 29.4241, lng: -98.4936 },
      ],
      'Florida': [
        { name: 'Miami', lat: 25.7617, lng: -80.1918 },
        { name: 'Orlando', lat: 28.5383, lng: -81.3792 },
        { name: 'Tampa', lat: 27.9506, lng: -82.4572 },
      ],
      'New York': [
        { name: 'New York City', lat: 40.7128, lng: -74.0060 },
        { name: 'Buffalo', lat: 42.8864, lng: -78.8784 },
        { name: 'Albany', lat: 42.6526, lng: -73.7562 },
      ],
      'Illinois': [
        { name: 'Chicago', lat: 41.8781, lng: -87.6298 },
        { name: 'Springfield', lat: 39.7817, lng: -89.6501 },
      ],
      'Washington': [
        { name: 'Seattle', lat: 47.6062, lng: -122.3321 },
        { name: 'Spokane', lat: 47.6588, lng: -117.4260 },
      ],
      'Colorado': [
        { name: 'Denver', lat: 39.7392, lng: -104.9903 },
        { name: 'Colorado Springs', lat: 38.8339, lng: -104.8214 },
      ],
    },
    'United Kingdom': {
      'England': [
        { name: 'London', lat: 51.5074, lng: -0.1278 },
        { name: 'Manchester', lat: 53.4808, lng: -2.2426 },
        { name: 'Birmingham', lat: 52.4862, lng: -1.8904 },
        { name: 'Liverpool', lat: 53.4084, lng: -2.9916 },
      ],
      'Scotland': [
        { name: 'Edinburgh', lat: 55.9533, lng: -3.1883 },
        { name: 'Glasgow', lat: 55.8642, lng: -4.2518 },
        { name: 'Aberdeen', lat: 57.1497, lng: -2.0943 },
      ],
      'Wales': [
        { name: 'Cardiff', lat: 51.4816, lng: -3.1791 },
        { name: 'Swansea', lat: 51.6214, lng: -3.9436 },
      ],
      'Northern Ireland': [
        { name: 'Belfast', lat: 54.5973, lng: -5.9301 },
        { name: 'Derry', lat: 54.9966, lng: -7.3086 },
      ],
    },
    'Canada': {
      'Ontario': [
        { name: 'Toronto', lat: 43.6532, lng: -79.3832 },
        { name: 'Ottawa', lat: 45.4215, lng: -75.6972 },
        { name: 'Mississauga', lat: 43.5890, lng: -79.6441 },
      ],
      'Quebec': [
        { name: 'Montreal', lat: 45.5017, lng: -73.5673 },
        { name: 'Quebec City', lat: 46.8139, lng: -71.2080 },
      ],
      'British Columbia': [
        { name: 'Vancouver', lat: 49.2827, lng: -123.1207 },
        { name: 'Victoria', lat: 48.4284, lng: -123.3656 },
      ],
      'Alberta': [
        { name: 'Calgary', lat: 51.0447, lng: -114.0719 },
        { name: 'Edmonton', lat: 53.5461, lng: -113.4938 },
      ],
    },
    'Germany': {
      'Bavaria': [
        { name: 'Munich', lat: 48.1351, lng: 11.5820 },
        { name: 'Nuremberg', lat: 49.4521, lng: 11.0767 },
      ],
      'Berlin': [
        { name: 'Berlin City', lat: 52.5200, lng: 13.4050 },
      ],
      'Hamburg': [
        { name: 'Hamburg City', lat: 53.5511, lng: 9.9937 },
      ],
      'Hesse': [
        { name: 'Frankfurt', lat: 50.1109, lng: 8.6821 },
        { name: 'Wiesbaden', lat: 50.0782, lng: 8.2398 },
      ],
    },
    'Brazil': {
      'São Paulo': [
        { name: 'São Paulo City', lat: -23.5505, lng: -46.6333 },
        { name: 'Campinas', lat: -22.9099, lng: -47.0626 },
      ],
      'Rio de Janeiro': [
        { name: 'Rio de Janeiro City', lat: -22.9068, lng: -43.1729 },
        { name: 'Niterói', lat: -22.8838, lng: -43.1038 },
      ],
      'Minas Gerais': [
        { name: 'Belo Horizonte', lat: -19.9167, lng: -43.9345 },
        { name: 'Uberlândia', lat: -18.9186, lng: -48.2772 },
      ],
      'Bahia': [
        { name: 'Salvador', lat: -12.9714, lng: -38.5014 },
        { name: 'Feira de Santana', lat: -12.2664, lng: -38.9663 },
      ],
    },
    'Japan': {
      'Tokyo': [
        { name: 'Tokyo City', lat: 35.6762, lng: 139.6503 },
        { name: 'Shibuya', lat: 35.6580, lng: 139.7016 },
        { name: 'Shinjuku', lat: 35.6938, lng: 139.7034 },
      ],
      'Osaka': [
        { name: 'Osaka City', lat: 34.6937, lng: 135.5023 },
        { name: 'Sakai', lat: 34.5733, lng: 135.4830 },
      ],
      'Kyoto': [
        { name: 'Kyoto City', lat: 35.0116, lng: 135.7681 },
        { name: 'Uji', lat: 34.8887, lng: 135.8000 },
      ],
      'Hokkaido': [
        { name: 'Sapporo', lat: 43.0618, lng: 141.3545 },
        { name: 'Hakodate', lat: 41.7687, lng: 140.7288 },
      ],
    },
  },
};

// Custom Dropdown Component
const CustomDropdown = ({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  icon: Icon,
  displayKey = 'name',
  valueKey = 'name'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const listRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to selected item when dropdown opens
  useEffect(() => {
    if (isOpen && listRef.current && value) {
      const selectedIdx = options.findIndex(opt => {
        const optValue = typeof opt === 'string' ? opt : opt[valueKey];
        return optValue === value;
      });
      if (selectedIdx >= 0) {
        setSelectedIndex(selectedIdx);
        const element = listRef.current.children[selectedIdx];
        if (element) {
          element.scrollIntoView({ block: 'nearest' });
        }
      }
    }
  }, [isOpen, value, options, valueKey]);

  // Get display value for selected option
  const getDisplayValue = () => {
    if (!value) return '';
    const selectedOption = options.find(opt => {
      const optValue = typeof opt === 'string' ? opt : opt[valueKey];
      return optValue === value;
    });
    if (!selectedOption) return value;
    return typeof selectedOption === 'string' ? selectedOption : selectedOption[displayKey];
  };

  const handleSelect = (option) => {
    const optValue = typeof option === 'string' ? option : option[valueKey];
    onChange({ target: { value: optValue } });
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => {
          const newIndex = prev < options.length - 1 ? prev + 1 : prev;
          if (listRef.current && listRef.current.children[newIndex]) {
            listRef.current.children[newIndex].scrollIntoView({ block: 'nearest' });
          }
          return newIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : 0;
          if (listRef.current && listRef.current.children[newIndex]) {
            listRef.current.children[newIndex].scrollIntoView({ block: 'nearest' });
          }
          return newIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < options.length) {
          handleSelect(options[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`w-full px-4 py-3 bg-cg-panel-2 text-white rounded-lg border border-green-500/20 
          focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 outline-none transition-all 
          hover:border-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-between gap-2 text-left
          ${isOpen ? 'border-green-500/50 ring-2 ring-green-500/20' : ''}`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {Icon && <Icon size={18} className="text-green-400/60 flex-shrink-0" />}
          <span className={`truncate ${value ? 'text-white' : 'text-gray-400'}`}>
            {value ? getDisplayValue() : placeholder}
          </span>
        </div>
        <ChevronDown
          size={18}
          className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-cg-panel/98 backdrop-blur-md rounded-xl shadow-2xl border border-green-500/30 z-[10001] overflow-hidden animate-slideDown">
          {/* Options List */}
          <div ref={listRef} className="max-h-[240px] overflow-y-auto custom-scrollbar">
            {options.length > 0 ? (
              options.map((option, index) => {
                const optValue = typeof option === 'string' ? option : option[valueKey];
                const optDisplay = typeof option === 'string' ? option : option[displayKey];
                const isSelected = optValue === value;
                const isHighlighted = index === selectedIndex;

                return (
                  <div
                    key={optValue}
                    onClick={() => handleSelect(option)}
                    className={`px-4 py-3 cursor-pointer transition-all flex items-center gap-3 
                      border-b border-green-500/10 last:border-b-0
                      ${isHighlighted
                        ? 'bg-green-500/20 border-l-4 border-l-green-500'
                        : isSelected
                          ? 'bg-green-500/10 border-l-4 border-l-green-400'
                          : 'hover:bg-green-500/10 border-l-4 border-l-transparent'
                      }`}
                  >
                    <MapPin
                      className={`flex-shrink-0 transition-colors ${isHighlighted || isSelected ? 'text-green-400' : 'text-green-400/40'
                        }`}
                      size={16}
                    />
                    <span className={`text-sm font-medium truncate ${isHighlighted || isSelected ? 'text-white' : 'text-white/80'
                      }`}>
                      {optDisplay}
                    </span>
                    {isSelected && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-gray-400">No options available</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const LocationModal = ({ isOpen, onClose, onLocationSelect }) => {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const [loading, setLoading] = useState({
    geocoding: false,
  });

  // Fetch countries when modal opens
  useEffect(() => {
    if (isOpen) {
      setCountries(locationData.countries);
    }
  }, [isOpen]);

  const handleCountryChange = (e) => {
    const country = e.target.value;
    setSelectedCountry(country);
    setSelectedState('');
    setSelectedCity('');
    setCities([]);

    if (country && locationData.states[country]) {
      setStates(locationData.states[country]);
    } else {
      setStates([]);
    }
  };

  const handleStateChange = (e) => {
    const state = e.target.value;
    setSelectedState(state);
    setSelectedCity('');

    if (state && selectedCountry && locationData.cities[selectedCountry]?.[state]) {
      setCities(locationData.cities[selectedCountry][state]);
    } else {
      setCities([]);
    }
  };

  const handleCityChange = (e) => {
    const city = e.target.value;
    setSelectedCity(city);
  };

  const handleApplyLocation = () => {
    if (!selectedCountry) {
      alert('Please select at least a country');
      return;
    }

    setLoading(prev => ({ ...prev, geocoding: true }));

    try {
      let coordinates = null;

      if (selectedCity && selectedState && selectedCountry) {
        const cityData = locationData.cities[selectedCountry]?.[selectedState]?.find(
          c => c.name === selectedCity
        );
        if (cityData) {
          coordinates = [cityData.lat, cityData.lng];
        }
      } else if (selectedState && selectedCountry) {
        const stateData = locationData.states[selectedCountry]?.find(
          s => s.name === selectedState
        );
        if (stateData) {
          coordinates = [stateData.lat, stateData.lng];
        }
      } else if (selectedCountry) {
        const countryData = locationData.countries.find(c => c.name === selectedCountry);
        if (countryData) {
          coordinates = [countryData.lat, countryData.lng];
        }
      }

      if (coordinates) {
        onLocationSelect(coordinates);
        onClose();
      } else {
        alert('Could not find coordinates for the selected location');
      }
    } catch (error) {
      console.error('Failed to apply location:', error);
    } finally {
      setLoading(prev => ({ ...prev, geocoding: false }));
    }
  };

  const handleReset = () => {
    setSelectedCountry('');
    setSelectedState('');
    setSelectedCity('');
    setStates([]);
    setCities([]);
  };

  // Get coordinates for display
  const getCoordinates = () => {
    if (selectedCity && selectedState && selectedCountry) {
      const cityData = locationData.cities[selectedCountry]?.[selectedState]?.find(
        c => c.name === selectedCity
      );
      return cityData ? [cityData.lat, cityData.lng] : null;
    } else if (selectedState && selectedCountry) {
      const stateData = locationData.states[selectedCountry]?.find(
        s => s.name === selectedState
      );
      return stateData ? [stateData.lat, stateData.lng] : null;
    } else if (selectedCountry) {
      const countryData = locationData.countries.find(c => c.name === selectedCountry);
      return countryData ? [countryData.lat, countryData.lng] : null;
    }
    return null;
  };

  if (!isOpen) return null;

  const coords = getCoordinates();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div
          className="bg-gradient-to-br from-cg-panel via-cg-panel to-cg-panel-2 rounded-2xl shadow-2xl border border-green-500/30 w-full max-w-2xl max-h-[90vh] overflow-hidden animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-green-900/40 to-green-800/30 px-6 py-4 border-b border-green-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <MapPin className="text-green-400" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Set Location</h2>
                <p className="text-sm text-gray-400">Choose your location on the map</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="text-gray-400 hover:text-white" size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 max-h-[calc(90vh-180px)] overflow-y-auto custom-scrollbar">
            {/* Country Selection */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-green-400">
                <Globe size={16} />
                Country
              </label>
              <CustomDropdown
                value={selectedCountry}
                onChange={handleCountryChange}
                options={countries}
                placeholder="Select a country"
                disabled={false}
                icon={Globe}
                displayKey="name"
                valueKey="name"
              />
            </div>

            {/* State Selection */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-green-400">
                <MapIcon size={16} />
                State / Province
                <span className="text-xs text-gray-500 font-normal">(Optional)</span>
              </label>
              <CustomDropdown
                value={selectedState}
                onChange={handleStateChange}
                options={states}
                placeholder={states.length === 0 && selectedCountry ? 'No states available' : 'Select a state'}
                disabled={!selectedCountry || states.length === 0}
                icon={MapIcon}
                displayKey="name"
                valueKey="name"
              />
            </div>

            {/* City Selection */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-green-400">
                <Building2 size={16} />
                City / District
                <span className="text-xs text-gray-500 font-normal">(Optional)</span>
              </label>
              <CustomDropdown
                value={selectedCity}
                onChange={handleCityChange}
                options={cities}
                placeholder={cities.length === 0 && selectedState ? 'No cities available' : 'Select a city'}
                disabled={!selectedState || cities.length === 0}
                icon={Building2}
                displayKey="name"
                valueKey="name"
              />
            </div>

            {/* Selected Location Display */}
            {selectedCountry && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Selected Location:</p>
                <p className="text-white font-semibold flex items-center gap-2">
                  <Navigation size={16} className="text-green-400" />
                  {[selectedCity, selectedState, selectedCountry].filter(Boolean).join(', ')}
                </p>
                {coords && (
                  <p className="text-xs text-gray-500 mt-1">
                    Coordinates: {coords[0].toFixed(6)}, {coords[1].toFixed(6)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gradient-to-r from-green-900/20 to-green-800/10 px-6 py-4 border-t border-green-500/20 flex items-center justify-between gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
            >
              Reset
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg transition-all text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyLocation}
                disabled={!selectedCountry || loading.geocoding}
                className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-lg transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                {loading.geocoding ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <MapPin size={16} />
                    Apply Location
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add animation styles */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default LocationModal;