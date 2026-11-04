import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, deleteDoc, collection } from 'firebase/firestore';
import { auth, provider, signInWithPopup, db } from '../firebase';

const AuthContext = createContext();

// Record of the user confirming they're 18+ and agreeing to the Terms and
// Privacy Policy at sign-up. Bump TERMS_VERSION when either document changes.
const TERMS_VERSION = '2026-11-04';

function termsAcceptance() {
  return { termsAcceptedAt: new Date().toISOString(), termsVersion: TERMS_VERSION };
}

// Every user-owned document (keyed by uid) and its subcollections. Keep in sync
// with firestore.rules so account deletion removes everything we store.
const USER_COLLECTIONS = {
  pensionScenarios:     [],
  pensionPots:          ['historical_positions'],
  savingsTracker:       ['historical_positions'],
  savingsAccounts:      ['historical_positions'],
  mortgagePots:         [],
  mortgageCalculations: [],
  incomePots:           [],
  userDebts:            [],
  trading212Portfolios: [],
  dashboardPreferences: [],
  userPreferences:      [],
  households:           [],
  notifications:        ['items'],
  users:                [], // last, so a failure part-way leaves the profile in place
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Register new user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} name - User's full name
   */
  async function register(email, password, name) {
    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Update user profile with display name
      await updateProfile(user, {
        displayName: name,
      });

      // Send email verification
      await sendEmailVerification(user);

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: name,
        createdAt: new Date().toISOString(),
        emailVerified: false,
        provider: 'email',
        ...termsAcceptance(),
      });

      return userCredential;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Sign in with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {boolean} rememberMe - Whether to persist session
   */
  async function login(email, password, rememberMe = false) {
    try {
      // Set persistence based on remember me
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      return userCredential;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Sign in with Google
   */
  async function signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user document exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      // If new user, create document
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: new Date().toISOString(),
          emailVerified: user.emailVerified,
          provider: 'google',
          ...termsAcceptance(),
        });
      }

      return result;
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  /**
   * Permanently delete the signed-in user's data and account.
   * Firebase requires a recent sign-in to delete an account, so the user is
   * re-authenticated first (password, or a Google popup) before anything is removed.
   * @param {string} [password] - Required for email/password accounts
   */
  async function deleteAccount(password) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not signed in');

    const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
    if (isGoogle) {
      await reauthenticateWithPopup(user, provider);
    } else {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    }

    for (const [name, subcollections] of Object.entries(USER_COLLECTIONS)) {
      for (const sub of subcollections) {
        const snap = await getDocs(collection(db, name, user.uid, sub));
        await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
      }
      await deleteDoc(doc(db, name, user.uid));
    }

    localStorage.removeItem('moneyMovesDemoMode');
    await deleteUser(user);
  }

  /**
   * Sign out current user
   */
  async function logout() {
    try {
      localStorage.removeItem('moneyMovesDemoMode');
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   */
  async function resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Resend email verification
   */
  async function resendEmailVerification() {
    try {
      if (currentUser && !currentUser.emailVerified) {
        await sendEmailVerification(currentUser);
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  }

  /**
   * Update user profile in Firestore
   * @param {Object} updates - Profile updates
   */
  async function updateUserProfile(updates) {
    try {
      if (!currentUser) throw new Error('No user logged in');

      // Update Firestore document
      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          ...updates,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Update Firebase Auth profile if display name changed
      if (updates.displayName) {
        await updateProfile(currentUser, {
          displayName: updates.displayName,
        });
      }
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  /**
   * Get user profile from Firestore
   */
  async function getUserProfile() {
    try {
      if (!currentUser) return null;

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    register,
    login,
    logout,
    signInWithGoogle,
    deleteAccount,
    resetPassword,
    resendEmailVerification,
    updateUserProfile,
    getUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
