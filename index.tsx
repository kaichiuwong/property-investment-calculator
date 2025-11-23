import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ReferenceLine,
  ComposedChart
} from 'recharts';
import {
  Calculator,
  Building2,
  DollarSign,
  TrendingUp,
  MapPin,
  RefreshCw,
  ChevronDown,
  Sparkles,
  Sun,
  Moon,
  LandPlot,
  Undo2,
  HelpCircle,
  Clock,
  Hash,
  RotateCcw,
  Printer
} from 'lucide-react';
import './index.css';
import { SUBURB_DB_RAW } from './suburbs';

// --- Types & Constants ---

type PropertyType = 'House' | 'Townhouse' | 'Apartment' | 'Home & Land' | 'Old Home';
type AustralianState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';

interface CalculatorState {
  propertyType: PropertyType;
  state: AustralianState;
  postcode: string;
  price: number;
  interestRate: number;
  loanTerm: number;
  lvr: number;
  suburb: string;
  weeklyRent: number;
  capitalGrowth: number; // %
  inflationRate: number; // % for expenses
  rentalGrowthRate: number; // % for rent specifically
  
  // Expenses
  landValue: number;
  councilRates: number;
  insurance: number;
  bodyCorp: number;
  propertyManagerRate: number; // %
  waterRates: number;
  landTax: number;
  maintenance: number;
}

interface SuburbItem {
  name: string;
  state: string;
  postcode: string;
}

// Fix: Use commas instead of pipes for array elements
const PROPERTY_TYPES: PropertyType[] = ['House', 'Townhouse', 'Apartment', 'Home & Land', 'Old Home'];
const STATES: AustralianState[] = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

const ESTIMATED_LAND_VALUE_RATIO: Record<PropertyType, number> = {
  'House': 0.45,
  'Townhouse': 0.43,
  'Apartment': 0.30,
  'Home & Land': 0.65,
  'Old Home': 0.95
};

const ESTIMATED_GROWTH_RATE: Record<PropertyType, number> = {
  'House': 4.00,
  'Townhouse': 3.00,
  'Apartment': 1.00,
  'Home & Land': 3.50,
  'Old Home': 4.00
};

// --- Helper Functions ---

const calculateLandTax = (landValue: number, state: AustralianState): number => {
  if (state === 'VIC') {
    // Simplified VIC 2024 Investment Land Tax scales
    if (landValue < 50000) return 0;
    if (landValue < 250000) return 0 + (landValue - 50000) * 0.002; // $0 + 0.2%
    if (landValue < 600000) return 400 + (landValue - 250000) * 0.005; // $400 + 0.5%
    if (landValue < 1000000) return 2150 + (landValue - 600000) * 0.008; // $2150 + 0.8%
    if (landValue < 1800000) return 5350 + (landValue - 1000000) * 0.013; // $5350 + 1.3%
    if (landValue < 3000000) return 15750 + (landValue - 1800000) * 0.018; // $15750 + 1.8%
    return 37350 + (landValue - 3000000) * 0.02; // >3m
  }
  
  if (state === 'NSW') {
    // NSW 2024 Land Tax Thresholds
    const threshold = 1075000;
    const premiumThreshold = 6571000;

    if (landValue < threshold) return 0;
    
    if (landValue < premiumThreshold) {
        return 100 + (landValue - threshold) * 0.016;
    }
    
    return 88036 + (landValue - premiumThreshold) * 0.02;
  }

  if (state === 'QLD') {
    // QLD 2024-2025 Land Tax Rates for Individuals
    // Source: https://qro.qld.gov.au/land-tax/calculate/individual/
    if (landValue < 600000) return 0;
    if (landValue < 1000000) return 500 + (landValue - 600000) * 0.01; // $500 + 1.0c for each $1 > $600k
    if (landValue < 3000000) return 4500 + (landValue - 1000000) * 0.0165; // $4,500 + 1.65c for each $1 > $1m
    if (landValue < 5000000) return 37500 + (landValue - 3000000) * 0.0125; // $37,500 + 1.25c for each $1 > $3m
    return 62500 + (landValue - 5000000) * 0.0175; // $62,500 + 1.75c for each $1 > $5m
  }

  if (state === 'SA') {
    // SA 2024-2025 Land Tax Rates (General)
    // Source: https://www.revenuesa.sa.gov.au/landtax/rates-and-thresholds
    if (landValue <= 534000) return 0;
    if (landValue <= 801000) return (landValue - 534000) * 0.005; 
    if (landValue <= 1133000) return 1335 + (landValue - 801000) * 0.01;
    if (landValue <= 1466000) return 4655 + (landValue - 1133000) * 0.02;
    return 11315 + (landValue - 1466000) * 0.024;
  }

  if (state === 'TAS') {
    // TAS 2024-2025 General Land Tax Rates
    // Source: https://www.sro.tas.gov.au/land-tax/rates-of-land-tax
    if (landValue < 50000) return 0;
    if (landValue < 100000) return (landValue - 50000) * 0.0055;
    if (landValue < 250000) return 275 + (landValue - 100000) * 0.0055;
    if (landValue < 500000) return 1100 + (landValue - 250000) * 0.0125;
    return 4225 + (landValue - 500000) * 0.015;
  }

  if (state === 'WA') {
    // WA 2024-2025 Land Tax Rates
    // Source: https://www.wa.gov.au/organisation/department-of-treasury-and-finance/land-tax-assessment
    if (landValue <= 300000) return 0;
    if (landValue <= 420000) return 300;
    if (landValue <= 1000000) return 300 + (landValue - 420000) * 0.0025;
    if (landValue <= 1800000) return 1750 + (landValue - 1000000) * 0.0090;
    if (landValue <= 5000000) return 8950 + (landValue - 1800000) * 0.0180;
    if (landValue <= 11000000) return 66550 + (landValue - 5000000) * 0.0200;
    return 186550 + (landValue - 11000000) * 0.0265;
  }
  
  return 0;
};

// Helper to generate fresh default state with correct calculations
const getInitialState = (): CalculatorState => {
    const price = 850000;
    const propertyType: PropertyType = 'House';
    const state: AustralianState = 'VIC';
    
    const landValRatio = ESTIMATED_LAND_VALUE_RATIO[propertyType];
    const landValue = Math.round(price * landValRatio);
    
    return {
        propertyType,
        state,
        postcode: '3121',
        price,
        interestRate: 6.10,
        loanTerm: 30,
        lvr: 80,
        suburb: 'Richmond',
        weeklyRent: 650,
        capitalGrowth: ESTIMATED_GROWTH_RATE[propertyType], // Default from updated map
        inflationRate: 2.8,
        rentalGrowthRate: 5.5,
        
        // Pre-calculate default expenses so resetting works correctly even if effects don't trigger
        landValue,
        councilRates: Math.round(price * 0.0042),
        insurance: Math.round(price * 0.003),
        bodyCorp: 0,
        propertyManagerRate: 10,
        waterRates: 840,
        landTax: Math.round(calculateLandTax(landValue, state)),
        maintenance: 1000
    };
};

// --- Components ---

const InfoTooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block ml-1 print:hidden">
    <HelpCircle className="w-3 h-3 text-gray-400 cursor-help" />
    <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded p-2 z-50 text-center shadow-lg pointer-events-none">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
    </div>
  </div>
);

