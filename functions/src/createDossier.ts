import express from 'express';
import { getFirestore } from "firebase-admin/firestore";

const router = express.Router();
const db = getFirestore();

router.post('/createDossier', async (req, res) => {
  try {
    const dossierData = req.body;
    console.log('Ontvangen om nieuw dossier aan te maken:', dossierData); // Log de ontvangen data
    await db.collection('dossiers').doc(dossierData.id).set(dossierData);
    res.status(201).send(dossierData); // Stuur het aangemaakte dossier terug
  } catch (error) {
    console.error('Fout bij aanmaken dossier:', error);
    res.status(500).send('Kon dossier niet aanmaken');
  }
});

export default router;
