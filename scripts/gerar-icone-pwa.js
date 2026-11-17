// Gera os icontes PWA do SGHR (quadrado azul com monograma branco).
var sharp = require("sharp");
var fs = require("fs");
var path = require("path");

var svg = function (tamanho) {
  var letra = Math.round(tamanho * 0.30);
  var y = Math.round(tamanho / 2 + letra * 0.35);
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + tamanho + '" height="' + tamanho + '">' +
    '<rect width="' + tamanho + '" height="' + tamanho + '" fill="#002b92"/>' +
    '<text x="50%" y="' + y + '" font-family="Arial, Helvetica, sans-serif" font-size="' + letra + '" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="' + Math.round(tamanho * 0.012) + '">SGHR</text>' +
    '</svg>';
};

var saida = path.join(__dirname, "..", "public");

Promise.all([
  sharp(Buffer.from(svg(512))).png().toFile(path.join(saida, "icon-512.png")),
  sharp(Buffer.from(svg(192))).png().toFile(path.join(saida, "icon-192.png")),
  sharp(Buffer.from(svg(180))).png().toFile(path.join(saida, "apple-touch-icon.png")),
]).then(function () {
  console.log("Icones gerados em public/.");
}).catch(function (e) {
  console.error("Falha:", e.message);
  process.exit(1);
});
