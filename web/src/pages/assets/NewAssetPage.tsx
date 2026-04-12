import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from 'react-query';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { SearchableLocationDropdown } from '@/components/ui/SearchableLocationDropdown';
import { uploadMultipleImages } from '@/lib/cloudinary';
import { Link, useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';
import { ALL_LOCATIONS } from '@/lib/locations';
import { DEPARTMENTS } from '@/lib/departments';
import toast from 'react-hot-toast';
import { ArrowLeft, Building2, MapPin, Tag, FileText, Printer, QrCode } from 'lucide-react';
import JsBarcode from 'jsbarcode';

export function NewAssetPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const queryClient = useQueryClient();
  const [dynamicLocations, setDynamicLocations] = useState<any[]>([]);
  const barcodeRef = useRef<SVGSVGElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'equipment',
    location: '',
    department: '',
    assetCode: '',
    barcode: '',
    status: 'operational',
    priority: 'medium',
    description: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    purchaseDate: '',
    warrantyExpiry: '',
    lastMaintenance: '',
    nextMaintenance: '',
    images: [] as string[],
    // Vehicle renewal fields
    roadWorthinessLast: '',
    roadWorthinessNext: '',
    insuranceLast: '',
    insuranceNext: '',
    annualFeeLast: '',
    annualFeeNext: '',
  });

  // Load dynamic locations from Firebase
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const locSnap = await getDocs(collection(db, 'settings', 'locations', 'items'));
        const loadedLocations = locSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log('Loaded dynamic locations:', loadedLocations.length, loadedLocations);
        setDynamicLocations(loadedLocations);
      } catch (error) {
        console.error('Failed to load locations:', error);
        toast.error('Failed to load locations');
      }
    };
    loadLocations();
  }, []);

  // Auto-generate asset code when department and location are selected
  useEffect(() => {
    if (formData.department && formData.location && !formData.assetCode) {
      generateNewAssetCode();
    }
  }, [formData.department, formData.location]);

  // Generate barcode when asset code changes
  useEffect(() => {
    if (formData.assetCode && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, formData.assetCode, {
          format: 'CODE128',
          width: 2,
          height: 100,
          displayValue: true,
          fontSize: 14,
          margin: 10,
        });
        setShowBarcode(true);
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [formData.assetCode]);

  const generateNewAssetCode = async () => {
    if (!formData.department) {
      toast.error('Please select a department first');
      return;
    }
    if (!formData.location) {
      toast.error('Please select a location first');
      return;
    }

    setGeneratingCode(true);
    try {
      // Get year from purchase date or current year
      const year = formData.purchaseDate 
        ? new Date(formData.purchaseDate).getFullYear().toString().slice(-2) // Last 2 digits
        : new Date().getFullYear().toString().slice(-2);
      
      // Get location short name
      const selectedLocation = dynamicLocations.find((loc: any) => loc.value === formData.location);
      const locationShortName = selectedLocation?.shortName || selectedLocation?.value?.slice(0, 2) || 'XX';
      
      // Get department code (uppercase, first 2 chars)
      const deptCode = formData.department.toUpperCase().slice(0, 2);
      
      // Generate sequential number (get count of existing assets with same pattern)
      const assetsSnap = await getDocs(collection(db, 'assets'));
      const prefix = `MD${deptCode}${year}${locationShortName}`;
      const existingCodes = assetsSnap.docs
        .map(d => d.data().assetCode)
        .filter(code => code?.startsWith(prefix));
      const seqNum = (existingCodes.length + 1).toString().padStart(3, '0');
      
      // Format: MD + Dept + Year + LocationShort + Sequential
      // Example: MDIT25AM001
      const code = `${prefix}${seqNum}`;
      
      setFormData((prev) => ({ ...prev, assetCode: code, barcode: code }));
      toast.success(`Asset code generated: ${code}`);
    } catch (error) {
      toast.error('Failed to generate asset code');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handlePrintBarcode = () => {
    if (!barcodeRef.current) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const svg = barcodeRef.current.outerHTML;
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Asset Barcode - ${formData.assetCode}</title>
            <style>
              body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: Arial, sans-serif; }
              .barcode-container { text-align: center; padding: 20px; border: 1px dashed #ccc; }
              .asset-info { margin-top: 10px; font-size: 12px; color: #666; }
              .asset-name { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
              @media print { body { margin: 0; } .no-print { display: none; } }
            </style>
          </head>
          <body>
            <div class="barcode-container">
              ${svg}
              <div class="asset-info">
                <div class="asset-name">${formData.name || 'Asset Name'}</div>
                <div>Code: ${formData.assetCode}</div>
                <div>Dept: ${formData.department?.toUpperCase() || 'N/A'}</div>
                ${formData.purchaseDate ? `<div>Purchased: ${new Date(formData.purchaseDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</div>` : ''}
              </div>
              <button class="no-print" onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">Print Barcode</button>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assetCode) {
      toast.error('Please generate an asset code first');
      return;
    }
    setLoading(true);
    try {
      let barcodeDataUrl = '';
      if (barcodeRef.current) {
        const svgData = new XMLSerializer().serializeToString(barcodeRef.current);
        barcodeDataUrl = 'data:image/svg+xml;base64,' + btoa(svgData);
      }
      await addDoc(collection(db, 'assets'), {
        ...formData,
        barcodeSvg: barcodeDataUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.id || 'unknown',
        createdByName: user?.name || user?.email || 'Unknown User',
      });
      
      // Invalidate assets cache to refresh list
      await queryClient.invalidateQueries(['assets']);
      
      toast.success(`Asset ${formData.assetCode} created successfully!`);
      navigate('/assets');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/assets" className="btn btn-secondary">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add New Asset</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Asset Name */}
                <div className="md:col-span-2">
                  <label className="label">Asset Name *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      required
                      className="input pl-10"
                      placeholder="Enter asset name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                {/* Department - Required for code generation */}
                <div>
                  <label className="label">Department *</label>
                  <select
                    required
                    className="input"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value, assetCode: '' })}
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept.value} value={dept.value}>{dept.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Required for auto-generating asset code</p>
                </div>

                {/* Asset Code */}
                <div>
                  <label className="label">Asset Code *</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        required
                        readOnly
                        className="input pl-10 bg-gray-50"
                        placeholder="MADIT0012"
                        value={formData.assetCode}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={generateNewAssetCode}
                      disabled={!formData.department || !formData.location || generatingCode}
                      className="btn btn-secondary whitespace-nowrap"
                    >
                      {generatingCode ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Format: MD + Dept + Year + Location + Seq (e.g., MDIT25AM001)</p>
                </div>

            <div>
              <label className="label">Asset Type *</label>
              <select
                required
                className="input"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
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

            {/* Vehicle Renewal Dates - Only show when type is vehicle */}
            {formData.type === 'vehicle' && (
              <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-4 text-blue-900 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                    <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 6h-4a1 1 0 00-1 1v6.05A2.5 2.5 0 0111.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                  </svg>
                  Vehicle Renewal Dates
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Road Worthiness */}
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-medium text-sm mb-2 text-green-700 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      R. Worthiness
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-500">Last Renewal</label>
                        <input
                          type="date"
                          className="input w-full text-sm"
                          value={formData.roadWorthinessLast}
                          onChange={(e) => setFormData({ ...formData, roadWorthinessLast: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Next Renewal *</label>
                        <input
                          type="date"
                          required={formData.type === 'vehicle'}
                          className="input w-full text-sm"
                          value={formData.roadWorthinessNext}
                          onChange={(e) => setFormData({ ...formData, roadWorthinessNext: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Insurance */}
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-medium text-sm mb-2 text-blue-700 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Insurance
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-500">Last Renewal</label>
                        <input
                          type="date"
                          className="input w-full text-sm"
                          value={formData.insuranceLast}
                          onChange={(e) => setFormData({ ...formData, insuranceLast: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Next Renewal *</label>
                        <input
                          type="date"
                          required={formData.type === 'vehicle'}
                          className="input w-full text-sm"
                          value={formData.insuranceNext}
                          onChange={(e) => setFormData({ ...formData, insuranceNext: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Annual Fee */}
                  <div className="bg-white p-3 rounded border md:col-span-2">
                    <h4 className="font-medium text-sm mb-2 text-purple-700 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Annual Fee
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">Last Renewal</label>
                        <input
                          type="date"
                          className="input w-full text-sm"
                          value={formData.annualFeeLast}
                          onChange={(e) => setFormData({ ...formData, annualFeeLast: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Next Renewal *</label>
                        <input
                          type="date"
                          required={formData.type === 'vehicle'}
                          className="input w-full text-sm"
                          value={formData.annualFeeNext}
                          onChange={(e) => setFormData({ ...formData, annualFeeNext: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <SearchableLocationDropdown
                label="Location"
                locations={[...dynamicLocations, ...ALL_LOCATIONS]}
                value={formData.location}
                onChange={(value) => setFormData({ ...formData, location: value })}
                required
              />
            </div>

            <div>
              <label className="label">Status *</label>
              <select
                required
                className="input"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="operational">Operational</option>
                <option value="maintenance">Under Maintenance</option>
                <option value="repair">Needs Repair</option>
                <option value="offline">Offline</option>
                <option value="retired">Retired</option>
              </select>
            </div>

            <div>
              <label className="label">Priority *</label>
              <select
                required
                className="input"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="label">Manufacturer</label>
              <input
                type="text"
                className="input"
                placeholder="Enter manufacturer"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Model</label>
              <input
                type="text"
                className="input"
                placeholder="Enter model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Serial Number</label>
              <input
                type="text"
                className="input"
                placeholder="Enter serial number"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Purchase Date</label>
              <input
                type="date"
                className="input"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Warranty Expiry</label>
              <input
                type="date"
                className="input"
                value={formData.warrantyExpiry}
                onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Last Maintenance</label>
              <input
                type="date"
                className="input"
                value={formData.lastMaintenance}
                onChange={(e) => setFormData({ ...formData, lastMaintenance: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Next Maintenance</label>
              <input
                type="date"
                className="input"
                value={formData.nextMaintenance}
                onChange={(e) => setFormData({ ...formData, nextMaintenance: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">Asset Images</label>
              <ImageUpload
                images={formData.images}
                onChange={(images) => setFormData({ ...formData, images })}
                maxImages={5}
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">Description</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <textarea
                  rows={3}
                  className="input pl-10"
                  placeholder="Enter asset description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t">
            <Link to="/assets" className="btn btn-secondary flex-1">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !formData.assetCode}
              className="btn btn-primary flex-1"
            >
              {loading ? 'Creating...' : 'Create Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>

    {/* Barcode Preview Panel */}
    <div className="lg:col-span-1">
      <div className="card sticky top-4">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Barcode Preview
        </h2>
        
        {formData.assetCode ? (
          <div className="text-center">
            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 mb-4">
              <svg ref={barcodeRef} className="w-full"></svg>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handlePrintBarcode}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2"
              >
                <Printer className="h-5 w-5" />
                Print Barcode
              </button>
              
              <button
                onClick={() => setShowBarcode(!showBarcode)}
                className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                {showBarcode ? 'Hide Barcode' : 'Show Barcode'}
              </button>
              
              <div className="text-xs text-gray-500 mt-4 bg-gray-50 p-3 rounded-lg">
                <p className="font-medium">Asset Code:</p>
                <p className="text-lg font-bold text-gray-900">{formData.assetCode}</p>
                
                {formData.department && (
                  <>
                    <p className="font-medium mt-2">Department:</p>
                    <p>{DEPARTMENTS.find(d => d.value === formData.department)?.label}</p>
                  </>
                )}
                
                <p className="font-medium mt-2">Format:</p>
                <p className="text-gray-600">MD + Dept + Year + Location + Seq</p>
                <p className="mt-1 text-gray-400">Example: MDIT25AM001</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <QrCode className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="font-medium mb-2">No Asset Code Generated</p>
            <p className="text-sm">Select department and location to generate asset code</p>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <p>👆 Select Department and Location first</p>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
</div>
  );
}
