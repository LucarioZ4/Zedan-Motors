module.exports = (req, res, next, valor) => {
    if (!/^[+-]?\d+$/.test(valor) || Number(valor) < -2147483648 || Number(valor) > 2147483647)
        return res.status(400).json({ error: 'Identificador inválido' });
    next();
};
