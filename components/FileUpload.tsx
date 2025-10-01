
import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons';

interface FileUploadProps {
    id: string;
    title: string;
    description?: string;
    onFilesSelect: (files: File[]) => void;
    files: File[];
    accept?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ id, title, description, onFilesSelect, files, accept }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (selectedFiles: FileList | null) => {
        if (selectedFiles && selectedFiles.length > 0) {
            onFilesSelect(Array.from(selectedFiles));
        } else {
            onFilesSelect([]);
        }
    };

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFileChange(e.dataTransfer.files);
    }, [handleFileChange]);
    
    const handleRemoveFiles = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        onFilesSelect([]);
    }

    return (
        <div>
            <h3 className="text-md font-medium text-slate-900">{title}</h3>
            {description && <p className="text-sm text-slate-500 mb-2">{description}</p>}
            {files.length > 0 ? (
                <div className="mt-2 p-4 border border-slate-300 rounded-lg bg-slate-50">
                    <ul className="space-y-1 text-sm text-slate-700 list-disc list-inside">
                        {files.map((file, index) => (
                            <li key={index} className="truncate">{file.name}</li>
                        ))}
                    </ul>
                    <button 
                        onClick={handleRemoveFiles}
                        className="mt-3 text-sm font-medium text-slate-600 hover:text-slate-900"
                    >
                        Limpiar archivos
                    </button>
                </div>
            ) : (
                <label
                    htmlFor={id}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`mt-2 flex justify-center items-center w-full px-6 pt-5 pb-6 border-2 ${
                        isDragging ? 'border-slate-400' : 'border-slate-300'
                    } border-dashed rounded-md cursor-pointer transition-colors duration-200 hover:border-slate-400`}
                >
                    <div className="space-y-1 text-center">
                        <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <div className="flex text-sm text-slate-600">
                            <span className="relative font-medium text-slate-700 hover:text-slate-900">
                                Sube archivos
                                <input id={id} name={id} type="file" className="sr-only" onChange={(e) => handleFileChange(e.target.files)} accept={accept || "*"} multiple />
                            </span>
                            <p className="pl-1">o arrástralos aquí</p>
                        </div>
                        <p className="text-xs text-slate-500">Selecciona los archivos permitidos</p>
                    </div>
                </label>
            )}
        </div>
    );
};
