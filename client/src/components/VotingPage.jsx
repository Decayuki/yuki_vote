import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Container, Typography, Button, Box, Paper, Rating, Grid } from '@mui/material';
import SortableItem from './SortableItem';

function VotingPage() {
  const navigate = useNavigate();
  const [logos, setLogos] = useState([]);
  const [selectedLogos, setSelectedLogos] = useState([]);
  const [ratings, setRatings] = useState({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetch('/api/logos')
      .then(res => res.json())
      .then(data => setLogos(data))
      .catch(error => console.error('Error fetching logos:', error));
  }, []);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setSelectedLogos((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleLogoSelect = (logo) => {
    if (!selectedLogos.find(l => l.id === logo.id)) {
      setSelectedLogos([...selectedLogos, logo]);
      setRatings(prev => ({ ...prev, [logo.id]: 3 })); // Default rating
    }
  };

  const handleRatingChange = (logoId, newValue) => {
    setRatings(prev => ({ ...prev, [logoId]: newValue }));
  };

  const handleSubmit = async () => {
    const votes = selectedLogos.map((logo, index) => ({
      logoId: logo.id,
      position: index + 1,
      rating: ratings[logo.id]
    }));

    try {
      await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ votes }),
      });
      navigate('/results');
    } catch (error) {
      console.error('Error submitting votes:', error);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Grid container spacing={4}>
          {/* Available Logos */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Logos disponibles
              </Typography>
              <Grid container spacing={2}>
                {logos.map(logo => (
                  <Grid item xs={6} sm={4} key={logo.id}>
                    <Paper
                      elevation={2}
                      sx={{
                        p: 1,
                        cursor: 'pointer',
                        opacity: selectedLogos.find(l => l.id === logo.id) ? 0.5 : 1
                      }}
                      onClick={() => handleLogoSelect(logo)}
                    >
                      <img
                        src={logo.imageUrl}
                        alt={logo.name}
                        style={{ width: '100%', height: 'auto' }}
                      />
                      <Typography variant="body2" align="center">
                        {logo.name}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>

          {/* Selected Logos */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Ma Tier List
              </Typography>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={selectedLogos}
                  strategy={verticalListSortingStrategy}
                >
                  {selectedLogos.map((logo) => (
                    <Box key={logo.id} sx={{ mb: 2 }}>
                      <SortableItem id={logo.id}>
                        <Paper elevation={2} sx={{ p: 2 }}>
                          <Grid container alignItems="center" spacing={2}>
                            <Grid item xs={4}>
                              <img
                                src={logo.imageUrl}
                                alt={logo.name}
                                style={{ width: '100%', height: 'auto' }}
                              />
                            </Grid>
                            <Grid item xs={8}>
                              <Typography variant="body1">{logo.name}</Typography>
                              <Rating
                                value={ratings[logo.id] || 0}
                                onChange={(event, newValue) => {
                                  handleRatingChange(logo.id, newValue);
                                }}
                              />
                            </Grid>
                          </Grid>
                        </Paper>
                      </SortableItem>
                    </Box>
                  ))}
                </SortableContext>
              </DndContext>

              {selectedLogos.length > 0 && (
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={handleSubmit}
                >
                  Valider mon classement
                </Button>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

export default VotingPage;
