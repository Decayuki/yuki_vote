import React, { useState, useEffect } from 'react';
import { Container, Typography, Paper, Box, Grid } from '@mui/material';
import { io } from 'socket.io-client';

const TIER_COLORS = {
  S: '#FF7F7F',
  A: '#FFBF7F',
  B: '#FFFF7F',
  C: '#7FFF7F',
  D: '#7F7FFF'
};

function ResultsPage() {
  const [results, setResults] = useState([]);
  
  useEffect(() => {
    const socket = io(window.location.origin);
    
    const fetchResults = async () => {
      try {
        const response = await fetch('/api/results');
        if (!response.ok) throw new Error('Failed to fetch results');
        
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid results data received');
        }
        
        setResults(data);
      } catch (error) {
        console.error('Error fetching results:', error);
      }
    };

    // Initial fetch
    fetchResults();

    // Listen for updates
    socket.on('votesUpdated', fetchResults);

    return () => {
      socket.disconnect();
    };
  }, []);

  const tierLists = {
    S: results.filter(logo => logo.tier === 'S'),
    A: results.filter(logo => logo.tier === 'A'),
    B: results.filter(logo => logo.tier === 'B'),
    C: results.filter(logo => logo.tier === 'C'),
    D: results.filter(logo => logo.tier === 'D')
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Résultats en temps réel
        </Typography>

        {Object.entries(tierLists).map(([tier, logos]) => (
          <Paper 
            key={tier}
            elevation={3}
            sx={{ 
              mt: 2,
              p: 2,
              backgroundColor: TIER_COLORS[tier],
              color: 'black'
            }}
          >
            <Grid container spacing={2}>
              <Grid item xs={1}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {tier}
                </Typography>
              </Grid>
              <Grid item xs={11}>
                <Grid container spacing={2}>
                  {logos.map(logo => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={logo.id}>
                      <Paper elevation={2} sx={{ p: 1 }}>
                        <img
                          src={logo.imageUrl}
                          alt={logo.name}
                          style={{ width: '100%', height: 'auto' }}
                        />
                        <Typography variant="body1" align="center">
                          {logo.name}
                        </Typography>
                        <Typography variant="body2" align="center" color="text.secondary">
                          Note moyenne: {logo.averageRating?.toFixed(1) || 'N/A'}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </Paper>
        ))}
      </Box>
    </Container>
  );
}

export default ResultsPage;
