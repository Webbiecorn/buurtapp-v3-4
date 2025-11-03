import * as functions from "firebase-functions";
import express from "express"; // Correcte import voor express
import cors from "cors"; // Correcte import voor cors
import "./firebase-admin-init"; // Importeer voor side-effect (initialisatie)

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/hello', (req, res) => {
    functions.logger.info("Hello logs!", {structuredData: true});
    res.status(200).send('Hello, world!');
});

// Exporteer de express app als een http functie genaamd 'api'
export const api = functions.https.onRequest(app);

// Exporteer de inviteUser functie
export { inviteUser } from './inviteUser';

// Exporteer de sendWelcomeEmail functie
export { sendWelcomeEmail } from './sendWelcomeEmail';



