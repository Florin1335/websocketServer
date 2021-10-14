const ws = require("ws");

const PORT = process.env.PORT || 3001;
const wss = new ws.WebSocketServer({ port: PORT });
const map = new Map();

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
