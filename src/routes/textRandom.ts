import { Router } from 'express';
import { texts } from '../data';
const router = Router();

router.get('/:id', (req, res) => {
    const textId = texts.find((text, index) => index + 1 === +req.params.id);
    res.send(textId);
});

export default router;