const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { initDb, uploadImage, addLogo, getLogos, addVote, getResults, resetVotes } = require('./db/supabase');
const { port, host, corsOrigin } = require('./config');
const multer = require('multer');
const path = require('path');

// Configuration de multer pour le stockage en mémoire
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Format de fichier non supporté'));
        }
    }
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/logos', express.static(path.join(__dirname, 'public/logos')));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/upload.html'));
});

app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/test.html'));
});

app.get('/vote', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/vote.html'));
});

// API Routes
app.post('/api/upload', upload.single('logo'), async (req, res) => {
    console.log('Upload request received:', {
        file: req.file ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        } : 'No file',
        body: req.body
    });

    try {
        if (!req.file) {
            console.error('No file uploaded');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { groupNumber, variant } = req.body;
        
        if (!groupNumber || !variant) {
            console.error('Missing required fields:', { groupNumber, variant });
            return res.status(400).json({ error: 'Group number and variant are required' });
        }

        console.log('Starting upload to Supabase:', {
            groupNumber,
            variant,
            fileName: req.file.originalname
        });

        // Upload to Supabase
        const imageUrl = await uploadImage(req.file);
        console.log('Image uploaded to Supabase:', imageUrl);

        // Add to database
        const logo = await addLogo(
            parseInt(groupNumber),
            variant.toUpperCase(),
            req.file.originalname,
            imageUrl
        );
        console.log('Logo added to database:', logo);

        res.json({ success: true, logo });
        io.emit('logoAdded', logo);
    } catch (error) {
        console.error('Error in upload handler:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

app.get('/api/logos', async (req, res) => {
    try {
        const logos = await getLogos();
        res.json(logos);
    } catch (error) {
        console.error('Erreur lors de la récupération des logos:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/vote', async (req, res) => {
    try {
        const { votes } = req.body;
        for (const vote of votes) {
            await addVote(vote.logoId, vote.position, vote.rating);
        }
        
        const results = await getResults();
        io.emit('votesUpdated', results);
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors du vote:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/results', async (req, res) => {
    try {
        const results = await getResults();
        res.json(results);
    } catch (error) {
        console.error('Erreur lors de la récupération des résultats:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/reset-votes', async (req, res) => {
    try {
        await resetVotes();
        const results = await getResults();
        io.emit('votesUpdated', results);
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de la réinitialisation des votes:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Socket.IO
io.on('connection', (socket) => {
    console.log('Client connecté');
    socket.on('disconnect', () => {
        console.log('Client déconnecté');
    });
});

// Initialiser la base de données
initDb().catch(console.error);

// Démarrer le serveur
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
