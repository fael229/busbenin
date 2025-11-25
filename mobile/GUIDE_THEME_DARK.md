# 🌓 Guide : Système de Thème Clair/Dark

## ✅ Installation terminée !

Votre application dispose maintenant d'un système complet de thème clair/dark avec :
- ✅ Gestion globale du thème via Context
- ✅ Persistance de la préférence utilisateur
- ✅ Composant ThemeToggle réutilisable
- ✅ Page Paramètres complète
- ✅ Nouvel onglet Paramètres dans la navigation

---

## 📂 Fichiers créés

### 1. **`src/constants/theme.js`**
Définition des couleurs pour les thèmes clair et dark.

```javascript
export const lightTheme = {
  mode: 'light',
  primary: '#1E88E5',
  background: '#FFFFFF',
  text: '#1F2937',
  // ... toutes les couleurs
};

export const darkTheme = {
  mode: 'dark',
  primary: '#42A5F5',
  background: '#0F172A',
  text: '#F1F5F9',
  // ... toutes les couleurs
};
```

---

### 2. **`src/contexts/ThemeProvider.jsx`**
Provider global pour gérer le thème.

**Fonctionnalités** :
- Persistance avec AsyncStorage
- Hook `useTheme()` pour accéder au thème
- Fonction `toggleTheme()` pour basculer
- Fonction `setTheme(mode)` pour définir directement

---

### 3. **`src/components/ThemeToggle.jsx`**
Composant pour basculer entre les thèmes.

**2 variantes** :
- `ThemeToggle` : Bouton simple
- `ThemeSwitch` : Avec switch animé

---

### 4. **`src/app/(tabs)/parametres.jsx`**
Page des paramètres avec :
- Sélecteur de thème
- Sections organisées
- Menu d'options
- Bouton de déconnexion

---

### 5. **`src/app/(tabs)/_layout.jsx`** (modifié)
Ajout de l'onglet **Paramètres** dans la navigation.

---

### 6. **`src/app/_layout.tsx`** (modifié)
Intégration du `ThemeProvider` à la racine de l'app.

---

## 🎨 Comment utiliser le thème

### Dans vos composants

```javascript
import { useTheme } from '../../contexts/ThemeProvider';

export default function MaPage() {
  const { theme, isDark } = useTheme();

  return (
    <View style={{ backgroundColor: theme.background }}>
      <Text style={{ color: theme.text }}>
        Hello World
      </Text>
    </View>
  );
}
```

---

## 🔄 Exemple : Transformer une page existante

### Avant (sans thème) ❌

```javascript
export default function TrajetScreen() {
  return (
    <View style={{ backgroundColor: '#FFFFFF' }}>
      <Text style={{ color: '#1F2937' }}>
        Trajet
      </Text>
    </View>
  );
}
```

### Après (avec thème) ✅

```javascript
import { useTheme } from '../../contexts/ThemeProvider';

export default function TrajetScreen() {
  const { theme, isDark } = useTheme();

  return (
    <View style={{ backgroundColor: theme.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Text style={{ color: theme.text }}>
        Trajet
      </Text>
    </View>
  );
}
```

---

## 🎨 Palette de couleurs disponibles

### Couleurs principales
```javascript
theme.primary           // Couleur principale
theme.primaryDark       // Version foncée
theme.primaryLight      // Version claire
```

### Arrière-plans
```javascript
theme.background        // Fond principal
theme.backgroundSecondary  // Fond secondaire
theme.backgroundCard    // Fond des cartes
theme.surface           // Surface
theme.surfaceSecondary  // Surface secondaire
```

### Textes
```javascript
theme.text              // Texte principal
theme.textSecondary     // Texte secondaire
theme.textTertiary      // Texte tertiaire
theme.textInverse       // Texte inversé
```

### Bordures
```javascript
theme.border            // Bordure principale
theme.borderLight       // Bordure claire
```

### États
```javascript
theme.success           // Succès (vert)
theme.warning           // Avertissement (orange)
theme.error             // Erreur (rouge)
theme.info              // Info (bleu)
```

### Autres
```javascript
theme.accent            // Couleur d'accent
theme.star              // Couleur des étoiles
theme.overlay           // Overlay (modal)
theme.shadow            // Ombre
theme.shadowOpacity     // Opacité de l'ombre
```

