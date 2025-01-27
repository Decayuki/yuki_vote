require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

// Initialisation Express
const app = express();

// Configuration Supabase
const supabase = createClient(config.supabase.url, config.supabase.key);

// Configuration multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes API
app.post('/api/upload', upload.single('logo'), async (req, res) => {
    try {
        console.log('Upload request received:', req.body);
        
        if (!req.file) {
            throw new Error('No file uploaded');
        }

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('logos')
            .upload(
                `${Date.now()}-${req.file.originalname}`,
                req.file.buffer,
                { contentType: req.file.mimetype }
            );

        if (error) {
            console.error('Supabase storage error:', error);
            throw error;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('logos')
            .getPublicUrl(data.path);

        // Save to database
        const { data: logo, error: dbError } = await supabase
            .from('logos')
            .insert({
                group_number: req.body.group_number,
                variant: req.body.variant,
                name: req.body.name,
                image_url: publicUrl
            })
            .select()
            .single();

        if (dbError) {
            console.error('Supabase database error:', dbError);
            throw dbError;
        }

        res.json(logo);
    } catch (error) {
        console.error('Error in upload:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/logos', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('logos')
            .select('*')
            .order('group_number', { ascending: true })
            .order('variant', { ascending: true });

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('Error fetching logos:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/vote', async (req, res) => {
    try {
        const { votes } = req.body;
        if (!Array.isArray(votes)) {
            throw new Error('Invalid votes format');
        }

        // Insert votes
        const { error } = await supabase
            .from('votes')
            .insert(votes.map(v => ({
                logo_id: v.logoId,
                rating: v.rating
            })));

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Error submitting vote:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/results', async (req, res) => {
    try {
        // Get logos with their average ratings
        const { data, error } = await supabase
            .from('logos')
            .select(`
                *,
                votes (rating)
            `);

        if (error) throw error;

        // Calculate statistics
        const results = data.map(logo => {
            const ratings = logo.votes.map(v => v.rating);
            const average = ratings.length > 0 
                ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
                : null;

            // Determine tier based on average rating
            let tier = 'C';
            if (average !== null) {
                if (average >= 4.5) tier = 'S';
                else if (average >= 4) tier = 'A';
                else if (average >= 3) tier = 'B';
                else if (average >= 2) tier = 'C';
                else tier = 'D';
            }

            return {
                ...logo,
                average_rating: average,
                vote_count: ratings.length,
                tier
            };
        });

        res.json(results);
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route pour servir les fichiers statiques
app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrage du serveur
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
