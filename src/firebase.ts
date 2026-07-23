import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfigJson from '../firebase-applet-config.json';

const firebaseConfig = (firebaseConfigJson && firebaseConfigJson.projectId && !firebaseConfigJson.projectId.includes('remixed'))
  ? firebaseConfigJson
  : {
      projectId: "xpro-ai-agent",
      appId: "1:1018245683248:web:b528c2afba4a5c6a5135f5",
      apiKey: "AIzaSyBWNU_aezGP6aggWKnXC0sVMCjG87acvyY",
      authDomain: "xpro-ai-agent.firebaseapp.com",
      firestoreDatabaseId: "ai-studio-remixaiedu-ba683713-181d-4341-9dd4-b81d1d475482",
      storageBucket: "xpro-ai-agent.firebasestorage.app",
      messagingSenderId: "1018245683248"
    };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ...(firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? { databaseId: firebaseConfig.firestoreDatabaseId }
    : {})
});
export const storage = getStorage(app);
export default app;
