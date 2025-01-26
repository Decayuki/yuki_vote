const logos = [
    { name: 'Logo 1', imageUrl: 'https://via.placeholder.com/150?text=Logo1' },
    { name: 'Logo 2', imageUrl: 'https://via.placeholder.com/150?text=Logo2' },
    { name: 'Logo 3', imageUrl: 'https://via.placeholder.com/150?text=Logo3' },
    { name: 'Logo 4', imageUrl: 'https://via.placeholder.com/150?text=Logo4' },
    { name: 'Logo 5', imageUrl: 'https://via.placeholder.com/150?text=Logo5' },
    { name: 'Logo 6', imageUrl: 'https://via.placeholder.com/150?text=Logo6' },
    { name: 'Logo 7', imageUrl: 'https://via.placeholder.com/150?text=Logo7' },
    { name: 'Logo 8', imageUrl: 'https://via.placeholder.com/150?text=Logo8' },
    { name: 'Logo 9', imageUrl: 'https://via.placeholder.com/150?text=Logo9' },
    { name: 'Logo 10', imageUrl: 'https://via.placeholder.com/150?text=Logo10' },
];

const { db } = require('./db');

const insertSampleLogos = () => {
    const stmt = db.prepare('INSERT INTO logos (name, imageUrl) VALUES (?, ?)');
    logos.forEach(logo => {
        stmt.run([logo.name, logo.imageUrl], (err) => {
            if (err) {
                console.error('Error inserting logo:', err);
            }
        });
    });
    stmt.finalize();
};

module.exports = { insertSampleLogos };
