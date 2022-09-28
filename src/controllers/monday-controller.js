const mondayService = require('../services/monday-service');
const transformationService = require('../services/transformation-service');
const syncsketchService = require('../services/syncsketch-service');
const firebaseService = require('../services/firebase-service');
const mondayHelper = require('../helpers/monday-helper');

const { TRANSFORMATION_TYPES } = require('../constants/transformation');

async function StoreBoardItemStatus(req, res) {
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
  const prevStatusCollection = mondayHelper.GetStatusCollection(previousColumnValue.label);

  if (statusCollection) {
    console.log("Adding to stored monday status collection: " + statusCollection + ", " + itemId)
    const { text, index } = columnValue.label;
    const { color } = columnValue.label.style;
    const data = {text, index, color, board: boardId, id: itemId, board_name, board_description, group: group_id, group_title };

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

module.exports = {
  SubitemRenamed,
  StoreBoardItemStatus,
};
