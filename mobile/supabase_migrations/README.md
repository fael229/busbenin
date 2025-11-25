# Scripts de migration Supabase

Ce dossier contient tous les scripts SQL nécessaires pour configurer la base de données BusBenin.

## 📁 Fichiers

### 1. `reservations.sql`
**Description** : Crée la table des réservations avec toutes ses colonnes, contraintes, index et politiques RLS de base.  
**Dépendances** : Tables `trajets` et `auth.users` doivent exister.  
**Contenu** :
- Table `reservations`
- Index pour optimisation
- Politiques RLS pour les utilisateurs normaux
- Fonctions RPC : `create_reservation`, `update_reservation_payment`, `cancel_reservation`

### 2. `add_compagnie_to_profiles.sql`
**Description** : Ajoute la colonne `compagnie_id` à la table `profiles` pour permettre l'association utilisateur-compagnie.  
**Dépendances** : Tables `profiles` et `compagnies` doivent exister.  
**Exécuter en premier** : ⚠️ À exécuter AVANT `admin_reservations_policies.sql`

### 3. `cleanup_old_policies.sql` (optionnel)
**Description** : Supprime les anciennes politiques RLS pour éviter les conflits.  
**Quand l'utiliser** : Si vous obtenez une erreur "policy already exists".  
**Exécuter** : AVANT `admin_reservations_policies.sql`

### 4. `admin_reservations_policies.sql`
**Description** : Ajoute les politiques RLS pour permettre aux admins et compagnies de gérer les réservations.  
**Dépendances** : 
- Table `profiles` avec colonne `compagnie_id`
- Table `reservations`
- Table `trajets`
**Exécuter en dernier** : ⚠️ À exécuter APRÈS `add_compagnie_to_profiles.sql`

## 🚀 Ordre d'exécution

```
1. add_compagnie_to_profiles.sql      ← Ajouter la colonne
2. cleanup_old_policies.sql (si nécessaire)  ← Nettoyer
3. admin_reservations_policies.sql    ← Créer les politiques
```

## ✅ Commandes rapides

### Exécution complète dans l'ordre

```bash
# Ouvrir Supabase SQL Editor et exécuter dans l'ordre :

# 1. Ajouter compagnie_id
\i supabase_migrations/add_compagnie_to_profiles.sql

# 2. Nettoyer (si besoin)
\i supabase_migrations/cleanup_old_policies.sql

# 3. Créer les politiques
\i supabase_migrations/admin_reservations_policies.sql
```

### Vérification après installation

```sql
-- Vérifier la colonne compagnie_id
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'compagnie_id';

-- Vérifier les politiques
SELECT COUNT(*) FROM pg_policies WHERE tablename = 'reservations';
-- Devrait retourner 7
```

## 📝 Notes importantes

- **Toujours sauvegarder** avant d'exécuter des migrations en production
- **Tester en développement** d'abord
- **Vérifier les dépendances** : certains scripts nécessitent que d'autres tables existent
- **RLS doit être activé** sur la table `reservations`

## 🔧 Dépannage

| Erreur | Cause | Solution |
|--------|-------|----------|
| `relation "public.users" does not exist` | Ancien script avec mauvais nom de table | Utiliser les scripts mis à jour |
| `column compagnie_id does not exist` | Colonne pas encore ajoutée | Exécuter `add_compagnie_to_profiles.sql` |
| `policy already exists` | Politique déjà créée | Exécuter `cleanup_old_policies.sql` |
| `relation "compagnies" does not exist` | Table compagnies manquante | Créer d'abord la table compagnies |

## 📖 Documentation complète

Pour un guide détaillé de l'installation et des tests, consultez :
- `INSTALLATION_SUPABASE.md` - Guide complet d'installation
- `SUPABASE_RLS_SETUP.md` - Configuration RLS détaillée
- `GESTION_RESERVATIONS.md` - Utilisation de la gestion des réservations

---

**Dernière mise à jour** : Novembre 2025
