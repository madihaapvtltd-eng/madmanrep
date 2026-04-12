import { useState, useEffect } from 'react';
import { assetService, type CreateAssetData } from '../../../shared/services/assetService';
import type { Asset, AssetCategory } from '../../../shared/types';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Car,
  AlertTriangle,
  Calendar,
  CheckCircle,
  X
} from 'lucide-react';

const categoryLabels: Record<AssetCategory, string> = {
  vehicle: 'Vehicle',
  equipment: 'Equipment',
  machinery: 'Machinery',
  hvac: 'HVAC',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  furniture: 'Furniture',
  it_equipment: 'IT Equipment',
  other: 'Other',
};

const statusColors: Record<string, string> = {
  operational: 'bg-green-100 text-green-800',
  under_maintenance: 'bg-yellow-100 text-yellow-800',
  out_of_service: 'bg-red-100 text-red-800',
  retired: 'bg-gray-100 text-gray-800',
};

const riskColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showVehiclesOnly, setShowVehiclesOnly] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<CreateAssetData>({
    name: '',
    assetCode: '',
    category: 'vehicle',
    status: 'operational',
    location: '',
    description: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    purchaseDate: '',
    warrantyExpiry: '',
    maintenanceIntervalDays: 30,
    isVehicle: true,
    roadWorthiness: {
      lastRenewalDate: '',
      nextRenewalDate: '',
    },
    insurance: {
      lastRenewalDate: '',
      nextRenewalDate: '',
    },
    annualFee: {
      lastRenewalDate: '',
      nextRenewalDate: '',
    },
  });

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    setLoading(true);
    const data = await assetService.getAll();
    setAssets(data);
    setLoading(false);
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.assetCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (showVehiclesOnly) {
      return matchesSearch && asset.isVehicle;
    }
    return matchesSearch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const userId = 'current-user-id'; // Replace with actual user ID
    const userName = 'Current User'; // Replace with actual user name
    
    if (editingAsset) {
      await assetService.update(editingAsset.id, formData);
    } else {
      await assetService.create(formData, userId, userName);
    }
    
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingAsset(null);
    resetForm();
    loadAssets();
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      assetCode: asset.assetCode,
      category: asset.category,
      status: asset.status,
      location: asset.location,
      description: asset.description || '',
      manufacturer: asset.manufacturer || '',
      model: asset.model || '',
      serialNumber: asset.serialNumber || '',
      purchaseDate: asset.purchaseDate || '',
      warrantyExpiry: asset.warrantyExpiry || '',
      maintenanceIntervalDays: asset.maintenanceIntervalDays,
      isVehicle: asset.isVehicle || false,
      roadWorthiness: asset.roadWorthiness || { lastRenewalDate: '', nextRenewalDate: '' },
      insurance: asset.insurance || { lastRenewalDate: '', nextRenewalDate: '' },
      annualFee: asset.annualFee || { lastRenewalDate: '', nextRenewalDate: '' },
    });
    setShowEditModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    await assetService.delete(id);
    loadAssets();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      assetCode: '',
      category: 'vehicle',
      status: 'operational',
      location: '',
      description: '',
      manufacturer: '',
      model: '',
      serialNumber: '',
      purchaseDate: '',
      warrantyExpiry: '',
      maintenanceIntervalDays: 30,
      isVehicle: true,
      roadWorthiness: {
        lastRenewalDate: '',
        nextRenewalDate: '',
      },
      insurance: {
        lastRenewalDate: '',
        nextRenewalDate: '',
      },
      annualFee: {
        lastRenewalDate: '',
        nextRenewalDate: '',
      },
    });
    setEditingAsset(null);
  };

  const updateRenewalField = (
    type: 'roadWorthiness' | 'insurance' | 'annualFee',
    field: 'lastRenewalDate' | 'nextRenewalDate',
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  const isVehicle = formData.category === 'vehicle';
  
  // DEBUG: Log values to trace the issue
  console.log('DEBUG - formData.category:', formData.category);
  console.log('DEBUG - isVehicle:', isVehicle);
  console.log('DEBUG - formData.isVehicle:', formData.isVehicle);

  // Helper to check if a renewal date is expired or expiring soon
  const getRenewalStatus = (nextDate?: string) => {
    if (!nextDate) return null;
    const today = new Date();
    const renewalDate = new Date(nextDate);
    const daysUntil = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return { status: 'expired', color: 'text-red-600', bgColor: 'bg-red-100' };
    if (daysUntil <= 30) return { status: 'expiring', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    return { status: 'valid', color: 'text-green-600', bgColor: 'bg-green-100' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assets</h1>
          <p className="text-muted-foreground">Manage your equipment, vehicles, and facilities</p>
        </div>
        <button 
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Add Asset
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={() => setShowVehiclesOnly(!showVehiclesOnly)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md border ${
            showVehiclesOnly 
              ? 'bg-primary text-primary-foreground border-primary' 
              : 'bg-background border-border hover:bg-accent'
          }`}
        >
          <Car className="w-4 h-4" />
          Vehicles Only
        </button>
      </div>

      {/* Assets Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-accent">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Asset</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Location</th>
                {showVehiclesOnly && (
                  <>
                    <th className="px-4 py-3 text-left text-sm font-medium">R. Worthiness</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Insurance</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Annual Fee</th>
                  </>
                )}
                <th className="px-4 py-3 text-left text-sm font-medium">Risk</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAssets.map((asset) => {
                const rwStatus = getRenewalStatus(asset.roadWorthiness?.nextRenewalDate);
                const insStatus = getRenewalStatus(asset.insurance?.nextRenewalDate);
                const feeStatus = getRenewalStatus(asset.annualFee?.nextRenewalDate);
                
                return (
                  <tr key={asset.id} className="hover:bg-accent/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {asset.isVehicle && <Car className="w-4 h-4 text-blue-500" />}
                        <div>
                          <p className="font-medium">{asset.name}</p>
                          <p className="text-sm text-muted-foreground">{asset.assetCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-accent rounded-md text-sm">
                        {categoryLabels[asset.category]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[asset.status]}`}>
                        {asset.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{asset.location}</td>
                    
                    {showVehiclesOnly && (
                      <>
                        <td className="px-4 py-3">
                          {asset.roadWorthiness?.nextRenewalDate ? (
                            <div className="flex flex-col">
                              <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${rwStatus?.bgColor} ${rwStatus?.color}`}>
                                {new Date(asset.roadWorthiness.nextRenewalDate).toLocaleDateString()}
                              </span>
                              {rwStatus?.status === 'expired' && (
                                <span className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Expired
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {asset.insurance?.nextRenewalDate ? (
                            <div className="flex flex-col">
                              <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${insStatus?.bgColor} ${insStatus?.color}`}>
                                {new Date(asset.insurance.nextRenewalDate).toLocaleDateString()}
                              </span>
                              {insStatus?.status === 'expired' && (
                                <span className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Expired
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {asset.annualFee?.nextRenewalDate ? (
                            <div className="flex flex-col">
                              <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${feeStatus?.bgColor} ${feeStatus?.color}`}>
                                {new Date(asset.annualFee.nextRenewalDate).toLocaleDateString()}
                              </span>
                              {feeStatus?.status === 'expired' && (
                                <span className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Expired
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                      </>
                    )}
                    
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${riskColors[asset.riskLevel || 'low']}`}>
                        {asset.riskLevel || 'low'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(asset)}
                          className="p-2 hover:bg-accent rounded-md"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(asset.id)}
                          className="p-2 hover:bg-accent rounded-md text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        
        {!loading && filteredAssets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No assets found. Add your first asset to get started.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-card rounded-lg border border-border w-full max-w-4xl p-6 m-4 my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingAsset ? 'Edit Asset' : 'Add New Asset'}
              </h2>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-accent rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Asset Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-accent rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="e.g., Toyota Land Cruiser"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Asset Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.assetCode}
                    onChange={(e) => setFormData({ ...formData, assetCode: e.target.value })}
                    className="w-full px-3 py-2 bg-accent rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="e.g., VH-001"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => {
                      const category = e.target.value as AssetCategory;
                      setFormData({ 
                        ...formData, 
                        category,
                        isVehicle: category === 'vehicle',
                      });
                    }}
                    className="w-full px-3 py-2 bg-accent rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="vehicle">Vehicle</option>
                    <option value="equipment">Equipment</option>
                    <option value="machinery">Machinery</option>
                    <option value="hvac">HVAC</option>
                    <option value="electrical">Electrical</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="furniture">Furniture</option>
                    <option value="it_equipment">IT Equipment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Status *</label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-accent rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="operational">Operational</option>
                    <option value="under_maintenance">Under Maintenance</option>
                    <option value="out_of_service">Out of Service</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-accent rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="e.g., Main Garage"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Maintenance Interval (Days)</label>
                  <input
                    type="number"
                    value={formData.maintenanceIntervalDays || ''}
                    onChange={(e) => setFormData({ ...formData, maintenanceIntervalDays: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-accent rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="30"
                  />
                </div>
              </div>

              {/* Vehicle Renewal Dates - Only show for vehicles */}
              {isVehicle && (
                <div className="border-t border-border pt-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    Vehicle Renewal Dates
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Road Worthiness */}
                    <div className="bg-accent/50 rounded-lg p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        R. Worthiness
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-muted-foreground mb-1">Last Renewal Date</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                              type="date"
                              value={formData.roadWorthiness?.lastRenewalDate || ''}
                              onChange={(e) => updateRenewalField('roadWorthiness', 'lastRenewalDate', e.target.value)}
                              className="w-full pl-10 pr-3 py-2 bg-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-muted-foreground mb-1">Next Renewal Date *</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                              type="date"
                              required={isVehicle}
                              value={formData.roadWorthiness?.nextRenewalDate || ''}
                              onChange={(e) => updateRenewalField('roadWorthiness', 'nextRenewalDate', e.target.value)}
                              className="w-full pl-10 pr-3 py-2 bg-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Insurance */}
                    <div className="bg-accent/50 rounded-lg p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                        Insurance
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-muted-foreground mb-1">Last Renewal Date</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                              type="date"
                              value={formData.insurance?.lastRenewalDate || ''}
                              onChange={(e) => updateRenewalField('insurance', 'lastRenewalDate', e.target.value)}
                              className="w-full pl-10 pr-3 py-2 bg-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-muted-foreground mb-1">Next Renewal Date *</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                              type="date"
                              required={isVehicle}
                              value={formData.insurance?.nextRenewalDate || ''}
                              onChange={(e) => updateRenewalField('insurance', 'nextRenewalDate', e.target.value)}
                              className="w-full pl-10 pr-3 py-2 bg-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Annual Fee */}
                    <div className="bg-accent/50 rounded-lg p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-purple-500" />
                        Annual Fee
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-muted-foreground mb-1">Last Renewal Date</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                              type="date"
                              value={formData.annualFee?.lastRenewalDate || ''}
                              onChange={(e) => updateRenewalField('annualFee', 'lastRenewalDate', e.target.value)}
                              className="w-full pl-10 pr-3 py-2 bg-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-muted-foreground mb-1">Next Renewal Date *</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                              type="date"
                              required={isVehicle}
                              value={formData.annualFee?.nextRenewalDate || ''}
                              onChange={(e) => updateRenewalField('annualFee', 'nextRenewalDate', e.target.value)}
                              className="w-full pl-10 pr-3 py-2 bg-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Information */}
              <div className="border-t border-border pt-4">
                <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Manufacturer</label>
                    <input
                      type="text"
                      value={formData.manufacturer || ''}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      className="w-full px-3 py-2 bg-accent rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="e.g., Toyota"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Model</label>
                    <input
                      type="text"
                      value={formData.model || ''}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full px-3 py-2 bg-accent rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="e.g., Land Cruiser"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Serial Number</label>
                    <input
                      type="text"
                      value={formData.serialNumber || ''}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-accent rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Purchase Date</label>
                    <input
                      type="date"
                      value={formData.purchaseDate || ''}
                      onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                      className="w-full px-3 py-2 bg-accent rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Warranty Expiry</label>
                    <input
                      type="date"
                      value={formData.warrantyExpiry || ''}
                      onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
                      className="w-full px-3 py-2 bg-accent rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-accent rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
                    placeholder="Additional details about the asset..."
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  {editingAsset ? 'Update Asset' : 'Create Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
