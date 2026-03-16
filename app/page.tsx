'use client';

import { useState, useEffect, useCallback } from 'react';
import DealerTable from '@/components/DealerTable';
import DealerForm from '@/components/DealerForm';
import ExcelImport from '@/components/ExcelImport';
import Pagination from '@/components/Pagination';

export interface Dealer {
  id: string;
  name: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  email: string | null;
  phone: string;
  website: string | null;
}

export default function Home() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingDealer, setEditingDealer] = useState<Dealer | null>(null);
  const [showImport, setShowImport] = useState(false);

  // Status message
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchDealers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
      });

      const res = await fetch(`/api/dealers?${params}`);
      const data = await res.json();

      if (data.success) {
        setDealers(data.dealers);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching dealers:', error);
      showStatus('error', 'Failed to load dealers');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchDealers();
  }, [fetchDealers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const showStatus = (type: 'success' | 'error', message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleAdd = () => {
    setEditingDealer(null);
    setShowForm(true);
  };

  const handleEdit = (dealer: Dealer) => {
    setEditingDealer(dealer);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dealer?')) return;

    try {
      const res = await fetch('/api/dealers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (data.success) {
        showStatus('success', 'Dealer deleted');
        fetchDealers();
      } else {
        showStatus('error', data.error || 'Failed to delete');
      }
    } catch (error) {
      showStatus('error', 'Failed to delete dealer');
    }
  };

  const handleFormSubmit = async (dealer: Partial<Dealer>) => {
    try {
      const method = editingDealer ? 'PUT' : 'POST';
      const body = editingDealer ? { ...dealer, id: editingDealer.id } : dealer;

      const res = await fetch('/api/dealers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        showStatus('success', editingDealer ? 'Dealer updated' : 'Dealer created');
        setShowForm(false);
        setEditingDealer(null);
        fetchDealers();
      } else {
        showStatus('error', data.error || 'Failed to save');
      }
    } catch (error) {
      showStatus('error', 'Failed to save dealer');
    }
  };

  const handleImport = async (dealers: Partial<Dealer>[], mode: 'add' | 'replace') => {
    try {
      const res = await fetch('/api/dealers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealers, mode }),
      });

      const data = await res.json();
      if (data.success) {
        showStatus('success', data.message);
        setShowImport(false);
        setPage(1);
        fetchDealers();
      } else {
        showStatus('error', data.error || 'Import failed');
      }
    } catch (error) {
      showStatus('error', 'Import failed');
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/dealers?all=true');
      const data = await res.json();

      if (data.success && data.dealers.length > 0) {
        // Dynamic import xlsx
        const XLSX = await import('xlsx');

        const exportData = data.dealers.map((d: Dealer) => ({
          Bedrijfsnaam: d.name,
          Straatnaam: d.street,
          Huisnummer: d.houseNumber,
          Postcode: d.postalCode,
          Plaatsnaam: d.city,
          Land: d.country,
          'E-mail': d.email || '',
          Telefoonnummer: d.phone,
          Website: d.website || '',
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Dealers');

        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `dealers_export_${date}.xlsx`);
        showStatus('success', 'Dealers exported');
      }
    } catch (error) {
      showStatus('error', 'Export failed');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Beon Dealer Manager</h1>
          <p className="text-gray-500 text-sm mt-1">Manage dealer locations</p>
        </div>
      </header>

      {/* Status Message */}
      {status && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
            status.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          {status.message}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Dealer
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import Excel
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export All
            </button>
          </div>

          {/* Search */}
          <div className="w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search dealers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mb-4 text-sm text-gray-500">
          Showing {dealers.length} of {total} dealers
        </div>

        {/* Table */}
        <DealerTable
          dealers={dealers}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </main>

      {/* Add/Edit Modal */}
      {showForm && (
        <DealerForm
          dealer={editingDealer}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingDealer(null);
          }}
        />
      )}

      {/* Import Modal */}
      {showImport && (
        <ExcelImport
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
