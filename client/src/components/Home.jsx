import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Button, Box, Paper } from '@mui/material';

function Home() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Logo Tier List
          </Typography>
          
          <Typography variant="body1" paragraph>
            Bienvenue ! Vous allez pouvoir évaluer et classer une série de logos.
          </Typography>
          
          <Typography variant="body1" paragraph>
            Instructions :
          </Typography>
          
          <Typography variant="body2" component="div" sx={{ textAlign: 'left', mb: 4 }}>
            <ul>
              <li>Sélectionnez les logos que vous souhaitez évaluer</li>
              <li>Glissez-déposez les logos pour les classer</li>
              <li>Attribuez une note de 1 à 5 à chaque logo</li>
              <li>Validez votre classement pour voir les résultats en temps réel</li>
            </ul>
          </Typography>

          <Button 
            variant="contained" 
            color="primary" 
            size="large"
            onClick={() => navigate('/vote')}
          >
            Commencer
          </Button>
        </Paper>
      </Box>
    </Container>
  );
}

export default Home;
