import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, deleteDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';
import { ArrowLeft, Edit, QrCode, Calendar, Wrench, Trash2, AlertTriangle, X } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import toast from 'react-hot-toast';

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.role === 'super_admin';
  
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  const queryClient = useQueryClient();

  const { data: asset, refetch } = useQuery(['asset', id], async () => {
    if (!id) return null;
    const docRef = doc(db, 'assets', id);
    const snap = await getDoc(docRef);
    const data = snap.exists() ? { id: snap.id, ...snap.data() } : null;
    if (data && !editForm) {
      setEditForm(data);
    }
    return data;
  });

  const { data: workOrders } = useQuery(['assetWorkOrders', id], async () => {
    if (!id) return [];
    const q = query(
      collection(db, 'work_orders'),
      where('assetId', '==', id),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  });

  const handleDelete = async () => {
    if (!id || !isSuperAdmin) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'assets', id));
      toast.success('Asset deleted successfully');
      // Invalidate assets list cache
      await queryClient.invalidateQueries(['assets']);
      navigate('/assets');
    } catch (error) {
      toast.error('Failed to delete asset');
      setDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!id || !editForm) return;
    try {
      const updateData: any = {
        name: editForm.name,
        manufacturer: editForm.manufacturer,
        model: editForm.model,
        serialNumber: editForm.serialNumber,
        type: editForm.type,
        vehicleCategory: editForm.vehicleCategory,
        status: editForm.status,
        updatedAt: new Date(),
      };
      
      // Only include riskLevel if it has a value
      if (editForm.riskLevel !== undefined && editForm.riskLevel !== null && editForm.riskLevel !== '') {
        updateData.riskLevel = editForm.riskLevel;
      }

      // Include vehicle renewal dates for vehicles
      if (editForm.type === 'vehicle') {
        updateData.roadWorthinessLast = editForm.roadWorthinessLast || '';
        updateData.roadWorthinessNext = editForm.roadWorthinessNext || '';
        updateData.insuranceLast = editForm.insuranceLast || '';
        updateData.insuranceNext = editForm.insuranceNext || '';
        updateData.annualFeeLast = editForm.annualFeeLast || '';
        updateData.annualFeeNext = editForm.annualFeeNext || '';
      }

      await updateDoc(doc(db, 'assets', id), updateData);
      toast.success('Asset updated successfully');
      setEditing(false);
      refetch();
    } catch (error) {
      console.error('Failed to update asset:', error);
      toast.error('Failed to update asset: ' + (error.message || 'Unknown error'));
    }
  };

  if (!asset) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/assets" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
            <p className="text-sm text-gray-500">{asset.assetCode}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowQRModal(true)}
            className="btn-secondary inline-flex items-center"
          >
            <QrCode className="h-4 w-4 mr-2" />
            QR Code
          </button>
          <button 
            onClick={() => {
              if (!editForm && asset) {
                setEditForm(asset);
              }
              setEditing(true);
            }}
            className="btn-primary inline-flex items-center"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </button>
          {isSuperAdmin && (
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Asset Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Manufacturer</p>
                <p className="font-medium">{asset.manufacturer || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Model</p>
                <p className="font-medium">{asset.model || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Serial Number</p>
                <p className="font-medium">{asset.serialNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-medium capitalize">{asset.type || 'Equipment'}</p>
              </div>
              {(asset.type === 'vehicle' || asset.type === 'machinery') && asset.vehicleCategory && (
                <div>
                  <p className="text-sm text-gray-500">Vehicle Category</p>
                  <p className="font-medium capitalize">{asset.vehicleCategory}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`badge status-${asset.status}`}>{asset.status}</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Risk Level</p>
                <span className={`badge risk-${asset.riskLevel}`}>{asset.riskLevel}</span>
              </div>
            </div>
          </div>

          {/* Vehicle Renewal Dates - Only for vehicles */}
          {asset.type === 'vehicle' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 6h-4a1 1 0 00-1 1v6.05A2.5 2.5 0 0111.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                </svg>
                Vehicle Renewal Dates
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Road Worthiness */}
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <h4 className="font-medium text-sm mb-2 text-green-800 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    R. Worthiness
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last:</span>
                      <span className="font-medium">{asset.roadWorthinessLast ? format(new Date(asset.roadWorthinessLast), 'dd-MM-yyyy') : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next:</span>
                      <span className={`font-medium ${asset.roadWorthinessNext && new Date(asset.roadWorthinessNext) < new Date() ? 'text-red-600' : 'text-green-700'}`}>
                        {asset.roadWorthinessNext ? format(new Date(asset.roadWorthinessNext), 'dd-MM-yyyy') : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Insurance */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-sm mb-2 text-blue-800 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Insurance
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last:</span>
                      <span className="font-medium">{asset.insuranceLast ? format(new Date(asset.insuranceLast), 'dd-MM-yyyy') : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next:</span>
                      <span className={`font-medium ${asset.insuranceNext && new Date(asset.insuranceNext) < new Date() ? 'text-red-600' : 'text-blue-700'}`}>
                        {asset.insuranceNext ? format(new Date(asset.insuranceNext), 'dd-MM-yyyy') : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Annual Fee */}
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-sm mb-2 text-purple-800 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Annual Fee
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last:</span>
                      <span className="font-medium">{asset.annualFeeLast ? format(new Date(asset.annualFeeLast), 'dd-MM-yyyy') : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next:</span>
                      <span className={`font-medium ${asset.annualFeeNext && new Date(asset.annualFeeNext) < new Date() ? 'text-red-600' : 'text-purple-700'}`}>
                        {asset.annualFeeNext ? format(new Date(asset.annualFeeNext), 'dd-MM-yyyy') : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Work Order History */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Work Order History</h2>
            {workOrders?.length === 0 ? (
              <p className="text-gray-500">No work orders found</p>
            ) : (
              <div className="space-y-3">
                {workOrders?.map((wo: DocumentData) => (
                  <Link
                    key={wo.id}
                    to={`/work-orders/${wo.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div>
                      <p className="font-medium text-primary-600">{wo.woNumber}</p>
                      <p className="text-sm text-gray-600">{wo.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge status-${wo.status}`}>{wo.status}</span>
                      <Wrench className="h-4 w-4 text-gray-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Maintenance Schedule</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Last Maintenance</p>
                  <p className="font-medium">
                    {asset.lastMaintenanceDate
                      ? format(asset.lastMaintenanceDate.toDate(), 'MMM d, yyyy')
                      : 'Never'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary-500" />
                <div>
                  <p className="text-sm text-gray-500">Next Scheduled</p>
                  <p className="font-medium">
                    {asset.nextMaintenanceDate
                      ? format(asset.nextMaintenanceDate.toDate(), 'MMM d, yyyy')
                      : 'Not scheduled'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Statistics</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Maintenance Cost</span>
                <span className="font-medium">${asset.totalMaintenanceCost?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Downtime (hours)</span>
                <span className="font-medium">{asset.downtimeHours || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Failure Count</span>
                <span className="font-medium">{asset.failureCount || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Asset QR Code</h2>
              <button onClick={() => setShowQRModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <QrCode className="h-32 w-32 text-gray-800" />
              </div>
              <p className="mt-4 text-center text-sm text-gray-600">
                {asset.assetCode} - {asset.name}
              </p>
              {asset.purchaseDate && (
                <p className="text-xs text-gray-500 mt-1">
                  Purchased: {format(new Date(asset.purchaseDate), 'MMM d, yyyy')}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">Scan to view asset details</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && editForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Asset</h2>
              <button onClick={() => setEditing(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={editForm.manufacturer || ''}
                  onChange={(e) => setEditForm({...editForm, manufacturer: e.target.value})}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <input
                  type="text"
                  value={editForm.model || ''}
                  onChange={(e) => setEditForm({...editForm, model: e.target.value})}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                <input
                  type="text"
                  value={editForm.serialNumber || ''}
                  onChange={(e) => setEditForm({...editForm, serialNumber: e.target.value})}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type</label>
                <select
                  value={editForm.type || ''}
                  onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                  className="input w-full"
                >
                  <option value="equipment">Equipment</option>
                  <option value="machinery">Machinery</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="building">Building</option>
                  <option value="it">IT Equipment</option>
                  <option value="furniture">Furniture</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              {/* Vehicle Category - only show for vehicles */}
              {(editForm.type === 'vehicle' || editForm.type === 'machinery') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Category</label>
                  <select
                    value={editForm.vehicleCategory || ''}
                    onChange={(e) => setEditForm({...editForm, vehicleCategory: e.target.value})}
                    className="input w-full"
                  >
                    <option value="">Select Category</option>
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="pickup">Pickup Truck</option>
                    <option value="truck">Truck</option>
                    <option value="van">Van</option>
                    <option value="bus">Bus</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="forklift">Forklift</option>
                    <option value="excavator">Excavator</option>
                    <option value="bulldozer">Bulldozer</option>
                    <option value="crane">Crane</option>
                    <option value="generator">Generator</option>
                    <option value="compressor">Compressor</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              {/* Vehicle Renewal Dates - only show for vehicles */}
              {editForm.type === 'vehicle' && (
                <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-sm mb-3 text-blue-900 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 6h-4a1 1 0 00-1 1v6.05A2.5 2.5 0 0111.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                    </svg>
                    Vehicle Renewal Dates
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Road Worthiness */}
                    <div className="bg-white p-3 rounded border">
                      <h5 className="font-medium text-xs mb-2 text-green-700">R. Worthiness</h5>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-gray-500">Last Renewal</label>
                          <input
                            type="date"
                            className="input w-full text-sm"
                            value={editForm.roadWorthinessLast || ''}
                            onChange={(e) => setEditForm({...editForm, roadWorthinessLast: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Next Renewal *</label>
                          <input
                            type="date"
                            className="input w-full text-sm"
                            value={editForm.roadWorthinessNext || ''}
                            onChange={(e) => setEditForm({...editForm, roadWorthinessNext: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Insurance */}
                    <div className="bg-white p-3 rounded border">
                      <h5 className="font-medium text-xs mb-2 text-blue-700">Insurance</h5>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-gray-500">Last Renewal</label>
                          <input
                            type="date"
                            className="input w-full text-sm"
                            value={editForm.insuranceLast || ''}
                            onChange={(e) => setEditForm({...editForm, insuranceLast: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Next Renewal *</label>
                          <input
                            type="date"
                            className="input w-full text-sm"
                            value={editForm.insuranceNext || ''}
                            onChange={(e) => setEditForm({...editForm, insuranceNext: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Annual Fee */}
                    <div className="bg-white p-3 rounded border">
                      <h5 className="font-medium text-xs mb-2 text-purple-700">Annual Fee</h5>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-gray-500">Last Renewal</label>
                          <input
                            type="date"
                            className="input w-full text-sm"
                            value={editForm.annualFeeLast || ''}
                            onChange={(e) => setEditForm({...editForm, annualFeeLast: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Next Renewal *</label>
                          <input
                            type="date"
                            className="input w-full text-sm"
                            value={editForm.annualFeeNext || ''}
                            onChange={(e) => setEditForm({...editForm, annualFeeNext: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editForm.status || ''}
                  onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                  className="input w-full"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
                <select
                  value={editForm.riskLevel || ''}
                  onChange={(e) => setEditForm({...editForm, riskLevel: e.target.value})}
                  className="input w-full"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 py-2 bg-gray-200 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <h2 className="text-xl font-bold">Delete Asset?</h2>
            </div>
            <p className="text-gray-600 mb-6">
              This will permanently delete <strong>{asset.name}</strong> ({asset.assetCode}). This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 bg-gray-200 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
