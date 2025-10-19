/**
 * Custom hook for managing Firestore collection queries
 * Automatically subscribes to real-time updates
 */

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthProvider";

/**
 * Hook for managing a Firestore collection with real-time updates
 * @param {string} collectionName - Name of the Firestore collection
 * @param {Object} options - Configuration options
 * @param {Array} options.queryConstraints - Firestore query constraints
 * @param {boolean} options.realtime - Enable real-time updates (default: false)
 * @param {boolean} options.autoFetch - Auto-fetch on mount (default: true)
 * @returns {Object} { documents, loading, error, refetch, add, update, remove }
 */
export const useFirebaseCollection = (collectionName, options = {}) => {
  const { queryConstraints = [], realtime = false, autoFetch = true } = options;

  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch collection data
   */
  const fetchData = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const collectionRef = collection(db, collectionName);
      const q = queryConstraints.length
        ? query(collectionRef, ...queryConstraints)
        : collectionRef;

      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setDocuments(docs);
    } catch (err) {
      console.error(`Error fetching ${collectionName} collection:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [collectionName, queryConstraints, user]);

  /**
   * Set up real-time listener
   */
  useEffect(() => {
    if (!realtime || !user?.uid) {
      if (autoFetch) {
        fetchData();
      }
      return;
    }

    setLoading(true);
    setError(null);

    const collectionRef = collection(db, collectionName);
    const q = queryConstraints.length
      ? query(collectionRef, ...queryConstraints)
      : collectionRef;

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const docs = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setDocuments(docs);
        setLoading(false);
      },
      (err) => {
        console.error(
          `Error in ${collectionName} realtime listener:`,
          err
        );
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, queryConstraints, realtime, user, autoFetch, fetchData]);

  /**
   * Add a new document to the collection
   */
  const add = useCallback(
    async (data) => {
      try {
        const collectionRef = collection(db, collectionName);
        const docRef = await addDoc(collectionRef, {
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        return docRef.id;
      } catch (err) {
        console.error(`Error adding document to ${collectionName}:`, err);
        setError(err.message);
        throw err;
      }
    },
    [collectionName]
  );

  /**
   * Update a document in the collection
   */
  const update = useCallback(
    async (docId, data) => {
      try {
        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, {
          ...data,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error(`Error updating document in ${collectionName}:`, err);
        setError(err.message);
        throw err;
      }
    },
    [collectionName]
  );

  /**
   * Delete a document from the collection
   */
  const remove = useCallback(
    async (docId) => {
      try {
        const docRef = doc(db, collectionName, docId);
        await deleteDoc(docRef);
      } catch (err) {
        console.error(`Error deleting document from ${collectionName}:`, err);
        setError(err.message);
        throw err;
      }
    },
    [collectionName]
  );

  /**
   * Manually refetch the collection
   */
  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    documents,
    loading,
    error,
    refetch,
    add,
    update,
    remove,
  };
};

export default useFirebaseCollection;
