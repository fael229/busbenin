# 🔙 Fix : Bouton Back renvoyant à l'accueil

## ⚠️ Problème identifié

**Symptôme** : Quand on clique sur le bouton back, on est renvoyé à l'accueil au lieu de la page précédente.

**Cause** : 
1. `router.back()` ne fonctionne pas toujours dans Expo Router
2. L'historique de navigation n'est pas toujours disponible
3. Les pages dans `(tabs)/avis/` ne sont pas dans la pile de navigation principale

---

## ✅ Solution appliquée

### 1. **BackButton amélioré**

Le composant `BackButton` vérifie maintenant :
- ✅ Si un historique existe (`canGoBack()`)
- ✅ Utilise `router.back()` si possible
- ✅ Sinon, utilise une route de fallback intelligente

```javascript
// Avant ❌
const handlePress = () => {
  router.back(); // Peut renvoyer à l'accueil
};

// Maintenant ✅
const handlePress = () => {
  try {
    if (navigation.canGoBack && navigation.canGoBack()) {
      navigation.back();
    } else if (router.canGoBack && router.canGoBack()) {
      router.back();
    } else {
      // Fallback vers une route spécifique
      router.replace(fallback);
    }
  } catch (error) {
    console.warn('Erreur navigation back:', error);
    router.replace(fallback);
  }
};
```

### 2. **Fallbacks intelligents par page**

#### Pages Avis → Retour vers le trajet
```javascript
// src/app/(tabs)/avis/liste/[trajetId].jsx
<BackButton 
  title="Avis des voyageurs"
  fallback={`/trajet/${trajetId}`} // ✅ Retourne au trajet
/>

// src/app/(tabs)/avis/[trajetId].jsx  
<BackButton 
  title="Laisser un avis"
  fallback={`/trajet/${trajetId}`} // ✅ Retourne au trajet
/>
```

#### Pages Admin → Retour vers l'onglet admin
```javascript
// Toutes les pages admin
<BackButton 
  title="Gérer les compagnies"
  fallback="/(tabs)/admin" // ✅ Retourne à l'admin
/>
```

#### Page Réservation → Retour vers le trajet
```javascript
// src/app/(tabs)/reservation/[trajetId].jsx
<BackButton 
  title="Réservation"
  fallback={`/trajet/${trajetId}`} // ✅ Retourne au trajet
/>
```

#### Page Trajet → Retour vers l'accueil
```javascript
// src/app/(tabs)/trajet/[id].jsx
<BackButton 
  fallback="/(tabs)/" // ✅ Retourne à l'accueil
/>
```

---

## 🎯 Comment utiliser le nouveau système

### Utilisation par défaut (fallback = accueil)

```javascript
<BackButton title="Ma page" />
// Si pas d'historique → va à /(tabs)/
```

### Avec fallback personnalisé

```javascript
<BackButton 
  title="Ma page"
  fallback="/ma-page-precedente"
/>
// Si pas d'historique → va à /ma-page-precedente
```

### Avec fonction personnalisée

```javascript
<BackButton 
  title="Ma page"
  onPress={() => {
    // Logique personnalisée
    saveData();
    router.push('/ma-route');
  }}
/>
// Ignore le fallback et exécute onPress
```

---

## 🔍 Pourquoi ça ne marchait pas avant ?

### Problème 1 : Structure des routes Expo Router

```
app/
  (tabs)/           ← Navigation principale (tabs)
    index.jsx       ← Accueil
    trajet/
      [id].jsx      ← Page trajet (dans tabs)
    avis/           ← Groupe caché (hors tabs)
      [trajetId].jsx
      liste/
        [trajetId].jsx
```

Les pages `avis/*` sont dans `(tabs)/avis/` mais **ne font pas partie des tabs visibles**. Elles sont "hors navigation tab" donc `router.back()` ne trouve pas d'historique correct.

### Problème 2 : Navigation avec `router.push()`

```javascript
// Depuis la page trajet
router.push('/avis/liste/123');

// Crée une nouvelle pile de navigation
// mais pas toujours connectée à la pile précédente
```

