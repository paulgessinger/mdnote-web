#!/usr/bin/env node
const express = require('express');
var path = require("path");
var glob = require("globby");
var _ = require("lodash");
var moment = require("moment");
var fs = require("fs-promise");
var watch = require('node-watch');
const fileUpload = require('express-fileupload');
const execSync = require("child_process").execSync;

const {renderMarkdownFile} = require("../src/common");

function sleep(t) {
  return new Promise((reject, resolve) => setTimeout(resolve, t));
}

//console.log(process.argv);
var DATA_PATH;
if(process.argv.length > 2) {
  DATA_PATH = path.resolve(process.argv[2]);
}
else {
  DATA_PATH = path.join(path.dirname(__dirname), "data");
}

const MD_PATH = path.join(DATA_PATH, "md");
const ASSET_PATH = path.join(DATA_PATH, "md", "assets");
//console.log(MD_PATH);

var app = express();
var server = require('http').createServer(app);  
var io = require('socket.io')(server);

app.use(fileUpload());

function getPdfSize(file) {
  const p = path.join(path.dirname(ASSET_PATH), file);
  //const cmd = `identify -format "%[pdf:HiResBoundingBox]" ${p}`;
  const cmd = `sips -g pixelHeight -g pixelWidth ${p}`;

  //console.log("exec", cmd);
  const stdout = execSync(cmd).toString();
  //console.log(stdout);
  
  var lines = stdout.split("\n");
  var x = parseInt(lines[2].split(":")[1])
  var y = parseInt(lines[1].split(":")[1])


  //const out = stdout.split("+");
  //const dim = out[0].split("x");
  //var [y, x] = dim;
  //x = parseInt(x);
  //y = parseInt(y);
  return {x, y};
}




var open_files = [];

io.on("connection", (socket) => {
  console.log("incoming socket connection");
  var watcher;
  
  //var update;
  //function update(p) {
    //console.log("adding watcher for", p);
    //return async (e, o) => {
      ////const p = path.join(MD_PATH, filename);
      //const html = await renderMarkdownFile(p);
      //console.log("sending update for", p);
      //socket.emit("update", {file: p, html:html, exists: true});
      //watcher.close();
      //await sleep(1000);
      //watcher = fs.watch(p, update(p));
    //};
  //};
  
  //async function update(p) {
    //console.log("update", p);
  //}

  var open_file;

  var update = async (e, f) => {
    console.log("change detected", e, f);
    console.log("sending update for", open_file);
    if(!open_file) return;
    if(!_.endsWith(open_file, ".md")) return;
    //await sleep(300);
    const html = await renderMarkdownFile(open_file);
    const mdsrc = await fs.readFile(open_file, "utf-8");
    socket.emit("update", {file: open_file, html:html, md: mdsrc, exists: true});
  };
  update = _.debounce(update, 200);

  var watcher = fs.watch(MD_PATH, update);

  socket.on("open", async (data) => { 
    //socket.join(data.file);
    const p = path.join(MD_PATH, data.file+".md");
    //console.log("file", p);
    console.log("client opens", p);
    open_file = p;

    // send initial
    //const html = await renderMarkdownFile(p);
    const exists = await fs.exists(p);
    if(exists) {
      var md = await fs.readFile(p, "utf-8");
    }
    else {
      var md = ''
    }
    socket.emit("update", {
      file: data.file, 
      //html:html,
      md:md, 
      exists: exists
    });
    
    if(exists) {
      //watcher = fs.watch(p, update(p));
      //watcher = watch(p);
      //watcher.on("change", update);
    }
  });
  socket.on("close", (data) => { 
    console.log("client closes", data.file);
    open_file = undefined;
    //if(watcher) {
      //watcher.close();
      //watcher = undefined;
    //}    //socket.leave(data.file) 
  });

  socket.on("save", async (data) => {
    //console.log(data);
    const day = moment(data.day);
    const file = path.join(MD_PATH, day.format("YYYY-MM-DD")+".md");
    await fs.writeFile(file, data.md);
  });

  socket.on("create", async (data) => {
    const mdfile = path.join(MD_PATH, data.day+".md");
    const asset = path.join(ASSET_PATH, data.day);
    var day = moment(data.day);
    const day_formatted = day.format("DD.MM.YYYY");

    const mdsrc = `# ${day_formatted}`;

    const html = md.render(mdsrc);

    socket.emit("update", {
      file: data.day, 
      //html:html, 
      md:mdsrc,
      exists:true
    });
    //console.log(data, mdsrc);

    await fs.writeFile(mdfile, mdsrc, {encoding: "utf-8"});
    //console.log("add watcher for", mdfile);
    open_file = mdfile;
    //watcher = fs.watch(mdfile, update(mdfile));
    console.log("asset", asset);
    if(!await fs.exists(asset)) {
      await fs.mkdir(asset);
    }
  });
});

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});



app.get("/days", async (req, res) => {
  const files = await glob(path.join(MD_PATH, "*.md"));
  var days = _.map(files, f => path.basename(f).replace(/\.md/g, ""));
  res.send(days);
});

app.get("/days/:day", async (req, res) => {
  //res.send(req.params.day);
  const p = path.join(MD_PATH, req.params.day+".md");
  console.log(p);
  const exists = await fs.exists(p);

  if(!exists) {
    res.status(404).send("not found");
    return;
  }

  const html = await renderMarkdownFile(p);
  res.send(html);
});

app.post("/days/:day", async (req, res) => {
  // create
  const mdfile = path.join(MD_PATH, req.params.day+".md");
  const asset = path.join(ASSET_PATH, req.params.day);
  await fs.writeFile(mdfile, "", {encoding: "utf-8"});
  if(!await fs.exists(asset)) {
    await fs.mkdir(asset);
  }
  res.send("");
});

const TMP_PATH = path.join(path.dirname(__dirname), "tmp");
app.post("/days/:day/upload", async (req, res) => {
  //console.log(req.files);
  
  var dest = path.join(ASSET_PATH, req.params.day, req.files.file.name);
  if(await fs.exists(dest)) {
    var bn = path.basename(dest);
    var dir = path.dirname(dest);
    const rnd = Math.random().toString(36).substring(7);
    dest = path.join(dir, rnd+bn);
  }
  const pub_dest = path.join("assets", req.params.day, path.basename(dest));

  //console.log(dest);
  req.files.file.mv(dest);
  const mdfile = path.join(MD_PATH, req.params.day+".md");
  const origmd = await fs.readFile(mdfile, "utf-8");
  console.log(origmd);
  var newmd = origmd + "\n" + `![](${pub_dest})`;
  await fs.writeFile(mdfile, newmd, {encoding: "utf-8"});

  res.end();
});


app.use("/assets", async (req, res) => {
  const file = path.join(MD_PATH, "assets", req.url);
  //res.send(req.url);
  //console.log(file);
  if(!await fs.exists(file)) {
    res.status(404).end();
    return;
  }

  res.sendFile(file);

});

//app.get("/", (req, res) => {
  //res.send("hallo");
//});
app.use(express.static('build'));

app.get("/*", (req, res) => {
  res.sendFile(path.join(path.dirname(__dirname), './build', 'index.html'));
});

//app.listen(3001, () => {});
server.listen(3001)
