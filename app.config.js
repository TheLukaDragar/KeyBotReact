module.exports = ({ config }) => {
    
    return {
        ...config,
        extra: {
            ...config.extra,  // include any existing extra properties
            API_URL: "https://4gkntp89fl.execute-api.eu-central-1.amazonaws.com/development/",
            reputationSCAddress: "0x883957F3bc621DEc82d4522379E67bA4a8118820",
            parcelNFTSCAddress: "0x921E78602E8584389FacEF9cF578Ba8790bb060f",
            RPCUrl: "https://bellecour.iex.ec",
            explorerUrl: "https://blockscout-bellecour.iex.ec",
            DLMDApp: "0x90b44D29851c76A73619106EBd26d61d6f74D918",
            use_demo_device: true,
            
        },
    };
};