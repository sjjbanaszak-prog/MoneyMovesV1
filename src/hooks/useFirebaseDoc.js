/**
 * Custom hook for managing Firestore document state
 * Automatically loads and saves document data with debouncing
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import debounce from "lodash.debounce";
import { db } from "../firebase";
import { useAuth } from "../context/AuthProvider";

/**
 * Hook for managing a Firestore document with auto-save
 * @param {string} collectionName - Name of the Firestore collection
 * @param {Object} options - Configuration options
 * @param {Object} options.initialData - Initial state data
 * @param {number} options.debounceMs - Debounce delay for saves (default: 1000ms)
 * @param {boolean} options.autoSave - Enable auto-save on data changes (default: true)
 * @param {string} options.docId - Custom document ID (default: user.uid)
 * @returns {Object} { data, setData, updateData, loading, error, save, reload }
 */
export const useFirebaseDoc = (collectionName, options = {}) => {
  const {
    initialData = {},
    debounceMs = 1000,
    autoSave = true,
    docId = null,
  } = options;

  const { user } = useAuth();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Use custom docId or fallback to user.uid
  const documentId = docId || user?.uid;

  // Track if initial load is complete
  const hasLoaded = useRef(false);

  /**
   * Load document data from Firestore
   */
  const loadData = useCallback(async () => {
    if (!documentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const docRef = doc(db, collectionName, documentId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const loadedData = docSnap.data();
        setData({ ...initialData, ...loadedData });
      } else {
        // Document doesn't exist, use initial data
        setData(initialData);
      }

      hasLoaded.current = true;
    } catch (err) {
      console.error(`Error loading ${collectionName} document:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [collectionName, documentId, initialData]);

  /**
   * Save document data to Firestore
   */
  const saveData = useCallback(
    async (dataToSave) => {
      if (!documentId) return;

      try {
        setIsSaving(true);
        setError(null);
        const docRef = doc(db, collectionName, documentId);
        await setDoc(docRef, dataToSave, { merge: true });
      } catch (err) {
        console.error(`Error saving ${collectionName} document:`, err);
        setError(err.message);
      } finally {
        setIsSaving(false);
      }
    },
    [collectionName, documentId]
  );

  /**
   * Debounced save function
   */
  const debouncedSave = useRef(
    debounce((dataToSave) => {
      saveData(dataToSave);
    }, debounceMs)
  ).current;

  /**
   * Load data on mount and when user changes
   */
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Auto-save when data changes (after initial load)
   */
  useEffect(() => {
    if (!autoSave || !hasLoaded.current || !documentId) return;

    debouncedSave(data);

    return () => {
      debouncedSave.cancel();
    };
  }, [data, autoSave, documentId, debouncedSave]);

  /**
   * Update specific fields in the data
   */
  const updateData = useCallback((updates) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Force immediate save (bypasses debounce)
   */
  const save = useCallback(
    async (dataToSave = data) => {
      await saveData(dataToSave);
    },
    [data, saveData]
  );

  /**
   * Force reload from Firestore
   */
  const reload = useCallback(() => {
    hasLoaded.current = false;
    loadData();
  }, [loadData]);

  return {
    data,
    setData,
    updateData,
    loading,
    error,
    isSaving,
    save,
    reload,
  };
};

export default useFirebaseDoc;