// New component for Expenses Breakdown
const ExpensesWithBreakdown = ({ breakdown, totalExpenses, divisor, label }: { breakdown: any, totalExpenses: number, divisor: number, label: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Helper for formatting
    const fmt = (val: number) => `$${Math.round(val / divisor).toLocaleString()}`;

    return (
        <div className="relative" ref={ref}>
            <div 
                className="flex justify-between items-center mb-2 cursor-pointer group"
                onClick={() => setIsOpen(!isOpen)}
                role="button"
                aria-label="Show expense breakdown"
            >
                <span className="text-sm text-gray-600 dark:text-gray-300 border-b border-dashed border-gray-400 dark:border-gray-500 group-hover:text-blue-500 transition-colors flex items-center gap-1 print:border-none">
                    {label} <HelpCircle className="w-3 h-3 text-gray-400 print:hidden" />
                </span>
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    -{fmt(totalExpenses)}
                </span>
            </div>
            {isOpen && (
                <div className="absolute left-0 bottom-full mb-2 w-64 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-4 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 text-sm print:hidden">
                     <h4 className="font-semibold mb-3 pb-2 border-b border-gray-100 dark:border-gray-700 text-xs uppercase tracking-wide">Expense Breakdown</h4>
                     
                     <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                        <div className="flex justify-between font-medium text-red-600 dark:text-red-400">
                            <span>Mortgage</span>
                            <span>{fmt(breakdown.repayment)}</span>
                        </div>
                        {breakdown.council > 0 && <div className="flex justify-between text-gray-600 dark:text-gray-400 text-xs"><span>Council Rates</span><span>{fmt(breakdown.council)}</span></div>}
                        {breakdown.landTax > 0 && <div className="flex justify-between text-gray-600 dark:text-gray-400 text-xs"><span>Land Tax</span><span>{fmt(breakdown.landTax)}</span></div>}
                        {breakdown.bodyCorp > 0 && <div className="flex justify-between text-gray-600 dark:text-gray-400 text-xs"><span>Body Corp</span><span>{fmt(breakdown.bodyCorp)}</span></div>}
                        {breakdown.insurance > 0 && <div className="flex justify-between text-gray-600 dark:text-gray-400 text-xs"><span>Insurance</span><span>{fmt(breakdown.insurance)}</span></div>}
                        {breakdown.pmFee > 0 && <div className="flex justify-between text-gray-600 dark:text-gray-400 text-xs"><span>Property Mgmt</span><span>{fmt(breakdown.pmFee)}</span></div>}
                        {breakdown.water > 0 && <div className="flex justify-between text-gray-600 dark:text-gray-400 text-xs"><span>Water</span><span>{fmt(breakdown.water)}</span></div>}
                        {breakdown.maintenance > 0 && <div className="flex justify-between text-gray-600 dark:text-gray-400 text-xs"><span>Maintenance</span><span>{fmt(breakdown.maintenance)}</span></div>}
                     </div>

                     <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between font-bold text-gray-900 dark:text-white">
                        <span>Total</span>
                        <span>{fmt(totalExpenses)}</span>
                     </div>
                     <div className="absolute -bottom-2 left-6 w-4 h-4 bg-white dark:bg-gray-800 border-b border-r border-gray-200 dark:border-gray-700 rotate-45"></div>
                </div>
            )}
        </div>
    );
};

// Formatted Number Input Component
// Displays comma-separated values (e.g. 850,000) when not focused,
// and reverts to standard number input when editing for better UX/Mobile support.
// Also supports step via arrow keys.
const FormattedNumberInput = ({ value, onChange, step = 1, className, placeholder, icon: Icon, min, max, ...props }: any) => {
  // We keep internal string state to allow "unformatted" editing
  const [inputValue, setInputValue] = useState<string>("");
  const [isFocused, setIsFocused] = useState(false);

  // Sync internal state with external prop when not focused (or on mount)
  useEffect(() => {
    if (!isFocused) {
       // Fix: Check strictly for undefined/null so 0 is rendered as "0"
       setInputValue((value !== undefined && value !== null) ? Number(value).toLocaleString() : "");
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    // Fix: Check strictly for undefined/null so 0 is rendered in input when focused
    setInputValue((value !== undefined && value !== null) ? value.toString() : "");
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Formatting happens in useEffect due to dependency on isFocused
    // Validation on Blur
    let val = Number(inputValue.replace(/,/g, ''));
    let newVal = val;
    if (min !== undefined && val < min) newVal = min;
    if (max !== undefined && val > max) newVal = max;
    
    if (newVal !== val) {
        onChange(newVal);
        setInputValue(newVal.toString()); // Update visual immediately
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '') {
         setInputValue('');
         onChange(0);
         return;
    }

    if (!isNaN(Number(raw))) {
        // Prevent negative inputs immediately during typing
        if (Number(raw) < 0) return;

        setInputValue(e.target.value);
        onChange(Number(raw));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const current = Number(inputValue.replace(/,/g, '') || 0);
          const delta = e.key === 'ArrowUp' ? step : -step;
          let next = current + delta;
          
          if (min !== undefined) next = Math.max(min, next);
          if (max !== undefined) next = Math.min(max, next);
          
          setInputValue(next.toString());
          onChange(next);
      }
  };

  return (
    <div className="relative w-full">
        {Icon && <Icon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none z-10 print:hidden" />}
        <input
            type="text" // Using text to allow commas
            inputMode="decimal" // Helps mobile keyboards
            className={`${className} print:border-none print:bg-transparent print:p-0 print:pl-0 print:text-right print:appearance-none print:w-full print:h-auto`}
            value={inputValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            {...props}
        />
    </div>
  );
};

interface CustomGraphTooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string | number;
    setViewYear?: (year: number) => void;
    currentViewYear?: number;
}

const CustomGraphTooltip = ({ active, payload, label, setViewYear, currentViewYear }: CustomGraphTooltipProps) => {
  // Sync slider with chart hover
  useEffect(() => {
    if (active && label !== undefined && setViewYear) {
        const year = Number(label);
        // Only update if it's different to prevent potential cycles, though state update batching usually handles this
        if (year !== currentViewYear) {
            setViewYear(year);
        }
    }
  }, [active, label, setViewYear, currentViewYear]);

  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 rounded-lg shadow-xl text-sm z-50">
        <p className="font-bold text-gray-900 dark:text-white mb-2 pb-1 border-b border-gray-100 dark:border-gray-700">
          Year {label}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                {/* Handle line vs area legend icon */}
                {entry.type === undefined ? (
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                ) : (
                    <div className="w-3 h-0.5" style={{ backgroundColor: entry.color }} />
                )}
                <span className="text-gray-600 dark:text-gray-300 font-medium">{entry.name}</span>
              </div>
              <span className={`font-mono font-semibold ${entry.name === 'Net Cash Flow' ? (entry.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') : 'text-gray-900 dark:text-white'}`}>
                 {entry.name === 'Net Cash Flow' && entry.value > 0 ? '+' : ''}
                 ${Number(entry.value).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        
        {/* Extra Context for Cash Flow Chart */}
        {data.breakdown && payload.some((p: any) => p.dataKey === 'netCashFlow') && (
           <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Mortgage Repayments</span>
                  <span>${data.breakdown.repayment.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>Operating Expenses</span>
                  <span>${(data.expenses).toLocaleString()}</span>
              </div>
           </div>
        )}
      </div>
    );
  }
  return null;
};

// Helper component for Expense Sliders
interface ExpenseSliderRowProps {
    label: string;
    infoText: string;
    value: number;
    onChange: (val: number) => void;
    isOverridden?: boolean;
    onReset?: () => void;
    max: number;
}

const ExpenseSliderRow = ({ label, infoText, value, onChange, isOverridden, onReset, max }: ExpenseSliderRowProps) => {
    return (
        <div className="mb-4 last:mb-0 print:mb-2 print:flex print:justify-between print:border-b print:border-gray-100 print:pb-1">
            <div className="flex justify-between items-center mb-1 print:mb-0">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center">
                    {label} <InfoTooltip text={infoText} />
                </label>
                {isOverridden && onReset && (
                     <button 
                        onClick={onReset} 
                        className="text-blue-500 hover:text-blue-600 flex items-center gap-1 ml-auto print:hidden"
                        title="Reset to estimated value"
                    >
                        <Undo2 className="w-3 h-3" /> 
                        <span className="text-[10px] font-medium">Auto</span>
                    </button>
                )}
            </div>
            <div className="flex items-center gap-3">
                 <input 
                    type="range" 
                    min="0" 
                    max={max}
                    className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 print:hidden"
                    value={Math.min(value, max) || 0}
                    onChange={(e) => onChange(Number(e.target.value))}
                />
                <div className="w-24 print:w-auto">
                     <FormattedNumberInput
                        className={`w-full px-2 py-1 text-right text-sm border rounded-md bg-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isOverridden ? 'border-blue-300 dark:border-blue-700' : 'border-gray-200 dark:border-gray-600'} print:border-none print:p-0 print:text-right print:font-mono`}
                        value={value}
                        onChange={onChange}
                        max={max}
                        min={0}
                    />
                </div>
            </div>
        </div>
    );
}

const App = () => {
  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Print state
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Listen for print events to render both charts
  useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
        window.removeEventListener('beforeprint', handleBeforePrint);
        window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // Initial State
  const [data, setData] = useState<CalculatorState>(getInitialState);

  // Track manual overrides for calculated fields
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [rentEstimateLoading, setRentEstimateLoading] = useState(false);

  // Suburb Data State
  const [allSuburbs, setAllSuburbs] = useState<SuburbItem[]>([]);
  
  // Initialize Suburbs from Hardcoded List
  useEffect(() => {
      const parsed = SUBURB_DB_RAW.map(entry => {
          const [name, state, postcode] = entry.split('|');
          return { name, state, postcode };
      });
      setAllSuburbs(parsed);
  }, []);

  // Autocomplete State for Suburb
  const [suburbSuggestions, setSuburbSuggestions] = useState<SuburbItem[]>([]);
  const [showSuburbSuggestions, setShowSuburbSuggestions] = useState(false);
  const suburbInputRef = useRef<HTMLDivElement>(null);

  // Autocomplete State for Postcode
  const [postcodeSuggestions, setPostcodeSuggestions] = useState<SuburbItem[]>([]);
  const [showPostcodeSuggestions, setShowPostcodeSuggestions] = useState(false);
  const postcodeInputRef = useRef<HTMLDivElement>(null);

  // Time Travel State
  const [viewYear, setViewYear] = useState(0);
  const [chartMode, setChartMode] = useState<'wealth' | 'cashflow'>('cashflow');

  // --- API ---

  const fetchRentEstimate = async (suburbOverride?: string, stateOverride?: string, typeOverride?: PropertyType) => {
    const suburbToUse = suburbOverride || data.suburb;
    const stateToUse = stateOverride || data.state;
    const typeToUse = typeOverride || data.propertyType;

    if (!suburbToUse) return; // Silent return
    if (!process.env.API_KEY) return; // Silent return if no key

    // Map 'Old Home' and 'Home & Land' to 'House' for better AI estimation
    let searchType = typeToUse;
    if (typeToUse === 'Old Home' || typeToUse === 'Home & Land') {
        searchType = 'House';
    }

    setRentEstimateLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Estimate the median weekly rental income for a ${searchType} in ${suburbToUse}, ${stateToUse}, Australia, with a market value of approx $${data.price}. Return JSON with key 'weeklyRent' (number).`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              weeklyRent: { type: Type.NUMBER, description: "Estimated weekly rent in AUD" }
            }
          }
        }
      });
      
      const jsonText = response.text;
      if (jsonText) {
        const result = JSON.parse(jsonText);
        if (result.weeklyRent) {
            handleInputChange('weeklyRent', result.weeklyRent);
        }
      }
    } catch (e) {
      console.error("Rent estimate failed", e);
    } finally {
      setRentEstimateLoading(false);
    }
  };

  // --- Handlers ---

  const handleInputChange = (field: keyof CalculatorState, value: any) => {
    // If user manually changes a calculated field, mark it as overridden
    if (['landValue', 'councilRates', 'insurance', 'bodyCorp', 'landTax', 'capitalGrowth'].includes(field)) {
        setOverrides(prev => ({ ...prev, [field]: true }));
    }
    // Prevent negative numbers on basic change handler
    if (typeof value === 'number') {
        value = Math.max(0, value);
    }
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleFullReset = () => {
      // Reset to fresh state (with re-calculated defaults) immediately
      setData(getInitialState());
      setOverrides({});
      setAiAnalysis(null);
      setViewYear(0);
      setChartMode('cashflow');
      // Clear suggestions state
      setSuburbSuggestions([]);
      setPostcodeSuggestions([]);
      setShowSuburbSuggestions(false);
      setShowPostcodeSuggestions(false);
  };

  const handleSuburbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      handleInputChange('suburb', val);
      
      if (val.length > 0) {
          // Strict "starts with" filtering
          const filtered = allSuburbs.filter(s => 
              s.name.toLowerCase().startsWith(val.toLowerCase())
          ).slice(0, 10); // Limit results
          
          setSuburbSuggestions(filtered);
          setShowSuburbSuggestions(true);
      } else {
          setSuburbSuggestions([]);
          setShowSuburbSuggestions(false);
      }
  };

  const handleSuburbSelect = (suburb: SuburbItem) => {
      handleInputChange('suburb', suburb.name);
      // Ensure state is valid valid AustralianState, otherwise default or keep simple string if strictly needed
      const mappedState = STATES.includes(suburb.state as AustralianState) ? (suburb.state as AustralianState) : data.state;
      handleInputChange('state', mappedState);
      
      if (suburb.postcode) {
          handleInputChange('postcode', suburb.postcode);
      }
      setShowSuburbSuggestions(false);
      
      // Auto-trigger rent estimate with the new values
      fetchRentEstimate(suburb.name, mappedState);
  };

  const handlePostcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      handleInputChange('postcode', val);

      if (val.length > 0) {
          const filtered = allSuburbs.filter(s => 
              s.postcode.startsWith(val)
          ).slice(0, 10);
          setPostcodeSuggestions(filtered);
          setShowPostcodeSuggestions(true);
      } else {
          setPostcodeSuggestions([]);
          setShowPostcodeSuggestions(false);
      }
  };

  const handlePostcodeSelect = (item: SuburbItem) => {
      handleInputChange('postcode', item.postcode);
      handleInputChange('suburb', item.name);
      
      const mappedState = STATES.includes(item.state as AustralianState) ? (item.state as AustralianState) : data.state;
      handleInputChange('state', mappedState);
      
      setShowPostcodeSuggestions(false);
      
      fetchRentEstimate(item.name, mappedState);
  };

  const handlePrint = () => {
      setIsPrinting(true);
      // Delay printing slightly to allow React to render the second chart (which is usually hidden)
      setTimeout(() => {
          window.print();
          setIsPrinting(false);
      }, 200);
  };

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (suburbInputRef.current && !suburbInputRef.current.contains(event.target as Node)) {
            setShowSuburbSuggestions(false);
        }
        if (postcodeInputRef.current && !postcodeInputRef.current.contains(event.target as Node)) {
            setShowPostcodeSuggestions(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResetOverride = (field: string) => {
    setOverrides(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
    });
  };

  // --- Auto-Calculation Logic ---

  // Update Land Value Estimate based on Property Type & Price
  useEffect(() => {
    if (overrides.landValue) return;

    const ratio = ESTIMATED_LAND_VALUE_RATIO[data.propertyType] || 0.45;
    const estimatedLand = Math.round(data.price * ratio);
    
    setData(prev => ({
      ...prev,
      landValue: estimatedLand
    }));
  }, [data.price, data.propertyType, overrides.landValue]);

  // Update Capital Growth based on Property Type
  useEffect(() => {
    if (overrides.capitalGrowth) return;

    const growthRate = ESTIMATED_GROWTH_RATE[data.propertyType] || 4.0;
    
    setData(prev => ({
      ...prev,
      capitalGrowth: growthRate
    }));
  }, [data.propertyType, overrides.capitalGrowth]);

  // Update Expenses based on Price/Rent/LandValue
  useEffect(() => {
    setData(prev => {
        const updates: Partial<CalculatorState> = {};
        
        // Council Rates: Price * 0.0042
        if (!overrides.councilRates) {
            updates.councilRates = Math.round(prev.price * 0.0042);
        }
        
        // Insurance: 0.3% of Price
        if (!overrides.insurance) {
            updates.insurance = Math.round(prev.price * 0.003);
        }
        
        // Body Corp: 1% for Strata (Apt/Townhouse), 0 for others
        if (!overrides.bodyCorp) {
            const isStrata = prev.propertyType === 'Apartment' || prev.propertyType === 'Townhouse';
            updates.bodyCorp = isStrata ? Math.round(prev.price * 0.01) : 0;
        }
        
        // Land Tax
        if (!overrides.landTax) {
            updates.landTax = Math.round(calculateLandTax(prev.landValue, prev.state));
        }

        if (Object.keys(updates).length === 0) return prev;

        return {
            ...prev,
            ...updates
        };
    });
  }, [data.price, data.propertyType, data.landValue, data.state, overrides]);


  // --- Derived Calculations ---

  const loanAmount = useMemo(() => data.price * (data.lvr / 100), [data.price, data.lvr]);
  
  const monthlyRepayment = useMemo(() => {
    const r = data.interestRate / 100 / 12;
    const n = data.loanTerm * 12;
    if (r === 0) return loanAmount / n;
    return (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }, [loanAmount, data.interestRate, data.loanTerm]);

  const annualRepayment = monthlyRepayment * 12;

  // Projections with Inflation
  const projections = useMemo(() => {
    const years = 30;
    const proj = [];
    
    // Initial Values
    let currentValue = data.price;
    const initialAnnualRent = data.weeklyRent * 52;
    
    // Repayments are fixed for standard variable/fixed loans (simplified)
    const annualRepay = annualRepayment;
    
    for (let year = 0; year <= years; year++) {
      // Loan Balance
      let balance = 0;
      if (year < data.loanTerm) {
         const r = data.interestRate / 100 / 12;
         const n = data.loanTerm * 12;
         const monthsPassed = year * 12;
         if (r === 0) {
            balance = loanAmount - (loanAmount / n) * monthsPassed;
         } else {
            balance = (loanAmount * (Math.pow(1 + r, n) - Math.pow(1 + r, monthsPassed))) / (Math.pow(1 + r, n) - 1);
         }
      }
      balance = Math.max(0, balance);

      // Inflation Multipliers
      const rentInflationMult = Math.pow(1 + data.rentalGrowthRate / 100, year);
      const expenseInflationMult = Math.pow(1 + data.inflationRate / 100, year);
      
      // Inflated Income
      const currentAnnualRent = initialAnnualRent * rentInflationMult;
      
      // Inflated Expenses
      // Note: PM fee is % of rent, so it scales with rent
      const currentPmFee = currentAnnualRent * (data.propertyManagerRate / 100);
      
      // Other expenses scale with general expense inflation
      const currentCouncil = data.councilRates * expenseInflationMult;
      const currentInsurance = data.insurance * expenseInflationMult;
      const currentBodyCorp = data.bodyCorp * expenseInflationMult;
      const currentLandTax = data.landTax * expenseInflationMult;
      const currentWater = data.waterRates * expenseInflationMult;
      const currentMaintenance = data.maintenance * expenseInflationMult;
      
      const totalOperatingExpenses = currentCouncil + currentInsurance + currentBodyCorp + currentLandTax + currentWater + currentMaintenance + currentPmFee;
      
      // Net Cash Flow = Income - Loan - Operating Expenses
      const netCashFlow = currentAnnualRent - annualRepay - totalOperatingExpenses;
      
      proj.push({
        year: year,
        label: `Year ${year}`,
        value: Math.round(currentValue),
        loan: Math.round(balance),
        equity: Math.round(currentValue - balance),
        
        rentalIncome: Math.round(currentAnnualRent),
        expenses: Math.round(totalOperatingExpenses + annualRepay), // For chart "Total Expenses" line (includes repayment)
        operatingExpenses: Math.round(totalOperatingExpenses),
        netCashFlow: Math.round(netCashFlow),
        
        // Breakdown for current year view
        breakdown: {
            council: Math.round(currentCouncil),
            insurance: Math.round(currentInsurance),
            bodyCorp: Math.round(currentBodyCorp),
            landTax: Math.round(currentLandTax),
            water: Math.round(currentWater),
            maintenance: Math.round(currentMaintenance),
            pmFee: Math.round(currentPmFee),
            repayment: Math.round(annualRepay)
        }
      });
      
      // Capital Growth for next year
      currentValue = currentValue * (1 + data.capitalGrowth / 100);
    }
    return proj;
  }, [data, loanAmount, annualRepayment]);

  // Current View Data (based on slider)
  const currentStats = projections[viewYear];
  const weeklyCashFlow = currentStats.netCashFlow / 52;
  const currentGrossYield = currentStats.value > 0 ? (currentStats.rentalIncome / currentStats.value) * 100 : 0;

  const fetchAiAnalysis = async () => {
    if (!process.env.API_KEY) return alert("API Key missing.");
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Use Year 0 data for analysis
      const year0 = projections[0];
      
      const prompt = `
        Act as an Australian property investment expert. Analyze this deal:
        - Location: ${data.suburb}, ${data.state} ${data.postcode}
        - Type: ${data.propertyType}
        - Price: $${data.price}
        - Weekly Rent: $${data.weeklyRent}
        - Total Annual Expenses: $${year0.expenses}
        - Net Cash Flow (Year 0): $${year0.netCashFlow}/yr
        - Gross Yield: ${currentGrossYield.toFixed(2)}%

        Provide a concise analysis (max 150 words) on:
        1. Whether the yield is healthy for this property type.
        2. Risks associated with this cash flow position.
        3. Potential for capital growth based on property type.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setAiAnalysis(response.text ?? null);
    } catch (e) {
      console.error("Analysis failed", e);
      setAiAnalysis("Unable to generate analysis.");
    } finally {
      setAiLoading(false);
    }
  };

  const ResetButton = ({ field }: { field: string }) => (
    <button 
        onClick={() => handleResetOverride(field)} 
        className="text-blue-500 hover:text-blue-600 flex items-center gap-1 ml-auto print:hidden"
        title="Reset to estimated value"
    >
        <Undo2 className="w-3 h-3" /> 
        <span className="text-[10px] font-medium">Auto</span>
    </button>
  );

  const renderCashFlowChart = () => (
      <ComposedChart 
        data={projections}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#374151" : "#e5e7eb"} />
        <XAxis 
            dataKey="year" 
            stroke={darkMode ? "#9ca3af" : "#6b7280"}
            tick={{fontSize: 12}}
            tickMargin={10}
        />
        <YAxis 
            tickFormatter={(val) => `$${val/1000}k`}
            stroke={darkMode ? "#9ca3af" : "#6b7280"}
            tick={{fontSize: 12}}
        />
        <RechartsTooltip 
            content={<CustomGraphTooltip setViewYear={setViewYear} currentViewYear={viewYear} />} 
            cursor={{ stroke: darkMode ? '#6b7280' : '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4' }} 
        />
        <Legend />
        <ReferenceLine y={0} stroke={darkMode ? "#e5e7eb" : "#000"} strokeWidth={2} />
        
        <Area type="monotone" dataKey="rentalIncome" name="Rental Income" stroke="#10b981" strokeWidth={2} fill="url(#colorIncome)" />
        <Area type="monotone" dataKey="expenses" name="Total Expenses" stroke="#f59e0b" strokeWidth={2} fill="url(#colorExpenses)" />
        <Area type="monotone" dataKey="netCashFlow" name="Net Cash Flow" stroke="#6366f1" strokeWidth={2} fill="url(#colorNet)" />
      </ComposedChart>
  );

  const renderWealthChart = () => (
      <ComposedChart 
        data={projections}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorLoan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#374151" : "#e5e7eb"} />
        <XAxis 
            dataKey="year" 
            stroke={darkMode ? "#9ca3af" : "#6b7280"}
            tick={{fontSize: 12}}
            tickMargin={10}
        />
        <YAxis 
            tickFormatter={(val) => `$${val/1000}k`}
            stroke={darkMode ? "#9ca3af" : "#6b7280"}
            tick={{fontSize: 12}}
        />
        <RechartsTooltip 
            content={<CustomGraphTooltip setViewYear={setViewYear} currentViewYear={viewYear} />} 
            cursor={{ stroke: darkMode ? '#6b7280' : '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4' }} 
        />
        <Legend />
        <ReferenceLine y={data.price} stroke="#9ca3af" strokeDasharray="3 3" label={{ value: "Purchase Price", position: 'insideTopLeft', fill: darkMode ? "#9ca3af" : "#6b7280", fontSize: 10 }} />
        <Area type="monotone" dataKey="value" name="Property Value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
        <Area type="monotone" dataKey="loan" name="Loan Balance" stroke="#ef4444" fillOpacity={1} fill="url(#colorLoan)" strokeWidth={2} />
        <Line type="monotone" dataKey="equity" name="Equity" stroke="#10b981" strokeWidth={3} dot={false} />
      </ComposedChart>
  );

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-200 text-gray-800 dark:text-gray-100 flex flex-col print:bg-white print:p-0`}>
      <div className="max-w-7xl mx-auto space-y-6 flex-grow w-full print:space-y-4">
        
        {/* Print Header */}
        <div className="hidden print:block border-b-2 border-gray-800 pb-4 mb-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Property Investment Report</h1>
                    <p className="text-lg text-gray-600 mt-1">{data.suburb}, {data.state} {data.postcode}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
                    <p className="text-sm font-semibold text-gray-700 mt-1">Property Calculator (AUD)</p>
                </div>
            </div>
        </div>

        {/* Header (Screen Only) */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-lg shadow-lg">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Property Calculator <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">(AUD)</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end md:self-auto">
             <button
                onClick={handlePrint}
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:opacity-80 transition-colors flex items-center gap-2"
                title="Export as PDF"
            >
                <Printer className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                <span className="hidden md:inline text-sm font-medium text-gray-700 dark:text-gray-300">Export PDF</span>
            </button>
             <button
                onClick={handleFullReset}
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:opacity-80 transition-colors"
                aria-label="Reset Calculator"
                title="Reset to Defaults"
            >
                <RotateCcw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:opacity-80 transition-colors"
                aria-label="Toggle dark mode"
            >
                {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </button>
            <button 
                onClick={fetchAiAnalysis}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-all shadow-md font-medium"
            >
                {aiLoading ? <RefreshCw className="animate-spin w-4 h-4"/> : <Sparkles className="w-4 h-4" />}
                <span className="hidden md:inline">AI Analysis</span>
                <span className="md:hidden">Analyze</span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
          
          {/* Inputs Column */}
          <div className="lg:col-span-4 space-y-6 print:grid print:grid-cols-2 print:gap-6 print:space-y-0 print:mb-6">
            
            {/* Property Details Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors print:shadow-none print:border-none print:p-0">
              <h2 className="text-lg font-semibold mb-5 flex items-center gap-2 text-gray-900 dark:text-white print:text-gray-900 print:border-b print:border-gray-200 print:pb-2">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400 print:hidden" />
                Property Details
              </h2>
              
              <div className="space-y-4 print:space-y-2">
                
                {/* Suburb Input with Autocomplete (Moved to top) */}
                <div ref={suburbInputRef} className="relative z-30 print:hidden">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex justify-between">
                    <span>Suburb</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      className="w-full pl-10 pr-3 py-2 text-base md:text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                      placeholder="e.g. Richmond"
                      value={data.suburb}
                      onChange={handleSuburbChange}
                      onFocus={() => data.suburb && handleSuburbChange({ target: { value: data.suburb } } as any)}
                    />
                  </div>
                  
                  {/* Autocomplete Dropdown */}
                  {showSuburbSuggestions && suburbSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 max-h-60 overflow-y-auto z-50">
                          {suburbSuggestions.map((suburb, idx) => (
                              <div 
                                key={`${suburb.name}-${suburb.state}-${idx}`}
                                className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-700 dark:text-gray-200 border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                                onClick={() => handleSuburbSelect(suburb)}
                              >
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">{suburb.name}, {suburb.postcode}</span>
                                    <span className="text-gray-400 text-xs">{suburb.state}</span>
                                </div>
                              </div>
                          ))}
                      </div>
                  )}
                </div>

                {/* Print only Location Display */}
                <div className="hidden print:flex justify-between border-b border-gray-100 pb-1">
                    <span className="text-sm text-gray-600">Location</span>
                    <span className="text-sm font-medium">{data.suburb}, {data.state} {data.postcode}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 relative z-20 print:hidden">
                    {/* Postcode Input */}
                    <div ref={postcodeInputRef} className="relative">
                         <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Postcode</label>
                         <div className="relative">
                            <Hash className="absolute left-3 top-2.5 w-3 h-3 text-gray-400" />
                            <input 
                                type="text"
                                className="w-full pl-8 pr-2 py-2 text-base md:text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                                placeholder="3121"
                                value={data.postcode}
                                onChange={handlePostcodeChange}
                                onFocus={() => data.postcode && handlePostcodeChange({ target: { value: data.postcode } } as any)}
                            />
                         </div>
                         {showPostcodeSuggestions && postcodeSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 w-64 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 max-h-60 overflow-y-auto z-50">
                                {postcodeSuggestions.map((item, idx) => (
                                    <div 
                                        key={`${item.postcode}-${idx}`}
                                        className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-700 dark:text-gray-200 border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                                        onClick={() => handlePostcodeSelect(item)}
                                    >
                                        <span className="font-semibold">{item.postcode}</span> - {item.name}, {item.state}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* State Dropdown */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
                        <div className="relative">
                            <select 
                            className="w-full pl-2 pr-6 py-2 text-base md:text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                            value={data.state}
                            onChange={(e) => handleInputChange('state', e.target.value)}
                            >
                            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2 top-3 w-3 h-3 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Property Type Dropdown */}
                <div className="relative z-10 print:flex print:justify-between print:border-b print:border-gray-100 print:pb-1">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 print:text-sm print:text-gray-600 print:mb-0">Type</label>
                    <div className="relative print:hidden">
                        <select 
                        className="w-full pl-2 pr-6 py-2 text-base md:text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                        value={data.propertyType}
                        onChange={(e) => {
                            const newType = e.target.value as PropertyType;
                            handleInputChange('propertyType', newType);
                            fetchRentEstimate(undefined, undefined, newType);
                        }}
                        >
                        {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-3 w-3 h-3 text-gray-400 pointer-events-none" />
                    </div>
                    <span className="hidden print:block text-sm font-medium">{data.propertyType}</span>
                </div>

                <div className="print:flex print:justify-between print:border-b print:border-gray-100 print:pb-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 print:text-sm print:text-gray-600 print:mb-0">Purchase Price</label>
                  <FormattedNumberInput
                      step={1000}
                      className="w-full pl-10 pr-3 py-2 text-base md:text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors print:border-none print:p-0 print:text-right print:font-mono"
                      value={data.price}
                      onChange={(val: number) => handleInputChange('price', val)}
                      icon={DollarSign}
                      min={0}
                  />
                </div>

                <div className="pt-2 print:pt-0 print:flex print:justify-between print:border-b print:border-gray-100 print:pb-1">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between print:text-sm print:text-gray-600 print:mb-0">
                        <div className="flex flex-col print:flex-row print:gap-1">
                           <div className="flex items-center">
                              <span>Est. Land Value</span>
                              <InfoTooltip text="Approximate land value based on property type (e.g., 45% for houses, 30% for apartments). Affects land tax." />
                           </div>
                           <span className="text-gray-400 text-[10px] font-normal print:hidden">{(data.landValue/data.price * 100).toFixed(0)}% of Price</span>
                        </div>
                        {overrides.landValue && <ResetButton field="landValue" />}
                    </label>
                    <FormattedNumberInput
                        className={`w-full pl-10 pr-3 py-2 text-base md:text-sm bg-gray-50 dark:bg-gray-800/50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-colors ${overrides.landValue ? 'border-blue-300 dark:border-blue-700' : 'border-gray-200 dark:border-gray-600'} print:border-none print:p-0 print:bg-transparent print:text-right print:font-mono`}
                        value={data.landValue}
                        onChange={(val: number) => handleInputChange('landValue', val)}
                        icon={LandPlot}
                        min={0}
                        max={data.price}
                    />
                </div>
              </div>
            </div>

            {/* Loan Card - MOVED HERE */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors print:shadow-none print:border-none print:p-0">
              <h2 className="text-lg font-semibold mb-5 flex items-center gap-2 text-gray-900 dark:text-white print:text-gray-900 print:border-b print:border-gray-200 print:pb-2">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400 print:hidden" />
                Loan & Finance
              </h2>
              
              <div className="space-y-4 print:space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="print:flex print:justify-between print:border-b print:border-gray-100 print:pb-1 print:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 print:text-sm print:text-gray-600 print:mb-0">LVR (%)</label>
                    <input 
                      type="number"
                      className="w-full px-3 py-2 text-base md:text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors print:border-none print:bg-transparent print:p-0 print:text-right print:font-mono print:w-auto"
                      value={data.lvr}
                      onChange={(e) => handleInputChange('lvr', Number(e.target.value))}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="print:flex print:justify-between print:border-b print:border-gray-100 print:pb-1 print:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 print:text-sm print:text-gray-600 print:mb-0">Rate (%)</label>
                    <input 
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 text-base md:text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors print:border-none print:bg-transparent print:p-0 print:text-right print:font-mono print:w-auto"
                      value={data.interestRate}
                      onChange={(e) => handleInputChange('interestRate', Number(e.target.value))}
                      min={0}
                      max={200}
                    />
                  </div>
                </div>

                <div className="print:flex print:justify-between print:border-b print:border-gray-100 print:pb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 print:text-sm print:text-gray-600 print:mb-0">Loan Term (Years)</label>
                    <input 
                      type="range"
                      min="5"
                      max="30"
                      className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 print:hidden"
                      value={data.loanTerm}
                      onChange={(e) => handleInputChange('loanTerm', Number(e.target.value))}
                    />
                    <div className="text-right text-sm text-gray-500 dark:text-gray-400 mt-1 print:text-left print:font-mono print:text-gray-900 print:mt-0">{data.loanTerm} years</div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700 print:border-none print:pt-2">
                  <div className="flex justify-between items-center mb-1 print:border-b print:border-gray-100 print:pb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 print:text-gray-600">Weekly Rent (per week)</label>
                    <button 
                      onClick={() => fetchRentEstimate()}
                      disabled={!data.suburb || rentEstimateLoading}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1 disabled:opacity-50 print:hidden"
                    >
                      {rentEstimateLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Estimate
                    </button>
                  </div>
                  <div className="flex items-center gap-3 print:block">
                        <input 
                        type="range" 
                        min="0" 
                        max="10000" 
                        step="10"
                        className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 print:hidden"
                        value={data.weeklyRent || 0}
                        onChange={(e) => handleInputChange('weeklyRent', Number(e.target.value))}
                        />
                        <div className="w-28 relative print:w-full">
                           <FormattedNumberInput
                                icon={DollarSign}
                                className="w-full pl-8 pr-2 py-1.5 text-right text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all print:border-none print:p-0 print:font-mono"
                                value={data.weeklyRent}
                                onChange={(val: number) => handleInputChange('weeklyRent', val)}
                                step={10}
                                min={0}
                                max={10000}
                            />
                        </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Expenses Breakdown Card - MOVED HERE */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors print:shadow-none print:border-none print:p-0 print:col-span-2">
                 <h2 className="text-lg font-semibold mb-5 flex items-center gap-2 text-gray-900 dark:text-white print:text-gray-900 print:border-b print:border-gray-200 print:pb-2">
                    <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400 print:hidden" />
                    Annual Expenses
                </h2>
                <div className="space-y-3 print:space-y-2">
                    <div className="grid grid-cols-2 gap-3 mb-4 print:mb-2">
                         <div className="print:flex print:justify-between print:border-b print:border-gray-100 print:pb-1 print:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex justify-between print:text-sm print:text-gray-600 print:mb-0">
                                <span className="flex items-center">Council <InfoTooltip text="Estimated based on property value (~$900 + 0.1%). Inflates annually." /></span>
                                {overrides.councilRates && <ResetButton field="councilRates" />}
                            </label>
                            <FormattedNumberInput
                                className={`w-full px-3 py-1.5 text-base md:text-sm border rounded-md bg-transparent text-gray-900 dark:text-white ${overrides.councilRates ? 'border-blue-300 dark:border-blue-700' : 'border-gray-200 dark:border-gray-600'} print:border-none print:p-0 print:text-right print:font-mono print:w-auto`}
                                value={data.councilRates}
                                onChange={(val: number) => handleInputChange('councilRates', val)}
                                min={0}
                            />
                        </div>
                        <div className="print:flex print:justify-between print:border-b print:border-gray-100 print:pb-1 print:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex justify-between print:text-sm print:text-gray-600 print:mb-0">
                                <span className="flex items-center">Land Tax <InfoTooltip text="Based on state-specific progressive tax scales for land value. Inflates annually." /></span>
                                {overrides.landTax && <ResetButton field="landTax" />}
                            </label>
                            <FormattedNumberInput
                                className={`w-full px-3 py-1.5 text-base md:text-sm border rounded-md bg-transparent text-gray-900 dark:text-white ${overrides.landTax ? 'border-blue-300 dark:border-blue-700' : 'border-gray-200 dark:border-gray-600'} print:border-none print:p-0 print:text-right print:font-mono print:w-auto`}
                                value={data.landTax}
                                onChange={(val: number) => handleInputChange('landTax', val)}
                                min={0}
                            />
                        </div>
                    </div>
                    
                    <ExpenseSliderRow 
                        label="Insurance"
                        infoText="Estimated at ~0.3% of building value. Inflates annually."
                        value={data.insurance}
                        onChange={(val) => handleInputChange('insurance', val)}
                        isOverridden={!!overrides.insurance}
                        onReset={() => handleResetOverride('insurance')}
                        max={Math.round(data.price * 0.1)}
                    />

                    <ExpenseSliderRow 
                        label="Body Corp"
                        infoText="Strata fees. ~1% for Apartments/Townhouses, 0 for others. Inflates annually."
                        value={data.bodyCorp}
                        onChange={(val) => handleInputChange('bodyCorp', val)}
                        isOverridden={!!overrides.bodyCorp}
                        onReset={() => handleResetOverride('bodyCorp')}
                        max={Math.round(data.price * 0.1)}
                    />

                    <ExpenseSliderRow 
                        label="Water Rates"
                        infoText="Fixed annual estimate (~$840). Inflates annually."
                        value={data.waterRates}
                        onChange={(val) => handleInputChange('waterRates', val)}
                        max={10000}
                    />

                    <ExpenseSliderRow 
                        label="Maintenance"
                        infoText="Annual allowance for repairs. Inflates annually."
                        value={data.maintenance}
                        onChange={(val) => handleInputChange('maintenance', val)}
                        max={Math.round(data.price * 0.1)}
                    />
                    
                    <div className="mt-4 print:flex print:justify-between print:border-b print:border-gray-100 print:pb-1">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center print:text-sm print:text-gray-600 print:mb-0">
                            Property Manager Fee ({data.propertyManagerRate}%) <InfoTooltip text="Property Management fee calculated as a percentage of Rental Income." />
                        </label>
                        <div className="flex items-center gap-2 print:block">
                             <input 
                                type="range" min="0" max="20"
                                className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 print:hidden"
                                value={data.propertyManagerRate}
                                onChange={(e) => handleInputChange('propertyManagerRate', Number(e.target.value))}
                            />
                            <span className="text-xs font-mono w-16 text-right text-gray-900 dark:text-white print:text-sm">${Math.round(currentStats.breakdown.pmFee).toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center mt-2">
                         <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Operating Expenses</span>
                         <span className="text-sm font-bold text-red-600 dark:text-red-400">-${currentStats.operatingExpenses.toLocaleString()}</span>
                    </div>
                </div>
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-8 space-y-6 print:break-inside-avoid">

             {/* Time Travel Slider - Floating Card UI */}
             <div className="sticky top-4 z-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl p-4 mb-6 mx-4 md:mx-0 print:hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        Time Period: Year {viewYear}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Slide to view future</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="30"
                    className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    value={viewYear}
                    onChange={(e) => setViewYear(Number(e.target.value))}
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                    <span>Now</span>
                    <span>10 Years</span>
                    <span>20 Years</span>
                    <span>30 Years</span>
                  </div>
              </div>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-4 print:mb-6">
              <div className={`rounded-xl p-5 shadow-sm border relative overflow-hidden transition-colors ${
                  weeklyCashFlow >= 0 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              } print:shadow-none print:border print:border-gray-300 print:bg-white`}>
                 <div className="flex justify-between items-start mb-2">
                    <span className={`text-sm font-medium ${weeklyCashFlow >= 0 ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'} print:text-black`}>Weekly Net Cash Flow</span>
                 </div>
                 <div className={`text-2xl font-bold ${weeklyCashFlow >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'} print:text-black`}>
                    {weeklyCashFlow >= 0 ? '+' : '-'}${Math.abs(Math.round(weeklyCashFlow)).toLocaleString()}
                 </div>
                 <div className={`mt-2 text-xs ${weeklyCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} opacity-80 print:text-gray-500`}>
                    After all expenses & tax
                 </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors print:shadow-none print:border print:border-gray-300 print:bg-white">
                 <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium print:text-gray-600">Rental Income (Year {viewYear})</span>
                    <TrendingUp className="w-4 h-4 text-gray-400 print:hidden" />
                 </div>
                 <div className="text-2xl font-bold text-gray-900 dark:text-white print:text-black">
                    ${Math.round(currentStats.rentalIncome).toLocaleString()}
                 </div>
                 <div className="mt-2 text-xs text-gray-400 flex items-center justify-between print:text-gray-500">
                    <span>Yield: {currentGrossYield.toFixed(2)}%</span>
                    <div className="flex items-center gap-1">
                        <span>Growth:</span>
                        <input 
                            type="number" 
                            step="0.1"
                            className="w-12 text-xs bg-transparent border-b border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 focus:outline-none print:border-none print:bg-transparent print:p-0 print:w-auto"
                            value={data.rentalGrowthRate}
                            onChange={(e) => handleInputChange('rentalGrowthRate', Number(e.target.value))}
                        />
                        <span>%</span>
                    </div>
                 </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors print:shadow-none print:border print:border-gray-300 print:bg-white">
                 <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium print:text-gray-600">Total Expenses (Year {viewYear})</span>
                    <DollarSign className="w-4 h-4 text-gray-400 print:hidden" />
                 </div>
                 <div className="text-2xl font-bold text-gray-900 dark:text-white print:text-black">
                    ${Math.round(currentStats.expenses).toLocaleString()}
                 </div>
                 <div className="mt-2 text-xs text-gray-400 flex items-center justify-between print:text-gray-500">
                    <span>Inc. Mortgage</span>
                    <div className="flex items-center gap-1">
                        <span>Inflation:</span>
                        <input 
                            type="number" 
                            step="0.1"
                            className="w-10 text-xs bg-transparent border-b border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 focus:outline-none print:border-none print:bg-transparent print:p-0 print:w-auto"
                            value={data.inflationRate}
                            onChange={(e) => handleInputChange('inflationRate', Number(e.target.value))}
                        />
                        <span>%</span>
                    </div>
                 </div>
              </div>
            </div>

            {/* Cash Flow Frequency Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-4 print:mb-6 print:text-sm">
                 <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-100 dark:border-slate-800 print:bg-white print:border-gray-300">
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-2 print:text-gray-600">Weekly</div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Income</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white print:text-black">${Math.round(currentStats.rentalIncome / 52).toLocaleString()}</span>
                    </div>
                    <ExpensesWithBreakdown 
                        breakdown={currentStats.breakdown} 
                        totalExpenses={currentStats.expenses} 
                        divisor={52} 
                        label="Expenses" 
                    />
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 print:text-black">Net</span>
                        <span className={`text-sm font-bold ${currentStats.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} print:text-black`}>
                             {currentStats.netCashFlow >= 0 ? '+' : ''}${Math.round(currentStats.netCashFlow / 52).toLocaleString()}
                        </span>
                    </div>
                 </div>

                 <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-100 dark:border-slate-800 print:bg-white print:border-gray-300">
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-2 print:text-gray-600">Monthly</div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Income</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white print:text-black">${Math.round(currentStats.rentalIncome / 12).toLocaleString()}</span>
                    </div>
                    <ExpensesWithBreakdown 
                        breakdown={currentStats.breakdown} 
                        totalExpenses={currentStats.expenses} 
                        divisor={12} 
                        label="Expenses" 
                    />
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 print:text-black">Net</span>
                        <span className={`text-sm font-bold ${currentStats.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} print:text-black`}>
                             {currentStats.netCashFlow >= 0 ? '+' : ''}${Math.round(currentStats.netCashFlow / 12).toLocaleString()}
                        </span>
                    </div>
                 </div>

                 <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-100 dark:border-slate-800 print:bg-white print:border-gray-300">
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-2 print:text-gray-600">Yearly</div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Income</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white print:text-black">${Math.round(currentStats.rentalIncome).toLocaleString()}</span>
                    </div>
                    <ExpensesWithBreakdown 
                        breakdown={currentStats.breakdown} 
                        totalExpenses={currentStats.expenses} 
                        divisor={1} 
                        label="Expenses" 
                    />
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 print:text-black">Net</span>
                        <span className={`text-sm font-bold ${currentStats.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} print:text-black`}>
                             {currentStats.netCashFlow >= 0 ? '+' : ''}${Math.round(currentStats.netCashFlow).toLocaleString()}
                        </span>
                    </div>
                 </div>
            </div>

            {/* Projection Chart */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 transition-colors print:shadow-none print:border-none print:bg-white print:p-0 print:mb-6 mb-8">
              <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4 print:mb-2 print:hidden">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {chartMode === 'cashflow' ? <TrendingUp className="w-5 h-5 text-blue-500"/> : <Building2 className="w-5 h-5 text-blue-500"/>}
                    {chartMode === 'cashflow' ? 'Cash Flow Projection' : 'Wealth Projection'}
                  </h3>

                  <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-lg print:hidden">
                      <button 
                        onClick={() => setChartMode('cashflow')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${chartMode === 'cashflow' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                      >
                        Cash Flow
                      </button>
                      <button 
                        onClick={() => setChartMode('wealth')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${chartMode === 'wealth' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                      >
                        Wealth Projection
                      </button>
                  </div>

                  {chartMode === 'wealth' && (
                       <div className="flex items-center gap-2 print:hidden">
                          <label className="text-sm text-gray-600 dark:text-gray-400">Property Value Growth:</label>
                          <div className="flex items-center gap-1">
                                <input 
                                    type="number"
                                    step="0.1"
                                    className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white print:border-none print:bg-transparent print:p-0 print:w-auto"
                                    value={data.capitalGrowth}
                                    onChange={(e) => handleInputChange('capitalGrowth', Number(e.target.value))}
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
                          </div>
                      </div>
                  )}
              </div>

              {/* Cash Flow Chart Container */}
              <div className={`${isPrinting || chartMode === 'cashflow' ? 'block' : 'hidden'} w-full mb-8 break-inside-avoid print:mb-8 print:break-inside-avoid page-break-inside-avoid`}>
                <h3 className="hidden print:block text-xl font-bold mb-2 mt-4 text-gray-900 flex items-center gap-2 print:page-break-after-avoid">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    Cash Flow Projection
                </h3>
                <div className="h-[350px] print:h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    {renderCashFlowChart()}
                    </ResponsiveContainer>
                </div>
              </div>

              {/* Wealth Chart Container */}
              <div className={`${isPrinting || chartMode === 'wealth' ? 'block' : 'hidden'} w-full mb-8 break-inside-avoid print:mb-8 print:break-inside-avoid page-break-inside-avoid`}>
                <h3 className="hidden print:block text-xl font-bold mb-2 mt-4 text-gray-900 flex items-center gap-2 print:page-break-after-avoid">
                    <Building2 className="w-5 h-5 text-blue-500" />
                    Wealth Projection
                </h3>
                <div className="h-[350px] print:h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    {renderWealthChart()}
                    </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* AI Analysis Section */}
            {aiAnalysis && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-slate-800 rounded-xl p-6 border border-purple-100 dark:border-gray-700 transition-colors print:shadow-none print:border-gray-200 print:bg-white print:break-inside-avoid print:p-0">
                 <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-purple-900 dark:text-purple-300 print:text-gray-900 print:border-b print:border-gray-200 print:pb-2">
                    <Sparkles className="w-5 h-5 print:hidden" />
                    AI Investment Analysis
                </h2>
                <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 print:text-black print:text-xs">
                    <ReactMarkdown
                        components={{
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                            strong: ({node, ...props}) => <span className="font-semibold text-purple-700 dark:text-purple-400 print:text-black print:font-bold" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 mb-2" {...props} />,
                            li: ({node, ...props}) => <li className="" {...props} />
                        }}
                    >
                        {aiAnalysis}
                    </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer with Disclaimer & Copyright */}
        <footer className="mt-12 py-6 border-t border-gray-200 dark:border-gray-800 print:mt-6 print:border-t print:border-gray-300">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500 dark:text-gray-400 print:text-gray-600">
                 <div className="max-w-4xl text-center md:text-left">
                    <p>
                        Disclaimer: This calculator is for educational and estimation purposes only. It does not constitute financial advice. 
                        Results are based on user inputs and simplified assumptions. Actual outcomes will vary. 
                        Please consult with a qualified financial advisor before making decisions.
                    </p>
                </div>
                <div className="whitespace-nowrap font-medium">
                    &copy; {new Date().getFullYear()} <a href="https://github.com/kaichiuwong" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Kai Chiu Wong</a>. All rights reserved.
                </div>
            </div>
        </footer>

      </div>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);