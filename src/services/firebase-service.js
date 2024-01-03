const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require("firebase-admin");
const bunyan = require('bunyan');
const logger = bunyan.createLogger({ name: 'FirebaseService', level: 'info' });

var serviceAccount = require("./firebase.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pm-websocket-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const SYNCITEMS = 'SyncsketchItems';
const SyncUploads = 'SyncsketchUploads';
const SupportItems = 'SupportItems'
const MondayStatus = 'MondayStatus';
const ProjectMgr = 'ProjectManager';
const Allocations = 'Allocations'
const Gallery = 'Gallery';
const KeyVault = 'KeyVault';

const MondayProjectExists = async (projectId) => {
    try {
        const projRef = getFirestore().collection(ProjectMgr).doc(projectId.toString());
        const doc = await projRef.get();
        const exists = doc.exists;
        logger.info({ projectId }, `Monday project exists check: ${exists}`);
        return exists;
    } catch (err) {
        logger.error({ err, projectId }, 'Error checking if Monday project exists');
        throw err;
    }
}

const SyncsketchReviewExists = async (projectId, groupId, reviewId) => {
    try {
        const reviewRef = getFirestore().collection(SYNCITEMS)
            .doc(projectId.toString())
            .collection('groups')
            .doc(groupId)
            .collection('reviews')
            .doc(reviewId);
        const doc = await reviewRef.get();
        const exists = doc.exists;
        logger.info({ projectId, groupId, reviewId }, `Syncsketch review exists check: ${exists}`);
        return exists;
    } catch (err) {
        logger.error({ err, projectId, groupId, reviewId }, 'Error checking if Syncsketch review exists');
        throw err;
    }
}

const GetSyncsketchReview = async (sketchId, groupId, projectId) => {
    try {
        const docRef = getFirestore().collection(SYNCITEMS)
            .doc(projectId.toString())
            .collection('groups')
            .doc(groupId)
            .collection('reviews')
            .doc(sketchId);

        const docSnap = await docRef.get();

        if (docSnap.exists) {
            logger.info({ sketchId, groupId, projectId }, 'Syncsketch review retrieved successfully');
            return docSnap.data();
        } else {
            logger.warn({ sketchId, groupId, projectId }, 'No Syncsketch review found');
            return { error: 'no document' };
        }
    } catch (err) {
        logger.error({ err, sketchId, groupId, projectId }, 'Error retrieving Syncsketch review');
        throw err;
    }
}

const GetUploadInfo = async (itemId) => {
    try {
        const docRef = getFirestore().collection(SyncUploads)
            .doc(itemId.toString());

        const docSnap = await docRef.get();

        if (docSnap.exists) {
            logger.info({ itemId }, 'Upload info retrieved successfully');
            return docSnap.data();
        } else {
            logger.warn({ itemId }, 'No upload info found');
            return null;
        }
    } catch (err) {
        logger.error({ err, itemId }, 'Error retrieving upload info');
        throw err;
    }
}

const GetKeyVaultEntry = async (key) => {
    try {
        const docRef = getFirestore().collection(KeyVault).doc(key);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            logger.info({ key }, 'KeyVault entry retrieved successfully');
            return docSnap.data();
        } else {
            logger.warn({ key }, 'No KeyVault entry found');
            return { error: 'no document' };
        }
    } catch (err) {
        logger.error({ err, key }, 'Error retrieving KeyVault entry');
        throw err;
    }
}

const GetSyncsketchItem = async (itemId, sketchId, groupId, projectId) => {
    try {
        const docRef = getFirestore().collection(SYNCITEMS)
            .doc(projectId.toString())
            .collection('groups')
            .doc(groupId)
            .collection('reviews')
            .doc(sketchId)
            .collection('items')
            .doc(itemId.toString());

        const docSnap = await docRef.get();

        if (docSnap.exists) {
            logger.info({ itemId, sketchId, groupId, projectId }, 'Syncsketch item retrieved successfully');
            return docSnap.data();
        } else {
            logger.warn({ itemId, sketchId, groupId, projectId }, 'No Syncsketch item found');
            return { error: 'no document' };
        }
    } catch (err) {
        logger.error({ err, itemId, sketchId, groupId, projectId }, 'Error retrieving Syncsketch item');
        throw err;
    }
}

