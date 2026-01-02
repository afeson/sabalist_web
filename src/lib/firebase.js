// Import React Native Firebase modules
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// These are MODULES, not instances
// Call them as functions: auth().currentUser, auth().signInWithCredential(), etc.
// Access static properties: auth.GoogleAuthProvider, auth.EmailAuthProvider

export { auth, firestore, storage };
