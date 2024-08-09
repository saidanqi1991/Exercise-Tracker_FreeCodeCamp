const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })

//Create schemas and models for users and exericeses 
const userSchema = new mongoose.Schema({
  username: {type: String, required: true},
}, { versionKey: false });
const exerciseSchema = new mongoose.Schema({
  userid: String,
  description: String,
  duration: Number,
  date: String
}, { versionKey: false });
const userModel = mongoose.model('userModel2', userSchema);
const exerciseModel = mongoose.model('exerciseModel2', exerciseSchema);

//post users
app.post('/api/users', async (req, res) => {
  //check if user exists
  const user = await userModel.findOne({username: req.body.username});
  if(user) {
    return res.json({username: user.username, _id: user['_id']});
  } else {
    //create new user 
    const newUser = new userModel({
      username: req.body.username,
    });
    
    let savedUser = await newUser.save();
    return res.json({username: savedUser.username, _id: savedUser['_id']});
  }
});

app.get("/api/users", async (req, res) => {
  const users = await userModel.find();
  return res.json(users);
})

//post exercises
app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const description = req.body.description;
  const duration = req.body.duration;
  const date = req.body.date ? new Date(req.body.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  
  //check if user exists
  const user = await userModel.findOne({_id: id});
  
  if(!user){
    //return error if user doesn't exist
    return res.json({error: "User not found"});
  } else {
    //crearte new exercise
    const newExercise = new exerciseModel({
      userid: id,
      description: description,
      duration: duration,
      date: date || new Date().toDateString()
    })
    let savedExercise = await newExercise.save();
    
    //return user object with exercise
    return res.json({
      username: user.username,
      date: new Date(savedExercise.date).toDateString(),
      duration: savedExercise.duration,
      description: savedExercise.description,
      _id: savedExercise._id
    });
  };
});

//get user's exercise log
app.get("/api/users/:_id/logs", async (req, res) => {
  const id = req.params._id;
  const { from, to, limit } = req.query;
  
  const user = await userModel.findOne({_id: id});
  //Check if user exists
  if(!user){
    //return error if user doesn't exist
    return res.json({error: "User not found"});
  } 

  //Build the query for exercises
  let exerciseQuery = { userid: id };
  if(from || to){
    exerciseQuery.date = {};
    if (from) exerciseQuery.date.$gte = new Date(from).toISOString().split('T')[0];
    if (to) exerciseQuery.date.$lte = new Date(to).toISOString().split('T')[0];
  }

  //Find  the exercises with constructed query
  let exercises = exerciseModel.find(exerciseQuery).select('description duration date');
  //Apply limit if provided
  if(limit) {
    exercises = exercises.limit(parseInt(limit));
  };
  
  const exerciseResults = await exercises.exec();
  
 
  //return user object with exercises
  return res.json({
    username: user.username,
    count: exerciseResults.length,
    id: user._id,
    log: exerciseResults.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString()
    }))
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
