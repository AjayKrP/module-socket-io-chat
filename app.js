const express = require('express');
const app = express();
const ejs = require('ejs');

var user = require('./models/user');

var credentials = require('./credentials.json');

var passport = require('passport'),
    TwitterStrategy = require('passport-twitter').Strategy,
    FacebookStrategy = require('passport-facebook').Strategy;

passport.use(new FacebookStrategy({
        clientID: credentials.facebook.app_id,
        clientSecret: credentials.facebook.app_secret,
        callbackURL: credentials.facebook.callback,
        profileFields:['id','displayName','emails']
    }, function(accessToken, refreshToken, profile, done) {
        console.log(profile);
        var me = new user({
            email:profile.emails[0].value,
            name:profile.displayName
        });

        /* save if new */
        user.findOne({email:me.email}, function(err, u) {
            if(!u) {
                me.save(function(err, me) {
                    if(err) return done(err);
                    done(null,me);
                });
            } else {
                console.log(u);
                done(null, u);
            }
        });
    }
));

passport.use(new TwitterStrategy({
        consumerKey: credentials.twitter.consumer_key,
        consumerSecret: credentials.twitter.consumer_secret,
        callbackURL: credentials.twitter.callback,
        includeEmail:true
    },
    function(token, tokenSecret, profile, done) {

        var me = new user({
            email:profile.emails[0].value,
            name:profile.displayName
        });

        /* save if new */
        user.findOne({email:me.email}, function(err, u) {
            if(!u) {
                me.save(function(err, me) {
                    if(err) return done(err);
                    done(null,me);
                });
            } else {
                console.log(u);
                done(null, u);
            }
        });

    }
));

passport.serializeUser(function(user, done) {
    console.log(user);
    done(null, user._id);
});

passport.deserializeUser(function(id, done) {
    user.findById(id, function(err, user) {
        done(err, user);
    });
});


app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')({
    resave:false,
    saveUninitialized:false,
    secret:credentials.cookieSecret
}));

app.use(passport.initialize());
app.use(passport.session());


app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));


var mongoose = require('mongoose');
var opts = {
    server: {
        socketOptions: { keepAlive: 1 }
    }
};

switch(app.get('env')) {
    case 'development':
        mongoose.connect(credentials.mongo.development.connectionString, opts);
        break;
    case 'production':
        mongoose.connect(credentials.mongo.production.connectionString, opts);
        break;
    default:
        throw new error('Unknown execution environment: ', app.get('env'));
}



function isLoggedIn(req, res, next) {
    req.loggedIn = !!req.user;
    next();
}

app.get('/', isLoggedIn, function(req, res) {
    res.render('index', {
        title:'Welcome to Fool',
        loggedIn:req.loggedIn
    });
});

app.get('/auth/facebook', passport.authenticate('facebook', {scope:"email"}));
app.get('/auth/facebook/callback', passport.authenticate('facebook',
    { successRedirect: '/', failureRedirect: '/login' }));

app.get('/auth/twitter', passport.authenticate('twitter', {scope:['include_email=true']}));
app.get('/auth/twitter/callback', passport.authenticate('twitter',
    { successRedirect: '/', failureRedirect: '/login' }));

app.get('/login', isLoggedIn, function(req, res) {
    if(req.loggedIn) res.redirect('/');
    console.log(req.loggedIn);
    res.render('login', {
        title:'Login/Registration'
    });
});

// 500 error handler (middleware)
app.use(function(err, req, res, next){
    console.error(err.stack);
    res.status(500);
    res.render('error');
});

const server = app.listen(4000);
const io = require('socket.io')(server);

io.on('connection', (socket) => {
    console.log(socket.id);
    socket.username = "Anonymous";
    socket.on('send_message', (data) => {
        console.log(data.message)
    });
    socket.on('new_message', (data) => {
        io.sockets.emit('new_message', {message: data.message, username: socket.username})
    });
    socket.on('typing', (data) => {
        socket.broadcast.emit('typing', {username: socket.username})
    })
});

