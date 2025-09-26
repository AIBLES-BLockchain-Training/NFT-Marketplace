import * as fs from 'fs';
import * as path from 'path';
import { keccak256 } from '@ethersproject/keccak256';
import { toUtf8Bytes } from '@ethersproject/strings';

// ==== CONFIGURATION ====

const contractsDir = path.join(__dirname, '../src');
const contractFiles = [
  'Router.sol',
  'Permissions.sol',
  'Listing.sol',
  'Offer.sol',
  'ExtensionManager.sol',
  'NFTAuction.sol'
];

// ==== TYPES ====

interface FunctionInfo {
  name: string;
  signature: string;
  selector: string;
  contract: string;
  modifiers: string;
  rawParams: string;
}

// ==== HELPER FUNCTIONS ====

function calculateSelector(signature: string): string {
  return keccak256(toUtf8Bytes(signature)).substring(0, 10);
}

function cleanParameterTypes(params: string): string {
  if (!params.trim()) return '';
  return params
    .split(',')
    .map(param => {
      const trimmed = param.trim();
      if (!trimmed) return '';
      const cleaned = trimmed.replace(/\b(memory|storage|calldata)\b/g, '').trim();
      const parts = cleaned.split(/\s+/);
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1];
        if (!/[[\]()]/.test(lastPart) && !/^(uint|int|bytes|address|bool|string)/.test(lastPart)) {
          return parts.slice(0, -1).join(' ');
        }
      }
      return cleaned;
    })
    .filter(Boolean)
    .join(',');
}

function extractFunctionSignatures(code: string, contractName: string): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  const regex = /function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s+([^{;]*?)(?:\{|;)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(code)) !== null) {
    const name = match[1];
    const rawParams = match[2];
    const modifiers = match[3];

    if (['constructor', 'fallback', 'receive'].includes(name)) continue;

    const cleanedParams = cleanParameterTypes(rawParams);
    const signature = `${name}(${cleanedParams})`;
    const selector = calculateSelector(signature);

    functions.push({
      name,
      signature,
      selector,
      contract: contractName,
      modifiers: modifiers.trim(),
      rawParams: rawParams.trim()
    });
  }
  return functions;
}

function analyzeContracts(): FunctionInfo[] {
  const allFunctions: FunctionInfo[] = [];

  for (const file of contractFiles) {
    const filePath = path.join(contractsDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: Contract file not found - ${file}`);
      continue;
    }
    const code = fs.readFileSync(filePath, 'utf8');
    const contractName = path.basename(file, '.sol');
    const functions = extractFunctionSignatures(code, contractName);
    allFunctions.push(...functions);
  }

  return allFunctions;
}

function groupByContract(functions: FunctionInfo[]): Record<string, FunctionInfo[]> {
  const map: Record<string, FunctionInfo[]> = {};
  for (const func of functions) {
    if (!map[func.contract]) {
      map[func.contract] = [];
    }
    map[func.contract].push(func);
  }
  return map;
}

function findDuplicateSelectors(functions: FunctionInfo[]) {
  const selectorMap: Record<string, FunctionInfo[]> = {};
  const duplicates: { selector: string; functions: FunctionInfo[] }[] = [];

  for (const func of functions) {
    if (!selectorMap[func.selector]) {
      selectorMap[func.selector] = [];
    }
    selectorMap[func.selector].push(func);
  }

  for (const selector in selectorMap) {
    if (selectorMap[selector].length > 1) {
      duplicates.push({
        selector,
        functions: selectorMap[selector]
      });
    }
  }

  return { duplicates, selectorMap };
}

// ==== MAIN EXECUTION ====

const mode = process.env['MODE']; // "list" or "check"

if (!mode || !['list', 'check'].includes(mode)) {
  console.log('Usage: ts-node selector-analyzer.ts <list|check>');
  process.exit(1);
}

const allFunctions = analyzeContracts();

if (mode === 'list') {
  console.log('==== SELECTORS BY CONTRACT ====');
  const grouped = groupByContract(allFunctions);
  for (const contract in grouped) {
    console.log(`\n==== ${contract}.sol ====`);
    for (const func of grouped[contract].sort((a, b) => a.name.localeCompare(b.name))) {
      const visibility = func.modifiers.includes('public') ? 'public' :
                         func.modifiers.includes('external') ? 'external' :
                         func.modifiers.includes('internal') ? 'internal' : 'private';
      console.log(`${func.selector} - ${func.signature} [${visibility}]`);
    }
  }
  console.log('\nTotal contracts:', Object.keys(grouped).length);
  console.log('Total functions:', allFunctions.length);
} else if (mode === 'check') {
  console.log('==== DUPLICATE SELECTOR CHECK ====');
  const { duplicates } = findDuplicateSelectors(allFunctions);
  if (duplicates.length === 0) {
    console.log('\nNo duplicate selectors found.');
    process.exit(0);
  }

  console.log(`\nFound ${duplicates.length} duplicate selector(s):`);
  for (const dup of duplicates) {
    console.log(`\nSelector: ${dup.selector}`);
    for (const func of dup.functions) {
      console.log(`- ${func.contract}.sol: ${func.signature}`);
      console.log(`  Original params: ${func.rawParams}`);
    }
  }

  process.exit(1);
}
