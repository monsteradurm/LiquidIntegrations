const mondayService = require('../services/monday-service');
const syncsketchService = require('../services/syncsketch-service');
const firebaseService = require('../services/firebase-service');

const bunyan = require('bunyan');
const logger = bunyan.createLogger({ name: 'MondayHelper', level: 'info' });

const _ = require('lodash');

async function FindSyncReview(mondayItem, subitem, review_name) {
    const fbDepartment = ParseColumnValue(subitem, 'Feedback Department', 'text');
    //const review_name = syncsketchHelper.ParseReviewName(mondayItem, fbDepartment);
    const syncReview = await syncsketchService.FindReview(review_name, mondayItem.id);

    if (syncReview)
        syncReview;

    logger.info("Could not find Review: " + review_name + ", " + mondayItem.id);
    return null;
}

async function SubitemRenamed(subitem, mondayItem, name, previousName) {
    logger.info("Subitem renamed from: " + previousName + ", to: " + name)
    const syncReview = await FindSyncReview(mondayItem, subitem);

    if (!syncReview) {
        return;
    }

    logger.info("Found SyncReview Id: " + syncReview.id);

    const reviewItems = syncsketchService.GetReviewItems(syncReview.id);
    
    //logger.info("Found Items: ");
    //logger.info(reviewItems.map(s => s.name));

}

function ParseSubitemName(name) {
    logger.info("PARSING SUBITEM NAME: " + name);
    let nameArr = name.split(' ');
    const department = nameArr[0];
    nameArr.shift();

    let review_index = nameArr[0];
    let review_pt_index;

    if (review_index.indexOf('.') > -1) {
        const indexArr = review_index.split('.');
        review_index = parseInt(indexArr[0]);
        review_pt_index = parseInt(indexArr[1]);  
    } else {
        review_index = parseInt(review_index)
    }

    nameArr.shift();

    let subitem_name = nameArr.join(" ");
    if (subitem_name.indexOf('.') > -1) {
        nameArr = subitem_name.split('.');
        nameArr.pop();
        subitem_name = nameArr.join(" ");
    }

    return {name: subitem_name, review_index, review_pt_index, department};
}

function ParseItemURL(syncReview, item_id) {
    return syncReview.reviewURL + '#/' + item_id;
}
function ParseMaxSubitemIndex(parent) {
    if (!parent?.subitems?.length)
        return 0;

    const values = [];
    parent.subitems.forEach(s => {
        const i = ParseColumnValue(s, 'Index', 'text');
        if (i) {
            const v = '00' + ParseColumnValue(s, 'Index', 'text');
            values.push(`00${v}`.slice(-3))
        }
    })
    if (values.length < 1) return 0;

    const last = values.sort().reverse()[0];
    logger.info("PARSED MAX INDEX VALUE: " + values[0].toString())
    return parseInt(last);
}

function ParseMaxSubitemValue(parent, col, attr) {
    if (!parent?.subitems?.length)
        return 0;

    const values = parent.subitems.map(s => parseInt(ParseColumnValue(s, col, attr)));
    
    return values.sort().reverse()[0];
    
}
const AllStatus = ['Review', 'Feedback', 'Assistance', 'In Progress'];

function GetStatusCollection(statusCol) {
    const { text } = statusCol;
    if (text.indexOf('Review') >= 0)
        return 'Review';
    else if (text.indexOf('Feedback') >= 0)
        return 'Feedback';
    else if (text.indexOf('Assistance') >= 0)
        return 'Assistance';
    else if (text.indexOf('In Progress') >= 0)
        return 'In Progress'
    return null;
}

function ParseArtists (item) {
    const text = ParseColumnValue(item, 'Artist', 'text');
    if (!text) return null;

    if (text.indexOf(', '))
        return text.split(', ');

    return [text];
}


function CurrentArtist(item) {
    
        let itemArtist = ParseArtists(item);
        const subitems = item.subitems;

        let reviewArtist = null;
        let reassigned = false;

        if (item.subitems?.length) {
            let subitem_index, review = null;
            subitem_index = ParseMaxSubitemValue(item, 'Index', 'text');

            
            if (subitem_index && subitem_index >= 0)
                review = _.find(item.subitems, s => ParseColumnValue(s, 'Index', 'text').toString() === subitem_index.toString());

            if (review) {
                const valid = item.subitems?.filter(s => ParseArtists(s)?.length > 0);
                reassigned = valid.length > 0;
                reviewArtist = ParseArtists(review);
            }
        }

        logger.info("CurrentArtist: " + JSON.stringify({reviewArtist, itemArtist, reassigned}))
        if (!!reviewArtist || !!reassigned) return reviewArtist
        return itemArtist;
}

