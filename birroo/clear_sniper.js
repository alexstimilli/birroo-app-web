import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';

// If there's no service account here, I cannot do it this way easily. Wait, the app uses client SDK.
