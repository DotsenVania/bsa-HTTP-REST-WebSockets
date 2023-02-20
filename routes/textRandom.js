"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const data_1 = require("../data");
const router = (0, express_1.Router)();
router.get('/:id', (req, res) => {
    const textId = data_1.texts.find((text, index) => index + 1 === +req.params.id);
    res.send(textId);
});
exports.default = router;
