const initMondayClient = require('monday-sdk-js');

const MondayClient = () => {
  const monday = initMondayClient();
  monday.setToken(
    'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjEwNDEzNzg0NSwidWlkIjoxNjMzMzQ1LCJpYWQiOiIyMDIxLTAzLTI0VDA2OjA1OjAzLjU2MFoiLCJwZXIiOiJtZTp3cml0ZSIsImFjdGlkIjo2OTc5NzksInJnbiI6InVzZTEifQ.F33TvuwKuKzIyipXblbTRrlJ2aAtVA3C9ZPVCZKsIAc'
    )
  return monday;
}

const getSubitemInfo = async (itemId) => {
  const mondayClient = MondayClient();
  const query = 
  `query { items (ids: [${itemId}]) {
        id
        name
        board { id name }
        column_values {
            id text additional_info title value type
          }
      }
    }`;

    const response = await Execute(mondayClient, query);

    if (response?.data?.items)
      return response.data.items[0];

    throw 'Error retrieving Monday Item info' + JSON.stringify(response);
}

const GetBoard = async (boardId) => {

  const mondayClient = MondayClient();
  const query = `query { boards (ids: ${boardId}) {
      workspace_id
      name description
    }
  }`

  const response = await Execute(mondayClient, query);

  //console.log(response);
  if (response?.data?.boards) {
    const board = response.data.boards[0];
      return board;
  }

  throw 'Error retrieving Board Workspace Id: ' + JSON.stringify(response);
}

// should be limited to < 100 ids pre call
const GetInvalidItemStates = async (ids, status) => {
  if (ids.length < 1)
    return [];

  console.log(`QUERYING ITEMS (${status}): ` + JSON.stringify(ids))
  const mondayClient = MondayClient();
  const query = `query { items (ids: [${ids.join(', ')}] limit:100) {
  	  id state
      column_values { title text }
	  }
  }`

  const response = await Execute(mondayClient, query);
  //console.log("INVALID: " + JSON.stringify(response) )
  const invalid = response.data.items.filter(i => {
    if (i.state !== 'active')
      return true; 

    const columns = i.column_values;
    //console.log("FOUND COLUMN VALUES ?" + JSON.stringify(columns))

    if (!columns) return true;

    const statusCols = columns.filter(c => c.title === 'Status');
    if (statusCols.length < 1)
      return true;
      
    const statusCol = statusCols[0].text;
    //console.log("Checking " + statusCol + " === " + status + " " + statusCol.indexOf(status.toString()) < 0);

    if (statusCol.indexOf(status) < 0)
      return true;

    return false;
  }).map(i => i.id);
  return invalid;

}

const getSupportBoardInfo = async(boardId) => {
  const mondayClient = MondayClient();
  const query = `query { boards (ids: [${boardId}]) {
      id name
      groups { id title }
      columns{
        id title settings_str
      }
    }
  }`;

  const response = await Execute(mondayClient, query);

    if (response?.data?.boards)
      return response.data.boards[0];

    throw 'Error retrieving Monday Board info' + JSON.stringify(response);
}

const getSupportItemInfo = async (itemId) => {
  const mondayClient = MondayClient();
  const query = `query { items (ids: [${itemId}]) {
      id
      name
      board { id name }
      group { id title }
      column_values {
          id text additional_info title value type
        }
      created_at
      updated_at
    }
  }`;

  const response = await Execute(mondayClient, query);

    if (response?.data?.items)
      return response.data.items[0];

    throw 'Error retrieving Monday Item info' + JSON.stringify(response);
}

const getMinimumItemInfo = async (itemId) => {
  const mondayClient = MondayClient();
  const query = 
  `query { items (ids: [${itemId}]) {
        id
        name
        board { id name workspace_id description }
        group { id title }
        }
    }`;

    const response = await Execute(mondayClient, query);

    if (response?.data?.items)
      return response.data.items[0];

    throw 'Error retrieving Monday Item info' + JSON.stringify(response);
}

