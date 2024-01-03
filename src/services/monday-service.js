const initMondayClient = require('monday-sdk-js');
const bunyan = require('bunyan');
const logger = bunyan.createLogger({ name: 'MondayService', level: 'info' });

const MondayClient = () => {
  const monday = initMondayClient();
  monday.setToken('your_token_here');
  return monday;
}

const Execute = async (mondayClient, cmd, variables) => {
  try {
    const result = await mondayClient.api(cmd, variables);
    if (result.error_code) {
      logger.warn({ cmd, result }, 'API returned an error code');
      // Handle specific error codes if necessary
    }
    return result;
  } catch (error) {
    logger.error({ cmd, error }, 'Error executing Monday API command');
    throw error;
  }
}

const getSubitemInfo = async (itemId) => {
  const mondayClient = MondayClient();
  const query = `query { 
    items_page (ids: [${itemId}]) {
      items {
        id
        name
        board { id name }
        column_values {
          id
          ...on MirrorValue {
            display_value
          }
          ...on DependencyValue {
            display_value
          }
          ...on BoardRelationValue {
            display_value
          }
          additional_info title value type
        }
      }
    }
  }`;

  try {
    const response = await Execute(mondayClient, query);
    if (response?.data?.items_page?.items) {
      return response.data.items_page.items[0];
    }
    throw new Error('No items found');
  } catch (err) {
    logger.error({ err }, 'Error retrieving subitem info');
    throw err;
  }
}

const GetBoard = async (boardId) => {
  const mondayClient = MondayClient();
  // Updated query to use items_page
  const query = `query { 
    boards (ids: ${boardId}) {
      items_page {
        items {
          workspace_id
          name
          description
        }
      }
    }
  }`;

  try {
    const response = await Execute(mondayClient, query);

    if (response?.data?.boards?.items_page?.items) {
      const board = response.data.boards.items_page.items[0];
      return board;
    } else {
      throw new Error('Board not found');
    }
  } catch (err) {
    logger.error({ err, boardId }, 'Error retrieving Board Workspace Id');
    throw err;
  }
}

const getSupportBoardInfo = async (boardId) => {
  const mondayClient = MondayClient();
  // Updated query to use items_page
  const query = `query { 
    boards (ids: [${boardId}]) {
      items_page {
        items {
          id 
          name
          groups { id title }
          columns {
            id title settings_str
          }
        }
      }
    }
  }`;

  try {
    const response = await Execute(mondayClient, query);

    if (response?.data?.boards?.items_page?.items) {
      const board = response.data.boards.items_page.items[0];
      return board;
    } else {
      throw new Error('Board not found');
    }
  } catch (err) {
    logger.error({ err, boardId }, 'Error retrieving Monday Board info');
    throw err;
  }
}

const getSupportItemInfo = async (itemId) => {
  const mondayClient = MondayClient();
  // Updated query to use items_page and handle column_values
  const query = `query { 
    items_page (ids: [${itemId}]) {
      items {
        id
        name
        board { id name }
        group { id title }
        column_values {
          id
          ...on MirrorValue {
            display_value
          }
          ...on DependencyValue {
            display_value
          }
          ...on BoardRelationValue {
            display_value
          }
          additional_info title value type
        }
        created_at
        updated_at
      }
    }
  }`;

  try {
    const response = await Execute(mondayClient, query);

    if (response?.data?.items_page?.items) {
      return response.data.items_page.items[0];
    } else {
      throw new Error('Item not found');
    }
  } catch (err) {
    logger.error({ err, itemId }, 'Error retrieving Monday Item info');
    throw err;
  }
}

const getMinimumItemInfo = async (itemId) => {
  const mondayClient = MondayClient();
  // Updated query to use items_page
  const query = `query { 
    items_page (ids: [${itemId}]) {
      items {
        id
        name
        board { id name workspace_id description }
        group { id title }
      }
    }
  }`;

  try {
    const response = await Execute(mondayClient, query);

    if (response?.data?.items_page?.items) {
      return response.data.items_page.items[0];
    } else {
      throw new Error('Item not found');
    }
  } catch (err) {
    logger.error({ err, itemId }, 'Error retrieving Monday Item info');
    throw err;
  }
}