const StoreSyncsketchReview = async (sketchId, groupId, projectId, data) => {
    try {
        await getFirestore().collection(SYNCITEMS)
            .doc(projectId.toString())
            .collection('groups')
            .doc(groupId)
            .collection('reviews')
            .doc(sketchId)
            .set(data);
        logger.info({ sketchId, groupId, projectId, data }, 'Syncsketch review stored successfully');
    } catch (err) {
        logger.error({ err, sketchId, groupId, projectId, data }, 'Error storing Syncsketch review');
        throw err;
    }
}

const StoreSyncsketchItem = async (itemId, sketchId, groupId, projectId, data) => {
    try {
        await getFirestore().collection(SYNCITEMS)
            .doc(projectId.toString())
            .collection('groups')
            .doc(groupId)
            .collection('reviews')
            .doc(sketchId)
            .collection('items')
            .doc(itemId.toString())
            .set(data);
        logger.info({ itemId, sketchId, groupId, projectId, data }, 'Syncsketch item stored successfully');
    } catch (err) {
        logger.error({ err, itemId, sketchId, groupId, projectId, data }, 'Error storing Syncsketch item');
        throw err;
    }
}

const StoreSupportItemUpdates = async (boardId, itemId, updates) => {
    try {
        await getFirestore().collection(SupportItems)
            .doc(boardId.toString())
            .collection('items')
            .doc(itemId.toString())
            .update({ updates: updates });
        logger.info({ boardId, itemId, updates }, 'Support item update stored successfully');
    } catch (err) {
        logger.error({ err, boardId, itemId, updates }, 'Error storing support item update');
        throw err;
    }
}

const StoreSupportItem = async (boardId, itemId, data) => {
    try {
        await getFirestore().collection(SupportItems)
            .doc(boardId.toString())
            .collection('items')
            .doc(itemId.toString())
            .set(data);
        logger.info({ boardId, itemId, data }, 'Support item stored successfully');
    } catch (err) {
        logger.error({ err, boardId, itemId, data }, 'Error storing support item');
        throw err;
    }
}

const StoreSupportBoard = async (boardId, data) => {
    try {
        await getFirestore().collection(SupportItems)
            .doc(boardId.toString())
            .set(data);
        logger.info({ boardId, data }, 'Support board stored successfully');
    } catch (err) {
        logger.error({ err, boardId, data }, 'Error storing support board');
        throw err;
    }
}

const DeleteSupportItem = async (boardId, itemId) => {
    try {
        await getFirestore().collection(SupportItems)
            .doc(boardId.toString())
            .collection('items')
            .doc(itemId.toString())
            .delete();
        logger.info({ boardId, itemId }, 'Support item deleted successfully');
    } catch (err) {
        logger.error({ err, boardId, itemId }, 'Error deleting support item');
        throw err;
    }
}

const DeleteSyncsketchReview = async (sketchId, groupId, projectId) => {
    try {
        await getFirestore().collection(SYNCITEMS)
            .doc(projectId.toString())
            .collection('groups')
            .doc(groupId)
            .collection('reviews')
            .doc(sketchId)
            .delete();
        logger.info({ sketchId, groupId, projectId }, 'Syncsketch review deleted successfully');
    } catch (err) {
        logger.error({ err, sketchId, groupId, projectId }, 'Error deleting Syncsketch review');
        throw err;
    }
}

const DeleteSyncsketchItem = async (itemId, sketchId, groupId, projectId) => {
    try {
        await getFirestore().collection(SYNCITEMS)
            .doc(projectId.toString())
            .collection('groups')
            .doc(groupId)
            .collection('reviews')
            .doc(sketchId)
            .collection('items')
            .doc(itemId.toString())
            .delete();
        logger.info({ itemId, sketchId, groupId, projectId }, 'Syncsketch item deleted successfully');
    } catch (err) {
        logger.error({ err, itemId, sketchId, groupId, projectId }, 'Error deleting Syncsketch item');
        throw err;
    }
}

const StoreGalleryItem = async (id, data) => {
    try {
        await getFirestore().collection(Gallery)
            .doc(id.toString())
            .set(data);
        logger.info({ id, data }, 'Gallery item stored successfully');
    } catch (err) {
        logger.error({ err, id, data }, 'Error storing gallery item');
        throw err;
    }
}


const DeleteGalleryItem = async (id) => {
    try {
        await getFirestore().collection(Gallery)
            .doc(id.toString())
            .delete();
        logger.info({ id }, 'Gallery item deleted successfully');
    } catch (err) {
        logger.error({ err, id }, 'Error deleting gallery item');
        throw err;
    }
}

