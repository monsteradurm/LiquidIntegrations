const { default: axios } = require("axios");
const _ = require('lodash');
const bunyan = require('bunyan');
const logger = bunyan.createLogger({ name: 'SyncSketchService', level: 'info' });


const environment = {
    token: 'b1bb92aa73acc60d25721172ba0f64db2654e5ca',
    user: 'acranchliquidanimationcom',
    url: 'https://syncsketch.com/api/v1/',
    url_v2: 'https://syncsketch.com/api/v2/'
}

const headers = {
    'Authorization': `apikey ${environment.user}:${environment.token}`
}

async function RenameReview(reviewId, name) {
    const data = { "name": name };

    try {
        await axios({
            method: 'patch',
            url: environment.url + 'review/' + reviewId + '/',
            headers,
            data
        });
        logger.info({ reviewId, name }, 'Review renamed successfully');
    } catch (error) {
        logger.error({ error, reviewId, name }, 'Error renaming review');
        throw error;
    }
}


async function FindReview(review_name, pulse) {
    try {
        const reviews = await SearchReviews(review_name);
        if (!reviews || reviews.length < 1) {
            logger.warn({ review_name }, 'No reviews found');
            return null;
        }

        const valid = _.filter(reviews, (r) => {
            try {
                const details = JSON.parse(r.description);
                return details.pulse === pulse;
            } catch (err) {
                logger.error({ err, review: r }, 'Error parsing review description');
                return false;
            }
        });

        if (valid?.length > 0) {
            logger.info({ review_name, pulse }, 'Valid review found');
            return _.first(valid);
        } else {
            logger.warn({ review_name, pulse }, 'No valid reviews found');
            return null;
        }
    } catch (err) {
        logger.error({ err, review_name, pulse }, 'Error finding review');
        throw err;
    }
}

async function SearchReviews(review_name) {
    try {
        const result = await axios({
            method: 'get',
            url: environment.url + `review/?name__istartswith=${review_name}&active=1`,
            headers
        });
        logger.info({ review_name }, 'SearchReviews executed successfully');
        return result?.data?.objects;
    } catch (err) {
        logger.error({ err, review_name }, 'Error in SearchReviews');
        throw err;
    }
}

async function UpdateItem(item_id, data) {
    try {
        const result = await axios({
            method: 'patch',
            url: environment.url + `item/${item_id}/`,
            headers: { ...headers, 'Content-Type': 'application/json' },
            data
        });
        logger.info({ item_id, data }, 'UpdateItem executed successfully');
        return result.data;
    } catch (err) {
        logger.error({ err, item_id, data }, 'Error in UpdateItem');
        throw err;
    }
}

async function SortReviewItems(review_id, data) {
    try {
        const result = await axios({
            method: 'put',
            url: environment.url_v2 + `review/${review_id}/sort_items/`,
            headers: { ...headers, 'Content-Type': 'application/json' },
            data
        });
        logger.info({ review_id, data }, 'SortReviewItems executed successfully');
        return result.data;
    } catch (err) {
        logger.error({ err, review_id, data }, 'Error in SortReviewItems');
        throw err;
    }
}

async function GetItemInfo(itemId) {
    try {
        const result = await axios({
            method: 'get',
            url: environment.url + 'item/' + itemId + '/',
            headers
        });
        logger.info({ itemId }, 'GetItemInfo executed successfully');
        return result.data;
    } catch (err) {
        logger.error({ err, itemId }, 'Error in GetItemInfo');
        throw err;
    }
}

async function GetReviewItems(reviewId) {
    try {
        const result = await axios({
            method: 'get',
            url: environment.url + 'item/?reviews__id=' + reviewId + '&active=1&fields=id,name,active',
            headers
        });
        logger.info({ reviewId }, 'GetReviewItems executed successfully');
        return result.data.objects;
    } catch (err) {
        logger.error({ err, reviewId }, 'Error in GetReviewItems');
        throw err;
    }
}

async function GetReviewInfo(reviewId) {
    try {
        const result = await axios({
            method: 'get',
            url: environment.url + 'review/' + reviewId + '/',
            headers
        });
        logger.info({ reviewId }, 'GetReviewInfo executed successfully');
        return result.data;
    } catch (err) {
        logger.error({ err, reviewId }, 'Error in GetReviewInfo');
        throw err;
    }
}


module.exports = {
    GetReviewInfo,
    GetReviewItems,
    GetItemInfo,
    RenameReview,
    SortReviewItems,
    UpdateItem,
    SearchReviews,
    FindReview
  };
  