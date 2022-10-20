const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, writeBatch } = require('firebase-admin/firestore');
var admin = require("firebase-admin");

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

const MondayProjectExists = async (projectId) => {
    const projRef = getFirestore().collection(ProjectMgr).doc(projectId.toString());
    return projRef.exists;
}

const SyncsketchReviewExists = async (projectId, groupId, reviewId) => {
    const reviewRef = getFirestore().collection(SYNCITEMS)
        .doc(projectId.toString())
        .collection('groups')
        .doc(groupId)
        .collection('reviews')
        .doc(reviewId);

    return reviewRef.exists;

}

const GetSyncsketchReview = async (sketchId, groupId, projectId, data) => {
    const docRef = getFirestore().collection(SYNCITEMS)
        .doc(projectId.toString())
        .collection('groups')
        .doc(groupId)
        .collection('reviews')
        .doc(sketchId)

    const docSnap = await docRef.get();

    if (docSnap.exists) 
        return docSnap.data();

    return {error: 'no document'};
}

const GetUploadInfo = async (itemId) => {
    const docRef = getFirestore().collection(SyncUploads)
    .doc(itemId.toString())

    const docSnap = await docRef.get();

    if (docSnap.exists) 
        return docSnap.data();

    return null;
}
const GetSyncsketchItem = async (itemId, sketchId, groupId, projectId) => {
    const docRef = getFirestore().collection(SYNCITEMS)
        .doc(projectId.toString())
        .collection('groups')
        .doc(groupId)
        .collection('reviews')
        .doc(sketchId)
        .collection('items')
        .doc(itemId.toString());

    const docSnap = await docRef.get();

    if (docSnap.exists) 
        return docSnap.data();

    return {error: 'no document'};
}

const StoreSyncsketchReview = async (sketchId, groupId, projectId, data) => {
    return await getFirestore().collection(SYNCITEMS)
        .doc(projectId.toString())
        .collection('groups')
        .doc(groupId)
        .collection('reviews')
        .doc(sketchId)
        .set(data);
}

const StoreSyncsketchItem = async (itemId, sketchId, groupId, projectId, data) => {
    return await getFirestore().collection(SYNCITEMS)
        .doc(projectId.toString())
        .collection('groups')
        .doc(groupId)
        .collection('reviews')
        .doc(sketchId)
        .collection('items')
        .doc(itemId.toString())
        .set(data);
}


const StoreSupportItemUpdates = async (boardId, itemId, updates) => {
    console.log("store Support Item Update, " + boardId + ", " + itemId)
    return await getFirestore().collection(SupportItems)
        .doc(boardId.toString())
        .collection('items')
        .doc(itemId.toString())
        .update({updates: updates});
}


const StoreSupportItem = async (boardId, itemId, data) => {
    console.log("store Support Item, " + boardId +", " + itemId)
    console.log(data);
    return await getFirestore().collection(SupportItems)
        .doc(boardId.toString())
        .collection('items')
        .doc(itemId.toString())
        .set(data);
}

const StoreSupportBoard = async (boardId, data) => {
    console.log("Store Support Board, " + boardId)
    console.log(data);


    return await getFirestore().collection(SupportItems)
        .doc(boardId.toString())
        .set(data);
}

const DeleteSupportItem = async (boardId, itemId) => {
    return await getFirestore().collection(SupportItems)
        .doc(boardId.toString())
        .collection('items')
        .doc(itemId.toString())
        .delete();
}

const DeleteSyncsketchReview = async (sketchId, groupId, projectId, data) => {
    return await getFirestore().collection(SYNCITEMS)
        .doc(projectId.toString())
        .collection('groups')
        .doc(groupId)
        .collection('reviews')
        .doc(sketchId)
        .delete();
}

const DeleteSyncsketchItem = async (itemId, sketchId, groupId, projectId) => {
    return await getFirestore().collection(SYNCITEMS)
        .doc(projectId.toString())
        .collection('groups')
        .doc(groupId)
        .collection('reviews')
        .doc(sketchId)
        .collection('items')
        .doc(itemId.toString())
        .delete();
}

const StoreMondayItemStatus = async (status, itemId, data) => {
    return await getFirestore().collection(MondayStatus)
        .doc(status)
        .collection('items')
        .doc(itemId.toString())
        .set(data);
}

const GetStatusIds = async (status) => {
    const collectionRef = await getFirestore().collection(MondayStatus)
    .doc(status)
    .collection('items')
    .listDocuments()

    return collectionRef.map(d => d.id);
}

const GetAllocatedArtistIds = async () => {
    const collectionRef = await getFirestore().collection(Allocations)
    .listDocuments()

    return collectionRef.map(d => d.id);
}

const StoreArtistAllocations = async (data) => {
    if (!data?.artists || data.artists.length < 1 || !data.id)
        return;

    console.log("Storing for Artists" + JSON.stringify(data.artists));
    const fs = getFirestore();
    const batch = fs.batch();

    data.artists.forEach(a => {
        const ref = fs.collection(Allocations).doc(a).collection('items').doc(data.id.toString());
        batch.set(ref, data);
    })
    await batch.commit();
}

const DeleteInvalidArtistAllocations = async (data) => {
    if (!data.id)
        return;

    let artists = data.artists || [];
    let AllArtists = await GetAllocatedArtistIds() || [];

    AllArtists = AllArtists.filter(a => artists.indexOf(a) < 0);

    console.log("Removing From Artists" + JSON.stringify(AllArtists));
    if (AllArtists.length < 1)
        return;
    
    const fs = getFirestore();
    const batch = fs.batch();

    AllArtists.forEach(a => {
        const ref = fs.collection(Allocations).doc(a).collection('items').doc(data.id.toString());
        batch.delete(ref);
    });

    await batch.commit();
}

const DeleteMultipleStatus = async (status, ids) => {
    const fs = getFirestore();
    const batch = fs.batch();
    ids.forEach(id => {
        const ref = fs.collection(MondayStatus).doc(status).collection('items').doc(id);
        batch.delete(ref);
    })
    await batch.commit();
}

const DeleteMondayItemStatus = async (status, itemId) => {
    return await getFirestore().collection(MondayStatus)
    .doc(status)
    .collection('items')
    .doc(itemId.toString())
    .delete();
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
    DeleteInvalidArtistAllocations
}