---

## 🛠️ API du ThemeProvider

### Hook `useTheme()`

```javascript
const { 
  isDark,      // boolean : true si mode dark
  theme,       // object : palette de couleurs actuelle
  toggleTheme, // function : basculer le thème
  setTheme,    // function : définir le thème
  isLoading    // boolean : chargement initial
} = useTheme();
```

### Méthodes

#### `toggleTheme()`
Bascule entre clair et dark.

```javascript
<TouchableOpacity onPress={toggleTheme}>
  <Text>Changer de thème</Text>
</TouchableOpacity>
```

#### `setTheme(mode)`
Définit le thème directement.

```javascript
setTheme('dark');  // Mode dark
setTheme('light'); // Mode clair
```

---

## 🎯 Composants de thème

### ThemeToggle

Bouton simple pour basculer.

```javascript
import ThemeToggle from '../../components/ThemeToggle';

<ThemeToggle />
<ThemeToggle showLabel={true} /> // Avec texte
```

### ThemeSwitch

Switch avec animation.

```javascript
import { ThemeSwitch } from '../../components/ThemeToggle';

<ThemeSwitch />
```

---

## 📱 Exemple complet : Page Trajets avec thème

```javascript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeProvider';
import { Search, MapPin } from 'lucide-react-native';

export default function TrajetsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 80,
        }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => {}}
            tintColor={theme.primary} // Couleur du spinner
          />
        }
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text style={{ 
            fontSize: 24, 
            fontWeight: '600', 
            color: theme.text // ← Utilise la couleur du thème
          }}>
            Trajets disponibles
          </Text>
        </View>

        {/* Barre de recherche */}
        <View style={{ 
          backgroundColor: theme.surface, // ← Surface
          borderRadius: 12,
          padding: 12,
          marginHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.border // ← Bordure
        }}>
          <Search size={20} color={theme.textSecondary} />
          <Text style={{ 
            marginLeft: 8, 
            color: theme.textSecondary 
          }}>
            Rechercher un trajet...
          </Text>
        </View>

        {/* Card Trajet */}
        <View style={{
          backgroundColor: theme.backgroundCard, // ← Carte
          borderRadius: 12,
          padding: 16,
          marginHorizontal: 20,
          marginTop: 16,
          borderWidth: 1,
          borderColor: theme.border,
          shadowColor: theme.shadow,
          shadowOpacity: theme.shadowOpacity,
          shadowRadius: 4,
          elevation: 2,
        }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '600', 
            color: theme.text 
          }}>
            Cotonou → Porto-Novo
          </Text>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginTop: 8 
          }}>
            <MapPin size={14} color={theme.textSecondary} />
            <Text style={{ 
              fontSize: 12, 
              color: theme.textSecondary,
              marginLeft: 4 
            }}>
              Départ : Gare de Cotonou
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
```

---

## ✨ Bonnes pratiques

### 1. Toujours utiliser `theme.*` au lieu de couleurs hardcodées

❌ **Mauvais** :
```javascript
<View style={{ backgroundColor: '#FFFFFF' }}>
```

✅ **Bon** :
```javascript
<View style={{ backgroundColor: theme.background }}>
```

---

### 2. Adapter la StatusBar au thème

```javascript
import { StatusBar } from 'expo-status-bar';

<StatusBar style={isDark ? 'light' : 'dark'} />
```

---

### 3. Utiliser les couleurs sémantiques

```javascript
// Pour les succès
<Text style={{ color: theme.success }}>✓ Succès</Text>

// Pour les erreurs
<Text style={{ color: theme.error }}>✗ Erreur</Text>

// Pour les infos
<Text style={{ color: theme.info }}>ℹ Information</Text>
```

---

### 4. Penser aux ombres

```javascript
shadowColor: theme.shadow,
shadowOpacity: theme.shadowOpacity,
shadowRadius: 4,
elevation: 2, // Android
```

---

## 🧪 Test du système

### Test 1 : Basculer le thème
1. Aller sur **Paramètres**
2. Cliquer sur le switch du thème
3. ✅ Toute l'app doit basculer

### Test 2 : Persistance
1. Changer le thème
2. Fermer l'app complètement
3. Rouvrir l'app
4. ✅ Le thème doit être conservé

