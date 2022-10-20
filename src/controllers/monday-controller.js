const mondayService = require('../services/monday-service');
const transformationService = require('../services/transformation-service');
const syncsketchService = require('../services/syncsketch-service');
const firebaseService = require('../services/firebase-service');
const mondayHelper = require('../helpers/monday-helper');
const _ = require('lodash');

const { TRANSFORMATION_TYPES } = require('../constants/transformation');

async function PersonColumnUpdated(req, res) {
  console.log("Person Column Update Called..");
  if (req.body.challenge) {
    console.log("Person Column Updated, Challenge Accepted..");
    return res.status(200).send(req.body);
  }
  console.log(JSON.stringify(req.body));
  
  try {
    let { pulseId, groupId, boardId, parentItemId} = req.body.event;

    if (parentItemId)
      pulseId = parentItemId;

    const mondayItem = await mondayService.getItemInfo(pulseId);

    if (!mondayItem || mondayItem.state !== 'active') {
      console.log("monday item no longer exists")
      firebaseService.DeleteInvalidArtistAllocations(
        {id: pulseId, groupId, boardId, artists: []}
      )
      return res.status(200).send({});
    }

    let status = mondayHelper.ParseColumnValue(mondayItem, 'Status', 'text');
    if (!status || status.length < 1)
      status = 'Not Started';

    status = status.toLowerCase();

    let artists = mondayHelper.CurrentArtist(mondayItem);

    if (status.includes('approved') || status.includes('blocked') || status.includes('retask'))
      artists = [];

    const data = {id: pulseId, groupId, boardId, artists, status, board_description: mondayItem.board.description};

    console.log("AllocatonData: " + JSON.stringify(data));
    if (artists?.length > 0) {
      console.log("Storing Allocation Data: " + JSON.stringify(data));
      await firebaseService.StoreArtistAllocations(data);
    }

    await firebaseService.DeleteInvalidArtistAllocations(data);

  } catch (err) {
    console.log("Error Updating Person Column: " + JSON.stringify(err));
  }

  return res.status(200).send({});
}

async function DeleteSupportItem(req, res) {
  console.log("Delete Support Item Called..");
  if (req.body.challenge) {
    console.log("DeleteSupportItem, Challenge Accepted..");
    return res.status(200).send(req.body);
  }
  try {
  const pulseId = req.body.event.pulseId;
  const boardId = req.body.event.boardId;

  const result = await firebaseService.DeleteSupportItem(boardId, pulseId);

  console.log(result);
  } catch(err) {
    console.log("Error during support item deleted:")
    console.log(err);
  }
  return res.status(200).send({});
}

async function UpdateSupportItem(req, res) {
  console.log("Update Support Item Called..");
  if (req.body.challenge) {
    console.log("UpdateSupportItem, Challenge Accepted..");
    return res.status(200).send(req.body);
  }

  try {
    const pulseId = req.body.event.pulseId;
    console.log("Getting Support Item: " + pulseId);
    const item = await mondayService.getSupportItemInfo(pulseId);
    console.log(JSON.stringify(item));

    const boardId = req.body.event.boardId;
    console.log("Getting Support Board: " + boardId);
    const board = await mondayService.getSupportBoardInfo(boardId);
    console.log(JSON.stringify(board));

    console.log("Storing Board: ")
    let result = await firebaseService.StoreSupportBoard(boardId, board);
    console.log(result);

    console.log("Storing Item: ")
    result = await firebaseService.StoreSupportItem(boardId, pulseId, item);

    console.log(result);
  } catch (err) {
    console.log("Error during SupportItemUpdated: ")
    console.log(err);
  }

  return res.status(200).send({});
}

async function StoreBoardItemStatus(req, res) {
  console.log(JSON.stringify(req.body))
  if (req.body.challenge) {
    console.log("StoreBoardItemStatus, Challenge Accepted..");
    return res.status(200).send(req.body);
  }

  
  const inputFields = req.body.payload.inputFields;
  const { columnValue, previousColumnValue, itemId, boardId } = inputFields;
  const { board, group } = await mondayService.getMinimumItemInfo(parseInt(itemId))
  const { workspaceId: workspace_id, name: board_name, description: board_description } = board;
  const { title: group_title, id: group_id } = group; 

  const statusCollection = mondayHelper.GetStatusCollection(columnValue.label);
  const prevStatusCollection =  previousColumnValue ? mondayHelper.GetStatusCollection(previousColumnValue?.label) : null;

  if (statusCollection) {
    console.log("Adding to stored monday status collection: " + statusCollection + ", " + itemId)
    const { text, index } = columnValue.label;
    const { color } = columnValue.label.style;
    let data = {text, index, color, board: boardId, id: itemId, board_name, board_description, group: group_id, group_title };

    try{
      const mondayItem = await mondayService.getItemInfo(itemId);
      const reviews = _.sortBy(mondayItem.subitems, s => mondayHelper.ParseColumnValue(s, 'Index', 'text') || -1).reverse();

      let review = reviews.length > 0 ? reviews[0] : null;

      const department = review ? mondayHelper.ParseColumnValue(review, 'Feedback Department', 'text') : 'Internal';
      const review_name = review ? review.name : null;
      const item_name = mondayItem ? mondayItem.name : null;

      const review_tags = review ? mondayHelper.ParseColumnValue(review, 'Tags', 'text') : null;
      const item_tags = mondayItem ? mondayHelper.ParseColumnValue(mondayItem, 'Tags', 'text') : null;

      if (department)
        data['department'] = department;

      if (review_name)
        data['review_name'] = review_name;

      if (item_name)
        data['item_name'] = item_name;

      data['review_tags'] = review_tags;
      data['item_tags'] = item_tags;

      let artists = mondayItem ? mondayHelper.ParseColumnValue(mondayItem, 'Artist', 'text') : null;
      if (review && mondayItem?.subitems?.filter(s => {
        const review_artists = mondayHelper.ParseColumnValue(s, 'Artist', 'text');
        if (review_artists && review_artists.length > 0)
          return true;
        return false;
      }).length > 0) {
        artists =  mondayHelper.ParseColumnValue(review, 'Artist', 'text')
      }

      data['artists'] = artists;

      let directors = mondayItem ? mondayHelper.ParseColumnValue(mondayItem, 'Director', 'text') : null;
      data['directors'] = directors;

    } catch (err) {
      console.log("Could not parse Feedback Department")
      console.log(err);
    }
    await firebaseService.StoreMondayItemStatus(statusCollection, itemId, data);
  }

  if (prevStatusCollection && prevStatusCollection !== statusCollection) {
    console.log("Removing from stored monday status collection: " + prevStatusCollection + ", " + itemId)
    await firebaseService.DeleteMondayItemStatus(prevStatusCollection, itemId);
  }
  await mondayHelper.AssertAllStatusValid();
  return res.status(200).send({});
}

