import express from 'express';
import { generateAIReport } from '../services/aiService';

const router = express.Router();

router.post('/generate', async (req, res) => {
    try {
        const reportData = await generateAIReport(req.body);
        res.status(200).json(reportData);
    } catch (error) {
        res.status(500).json({ message: 'Error generating AI report', error });
    }
});

export default router;