const getItemInfo = async (itemId) => {
  logger.info("Retrieving item info", { itemId });
  const mondayClient = MondayClient();
  // Updated query to use items_page and handle column_values
  const query = `query { 
    items_page (ids: [${itemId}]) {
      items {
        id
        name
        state
        board { id name workspace_id description }
        group { id title }
        column_values {
          id
          ...on MirrorValue {
            display_value
          }
          ...on DependencyValue {
            display_value
          }
          ...on BoardRelationValue {
            display_value
          }
          additional_info title value type
        }
        subitems {
          board { id name }
          id
          name
          column_values {
            id
            ...on MirrorValue {
              display_value
            }
            ...on DependencyValue {
              display_value
            }
            ...on BoardRelationValue {
              display_value
            }
            additional_info title value type
          }
        }
      }
    }
  }`;

  try {
    const response = await Execute(mondayClient, query);
    const items = response?.data?.items_page?.items || [];

    if (items.length < 1) {
      throw new Error('Item not found');
    }

    return items[0];
  } catch (err) {
    logger.error({ err, itemId }, 'Error retrieving Monday Item info');
    throw err;
  }
}

const deleteUpdate = async (itemId) => {
  const mondayClient = MondayClient();
  const mutation = `mutation {
    delete_update (id: ${itemId}) {
      id
    }
  }`;

  try {
    const response = await Execute(mondayClient, mutation);

    if (response?.data?.delete_update?.id) {
      return response.data;
    } else {
      throw new Error('Failed to delete update');
    }
  } catch (err) {
    logger.error({ err, itemId }, 'Error deleting update');
    throw err;
  }
}

const getUpdateInfo = async (itemId) => {
  const mondayClient = MondayClient();
  const query = `query {
    items_page (ids: ${itemId}) {
      items {
        updates {
          id created_at updated_at body
          replies {
            id updated_at body created_at
          }
        }
      }
    }
  }`;

  try {
    const response = await Execute(mondayClient, query);

    if (response?.data?.items_page?.items) {
      return response.data.items_page.items[0]?.updates;
    } else {
      throw new Error('Updates not found');
    }
  } catch (err) {
    logger.error({ err, itemId }, 'Error retrieving update info');
    throw err;
  }
}


const createSubitem = async (itemId, name) => {
  const mondayClient = MondayClient();
  const mutation = `mutation {
    create_subitem (parent_item_id: ${itemId}, item_name: "${name}") {
      id
      column_values {
        id
        ...on MirrorValue {
          display_value
        }
        ...on DependencyValue {
          display_value
        }
        ...on BoardRelationValue {
          display_value
        }
        additional_info title value type
      }
      board { id }
    }
  }`;

  try {
    const response = await Execute(mondayClient, mutation);
    if (response?.data?.create_subitem) {
      return response.data.create_subitem;
    } else {
      throw new Error('Failed to create subitem');
    }
  } catch (err) {
    logger.error({ err, itemId, name }, 'Error creating subitem');
    throw err;
  }
}

const getColumnValue = async (token, itemId, columnId) => {
  try {
    const mondayClient = initMondayClient();
    mondayClient.setToken(token);

    const query = `query {
      items_page (ids: [${itemId}]) {
        items {
          column_values(ids:[${columnId}]) {
            value
          }
        }
      }
    }`;

    const response = await Execute(mondayClient, query);
    if (response?.data?.items_page?.items) {
      return response.data.items_page.items[0].column_values[0].value;
    } else {
      throw new Error('Column value not found');
    }
  } catch (err) {
    logger.error({ err, itemId, columnId }, 'Error getting column value');
    throw err;
  }
};

