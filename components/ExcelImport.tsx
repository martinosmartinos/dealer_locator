'use client';

import { useState, useRef } from 'react';
import { Dealer } from '@/app/page';

interface Props {
  onImport: (dealers: Partial<Dealer>[], mode: 'add' | 'replace') => void;
  onClose: () => void;
}

// Dutch column mapping
const COLUMN_MAP: Record<string, keyof Dealer> = {
  'Bedrijfsnaam': 'name',
  'Straatnaam': 'street',
  'Huisnummer': 'houseNumber',
  'Postcode': 'postalCode',
  'Plaatsnaam': 'city',
  'Land': 'country',
  'E-mail': 'email',
  'Telefoonnummer': 'phone',
  'Website': 'website',
  // Also support English column names
  'Name': 'name',
  'Street': 'street',
  'House Number': 'houseNumber',
  'Postal Code': 'postalCode',
  'City': 'city',
  'Country': 'country',
  'Email': 'email',
  'Phone': 'phone',
};

export default function ExcelImport({ onImport, onClose }: Props) {
  const [mode, setMode] = useState<'add' | 'replace'>('add');
  const [preview, setPreview] = useState<Partial<Dealer>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      if (jsonData.length === 0) {
        setError('The Excel file is empty');
        setLoading(false);
        return;
      }

      // Parse dealers with column mapping
      const dealers = jsonData.map((row: any) => {
        const dealer: Partial<Dealer> = {};

        for (const [excelCol, fieldName] of Object.entries(COLUMN_MAP)) {
          if (row[excelCol] !== undefined) {
            (dealer as any)[fieldName] = String(row[excelCol]).trim();
          }
        }

        // Set default country
        if (!dealer.country) {
          dealer.country = 'Netherlands';
        }

        return dealer;
      }).filter((d: Partial<Dealer>) => d.name && d.name.length > 0);

      if (dealers.length === 0) {
        setError('No valid dealers found. Make sure columns match: Bedrijfsnaam, Straatnaam, Huisnummer, Postcode, Plaatsnaam, Land, E-mail, Telefoonnummer, Website');
        setLoading(false);
        return;
      }

      setPreview(dealers);
    } catch (err) {
      console.error('Error parsing Excel:', err);
      setError('Failed to read Excel file');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (preview.length > 0) {
      onImport(preview, mode);
    }
  };

  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx');

    const templateData = [{
      'Bedrijfsnaam': 'Example Store',
      'Straatnaam': 'Main Street',
      'Huisnummer': '123',
      'Postcode': '1234 AB',
      'Plaatsnaam': 'Amsterdam',
      'Land': 'Netherlands',
      'E-mail': 'info@example.com',
      'Telefoonnummer': '020 1234567',
      'Website': 'https://www.example.com',
    }];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dealers');
    XLSX.writeFile(wb, 'dealer_template.xlsx');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Import Dealers from Excel</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Upload Area */}
            {preview.length === 0 && (
              <>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-gray-600 mb-1">Click to upload or drag and drop</p>
                  <p className="text-gray-400 text-sm">Excel file (.xlsx) only</p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download template
                  </button>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="mode"
                        value="add"
                        checked={mode === 'add'}
                        onChange={() => setMode('add')}
                        className="text-blue-600"
                      />
                      <span>Add to existing</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="mode"
                        value="replace"
                        checked={mode === 'replace'}
                        onChange={() => setMode('replace')}
                        className="text-blue-600"
                      />
                      <span>Replace all</span>
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* Loading */}
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-gray-500">Reading Excel file...</p>
              </div>
            )}

            {/* Preview */}
            {preview.length > 0 && (
              <div>
                <p className="mb-3 text-sm text-gray-600">
                  Found <strong>{preview.length}</strong> dealers. Preview:
                </p>
                <div className="max-h-64 overflow-auto border rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">City</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {preview.slice(0, 10).map((d, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2">{d.name}</td>
                          <td className="px-3 py-2">{d.city}</td>
                          <td className="px-3 py-2">{d.phone}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.length > 10 && (
                  <p className="text-xs text-gray-400 mt-2">
                    ... and {preview.length - 10} more
                  </p>
                )}

                <div className="mt-4 p-3 rounded-lg bg-yellow-50 text-yellow-800 text-sm">
                  {mode === 'replace' ? (
                    <strong>⚠️ Warning:</strong>
                  ) : (
                    <strong>ℹ️ Note:</strong>
                  )}
                  {mode === 'replace'
                    ? ' This will DELETE all existing dealers and replace with the imported data.'
                    : ' This will ADD these dealers to the existing list.'}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
            {preview.length > 0 && (
              <button
                type="button"
                onClick={handleImport}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Import {preview.length} Dealers
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (preview.length > 0) {
                  setPreview([]);
                  if (fileRef.current) fileRef.current.value = '';
                } else {
                  onClose();
                }
              }}
              className="mt-2 sm:mt-0 w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {preview.length > 0 ? 'Back' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
