# 🧪 Test du BackButton

## Vérifications rapides

### 1. Le bouton s'affiche-t-il ?

Ouvrez n'importe quelle page avec BackButton (ex: `/avis/liste/[trajetId]`)

✅ Vous devez voir : `← Avis des voyageurs`

❌ Si rien ne s'affiche :
- Vérifier l'import : `import BackButton from '../../../../components/BackButton';`
- Vérifier le chemin (nombre de `../`)

---

### 2. Le clic fonctionne-t-il ?

Cliquez sur le bouton et **regardez la console**

✅ Vous devez voir :
```
🔙 BackButton clicked {fallback: "/trajet/123"}
📍 Navigating to fallback: /trajet/123
```

❌ Si pas de logs :
- Le TouchableOpacity ne fonctionne pas
- Problème d'événement

---

### 3. La navigation fonctionne-t-elle ?

Après le clic :

✅ Vous devez être redirigé vers la page fallback ou la page précédente

❌ Si vous restez sur la même page :
- `router.push()` ou `router.back()` ne fonctionne pas
- Problème de routes

---

## Tests par page

### Page Avis Liste

```javascript
// src/app/(tabs)/avis/liste/[trajetId].jsx
<BackButton 
  title="Avis des voyageurs"
  fallback={`/trajet/${trajetId}`}
/>
```

**Test** :
1. Ouvrir `/avis/liste/123`
2. Cliquer ←
3. Doit aller à `/trajet/123`

**Console attendue** :
```
🔙 BackButton clicked {fallback: "/trajet/123"}
📍 Navigating to fallback: /trajet/123
```

---

### Page Laisser Avis

```javascript
// src/app/(tabs)/avis/[trajetId].jsx
<BackButton 
  title="Laisser un avis"
  fallback={`/trajet/${trajetId}`}
/>
```

**Test** :
1. Ouvrir `/avis/123`
2. Cliquer ←
3. Doit aller à `/trajet/123`

---

### Page Admin

```javascript
// src/app/(tabs)/admin/manage-compagnies.jsx
<BackButton 
  title="Gérer compagnies & trajets"
  fallback="/(tabs)/admin"
/>
```

**Test** :
1. Ouvrir `/admin/manage-compagnies`
2. Cliquer ←
3. Doit aller à `/(tabs)/admin`

---

## Problèmes courants

### Problème 1 : "undefined is not an object (evaluating 'router.push')"

**Cause** : `router` n'est pas importé

**Solution** :
```javascript
import { router } from 'expo-router';
```

---

### Problème 2 : Le bouton ne s'affiche pas

**Cause** : Mauvais chemin d'import

**Solution** :
```javascript
// Compter les niveaux
// src/app/(tabs)/avis/liste/[trajetId].jsx
import BackButton from '../../../../components/BackButton';
//                     ^^^^^ 5 niveaux

// src/app/(tabs)/admin/manage-compagnies.jsx
import BackButton from '../../../components/BackButton';
//                     ^^^^ 3 niveaux
```

---

### Problème 3 : "Cannot read property 'push' of undefined"

**Cause** : Import incorrect

**Mauvais** ❌ :
```javascript
import router from 'expo-router';
```

**Bon** ✅ :
```javascript
import { router } from 'expo-router';
```

---

### Problème 4 : Le bouton clique mais rien ne se passe

**Vérifier dans la console** :

Si vous voyez :
```
🔙 BackButton clicked
```
Mais pas de navigation → Problème avec `router.push()` ou `router.back()`

**Solution** : Vérifier que la route existe

```javascript
// Route doit être valide
fallback="/trajet/123"  // ✅ OK
fallback="trajet/123"   // ❌ Manque le /
fallback={`/trajet/${trajetId}`}  // ✅ OK
fallback={`/trajet/${undefined}`}  // ❌ trajetId undefined
```

---

## Diagnostic complet

### Étape 1 : Vérifier l'import

```javascript
// En haut du fichier
import BackButton from '../../../components/BackButton';
import { router } from 'expo-router';
```

### Étape 2 : Vérifier l'utilisation

```javascript
<BackButton 
  title="Mon titre"
  fallback="/ma-route"
/>
```

### Étape 3 : Tester

1. Ouvrir la page
2. Voir le bouton
3. Cliquer
4. Regarder la console
5. Vérifier la navigation

### Étape 4 : Logs attendus

```
🔙 BackButton clicked {fallback: "/ma-route"}
📍 Navigating to fallback: /ma-route
```

---

## Solution de secours

Si vraiment rien ne fonctionne, remplacer temporairement par :

```javascript
<TouchableOpacity 
  onPress={() => {
    console.log('Test click');
    router.push('/trajet/123');
  }}
>
  <Text>← Retour</Text>
</TouchableOpacity>
```

Si **ça** fonctionne → Problème dans le composant BackButton
Si **ça ne fonctionne pas** → Problème avec router ou React Native

---

## Checklist finale

- [ ] BackButton importé correctement
- [ ] router importé de 'expo-router'
- [ ] BackButton utilisé avec props corrects
- [ ] Bouton visible à l'écran
- [ ] Clic déclenche des logs
- [ ] Navigation fonctionne

**Si tout est ✅ → BackButton fonctionne !**
**Si un ❌ → Suivre les solutions ci-dessus**
