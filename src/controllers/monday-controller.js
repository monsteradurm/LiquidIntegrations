const mondayService = require('../services/monday-service');
const transformationService = require('../services/transformation-service');
const syncsketchService = require('../services/syncsketch-service');
const firebaseService = require('../services/firebase-service');
const mondayHelper = require('../helpers/monday-helper');
const bunyan = require('bunyan');

const logger = bunyan.createLogger({ name: 'MondayController', level: 'info' });
const _ = require('lodash');

const { TRANSFORMATION_TYPES } = require('../constants/transformation');

async function PersonColumnUpdated(req, res) {
  logger.info("Person Column Update Called..");
  if (req.body.challenge) {
    logger.info("Person Column Updated, Challenge Accepted..");
    return res.status(200).send(req.body);
  }
  logger.info({ requestBody: req.body }, "Request Body");

  try {
    let { pulseId, parentItemId, itemId } = req.body.event;
    if (parentItemId) pulseId = parentItemId;
    else if (!pulseId && itemId) pulseId = itemId;

    const mondayItem = await mondayService.getItemInfo(pulseId);
    if (!mondayItem || mondayItem.state !== 'active') {
      logger.warn("Monday item no longer exists", { pulseId, parentItemId, itemId });
      await firebaseService.DeleteInvalidArtistAllocations({ id: pulseId, groupId: mondayItem.group.id, boardId: mondayItem.board.id, artists: [] });
      return res.status(200).send({});
    }

    let status = mondayHelper.ParseColumnValue(mondayItem, 'Status', 'text');
    if (!status || status.length < 1) status = 'Not Started';
    status = status.toLowerCase();

    let artists = mondayHelper.CurrentArtist(mondayItem);
    if (status.includes('approved') || status.includes('blocked') || status.includes('retask')) artists = [];

    const data = { id: pulseId, groupId, boardId, artists, status, board_description: mondayItem.board.description };
    logger.info({ data }, "Allocation Data");

    if (artists?.length > 0) {
      logger.info({ data }, "Storing Allocation Data");
      await firebaseService.StoreArtistAllocations(data);
    }

    await firebaseService.DeleteInvalidArtistAllocations(data);
  } catch (err) {
    logger.error({ error: err }, "Error Updating Person Column");
  }

  return res.status(200).send({});
}

async function DeleteSupportItem(req, res) {
  logger.info("Delete Support Item Called..");
  if (req.body.challenge) {
    logger.info("DeleteSupportItem, Challenge Accepted..");
    return res.status(200).send(req.body);
  }

  try {
    const pulseId = req.body.event.pulseId;
    const boardId = req.body.event.boardId;

    const result = await firebaseService.DeleteSupportItem(boardId, pulseId);
    logger.info({ result }, "Result of Delete Support Item");

  } catch (err) {
    logger.error({ error: err }, "Error during support item deletion");
  }

  return res.status(200).send({});
}

async function UpdateSupportItem(req, res) {
  logger.info("Update Support Item Called..");
  if (req.body.challenge) {
    logger.info("UpdateSupportItem, Challenge Accepted..");
    return res.status(200).send(req.body);
  }

  try {
    const pulseId = req.body.event.pulseId;
    logger.info("Getting Support Item: " + pulseId);
    const item = await mondayService.getSupportItemInfo(pulseId);
    logger.info({ item }, "Support Item Details");

    const boardId = req.body.event.boardId;
    logger.info("Getting Support Board: " + boardId);
    const board = await mondayService.getSupportBoardInfo(boardId);
    logger.info({ board }, "Support Board Details");

    logger.info("Storing Board");
    let result = await firebaseService.StoreSupportBoard(boardId, board);
    logger.info({ result }, "Result of Storing Board");

    logger.info("Storing Item");
    result = await firebaseService.StoreSupportItem(boardId, pulseId, item);
    logger.info({ result }, "Result of Storing Item");

  } catch (err) {
    logger.error({ error: err }, "Error during SupportItemUpdated");
  }

  return res.status(200).send({});
}

async function StoreBoardItemStatus(req, res) {
  logger.info({ requestBody: req.body }, "StoreBoardItemStatus Called");

  if (req.body.challenge) {
    logger.info("StoreBoardItemStatus, Challenge Accepted");
    return res.status(200).send(req.body);
  }

  const inputFields = req.body.payload.inputFields;
  const { columnValue, previousColumnValue, itemId, boardId } = inputFields;

  try {
    const { board, group } = await mondayService.getMinimumItemInfo(parseInt(itemId));
    const { workspaceId: workspace_id, name: board_name, description: board_description } = board;
    const { title: group_title, id: group_id } = group; 

    const statusCollection = mondayHelper.GetStatusCollection(columnValue.label);
    const prevStatusCollection = previousColumnValue ? mondayHelper.GetStatusCollection(previousColumnValue?.label) : null;

    if (statusCollection) {
      logger.info({ statusCollection, itemId }, "Adding to stored monday status collection");
      const { text, index } = columnValue.label;
      const { color } = columnValue.label.style;
      let data = { text, index, color, board: boardId, id: itemId, board_name, board_description, group: group_id, group_title };

      try {
        const mondayItem = await mondayService.getItemInfo(itemId);
        const reviews = _.sortBy(mondayItem.subitems, s => mondayHelper.ParseColumnValue(s, 'Index', 'text') || -1).reverse();

        let review = reviews.length > 0 ? reviews[0] : null;
        const department = review ? mondayHelper.ParseColumnValue(review, 'Feedback Department', 'text') : 'Internal';
        const review_name = review ? review.name : null;
        const item_name = mondayItem ? mondayItem.name : null;
        const review_tags = review ? mondayHelper.ParseColumnValue(review, 'Tags', 'text') : null;
        const item_tags = mondayItem ? mondayHelper.ParseColumnValue(mondayItem, 'Tags', 'text') : null;

        data = { ...data, department, review_name, item_name, review_tags, item_tags };

        let artists = mondayItem ? mondayHelper.ParseColumnValue(mondayItem, 'Artist', 'text') : null;
        if (review && mondayItem?.subitems?.some(s => mondayHelper.ParseColumnValue(s, 'Artist', 'text'))) {
          artists = mondayHelper.ParseColumnValue(review, 'Artist', 'text');
        }
        data['artists'] = artists;

        let directors = mondayItem ? mondayHelper.ParseColumnValue(mondayItem, 'Director', 'text') : null;
        data['directors'] = directors;

        await firebaseService.StoreMondayItemStatus(statusCollection, itemId, data);
      } catch (err) {
        logger.error({ error: err }, "Error processing Monday item");
      }
    }

    if (prevStatusCollection && prevStatusCollection !== statusCollection) {
      logger.info({ prevStatusCollection, itemId }, "Removing from stored monday status collection");
      await firebaseService.DeleteMondayItemStatus(prevStatusCollection, itemId);
    }

    await mondayHelper.AssertAllStatusValid();
  } catch (err) {
    logger.error({ error: err }, "Error in StoreBoardItemStatus");
  }

  return res.status(200).send({});
}

