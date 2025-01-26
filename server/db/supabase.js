const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.error('Missing Supabase credentials:', {
        url: process.env.SUPABASE_URL ? 'Set' : 'Missing',
        key: process.env.SUPABASE_KEY ? 'Set' : 'Missing'
    });
}

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
    console.log('Initializing database...');
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

        console.log('Database initialized successfully');
    } catch (err) {
        console.error('Error initializing database:', err);
        throw err;
    } finally {
        client.release();
    }
};

const uploadImage = async (file) => {
    console.log('Starting image upload...', {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size
    });

    try {
        const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '')}`;
        console.log('Uploading to Supabase storage:', fileName);

        const { data, error } = await supabase.storage
            .from('logos')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) {
            console.error('Supabase storage upload error:', error);
            throw error;
        }

        console.log('Upload successful, getting public URL');
        const { data: { publicUrl } } = supabase.storage
            .from('logos')
            .getPublicUrl(fileName);

        console.log('Public URL generated:', publicUrl);
        return publicUrl;
    } catch (error) {
        console.error('Error in uploadImage:', error);
        throw error;
    }
};

const addLogo = async (groupNumber, variant, name, imageUrl) => {
    console.log('Adding logo to database:', { groupNumber, variant, name, imageUrl });
    const client = await pool.connect();
    try {
        const result = await client.query(
            'INSERT INTO logos (group_number, variant, name, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [groupNumber, variant, name, imageUrl]
        );
        console.log('Logo added successfully:', result.rows[0]);
        return result.rows[0];
    } catch (error) {
        console.error('Error adding logo to database:', error);
        throw error;
    } finally {
        client.release();
    }
};

const getLogos = async () => {
    console.log('Getting logos from database...');
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM logos ORDER BY group_number, variant');
        console.log('Logos retrieved successfully:', result.rows);
        return result.rows;
    } catch (error) {
        console.error('Error getting logos from database:', error);
        throw error;
    } finally {
        client.release();
    }
};

const addVote = async (logoId, position, rating) => {
    console.log('Adding vote to database:', { logoId, position, rating });
    const client = await pool.connect();
    try {
        await client.query(
            'INSERT INTO votes (logo_id, position, rating) VALUES ($1, $2, $3)',
            [logoId, position, rating]
        );
        console.log('Vote added successfully');
    } catch (error) {
        console.error('Error adding vote to database:', error);
        throw error;
    } finally {
        client.release();
    }
};

const getResults = async () => {
    console.log('Getting results from database...');
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
        
        console.log('Results retrieved successfully:', result.rows);
        return result.rows.map(row => ({
            ...row,
            tier: getTier(row.average_rating)
        }));
    } catch (error) {
        console.error('Error getting results from database:', error);
        throw error;
    } finally {
        client.release();
    }
};

const resetVotes = async () => {
    console.log('Resetting votes in database...');
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM votes');
        console.log('Votes reset successfully');
    } catch (error) {
        console.error('Error resetting votes in database:', error);
        throw error;
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
