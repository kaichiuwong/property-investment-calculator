import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine
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
  RotateCcw
} from 'lucide-react';
import './index.css';

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

const PROPERTY_TYPES: PropertyType[] = ['House', 'Townhouse', 'Apartment', 'Home & Land', 'Old Home'];
const STATES: AustralianState[] = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

// Comprehensive list of major Australian suburbs/postcodes (Compressed format: "Suburb|State|Postcode")
const SUBURB_DB_RAW = [
  "Abbotsford|VIC|3067", "Aberfeldie|VIC|3040", "Airport West|VIC|3042", "Albanvale|VIC|3021", "Albert Park|VIC|3206", "Albion|VIC|3020", "Alphington|VIC|3078", "Altona|VIC|3018", "Altona Meadows|VIC|3028", "Altona North|VIC|3025", "Ardeer|VIC|3022", "Armadale|VIC|3143", "Ascot Vale|VIC|3032", "Ashburton|VIC|3147", "Ashwood|VIC|3147", "Aspendale|VIC|3195", "Aspendale Gardens|VIC|3195", "Attwood|VIC|3049", "Auburn|VIC|3123", "Avondale Heights|VIC|3034", "Balaclava|VIC|3183", "Balwyn|VIC|3103", "Balwyn North|VIC|3104", "Bangholme|VIC|3175", "Bayswater|VIC|3153", "Bayswater North|VIC|3153", "Beaumaris|VIC|3193", "Belgrave|VIC|3160", "Bellfield|VIC|3081", "Bentleigh|VIC|3204", "Bentleigh East|VIC|3165", "Berwick|VIC|3806", "Black Rock|VIC|3193", "Blackburn|VIC|3130", "Blackburn North|VIC|3130", "Blackburn South|VIC|3131", "Bonbeach|VIC|3196", "Boronia|VIC|3155", "Box Hill|VIC|3128", "Box Hill North|VIC|3129", "Box Hill South|VIC|3128", "Braeside|VIC|3195", "Braybrook|VIC|3019", "Briar Hill|VIC|3088", "Brighton|VIC|3186", "Brighton East|VIC|3187", "Broadmeadows|VIC|3047", "Brooklyn|VIC|3012", "Brunswick|VIC|3056", "Brunswick East|VIC|3057", "Brunswick West|VIC|3055", "Bulleen|VIC|3105", "Bundoora|VIC|3083", "Burnley|VIC|3121", "Burnside|VIC|3023", "Burnside Heights|VIC|3023", "Burwood|VIC|3125", "Burwood East|VIC|3151",
  "Cairnlea|VIC|3023", "Calder Park|VIC|3037", "Camberwell|VIC|3124", "Campbellfield|VIC|3061", "Canterbury|VIC|3126", "Carlton|VIC|3053", "Carlton North|VIC|3054", "Carnegie|VIC|3163", "Caroline Springs|VIC|3023", "Carrum|VIC|3197", "Carrum Downs|VIC|3201", "Caulfield|VIC|3162", "Caulfield East|VIC|3145", "Caulfield North|VIC|3161", "Caulfield South|VIC|3162", "Chadstone|VIC|3148", "Chelsea|VIC|3196", "Chelsea Heights|VIC|3196", "Cheltenham|VIC|3192", "Clarinda|VIC|3169", "Clayton|VIC|3168", "Clayton South|VIC|3169", "Clifton Hill|VIC|3068", "Coburg|VIC|3058", "Coburg North|VIC|3058", "Collingwood|VIC|3066", "Coolaroo|VIC|3048", "Craigieburn|VIC|3064", "Cranbourne|VIC|3977", "Cremorne|VIC|3121", "Croydon|VIC|3136",
  "Dandenong|VIC|3175", "Dandenong North|VIC|3175", "Dandenong South|VIC|3175", "Deepdene|VIC|3103", "Deer Park|VIC|3023", "Delahey|VIC|3037", "Derrimut|VIC|3030", "Diamond Creek|VIC|3089", "Dingley Village|VIC|3172", "Docklands|VIC|3008", "Doncaster|VIC|3108", "Doncaster East|VIC|3109", "Donvale|VIC|3111", "Doreen|VIC|3754", "Doveton|VIC|3177",
  "Eaglemont|VIC|3084", "East Melbourne|VIC|3002", "Edithvale|VIC|3196", "Elsternwick|VIC|3185", "Eltham|VIC|3095", "Eltham North|VIC|3095", "Elwood|VIC|3184", "Endeavour Hills|VIC|3802", "Epping|VIC|3076", "Essendon|VIC|3040", "Essendon Fields|VIC|3041", "Essendon North|VIC|3041", "Essendon West|VIC|3040",
  "Fairfield|VIC|3078", "Fawkner|VIC|3060", "Ferntree Gully|VIC|3156", "Ferny Creek|VIC|3786", "Fitzroy|VIC|3065", "Fitzroy North|VIC|3068", "Flemington|VIC|3031", "Footscray|VIC|3011", "Forest Hill|VIC|3131", "Frankston|VIC|3199", "Frankston North|VIC|3200", "Frankston South|VIC|3199",
  "Gardenvale|VIC|3185", "Gladstone Park|VIC|3043", "Glen Huntly|VIC|3163", "Glen Iris|VIC|3146", "Glen Waverley|VIC|3150", "Glenroy|VIC|3046", "Gowanbrae|VIC|3043", "Greensborough|VIC|3088", "Greenvale|VIC|3059",
  "Hadfield|VIC|3046", "Hallam|VIC|3803", "Hampton|VIC|3188", "Hampton East|VIC|3188", "Hampton Park|VIC|3976", "Hawthorn|VIC|3122", "Hawthorn East|VIC|3123", "Heatherton|VIC|3202", "Heathmont|VIC|3135", "Heidelberg|VIC|3084", "Heidelberg Heights|VIC|3081", "Heidelberg West|VIC|3081", "Highett|VIC|3190", "Hillside|VIC|3037", "Hoppers Crossing|VIC|3029", "Hughesdale|VIC|3166", "Huntingdale|VIC|3166",
  "Ivanhoe|VIC|3079", "Ivanhoe East|VIC|3079",
  "Jacana|VIC|3047",
  "Kealba|VIC|3021", "Keilor|VIC|3036", "Keilor Downs|VIC|3038", "Keilor East|VIC|3033", "Keilor Lodge|VIC|3038", "Keilor North|VIC|3036", "Keilor Park|VIC|3042", "Kensington|VIC|3031", "Kew|VIC|3101", "Kew East|VIC|3102", "Keysborough|VIC|3173", "Kings Park|VIC|3021", "Kingsbury|VIC|3083", "Kingsville|VIC|3012", "Knoxfield|VIC|3180", "Kooyong|VIC|3144",
  "Lalor|VIC|3075", "Langwarrin|VIC|3910", "Laverton|VIC|3028", "Lilydale|VIC|3140", "Lower Plenty|VIC|3093", "Lynbrook|VIC|3975", "Lyndhurst|VIC|3975", "Lysterfield|VIC|3156",
  "Macleod|VIC|3085", "Maidstone|VIC|3012", "Malvern|VIC|3144", "Malvern East|VIC|3145", "Maribyrnong|VIC|3032", "McKinnon|VIC|3204", "Meadow Heights|VIC|3048", "Melbourne|VIC|3000", "Melbourne Airport|VIC|3045", "Melton|VIC|3337", "Mentone|VIC|3194", "Mernda|VIC|3754", "Middle Park|VIC|3206", "Mill Park|VIC|3082", "Mitcham|VIC|3132", "Monash University|VIC|3800", "Mont Albert|VIC|3127", "Mont Albert North|VIC|3129", "Montmorency|VIC|3094", "Moonee Ponds|VIC|3039", "Moorabbin|VIC|3189", "Moorabbin Airport|VIC|3194", "Mordialloc|VIC|3195", "Moreland|VIC|3058", "Mornington|VIC|3931", "Mount Albert|VIC|3127", "Mount Waverley|VIC|3149", "Mulgrave|VIC|3170", "Murrumbeena|VIC|3163",
  "Narre Warren|VIC|3805", "Narre Warren North|VIC|3804", "Narre Warren South|VIC|3805", "Newport|VIC|3015", "Niddrie|VIC|3042", "Noble Park|VIC|3174", "Noble Park North|VIC|3174", "North Melbourne|VIC|3051", "North Warrandyte|VIC|3113", "Northcote|VIC|3070", "Notting Hill|VIC|3168", "Nunawading|VIC|3131",
  "Oak Park|VIC|3046", "Oakleigh|VIC|3166", "Oakleigh East|VIC|3166", "Oakleigh South|VIC|3167", "Ormond|VIC|3204",
  "Pakenham|VIC|3810", "Parkdale|VIC|3195", "Parkville|VIC|3052", "Pascoe Vale|VIC|3044", "Pascoe Vale South|VIC|3044", "Patterson Lakes|VIC|3197", "Plumpton|VIC|3335", "Point Cook|VIC|3030", "Port Melbourne|VIC|3207", "Prahran|VIC|3181", "Preston|VIC|3072", "Princes Hill|VIC|3054",
  "Ravenhall|VIC|3023", "Reservoir|VIC|3073", "Richmond|VIC|3121", "Ringwood|VIC|3134", "Ringwood East|VIC|3135", "Ringwood North|VIC|3134", "Ripponlea|VIC|3185", "Rockbank|VIC|3335", "Rosanna|VIC|3084", "Rowville|VIC|3178", "Roxburgh Park|VIC|3064", "Royal Park|VIC|3052",
  "Sandringham|VIC|3191", "Scoresby|VIC|3179", "Seabrook|VIC|3028", "Seaford|VIC|3198", "Seaholme|VIC|3018", "Seddon|VIC|3011", "Skye|VIC|3977", "South Kingsville|VIC|3015", "South Melbourne|VIC|3205", "South Morang|VIC|3752", "South Yarra|VIC|3141", "Southbank|VIC|3006", "Spotswood|VIC|3015", "Springvale|VIC|3171", "Springvale South|VIC|3172", "St Albans|VIC|3021", "St Helena|VIC|3088", "St Kilda|VIC|3182", "St Kilda East|VIC|3183", "St Kilda West|VIC|3182", "Strathmore|VIC|3041", "Strathmore Heights|VIC|3041", "Sunbury|VIC|3429", "Sunshine|VIC|3020", "Sunshine North|VIC|3020", "Sunshine West|VIC|3020", "Surrey Hills|VIC|3127", "Sydenham|VIC|3037",
  "Tarneit|VIC|3029", "Taylors Hill|VIC|3037", "Taylors Lakes|VIC|3038", "Templestowe|VIC|3106", "Templestowe Lower|VIC|3107", "The Basin|VIC|3154", "Thomastown|VIC|3074", "Thornbury|VIC|3071", "Toorak|VIC|3142", "Tottenham|VIC|3012", "Travancore|VIC|3032", "Truganina|VIC|3029", "Tullamarine|VIC|3043",
  "Vermont|VIC|3133", "Vermont South|VIC|3133", "Viewbank|VIC|3084",
  "Wantirna|VIC|3152", "Wantirna South|VIC|3152", "Warrandyte|VIC|3113", "Watsonia|VIC|3087", "Watsonia North|VIC|3087", "Werribee|VIC|3030", "Werribee South|VIC|3030", "West Footscray|VIC|3012", "West Melbourne|VIC|3003", "Westmeadows|VIC|3049", "Wheelers Hill|VIC|3150", "Williams Landing|VIC|3027", "Williamstown|VIC|3016", "Williamstown North|VIC|3016", "Windsor|VIC|3181", "Wollert|VIC|3750", "Wyndham Vale|VIC|3024",
  "Yallambie|VIC|3085", "Yarraville|VIC|3013",
  
  // NSW
  "Sydney|NSW|2000", "Parramatta|NSW|2150", "Chatswood|NSW|2067", "Bondi|NSW|2026", "Manly|NSW|2095", "Cronulla|NSW|2230", "Newtown|NSW|2042", "Surry Hills|NSW|2010", "Mosman|NSW|2088", "Blacktown|NSW|2148", "Penrith|NSW|2750", "Liverpool|NSW|2170", "Campbelltown|NSW|2560", "Castle Hill|NSW|2154", "Baulkham Hills|NSW|2153", "Ryde|NSW|2112", "Epping|NSW|2121", "Strathfield|NSW|2135", "Burwood|NSW|2134", "Ashfield|NSW|2131", "Marrickville|NSW|2204", "Randwick|NSW|2031", "Coogee|NSW|2034", "Maroubra|NSW|2035", "Double Bay|NSW|2028", "Rose Bay|NSW|2029", "Vaucluse|NSW|2030", "Paddington|NSW|2021", "Darlinghurst|NSW|2010", "Redfern|NSW|2016", "Waterloo|NSW|2017", "Zetland|NSW|2017", "Mascot|NSW|2020", "Hurstville|NSW|2220", "Bankstown|NSW|2200", "Cabramatta|NSW|2166", "Fairfield|NSW|2165", "Lidcombe|NSW|2141", "Auburn|NSW|2144", "Rhodes|NSW|2138", "Wentworth Point|NSW|2127", "Olympic Park|NSW|2127", "North Sydney|NSW|2060", "Crows Nest|NSW|2065", "St Leonards|NSW|2065", "Neutral Bay|NSW|2089", "Cremorne|NSW|2090", "Lane Cove|NSW|2066", "Macquarie Park|NSW|2113", "Gordon|NSW|2072", "Hornsby|NSW|2077", "Dee Why|NSW|2099", "Brookvale|NSW|2100", "Mona Vale|NSW|2103", "Palm Beach|NSW|2108", "Newcastle|NSW|2300", "Wollongong|NSW|2500", "Central Coast|NSW|2250",
  
  // QLD
  "Brisbane City|QLD|4000", "Fortitude Valley|QLD|4006", "New Farm|QLD|4005", "Teneriffe|QLD|4005", "Newstead|QLD|4006", "Bowen Hills|QLD|4006", "Hamilton|QLD|4007", "Ascot|QLD|4007", "Clayfield|QLD|4011", "Albion|QLD|4010", "Lutwyche|QLD|4030", "Chermside|QLD|4032", "Nundah|QLD|4012", "Northgate|QLD|4013", "Banyo|QLD|4014", "Sandgate|QLD|4017", "Brighton|QLD|4017", "Redcliffe|QLD|4020", "Kelvin Grove|QLD|4059", "Paddington|QLD|4064", "Milton|QLD|4064", "Toowong|QLD|4066", "Indooroopilly|QLD|4068", "St Lucia|QLD|4067", "Taringa|QLD|4068", "Kenmore|QLD|4069", "West End|QLD|4101", "South Brisbane|QLD|4101", "Highgate Hill|QLD|4101", "Dutton Park|QLD|4102", "Woolloongabba|QLD|4102", "Kangaroo Point|QLD|4169", "East Brisbane|QLD|4169", "Coorparoo|QLD|4151", "Camp Hill|QLD|4152", "Carina|QLD|4152", "Carindale|QLD|4152", "Bulimba|QLD|4171", "Hawthorne|QLD|4171", "Balmoral|QLD|4171", "Morningside|QLD|4170", "Cannon Hill|QLD|4170", "Wynnum|QLD|4178", "Manly|QLD|4179", "Mount Gravatt|QLD|4122", "Sunnybank|QLD|4109", "Rochedale|QLD|4123", "Springwood|QLD|4127", "Logan Central|QLD|4114", "Ipswich|QLD|4305", "Gold Coast|QLD|4217", "Surfers Paradise|QLD|4217", "Broadbeach|QLD|4218", "Burleigh Heads|QLD|4220", "Southport|QLD|4215", "Robina|QLD|4226", "Coolangatta|QLD|4225", "Maroochydore|QLD|4558", "Noosa Heads|QLD|4567",
  
  // WA
  "Perth|WA|6000", "East Perth|WA|6004", "West Perth|WA|6005", "Northbridge|WA|6003", "Highgate|WA|6003", "Mount Lawley|WA|6050", "Inglewood|WA|6052", "Maylands|WA|6051", "Bayswater|WA|6053", "Morley|WA|6062", "Subiaco|WA|6008", "Shenton Park|WA|6008", "Nedlands|WA|6009", "Dalkeith|WA|6009", "Claremont|WA|6010", "Cottesloe|WA|6011", "Mosman Park|WA|6012", "Fremantle|WA|6160", "East Fremantle|WA|6158", "South Fremantle|WA|6162", "Coogee|WA|6166", "Applecross|WA|6153", "Mount Pleasant|WA|6153", "South Perth|WA|6151", "Como|WA|6152", "Victoria Park|WA|6100", "East Victoria Park|WA|6101", "Burswood|WA|6100", "Belmont|WA|6104", "Cannington|WA|6107", "Armadale|WA|6112", "Joondalup|WA|6027", "Scarborough|WA|6019", "Trigg|WA|6029", "Hillarys|WA|6025", "Mandurah|WA|6210", "Rockingham|WA|6168", "Bunbury|WA|6230", "Busselton|WA|6280", "Albany|WA|6330",
  
  // SA
  "Adelaide|SA|5000", "North Adelaide|SA|5006", "Brompton|SA|5007", "Bowden|SA|5007", "Prospect|SA|5082", "Walkerville|SA|5081", "Norwood|SA|5067", "Kent Town|SA|5067", "Kensington|SA|5068", "Burnside|SA|5066", "Unley|SA|5061", "Parkside|SA|5063", "Goodwood|SA|5034", "Hyde Park|SA|5061", "Mile End|SA|5031", "Thebarton|SA|5031", "Henley Beach|SA|5022", "Grange|SA|5022", "Glenelg|SA|5045", "Brighton|SA|5048", "Marion|SA|5043", "Mawson Lakes|SA|5095", "Port Adelaide|SA|5015", "Semaphore|SA|5019", "Modbury|SA|5092", "Golden Grove|SA|5125", "Mount Barker|SA|5251", "Gawler|SA|5118",
  
  // ACT
  "Canberra|ACT|2600", "Acton|ACT|2601", "Turner|ACT|2612", "Braddon|ACT|2612", "Reid|ACT|2612", "Campbell|ACT|2612", "Dickson|ACT|2602", "Ainslie|ACT|2602", "O'Connor|ACT|2602", "Lyneham|ACT|2602", "Belconnen|ACT|2617", "Bruce|ACT|2617", "Gungahlin|ACT|2912", "Kingston|ACT|2604", "Griffith|ACT|2603", "Barton|ACT|2600", "Forrest|ACT|2603", "Yarralumla|ACT|2600", "Deakin|ACT|2600", "Curtin|ACT|2605", "Woden|ACT|2606", "Phillip|ACT|2606", "Tuggeranong|ACT|2900", "Kambah|ACT|2902", "Queanbeyan|NSW|2620", // Nearby NSW
  
  // TAS
  "Hobart|TAS|7000", "North Hobart|TAS|7000", "West Hobart|TAS|7000", "South Hobart|TAS|7004", "Sandy Bay|TAS|7005", "Battery Point|TAS|7004", "New Town|TAS|7008", "Moonah|TAS|7009", "Glenorchy|TAS|7010", "Claremont|TAS|7011", "Rosny Park|TAS|7018", "Bellerive|TAS|7018", "Lindisfarne|TAS|7015", "Kingston|TAS|7050", "Launceston|TAS|7250", "Devonport|TAS|7310", "Burnie|TAS|7320",
  
  // NT
  "Darwin|NT|0800", "Larrakeyah|NT|0820", "Stuart Park|NT|0820", "Parap|NT|0820", "Fannie Bay|NT|0820", "Nightcliff|NT|0810", "Rapid Creek|NT|0810", "Casuarina|NT|0810", "Leanyer|NT|0812", "Palmerston|NT|0830", "Alice Springs|NT|0870"
];

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
  // Simplified VIC 2024 Investment Land Tax scales
  if (state !== 'VIC' && state !== 'NSW') return 0; // Simplified for demo, focusing on VIC as default

  if (state === 'VIC') {
    if (landValue < 50000) return 0;
    if (landValue < 250000) return 0 + (landValue - 50000) * 0.002; // $0 + 0.2%
    if (landValue < 600000) return 400 + (landValue - 250000) * 0.005; // $400 + 0.5%
    if (landValue < 1000000) return 2150 + (landValue - 600000) * 0.008; // $2150 + 0.8%
    if (landValue < 1800000) return 5350 + (landValue - 1000000) * 0.013; // $5350 + 1.3%
    if (landValue < 3000000) return 15750 + (landValue - 1800000) * 0.018; // $15750 + 1.8%
    return 37350 + (landValue - 3000000) * 0.02; // >3m
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
  <div className="group relative inline-block ml-1">
    <HelpCircle className="w-3 h-3 text-gray-400 cursor-help" />
    <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded p-2 z-50 text-center shadow-lg pointer-events-none">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
    </div>
  </div>
);

