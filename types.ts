
export interface ViolationData {
    placaPatenteUnica: string;
    infraccion: string;
    lugar: string;
    fecha: string;
    hora: string;
    procesoNumero: string;
}

export interface VehicleOwnerData {
    propietario: string;
    rut: string;
    marca: string;
    modelo: string;
    color: string;
    ano: string;
    tipoVehiculo: string;
    numeroChasis: string;
    numeroMotor: string;
    domicilioCalle: string;
    domicilioNumero: string;
    comuna: string;
}

// Data structure from Gemini AI
export interface CitationDataFromAI extends ViolationData, VehicleOwnerData {}

// Final data structure used in the app with the generated Oficio number
export interface CitationData extends CitationDataFromAI {
    oficioNumber: string;
}

export interface CorrespondenceRow {
    'N°': number;
    'NUMERO GUIA': string;
    'CERT.': 'CERT';
    'DEPTO.': 'JPL';
    'TIPO DCTO': '2º CITACIÓN-ROL';
    'DCTO.': string;
    'DESTINATARIO': string;
    'DIRECCIÓN': string;
    'CIUDAD/COMUNA': string;
}
