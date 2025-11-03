import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// Determine projectId explicitly for local runs
const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || (process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG).projectId : 'buurtapp-v3-4');

// Initialize admin with explicit projectId to avoid metadata server lookup
if (admin.apps.length === 0) {
	admin.initializeApp({ projectId });
}

// Connect to Firestore emulator if configured
if (process.env.FIRESTORE_EMULATOR_HOST) {
	// No extra setup needed for admin SDK >=9, it uses env var automatically
}

export const db = admin.firestore();
export const auth = admin.auth();
export const serverTimestamp = (): FieldValue => FieldValue.serverTimestamp();
export const app = admin.app();
