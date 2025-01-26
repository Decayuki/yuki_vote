require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

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

const initDb = async () => {
    console.log('Initializing database...');
    try {
        // Créer la table des logos si elle n'existe pas
        await supabase.rpc('init_logos_table');
        
        // Créer la table des votes si elle n'existe pas
        await supabase.rpc('init_votes_table');
        
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

const uploadImage = async (file) => {
    try {
        console.log('Starting image upload to Supabase:', {
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype
        });

        // Générer un nom de fichier unique
        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.originalname}`;
        console.log('Generated filename:', fileName);

        // Upload du fichier
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('logos')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                cacheControl: '3600'
            });

        if (uploadError) {
            console.error('Error in storage.upload:', uploadError);
            throw uploadError;
        }
        
        console.log('Upload successful:', uploadData);

        // Récupérer l'URL publique
        const { data: urlData, error: urlError } = await supabase.storage
            .from('logos')
            .getPublicUrl(uploadData.path);

        if (urlError) {
            console.error('Error getting public URL:', urlError);
            throw urlError;
        }

        if (!urlData || !urlData.publicUrl) {
            throw new Error('Failed to get public URL for uploaded file');
        }

        const publicUrl = urlData.publicUrl;
        console.log('Generated public URL:', publicUrl);
        
        // Vérifier que l'URL est valide
        if (!publicUrl.startsWith('http')) {
            throw new Error('Invalid public URL generated');
        }

        return publicUrl;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
};

const addLogo = async (groupNumber, variant, name, imageUrl) => {
    try {
        console.log('Adding logo with data:', { groupNumber, variant, name, imageUrl });

        if (!groupNumber || !variant || !imageUrl) {
            throw new Error('Missing required fields');
        }

        // Convertir et valider le numéro de groupe
        const parsedGroupNumber = parseInt(groupNumber);
        if (isNaN(parsedGroupNumber)) {
            throw new Error('Invalid group number');
        }

        // Nettoyer et valider la variante
        const cleanVariant = variant.trim().toUpperCase();
        if (!/^[A-D]$/.test(cleanVariant)) {
            throw new Error('Invalid variant (must be A, B, C, or D)');
        }

        // Valider l'URL de l'image
        if (!imageUrl.startsWith('http')) {
            throw new Error('Invalid image URL');
        }

        const logoData = {
            group_number: parsedGroupNumber,
            variant: cleanVariant,
            name: name ? name.trim() : `Logo ${parsedGroupNumber}${cleanVariant}`,
            image_url: imageUrl
        };

        console.log('Inserting logo into database:', logoData);

        const { data, error } = await supabase
            .from('logos')
            .insert([logoData])
            .select();

        if (error) {
            console.error('Error in database insert:', error);
            throw error;
        }

        if (!data || !data[0]) {
            throw new Error('No data returned from insert');
        }

        const insertedLogo = data[0];
        console.log('Logo added successfully:', insertedLogo);
        return insertedLogo;
    } catch (error) {
        console.error('Error adding logo:', error);
        throw error;
    }
};

const getLogos = async () => {
    try {
        console.log('Fetching logos from database...');
        const { data, error } = await supabase
            .from('logos')
            .select('*')
            .order('group_number', { ascending: true })
            .order('variant', { ascending: true });

        if (error) {
            console.error('Error fetching logos:', error);
            throw error;
        }

        if (!data) {
            console.log('No logos found');
            return [];
        }

        // Valider et formater les données
        const validatedLogos = data.map(logo => {
            // Vérifier les champs requis
            if (!logo.group_number || !logo.variant || !logo.image_url) {
                console.error('Invalid logo data:', logo);
                return null;
            }

            // Nettoyer et valider les données
            const cleanedLogo = {
                ...logo,
                group_number: parseInt(logo.group_number),
                variant: logo.variant.trim().toUpperCase(),
                name: logo.name ? logo.name.trim() : `Logo ${logo.group_number}${logo.variant}`,
                image_url: logo.image_url.trim()
            };

            // Vérifier que l'URL est valide
            if (!cleanedLogo.image_url.startsWith('http')) {
                console.error('Invalid image URL:', cleanedLogo.image_url);
                return null;
            }

            return cleanedLogo;
        }).filter(logo => logo !== null);

        console.log('Processed logos:', validatedLogos);
        return validatedLogos;
    } catch (error) {
        console.error('Error getting logos:', error);
        throw error;
    }
};

const addVote = async (logoId, position, rating) => {
    try {
        const { data, error } = await supabase
            .from('votes')
            .insert([{ logo_id: logoId, position, rating }]);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error adding vote:', error);
        throw error;
    }
};

const getResults = async () => {
    try {
        const { data, error } = await supabase
            .from('logos')
            .select(`
                *,
                votes (rating)
            `);

        if (error) throw error;

        return data.map(logo => {
            const votes = logo.votes || [];
            const voteCount = votes.length;
            const averageRating = voteCount > 0
                ? votes.reduce((sum, vote) => sum + vote.rating, 0) / voteCount
                : 0;

            return {
                ...logo,
                voteCount,
                averageRating,
                tier: getTier(averageRating)
            };
        });
    } catch (error) {
        console.error('Error getting results:', error);
        throw error;
    }
};

const resetVotes = async () => {
    try {
        const { error } = await supabase
            .from('votes')
            .delete()
            .neq('id', 0);  // Delete all votes

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error resetting votes:', error);
        throw error;
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