const getItemInfo = async (itemId) => {
  const mondayClient = MondayClient();
  const query = 
  `query { items (ids: [${itemId}]) {
        id
        name
        board { id name workspace_id description }
        group { id title }
        column_values {
            id text additional_info title value type
          }
        subitems{
          board { id name }
          id
          name
          column_values {
            id text additional_info title value type
          }
        }
      }
    }`;

    const response = await Execute(mondayClient, query);

    if (response?.data?.items)
      return response.data.items[0];

    throw 'Error retrieving Monday Item info' + JSON.stringify(response);
}
const createSubitem = async (itemId, name) => {
  const mondayClient = MondayClient();
  const mutation =
      `mutation {
          create_subitem (parent_item_id: ${itemId}, item_name: "${name}") {
              id
              column_values{
                text title id additional_info
              }
              board { id }
          }
      }`

      const response = await Execute(mondayClient, mutation);
      return response.data.create_subitem;
}

const getColumnValue = async (token, itemId, columnId) => {
  try {
    const mondayClient = initMondayClient();
    mondayClient.setToken(token);

    const query = `query {
        items (ids: [${itemId}]) {
          column_values(ids:[${columnId}]) {
            value
          }
        }
      }`;

    const response = await Execute(mondayClient, query);
    return response.data.items[0].column_values[0].value;
  } catch (err) {
    console.error(err);
  }
};

const ForceComplexityError = async () => {
  const mondayClient = MondayClient();

  return await Execute(mondayClient, `query {
      items (limit:50) {
        id
        board { id name workspace_id description }
        group { id title }
        column_values {
          id text additional_info title value type
        }
      subitems{
        id
        name
        board {id name }
        column_values {
          id text additional_info title value type
        }
      }
    }
  }`)
}

const HandleError = async (cmd, error) => {
  if (error.error_code === 'ComplexityException') {
    const msgArray = error.error_message.split(' ');
    const span = msgArray.pop();
    const length = msgArray.pop();

    console.log("Complexity Exhausted, delaying " + length + " " + span);
    await delayAsync(length * 1000);
    return true;

  } else if (error.error_code === 'ResolverCallsExceeded') {
      console.log("Resolver Calls Exceeded, delaying 15 seconds");
      await delayAsync(15000);
      return true;

  } else {
      console.log("An Unhandled Error occured!")
      console.log({cmd, error});
      return false;
  }
}
const Execute = async (mondayClient, cmd, variables) => {
  let result;
    try {
      result = await mondayClient.api(cmd, variables);

      if (result.error_code) {

        const tryAgain = await HandleError(cmd, result);
        if (tryAgain) result = await Execute(mondayClient, cmd, variables);

      }
    } catch( error) {

        console.log("An error has occured that has not been accounted for")
        console.log({cmd, error});
    }
  console.log(result);
  return result;
}

const delayAsync = async (ms) => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const setColumnValue = async (boardId, itemId, columnId, value) => {
  const mondayClient = MondayClient();
  const query = `mutation {
    change_column_value(board_id: ${boardId}, item_id: ${itemId}, column_id: ${columnId}, value: ${JSON.stringify(value).replace(/"/g, '\\"')}) {
      id
    }
  }
  `;

  const response = await Execute(mondayClient, query);
  return response;
}
const setTextColumnValue = async (boardId, itemId, columnId, value) => {
  const mondayClient = MondayClient();
  const query = `mutation {
    change_column_value(board_id: ${boardId}, item_id: ${itemId}, column_id: ${columnId}, value: "\\"${value}\\"") {
      id
    }
  }
  `;
  console.log(query);
  const response = await Execute(mondayClient, query);
  return response;
}
const mutateColumns = async (boardId, itemId, val) => {
  const mondayClient = MondayClient();
  const mutation = `mutation { change_multiple_column_values (board_id: ${boardId}, item_id: ${itemId},
      column_values: "${JSON.stringify(val).replace(/"/g, '\\"')}", create_labels_if_missing: true) 
    { id }
  }`

  const response = await mondayClient.api(mutation);
  return response;
}
const changeColumnValue = async (token, boardId, itemId, columnId, value) => {
  try {
    const mondayClient = initMondayClient({ token });

    const query = `mutation {
        change_column_value(board_id: ${boardId}, item_id: ${itemId}, column_id: ${columnId}, value: ${JSON.stringify(val).replace(/"/g, '\\"')}) {
          id
        }
      }
      `;
    const response = await mondayClient.api(query);
    return response;
  } catch (err) {
    console.error(err);
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
  getSupportItemInfo
};
