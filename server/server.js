const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const { initDb, uploadImage, addLogo, getLogos, addVote, getResults, resetVotes } = require('./db/supabase');
const { port, host, corsOrigin } = require('./config');

// Configuration de multer pour le stockage en mémoire
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    },
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

// Configuration CORS
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Configuration Socket.IO
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/logos', express.static(path.join(__dirname, 'public/logos')));

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
        console.error('Error fetching logos:', error);
        res.status(500).json({ error: 'Failed to fetch logos' });
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
        console.error('Error adding vote:', error);
        res.status(500).json({ error: 'Failed to add vote' });
    }
});

app.get('/api/results', async (req, res) => {
    try {
        const results = await getResults();
        res.json(results);
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ error: 'Failed to fetch results' });
    }
});

app.post('/api/reset-votes', async (req, res) => {
    try {
        await resetVotes();
        const results = await getResults();
        io.emit('votesUpdated', results);
        res.json({ success: true });
    } catch (error) {
        console.error('Error resetting votes:', error);
        res.status(500).json({ error: 'Failed to reset votes' });
    }
});

// Socket.IO events
io.on('connection', (socket) => {
    console.log('Client connected');
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Initialiser la base de données
initDb().catch(console.error);

// Démarrer le serveur
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
