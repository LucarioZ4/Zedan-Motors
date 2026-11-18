module.exports = texto => '%' + texto.trim().replace(/[\\%_]/g, caracter => '\\' + caracter) + '%';