async function SubitemRenamed(req, res) {
  if (req.body.challenge) {
    console.log("SubitemRenamed, Challenge Accepted..");
    return res.status(200).send(req.body);
  }

  console.log("SUBITEM RENAMED");
  const { pulseId, type, app, parentItemId, value, previousValue } = req.body.event;

  if (type !== 'update_name' || app !== 'monday') {
    console.log("Event: " + app + "/" + type + ", is not an acceptable for event for Monday/SubitemRenamed")
    return res.status(200).send({});
  }

  const subitem = await mondayService.getSubitemInfo(pulseId);
  const mondayItem = await mondayService.getItemInfo(parseInt(parentItemId));

  await mondayHelper.SubitemRenamed(subitem, mondayItem, value.name, previousValue.name);
  
  return res.status(200).send({});
}

async function SubitemUpdated(req,res) {
  if (req.body.challenge) {
    console.log("Subitem Updated, Challenge Accepted..");
    return res.status(200).send(req.body);
  }
  try {
    const { parentItemId } = req.body.event;
    const item = await mondayService.getItemInfo(parentItemId);
    const reviews = _.sortBy(item.subitems, s => mondayHelper.ParseColumnValue(s, 'Index', 'text') || -1).reverse();
    let review = reviews.length > 0 ? reviews[0] : null;

    const department = review ? mondayHelper.ParseColumnValue(review, 'Feedback Department', 'text') : 'Internal';
    const department_col = mondayHelper.ParseColumnId(item, 'Feedback Department');
    const link = review ? mondayHelper.ParseColumnValue(review, 'Link', 'text') : null;
    const link_col = mondayHelper.ParseColumnId(item, 'Link');

    if (department) {
      await mondayService.setTextColumnValue(item.board.id, item.id, department_col, department)
    }
    if (link) {
      await mondayService.setTextColumnValue(item.board.id, item.id, link_col, link)
    }
  }
  catch (err) {
    console.log("Error on Subitem Update: ")
    console.log(JSON.stringify(err));
  }
  return res.status(200).send({ })
}

async function MondayItemComment(req, res) {
  if (req.body.challenge) {
    console.log("Monday Item Comment, Challenge Accepted..");
    return res.status(200).send(req.body);
  }

  try {
    const { replyId, textBody, updateId } = req.body.event;
    if (!replyId && textBody?.indexOf('Description:') < 0) {
      console.log("Deleting Update");
      console.log(await mondayService.deleteUpdate(updateId));
    }
  }
  catch (err) {
    console.log("Error on Support Item Update");
    console.log(JSON.stringify(err));
  }

  return res.status(200).send({ });
}

async function SupportItemComment(req, res) {
  if (req.body.challenge) {
    console.log("Support Item Comment, Challenge Accepted..");
    return res.status(200).send(req.body);
  }
  try {
    console.log(JSON.stringify(req.body.event))
    const { pulseId, replyId, textBody, boardId, updateId } = req.body.event;

    console.log(pulseId, replyId, textBody, boardId, updateId);
    if (!replyId && textBody?.indexOf('Description:') < 0) {
      console.log("Deleting Update");
      console.log(await mondayService.deleteUpdate(updateId));
    }
    else {
      const updates = await mondayService.getUpdateInfo(pulseId);
      console.log(JSON.stringify(updates));
      await firebaseService.StoreSupportItemUpdates(boardId.toString(), pulseId.toString(), updates);
    }
  }
  catch (err) {
    console.log("Error on Support Item Update");
    console.log(JSON.stringify(err));
  }

  return res.status(200).send({ });
}

module.exports = {
  SubitemRenamed,
  StoreBoardItemStatus,
  UpdateSupportItem,
  DeleteSupportItem,
  SubitemUpdated,
  SupportItemComment,
  MondayItemComment,
  PersonColumnUpdated
};
