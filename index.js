var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var parser = require("language");
eval(parser.readFileSync('language.js')+'');
var port = process.env.PORT || 80;
var data = {"bot":[],"projectile":[]};
var clients = []
var PI = Math.PI;
cmndList = ['JMP', 'MOV', 'ROT', 'SHT']

function Bot (clientId,x,y,botName,code) {
    this.clientId = clientId;
    this.botName = botName;
    this.x = x;
    this.y = y;
    this.angle = 0;
    //this.code = codeFunc;
    this.code = code;
    this.color = '#'+(Math.random()*0xFFFFFF<<0).toString(16);
    this.score = 0;
    this.turnsTillShot = 5;
}

function Projectile(clientId,x,y,angle) {
    this.clientId = clientId;
    this.x = x;
    this.y = y;
    this.angle = angle;
}

function indexCommand(inputCmnd) {
	for (validCmnd in cmndList) {
		if (cmndList[validCmnd] == inputCmnd) {
			return validCmnd
		}
	}
	return cmndList.length
}

function validateList(input) {
	instructionList = [];
	for (line in input) {
		var params = input[line].split(" ")
		var index = indexCommand(params[0])
		console.log(index)
		if (index != cmndList.length) {
			instructionList.push([index, parseInt(params[1])])
		} else {
			return false
		}
	}
	return instructionList;
}

function execAssembly(cmnd, val) {
	switch (cmnd) {
		case 0:
			jmp(val)
			break;
		case 1:
			mov(val)
			break;
		case 2:
			rot(val)
			break;
		case 3:
			shoot()
			break;
		default:
			console.log("PANIC!")
	}
}


function botShoot(clientId) {
  var bot = getBot(clientId);
  if (bot["turnsTillShot"] == 0) {
    data["projectile"].push(new Projectile(clientId,bot["x"]+5,bot["y"]+5,bot["angle"]-PI/2));
    bot["turnsTillShot"] = 5;
  }
}

function moveBot(clientId,distanceX,distanceY) {
  var i = 0;
  while (i < data["bot"].length) {
    if (data["bot"][i]["clientId"] == clientId) {
      if ((data["bot"][i]["x"] + distanceX < 1000) && (data["bot"][i]["x"] + distanceX > 0)) {
  data["bot"][i]["x"] += distanceX;
      }
      if ((data["bot"][i]["y"] + distanceY < 500) && (data["bot"][i]["y"] + distanceY > 0)) {
  data["bot"][i]["y"] += distanceY;
      }
      return true;
    }
    i++;
  }
}

function rotateBot(clientId,rad) {
  var i = 0;
  while (i < data["bot"].length) {
      if (data["bot"][i]["clientId"] == clientId) {
  data["bot"][i]["angle"] = data["bot"][i]["angle"] + rad;
  if (data["bot"][i]["angle"] >= 2*PI) {
    data["bot"][i]["angle"] = data["bot"][i]["angle"] - 2*PI;
  } else if (data["bot"][i]["angle"] < 0) {
    data["bot"][i]["angle"] = data["bot"][i]["angle"] + 2*PI;
  }
  return true;
      }
      i++;
  }
}

//Server goodness
server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

//Routing
app.use('/', express.static('public'));

function deleteClient(clientId) {
  var i = 0;
  var removed = false;
  while ((i < clients.length) && (!removed)) {
    if (clients[i] == clientId) {
      clients.splice(i,1);
      removed = true;
      return true;
    }
    i++;
  }
}

function deleteBot(clientId) {
  var i = 0;
  removed = false;
  while ((i < data["bot"].length) && (!removed)) {
    if (data["bot"][i]["clientId"] == clientId) {
      data["bot"].splice(i,1);
      removed = true;
      return true;
    }
    i++;
  }
}

function hasBot(clientId) {
  var i = 0;
  while (i < data["bot"].length) {
    if (data["bot"][i]["clientId"] == clientId) {
      return true;
    }
    i++;
  }
  return false;
}

function getBot(clientId) {
  var i = 0;
  while (i < data["bot"].length) {
    if (data["bot"][i]["clientId"] == clientId) {
      return data["bot"][i];
    }
    i++;
  }
  return false;
}

//Socket Goodness
io.on('connection', function(socket){
  console.log('A user has connected');
  clients.push(socket.id);
  socket.on('code submission', function(name,code){
    console.log("Creating new bot "+code);
    if (hasBot(socket.id)) {
      deleteBot(socket.id);
    }
    console.log("Creating new bot "+code);
    data["bot"].push(new Bot(socket.id,randInt(0,999),randInt(0,499),name,code));
  });
  socket.on('disconnect', function(){
    console.log('user disconnected');
    deleteBot(socket.id);
    deleteClient(socket.id);
  });
});

function updateBoardTick() {
  // console.log(data);
  for (i = 0; i < data["bot"].length; i++) {
    botClientId = data["bot"][i]["clientId"];
    //moveBot(botClientId,randInt(-10,10),randInt(-10,10));
    if (data["bot"][i]["turnsTillShot"] > 0) {
      data["bot"][i]["turnsTillShot"] -= 1;
    }
    rotateBot(botClientId,0.1);
    botShoot(botClientId);
  }
  for (i = 0; i < data["projectile"].length; i++) {
    data["projectile"][i]["x"] += 5*Math.cos(data["projectile"][i]["angle"]);
    data["projectile"][i]["y"] += 5*Math.sin(data["projectile"][i]["angle"]);
    if ((data["projectile"][i]["x"] > 1000) || (data["projectile"][i]["x"] < 0) || (data["projectile"][i]["y"] < 0) || (data["projectile"][i]["y"] > 500))  {
      data["projectile"].splice(i,1);
    }
  }
  io.sockets.emit('board-update', data);
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

setInterval(updateBoardTick,100);
