var express = require('express');
var app = express();
var yelp = require('yelp-fusion');
var client = yelp.client(process.env.YELPAPIKEY);
var passport = require('passport')
var TwitterStrategy = require('passport-twitter').Strategy;
var session = require('express-session')
var bodyParser = require('body-parser')
var MongoStore = require('connect-mongo')(session);
var mongodb = require('mongodb')
var ObjectId = require('mongodb').ObjectID;
var cookieParser = require('cookie-parser')

app.use(cookieParser())
app.use((session)(
  {
    secret: 'keyboard cat', 
    resave: true, saveUninitialized: true,
    cookie: {
      maxAge: 10 * 60 * 1000,
      activeDuration: 10 * 60 * 1000,
    },
    store : new MongoStore({
      url : process.env.MONGODB
    })
   }
));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static('myApp'));

var consumerKey = process.env.CLIENTID,
    consumerSecret = process.env.SECRETID,
    callback = process.env.CALLBACKURL

passport.use(new TwitterStrategy({
    consumerKey: consumerKey,
    consumerSecret: consumerSecret,
    callbackURL: callback
  },
  function(token, tokenSecret, profile, done) {
    return done(null, profile);
  }
));
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

app.get("/login", passport.authenticate('twitter'));
app.get('/api/authorization', passport.authenticate('twitter', { successRedirect: '/',
                                     failureRedirect: '/login' }
));

app.get("/", function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.post("/search/:location", function (req, res) {
  res.cookie('location', req.params.location, {maxAge: 10*60*1000, httpOnly: true})
  client.search({
    location: req.params.location,
    categories: "nightlife,All",
    limit : 20
  }).then(response => {
    var result = response.jsonBody.businesses
    res.json(result)
  }).catch(e => {
    console.log(e);
  });  
});

app.post("/update/:id/:term", function (req, res) {
  if (req.session.hasOwnProperty("passport")){
    mongodb.connect(process.env.MONGODB2, function (err, client){
      if (err) {console.log(err)}
      var db = client.db("nightlife-search-record")
      var collection = db.collection("going-places")
      collection.find({_id: req.params.id}).toArray(function(err, data) {
        if (err) throw err;
        if (data.length === 0){
          collection.insert({_id: req.params.id, going : [req.user.username], total : 1}, function(err, data){
            if (err) throw err;
            res.send("Going : 1")
          })
        } else if (data.length === 1) {
          var found = data[0].going.find(function (user){
            return user === req.user.username
          })
          if (found === undefined){
            collection.update({_id: req.params.id}, {$inc: {total : 1}, $push: {going : req.user.username}}, function(err, response) {
              if (err) throw err;
              collection.find({_id: req.params.id}).toArray(function(err, data) {
                if (err) throw err;
                res.send("Going : "+data[0].total)
                client.close()
              })
            })
          } else {
            collection.update({_id: req.params.id}, {$inc: {total : -1}, $pull: {going : req.user.username}}, function(err, response) {
              if (err) throw err;
              collection.find({_id: req.params.id}).toArray(function(err, data) {
                if (err) throw err;
                if (data[0].total === 0) {
                  collection.remove({_id: req.params.id})
                  res.send("Going : 0")
                } else { 
                  res.send("Going : "+data[0].total)
                }
                client.close()
              })
            })
          }
        }
      })
    })
  } else {
    res.send("login")
  }
});
app.post("/allresults", function (req, res) {
  mongodb.connect(process.env.MONGODB2, function (err, client){
    if (err) {console.log(err)}
    var db = client.db("nightlife-search-record")
    var collection = db.collection("going-places")
    collection.find({}).toArray(function(err, data) {
      if (err) throw err;
      res.json(data)
    })
  })
})
app.post('/check', function(req, res){
  if (req.session.hasOwnProperty("passport") && req.cookies.location){
    res.send(req.cookies.location)
  } else (res.send("not logged"))
})
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