async function AssertSubItem(syncReview, syncItem, mondayItem, reviewDetails) {
    const { name, review_index, review_pt_index, department } = ParseSubitemName(syncItem.name);
    const subitems = mondayItem.subitems;
    const feedbackDepartment = reviewDetails.department;

    let subitem_index = ParseMaxSubitemIndex(mondayItem) + 1;

    let subitem = _.find(subitems, s => s.name === name);

    let url = ParseItemURL(syncReview, syncItem.id);

    if (!!subitem) {
        const link_id = ParseColumnId(subitem, 'Link');
        if (link_id)
            await mondayService.setColumnValue(subitem.board.id, subitem.id, link_id, url);
        else 
            logger.info("Could not find \"Link\" Column");

        const index = ParseColumnValue(subitem, 'Index', 'text');
        if (index)
            subitem_index = parseInt(index);
    } else {
        subitem = await mondayService.createSubitem(mondayItem.id, name);
    }

    const depCol = ParseColumnId(subitem, 'Feedback Department');
    const linkCol = ParseColumnId(subitem, 'Link');
    const artistCol = ParseColumnId(subitem, 'Artist');
    const timelineCol = ParseColumnId(subitem, 'Timeline');
    const indexCol = ParseColumnId(subitem, 'Index');
    const reviewCol = ParseColumnId(subitem, 'Review');
    const deliveredCol = ParseColumnId(subitem, 'Delivered Date')

    const values = {};
    values[depCol] = { labels: [feedbackDepartment] };
    values[linkCol] = url;
    values[indexCol] = subitem_index.toString();
    values[reviewCol] = review_index.toString();
    
    let itemDetails = {};
    try {
        const result = JSON.parse(syncItem.description) || {}
    } catch { }

    if (itemDetails.Artist)
        values[artistCol] = { 
         personsAndTeams: itemDetails.Artist.map(a => ({id: a, kind: "person"}))
        };

    if (itemDetails.Timeline)
        values[timelineCol] = {
            from: itemDetails.Timeline.from, to:itemDetails.Timeline.to
        };

    if (itemDetails['Delivered Date'])
        values[deliveredCol] = itemDetails['Delivered Date'];

    console.log("SUBITEM", subitem)
    console.log("VALUES", values)

    mondayService.mutateColumns(subitem.board.id, subitem.id, values);
}

function FindSubitem(item_name, subitems, feedbackDepartment) {
    const {name, review_index, review_pt_index, department } = ParseSubitemName(item_name);

    const subitem = _.find(subitems, 
        (s) => {

            if (s.name !== name) return false;
            const dep = ParseColumnValue(s, 'Feedback Department', 'text');

            if (dep !== feedbackDepartment) {
                logger.info("Doesnt match: " + feedbackDepartment + ", " + dep);
                return false;
            }
            return true;
    });

    if (subitem) {
        logger.info("FOUND SUBITEM: " + subitem.name);
        return subitem;
    }

    return null;
}
function ValidateWorkspaceId(id) {
    return id.toString() === '1635792';
}

async function OnSyncitemRemoved(syncReview, mondayItem, item_name, reviewDetails) {
    const subitem = FindSubitem(item_name, mondayItem.subitems, reviewDetails.department);
    if (!subitem) return;

    const ssItems = await syncsketchService.GetReviewItems(syncReview.id);

    if (ssItems?.length < 1) return;

    const siblings = _.filter(ssItems, s => {
        const subitem_name = ParseSubitemName(s.name)?.name;
        return subitem_name === subitem.name
    });

    if (siblings.length < 1) {
        return;
    } 

    const mostRecent = _.last(siblings);

    let url = ParseItemURL(syncReview, mostRecent.id);
    const linkCol = ParseColumnId(subitem, 'Link');

    if (!linkCol) {
        logger.info("COULD NOT FIND LINK COLUMN: ", subitem.id);
        return;
    }
    await mondayService.setColumnValue(subitem.board.id, subitem.id, linkCol, url);
}

function ParseColumnId(parent, title) {

    
    
    if (!parent || !parent.column_values)
        return null;

    const col = _.find(parent.column_values, (c) => 
        c.title === title || c.column?.title === title);

    console.log("ParseColumnId", parent, title, col)
    if (!!col)
        return col.id;
    
    
    return null;
}

function ParseMaxColumnValue(parent, title, attr) {
    if (!parent || !parent.column_values)
        return 0;

    const values = _.map(subitems, 
        s => ParseColumnValue(parent, title, attr))
        .filter(v => v !== null && v !== undefined);
    
    if (values.length < 1)
        return 0;

    return parseInt(_.max(indices));
}

function ParseColumnValue(parent, title, attr) {
    if (!parent || !parent.column_values)
        return null;
    //logger.info("LOOKING FOR " + title + ", " + attr);
    //logger.info(parent.column_values);

    const col = _.find(parent.column_values, c => c?.column?.title === title);

    if (!col) {
        logger.error("Could not find column: " + title + ", " + 
            "_.find(parent.column_values, c => c.title === title), " + JSON.stringify(parent));

        return null;
    }

    if (col[attr]) return col[attr];

    const c = col.column;

    if (c[attr]) return c[attr];
    return null;
}


async function AssertStatusItemsValid(Status) {
    const ids = await firebaseService.GetStatusIds(Status);
    logger.info(`Validifying Status Ids (${Status}): ` + JSON.stringify(ids));

    const grouped = []

    // cluster into groups of < 100 (monday requirements)
    while(ids.length > 100)
        grouped.push(ids.splice(0,99));

    if (ids.length > 0)
        grouped.push(ids)

    grouped.forEach(async g => {

        const invalid = await mondayService.GetInvalidItemStates(g, Status);
        
        if (invalid.length > 0) {
            logger.info(`Found Invalid State (${Status}) `)// + JSON.stringify(invalid));
            await firebaseService.DeleteMultipleStatus(Status, invalid)
        }
        else {
            logger.info(`Found no Invalid State: (${Status})`)
        }
    })
}

async function AssertAllStatusValid() {
    AllStatus.forEach(async status => await AssertStatusItemsValid(status))
}

async function FilterComments(id, body) {
    
}

module.exports = {
    AssertSubItem,
    OnSyncitemRemoved,
    SubitemRenamed,
    ParseColumnValue,
    GetStatusCollection,
    ValidateWorkspaceId,
    AssertAllStatusValid,
    ParseMaxSubitemValue,
    ParseMaxSubitemIndex,
    ParseColumnId,
    CurrentArtist
};