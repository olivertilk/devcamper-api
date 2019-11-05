const express = require('express');
const { 
	getCourses,
	getCourse,
	addCourse,
	updateCourse,
	deleteCourse
} = require('../controllers/courses');

const Course = require('../models/Course');


//Must pass in an object with mergeParams to this router because we are merging 
//the Bootcamps route with this route.
//Only available in Express >4.5.0
//This makes it so you don't have to manually reassign the parent router's param to 
//the request object of the child router
const router = express.Router({mergeParams: true});

//Import middleware to require authentication
const {protect, authorize} = require('../middleware/auth');

//Pull in the middleware that provides advanced functionality
const advancedResults = require('../middleware/advancedResults');

router.route('/')
	.get(advancedResults(Course, {
		path: 'bootcamp',
		select: 'name description'
	}), getCourses)
	.post(protect, authorize('publisher', 'admin'), addCourse);

router.route('/:id')
	.get(getCourse)
	.put(protect, authorize('publisher', 'admin'), updateCourse)
	.delete(protect, authorize('publisher', 'admin'), deleteCourse);

module.exports = router;