const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const initDb = async () => {
    const client = await pool.connect();
    try {
        // Créer la table des logos
        await client.query(`
            CREATE TABLE IF NOT EXISTS logos (
                id SERIAL PRIMARY KEY,
                group_number INTEGER NOT NULL,
                variant TEXT NOT NULL,
                name TEXT NOT NULL,
                image_url TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(group_number, variant)
            );
        `);

        // Créer la table des votes
        await client.query(`
            CREATE TABLE IF NOT EXISTS votes (
                id SERIAL PRIMARY KEY,
                logo_id INTEGER NOT NULL,
                position INTEGER NOT NULL,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (logo_id) REFERENCES logos (id)
            );
        `);

        console.log('Base de données initialisée avec succès');
    } catch (err) {
        console.error('Erreur lors de l\'initialisation de la base de données:', err);
    } finally {
        client.release();
    }
};

const uploadImage = async (file) => {
    const { data, error } = await supabase.storage
        .from('logos')
        .upload(`${Date.now()}-${file.originalname}`, file.buffer);

    if (error) throw error;

    const { publicURL } = supabase.storage
        .from('logos')
        .getPublicUrl(data.path);

    return publicURL;
};

const addLogo = async (groupNumber, variant, name, imageUrl) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'INSERT INTO logos (group_number, variant, name, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [groupNumber, variant, name, imageUrl]
        );
        return result.rows[0];
    } finally {
        client.release();
    }
};

const getLogos = async () => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM logos ORDER BY group_number, variant');
        return result.rows;
    } finally {
        client.release();
    }
};

const addVote = async (logoId, position, rating) => {
    const client = await pool.connect();
    try {
        await client.query(
            'INSERT INTO votes (logo_id, position, rating) VALUES ($1, $2, $3)',
            [logoId, position, rating]
        );
    } finally {
        client.release();
    }
};

const getResults = async () => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                l.*,
                COALESCE(AVG(v.rating), 0) as average_rating,
                COUNT(v.id) as vote_count
            FROM logos l
            LEFT JOIN votes v ON l.id = v.logo_id
            GROUP BY l.id
            ORDER BY average_rating DESC
        `);
        
        return result.rows.map(row => ({
            ...row,
            tier: getTier(row.average_rating)
        }));
    } finally {
        client.release();
    }
};

const resetVotes = async () => {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM votes');
    } finally {
        client.release();
    }
};

const getTier = (rating) => {
    if (rating >= 4.5) return 'S';
    if (rating >= 3.5) return 'A';
    if (rating >= 2.5) return 'B';
    if (rating >= 1.5) return 'C';
    return 'D';
};

module.exports = {
    initDb,
    uploadImage,
    addLogo,
    getLogos,
    addVote,
    getResults,
    resetVotes
};
