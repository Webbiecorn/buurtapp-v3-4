import express from 'express';
import bodyParser from 'body-parser';
import aiReportRouter from './routes/aiReport';
import generatePdfRouter from './routes/generatePdf';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/ai-report', aiReportRouter);
app.use('/api/generate-pdf', generatePdfRouter);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});