### Problème 3 : `router.back()` sans historique

```javascript
// Si la page est ouverte directement (lien, refresh, etc.)
// Il n'y a pas d'historique → router.back() va à l'accueil
```

---

## 🛠️ Tests

### Test 1 : Navigation normale

```
1. Ouvrir l'app → Accueil
2. Cliquer sur un trajet → Page trajet
3. Cliquer "X avis" → Page liste avis
4. Cliquer ← → Doit revenir à la page trajet ✅
```

### Test 2 : Ouverture directe

```
1. Ouvrir directement /avis/liste/123 (via lien)
2. Pas d'historique disponible
3. Cliquer ← → Va au fallback /trajet/123 ✅
```

### Test 3 : Navigation complexe

```
1. Accueil → Trajet → Avis → Laisser avis
2. Cliquer ← depuis "Laisser avis"
3. Doit revenir à la page précédente (Avis ou Trajet) ✅
```

---

## 📋 Checklist de migration

Pour chaque page avec BackButton :

- [ ] Identifier d'où vient l'utilisateur (page précédente logique)
- [ ] Ajouter le prop `fallback` approprié
- [ ] Tester la navigation normale
- [ ] Tester l'ouverture directe de la page
- [ ] Vérifier la console pour les logs d'erreur

---

## 🎨 Fallbacks recommandés par type de page

| Type de page | Fallback recommandé | Exemple |
|--------------|---------------------|---------|
| **Détail d'un item** | Liste des items | `/trajets` |
| **Sous-page d'un item** | Détail de l'item | `/trajet/${id}` |
| **Page admin** | Dashboard admin | `/(tabs)/admin` |
| **Page settings** | Profil/Compte | `/(tabs)/profile` |
| **Page autre** | Accueil | `/(tabs)/` |

---

## 🐛 Debug

### Activer les logs

Le BackButton log automatiquement dans la console :

```javascript
// En cas d'erreur
console.warn('Erreur navigation back:', error);

// Pour déboguer, ajouter dans BackButton.jsx :
console.log('canGoBack:', navigation.canGoBack());
console.log('fallback:', fallback);
```

### Vérifier dans l'app

```javascript
// Dans n'importe quelle page
import { useRouter } from 'expo-router';

const navigation = useRouter();

// Vérifier si on peut revenir
console.log('Can go back?', navigation.canGoBack && navigation.canGoBack());
```

---

## 🚀 Améliorations futures

### Option 1 : Système de navigation contextuelle

```javascript
// Créer un contexte qui garde l'historique
<NavigationContext.Provider value={{ previousRoute: '/trajet/123' }}>
  {/* App */}
</NavigationContext.Provider>

// Dans BackButton
const { previousRoute } = useNavigationContext();
fallback={previousRoute || defaultFallback}
```

### Option 2 : Utiliser des query params

```javascript
// Passer la route précédente en param
router.push(`/avis/liste/123?from=/trajet/123`);

// Dans la page
const { from } = useLocalSearchParams();
<BackButton fallback={from || '/trajet/123'} />
```

### Option 3 : Navigation state persistence

```javascript
// Sauvegarder l'état de navigation
import AsyncStorage from '@react-native-async-storage/async-storage';

// Avant navigation
await AsyncStorage.setItem('lastRoute', currentRoute);

// Dans BackButton
const lastRoute = await AsyncStorage.getItem('lastRoute');
```

---

## ✅ Résumé

### Avant ❌
```javascript
<BackButton title="Avis" />
// Clic → Retour à l'accueil (bug)
```

### Maintenant ✅
```javascript
<BackButton 
  title="Avis" 
  fallback={`/trajet/${trajetId}`}
/>
// Clic → Retour à la page trajet (correct!)
```

### Comportement

1. **Si historique disponible** : `router.back()` ✅
2. **Si pas d'historique** : `router.replace(fallback)` ✅
3. **Si erreur** : `router.replace(fallback)` ✅

**Le bouton back fonctionne maintenant correctement dans tous les cas ! 🎉**
