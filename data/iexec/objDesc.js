


export const APP = 'app';
export const DATASET = 'dataset';
export const WORKERPOOL = 'workerpool';
export const REQUEST = 'request';
export const APP_ORDER = 'apporder';
export const DATASET_ORDER = 'datasetorder';
export const WORKERPOOL_ORDER = 'workerpoolorder';
export const REQUEST_ORDER = 'requestorder';
export const NULL_BYTES = '0x';
export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
export const NULL_BYTES32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

export const NULL_DATASETORDER = {
  dataset: NULL_ADDRESS,
  datasetprice: 0,
  volume: 0,
  tag: NULL_BYTES32,
  apprestrict: NULL_ADDRESS,
  workerpoolrestrict: NULL_ADDRESS,
  requesterrestrict: NULL_ADDRESS,
  salt: NULL_BYTES32,
  sign: NULL_BYTES,
};


const objToStructArray = (objName, obj) => {
    const reducer = (total, current) => total.concat([obj[current.name]]);
    return objDesc[objName].structMembers.reduce(reducer, []);
  };
  

  export const signedOrderToStruct = (orderName, orderObj) => {
    const unsigned = objToStructArray(orderName, orderObj);
    return unsigned.concat([orderObj.sign]);
  };
  


export const objDesc = {
    EIP712Domain: {
      primaryType: 'EIP712Domain',
      structMembers: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
    },
    [APP_ORDER]: {
      primaryType: 'AppOrder',
      structMembers: [
        { name: 'app', type: 'address' },
        { name: 'appprice', type: 'uint256' },
        { name: 'volume', type: 'uint256' },
        { name: 'tag', type: 'bytes32' },
        { name: 'datasetrestrict', type: 'address' },
        { name: 'workerpoolrestrict', type: 'address' },
        { name: 'requesterrestrict', type: 'address' },
        { name: 'salt', type: 'bytes32' },
      ],
      contractPropName: 'app',
      ownerMethod: function getAppOwner() { return "not implemented just call contract.owner"; },
      cancelMethod: 'manageAppOrder',
      cancelEvent: 'ClosedAppOrder',
      addressField: 'app',
    },
    [DATASET_ORDER]: {
      primaryType: 'DatasetOrder',
      structMembers: [
        { name: 'dataset', type: 'address' },
        { name: 'datasetprice', type: 'uint256' },
        { name: 'volume', type: 'uint256' },
        { name: 'tag', type: 'bytes32' },
        { name: 'apprestrict', type: 'address' },
        { name: 'workerpoolrestrict', type: 'address' },
        { name: 'requesterrestrict', type: 'address' },
        { name: 'salt', type: 'bytes32' },
      ],
      contractPropName: 'dataset',
      ownerMethod: function getDatasetOwner() { return "not implemented just call contract.owner"; },
      cancelMethod: 'manageDatasetOrder',
      cancelEvent: 'ClosedDatasetOrder',
      addressField: 'dataset',
    },
    [WORKERPOOL_ORDER]: {
      primaryType: 'WorkerpoolOrder',
      structMembers: [
        { name: 'workerpool', type: 'address' },
        { name: 'workerpoolprice', type: 'uint256' },
        { name: 'volume', type: 'uint256' },
        { name: 'tag', type: 'bytes32' },
        { name: 'category', type: 'uint256' },
        { name: 'trust', type: 'uint256' },
        { name: 'apprestrict', type: 'address' },
        { name: 'datasetrestrict', type: 'address' },
        { name: 'requesterrestrict', type: 'address' },
        { name: 'salt', type: 'bytes32' },
      ],
      contractPropName: 'workerpool',
      ownerMethod: function getWorkerpoolOwner() { return "not implemented"; },
      cancelMethod: 'manageWorkerpoolOrder',
      cancelEvent: 'ClosedWorkerpoolOrder',
      addressField: 'workerpool',
    },
    [REQUEST_ORDER]: {
      primaryType: 'RequestOrder',
      structMembers: [
        { name: 'app', type: 'address' },
        { name: 'appmaxprice', type: 'uint256' },
        { name: 'dataset', type: 'address' },
        { name: 'datasetmaxprice', type: 'uint256' },
        { name: 'workerpool', type: 'address' },
        { name: 'workerpoolmaxprice', type: 'uint256' },
        { name: 'requester', type: 'address' },
        { name: 'volume', type: 'uint256' },
        { name: 'tag', type: 'bytes32' },
        { name: 'category', type: 'uint256' },
        { name: 'trust', type: 'uint256' },
        { name: 'beneficiary', type: 'address' },
        { name: 'callback', type: 'address' },
        { name: 'params', type: 'string' },
        { name: 'salt', type: 'bytes32' },
      ],
      cancelMethod: 'manageRequestOrder',
      cancelEvent: 'ClosedRequestOrder',
      addressField: 'requester',
    },
  };
  