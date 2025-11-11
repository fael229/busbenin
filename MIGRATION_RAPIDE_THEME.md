# ⚡ Migration Rapide : Appliquer le Thème à Toutes les Pages

## 🎯 Problème résolu

Actuellement, seule la page **Paramètres** utilise le thème. Pour que toute l'app change de couleur, il faut migrer chaque page.

---

## ✅ Ce qui est déjà fait

- ✅ **TabBar** (barre de navigation) : Utilise le thème
- ✅ **Page Accueil** : Utilise le thème
- ✅ **Page Paramètres** : Utilise le thème

---

## 📋 Méthode de migration (2 min par page)

### Étape 1 : Importer useTheme

**Ajoutez** cette ligne en haut du fichier :

```javascript
import { useTheme } from '../../contexts/ThemeProvider';
```

---

### Étape 2 : Utiliser le hook

**Ajoutez** dans le composant (après les autres hooks) :

```javascript
const { theme, isDark } = useTheme();
```

---

### Étape 3 : Remplacer les couleurs

**Utilisez Ctrl+H (Rechercher/Remplacer)** :

| Chercher | Remplacer par |
|----------|---------------|
| `'#FFFFFF'` | `theme.background` |
| `'#F9FAFB'` | `theme.backgroundSecondary` |
| `'#1F2937'` | `theme.text` |
| `'#6B7280'` | `theme.textSecondary` |
| `'#9CA3AF'` | `theme.textTertiary` |
| `'#E5E7EB'` | `theme.border` |
| `'#1E88E5'` | `theme.primary` |
| `'#10B981'` | `theme.success` |
| `'#EF4444'` | `theme.error` |

---

### Étape 4 : StatusBar

**Cherchez** :
```javascript
<StatusBar style="dark" />
```

**Remplacez** par :
```javascript
<StatusBar style={isDark ? 'light' : 'dark'} />
```

---

## 🚀 Migration Automatique (MÉTHODE RAPIDE)

Voici le code exact à copier/coller pour chaque page :

### Template Complet

```javascript
// 1. IMPORTS (en haut du fichier, après les autres imports)
import { useTheme } from '../../contexts/ThemeProvider';

// 2. HOOK (dans le composant, après les autres hooks)
const { theme, isDark } = useTheme();

// 3. VIEW PRINCIPAL
<View style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}>
  <StatusBar style={isDark ? 'light' : 'dark'} />
  
// 4. REMPLACEMENTS COURANTS
backgroundColor: theme.background          // au lieu de '#FFFFFF'
backgroundColor: theme.backgroundSecondary // au lieu de '#F9FAFB'
backgroundColor: theme.surface             // au lieu de '#FFFFFF' (cartes)
backgroundColor: theme.surfaceSecondary    // au lieu de '#F3F4F6'

color: theme.text                          // au lieu de '#1F2937'
color: theme.textSecondary                 // au lieu de '#6B7280'
color: theme.textTertiary                  // au lieu de '#9CA3AF'

borderColor: theme.border                  // au lieu de '#E5E7EB'
borderColor: theme.borderLight             // au lieu de '#F3F4F6'

// 5. COULEURS SPÉCIALES
color: theme.primary                       // Bleu principal
color: theme.success                       // Vert
color: theme.error                         // Rouge
color: theme.warning                       // Orange
```

---

## 📂 Pages à Migrer (Par ordre de priorité)

### Priorité HAUTE (visible souvent) ⭐⭐⭐

1. ✅ **index.jsx** (Accueil) - FAIT
2. ⏳ **trajets.jsx** (Liste trajets)
3. ⏳ **trajet/[id].jsx** (Détail trajet)
4. ⏳ **compagnies.jsx** (Liste compagnies)
5. ⏳ **compagnie/[id].jsx** (Détail compagnie)

### Priorité MOYENNE ⭐⭐

6. ⏳ **favoris.jsx** (Favoris)
7. ⏳ **mes-reservations.jsx** (Réservations)
8. ⏳ **reservation/[trajetId].jsx** (Réservation)

### Priorité BASSE ⭐

9. ⏳ **avis/liste/[trajetId].jsx** (Liste avis)
10. ⏳ **avis/[trajetId].jsx** (Laisser avis)
11. ⏳ **paiement/[reservationId].jsx** (Paiement)

---

## 🎨 Exemple Complet : Migration de trajets.jsx

### AVANT ❌

```javascript
import { Search, MapPin } from "lucide-react-native";

export default function TrajetsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <StatusBar style="dark" />
      
      <Text style={{ color: "#1F2937" }}>Trajets</Text>
      
      <View style={{ 
        backgroundColor: "#FFFFFF",
        borderColor: "#E5E7EB"
      }}>
        <Text style={{ color: "#6B7280" }}>Rechercher</Text>
      </View>
    </View>
  );
}
```

---

### APRÈS ✅

