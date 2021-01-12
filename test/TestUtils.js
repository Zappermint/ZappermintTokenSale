// Source: https://medium.com/fluidity/standing-the-time-of-test-b906fcc374a9
advanceTime = (time) => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_increaseTime',
            params: [time],
            id: new Date().getTime()
        }, (err, result) => {
            if (err) return reject(err);
            return resolve(result);
        });
    });
}
  
advanceBlock = () => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_mine',
            id: new Date().getTime()
        }, (err, result) => {
            if (err) return reject(err);
            return resolve(web3.eth.getBlock('latest'));
        });
    });
}
  
takeSnapshot = () => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_snapshot',
            id: new Date().getTime()
        }, (err, snapshotId) => {
            if (err) return reject(err);
            return resolve(snapshotId);
        });
    });
}
  
revertToSnapShot = (id) => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_revert',
            params: [id],
            id: new Date().getTime()
        }, (err, result) => {
            if (err) return reject(err);
            return resolve(result);
        });
    });
}

advanceTimeAndBlock = async (time) => {
    await advanceTime(time);
    await advanceBlock();
    return Promise.resolve(web3.eth.getBlock('latest'));
}

balanceOf = async (account) => {
    return Promise.resolve(web3.eth.getBalance(account));
}

toDecimal = (bn, decimals) => {
    bn = bn.toString();
    bn = bn.padStart(decimals, "0");
    bn = `${bn.slice(0, bn.length - decimals)}.${bn.slice(bn.length - decimals, decimals)}`;
    return parseFloat(bn);
}

module.exports = {
    advanceTime,
    advanceBlock,
    advanceTimeAndBlock,
    takeSnapshot,
    revertToSnapShot,
    balanceOf,
    toDecimal
}