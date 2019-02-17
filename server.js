const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//zengqingbo's solution.
var Schema = mongoose.Schema;
var userSchema = new Schema({
      username : {type: String, required: true},
      exercises: {type: [{description: String, duration: Number, date: { type: Date, default: Date.now } }], default: []}
});

var User = mongoose.model("User", userSchema);

app.post("/api/exercise/new-user", (req,res) => {
  let user = new User({username: req.body.username});
  user.save((err, data) => {
    if (data) {
      res.json({username: data.username, _id: data._id});
    }
  });
});

app.get("/api/exercise/users", (req, res) => {
  User.find((err, users) => {
    if (users)  {
      res.json(users.map( (user) => {
        return {username: user.username, _id: user._id} 
      } ));
    }
  });
});

app.post("/api/exercise/add",(req,res)=>{
  console.log(req.body.userId);
  User.findById(req.body.userId, (err,user)=>{
    if (user.exercises == null) user.exercises = [];
    user.exercises.push({description: req.body.description, duration: req.body.duration, date: req.body.date ? new Date(req.body.date) : new Date()})
    user.save((err, user)=> {
      let exercise = user.exercises.pop()
      res.json({userId:user._id, description: exercise.description, duration: exercise.duration, date: exercise.date })
    });
  });
});

app.get("/api/exercise/log", (req,res) => {
  let userId = req.query.userId
  let from = req.query.from ?  new Date(req.query.from) : new Date(0) ;
  let to = req.query.to ? new Date(req.query.to) : new Date() ;
  let limit = req.query.limit ? Infinity : req.query.limit;
  User.findById(userId, (err,user)=>{
        let exerciseLog = user.exercises.filter( e => ((e.date >= from) && (e.date <= to)) ).map( (e)=> {
          return { description: e.description, duration: e.duration, date: e.date }
        } ).slice(0,limit);
        res.json({username:user.username, log: exerciseLog, count: exerciseLog.length });
  });
});


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