```javascript
import { Search, MapPin } from "lucide-react-native";
import { useTheme } from '../../contexts/ThemeProvider'; // ← AJOUTÉ

export default function TrajetsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme(); // ← AJOUTÉ

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}> {/* ← MODIFIÉ */}
      <StatusBar style={isDark ? 'light' : 'dark'} /> {/* ← MODIFIÉ */}
      
      <Text style={{ color: theme.text }}>Trajets</Text> {/* ← MODIFIÉ */}
      
      <View style={{ 
        backgroundColor: theme.background, // ← MODIFIÉ
        borderColor: theme.border // ← MODIFIÉ
      }}>
        <Text style={{ color: theme.textSecondary }}>Rechercher</Text> {/* ← MODIFIÉ */}
      </View>
    </View>
  );
}
```

---

## ⚡ Migration Ultra-Rapide (Ctrl+H)

Ouvrez **trajets.jsx** et faites Ctrl+H pour chaque remplacement :

1. `import { useSafeAreaInsets }` → Ajoutez ligne après : `import { useTheme } from '../../contexts/ThemeProvider';`

2. `const insets = useSafeAreaInsets();` → Ajoutez ligne après : `const { theme, isDark } = useTheme();`

3. Ctrl+H : Remplacer **TOUT** :
   - `'#FFFFFF'` → `theme.background`
   - `'#F9FAFB'` → `theme.backgroundSecondary`
   - `'#1F2937'` → `theme.text`
   - `'#6B7280'` → `theme.textSecondary`
   - `'#9CA3AF'` → `theme.textTertiary`
   - `'#E5E7EB'` → `theme.border`
   - `'#1E88E5'` → `theme.primary`
   - `style="dark"` → `style={isDark ? 'light' : 'dark'}`

4. **Enregistrer** → Tester !

---

## 🧪 Test Après Migration

1. **Tester** la page en mode clair
2. **Aller** sur Paramètres
3. **Basculer** en mode dark
4. **Revenir** sur la page
5. ✅ La page doit être dark !

---

## 🎯 Checklist de Migration

Pour chaque page :

- [ ] Import `useTheme` ajouté
- [ ] Hook `const { theme, isDark } = useTheme()` ajouté
- [ ] `backgroundColor` utilise `theme.*`
- [ ] `color` utilise `theme.*`
- [ ] `borderColor` utilise `theme.*`
- [ ] `StatusBar` utilise `isDark`
- [ ] Testé en mode clair ✅
- [ ] Testé en mode dark ✅

---

## 🚨 Couleurs Spéciales (À NE PAS Changer)

Certaines couleurs NE doivent PAS être remplacées :

- `'#FCD34D'` → Étoiles (jaune) ⭐ - GARDER
- `'rgba(...)'` → Transparences - GARDER
- Icônes Lucide → Utiliser la couleur du thème

---

## 💡 Astuce Pro

Créez un snippet dans votre IDE :

**Nom** : `usetheme`

**Code** :
```javascript
const { theme, isDark } = useTheme();
```

Tapez `usetheme` + Tab = Instant ! ⚡

---

## ✅ Résultat Attendu

Après migration de toutes les pages :

- ✅ TabBar change de couleur
- ✅ Accueil change de couleur
- ✅ Trajets change de couleur
- ✅ Compagnies change de couleur
- ✅ Favoris change de couleur
- ✅ Réservations change de couleur
- ✅ Détails changent de couleur
- ✅ **TOUTE L'APP** change de couleur ! 🎉

---

## 🎬 Action Immédiate

### Option 1 : Migration Manuelle (Recommandé)

1. Ouvrir **trajets.jsx**
2. Suivre les 4 étapes ci-dessus
3. Tester
4. Passer à la page suivante

**Temps** : 2-3 min par page = 30 min total

---

### Option 2 : Je Migre Pour Vous

Dites-moi quelle page migrer en priorité et je le fais !

**Exemple** :
- "Migre trajets.jsx"
- "Migre toutes les pages principales"
- "Migre compagnies.jsx et compagnie/[id].jsx"

---

## 📊 Progression

| Page | Status | Priorité |
|------|--------|----------|
| TabBar | ✅ Fait | ⭐⭐⭐ |
| Accueil | ✅ Fait | ⭐⭐⭐ |
| Paramètres | ✅ Fait | ⭐⭐⭐ |
| Trajets | ⏳ À faire | ⭐⭐⭐ |
| Trajet Détail | ⏳ À faire | ⭐⭐⭐ |
| Compagnies | ⏳ À faire | ⭐⭐⭐ |
| Compagnie Détail | ⏳ À faire | ⭐⭐⭐ |
| Favoris | ⏳ À faire | ⭐⭐ |
| Réservations | ⏳ À faire | ⭐⭐ |
| Autres | ⏳ À faire | ⭐ |

---

**Prêt à migrer ? Dites-moi par quelle page commencer ! 🚀**
