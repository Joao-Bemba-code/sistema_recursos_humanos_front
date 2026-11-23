// Ponto de entrada para deploy Node.js no Hostinger.
// O hPanel executa "node server.js" e disponibiliza a porta em process.env.PORT.
// Documentacao: node_modules/next/dist/docs/01-app/02-guides/custom-server.md
var { createServer } = require("http");
var next = require("next");

// O Hostinger encaminha para a porta 8000 quando nao injecta process.env.PORT
// (confirmado pela API a correr nessa porta).
var port = parseInt(process.env.PORT || "8000", 10);
var dev = process.env.NODE_ENV === "development";

var app = next({ dev: dev });
var handle = app.getRequestHandler();

app.prepare().then(function () {
  createServer(function (req, res) {
    handle(req, res);
  }).listen(port, function () {
    console.log("Next.js pronto na porta " + port + " (" + (dev ? "dev" : "production") + ")");
  });
}).catch(function (erro) {
  console.error("Falha ao iniciar o Next.js:", erro);
  process.exit(1);
});
