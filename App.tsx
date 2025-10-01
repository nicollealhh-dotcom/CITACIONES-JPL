



import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { CitationData, CorrespondenceRow } from './types';
import { FileUpload } from './components/FileUpload';
import { CitationView } from './components/CitationView';
import { CorrespondenceView } from './components/CorrespondenceView';
import { HelpModal } from './components/HelpModal';
import { LogoIcon, SparklesIcon, AlertIcon, SettingsIcon, PrintIcon, DownloadIcon, InfoIcon, KeyIcon, HelpIcon, UploadIcon, ListCheckIcon, EditIcon, MailIcon, ExcelIcon, PlusIcon, TableIcon } from './components/icons';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { extractCitationData, countEntries } from './services/geminiService';

type CitationResult = { data: CitationData } | { error: string, files: { denuncia: string, ciav: string } };

const ACCESS_CODE = 'JPLQUISCO2024';

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [inputCode, setInputCode] = useState('');
    const [loginError, setLoginError] = useState('');

    const [denunciaFiles, setDenunciaFiles] = useState<File[]>([]);
    const [ciavFiles, setCiavFiles] = useState<File[]>([]);
    const [correspondenceTemplateFile, setCorrespondenceTemplateFile] = useState<File[]>([]);

    const [citationResults, setCitationResults] = useState<CitationResult[]>([]);
    const [correspondenceData, setCorrespondenceData] = useState<CorrespondenceRow[]>([]);
    const [selectedResultIndex, setSelectedResultIndex] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'citations' | 'correspondence'>('citations');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
    const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    
    const [correspondenceWorkbook, setCorrespondenceWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [correspondenceSheetName, setCorrespondenceSheetName] = useState<string | null>(null);

    const citationViewRef = useRef<HTMLDivElement>(null);

    const getDefaultAudienciaDate = () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        return futureDate.toISOString().split('T')[0]; // Format YYYY-MM-DD for input[type=date]
    };

    const [templateConfig, setTemplateConfig] = useState({
        municipalidad: "ILUSTRE MUNICIPALIDAD DE EL QUISCO",
        juzgado: "JUZGADO DE POLICÍA LOCAL",
        ciudad: "EL QUISCO",
        secretarioNombre: "Alejandro Carrasco Blanc",
        secretarioCargo: "SECRETARIO ABOGADO",
        audienciaDate: getDefaultAudienciaDate(),
        audienciaTime: "09:00",
        startOficioNumber: "100",
        audienciaAddress: "Avda. Francia N°011 El Quisco",
        footerContactInfo: "Correo electrónico: tribunal@elquisco.cl - Teléfonos: (35) 2 456119 - Celular: 9 94088296 - El Quisco V Región Chile.",
    });

    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            if (signatureUrl) {
                URL.revokeObjectURL(signatureUrl);
            }
            if (logoUrl) {
                URL.revokeObjectURL(logoUrl);
            }
        };
    }, [signatureUrl, logoUrl]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputCode === ACCESS_CODE) {
            setIsAuthenticated(true);
            setLoginError('');
        } else {
            setLoginError('Código de acceso incorrecto.');
        }
    };
    
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (logoUrl) {
            URL.revokeObjectURL(logoUrl);
        }
        if (file) {
            setLogoUrl(URL.createObjectURL(file));
        } else {
            setLogoUrl(null);
        }
    };

    const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (signatureUrl) {
            URL.revokeObjectURL(signatureUrl);
        }
        if (file) {
            setSignatureUrl(URL.createObjectURL(file));
        } else {
            setSignatureUrl(null);
        }
    };


    const handleGenerateCitations = useCallback(async () => {
        if (denunciaFiles.length === 0 || ciavFiles.length === 0) {
            setError("Por favor, sube los archivos de Denuncias y CIAV.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setCitationResults([]);
        setSelectedResultIndex(null);
        setCorrespondenceData([]);

        try {
            setLoadingMessage("Contando denuncias en los documentos...");
            const total = await countEntries(denunciaFiles[0], ciavFiles[0]);
            
            if (total === 0) {
                 setError("No se encontraron denuncias en los documentos. Revisa los archivos e intenta nuevamente.");
                 setIsLoading(false);
                 return;
            }

            setLoadingMessage(`Se encontraron ${total} denuncias. La IA está extrayendo los datos...`);

            const results = await extractCitationData(denunciaFiles[0], ciavFiles[0]);

            if (results.length === 0) {
                setError("La IA no pudo extraer datos. Revisa los archivos e intenta nuevamente.");
            } else {
                const oficioStart = parseInt(templateConfig.startOficioNumber, 10) || 1;
                const formattedResults: CitationResult[] = results.map((data, index) => ({
                    data: {
                        ...data,
                        oficioNumber: String(oficioStart + index),
                    }
                }));
                setCitationResults(formattedResults);

                const year = new Date(templateConfig.audienciaDate).getFullYear();
                const correspondence: CorrespondenceRow[] = formattedResults
                    .filter(result => 'data' in result)
                    .map((result, index) => {
                        const data = (result as { data: CitationData }).data;
                        return {
                            'N°': index + 1,
                            'NUMERO GUIA': '',
                            'CERT.': 'CERT',
                            'DEPTO.': 'JPL',
                            'TIPO DCTO': '2º CITACIÓN-ROL',
                            'DCTO.': `${data.procesoNumero}-${year}`,
                            'DESTINATARIO': data.propietario.toUpperCase(),
                            'DIRECCIÓN': `${data.domicilioCalle} ${data.domicilioNumero}`.toUpperCase(),
                            'CIUDAD/COMUNA': data.comuna.toUpperCase()
                        };
                    });
                setCorrespondenceData(correspondence);
                setActiveTab('citations');
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "Ocurrió un error desconocido.";
            setError(`Error al procesar los archivos: ${errorMessage}`);
            setCitationResults([{
                error: errorMessage,
                files: { denuncia: denunciaFiles[0].name, ciav: ciavFiles[0].name }
            }]);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [denunciaFiles, ciavFiles, templateConfig.startOficioNumber, templateConfig.audienciaDate]);

    const handleReset = () => {
        setDenunciaFiles([]);
        setCiavFiles([]);
        setCorrespondenceTemplateFile([]);
        setCorrespondenceWorkbook(null);
        setCorrespondenceSheetName(null);
        setCitationResults([]);
        setCorrespondenceData([]);
        setSelectedResultIndex(null);
        setError(null);
        setIsLoading(false);
    };

    const selectedResult = useMemo(() => {
        if (selectedResultIndex === null || !citationResults[selectedResultIndex]) {
            return null;
        }
        const result = citationResults[selectedResultIndex];
        return 'data' in result ? result.data : null;
    }, [selectedResultIndex, citationResults]);
    
    const handleExportToExcel = () => {
        if (correspondenceData.length === 0) return;

        const headers = Object.keys(correspondenceData[0]);
        const dataToExport = correspondenceData.map(row => Object.values(row));

        const ws = XLSX.utils.aoa_to_sheet([headers, ...dataToExport]);
        
        ws['!cols'] = [
            { wch: 5 },   // N°
            { wch: 15 },  // NUMERO GUIA
            { wch: 8 },   // CERT.
            { wch: 8 },   // DEPTO.
            { wch: 20 },  // TIPO DCTO
            { wch: 12 },  // DCTO.
            { wch: 40 },  // DESTINATARIO
            { wch: 40 },  // DIRECCIÓN
            { wch: 20 }   // CIUDAD/COMUNA
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Correspondencia');

        XLSX.writeFile(wb, 'correspondencia_citaciones.xlsx');
    };
    
    const handleDownloadAllPdf = async () => {
        const validResults = citationResults.filter(r => 'data' in r) as { data: CitationData }[];
        if (validResults.length === 0 || !citationViewRef.current) return;

        setIsProcessingBatch(true);
        const originalIndex = selectedResultIndex;
        
        try {
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: [8.5 * 72, 13 * 72] // 8.5in x 13in
            });

            for (let i = 0; i < validResults.length; i++) {
                // Update state to render the next citation
                await new Promise<void>(resolve => {
                    setSelectedResultIndex(citationResults.indexOf(validResults[i]));
                    setTimeout(resolve, 100); // Give React time to render
                });
                
                const elementToCapture = citationViewRef.current;
                if(elementToCapture) {
                    elementToCapture.style.boxShadow = 'none';
                    elementToCapture.style.border = 'none';
                    
                    const canvas = await html2canvas(elementToCapture, { scale: 2, useCORS: true });
                    const imgData = canvas.toDataURL('image/png');

                    if (i > 0) {
                        pdf.addPage();
                    }
                    pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
                    
                    elementToCapture.style.boxShadow = '';
                    elementToCapture.style.border = '';
                }
            }

            pdf.save('todas-las-citaciones.pdf');

        } catch (error) {
            console.error("Error generating batch PDF:", error);
            setError("Ocurrió un error al generar el PDF masivo.");
        } finally {
            setIsProcessingBatch(false);
            setSelectedResultIndex(originalIndex); // Restore original selection
        }
    };

    const handlePrintAll = async () => {
        const validResults = citationResults.filter(r => 'data' in r) as { data: CitationData }[];
        if (validResults.length === 0) return;
        
        setIsProcessingBatch(true);
        const originalIndex = selectedResultIndex;

        try {
            let printHtml = '';
            for (let i = 0; i < validResults.length; i++) {
                 await new Promise<void>(resolve => {
                    setSelectedResultIndex(citationResults.indexOf(validResults[i]));
                    setTimeout(resolve, 100);
                });
                if (citationViewRef.current) {
                    printHtml += `<div class="citation-page-wrapper">${citationViewRef.current.outerHTML}</div>`;
                }
            }

            const printWindow = window.open('', '', 'height=800,width=800');
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>Imprimir Todas las Citaciones</title>
                            <script src="https://cdn.tailwindcss.com"></script>
                            <style>
                                @page { size: 8.5in 13in; margin: 0.4in; }
                                body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
                                .font-candara { font-family: Candara, Calibri, Segoe, "Segoe UI", Optima, Arial, sans-serif; }
                                .citation-page { box-shadow: none !important; border: none !important; }
                                .citation-page-wrapper { page-break-after: always; }
                                .no-print { display: none !important; }
                            </style>
                        </head>
                        <body>${printHtml}</body>
                    </html>
                `);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                }, 500);
            }
        } catch (error) {
            console.error("Error printing all:", error);
            setError("Ocurrió un error al preparar la impresión masiva.");
        } finally {
            setIsProcessingBatch(false);
            setSelectedResultIndex(originalIndex);
        }
    };

    const handleCorrespondenceTemplateSelect = useCallback(async (files: File[]) => {
        setCorrespondenceTemplateFile(files);
        if (files.length > 0) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target?.result;
                if (data) {
                    try {
                        const workbook = XLSX.read(data, { type: 'array' });
                        setCorrespondenceWorkbook(workbook);
                        setCorrespondenceSheetName(workbook.SheetNames[0]);
                    } catch (err) {
                        setError("No se pudo leer el archivo Excel. Asegúrate de que no esté corrupto.");
                        setCorrespondenceWorkbook(null);
                        setCorrespondenceSheetName(null);
                    }
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            setCorrespondenceWorkbook(null);
            setCorrespondenceSheetName(null);
        }
    }, [setError]);
    
    const handleAddToTemplate = useCallback(() => {
        if (!correspondenceWorkbook || !correspondenceSheetName || correspondenceData.length === 0) return;

        const wb = { ...correspondenceWorkbook };
        const ws = wb.Sheets[correspondenceSheetName];
        if (!ws) {
            setError(`La hoja de cálculo '${correspondenceSheetName}' no se encontró en el archivo.`);
            return;
        }

        const existingData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
        const lastRowIndex = existingData.length;
        const lastEntryNumber = lastRowIndex > 1 ? parseInt(String(existingData[lastRowIndex - 1][0]), 10) || 0 : 0;
        
        const newRows = correspondenceData.map((row, index) => {
            const newRow = { ...row, 'N°': lastEntryNumber + index + 1 };
            return Object.values(newRow);
        });

        XLSX.utils.sheet_add_aoa(ws, newRows, { origin: -1 });

        ws['!cols'] = [
            { wch: 5 }, { wch: 15 }, { wch: 8 }, { wch: 8 }, { wch: 20 },
            { wch: 12 }, { wch: 40 }, { wch: 40 }, { wch: 20 }
        ];

        XLSX.writeFile(wb, correspondenceTemplateFile[0]?.name || 'correspondencia_actualizada.xlsx');
    }, [correspondenceWorkbook, correspondenceSheetName, correspondenceData, correspondenceTemplateFile, setError]);

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-100">
                <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-sm">
                    <div className="flex flex-col items-center mb-6">
                        <LogoIcon className="h-12 w-12 text-slate-600" />
                        <h1 className="text-2xl font-bold text-slate-800 mt-2">Acceso Restringido</h1>
                        <p className="text-sm text-slate-500">Ingresa el código para continuar</p>
                    </div>
                    <form onSubmit={handleLogin}>
                        <div className="mb-4">
                            <label htmlFor="access-code" className="sr-only">Código de Acceso</label>
                            <div className="relative">
                                <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    id="access-code"
                                    type="password"
                                    value={inputCode}
                                    onChange={(e) => setInputCode(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                                    placeholder="Código de acceso"
                                />
                            </div>
                        </div>
                        {loginError && <p className="text-sm text-red-600 mb-4">{loginError}</p>}
                        <button type="submit" className="w-full bg-slate-800 text-white font-semibold py-2 px-4 rounded-md hover:bg-slate-700 transition-colors">
                            Ingresar
                        </button>
                    </form>
                </div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
             <header className="bg-white shadow-sm sticky top-0 z-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-3">
                            <LogoIcon className="h-8 w-8 text-slate-600" />
                            <h1 className="text-xl font-bold text-slate-800">Generador de Citaciones JPL</h1>
                        </div>
                        <div className="flex items-center">
                            <button
                                onClick={() => setIsHelpModalOpen(true)}
                                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                aria-label="Abrir guía de ayuda"
                                title="Ayuda"
                            >
                                <HelpIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Uploads and Controls */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-lg shadow">
                             <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4 flex items-center">
                                <UploadIcon className="h-6 w-6 mr-2 text-slate-500" />
                                1. Cargar Archivos
                            </h2>
                            <div className="space-y-4">
                                <FileUpload
                                    id="denuncia-files"
                                    title="Denuncias de Parte Empadronado"
                                    description="Sube el archivo PDF con una o más denuncias."
                                    onFilesSelect={setDenunciaFiles}
                                    files={denunciaFiles}
                                    accept=".pdf"
                                />
                                <FileUpload
                                    id="ciav-files"
                                    title="Certificados de Anotaciones (CIAV)"
                                    description="Sube el PDF con los certificados de los vehículos."
                                    onFilesSelect={setCiavFiles}
                                    files={ciavFiles}
                                    accept=".pdf"
                                />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                             <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4 flex items-center">
                                <SparklesIcon className="h-6 w-6 mr-2 text-slate-500" />
                                2. Generar Citaciones
                            </h2>
                            <p className="text-sm text-slate-600 mb-4">
                                Una vez cargados ambos archivos, haz clic en el botón para que la IA extraiga los datos y genere las citaciones.
                            </p>
                            <button
                                onClick={handleGenerateCitations}
                                disabled={isLoading || denunciaFiles.length === 0 || ciavFiles.length === 0}
                                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-slate-800 hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Procesando...
                                    </>
                                ) : (
                                    "Generar Citaciones"
                                )}
                            </button>
                            {citationResults.length > 0 && (
                                <button
                                    onClick={handleReset}
                                    className="w-full mt-3 inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                                >
                                    Limpiar y empezar de nuevo
                                </button>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4 flex items-center">
                                <SettingsIcon className="h-6 w-6 mr-2 text-slate-500" />
                                3. Configuración de Plantilla
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="startOficioNumber" className="block text-sm font-medium text-slate-700">
                                        N° de Oficio Correlativo Inicial
                                    </label>
                                    <input
                                        type="number"
                                        id="startOficioNumber"
                                        value={templateConfig.startOficioNumber}
                                        onChange={(e) => setTemplateConfig(prev => ({ ...prev, startOficioNumber: e.target.value }))}
                                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm"
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="audienciaDate" className="block text-sm font-medium text-slate-700">
                                        Fecha de Audiencia
                                    </label>
                                    <input
                                        type="date"
                                        id="audienciaDate"
                                        value={templateConfig.audienciaDate}
                                        onChange={(e) => setTemplateConfig(prev => ({ ...prev, audienciaDate: e.target.value }))}
                                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="audienciaTime" className="block text-sm font-medium text-slate-700">
                                        Hora de Audiencia
                                    </label>
                                    <input
                                        type="time"
                                        id="audienciaTime"
                                        value={templateConfig.audienciaTime}
                                        onChange={(e) => setTemplateConfig(prev => ({ ...prev, audienciaTime: e.target.value }))}
                                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="logoFile" className="block text-sm font-medium text-slate-700">
                                        Adjuntar Logo
                                    </label>
                                    <input
                                        type="file"
                                        id="logoFile"
                                        onChange={handleLogoChange}
                                        accept="image/png, image/jpeg"
                                        className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="signatureFile" className="block text-sm font-medium text-slate-700">
                                        Adjuntar Firma
                                    </label>
                                    <input
                                        type="file"
                                        id="signatureFile"
                                        onChange={handleSignatureChange}
                                        accept="image/png, image/jpeg"
                                        className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
                                    />
                                </div>
                                <FileUpload
                                    id="correspondence-template-file"
                                    title="Plantilla de Correspondencia (Opcional)"
                                    description="Sube un Excel para agregar las nuevas citaciones al final."
                                    onFilesSelect={handleCorrespondenceTemplateSelect}
                                    files={correspondenceTemplateFile}
                                    accept=".xlsx, .xls"
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Right Column: Results */}
                    <div className="lg:col-span-2">
                        {isLoading && (
                             <div className="flex flex-col items-center justify-center h-full bg-white p-8 rounded-lg shadow">
                                <SparklesIcon className="h-16 w-16 text-slate-400 animate-pulse" />
                                <p className="text-slate-600 mt-4 text-center font-medium">{loadingMessage || 'La IA está analizando los documentos...'}</p>
                                <p className="text-slate-500 text-sm mt-2 text-center">Este proceso puede tardar unos momentos. Gracias por tu paciencia.</p>
                            </div>
                        )}
                        
                        {!isLoading && error && (
                             <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md shadow">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <AlertIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {!isLoading && !error && citationResults.length > 0 && (
                             <div className="bg-white rounded-lg shadow">
                                <div className="border-b border-slate-200">
                                    <div className="px-6 pt-4">
                                        {/* Tabs and Actions */}
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                            <div className="flex space-x-1">
                                                <button
                                                    onClick={() => setActiveTab('citations')}
                                                    className={`inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium ${activeTab === 'citations' ? 'border-slate-700 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                                                >
                                                    <ListCheckIcon className="h-5 w-5 mr-2" />
                                                    Citaciones ({citationResults.filter(r => 'data' in r).length})
                                                </button>
                                                <button
                                                    onClick={() => setActiveTab('correspondence')}
                                                    className={`inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium ${activeTab === 'correspondence' ? 'border-slate-700 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                                                >
                                                    <TableIcon className="h-5 w-5 mr-2" />
                                                    Correspondencia
                                                </button>
                                            </div>
                                            {activeTab === 'citations' && (
                                                <div className="flex items-center space-x-2">
                                                    <button onClick={handlePrintAll} disabled={isProcessingBatch} className="inline-flex items-center px-3 py-1.5 text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 hover:text-slate-800 rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-wait">
                                                        <PrintIcon className="h-4 w-4 mr-2" />
                                                        Imprimir Todas
                                                    </button>
                                                    <button onClick={handleDownloadAllPdf} disabled={isProcessingBatch} className="inline-flex items-center px-3 py-1.5 text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 hover:text-slate-800 rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-wait">
                                                        <DownloadIcon className="h-4 w-4 mr-2" />
                                                        Descargar Todas
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                 {/* Content Area */}
                                <div>
                                    {activeTab === 'citations' && (
                                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {isProcessingBatch && (
                                                <div className="md:col-span-2 lg:col-span-3 text-center py-4 bg-slate-50 rounded-lg">
                                                    <p className="text-sm text-slate-600 animate-pulse">Procesando lote de citaciones...</p>
                                                </div>
                                            )}
                                            {citationResults.map((result, index) => (
                                                <button 
                                                    key={index}
                                                    onClick={() => setSelectedResultIndex(index)}
                                                    className={`p-4 rounded-lg text-left transition-colors border ${selectedResultIndex === index ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                                >
                                                    {'data' in result ? (
                                                        <>
                                                            <p className="font-semibold text-slate-800 truncate">{result.data.propietario}</p>
                                                            <p className="text-sm text-slate-600">PPU: <span className="font-mono">{result.data.placaPatenteUnica}</span></p>
                                                            <p className="text-sm text-slate-500">Proceso: {result.data.procesoNumero}</p>
                                                        </>
                                                    ) : (
                                                        <div className="text-red-600">
                                                            <p className="font-semibold">Error al procesar</p>
                                                            <p className="text-sm">No se pudo extraer datos para esta entrada.</p>
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {activeTab === 'correspondence' && (
                                         <div className="p-4 sm:p-6">
                                            <div className="flex justify-end items-center mb-4 space-x-3">
                                                <button
                                                    onClick={handleExportToExcel}
                                                    className="inline-flex items-center px-4 py-2 text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 hover:text-slate-800 rounded-md transition-colors text-sm font-medium"
                                                    aria-label="Exportar a un nuevo archivo Excel"
                                                    title="Exportar a un nuevo archivo Excel"
                                                >
                                                    <ExcelIcon className="h-5 w-5 mr-2" />
                                                    Exportar a Excel
                                                </button>
                                                <button
                                                    onClick={handleAddToTemplate}
                                                    disabled={!correspondenceWorkbook}
                                                    className="inline-flex items-center px-4 py-2 text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 hover:text-slate-800 rounded-md transition-colors text-sm font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                                    aria-label="Agregar a plantilla Excel"
                                                    title="Agregar a plantilla Excel. Sube una plantilla en la sección de configuración."
                                                >
                                                    <PlusIcon className="h-5 w-5 mr-2" />
                                                    Agregar a Plantilla
                                                </button>
                                            </div>
                                            <CorrespondenceView data={correspondenceData} />
                                        </div>
                                    )}
                                </div>
                             </div>
                        )}
                        
                        {!isLoading && !error && citationResults.length === 0 && (
                            <div className="flex flex-col items-center justify-center text-center bg-white p-8 rounded-lg shadow h-full">
                                <InfoIcon className="h-12 w-12 text-slate-400 mb-4" />
                                <h3 className="text-lg font-medium text-slate-800">Listo para empezar</h3>
                                <p className="mt-1 text-sm text-slate-500 max-w-md">
                                    Sube los archivos de denuncias y certificados (CIAV) en el panel de la izquierda y presiona "Generar Citaciones" para comenzar.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                
                {selectedResult && (
                    <div className="mt-8">
                        <CitationView 
                            ref={citationViewRef}
                            data={selectedResult} 
                            config={templateConfig}
                            logoUrl={logoUrl}
                            signatureUrl={signatureUrl}
                        />
                    </div>
                )}
            </main>
            <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
        </div>
    );
};

export default App;