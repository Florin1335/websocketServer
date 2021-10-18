const ws = require("ws");
const http = require("http");
const express = require("express");
const app = express();
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

const PORT = process.env.PORT || 3001;
const wsServers = new Map();
//express routes
app.get("/create_room/:name", (req, res) => {
  const roomName = "/" + req.params.name;
  if (roomName.length > 2 && roomName.length < 32 && !wsServers.get(roomName)) {
    const wss = new ws.WebSocketServer({ noServer: true });
    const userMap = new Map();
    wss.userMap = userMap;
    wss.on("connection", (ws, request) => {
      const userMap = wss.userMap;
      ws.on("message", (data, isBinary) => {
        const jsonData = JSON.parse(data.toString());
        if (jsonData)
          switch (jsonData.type) {
            case "onopen": {
              userMap.set(ws, jsonData.payload);
              let users = [];
              for (let pair of userMap) users = [...users, pair[1]];
              wss.clients.forEach((client) => {
                if (client.readyState === ws.OPEN) {
                  if (client === ws) {
                    client.send(
                      JSON.stringify({
                        self: true,
                        connectionMsg: true,
                        message: "You connected to the chat.",
                        users,
                      }),
                      {
                        binary: isBinary,
                      }
                    );
                  } else {
                    client.send(
                      JSON.stringify({
                        self: false,
                        connectionMsg: true,
                        message: jsonData.payload + " connected to the chat.",
                        users,
                      }),
                      {
                        binary: isBinary,
                      }
                    );
                  }
                }
              });
              break;
            }
            case "onmessage": {
              wss.clients.forEach((client) => {
                if (client.readyState === ws.OPEN) {
                  if (client === ws) {
                    client.send(
                      JSON.stringify({
                        self: true,
                        message: `${jsonData.name}: ${jsonData.payload}`,
                      }),
                      {
                        binary: isBinary,
                      }
                    );
                  } else {
                    client.send(
                      JSON.stringify({
                        self: false,
                        message: `${jsonData.name}: ${jsonData.payload}`,
                      }),
                      {
                        binary: isBinary,
                      }
                    );
                  }
                }
              });
              break;
            }
            default:
              break;
          }
      });

      ws.on("close", () => {
        const name = userMap.get(ws);
        userMap.delete(ws);
        let users = [];
        for (let pair of userMap) users = [...users, pair[1]];
        wss.clients.forEach((client) => {
          if (client.readyState === ws.OPEN) {
            client.send(
              JSON.stringify({
                self: false,
                connectionMsg: true,
                message: `${name} disconnected.`,
                users,
              })
            );
          }
        });
        //delete websocketserver when no client is connected
        //if (wss.clients.size) wsServers.delete(roomName);
      });
      wss.userMap = userMap;
    });
    wsServers.set(roomName, wss);
    res.json("Room created sucessfully. Room name: " + roomName.slice(1));
  } else {
    res.status(400).json("Room name is not valid");
  }
});

// http server
const server = http.createServer(app);

// WebSocket server detached from the http server
const wss = new ws.WebSocketServer({ noServer: true });
const map = new Map();

server.on("upgrade", (request, socket, head) => {
  if (request.url === "/") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    const roomWss = wsServers.get(request.url.replace(/%20/g, " "));
    if (roomWss) {
      roomWss.handleUpgrade(request, socket, head, (ws) => {
        roomWss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  }
});

wss.on("connection", (ws, request) => {
  ws.on("message", (data, isBinary) => {
    const jsonData = JSON.parse(data.toString());
    if (jsonData)
      switch (jsonData.type) {
        case "onopen": {
          map.set(ws, jsonData.payload);
          let users = [];
          for (let pair of map) users = [...users, pair[1]];
          wss.clients.forEach((client) => {
            if (client.readyState === ws.OPEN) {
              if (client === ws) {
                client.send(
                  JSON.stringify({
                    self: true,
                    connectionMsg: true,
                    message: "You connected to the chat.",
                    users,
                  }),
                  {
                    binary: isBinary,
                  }
                );
              } else {
                client.send(
                  JSON.stringify({
                    self: false,
                    connectionMsg: true,
                    message: jsonData.payload + " connected to the chat.",
                    users,
                  }),
                  {
                    binary: isBinary,
                  }
                );
              }
            }
          });
          break;
        }
        case "onmessage": {
          wss.clients.forEach((client) => {
            if (client.readyState === ws.OPEN) {
              if (client === ws) {
                client.send(
                  JSON.stringify({
                    self: true,
                    message: `${jsonData.name}: ${jsonData.payload}`,
                  }),
                  {
                    binary: isBinary,
                  }
                );
              } else {
                client.send(
                  JSON.stringify({
                    self: false,
                    message: `${jsonData.name}: ${jsonData.payload}`,
                  }),
                  {
                    binary: isBinary,
                  }
                );
              }
            }
          });
          break;
        }
        default:
          break;
      }
    /*wss.clients.forEach((client) => {
      if (client.readyState === ws.OPEN) {
        client.send(data, { binary: isBinary });
      }
    });*/
  });

  ws.on("close", () => {
    const name = map.get(ws);
    map.delete(ws);
    let users = [];
    for (let pair of map) users = [...users, pair[1]];
    wss.clients.forEach((client) => {
      if (client.readyState === ws.OPEN) {
        client.send(
          JSON.stringify({
            self: false,
            connectionMsg: true,
            message: `${name} disconnected.`,
            users,
          })
        );
      }
    });
  });
});
setInterval(() => {
  for (let [key, wss] of wsServers)
    if (wss.clients.size === 0) wsServers.delete(key);
}, 1000000);
server.listen(PORT, () => {
  console.log("Server listening on port " + PORT);
});