const StoreMondayItemStatus = async (status, itemId, data) => {
    try {
        await getFirestore().collection(MondayStatus)
            .doc(status)
            .collection('items')
            .doc(itemId.toString())
            .set(data);
        logger.info({ status, itemId, data }, 'Monday item status stored successfully');
    } catch (err) {
        logger.error({ err, status, itemId, data }, 'Error storing Monday item status');
        throw err;
    }
}

const GetStatusIds = async (status) => {
    try {
        const collectionRef = await getFirestore().collection(MondayStatus)
            .doc(status)
            .collection('items')
            .listDocuments();

        const ids = collectionRef.map(d => d.id);
        logger.info({ status, ids }, 'Status IDs retrieved successfully');
        return ids;
    } catch (err) {
        logger.error({ err, status }, 'Error retrieving status IDs');
        throw err;
    }
}

const GetAllocatedArtistIds = async () => {
    try {
        const collectionRef = await getFirestore().collection(Allocations).listDocuments();
        const ids = collectionRef.map(d => d.id);
        logger.info('Allocated artist IDs retrieved successfully');
        return ids;
    } catch (err) {
        logger.error({ err }, 'Error retrieving allocated artist IDs');
        throw err;
    }
}

const StoreArtistAllocations = async (data) => {
    if (!data?.artists || data.artists.length < 1 || !data.id) {
        logger.warn({ data }, 'Invalid data for storing artist allocations');
        return;
    }

    try {
        const fs = getFirestore();
        const batch = fs.batch();

        data.artists.forEach(a => {
            const ref = fs.collection(Allocations).doc(a).collection('items').doc(data.id.toString());
            batch.set(ref, data);
        });

        await batch.commit();
        logger.info({ data }, 'Artist allocations stored successfully');
    } catch (err) {
        logger.error({ err, data }, 'Error storing artist allocations');
        throw err;
    }
}

const DeleteInvalidArtistAllocations = async (data) => {
    if (!data.id) {
        logger.warn('No ID provided for DeleteInvalidArtistAllocations');
        return;
    }

    try {
        let artists = data.artists || [];
        let AllArtists = await GetAllocatedArtistIds() || [];
        AllArtists = AllArtists.filter(a => !artists.includes(a));

        if (AllArtists.length < 1) {
            logger.info('No artists to remove in DeleteInvalidArtistAllocations');
            return;
        }

        const fs = getFirestore();
        const batch = fs.batch();

        AllArtists.forEach(a => {
            const ref = fs.collection(Allocations).doc(a).collection('items').doc(data.id.toString());
            batch.delete(ref);
        });

        await batch.commit();
        logger.info({ AllArtists, data }, 'Invalid artist allocations deleted successfully');
    } catch (err) {
        logger.error({ err, data }, 'Error deleting invalid artist allocations');
        throw err;
    }
}

const DeleteMultipleStatus = async (status, ids) => {
    if (!ids || ids.length === 0) {
        logger.warn({ status }, 'No IDs provided for DeleteMultipleStatus');
        return;
    }

    try {
        const fs = getFirestore();
        const batch = fs.batch();

        ids.forEach(id => {
            const ref = fs.collection(MondayStatus).doc(status).collection('items').doc(id);
            batch.delete(ref);
        });

        await batch.commit();
        logger.info({ status, ids }, 'Multiple statuses deleted successfully');
    } catch (err) {
        logger.error({ err, status, ids }, 'Error deleting multiple statuses');
        throw err;
    }
}

const DeleteMondayItemStatus = async (status, itemId) => {
    try {
        await getFirestore().collection(MondayStatus)
            .doc(status)
            .collection('items')
            .doc(itemId.toString())
            .delete();
        logger.info({ status, itemId }, 'Monday item status deleted successfully');
    } catch (err) {
        logger.error({ err, status, itemId }, 'Error deleting Monday item status');
        throw err;
    }
}

module.exports = {
    GetSyncsketchItem,
    StoreSyncsketchItem,
    DeleteSyncsketchItem,
    StoreMondayItemStatus,
    DeleteMondayItemStatus,
    GetSyncsketchReview,
    StoreSyncsketchReview,
    DeleteSyncsketchReview,
    MondayProjectExists,
    SyncsketchReviewExists,
    GetStatusIds,
    GetUploadInfo,
    DeleteMultipleStatus,
    DeleteSupportItem,
    StoreSupportBoard,
    StoreSupportItem,
    StoreSupportItemUpdates,
    StoreArtistAllocations,
    DeleteInvalidArtistAllocations,
    StoreGalleryItem,
    DeleteGalleryItem,
    GetKeyVaultEntry
}