const ForceComplexityError = async () => {
  const mondayClient = MondayClient();

  const query = `query {
    items_page (limit:50) {
      items {
        id
        board { id name workspace_id description }
        group { id title }
        column_values {
          id
          ...on MirrorValue {
            display_value
          }
          ...on DependencyValue {
            display_value
          }
          ...on BoardRelationValue {
            display_value
          }
          additional_info title value type
        }
        subitems {
          id
          name
          board { id name }
          column_values {
            id
            ...on MirrorValue {
              display_value
            }
            ...on DependencyValue {
              display_value
            }
            ...on BoardRelationValue {
              display_value
            }
            additional_info title value type
          }
        }
      }
    }
  }`;

  return await Execute(mondayClient, query);
}

const HandleError = async (cmd, error) => {
  if (error.error_code === 'ComplexityException') {
    const msgArray = error.error_message.split(' ');
    const span = msgArray.pop();
    const length = msgArray.pop();

    logger.warn("Complexity Exhausted, delaying " + length + " " + span);
    await delayAsync(length * 1000);
    return true;

  } else if (error.error_code === 'ResolverCallsExceeded') {
    logger.warn("Resolver Calls Exceeded, delaying 15 seconds");
    await delayAsync(15000);
    return true;

  } else {
    logger.error({ cmd, error }, "An Unhandled Error occurred");
    return false;
  }
}

const delayAsync = async (ms) => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const setColumnValue = async (boardId, itemId, columnId, value) => {
  const mondayClient = MondayClient();
  const mutation = `mutation {
    change_column_value(board_id: ${boardId}, item_id: ${itemId}, column_id: ${columnId}, value: ${JSON.stringify(value).replace(/"/g, '\\"')}) {
      id
    }
  }`;

  try {
    const response = await Execute(mondayClient, mutation);
    logger.info({ boardId, itemId, columnId, value }, 'Column value set successfully');
    return response;
  } catch (err) {
    logger.error({ err, boardId, itemId, columnId, value }, 'Error setting column value');
    throw err;
  }
}

const setTextColumnValue = async (boardId, itemId, columnId, value) => {
  const mondayClient = MondayClient();
  const mutation = `mutation {
    change_column_value(board_id: ${boardId}, item_id: ${itemId}, column_id: ${columnId}, value: "\\"${value}\\"") {
      id
    }
  }`;

  try {
    const response = await Execute(mondayClient, mutation);
    logger.info({ boardId, itemId, columnId, value }, 'Text column value set successfully');
    return response;
  } catch (err) {
    logger.error({ err, boardId, itemId, columnId, value }, 'Error setting text column value');
    throw err;
  }
}

const mutateColumns = async (boardId, itemId, val) => {
  const mondayClient = MondayClient();
  const mutation = `mutation { 
    change_multiple_column_values (board_id: ${boardId}, item_id: ${itemId}, column_values: "${JSON.stringify(val).replace(/"/g, '\\"')}", create_labels_if_missing: true) {
      id 
    }
  }`;

  try {
    const response = await mondayClient.api(mutation);
    logger.info({ boardId, itemId, val }, 'Multiple column values mutated successfully');
    return response;
  } catch (err) {
    logger.error({ err, boardId, itemId, val }, 'Error mutating multiple column values');
    throw err;
  }
}

const changeColumnValue = async (token, boardId, itemId, columnId, value) => {
  try {
    const mondayClient = initMondayClient({ token });

    const mutation = `mutation {
      change_column_value(board_id: ${boardId}, item_id: ${itemId}, column_id: ${columnId}, value: ${JSON.stringify(value).replace(/"/g, '\\"')}) {
        id
      }
    }`;

    const response = await mondayClient.api(mutation);
    logger.info({ boardId, itemId, columnId, value }, 'Column value changed successfully');
    return response;
  } catch (err) {
    logger.error({ err, boardId, itemId, columnId, value }, 'Error changing column value');
    throw err;
  }
};


module.exports = {
  getItemInfo,
  getMinimumItemInfo,
  getSubitemInfo,
  getColumnValue,
  changeColumnValue,
  setColumnValue,
  createSubitem,
  setTextColumnValue,
  mutateColumns,
  ForceComplexityError,
  GetBoard,
  GetInvalidItemStates,
  getSupportBoardInfo,
  getSupportItemInfo,
  getUpdateInfo,
  deleteUpdate
};