### Test 3 : StatusBar
1. En mode clair : StatusBar dark
2. En mode dark : StatusBar light
3. ✅ Les icônes doivent être visibles

---

## 🔄 Migration des pages existantes

### Pages à migrer (priorité)

1. **Accueil** (`index.jsx`)
2. **Trajets** (`trajets.jsx`)
3. **Compagnies** (`compagnies.jsx`)
4. **Favoris** (`favoris.jsx`)
5. **Mes Réservations** (`mes-reservations.jsx`)
6. **Trajet Détail** (`trajet/[id].jsx`)
7. **Compagnie Détail** (`compagnie/[id].jsx`)

### Étapes de migration

Pour chaque page :

1. **Importer** `useTheme`
```javascript
import { useTheme } from '../../contexts/ThemeProvider';
```

2. **Utiliser** le hook
```javascript
const { theme, isDark } = useTheme();
```

3. **Remplacer** les couleurs hardcodées
```javascript
// Chercher : #FFFFFF, #1F2937, etc.
// Remplacer par : theme.background, theme.text, etc.
```

4. **Ajouter** StatusBar
```javascript
<StatusBar style={isDark ? 'light' : 'dark'} />
```

---

## 🎨 Personnalisation

### Modifier les couleurs

Éditez `src/constants/theme.js` :

```javascript
export const lightTheme = {
  primary: '#FF6B6B', // ← Nouvelle couleur principale
  // ...
};
```

### Ajouter une nouvelle couleur

```javascript
export const lightTheme = {
  // ... couleurs existantes
  custom: '#FF00FF', // ← Nouvelle couleur
};

export const darkTheme = {
  // ... couleurs existantes
  custom: '#CC00CC', // ← Version dark
};
```

Utilisation :
```javascript
<View style={{ backgroundColor: theme.custom }} />
```

---

## 📊 Récapitulatif

| Fonctionnalité | Status |
|----------------|--------|
| ThemeProvider | ✅ Installé |
| Persistance AsyncStorage | ✅ Configuré |
| Palette de couleurs | ✅ Définie (clair + dark) |
| Hook useTheme | ✅ Disponible |
| Composants Toggle | ✅ Créés |
| Page Paramètres | ✅ Créée |
| Onglet Paramètres | ✅ Ajouté |
| Migration pages | ⏳ À faire |

---

## 🆘 Résolution de problèmes

### Le thème ne change pas

**Vérifiez** :
1. Le `ThemeProvider` est bien au root
2. Vous utilisez `useTheme()` dans vos composants
3. Vous utilisez `theme.*` au lieu de couleurs hardcodées

### Le thème ne persiste pas

**Vérifiez** :
1. AsyncStorage est installé
2. Les permissions sont correctes
3. Pas d'erreur dans la console

### Couleur manquante

**Ajoutez-la** dans `theme.js` :
```javascript
nouvelleGouleur: '#...', // light
nouvelleGouleur: '#...', // dark
```

---

## 🚀 Prochaines étapes

1. **Migrer** les pages existantes (voir liste ci-dessus)
2. **Tester** sur toutes les pages
3. **Ajuster** les couleurs si nécessaire
4. **Ajouter** des animations de transition (optionnel)

---

## 🎉 Résultat

**Votre app supporte maintenant le mode dark ! 🌓**

Les utilisateurs peuvent choisir leur thème préféré dans **Paramètres** → **Thème**, et leur choix est sauvegardé automatiquement.

---

## 📝 Exemple : Migration rapide d'une page

**Ouvrez** une page, par exemple `trajets.jsx`

**Ajoutez** en haut :
```javascript
import { useTheme } from '../../contexts/ThemeProvider';
const { theme, isDark } = useTheme();
```

**Remplacez** (Ctrl+H) :
- `#FFFFFF` → `theme.background`
- `#F9FAFB` → `theme.backgroundSecondary`
- `#1F2937` → `theme.text`
- `#6B7280` → `theme.textSecondary`
- `#9CA3AF` → `theme.textTertiary`
- `#E5E7EB` → `theme.border`
- `#1E88E5` → `theme.primary`

**Ajoutez** après le premier View :
```javascript
<StatusBar style={isDark ? 'light' : 'dark'} />
```

**Testez** ! 🎨
