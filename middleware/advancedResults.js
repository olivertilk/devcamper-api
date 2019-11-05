//The following is middleware that makes the functionality developed for Bootcamps
//available to other models, such as the selecting, sorting and pagination.
//Populating will be passed into this middleware

const advancedResults = (model, populate) => async (req, res, next) => { 

	//The following code allows for select and sort parameters to be included in the query string itself

	//In case a 'select' query param is included, remove it first so that it doesn't get
	//interpreted as a field to filter by
	//1. Copy req.query
	const reqQuery = {...req.query};

	//2. Fields to exclude because they are not actual properties in the database
	const removeFields = ['select', 'sort', 'limit', 'page'];

	//3. Loop over removeFields and delete them from reqQuery
	removeFields.forEach(param => delete reqQuery[param]);


	//Prepend math operators in the query string with a '$' for Mongoose to recognize them
	//This replaces the math operator 'key' in the object with '$key'. First, stringify, then replace, then parse.
	//Then look up from MongoDB using Mongoose
	let queryStr = JSON.stringify(reqQuery);
	queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
	let query = model.find(JSON.parse(queryStr));

	//If the query did include a 'select' field, parse its value to determine which fields to select
	if(req.query.select){
		const fields = req.query.select.split(',').join(' ');
		query = query.select(fields);
	}

	//If 'sort' query param is included
	if(req.query.sort){
		const sortBy = req.query.sort.split(',').join('');
		query = query.sort(sortBy);
	}else{
		query = query.sort('-createdAt');
	}

	//Pagination
	const page = parseInt(req.query.page, 10) || 1;
	const limit = parseInt(req.query.limit, 10) || 10;
	const startIndex = (page - 1) * limit;
	const endIndex = page * limit;
	const total = await model.countDocuments(); //Count all documents in collection

	query = query.skip(startIndex).limit(limit);
	
	//If something was passed in the 'populate' input parameter, populate using it
	if(populate){
		//The populate call looks up the property 'bootcamp' on Courses, looks for the 'ref' field and joins the data
		//from the collection named in the 'ref' field on the objectId field and includes in the returned Courses
		//data. Similar to a join in SQL.
		//query = Course.find().populate('bootcamp');
		query = query.populate(populate);
	}

	//Finally execute the query
	const results = await query;

	//Pagination result
	const pagination = {};
	
	//Include the next page in the pagination result if this is not the last page
	if(endIndex < total){
		pagination.next = {
			page: page + 1,
			limit: limit
		}
	}

	//Include the previous page in the pagination result if this is not the first page
	if(startIndex > 0){
		pagination.prev = {
			page: page - 1,
			limit: limit
		}
	}

	res.advancedResults = {
		success: true,
		count: results.length,
		pagination: pagination,
		data: results
	}

	//Don't forget to call the next middleware, otherwise the request gets stuck
	next();
};


module.exports = advancedResults;