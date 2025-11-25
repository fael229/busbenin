# 🔙 Guide d'utilisation du BackButton

## 📋 Problème résolu

**Avant** ❌ :
- Boutons back inconsistants dans le projet
- Styles différents sur chaque page
- Code dupliqué partout
- Difficulté à maintenir

**Maintenant** ✅ :
- Composant réutilisable unique
- Style cohérent dans toute l'app
- Facile à personnaliser
- Maintenance simplifiée

---

## 🚀 Utilisation rapide

### Import

```javascript
import BackButton from '../../../components/BackButton';
```

### Cas d'usage

#### 1. Bouton avec titre (le plus courant)

```javascript
<BackButton title="Avis des voyageurs" />
```

**Rendu** :
```
← Avis des voyageurs
```

#### 2. Bouton simple sans titre

```javascript
<BackButton />
```

**Rendu** :
```
←
```

#### 3. Bouton avec action personnalisée

```javascript
<BackButton 
  title="Retour"
  onPress={() => {
    // Sauvegarder les données avant de revenir
    saveData();
    router.back();
  }}
/>
```

#### 4. Bouton avec style personnalisé

```javascript
<BackButton 
  title="Mon titre"
  color="#1E88E5"
  size={28}
  style={{ backgroundColor: '#F3F4F6', borderRadius: 8 }}
/>
```

---

## 📚 Props disponibles

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `title` | `string` | `undefined` | Titre à afficher à côté du bouton |
| `onPress` | `function` | `router.back()` | Fonction appelée au clic |
| `color` | `string` | `'#1F2937'` | Couleur de l'icône et du texte |
| `size` | `number` | `24` | Taille de l'icône en pixels |
| `showTitle` | `boolean` | `true` | Afficher ou cacher le titre |
| `style` | `object` | `{}` | Styles pour le conteneur |
| `buttonStyle` | `object` | `{}` | Styles pour le bouton uniquement |

---

## 🎨 Exemples de personnalisation

### Style professionnel

```javascript
<BackButton 
  title="Mes réservations"
  style={{ 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB',
    paddingVertical: 16
  }}
/>
```

### Style coloré

```javascript
<BackButton 
  title="Annuler"
  color="#DC2626"
  size={26}
  buttonStyle={{ 
    backgroundColor: '#FEE2E2',
    borderRadius: 12
  }}
/>
```

### Style avec ombre

```javascript
<BackButton 
  title="Retour au trajet"
  style={{
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  }}
/>
```

---

## 📝 Exemples de migration

### Page Avis - AVANT

```javascript
import { ArrowLeft } from 'lucide-react-native';

// Dans le render
<View style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
  <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
    <ArrowLeft size={24} color="#1F2937" />
  </TouchableOpacity>
  <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937', marginLeft: 8 }}>
    Avis des voyageurs
  </Text>
</View>
```

### Page Avis - APRÈS ✅

```javascript
import BackButton from '../../../components/BackButton';

// Dans le render
<BackButton title="Avis des voyageurs" />
```

**Gain** : 7 lignes → 1 ligne !

---

## 🔧 Pages à migrer

### Déjà migrées ✅

- ✅ `/avis/liste/[trajetId].jsx`
- ✅ `/avis/[trajetId].jsx`

### À migrer 🔄

```javascript
// 1. Page trajet détail
// Fichier: src/app/(tabs)/trajet/[id].jsx

// AVANT (ligne ~170-176)
<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
  <TouchableOpacity
    onPress={() => router.back()}
    style={{ padding: 8, marginLeft: -8 }}
  >
    <ArrowLeft size={24} color="#1F2937" />
  </TouchableOpacity>
  ...
</View>

// APRÈS
import BackButton from '../../../components/BackButton';
// Dans le header
<BackButton />
```

```javascript
// 2. Page réservation
// Fichier: src/app/(tabs)/reservation/[trajetId].jsx

// AVANT (ligne ~254)
<TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
  <ArrowLeft size={24} color="#1F2937" />
</TouchableOpacity>

// APRÈS
<BackButton />
```

```javascript
// 3. Pages admin
// Fichiers: 
// - src/app/(tabs)/admin/manage-compagnies.jsx
// - src/app/(tabs)/admin/manage-reservations.jsx
// - src/app/(tabs)/admin/manage-destinations.jsx
// - src/app/(tabs)/admin/manage-users.jsx

// AVANT
<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
  <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 8 }}>
    <ArrowLeft size={22} color="#1F2937" />
  </TouchableOpacity>
  <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937' }}>
    Gérer les compagnies
  </Text>
</View>

// APRÈS
<BackButton title="Gérer les compagnies" />
```

