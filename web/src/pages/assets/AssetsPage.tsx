import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { collection, getDocs, query, orderBy, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Plus, Search, QrCode, X, MapPin, Wrench, FileText, Tag, DollarSign, User } from 'lucide-react';
import { format } from 'date-fns';
import Barcode from 'react-barcode';

interface Asset {
  id: string;
  assetCode: string;
  name: string;
  category: string;
  status: string;
  condition: string;
  riskLevel: string;
  description?: string;
  location?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  supplier?: string;
  warrantyExpiry?: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  assignedTo?: string;
  qrCode?: string;
  images?: string[];
  createdAt?: any;
}

export function AssetsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const { data: assets, isLoading } = useQuery('assets', async () => {
    const q = query(collection(db, 'assets'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() })) as Asset[];
  });

  const filteredAssets = assets?.filter((asset) => {
    const matchesSearch = asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.assetCode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Banner with Storyset Illustration */}
      <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <img 
            src="/storyset-illustrations/Construction-rafiki.svg" 
            alt="Assets" 
            className="w-24 h-24 object-contain"
          />
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
            <p className="text-sm text-gray-500">Manage your equipment and machinery</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
        <Link to="/assets/new" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4 mr-2" />
          Add Asset
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input w-full sm:w-48"
        >
          <option value="all">All Status</option>
          <option value="operational">Operational</option>
          <option value="maintenance">Maintenance</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {/* Assets Grid */}
      {isLoading ? (
        <div className="p-8 text-center">Loading...</div>
      ) : filteredAssets?.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No assets found. Click "Add Asset" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets?.map((asset) => (
            <div 
              key={asset.id}
              onClick={() => setSelectedAsset(asset)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    {asset.images?.[0] ? (
                      <img src={asset.images[0]} alt={asset.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Tag className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{asset.name}</h3>
                    <p className="text-sm text-gray-500">{asset.assetCode}</p>
                  </div>
                </div>
                <QrCode className="h-5 w-5 text-gray-300" />
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`badge status-${asset.status} text-xs`}>
                  {asset.status}
                </span>
                <span className={`badge risk-${asset.riskLevel} text-xs`}>
                  {asset.riskLevel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">
                  <span className="text-xs">Category:</span>
                  <p className="font-medium text-gray-700">{asset.category || 'N/A'}</p>
                </div>
                <div className="text-gray-500">
                  <span className="text-xs">Condition:</span>
                  <p className="font-medium text-gray-700 capitalize">{asset.condition || 'N/A'}</p>
                </div>
                <div className="text-gray-500">
                  <span className="text-xs">Location:</span>
                  <p className="font-medium text-gray-700">{asset.location || 'N/A'}</p>
                </div>
                <div className="text-gray-500">
                  <span className="text-xs">Assigned:</span>
                  <p className="font-medium text-gray-700">{asset.assignedTo || 'Unassigned'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedAsset(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedAsset.name}</h2>
                <p className="text-sm text-gray-500">{selectedAsset.assetCode}</p>
              </div>
              <button onClick={() => setSelectedAsset(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Barcode Section */}
              <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600 mb-3">Asset Barcode</p>
                {selectedAsset.assetCode ? (
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <Barcode value={selectedAsset.assetCode} width={2} height={60} fontSize={14} />
                  </div>
                ) : (
                  <p className="text-gray-400">No barcode available</p>
                )}
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`badge status-${selectedAsset.status}`}>
                  {selectedAsset.status}
                </span>
                <span className={`badge risk-${selectedAsset.riskLevel}`}>
                  {selectedAsset.riskLevel} risk
                </span>
                <span className="badge bg-gray-100 text-gray-700 capitalize">
                  {selectedAsset.condition}
                </span>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Category</p>
                  <p className="font-medium text-gray-900 flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {selectedAsset.category || 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Location</p>
                  <p className="font-medium text-gray-900 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {selectedAsset.location || 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Assigned To</p>
                  <p className="font-medium text-gray-900 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {selectedAsset.assignedTo || 'Unassigned'}
                  </p>
                </div>
              </div>

              {/* Purchase Info */}
              {(selectedAsset.purchaseDate || selectedAsset.purchasePrice || selectedAsset.supplier) && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Purchase Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedAsset.purchaseDate && (
                      <div>
                        <p className="text-gray-500">Purchase Date</p>
                        <p className="font-medium">{format(new Date(selectedAsset.purchaseDate), 'MMM dd, yyyy')}</p>
                      </div>
                    )}
                    {selectedAsset.purchasePrice && (
                      <div>
                        <p className="text-gray-500">Purchase Price</p>
                        <p className="font-medium">MVR {selectedAsset.purchasePrice.toLocaleString()}</p>
                      </div>
                    )}
                    {selectedAsset.supplier && (
                      <div className="col-span-2">
                        <p className="text-gray-500">Supplier</p>
                        <p className="font-medium">{selectedAsset.supplier}</p>
                      </div>
                    )}
                    {selectedAsset.warrantyExpiry && (
                      <div>
                        <p className="text-gray-500">Warranty Expires</p>
                        <p className="font-medium">{format(new Date(selectedAsset.warrantyExpiry), 'MMM dd, yyyy')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Maintenance Info */}
              {(selectedAsset.lastMaintenance || selectedAsset.nextMaintenance) && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Maintenance
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedAsset.lastMaintenance && (
                      <div>
                        <p className="text-gray-500">Last Maintenance</p>
                        <p className="font-medium">{format(new Date(selectedAsset.lastMaintenance), 'MMM dd, yyyy')}</p>
                      </div>
                    )}
                    {selectedAsset.nextMaintenance && (
                      <div>
                        <p className="text-gray-500">Next Maintenance</p>
                        <p className="font-medium">{format(new Date(selectedAsset.nextMaintenance), 'MMM dd, yyyy')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedAsset.description && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Description
                  </h3>
                  <p className="text-sm text-gray-600">{selectedAsset.description}</p>
                </div>
              )}

              {/* QR Code */}
              {selectedAsset.qrCode && (
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-600 mb-2">QR Code</p>
                  <img src={selectedAsset.qrCode} alt="QR Code" className="w-32 h-32" />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-3">
              <button onClick={() => setSelectedAsset(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                Close
              </button>
              <Link 
                to={`/assets/${selectedAsset.id}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                View Full Page
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
