// functions/src/index.ts

import cors from 'cors';
import express from 'express';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import createDossierRouter from './createDossier';

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(createDossierRouter);

// ...andere routes...

export const api = functions.https.onRequest(app);
