import React, { useRef, useState, useEffect, forwardRef } from 'react';
import type { CitationData } from '../types';
import { PrintIcon, DownloadIcon } from './icons';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface CitationViewProps {
    data: CitationData;
    config: {
        municipalidad: string;
        juzgado: string;
        ciudad: string;
        secretarioNombre: string;
        secretarioCargo: string;
        audienciaDate: string;
        audienciaTime: string;
        audienciaAddress: string;
        footerContactInfo: string;
    };
    logoUrl: string | null;
    signatureUrl: string | null;
}

const formatDateForDisplay = (isoDate: string): string => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        return isoDate; 
    }
    const [year, month, day] = isoDate.split('-');
    const utcDate = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)));
    return utcDate.toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
    });
};

const formatDateForInfraction = (dateStr: string): string => {
    if (!dateStr || !/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        return dateStr; // return original if format is unexpected
    }
    const [day, month, year] = dateStr.split('-');
    // Create date in UTC to avoid timezone issues
    const date = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)));
    
    const dayNum = date.getUTCDate();
    const monthName = date.toLocaleString('es-CL', { month: 'long', timeZone: 'UTC' }).toUpperCase();
    const yearNum = date.getUTCFullYear();

    return `${dayNum} DE ${monthName} DEL ${yearNum}`;
};

const formatTimeWithAmPm = (timeStr: string): string => {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) {
        return timeStr;
    }
    const [hours] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const period = h >= 12 ? 'P.M' : 'A.M';
    return `${timeStr} ${period}`;
};

const getInitialFormattedDate = (): string => {
    const date = new Date();
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('es-CL', { month: 'long' });
    const year = date.getFullYear();
    
    return `a ${day} de ${month} de ${year}.`;
};

const formatPlacaPatente = (plate: string): string => {
    if (!plate || typeof plate !== 'string') return '';
    const cleanedPlate = plate.replace(/-/g, '').toUpperCase();
    if (cleanedPlate.length === 6 && /^[A-Z]{4}\d{2}$/.test(cleanedPlate)) {
        return `${cleanedPlate.substring(0, 4)}-${cleanedPlate.substring(4)}`;
    }
    return plate.toUpperCase();
};


const EditableField: React.FC<{id?: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, className?: string}> = ({ id, value, onChange, className }) => (
    <input 
        id={id}
        type="text" 
        value={value} 
        onChange={onChange}
        className={`bg-transparent focus:bg-yellow-100 focus:outline-none py-1 rounded transition-colors ${className}`}
        aria-label={id}
    />
);

const DataItem: React.FC<{ label: string; value: string | undefined }> = ({ label, value }) => (
    <p>
        <span className="font-bold">{label}</span> {value}
    </p>
);


