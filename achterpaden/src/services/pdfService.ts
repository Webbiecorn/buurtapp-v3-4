import { jsPDF } from "jspdf";

export const generatePdf = (content: string) => {
    const doc = new jsPDF();
    doc.text(content, 10, 10);
    return doc;
};

export const downloadPdf = (filename: string, content: string) => {
    const pdf = generatePdf(content);
    pdf.save(filename);
};