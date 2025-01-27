require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3001,
    host: '0.0.0.0',
    corsOrigin: '*',
    supabase: {
        url: process.env.SUPABASE_URL || 'https://bxkvhpdqtdevpmfafdso.supabase.co',
        key: process.env.SUPABASE_KEY
    }
};
