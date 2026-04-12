import type { Asset, AssetStatus, AssetCategory, VehicleRenewal } from '../types';

// Mock data storage - replace with Firebase Firestore in production
let assets: Asset[] = [];

export interface CreateAssetData {
  name: string;
  assetCode: string;
  category: AssetCategory;
  status: AssetStatus;
  location: string;
  description?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  maintenanceIntervalDays?: number;
  isVehicle?: boolean;
  roadWorthiness?: VehicleRenewal;
  insurance?: VehicleRenewal;
  annualFee?: VehicleRenewal;
}

export interface UpdateAssetData extends Partial<CreateAssetData> {
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  riskScore?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  qrCode?: string;
  imageUrl?: string;
}

export const assetService = {
  // Create new asset
  async create(data: CreateAssetData, userId: string, userName: string): Promise<Asset> {
    const now = new Date().toISOString();
    
    const newAsset: Asset = {
      id: generateAssetId(),
      ...data,
      lastMaintenanceDate: undefined,
      nextMaintenanceDate: data.maintenanceIntervalDays 
        ? calculateNextMaintenanceDate(data.maintenanceIntervalDays)
        : undefined,
      riskScore: 0,
      riskLevel: 'low',
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      createdByName: userName,
    };
    
    // Calculate risk if it's a vehicle with renewal dates
    if (data.isVehicle) {
      newAsset.riskScore = calculateVehicleRiskScore(data);
      newAsset.riskLevel = getRiskLevelFromScore(newAsset.riskScore);
    }
    
    assets.push(newAsset);
    return newAsset;
  },

  // Update existing asset
  async update(id: string, data: UpdateAssetData): Promise<Asset | null> {
    const index = assets.findIndex(a => a.id === id);
    if (index === -1) return null;
    
    const now = new Date().toISOString();
    
    // If maintenance was performed, update dates
    if (data.lastMaintenanceDate) {
      const asset = assets[index];
      data.nextMaintenanceDate = asset.maintenanceIntervalDays
        ? calculateNextMaintenanceDate(asset.maintenanceIntervalDays, data.lastMaintenanceDate)
        : undefined;
    }
    
    // Recalculate risk if vehicle renewal data changed
    if (data.isVehicle !== undefined || data.roadWorthiness || data.insurance || data.annualFee) {
      const updatedAsset = { ...assets[index], ...data };
      if (updatedAsset.isVehicle) {
        data.riskScore = calculateVehicleRiskScore(updatedAsset);
        data.riskLevel = getRiskLevelFromScore(data.riskScore);
      }
    }
    
    assets[index] = {
      ...assets[index],
      ...data,
      updatedAt: now,
    };
    
    return assets[index];
  },

  // Delete asset
  async delete(id: string): Promise<boolean> {
    const index = assets.findIndex(a => a.id === id);
    if (index === -1) return false;
    
    assets.splice(index, 1);
    return true;
  },

  // Get asset by ID
  async getById(id: string): Promise<Asset | null> {
    return assets.find(a => a.id === id) || null;
  },

  // Get all assets
  async getAll(): Promise<Asset[]> {
    return [...assets].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  // Get assets by status
  async getByStatus(status: AssetStatus): Promise<Asset[]> {
    return assets.filter(a => a.status === status);
  },

  // Get assets by category
  async getByCategory(category: AssetCategory): Promise<Asset[]> {
    return assets.filter(a => a.category === category);
  },

  // Get vehicles only
  async getVehicles(): Promise<Asset[]> {
    return assets.filter(a => a.isVehicle === true);
  },

  // Get assets by risk level
  async getByRiskLevel(level: 'low' | 'medium' | 'high' | 'critical'): Promise<Asset[]> {
    return assets.filter(a => a.riskLevel === level);
  },

  // Get high risk assets (for alerts)
  async getHighRiskAssets(): Promise<Asset[]> {
    return assets.filter(a => a.riskLevel === 'high' || a.riskLevel === 'critical');
  },

  // Get assets needing maintenance
  async getAssetsNeedingMaintenance(): Promise<Asset[]> {
    const today = new Date().toISOString().split('T')[0];
    return assets.filter(a => {
      if (!a.nextMaintenanceDate) return false;
      return a.nextMaintenanceDate <= today;
    });
  },

  // Update maintenance date after work order completion
  async updateMaintenanceDate(assetId: string, date: string): Promise<Asset | null> {
    return this.update(assetId, { lastMaintenanceDate: date });
  },

  // Get asset statistics
  async getStatistics() {
    const total = assets.length;
    const operational = assets.filter(a => a.status === 'operational').length;
    const underMaintenance = assets.filter(a => a.status === 'under_maintenance').length;
    const outOfService = assets.filter(a => a.status === 'out_of_service').length;
    const highRisk = assets.filter(a => a.riskLevel === 'high' || a.riskLevel === 'critical').length;
    const vehicles = assets.filter(a => a.isVehicle).length;
    const vehiclesDueRenewal = assets.filter(a => {
      if (!a.isVehicle) return false;
      const today = new Date().toISOString().split('T')[0];
      return (a.roadWorthiness?.nextRenewalDate && a.roadWorthiness.nextRenewalDate <= today) ||
             (a.insurance?.nextRenewalDate && a.insurance.nextRenewalDate <= today) ||
             (a.annualFee?.nextRenewalDate && a.annualFee.nextRenewalDate <= today);
    }).length;
    
    return {
      total,
      operational,
      underMaintenance,
      outOfService,
      highRisk,
      vehicles,
      vehiclesDueRenewal,
    };
  },

  // Calculate risk score for all assets
  async calculateAllRiskScores(): Promise<void> {
    assets = assets.map(asset => {
      if (asset.isVehicle) {
        const riskScore = calculateVehicleRiskScore(asset);
        return {
          ...asset,
          riskScore,
          riskLevel: getRiskLevelFromScore(riskScore),
        };
      }
      return asset;
    });
  },

  // Check for upcoming vehicle renewals (next 30 days)
  async getUpcomingVehicleRenewals(): Promise<Asset[]> {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    return assets.filter(asset => {
      if (!asset.isVehicle) return false;
      
      const checkDate = (renewalDate?: string) => {
        if (!renewalDate) return false;
        const date = new Date(renewalDate);
        return date >= today && date <= thirtyDaysFromNow;
      };
      
      return checkDate(asset.roadWorthiness?.nextRenewalDate) ||
             checkDate(asset.insurance?.nextRenewalDate) ||
             checkDate(asset.annualFee?.nextRenewalDate);
    });
  },

  // Get expired vehicle renewals
  async getExpiredVehicleRenewals(): Promise<Asset[]> {
    const today = new Date().toISOString().split('T')[0];
    
    return assets.filter(asset => {
      if (!asset.isVehicle) return false;
      
      return (asset.roadWorthiness?.nextRenewalDate && asset.roadWorthiness.nextRenewalDate < today) ||
             (asset.insurance?.nextRenewalDate && asset.insurance.nextRenewalDate < today) ||
             (asset.annualFee?.nextRenewalDate && asset.annualFee.nextRenewalDate < today);
    });
  },
};

// Helper functions
function generateAssetId(): string {
  return 'AST-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

function calculateNextMaintenanceDate(intervalDays: number, fromDate?: string): string {
  const date = fromDate ? new Date(fromDate) : new Date();
  date.setDate(date.getDate() + intervalDays);
  return date.toISOString().split('T')[0];
}

function calculateVehicleRiskScore(asset: Partial<Asset>): number {
  let score = 0;
  const today = new Date();
  
  // Check road worthiness
  if (asset.roadWorthiness?.nextRenewalDate) {
    const rwDate = new Date(asset.roadWorthiness.nextRenewalDate);
    const daysUntilExpiry = Math.ceil((rwDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) score += 40; // Expired
    else if (daysUntilExpiry < 30) score += 30; // Expiring soon
    else if (daysUntilExpiry < 60) score += 15; // Expiring in 2 months
  }
  
  // Check insurance
  if (asset.insurance?.nextRenewalDate) {
    const insDate = new Date(asset.insurance.nextRenewalDate);
    const daysUntilExpiry = Math.ceil((insDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) score += 35; // Expired
    else if (daysUntilExpiry < 30) score += 25; // Expiring soon
    else if (daysUntilExpiry < 60) score += 10; // Expiring in 2 months
  }
  
  // Check annual fee
  if (asset.annualFee?.nextRenewalDate) {
    const feeDate = new Date(asset.annualFee.nextRenewalDate);
    const daysUntilExpiry = Math.ceil((feeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) score += 25; // Expired
    else if (daysUntilExpiry < 30) score += 15; // Expiring soon
    else if (daysUntilExpiry < 60) score += 5; // Expiring in 2 months
  }
  
  // General maintenance factor
  if (asset.status === 'under_maintenance') score += 10;
  if (asset.status === 'out_of_service') score += 20;
  
  // Cap at 100
  return Math.min(score, 100);
}

function getRiskLevelFromScore(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 90) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export default assetService;
