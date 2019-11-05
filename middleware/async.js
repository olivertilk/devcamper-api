
//The purpose of this async handler is to avoid repeating the try/catch
//blocks in each of the controller methods. When the database call returns and 
//the promise gets resolved, the function passed to asyncHandler will be run
//instead of the previous try{} blocks. When there is an error, the promise's
//.catch function handles it, instead of the previous catch {}. 
const asyncHandler = fn => (req, res, next) =>
	Promise
		.resolve(fn(req, res, next))
		.catch(next);

module.exports = asyncHandler;