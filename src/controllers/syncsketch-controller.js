const mondayService = require('../services/monday-service');
const syncsketchService = require('../services/syncsketch-service');
const mondayHelper = require('../helpers/monday-helper');
const syncsketchHelper = require('../helpers/syncsketch-helper');
const firebaseService = require('../services/firebase-service');

const _ = require('lodash');
const e = require('express');

async function ReviewCreated(req, res) {
    const { project: {name : project_name, id: project_id }, action, review_id } = req.body;
    if (project_name.indexOf('/') >= 0) {
        console.log("Assumed outdated project \"Review Created\":" + project_name)
        return res.status(200).send({});
    }
    console.log("Review Created HOOK");
    
    if (!firebaseService.MondayProjectExists(project_name) || action !== 'review_created')
        return res.status(200).send({});

    const syncReview = await syncsketchService.GetReviewInfo(review_id);

    console.log("SYNC REVIEW: ");
    console.log(JSON.stringify(syncReview));
    
    let reviewDetails;
    try {
        reviewDetails = JSON.parse(syncReview.description);
    }
    catch { 
        console.log("Could not parse Review Details in review description (JSON)")
        return res.status(200).send({});
    }

    const result = await syncsketchHelper.StoreSyncsketchReviewData(project_id, syncReview, reviewDetails);
    console.log(JSON.stringify(result));
    return res.status(200).send({});
}

async function ReviewDeleted(req, res) {
    const { project: {name : project_name, id: project_id }, action, review_id } = req.body;
    if (project_name.indexOf('/') >= 0) {
        console.log("Assumed outdated project \"Review Deleted\":" + project_name)
        return res.status(200).send({});
    }

    console.log("REVIEW DELETED HOOK");

    const syncReview = await syncsketchService.GetReviewInfo(review_id);
    const sketchId = syncsketchHelper.GetSketchId(syncReview);

    if (!firebaseService.SyncsketchReviewExists(project_name, syncReview.group, sketchId) || action !== 'review_deleted')
        return res.status(200).send({});

    const result = await firebaseService.DeleteSyncsketchReview(sketchId, syncReview.group, project_id)

    console.log(JSON.stringify(result));
    return res.status(200).send({});
}

async function ItemDeleted(req, res) {
    
    console.log("ITEM DELETED HOOK");
    const { item_name, item_id, review_id } = req.body;
    
    
    const syncReview = await syncsketchService.GetReviewInfo(review_id);

    const project_url_arr = syncReview.project.split('/')
    const project_id = project_url_arr[project_url_arr.length - 2];
    const group_id = syncReview.group;

    const firestoreResult = await firebaseService.DeleteSyncsketchItem(item_id, syncReview.uuid, syncReview.group,  project_id);
    
    let reviewDetails;

    try {
        reviewDetails = JSON.parse(syncReview.description);
    }
    catch { 
        console.log("Could not parse Review Details in review description (JSON)")
        return res.status(200).send({});
    }

    await syncsketchHelper.StoreSyncsketchReviewData(project_id, syncReview, reviewDetails);

    const uploadInfo = await firebaseService.GetUploadInfo(item_id);
    let mondayItem = await mondayService.getItemInfo(uploadInfo?.pulse ? uploadInfo.pulse : reviewDetails.pulse);
    
    await mondayHelper.OnSyncitemRemoved(syncReview, mondayItem, item_name, reviewDetails);
    await syncsketchHelper.AssertReviewName(syncReview, mondayItem, reviewDetails);
    await syncsketchHelper.SortReviewItems(review_id);
    
    return res.status(200).send({});
}

async function ItemStatusChanged(req, res) {
    console.log("ITEM STATUS CHANGED" );
    const { project: {name : project_name, id: project_id }, 
            review: { id: review_id, name: review_name }, 
            item_id } = req.body;

    if (project_name.indexOf('/') >= 0) {
        console.log("Assumed outdated project \"ITEM STATUS UPDATED\":" + project_name)
        return res.status(200).send({});
    }

    const syncReview = await syncsketchService.GetReviewInfo(review_id);
    const syncItem = await syncsketchService.GetItemInfo(item_id);

    let reviewDetails;
    try {
        reviewDetails = JSON.parse(syncReview.description);
    }
    catch { 
        console.log("Could not parse Review Details in review description (JSON)")
        return res.status(200).send({});
    }

    await syncsketchHelper.StoreSyncsketchReviewData(project_id, syncReview, reviewDetails);
    await syncsketchHelper.StoreSyncsketchItemData(project_id, syncReview, syncItem, reviewDetails);
    await syncsketchHelper.SortReviewItems(review_id);

    return res.status(200).send({});
}

async function ItemCreated(req, res) {
  
  const { item_name, project, item_id } = req.body;
  const review_id = req.body.review.id;

  const syncReview = await syncsketchService.GetReviewInfo(review_id);
  const syncItem = await syncsketchService.GetItemInfo(item_id);
  const uploadInfo = await firebaseService.GetUploadInfo(item_id);


  let reviewDetails;
  try {
    reviewDetails = JSON.parse(syncReview.description);
  }
  catch { 
      console.log("Could not parse Review Details in review description (JSON)")
      return res.status(200).send({});
  }

  await syncsketchHelper.StoreSyncsketchReviewData(project.id, syncReview, reviewDetails);
  await syncsketchHelper.StoreSyncsketchItemData(project.id, syncReview, syncItem, reviewDetails);
  
  if (uploadInfo) {
      console.log("Upload Info Exists")
      console.log(uploadInfo);
  } else {
      console.log("Could not find upload info");
  }

  let mondayItem = await mondayService.getItemInfo(
      uploadInfo?.pulse ? uploadInfo.pulse : reviewDetails.pulse
  );

  await mondayHelper.AssertSubItem(syncReview, syncItem, mondayItem, reviewDetails);
  await syncsketchHelper.AssertReviewName(syncReview, mondayItem, reviewDetails);
  await syncsketchHelper.SortReviewItems(review_id);
  
  return res.status(200).send({});
}

module.exports = {
    ItemCreated,
    ItemDeleted,
    ReviewCreated,
    ReviewDeleted,
    ItemStatusChanged
};
  