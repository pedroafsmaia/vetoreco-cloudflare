import { describe, it, expect } from 'vitest';
import {
  calculateUValue,
  calculateRTQR,
  calculateRTQC,
  validateNBR15575,
  calculateSolarFactor,
  type ThermalMaterial,
  type Layer,
  type BioclimaticZone
} from '../modules/thermalCalculations';

describe('Thermal Calculations', () => {
  
  // ============================================
  // U-VALUE TESTS
  // ============================================
  
  describe('calculateUValue', () => {
    it('should calculate U-value correctly for simple wall', () => {
      // Tijolo cerâmico 15cm
      const material: ThermalMaterial = {
        id: 'mat_002',
        name: 'Tijolo cerâmico 6 furos',
        thermal_conductivity: 0.90,
        density: 1000,
        specific_heat: 0.92
      };
      
      const layers: Layer[] = [
        { material, thickness: 0.15, order: 1 }
      ];
      
      const result = calculateUValue(layers, 'horizontal');
      
      // U = 1 / (0.04 + 0.15/0.90 + 0.13) = 1 / 0.337 ≈ 2.967
      expect(result.u).toBeCloseTo(2.967, 1);
      expect(result.rt).toBeCloseTo(0.337, 2);
    });
    
    it('should calculate U-value for wall with insulation', () => {
      // Parede com isolamento
      const brick: ThermalMaterial = {
        id: 'mat_002',
        name: 'Tijolo cerâmico',
        thermal_conductivity: 0.90,
        density: 1600,
        specific_heat: 0.92
      };
      
      const insulation: ThermalMaterial = {
        id: 'mat_040',
        name: 'Lã de vidro',
        thermal_conductivity: 0.045,
        density: 100,
        specific_heat: 0.70
      };
      
      const layers: Layer[] = [
        { material: brick, thickness: 0.10, order: 1 },
        { material: insulation, thickness: 0.05, order: 2 },
        { material: brick, thickness: 0.10, order: 3 }
      ];
      
      const result = calculateUValue(layers, 'horizontal');
      
      // With insulation, U should be much lower
      expect(result.u).toBeLessThan(1.0);
      expect(result.rt).toBeGreaterThan(1.0);
    });
    
    it('should calculate thermal capacity and time lag', () => {
      const concrete: ThermalMaterial = {
        id: 'mat_005',
        name: 'Concreto armado',
        thermal_conductivity: 1.75,
        density: 2400,
        specific_heat: 1.00
      };
      
      const layers: Layer[] = [
        { material: concrete, thickness: 0.15, order: 1 }
      ];
      
      const result = calculateUValue(layers, 'horizontal');
      
      // CT = 0.15 × 2400 × 1.00 = 360 kJ/m²·K
      expect(result.ct).toBeCloseTo(360, 0);
      
      // Time lag should be positive
      expect(result.phi).toBeGreaterThan(0);
    });
  });
  
  // ============================================
  // SOLAR FACTOR TESTS
  // ============================================
  
  describe('calculateSolarFactor', () => {
    it('should calculate solar factor correctly', () => {
      const u = 2.5;  // W/m²·K
      const absorptance = 0.70;
      
      const fs = calculateSolarFactor(u, absorptance);
      
      // FS = 2.5 × 0.70 × 0.04 = 0.07
      expect(fs).toBeCloseTo(0.07, 2);
    });
  });
  
  // ============================================
  // RTQ-R TESTS
  // ============================================
  
  describe('calculateRTQR', () => {
    const zone8: BioclimaticZone = {
      id: 8,
      name: 'Zona 8',
      rtqc_paft_max: 0.45,
      rtqc_upar_max: 3.70,
      rtqc_ucob_max: 2.00,
      rtqc_fs_max_paf60: 0.37,
      rtqc_fs_max_paf_greater: 0.27,
      nbr_upar_max: 3.70,
      nbr_ucob_max: 1.50,
      nbr_ct_min: 130,
      nbr_phi_min: 6.5,
      rtqr_equation_type: 'HOT'
    };
    
    it('should classify efficient residential project as A', () => {
      const inputs = {
        zone: zone8,
        totalFloorArea: 150,
        permanentArea: 120,
        transitoryArea: 30,
        avgWallU: 2.00,      // Low U
        avgRoofU: 1.00,      // Low U
        avgWallAbsorptance: 0.30,  // Light color
        avgRoofAbsorptance: 0.30,
        paft: 0.15,          // Small window area
        avgShgc: 0.40,       // Efficient glazing
        avs: 0.08            // Good ventilation
      };
      
      const result = calculateRTQR(inputs);
      
      expect(result.rating).toBe('A');
      expect(result.eqNumEnv).toBeGreaterThanOrEqual(5.0);
    });
    
    it('should classify standard residential project as C', () => {
      const inputs = {
        zone: zone8,
        totalFloorArea: 150,
        permanentArea: 120,
        transitoryArea: 30,
        avgWallU: 3.50,      // Near limit
        avgRoofU: 1.90,
        avgWallAbsorptance: 0.70,  // Dark
        avgRoofAbsorptance: 0.70,
        paft: 0.40,
        avgShgc: 0.75,
        avs: 0.05            // Minimum
      };
      
      const result = calculateRTQR(inputs);
      
      expect(result.rating).toBe('C');
      expect(result.eqNumEnv).toBeGreaterThanOrEqual(3.0);
      expect(result.eqNumEnv).toBeLessThan(4.0);
    });
  });
  
  // ============================================
  // RTQ-C TESTS
  // ============================================
  
  describe('calculateRTQC', () => {
    const zone5: BioclimaticZone = {
      id: 5,
      name: 'Zona 5',
      rtqc_paft_max: 0.50,
      rtqc_upar_max: 3.70,
      rtqc_ucob_max: 2.00,
      rtqc_fs_max_paf60: 0.61,
      rtqc_fs_max_paf_greater: 0.37,
      nbr_upar_max: 3.70,
      nbr_ucob_max: 2.30,
      nbr_ct_min: 130,
      nbr_phi_min: 6.5,
      rtqr_equation_type: 'HOT'
    };
    
    it('should detect PAFt violation', () => {
      const inputs = {
        zone: zone5,
        buildingUse: 'office',
        totalArea: 1200,
        conditionedArea: 1000,
        paft: 0.65,  // EXCEEDS 0.50
        avgWallU: 2.50,
        avgRoofU: 1.50,
        avgShgc: 0.40,
        avs: 0.06,
        totalLightingPower: 10000,
        illuminatedArea: 1000,
        hasAutomaticControl: true,
        hasDaylightIntegration: false,
        hvacSystems: [
          { type: 'split' as const, cop: 3.10, conditionedArea: 1000, certified: true }
        ]
      };
      
      const result = calculateRTQC(inputs);
      
      expect(result.violations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('PAFt')
        ])
      );
      expect(result.compliant).toBe(false);
    });
    
    it('should apply bonuses correctly', () => {
      const inputs = {
        zone: zone5,
        buildingUse: 'office',
        totalArea: 1200,
        conditionedArea: 1000,
        paft: 0.35,  // OK
        avgWallU: 2.20,
        avgRoofU: 1.20,
        avgShgc: 0.50,
        avs: 0.07,
        totalLightingPower: 8000,
        illuminatedArea: 1000,
        hasAutomaticControl: true,   // +0.2
        hasDaylightIntegration: true, // +0.3
        hvacSystems: [
          { type: 'split' as const, cop: 3.30, conditionedArea: 1000, certified: true }
        ]
      };
      
      const result = calculateRTQC(inputs);
      
      expect(result.bonuses.length).toBeGreaterThan(0);
      expect(result.compliant).toBe(true);
    });
    
    it('should calculate DPI correctly', () => {
      const inputs = {
        zone: zone5,
        buildingUse: 'office',
        totalArea: 1000,
        conditionedArea: 800,
        paft: 0.40,
        avgWallU: 3.00,
        avgRoofU: 1.80,
        avgShgc: 0.55,
        avs: 0.06,
        totalLightingPower: 6000,  // 6000W / 1000m² = 6 W/m²
        illuminatedArea: 1000,
        hasAutomaticControl: false,
        hasDaylightIntegration: false,
        hvacSystems: [
          { type: 'split' as const, cop: 3.00, conditionedArea: 800, certified: true }
        ]
      };
      
      const result = calculateRTQC(inputs);
      
      // DPI = 6 W/m², limit for office = 10 W/m²
      // Ratio = 6/10 = 0.6 → should be score 4
      expect(result.lightingScore).toBeGreaterThanOrEqual(4);
    });
  });
  
  // ============================================
  // NBR 15575 VALIDATION TESTS
  // ============================================
  
  describe('validateNBR15575', () => {
    const zone8: BioclimaticZone = {
      id: 8,
      name: 'Zona 8',
      rtqc_paft_max: 0.45,
      rtqc_upar_max: 3.70,
      rtqc_ucob_max: 2.00,
      rtqc_fs_max_paf60: 0.37,
      rtqc_fs_max_paf_greater: 0.27,
      nbr_upar_max: 3.70,
      nbr_ucob_max: 1.50,
      nbr_ct_min: 130,
      nbr_phi_min: 6.5,
      rtqr_equation_type: 'HOT'
    };
    
    it('should pass for compliant values', () => {
      const result = validateNBR15575(
        zone8,
        3.20,  // Wall U - OK
        1.30,  // Roof U - OK
        150,   // Wall CT - OK
        7.0    // Time lag - OK
      );
      
      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
    
    it('should detect wall U-value violation', () => {
      const result = validateNBR15575(
        zone8,
        4.50,  // EXCEEDS 3.70
        1.30,
        150,
        7.0
      );
      
      expect(result.compliant).toBe(false);
      expect(result.violations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Transmitância de parede')
        ])
      );
      expect(result.checks.wallU.ok).toBe(false);
    });
    
    it('should detect multiple violations', () => {
      const result = validateNBR15575(
        zone8,
        4.50,  // Wall U - FAIL
        2.00,  // Roof U - FAIL (exceeds 1.50)
        100,   // CT - FAIL (below 130)
        5.0    // Time lag - FAIL (below 6.5)
      );
      
      expect(result.compliant).toBe(false);
      expect(result.violations.length).toBe(4);
    });
  });
});
