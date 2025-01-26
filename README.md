# Logo Tier List App

Une application permettant de classer et noter des logos en temps réel.

## Fonctionnalités

- Glisser-déposer des logos pour les classer
- Attribution de notes (1-5 étoiles) pour chaque logo
- Affichage en temps réel des résultats
- Classement automatique en tiers (S/A/B/C/D)

## Installation

### Backend (Server)

```bash
cd server
npm install
npm run init-db  # Initialise la base de données avec les logos d'exemple
npm run dev      # Lance le serveur en mode développement
```

### Frontend (Client)

```bash
cd client
npm install
npm start
```

## Configuration des logos

Pour modifier les logos, éditez le fichier `server/sampleLogos.js`. Pour chaque logo, vous devez spécifier :
- name: Le nom du logo
- imageUrl: L'URL de l'image du logo

Après modification, réexécutez `npm run init-db` dans le dossier server.

## Utilisation

1. Ouvrez http://localhost:3000 dans votre navigateur
2. Cliquez sur "Commencer"
3. Sélectionnez les logos que vous souhaitez évaluer
4. Glissez-déposez les logos pour les classer
5. Attribuez une note de 1 à 5 étoiles à chaque logo
6. Cliquez sur "Valider mon classement"
7. Visualisez les résultats en temps réel

## Technologies utilisées

- Frontend: React, Material-UI, DnD Kit
- Backend: Node.js, Express, Socket.IO, SQLite
