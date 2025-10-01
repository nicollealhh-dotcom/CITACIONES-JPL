import React from 'react';
// FIX: Replaced non-existent ConfigIcon with SettingsIcon.
import { UploadIcon, SparklesIcon, SettingsIcon, PrintIcon, TableIcon, XIcon, ListCheckIcon, DownloadIcon } from './icons';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HelpStep: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-600">
            {icon}
        </div>
        <div>
            <h4 className="text-lg font-semibold text-slate-800">{title}</h4>
            <p className="mt-1 text-slate-600">{children}</p>
        </div>
    </div>
);

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            aria-labelledby="help-modal-title"
            role="dialog"
            aria-modal="true"
        >
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10">
                    <h3 id="help-modal-title" className="text-xl font-bold text-slate-900">Guía Rápida de Uso</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                        aria-label="Cerrar modal de ayuda"
                    >
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 sm:p-8 space-y-8">
                    <HelpStep
                        icon={<UploadIcon className="h-6 w-6" />}
                        title="1. Cargar Archivos"
                    >
                        Comienza subiendo los dos tipos de archivos PDF requeridos. En la sección "Denuncias", sube el PDF que contiene una o más denuncias. En la sección "CIAV", sube el PDF con los certificados de anotaciones de los vehículos correspondientes. Puedes hacer clic para seleccionar los archivos o arrastrarlos directamente a las cajas.
                    </HelpStep>

                    <HelpStep
                        icon={<SparklesIcon className="h-6 w-6" />}
                        title="2. Generar Citaciones"
                    >
                        Una vez que hayas cargado ambos archivos, el botón "Generar Citaciones" se activará. Haz clic en él para que la inteligencia artificial analice los documentos, relacione cada denuncia con su certificado y extraiga toda la información necesaria. Este proceso puede tardar unos momentos.
                    </HelpStep>
                    
                     <HelpStep
                        // FIX: Replaced non-existent ConfigIcon with SettingsIcon.
                        icon={<SettingsIcon className="h-6 w-6" />}
                        title="3. Configurar Plantilla"
                    >
                        Antes o después de generar, puedes ajustar los detalles en la "Configuración de Plantilla". Define el número de oficio inicial, la fecha y hora de la audiencia, y sube una imagen de la firma del secretario para que aparezca en el documento final.
                    </HelpStep>

                    <HelpStep
                        icon={<ListCheckIcon className="h-6 w-6" />}
                        title="4. Revisar y Seleccionar"
                    >
                        Cuando el procesamiento termine, verás una lista de todas las citaciones generadas a la derecha. Haz clic en cualquiera de ellas para ver una vista previa detallada del documento de citación en la parte inferior de la página. Puedes editar los campos de N° de Oficio, Proceso y fecha directamente en la vista previa.
                    </HelpStep>

                    <HelpStep
                        icon={<PrintIcon className="h-6 w-6" />}
                        title="5. Imprimir o Descargar"
                    >
                        Con una citación seleccionada, utiliza los botones "Imprimir" o "Descargar PDF" que aparecen encima de la vista previa para obtener el documento final. Puedes generar un PDF individual para cada citación.
                    </HelpStep>

                    <HelpStep
                        icon={<TableIcon className="h-6 w-6" />}
                        title="6. Gestionar Correspondencia"
                    >
                        Ve a la pestaña "Correspondencia" para ver una tabla con los datos listos para el envío. Puedes "Exportar a Excel" para crear un nuevo archivo o, si subiste una plantilla de Excel en la configuración, puedes "Agregar a Plantilla" para añadir los nuevos registros al final de tu archivo existente.
                    </HelpStep>
                </div>
                 <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 text-right">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 text-white font-semibold rounded-md hover:bg-slate-700 transition-colors"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};
