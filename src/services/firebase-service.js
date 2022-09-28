const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, writeBatch } = require('firebase-admin/firestore');
var admin = require("firebase-admin");

var serviceAccount = require("./firebase.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pm-websocket-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const SYNCITEMS = 'SyncsketchItems';
const MondayStatus = 'MondayStatus';
const ProjectMgr = 'ProjectManager';

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
    DeleteMultipleStatus
}