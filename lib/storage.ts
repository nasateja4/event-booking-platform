import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    UploadResult,
} from "firebase/storage";
import { storage } from "./firebase";

/**
 * Upload a file to Firebase Storage
 * @param file - File to upload
 * @param path - Storage path (e.g., 'venues/image.jpg')
 * @returns Download URL of the uploaded file
 */
export async function uploadFile(
    file: File,
    path: string
): Promise<string> {
    try {
        const storageRef = ref(storage, path);
        const snapshot: UploadResult = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading file:", error);
        throw error;
    }
}

/**
 * Delete a file from Firebase Storage
 * @param path - Storage path of the file to delete
 */
export async function deleteFile(path: string): Promise<void> {
    try {
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
    } catch (error) {
        console.error("Error deleting file:", error);
        throw error;
    }
}

/**
 * Generate a unique file path with timestamp
 * @param folder - Folder name (e.g., 'venues', 'inventory')
 * @param fileName - Original file name
 * @returns Unique path string
 */
export function generateFilePath(folder: string, fileName: string): string {
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    return `${folder}/${timestamp}_${sanitizedName}`;
}
