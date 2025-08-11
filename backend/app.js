const express = require('express');
const path = require('path');
// const fs = require('fs').promises;
require('dotenv').config();
const mongoose = require('./db'); //connects to DB
const Recipe = require('./models/recipe');
const User = require('./models/user');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;


/****************************USE/SET METHODS**************************************/
//Middleware
app.use(express.urlencoded({extended: true}));
app.use(express.json());

//Make user available on all sessions
app.use(session({
  secret: process.env.SESSION_KEY, 
  resave: false,
  saveUninitialized: false
}));

app.use((req, res, next) => {
  res.locals.user = req.session.userName || null;
  next();
});

app.set('view engine', 'ejs');
app.set('views',path.join(__dirname, '..', 'frontend', 'views'));
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));
app.listen(PORT, () => {
  console.log(`Recipe app running at http://localhost:${PORT}`);
});
/****************************GET METHODS*****************************************/
//Home View
app.get('/', (req, res) => {
    res.render('index', { title: 'Log In', error1: '', error2: '' });
});

//Register View
app.get('/register', (req, res) => {
    res.render('register', { title: 'Register', error1: '', error2: '', error3: '' });
});

//Log Out View
app.get('/logOut', (req, res) => { 
    //Discard stored username
    req.session.destroy(() => {
      res.render('log-out', { title: 'Log Out' });
  });
});

//Dashboard View
app.get('/dashboard', async (req, res, next) => {
  try {
    //Filter recipes by channel
    let { channel } = req.query;

    let filter = {};
    if (channel) {
      filter.forumSection = channel;
    }
    else{
      channel = 'main';
    }

    const recipes = await Recipe.find(filter);
    res.render('dashboard', { recipes, title: 'Dashboard', channel });
  } catch (err) {
    next(err);
  }
});

//Redirect to "Create a New Recipe" page
app.get('/create', (req, res) =>{
    const { channel } = req.query;
    res.render('create', { title: 'Create', channel });
});
//View a Single Recipe
app.get('/recipe', (req, res) =>{
    res.render('recipe', { title: 'Recipe' });
});

app.get('/recipe/:id', async (req, res) => {
    const recipe = await Recipe.findById(req.params.id);
    res.render('recipe', { title: 'Recipe', recipe });
});

/****************************POST METHODS*****************************************/
//Create a new recipe
app.post('/create', async (req, res, next) => {
    try{
      const { channel } = req.query;
      req.body.forumSection = channel;
      req.body.author = req.session.userName;
      req.body.ingredients = req.body.ingredients // split ingredients by commas
                .split(',')
                .map(i => i.trim())
                .filter(i => i);
        
        // req.body.tag = req.body.tag                 // split tags by commas
        //         .split(',')
        //         .map(i => i.trim())
        //         .filter(i => i);
      req.body.recipeSteps = req.body.recipeSteps// split recipe steps by line breaks
                .split(/\r?\n/)   
                .map(s => s.trim())
                .filter(s => s);
      await Recipe.create(req.body);
      res.redirect(`/dashboard?channel=${encodeURIComponent(channel)}`);
    } catch (err){
        next(err);
        console.error('Error saving to MongoDB:', err);
        res.status(500).send('<h1>Failed to save recipe</h1>');
    }
});

//Register a new user
app.post('/newUser', async (req,res) => {
  try {
    const { name, userName, email, password, confirm_password } = req.body;
    
    
    let error1 = '';
    let error2 = '';
    let error3 = '';
    let error4 = '';
    let error5 = '';

    const userNameFromDB = await User.findOne({ userName }); //Try to find if username is already registered
    if (userNameFromDB) {
        error1 = 'User already exists.';
    }

    const userEmailFromDB = await User.findOne({ email }); //Try to find if email is already registered
    if (userEmailFromDB) {
        error2 = 'Email already exists.';
    }

    if (password !== confirm_password) {                  //Check if passwords do not match
      error3 = 'Passwords do not match.';
    }

    if (password.length < 8) {                            //Check password length
      error4 = 'Enter a password that is at least 8 characters long.';
    }

    const hasFullNo =  /[-+]?\d*\.?\d+/.test(password);
    if (!hasFullNo) {                                     //Check for an integer in the password
      error5 = 'Enter a password that contains at least one number.';
    }

    if (error1 || error2 || error3) {
      return res.render('register', {
        title: 'Register',
        error1,
        error2,
        error3,
        error4,
        error5,
        formData: req.body // Preserve form data
      });
    }

    const saltRounds = 10; 
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = new User({ name, userName, email, password: hashedPassword});
    await newUser.save();
    
    req.session.userName = userName;
    const recipes = await Recipe.find();
    res.render('dashboard', { recipes, title: 'Dashboard', user: userName, channel: 'main' });
  } catch (err) {
    console.error('Validation error:', err.message);
    res.status(400).send(`<h1>Validation failed</h1><p>${err.message}</p>`);
  }
})

//Log In
app.post('/login', async (req, res) =>{
  const { email, password } = req.body;
  let error1 = '';
  let error2 = '';
  try {
    const user = await User.findOne({ email });

    if (!user) {
        return res.render('index', { 
        title: 'Log In', 
        error1: 'Invalid username', 
        error2: '' 
      });
      }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (isPasswordValid) {
      req.session.userName = user.userName;       // Store username in session
      res.redirect('/dashboard');
    } else {
      // Password is incorrect
      return res.render('index', { 
        title: 'Log In', 
        error1: '', 
        error2: 'Invalid email or password' 
      });
    }
  } catch (error) {
    res.status(500).send(`<h1>Server error</h1><p>${error.message}</p>`);
  }
})

//Handle comments
app.post('/comment/:id', async (req, res, next) => {
    try{
        const commentData = {
            text: req.body.comments,
            author: req.session.userName // store the logged-in user
        };
        await Recipe.findByIdAndUpdate(req.params.id, { $push: { comments: commentData }});
        res.redirect(`/recipe/${req.params.id}`);
    } catch (err){
        next(err);
        console.error('Error saving to MongoDB:', err);
    }
});

//Handle Server Error
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send(`<h1>Server Error</h1><p>${err.message}</p>`);
});


// For Vercel deployment
// module.exports = app;