export const CitationView = forwardRef<HTMLDivElement, CitationViewProps>(({ data, config, logoUrl, signatureUrl }, ref) => {
    
    const internalRef = useRef<HTMLDivElement>(null);
    const citationRef = ref || internalRef;

    const [editableProceso, setEditableProceso] = useState(data.procesoNumero ? `${data.procesoNumero}/2025` : '');
    const [editableOficio, setEditableOficio] = useState(data.oficioNumber ? `${data.oficioNumber}/2025` : '');
    const [editableDate, setEditableDate] = useState(getInitialFormattedDate());
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        const year = new Date(config.audienciaDate).getFullYear();
        setEditableProceso(data.procesoNumero ? `${data.procesoNumero}/${year}` : '');
        setEditableOficio(data.oficioNumber ? `${data.oficioNumber}/${year}` : '');
    }, [data.procesoNumero, data.oficioNumber, config.audienciaDate]);

    const handlePrint = () => {
        const printContent = (citationRef as React.RefObject<HTMLDivElement>)?.current;
        if (printContent) {
            const printWindow = window.open('', '', 'height=800,width=800');
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>Imprimir Citación ${editableOficio}</title>
                            <script src="https://cdn.tailwindcss.com"></script>
                            <style>
                                @page { size: 8.5in 13in; margin: 0.4in; }
                                body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
                                .font-candara { font-family: Candara, Calibri, Segoe, "Segoe UI", Optima, Arial, sans-serif; }
                                .citation-page {
                                    box-shadow: none !important;
                                    border: none !important;
                                }
                                .no-print { display: none !important; }
                            </style>
                        </head>
                        <body>
                            ${printContent.outerHTML}
                        </body>
                    </html>
                `);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                }, 500);
            }
        }
    };

    const handleDownloadPdf = async () => {
        const elementToCapture = (citationRef as React.RefObject<HTMLDivElement>)?.current;
        if (!elementToCapture) return;

        setIsDownloading(true);

        try {
            elementToCapture.style.boxShadow = 'none';
            elementToCapture.style.border = 'none';

            const canvas = await html2canvas(elementToCapture, {
                scale: 2,
                useCORS: true,
            });

            const imgData = canvas.toDataURL('image/png');
            
            const pdfWidth = 8.5 * 72; // 612 pts
            const pdfHeight = 13 * 72; // 936 pts
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: [pdfWidth, pdfHeight]
            });
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`citacion-oficio-${editableOficio.replace(/\//g, '-')}.pdf`);

        } catch (e) {
            console.error("Error generating single PDF:", e);
        } finally {
            if (elementToCapture) {
               elementToCapture.style.boxShadow = '';
               elementToCapture.style.border = '';
            }
            setIsDownloading(false);
        }
    };

    return (
        <div className="bg-slate-50 rounded-lg h-full font-arial">
            <div className="flex justify-end space-x-2 p-4 sticky top-16 bg-slate-50/80 backdrop-blur-sm z-10 no-print">
                <button onClick={handlePrint} className="inline-flex items-center px-4 py-2 text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 hover:text-slate-800 rounded-md transition-colors text-sm font-medium">
                    <PrintIcon className="h-5 w-5 mr-2" />
                    Imprimir
                </button>
                 <button onClick={handleDownloadPdf} disabled={isDownloading} className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors">
                    {isDownloading ? (
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                         <DownloadIcon className="h-5 w-5 mr-2" />
                    )}
                    {isDownloading ? 'Descargando...' : 'Descargar PDF'}
                </button>
            </div>
            <div className="p-4 sm:p-8">
                <div ref={citationRef} className="citation-page w-[8.5in] min-h-[13in] bg-white text-black mx-auto shadow-lg border border-slate-200 flex flex-col font-candara leading-normal">
                    {/* Header */}
                    <header className="flex justify-between items-start mb-2 flex-shrink-0 px-8 pt-6">
                        <div className="w-24 h-24 flex-shrink-0">
                            {logoUrl && <img src={logoUrl} alt="Logo Municipalidad" className="object-contain w-full h-full" />}
                        </div>
                        <div className="text-[12pt] text-left">
                            <div className="flex items-baseline">
                                <label htmlFor="oficio-field" className="font-bold whitespace-nowrap">OFICIO N°:</label>
                                <EditableField id="oficio-field" value={editableOficio} onChange={(e) => setEditableOficio(e.target.value)} className="pl-0" />
                            </div>
                            <div className="flex items-baseline">
                                <label htmlFor="proceso-field" className="font-bold whitespace-nowrap">PROCESO N°:</label>
                                <EditableField id="proceso-field" value={editableProceso} onChange={(e) => setEditableProceso(e.target.value)} className="pl-0" />
                            </div>
                            <div className="flex items-baseline mt-2">
                                <label htmlFor="date-field" className="font-bold whitespace-nowrap">{config.ciudad.toUpperCase()},</label>
                                <EditableField id="date-field" value={editableDate} onChange={(e) => setEditableDate(e.target.value)} className="pl-1"/>
                            </div>
                        </div>
                    </header>

                    {/* Titles */}
                    <div className="text-center my-4 space-y-1 flex-shrink-0 text-[13pt] px-8 pb-2">
                        <h1>{config.municipalidad}</h1>
                        <h2 className="font-bold">{config.juzgado}</h2>
                        <h3 className="font-bold underline mt-2">CITACIÓN AL JUZGADO DE POLICÍA LOCAL</h3>
                    </div>

                    <main className="text-[13pt] px-8 flex-grow">
                        {/* Section 1: Propietario y Vehículo */}
                        <section className="mb-4 mt-2">
                            <h4 className="font-bold mb-2 underline">1. DATOS DEL PROPIETARIO Y VEHÍCULO</h4>
                            <div className="grid grid-cols-2 gap-x-12">
                                <div className="space-y-1">
                                    <p className="whitespace-nowrap">
                                        <span className="font-bold">Propietario:</span> {data.propietario}
                                    </p>
                                    <DataItem label="Domicilio:" value={`${data.domicilioCalle} ${data.domicilioNumero}`} />
                                    <DataItem label="Placa Patente:" value={formatPlacaPatente(data.placaPatenteUnica)} />
                                    <DataItem label="Marca/Modelo:" value={`${data.marca} / ${data.modelo}`} />
                                    <DataItem label="Color:" value={data.color} />
                                </div>
                                <div className="space-y-1">
                                    <DataItem label="Rut:" value={data.rut} />
                                    <DataItem label="Comuna:" value={data.comuna} />
                                    <DataItem label="Tipo de Vehículo:" value={data.tipoVehiculo} />
                                    <DataItem label="Año:" value={data.ano} />
                                </div>
                            </div>
                        </section>

                        {/* Section 2: Infracción */}
                        <section className="mb-4 mt-4">
                             <h4 className="font-bold mb-2 underline">2. DETALLES DE LA INFRACCIÓN</h4>
                             <div className="space-y-1">
                                <DataItem label="Placa Patente Denunciada:" value={formatPlacaPatente(data.placaPatenteUnica)} />
                                <DataItem label="Infracción:" value={data.infraccion?.toUpperCase()} />
                                <DataItem label="Lugar:" value={data.lugar?.toUpperCase()} />
                                <DataItem label="Fecha:" value={formatDateForInfraction(data.fecha)} />
                                <DataItem label="Hora:" value={formatTimeWithAmPm(data.hora)} />
                            </div>
                        </section>
                        
                        {/* Legal Text */}
                        <div className="text-justify mt-6">
                             <p className="mt-3">
                                Por orden de este Tribunal, se cita a Ud. a comparecer a la audiencia que se celebrará el día <span className="font-bold underline">{formatDateForDisplay(config.audienciaDate)} a las {config.audienciaTime} horas</span>, en la secretaría del JUZGADO DE POLICÍA LOCAL, Ubicado en {config.audienciaAddress}.
                             </p>
                             <p className="mt-3">
                                La presente citación se emite en conformidad a lo dispuesto en la Ley Nº 18.287 sobre Procedimiento ante los Juzgados de Policía Local y la Ley de Tránsito N°18.290, por la infracción cursada y detallada en la presente.
                             </p>
                             <p className="mt-3">
                                Deberá presentarse con su Cédula de identidad. La no comparecencia injustificada podrá dar lugar a que se proceda en su rebeldía, pudiendo despacharse en su contra una orden de arresto, según lo dispuesto en la ley.
                             </p>
                        </div>
                    </main>

                    {/* Signature Block */}
                    <div className="flex-shrink-0 px-8 pt-2 text-[13pt] mb-16">
                         <div className="mx-auto text-center">
                            <div className="w-80 h-24 mb-1 flex items-center justify-center mx-auto">
                                {signatureUrl && <img src={signatureUrl} alt="Firma" className="max-h-full max-w-full" />}
                            </div>
                            <div className="border-t border-slate-300 pt-2 w-96 mx-auto mb-2">
                                <p>{config.secretarioNombre}</p>
                                <p className="font-bold uppercase">{config.secretarioCargo}</p>
                            </div>
                        </div>
                    </div>

                    {/* Contact Footer */}
                    <footer className="text-[10pt] text-center flex-shrink-0 px-8 pb-6 pt-1">
                        <span>{config.footerContactInfo} xpc</span>
                    </footer>
                </div>
            </div>
        </div>
    );
});