---

## ✨ Avantages

### 1. Cohérence visuelle
- Tous les boutons back ont le même style
- Espacement uniforme
- Comportement identique

### 2. Maintenance simplifiée
- Un seul endroit pour modifier le style
- Pas de code dupliqué
- Facile à tester

### 3. Personnalisation facile
```javascript
// Changer la couleur de TOUS les boutons back
// Modifier une seule ligne dans BackButton.jsx
color = '#1E88E5' // au lieu de '#1F2937'
```

### 4. Accessibilité
- Zone de touch optimale (padding: 8)
- Feedback visuel (activeOpacity: 0.7)
- Taille d'icône lisible (24px par défaut)

---

## 🎯 Bonnes pratiques

### ✅ À FAIRE

```javascript
// 1. Utiliser le titre pour décrire la page
<BackButton title="Détails du trajet" />

// 2. Sauvegarder avant de retourner
<BackButton 
  onPress={() => {
    saveChanges();
    router.back();
  }}
/>

// 3. Ajouter dans le header avec paddingTop
<View style={{ paddingTop: insets.top }}>
  <BackButton title="Ma page" />
</View>
```

### ❌ À ÉVITER

```javascript
// 1. Ne pas dupliquer le code
// MAUVAIS
<TouchableOpacity onPress={() => router.back()}>
  <ArrowLeft size={24} />
</TouchableOpacity>

// BON
<BackButton />

// 2. Ne pas oublier le titre sur les pages principales
// MAUVAIS
<BackButton />

// BON
<BackButton title="Avis des voyageurs" />

// 3. Ne pas utiliser des marges négatives
// MAUVAIS
<BackButton buttonStyle={{ marginLeft: -8 }} />

// BON
<BackButton /> // Le padding est déjà optimisé
```

---

## 🔍 Structure du composant

```
BackButton
│
├── Avec titre (title prop fourni)
│   └── View (conteneur)
│       ├── TouchableOpacity (bouton)
│       │   └── ArrowLeft (icône)
│       └── Text (titre)
│
└── Sans titre
    └── TouchableOpacity (bouton)
        └── ArrowLeft (icône)
```

---

## 🧪 Tests

### Test visuel

1. Naviguer vers une page avec BackButton
2. Vérifier :
   - ✅ Icône visible
   - ✅ Titre lisible (si présent)
   - ✅ Zone cliquable suffisante
   - ✅ Feedback au touch (opacité)

### Test fonctionnel

```javascript
// 1. Test navigation basique
<BackButton title="Test" />
// Cliquer → Doit revenir à la page précédente

// 2. Test navigation personnalisée
<BackButton 
  title="Test"
  onPress={() => {
    console.log('Custom back');
    router.push('/home');
  }}
/>
// Cliquer → Doit naviguer vers /home
```

---

## 📦 Installation dans un nouveau fichier

```javascript
// 1. Import
import BackButton from '../../../components/BackButton';

// 2. Utilisation basique
export default function MaPage() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <BackButton title="Ma nouvelle page" />
      
      {/* Contenu de la page */}
    </View>
  );
}
```

---

## 🎨 Thèmes alternatifs

### Dark Mode

```javascript
<BackButton 
  title="Retour"
  color="#FFFFFF"
  style={{ backgroundColor: '#1F2937' }}
/>
```

### Accent Color

```javascript
<BackButton 
  title="Retour"
  color="#1E88E5"
  buttonStyle={{ 
    backgroundColor: '#EBF5FF',
    borderRadius: 8
  }}
/>
```

### Minimal

```javascript
<BackButton 
  color="#9CA3AF"
  size={20}
/>
```

---

## ✅ Checklist de migration

Pour chaque fichier à migrer :

- [ ] Importer `BackButton` au lieu de `ArrowLeft`
- [ ] Remplacer le code du bouton par `<BackButton />`
- [ ] Ajouter le `title` si nécessaire
- [ ] Supprimer les imports inutiles (`ArrowLeft`, `TouchableOpacity` si non utilisés ailleurs)
- [ ] Tester la navigation
- [ ] Vérifier le style

---

## 🚀 Résumé

**BackButton** est un composant simple mais puissant qui :

1. ✅ Unifie le style des boutons retour
2. ✅ Réduit le code dupliqué
3. ✅ Facilite la maintenance
4. ✅ Améliore l'expérience utilisateur

**Utilisation** :
```javascript
<BackButton title="Mon titre" />
```

**C'est tout !** 🎉
