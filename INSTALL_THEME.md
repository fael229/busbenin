# 🚀 Installation du Système de Thème

## ⚡ Installation rapide (2 minutes)

### Étape 1 : Installer AsyncStorage

**Exécutez cette commande** :

```bash
npm install @react-native-async-storage/async-storage
```

Ou avec yarn :
```bash
yarn add @react-native-async-storage/async-storage
```

---

### Étape 2 : Vérifier l'installation

Tous les fichiers ont été créés automatiquement :

- ✅ `src/constants/theme.js`
- ✅ `src/contexts/ThemeProvider.jsx`
- ✅ `src/components/ThemeToggle.jsx`
- ✅ `src/app/(tabs)/parametres.jsx`
- ✅ `src/app/_layout.tsx` (modifié)
- ✅ `src/app/(tabs)/_layout.jsx` (modifié)

---

### Étape 3 : Redémarrer l'app

```bash
# Arrêter Metro Bundler (Ctrl+C)
# Puis redémarrer
npm start
```

---

### Étape 4 : Tester

1. Ouvrir l'app
2. Aller sur l'onglet **Paramètres** (icône ⚙️)
3. Cliquer sur le switch **Mode sombre**
4. ✅ L'app devrait basculer en mode dark !

---

## 🎯 C'est tout !

Le système est prêt. Consultez `GUIDE_THEME_DARK.md` pour :
- Comment utiliser le thème dans vos pages
- Migrer les pages existantes
- Personnaliser les couleurs

---

## 🐛 En cas de problème

### Erreur "Cannot find module AsyncStorage"

**Solution** :
```bash
npm install @react-native-async-storage/async-storage
```

### L'app ne démarre pas

**Solution** :
```bash
# Nettoyer le cache
npm start -- --reset-cache
```

### Le thème ne change pas

**Vérifiez** :
- AsyncStorage est bien installé
- L'app a été redémarrée
- Vous êtes sur l'onglet Paramètres

---

## ✅ Vérification

- [ ] AsyncStorage installé
- [ ] App redémarrée
- [ ] Onglet Paramètres visible
- [ ] Switch thème fonctionne
- [ ] Thème persiste après fermeture

**Si tous les points sont cochés, c'est bon ! 🎉**
