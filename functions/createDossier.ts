import * as express from 'express';
import * as admin from 'firebase-admin';

const router = express.Router();

// Zorg dat Firebase Admin is geïnitialiseerd
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

router.post('/createDossier', async (req, res) => {
  const dossier = req.body;
  if (!dossier || !dossier.id) {
    return res.status(400).json({ error: 'Geen geldig dossier.' });
  }
  try {
    await db.collection('dossiers').doc(dossier.id).set(dossier);
    return res.status(201).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Fout bij opslaan dossier.' });
  }
});

export default router;