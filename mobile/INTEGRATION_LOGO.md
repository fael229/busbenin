# 🎨 Intégration du Logo - Bus Bénin

## 📱 Application Mobile (React Native / Expo)

### Étapes d'intégration

#### 1. Préparer les fichiers image

Vous devez créer plusieurs versions du logo à partir de l'image originale :

**Formats requis :**
- **icon.png** : 1024x1024 px (icône principale de l'app)
- **adaptive-icon.png** : 1024x1024 px (icône Android adaptative)
- **splash-icon.png** : 1024x1024 px (logo pour écran de démarrage)
- **favicon.png** : 48x48 px (favicon web)

#### 2. Placer les fichiers dans le dossier assets

```
mobile/
├── assets/
│   └── images/
│       ├── icon.png           ← Icône principale (1024x1024)
│       ├── adaptive-icon.png  ← Icône Android (1024x1024)
│       ├── splash-icon.png    ← Logo splash screen (1024x1024)
│       └── favicon.png        ← Favicon (48x48)
```

#### 3. Remplacer les fichiers existants

1. Sauvegardez le logo uploadé sous le nom `icon.png` (1024x1024 px)
2. Copiez-le aussi sous les noms `adaptive-icon.png` et `splash-icon.png`
3. Créez une version réduite (48x48 px) nommée `favicon.png`

**💡 Astuce** : Utilisez un outil comme [Figma](https://figma.com) ou [GIMP](https://gimp.org) pour redimensionner les images.

#### 4. Configuration déjà effectuée

✅ `app.json` est déjà configuré avec :
- Nom de l'app : **"Bus Bénin"**
- Couleur de fond splash : **#3BBFDB** (turquoise du gradient)
- Couleur adaptive icon : **#3BBFDB**

✅ Splash screen configuré dans `src/app/_layout.tsx`

---

## 🌐 Application Web (React + Vite)

### Fichiers créés automatiquement

✅ **Logo SVG vectoriel** : `web/public/logo.svg`
- Version vectorielle du logo avec gradient bleu-turquoise
- Utilisé dans la navbar

✅ **Favicon SVG** : `web/public/favicon.svg`
- Version simplifiée pour l'onglet du navigateur

✅ **Intégration navbar** : Logo intégré dans `web/src/components/Navbar.jsx`

### Si vous voulez utiliser le logo PNG uploadé

Si vous préférez utiliser votre logo PNG au lieu du SVG généré :

1. **Sauvegarder le logo** :
   ```
   web/
   ├── public/
   │   ├── logo.png    ← Logo principal (recommandé : 512x512 px)
   │   └── favicon.png ← Favicon (recommandé : 64x64 px)
   ```

2. **Mettre à jour le Navbar** :
   
   Ouvrir `web/src/components/Navbar.jsx` ligne 47 et remplacer :
   ```jsx
   <img src="/logo.svg" ... />
   ```
   par :
   ```jsx
   <img src="/logo.png" ... />
   ```

3. **Mettre à jour index.html** :
   
   Ouvrir `web/index.html` ligne 5 et remplacer :
   ```html
   <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
   ```
   par :
   ```html
   <link rel="icon" type="image/png" href="/favicon.png" />
   ```

---

## 🔧 Commandes utiles

### Tester le mobile après l'ajout du logo

```bash
cd mobile
npx expo start
```

Puis appuyez sur :
- **`i`** pour ouvrir iOS simulator
- **`a`** pour ouvrir Android emulator
- **Scanner le QR code** avec Expo Go sur votre téléphone

### Tester le web

```bash
cd web
npm run dev
```

Ouvrir http://localhost:5173

---

## 📐 Dimensions recommandées

| Plateforme | Fichier | Dimensions | Format |
|------------|---------|------------|--------|
| **iOS** | icon.png | 1024x1024 | PNG |
| **Android** | adaptive-icon.png | 1024x1024 | PNG |
| **Splash** | splash-icon.png | 1024x1024 | PNG |
| **Web** | logo.png | 512x512 | PNG/SVG |
| **Favicon** | favicon.png | 64x64 | PNG/ICO |

---

## 🎨 Palette de couleurs du logo

- **Bleu (haut)** : `#4A9FE8`
- **Turquoise (bas)** : `#1ED9A6`
- **Couleur moyenne** : `#3BBFDB` (utilisée pour splash/adaptive icon)

---

## ✅ Checklist

- [ ] Logo placé dans `mobile/assets/images/icon.png`
- [ ] Logo copié en `adaptive-icon.png`
- [ ] Logo copié en `splash-icon.png`
- [ ] Favicon créé (48x48) et placé
- [ ] Testé sur iOS simulator
- [ ] Testé sur Android emulator
- [ ] Testé sur navigateur web
- [ ] Vérifié le splash screen mobile
- [ ] Vérifié le logo dans la navbar web

---

## 🆘 Besoin d'aide ?

Si vous rencontrez des problèmes :

1. **Rebuild de l'app mobile** : `npx expo start --clear`
2. **Clear cache web** : `rm -rf node_modules/.vite && npm run dev`
3. **Vérifier les dimensions** : Les images doivent être exactement aux dimensions spécifiées
4. **Format** : Utiliser PNG avec transparence (pas de JPEG)

---

*Logo intégré avec succès ! 🎉*
