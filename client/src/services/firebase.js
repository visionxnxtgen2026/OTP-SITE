/**
 * Firebase Services Adapter (Re-exports canonical Firebase SDK module)
 * @see ../firebase/firebase.js
 */
import app, { auth, db, storage, analytics, googleProvider } from '../firebase/firebase.js';

export { app, auth, db, storage, analytics, googleProvider };
export default app;
