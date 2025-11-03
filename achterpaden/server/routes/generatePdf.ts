import { Request, Response } from 'express';
import { createPDF } from '../../services/pdfService';

const generatePdf = async (req: Request, res: Response) => {
    try {
        const pdfBuffer = await createPDF(req.body);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="report.pdf"',
            'Content-Length': pdfBuffer.length,
        });
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Internal Server Error');
    }
};

export default generatePdf;