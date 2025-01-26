const sqlite3 = require('sqlite3').verbose();
const { dbPath } = require('./config');
const fs = require('fs');

// Créer le répertoire parent si nécessaire
const dbDir = require('path').dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Erreur lors de l\'ouverture de la base de données:', err);
    } else {
        console.log('Base de données connectée avec succès');
    }
});

const initDb = () => {
    console.log('Initialisation de la base de données...');
    
    db.serialize(() => {
        // Drop existing tables if they exist
        db.run('DROP TABLE IF EXISTS votes', (err) => {
            if (err) console.error('Erreur lors de la suppression de la table votes:', err);
            else console.log('Table votes supprimée avec succès');
        });
        
        db.run('DROP TABLE IF EXISTS logos', (err) => {
            if (err) console.error('Erreur lors de la suppression de la table logos:', err);
            else console.log('Table logos supprimée avec succès');
        });

        // Create logos table with group and variant information
        db.run(`
            CREATE TABLE IF NOT EXISTS logos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                groupNumber INTEGER NOT NULL,
                variant TEXT NOT NULL,
                name TEXT NOT NULL,
                imageUrl TEXT NOT NULL,
                UNIQUE(groupNumber, variant)
            )
        `, (err) => {
            if (err) console.error('Erreur lors de la création de la table logos:', err);
            else console.log('Table logos créée avec succès');
        });

        // Create votes table
        db.run(`
            CREATE TABLE IF NOT EXISTS votes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                logoId INTEGER NOT NULL,
                position INTEGER NOT NULL,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (logoId) REFERENCES logos (id)
            )
        `, (err) => {
            if (err) console.error('Erreur lors de la création de la table votes:', err);
            else console.log('Table votes créée avec succès');
        });
    });
};

// Fonction pour vérifier la structure de la base de données
const checkDb = () => {
    console.log('Vérification de la structure de la base de données...');
    
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
        if (err) {
            console.error('Erreur lors de la vérification des tables:', err);
            return;
        }
        console.log('Tables existantes:', tables);
        
        // Vérifier la structure de chaque table
        tables.forEach(table => {
            db.all(`PRAGMA table_info(${table.name})`, [], (err, columns) => {
                if (err) {
                    console.error(`Erreur lors de la vérification de la structure de ${table.name}:`, err);
                    return;
                }
                console.log(`Structure de la table ${table.name}:`, columns);
            });
        });
    });
};

module.exports = { db, initDb, checkDb };
