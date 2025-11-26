# 🔧 URGENT : transaction_id reste NULL

## Symptôme

```json
"transaction_id": null
"statut_paiement": "pending"
```

Même après un paiement approuvé, le `transaction_id` n'est pas sauvegardé dans la base de données.

## Solution en 2 étapes

### Étape 1 : Exécuter le script SQL dans Supabase

1. Ouvrez **Supabase SQL Editor**
2. Copiez le contenu de `web/sql/09_fix_rls_transaction_id.sql`
3. **Exécutez le script**

Ce script va :

- ✅ Vérifier que la colonne `transaction_id` existe
- ✅ Créer/Corriger la politique RLS pour permettre les mises à jour
- ✅ Afficher les politiques actuelles

### Étape 2 : Tester avec une NOUVELLE réservation

**Important** : Les anciennes réservations ne fonctionneront PAS. Créez une nouvelle réservation pour tester.

1. Créez une **nouvelle** réservation de location
2. Observez les logs dans Metro Bundler :

```
💾 Tentative de sauvegarde du transaction_id...
✅ transaction_id sauvegardé avec succès: [...]
```

**OU** si ça échoue :

```
❌ ERREUR lors de la mise à jour du transaction_id: [détails]
```

3. Si ça affiche une erreur, **copiez-la** et je pourrai vous aider

## Causes possibles

### 1. Colonne `transaction_id` n'existe pas

**Solution** : Le script SQL la crée automatiquement

### 2. Politique RLS trop restrictive

**Solution** : Le script crée une nouvelle politique qui permet à l'utilisateur de mettre à jour ses propres réservations

### 3. L'utilisateur n'est pas authentifié correctement

**Vérification** : Regardez si `user_id` dans la réservation correspond à `auth.uid()`

## Vérification manuelle dans Supabase

### Vérifier si la colonne existe :

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'reservations_location'
AND column_name = 'transaction_id';
```

Devrait retourner :

```
transaction_id | text
```

### Vérifier les politiques RLS :

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'reservations_location';
```

Devrait inclure :

```
"Mettre à jour ses propres réservations de location" | UPDATE
```

### Tester manuellement une mise à jour :

```sql
-- Remplacez 'VOTRE_ID' par l'ID d'une vraie réservation
UPDATE reservations_location
SET transaction_id = 'test_12345'
WHERE id = 'VOTRE_ID';
```

Si ça fonctionne → RLS OK  
Si ça échoue → Problème de politique RLS

## Après correction

Une fois le script SQL exécuté :

1. **Créez une NOUVELLE réservation** (pas une ancienne)
2. Le log devrait afficher : `✅ transaction_id sauvegardé avec succès`
3. Vérifiez dans Supabase que `transaction_id` n'est plus NULL :

```sql
SELECT id, transaction_id, statut_paiement
FROM reservations_location
ORDER BY created_at DESC
LIMIT 5;
```

4. Dans "Mes réservations", le bouton "Vérifier" devrait maintenant apparaître !

## Debugging supplémentaire

Si le problème persiste après avoir exécuté le script SQL, partagez ces informations :

1. Les logs Metro Bundler (cherchez 💾 et ❌)
2. Le résultat de cette requête SQL :
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'reservations_location';
   ```
3. Une capture de la structure de la table dans Supabase

---

**TL;DR** : Exécutez `web/sql/09_fix_rls_transaction_id.sql` dans Supabase SQL Editor, puis créez une NOUVELLE réservation de test.
