export interface ChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        backgroundColor: string[];
        borderColor: string[];
        borderWidth: number;
    }[];
}

export interface SummaryCard {
    title: string;
    value: number | string;
    description: string;
}

export interface AIReport {
    title: string;
    content: string;
    generatedAt: Date;
}

export interface DownloadableReport {
    fileName: string;
    fileType: 'pdf' | 'docx';
    content: Blob;
}