// Formatted Number Input Component
// Displays comma-separated values (e.g. 850,000) when not focused,
// and reverts to standard number input when editing for better UX/Mobile support.
// Also supports step via arrow keys.
const FormattedNumberInput = ({ value, onChange, step = 1, className, placeholder, icon: Icon, ...props }: any) => {
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
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || !isNaN(Number(raw))) {
        setInputValue(e.target.value);
        onChange(raw === '' ? 0 : Number(raw));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const current = Number(inputValue.replace(/,/g, '') || 0);
          const delta = e.key === 'ArrowUp' ? step : -step;
          const next = Math.max(0, current + delta);
          setInputValue(next.toString());
          onChange(next);
      }
  };

  return (
    <div className="relative w-full">
        {Icon && <Icon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />}
        <input
            type="text" // Using text to allow commas
            inputMode="numeric" // Helps mobile keyboards
            className={className}
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

const CustomGraphTooltip = ({ active, payload, label }: any) => {
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
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
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
    // Ensure slider scale accommodates the current value if it exceeds the default max
    const dynamicMax = Math.max(max, typeof value === 'number' ? value * 1.5 : max);

    return (
        <div className="mb-4 last:mb-0">
            <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center">
                    {label} <InfoTooltip text={infoText} />
                </label>
                {isOverridden && onReset && (
                     <button 
                        onClick={onReset} 
                        className="text-blue-500 hover:text-blue-600 flex items-center gap-1 ml-auto"
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
                    max={dynamicMax}
                    className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    value={value || 0}
                    onChange={(e) => onChange(Number(e.target.value))}
                />
                <div className="w-24">
                     <FormattedNumberInput
                        className={`w-full px-2 py-1 text-right text-sm border rounded-md bg-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isOverridden ? 'border-blue-300 dark:border-blue-700' : 'border-gray-200 dark:border-gray-600'}`}
                        value={value}
                        onChange={onChange}
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

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

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

  // Calculate Building Value for max limits
  const buildingValue = Math.max(0, data.price - data.landValue);

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
        className="text-blue-500 hover:text-blue-600 flex items-center gap-1 ml-auto"
        title="Reset to estimated value"
    >
        <Undo2 className="w-3 h-3" /> 
        <span className="text-[10px] font-medium">Auto</span>
    </button>
  );

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-200 text-gray-800 dark:text-gray-100 flex flex-col`}>
      <div className="max-w-7xl mx-auto space-y-6 flex-grow w-full">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-lg shadow-lg">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Property Calculator</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end md:self-auto">
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Inputs Column */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Property Details Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
              <h2 className="text-lg font-semibold mb-5 flex items-center gap-2 text-gray-900 dark:text-white">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Property Details
              </h2>
              
              <div className="space-y-4">
                
                {/* Suburb Input with Autocomplete (Moved to top) */}
                <div ref={suburbInputRef} className="relative z-30">
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

                <div className="grid grid-cols-2 gap-3 relative z-20">
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
                <div className="relative z-10">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                    <div className="relative">
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
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Price</label>
                  <FormattedNumberInput
                      step={1000}
                      className="w-full pl-10 pr-3 py-2 text-base md:text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                      value={data.price}
                      onChange={(val: number) => handleInputChange('price', val)}
                      icon={DollarSign}
                  />
                </div>

                <div className="pt-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                        <div className="flex flex-col">
                           <div className="flex items-center">
                              <span>Est. Land Value</span>
                              <InfoTooltip text="Approximate land value based on property type (e.g., 45% for houses, 30% for apartments). Affects land tax." />
                           </div>
                           <span className="text-gray-400 text-[10px] font-normal">{(data.landValue/data.price * 100).toFixed(0)}% of Price</span>
                        </div>
                        {overrides.landValue && <ResetButton field="landValue" />}
                    </label>
                    <FormattedNumberInput
                        className={`w-full pl-10 pr-3 py-2 text-base md:text-sm bg-gray-50 dark:bg-gray-800/50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-colors ${overrides.landValue ? 'border-blue-300 dark:border-blue-700' : 'border-gray-200 dark:border-gray-600'}`}
                        value={data.landValue}
                        onChange={(val: number) => handleInputChange('landValue', val)}
                        icon={LandPlot}
                    />
                </div>
              </div>
            </div>

            {/* Loan Card - MOVED HERE */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
              <h2 className="text-lg font-semibold mb-5 flex items-center gap-2 text-gray-900 dark:text-white">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                Loan & Finance
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">LVR (%)</label>
                    <input 
                      type="number"
                      className="w-full px-3 py-2 text-base md:text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                      value={data.lvr}
                      onChange={(e) => handleInputChange('lvr', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rate (%)</label>
                    <input 
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 text-base md:text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                      value={data.interestRate}
                      onChange={(e) => handleInputChange('interestRate', Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Loan Term (Years)</label>
                    <input 
                      type="range"
                      min="5"
                      max="30"
                      className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      value={data.loanTerm}
                      onChange={(e) => handleInputChange('loanTerm', Number(e.target.value))}
                    />
                    <div className="text-right text-sm text-gray-500 dark:text-gray-400 mt-1">{data.loanTerm} years</div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Weekly Rent (per week)</label>
                    <button 
                      onClick={() => fetchRentEstimate()}
                      disabled={!data.suburb || rentEstimateLoading}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1 disabled:opacity-50"
                    >
                      {rentEstimateLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Estimate
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                        <input 
                        type="range" 
                        min="0" 
                        max="10000" 
                        step="10"
                        className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        value={data.weeklyRent || 0}
                        onChange={(e) => handleInputChange('weeklyRent', Number(e.target.value))}
                        />
                        <div className="w-28 relative">
                           <FormattedNumberInput
                                icon={DollarSign}
                                className="w-full pl-8 pr-2 py-1.5 text-right text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                value={data.weeklyRent}
                                onChange={(val: number) => handleInputChange('weeklyRent', val)}
                                step={10}
                            />
                        </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Expenses Breakdown Card - MOVED HERE */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors">
                 <h2 className="text-lg font-semibold mb-5 flex items-center gap-2 text-gray-900 dark:text-white">
                    <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
                    Annual Expenses
                </h2>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                         <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex justify-between">
                                <span className="flex items-center">Council <InfoTooltip text="Estimated based on property value (~$900 + 0.1%). Inflates annually." /></span>
                                {overrides.councilRates && <ResetButton field="councilRates" />}
                            </label>
                            <FormattedNumberInput
                                className={`w-full px-3 py-1.5 text-base md:text-sm border rounded-md bg-transparent text-gray-900 dark:text-white ${overrides.councilRates ? 'border-blue-300 dark:border-blue-700' : 'border-gray-200 dark:border-gray-600'}`}
                                value={data.councilRates}
                                onChange={(val: number) => handleInputChange('councilRates', val)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex justify-between">
                                <span className="flex items-center">Land Tax <InfoTooltip text="Based on state-specific progressive tax scales for land value. Inflates annually." /></span>
                                {overrides.landTax && <ResetButton field="landTax" />}
                            </label>
                            <FormattedNumberInput
                                className={`w-full px-3 py-1.5 text-base md:text-sm border rounded-md bg-transparent text-gray-900 dark:text-white ${overrides.landTax ? 'border-blue-300 dark:border-blue-700' : 'border-gray-200 dark:border-gray-600'}`}
                                value={data.landTax}
                                onChange={(val: number) => handleInputChange('landTax', val)}
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
                        max={buildingValue}
                    />

                    <ExpenseSliderRow 
                        label="Body Corp"
                        infoText="Strata fees. ~1% for Apartments/Townhouses, 0 for Houses. Inflates annually."
                        value={data.bodyCorp}
                        onChange={(val) => handleInputChange('bodyCorp', val)}
                        isOverridden={!!overrides.bodyCorp}
                        onReset={() => handleResetOverride('bodyCorp')}
                        max={buildingValue}
                    />

                    <ExpenseSliderRow 
                        label="Water Rates"
                        infoText="Fixed annual estimate (~$840). Inflates annually."
                        value={data.waterRates}
                        onChange={(val) => handleInputChange('waterRates', val)}
                        max={100000}
                    />

                    <ExpenseSliderRow 
                        label="Maintenance"
                        infoText="Annual allowance for repairs. Inflates annually."
                        value={data.maintenance}
                        onChange={(val) => handleInputChange('maintenance', val)}
                        max={buildingValue}
                    />
                    
                    <div className="mt-4">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                            Property Manager Fee ({data.propertyManagerRate}%) <InfoTooltip text="Property Management fee calculated as a percentage of Rental Income." />
                        </label>
                        <div className="flex items-center gap-2">
                             <input 
                                type="range" min="0" max="20"
                                className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                value={data.propertyManagerRate}
                                onChange={(e) => handleInputChange('propertyManagerRate', Number(e.target.value))}
                            />
                            <span className="text-xs font-mono w-16 text-right text-gray-900 dark:text-white">${Math.round(currentStats.breakdown.pmFee).toLocaleString()}</span>
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
          <div className="lg:col-span-8 space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-colors">
                 <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Weekly Net Cash Flow</span>
                 </div>
                 <div className={`text-2xl font-bold ${weeklyCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {weeklyCashFlow >= 0 ? '+' : '-'}${Math.abs(Math.round(weeklyCashFlow)).toLocaleString()}
                 </div>
                 <div className="mt-2 text-xs text-gray-400">
                    After all expenses & tax
                 </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                 <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Rental Income (Year {viewYear})</span>
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                 </div>
                 <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${Math.round(currentStats.rentalIncome).toLocaleString()}
                 </div>
                 <div className="mt-2 text-xs text-gray-400 flex items-center justify-between">
                    <span>Yield: {currentGrossYield.toFixed(2)}%</span>
                    <div className="flex items-center gap-1">
                        <span>Growth:</span>
                        <input 
                            type="number" 
                            step="0.1"
                            className="w-12 text-xs bg-transparent border-b border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 focus:outline-none"
                            value={data.rentalGrowthRate}
                            onChange={(e) => handleInputChange('rentalGrowthRate', Number(e.target.value))}
                        />
                        <span>%</span>
                    </div>
                 </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                 <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Expenses (Year {viewYear})</span>
                    <DollarSign className="w-4 h-4 text-gray-400" />
                 </div>
                 <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${Math.round(currentStats.expenses).toLocaleString()}
                 </div>
                 <div className="mt-2 text-xs text-gray-400 flex items-center justify-between">
                    <span>Inc. Mortgage</span>
                    <div className="flex items-center gap-1">
                        <span>Inflation:</span>
                        <input 
                            type="number" 
                            step="0.1"
                            className="w-10 text-xs bg-transparent border-b border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 focus:outline-none"
                            value={data.inflationRate}
                            onChange={(e) => handleInputChange('inflationRate', Number(e.target.value))}
                        />
                        <span>%</span>
                    </div>
                 </div>
              </div>
            </div>

            {/* Cash Flow Frequency Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-2">Weekly</div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Income</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">${Math.round(currentStats.rentalIncome / 52).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Expenses</span>
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">-${Math.round(currentStats.expenses / 52).toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Net</span>
                        <span className={`text-sm font-bold ${currentStats.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                             {currentStats.netCashFlow >= 0 ? '+' : ''}${Math.round(currentStats.netCashFlow / 52).toLocaleString()}
                        </span>
                    </div>
                 </div>

                 <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-2">Monthly</div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Income</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">${Math.round(currentStats.rentalIncome / 12).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Expenses</span>
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">-${Math.round(currentStats.expenses / 12).toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Net</span>
                        <span className={`text-sm font-bold ${currentStats.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                             {currentStats.netCashFlow >= 0 ? '+' : ''}${Math.round(currentStats.netCashFlow / 12).toLocaleString()}
                        </span>
                    </div>
                 </div>

                 <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-2">Yearly</div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Income</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">${Math.round(currentStats.rentalIncome).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Expenses</span>
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">-${Math.round(currentStats.expenses).toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Net</span>
                        <span className={`text-sm font-bold ${currentStats.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                             {currentStats.netCashFlow >= 0 ? '+' : ''}${Math.round(currentStats.netCashFlow).toLocaleString()}
                        </span>
                    </div>
                 </div>
            </div>

            {/* Projection Chart */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 transition-colors">
              <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                  <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-lg">
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
                       <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600 dark:text-gray-400">Property Value Growth:</label>
                          <div className="flex items-center gap-1">
                                <input 
                                    type="number"
                                    step="0.1"
                                    className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    value={data.capitalGrowth}
                                    onChange={(e) => handleInputChange('capitalGrowth', Number(e.target.value))}
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
                          </div>
                      </div>
                  )}
              </div>

              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartMode === 'wealth' ? (
                      <AreaChart 
                        data={projections}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        onMouseMove={(e: any) => {
                            if (e.activeLabel !== undefined) {
                                setViewYear(Number(e.activeLabel));
                            }
                        }}
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
                        <RechartsTooltip content={<CustomGraphTooltip />} cursor={{ stroke: darkMode ? '#6b7280' : '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Legend />
                        <ReferenceLine y={data.price} stroke="#9ca3af" strokeDasharray="3 3" label={{ value: "Purchase Price", position: 'insideTopLeft', fill: darkMode ? "#9ca3af" : "#6b7280", fontSize: 10 }} />
                        <Area type="monotone" dataKey="value" name="Property Value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                        <Area type="monotone" dataKey="loan" name="Loan Balance" stroke="#ef4444" fillOpacity={1} fill="url(#colorLoan)" strokeWidth={2} />
                      </AreaChart>
                  ) : (
                      <LineChart 
                        data={projections}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                         onMouseMove={(e: any) => {
                            if (e.activeLabel !== undefined) {
                                setViewYear(Number(e.activeLabel));
                            }
                        }}
                      >
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
                        <RechartsTooltip content={<CustomGraphTooltip />} cursor={{ stroke: darkMode ? '#6b7280' : '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Legend />
                        <ReferenceLine y={0} stroke={darkMode ? "#e5e7eb" : "#000"} strokeWidth={2} />
                        <Line type="monotone" dataKey="rentalIncome" name="Rental Income" stroke="#10b981" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="expenses" name="Total Expenses" stroke="#f59e0b" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="netCashFlow" name="Net Cash Flow" stroke="#6366f1" strokeWidth={2} dot={false} />
                      </LineChart>
                  )}
                </ResponsiveContainer>
              </div>

               {/* Time Travel Slider - Sticky on Mobile */}
               <div className="mt-6 sticky top-0 z-40 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm py-4 border-b border-gray-200 dark:border-gray-700 md:relative md:bg-transparent md:border-0 md:py-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Time Period: Year {viewYear}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Slide to view future</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="30"
                    className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
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

            </div>

            {/* AI Analysis Section */}
            {aiAnalysis && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-slate-800 rounded-xl p-6 border border-purple-100 dark:border-gray-700 transition-colors">
                 <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-purple-900 dark:text-purple-300">
                    <Sparkles className="w-5 h-5" />
                    AI Investment Analysis
                </h2>
                <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                    <ReactMarkdown
                        components={{
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                            strong: ({node, ...props}) => <span className="font-semibold text-purple-700 dark:text-purple-400" {...props} />,
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
        
        {/* Footer with Disclaimer */}
        <footer className="mt-12 py-6 border-t border-gray-200 dark:border-gray-800 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-4xl mx-auto">
                Disclaimer: This calculator is for educational and estimation purposes only. It does not constitute financial advice. 
                Results are based on user inputs and simplified assumptions (e.g., constant inflation, standard tax rates). 
                Actual outcomes will vary. Please consult with a qualified financial advisor, mortgage broker, or accountant before making any investment decisions. 
                Always refer to actual sales reports and official statistical data sources for accurate market information.
            </p>
        </footer>

      </div>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);