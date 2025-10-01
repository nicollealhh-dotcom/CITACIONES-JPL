import { GoogleGenAI, Type } from "@google/genai";
import type { CitationDataFromAI } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

export const countEntries = async (denunciaFile: File, ciavFile: File): Promise<number> => {
    try {
        const denunciaPart = await fileToGenerativePart(denunciaFile);
        const ciavPart = await fileToGenerativePart(ciavFile);

        const prompt = `
            Analiza los documentos PDF proporcionados.
            Cuenta cuántas "Denuncias de Parte Empadronado por Infracción de Tránsito" distintas hay en total en los documentos.
            Devuelve únicamente el número total como un objeto JSON con una sola clave "count". Por ejemplo: {"count": 3}.
            No incluyas texto adicional ni explicaciones.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: prompt },
                    denunciaPart,
                    ciavPart
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        count: { type: Type.INTEGER, description: 'El número total de denuncias encontradas.' }
                    },
                    required: ['count']
                },
            }
        });

        const textResponse = response.text.trim();
        if (!textResponse) {
             return 0;
        }
        
        const cleanedJsonString = textResponse.replace(/^```json\s*|```$/g, '');
        const parsedData = JSON.parse(cleanedJsonString);

        if (parsedData && typeof parsedData.count === 'number') {
            return parsedData.count;
        }

        return 0;

    } catch (error) {
        console.error("Error al contar entradas con Gemini API:", error);
        return 0; // Return 0 to avoid breaking the main flow
    }
};


const citationObjectSchema = {
    type: Type.OBJECT,
    properties: {
        placaPatenteUnica: { type: Type.STRING, description: 'La Placa Patente Única del vehículo, formateada como XXXX-NN (ej. RHPT-14).' },
        infraccion: { type: Type.STRING, description: 'La descripción de la infracción denunciada.' },
        lugar: { type: Type.STRING, description: 'El lugar exacto donde ocurrió la infracción.' },
        fecha: { type: Type.STRING, description: 'La fecha de la infracción en formato DD-MM-YYYY.' },
        hora: { type: Type.STRING, description: 'La hora de la infracción en formato HH:MM.' },
        procesoNumero: { type: Type.STRING, description: 'El número de proceso encontrado en la denuncia, usualmente en un recuadro superior que dice "PROCESO N°".' },
        propietario: { type: Type.STRING, description: 'El nombre completo del propietario del vehículo.' },
        rut: { type: Type.STRING, description: 'El RUT (Rol Único Tributario) del propietario.' },
        marca: { type: Type.STRING, description: 'La marca del vehículo.' },
        modelo: { type: Type.STRING, description: 'El modelo del vehículo.' },
        color: { type: Type.STRING, description: 'El color del vehículo.' },
        ano: { type: Type.STRING, description: 'El año de fabricación del vehículo.' },
        tipoVehiculo: { type: Type.STRING, description: 'El tipo de vehículo (ej. Automóvil, Jeep, Camioneta).' },
        numeroChasis: { type: Type.STRING, description: 'El número de chasis (VIN) del vehículo.' },
        numeroMotor: { type: Type.STRING, description: 'El número de motor del vehículo.' },
        domicilioCalle: { type: Type.STRING, description: 'La calle de la dirección del propietario (sin el número).' },
        domicilioNumero: { type: Type.STRING, description: 'El número de la dirección del propietario.' },
        comuna: { type: Type.STRING, description: 'La comuna del domicilio del propietario.' }
    },
    required: [
        'placaPatenteUnica', 'infraccion', 'lugar', 'fecha', 'hora', 'procesoNumero',
        'propietario', 'rut', 'marca', 'modelo', 'color', 'ano', 'tipoVehiculo',
        'numeroChasis', 'numeroMotor', 'domicilioCalle', 'domicilioNumero', 'comuna'
    ]
};

const citationSchema = {
    type: Type.ARRAY,
    items: citationObjectSchema,
};

export const extractCitationData = async (denunciaFile: File, ciavFile: File): Promise<CitationDataFromAI[]> => {
    try {
        const denunciaPart = await fileToGenerativePart(denunciaFile);
        const ciavPart = await fileToGenerativePart(ciavFile);

        const prompt = `
            Actúa como un experto en la lectura de documentos de tránsito chilenos. Tu objetivo es procesar documentos de forma masiva.
            Analiza los dos documentos PDF proporcionados. Un PDF contiene MÚLTIPLES "Denuncias de Parte Empadronado por Infracción de Tránsito" y el otro PDF contiene MÚLTIPLES "Certificados de Inscripciones y Anotaciones Vigentes (CIAV)".
            
            Tu tarea es procesar sistemáticamente CADA UNA de las denuncias que encuentres en el primer documento. Para cada denuncia:
            1.  Identifica la Placa Patente Única.
            2.  Busca el Certificado (CIAV) correspondiente a esa Placa Patente en el segundo documento.
            3.  Una vez encontrada la pareja, extrae la siguiente información:
                - Del documento de denuncia: Placa Patente Única (formateada como XXXX-NN, ej. RHPT-14), infracción denunciada, lugar, fecha, hora y el "PROCESO N°". El "PROCESO N°" es crucial y se encuentra para cada denuncia, usualmente en un recuadro en la parte superior del documento de denuncia que dice "JUZGADO DE POLICIA LOCAL".
                - Del documento CIAV: nombre del propietario, RUT, marca, modelo, color, año, tipo de vehículo, número de chasis, número de motor, domicilio (separando calle y número) y comuna.
            4.  Añade el objeto JSON completo con toda la información extraída al array de resultados.
            
            Repite este proceso para TODAS las denuncias presentes en el documento. Devuelve TODOS los registros encontrados como un array de objetos JSON, utilizando exclusivamente el schema proporcionado. Si no encuentras ninguna citación, devuelve un array vacío. No incluyas texto adicional, resúmenes ni explicaciones.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: prompt },
                    denunciaPart,
                    ciavPart
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: citationSchema,
            }
        });
        
        const textResponse = response.text.trim();
        if (!textResponse) {
             throw new Error("La API no devolvió contenido. Verifique los documentos y vuelva a intentarlo.");
        }
        
        const cleanedJsonString = textResponse.replace(/^```json\s*|```$/g, '');
        
        const parsedData = JSON.parse(cleanedJsonString);
        
        if (!Array.isArray(parsedData)) {
            throw new Error("La API no devolvió un array de resultados. El formato es incorrecto.");
        }

        return parsedData as CitationDataFromAI[];

    } catch (error) {
        console.error("Error al procesar con Gemini API:", error);
        if (error instanceof Error && error.message.includes('SAFETY')) {
            throw new Error("El contenido del documento fue bloqueado por políticas de seguridad. Pruebe con otro archivo.");
        }
        throw new Error("No se pudieron extraer los datos. Asegúrese de que los documentos sean claros y legibles.");
    }
};