async function SubitemRenamed(req, res) {
  if (req.body.challenge) {
    logger.info("SubitemRenamed, Challenge Accepted");
    return res.status(200).send(req.body);
  }

  logger.info("SUBITEM RENAMED");
  const { pulseId, type, app, parentItemId, value, previousValue } = req.body.event;

  if (type !== 'update_name' || app !== 'monday') {
    logger.warn({ event: { app, type } }, "Event is not acceptable for Monday/SubitemRenamed");
    return res.status(200).send({});
  }

  try {
    const subitem = await mondayService.getSubitemInfo(pulseId);
    const mondayItem = await mondayService.getItemInfo(parseInt(parentItemId));

    await mondayHelper.SubitemRenamed(subitem, mondayItem, value.name, previousValue.name);
    logger.info({ subitem, mondayItem, newValue: value.name, previousValue: previousValue.name }, "Subitem Renamed Successfully");
  } catch (err) {
    logger.error({ error: err }, "Error in SubitemRenamed");
  }

  return res.status(200).send({});
}

async function SubitemUpdated(req, res) {
  if (req.body.challenge) {
    logger.info("Subitem Updated, Challenge Accepted");
    return res.status(200).send(req.body);
  }

  try {
    const { parentItemId } = req.body.event;
    const item = await mondayService.getItemInfo(parentItemId);
    logger.info({ item }, "Retrieved Item for Subitem Update");

    const reviews = _.sortBy(item.subitems, s => mondayHelper.ParseColumnValue(s, 'Index', 'text') || -1).reverse();
    let review = reviews.length > 0 ? reviews[0] : null;

    const department = review ? mondayHelper.ParseColumnValue(review, 'Feedback Department', 'text') : 'Internal';
    const department_col = mondayHelper.ParseColumnId(item, 'Feedback Department');
    const link = review ? mondayHelper.ParseColumnValue(review, 'Link', 'text') : null;
    const link_col = mondayHelper.ParseColumnId(item, 'Link');

    if (department) {
      await mondayService.setTextColumnValue(item.board.id, item.id, department_col, department);
      logger.info({ department, itemId: item.id }, "Updated Department for Item");
    }
    if (link) {
      await mondayService.setTextColumnValue(item.board.id, item.id, link_col, link);
      logger.info({ link, itemId: item.id }, "Updated Link for Item");
    }
  } catch (err) {
    logger.error({ error: err }, "Error on Subitem Update");
  }

  return res.status(200).send({});
}

async function MondayItemComment(req, res) {
  if (req.body.challenge) {
    logger.info("Monday Item Comment, Challenge Accepted");
    return res.status(200).send(req.body);
  }

  try {
    const { replyId, textBody, updateId } = req.body.event;
    if (!replyId && textBody?.indexOf('Description:') < 0) {
      logger.info("Deleting Update");
      const deleteResult = await mondayService.deleteUpdate(updateId);
      logger.info({ updateId, deleteResult }, "Update Deleted");
    }
  } catch (err) {
    logger.error({ error: err, updateId }, "Error on Monday Item Comment Update");
  }

  return res.status(200).send({});
}

async function SupportItemComment(req, res) {
  if (req.body.challenge) {
    logger.info("Support Item Comment, Challenge Accepted");
    return res.status(200).send(req.body);
  }

  try {
    const { pulseId, replyId, textBody, boardId, updateId } = req.body.event;
    logger.info({ event: req.body.event }, "Support Item Comment Event Received");

    if (!replyId && textBody?.indexOf('Description:') < 0) {
      logger.info("Deleting Update");
      const deleteResult = await mondayService.deleteUpdate(updateId);
      logger.info({ updateId, deleteResult }, "Update Deleted");
    } else {
      const updates = await mondayService.getUpdateInfo(pulseId);
      logger.info({ updates }, "Retrieved Updates for Support Item");
      await firebaseService.StoreSupportItemUpdates(boardId.toString(), pulseId.toString(), updates);
      logger.info("Support Item Updates Stored");
    }
  } catch (err) {
    logger.error({ error: err }, "Error on Support Item Update");
  }

  return res.status(200).send({});
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
