npm init -y
npm install express mongoose dotenv ejs bcrypt

npm install --save-dev nodemon
add script
"scripts": {
  "start": "node app.js",
  "dev": "nodemon app.js"
}
Run in development mode with npm run dev

Can add nodemon.json:
{
  "watch": [
    "./",
    "../frontend/views",
    "../frontend/public"
  ],
  "ext": "js,json,ejs,css,html",
  "exec": "node app.js"
}
