const { default: axios } = require("axios")
const _ = require('lodash');

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
    const data = {
        "name": name,
    }

    await axios({
        method: 'patch',
        url: environment.url + 'review/' + reviewId + '/',
        headers,
        data
    })
}

async function FindReview(review_name, pulse) {
    const reviews = await SearchReviews(review_name);
    if (!reviews || reviews.length < 1)
        return null;
    
    const valid = _.filter(reviews, (r) => {
            try {
                const details = JSON.parse(r.description);
                return details.pulse === pulse;
            }
            catch { }
            return false;
        }
    )
    
    if (valid?.length > 0) return _.first(valid);
    return null;
}

async function SearchReviews(review_name) {
    const result = await axios({method: 'get',
    url: environment.url + `review/?name__istartswith=${review_name}&active=1`,
    headers
    });
    return result?.data?.objects;
}
async function UpdateItem(item_id, data) {
    const result = await axios({ method: 'patch',
        url: environment.url + `item/${item_id}/`,
        headers: { ...headers, 
            'Content-Type': 'application/json'
        },
        data
    });

    console.log(result.data);
}
async function SortReviewItems(review_id, data) {
    const result = await axios({ method: 'put',
        url: environment.url_v2 + `review/${review_id}/sort_items/`,
        headers: { ...headers, 
            'Content-Type': 'application/json'
        },
        data
    });

    console.log(result.data);
}

async function GetItemInfo(itemId) {
    const result = await axios({
        method: 'get',
        url: environment.url + 'item/' + itemId + '/',
        headers
    })

    return result.data;
}

async function GetReviewItems(reviewId) {
    const result = await axios({
        method: 'get',
        url: environment.url + 'item/?reviews__id=' + reviewId + '&active=1&fields=id,name,active',
        headers
    });

    return result.data.objects;
}

async function GetReviewInfo(reviewId) {
    const result = await axios({
        method: 'get',
        url: environment.url + 'review/' + reviewId + '/',
        headers
    })

    return result.data;
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
  