import React, { useState } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Fade,
  Typography,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  LocationOn as LocationIcon,
  TravelExplore as TripIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

interface SearchResult {
  id: string;
  title: string;
  type: 'trip' | 'location' | 'user';
  subtitle?: string;
}

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onResultSelect?: (result: SearchResult) => void;
  suggestions?: SearchResult[];
  width?: string | number;
  variant?: 'outlined' | 'filled' | 'standard';
}

// Mock data for demonstration
const mockSuggestions: SearchResult[] = [
  { id: '1', title: 'Spring in Santorini', type: 'trip', subtitle: 'Greece' },
  { id: '2', title: 'Paris Getaway', type: 'trip', subtitle: 'France' },
  { id: '3', title: 'Tokyo', type: 'location', subtitle: 'Japan' },
  { id: '4', title: 'New York', type: 'location', subtitle: 'USA' },
  { id: '5', title: 'John Doe', type: 'user', subtitle: 'Travel Enthusiast' },
  { id: '6', title: 'Jane Smith', type: 'user', subtitle: 'Adventure Seeker' },
];

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search trips, locations, or users...',
  onSearch,
  onResultSelect,
  suggestions = mockSuggestions,
  variant = 'outlined',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<SearchResult[]>([]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);

    if (value.trim()) {
      const filtered = suggestions.filter((item) =>
        item.title.toLowerCase().includes(value.toLowerCase()) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(value.toLowerCase()))
      );
      setFilteredSuggestions(filtered);
      setIsOpen(true);
    } else {
      setFilteredSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleSearch = () => {
    if (query.trim()) {
      onSearch?.(query);
      setIsOpen(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setQuery(result.title);
    setIsOpen(false);
    onResultSelect?.(result);
  };

  const handleClear = () => {
    setQuery('');
    setFilteredSuggestions([]);
    setIsOpen(false);
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'trip':
        return <TripIcon sx={{ color: 'primary.main' }} />;
      case 'location':
        return <LocationIcon sx={{ color: 'success.main' }} />;
      case 'user':
        return <PersonIcon sx={{ color: 'warning.main' }} />;
      default:
        return <SearchIcon />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'trip':
        return 'Trip';
      case 'location':
        return 'Location';
      case 'user':
        return 'User';
      default:
        return '';
    }
  };

  return (
    <Box 
      sx={{ 
        position: 'relative', 
        width: '100%', // Use full width of parent container
        maxWidth: '500px', // Set maximum width
        minWidth: '300px', // Set minimum width to prevent shrinking
        display: { xs: 'none', md: 'block' }, // Hide on mobile, show on desktop
      }}
    >
      <TextField
        disabled
        fullWidth
        variant={variant}
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyPress}
        onFocus={() => {
          if (query.trim() && filteredSuggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
          endAdornment: query && (
            <InputAdornment position="end">
              <IconButton
                onClick={handleClear}
                edge="end"
                size="small"
                sx={{ '&:hover': { backgroundColor: 'action.hover' } }}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            height: '40px', // Reduced height
            borderRadius: 20, // More rounded ends
            backgroundColor: 'background.paper',
            fontSize: '0.9rem', // Slightly smaller font
            '& input': {
              padding: '8px 14px', // Adjust padding for smaller height
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
              borderWidth: 2,
            },
          },
        }}
      />

      {/* Search Results Dropdown */}
      <Fade in={isOpen && filteredSuggestions.length > 0}>
        <Paper
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            mt: 1,
            maxHeight: 300,
            overflow: 'auto',
            boxShadow: 3,
            borderRadius: 2,
          }}
        >
          <List sx={{ py: 0 }}>
            {filteredSuggestions.map((result, index) => (
              <ListItem
                key={result.id}
                onClick={() => handleResultClick(result)}
                sx={{
                  cursor: 'pointer',
                  py: 1.5,
                  borderBottom: index < filteredSuggestions.length - 1 ? '1px solid' : 'none',
                  borderBottomColor: 'divider',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {getIcon(result.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {result.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          backgroundColor: 'background.default',
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          fontSize: '0.7rem',
                        }}
                      >
                        {getTypeLabel(result.type)}
                      </Typography>
                    </Box>
                  }
                  secondary={result.subtitle}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Fade>

      {/* No Results */}
      <Fade in={isOpen && query.trim().length > 0 && filteredSuggestions.length === 0}>
        <Paper
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            mt: 1,
            boxShadow: 3,
            borderRadius: 2,
          }}
        >
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <SearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="textSecondary">
              No results found for "{query}"
            </Typography>
          </Box>
        </Paper>
      </Fade>
    </Box>
  );
};

export default SearchBar;