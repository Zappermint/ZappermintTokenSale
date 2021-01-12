const assert = require("assert");

// Source: https://ethereum.stackexchange.com/questions/48627/how-to-catch-revert-error-in-truffle-test-javascript
const PREFIX = "Returned error: VM Exception while processing transaction: ";

async function tryCatch(promise, exception, reason) {
    try {
        await promise;
        assert(false, `Expected ${exception} error`);
    }
    catch (error) {
        assert(error, `Expected ${exception} error`);
        assert(error.message.startsWith(PREFIX + exception), `Expected ${exception} error, but got ${error.message} instead`);
        assert(error.message.includes(reason), `Expected ${reason} reason, but got ${error.message} instead`);
        return Promise.resolve(error.message);
    }
}

revert = async (promise, reason) => {
    return await tryCatch(promise, "revert", reason);
}

outOfGas = async (promise, reason) => {
    return await tryCatch(promise, "out of gas", reason);
}

invalidJump = async (promise, reason) => {
    return await tryCatch(promise, "invalid JUMP", reason);
}

invalidOpcode = async (promise, reason) => {
    return await tryCatch(promise, "invalid opcode", reason);
}

stackOverflow = async (promise, reason) => {
    return await tryCatch(promise, "stack overflow", reason);
}

stackUnderflow = async (promise, reason) => {
    return await tryCatch(promise, "stack underflow", reason);
}

staticStateChange = async (promise, reason) => {
    return await tryCatch(promise, "static state change", reason);
}

module.exports = {
    revert,
    outOfGas,
    invalidJump,
    invalidOpcode,
    stackOverflow,
    stackUnderflow,
    staticStateChange
};