import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    QueryConstraint,
    DocumentData,
    Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Generic Firestore helper functions
 */

// Get a single document by ID
export async function getDocument<T = DocumentData>(
    collectionName: string,
    docId: string
): Promise<T | null> {
    try {
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as T;
        }
        return null;
    } catch (error) {
        console.error(`Error getting document from ${collectionName}:`, error);
        throw error;
    }
}

// Get all documents from a collection
export async function getAllDocuments<T = DocumentData>(
    collectionName: string,
    ...queryConstraints: QueryConstraint[]
): Promise<T[]> {
    try {
        const collectionRef = collection(db, collectionName);
        const q = queryConstraints.length
            ? query(collectionRef, ...queryConstraints)
            : collectionRef;

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as T[];
    } catch (error) {
        console.error(`Error getting documents from ${collectionName}:`, error);
        throw error;
    }
}

// Add a new document
export async function addDocument<T = DocumentData>(
    collectionName: string,
    data: Partial<T>
): Promise<string> {
    try {
        const collectionRef = collection(db, collectionName);
        const docRef = await addDoc(collectionRef, {
            ...data,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        return docRef.id;
    } catch (error) {
        console.error(`Error adding document to ${collectionName}:`, error);
        throw error;
    }
}

// Update a document
export async function updateDocument<T = DocumentData>(
    collectionName: string,
    docId: string,
    data: Partial<T>
): Promise<void> {
    try {
        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, {
            ...data,
            updatedAt: Timestamp.now(),
        });
    } catch (error) {
        console.error(`Error updating document in ${collectionName}:`, error);
        throw error;
    }
}

// Delete a document
export async function deleteDocument(
    collectionName: string,
    docId: string
): Promise<void> {
    try {
        const docRef = doc(db, collectionName, docId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error(`Error deleting document from ${collectionName}:`, error);
        throw error;
    }
}

// Query helpers
export { where, orderBy, limit };
