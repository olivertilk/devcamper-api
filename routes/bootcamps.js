const express = require('express');
const { 
	getBootcamps, 
	getBootcamp, 
	createBootcamp, 
	updateBootcamp, 
	deleteBootcamp ,
	getBootcampsInRadius,
	bootcampPhotoUpload
} = require('../controllers/bootcamps')

//Pull in the Bootcamp model that will be passed to the advancedResults middleware
const Bootcamp = require('../models/Bootcamp');
//Pull in the middleware that provides advanced functionality
const advancedResults = require('../middleware/advancedResults');

//Include other resource routers
//These are necessary for hitting endpoints such as:
//---> /api/v1/bootcamps/:bootcampId/courses
//---> /api/v1/bootcamps/:bootcampId/reviews
const courseRouter = require('./courses');
const reviewRouter = require('./reviews');

const router = express.Router();

//Import middleware to require authentication
const {protect, authorize} = require('../middleware/auth');

//Reroute into other resource routers
router.use('/:bootcampId/courses', courseRouter);
router.use('/:bootcampId/reviews', reviewRouter);

router.route('/radius/:zipcode/:distance')
	.get(getBootcampsInRadius);

router.route('/:id/photo').put(protect, authorize('publisher', 'admin'), bootcampPhotoUpload);

//The advancedResults middleware takes in two parameters
router.route('/')
	.get(advancedResults(Bootcamp, 'courses'), getBootcamps) //Adding a middleware for getBootcamps
	.post(protect, authorize('publisher', 'admin'), createBootcamp);

router.route('/:id')
	.get(getBootcamp)
	.put(protect, authorize('publisher', 'admin'), updateBootcamp)
	.delete(protect, authorize('publisher', 'admin'), deleteBootcamp);

module.exports = router;