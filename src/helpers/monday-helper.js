const mondayService = require('../services/monday-service');
const syncsketchService = require('../services/syncsketch-service');
const firebaseService = require('../services/firebase-service');

const _ = require('lodash');

async function FindSyncReview(mondayItem, subitem, review_name) {
    const fbDepartment = ParseColumnValue(subitem, 'Feedback Department', 'text');
    //const review_name = syncsketchHelper.ParseReviewName(mondayItem, fbDepartment);
    const syncReview = await syncsketchService.FindReview(review_name, mondayItem.id);

    if (syncReview)
        syncReview;

    console.log("Could not find Review: " + review_name + ", " + mondayItem.id);
    return null;
}

async function SubitemRenamed(subitem, mondayItem, name, previousName) {
    console.log("Subitem renamed from: " + previousName + ", to: " + name)
    const syncReview = await FindSyncReview(mondayItem, subitem);

    if (!syncReview) {
        return;
    }

    console.log("Found SyncReview Id: " + syncReview.id);

    const reviewItems = syncsketchService.GetReviewItems(syncReview.id);
    
    //console.log("Found Items: ");
    //console.log(reviewItems.map(s => s.name));

}

function ParseSubitemName(name) {
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

function ParseMaxSubitemValue(parent, col, attr) {
    if (!parent?.subitems?.length)
        return 0;

    const values = parent.subitems.map(s => parseInt(ParseColumnValue(s, col, attr)));
    return values.sort().reverse()[0];
}
const AllStatus = ['Review', 'Feedback', 'Assistance', 'In Progress'];

function GetStatusCollection(statusCol) {
    console.log(statusCol)
    const { text } = statusCol;
    console.log(text);
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

async function AssertSubItem(syncReview, syncItem, mondayItem, reviewDetails) {
    const { name, review_index, review_pt_index, department } = ParseSubitemName(syncItem.name);
    const subitems = mondayItem.subitems;
    const feedbackDepartment = reviewDetails.department;

    let subitem_index = ParseMaxSubitemValue(mondayItem, 'Index', 'text') + 1;

    let subitem = _.find(subitems, s => s.name === name);

    let url = ParseItemURL(syncReview, syncItem.id);

    if (!!subitem) {
        const link_id = ParseColumnId(subitem, 'Link');
        if (link_id)
            await mondayService.setColumnValue(subitem.board.id, subitem.id, link_id, url);
        else 
            console.log("Could not find \"Link\" Column");

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

    mondayService.mutateColumns(subitem.board.id, subitem.id, values);
}

function FindSubitem(item_name, subitems, feedbackDepartment) {
    const {name, review_index, review_pt_index, department } = ParseSubitemName(item_name);

    const subitem = _.find(subitems, 
        (s) => {

            if (s.name !== name) return false;
            const dep = ParseColumnValue(s, 'Feedback Department', 'text');

            if (dep !== feedbackDepartment) {
                console.log("Doesnt match: " + feedbackDepartment + ", " + dep);
                return false;
            }
            return true;
    });

    if (subitem) {
        console.log("FOUND SUBITEM: " + subitem.name);
        return subitem;
    }

    return null;
}
function ValidateWorkspaceId(id) {
    console.log(id);
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
        console.log("COULD NOT FIND LINK COLUMN: ", subitem.id);
        return;
    }
    await mondayService.setColumnValue(subitem.board.id, subitem.id, linkCol, url);
}

function ParseColumnId(parent, title) {
    if (!parent || !parent.column_values)
        return null;

    const col = _.find(parent.column_values, (c) => c.title === title);

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
    //console.log("LOOKING FOR " + title + ", " + attr);
    //console.log(parent.column_values);

    const col = _.find(parent.column_values, c => c.title === title);
    return col[attr];
}


async function AssertStatusItemsValid(Status) {
    const ids = await firebaseService.GetStatusIds(Status);
    console.log(`Validifying Status Ids (${Status}): ` + JSON.stringify(ids));

    const grouped = []

    // cluster into groups of < 100 (monday requirements)
    while(ids.length > 100)
        grouped.push(ids.splice(0,99));

    if (ids.length > 0)
        grouped.push(ids)

    console.log("GROUPS: " + JSON.stringify(grouped));

    grouped.forEach(async g => {

        const invalid = await mondayService.GetInvalidItemStates(g, Status);
        
        if (invalid.length > 0) {
            console.log(`Found Invalid State (${Status}): ` + JSON.stringify(invalid));
            await firebaseService.DeleteMultipleStatus(Status, invalid)
        }
        else {
            console.log(`Found no Invalid State: (${Status})`)
        }
    })
}

async function AssertAllStatusValid() {
    AllStatus.forEach(async status => await AssertStatusItemsValid(status))
}

module.exports = {
    AssertSubItem,
    OnSyncitemRemoved,
    SubitemRenamed,
    ParseColumnValue,
    GetStatusCollection,
    ValidateWorkspaceId,
    AssertAllStatusValid
};