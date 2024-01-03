const mondayService = require('../services/monday-service');
const syncsketchService = require('../services/syncsketch-service');
const firebaseService = require('../services/firebase-service');
const _ = require('lodash');

function ParseReviewName(mondayItem, fbDepartment) {
    const group = mondayItem.group.title;
    let element = mondayItem.name;

    if (element.indexOf('/') > -1)
        element = element.split('/')[0];

    const review_name = group + '/' + element + ' (' + fbDepartment + ')';
}

function GetSketchId(syncReview) {
  const review_url = syncReview.reviewURL;
  const sketchArr = review_url.split('/').reverse();
  sketchArr.shift();
  return sketchArr[0];
}
async function AssertReviewName(syncReview, mondayItem, reviewDetails) {
    const review_name = ParseReviewName(mondayItem, reviewDetails.feedbackDepartment)
    const current_name = syncReview.name;

    if (review_name !== current_name) {
        syncsketchService.RenameReview(syncReview.id, review_name)
    }
}
async function UpdateItemDetails(item_id, mondayItem) {

}

async function StoreSyncsketchReviewData(project_id, syncReview, reviewDetails) {

    const group = syncReview.name.indexOf('/') < 0 ? syncReview.name : syncReview.name.split('/')[0];
    const element = syncReview.name.indexOf('/') < 0 ? syncReview.name : syncReview.name.split(' ')[0].split('/')[1]
    const data = {
        id: syncReview.id,
        uuid: syncReview.uuid,
        project: project_id,
        name: syncReview.name,
        group,
        element,
        reviewURL: syncReview.reviewURL,
        item_count: syncReview.item_count,
        ...reviewDetails
    }

    return await firebaseService.StoreSyncsketchReview(syncReview.uuid, syncReview.group, project_id, data);
}

async function StoreSyncsketchItemData(project_id, syncReview, syncItem, reviewDetails) {
    const data = {
        project: project_id,
        ...reviewDetails,
        description: syncItem.description && syncItem.description.length > 0 ?
            syncItem.description : 'No Description',
        name: syncItem.name,
        group: syncReview.group,
        thumbnail_url: syncItem.thumbnail_url,
        totalFrames: syncItem.totalFrames,
        type: syncItem.type,
        active: syncItem.active, 
        creator: syncItem.creator,
        review: syncReview.id,
        sketchId: syncReview.uuid,
        url: syncReview.reviewURL + '#/' + syncItem.id
    }

  return await firebaseService.StoreSyncsketchItem(syncItem.id, syncReview.uuid, syncReview.group, project_id, data);
}

async function SortReviewItems(review_id) {
    const items = await syncsketchService.GetReviewItems(review_id);
    logger.info("Sorting Items From Review", review_id)

    const sortedValues = _.reduce(
        _.sortBy( items, i => i.name), 
        (acc, i) => {
            acc.push({id: i.id, sortorder: acc.length});
            return acc;
    }, []);


    const data = JSON.stringify({ items: sortedValues });
    await syncsketchService.SortReviewItems(review_id, data);
}
module.exports = {
    AssertReviewName,
    SortReviewItems,
    GetSketchId,
    StoreSyncsketchReviewData,
    StoreSyncsketchItemData
};
