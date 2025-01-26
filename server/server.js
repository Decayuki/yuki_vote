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
        origin: corsOrigin,
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors());
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
    try {
        const { groupNumber, variant } = req.body;
        if (!req.file || !groupNumber || !variant) {
            return res.status(400).json({ error: 'Fichier, groupe et variante requis' });
        }

        const imageUrl = await uploadImage(req.file);
        const logo = await addLogo(
            parseInt(groupNumber),
            variant,
            `Logo ${groupNumber}${variant}`,
            imageUrl
        );

        res.json(logo);
        io.emit('logoAdded', logo);
    } catch (error) {
        console.error('Erreur lors de l\'upload:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload' });
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

// Démarrer le serveur
server.listen(port, host, () => {
    console.log(`Serveur démarré sur http://${host}:${port}`);
    
    // Initialiser la base de données
    initDb().catch(console.error);
});
