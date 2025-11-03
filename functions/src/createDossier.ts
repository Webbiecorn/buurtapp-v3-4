import express from "express";
import {db} from "./firebase-admin-init";

const router = express.Router();

router.post("/createDossier", async (req: express.Request, res: express.Response) => {
  try {
    const dossierData = req.body;
    if (!dossierData || !dossierData.id) {
      return res.status(400).json({error: "Geen geldig dossier."});
    }
    await db.collection("dossiers").doc(dossierData.id).set(dossierData);
    return res.status(201).json({success: true});
  } catch (error: any) {
    console.error("Fout bij aanmaken dossier:", error);
    return res.status(500).json({error: "Fout bij opslaan dossier.", details: error.message});
  }
});

export default router;
