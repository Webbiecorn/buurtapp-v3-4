import cors from 'cors';
import express from 'express';
import * as functions from 'firebase-functions';
import createDossierRouter from './createDossier';
import { db, serverTimestamp } from './firebase-admin-init';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(createDossierRouter);

app.post('/createMelding', async (req: express.Request, res: express.Response) => {
    try {
    const { titel, omschrijving, locatie, wijk, categorie, gebruikerId, attachments, status } = req.body;

        if (!titel || !omschrijving || !wijk || !gebruikerId) {
            return res.status(400).send({ error: 'Verplichte velden ontbreken.' });
        }

        // Valideer status; standaard naar 'In behandeling' als onbekend of leeg
        const allowedStatuses = ['In behandeling', 'Fixi melding gemaakt', 'Afgerond'];
        const safeStatus = allowedStatuses.includes(status) ? status : 'In behandeling';

        const newMelding = {
            titel,
            omschrijving,
            locatie: locatie || null,
            wijk,
            categorie: categorie || 'Overig',
            gebruikerId,
            attachments: attachments || [],
            status: safeStatus,
            timestamp: serverTimestamp(), // LET OP: NU AANGEROEPEN ALS FUNCTIE
            updates: [],
        };

        const docRef = await db.collection('meldingen').add(newMelding);
        const docSnapshot = await docRef.get();
        
        return res.status(201).send({ id: docRef.id, ...docSnapshot.data() });

    } catch (error: any) {
        console.error('FATALE FOUT bij aanmaken melding:', error);
        return res.status(500).send({ error: 'Interne serverfout', details: error.message });
    }
});

export const api = functions.https.onRequest(app);

