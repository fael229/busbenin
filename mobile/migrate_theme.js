#!/usr/bin/env node

/**
 * Script de migration automatique vers le système de thème
 * 
 * Ce script remplace les couleurs hardcodées par les variables de thème
 * dans tous les fichiers .jsx de l'application.
 * 
 * Usage: node migrate_theme.js
 */

const fs = require('fs');
const path = require('path');

// Map des couleurs à remplacer
const colorMappings = {
  // Backgrounds
  "'#FFFFFF'": 'theme.background',
  '"#FFFFFF"': 'theme.background',
  "'#F9FAFB'": 'theme.backgroundSecondary',
  '"#F9FAFB"': 'theme.backgroundSecondary',
  "'#F3F4F6'": 'theme.surfaceSecondary',
  '"#F3F4F6"': 'theme.surfaceSecondary',
  
  // Textes
  "'#1F2937'": 'theme.text',
  '"#1F2937"': 'theme.text',
  "'#6B7280'": 'theme.textSecondary',
  '"#6B7280"': 'theme.textSecondary',
  "'#9CA3AF'": 'theme.textTertiary',
  '"#9CA3AF"': 'theme.textTertiary',
  "'#374151'": 'theme.text',
  '"#374151"': 'theme.text',
  "'#4B5563'": 'theme.textSecondary',
  '"#4B5563"': 'theme.textSecondary',
  
  // Bordures
  "'#E5E7EB'": 'theme.border',
  '"#E5E7EB"': 'theme.border',
  "'#D1D5DB'": 'theme.borderLight',
  '"#D1D5DB"': 'theme.borderLight',
  
  // Primary
  "'#1E88E5'": 'theme.primary',
  '"#1E88E5"': 'theme.primary',
  "'#42A5F5'": 'theme.primaryLight',
  '"#42A5F5"': 'theme.primaryLight',
  
  // États
  "'#10B981'": 'theme.success',
  '"#10B981"': 'theme.success',
  "'#EF4444'": 'theme.error',
  '"#EF4444"': 'theme.error',
  "'#F59E0B'": 'theme.warning',
  '"#F59E0B"': 'theme.warning',
  
  // StatusBar
  "style=\"dark\"": "style={isDark ? 'light' : 'dark'}",
  'style="dark"': "style={isDark ? 'light' : 'dark'}",
};

// Imports à ajouter
const themeImport = "import { useTheme } from '../../contexts/ThemeProvider';";
const themeHook = "  const { theme, isDark } = useTheme();";

// Fichiers à migrer
const filesToMigrate = [
  'src/app/(tabs)/trajets.jsx',
  'src/app/(tabs)/compagnies.jsx',
  'src/app/(tabs)/favoris.jsx',
  'src/app/(tabs)/mes-reservations.jsx',
  'src/app/(tabs)/trajet/[id].jsx',
  'src/app/(tabs)/compagnie/[id].jsx',
  'src/app/(tabs)/reservation/[trajetId].jsx',
  'src/app/(tabs)/avis/liste/[trajetId].jsx',
  'src/app/(tabs)/avis/[trajetId].jsx',
];

function migrateFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Fichier non trouvé: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Vérifier si le fichier utilise déjà useTheme
  if (content.includes('useTheme')) {
    console.log(`✅ Déjà migré: ${filePath}`);
    return false;
  }

  // Ajouter l'import useTheme
  if (content.includes('useSession')) {
    content = content.replace(
      /import { useSession } from ['"].*SessionProvider['"];/,
      (match) => match + '\n' + themeImport
    );
    modified = true;
  } else if (content.includes('from "react-native"')) {
    content = content.replace(
      /} from "react-native";/,
      (match) => match + '\n' + themeImport
    );
    modified = true;
  }

  // Ajouter le hook useTheme dans le composant
  const componentMatch = content.match(/export default function \w+\(\) {[\s\S]*?const \w+ = /);
  if (componentMatch) {
    content = content.replace(
      /export default function (\w+)\(\) {([\s\S]*?)(const \w+ = )/,
      (match, name, middle, lastConst) => {
        if (middle.includes('useTheme')) return match;
        return `export default function ${name}() {${middle}${themeHook}\n  ${lastConst}`;
      }
    );
    modified = true;
  }

  // Remplacer les couleurs
  for (const [oldColor, newColor] of Object.entries(colorMappings)) {
    if (content.includes(oldColor)) {
      content = content.replace(new RegExp(oldColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newColor);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Migré: ${filePath}`);
    return true;
  }

  return false;
}

// Exécution
console.log('🚀 Migration vers le système de thème...\n');

let migratedCount = 0;
for (const file of filesToMigrate) {
  if (migrateFile(file)) {
    migratedCount++;
  }
}

console.log(`\n✨ Migration terminée: ${migratedCount} fichier(s) migré(s)`);
console.log('\n⚠️  IMPORTANT: Vérifiez manuellement les fichiers modifiés !');
console.log('Certaines couleurs peuvent nécessiter un ajustement manuel.\n');
