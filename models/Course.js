const mongoose = require('mongoose');
const slugify = require('slugify');
const geocoder = require('../utils/geocoder');

//The Course Schema contains a field for a bootcamp ID. The ref property is included to tell
//Mongoose to use the 'Bootcamp' collection to reference the object ID. 'Ref' is used when a 
// .populate call is made in courses.js in the 'controllers' folder.
const CourseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      required: [true, 'Please add a course title']
    },
    description: {
      type: String,
      required: [true, 'Please add a course description']
    },
    weeks: {
      type: String,
      required: [true, 'Please add number of weeks']
    },
    tuition: {
      type: Number,
      required: [true, 'Please add a description']
    },
    minimumSkill: {
      type: String,
      required: [true, 'Please add a minimum skill'],
      enum: ['beginner', 'intermediate', 'advanced']
    },
    scholarshipAvailable: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    bootcamp: {
      type: mongoose.Schema.ObjectId,
      ref: 'Bootcamp',
      required: true
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    }
  });

// Static method to get avg of course tuitions
CourseSchema.statics.getAverageCost = async function(bootcampId) {
  //'This' refers to the model
  const obj = await this.aggregate([
    {
      $match: { bootcamp: bootcampId }
    },
    {
      $group: {
        _id: '$bootcamp',
        averageCost: { $avg: '$tuition' }
      }
    }
  ]);

  //console.log(obj);

  try {
    await this.model('Bootcamp').findByIdAndUpdate(bootcampId, {
      averageCost: Math.ceil(obj[0].averageCost / 10) * 10
    });
  } catch (err) {
    console.error(err);
  }
};

//Whenever a new course is created, this function runs to update the average cost of the
//entire bootcamp.
CourseSchema.post('save', function() {
  //This.constructor has access to the static getAverageCost function
  this.constructor.getAverageCost(this.bootcamp);
});

//Whenever a course is deleted, this function runs to update the average cost of the
//entire bootcamp.
CourseSchema.pre('remove', function() {
  //This.constructor has access to the static getAverageCost function
  this.constructor.getAverageCost(this.bootcamp);
});



module.exports = mongoose.model('Course', CourseSchema);